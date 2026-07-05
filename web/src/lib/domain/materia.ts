import type { StatusMateria } from '@/types';

/**
 * Regras da máquina de estados editorial (DATA_MODEL §workflow / CLAUDE.md §2).
 * Módulo PURO (sem server-only) — usado pelos repositórios, pelas server actions
 * e por testes. Centraliza as transições para não duplicar a guarda.
 *
 * Fluxo: rascunho → (enviar) → pendente → (aprovar) publicada | (recusar) recusada
 *        recusada → (corrigir/reenviar) → pendente ; modo automático publica direto.
 */

/** Estados em que o AUTOR pode editar o conteúdo ou reenviar para revisão. */
export const STATUS_EDITAVEL: readonly StatusMateria[] = [
  'rascunho',
  'recusada',
  'em_correcao',
];

/** Só matéria publicada é servível ao público (leitor). */
export const STATUS_PUBLICO: StatusMateria = 'publicada';

/** O autor pode editar/salvar o conteúdo neste estado? */
export function podeEditar(status: StatusMateria): boolean {
  return STATUS_EDITAVEL.includes(status);
}

/** A matéria pode ser enviada para revisão a partir deste estado? */
export function podeEnviarParaRevisao(status: StatusMateria): boolean {
  return STATUS_EDITAVEL.includes(status);
}

/** Aprovar/recusar só valem sobre uma matéria pendente (evita re-publicação/reset de data). */
export function podeRevisar(status: StatusMateria): boolean {
  return status === 'pendente';
}

/** Mensagem padrão quando uma edição é barrada por estado não-editável. */
export function erroNaoEditavel(status: StatusMateria): string {
  return `Matéria em estado "${status}" não pode ser editada diretamente. Alterações em conteúdo publicado passam pela Direção de Redação.`;
}
