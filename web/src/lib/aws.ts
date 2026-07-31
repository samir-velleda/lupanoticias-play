/**
 * Clientes AWS do Lupa (S3 pre-signed + helpers de CDN).
 * Escopo: somente buckets/env `lupa-*` (CLAUDE.md §0).
 */
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    mediaBucket: process.env.LUPA_MEDIA_BUCKET,
    uploadsBucket: process.env.LUPA_UPLOADS_BUCKET,
    cdnDomain: process.env.LUPA_CDN_DOMAIN,
    cognitoUserPoolId: process.env.LUPA_COGNITO_USER_POOL_ID,
    cognitoClientId: process.env.LUPA_COGNITO_CLIENT_ID,
  };
}

export interface PresignedUpload {
  /** URL pré-assinada (PUT) para o browser enviar o arquivo. */
  url: string;
  /** Chave S3 do objeto. */
  key: string;
  /** URL pública via CloudFront após o upload. */
  publicUrl: string;
  expiresIn: number;
  contentType: string;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const MAX_ARTICLE_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

export function isAllowedImageType(contentType: string): boolean {
  return IMAGE_TYPES.has(contentType.toLowerCase());
}

let s3: S3Client | null = null;

function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({ region: getAwsConfig().region });
  }
  return s3;
}

/**
 * Gera URL pré-assinada PUT para imagem de matéria no bucket de mídia.
 * Path: media/articles/{userSub}/{draftOrId}/{uuid}.{ext}
 */
export async function criarPresignedArticleImage(input: {
  contentType: string;
  userSub: string;
  materiaId?: string;
  maxBytes?: number;
}): Promise<PresignedUpload> {
  const contentType = input.contentType.toLowerCase();
  if (!isAllowedImageType(contentType)) {
    throw new Error('Tipo de imagem não permitido. Use JPEG, PNG, WebP ou GIF.');
  }
  const cfg = getAwsConfig();
  if (!cfg.mediaBucket) {
    throw new Error('LUPA_MEDIA_BUCKET não configurado');
  }
  const ext = EXT_BY_TYPE[contentType] ?? 'jpg';
  const folder = input.materiaId?.trim() || `draft-${randomUUID().slice(0, 8)}`;
  const key = `media/articles/${input.userSub}/${folder}/${randomUUID()}.${ext}`;
  const expiresIn = 900; // 15 min

  const command = new PutObjectCommand({
    Bucket: cfg.mediaBucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(getS3(), command, { expiresIn });
  const publicUrl = urlPublicaCdn(key);

  return { url, key, publicUrl, expiresIn, contentType };
}

/**
 * Pre-signed PUT para foto de anúncio Desapegoo.
 * Path: media/desapego/{userSubOrAnon}/{uuid}.{ext}
 * Público (sem login) em Etapa 1 — restrito em Etapa 2.
 */
export async function criarPresignedDesapegoImage(input: {
  contentType: string;
  userSub?: string;
}): Promise<PresignedUpload> {
  const contentType = input.contentType.toLowerCase();
  if (!isAllowedImageType(contentType)) {
    throw new Error('Tipo de imagem não permitido. Use JPEG, PNG, WebP ou GIF.');
  }
  const cfg = getAwsConfig();
  if (!cfg.mediaBucket) {
    throw new Error('LUPA_MEDIA_BUCKET não configurado');
  }
  const ext = EXT_BY_TYPE[contentType] ?? 'jpg';
  const owner = input.userSub?.trim() || 'anon';
  const key = `media/desapego/${owner}/${randomUUID()}.${ext}`;
  const expiresIn = 900;
  const command = new PutObjectCommand({
    Bucket: cfg.mediaBucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(getS3(), command, { expiresIn });
  return { url, key, publicUrl: urlPublicaCdn(key), expiresIn, contentType };
}

/** URL pública via CloudFront para um objeto de mídia. */
export function urlPublicaCdn(key: string): string {
  const { cdnDomain } = getAwsConfig();
  const clean = key.replace(/^\//, '');
  return cdnDomain ? `https://${cdnDomain}/${clean}` : `/${clean}`;
}

/**
 * Normaliza URL de imagem: paths relativos `/media/...` do seed antigo
 * não são servidos pelo web CDN — devolve undefined para usar placeholder.
 */
export function resolveImageUrl(src?: string | null): string | undefined {
  if (!src?.trim()) return undefined;
  const s = src.trim();
  if (s.startsWith('https://') || s.startsWith('http://')) return s;
  // Paths relativos de seed fictício → placeholder (evita <img> quebrado)
  if (s.startsWith('/media/cover-') || s.startsWith('/avatars/')) return undefined;
  if (s.startsWith('/')) {
    const { cdnDomain } = getAwsConfig();
    if (cdnDomain && s.startsWith('/media/')) {
      return `https://${cdnDomain}${s}`;
    }
  }
  return s;
}
