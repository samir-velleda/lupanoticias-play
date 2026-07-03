import Link from 'next/link';
import type { Media } from '@/types';
import { formatRelativo, formatViews } from '@/lib/format';
import { editoriaNome } from '@/lib/editorias';
import { MediaThumb } from '@/components/media/MediaThumb';

const TIPO_LABEL: Record<Media['tipo'], string> = {
  video: 'Vídeo',
  podcast: 'Podcast',
  live: 'Ao vivo',
  short: 'Corte',
};

/** Card de mídia do hub Lupa Play (thumb + kicker + título + meta). */
export function PlayCard({ media }: { media: Media }) {
  return (
    <article>
      <MediaThumb media={media} playSize={46} rounded="rounded-md" />
      <div className="mt-3 font-mono text-[10px] uppercase tracking-kicker text-gray-400">
        {TIPO_LABEL[media.tipo]} · {editoriaNome(media.editoria)}
      </div>
      <h3 className="mt-1.5 font-display text-[15.5px] font-bold leading-tight text-ink">
        <Link href={`/play/${media.id}`} className="hover:underline">
          {media.titulo}
        </Link>
      </h3>
      <p className="mt-1 font-mono text-[11px] text-gray-400">
        {formatViews(media.views ?? 0)}
        {media.publishedAt ? ` · ${formatRelativo(media.publishedAt)}` : ''}
      </p>
    </article>
  );
}
