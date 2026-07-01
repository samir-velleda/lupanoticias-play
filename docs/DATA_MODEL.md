# DATA_MODEL.md — Lupa Notícias Play

Schema do **Aurora PostgreSQL** + tipos de domínio + contrato `repositories`.
A UI consome só a interface `repositories` — nunca o banco direto.

---

## 1. Tipos de domínio (`web/src/types/`)

```ts
export type EditoriaSlug =
  | 'politica' | 'economia' | 'mundo' | 'esportes' | 'cultura'
  | 'tecnologia' | 'ciencia' | 'saude' | 'cidades' | 'opiniao';

export type Papel = 'admin' | 'diretor' | 'jornalista';

export type StatusMateria =
  | 'rascunho' | 'pendente' | 'aprovada' | 'publicada'
  | 'recusada' | 'em_correcao' | 'arquivada';

export interface Editoria { slug: EditoriaSlug; nome: string; descricao: string; }

export interface Author {
  id: string; nome: string; bio?: string; avatarUrl?: string; papel: Papel;
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
  heroImageUrl?: string; heroCaption?: string;
  tags: string[];
  status: StatusMateria;
  pautaId?: string;
  publishedAt?: string; updatedAt?: string; agendadoPara?: string;
  readingMinutes?: number;
  relatedMediaId?: string;
  views?: number; cliques?: number;
}

export interface RevisaoMateria {
  id: string; materiaId: string; revisorId: string;
  decisao: 'aprovada' | 'recusada';
  justificativa?: string;      // obrigatória quando 'recusada'
  criadoEm: string;
}

export interface Pauta {
  id: string; tema: string; descricao: string;
  categoriaSugerida?: EditoriaSlug;
  prioridade: 'baixa' | 'media' | 'alta';
  prazo?: string;
  atribuidos: string[];        // ids de jornalistas
  status: 'aberta' | 'em_producao' | 'concluida' | 'cancelada';
  criadoPor: string; criadoEm: string;
}

export interface ModoAutomatico {
  categoria: EditoriaSlug; ativo: boolean; ativadoPor?: string; ativadoEm?: string;
}

export type MediaTipo = 'video' | 'podcast' | 'live' | 'short';
export type Visibilidade = 'publico' | 'assinantes' | 'rascunho';

export interface Media {
  id: string; tipo: MediaTipo; titulo: string; descricao?: string;
  editoria: EditoriaSlug; autor?: Author;
  playbackUrl?: string;        // HLS via CloudFront (MediaConvert) ou IVS
  coverUrl?: string; duracaoSeg?: number;
  publishedAt: string; visibilidade: Visibilidade;
  agendadoPara?: string; destaque: boolean;
  transcricao?: boolean; legendasVTT?: boolean;
  status: 'enviando' | 'processando' | 'pronto' | 'erro';
  views?: number; likes?: number; liveViewers?: number;
}

export interface Playlist { id: string; titulo: string; itens: Media[]; }

// Publicidade
export interface AdCampaign {
  id: string; nome: string; anunciante: string;
  inicio: string; fim: string;
  status: 'rascunho' | 'ativa' | 'pausada' | 'encerrada'; ativadoPor: string;
}
export type AdSlotId =
  | 'home_topo' | 'home_meio' | 'home_sidebar'
  | 'artigo_topo' | 'artigo_meio' | 'artigo_rodape'
  | 'categoria_topo' | 'app_home_banner';
export interface AdCreative {
  id: string; campanhaId: string; slot: AdSlotId;
  tipoMidia: 'imagem' | 'html' | 'video';
  assetUrl: string; linkDestino: string; peso: number; ativo: boolean;
  impressoes?: number; cliques?: number;
}

// Analytics
export interface EventoAnalytics {
  id: string;
  tipo: 'view' | 'click' | 'ad_impression' | 'ad_click' | 'video_play' | 'video_complete';
  entidade: 'materia' | 'video' | 'ad' | 'categoria';
  entidadeId: string; categoria?: EditoriaSlug; autorId?: string;
  path: string; referrer?: string; sessaoHash: string;
  dispositivo: 'web' | 'ios' | 'android'; criadoEm: string;
}
```

---

## 2. Schema Aurora (PostgreSQL) — visão de tabelas

> Implementar via **Prisma** (recomendado) ou SQL/Drizzle. Nomes de tabela em `snake_case`.

- `editoria(slug PK, nome, descricao)`
- `author(id PK, nome, bio, avatar_url, papel, cognito_sub UNIQUE)`
- `materia(id PK, slug, editoria FK, titulo, standfirst, corpo JSONB, hero_image_url,
   hero_caption, tags TEXT[], status, pauta_id FK NULL, published_at, updated_at,
   agendado_para, reading_minutes, related_media_id, views INT default 0, cliques INT default 0)`
   - UNIQUE(`editoria`,`slug`); índices em (`status`), (`editoria`,`published_at`).
