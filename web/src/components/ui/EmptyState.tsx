import type { ReactNode } from 'react';
import { Kicker } from './Kicker';

/** Estado vazio/erro padrão das listas (DESIGN_SPEC §7 — estados). */
export function EmptyState({
  titulo = 'Nada por aqui ainda',
  descricao,
  children,
}: {
  titulo?: string;
  descricao?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <Kicker tone="muted">Sem conteúdo</Kicker>
      <p className="font-display text-lg font-bold text-ink">{titulo}</p>
      {descricao ? (
        <p className="max-w-sm font-serif text-[15px] text-gray-500">{descricao}</p>
      ) : null}
      {children}
    </div>
  );
}
