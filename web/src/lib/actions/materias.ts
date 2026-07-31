'use server';

import { z } from 'zod';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { isEditoriaSlug } from '@/lib/editorias';
import {
  contextoEditorial,
  escopoPermitido,
  isEscopo,
  licencaPermiteEscrita,
} from '@/lib/tenant';
import { isNextControlFlowError, mensagemErro, safeRevalidatePath } from '@/lib/cache-safe';
import {
  corpoTemConteudo,
  limparCorpo,
  STATUS_EDITAVEL,
  STATUS_PODE_ENVIAR,
} from '@/lib/editorial';
import type { ArticleBlock, CriarMateriaInput, EditoriaSlug, EscopoConteudo } from '@/types';

const blocoSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({ type: z.literal('heading'), text: z.string() }),
  z.object({ type: z.literal('pullquote'), text: z.string(), cite: z.string().optional() }),
  z.object({ type: z.literal('image'), url: z.string(), caption: z.string().optional() }),
  z.object({ type: z.literal('embed'), mediaId: z.string() }),
]);

const materiaSchema = z.object({
  titulo: z.string().trim().min(1, 'Título obrigatório').max(140),
  standfirst: z.string().trim().default(''),
  editoria: z.string().refine(isEditoriaSlug, 'Editoria inválida'),
  tags: z.array(z.string().trim()).default([]),
  corpo: z.array(blocoSchema).default([]),
  heroImageUrl: z.string().trim().optional(),
  heroCaption: z.string().trim().optional(),
  pautaId: z.string().trim().optional(),
  escopo: z.string().default('local').refine((v) => !v || isEscopo(v), 'Escopo inválido'),
});

export interface SalvarMateriaPayload extends z.input<typeof materiaSchema> {
  id?: string;
  enviar?: boolean;
}

export interface SalvarMateriaResult {
  ok: boolean;
  erro?: string;
  id?: string;
  status?: string;
  /** Cliente deve navegar aqui (evita redirect() que quebra atrás do CloudFront). */
  redirectTo?: string;
}

function revalidateEditorial() {
  safeRevalidatePath('/jornalista');
  safeRevalidatePath('/jornalista/correcoes');
  safeRevalidatePath('/admin');
  safeRevalidatePath('/admin/redacao');
  safeRevalidatePath('/');
}

/**
 * Salva rascunho e opcionalmente envia para revisão.
 * NÃO usa redirect() — retorna { ok, redirectTo } (estável com CF + Lambda).
 */
export async function salvarMateria(
  payload: SalvarMateriaPayload,
): Promise<SalvarMateriaResult> {
  try {
    const usuario = await exigirGrupo('jornalista', 'diretor', 'admin');

    const parsed = materiaSchema.safeParse({
      ...payload,
      corpo: limparCorpo((payload.corpo ?? []) as ArticleBlock[]),
    });
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
    }
    const data = parsed.data;

    if (payload.enviar && !corpoTemConteudo(data.corpo as ArticleBlock[])) {
      return { ok: false, erro: 'Escreva o corpo da matéria antes de enviar para revisão.' };
    }

    const ctx = await contextoEditorial(usuario);
    const autorId = ctx.author.id;
    if (!autorId) {
      return { ok: false, erro: 'Não foi possível identificar o autor. Faça login novamente.' };
    }

    if (!ctx.isMaster && !licencaPermiteEscrita(ctx.cidade)) {
      return {
        ok: false,
        erro: `Licença ${ctx.cidade?.status ?? 'indisponível'}: não é possível publicar. Contate o Master.`,
      };
    }

    const isStaff = usuario.grupos.includes('admin') || usuario.grupos.includes('diretor');
    const cidadeId = ctx.cidadeId ?? ctx.author.cidadeId ?? 'cid-matriz';
    const escopo = (data.escopo || 'local') as EscopoConteudo;
    if (!escopoPermitido(ctx.cidade ?? (await repositories.cidades.getById(cidadeId)), escopo)) {
      return {
        ok: false,
        erro: `Escopo "${escopo}" não permitido para esta licença. Use local ou peça liberação ao Master.`,
      };
    }

    if (data.pautaId) {
      const pautasDisponiveis = await repositories.pautas.listAbertas(
        isStaff && ctx.isMaster ? undefined : autorId,
        ctx.isMaster ? undefined : cidadeId,
      );
      if (!pautasDisponiveis.some((p) => p.id === data.pautaId)) {
        return { ok: false, erro: 'Esta pauta não está disponível para você.' };
      }
    }

    if (payload.id) {
      const atual = await repositories.materias.getById(payload.id);
      if (!atual) return { ok: false, erro: 'Matéria não encontrada.' };
      if (!ctx.isMaster && atual.cidadeId && atual.cidadeId !== cidadeId) {
        return { ok: false, erro: 'Esta matéria pertence a outra cidade/licença.' };
      }
      const dono = atual.autores.some((a) => a.id === autorId);
      if (!dono && !isStaff) {
        return { ok: false, erro: 'Você não pode editar a matéria de outro autor.' };
      }
      if (!STATUS_EDITAVEL.has(atual.status) && !isStaff) {
        return { ok: false, erro: `Matéria com status "${atual.status}" não pode mais ser editada.` };
      }
      if (payload.enviar && !STATUS_PODE_ENVIAR.has(atual.status) && !isStaff) {
        return { ok: false, erro: `Não é possível enviar matéria com status "${atual.status}".` };
      }
      if (atual.status === 'recusada') {
        await repositories.materias.marcarEmCorrecao(atual.id);
      }
    }

    const input: CriarMateriaInput = {
      titulo: data.titulo,
      standfirst: data.standfirst,
      editoria: data.editoria as EditoriaSlug,
      corpo: data.corpo as ArticleBlock[],
      tags: data.tags.filter(Boolean),
      heroImageUrl: data.heroImageUrl || undefined,
      heroCaption: data.heroCaption || undefined,
      pautaId: data.pautaId || undefined,
      autorId,
      cidadeId,
      escopo,
    };

    let materia = payload.id
      ? await repositories.materias.atualizar(payload.id, {
          ...input,
          autorId: undefined,
        })
      : await repositories.materias.criar(input);

    if (!materia.autores.length && !payload.id) {
      return { ok: false, erro: 'Matéria criada sem autor. Tente novamente.' };
    }

    if (payload.enviar) {
      materia = await repositories.materias.enviarParaRevisao(materia.id);
    }
    if (data.pautaId) {
      await repositories.pautas.atualizar(data.pautaId, { status: 'em_producao' });
    }

    revalidateEditorial();
    safeRevalidatePath('/jornalista/pautas');
    return {
      ok: true,
      id: materia.id,
      status: materia.status,
      redirectTo: '/jornalista',
    };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[lupa] salvarMateria', e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao salvar matéria') };
  }
}

