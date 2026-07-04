import { exigirGrupo } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { RedacaoFila, type PendenteItem } from '@/components/portal/RedacaoFila';
import { ModoAutomaticoToggles, type EditoriaModo } from '@/components/portal/ModoAutomaticoToggles';

/** Diretor de Redação: fila de aprovação + modo automático por categoria. */
export default async function RedacaoPage() {
  await exigirGrupo('admin', 'diretor');

  const [pendentesPaged, modo, editorias] = await Promise.all([
    repositories.materias.listPendentes({ pageSize: 100 }),
    repositories.config.getModoAutomatico(),
    repositories.editorias.list(),
  ]);

  const pendentes: PendenteItem[] = pendentesPaged.items.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    editoriaNome: editoriaNome(m.editoria),
    standfirst: m.standfirst,
    autor: m.autores[0]?.nome ?? 'Redação',
  }));

  const ativoPor = new Map(modo.map((m) => [m.categoria, m.ativo]));
  const editoriasModo: EditoriaModo[] = editorias.map((e) => ({
    slug: e.slug,
    nome: e.nome,
    ativo: ativoPor.get(e.slug) ?? false,
  }));

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Diretor de Redação</h1>
      <p className="mb-6 font-serif text-[15px] text-gray-500">
        Aprove ou recuse matérias pendentes (recusa exige justificativa) e controle o modo
        automático por editoria.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            Fila de aprovação
            <span className="rounded-pill bg-ink px-2 py-0.5 font-mono text-[10px] font-bold text-white">
              {pendentes.length}
            </span>
          </h2>
          <RedacaoFila pendentes={pendentes} />
        </section>

        <aside>
          <h2 className="mb-4 font-display text-lg font-extrabold text-ink">Modo automático</h2>
          <p className="mb-3 font-serif text-[13.5px] leading-relaxed text-gray-500">
            Editorias ligadas publicam matérias enviadas <strong>sem revisão</strong>.
          </p>
          <ModoAutomaticoToggles editorias={editoriasModo} />
        </aside>
      </div>
    </div>
  );
}
