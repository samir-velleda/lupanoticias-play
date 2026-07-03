/* eslint-disable @next/next/no-html-link-for-pages -- /api/auth/logout é route handler (redirect), exige <a> */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { LupaMark } from '@/components/brand';
import { PortalNav, type PortalNavItem } from './PortalNav';

/** Casca dos portais (admin/jornalista/estúdio): topbar escura + nav + usuário. */
export function PortalShell({
  titulo,
  nav,
  usuarioNome,
  children,
}: {
  titulo: string;
  nav: PortalNavItem[];
  usuarioNome?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-surface-2">
      <header className="sticky top-0 z-30 bg-ink text-on-dark">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 sm:px-7">
          <Link href="/" className="flex items-center gap-2 text-white" aria-label="Lupa — início">
            <LupaMark className="h-5 w-5 text-white" />
            <span className="font-display text-sm font-extrabold uppercase tracking-wide">{titulo}</span>
          </Link>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <PortalNav items={nav} />
          </div>
          <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
            {usuarioNome ? (
              <span className="hidden font-mono text-[11px] text-on-dark-muted sm:inline">{usuarioNome}</span>
            ) : null}
            <a href="/api/auth/logout" className="font-mono text-[11px] uppercase tracking-kicker text-on-dark-muted hover:text-white">
              Sair
            </a>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-7">{children}</div>
    </div>
  );
}
