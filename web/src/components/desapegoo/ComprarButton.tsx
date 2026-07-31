'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { criarPedidoDesapego } from '@/lib/actions/desapego-pedidos';

export function ComprarButton({ anuncioId }: { anuncioId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-w-[180px] flex-1 flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErro('');
          startTransition(async () => {
            const r = await criarPedidoDesapego(anuncioId);
            if (!r.ok) {
              setErro(r.erro ?? 'Não foi possível iniciar a compra.');
              if (r.redirectTo) router.push(r.redirectTo);
              return;
            }
            router.push(r.redirectTo ?? `/desapegoo/pedido/${r.pedidoId}`);
            router.refresh();
          });
        }}
        className="d-btn-primary w-full px-9 py-3.5 text-base"
      >
        {pending ? 'abrindo pedido…' : 'quero!'}
      </button>
      {erro ? <p className="text-sm text-[var(--d-coral-dark)]">{erro}</p> : null}
    </div>
  );
}
