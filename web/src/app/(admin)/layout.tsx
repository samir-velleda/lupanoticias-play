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

// Destinos que exigem 'admin' no servidor (páginas com exigirGrupo('admin')).
// O Diretor de Redação (grupo 'diretor', não herda admin) NÃO deve vê-los no nav,
// senão clica e cai em /sem-acesso. Ver docs/EDITORIAL_WORKFLOW / CLAUDE.md §2.
const SO_ADMIN = new Set([
  '/admin/relatorios',
  '/admin/publicidade',
  '/admin/usuarios',
  '/admin/configuracoes',
]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirGrupo('admin', 'diretor');
  const ehAdmin = usuario.grupos.includes('admin');
  const nav = ehAdmin ? NAV : NAV.filter((n) => !SO_ADMIN.has(n.href));
  return (
    <PortalShell titulo="Lupa · Admin" nav={nav} usuarioNome={usuario.nome ?? usuario.email}>
      {children}
    </PortalShell>
  );
}
