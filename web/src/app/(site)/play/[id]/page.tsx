import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Media, MediaTipo } from '@/types';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatRelativo, formatViews, formatDuracao } from '@/lib/format';
import { playableSrc } from '@/lib/playback';
import { HlsPlayer } from '@/components/play/HlsPlayer';
import { PlayerActions } from '@/components/play/PlayerActions';
import { ChannelRow } from '@/components/play/ChannelRow';
import { LiveViewers } from '@/components/play/LiveViewers';
import { PlayCard } from '@/components/play/PlayCard';

interface Props {
  params: Promise<{ id: string }>;
}

// IDs de mídia são conhecidos (mock) → 404 real p/ id inválido. Vira dynamicParams=true
// quando o Aurora/Estúdio (prompts 05/07) passarem a criar mídias em runtime.
export const dynamicParams = false;
export async function generateStaticParams() {
  const tipos: MediaTipo[] = ['video', 'podcast', 'live', 'short'];
  const listas = await Promise.all(
    tipos.map((t) =>
      t === 'short'
        ? repositories.media.listCortes({ pageSize: 100 })
        : repositories.media.listByTipo(t, { pageSize: 100 }),
    ),
  );
  return listas.flatMap((p) => p.items.map((m) => ({ id: m.id })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const media = await repositories.media.getById(id);
  if (!media) return { title: 'Mídia não encontrada' };
  return {
    title: media.titulo,
    description: media.descricao ?? `${editoriaNome(media.editoria)} · Lupa Play`,
    openGraph: { title: media.titulo, description: media.descricao, type: 'video.other' },
  };
}

function isoDuration(seg?: number): string | undefined {
  if (!seg) return undefined;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `PT${m}M${s}S`;
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const media = await repositories.media.getById(id);
  if (!media) notFound();

  const proximos: Media[] = await repositories.media.getNext(media.id, 4);
  const isLive = media.tipo === 'live';
  const nome = editoriaNome(media.editoria);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: media.titulo,
    description: media.descricao ?? nome,
    thumbnailUrl: media.coverUrl,
    uploadDate: media.publishedAt,
    duration: isoDuration(media.duracaoSeg),
    contentUrl: media.playbackUrl,
    embedUrl: `/play/${media.id}`,
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-7">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <HlsPlayer src={playableSrc(media)} title={media.titulo} live={isLive} />

      <h1 className="mt-5 font-display text-2xl font-extrabold leading-tight tracking-wordmark text-ink sm:text-[28px]">
        {media.titulo}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-gray-400">
        {isLive ? (
          <LiveViewers id={media.id} inicial={media.liveViewers ?? 0} />
        ) : (
          <span>
            {formatViews(media.views ?? 0)}
            {media.publishedAt ? ` · ${formatRelativo(media.publishedAt)}` : ''}
          </span>
        )}
        {media.duracaoSeg && !isLive ? <span>· {formatDuracao(media.duracaoSeg)}</span> : null}
      </div>

      {media.descricao ? (
        <p className="mt-3 font-serif text-[17px] leading-relaxed text-gray-500">{media.descricao}</p>
      ) : null}

      <div className="mt-5">
        <PlayerActions
          titulo={media.titulo}
          likesIniciais={media.likes ?? 0}
          downloadUrl={media.playbackUrl}
        />
      </div>

      <div className="mt-6">
        <ChannelRow editoria={nome} />
      </div>

      {proximos.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-extrabold text-ink">A seguir</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {proximos.map((m) => (
              <PlayCard key={m.id} media={m} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
