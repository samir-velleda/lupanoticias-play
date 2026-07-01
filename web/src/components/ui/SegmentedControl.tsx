'use client';

import { Pill } from './Pill';

export interface SegTab {
  key: string;
  label: string;
}

/**
 * Controle segmentado (abas). Client — troca client-side; ativo = preenchimento.
 * `surface` adapta o contraste (faixa Lupa Play é escura).
 */
export function SegmentedControl({
  tabs,
  value,
  onChange,
  surface = 'light',
  ariaLabel,
}: {
  tabs: SegTab[];
  value: string;
  onChange: (key: string) => void;
  surface?: 'light' | 'dark';
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-2.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          type="button"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className="cursor-pointer rounded-pill focus-visible:outline-2"
        >
          <Pill active={value === t.key} surface={surface}>
            {t.label}
          </Pill>
        </button>
      ))}
    </div>
  );
}
