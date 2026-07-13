/**
 * 環境別設定の zod スキーマとローダ。
 *
 * cdk.json の context.{dev,stg,prd} はプレースホルダのテンプレート。
 * 実値は git 管理外の cdk/cdk.local.json（{"dev": {...}} 形式）に置き、
 * 読込時に context の値へシャローマージで上書きする。
 * OS 環境変数 ENVIRONMENT で環境を切り替える。
 *   ENVIRONMENT=dev npx cdk deploy PolisMinimalStack-dev
 *
 * 環境定数 (ENVIRONMENTS / resolveEnvironment など) は ./common に分離。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Node } from 'constructs';
import { z } from 'zod';
import { Environment } from './common';

export const PolisEnvValuesSchema = z.object({
  // CDK スタックのデプロイ先
  account: z.string().min(1),
  region: z.string().min(1),
  // ネットワーク（既存 VPC を fromVpcAttributes で参照。lookup しない）
  vpcId: z.string().min(1),
  vpcCidrBlock: z.string().min(1),
  availabilityZones: z.array(z.string()).min(1),
  publicSubnetIds: z.array(z.string()).min(1),
  publicSubnetRouteTableIds: z.array(z.string()).min(1),
  privateSubnetIds: z.array(z.string()).optional(),
  privateSubnetRouteTableIds: z.array(z.string()).optional(),
  // 既存 ALB
  listenerArn: z.string().min(1),
  loadBalancerSecurityGroupId: z.string().min(1),
  listenerHostHeader: z.string().min(1),
  backendListenerPriority: z.number().int().positive(),
  // EC2 / EBS
  amiId: z.string().min(1),
  /** PolisDataStack デプロイ後にその出力 volumeId をここへ転記する */
  ebsVolumeId: z.string().min(1),
  instanceType: z.string().optional(),
  rootVolumeSizeGiB: z.number().int().positive().optional(),
  dataVolumeSizeGiB: z.number().int().positive().optional(),
  appPort: z.number().int().positive().optional(),
  /** SSM Parameter Store の SecureString パラメータ名（.env 全体を格納） */
  envParamName: z.string().optional(),
  gitBranch: z.string().optional(),
  // 停止/起動スケジュール
  stopCron: z.string().optional(),
  startCron: z.string().optional(),
  scheduleTimeZone: z.string().optional(),
});

export type PolisEnvValues = z.infer<typeof PolisEnvValuesSchema>;

/** git 管理外のローカル設定ファイル（cdk/ 直下。lib/ からの相対で解決） */
const LOCAL_CONFIG_PATH = path.resolve(__dirname, '..', 'cdk.local.json');

/**
 * cdk.local.json（存在すれば）から指定環境のオーバーライド値を読み込む。
 * - ファイルが無い / 環境キーが無い場合は undefined（cdk.json の値のみで動作）。
 * - JSON パース失敗時は分かりやすいエラーで落とす。
 */
function loadLocalOverrides(environment: Environment): Record<string, unknown> | undefined {
  if (!fs.existsSync(LOCAL_CONFIG_PATH)) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8'));
  } catch (e) {
    throw new Error(
      `Failed to parse ${LOCAL_CONFIG_PATH}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error(`${LOCAL_CONFIG_PATH} must contain a JSON object keyed by environment name`);
  }
  const overrides = (parsed as Record<string, unknown>)[environment];
  if (overrides === undefined) {
    return undefined;
  }
  if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new Error(`${LOCAL_CONFIG_PATH}: "${environment}" must be a JSON object`);
  }
  return overrides as Record<string, unknown>;
}

/**
 * 環境別設定を読み込み、zod で検証して返す。
 * 1. cdk.json の context.{env} を app.node 経由の CDK context から取得
 *    （--context / cdk.context.json で上書き可）。
 * 2. git 管理外の cdk.local.json に同じ環境キーがあれば、その値をシャローマージで上書き。
 * スキーマ不一致・未定義時は詳細なエラーで落とす。
 */
export function loadEnvValues(node: Node, environment: Environment): PolisEnvValues {
  const raw = node.tryGetContext(environment);
  if (raw === undefined) {
    throw new Error(`env config not found in cdk.json context: "${environment}"`);
  }
  const overrides = loadLocalOverrides(environment);
  const merged = overrides === undefined ? raw : { ...raw, ...overrides };
  const result = PolisEnvValuesSchema.safeParse(merged);
  if (!result.success) {
    throw new Error(
      `Invalid env config (context.${environment}):\n${JSON.stringify(z.treeifyError(result.error), null, 2)}`,
    );
  }
  return result.data;
}
