import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/data/mock';
import { LupaLockup, LupaLockupWhite, LupaMark } from '@/components/brand';
import { formatData, formatDuracao, formatRelativo, formatViews } from '@/lib/format';

/**
 * Home de fundação (prompt 02): prova o encanamento — fontes, tokens, logos e a
 * camada `repositories` (mock). O layout video-first completo vem no prompt 03.
 */
export default async function HomePage() {
  const [live, maisLidas, opiniao, economia, shelf] = await Promise.all([
    repositories.media.getLiveDestaque(),
    repositories.materias.listMaisLidas(5),
    repositories.materias.listOpiniao(3),
    repositories.materias.listByEditoria('economia', { pageSize: 4 }),
    repositories.media.listPlayShelf(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      {/* Masthead */}
      <header className="flex items-center justify-between border-b border-line pb-5">
        <LupaLockup className="h-9 w-auto" />
        {live ? (
          <span className="lupa-kicker flex items-center gap-2 rounded-pill bg-ink px-3 py-1.5 text-on-dark">
            <span className="inline-block h-2 w-2 animate-live-pulse rounded-pill bg-white" />
            AO VIVO
          </span>
        ) : null}
      </header>

      {/* Destaque ao vivo */}
      {live ? (
        <section className="mt-8">
          <div className="relative flex aspect-video w-full items-end overflow-hidden rounded bg-ink">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-[78px] w-[78px] items-center justify-center rounded-pill border border-white/70 bg-ink/50 text-on-dark">
                <LupaMark className="h-8 w-8" />
              </span>
            </div>
            <div className="relative w-full bg-gradient-to-t from-black/70 to-transparent p-6">
              <span className="lupa-kicker text-on-dark-muted">
                {editoriaNome(live.editoria)} · AO VIVO
              </span>
              <h1 className="mt-2 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-wordmark text-on-dark">
                {live.titulo}
              </h1>
              {typeof live.liveViewers === 'number' ? (
                <p className="mt-2 font-mono text-xs text-on-dark-muted">
                  {formatViews(live.liveViewers).replace('visualizações', 'assistindo agora')}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-3">
        {/* Mais lidas */}
        <section className="md:col-span-2">
          <h2 className="lupa-kicker border-b-2 border-ink pb-2 text-ink">Mais lidas</h2>
          <ol className="mt-4 divide-y divide-line">
            {maisLidas.map((m, i) => (
              <li key={m.id} className="flex gap-4 py-4">
                <span className="font-display text-2xl font-extrabold text-gray-300">
                  {i + 1}
                </span>
                <div>
                  <span className="lupa-kicker">{editoriaNome(m.editoria)}</span>
                  <h3 className="mt-1 font-display text-lg font-bold leading-snug">
                    {m.titulo}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-gray-400">
                    {m.publishedAt ? formatRelativo(m.publishedAt) : ''} ·{' '}
                    {formatViews(m.views ?? 0)}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Editoria: Economia */}
          <h2 className="lupa-kicker mt-10 border-b-2 border-ink pb-2 text-ink">
            {editoriaNome('economia')}
          </h2>
          <ul className="mt-4 space-y-4">
            {economia.items.map((m) => (
              <li key={m.id} className="border-b border-line-soft pb-4">
                <h3 className="font-display text-base font-bold leading-snug">{m.titulo}</h3>
                <p className="mt-1 font-serif text-[15px] leading-relaxed text-gray-500">
                  {m.standfirst}
                </p>
                <p className="mt-1 font-mono text-[11px] text-gray-400">
                  {m.publishedAt ? formatData(m.publishedAt) : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Coluna: A seguir no Lupa Play + Opinião */}
        <aside className="space-y-10">
          {shelf[0] ? (
            <section>
              <h2 className="lupa-kicker border-b-2 border-ink pb-2 text-ink">
                {shelf[0].titulo}
              </h2>
              <ul className="mt-4 space-y-3">
                {shelf[0].itens.map((v) => (
                  <li key={v.id} className="flex items-start gap-3">
                    <span className="flex h-[70px] w-[118px] shrink-0 items-center justify-center rounded-sm bg-surface-3 font-mono text-[11px] text-gray-400">
                      {typeof v.duracaoSeg === 'number' ? formatDuracao(v.duracaoSeg) : '—'}
                    </span>
                    <div>
                      <span className="lupa-kicker">{editoriaNome(v.editoria)}</span>
                      <h3 className="mt-0.5 font-display text-sm font-bold leading-snug">
                        {v.titulo}
                      </h3>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="lupa-kicker border-b-2 border-ink pb-2 text-ink">Opinião</h2>
            <ul className="mt-4 space-y-5">
              {opiniao.map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-pill bg-surface-3" aria-hidden />
                  <div>
                    <p className="font-serif text-[15px] italic leading-snug text-ink-soft">
                      “{m.titulo}”
                    </p>
                    <p className="mt-1 lupa-kicker">{m.autores[0]?.nome}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* Faixa Lupa Play (superfície escura, inversão) */}
      <section className="mt-14 rounded-lg bg-ink px-6 py-8">
        <div className="flex items-center justify-between">
          <LupaLockupWhite className="h-7 w-auto" />
          <span className="lupa-kicker text-on-dark-muted">
            Vídeos · Podcasts · Ao Vivo · Cortes
          </span>
        </div>
      </section>

      <footer className="mt-12 border-t border-line py-8 font-mono text-[11px] uppercase tracking-widest text-gray-400">
        © 2026 Lupa Notícias · Fundação web (prompt 02)
      </footer>
    </main>
  );
}
