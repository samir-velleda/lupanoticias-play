import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

/** Layout do site público: Header (4 faixas) + conteúdo + Footer global. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <div id="conteudo" className="flex-1">
        {children}
      </div>
      <Footer />
    </>
  );
}
