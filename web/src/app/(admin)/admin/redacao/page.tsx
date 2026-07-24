import Link from 'next/link';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatRelativo } from '@/lib/format';
import { exigirGrupo } from '@/lib/auth/session';
import { StatusBadge } from '@/components/portal/StatusBadge';
import { EmptyState } from '@/components/ui';

export default async function RedacaoFila() {
  await exigirGrupo('admin', 'diretor');
  const pendentes = await repositories.materias.listPendentes({ pageSize: 50 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink">Diretor de Redação</h1>
        <p className="mt-1 font-serif text-[15px] text-gray-500">
          Fila de aprovação — leia a matéria completa antes de publicar ou recusar.
        </p>
      </div>

      {pendentes.items.length === 0 ? (
        <EmptyState
          titulo="Nenhuma matéria pendente"
          descricao="Quando um jornalista enviar para revisão, ela aparece aqui com título e corpo completos."
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {pendentes.items.map((m) => {
            const primeiroParagrafo = m.corpo.find(
              (b): b is Extract<(typeof m.corpo)[number], { type: 'paragraph' }> =>
                b.type === 'paragraph' && b.text.trim().length > 0,
            );
            const trecho =
              m.standfirst?.trim() ||
              primeiroParagrafo?.text ||
              'Sem resumo — abra para ler o corpo completo.';
            const autor = m.autores[0]?.nome ?? 'Autor não identificado';
            return (
              <li key={m.id} className="px-4 py-4 sm:px-5">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={m.status} />
                  <span className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">
                    {editoriaNome(m.editoria)}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">· {autor}</span>
                  {m.updatedAt ? (
                    <span className="font-mono text-[10px] text-gray-400">
                      · {formatRelativo(m.updatedAt)}
                    </span>
                  ) : null}
                </div>
                <Link
                  href={`/admin/redacao/${m.id}`}
                  className="font-display text-lg font-bold text-ink hover:underline"
                >
                  {m.titulo}
                </Link>
                <p className="mt-1.5 line-clamp-2 font-serif text-[15px] leading-relaxed text-gray-500">
                  {trecho}
                </p>
                <div className="mt-3">
                  <Link
                    href={`/admin/redacao/${m.id}`}
                    className="rounded border border-line px-3 py-1.5 font-display text-sm font-semibold text-ink hover:border-ink"
                  >
                    Ler matéria completa →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
