import Link from 'next/link';
import type { Media, Playlist } from '@/types';
import { formatDuracao, formatNumero } from '@/lib/format';
import { editoriaNome } from '@/lib/editorias';
import { LiveBadge } from '@/components/ui';
import { Cover } from '@/components/media/Cover';
import { LupaMark } from '@/components/brand';

/** Coluna "A seguir no Lupa Play": playlist 118×70 + card AO VIVO preto. DESIGN_SPEC §2. */
export function UpNext({ playlist, live }: { playlist?: Playlist; live: Media | null }) {
  return (
    <aside aria-label="A seguir no Lupa Play" className="flex flex-col">
      <h2 className="mb-4 flex items-center gap-2 font-display text-base font-extrabold text-ink">
        <LupaMark className="h-[18px] w-[18px]" title="Lupa Play" />
        {playlist?.titulo ?? 'A seguir no Lupa Play'}
      </h2>
      <div className="flex flex-col gap-4">
        {(playlist?.itens ?? []).map((v) => (
          <Link key={v.id} href={`/play/${v.id}`} className="group flex items-start gap-3">
            <div className="relative shrink-0">
              <Cover label={v.titulo} rounded="rounded-sm" className="h-[70px] w-[118px]" />
              {typeof v.duracaoSeg === 'number' ? (
                <span className="absolute bottom-1 right-1 rounded-[3px] bg-ink/85 px-1.5 py-0.5 font-mono text-[9px] text-white">
                  {formatDuracao(v.duracaoSeg)}
                </span>
              ) : null}
            </div>
            <div>
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                {v.tipo === 'podcast' ? 'Podcast' : 'Vídeo'} · {editoriaNome(v.editoria)}
              </span>
              <h4 className="mt-1 font-display text-[15px] font-bold leading-tight text-ink group-hover:underline">
                {v.titulo}
              </h4>
            </div>
          </Link>
        ))}
      </div>

      {live ? (
        <Link
          href={`/play/${live.id}`}
          className="mt-5 block rounded-lg bg-ink p-4 text-white transition-opacity hover:opacity-95"
        >
          <LiveBadge />
          <div className="mt-2.5 font-display text-base font-bold leading-tight">
            {live.titulo}
          </div>
          {typeof live.liveViewers === 'number' ? (
            <div className="mt-2 font-mono text-[11px] text-on-dark-muted">
              {formatNumero(live.liveViewers)} assistindo agora
            </div>
          ) : null}
        </Link>
      ) : null}
    </aside>
  );
}
