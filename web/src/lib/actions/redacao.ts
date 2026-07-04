'use server';

import { revalidatePath } from 'next/cache';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { isEditoriaSlug } from '@/lib/editorias';
import type { EditoriaSlug } from '@/types';

/** Revalida as rotas públicas afetadas por uma publicação/mudança de status. */
function revalidarPublico(editoria?: string, slug?: string) {
  revalidatePath('/');
  if (editoria) revalidatePath(`/${editoria}`);
  if (editoria && slug) revalidatePath(`/${editoria}/${slug}`);
  revalidatePath('/admin/redacao');
  revalidatePath('/admin');
}

/** Diretor/Admin aprova (publica) uma matéria pendente. */
export async function aprovarMateria(id: string): Promise<void> {
  const u = await exigirGrupo('admin', 'diretor');
  const m = await repositories.materias.aprovar(id, u.sub);
  revalidarPublico(m.editoria, m.slug);
}

export interface RecusarResultado {
  ok: boolean;
  erro?: string;
}

/** Diretor/Admin recusa uma matéria — justificativa OBRIGATÓRIA (rejeita se vazia). */
export async function recusarMateria(
  id: string,
  justificativa: string,
): Promise<RecusarResultado> {
  const u = await exigirGrupo('admin', 'diretor');
  const j = justificativa.trim();
  if (!j) {
    return { ok: false, erro: 'A justificativa é obrigatória para recusar.' };
  }
  try {
    const m = await repositories.materias.recusar(id, u.sub, j);
    revalidarPublico(m.editoria, m.slug);
    revalidatePath('/jornalista/correcoes');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao recusar' };
  }
}

/** Diretor/Admin liga/desliga o modo automático (publicação sem revisão) por editoria. */
export async function definirModoAutomatico(categoria: string, ativo: boolean): Promise<void> {
  const u = await exigirGrupo('admin', 'diretor');
  if (!isEditoriaSlug(categoria)) throw new Error('Editoria inválida');
  await repositories.config.setModoAutomatico(categoria as EditoriaSlug, ativo, u.sub);
  revalidatePath('/admin/redacao');
}
