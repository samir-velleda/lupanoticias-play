import { exigirGrupo } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/PortalShell';

const NAV = [
  { href: '/jornalista', label: 'Minhas matérias' },
  { href: '/jornalista/pautas', label: 'Pautas' },
  { href: '/jornalista/materia/nova', label: 'Nova matéria' },
  { href: '/jornalista/correcoes', label: 'Correções' },
];

export default async function JornalistaLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirGrupo('jornalista', 'diretor');
  return (
    <PortalShell titulo="Lupa · Jornalista" nav={NAV} usuarioNome={usuario.nome ?? usuario.email}>
      {children}
    </PortalShell>
  );
}
