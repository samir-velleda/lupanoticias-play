import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { Suspense } from 'react';
import { LupaBar } from '@/components/desapegoo/LupaBar';
import { DesapegooHeader } from '@/components/desapegoo/DesapegooHeader';
import { DesapegooFooter } from '@/components/desapegoo/DesapegooFooter';
import { getUsuarioAtual } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
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

export default async function DesapegooLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual();
  let lojinhaSlug: string | null = null;
  if (usuario) {
    try {
      const v = await desapegoRepo.ensureVendedorFromCognito({
        cognitoSub: usuario.sub,
        email: usuario.email,
        nome: usuario.nome,
      });
      lojinhaSlug = v.slug;
    } catch {
      lojinhaSlug = null;
    }
  }

  return (
    <div className={`desapegoo-root flex min-h-screen flex-col ${bricolage.variable}`}>
      <LupaBar />
      <Suspense fallback={<div className="h-[120px] border-b border-[var(--d-line)] bg-white" />}>
        <DesapegooHeader
          logado={Boolean(usuario)}
          usuarioNome={usuario?.nome ?? usuario?.email}
          lojinhaSlug={lojinhaSlug}
        />
      </Suspense>
      <main className="flex-1">{children}</main>
      <DesapegooFooter />
    </div>
  );
}
