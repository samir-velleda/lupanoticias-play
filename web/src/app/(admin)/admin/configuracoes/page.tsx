import { exigirGrupo } from '@/lib/auth/session';
import { EmBreve } from '@/components/portal/EmBreve';

export default async function ConfiguracoesShell() {
  await exigirGrupo('admin');
  return (
    <EmBreve
      titulo="Configurações"
      descricao="Categorias, modo automático por categoria, marca e SEO. As partes de modo automático e categorias chegam no Bloco 5."
    />
  );
}
