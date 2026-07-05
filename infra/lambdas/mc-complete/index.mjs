/**
 * lupa-mc-complete — disparado pelo EventBridge (MediaConvert Job State Change:
 * COMPLETE | ERROR) para jobs da fila do projeto. Grava no Aurora o playback_url (HLS
 * via CloudFront de mídia), duracao_seg, cover_url e status ('pronto' | 'erro'),
 * vinculando pelo mediaId de UserMetadata. Roda na VPC (app-sg) para alcançar o Aurora.
 */
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const REGION = process.env.AWS_REGION || 'us-east-1';
const { AURORA_SECRET_ARN, AURORA_ENDPOINT, AURORA_DB_NAME, MEDIA_CDN_DOMAIN } = process.env;

let _pool;
async function getPool() {
  if (_pool) return _pool;
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: AURORA_SECRET_ARN }));
  const { username, password } = JSON.parse(res.SecretString || '{}');
  if (!username || !password) throw new Error('secret do Aurora sem username/password');
  _pool = new pg.Pool({
    host: AURORA_ENDPOINT,
    port: 5432,
    database: AURORA_DB_NAME || 'lupa',
    user: username,
    password,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });
  return _pool;
}

/** s3://lupa-media-<env>/media/<...> → https://<cdn>/media/<...> */
function cdnUrl(s3path) {
  if (!s3path) return null;
  const m = String(s3path).match(/^s3:\/\/[^/]+\/(.+)$/);
  return m ? `https://${MEDIA_CDN_DOMAIN}/${m[1]}` : null;
}

export const handler = async (event) => {
  const d = event?.detail || {};
  const mediaId = d.userMetadata?.mediaId;
  const status = d.status;
  if (!mediaId) {
    console.log('evento sem userMetadata.mediaId; ignorando', JSON.stringify(d).slice(0, 300));
    return;
  }
  const pool = await getPool();

  if (status === 'ERROR') {
    await pool.query(`UPDATE media SET status='erro' WHERE id=$1`, [mediaId]);
    console.log('media marcada como erro', { mediaId, error: d.errorMessage });
    return;
  }
  if (status !== 'COMPLETE') {
    console.log('status ignorado', { mediaId, status });
    return;
  }

  let playbackUrl = null;
  let coverUrl = null;
  let durMs = 0;
  for (const g of d.outputGroupDetails || []) {
    for (const pl of g.playlistFilePaths || []) {
      if (/\.m3u8$/i.test(pl)) playbackUrl = cdnUrl(pl);
    }
    for (const od of g.outputDetails || []) {
      if (od.durationInMs) durMs = Math.max(durMs, Number(od.durationInMs));
      for (const fp of od.outputFilePaths || []) {
        if (/\.jpe?g$/i.test(fp)) coverUrl = cdnUrl(fp);
      }
    }
  }
  const durSec = durMs ? Math.round(durMs / 1000) : null;

  await pool.query(
    `UPDATE media
       SET playback_url = $2,
           cover_url    = COALESCE($3, cover_url),
           duracao_seg  = $4,
           status       = 'pronto',
           mc_job_id    = $5
     WHERE id = $1`,
    [mediaId, playbackUrl, coverUrl, durSec, d.jobId || null],
  );
  console.log('media pronta', { mediaId, playbackUrl, durSec, coverUrl });
};
