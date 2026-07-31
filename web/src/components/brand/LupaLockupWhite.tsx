import type { CSSProperties, SVGProps } from 'react';

/**
 * Lockup (símbolo + wordmark) para FUNDO ESCURO (Lupa Play, rodapé).
 * viewBox largo o bastante para não cortar o "S" de NOTÍCIAS.
 */
export function LupaLockupWhite({
  title = 'Lupa Notícias',
  style,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  const mergedStyle: CSSProperties = {
    overflow: 'visible',
    ...(typeof style === 'object' && style ? style : {}),
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 64"
      width={400}
      height={64}
      fill="none"
      role="img"
      aria-label={title}
      {...props}
      className={className}
      style={mergedStyle}
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
        fontSize="34"
        letterSpacing="-0.5"
        fill="#FFFFFF"
      >
        LUPA
        <tspan fontWeight="500" fill="#B8B8BD" dx="6" letterSpacing="0.4">
          NOTÍCIAS
        </tspan>
      </text>
    </svg>
  );
}
