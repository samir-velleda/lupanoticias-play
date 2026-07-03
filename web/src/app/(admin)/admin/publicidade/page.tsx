import { exigirGrupo } from '@/lib/auth/session';
import { EmBreve } from '@/components/portal/EmBreve';

export default async function PublicidadeShell() {
  await exigirGrupo('admin');
  return (
    <EmBreve
      titulo="Publicidade"
      descricao="Campanhas, criativos (upload pré-signed), slots, período/peso e métricas (impressões/cliques/CTR). Chega no Bloco 7 (publicidade)."
    />
  );
}
