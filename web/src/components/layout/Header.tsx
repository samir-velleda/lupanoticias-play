import Link from 'next/link';
import { repositories } from '@/lib/data/repositories';
import { LupaLockup } from '@/components/brand';
import { LiveBadge } from '@/components/ui';
import { HeaderNav, type NavItem } from './HeaderNav';

const NAV_SLUGS = [
  'politica',
  'economia',
  'mundo',
  'esportes',
  'cultura',
  'tecnologia',
  'ciencia',
  'saude',
  'opiniao',
] as const;

function barraData(now: Date): string {
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  return fmt
    .format(now)
    .replace(/\./g, '')
    .toUpperCase()
    .replace(/,/, ',');
}

export async function Header() {
  const [editorias, live, ticker] = await Promise.all([
    repositories.editorias.list(),
    repositories.media.getLiveDestaque(),
    repositories.materias.listMaisLidas(3),
  ]);

  const nomePorSlug = new Map(editorias.map((e) => [e.slug, e.nome]));
  const navItems: NavItem[] = [
    { href: '/', label: 'Início' },
    ...NAV_SLUGS.map((slug) => ({
      href: `/${slug}`,
      label: nomePorSlug.get(slug) ?? slug,
    })),
    { href: '/play', label: 'Vídeos' },
  ];

  return (
    <header className="bg-surface">
      {/* Faixa 1 — utilitária escura */}
      <div className="flex items-center justify-between bg-ink px-5 py-2 font-mono text-[11px] tracking-[0.06em] text-[#cfcfd4] sm:px-7">
        <span>{barraData(new Date())} · SÃO PAULO · 24°C</span>
        <div className="hidden gap-5 sm:flex">
          <Link href="#" className="hover:text-white">Newsletters</Link>
          <Link href="#" className="text-white">Assine</Link>
          <Link href="/entrar" className="hover:text-white">Entrar</Link>
        </div>
      </div>

      {/* Faixa 2 — masthead */}
      <div className="flex items-center justify-between px-5 py-4 sm:px-7">
        <Link href="/" aria-label="Lupa Notícias — início">
          <LupaLockup className="h-8 w-auto sm:h-9" />
        </Link>
        <div className="flex items-center gap-4">
          {live ? (
            <Link href={`/play/${live.id}`} aria-label="Assistir ao vivo">
              <LiveBadge />
            </Link>
          ) : null}
          <button type="button" aria-label="Buscar" className="text-ink">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" aria-label="Menu" className="flex flex-col gap-1">
            <span className="h-0.5 w-5 bg-ink" />
            <span className="h-0.5 w-5 bg-ink" />
            <span className="h-0.5 w-5 bg-ink" />
          </button>
        </div>
      </div>

      {/* Faixa 3 — nav de editorias */}
      <HeaderNav items={navItems} />

      {/* Faixa 4 — ticker ÚLTIMAS */}
      <div className="flex items-center gap-3.5 border-t border-line bg-surface-2 px-5 py-2.5 text-[12.5px] sm:px-7">
        <span className="shrink-0 rounded-sm bg-ink px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.1em] text-white">
          ÚLTIMAS
        </span>
        <div className="flex gap-4 overflow-hidden whitespace-nowrap text-ink-soft">
          {ticker.map((m, i) => (
            <span key={m.id} className="flex items-center gap-4">
              {i > 0 ? <span className="text-line" aria-hidden>•</span> : null}
              <Link href={`/${m.editoria}/${m.slug}`} className="hover:text-ink">
                {m.titulo}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
