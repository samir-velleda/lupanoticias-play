import Link from 'next/link';
import { LupaMark } from '@/components/brand';

/**
 * 404 do site público. PRECISA existir DENTRO do grupo (site): o `(site)/error.tsx`
 * é um error boundary e, sem uma boundary de not-found co-localizada, ele intercepta
 * o sinal do notFound() e o status HTTP fica preso em 200 (soft-404). Com este arquivo,
 * o Next resolve notFound() aqui e devolve 404 HTTP REAL (ex.: matéria de slug inexistente).
 */
export default function SiteNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
      <LupaMark className="h-12 w-12 text-ink" />
      <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">
        Erro 404
      </span>
      <h1 className="font-display text-4xl font-extrabold text-ink">
        Página não encontrada
      </h1>
      <p className="max-w-md font-serif text-base text-gray-500">
        O endereço que você procurou não existe ou foi movido.
      </p>
      <Link
        href="/"
        className="mt-2 rounded bg-ink px-5 py-3 font-display text-sm font-bold text-white hover:opacity-90"
      >
        Voltar para a Home
      </Link>
    </main>
  );
}
