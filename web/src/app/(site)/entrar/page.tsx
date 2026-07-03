/* eslint-disable @next/next/no-html-link-for-pages -- /api/auth/* são route handlers (redirect OAuth), exigem <a> (full navigation) */
import type { Metadata } from 'next';
import Link from 'next/link';
import { LupaLockup } from '@/components/brand';
import { getUsuarioAtual } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Entrar' };

const ERROS: Record<string, string> = {
  config: 'Autenticação ainda não configurada neste ambiente.',
  state: 'Sessão de login inválida. Tente novamente.',
  token: 'Não foi possível concluir o login. Tente novamente.',
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const usuario = await getUsuarioAtual();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-5 py-20 text-center">
      <LupaLockup className="h-9 w-auto" />
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Acesso da redação</h1>
        <p className="mt-2 font-serif text-[15px] text-gray-500">
          Portais de Jornalista, Diretor de Redação e Admin. O site público não exige login.
        </p>
      </div>

      {erro ? (
        <p className="w-full rounded border border-line bg-surface-2 px-4 py-3 font-mono text-xs text-gray-700">
          {ERROS[erro] ?? 'Ocorreu um erro no login.'}
        </p>
      ) : null}

      {usuario ? (
        <div className="flex flex-col items-center gap-3">
          <p className="font-serif text-[15px] text-ink">
            Você já está logado como <strong>{usuario.nome ?? usuario.email}</strong>.
          </p>
          <div className="flex gap-2">
            {usuario.grupos.includes('jornalista') ? (
              <Link href="/jornalista" className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white">Portal do Jornalista</Link>
            ) : null}
            {usuario.grupos.some((g) => g === 'admin' || g === 'diretor') ? (
              <Link href="/admin" className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white">Portal Admin</Link>
            ) : null}
            <a href="/api/auth/logout" className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink">Sair</a>
          </div>
        </div>
      ) : (
        <a
          href="/api/auth/login"
          className="w-full rounded bg-ink px-5 py-3 font-display text-sm font-bold text-white hover:opacity-90"
        >
          Entrar com Cognito
        </a>
      )}
    </main>
  );
}
