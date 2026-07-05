import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome, isEditoriaSlug, EDITORIA_SLUGS } from '@/lib/editorias';
import { formatRelativo } from '@/lib/format';
import { Kicker, Pill, EmptyState } from '@/components/ui';
import { Cover } from '@/components/media/Cover';

const PAGE_SIZE = 10;
const SUBABAS = ['Tudo', 'Últimas', 'Em alta', 'Vídeos'];

// As editorias são uma união FIXA. dynamicParams=false + esta lista faz editoria
// inválida (/naoexiste) devolver 404 HTTP REAL (não soft-404). revalidate (ISR) faz
// a listagem pegar matérias novas do Aurora sem rebuild — mantendo o 404 real.
export const dynamicParams = false;
export const revalidate = 30;
export function generateStaticParams() {
  return EDITORIA_SLUGS.map((editoria) => ({ editoria }));
}

interface Props {
  params: Promise<{ editoria: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { editoria } = await params;
  if (!isEditoriaSlug(editoria)) return { title: 'Editoria não encontrada' };
  const ed = await repositories.editorias.get(editoria);
  return {
    title: ed?.nome ?? editoriaNome(editoria),
    description: ed?.descricao,
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { editoria } = await params;
  if (!isEditoriaSlug(editoria)) notFound();

  // dynamicParams=false + generateStaticParams → editoria inválida devolve 404 REAL.
  // A paginação lê ?page= (torna o render dinâmico p/ page>1); o bloco de destaque
  // (lead + secundárias) só aparece na página 1.
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [ed, paged] = await Promise.all([
    repositories.editorias.get(editoria),
    repositories.materias.listByEditoria(editoria, { page, pageSize: PAGE_SIZE }),
  ]);

  const nome = ed?.nome ?? editoriaNome(editoria);
  const totalPages = Math.max(1, Math.ceil(paged.total / PAGE_SIZE));
  const [lead, ...resto] = paged.items;
  const secundarias = resto.slice(0, 3);
  const ultimas = resto.slice(3);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-7">
      {/* Masthead da editoria */}
      <div className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-ink pb-6">
        <div className="max-w-2xl">
          <nav aria-label="Trilha" className="font-mono text-xs text-gray-400">
            <Link href="/" className="hover:text-ink">Início</Link>
            <span className="mx-1.5 text-line">/</span>
            <span>Editorias</span>
          </nav>
          <h1 className="mt-1.5 font-display text-[44px] font-black leading-none tracking-[-0.03em] text-ink sm:text-[56px]">
            {nome}
          </h1>
          {ed?.descricao ? (
            <p className="mt-2.5 font-serif text-lg leading-relaxed text-gray-500">
              {ed.descricao}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded bg-ink px-5 py-3 font-display text-sm font-bold text-white hover:opacity-90"
        >
          ＋ Seguir editoria
        </button>
      </div>

      {/* Sub-abas (visuais) */}
      <div className="my-7 flex flex-wrap gap-2">
        {SUBABAS.map((s, i) => (
          <Pill key={s} active={i === 0}>
            {s}
          </Pill>
        ))}
      </div>

      {paged.items.length === 0 ? (
        <EmptyState
          titulo={`Ainda não há matérias em ${nome}`}
          descricao="Volte em breve — nossa redação está produzindo."
        />
      ) : (
        <>
          {/* Destaque: lead + 3 secundárias */}
          {page === 1 && lead ? (
            <section className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
              <article>
                <Link href={`/${editoria}/${lead.slug}`}>
                  <Cover label={lead.titulo} rounded="rounded" className="h-[360px] w-full" />
                </Link>
                <Kicker className="mt-4 block">
                  {nome}
                  {lead.publishedAt ? ` · ${formatRelativo(lead.publishedAt)}` : ''}
                </Kicker>
                <h2 className="mt-2 text-balance font-display text-[34px] font-extrabold leading-[1.08] tracking-wordmark text-ink">
                  <Link href={`/${editoria}/${lead.slug}`} className="hover:underline">
                    {lead.titulo}
                  </Link>
                </h2>
                <p className="mt-3 font-serif text-lg leading-relaxed text-gray-500">
                  {lead.standfirst}
                </p>
              </article>

              <div className="flex flex-col gap-5">
                {secundarias.map((m) => (
                  <article
                    key={m.id}
                    className="flex gap-3.5 border-b border-line pb-5 last:border-0"
                  >
                    <div className="flex-1">
                      <Kicker>{nome}</Kicker>
                      <h3 className="mt-1.5 font-display text-lg font-bold leading-tight text-ink">
                        <Link href={`/${editoria}/${m.slug}`} className="hover:underline">
                          {m.titulo}
                        </Link>
                      </h3>
                    </div>
                    <Cover label={m.titulo} rounded="rounded-sm" className="h-[72px] w-24 shrink-0" />
                  </article>
                ))}
                {secundarias.length === 0 ? (
                  <p className="font-serif text-[15px] text-gray-400">
                    Sem outras manchetes no momento.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Lista "Últimas em X" */}
          <section>
            <h2 className="mb-1.5 border-t border-ink pt-[18px] font-display text-lg font-extrabold text-ink">
              Últimas em {nome}
            </h2>
            <div className="flex flex-col">
              {(page === 1 ? ultimas : paged.items).map((m) => (
                <article
                  key={m.id}
                  className="flex items-center gap-5 border-b border-line py-5"
                >
                  <Cover label={m.titulo} rounded="rounded" className="h-[120px] w-[200px] shrink-0" />
                  <div>
                    <Kicker>
                      {nome}
                      {m.publishedAt ? ` · ${formatRelativo(m.publishedAt)}` : ''}
                    </Kicker>
                    <h3 className="mb-2 mt-1.5 font-display text-[22px] font-bold leading-tight text-ink">
                      <Link href={`/${editoria}/${m.slug}`} className="hover:underline">
                        {m.titulo}
                      </Link>
                    </h3>
                    <p className="font-serif text-base leading-snug text-gray-500">
                      {m.standfirst}
                    </p>
                  </div>
                </article>
              ))}
              {(page === 1 ? ultimas : paged.items).length === 0 ? (
                <p className="py-5 font-serif text-[15px] text-gray-400">
                  Nada mais por aqui nesta página.
                </p>
              ) : null}
            </div>
          </section>

          {/* Paginação */}
          {totalPages > 1 ? (
            <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`/${editoria}?page=${n}`}
                  aria-current={n === page ? 'page' : undefined}
                  className={`flex h-[38px] w-[38px] items-center justify-center rounded font-display text-sm ${
                    n === page
                      ? 'bg-ink font-bold text-white'
                      : 'border border-line font-semibold text-gray-700 hover:border-ink'
                  }`}
                >
                  {n}
                </Link>
              ))}
              {page < totalPages ? (
                <Link
                  href={`/${editoria}?page=${page + 1}`}
                  aria-label="Próxima página"
                  className="flex h-[38px] w-[38px] items-center justify-center rounded border border-line font-semibold text-gray-700 hover:border-ink"
                >
                  →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
