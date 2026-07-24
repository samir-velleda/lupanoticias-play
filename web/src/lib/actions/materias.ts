'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { isEditoriaSlug } from '@/lib/editorias';
import type { ArticleBlock, CriarMateriaInput, EditoriaSlug } from '@/types';

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
});

export interface SalvarMateriaPayload extends z.input<typeof materiaSchema> {
  id?: string;
  enviar?: boolean;
}

function corpoTemConteudo(corpo: ArticleBlock[]): boolean {
  return corpo.some((b) => {
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'pullquote') {
      return b.text.trim().length > 0;
    }
    if (b.type === 'image') return b.url.trim().length > 0;
    if (b.type === 'embed') return b.mediaId.trim().length > 0;
    return false;
  });
}

function revalidateEditorial(editoria?: string, slug?: string) {
  revalidatePath('/jornalista');
  revalidatePath('/jornalista/correcoes');
  revalidatePath('/admin');
  revalidatePath('/admin/redacao');
  revalidatePath('/');
  if (editoria) {
    revalidatePath(`/${editoria}`);
    if (slug) revalidatePath(`/${editoria}/${slug}`);
  }
}

const STATUS_EDITAVEL = new Set(['rascunho', 'pendente', 'recusada', 'em_correcao']);

/** Salva rascunho (cria/atualiza) e, opcionalmente, envia para revisão. */
export async function salvarMateria(payload: SalvarMateriaPayload): Promise<void> {
  const usuario = await exigirGrupo('jornalista', 'diretor', 'admin');
  const data = materiaSchema.parse(payload);

  if (payload.enviar && !corpoTemConteudo(data.corpo as ArticleBlock[])) {
    throw new Error('Escreva o corpo da matéria antes de enviar para revisão.');
  }

  const autorId = await autorIdDoUsuario(usuario);
  const isStaff = usuario.grupos.includes('admin') || usuario.grupos.includes('diretor');

  if (payload.id) {
    const atual = await repositories.materias.getById(payload.id);
    if (!atual) throw new Error('Matéria não encontrada.');
    const dono = atual.autores.some((a) => a.id === autorId);
    if (!dono && !isStaff) {
      throw new Error('Você não pode editar a matéria de outro autor.');
    }
    if (!STATUS_EDITAVEL.has(atual.status) && !isStaff) {
      throw new Error(`Matéria com status "${atual.status}" não pode mais ser editada.`);
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
  };

  const materia = payload.id
    ? await repositories.materias.atualizar(payload.id, {
        ...input,
        // Não trocar autor em update (evita reatribuir matéria alheia).
        autorId: undefined,
      })
    : await repositories.materias.criar(input);

  if (payload.enviar) {
    await repositories.materias.enviarParaRevisao(materia.id);
  }

  revalidateEditorial(materia.editoria, materia.slug);
  redirect('/jornalista');
}

export interface AcaoRedacaoResult {
  ok: boolean;
  erro?: string;
}

/** Aprova matéria pendente (publica imediatamente se sem agendamento). */
export async function aprovarMateria(materiaId: string): Promise<AcaoRedacaoResult> {
  try {
    const usuario = await exigirGrupo('admin', 'diretor');
    const revisorId = await autorIdDoUsuario(usuario);
    const m = await repositories.materias.aprovar(materiaId, revisorId);
    revalidateEditorial(m.editoria, m.slug);
    revalidatePath(`/admin/redacao/${materiaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao aprovar' };
  }
}

/** Recusa matéria com justificativa obrigatória. */
export async function recusarMateria(
  materiaId: string,
  justificativa: string,
): Promise<AcaoRedacaoResult> {
  try {
    const usuario = await exigirGrupo('admin', 'diretor');
    if (!justificativa?.trim()) {
      return { ok: false, erro: 'Justificativa é obrigatória.' };
    }
    const revisorId = await autorIdDoUsuario(usuario);
    const m = await repositories.materias.recusar(materiaId, revisorId, justificativa.trim());
    revalidateEditorial(m.editoria, m.slug);
    revalidatePath(`/admin/redacao/${materiaId}`);
    revalidatePath('/jornalista/correcoes');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao recusar' };
  }
}
