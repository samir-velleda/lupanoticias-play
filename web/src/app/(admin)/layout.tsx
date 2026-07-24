import { exigirGrupo } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/PortalShell';

const NAV_ADMIN = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/redacao', label: 'Redação' },
  { href: '/admin/relatorios', label: 'Relatórios' },
  { href: '/admin/publicidade', label: 'Publicidade' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/configuracoes', label: 'Config' },
];

/** Diretor de Redação: foco no workflow editorial (sem usuários/publicidade/config). */
const NAV_DIRETOR = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/redacao', label: 'Fila de aprovação' },
  { href: '/admin/relatorios', label: 'Relatórios' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirGrupo('admin', 'diretor');
  const isAdmin = usuario.grupos.includes('admin');
  const nav = isAdmin ? NAV_ADMIN : NAV_DIRETOR;
  const titulo = isAdmin ? 'Lupa · Admin' : 'Lupa · Diretor de Redação';

  return (
    <PortalShell titulo={titulo} nav={nav} usuarioNome={usuario.nome ?? usuario.email}>
      {children}
    </PortalShell>
  );
}
