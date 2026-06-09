/**
 * 環境別設定の zod スキーマとローダ。
 *
 * 実値は cdk.json の context.{dev,stg,prd} に置き、OS 環境変数 ENVIRONMENT で切り替える。
 *   ENVIRONMENT=dev npx cdk deploy PolisMinimalStack-dev
 *
 * 環境定数 (ENVIRONMENTS / resolveEnvironment など) は ./common に分離。
 */
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

/**
 * cdk.json の context.{env} を読み込み、zod で検証して返す。
 * 値は app.node 経由の CDK context から取得する（--context / cdk.context.json で上書き可）。
 * スキーマ不一致・未定義時は詳細なエラーで落とす。
 */
export function loadEnvValues(node: Node, environment: Environment): PolisEnvValues {
  const raw = node.tryGetContext(environment);
  if (raw === undefined) {
    throw new Error(`env config not found in cdk.json context: "${environment}"`);
  }
  const result = PolisEnvValuesSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid env config (context.${environment}):\n${JSON.stringify(z.treeifyError(result.error), null, 2)}`,
    );
  }
  return result.data;
}
