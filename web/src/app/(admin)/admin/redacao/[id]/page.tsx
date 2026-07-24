import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatRelativo } from '@/lib/format';
import { exigirGrupo } from '@/lib/auth/session';
import { ArticleBody } from '@/components/article/ArticleBody';
import { Cover } from '@/components/media/Cover';
import { StatusBadge } from '@/components/portal/StatusBadge';
import { RedacaoActions } from '@/components/portal/RedacaoActions';
import { Tag, Kicker } from '@/components/ui';

export default async function RedacaoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirGrupo('admin', 'diretor');
  const { id } = await params;
  const materia = await repositories.materias.getById(id);
  if (!materia) notFound();

  const embedIds = materia.corpo
    .filter((b): b is Extract<(typeof materia.corpo)[number], { type: 'embed' }> => b.type === 'embed')
    .map((b) => b.mediaId);
  const embedList = await Promise.all(embedIds.map((mid) => repositories.media.getById(mid)));
  const embeds: Record<string, NonNullable<(typeof embedList)[number]>> = {};
  embedList.forEach((m) => {
    if (m) embeds[m.id] = m;
  });

  const autor = materia.autores[0];
  const podeDecidir = materia.status === 'pendente' || materia.status === 'aprovada';

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 font-mono text-xs text-gray-400">
        <Link href="/admin/redacao" className="hover:text-ink">
          ← Voltar à fila
        </Link>
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={materia.status} />
        <Kicker>{editoriaNome(materia.editoria)}</Kicker>
      </div>

      <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-wordmark text-ink sm:text-[34px]">
        {materia.titulo}
      </h1>
      {materia.standfirst ? (
        <p className="mt-3 font-serif text-[20px] leading-relaxed text-gray-500">
          {materia.standfirst}
        </p>
      ) : null}

      <div className="my-5 flex flex-wrap items-center gap-3 border-y border-line py-3 font-mono text-[11px] text-gray-500">
        <span>por {autor?.nome ?? 'Redação'}</span>
        {materia.updatedAt ? <span>· atualizada {formatRelativo(materia.updatedAt)}</span> : null}
        <span>· {materia.corpo.length} bloco(s) no corpo</span>
      </div>

      {materia.heroImageUrl ? (
        <div className="mb-6">
          <Cover
            label={materia.heroCaption ?? materia.titulo}
            src={materia.heroImageUrl}
            rounded="rounded-md"
            className="h-[220px] w-full sm:h-[320px]"
          />
          {materia.heroCaption ? (
            <p className="mt-2 font-mono text-[11px] text-gray-400">{materia.heroCaption}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-8">
        <h2 className="mb-4 border-b border-line pb-2 font-mono text-[11px] uppercase tracking-kicker text-gray-400">
          Corpo completo da matéria
        </h2>
        {materia.corpo.length === 0 ? (
          <p className="rounded border border-dashed border-line bg-surface-2 px-4 py-6 font-serif text-[15px] text-gray-500">
            Esta matéria não tem corpo — só o título. Recuse pedindo o texto completo.
          </p>
        ) : (
          <ArticleBody blocks={materia.corpo} embeds={embeds} />
        )}
      </div>

      {materia.tags.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {materia.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      ) : null}

      {podeDecidir ? (
        <RedacaoActions materiaId={materia.id} />
      ) : (
        <p className="rounded border border-line bg-surface-2 px-4 py-3 font-mono text-xs text-gray-600">
          Status atual: <strong>{materia.status}</strong> — decisões só para pendentes.
        </p>
      )}
    </div>
  );
}
