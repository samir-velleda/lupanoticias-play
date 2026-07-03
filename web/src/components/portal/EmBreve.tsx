/** Placeholder de seção de portal ainda não implementada (shell). */
export function EmBreve({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">{titulo}</h1>
      <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line bg-surface px-6 py-10">
        <span className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">Em construção</span>
        <p className="max-w-xl font-serif text-[15px] leading-relaxed text-gray-500">{descricao}</p>
      </div>
    </div>
  );
}
