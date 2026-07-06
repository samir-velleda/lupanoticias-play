import 'server-only';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UPLOAD_URL_TTL_SEC } from './upload-config';

/**
 * Gera URL pré-assinada (PUT único) para o browser subir o arquivo direto ao
 * lupa-uploads-<env>. O Lambda (role) precisa de s3:PutObject na chave (web-stack).
 * Multipart (retomável) fica para uma iteração futura; PUT único cobre o teto de 4 GB.
 */
const REGION = process.env.AWS_REGION ?? 'us-east-1';
const UPLOADS_BUCKET = process.env.LUPA_UPLOADS_BUCKET;

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) _client = new S3Client({ region: REGION });
  return _client;
}

export function uploadConfigurado(): boolean {
  return !!UPLOADS_BUCKET;
}

export interface PresignedPut {
  url: string;
  key: string;
  expiresIn: number;
}

export async function presignUploadPut(params: {
  key: string;
  contentType: string;
}): Promise<PresignedPut> {
  if (!UPLOADS_BUCKET) throw new Error('LUPA_UPLOADS_BUCKET não configurado.');
  const cmd = new PutObjectCommand({
    Bucket: UPLOADS_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
  });
  const url = await getSignedUrl(client(), cmd, { expiresIn: UPLOAD_URL_TTL_SEC });
  return { url, key: params.key, expiresIn: UPLOAD_URL_TTL_SEC };
}
