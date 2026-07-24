/**
 * Pool PostgreSQL do Aurora (Serverless v2) para o Lambda web.
 * Credenciais via Secrets Manager (`LUPA_AURORA_SECRET_ARN`).
 * Só ativo quando `LUPA_USE_AURORA=true`.
 */
import 'server-only';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

interface AuroraSecret {
  username: string;
  password: string;
  host?: string;
  port?: number | string;
  dbname?: string;
  engine?: string;
}

let poolPromise: Promise<Pool> | null = null;
let schemaReady: Promise<void> | null = null;

function region(): string {
  return process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
}

async function loadSecret(): Promise<AuroraSecret> {
  const arn = process.env.LUPA_AURORA_SECRET_ARN;
  if (!arn) throw new Error('LUPA_AURORA_SECRET_ARN não configurado');
  const client = new SecretsManagerClient({ region: region() });
  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) throw new Error('Segredo Aurora vazio');
  return JSON.parse(res.SecretString) as AuroraSecret;
}

export async function getPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const secret = await loadSecret();
      const host = process.env.LUPA_AURORA_ENDPOINT || secret.host;
      if (!host) throw new Error('LUPA_AURORA_ENDPOINT / host do segredo ausente');
      const database =
        process.env.LUPA_AURORA_DB_NAME || secret.dbname || 'lupa';
      const port = Number(process.env.LUPA_AURORA_PORT || secret.port || 5432);
      return new Pool({
        host,
        port,
        database,
        user: secret.username,
        password: secret.password,
        max: 4,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 8_000,
        ssl: { rejectUnauthorized: false },
      });
    })();
  }
  return poolPromise;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = await getPool();
  const res = await pool.query<T>(text, params);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/** Garante schema + seed idempotente (uma vez por container quente). */
export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const { applySchema } = await import('./schema');
      const { seedIfEmpty } = await import('./seed');
      await applySchema();
      await seedIfEmpty();
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

export function useAurora(): boolean {
  return process.env.LUPA_USE_AURORA === 'true';
}
