import type { EditoriaSlug, Media } from '@/types';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { Divider } from '@/components/ui';
import { VideoHero } from '@/components/home/VideoHero';
import { UpNext } from '@/components/home/UpNext';
import { EditoriaGrid, type EditoriaColuna } from '@/components/home/EditoriaGrid';
import { MaisLidas } from '@/components/home/MaisLidas';
import { Opiniao } from '@/components/home/Opiniao';
import { LupaPlayBand, type PlayBandData } from '@/components/home/LupaPlayBand';

const GRID_EDITORIAS: EditoriaSlug[] = ['economia', 'mundo', 'esportes', 'cultura'];

export default async function HomePage() {
  const [live, shelf, maisLidas, opiniao, videos, podcasts, cortes, gridRaw] =
    await Promise.all([
      repositories.media.getLiveDestaque(),
      repositories.media.listPlayShelf(),
      repositories.materias.listMaisLidas(5),
      repositories.materias.listOpiniao(3),
      repositories.media.listByTipo('video', { pageSize: 4 }),
      repositories.media.listByTipo('podcast', { pageSize: 4 }),
      repositories.media.listCortes({ pageSize: 4 }),
      Promise.all(
        GRID_EDITORIAS.map(async (slug) => ({
          slug,
          materias: (await repositories.materias.listByEditoria(slug, { pageSize: 3 })).items,
        })),
      ),
    ]);

  const heroLive: Media | null = live ?? videos.items[0] ?? null;
  const subvideos = videos.items
    .filter((v) => v.id !== heroLive?.id)
    .slice(0, 2);
  const colunas: EditoriaColuna[] = gridRaw.filter((c) => c.materias.length > 0);

  const playData: PlayBandData = {
    video: videos.items,
    podcast: podcasts.items,
    live: live ? [live] : [],
    short: cortes.items,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-7">
      {/* Hero + coluna A seguir */}
      <div className="grid grid-cols-1 gap-9 lg:grid-cols-[1fr_340px]">
        {heroLive ? (
          <VideoHero
            live={heroLive}
            nomeEditoria={editoriaNome(heroLive.editoria)}
            subvideos={subvideos}
          />
        ) : null}
        <UpNext playlist={shelf[0]} live={live} />
      </div>

      <Divider strong className="my-9" />

      {/* Grade de editorias */}
      {colunas.length > 0 ? <EditoriaGrid colunas={colunas} /> : null}

      {/* Faixa Lupa Play */}
      <div className="mt-12">
        <LupaPlayBand data={playData} />
      </div>

      {/* Mais lidas + Opinião */}
      <div className="mt-12 grid grid-cols-1 gap-10 border-t border-line pt-8 md:grid-cols-[300px_1fr]">
        <MaisLidas materias={maisLidas} />
        <Opiniao materias={opiniao} />
      </div>
    </main>
  );
}
