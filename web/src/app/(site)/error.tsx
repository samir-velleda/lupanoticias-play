'use client';

/** Boundary de erro do site público (estado de erro — DESIGN_SPEC §7). */
export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-24 text-center">
      <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">
        Algo deu errado
      </span>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Não foi possível carregar este conteúdo
      </h1>
      <p className="max-w-md font-serif text-[15px] text-gray-500">
        Tente novamente em instantes. Se o problema continuar, volte à página inicial.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded bg-ink px-5 py-3 font-display text-sm font-bold text-white hover:opacity-90"
      >
        Tentar de novo
      </button>
    </main>
  );
}
