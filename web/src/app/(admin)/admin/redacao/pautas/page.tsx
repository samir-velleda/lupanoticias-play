import Link from 'next/link';
import { exigirGrupo } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatData } from '@/lib/format';
import { contextoEditorial } from '@/lib/tenant';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

const PRIORIDADE: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const STATUS: Record<string, string> = {
  aberta: 'Aberta',
  em_producao: 'Em produção',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export default async function PautasRedacao() {
  const usuario = await exigirGrupo('admin', 'diretor');
  const ctx = await contextoEditorial(usuario);
  const cidadeId = ctx.cidadeId ?? undefined;
  const pautas = await repositories.pautas.listAbertas(undefined, cidadeId);
  const autorIds = [...new Set(pautas.flatMap((p) => p.atribuidos))];
  const autores = await Promise.all(autorIds.map((id) => repositories.authors.getById(id)));
  const nomePorId = new Map(
    autores.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a.id, a.nome]),
  );
  const cidadeLabel = ctx.cidade
    ? `${ctx.cidade.nome} (${ctx.cidade.uf})`
    : 'Todas (Master) / Matriz';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Pautas da redação</h1>
          <p className="mt-1 font-serif text-[15px] text-gray-500">
            {cidadeLabel}. O jornalista da cidade vê as pautas abertas (gerais ou atribuídas) e
            confirma para escrever a matéria.
          </p>
        </div>
        <Link
          href="/admin/redacao/pautas/nova"
          className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white"
        >
          Sugerir pauta
        </Link>
      </div>

      {pautas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma pauta aberta"
          descricao="Clique em “Sugerir pauta” para enviar um tema à redação."
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {pautas.map((p) => {
            const dest =
              p.atribuidos.length === 0
                ? 'Toda a redação'
                : p.atribuidos.map((id) => nomePorId.get(id) ?? id).join(', ');
            return (
              <li key={p.id} className="px-4 py-4 sm:px-5">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-kicker text-gray-400">
                  <span>{STATUS[p.status] ?? p.status}</span>
                  <span>· Prioridade {PRIORIDADE[p.prioridade] ?? p.prioridade}</span>
                  {p.categoriaSugerida ? <span>· {editoriaNome(p.categoriaSugerida)}</span> : null}
                  {p.prazo ? <span>· Prazo {formatData(p.prazo)}</span> : null}
                </div>
                <h2 className="font-display text-lg font-bold text-ink">{p.tema}</h2>
                <p className="mt-1.5 font-serif text-[15px] leading-relaxed text-gray-500">
                  {p.descricao}
                </p>
                <p className="mt-2 font-mono text-[11px] text-gray-400">Para: {dest}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
