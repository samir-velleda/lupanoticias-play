'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { casaRota } from '@/lib/nav';

export interface NavItem {
  href: string;
  label: string;
  slug?: string;
}

/** Linha de navegação de editorias — item ativo em Archivo 800 + borda inferior. */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Editorias"
      className="flex h-[46px] items-center gap-5 overflow-x-auto border-t border-line px-5 sm:px-7"
    >
      {items.map((item) => {
        // Início casa só na home; as seções (editorias, Vídeos) também acendem
        // nas sub-páginas (ex.: /economia aceso em /economia/uma-materia).
        const active = casaRota(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex h-full shrink-0 items-center whitespace-nowrap text-[13.5px] tracking-[0.02em] transition-colors ${
              active
                ? 'border-b-2 border-ink font-extrabold text-ink'
                : 'font-semibold text-ink-soft hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <span className="ml-auto shrink-0 cursor-pointer font-mono text-[11px] tracking-[0.1em] text-gray-400">
        ＋ SEÇÕES
      </span>
    </nav>
  );
}
