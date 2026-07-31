import Link from 'next/link';
import { redirect } from 'next/navigation';
import { exigirLogin } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
import { formatPrecoBRL, podeVender, rotuloPedidoStatus } from '@/types/desapego';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas vendas' };

export default async function VendasPage() {
  const usuario = await exigirLogin('/desapegoo/vendas');
  const vendedor = await desapegoRepo.ensureVendedorFromCognito({
    cognitoSub: usuario.sub,
    email: usuario.email,
    nome: usuario.nome,
  });
  if (!podeVender(vendedor)) redirect('/desapegoo/kyc');
  const pedidos = await desapegoRepo.listPedidosVendedor(vendedor.id);

  return (
    <div className="mx-auto max-w-[800px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="d-display text-[28px] text-[var(--d-navy)]">minhas vendas</h1>
          <p className="mt-1 text-sm text-[var(--d-body)]">
            Pedidos da lojinha. Valores em custódia ficam bloqueados até a entrega.
          </p>
        </div>
        <Link href="/desapegoo/wallet" className="text-sm font-semibold">
          ver wallet →
        </Link>
      </div>
      {pedidos.length === 0 ? (
        <p className="mt-8 text-[var(--d-body)]">Nenhuma venda ainda.</p>
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
                  {rotuloPedidoStatus(p.status)} · líquido {formatPrecoBRL(p.liquidoVendedorCentavos)}
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
