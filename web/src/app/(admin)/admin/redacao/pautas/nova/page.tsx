import Link from 'next/link';
import { exigirGrupo } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { listarJornalistasAtribuiveis } from '@/lib/data/jornalistas';
import { contextoEditorial } from '@/lib/tenant';
import { PautaForm } from '@/components/portal/PautaForm';

export const dynamic = 'force-dynamic';

export default async function NovaPauta() {
  const usuario = await exigirGrupo('admin', 'diretor');
  const ctx = await contextoEditorial(usuario);
  const cidadeId = ctx.cidadeId ?? undefined;
  const [jornalistas, editorias] = await Promise.all([
    listarJornalistasAtribuiveis(cidadeId),
    repositories.editorias.list(),
  ]);
  const cidadeLabel = ctx.cidade ? `${ctx.cidade.nome} (${ctx.cidade.uf})` : 'Matriz / Master';
  return (
    <div>
      <p className="mb-2">
        <Link
          href="/admin/redacao/pautas"
          className="font-mono text-[11px] uppercase tracking-kicker text-gray-500 hover:text-ink"
        >
          ← Pautas da redação
        </Link>
      </p>
      <h1 className="font-display text-2xl font-extrabold text-ink">Sugerir pauta</h1>
      <p className="mb-6 mt-1 font-serif text-[15px] text-gray-500">
        Cidade: <strong className="font-semibold text-ink">{cidadeLabel}</strong>. Encaminhe para
        jornalistas da licença ou deixe geral. Aparece em{' '}
        <strong className="font-semibold text-ink">Portal do Jornalista → Pautas</strong>.
      </p>
      <PautaForm jornalistas={jornalistas} editorias={editorias} />
    </div>
  );
}
