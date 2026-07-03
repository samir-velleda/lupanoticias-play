import { repositories } from '@/lib/data/repositories';
import { MateriaEditor } from '@/components/portal/MateriaEditor';

export default async function NovaMateria({
  searchParams,
}: {
  searchParams: Promise<{ pauta?: string }>;
}) {
  const { pauta } = await searchParams;
  const [editorias, pautas] = await Promise.all([
    repositories.editorias.list(),
    repositories.pautas.listAbertas(),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink">Nova matéria</h1>
      <MateriaEditor materia={null} editorias={editorias} pautas={pautas} pautaInicial={pauta} />
    </div>
  );
}
