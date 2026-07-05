import { exigirGrupo } from '@/lib/auth/session';
import { EmBreve } from '@/components/portal/EmBreve';

export default async function RelatoriosShell() {
  await exigirGrupo('admin'); // analytics/relatórios = admin (CLAUDE.md §2), como Publicidade/Config
  return (
    <EmBreve
      titulo="Relatórios"
      descricao="Cliques e visualizações por matéria, categoria, autor e período; vídeos mais assistidos. Chega no Bloco 7 (analytics)."
    />
  );
}
