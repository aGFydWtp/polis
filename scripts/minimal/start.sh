#!/bin/bash
# Polis 最小構成: アプリの再起動 / 更新を手動で行う運用スクリプト。
#
# 使い方:
#   SSM Session Manager で EC2 に接続し、root で実行する。
#     sudo bash /opt/polis/polis/scripts/minimal/start.sh
#
# UserData(初回起動)と同じ手順を冪等に再実行する。コード更新・.env更新・再ビルドに使う。
set -xeuo pipefail

# リージョンは未指定ならインスタンスメタデータ (IMDSv2) から自動検出
REGION="${AWS_REGION:-}"
if [ -z "$REGION" ]; then
  IMDS_TOKEN=$(curl -sf -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
  REGION=$(curl -sf -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
    "http://169.254.169.254/latest/meta-data/placement/region" || true)
fi
: "${REGION:?AWS_REGION not set and could not be detected from instance metadata}"

# .env の取得元は SSM Parameter Store の SecureString (cdk.json の envParamName と揃える)
ENV_PARAM="${ENV_PARAM_NAME:-/polis/web-app-env-vars-dev}"
APP_DIR="${APP_DIR:-/opt/polis/polis}"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

# データEBSがマウントされているか確認（postgres の永続先）
if ! mountpoint -q /mnt/polis-data; then
  echo "ERROR: /mnt/polis-data is not mounted. Check the data EBS attachment." >&2
  exit 1
fi
mkdir -p /mnt/polis-data/postgres

# 最新コードを取得（ff-only。コンフリクト時は手動対応）
git pull --ff-only || echo "WARN: git pull skipped/failed; continuing with current code"

# .env を SSM から再取得。tmp に書いて検証してから mv（失敗時に既存 .env を壊さない）
umask 077
aws ssm get-parameter \
  --name "$ENV_PARAM" \
  --with-decryption --query Parameter.Value --output text --region "$REGION" > .env.tmp

if ! grep -q '^DATABASE_URL=' .env.tmp; then
  rm -f .env.tmp
  echo "ERROR: DATABASE_URL is missing in the env parameter ($ENV_PARAM)." >&2
  echo "       e.g. DATABASE_URL=postgres://postgres:<PASS>@postgres:5432/<DB>" >&2
  exit 1
fi
mv .env.tmp .env

# 再ビルド & 起動
docker compose -f "$COMPOSE_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" ps
