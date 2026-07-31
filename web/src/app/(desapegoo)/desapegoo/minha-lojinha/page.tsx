import Link from 'next/link';
import { redirect } from 'next/navigation';
import { exigirLogin } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
import { ProductCard } from '@/components/desapegoo/ProductCard';
import { mascararCpf, podeVender } from '@/types/desapego';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha lojinha' };

export default async function MinhaLojinhaPage() {
  const usuario = await exigirLogin('/desapegoo/minha-lojinha');
  const vendedor = await desapegoRepo.ensureVendedorFromCognito({
    cognitoSub: usuario.sub,
    email: usuario.email,
    nome: usuario.nome,
  });
  if (!podeVender(vendedor)) {
    redirect('/desapegoo/kyc');
  }
  const anuncios = await desapegoRepo.listAnuncios({ vendedorSlug: vendedor.slug });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex flex-wrap items-center gap-6 rounded-[18px] bg-[var(--d-navy)] p-8 text-[var(--d-cream)]">
        <div className="d-display flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[var(--d-coral)] text-[30px]">
          {vendedor.iniciais}
        </div>
        <div className="min-w-[220px] flex-1">
          <div className="d-display text-[26px]">{vendedor.nome}</div>
          <div className="mt-1 text-sm opacity-80">
            {usuario.email} · KYC {vendedor.kycStatus}
            {vendedor.cpf ? ` · ${mascararCpf(vendedor.cpf)}` : ''}
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Link
              href={`/desapegoo/lojinha/${vendedor.slug}`}
              className="rounded-pill bg-white/12 px-3 py-1 text-xs font-semibold !text-[var(--d-cream)]"
            >
              ver página pública →
            </Link>
            <Link
              href="/desapegoo/kyc"
              className="rounded-pill bg-white/12 px-3 py-1 text-xs font-semibold !text-[var(--d-cream)]"
            >
              editar KYC
            </Link>
          </div>
        </div>
        <Link href="/desapegoo/vender" className="d-btn-primary px-6 py-3 text-sm">
          + novo anúncio
        </Link>
      </div>

      <h2 className="d-display mb-4 mt-8 text-[22px] text-[var(--d-navy)]">seus anúncios</h2>
      {anuncios.length === 0 ? (
        <p className="text-[var(--d-body)]">
          Nenhum anúncio ainda.{' '}
          <Link href="/desapegoo/vender">Publique o primeiro</Link>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {anuncios.map((a) => (
            <ProductCard key={a.id} anuncio={a} />
          ))}
        </div>
      )}
    </div>
  );
}
