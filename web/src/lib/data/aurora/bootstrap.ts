import 'server-only';
import { exec, tx } from '../db';
import { SCHEMA_SQL } from './schema';
import { seedInicial } from './seed';

/**
 * Bootstrap idempotente do Aurora: aplica o schema (CREATE IF NOT EXISTS) e o seed
 * pt-BR (ON CONFLICT DO NOTHING). Nunca deleta/sobrescreve. Disparado só na PARADA 4,
 * de dentro da VPC (via rota guardada /api/_bootstrap). Seguro para re-execução.
 */
export async function bootstrapDb(): Promise<{ schema: 'ok'; contagens: Record<string, number> }> {
  await exec(SCHEMA_SQL);
  const contagens = await tx((c) => seedInicial(c));
  return { schema: 'ok', contagens };
}
