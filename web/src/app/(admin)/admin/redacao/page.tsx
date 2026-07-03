import { exigirGrupo } from '@/lib/auth/session';
import { EmBreve } from '@/components/portal/EmBreve';

export default async function RedacaoShell() {
  await exigirGrupo('admin', 'diretor');
  return (
    <EmBreve
      titulo="Diretor de Redação"
      descricao="Pautas da semana, fila de aprovação (aprovar / recusar com justificativa) e modo automático por categoria chegam no Bloco 5 (workflow editorial + Aurora)."
    />
  );
}
