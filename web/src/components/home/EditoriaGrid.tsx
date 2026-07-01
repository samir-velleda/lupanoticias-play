import Link from 'next/link';
import type { EditoriaSlug, Materia } from '@/types';
import { editoriaNome } from '@/lib/editorias';
import { Cover } from '@/components/media/Cover';

export interface EditoriaColuna {
  slug: EditoriaSlug;
  materias: Materia[];
}

/** Grade de editorias (4 col): rótulo + 1 imagem/manchete + 2 links. DESIGN_SPEC §2. */
export function EditoriaGrid({ colunas }: { colunas: EditoriaColuna[] }) {
  return (
    <section aria-label="Editorias em destaque" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {colunas.map(({ slug, materias }) => {
        const [lead, ...resto] = materias;
        return (
          <div key={slug}>
            <Link
              href={`/${slug}`}
              className="mb-3.5 block border-b-2 border-ink pb-2 font-mono text-[11px] font-semibold uppercase tracking-kicker text-ink"
            >
              {editoriaNome(slug)}
            </Link>
            {lead ? (
              <>
                <Link href={`/${slug}/${lead.slug}`}>
                  <Cover label={lead.titulo} rounded="rounded-sm" className="h-[120px] w-full" />
                </Link>
                <h4 className="my-3 font-display text-base font-bold leading-tight text-ink">
                  <Link href={`/${slug}/${lead.slug}`} className="hover:underline">
                    {lead.titulo}
                  </Link>
                </h4>
              </>
            ) : null}
            <div className="flex flex-col gap-2.5 text-[13.5px] font-semibold text-gray-700">
              {resto.slice(0, 2).map((m) => (
                <Link key={m.id} href={`/${slug}/${m.slug}`} className="hover:text-ink">
                  {m.titulo}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
