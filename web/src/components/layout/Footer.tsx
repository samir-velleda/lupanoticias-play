import Link from 'next/link';
import { LupaLockupWhite } from '@/components/brand';
import { Kicker } from '@/components/ui';

const COLUNAS: { titulo: string; itens: { label: string; href: string }[] }[] = [
  {
    titulo: 'Editorias',
    itens: [
      { label: 'Política', href: '/politica' },
      { label: 'Economia', href: '/economia' },
      { label: 'Mundo', href: '/mundo' },
      { label: 'Esportes', href: '/esportes' },
      { label: 'Cultura', href: '/cultura' },
    ],
  },
  {
    titulo: 'Mais',
    itens: [
      { label: 'Tecnologia', href: '/tecnologia' },
      { label: 'Ciência', href: '/ciencia' },
      { label: 'Saúde', href: '/saude' },
      { label: 'Cidades', href: '/cidades' },
      { label: 'Opinião', href: '/opiniao' },
    ],
  },
  {
    titulo: 'Institucional',
    itens: [
      { label: 'Quem somos', href: '#' },
      { label: 'Princípios editoriais', href: '#' },
      { label: 'Expediente', href: '#' },
      { label: 'Trabalhe conosco', href: '#' },
      { label: 'Anuncie', href: '#' },
    ],
  },
  {
    titulo: 'Serviços',
    itens: [
      { label: 'Newsletters', href: '#' },
      { label: 'Assine Premium', href: '#' },
      { label: 'App Lupa', href: '#' },
      { label: 'Central de ajuda', href: '#' },
      { label: 'Fale conosco', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-ink px-6 pb-6 pt-12 text-on-dark sm:px-11">
      <div className="flex flex-wrap items-start justify-between gap-8 border-b border-dark-line pb-8">
        <div className="max-w-sm">
          <LupaLockupWhite className="h-6 w-auto" />
          <p className="mt-4 font-serif text-base leading-relaxed text-[#a9a9b0]">
            Jornalismo com foco no que importa. Apuração independente, contexto e
            clareza — todos os dias.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <Kicker tone="on-dark">Siga a Lupa</Kicker>
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-[#e8e8ea]">
            {['Instagram', 'YouTube', 'X', 'WhatsApp', 'RSS'].map((s) => (
              <Link key={s} href="#" className="hover:text-white">
                {s}
              </Link>
            ))}
          </div>
          <form className="mt-3 flex items-center gap-2.5" aria-label="Assinar newsletter">
            <label htmlFor="footer-email" className="sr-only">
              Seu e-mail
            </label>
            <input
              id="footer-email"
              type="email"
              placeholder="Seu e-mail"
              className="w-52 rounded bg-[#161619] px-3.5 py-2.5 text-sm text-white outline-none ring-dark-line focus:ring-1"
            />
            <button
              type="submit"
              className="rounded bg-white px-4 py-2.5 text-sm font-bold text-ink hover:bg-[#e6e6e9]"
            >
              Assinar
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-7 py-8 md:grid-cols-4">
        {COLUNAS.map((col) => (
          <div key={col.titulo}>
            <Kicker tone="on-dark" className="mb-4 block tracking-[0.18em]">
              {col.titulo}
            </Kicker>
            <div className="flex flex-col gap-2.5 text-[14.5px] text-[#c9c9ce]">
              {col.itens.map((it) => (
                <Link key={it.label} href={it.href} className="hover:text-white">
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dark-line pt-5 font-mono text-[11.5px] text-[#7a7a82]">
        <span>© 2026 Lupa Notícias — CNPJ 00.000.000/0001-00</span>
        <div className="flex flex-wrap gap-5">
          <Link href="#" className="hover:text-white">Termos de Uso</Link>
          <Link href="#" className="hover:text-white">Política de Privacidade</Link>
          <Link href="#" className="hover:text-white">Preferências de cookies</Link>
        </div>
      </div>
    </footer>
  );
}
