'use client';

import { useState, useTransition } from 'react';
import type { EditoriaSlug, ModoAutomatico } from '@/types';
import { setModoAutomaticoAction } from '@/lib/actions/config';
import { editoriaNome } from '@/lib/editorias';

export function ModoAutomaticoPanel({
  modos,
  editorias,
}: {
  modos: ModoAutomatico[];
  editorias: EditoriaSlug[];
}) {
  const map = new Map(modos.map((m) => [m.categoria, m]));
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState('');
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const e of editorias) init[e] = !!map.get(e)?.ativo;
    return init;
  });

  const toggle = (slug: EditoriaSlug) => {
    const next = !local[slug];
    setErro('');
    setLocal((s) => ({ ...s, [slug]: next }));
    startTransition(async () => {
      const r = await setModoAutomaticoAction(slug, next);
      if (!r.ok) {
        setLocal((s) => ({ ...s, [slug]: !next }));
        setErro(r.erro ?? 'Falha');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">Modo automático</h2>
        <p className="mt-1 font-serif text-[14px] text-gray-500">
          Com o modo ligado, matérias enviadas na editoria publicam sem passar pela fila do
          Diretor. Vídeo/podcast continuam sob revisão manual.
        </p>
      </div>
      {erro ? (
        <p className="rounded border border-ink bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink">
          {erro}
        </p>
      ) : null}
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {editorias.map((slug) => (
          <li key={slug} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <div className="font-display text-sm font-bold text-ink">{editoriaNome(slug)}</div>
              <div className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">
                {slug}
              </div>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => toggle(slug)}
              className={`rounded-pill px-4 py-1.5 font-mono text-[11px] font-semibold disabled:opacity-50 ${
                local[slug]
                  ? 'bg-ink text-white'
                  : 'border border-line text-gray-600 hover:border-ink'
              }`}
              aria-pressed={local[slug]}
            >
              {local[slug] ? 'Ligado' : 'Desligado'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
