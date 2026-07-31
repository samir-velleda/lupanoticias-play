import Link from 'next/link';
import { redirect } from 'next/navigation';
import { exigirLogin } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
import { formatPrecoBRL, mascararCpf, podeVender } from '@/types/desapego';
import { CashoutForm } from '@/components/desapegoo/CashoutForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wallet' };

export default async function WalletPage() {
  const usuario = await exigirLogin('/desapegoo/wallet');
  const vendedor = await desapegoRepo.ensureVendedorFromCognito({
    cognitoSub: usuario.sub,
    email: usuario.email,
    nome: usuario.nome,
  });
  if (!podeVender(vendedor)) redirect('/desapegoo/kyc');

  const [wallet, cashouts] = await Promise.all([
    desapegoRepo.getWallet(vendedor.id),
    desapegoRepo.listCashouts(vendedor.id),
  ]);

  return (
    <div className="mx-auto max-w-[800px] px-6 py-10">
      <h1 className="d-display text-[28px] text-[var(--d-navy)]">wallet</h1>
      <p className="mt-1 text-sm text-[var(--d-body)]">
        Subconta do vendedor. Bloqueado até confirmar entrega · cashout mesma titularidade (
        {mascararCpf(vendedor.cpf)}).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[18px] bg-[var(--d-navy)] p-6 text-[var(--d-cream)]">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">disponível</div>
          <div className="d-display mt-2 text-3xl">
            {formatPrecoBRL(wallet.disponivelCentavos)}
          </div>
          <p className="mt-2 text-xs opacity-70">pode sacar (cashout)</p>
        </div>
        <div className="rounded-[18px] border border-[var(--d-line)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--d-muted)]">
            bloqueado
          </div>
          <div className="d-display mt-2 text-3xl text-[var(--d-navy)]">
            {formatPrecoBRL(wallet.bloqueadoCentavos)}
          </div>
          <p className="mt-2 text-xs text-[var(--d-muted)]">
            em custódia (pago, aguardando entrega)
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CashoutForm cpfKyc={vendedor.cpf ?? ''} />
        <div>
          <h2 className="d-display mb-3 text-lg text-[var(--d-navy)]">histórico de cashouts</h2>
          {cashouts.length === 0 ? (
            <p className="text-sm text-[var(--d-body)]">Nenhum saque ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--d-line)] rounded-[18px] border border-[var(--d-line)] bg-white text-sm">
              {cashouts.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="font-semibold text-[var(--d-navy)]">
                    {formatPrecoBRL(c.valorCentavos)} · {c.status}
                  </div>
                  <div className="text-xs text-[var(--d-muted)]">
                    {c.banco} · ag {c.agencia} · cc {c.conta}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-[var(--d-muted)]">
            <Link href="/desapegoo/vendas">ver vendas →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
