/**
 * STUB dos clientes AWS (S3 / Cognito). Apenas ASSINATURAS — não chama a AWS ainda.
 * A integração real (pre-signed URLs, Cognito) entra nos prompts de backend (05/06),
 * lendo config de env/SSM `/lupa/<env>/*`. Ver docs/AWS_ARCHITECTURE.md.
 */

export interface AwsConfig {
  region: string;
  mediaBucket?: string;
  uploadsBucket?: string;
  cdnDomain?: string;
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
}

/** Lê a config a partir das variáveis de ambiente (ver .env.example). */
export function getAwsConfig(): AwsConfig {
  return {
    region: process.env.AWS_REGION ?? 'us-east-1',
    mediaBucket: process.env.LUPA_MEDIA_BUCKET,
    uploadsBucket: process.env.LUPA_UPLOADS_BUCKET,
    cdnDomain: process.env.LUPA_CDN_DOMAIN,
    cognitoUserPoolId: process.env.LUPA_COGNITO_USER_POOL_ID,
    cognitoClientId: process.env.LUPA_COGNITO_CLIENT_ID,
  };
}

const NAO_IMPLEMENTADO =
  'Cliente AWS ainda não implementado (stub do prompt 02). Integração real nos prompts 05/06.';

export interface PresignedUpload {
  url: string;
  fields?: Record<string, string>;
  key: string;
  expiresIn: number;
}

export interface S3Client {
  /** Gera URL pré-assinada para upload direto do browser (PUT), ≤ 4 GB. */
  criarPresignedUpload(input: {
    contentType: string;
    ext: string;
    maxBytes?: number;
  }): Promise<PresignedUpload>;
  /** URL pública via CloudFront para um objeto de mídia processado. */
  urlPublicaCdn(key: string): string;
}

export interface CognitoClient {
  /** Verifica um JWT do Cognito e retorna o sub + grupos (papéis). */
  verificarToken(
    token: string,
  ): Promise<{ sub: string; email?: string; grupos: string[] } | null>;
}

/** Stub — lançará ao ser chamado até a implementação real. */
export function getS3Client(): S3Client {
  return {
    async criarPresignedUpload() {
      throw new Error(NAO_IMPLEMENTADO);
    },
    urlPublicaCdn(key: string): string {
      const { cdnDomain } = getAwsConfig();
      return cdnDomain ? `https://${cdnDomain}/${key}` : `/${key}`;
    },
  };
}

/** Stub — lançará ao ser chamado até a implementação real. */
export function getCognitoClient(): CognitoClient {
  return {
    async verificarToken() {
      throw new Error(NAO_IMPLEMENTADO);
    },
  };
}
