import Link from 'next/link';
import type { StatusMateria } from '@/types';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatRelativo } from '@/lib/format';
import { getUsuarioAtual } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { StatusBadge } from '@/components/portal/StatusBadge';
import { Pill, EmptyState } from '@/components/ui';

const FILTROS: { key: string; label: string; status?: StatusMateria }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'rascunho', label: 'Rascunhos', status: 'rascunho' },
  { key: 'pendente', label: 'Pendentes', status: 'pendente' },
  { key: 'publicada', label: 'Publicadas', status: 'publicada' },
  { key: 'recusada', label: 'Recusadas', status: 'recusada' },
];

export default async function MinhasMaterias({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filtro = FILTROS.find((f) => f.key === status) ?? FILTROS[0];
  const usuario = await getUsuarioAtual();
  const autorId = usuario ? autorIdDoUsuario(usuario) : 'a-2';
  const materias = await repositories.materias.listMinhas(autorId, filtro.status);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-ink">Minhas matérias</h1>
        <Link href="/jornalista/materia/nova" className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white">
          + Nova matéria
        </Link>
      </div>

      <nav aria-label="Filtro" className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link key={f.key} href={f.key === 'todas' ? '/jornalista' : `/jornalista?status=${f.key}`}>
            <Pill active={f.key === filtro.key}>{f.label}</Pill>
          </Link>
        ))}
      </nav>

      {materias.length === 0 ? (
        <EmptyState titulo="Nenhuma matéria aqui" descricao="Comece uma nova matéria para vê-la nesta lista." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {materias.map((m) => (
            <li key={m.id} className="flex items-center gap-4 px-4 py-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <StatusBadge status={m.status} />
                  <span className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">{editoriaNome(m.editoria)}</span>
                </div>
                <Link href={`/jornalista/materia/${m.id}`} className="font-display text-base font-bold text-ink hover:underline">
                  {m.titulo}
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                  {m.updatedAt ? `Atualizada ${formatRelativo(m.updatedAt)}` : m.publishedAt ? `Publicada ${formatRelativo(m.publishedAt)}` : ''}
                </p>
              </div>
              <Link href={`/jornalista/materia/${m.id}`} className="shrink-0 rounded border border-line px-3 py-1.5 font-display text-sm font-semibold text-ink hover:border-ink">
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