- `materia_autor(materia_id FK, author_id FK, PK(materia_id,author_id))`
- `revisao_materia(id PK, materia_id FK, revisor_id FK, decisao, justificativa, criado_em)`
- `pauta(id PK, tema, descricao, categoria_sugerida, prioridade, prazo, status,
   criado_por FK, criado_em)`
- `pauta_atribuido(pauta_id FK, author_id FK, PK(pauta_id,author_id))`
- `modo_automatico(categoria PK, ativo BOOL, ativado_por, ativado_em)`
- `media(id PK, tipo, titulo, descricao, editoria FK, autor_id FK, playback_url, cover_url,
   duracao_seg, published_at, visibilidade, agendado_para, destaque BOOL, transcricao BOOL,
   legendas_vtt BOOL, status, views INT, likes INT, live_viewers INT, s3_key, mc_job_id)`
- `playlist(id PK, titulo)` · `playlist_item(playlist_id FK, media_id FK, ordem)`
- `ad_campaign(id PK, nome, anunciante, inicio, fim, status, ativado_por)`
- `ad_creative(id PK, campanha_id FK, slot, tipo_midia, asset_url, link_destino, peso,
   ativo BOOL, impressoes INT default 0, cliques INT default 0)`
- `evento_analytics(id PK, tipo, entidade, entidade_id, categoria, autor_id, path, referrer,
   sessao_hash, dispositivo, criado_em)` — índices em (`entidade`,`entidade_id`),
   (`tipo`,`criado_em`), (`categoria`,`criado_em`). Particionar por mês em `prod` (fase 2).
- `agregado_diario(data, entidade, entidade_id, views, cliques, PK(data,entidade,entidade_id))`
  — preenchido pela Lambda de agregação.

Credenciais só via Secrets Manager `/lupa/{env}/aurora`. Migrations versionadas no repo.

---

## 3. Contrato `repositories` (`web/src/lib/data/repositories.ts`)

```ts
export interface Repositories {
  materias: {
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
    enviarParaRevisao(id: string): Promise<Materia>;      // aplica modo automático se ativo
    aprovar(id: string, revisorId: string, agendadoPara?: string): Promise<Materia>;
    recusar(id: string, revisorId: string, justificativa: string): Promise<Materia>;
    listRevisoes(materiaId: string): Promise<RevisaoMateria[]>;
  };
  pautas: {
    listAbertas(autorId?: string): Promise<Pauta[]>;
    criar(input: Omit<Pauta,'id'|'criadoEm'|'status'>): Promise<Pauta>;
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
    criarUpload(input: CreateMediaInput): Promise<Media>;   // liga ao upload S3
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
    ingest(evt: Omit<EventoAnalytics,'id'|'criadoEm'>): Promise<void>;
    relatorio(opts: RelatorioOpts): Promise<RelatorioResultado>;
  };
  editorias: { list(): Promise<Editoria[]>; get(slug: EditoriaSlug): Promise<Editoria | null>; };
  authors:   { getById(id: string): Promise<Author | null>; };
}

export interface PageOpts { page?: number; pageSize?: number; }
export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; }
export interface RelatorioOpts { de: string; ate: string; entidade?: string; categoria?: EditoriaSlug; }
```

> **Estratégia de implementação:** começar com `mock/` (dados pt-BR extraídos do design) para
> destravar a UI (prompts 02–05); trocar por implementação **Aurora** (Prisma) nos prompts de
> backend (06–07), **sem alterar a UI**.

---

## 4. Contrato de criação (formulários)

```ts
interface CriarMateriaInput {
  titulo: string;                 // 1–140
  standfirst: string;
  editoria: EditoriaSlug;
  corpo: ArticleBlock[];
  tags: string[];
  heroImageUrl?: string; heroCaption?: string;
  pautaId?: string;
  agendadoPara?: string;
}
interface CreateMediaInput {
  tipo: 'video' | 'podcast';
  titulo: string; descricao?: string;
  editoria: EditoriaSlug; tags: string[];
  coverUrl?: string;
  visibilidade: Visibilidade;     // default 'rascunho'
  agendadoPara?: string;
  destaque: boolean;              // default false
  transcricaoAuto: boolean;       // default true
  gerarLegendasVTT: boolean;      // default true
  uploadKey: string;              // S3 key do arquivo enviado
}
```

Validação com **Zod**. Arquivos MP4/MOV/MP3/WAV, ≤ 4 GB. `recusar` exige `justificativa` não vazia.

## 5. Formatação pt-BR (`web/src/lib/format.ts`)

- Datas: `1 de julho de 2026 · 08h20` (Intl `pt-BR`).
- Relativo: `há 12 min`, `há 1 h`, `há 3 h`.
- Duração: `mm:ss` (`4:12`) e `hh:mm:ss` quando ≥ 1h.
- Números grandes: `12,4 mil`, `1,2 mi`. Views: `24 mil visualizações`.
