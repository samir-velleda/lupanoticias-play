import type { SVGProps } from 'react';

/**
 * Lockup (símbolo + wordmark) para FUNDO ESCURO (Lupa Play, rodapé).
 * Fonte: brand/lupa-lockup-white.svg.
 */
export function LupaLockupWhite({
  title = 'Lupa Notícias',
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 330 64"
      fill="none"
      role="img"
      aria-label={title}
      {...props}
    >
      <g transform="translate(8,8)">
        <path
          d="M32 11 A15 15 0 1 0 32 33"
          stroke="#FFFFFF"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        <path d="M18 14.5 L18 29.5 L31 22 Z" fill="#FFFFFF" />
      </g>
      <text
        x="66"
        y="43"
        fontFamily="var(--font-archivo), Archivo, system-ui, sans-serif"
        fontWeight="800"
        fontSize="36"
        letterSpacing="-0.6"
        fill="#FFFFFF"
      >
        LUPA
        <tspan fontWeight="500" fill="#B8B8BD" dx="7" letterSpacing="0.6">
          NOTÍCIAS
        </tspan>
      </text>
    </svg>
  );
}
