#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
// import { CdkStack } from '../lib/cdk-stack';
import { PolisDataStack } from '../lib/data-stack';
import { PolisMinimalStack } from '../lib/minimal-stack';
import { resolveEnvironment } from '../lib/common';
import { loadEnvValues } from '../lib/env-config';
// import * as path from 'path'; // Use * as path

interface ExtendedStackProps extends cdk.StackProps {
  domainName?: string; // Make optional since we're not using it initially
  enableSSHAccess: boolean;
  envFile: string;
  branch: string; // Make required
  sshAllowedIpRange?: string; // Optional, but required if enableSSHAccess is true
  webKeyPairName?: string;   // Optional, but required if enableSSHAccess is true
  mathWorkerKeyPairName?: string; // Optional, but required if enableSSHAccess is true
}

const app = new cdk.App();

// const envFilePath = process.env.ENV_FILE || '../../.env'; // Allow configurable .env file path
// const resolvedEnvFilePath = path.resolve(__dirname, envFilePath);

// Helper function for boolean conversion
// function parseBoolean(value: string | undefined): boolean {
//   return value?.toLowerCase() === 'true' || value === '1' || value?.toLowerCase() === 'yes';
// }

// const props: ExtendedStackProps = {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION,
//   },
//   domainName: process.env.CDK_DOMAIN_NAME,
//   enableSSHAccess: parseBoolean(process.env.CDK_SSH_ACCESS),
//   envFile: resolvedEnvFilePath,
//   branch: process.env.CDK_BRANCH || 'edge', // Provide a default branch
//   sshAllowedIpRange: process.env.CDK_SSH_ALLOWED_IP_RANGE,
//   webKeyPairName: process.env.CDK_WEB_KEY_PAIR_NAME,
//   mathWorkerKeyPairName: process.env.CDK_MATH_WORKER_KEY_PAIR_NAME,
// };

// // Check for required parameters based on enableSSHAccess
// if (props.enableSSHAccess) {
//   if (!props.sshAllowedIpRange) {
//     throw new Error("sshAllowedIpRange is required when enableSSHAccess is true.");
//   }
//   if (!props.webKeyPairName) {
//     throw new Error("webKeyPairName is required when enableSSHAccess is true");
//   }
//   if (!props.mathWorkerKeyPairName) {
//         throw new Error("mathWorkerKeyPairName is required when enableSSHAccess is true");
//   }
// }

// 既存のフルプロダクションスタック（参照用・変更なし）
// new CdkStack(app, 'CdkStack', props);

/* ============================================================
   最小コスト構成スタック（単一EC2 + 既存ALB再利用 + EBS分離 + 夜間停止）
   設定は OS 環境変数 ENVIRONMENT (dev/stg/prd) で cdk.json の context.{env} を切替:
     ENVIRONMENT=dev npx cdk deploy PolisDataStack-dev PolisMinimalStack-dev
   - PolisDataStack: postgres データ用 EBS（RETAIN）。先にデプロイし、出力 volumeId を
     cdk.json の context.{env}.ebsVolumeId に転記してから PolisMinimalStack をデプロイする
   ============================================================ */
const environment = resolveEnvironment();
const envValues = loadEnvValues(app.node, environment);
const stackEnv = { account: envValues.account, region: envValues.region };

new PolisDataStack(app, `PolisDataStack-${environment}`, {
  env: stackEnv,
  environment,
  envValues,
});
new PolisMinimalStack(app, `PolisMinimalStack-${environment}`, {
  env: stackEnv,
  environment,
  envValues,
});