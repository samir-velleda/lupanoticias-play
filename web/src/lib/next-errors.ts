/**
 * Helpers de erro do Next usáveis em Server Actions e Client Components
 * (sem importar next/cache — seguro no browser).
 */

export function isNextControlFlowError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const digest =
    'digest' in e && (e as { digest?: unknown }).digest != null
      ? String((e as { digest: unknown }).digest)
      : '';
  // Next 13–16: redirect/notFound usam digest, não message legível.
  if (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND')) return true;
  if (e instanceof Error && /NEXT_REDIRECT|NEXT_NOT_FOUND/.test(e.message)) return true;
  return false;
}

export function mensagemErro(e: unknown, fallback: string): string {
  if (isNextControlFlowError(e)) return fallback;
  if (e instanceof Error && e.message) {
    if (/^ERROR\s+\d/i.test(e.message)) return fallback;
    if (e.message.includes('ENOENT') || e.message.includes('/var/task')) {
      return `${fallback} (cache do servidor — atualize a página; a ação pode ter sido salva)`;
    }
    // Zod
    if (e.name === 'ZodError') return 'Dados inválidos. Revise título, editoria e corpo.';
    return e.message;
  }
  if (e && typeof e === 'object' && 'digest' in e) {
    return `${fallback} (ref ${(e as { digest: unknown }).digest})`;
  }
  return fallback;
}
