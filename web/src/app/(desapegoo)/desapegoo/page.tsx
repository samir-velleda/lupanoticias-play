import Link from 'next/link';
import { desapegoRepo } from '@/lib/data/desapego';
import { ProductCard } from '@/components/desapegoo/ProductCard';

export const dynamic = 'force-dynamic';

export default async function DesapegooHome() {
  const anuncios = await desapegoRepo.listAnuncios({ limit: 12 });

  return (
    <div>
      {/* Hero */}
      <section className="bg-[var(--d-navy)] text-[var(--d-cream)]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-10 px-6 py-14">
          <div className="min-w-[280px] flex-1">
            <div className="mb-4 inline-block rounded bg-[var(--d-gold)] px-3 py-1 text-xs font-extrabold tracking-wide text-[var(--d-navy)]">
              NOVO NO LUPA
            </div>
            <h1 className="d-display text-[clamp(36px,6vw,52px)] leading-[1.05]">
              desapega que
              <br />
              alguém ama.
            </h1>
            <p className="mt-4 max-w-[440px] text-[17px] leading-relaxed opacity-85">
              roupas, eletrônicos e móveis com história pra contar. venda o que tá parado, compre o
              que faz sentido.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/desapegoo/busca" className="d-btn-primary px-7 py-3.5 text-[15px]">
                garimpar agora
              </Link>
              <Link
                href="/desapegoo/vender"
                className="rounded-pill border border-white/40 px-7 py-3.5 text-[15px] font-bold !text-[var(--d-cream)] transition-colors hover:border-[var(--d-gold)] hover:!text-[var(--d-gold)]"
              >
                anunciar de graça
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-[340px] grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[var(--d-coral)] p-5">
              <div className="d-display text-[22px] leading-tight">+{anuncios.length} itens</div>
              <div className="mt-1.5 text-xs font-medium opacity-90">esperando um novo lar</div>
            </div>
            <div className="rounded-2xl bg-[var(--d-navy-soft)] p-5">
              <div className="d-display text-[22px] leading-tight">frete a partir de R$9</div>
              <div className="mt-1.5 text-xs font-medium opacity-80">pra todo o Brasil</div>
            </div>
            <div className="col-span-2 rounded-2xl bg-[var(--d-gold)] p-5 text-[var(--d-navy)]">
              <div className="d-display text-[22px] leading-tight">taxa zero no 1º desapego</div>
              <div className="mt-1.5 text-xs font-medium opacity-80">
                promo de lançamento pra leitores Lupa · pagamentos Boovest
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-5 flex items-baseline gap-3.5">
          <h2 className="d-display text-[28px] text-[var(--d-navy)]">achadinhos fresquinhos</h2>
          <Link href="/desapegoo/busca" className="text-sm font-semibold">
            ver tudo →
          </Link>
        </div>
        {anuncios.length === 0 ? (
          <p className="text-[var(--d-body)]">Nenhum anúncio ainda. Seja o primeiro a desapegar!</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {anuncios.map((a) => (
              <ProductCard key={a.id} anuncio={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
