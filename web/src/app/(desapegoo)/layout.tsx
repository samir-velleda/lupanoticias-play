import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { Suspense } from 'react';
import { LupaBar } from '@/components/desapegoo/LupaBar';
import { DesapegooHeader } from '@/components/desapegoo/DesapegooHeader';
import { DesapegooFooter } from '@/components/desapegoo/DesapegooFooter';
import '@/styles/desapegoo.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Desapegoo',
    template: '%s · Desapegoo',
  },
  description: 'O brechó do Lupa Notícias — compra e venda de usados com história.',
};

export default function DesapegooLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`desapegoo-root flex min-h-screen flex-col ${bricolage.variable}`}>
      <LupaBar />
      <Suspense fallback={<div className="h-[120px] border-b border-[var(--d-line)] bg-white" />}>
        <DesapegooHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <DesapegooFooter />
    </div>
  );
}
