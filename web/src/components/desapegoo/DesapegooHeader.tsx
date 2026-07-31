'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DESAPEGO_CATEGORIAS, type DesapegoCategoria } from '@/types/desapego';

function LogoMark() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="11" stroke="#12263A" strokeWidth="3.5" />
      <line x1="24.5" y1="24.5" x2="33" y2="33" stroke="#12263A" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M16 21.5c-0.4-0.3-4.5-3-4.5-5.7 0-1.6 1.2-2.8 2.7-2.8 0.8 0 1.4 0.4 1.8 1 0.4-0.6 1-1 1.8-1 1.5 0 2.7 1.2 2.7 2.8 0 2.7-4.1 5.4-4.5 5.7z"
        fill="#F4633A"
      />
    </svg>
  );
}

export function DesapegooHeader({
  usuarioNome,
  lojinhaSlug,
  logado,
}: {
  usuarioNome?: string | null;
  lojinhaSlug?: string | null;
  logado?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const catParam = sp.get('cat');
  const activeCat = DESAPEGO_CATEGORIAS.some((c) => c.slug === catParam)
    ? (catParam as DesapegoCategoria)
    : null;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (activeCat) params.set('cat', activeCat);
    router.push(`/desapegoo/busca${params.toString() ? `?${params}` : ''}`);
  }

  const chips: { label: string; cat: DesapegoCategoria | null }[] = [
    { label: 'tudo', cat: null },
    ...DESAPEGO_CATEGORIAS.map((c) => ({ label: c.label, cat: c.slug })),
  ];

  const iniciais = (usuarioNome ?? 'EU')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'EU';

  return (
    <div className="sticky top-0 z-20 border-b border-[var(--d-line)] bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-6 py-3.5">
        <Link href="/desapegoo" className="flex items-center gap-2.5 !text-inherit">
          <LogoMark />
          <div>
            <div className="d-display text-[26px] leading-none text-[var(--d-navy)]">
              desapeg<span className="text-[var(--d-coral)]">oo</span>
            </div>
            <div className="mt-0.5 text-[10px] font-semibold tracking-[0.15em] text-[var(--d-muted)]">
              O BRECHÓ DO LUPA
            </div>
          </div>
        </Link>

        <form
          onSubmit={submitSearch}
          className="flex min-w-[220px] max-w-[460px] flex-1 items-center gap-2.5 rounded-pill bg-[var(--d-cream-2)] px-4 py-2.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="#8B94A0" strokeWidth="2" />
            <line x1="11" y1="11" x2="15" y2="15" stroke="#8B94A0" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="buscar achadinhos usados…"
            className="w-full border-none bg-transparent text-sm text-[var(--d-ink)] outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-3.5">
          {logado ? (
            <>
              <Link
                href="/desapegoo/compras"
                className="hidden text-[13px] font-semibold text-[var(--d-navy)] sm:inline"
              >
                compras
              </Link>
              <Link
                href={lojinhaSlug ? `/desapegoo/minha-lojinha` : '/desapegoo/kyc'}
                className="flex items-center gap-2 !text-inherit"
              >
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--d-navy)] text-[13px] font-bold text-white">
                  {iniciais}
                </div>
                <span className="hidden text-[13px] font-semibold text-[var(--d-navy)] sm:inline">
                  lojinha
                </span>
              </Link>
              <Link
                href="/desapegoo/wallet"
                className="hidden text-[13px] font-semibold text-[var(--d-navy)] sm:inline"
              >
                wallet
              </Link>
            </>
          ) : (
            <a
              href="/api/auth/login?next=%2Fdesapegoo%2Fminha-lojinha"
              className="text-[13px] font-semibold text-[var(--d-navy)]"
            >
              entrar
            </a>
          )}
          <Link href="/desapegoo/vender" className="d-btn-primary px-5 py-2.5 text-sm">
            + quero vender
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-2 px-6 pb-3">
        {chips.map((c) => {
          const active = (activeCat ?? null) === c.cat;
          const href = c.cat ? `/desapegoo/busca?cat=${c.cat}` : '/desapegoo/busca';
          return (
            <Link
              key={c.label}
              href={href}
              className="rounded-pill border border-[var(--d-line)] px-4 py-1.5 text-[13px] font-semibold transition-colors"
              style={{
                background: active ? '#12263A' : '#fff',
                color: active ? '#fff' : '#5B6470',
              }}
            >
              {c.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
