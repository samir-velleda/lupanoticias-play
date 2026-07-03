import type { StatusMateria } from '@/types';

const LABEL: Record<StatusMateria, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  publicada: 'Publicada',
  recusada: 'Recusada',
  em_correcao: 'Em correção',
  arquivada: 'Arquivada',
};

// Monocromático: preenchido (destaque) x contorno (neutro) — sem cor.
const PREENCHIDO: StatusMateria[] = ['publicada', 'pendente'];

export function StatusBadge({ status }: { status: StatusMateria }) {
  const solido = PREENCHIDO.includes(status);
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
        solido ? 'bg-ink text-white' : 'border border-line text-gray-700'
      }`}
    >
      {LABEL[status]}
    </span>
  );
}
