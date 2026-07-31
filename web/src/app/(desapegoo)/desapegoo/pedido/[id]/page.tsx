import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { exigirLogin } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
import {
  formatPrecoBRL,
  rotuloPedidoStatus,
} from '@/types/desapego';
import { PedidoActions } from '@/components/desapegoo/PedidoActions';

export const dynamic = 'force-dynamic';

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLogin('/desapegoo/compras');
  const { id } = await params;
  const pedido = await desapegoRepo.getPedido(id);
  if (!pedido) notFound();

  const vendedor = await desapegoRepo.getVendedorByCognitoSub(usuario.sub);
  const souComprador = pedido.compradorCognitoSub === usuario.sub;
  const souVendedor = Boolean(vendedor && vendedor.id === pedido.vendedorId);
  if (!souComprador && !souVendedor) redirect('/desapegoo');

  return (
    <div className="mx-auto max-w-[640px] px-6 py-10">
      <p className="mb-2 text-[13px] text-[var(--d-muted)]">
        <Link href="/desapegoo">desapegoo</Link> / pedido
      </p>
      <h1 className="d-display text-[28px] text-[var(--d-navy)]">pedido</h1>
      <p className="mt-1 text-sm text-[var(--d-body)]">{pedido.anuncioTitulo}</p>

      <div className="mt-6 space-y-3 rounded-[18px] border border-[var(--d-line)] bg-white p-6 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--d-muted)]">Status</span>
          <strong className="text-[var(--d-navy)]">{rotuloPedidoStatus(pedido.status)}</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--d-muted)]">Valor</span>
          <span>{formatPrecoBRL(pedido.valorCentavos)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--d-muted)]">Taxa plataforma</span>
          <span>{formatPrecoBRL(pedido.taxaCentavos)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--d-muted)]">Líquido vendedor (bloqueado→wallet)</span>
          <span>{formatPrecoBRL(pedido.liquidoVendedorCentavos)}</span>
        </div>
        {pedido.codigoRastreio ? (
          <div className="flex justify-between gap-4">
            <span className="text-[var(--d-muted)]">Rastreio</span>
            <span>{pedido.codigoRastreio}</span>
          </div>
        ) : null}
        {pedido.paymentRef ? (
          <div className="flex justify-between gap-4">
            <span className="text-[var(--d-muted)]">Ref. pagamento (master)</span>
            <span className="font-mono text-xs">{pedido.paymentRef}</span>
          </div>
        ) : null}
        <p className="border-t border-[var(--d-line)] pt-3 text-xs text-[var(--d-muted)]">
          Sem split: valor na conta master até liberação. Após entrega, líquido vai para a wallet do
          vendedor; cashout é para conta de mesma titularidade.
        </p>
      </div>

      <div className="mt-6">
        <PedidoActions
          pedidoId={pedido.id}
          status={pedido.status}
          papel={souComprador ? 'comprador' : 'vendedor'}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href={`/desapegoo/p/${pedido.anuncioSlug}`}>ver anúncio</Link>
        {souComprador ? <Link href="/desapegoo/compras">minhas compras</Link> : null}
        {souVendedor ? (
          <>
            <Link href="/desapegoo/vendas">minhas vendas</Link>
            <Link href="/desapegoo/wallet">wallet</Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
