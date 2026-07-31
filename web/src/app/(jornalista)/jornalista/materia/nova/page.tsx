import { repositories } from '@/lib/data/repositories';
import { MateriaEditor } from '@/components/portal/MateriaEditor';
import { exigirGrupo } from '@/lib/auth/session';
import { contextoEditorial } from '@/lib/tenant';

export default async function NovaMateria({
  searchParams,
}: {
  searchParams: Promise<{ pauta?: string }>;
}) {
  const { pauta } = await searchParams;
  const usuario = await exigirGrupo('jornalista', 'diretor', 'admin');
  const ctx = await contextoEditorial(usuario);
  const autorId = ctx.author.id;
  const [editorias, pautas] = await Promise.all([
    repositories.editorias.list(),
    repositories.pautas.listAbertas(
      ctx.isMaster ? undefined : autorId,
      ctx.cidadeId ?? undefined,
    ),
  ]);
  const cidade = ctx.cidade ?? (ctx.cidadeId ? await repositories.cidades.getById(ctx.cidadeId) : null);

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Nova matéria</h1>
      {cidade ? (
        <p className="mb-6 font-serif text-[15px] text-gray-500">
          Licença: {cidade.nome} ({cidade.uf})
        </p>
      ) : (
        <p className="mb-6 font-serif text-[15px] text-gray-500">Escopo da rede Lupa</p>
      )}
      <MateriaEditor
        materia={null}
        editorias={editorias}
        pautas={pautas}
        pautaInicial={pauta}
        permiteEstadual={cidade?.permiteEstadual ?? true}
        permiteNacional={cidade?.permiteNacional ?? ctx.isMaster}
      />
    </div>
  );
}
