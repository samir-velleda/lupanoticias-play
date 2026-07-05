/**
 * LupaMedia — pipeline de vídeo (Prompt 05). ADITIVA e isolada.
 * s3:ObjectCreated em lupa-uploads-<env> → Lambda lupa-mc-submit (cria job MediaConvert
 * HLS multi-bitrate + poster). MediaConvert COMPLETE/ERROR → Lambda lupa-mc-complete
 * grava no Aurora (playback_url via CloudFront de mídia, duracao_seg, cover_url, status).
 *
 * NÃO recria buckets/VPC/Aurora — importa por SSM lookup. Ver CLAUDE.md §0.
 */
import * as path from 'path';
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as mediaconvert from 'aws-cdk-lib/aws-mediaconvert';
import { Construct } from 'constructs';
import { LupaEnv, resourceName, ssmPrefix } from './config';

export interface LupaMediaStackProps extends StackProps {
  readonly envName: LupaEnv;
}

export class LupaMediaStack extends Stack {
  constructor(scope: Construct, id: string, props: LupaMediaStackProps) {
    super(scope, id, props);
    const { envName } = props;
    const ssmBase = ssmPrefix(envName);
    const acct = Stack.of(this).account;

    // --- Referências (SSM lookup) — sem acoplar/alterar outras stacks ---
    const uploadsBucketName = ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/storage/uploads-bucket`);
    const mediaBucketName = ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/storage/media-bucket`);
    const mediaCdnDomain = ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/cdn/domain`);
    const auroraSecretArn = ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/aurora/secret-arn`);
    const auroraEndpoint = ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/aurora/endpoint`);

    const uploadsArn = `arn:aws:s3:::${uploadsBucketName}`;
    const mediaArn = `arn:aws:s3:::${mediaBucketName}`;

    // VPC + app-sg do projeto (para o mc-complete alcançar o Aurora isolado).
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcName: resourceName('vpc', envName) });
    const appSg = ec2.SecurityGroup.fromLookupByName(this, 'AppSg', resourceName('app-sg', envName), vpc);

    // --- MediaConvert: role + fila on-demand ---
    const mcRole = new iam.Role(this, 'McRole', {
      roleName: resourceName('mc-role', envName),
      assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
      description: 'Role do MediaConvert: lê uploads, escreve HLS/poster em media.',
    });
    mcRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${uploadsArn}/*`],
      }),
    );
    mcRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [`${mediaArn}/media/*`],
      }),
    );

    const queue = new mediaconvert.CfnQueue(this, 'Queue', {
      name: resourceName('mc', envName),
      pricingPlan: 'ON_DEMAND',
      status: 'ACTIVE',
      description: 'Fila on-demand do pipeline de vídeo Lupa.',
    });

    // --- Lambda mc-submit (cria o job) — sem VPC (só API MediaConvert) ---
    const mcSubmit = new lambda.Function(this, 'McSubmit', {
      functionName: resourceName('mc-submit', envName),
      description: 'Cria job MediaConvert (HLS + poster) ao chegar upload no S3.',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambdas', 'mc-submit')),
      memorySize: 256,
      timeout: Duration.seconds(30),
      environment: {
        MEDIA_BUCKET: mediaBucketName,
        MC_ROLE_ARN: mcRole.roleArn,
        MC_QUEUE_ARN: queue.attrArn,
      },
    });
    mcSubmit.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['mediaconvert:CreateJob', 'mediaconvert:DescribeEndpoints'],
        resources: ['*'], // DescribeEndpoints exige '*'; CreateJob escopado pela fila/role
      }),
    );
    mcSubmit.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [mcRole.roleArn],
        conditions: { StringEquals: { 'iam:PassedToService': 'mediaconvert.amazonaws.com' } },
      }),
    );

    // --- Lambda mc-complete (grava no Aurora) — na VPC (app-sg) ---
    const mcComplete = new lambda.Function(this, 'McComplete', {
      functionName: resourceName('mc-complete', envName),
      description: 'Grava resultado do MediaConvert no Aurora (playback_url, status).',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambdas', 'mc-complete')),
      memorySize: 256,
      timeout: Duration.seconds(30),
      environment: {
        AURORA_SECRET_ARN: auroraSecretArn,
        AURORA_ENDPOINT: auroraEndpoint,
        AURORA_DB_NAME: 'lupa',
        MEDIA_CDN_DOMAIN: mediaCdnDomain,
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [appSg],
    });
    mcComplete.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [auroraSecretArn],
      }),
    );

    // --- EventBridge: upload novo → mc-submit (exige EventBridge habilitado no bucket) ---
    new events.Rule(this, 'UploadCriadoRule', {
      ruleName: resourceName('upload-criado', envName),
      description: 's3:ObjectCreated em uploads/<mediaId>/ → cria job MediaConvert.',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: { name: [uploadsBucketName] },
          object: { key: [{ prefix: 'uploads/' }] },
        },
      },
      targets: [new targets.LambdaFunction(mcSubmit)],
    });

    // --- EventBridge: MediaConvert COMPLETE/ERROR (fila do projeto) → mc-complete ---
    new events.Rule(this, 'McStatusRule', {
      ruleName: resourceName('mc-status', envName),
      description: 'MediaConvert COMPLETE/ERROR → grava no Aurora.',
      eventPattern: {
        source: ['aws.mediaconvert'],
        detailType: ['MediaConvert Job State Change'],
        detail: {
          status: ['COMPLETE', 'ERROR'],
          queue: [queue.attrArn],
        },
      },
      targets: [new targets.LambdaFunction(mcComplete)],
    });

    // --- Referências novas em SSM (aditivo) ---
    new ssm.StringParameter(this, 'McQueueArnParam', {
      parameterName: `${ssmBase}/media/mc-queue-arn`,
      stringValue: queue.attrArn,
    });
    new ssm.StringParameter(this, 'McRoleArnParam', {
      parameterName: `${ssmBase}/media/mc-role-arn`,
      stringValue: mcRole.roleArn,
    });

    new CfnOutput(this, 'McQueueArn', { value: queue.attrArn });
    new CfnOutput(this, 'McSubmitFn', { value: mcSubmit.functionName });
    new CfnOutput(this, 'McCompleteFn', { value: mcComplete.functionName });
    // Referência não usada diretamente, mas documenta a conta alvo do pipeline.
    new CfnOutput(this, 'Account', { value: acct });
  }
}
