/**
 * Contrato `repositories` — a ÚNICA porta de dados que a UI conhece (CLAUDE.md §3/§5).
 * Implementação: mock (local) ou Aurora quando `LUPA_USE_AURORA=true`.
 */
import type {
  Author,
  Editoria,
  EditoriaSlug,
  Materia,
  Media,
  MediaTipo,
  ModoAutomatico,
  Pauta,
  Playlist,
  RevisaoMateria,
  StatusMateria,
  PageOpts,
  Paged,
  CriarMateriaInput,
  CreateMediaInput,
  EnsureAuthorInput,
  AdCreative,
  AdCampaign,
  AdMetrics,
  AdSlotId,
  EventoAnalytics,
  RelatorioOpts,
  RelatorioResultado,
} from '@/types';
import { createMockRepositories } from './mock';
import { createAuroraRepositories } from './aurora';
import { useAurora } from './aurora/client';

export interface Repositories {
  materias: {
    getById(id: string): Promise<Materia | null>;
    getBySlug(editoria: EditoriaSlug, slug: string): Promise<Materia | null>;
    listByEditoria(editoria: EditoriaSlug, opts?: PageOpts): Promise<Paged<Materia>>;
    listMaisLidas(limit?: number): Promise<Materia[]>;
    listOpiniao(limit?: number): Promise<Materia[]>;
    listRelated(materiaId: string, limit?: number): Promise<Materia[]>;
    // workflow
    listMinhas(autorId: string, status?: StatusMateria): Promise<Materia[]>;
    listPendentes(opts?: PageOpts): Promise<Paged<Materia>>;
    criar(input: CriarMateriaInput): Promise<Materia>;
    atualizar(id: string, input: Partial<CriarMateriaInput>): Promise<Materia>;
    enviarParaRevisao(id: string): Promise<Materia>;
    aprovar(id: string, revisorId: string, agendadoPara?: string): Promise<Materia>;
    recusar(id: string, revisorId: string, justificativa: string): Promise<Materia>;
    listRevisoes(materiaId: string): Promise<RevisaoMateria[]>;
  };
  pautas: {
    listAbertas(autorId?: string): Promise<Pauta[]>;
    criar(input: Omit<Pauta, 'id' | 'criadoEm' | 'status'>): Promise<Pauta>;
    atualizar(id: string, input: Partial<Pauta>): Promise<Pauta>;
  };
  config: {
    getModoAutomatico(): Promise<ModoAutomatico[]>;
    setModoAutomatico(categoria: EditoriaSlug, ativo: boolean, porId: string): Promise<void>;
  };
  media: {
    getById(id: string): Promise<Media | null>;
    listByTipo(tipo: MediaTipo, opts?: PageOpts): Promise<Paged<Media>>;
    listByEditoria(editoria: EditoriaSlug, opts?: PageOpts): Promise<Paged<Media>>;
    getLiveDestaque(): Promise<Media | null>;
    listPlayShelf(): Promise<Playlist[]>;
    listCortes(opts?: PageOpts): Promise<Paged<Media>>;
    getNext(id: string, limit?: number): Promise<Media[]>;
    criarUpload(input: CreateMediaInput): Promise<Media>;
  };
  ads: {
    servir(slot: AdSlotId): Promise<AdCreative | null>;
    registrarImpressao(creativeId: string): Promise<void>;
    registrarClique(creativeId: string): Promise<void>;
    listCampanhas(): Promise<AdCampaign[]>;
    upsertCampanha(c: AdCampaign): Promise<AdCampaign>;
    upsertCriativo(c: AdCreative): Promise<AdCreative>;
    metricas(opts: RelatorioOpts): Promise<AdMetrics[]>;
  };
  analytics: {
    ingest(evt: Omit<EventoAnalytics, 'id' | 'criadoEm'>): Promise<void>;
    relatorio(opts: RelatorioOpts): Promise<RelatorioResultado>;
  };
  editorias: {
    list(): Promise<Editoria[]>;
    get(slug: EditoriaSlug): Promise<Editoria | null>;
  };
  authors: {
    getById(id: string): Promise<Author | null>;
    ensureFromCognito(input: EnsureAuthorInput): Promise<Author>;
  };
}

function createRepositories(): Repositories {
  if (useAurora()) {
    return createAuroraRepositories();
  }
  return createMockRepositories();
}

/**
 * Singleton de dados usado por toda a UI.
 * Em AWS: LUPA_USE_AURORA=true → Aurora. Local: mock.
 */
export const repositories: Repositories = createRepositories();
