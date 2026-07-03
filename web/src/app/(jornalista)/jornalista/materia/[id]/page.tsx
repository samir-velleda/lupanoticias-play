import { notFound } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { MateriaEditor } from '@/components/portal/MateriaEditor';
import { StatusBadge } from '@/components/portal/StatusBadge';

export default async function EditarMateria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [materia, editorias, pautas] = await Promise.all([
    repositories.materias.getById(id),
    repositories.editorias.list(),
    repositories.pautas.listAbertas(),
  ]);
  if (!materia) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">Editar matéria</h1>
        <StatusBadge status={materia.status} />
      </div>
      <MateriaEditor materia={materia} editorias={editorias} pautas={pautas} />
    </div>
  );
}
