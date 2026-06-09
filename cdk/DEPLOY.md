# Polis 最小コスト構成 CDK デプロイ手順

単一 EC2 上に docker-compose で Polis 一式（postgres 含む）を起動する**最小コスト構成**のデプロイ手順です。

- 既存 VPC / ALB / リスナーを再利用（新規作成しない）
- postgres データ用 EBS を別スタックに分離し、アプリ層を destroy してもデータを保持
- EventBridge Scheduler で平日夜間停止・朝起動してコスト削減
- インスタンスへの接続は SSH ではなく SSM Session Manager

## スタック構成

| スタック | 役割 | 備考 |
| --- | --- | --- |
| `PolisDataStack-<env>` | postgres データ用 EBS のみ | `RemovalPolicy: RETAIN`（destroy してもボリュームは残る） |
| `PolisMinimalStack-<env>` | EC2 / SG / ターゲットグループ / リスナールール / 停止起動スケジュール | データ EBS を ID 指定でアタッチ |

`<env>` は `dev` / `stg` / `prd` のいずれか。OS 環境変数 `ENVIRONMENT` で切り替えます（未指定時は `dev`）。

---

## 1. 前提条件

- AWS CLI 設定済み（対象アカウント・リージョンへの権限）
- Node.js / npm
- 対象リージョンで CDK bootstrap 済み（未実施なら `npx cdk bootstrap aws://<account>/<region>`）
- **既存リソースが用意済みであること**:
  - VPC（パブリックサブネット）
  - Application Load Balancer とその HTTPS リスナー（証明書はリスナー側で設定済み）
  - ALB のセキュリティグループ
  - EC2 用 AMI（Amazon Linux 2023 系。ルートデバイスは `/dev/xvda` 前提）

---

## 2. 認証情報（ログイン設定）を SSM パラメータストア（SecureString）に登録

> **重要**: CDK はログイン（認証）設定を一切持ちません。Polis の `.env` 内容をまるごと
> SSM パラメータストアの **SecureString** パラメータに登録しておき、EC2 起動時に
> `--with-decryption` で取得して使います。Secrets Manager（1 シークレット約 $0.40/月）と異なり、
> SSM の Standard tier は **無料**のため最小コスト構成に適しています。

パラメータ名は `cdk.json` の `envParamName`（例: `/polis/web-app-env-vars-dev`）と一致させます。

```bash
aws ssm put-parameter \
  --name /polis/web-app-env-vars-dev \
  --type SecureString \
  --value file://prod.env \
  --region us-east-1
```

> `--value file://...` が使えない CLI バージョンでは `--value "$(cat prod.env)"` で代替します。

- パラメータ本文は **`.env` 形式のプレーンテキスト**（`KEY=VALUE` を改行区切り）。
- **サイズ上限 4KB**（Standard tier）。`.env` が 4KB を超える場合は `--tier Advanced`（$0.05/パラメータ/月）を付与します。
- 暗号化キーは省略時 AWS マネージドキー `alias/aws/ssm` が使われます。EC2 ロールには
  SSM 経由（`kms:ViaService`）の `kms:Decrypt` のみを限定付与しています（[minimal-stack.ts](lib/minimal-stack.ts)）。
  カスタム KMS キーを使う場合は `--key-id` を指定し、ロール側の復号権限も合わせて見直してください。
- `DATABASE_URL=` が含まれていないと EC2 起動時にエラーで停止します（[minimal-stack.ts](lib/minimal-stack.ts) のガード）。
- Google OAuth キー、JWT 秘密鍵、メール認証 (SES) など Polis のログインに必要な値は、すべてこのパラメータに含めます。
- 更新する場合は同じコマンドに `--overwrite` を付与します（`aws ssm put-parameter --name <name> --type SecureString --value file://... --overwrite`）。

---

## 3. 依存パッケージのインストール

```bash
cd cdk
npm install
```

---

## 4. `cdk.json` の context を設定

`cdk/cdk.json` の `context.<env>`（例: `context.dev`）に既存リソースの実値を記入します。
スキーマは [lib/env-config.ts](lib/env-config.ts) の zod で検証され、不足・型不一致時は詳細エラーで停止します。

| キー | 説明 |
| --- | --- |
| `account` / `region` | デプロイ先 AWS アカウント・リージョン |
| `vpcId` / `vpcCidrBlock` | 既存 VPC（`fromVpcAttributes` で参照、lookup しない） |
| `availabilityZones` | EC2 と EBS を配置する AZ（`[0]` を使用） |
| `publicSubnetIds` / `publicSubnetRouteTableIds` | パブリックサブネット（`[0]` に EC2 配置） |
| `privateSubnetIds` / `privateSubnetRouteTableIds` | 任意（未使用可） |
| `listenerArn` | 既存 ALB の HTTPS リスナー ARN |
| `loadBalancerSecurityGroupId` | ALB の SG ID |
| `listenerHostHeader` | このアプリに振り分けるホスト名（例: `polis-dev.example.com`） |
| `backendListenerPriority` | リスナールールの優先度（既存ルールと重複しない正整数） |
| `amiId` | EC2 の AMI ID（AL2023 系） |
| `ebsVolumeId` | **手順5でデータスタック出力後に転記**（初回は仮値で可） |
| `instanceType` | 任意（既定 `t3.xlarge`） |
| `rootVolumeSizeGiB` / `dataVolumeSizeGiB` | 任意（既定 30 / 40 GiB） |
| `appPort` | 任意（既定 80） |
| `envParamName` | 手順2の SSM SecureString パラメータ名 |
| `gitBranch` | EC2 で clone する Polis ブランチ（既定 `edge`） |
| `stopCron` / `startCron` | 停止・起動 cron（既定は平日 18:00 停止 / 10:00 起動） |
| `scheduleTimeZone` | スケジュールのタイムゾーン（既定 `Asia/Tokyo`） |

