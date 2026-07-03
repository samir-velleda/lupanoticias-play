import { exigirGrupo } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/PortalShell';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/redacao', label: 'Redação' },
  { href: '/admin/relatorios', label: 'Relatórios' },
  { href: '/admin/publicidade', label: 'Publicidade' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/configuracoes', label: 'Config' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirGrupo('admin', 'diretor');
  return (
    <PortalShell titulo="Lupa · Admin" nav={NAV} usuarioNome={usuario.nome ?? usuario.email}>
      {children}
    </PortalShell>
  );
}
