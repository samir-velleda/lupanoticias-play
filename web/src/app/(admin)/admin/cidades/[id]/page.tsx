import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirGrupo } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { CidadeForm } from '@/components/portal/CidadeForm';

export const dynamic = 'force-dynamic';

export default async function EditarCidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirGrupo('admin');
  const { id } = await params;
  const [cidade, diretores, jornalistas] = await Promise.all([
    repositories.cidades.getById(id),
    repositories.authors.listByPapel('diretor'),
    repositories.authors.listByPapel('jornalista', id),
  ]);
  if (!cidade) notFound();

  return (
    <div>
      <p className="mb-2">
        <Link
          href="/admin/cidades"
          className="font-mono text-[11px] uppercase tracking-kicker text-gray-500 hover:text-ink"
        >
          ← Licenças
        </Link>
      </p>
      <h1 className="font-display text-2xl font-extrabold text-ink">{cidade.nome}</h1>
      <p className="mb-6 mt-1 font-serif text-[15px] text-gray-500">
        Edite status da mensalidade, permissões de rede e o Diretor titular.
      </p>
      <CidadeForm cidade={cidade} diretores={diretores} />

      <section className="mt-10 max-w-2xl">
        <h2 className="mb-3 font-display text-lg font-extrabold text-ink">
          Jornalistas desta cidade ({jornalistas.length})
        </h2>
        {jornalistas.length === 0 ? (
          <p className="font-serif text-[15px] text-gray-500">
            Nenhum jornalista vinculado. Crie em{' '}
            <Link href="/admin/usuarios" className="underline">
              Usuários
            </Link>{' '}
            com esta cidade.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {jornalistas.map((j) => (
              <li key={j.id} className="px-4 py-3 font-display text-sm font-semibold text-ink">
                {j.nome}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
