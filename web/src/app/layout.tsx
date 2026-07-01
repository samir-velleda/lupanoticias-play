import type { Metadata } from 'next';
import { Archivo, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

/**
 * 3 famílias tipográficas — não trocar (CLAUDE.md §6, docs/DESIGN_SYSTEM.md §3).
 * Auto-hospedadas via next/font/google. Expostas como CSS vars p/ o tema Tailwind.
 */
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Lupa Notícias',
    template: '%s · Lupa Notícias',
  },
  description:
    'Portal de notícias video-first com a plataforma Lupa Play — vídeos, podcasts, ao vivo e Cortes.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${newsreader.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-surface text-ink font-display">
        {children}
      </body>
    </html>
  );
}
