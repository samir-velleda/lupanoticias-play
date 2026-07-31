'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DesapegoPedidoStatus } from '@/types/desapego';
import {
  confirmarEntregaPedido,
  confirmarPagamentoPedido,
  marcarPedidoEnviado,
} from '@/lib/actions/desapego-pedidos';

export function PedidoActions({
  pedidoId,
  status,
  papel,
}: {
  pedidoId: string;
  status: DesapegoPedidoStatus;
  papel: 'comprador' | 'vendedor';
}) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [rastreio, setRastreio] = useState('');
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; erro?: string; redirectTo?: string }>) {
    setErro('');
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setErro(r.erro ?? 'Falha na operação.');
        return;
      }
      if (r.redirectTo) router.push(r.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {papel === 'comprador' && status === 'aguardando_pagamento' ? (
        <div className="rounded-xl border border-[var(--d-line)] bg-[var(--d-cream-2)] p-4 text-sm text-[var(--d-body)]">
          <p className="mb-3">
            Pagamento na <strong>conta master</strong> (Celcoin via Boovest, sem split). Ao
            confirmar, o líquido do vendedor fica <strong>bloqueado</strong> até a entrega.
          </p>
          <button
            type="button"
            disabled={pending}
            className="d-btn-primary px-5 py-2.5 text-sm"
            onClick={() => run(() => confirmarPagamentoPedido(pedidoId))}
          >
            {pending ? 'confirmando…' : 'confirmar pagamento (master)'}
          </button>
        </div>
      ) : null}

      {papel === 'vendedor' && status === 'em_custodia' ? (
        <div className="space-y-2 rounded-xl border border-[var(--d-line)] bg-white p-4">
          <label className="text-sm font-bold text-[var(--d-navy)]">código de rastreio</label>
          <input
            value={rastreio}
            onChange={(e) => setRastreio(e.target.value)}
            placeholder="BR123… ou retirada local"
            className="w-full rounded-[10px] border border-[var(--d-line)] px-3 py-2 text-sm outline-none focus:border-[var(--d-coral)]"
          />
          <button
            type="button"
            disabled={pending}
            className="d-btn-primary px-5 py-2.5 text-sm"
            onClick={() => run(() => marcarPedidoEnviado(pedidoId, rastreio))}
          >
            {pending ? 'salvando…' : 'marcar como enviado'}
          </button>
        </div>
      ) : null}

      {papel === 'comprador' && (status === 'enviado' || status === 'em_custodia') ? (
        <button
          type="button"
          disabled={pending}
          className="d-btn-primary px-5 py-2.5 text-sm"
          onClick={() => run(() => confirmarEntregaPedido(pedidoId))}
        >
          {pending ? 'liberando…' : 'confirmar entrega (libera wallet do vendedor)'}
        </button>
      ) : null}

      {status === 'liberado' ? (
        <p className="rounded-xl bg-[var(--d-green-bg)] px-4 py-3 text-sm text-[var(--d-green)]">
          Valor liberado na wallet do vendedor. Cashout disponível em /desapegoo/wallet.
        </p>
      ) : null}

      {erro ? <p className="text-sm text-[var(--d-coral-dark)]">{erro}</p> : null}
    </div>
  );
}
