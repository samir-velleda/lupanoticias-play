'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { erroNaoEditavel, podeEditar } from '@/lib/domain/materia';
import { isEditoriaSlug } from '@/lib/editorias';
import type { CriarMateriaInput, EditoriaSlug, Materia } from '@/types';

// Valida os 5 tipos de bloco do corpo (não mais z.any()): rejeita JSON malformado
// antes de gravar no Aurora → o site nunca renderiza um bloco quebrado.
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

/** Salva rascunho (cria/atualiza) e, opcionalmente, envia para revisão. */
export async function salvarMateria(payload: SalvarMateriaPayload): Promise<void> {
  const usuario = await exigirGrupo('jornalista', 'diretor');
  const data = materiaSchema.parse(payload);
  const input: CriarMateriaInput = {
    titulo: data.titulo,
    standfirst: data.standfirst,
    editoria: data.editoria as EditoriaSlug,
    corpo: data.corpo,
    tags: data.tags.filter(Boolean),
    heroImageUrl: data.heroImageUrl || undefined,
    heroCaption: data.heroCaption || undefined,
    pautaId: data.pautaId || undefined,
  };

  let materia: Materia;
  if (payload.id) {
    // Autorização por RECURSO (não só por papel): a matéria tem de ser do autor
    // (admin passa livre) e estar num estado editável — bloqueia editar/ despublicar
    // conteúdo alheio ou já publicado direto pela URL da action. Ver [[gap ownership]].
    const atual = await repositories.materias.getById(payload.id);
    if (!atual) throw new Error('Matéria não encontrada.');
    const autorId = autorIdDoUsuario(usuario);
    const dono = atual.autores.some((a) => a.id === autorId);
    if (!dono && !usuario.grupos.includes('admin')) {
      throw new Error('Você só pode editar as suas próprias matérias.');
    }
    if (!podeEditar(atual.status)) throw new Error(erroNaoEditavel(atual.status));
    materia = await repositories.materias.atualizar(payload.id, input);
  } else {
    materia = await repositories.materias.criar(input);
  }

  if (payload.enviar) {
    const enviada = await repositories.materias.enviarParaRevisao(materia.id);
    if (enviada.status === 'publicada') {
      // Modo automático publicou direto → aparece no site na hora.
      revalidatePath('/');
      revalidatePath(`/${enviada.editoria}`);
      revalidatePath(`/${enviada.editoria}/${enviada.slug}`);
    }
    // Nova pendente entra na fila do Diretor.
    revalidatePath('/admin/redacao');
    revalidatePath('/admin');
  }

  revalidatePath('/jornalista');
  revalidatePath('/jornalista/correcoes');
  redirect('/jornalista');
}

/**
 * Abre (ou reusa) um rascunho de correção de uma matéria PUBLICADA e leva o autor ao
 * editor. A versão no ar não muda: a correção passa pelo fluxo de revisão e só é aplicada
 * na origem quando aprovada. Mantém a trava de ownership (não corrige matéria alheia).
 */
export async function reabrirParaCorrecao(origemId: string): Promise<void> {
  const usuario = await exigirGrupo('jornalista', 'diretor');
  const origem = await repositories.materias.getById(origemId);
  if (!origem) throw new Error('Matéria não encontrada.');
  const autorId = autorIdDoUsuario(usuario);
  const dono = origem.autores.some((a) => a.id === autorId);
  if (!dono && !usuario.grupos.includes('admin')) {
    throw new Error('Você só pode corrigir as suas próprias matérias.');
  }
  const draft = await repositories.materias.reabrirParaCorrecao(origemId, autorId);
  revalidatePath('/jornalista');
  redirect(`/jornalista/materia/${draft.id}`);
}
