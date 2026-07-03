import { exigirGrupo } from '@/lib/auth/session';
import { authConfigurada } from '@/lib/auth/config';
import { listarUsuarios } from '@/lib/auth/admin';
import { CriarUsuarioForm } from '@/components/portal/CriarUsuarioForm';

export default async function UsuariosAdmin() {
  await exigirGrupo('admin'); // usuários é admin-only
  const configurada = authConfigurada();
  let usuarios: Awaited<ReturnType<typeof listarUsuarios>> = [];
  let erro = '';
  if (configurada) {
    try {
      usuarios = await listarUsuarios();
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Falha ao listar usuários';
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Usuários</h1>

      {!configurada ? (
        <p className="mb-6 rounded border border-line bg-surface-2 px-4 py-3 font-mono text-xs text-gray-700">
          Cognito não configurado neste ambiente — a gestão de usuários funciona no deploy (dev/prod).
        </p>
      ) : null}
      {erro ? (
        <p className="mb-6 rounded border border-line bg-surface-2 px-4 py-3 font-mono text-xs text-gray-700">{erro}</p>
      ) : null}

      <div className="mb-6">
        <CriarUsuarioForm />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-kicker text-gray-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papéis</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center font-serif text-[15px] text-gray-400">
                  Nenhum usuário {configurada ? 'ainda' : '(ambiente sem Cognito)'}.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.username} className="font-display text-sm text-ink">
                  <td className="px-4 py-3 font-semibold">{u.nome ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-gray-700">{u.email ?? u.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.grupos.length ? (
                        u.grupos.map((g) => (
                          <span key={g} className="rounded-pill border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-700">{g}</span>
                        ))
                      ) : (
                        <span className="font-mono text-[11px] text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{u.status ?? ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
