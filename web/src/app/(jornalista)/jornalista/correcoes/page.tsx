import Link from 'next/link';
import type { StatusMateria } from '@/types';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatRelativo } from '@/lib/format';
import { getUsuarioAtual } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { StatusBadge } from '@/components/portal/StatusBadge';
import { EmptyState } from '@/components/ui';

const EM_CORRECAO: StatusMateria[] = ['recusada', 'em_correcao'];

export default async function Correcoes() {
  const usuario = await getUsuarioAtual();
  const autorId = usuario ? await autorIdDoUsuario(usuario) : 'a-2';
  const todas = await repositories.materias.listMinhas(autorId);
  const materias = todas.filter((m) => EM_CORRECAO.includes(m.status));

  const comJustificativa = await Promise.all(
    materias.map(async (m) => {
      const revisoes = await repositories.materias.listRevisoes(m.id);
      const ultimaRecusa = revisoes
        .filter((r) => r.decisao === 'recusada' && r.justificativa)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
      return { materia: m, justificativa: ultimaRecusa?.justificativa, quando: ultimaRecusa?.criadoEm };
    }),
  );

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Correções pendentes</h1>
      <p className="mb-6 font-serif text-[15px] text-gray-500">Matérias recusadas pela Direção — leia a justificativa, corrija e reenvie.</p>

      {comJustificativa.length === 0 ? (
        <EmptyState titulo="Nada para corrigir" descricao="Nenhuma matéria sua foi recusada. Bom trabalho!" />
      ) : (
        <div className="space-y-4">
          {comJustificativa.map(({ materia: m, justificativa, quando }) => (
            <article key={m.id} className="rounded-lg border border-line bg-surface p-5">
              <div className="mb-2 flex items-center gap-2">
                <StatusBadge status={m.status} />
                <span className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">{editoriaNome(m.editoria)}</span>
              </div>
              <h2 className="font-display text-lg font-bold text-ink">{m.titulo}</h2>
              {justificativa ? (
                <div className="mt-3 border-l-[3px] border-ink bg-surface-2 px-4 py-3">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-kicker text-gray-500">
                    Justificativa da Direção{quando ? ` · ${formatRelativo(quando)}` : ''}
                  </div>
                  <p className="font-serif text-[15px] italic leading-relaxed text-ink">“{justificativa}”</p>
                </div>
              ) : null}
              <Link href={`/jornalista/materia/${m.id}`} className="mt-4 inline-block rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white">
                Corrigir e reenviar
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
