'use client';

import { useActionState } from 'react';
import { criarUsuarioAction, type CriarUsuarioResult } from '@/lib/actions/usuarios';

const inicial: CriarUsuarioResult = { ok: false };

/** Form de criação de usuário Cognito (papel = grupo). Usa server action. */
export function CriarUsuarioForm() {
  const [state, action, pending] = useActionState(criarUsuarioAction, inicial);
  const field = 'w-full rounded border border-line bg-surface px-3 py-2 font-serif text-[15px] text-ink outline-none focus:border-ink';

  return (
    <form action={action} className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4 font-display text-lg font-extrabold text-ink">Novo usuário</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input name="nome" placeholder="Nome" className={field} required />
        <input name="email" type="email" placeholder="E-mail" className={field} required />
        <select name="grupo" className={field} defaultValue="jornalista">
          <option value="jornalista">Jornalista</option>
          <option value="diretor">Diretor</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={pending} className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
          {pending ? 'Criando…' : 'Criar e convidar'}
        </button>
      </div>
      {state.erro ? <p role="alert" aria-live="assertive" className="mt-3 font-mono text-[11px] text-ink">{state.erro}</p> : null}
      {state.ok ? <p role="status" aria-live="polite" className="mt-3 font-mono text-[11px] text-gray-500">Usuário criado — convite enviado por e-mail.</p> : null}
    </form>
  );
}
