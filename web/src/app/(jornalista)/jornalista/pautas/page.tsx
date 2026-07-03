import Link from 'next/link';
import { repositories } from '@/lib/data/repositories';
import { editoriaNome } from '@/lib/editorias';
import { formatData } from '@/lib/format';
import { EmptyState } from '@/components/ui';

const PRIORIDADE: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

export default async function PautasJornalista() {
  const pautas = await repositories.pautas.listAbertas();
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold text-ink">Pautas da semana</h1>
      <p className="mb-6 font-serif text-[15px] text-gray-500">Temas sugeridos pela Direção de Redação. Escolha um e escreva.</p>

      {pautas.length === 0 ? (
        <EmptyState titulo="Sem pautas abertas" descricao="Aguarde novas pautas do Diretor de Redação." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pautas.map((p) => (
            <article key={p.id} className="flex flex-col rounded-lg border border-line bg-surface p-5">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-kicker text-gray-400">
                {p.categoriaSugerida ? <span>{editoriaNome(p.categoriaSugerida)}</span> : null}
                <span>· Prioridade {PRIORIDADE[p.prioridade]}</span>
              </div>
              <h2 className="font-display text-lg font-bold text-ink">{p.tema}</h2>
              <p className="mt-1.5 flex-1 font-serif text-[15px] leading-relaxed text-gray-500">{p.descricao}</p>
              {p.prazo ? <p className="mt-3 font-mono text-[11px] text-gray-400">Prazo: {formatData(p.prazo)}</p> : null}
              <Link href={`/jornalista/materia/nova?pauta=${p.id}`} className="mt-4 self-start rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white">
                Escrever matéria
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