`dev` 以外の環境を使う場合は `context.stg` / `context.prd` を同様に追加します。

---

## 5. データスタックを先にデプロイ → volumeId を転記

postgres データ用 EBS を作成し、出力された volumeId を `cdk.json` に転記します。

```bash
cd cdk
ENVIRONMENT=dev npx cdk deploy PolisDataStack-dev
```

デプロイ後、出力 `PolisDataVolumeId`（例: `vol-0123...`）を `cdk.json` の
`context.dev.ebsVolumeId` に転記します。`PolisDataVolumeAz` が EC2 配置 AZ と一致していることも確認してください（同一 AZ 必須）。

> このスタックは `RETAIN` のため、以後アプリ層を destroy してもこのボリューム＝データは消えません。

---

## 6. アプリスタックをデプロイ

```bash
cd cdk
# 差分確認（任意）
ENVIRONMENT=dev npx cdk diff PolisMinimalStack-dev

# デプロイ
ENVIRONMENT=dev npx cdk deploy PolisMinimalStack-dev
```

デプロイ完了後、以下が Output されます。

- `InstanceId` — EC2 インスタンス ID
- `InstancePublicIp` — パブリック IP
- `TargetGroupArn` — ターゲットグループ
- `AppUrl` — `https://<listenerHostHeader>`

両スタックを一括デプロイする場合:

```bash
ENVIRONMENT=dev npx cdk deploy PolisDataStack-dev PolisMinimalStack-dev
```

---

## 7. デプロイ後の確認

EC2 は UserData で docker / docker-compose をインストールし、Polis を clone・起動します（数分かかります）。

```bash
# SSM でインスタンスへ接続（SSH は不可）
aws ssm start-session --target <InstanceId> --region us-east-1

# インスタンス内で起動状況を確認
sudo docker compose -f /opt/polis/polis/docker-compose.prod.yml ps
sudo docker compose -f /opt/polis/polis/docker-compose.prod.yml logs -f
```

- ALB のヘルスチェックは `/api/v3/testConnection`（200 期待）。
- DNS で `listenerHostHeader` を ALB に向けたうえで `AppUrl` にアクセスして動作確認します。

---

## 8. 停止・起動スケジュール

[minimal-stack.ts](lib/minimal-stack.ts) の EventBridge Scheduler により、既定で以下が設定されます（`scheduleTimeZone` 基準）。

- 停止: `cron(0 18 ? * MON-FRI *)`（平日 18:00）
- 起動: `cron(0 10 ? * MON-FRI *)`（平日 10:00）

変更する場合は `cdk.json` の `stopCron` / `startCron` / `scheduleTimeZone` を編集して再デプロイします。

> 起動時に UserData は再実行されません（既存の clone を再利用）。postgres データは `/mnt/polis-data` のデータ EBS に永続化されるため、停止・起動をまたいで保持されます。

---

## 9. 削除（teardown）

```bash
cd cdk
# アプリ層のみ削除（データ EBS は RETAIN なので残る）
ENVIRONMENT=dev npx cdk destroy PolisMinimalStack-dev

# データ EBS も含めて完全削除する場合
ENVIRONMENT=dev npx cdk destroy PolisDataStack-dev
# → スタックは削除されるが、RETAIN により EBS ボリューム本体は残る。
#   不要なら AWS コンソール / CLI で手動削除する:
#   aws ec2 delete-volume --volume-id <ebsVolumeId>
```

---

## トラブルシューティング

| 症状 | 確認ポイント |
| --- | --- |
| `env config not found` / `Invalid env config` | `cdk.json` の `context.<env>` が未設定・型不一致。エラー本文の zod ツリーを確認 |
| EC2 起動後すぐ停止 / アプリが上がらない | env パラメータに `DATABASE_URL=` が無い / ロールの `kms:Decrypt` 不足で復号失敗。SSM で `/var/log/cloud-init-output.log` を確認 |
| ヘルスチェック unhealthy | コンテナ起動完了前 / `appPort` 不一致 / SG が ALB SG からの inbound を許可しているか |
| データ EBS が見つからない | `ebsVolumeId` の AZ と EC2 の AZ（`availabilityZones[0]`）が一致しているか |
| リスナールール衝突 | `backendListenerPriority` が既存ルールと重複していないか |
