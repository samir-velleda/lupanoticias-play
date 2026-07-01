'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Media } from '@/types';
import { editoriaNome } from '@/lib/editorias';
import { LupaMark } from '@/components/brand';
import { SegmentedControl, type SegTab } from '@/components/ui';
import { MediaThumb } from '@/components/media/MediaThumb';

export interface PlayBandData {
  video: Media[];
  podcast: Media[];
  live: Media[];
  short: Media[];
}

const TABS: SegTab[] = [
  { key: 'video', label: 'Vídeos' },
  { key: 'podcast', label: 'Podcasts' },
  { key: 'live', label: 'Ao Vivo' },
  { key: 'short', label: 'Cortes' },
];

const TIPO_LABEL: Record<keyof PlayBandData, string> = {
  video: 'Vídeo',
  podcast: 'Podcast',
  live: 'Ao vivo',
  short: 'Corte',
};

/**
 * Faixa preta Lupa Play (full-bleed, inversão): abas client + grade de 4 cards.
 * DESIGN_SPEC §2 / §7. Ativo = pill branco sobre fundo escuro.
 */
export function LupaPlayBand({ data }: { data: PlayBandData }) {
  const [tab, setTab] = useState<keyof PlayBandData>('video');
  const itens = data[tab];

  return (
    <section aria-label="Lupa Play" className="rounded-lg bg-ink px-6 py-8 text-white sm:px-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LupaMark className="h-8 w-8 text-white" title="Lupa Play" />
          <div>
            <div className="font-display text-[22px] font-extrabold leading-none">Lupa Play</div>
            <div className="mt-1 font-mono text-[11px] tracking-[0.08em] text-on-dark-muted">
              VÍDEOS · PODCASTS · AO VIVO · CORTES
            </div>
          </div>
        </div>
        <Link
          href="/play"
          className="rounded bg-white px-4 py-2 font-display text-[13px] font-bold text-ink hover:bg-[#e6e6e9]"
        >
          Ver tudo
        </Link>
      </div>

      <div className="mb-5">
        <SegmentedControl
          tabs={TABS}
          value={tab}
          onChange={(k) => setTab(k as keyof PlayBandData)}
          surface="dark"
          ariaLabel="Categorias do Lupa Play"
        />
      </div>

      {itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-dark-line px-6 py-10 text-center font-mono text-xs text-on-dark-muted">
          Nada nesta aba por enquanto.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((m) => (
            <article key={m.id}>
              <MediaThumb media={m} playSize={46} rounded="rounded-md" tone="dark" />
              <div className="mt-3 font-mono text-[10px] uppercase tracking-kicker text-on-dark-muted">
                {TIPO_LABEL[tab]} · {editoriaNome(m.editoria)}
              </div>
              <h4 className="mt-1.5 font-display text-[15.5px] font-bold leading-tight text-white">
                <Link href={`/play/${m.id}`} className="hover:underline">
                  {m.titulo}
                </Link>
              </h4>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
