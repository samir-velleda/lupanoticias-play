import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desapegoRepo } from '@/lib/data/desapego';
import { ProductCard } from '@/components/desapegoo/ProductCard';
import { ComprarButton } from '@/components/desapegoo/ComprarButton';
import {
  descontoPct,
  formatPrecoBRL,
  inicialTitulo,
  rotuloCategoria,
  rotuloEstado,
} from '@/types/desapego';

export const dynamic = 'force-dynamic';

export default async function DesapegooProduto({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anuncio = await desapegoRepo.getBySlug(slug);
  if (!anuncio || anuncio.status === 'oculto') notFound();

  const relacionados = (await desapegoRepo.listAnuncios({ categoria: anuncio.categoria }))
    .filter((a) => a.id !== anuncio.id)
    .slice(0, 4);
  const foto = anuncio.fotos[0];
  const off = descontoPct(anuncio.precoCentavos, anuncio.precoAntigoCentavos);
  const bg = anuncio.placeholderBg ?? '#FBE6DC';
  const fg = anuncio.placeholderFg ?? '#C63D1B';

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-4 text-[13px] text-[var(--d-muted)]">
        <Link href="/desapegoo">desapegoo</Link>
        {' / '}
        <Link href={`/desapegoo/busca?cat=${anuncio.categoria}`}>
          {rotuloCategoria(anuncio.categoria)}
        </Link>
        {' / '}
        {anuncio.titulo}
      </div>

      <div className="flex flex-wrap gap-10">
        <div className="min-w-[300px] flex-1">
          <div
            className="flex h-[420px] items-center justify-center overflow-hidden rounded-[18px]"
            style={{ background: bg }}
          >
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt={anuncio.titulo} className="h-full w-full object-cover" />
            ) : (
              <span className="d-display text-[140px] opacity-50" style={{ color: fg }}>
                {inicialTitulo(anuncio.titulo)}
              </span>
            )}
          </div>
          {anuncio.fotos.length > 1 ? (
            <div className="mt-3 flex gap-2.5">
              {anuncio.fotos.slice(0, 4).map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={f}
                  alt=""
                  className="h-[72px] w-[72px] rounded-[10px] object-cover"
                  style={{ border: i === 0 ? '2px solid #F4633A' : undefined }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-[300px] flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--d-muted)]">
            {rotuloCategoria(anuncio.categoria)} · {rotuloEstado(anuncio.estado)}
          </div>
          <h1 className="d-display mt-1.5 text-[32px] text-[var(--d-navy)]">{anuncio.titulo}</h1>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="d-display text-[36px] text-[var(--d-navy)]">
              {formatPrecoBRL(anuncio.precoCentavos)}
            </span>
            {anuncio.precoAntigoCentavos ? (
              <span className="text-base text-[#B0A899] line-through">
                {formatPrecoBRL(anuncio.precoAntigoCentavos)}
              </span>
            ) : null}
            {off ? (
              <span className="rounded-pill bg-[var(--d-green-bg)] px-2.5 py-1 text-xs font-bold text-[var(--d-green)]">
                {off}% off
              </span>
            ) : null}
          </div>
          <p className="mb-6 mt-1.5 text-[13px] text-[var(--d-body)]">
            em até 6x sem juros · frete a partir de R$9 · pagamentos Boovest
          </p>

          <div className="mb-7 flex flex-wrap gap-3">
            {anuncio.status === 'ativo' ? (
              <ComprarButton anuncioId={anuncio.id} />
            ) : (
              <p className="rounded-pill border border-[var(--d-line)] bg-white px-5 py-3 text-sm text-[var(--d-body)]">
                {anuncio.status === 'reservado'
                  ? 'Item reservado em pedido'
                  : anuncio.status === 'vendido'
                    ? 'Item vendido'
                    : 'Indisponível'}
              </p>
            )}
          </div>

          <div className="mb-5 rounded-[14px] border border-[var(--d-line)] bg-white px-5 py-4">
            <div className="mb-2 text-sm font-bold text-[var(--d-navy)]">história do item</div>
            <p className="m-0 text-sm leading-relaxed text-[var(--d-body)]">{anuncio.descricao}</p>
          </div>

          <Link
            href={`/desapegoo/lojinha/${anuncio.vendedor.slug}`}
            className="flex items-center gap-3.5 rounded-[14px] border border-[var(--d-line)] bg-white px-5 py-4 !text-inherit transition-colors hover:border-[var(--d-coral)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--d-navy)] text-sm font-bold text-white">
              {anuncio.vendedor.iniciais}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--d-navy)]">{anuncio.vendedor.nome}</div>
              <div className="text-xs text-[var(--d-muted)]">
                ★ {anuncio.vendedor.nota?.toFixed(1).replace('.', ',') ?? '—'} ·{' '}
                {anuncio.vendedor.vendas ?? 0} desapegos · responde rápido
              </div>
            </div>
            <span className="text-[13px] font-semibold text-[var(--d-coral-dark)]">
              ver lojinha →
            </span>
          </Link>
        </div>
      </div>

      {relacionados.length > 0 ? (
        <>
          <h2 className="d-display mb-4 mt-11 text-[22px] text-[var(--d-navy)]">
            quem viu esse, curtiu esses
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relacionados.map((a) => (
              <ProductCard key={a.id} anuncio={a} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
