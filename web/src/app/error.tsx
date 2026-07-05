'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Boundary de erro raiz (cobre rotas fora do grupo (site): portais, /cortes, estúdio).
 * Degrada graciosamente se uma leitura do Aurora falhar em runtime, em vez da tela
 * de erro crua do Next. NÃO captura notFound() (isso vai para o not-found boundary).
 */
export default function RootError({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Ponto para telemetria futura; sem vazar detalhes ao usuário.
  }, []);
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-5 py-24 text-center">
      <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">
        Algo deu errado
      </span>
      <h1 className="font-display text-3xl font-extrabold text-ink">
        Não foi possível carregar esta página
      </h1>
      <p className="max-w-md font-serif text-[15px] text-gray-500">
        Tente novamente em instantes. Se o problema continuar, volte à página inicial.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-ink px-5 py-3 font-display text-sm font-bold text-white hover:opacity-90"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="rounded border border-line px-5 py-3 font-display text-sm font-semibold text-ink hover:border-ink"
        >
          Ir para a Home
        </Link>
      </div>
    </main>
  );
}
