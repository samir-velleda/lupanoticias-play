import { exigirGrupo } from '@/lib/auth/session';
import { PortalShell } from '@/components/portal/PortalShell';

const NAV = [
  { href: '/estudio/publicar', label: 'Publicar' },
  { href: '/estudio/midia', label: 'Mídia' },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirGrupo('jornalista', 'diretor');
  return (
    <PortalShell titulo="Lupa Estúdio" nav={NAV} usuarioNome={usuario.nome ?? usuario.email}>
      {children}
    </PortalShell>
  );
}