export interface AcaoRedacaoResult {
  ok: boolean;
  erro?: string;
  statusFinal?: string;
}

/** Aprova matéria pendente (publica imediatamente). Idempotente se já publicada. */
export async function aprovarMateria(materiaId: string): Promise<AcaoRedacaoResult> {
  try {
    if (!materiaId?.trim()) return { ok: false, erro: 'ID da matéria inválido.' };
    const usuario = await exigirGrupo('admin', 'diretor');
    const ctx = await contextoEditorial(usuario);
    const revisorId = ctx.author.id;
    const atual = await repositories.materias.getById(materiaId);
    if (!atual) return { ok: false, erro: 'Matéria não encontrada.' };
    if (!ctx.isMaster && atual.cidadeId && atual.cidadeId !== ctx.cidadeId) {
      return { ok: false, erro: 'Matéria de outra cidade/licença.' };
    }
    if (atual.status === 'publicada') {
      revalidateEditorial();
      return { ok: true, statusFinal: 'publicada' };
    }
    const m = await repositories.materias.aprovar(materiaId, revisorId);
    revalidateEditorial();
    safeRevalidatePath(`/admin/redacao/${materiaId}`);
    return { ok: true, statusFinal: m.status };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[lupa] aprovarMateria', materiaId, e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao aprovar') };
  }
}

/** Recusa matéria com justificativa. Idempotente se já recusada. */
export async function recusarMateria(
  materiaId: string,
  justificativa: string,
): Promise<AcaoRedacaoResult> {
  try {
    if (!materiaId?.trim()) return { ok: false, erro: 'ID da matéria inválido.' };
    const usuario = await exigirGrupo('admin', 'diretor');
    if (!justificativa?.trim()) {
      return { ok: false, erro: 'Justificativa é obrigatória.' };
    }
    const ctx = await contextoEditorial(usuario);
    const revisorId = ctx.author.id;
    const atual = await repositories.materias.getById(materiaId);
    if (!atual) return { ok: false, erro: 'Matéria não encontrada.' };
    if (!ctx.isMaster && atual.cidadeId && atual.cidadeId !== ctx.cidadeId) {
      return { ok: false, erro: 'Matéria de outra cidade/licença.' };
    }
    if (atual.status === 'recusada' || atual.status === 'em_correcao') {
      revalidateEditorial();
      return { ok: true, statusFinal: atual.status };
    }
    const m = await repositories.materias.recusar(materiaId, revisorId, justificativa.trim());
    revalidateEditorial();
    safeRevalidatePath(`/admin/redacao/${materiaId}`);
    safeRevalidatePath('/jornalista/correcoes');
    return { ok: true, statusFinal: m.status };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[lupa] recusarMateria', materiaId, e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao recusar') };
  }
}
