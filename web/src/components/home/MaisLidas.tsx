import Link from 'next/link';
import type { Materia } from '@/types';

/** Lista numerada 1–5 (Mais lidas). DESIGN_SPEC §2. */
export function MaisLidas({ materias }: { materias: Materia[] }) {
  return (
    <section aria-label="Mais lidas">
      <h2 className="mb-4 font-display text-lg font-extrabold text-ink">Mais lidas</h2>
      <ol className="flex flex-col gap-4">
        {materias.map((m, i) => (
          <li key={m.id} className="flex items-baseline gap-3">
            <span className="font-display text-[22px] font-extrabold text-line" aria-hidden>
              {i + 1}
            </span>
            <Link
              href={`/${m.editoria}/${m.slug}`}
              className="font-display text-[14.5px] font-semibold leading-snug text-ink hover:underline"
            >
              {m.titulo}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
