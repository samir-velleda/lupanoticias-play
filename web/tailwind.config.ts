import type { Config } from 'tailwindcss';

/**
 * Tema derivado de `src/styles/tokens.css` (brand/tokens.css).
 * Paleta MONOCROMÁTICA — ênfase por inversão, nunca por cor de destaque.
 * Ver docs/DESIGN_SYSTEM.md §2/§3 e CLAUDE.md §6.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B0B0C',
          soft: '#1C1C20',
        },
        gray: {
          700: '#3A3A3D',
          500: '#52525B',
          400: '#8A8A90',
          300: '#9A9AA0',
        },
        line: {
          DEFAULT: '#E6E6E9',
          soft: '#EDEDF0',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F7F7F8',
          3: '#F1F1F3',
        },
        // superfícies escuras (Lupa Play, rodapé, faixas)
        dark: {
          DEFAULT: '#0B0B0C',
          line: '#26262A',
        },
        'on-dark': {
          DEFAULT: '#F3F3F4',
          muted: '#8A8A90',
        },
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      letterSpacing: {
        kicker: '0.14em',
        wordmark: '-0.02em',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '14px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 40px 90px -30px rgba(10, 10, 15, .45)',
        soft: '0 24px 60px -30px rgba(10, 10, 15, .40)',
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.3', transform: 'scale(0.6)' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
