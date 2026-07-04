'use client';

import { useState, useTransition } from 'react';
import { definirModoAutomatico } from '@/lib/actions/redacao';

export interface EditoriaModo {
  slug: string;
  nome: string;
  ativo: boolean;
}

/**
 * Toggle de modo automático por editoria: quando ligado, matérias enviadas naquela
 * editoria são publicadas SEM revisão. DESIGN_SPEC / EDITORIAL_WORKFLOW.
 */
export function ModoAutomaticoToggles({ editorias }: { editorias: EditoriaModo[] }) {
  return (
    <div className="divide-y divide-line rounded-lg border border-line bg-surface">
      {editorias.map((e) => (
        <ToggleLinha key={e.slug} slug={e.slug} nome={e.nome} ativoInicial={e.ativo} />
      ))}
    </div>
  );
}

function ToggleLinha({ slug, nome, ativoInicial }: { slug: string; nome: string; ativoInicial: boolean }) {
  const [ativo, setAtivo] = useState(ativoInicial);
  const [pending, start] = useTransition();

  const toggle = () => {
    const novo = !ativo;
    setAtivo(novo); // otimista
    start(async () => {
      try {
        await definirModoAutomatico(slug, novo);
      } catch {
        setAtivo(!novo); // reverte em falha
      }
    });
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="font-display text-sm font-semibold text-ink">{nome}</span>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        aria-label={`Modo automático em ${nome}`}
        disabled={pending}
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors disabled:opacity-60 ${
          ativo ? 'bg-ink' : 'bg-surface-3 border border-line'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-pill bg-white shadow-sm transition-transform ${
            ativo ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
