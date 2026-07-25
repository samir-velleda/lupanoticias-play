import { exigirGrupo } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';
import { EDITORIA_SLUGS } from '@/lib/editorias';
import { ModoAutomaticoPanel } from '@/components/portal/ModoAutomaticoPanel';

export default async function ConfiguracoesPage() {
  await exigirGrupo('admin', 'diretor');
  const modos = await repositories.config.getModoAutomatico();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Configurações</h1>
        <p className="mt-1 font-serif text-[15px] text-gray-500">
          Modo automático por editoria. Marca e SEO avançam em iterações seguintes.
        </p>
      </div>
      <ModoAutomaticoPanel modos={modos} editorias={EDITORIA_SLUGS} />
    </div>
  );
}
