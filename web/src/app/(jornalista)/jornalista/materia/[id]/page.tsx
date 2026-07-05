import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { getUsuarioAtual } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { podeEditar } from '@/lib/domain/materia';
import { reabrirParaCorrecao } from '@/lib/actions/materias';
import { MateriaEditor } from '@/components/portal/MateriaEditor';
import { StatusBadge } from '@/components/portal/StatusBadge';

export default async function EditarMateria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await getUsuarioAtual();
  const autorId = usuario ? autorIdDoUsuario(usuario) : '';
  const ehAdmin = usuario?.grupos.includes('admin') ?? false;

  const [materia, editorias, pautas] = await Promise.all([
    repositories.materias.getById(id),
    repositories.editorias.list(),
    repositories.pautas.listAbertas(autorId || undefined),
  ]);
  // Autorização por RECURSO: matéria inexistente OU de outro autor → 404 (não revela
  // a existência de conteúdo alheio). Admin passa livre. Ver server action salvarMateria.
  if (!materia) notFound();
  const dono = materia.autores.some((a) => a.id === autorId);
  if (!dono && !ehAdmin) notFound();

  const editavel = podeEditar(materia.status);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">
          {editavel ? 'Editar matéria' : 'Matéria'}
        </h1>
        <StatusBadge status={materia.status} />
      </div>

      {editavel ? (
        <MateriaEditor materia={materia} editorias={editorias} pautas={pautas} />
      ) : (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-lg border border-line bg-surface-2 p-5">
            <h2 className="font-display text-lg font-bold text-ink">{materia.titulo}</h2>
            <p className="mt-2 font-serif text-[15px] leading-relaxed text-gray-500">
              {materia.status === 'publicada' ? (
                <>
                  Matéria publicada. Para alterá-la, <strong>reabra para correção</strong>: sua
                  edição vira um rascunho que passa pela Direção — a versão no ar só muda quando
                  a correção é aprovada.
                </>
              ) : (
                <>
                  Esta matéria está <strong>{materia.status}</strong> e não pode ser editada
                  diretamente.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {materia.status === 'publicada' ? (
              <form action={reabrirParaCorrecao.bind(null, materia.id)}>
                <button
                  type="submit"
                  className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white hover:opacity-90"
                >
                  Reabrir para correção
                </button>
              </form>
            ) : null}
            <Link
              href="/jornalista"
              className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink hover:border-ink"
            >
              ← Minhas matérias
            </Link>
            {materia.status === 'publicada' ? (
              <Link
                href={`/${materia.editoria}/${materia.slug}`}
                className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink hover:border-ink"
              >
                Ver no site →
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
