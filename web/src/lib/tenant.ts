/**
 * Multi-cidade / licenças — regras de tenant.
 * Admin = Master (plataforma). Diretor e Jornalista = por cidade.
 */
import type { Author, Cidade, EscopoConteudo, Papel, StatusLicenca } from '@/types';
import type { Usuario } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { autorDoUsuario } from '@/lib/auth/perfil';

export const CIDADE_MATRIZ_ID = 'cid-matriz';
export const CIDADE_MATRIZ_SLUG = 'matriz';

export const ESCOPOS: EscopoConteudo[] = ['local', 'estadual', 'nacional'];
export const STATUS_LICENCA: StatusLicenca[] = [
  'trial',
  'ativa',
  'inadimplente',
  'suspensa',
  'cancelada',
];

export function isEscopo(v: string): v is EscopoConteudo {
  return (ESCOPOS as string[]).includes(v);
}

export function isMaster(u: Usuario): boolean {
  return u.grupos.includes('admin');
}

export function papelPrincipal(u: Usuario): Papel {
  if (u.grupos.includes('admin')) return 'admin';
  if (u.grupos.includes('diretor')) return 'diretor';
  return 'jornalista';
}

export interface ContextoEditorial {
  usuario: Usuario;
  author: Author;
  isMaster: boolean;
  /** null = Master sem filtro de cidade. */
  cidadeId: string | null;
  cidade: Cidade | null;
}

/**
 * Garante a cidade matriz (tenant default). Idempotente.
 * Evita falha de pauta/multicidade quando o deploy sobe sem seed.
 */
export async function ensureCidadeMatriz(): Promise<Cidade> {
  const existente = await repositories.cidades.getById(CIDADE_MATRIZ_ID);
  if (existente) return existente;
  const porSlug = await repositories.cidades.getBySlug(CIDADE_MATRIZ_SLUG);
  if (porSlug) return porSlug;
  // Mock/Aurora: cria com slug matriz (id pode ser gerado no Aurora; preferimos getBySlug depois).
  try {
    return await repositories.cidades.criar({
      nome: 'Lupa Matriz',
      uf: 'BR',
      slug: CIDADE_MATRIZ_SLUG,
      status: 'ativa',
      permiteEstadual: true,
      permiteNacional: true,
    });
  } catch {
    const again =
      (await repositories.cidades.getById(CIDADE_MATRIZ_ID)) ??
      (await repositories.cidades.getBySlug(CIDADE_MATRIZ_SLUG));
    if (again) return again;
    throw new Error('Não foi possível inicializar a cidade matriz (cid-matriz).');
  }
}

/** Resolve author + cidade do usuário logado (cria author se preciso). */
export async function contextoEditorial(u: Usuario): Promise<ContextoEditorial> {
  const author = await autorDoUsuario(u);
  const master = isMaster(u);
  // Bootstrap tenant antes de qualquer filtro.
  const matriz = await ensureCidadeMatriz();
  // Master: sem filtro obrigatório de cidade (pode ver todas).
  // Diretor/Jornalista: cidade do author (ou matriz como fallback legado).
  const cidadeId = master ? null : (author.cidadeId ?? matriz.id);
  let cidade = cidadeId ? await repositories.cidades.getById(cidadeId) : null;
  if (!master && !cidade) {
    // Author apontando para cidade inexistente → fallback matriz (não trava pauta).
    cidade = matriz;
  }
  return {
    usuario: u,
    author,
    isMaster: master,
    cidadeId: master ? null : (cidade?.id ?? matriz.id),
    cidade: master ? null : cidade,
  };
}

/** Licença permite escrita editorial? */
export function licencaPermiteEscrita(c: Cidade | null | undefined): boolean {
  // Sem registro (legado/bootstrap): não bloqueia — Master/redação continua operando.
  if (!c) return true;
  return c.status === 'ativa' || c.status === 'trial';
}

/** Valida se o escopo pedido é permitido pela licença da cidade. */
export function escopoPermitido(cidade: Cidade | null | undefined, escopo: EscopoConteudo): boolean {
  if (escopo === 'local') return true;
  if (!cidade) return false;
  if (escopo === 'estadual') return cidade.permiteEstadual;
  if (escopo === 'nacional') return cidade.permiteNacional;
  return false;
}

export function rotuloEscopo(e: EscopoConteudo): string {
  if (e === 'local') return 'Local';
  if (e === 'estadual') return 'Estadual';
  return 'Nacional';
}

export function rotuloStatusLicenca(s: StatusLicenca): string {
  const map: Record<StatusLicenca, string> = {
    trial: 'Trial',
    ativa: 'Ativa',
    inadimplente: 'Inadimplente',
    suspensa: 'Suspensa',
    cancelada: 'Cancelada',
  };
  return map[s] ?? s;
}
