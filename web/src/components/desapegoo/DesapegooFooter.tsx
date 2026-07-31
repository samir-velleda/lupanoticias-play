import Link from 'next/link';

export function DesapegooFooter() {
  return (
    <footer className="mt-12 bg-[var(--d-navy)] text-[var(--d-cream)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 py-9">
        <div className="min-w-[220px] flex-1">
          <div className="d-display text-[22px]">
            desapeg<span className="text-[var(--d-coral)]">oo</span>
          </div>
          <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed opacity-70">
            o brechó do Lupa Notícias. compra e venda de usados com história.
          </p>
        </div>
        <div className="flex flex-wrap gap-12 text-[13px]">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider opacity-60">DESAPEGOO</span>
            <Link href="/desapegoo/busca" className="!text-[var(--d-cream)]">
              garimpar
            </Link>
            <Link href="/desapegoo/vender" className="!text-[var(--d-cream)]">
              vender
            </Link>
            <Link href="/desapegoo/lojinha/lojinha-da-ju" className="!text-[var(--d-cream)]">
              minha lojinha
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider opacity-60">AJUDA</span>
            <span className="opacity-70">como funciona</span>
            <span className="opacity-70">frete e prazos</span>
            <span className="opacity-70">pagamentos Boovest</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider opacity-60">LUPA</span>
            <Link href="/" className="!text-[var(--d-cream)]">
              lupanotícias
            </Link>
            <Link href="/play" className="!text-[var(--d-cream)]">
              lupa play
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-60">
        © 2026 Desapegoo · um produto Lupa Notícias · pagamentos oficiais Boovest
      </div>
    </footer>
  );
}
