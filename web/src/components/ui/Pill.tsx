import type { ReactNode } from 'react';

/**
 * Pill de aba/sub-aba. Ativo = preenchimento (preto no claro, branco no escuro).
 * `surface` define o contexto de contraste.
 */
export function Pill({
  children,
  active = false,
  surface = 'light',
}: {
  children: ReactNode;
  active?: boolean;
  surface?: 'light' | 'dark';
}) {
  const base =
    'inline-flex items-center rounded-pill px-4 py-2 font-display text-[13px] transition-colors';
  const styles =
    surface === 'dark'
      ? active
        ? 'bg-white text-ink font-bold'
        : 'border border-white/20 text-on-dark-muted font-semibold hover:text-on-dark'
      : active
        ? 'bg-ink text-white font-bold'
        : 'border border-line text-gray-700 font-semibold hover:border-ink';
  return <span className={`${base} ${styles}`}>{children}</span>;
}
