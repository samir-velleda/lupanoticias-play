/**
 * Tipos de domínio do Lupa Notícias — fonte: docs/DATA_MODEL.md §1/§3/§4.
 * A UI consome só a interface `repositories`; estes tipos são o contrato compartilhado.
 */

export type EditoriaSlug =
  | 'politica'
  | 'economia'
  | 'mundo'
  | 'esportes'
  | 'cultura'
  | 'tecnologia'
  | 'ciencia'
  | 'saude'
  | 'cidades'
  | 'opiniao';

export type Papel = 'admin' | 'diretor' | 'jornalista';

export type StatusMateria =
  | 'rascunho'
  | 'pendente'
  | 'aprovada'
  | 'publicada'
  | 'recusada'
  | 'em_correcao'
  | 'arquivada';

export interface Editoria {
  slug: EditoriaSlug;
  nome: string;
  descricao: string;
}

export interface Author {
  id: string;
  nome: string;
  bio?: string;
  avatarUrl?: string;
  papel: Papel;
}

export type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'pullquote'; text: string; cite?: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'embed'; mediaId: string };

export interface Materia {
  id: string;
  slug: string;
  editoria: EditoriaSlug;
  titulo: string;
  standfirst: string;
  corpo: ArticleBlock[];
  autores: Author[];
  heroImageUrl?: string;
  heroCaption?: string;
  tags: string[];
  status: StatusMateria;
  pautaId?: string;
  publishedAt?: string;
  updatedAt?: string;
  agendadoPara?: string;
  readingMinutes?: number;
  relatedMediaId?: string;
  views?: number;
  cliques?: number;
}

export interface RevisaoMateria {
  id: string;
  materiaId: string;
  revisorId: string;
  decisao: 'aprovada' | 'recusada';
  justificativa?: string; // obrigatória quando 'recusada'
  criadoEm: string;
}

export interface Pauta {
  id: string;
  tema: string;
  descricao: string;
  categoriaSugerida?: EditoriaSlug;
  prioridade: 'baixa' | 'media' | 'alta';
  prazo?: string;
  atribuidos: string[]; // ids de jornalistas
  status: 'aberta' | 'em_producao' | 'concluida' | 'cancelada';
  criadoPor: string;
  criadoEm: string;
}

export interface ModoAutomatico {
  categoria: EditoriaSlug;
  ativo: boolean;
  ativadoPor?: string;
  ativadoEm?: string;
}

export type MediaTipo = 'video' | 'podcast' | 'live' | 'short';
export type Visibilidade = 'publico' | 'assinantes' | 'rascunho';

export interface Media {
  id: string;
  tipo: MediaTipo;
  titulo: string;
  descricao?: string;
  editoria: EditoriaSlug;
  autor?: Author;
  playbackUrl?: string; // HLS via CloudFront (MediaConvert) ou IVS
  coverUrl?: string;
  duracaoSeg?: number;
  publishedAt: string;
  visibilidade: Visibilidade;
  agendadoPara?: string;
  destaque: boolean;
  transcricao?: boolean;
  legendasVTT?: boolean;
  status: 'enviando' | 'processando' | 'pronto' | 'erro';
  views?: number;
  likes?: number;
  liveViewers?: number;
}

export interface Playlist {
  id: string;
  titulo: string;
  itens: Media[];
}

// ---- Publicidade ----
export interface AdCampaign {
  id: string;
  nome: string;
  anunciante: string;
  inicio: string;
  fim: string;
  status: 'rascunho' | 'ativa' | 'pausada' | 'encerrada';
  ativadoPor: string;
}

export type AdSlotId =
  | 'home_topo'
  | 'home_meio'
  | 'home_sidebar'
  | 'artigo_topo'
  | 'artigo_meio'
  | 'artigo_rodape'
  | 'categoria_topo'
  | 'app_home_banner';

export interface AdCreative {
  id: string;
  campanhaId: string;
  slot: AdSlotId;
  tipoMidia: 'imagem' | 'html' | 'video';
  assetUrl: string;
  linkDestino: string;
  peso: number;
  ativo: boolean;
  impressoes?: number;
  cliques?: number;
}

export interface AdMetrics {
  creativeId: string;
  campanhaId: string;
  slot: AdSlotId;
  impressoes: number;
  cliques: number;
  ctr: number; // cliques / impressoes
}

// ---- Analytics ----
export interface EventoAnalytics {
  id: string;
  tipo:
    | 'view'
    | 'click'
    | 'ad_impression'
    | 'ad_click'
    | 'video_play'
    | 'video_complete';
  entidade: 'materia' | 'video' | 'ad' | 'categoria';
  entidadeId: string;
  categoria?: EditoriaSlug;
  autorId?: string;
  path: string;
  referrer?: string;
  sessaoHash: string;
  dispositivo: 'web' | 'ios' | 'android';
  criadoEm: string;
}

export interface RelatorioLinha {
  entidadeId: string;
  rotulo: string;
  categoria?: EditoriaSlug;
  views: number;
  cliques: number;
}

export interface RelatorioResultado {
  de: string;
  ate: string;
  totalViews: number;
  totalCliques: number;
  linhas: RelatorioLinha[];
}

// ---- Paginação / opções (contrato repositories, §3) ----
export interface PageOpts {
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RelatorioOpts {
  de: string;
  ate: string;
  entidade?: string;
  categoria?: EditoriaSlug;
}

// ---- Contratos de criação (formulários, §4) ----
export interface CriarMateriaInput {
  titulo: string; // 1–140
  standfirst: string;
  editoria: EditoriaSlug;
  corpo: ArticleBlock[];
  tags: string[];
  heroImageUrl?: string;
  heroCaption?: string;
  pautaId?: string;
  agendadoPara?: string;
  /** Autor real (Cognito → author.id). Obrigatório ao criar no Aurora. */
  autorId?: string;
}

export interface EnsureAuthorInput {
  sub: string;
  nome?: string;
  email?: string;
  papel: Papel;
}

export interface CreateMediaInput {
  tipo: 'video' | 'podcast';
  titulo: string;
  descricao?: string;
  editoria: EditoriaSlug;
  tags: string[];
  coverUrl?: string;
  visibilidade: Visibilidade; // default 'rascunho'
  agendadoPara?: string;
  destaque: boolean; // default false
  transcricaoAuto: boolean; // default true
  gerarLegendasVTT: boolean; // default true
  uploadKey: string; // S3 key do arquivo enviado
}
