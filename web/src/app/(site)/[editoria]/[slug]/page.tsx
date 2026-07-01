import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { EditoriaSlug, Media } from '@/types';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome, isEditoriaSlug, EDITORIA_SLUGS } from '@/lib/editorias';
import { formatData, formatRelativo } from '@/lib/format';
import { Avatar, Tag, Kicker } from '@/components/ui';
import { Cover } from '@/components/media/Cover';
import { ArticleBody } from '@/components/article/ArticleBody';

interface Props {
  params: Promise<{ editoria: string; slug: string }>;
}

// Enumera as matérias publicadas (editoria+slug). Slug fora da lista → 404 real.
// (Na fase Aurora, prompt 06, vira dynamicParams=true + revalidação/ISR.)
export const dynamicParams = false;
export async function generateStaticParams() {
  const listas = await Promise.all(
    EDITORIA_SLUGS.map((editoria) =>
      repositories.materias.listByEditoria(editoria, { pageSize: 100 }),
    ),
  );
  return listas.flatMap((paged, i) =>
    paged.items.map((m) => ({ editoria: EDITORIA_SLUGS[i], slug: m.slug })),
  );
}

async function carregar(editoria: string, slug: string) {
  if (!isEditoriaSlug(editoria)) return null;
  return repositories.materias.getBySlug(editoria as EditoriaSlug, slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { editoria, slug } = await params;
  const materia = await carregar(editoria, slug);
  if (!materia) return { title: 'Matéria não encontrada' };
  return {
    title: materia.titulo,
    description: materia.standfirst,
    openGraph: {
      title: materia.titulo,
      description: materia.standfirst,
      type: 'article',
      publishedTime: materia.publishedAt,
      authors: materia.autores.map((a) => a.nome),
    },
  };
}

export default async function MateriaPage({ params }: Props) {
  const { editoria, slug } = await params;
  const materia = await carregar(editoria, slug);
  if (!materia) notFound();

  const nome = editoriaNome(materia.editoria);
  const autor = materia.autores[0];

  // resolve embeds e "leia também"
  const embedIds = materia.corpo
    .filter((b): b is Extract<typeof b, { type: 'embed' }> => b.type === 'embed')
    .map((b) => b.mediaId);
  const [embedList, relacionadas] = await Promise.all([
    Promise.all(embedIds.map((id) => repositories.media.getById(id))),
    repositories.materias.listRelated(materia.id, 3),
  ]);
  const embeds: Record<string, Media> = {};
  embedList.forEach((m) => {
    if (m) embeds[m.id] = m;
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: materia.titulo,
    description: materia.standfirst,
    datePublished: materia.publishedAt,
    dateModified: materia.updatedAt ?? materia.publishedAt,
    articleSection: nome,
    author: materia.autores.map((a) => ({ '@type': 'Person', name: a.nome })),
    publisher: { '@type': 'Organization', name: 'Lupa Notícias' },
    keywords: materia.tags.join(', '),
  };

  return (
    <main className="py-9">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Cabeçalho */}
      <div className="mx-auto max-w-[1080px] px-6 sm:px-10">
        <nav aria-label="Trilha" className="mb-5 font-mono text-xs text-gray-400">
          <Link href="/" className="hover:text-ink">Início</Link>
          <span className="mx-1.5 text-line">/</span>
          <Link href={`/${materia.editoria}`} className="hover:text-ink">{nome}</Link>
        </nav>

        <div className="max-w-[720px]">
          <Kicker>{nome}</Kicker>
          <h1 className="mt-3 text-balance font-display text-[34px] font-extrabold leading-[1.06] tracking-wordmark text-ink sm:text-[46px]">
            {materia.titulo}
          </h1>
          <p className="mt-4 font-serif text-[22px] leading-[1.45] text-gray-500">
            {materia.standfirst}
          </p>

          {/* Assinatura */}
          <div className="my-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-[18px]">
            <div className="flex items-center gap-3">
              <Avatar nome={autor?.nome ?? 'Lupa'} size={46} />
              <div>
                <div className="font-display text-[14.5px] font-bold text-ink">
                  por {autor?.nome ?? 'Redação Lupa'}
                </div>
                <div className="font-mono text-[11.5px] text-gray-400">
                  {materia.publishedAt ? formatData(materia.publishedAt) : ''}
                  {materia.updatedAt
                    ? ` · Atualizado ${formatRelativo(materia.updatedAt)}`
                    : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3.5 text-ink">
              <span className="font-mono text-[11px] text-gray-400">Compartilhar</span>
              {['f', 'X'].map((s) => (
                <span
                  key={s}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-pill border border-line text-[13px] font-bold"
                  aria-hidden
                >
                  {s}
                </span>
              ))}
              <span
                className="flex h-[34px] w-[34px] items-center justify-center rounded-pill border border-line"
                aria-hidden
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4v16l6-4 6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Imagem principal (mais larga que a coluna de texto) */}
      <div className="mx-auto max-w-[1000px] px-6 sm:px-10">
        <Cover
          label={materia.heroCaption ?? materia.titulo}
          rounded="rounded-md"
          className="h-[300px] w-full sm:h-[520px]"
        />
        {materia.heroCaption ? (
          <p className="mt-2.5 font-mono text-[11.5px] text-gray-300">{materia.heroCaption}</p>
        ) : null}
      </div>

      {/* Corpo */}
      <div className="mx-auto max-w-[720px] px-6 pb-11 pt-9 sm:px-10">
        <ArticleBody blocks={materia.corpo} embeds={embeds} />

        {materia.tags.length > 0 ? (
          <div className="my-8 flex flex-wrap gap-2.5">
            {materia.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        ) : null}

        {/* Caixa do autor */}
        {autor ? (
          <div className="flex items-start gap-4 rounded-lg bg-surface-2 p-[22px]">
            <Avatar nome={autor.nome} size={60} />
            <div>
              <div className="font-display text-base font-extrabold text-ink">{autor.nome}</div>
              {autor.bio ? (
                <p className="mt-1.5 font-serif text-[15.5px] leading-relaxed text-gray-500">
                  {autor.bio}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Leia também */}
      {relacionadas.length > 0 ? (
        <div className="mx-auto max-w-[1080px] px-6 pb-12 sm:px-10">
          <h2 className="mb-5 border-t border-ink pt-5 font-display text-xl font-extrabold text-ink">
            Leia também
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {relacionadas.map((m) => (
              <article key={m.id}>
                <Link href={`/${m.editoria}/${m.slug}`}>
                  <Cover label={m.titulo} rounded="rounded-sm" className="h-[150px] w-full" />
                </Link>
                <Kicker className="mt-3 block">{editoriaNome(m.editoria)}</Kicker>
                <h3 className="mt-1.5 font-display text-[17px] font-bold leading-tight text-ink">
                  <Link href={`/${m.editoria}/${m.slug}`} className="hover:underline">
                    {m.titulo}
                  </Link>
                </h3>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
