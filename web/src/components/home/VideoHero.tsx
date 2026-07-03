import Link from 'next/link';
import type { Media } from '@/types';
import { formatDuracao, formatNumero } from '@/lib/format';
import { Kicker, LiveBadge, PlayButton } from '@/components/ui';
import { Cover } from '@/components/media/Cover';
import { MediaThumb } from '@/components/media/MediaThumb';
import { editoriaNome } from '@/lib/editorias';

/**
 * Hero video-first: player 16:9 (AO VIVO, play Ø78, título sobreposto, gradiente),
 * standfirst + "assistindo agora"; abaixo, 2 cards de vídeo. DESIGN_SPEC §2.
 */
export function VideoHero({
  live,
  nomeEditoria,
  subvideos,
}: {
  live: Media;
  nomeEditoria: string;
  subvideos: Media[];
}) {
  return (
    <section aria-label="Destaque em vídeo">
      <Link
        href={`/play/${live.id}`}
        className="group relative block aspect-video w-full overflow-hidden rounded"
        aria-label={`Assistir: ${live.titulo}`}
      >
        <Cover label={live.titulo} tone="dark" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/25" />
        {live.tipo === 'live' ? (
          <span className="absolute left-4 top-4">
            <LiveBadge />
          </span>
        ) : null}
        <span className="absolute right-4 top-4 rounded-sm bg-ink/80 px-2 py-1 font-mono text-[11px] text-white">
          {live.tipo === 'live'
            ? 'AO VIVO'
            : typeof live.duracaoSeg === 'number'
              ? formatDuracao(live.duracaoSeg)
              : ''}
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <PlayButton size={78} className="transition-transform group-hover:scale-105" />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <Kicker tone="on-dark" className="!text-white/90">
            {live.tipo === 'live' ? `${nomeEditoria} · Ao vivo` : nomeEditoria}
          </Kicker>
          <h1 className="mt-2 max-w-3xl text-balance font-display text-[28px] font-extrabold leading-[1.05] tracking-wordmark sm:text-[38px]">
            {live.titulo}
          </h1>
        </div>
      </Link>

      {live.descricao ? (
        <p className="mt-4 font-serif text-[19px] leading-relaxed text-gray-500">
          {live.descricao}
        </p>
      ) : null}
      {typeof live.liveViewers === 'number' ? (
        <p className="mt-3 font-mono text-xs text-gray-400">
          Transmissão Lupa Play · {formatNumero(live.liveViewers)} assistindo agora
        </p>
      ) : null}

      {subvideos.length > 0 ? (
        <>
          <div className="my-6 h-px bg-line" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {subvideos.map((v) => (
              <article key={v.id}>
                <MediaThumb media={v} playSize={42} rounded="rounded-md" />
                <Kicker className="mt-3 block">
                  {v.tipo === 'podcast' ? 'Podcast' : 'Vídeo'} · {editoriaNome(v.editoria)}
                </Kicker>
                <h3 className="mt-1.5 font-display text-[19px] font-bold leading-tight">
                  <Link href={`/play/${v.id}`} className="hover:underline">
                    {v.titulo}
                  </Link>
                </h3>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
