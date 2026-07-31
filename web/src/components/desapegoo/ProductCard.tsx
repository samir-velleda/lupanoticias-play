import Link from 'next/link';
import type { DesapegoAnuncio } from '@/types/desapego';
import {
  descontoPct,
  formatPrecoBRL,
  inicialTitulo,
  rotuloCategoria,
  rotuloEstado,
} from '@/types/desapego';

export function ProductCard({ anuncio }: { anuncio: DesapegoAnuncio }) {
  const foto = anuncio.fotos[0];
  const antigo = anuncio.precoAntigoCentavos;
  const off = descontoPct(anuncio.precoCentavos, antigo);
  const bg = anuncio.placeholderBg ?? '#FBE6DC';
  const fg = anuncio.placeholderFg ?? '#C63D1B';

  return (
    <Link href={`/desapegoo/p/${anuncio.slug}`} className="d-card group block !text-inherit">
      <div className="relative flex h-[180px] items-center justify-center" style={{ background: bg }}>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={anuncio.titulo} className="h-full w-full object-cover" />
        ) : (
          <span className="d-display text-6xl opacity-50" style={{ color: fg }}>
            {inicialTitulo(anuncio.titulo)}
          </span>
        )}
        {anuncio.freteGratis ? (
          <span className="absolute left-2.5 top-2.5 rounded-pill bg-[var(--d-navy)] px-2.5 py-1 text-[11px] font-bold text-white">
            frete grátis
          </span>
        ) : null}
      </div>
      <div className="px-4 pb-4 pt-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--d-muted)]">
          {rotuloCategoria(anuncio.categoria)} · {rotuloEstado(anuncio.estado)}
        </div>
        <div className="mt-1 text-[15px] font-semibold text-[var(--d-ink)]">{anuncio.titulo}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="d-display text-[19px] text-[var(--d-navy)]">
            {formatPrecoBRL(anuncio.precoCentavos)}
          </span>
          {antigo ? (
            <span className="text-[13px] text-[#B0A899] line-through">
              {formatPrecoBRL(antigo)}
            </span>
          ) : null}
          {off ? (
            <span className="rounded-pill bg-[var(--d-green-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--d-green)]">
              {off}%
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
