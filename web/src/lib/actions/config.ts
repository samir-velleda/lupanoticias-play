'use server';

import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { isEditoriaSlug } from '@/lib/editorias';
import { isNextControlFlowError, mensagemErro, safeRevalidatePath } from '@/lib/cache-safe';
import type { EditoriaSlug } from '@/types';

export interface ToggleModoResult {
  ok: boolean;
  erro?: string;
}

/** Liga/desliga modo automático por editoria (admin + diretor). */
export async function setModoAutomaticoAction(
  categoria: string,
  ativo: boolean,
): Promise<ToggleModoResult> {
  try {
    const usuario = await exigirGrupo('admin', 'diretor');
    if (!isEditoriaSlug(categoria)) {
      return { ok: false, erro: 'Editoria inválida' };
    }
    const porId = await autorIdDoUsuario(usuario);
    await repositories.config.setModoAutomatico(categoria as EditoriaSlug, ativo, porId);
    safeRevalidatePath('/admin/configuracoes');
    safeRevalidatePath('/admin/redacao');
    return { ok: true };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return { ok: false, erro: mensagemErro(e, 'Falha ao atualizar') };
  }
}
