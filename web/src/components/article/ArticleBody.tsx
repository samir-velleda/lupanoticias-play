import type { ArticleBlock, Media } from '@/types';
import { Cover } from '@/components/media/Cover';
import { HlsPlayer } from '@/components/play/HlsPlayer';

/**
 * Renderiza `ArticleBlock[]` no corpo Newsreader 19/1.75, com H2, pull-quote,
 * imagem inline (+legenda) e embed de mídia. DESIGN_SPEC §3.
 * `embeds` mapeia mediaId → Media (resolvido no server).
 */
export function ArticleBody({
  blocks,
  embeds,
}: {
  blocks: ArticleBlock[];
  embeds: Record<string, Media>;
}) {
  return (
    <div className="font-serif text-ink-soft">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={i} className="mb-6 text-[19px] leading-[1.75]">
                {block.text}
              </p>
            );
          case 'heading':
            return (
              <h2
                key={i}
                className="mb-3.5 mt-2 font-display text-[26px] font-extrabold tracking-wordmark text-ink"
              >
                {block.text}
              </h2>
            );
          case 'pullquote':
            return (
              <blockquote key={i} className="my-8 border-l-[3px] border-ink pl-6">
                <p className="font-serif text-[27px] font-medium italic leading-[1.3] text-ink">
                  “{block.text}”
                </p>
                {block.cite ? (
                  <cite className="mt-3.5 block font-mono text-xs not-italic text-gray-400">
                    — {block.cite}
                  </cite>
                ) : null}
              </blockquote>
            );
          case 'image':
            return (
              <figure key={i} className="my-6">
                <Cover label={block.caption ?? 'Imagem da matéria'} rounded="rounded-md" className="h-[300px] w-full" />
                {block.caption ? (
                  <figcaption className="mt-2.5 font-mono text-[11.5px] text-gray-300">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          case 'embed': {
            const media = embeds[block.mediaId];
            if (!media) return null;
            const rotulo = media.tipo === 'podcast' ? 'Podcast' : 'Vídeo';
            return (
              <figure key={i} className="my-6">
                {media.status === 'pronto' && media.playbackUrl ? (
                  // Toca inline na matéria (vídeo processado pelo pipeline).
                  <HlsPlayer src={media.playbackUrl} title={media.titulo} className="rounded-md" />
                ) : media.status === 'erro' ? (
                  <div className="flex items-center justify-center rounded-md border border-line bg-surface-2 px-4 py-10 text-center font-mono text-[12px] text-gray-500">
                    Não foi possível processar este vídeo.
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-md border border-line bg-surface-2 px-4 py-10 text-center font-mono text-[12px] text-gray-500">
                    Vídeo em processamento…
                  </div>
                )}
                <figcaption className="mt-2.5 font-mono text-[11.5px] text-gray-400">
                  {rotulo}: {media.titulo}
                </figcaption>
              </figure>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
