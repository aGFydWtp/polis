import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import { Construct } from 'constructs';
import { Environment } from './common';
import { PolisEnvValues } from './env-config';

export interface PolisMinimalStackProps extends cdk.StackProps {
  environment: Environment;
  envValues: PolisEnvValues;
}

/**
 * アプリ層スタック（最小コスト構成）。
 *
 * 単一 EC2 に docker-compose で Polis 一式 (postgres 含む) を起動し、
 * - 既存 VPC は fromVpcAttributes で参照（AWS lookup 不要 = cdk.context.json を汚さない）
 * - 既存 ALB のリスナーにホストヘッダールールを追加（証明書追加なし）
 * - PolisDataStack の EBS を ID 指定でアタッチして postgres データを永続化
 * - EventBridge Scheduler で 18:00 停止 / 10:00 起動（JST、変更可）してコスト削減
 */
export class PolisMinimalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PolisMinimalStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const e = props.envValues;

    const appPort = e.appPort ?? 80;
    const envParamName = e.envParamName ?? '/polis/web-app-env-vars';
    const gitBranch = e.gitBranch ?? 'edge';
    const instanceTypeString = e.instanceType ?? 't3.xlarge';
    const dataDevice = '/dev/sdf';

    /* ============================================================
       VPC（既存を fromVpcAttributes で参照。lookup しない）
    ============================================================ */
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'ExistingVpc', {
      vpcId: e.vpcId,
      availabilityZones: e.availabilityZones,
      vpcCidrBlock: e.vpcCidrBlock,
      publicSubnetIds: e.publicSubnetIds,
      publicSubnetRouteTableIds: e.publicSubnetRouteTableIds,
      privateSubnetIds: e.privateSubnetIds,
      privateSubnetRouteTableIds: e.privateSubnetRouteTableIds,
    });

    // 先頭のパブリックサブネット（= availabilityZones[0]）に EC2 を配置
    const targetSubnet = vpc.publicSubnets[0];

    // --- 既存 ALB の SG をインポート ---
    const albSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'AlbSecurityGroup',
      e.loadBalancerSecurityGroupId,
    );

    // --- EC2 用 SG: ALB からの appPort のみ許可（SSHは開けず SSM 接続） ---
    const instanceSecurityGroup = new ec2.SecurityGroup(this, 'PolisInstanceSg', {
      vpc,
      description: 'Polis single-instance SG. Inbound only from ALB SG.',
      allowAllOutbound: true,
    });
    instanceSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(appPort),
      `Allow traffic from ALB on ${appPort}`,
    );

    // --- ログ ---
    const logGroup = new logs.LogGroup(this, 'PolisLogGroup', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // --- env を格納した SSM SecureString パラメータ ---
    const envParam = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'EnvParam', {
      parameterName: envParamName,
    });

    // --- IAM ロール ---
    const role = new iam.Role(this, 'PolisInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });
    envParam.grantRead(role);
    // SecureString の復号権限。デフォルトの AWS マネージドキー (alias/aws/ssm) 利用を想定し、
    // SSM 経由 (kms:ViaService) の Decrypt のみに限定して付与する。
    role.addToPolicy(new iam.PolicyStatement({
      actions: ['kms:Decrypt'],
      resources: ['*'],
      conditions: {
        StringEquals: { 'kms:ViaService': `ssm.${this.region}.amazonaws.com` },
      },
    }));
    logGroup.grantWrite(role);
    role.addToPolicy(new iam.PolicyStatement({
      actions: ['ec2:AttachVolume', 'ec2:DescribeVolumes'],
      resources: ['*'],
    }));

    // --- UserData ---
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'set -xe',
      'dnf update -y || true',
      'dnf install -y docker git',
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      'curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose',
      'systemctl enable --now docker',
      // --- データ EBS を検出してマウント ---
      'DATA_DEV=""',
      'for i in $(seq 1 30); do for d in /dev/nvme1n1 ' + dataDevice + ' /dev/xvdf; do if [ -b "$d" ]; then DATA_DEV="$d"; break; fi; done; [ -n "$DATA_DEV" ] && break; sleep 5; done',
      'if [ -z "$DATA_DEV" ]; then echo "ERROR: data volume not found"; exit 1; fi',
      'if ! blkid "$DATA_DEV"; then mkfs -t ext4 "$DATA_DEV"; fi',
      'mkdir -p /mnt/polis-data',
      'UUID=$(blkid -s UUID -o value "$DATA_DEV")',
      'grep -q "$UUID" /etc/fstab || echo "UUID=$UUID /mnt/polis-data ext4 defaults,nofail 0 2" >> /etc/fstab',
      'mount -a',
      'mkdir -p /mnt/polis-data/postgres',
      // --- アプリ取得・起動 ---
      'mkdir -p /opt/polis && cd /opt/polis',
      `[ -d polis ] || git clone --depth 1 -b ${gitBranch} https://github.com/compdemocracy/polis.git polis`,
      'cd /opt/polis/polis',
      `aws ssm get-parameter --name ${envParamName} --with-decryption --query Parameter.Value --output text --region ${this.region} > .env`,
      'if ! grep -q "^DATABASE_URL=" .env; then echo "ERROR: DATABASE_URL missing in env parameter"; exit 1; fi',
      'docker compose -f docker-compose.prod.yml up -d --build',
    );

    // --- AMI（context の amiId を固定使用。lookup しない） ---
    const machineImage = ec2.MachineImage.genericLinux({ [this.region]: e.amiId });

    // --- EC2 インスタンス（データボリュームと同一 AZ のパブリックサブネット） ---
    const instance = new ec2.Instance(this, 'PolisInstance', {
      vpc,
      vpcSubnets: { subnets: [targetSubnet] },
      instanceType: new ec2.InstanceType(instanceTypeString),
      machineImage,
      securityGroup: instanceSecurityGroup,
      role,
      userData,
      associatePublicIpAddress: true,
      blockDevices: [
        {
          deviceName: '/dev/xvda', // AL2023 のルートデバイス
          volume: ec2.BlockDeviceVolume.ebs(e.rootVolumeSizeGiB ?? 30, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
            deleteOnTermination: true,
          }),
        },
      ],
    });

    // --- データ EBS をアタッチ（PolisDataStack のボリュームを ID 指定で） ---
    new ec2.CfnVolumeAttachment(this, 'DataVolumeAttachment', {
      device: dataDevice,
      instanceId: instance.instanceId,
      volumeId: e.ebsVolumeId,
    });

    // --- ターゲットグループ（instance ターゲット） ---
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'PolisTargetGroup', {
      vpc,
      port: appPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.INSTANCE,
      targets: [new elbv2targets.InstanceTarget(instance, appPort)],
      healthCheck: {
        path: '/api/v3/testConnection',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // --- 既存リスナーをインポートしてホストヘッダールールを追加（証明書追加なし） ---
    const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'ExistingListener', {
      listenerArn: e.listenerArn,
      securityGroup: albSecurityGroup,
    });
    new elbv2.ApplicationListenerRule(this, 'PolisListenerRule', {
      listener,
      priority: e.backendListenerPriority,
      conditions: [elbv2.ListenerCondition.hostHeaders([e.listenerHostHeader])],
      targetGroups: [targetGroup],
    });

    // --- 停止 / 起動（EventBridge Scheduler L1） ---
    const schedulerRole = new iam.Role(this, 'PolisSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });
    schedulerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ec2:StartInstances', 'ec2:StopInstances'],
      resources: [`arn:aws:ec2:${this.region}:${this.account}:instance/${instance.instanceId}`],
    }));

    const timeZone = e.scheduleTimeZone ?? 'Asia/Tokyo';
    const stopCron = e.stopCron ?? 'cron(0 18 * * ? *)';
    const startCron = e.startCron ?? 'cron(0 10 * * ? *)';
    // toJsonString でトークン (instanceId) を含む JSON を CFN 解決可能な形にする
    const instanceInput = this.toJsonString({ InstanceIds: [instance.instanceId] });

    new scheduler.CfnSchedule(this, 'PolisStopSchedule', {
      flexibleTimeWindow: { mode: 'OFF' },
      scheduleExpression: stopCron,
      scheduleExpressionTimezone: timeZone,
      description: 'Stop Polis EC2 to save cost',
      target: {
        arn: 'arn:aws:scheduler:::aws-sdk:ec2:stopInstances',
        roleArn: schedulerRole.roleArn,
        input: instanceInput,
      },
    });
    new scheduler.CfnSchedule(this, 'PolisStartSchedule', {
      flexibleTimeWindow: { mode: 'OFF' },
      scheduleExpression: startCron,
      scheduleExpressionTimezone: timeZone,
      description: 'Start Polis EC2',
      target: {
        arn: 'arn:aws:scheduler:::aws-sdk:ec2:startInstances',
        roleArn: schedulerRole.roleArn,
        input: instanceInput,
      },
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, 'Environment', { value: environment });
    new cdk.CfnOutput(this, 'InstanceId', { value: instance.instanceId });
    new cdk.CfnOutput(this, 'InstancePublicIp', { value: instance.instancePublicIp });
    new cdk.CfnOutput(this, 'TargetGroupArn', { value: targetGroup.targetGroupArn });
    new cdk.CfnOutput(this, 'AppUrl', { value: `https://${e.listenerHostHeader}` });
  }
}
