/** Bloco de carregamento (skeleton) monocromático. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded bg-surface-3 ${className}`}
    />
  );
}
