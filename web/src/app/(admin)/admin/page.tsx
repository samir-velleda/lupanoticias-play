import Link from 'next/link';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatNumero } from '@/lib/format';
import { StatusBadge } from '@/components/portal/StatusBadge';

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">{label}</div>
      <div className="mt-2 font-display text-3xl font-extrabold text-ink">{valor}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  const [maisLidas, pendentes] = await Promise.all([
    repositories.materias.listMaisLidas(100),
    repositories.materias.listPendentes({ pageSize: 100 }),
  ]);
  const totalViews = maisLidas.reduce((s, m) => s + (m.views ?? 0), 0);
  const totalCliques = maisLidas.reduce((s, m) => s + (m.cliques ?? 0), 0);
  const top = maisLidas.slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Publicadas" valor={String(maisLidas.length)} />
        <Kpi label="Pendentes" valor={String(pendentes.total)} />
        <Kpi label="Visualizações" valor={formatNumero(totalViews)} />
        <Kpi label="Cliques" valor={formatNumero(totalCliques)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-lg font-extrabold text-ink">Top matérias</h2>
          <ol className="space-y-3">
            {top.map((m, i) => (
              <li key={m.id} className="flex items-baseline gap-3">
                <span className="font-display text-xl font-extrabold text-line">{i + 1}</span>
                <div className="flex-1">
                  <div className="font-display text-sm font-bold text-ink">{m.titulo}</div>
                  <div className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">
                    {editoriaNome(m.editoria)} · {formatNumero(m.views ?? 0)} views
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold text-ink">Fila de aprovação</h2>
            <Link href="/admin/redacao" className="font-mono text-[11px] uppercase tracking-kicker text-gray-500 hover:text-ink">
              Ver redação →
            </Link>
          </div>
          {pendentes.items.length === 0 ? (
            <p className="font-serif text-[15px] text-gray-500">Nenhuma matéria pendente. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {pendentes.items.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <StatusBadge status={m.status} />
                  <span className="font-display text-sm font-semibold text-ink">{m.titulo}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
