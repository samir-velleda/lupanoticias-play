'use server';

import { z } from 'zod';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { STATUS_LICENCA } from '@/lib/tenant';
import { isNextControlFlowError, mensagemErro, safeRevalidatePath } from '@/lib/cache-safe';
import type { StatusLicenca } from '@/types';

const cidadeSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da cidade.').max(80),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'UF inválida (2 letras).'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido (use letras, números e hífen).'),
  status: z.enum(['trial', 'ativa', 'inadimplente', 'suspensa', 'cancelada']).default('trial'),
  permiteEstadual: z.boolean().default(true),
  permiteNacional: z.boolean().default(false),
  diretorAuthorId: z.string().trim().optional(),
});

export interface CidadeActionResult {
  ok: boolean;
  erro?: string;
  id?: string;
  redirectTo?: string;
}

function revalidar() {
  safeRevalidatePath('/admin');
  safeRevalidatePath('/admin/cidades');
  safeRevalidatePath('/admin/usuarios');
  safeRevalidatePath('/admin/redacao');
}

/** Master cria uma licença/cidade. */
export async function criarCidade(payload: z.input<typeof cidadeSchema>): Promise<CidadeActionResult> {
  try {
    await exigirGrupo('admin');
    const parsed = cidadeSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }
    const data = parsed.data;
    if (!STATUS_LICENCA.includes(data.status as StatusLicenca)) {
      return { ok: false, erro: 'Status de licença inválido.' };
    }
    const existente = await repositories.cidades.getBySlug(data.slug);
    if (existente) return { ok: false, erro: `Já existe licença com slug "${data.slug}".` };

    const cidade = await repositories.cidades.criar({
      nome: data.nome,
      uf: data.uf,
      slug: data.slug,
      status: data.status as StatusLicenca,
      permiteEstadual: data.permiteEstadual,
      permiteNacional: data.permiteNacional,
      diretorAuthorId: data.diretorAuthorId || undefined,
    });
    revalidar();
    return { ok: true, id: cidade.id, redirectTo: '/admin/cidades' };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[lupa] criarCidade', e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao criar cidade/licença.') };
  }
}

/** Master atualiza licença (status mensal, flags de rede, diretor). */
export async function atualizarCidade(
  id: string,
  payload: Partial<z.input<typeof cidadeSchema>>,
): Promise<CidadeActionResult> {
  try {
    await exigirGrupo('admin');
    if (!id?.trim()) return { ok: false, erro: 'Cidade inválida.' };
    const cur = await repositories.cidades.getById(id);
    if (!cur) return { ok: false, erro: 'Cidade não encontrada.' };

    const merged = {
      nome: payload.nome ?? cur.nome,
      uf: payload.uf ?? cur.uf,
      slug: payload.slug ?? cur.slug,
      status: payload.status ?? cur.status,
      permiteEstadual: payload.permiteEstadual ?? cur.permiteEstadual,
      permiteNacional: payload.permiteNacional ?? cur.permiteNacional,
      diretorAuthorId: payload.diretorAuthorId ?? cur.diretorAuthorId,
    };
    const parsed = cidadeSchema.safeParse(merged);
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    await repositories.cidades.atualizar(id, {
      ...parsed.data,
      status: parsed.data.status as StatusLicenca,
      diretorAuthorId: parsed.data.diretorAuthorId || undefined,
    });
    revalidar();
    return { ok: true, id, redirectTo: `/admin/cidades/${id}` };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[lupa] atualizarCidade', e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao atualizar licença.') };
  }
}
