'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { aprovarMateria, recusarMateria } from '@/lib/actions/materias';

/** Aprovar / recusar matéria na fila do Diretor de Redação. */
export function RedacaoActions({ materiaId }: { materiaId: string }) {
  const router = useRouter();
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarRecusa, setMostrarRecusa] = useState(false);
  const [pending, startTransition] = useTransition();

  const aprovar = () => {
    setErro('');
    startTransition(async () => {
      const r = await aprovarMateria(materiaId);
      if (!r.ok) {
        setErro(r.erro ?? 'Falha ao aprovar');
        return;
      }
      router.push('/admin/redacao');
      router.refresh();
    });
  };

  const recusar = () => {
    setErro('');
    if (!justificativa.trim()) {
      setErro('Informe a justificativa da recusa.');
      return;
    }
    startTransition(async () => {
      const r = await recusarMateria(materiaId, justificativa);
      if (!r.ok) {
        setErro(r.erro ?? 'Falha ao recusar');
        return;
      }
      router.push('/admin/redacao');
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">
        Decisão editorial
      </div>
      {erro ? (
        <p className="rounded border border-ink bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={aprovar}
          className="rounded bg-ink px-4 py-2.5 font-display text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Processando…' : 'Aprovar e publicar'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setMostrarRecusa((v) => !v)}
          className="rounded border border-line px-4 py-2.5 font-display text-sm font-semibold text-ink hover:border-ink disabled:opacity-50"
        >
          Recusar
        </button>
      </div>
      {mostrarRecusa ? (
        <div className="space-y-2 border-t border-line pt-3">
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-kicker text-gray-500" htmlFor="justificativa">
            Justificativa (obrigatória)
          </label>
          <textarea
            id="justificativa"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={4}
            className="w-full rounded border border-line bg-surface px-3 py-2 font-serif text-[15px] text-ink outline-none focus:border-ink"
            placeholder="Explique o que o jornalista deve corrigir…"
          />
          <button
            type="button"
            disabled={pending}
            onClick={recusar}
            className="rounded border border-ink px-4 py-2 font-display text-sm font-bold text-ink hover:bg-ink hover:text-white disabled:opacity-50"
          >
            Confirmar recusa
          </button>
        </div>
      ) : null}
    </div>
  );
}
