'use client';

/** Boundary de erro do portal admin/diretor. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">
        Erro no painel
      </span>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">
        Não foi possível carregar esta tela
      </h1>
      <p className="mt-2 font-serif text-[15px] text-gray-500">
        Atualize a página. Se persistir, copie a referência abaixo.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-gray-400">ref: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded bg-ink px-5 py-3 font-display text-sm font-bold text-white"
      >
        Tentar de novo
      </button>
    </div>
  );
}
