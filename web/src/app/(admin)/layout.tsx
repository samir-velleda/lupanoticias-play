import { exigirGrupo } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/PortalShell';

const NAV_ADMIN = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/cidades', label: 'Licenças' },
  { href: '/admin/redacao', label: 'Redação' },
  { href: '/admin/redacao/pautas', label: 'Pautas' },
  { href: '/admin/relatorios', label: 'Relatórios' },
  { href: '/admin/publicidade', label: 'Publicidade' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/configuracoes', label: 'Config' },
];

/** Diretor de Redação (por cidade): sem Master/licenças/usuários globais. */
const NAV_DIRETOR = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/redacao', label: 'Fila de aprovação' },
  { href: '/admin/redacao/pautas', label: 'Pautas' },
  { href: '/admin/configuracoes', label: 'Modo automático' },
  { href: '/admin/relatorios', label: 'Relatórios' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirGrupo('admin', 'diretor');
  const isAdmin = usuario.grupos.includes('admin');
  const nav = isAdmin ? NAV_ADMIN : NAV_DIRETOR;
  const titulo = isAdmin ? 'Lupa · Master' : 'Lupa · Diretor (cidade)';

  return (
    <PortalShell titulo={titulo} nav={nav} usuarioNome={usuario.nome ?? usuario.email}>
      {children}
    </PortalShell>
  );
}
