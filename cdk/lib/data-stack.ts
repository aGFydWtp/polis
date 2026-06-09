import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Environment } from './common';
import { PolisEnvValues } from './env-config';

export interface PolisDataStackProps extends cdk.StackProps {
  environment: Environment;
  envValues: PolisEnvValues;
}

/**
 * データ永続層スタック。
 *
 * postgres のデータを格納する EBS ボリュームだけを持つ。
 * `removalPolicy: RETAIN` なので、アプリ層 (PolisMinimalStack) を destroy しても
 * このボリュームは削除されない（データが飛ばない）。
 *
 * デプロイ後、出力された PolisDataVolumeId を cdk.json の context.{env}.`ebsVolumeId` に転記する。
 *   ENVIRONMENT=dev npx cdk deploy PolisDataStack-dev
 */
export class PolisDataStack extends cdk.Stack {
  public readonly dataVolume: ec2.Volume;

  constructor(scope: Construct, id: string, props: PolisDataStackProps) {
    super(scope, id, props);

    const { environment, envValues } = props;
    const az = envValues.availabilityZones[0];

    this.dataVolume = new ec2.Volume(this, 'PolisDataVolume', {
      availabilityZone: az,
      size: cdk.Size.gibibytes(envValues.dataVolumeSizeGiB ?? 40),
      volumeType: ec2.EbsDeviceVolumeType.GP3,
      encrypted: true,
      // 誤って destroy してもデータを失わないよう保持する
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'PolisDataVolumeId', {
      value: this.dataVolume.volumeId,
      description: `Set this value as "ebsVolumeId" in cdk.json context.${environment}`,
    });
    new cdk.CfnOutput(this, 'PolisDataVolumeAz', {
      value: az,
      description: 'Availability zone of the data volume. EC2 must be placed in the same AZ.',
    });
  }
}
