import Link from 'next/link';
import { desapegoRepo } from '@/lib/data/desapego';
import { ProductCard } from '@/components/desapegoo/ProductCard';
import type { DesapegoCategoria } from '@/types/desapego';
import { DESAPEGO_CATEGORIAS } from '@/types/desapego';

export const dynamic = 'force-dynamic';

export default async function DesapegooBusca({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const categoria = DESAPEGO_CATEGORIAS.some((c) => c.slug === cat)
    ? (cat as DesapegoCategoria)
    : null;
  const anuncios = await desapegoRepo.listAnuncios({ q, categoria });
  const titulo = q
    ? `resultados pra "${q}"`
    : categoria
      ? DESAPEGO_CATEGORIAS.find((c) => c.slug === categoria)?.label ?? categoria
      : 'garimpo geral';

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-1.5 text-[13px] text-[var(--d-muted)]">
        <Link href="/desapegoo">desapegoo</Link> / busca
      </div>
      <h1 className="d-display text-[32px] text-[var(--d-navy)]">{titulo}</h1>
      <p className="mt-1 text-sm text-[var(--d-body)]">
        {anuncios.length} {anuncios.length === 1 ? 'achadinho' : 'achadinhos'}
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/desapegoo/busca"
          className={!categoria ? 'font-bold text-[var(--d-coral-dark)]' : 'text-[var(--d-body)]'}
        >
          tudo
        </Link>
        {DESAPEGO_CATEGORIAS.map((c) => (
          <Link
            key={c.slug}
            href={`/desapegoo/busca?cat=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={
              categoria === c.slug
                ? 'font-bold text-[var(--d-coral-dark)]'
                : 'text-[var(--d-body)]'
            }
          >
            {c.label}
          </Link>
        ))}
      </div>

      {anuncios.length === 0 ? (
        <p className="mt-10 text-[var(--d-body)]">
          Nada por aqui. Tente outra busca ou{' '}
          <Link href="/desapegoo/vender">anuncie o seu</Link>.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {anuncios.map((a) => (
            <ProductCard key={a.id} anuncio={a} />
          ))}
        </div>
      )}
    </div>
  );
}
