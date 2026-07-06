/**
 * LupaStorage — buckets S3 (media/uploads/static) + CloudFront (OAC).
 * Todos block public access; media versionado; uploads com CORS PUT e
 * expiração de multipart incompletos. Ver prompt 01 e docs §2.
 */
import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { LupaEnv, resourceName, ssmPrefix, isProd } from './config';

export interface LupaStorageStackProps extends StackProps {
  readonly envName: LupaEnv;
}

export class LupaStorageStack extends Stack {
  public readonly mediaBucket: s3.Bucket;
  public readonly uploadsBucket: s3.Bucket;
  public readonly webStaticBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: LupaStorageStackProps) {
    super(scope, id, props);
    const { envName } = props;
    const prod = isProd(envName);
    const removalPolicy = prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    // Mídia transcodificada (HLS/thumbs/legendas) — versionado, privado.
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: resourceName('media', envName),
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy,
    });

    // Uploads brutos via pre-signed URL (PUT do browser) — CORS + lifecycle.
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: resourceName('uploads', envName),
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy,
      // EventBridge: publica s3:ObjectCreated p/ o pipeline de vídeo (LupaMedia disparar
      // o MediaConvert). Só habilita a notificação — não recria o bucket nem toca dados.
      eventBridgeEnabled: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        { abortIncompleteMultipartUploadAfter: Duration.days(3) },
        // uploads brutos são efêmeros após transcodificar
        { expiration: Duration.days(prod ? 14 : 7) },
      ],
    });

    // Estáticos do Next (OpenNext) — servidos via CloudFront.
    this.webStaticBucket = new s3.Bucket(this, 'WebStaticBucket', {
      bucketName: resourceName('web-static', envName),
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy,
    });

    // CORS na entrega de mídia: o hls.js busca segmentos cross-origin (página no web-cdn,
    // HLS no media-cdn). Sem estes cabeçalhos, a reprodução falha no browser. Aditivo.
    const mediaCors = new cloudfront.ResponseHeadersPolicy(this, 'MediaCors', {
      responseHeadersPolicyName: resourceName('media-cors', envName),
      comment: 'CORS para entrega de HLS (Lupa Play / vídeo em matéria).',
      corsBehavior: {
        accessControlAllowOrigins: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD'],
        accessControlAllowHeaders: ['*'],
        accessControlAllowCredentials: false,
        accessControlMaxAge: Duration.seconds(600),
        originOverride: true,
      },
    });

    // CloudFront com OAC: default = estáticos; /media/* = mídia.
    this.distribution = new cloudfront.Distribution(this, 'Cdn', {
      comment: resourceName('cdn', envName),
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.webStaticBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        'media/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.mediaBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: mediaCors,
        },
      },
    });

    // Referências p/ os próximos prompts.
    const params: Record<string, string> = {
      'storage/media-bucket': this.mediaBucket.bucketName,
      'storage/uploads-bucket': this.uploadsBucket.bucketName,
      'storage/web-static-bucket': this.webStaticBucket.bucketName,
      'cdn/domain': this.distribution.distributionDomainName,
      'cdn/distribution-id': this.distribution.distributionId,
    };
    for (const [key, value] of Object.entries(params)) {
      new ssm.StringParameter(this, `Param-${key.replace(/\//g, '-')}`, {
        parameterName: `${ssmPrefix(envName)}/${key}`,
        stringValue: value,
      });
    }

    new CfnOutput(this, 'MediaBucketName', { value: this.mediaBucket.bucketName });
    new CfnOutput(this, 'UploadsBucketName', { value: this.uploadsBucket.bucketName });
    new CfnOutput(this, 'WebStaticBucketName', { value: this.webStaticBucket.bucketName });
    new CfnOutput(this, 'CdnDomain', { value: this.distribution.distributionDomainName });
  }
}
