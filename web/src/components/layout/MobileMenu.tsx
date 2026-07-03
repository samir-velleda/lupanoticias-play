'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { NavItem } from './HeaderNav';

/**
 * Menu do cabeçalho (hambúrguer). Abre/fecha um painel com as seções/editorias
 * + links utilitários. Acessível: aria-expanded, Esc fecha (devolve o foco ao
 * botão), clique fora fecha, foca o 1º item ao abrir. DESIGN_SPEC §1 (nav + "＋ SEÇÕES").
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // foca o 1º link do painel
    const first = panelRef.current?.querySelector<HTMLElement>('a,button');
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="lupa-menu-panel"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col gap-1 p-1"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <>
            <span className="h-0.5 w-5 bg-ink" />
            <span className="h-0.5 w-5 bg-ink" />
            <span className="h-0.5 w-5 bg-ink" />
          </>
        )}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="lupa-menu-panel"
          role="menu"
          aria-label="Seções"
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-line bg-surface shadow-card"
        >
          <div
            className="max-h-[70vh] overflow-y-auto p-2"
            onClick={(e) => {
              // fecha ao clicar em qualquer link do menu (navegação)
              if ((e.target as HTMLElement).closest('a')) setOpen(false);
            }}
          >
            <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-kicker text-gray-400">Seções</div>
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="block rounded px-2 py-2 font-display text-[15px] font-semibold text-ink hover:bg-surface-2"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-1.5 h-px bg-line" />
            <Link href="/entrar" role="menuitem" className="block rounded px-2 py-2 font-display text-[15px] font-semibold text-ink hover:bg-surface-2">
              Entrar
            </Link>
            <Link href="#" role="menuitem" className="block rounded px-2 py-2 font-display text-[15px] text-gray-700 hover:bg-surface-2">
              Assine
            </Link>
            <Link href="#" role="menuitem" className="block rounded px-2 py-2 font-display text-[15px] text-gray-700 hover:bg-surface-2">
              Newsletters
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
