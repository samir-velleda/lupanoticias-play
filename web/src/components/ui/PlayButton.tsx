/**
 * Botão de play sobreposto (círculo translúcido + triângulo branco).
 * Ø78 no hero, Ø42/46 nos cards (DESIGN_SPEC §2).
 */
export function PlayButton({
  size = 78,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const glyph = Math.round(size * 0.33);
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center rounded-pill border border-white/70 bg-ink/50 text-white ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M8 5 L8 19 L19 12 Z" />
      </svg>
    </span>
  );
}
