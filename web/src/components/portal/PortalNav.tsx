'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hrefAtivo } from '@/lib/nav';

export interface PortalNavItem {
  href: string;
  label: string;
}

/** Nav do portal (topbar escura) — item ativo em branco. */
export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();
  // Item ativo = prefixo correspondente MAIS LONGO. Evita que o item índice
  // (ex.: /admin, /jornalista) fique aceso em toda sub-página, já que ele é
  // prefixo de todas elas.
  const ativoHref = hrefAtivo(pathname, items.map((it) => it.href));
  return (
    <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Seções do portal">
      {items.map((item) => {
        const active = item.href === ativoHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded px-3 py-1.5 font-display text-[13.5px] font-semibold transition-colors ${
              active ? 'bg-white text-ink' : 'text-on-dark-muted hover:text-on-dark'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
