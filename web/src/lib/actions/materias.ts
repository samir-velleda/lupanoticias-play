'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { isEditoriaSlug } from '@/lib/editorias';
import type { ArticleBlock, CriarMateriaInput, EditoriaSlug } from '@/types';

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
  await exigirGrupo('jornalista', 'diretor');
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

  const materia = payload.id
    ? await repositories.materias.atualizar(payload.id, input)
    : await repositories.materias.criar(input);

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
