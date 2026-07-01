/**
 * Configuração central de ambiente e naming do projeto Lupa.
 * GUARDA-CORPO: nomes de recursos SEMPRE via `resourceName()` (prefixo `lupa-`)
 * e stacks via `stackName()` (prefixo `Lupa`). Ver CLAUDE.md §0.
 */
import { NAME_PREFIX, STACK_PREFIX } from './tags';

export const REGION = 'us-east-1';

export type LupaEnv = 'dev' | 'prod';

export function resolveEnv(raw: string | undefined): LupaEnv {
  const e = (raw ?? 'dev').toLowerCase();
  if (e !== 'dev' && e !== 'prod') {
    throw new Error(`Ambiente inválido: "${raw}". Use "dev" ou "prod".`);
  }
  return e;
}

export const isProd = (env: LupaEnv): boolean => env === 'prod';

/** Nome físico de recurso: `lupa-<nome>-<env>` (fronteira de isolamento). */
export function resourceName(name: string, env: LupaEnv): string {
  return `${NAME_PREFIX}${name}-${env}`;
}

/** Nome de stack: `Lupa<Nome>-<env>`. */
export function stackName(name: string, env: LupaEnv): string {
  return `${STACK_PREFIX}${name}-${env}`;
}

/** Prefixo de parâmetros SSM/segredos por ambiente: `/lupa/<env>`. */
export function ssmPrefix(env: LupaEnv): string {
  return `/lupa/${env}`;
}
