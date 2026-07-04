/**
 * LupaWeb — SSR/API do Next 16 em Lambda (AWS Lambda Web Adapter + output:standalone),
 * com CloudFront na frente. Estáticos publicados no bucket lupa-web-static-<env>
 * EXISTENTE (importado via SSM lookup — NÃO recria). Envs vêm do SSM /lupa/<env>/*.
 * Preparado p/ domínio custom (cert ACM + aliases como parâmetros opcionais).
 * Ver docs/AWS_ARCHITECTURE.md §2/§8 e CLAUDE.md §0. Stack ADITIVA e isolada.
 */
import * as path from 'path';
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { LupaEnv, resourceName, ssmPrefix } from './config';

export interface LupaWebStackProps extends StackProps {
  readonly envName: LupaEnv;
  /** Base URL pública do app (CloudFront/domínio) — usada no OAuth redirect_uri. */
  readonly appBaseUrl: string;
  /** ARN da layer do AWS Lambda Web Adapter (x86_64). Override via -c lwaLayerArn=... */
  readonly lwaLayerArn?: string;
  /** Aliases do domínio custom (opcional). Override via -c webDomainNames=a.com,b.com */
  readonly domainNames?: string[];
  /** ARN do certificado ACM (us-east-1) do domínio custom (opcional). */
  readonly certificateArn?: string;
}

// Default: layer LWA mais recente em us-east-1 (conta pública da AWS).
const LWA_LAYER_DEFAULT =
  'arn:aws:lambda:us-east-1:753240598075:layer:LambdaAdapterLayerX86:25';

