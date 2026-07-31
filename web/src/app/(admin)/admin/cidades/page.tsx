import Link from 'next/link';
import { exigirGrupo } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { rotuloStatusLicenca } from '@/lib/tenant';
import { EmptyState } from '@/components/ui';
import { formatData } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CidadesMasterPage() {
  await exigirGrupo('admin');
  // Garante tenant matriz antes de listar (evita tela vazia em ambiente novo).
  const { ensureCidadeMatriz } = await import('@/lib/tenant');
  await ensureCidadeMatriz();
  const [cidades, diretores] = await Promise.all([
    repositories.cidades.list(),
    repositories.authors.listByPapel('diretor'),
  ]);
  const nomeDir = new Map(diretores.map((d) => [d.id, d.nome]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Licenças por cidade</h1>
          <p className="mt-1 font-serif text-[15px] text-gray-500">
            Admin Master gerencia tenants. Cada cidade é uma licença mensal com Diretor e Jornalistas
            próprios.
          </p>
        </div>
        <Link
          href="/admin/cidades/nova"
          className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white"
        >
          Nova licença
        </Link>
      </div>

      {cidades.length === 0 ? (
        <EmptyState
          titulo="Nenhuma cidade cadastrada"
          descricao="Crie a primeira licença para um município."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-kicker text-gray-400">
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">UF</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rede</th>
                <th className="px-4 py-3">Diretor</th>
                <th className="px-4 py-3">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cidades.map((c) => (
                <tr key={c.id} className="font-display text-sm text-ink">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/admin/cidades/${c.id}`} className="hover:underline">
                      {c.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]">{c.uf}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-gray-600">{c.slug}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-pill border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-700">
                      {rotuloStatusLicenca(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">
                    {c.permiteEstadual ? 'UF' : '—'}
                    {c.permiteNacional ? ' · BR' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.diretorAuthorId ? (nomeDir.get(c.diretorAuthorId) ?? c.diretorAuthorId) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                    {formatData(c.criadoEm)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
