import Link from 'next/link';
import { exigirLogin } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
import { formatPrecoBRL, rotuloPedidoStatus } from '@/types/desapego';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas compras' };

export default async function ComprasPage() {
  const usuario = await exigirLogin('/desapegoo/compras');
  const pedidos = await desapegoRepo.listPedidosComprador(usuario.sub);

  return (
    <div className="mx-auto max-w-[800px] px-6 py-10">
      <h1 className="d-display text-[28px] text-[var(--d-navy)]">minhas compras</h1>
      <p className="mt-1 text-sm text-[var(--d-body)]">Pedidos em que você é o comprador.</p>
      {pedidos.length === 0 ? (
        <p className="mt-8 text-[var(--d-body)]">
          Nenhuma compra.{' '}
          <Link href="/desapegoo/busca">Garimpar</Link>
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--d-line)] rounded-[18px] border border-[var(--d-line)] bg-white">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <Link
                  href={`/desapegoo/pedido/${p.id}`}
                  className="font-semibold text-[var(--d-navy)]"
                >
                  {p.anuncioTitulo}
                </Link>
                <div className="text-xs text-[var(--d-muted)]">
                  {rotuloPedidoStatus(p.status)} · {formatPrecoBRL(p.valorCentavos)}
                </div>
              </div>
              <Link href={`/desapegoo/pedido/${p.id}`} className="text-sm font-semibold">
                abrir →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