export class LupaWebStack extends Stack {
  constructor(scope: Construct, id: string, props: LupaWebStackProps) {
    super(scope, id, props);
    const { envName } = props;
    const ssmBase = ssmPrefix(envName);

    // --- Referências às outras stacks via SSM (sem acoplar/alterar as stacks) ---
    const webStaticBucketName = ssm.StringParameter.valueForStringParameter(
      this,
      `${ssmBase}/storage/web-static-bucket`,
    );
    const webStaticBucket = s3.Bucket.fromBucketName(
      this,
      'WebStaticBucket',
      webStaticBucketName,
    );

    // VPC + SG do projeto por LOOKUP (sem acoplar/alterar a LupaNetwork). O Lambda
    // entra nas subnets `app` (PRIVATE_WITH_EGRESS) usando o app-sg, que é o único
    // autorizado a falar 5432 com o Aurora (db-sg). Egress via NAT alcança
    // Secrets Manager/Cognito.
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcName: resourceName('vpc', envName) });
    const appSg = ec2.SecurityGroup.fromLookupByName(
      this,
      'AppSg',
      resourceName('app-sg', envName),
      vpc,
    );

    // Segredo compartilhado CloudFront->Lambda (endurecimento da origem — CLAUDE.md §0).
    // O CloudFront injeta como header `x-lupa-origin`; o middleware Next valida.
    const originSecret = new secretsmanager.Secret(this, 'OriginSecret', {
      secretName: resourceName('web-origin', envName),
      description: 'Segredo do header CloudFront->Lambda (guarda de origem do web).',
      generateSecretString: { passwordLength: 40, excludePunctuation: true, includeSpace: false },
    });
    const originSecretValue = originSecret.secretValue.unsafeUnwrap();

    const appEnv: Record<string, string> = {
      LUPA_ENV: envName,
      NODE_ENV: 'production',
      // Base URL pública (OAuth redirect_uri deve bater com os callbackUrls do Cognito).
      LUPA_WEB_URL: props.appBaseUrl,
      // Guarda de origem: middleware barra (403) quem não trouxer este header do CloudFront.
      LUPA_ORIGIN_SECRET: originSecretValue,
      // Aurora LIGADO (banco já com schema+seed). A UI lê/escreve no Aurora.
      LUPA_USE_AURORA: 'true',
      LUPA_AURORA_DB_NAME: 'lupa',
      // AWS Lambda Web Adapter
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
      PORT: '8080',
      HOSTNAME: '0.0.0.0',
      AWS_LWA_ENABLE_COMPRESSION: 'true',
      // Config do app (do SSM /lupa/<env>/* — nunca hardcoded)
      LUPA_MEDIA_BUCKET: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/storage/media-bucket`),
      LUPA_UPLOADS_BUCKET: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/storage/uploads-bucket`),
      LUPA_WEB_STATIC_BUCKET: webStaticBucketName,
      LUPA_CDN_DOMAIN: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/cdn/domain`),
      LUPA_COGNITO_USER_POOL_ID: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/cognito/user-pool-id`),
      LUPA_COGNITO_CLIENT_ID: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/cognito/user-pool-client-id`),
      LUPA_COGNITO_DOMAIN: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/cognito/domain-base`),
      LUPA_AURORA_SECRET_ARN: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/aurora/secret-arn`),
      LUPA_AURORA_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, `${ssmBase}/aurora/endpoint`),
    };

    // --- Lambda: Next standalone + LWA ---
    const fn = new lambda.Function(this, 'WebFn', {
      functionName: resourceName('web', envName),
      description: 'Lupa Next 16 SSR/API (Lambda Web Adapter + standalone).',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'run.sh',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'assets', 'lupa-web')),
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'LwaLayer',
          props.lwaLayerArn ?? LWA_LAYER_DEFAULT,
        ),
      ],
      memorySize: 1024,
      timeout: Duration.seconds(30),
      environment: appEnv,
      // Entra na VPC (subnets app) p/ alcançar o Aurora isolado via app-sg.
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [appSg],
    });

    // Ler as credenciais do Aurora em runtime (nunca em env texto-claro).
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [appEnv.LUPA_AURORA_SECRET_ARN],
      }),
    );

    // Admin do Cognito (portal /admin/usuarios): listar/criar usuários e atribuir grupos,
    // escopado ao User Pool do projeto. (Sem AdminDeleteUser — nada de deleção.)
    const userPoolArn = Stack.of(this).formatArn({
      service: 'cognito-idp',
      resource: 'userpool',
      resourceName: appEnv.LUPA_COGNITO_USER_POOL_ID,
    });
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:ListUsers',
          'cognito-idp:ListGroups',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminListGroupsForUser',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminAddUserToGroup',
        ],
        resources: [userPoolArn],
      }),
    );

    // Function URL pública (authType NONE) — o CloudFront é o ponto de entrada.
    // Nota: a Function URL fica acessível diretamente (aceitável p/ URL de TESTE dev).
    // Endurecimento (OAC/private-origin ou header secreto) fica p/ a fase do domínio.
    const fnUrl = fn.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });

    // --- CloudFront ---
    // customHeaders: injeta o segredo de origem em TODA requisição ao Lambda (CloudFront
    // sobrescreve qualquer x-lupa-origin vindo do viewer → não é spoofável via CDN).
    const origin = new origins.FunctionUrlOrigin(fnUrl, {
      customHeaders: { 'x-lupa-origin': originSecretValue },
    });
    // OAC + Lambda Function URL: NÃO encaminhar o header `Authorization` (o CloudFront
    // o usa para a assinatura SigV4 do OAC). Encaminhar tudo, exceto Host e Authorization.
    const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'WebOrp', {
      originRequestPolicyName: resourceName('web-orp', envName),
      comment: 'Lupa web: viewer exceto Host/Authorization (OAC assina Authorization).',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.denyList('host', 'authorization'),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
    });

    const useCustomDomain =
      !!props.domainNames && props.domainNames.length > 0 && !!props.certificateArn;
    const certificate = useCustomDomain
      ? acm.Certificate.fromCertificateArn(this, 'WebCert', props.certificateArn!)
      : undefined;

    const distribution = new cloudfront.Distribution(this, 'WebCdn', {
      comment: resourceName('web-cdn', envName),
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // Placeholder de domínio custom: se ausente, mantém o default *.cloudfront.net.
      ...(useCustomDomain ? { domainNames: props.domainNames, certificate } : {}),
      defaultBehavior: {
        origin,
        originRequestPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL, // SSR + rotas de API (POST)
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // SSR dinâmico
      },
      additionalBehaviors: {
        // Assets imutáveis do Next (hash no nome) — cacheados agressivamente na borda.
        '/_next/static/*': {
          origin,
          originRequestPolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // --- Estáticos também publicados no bucket lupa-web-static-<env> (aditivo, prune=false) ---
    // (Hoje o CloudFront serve os estáticos pelo próprio Lambda/standalone; esta cópia
    //  no bucket destrava a troca p/ origem S3 no passo do domínio definitivo.)
    const webRoot = path.join(__dirname, '..', '..', 'web');
    new s3deploy.BucketDeployment(this, 'DeployNextStatic', {
      destinationBucket: webStaticBucket,
      destinationKeyPrefix: '_next/static',
      sources: [s3deploy.Source.asset(path.join(webRoot, '.next', 'static'))],
      prune: false, // NUNCA remove objetos existentes (regra de não-deleção)
    });
    new s3deploy.BucketDeployment(this, 'DeployPublic', {
      destinationBucket: webStaticBucket,
      sources: [s3deploy.Source.asset(path.join(webRoot, 'public'))],
      prune: false,
    });

    // --- Grava referências novas em SSM /lupa/<env>/* (aditivo) ---
    new ssm.StringParameter(this, 'WebCdnDomainParam', {
      parameterName: `${ssmBase}/web-cdn/domain`,
      stringValue: distribution.distributionDomainName,
    });
    new ssm.StringParameter(this, 'WebCdnDistIdParam', {
      parameterName: `${ssmBase}/web-cdn/distribution-id`,
      stringValue: distribution.distributionId,
    });
    new ssm.StringParameter(this, 'WebFnNameParam', {
      parameterName: `${ssmBase}/web/function-name`,
      stringValue: fn.functionName,
    });
    new ssm.StringParameter(this, 'WebUrlParam', {
      parameterName: `${ssmBase}/web/url`,
      stringValue: `https://${distribution.distributionDomainName}`,
    });

    new CfnOutput(this, 'WebUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'WebCdnDomain', { value: distribution.distributionDomainName });
    new CfnOutput(this, 'WebCdnDistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'WebFunctionName', { value: fn.functionName });
  }
}
