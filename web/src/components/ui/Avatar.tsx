/** Avatar circular monocromático. Sem imagem real → iniciais sobre surface-3. */
export function Avatar({
  nome,
  size = 42,
}: {
  nome: string;
  size?: number;
}) {
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-pill bg-surface-3 font-mono font-semibold text-gray-500"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {iniciais}
    </span>
  );
}
