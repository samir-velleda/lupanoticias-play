import { notFound, redirect } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { MateriaEditor } from '@/components/portal/MateriaEditor';
import { StatusBadge } from '@/components/portal/StatusBadge';

const STATUS_EDITAVEL = new Set(['rascunho', 'pendente', 'recusada', 'em_correcao']);

export default async function EditarMateria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirGrupo('jornalista', 'diretor', 'admin');
  const { id } = await params;
  const [materia, editorias, pautas] = await Promise.all([
    repositories.materias.getById(id),
    repositories.editorias.list(),
    repositories.pautas.listAbertas(),
  ]);
  if (!materia) notFound();

  const autorId = await autorIdDoUsuario(usuario);
  const isStaff = usuario.grupos.includes('admin') || usuario.grupos.includes('diretor');
  const dono = materia.autores.some((a) => a.id === autorId);
  if (!dono && !isStaff) redirect('/sem-acesso');
  if (!STATUS_EDITAVEL.has(materia.status) && !isStaff) {
    redirect('/jornalista');
  }

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
