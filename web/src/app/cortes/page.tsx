import type { Metadata } from 'next';
import { repositories } from '@/lib/data/repositories';
import { CortesFeed } from '@/components/play/CortesFeed';

export const metadata: Metadata = {
  title: 'Cortes',
  description: 'Cortes verticais da Lupa Play — vídeos curtos, tela cheia.',
};

/** Cortes fica FORA do grupo (site): tela cheia, sem Header/Footer (DESIGN_SPEC §4). */
export default async function CortesPage() {
  const paged = await repositories.media.listCortes({ pageSize: 20 });
  return <CortesFeed cortes={paged.items} />;
}
