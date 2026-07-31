import Link from 'next/link';
import { exigirGrupo } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { CidadeForm } from '@/components/portal/CidadeForm';

export const dynamic = 'force-dynamic';

export default async function NovaCidadePage() {
  await exigirGrupo('admin');
  const diretores = await repositories.authors.listByPapel('diretor');
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
      <h1 className="font-display text-2xl font-extrabold text-ink">Nova licença por cidade</h1>
      <p className="mb-6 mt-1 font-serif text-[15px] text-gray-500">
        Cria um tenant. O Diretor opera a redação local; Jornalistas ficam vinculados a esta cidade.
      </p>
      <CidadeForm diretores={diretores} />
    </div>
  );
}
