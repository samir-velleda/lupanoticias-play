import type { SVGProps } from 'react';

/**
 * Lockup (símbolo + wordmark) para FUNDO CLARO.
 * Wordmark Archivo: LUPA 800 (ink) + NOTÍCIAS 500 (gray-700).
 * Fonte: brand/lupa-lockup.svg.
 */
export function LupaLockup({
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
          stroke="#0B0B0C"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        <path d="M18 14.5 L18 29.5 L31 22 Z" fill="#0B0B0C" />
      </g>
      <text
        x="66"
        y="43"
        fontFamily="var(--font-archivo), Archivo, system-ui, sans-serif"
        fontWeight="800"
        fontSize="36"
        letterSpacing="-0.6"
        fill="#0B0B0C"
      >
        LUPA
        <tspan fontWeight="500" fill="#3A3A3D" dx="7" letterSpacing="0.6">
          NOTÍCIAS
        </tspan>
      </text>
    </svg>
  );
}
