'use client';

import { useState, useTransition } from 'react';
import { aprovarMateria, recusarMateria } from '@/lib/actions/redacao';
import { EmptyState } from '@/components/ui';

export interface PendenteItem {
  id: string;
  titulo: string;
  editoriaNome: string;
  standfirst: string;
  autor: string;
}

/** Fila de aprovação do Diretor: Aprovar (publica) · Recusar (justificativa obrigatória). */
export function RedacaoFila({ pendentes }: { pendentes: PendenteItem[] }) {
  if (pendentes.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma matéria pendente"
        descricao="Quando um jornalista enviar uma matéria para revisão, ela aparece aqui."
      />
    );
  }
  return (
    <div className="space-y-4">
      {pendentes.map((p) => (
        <ItemFila key={p.id} p={p} />
      ))}
    </div>
  );
}

function ItemFila({ p }: { p: PendenteItem }) {
  const [pending, start] = useTransition();
  const [modoRecusa, setModoRecusa] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');

  const aprovar = () =>
    start(async () => {
      setErro('');
      try {
        await aprovarMateria(p.id);
      } catch (e) {
        if (e instanceof Error && !/NEXT_REDIRECT/.test(e.message)) setErro(e.message);
      }
    });

  const recusar = () => {
    if (!justificativa.trim()) {
      setErro('A justificativa é obrigatória para recusar.');
      return;
    }
    start(async () => {
      setErro('');
      const r = await recusarMateria(p.id, justificativa);
      if (!r.ok) setErro(r.erro ?? 'Falha ao recusar');
    });
  };

  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-kicker text-gray-400">
        {p.editoriaNome} · por {p.autor}
      </div>
      <h2 className="font-display text-lg font-bold text-ink">{p.titulo}</h2>
      {p.standfirst ? (
        <p className="mt-1.5 font-serif text-[15px] leading-relaxed text-gray-500">{p.standfirst}</p>
      ) : null}

      {erro ? (
        <p className="mt-3 rounded border border-ink bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink">
          {erro}
        </p>
      ) : null}

      {modoRecusa ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={`just-${p.id}`} className="block font-mono text-[10px] uppercase tracking-kicker text-gray-500">
            Justificativa da recusa (obrigatória)
          </label>
          <textarea
            id={`just-${p.id}`}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={3}
            className="w-full rounded border border-line bg-surface px-3 py-2 font-serif text-[15px] text-ink outline-none focus:border-ink"
            placeholder="Explique ao jornalista o que precisa ser corrigido…"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !justificativa.trim()}
              onClick={recusar}
              className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Recusando…' : 'Confirmar recusa'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setModoRecusa(false);
                setErro('');
              }}
              className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink hover:border-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={aprovar}
            className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Aprovando…' : 'Aprovar e publicar'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setModoRecusa(true)}
            className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink hover:border-ink"
          >
            Recusar
          </button>
        </div>
      )}
    </article>
  );
}
