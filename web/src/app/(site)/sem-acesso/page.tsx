/* eslint-disable @next/next/no-html-link-for-pages -- /api/auth/* são route handlers (redirect OAuth), exigem <a> */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getUsuarioAtual } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Sem acesso' };

export default async function SemAcessoPage() {
  const u = await getUsuarioAtual();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
      <span className="font-mono text-[11px] uppercase tracking-kicker text-gray-400">Acesso negado</span>
      <h1 className="font-display text-3xl font-extrabold text-ink">Você não tem permissão</h1>
      <p className="max-w-sm font-serif text-[15px] text-gray-500">
        Sua conta {u?.email ? <strong>({u.email})</strong> : null} não pertence ao grupo necessário
        para esta área. Fale com um administrador.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/" className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white">Ir para a Home</Link>
        <a href="/api/auth/logout" className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink">Trocar de conta</a>
      </div>
    </main>
  );
}
