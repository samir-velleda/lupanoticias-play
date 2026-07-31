import Link from 'next/link';

/** Barra superior Lupa Notícias (integração editorial ↔ Desapegoo). */
export function LupaBar() {
  return (
    <div className="bg-[var(--d-navy)] text-[13px] text-[#E8EDF3]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-5 px-6 py-2.5">
        <Link href="/" className="d-display text-[15px] tracking-wide !text-white">
          LUPANOTÍCIAS
        </Link>
        <div className="flex items-center gap-1.5 rounded-pill bg-[#E03131] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          AO VIVO
        </div>
        <div className="ml-auto flex flex-wrap gap-4 opacity-85">
          <Link href="/politica" className="!text-[#E8EDF3] hover:!text-white">
            Política
          </Link>
          <Link href="/economia" className="!text-[#E8EDF3] hover:!text-white">
            Economia
          </Link>
          <Link href="/esportes" className="!text-[#E8EDF3] hover:!text-white">
            Esportes
          </Link>
          <Link href="/cultura" className="!text-[#E8EDF3] hover:!text-white">
            Cultura
          </Link>
          <span className="font-bold text-[var(--d-gold)]">Desapegoo</span>
        </div>
      </div>
    </div>
  );
}
