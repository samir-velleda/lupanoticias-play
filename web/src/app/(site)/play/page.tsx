import type { Metadata } from 'next';
import Link from 'next/link';
import type { Media, MediaTipo } from '@/types';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { Pill, EmptyState } from '@/components/ui';
import { PlayCard } from '@/components/play/PlayCard';
import { MediaThumb } from '@/components/media/MediaThumb';
import { LiveViewers } from '@/components/play/LiveViewers';

export const metadata: Metadata = {
  title: 'Lupa Play',
  description: 'Vídeos, podcasts, ao vivo e Cortes da Lupa Notícias.',
};

const TABS: { key: string; label: string; tipo: MediaTipo }[] = [
  { key: 'video', label: 'Vídeos', tipo: 'video' },
  { key: 'podcast', label: 'Podcasts', tipo: 'podcast' },
  { key: 'live', label: 'Ao Vivo', tipo: 'live' },
  { key: 'cortes', label: 'Cortes', tipo: 'short' },
];

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PlayHub({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];

  const [live, paged] = await Promise.all([
    repositories.media.getLiveDestaque(),
    tab.tipo === 'short'
      ? repositories.media.listCortes({ pageSize: 12 })
      : repositories.media.listByTipo(tab.tipo, { pageSize: 12 }),
  ]);
  const itens: Media[] = paged.items;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
        <div>
          <h1 className="font-display text-[40px] font-black leading-none tracking-[-0.03em] text-ink">
            Lupa Play
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-kicker text-gray-400">
            Vídeos · Podcasts · Ao Vivo · Cortes
          </p>
        </div>
      </header>

      {/* Abas (?tab=) */}
      <nav aria-label="Categorias" className="my-7 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === 'video' ? '/play' : `/play?tab=${t.key}`}>
            <Pill active={t.key === tab.key}>{t.label}</Pill>
          </Link>
        ))}
      </nav>

      {/* Destaque ao vivo */}
      {live ? (
        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <MediaThumb media={live} playSize={78} rounded="rounded-lg" tone="dark" ratio="aspect-video" />
          <div className="flex flex-col justify-center">
            <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">
              Ao vivo · {editoriaNome(live.editoria)}
            </span>
            <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink">
              <Link href={`/play/${live.id}`} className="hover:underline">
                {live.titulo}
              </Link>
            </h2>
            {live.descricao ? (
              <p className="mt-2 font-serif text-[17px] leading-relaxed text-gray-500">{live.descricao}</p>
            ) : null}
            <div className="mt-3">
              <LiveViewers id={live.id} inicial={live.liveViewers ?? 0} />
            </div>
          </div>
        </section>
      ) : null}

      {/* Grade da aba */}
      {itens.length === 0 ? (
        <EmptyState titulo={`Sem ${tab.label.toLowerCase()} por enquanto`} descricao="Novo conteúdo em breve no Lupa Play." />
      ) : (
        <section aria-label={tab.label} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((m) => (
            <PlayCard key={m.id} media={m} />
          ))}
        </section>
      )}

      {tab.tipo === 'short' ? (
        <p className="mt-8 text-center">
          <Link href="/cortes" className="font-display text-sm font-bold text-ink underline">
            Abrir Cortes em tela cheia →
          </Link>
        </p>
      ) : null}
    </main>
  );
}
