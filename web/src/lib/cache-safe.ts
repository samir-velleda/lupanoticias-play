/**
 * revalidatePath no Lambda (read-only /var/task) pode falhar.
 * Nunca deve derrubar mutação editorial já commitada no Aurora.
 */
import { revalidatePath } from 'next/cache';

export function safeRevalidatePath(path: string, type?: 'page' | 'layout'): void {
  try {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  } catch (e) {
    console.warn('[lupa] revalidatePath ignorado (Lambda FS):', path, e);
  }
}

export { isNextControlFlowError, mensagemErro } from './next-errors';
