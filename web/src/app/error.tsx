'use client';

/**
 * Boundary global de erro de UI (não confunde com 404).
 * Em produção o Next omite a mensagem — exibimos digest para suporte.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-24 text-center">
      <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">
        Erro temporário
      </span>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Não foi possível carregar esta página
      </h1>
      <p className="max-w-md font-serif text-[15px] text-gray-500">
        Tente novamente. Se o problema continuar, volte à Home ou avise o suporte com o código
        abaixo.
      </p>
      {error.digest ? (
        <p className="font-mono text-[11px] text-gray-400">ref: {error.digest}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-ink px-5 py-3 font-display text-sm font-bold text-white hover:opacity-90"
        >
          Tentar de novo
        </button>
        <a
          href="/"
          className="rounded border border-line px-5 py-3 font-display text-sm font-semibold text-ink hover:border-ink"
        >
          Ir para a Home
        </a>
      </div>
    </main>
  );
}
