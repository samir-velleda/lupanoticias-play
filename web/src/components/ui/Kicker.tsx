import type { ReactNode } from 'react';

/** Kicker / metadado — IBM Plex Mono, CAIXA ALTA, tracking largo (DESIGN_SYSTEM §3). */
export function Kicker({
  children,
  className = '',
  tone = 'ink',
  as: Tag = 'span',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'ink' | 'muted' | 'on-dark';
  as?: 'span' | 'div' | 'p';
}) {
  const color =
    tone === 'muted'
      ? 'text-gray-400'
      : tone === 'on-dark'
        ? 'text-on-dark-muted'
        : 'text-ink';
  return (
    <Tag
      className={`font-mono text-[11px] font-semibold uppercase tracking-kicker ${color} ${className}`}
    >
      {children}
    </Tag>
  );
}
