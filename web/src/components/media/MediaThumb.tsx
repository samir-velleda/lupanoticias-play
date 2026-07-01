import Link from 'next/link';
import type { Media } from '@/types';
import { formatDuracao } from '@/lib/format';
import { PlayButton } from '@/components/ui';
import { Cover } from './Cover';

/**
 * Thumb de mídia: placeholder 16:9 + botão de play + badge de duração.
 * Abre o player (`/play/[id]`) — a rota do player entra no prompt 04.
 */
export function MediaThumb({
  media,
  playSize = 46,
  rounded = 'rounded',
  tone = 'light',
  className = '',
  ratio = 'aspect-video',
}: {
  media: Media;
  playSize?: number;
  rounded?: string;
  tone?: 'light' | 'dark';
  className?: string;
  ratio?: string;
}) {
  return (
    <Link
      href={`/play/${media.id}`}
      className={`group relative block ${ratio} w-full ${className}`}
      aria-label={`Assistir: ${media.titulo}`}
    >
      <Cover label={media.titulo} tone={tone} rounded={rounded} className="absolute inset-0 h-full w-full" />
      <span className="absolute inset-0 flex items-center justify-center">
        <PlayButton size={playSize} className="transition-transform group-hover:scale-105" />
      </span>
      {typeof media.duracaoSeg === 'number' && media.tipo !== 'live' ? (
        <span className="absolute bottom-2 right-2 rounded-sm bg-ink/85 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {formatDuracao(media.duracaoSeg)}
        </span>
      ) : null}
    </Link>
  );
}
