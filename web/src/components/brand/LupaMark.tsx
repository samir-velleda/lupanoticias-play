import type { SVGProps } from 'react';

/**
 * Símbolo da marca: lupa com abertura "C" + triângulo de play.
 * `currentColor` permite herdar a cor do contexto (preto no claro, branco no escuro).
 * Fonte: brand/lupa-mark.svg.
 */
export function LupaMark({
  title = 'Lupa Notícias',
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      {...props}
    >
      <path
        d="M32 11 A15 15 0 1 0 32 33"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path d="M18 14.5 L18 29.5 L31 22 Z" fill="currentColor" />
    </svg>
  );
}
