'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { iniciarPauta } from '@/lib/actions/pautas';

export function ConfirmarPautaButton({ pautaId }: { pautaId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setErro('');
          const result = await iniciarPauta(pautaId);
          if (!result.ok) return setErro(result.erro ?? 'Não foi possível confirmar a pauta.');
          router.push(result.redirectTo ?? '/jornalista/materia/nova');
          router.refresh();
        })}
        className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Confirmando…' : 'Confirmar pauta e escrever matéria'}
      </button>
      {erro ? <p role="alert" className="mt-2 font-serif text-sm text-ink">{erro}</p> : null}
    </div>
  );
}
