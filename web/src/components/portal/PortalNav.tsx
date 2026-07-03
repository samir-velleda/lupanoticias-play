'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface PortalNavItem {
  href: string;
  label: string;
}

/** Nav do portal (topbar escura) — item ativo em branco. */
export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Seções do portal">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
