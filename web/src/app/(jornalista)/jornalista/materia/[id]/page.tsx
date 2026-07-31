import { notFound, redirect } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { exigirGrupo } from '@/lib/auth/session';
import { contextoEditorial } from '@/lib/tenant';
import { MateriaEditor } from '@/components/portal/MateriaEditor';
import { StatusBadge } from '@/components/portal/StatusBadge';
import { STATUS_EDITAVEL } from '@/lib/editorial';

export default async function EditarMateria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirGrupo('jornalista', 'diretor', 'admin');
  const { id } = await params;
  const ctx = await contextoEditorial(usuario);
  const autorId = ctx.author.id;
  const isStaff = usuario.grupos.includes('admin') || usuario.grupos.includes('diretor');
  const [materia, editorias, pautas] = await Promise.all([
    repositories.materias.getById(id),
    repositories.editorias.list(),
    repositories.pautas.listAbertas(
      ctx.isMaster ? undefined : autorId,
      ctx.cidadeId ?? undefined,
    ),
  ]);
  if (!materia) notFound();

  if (!ctx.isMaster && materia.cidadeId && ctx.cidadeId && materia.cidadeId !== ctx.cidadeId) {
    redirect('/sem-acesso');
  }

  const dono = materia.autores.some((a) => a.id === autorId);
  if (!dono && !isStaff) redirect('/sem-acesso');
  if (!STATUS_EDITAVEL.has(materia.status) && !isStaff) {
    redirect('/jornalista');
  }

  const cidade =
    ctx.cidade ??
    (materia.cidadeId ? await repositories.cidades.getById(materia.cidadeId) : null);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">Editar matéria</h1>
        <StatusBadge status={materia.status} />
      </div>
      <MateriaEditor
        materia={materia}
        editorias={editorias}
        pautas={pautas}
        permiteEstadual={cidade?.permiteEstadual ?? true}
        permiteNacional={cidade?.permiteNacional ?? ctx.isMaster}
      />
    </div>
  );
}
