'use client';

/**
 * UI de erro compartilhada dos portais (admin/jornalista/estúdio). Renderiza DENTRO do
 * PortalShell (o error.tsx do grupo troca só o conteúdo da página). Degrada graciosamente
 * uma falha de runtime (ex.: leitura do Aurora indisponível) sem derrubar a tela.
 */
export function PortalErro({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-3 py-16">
      <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">
        Algo deu errado
      </span>
      <h1 className="font-display text-2xl font-extrabold text-ink">
        Não foi possível carregar esta seção
      </h1>
      <p className="font-serif text-[15px] leading-relaxed text-gray-500">
        Tente novamente em instantes. Se persistir, atualize a página ou volte mais tarde.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white hover:opacity-90"
      >
        Tentar de novo
      </button>
    </div>
  );
}
