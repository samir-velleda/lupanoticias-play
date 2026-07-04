import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Pool `pg` para o Aurora, com credenciais lidas do Secrets Manager em runtime
 * (nunca em env/SSM texto-claro). Cacheado por instância de Lambda (warm start).
 * O Lambda entra na VPC (subnets app) e alcança o cluster isolado via db-sg.
 */

/** Config presente? (Lambda deployado). Em dev local fica false → usa mock. */
export function auroraConfigurada(): boolean {
  return !!(process.env.LUPA_AURORA_SECRET_ARN && process.env.LUPA_AURORA_ENDPOINT);
}

interface DbCreds {
  username: string;
  password: string;
}

let credsPromise: Promise<DbCreds> | null = null;
async function carregarCreds(): Promise<DbCreds> {
  if (!credsPromise) {
    credsPromise = (async () => {
      const sm = new SecretsManagerClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
      const res = await sm.send(
        new GetSecretValueCommand({ SecretId: process.env.LUPA_AURORA_SECRET_ARN }),
      );
      const json = JSON.parse(res.SecretString ?? '{}') as { username?: string; password?: string };
      if (!json.username || !json.password) {
        throw new Error('Secret do Aurora sem username/password.');
      }
      return { username: json.username, password: json.password };
    })().catch((e) => {
      credsPromise = null; // permite retry no próximo request
      throw e;
    });
  }
  return credsPromise;
}

let poolPromise: Promise<Pool> | null = null;
async function getPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const creds = await carregarCreds();
      const pool = new Pool({
        host: process.env.LUPA_AURORA_ENDPOINT,
        port: Number(process.env.LUPA_AURORA_PORT ?? 5432),
        database: process.env.LUPA_AURORA_DB_NAME ?? 'lupa',
        user: creds.username,
        password: creds.password,
        max: Number(process.env.LUPA_AURORA_POOL_MAX ?? 3),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        // TLS: conexão criptografada. O cluster fica em subnets isoladas; em prod,
        // trocar por verificação com a CA global do RDS. (rejectUnauthorized=false
        // mantém a criptografia, sem validar a cadeia do certificado.)
        ssl: { rejectUnauthorized: false },
      });
      pool.on('error', () => {
        // Erro em cliente ocioso: descarta o pool p/ recriar no próximo uso.
        poolPromise = null;
      });
      return pool;
    })().catch((e) => {
      poolPromise = null;
      throw e;
    });
  }
  return poolPromise;
}

/** Executa uma query parametrizada (statement único). */
export async function q<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const pool = await getPool();
  const res = await pool.query<T>(text, params as never[]);
  return res.rows;
}

/**
 * Executa SQL bruto (protocolo simples) — permite MÚLTIPLOS statements num só texto
 * (ex.: o schema DDL). Não aceita parâmetros. Usado só pelo bootstrap.
 */
export async function exec(sql: string): Promise<void> {
  const pool = await getPool();
  await pool.query(sql);
}

/** Executa uma transação (para operações multi-tabela: criar matéria + autores). */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignora falha de rollback */
    }
    throw e;
  } finally {
    client.release();
  }
}
