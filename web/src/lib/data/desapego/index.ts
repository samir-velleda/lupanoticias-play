/**
 * Porta Desapegoo: Aurora em produção (LUPA_USE_AURORA=true), mock em dev local.
 */
import { useAurora } from '../aurora/client';
import { createMockDesapegoRepo } from './mock';
import { createAuroraDesapegoRepo } from './aurora';
import type { DesapegoRepository } from './types';

export type { ListarAnunciosOpts, DesapegoRepository } from './types';

function createDesapegoRepo(): DesapegoRepository {
  if (useAurora()) {
    return createAuroraDesapegoRepo();
  }
  return createMockDesapegoRepo();
}

export const desapegoRepo: DesapegoRepository = createDesapegoRepo();
