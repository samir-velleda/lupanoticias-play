import Link from 'next/link';
import type { Materia } from '@/types';
import { Avatar } from '@/components/ui';

/** Colunistas: avatar circular + citação serifada itálica. DESIGN_SPEC §2. */
export function Opiniao({ materias }: { materias: Materia[] }) {
  return (
    <section aria-label="Opinião">
      <h2 className="mb-4 font-display text-lg font-extrabold text-ink">Opinião</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {materias.map((m) => {
          const autor = m.autores[0];
          return (
            <article key={m.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar nome={autor?.nome ?? 'Lupa'} size={42} />
                <span className="font-mono text-[11.5px] text-ink">{autor?.nome}</span>
              </div>
              <Link href={`/${m.editoria}/${m.slug}`}>
                <p className="font-serif text-base italic leading-snug text-ink hover:underline">
                  “{m.titulo}”
                </p>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
