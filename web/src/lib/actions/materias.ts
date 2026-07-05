'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { erroNaoEditavel, podeEditar } from '@/lib/domain/materia';
import { isEditoriaSlug } from '@/lib/editorias';
import type { ArticleBlock, CriarMateriaInput, EditoriaSlug, Materia } from '@/types';

const bloco = z.any().transform((b) => b as ArticleBlock);

const materiaSchema = z.object({
  titulo: z.string().trim().min(1, 'Título obrigatório').max(140),
  standfirst: z.string().trim().default(''),
  editoria: z.string().refine(isEditoriaSlug, 'Editoria inválida'),
  tags: z.array(z.string().trim()).default([]),
  corpo: z.array(bloco).default([]),
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
