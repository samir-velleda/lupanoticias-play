/**
 * Regras de domínio do workflow editorial (compartilhadas UI / actions / testes).
 */
import type { ArticleBlock, StatusMateria } from '@/types';

/** Status em que o jornalista ainda pode editar e reenviar. */
export const STATUS_EDITAVEL: ReadonlySet<StatusMateria> = new Set([
  'rascunho',
  'pendente',
  'recusada',
  'em_correcao',
]);

/** Status aceitos para enviar à fila do diretor. */
export const STATUS_PODE_ENVIAR: ReadonlySet<StatusMateria> = new Set([
  'rascunho',
  'pendente',
  'recusada',
  'em_correcao',
]);

export function corpoTemConteudo(corpo: ArticleBlock[]): boolean {
  return corpo.some((b) => {
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'pullquote') {
      return b.text.trim().length > 0;
    }
    if (b.type === 'image') return b.url.trim().length > 0;
    if (b.type === 'embed') return b.mediaId.trim().length > 0;
    return false;
  });
}

/** Remove blocos de texto vazios; mantém estrutura mínima. */
export function limparCorpo(corpo: ArticleBlock[]): ArticleBlock[] {
  const limpo = corpo.filter((b) => {
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'pullquote') {
      return b.text.trim().length > 0;
    }
    if (b.type === 'image') return b.url.trim().length > 0;
    if (b.type === 'embed') return b.mediaId.trim().length > 0;
    return true;
  });
  return limpo.length > 0 ? limpo : [{ type: 'paragraph', text: '' }];
}
