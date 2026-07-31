import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desapegoRepo } from '@/lib/data/desapego';
import { ProductCard } from '@/components/desapegoo/ProductCard';

export const dynamic = 'force-dynamic';

export default async function DesapegooLojinha({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendedor = await desapegoRepo.getVendedorBySlug(slug);
  if (!vendedor) notFound();
  const anuncios = await desapegoRepo.listAnuncios({ vendedorSlug: slug });

  const desde = vendedor.desde
    ? new Date(vendedor.desde).toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      })
    : '2026';

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="flex flex-wrap items-center gap-6 rounded-[18px] bg-[var(--d-navy)] p-8 text-[var(--d-cream)]">
        <div className="d-display flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[var(--d-coral)] text-[30px]">
          {vendedor.iniciais}
        </div>
        <div className="min-w-[220px] flex-1">
          <div className="d-display text-[26px]">{vendedor.nome}</div>
          <div className="mt-1 text-sm opacity-80">
            {vendedor.cidade ?? 'Brasil'}
            {vendedor.uf ? `, ${vendedor.uf}` : ''} · no desapegoo desde {desde}
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <span className="rounded-pill bg-white/12 px-3 py-1 text-xs font-semibold">
              ★ {vendedor.nota?.toFixed(1).replace('.', ',') ?? '5,0'} (
              {Math.max(1, Math.round((vendedor.vendas ?? 1) * 0.9))} avaliações)
            </span>
            <span className="rounded-pill bg-white/12 px-3 py-1 text-xs font-semibold">
              {vendedor.vendas ?? anuncios.length} desapegos
            </span>
            <span className="rounded-pill bg-[var(--d-gold)] px-3 py-1 text-xs font-bold text-[var(--d-navy)]">
              vendedora confiável
            </span>
          </div>
        </div>
        <Link href="/desapegoo/vender" className="d-btn-primary px-6 py-3 text-sm">
          + novo anúncio
        </Link>
      </div>

      <h2 className="d-display mb-4 mt-8 text-[22px] text-[var(--d-navy)]">
        à venda na lojinha
      </h2>
      {anuncios.length === 0 ? (
        <p className="text-[var(--d-body)]">Nenhum item ativo no momento.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {anuncios.map((a) => (
            <ProductCard key={a.id} anuncio={a} />
          ))}
        </div>
      )}

      <h2 className="d-display mb-4 mt-9 text-[22px] text-[var(--d-navy)]">avaliações</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[14px] border border-[var(--d-line)] bg-white px-5 py-4">
          <div className="text-[13px] font-bold text-[var(--d-navy)]">★★★★★ · Marcos P.</div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--d-body)]">
            &ldquo;item chegou impecável, melhor que na foto. e veio com bilhetinho fofo!&rdquo;
          </p>
        </div>
        <div className="rounded-[14px] border border-[var(--d-line)] bg-white px-5 py-4">
          <div className="text-[13px] font-bold text-[var(--d-navy)]">★★★★★ · Renata C.</div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--d-body)]">
            &ldquo;super rápida no envio, embalagem caprichada. já tô de olho em outras coisas da
            lojinha.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
