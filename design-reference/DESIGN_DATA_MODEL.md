# DATA_MODEL.md — Lupa Notícias

Tipos de domínio e contrato da camada `repositories`. A UI consome só isto — nunca o backend direto.

---

## 1. Tipos (TypeScript) — `src/types/`

```ts
export type EditoriaSlug =
  | 'politica' | 'economia' | 'mundo' | 'esportes' | 'cultura'
  | 'tecnologia' | 'ciencia' | 'saude' | 'cidades' | 'opiniao';

export interface Editoria {
  slug: EditoriaSlug;
  nome: string;          // "Política"
  descricao: string;     // usada no masthead da categoria
}

export interface Author {
  id: string;
  nome: string;          // "Marina Alvarenga"
  bio?: string;
  avatarUrl?: string;    // placeholder no design
}

export interface Article {
  id: string;
  slug: string;                 // único dentro da editoria
  editoria: EditoriaSlug;
  titulo: string;               // H1
  standfirst: string;           // olho (Newsreader)
  corpo: ArticleBlock[];        // blocos estruturados (ver abaixo)
  autores: Author[];
  heroImageUrl?: string;
  heroCaption?: string;
  tags: string[];
  publishedAt: string;          // ISO
  updatedAt?: string;           // ISO
  readingMinutes?: number;
  relatedMediaId?: string;      // vídeo/live vinculado ("Transmissão Lupa Play")
}

// Corpo do artigo como blocos (facilita render fiel do README: h2, pull-quote, imagem inline)
export type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }              // <h2> Archivo 800 26px
  | { type: 'pullquote'; text: string; cite?: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'embed'; mediaId: string };            // player embutido no corpo

export type MediaTipo = 'video' | 'podcast' | 'live' | 'short';
export type Visibilidade = 'publico' | 'assinantes' | 'rascunho';

export interface Media {
  id: string;
  tipo: MediaTipo;
  titulo: string;
  descricao?: string;
  editoria: EditoriaSlug;
  autor?: Author;               // "canal" (Lupa · Política)
  playbackId?: string;          // Mux — ausente enquanto processa
  coverUrl?: string;            // capa 16:9 (thumbnail do Mux se ausente)
  duracaoSeg?: number;          // preenchido pelo webhook do Mux
  publishedAt: string;
  visibilidade: Visibilidade;
  agendadoPara?: string;        // ISO, se agendado
  destaque: boolean;            // "Destacar no Lupa Play"
  transcricao?: boolean;        // job disparado
  legendasVTT?: boolean;        // job disparado
  // métricas
  views?: number;
  likes?: number;
  liveViewers?: number;         // só tipo 'live' — "12,4 mil assistindo agora"
}

export interface Playlist {          // "A seguir no Lupa Play", trilhos da home
  id: string;
  titulo: string;
  itens: Media[];
}
```

## 2. Contrato — `src/lib/data/repositories.ts`

```ts
export interface Repositories {
  articles: {
    getBySlug(editoria: EditoriaSlug, slug: string): Promise<Article | null>;
    listByEditoria(editoria: EditoriaSlug, opts?: PageOpts): Promise<Paged<Article>>;
    listMaisLidas(limit?: number): Promise<Article[]>;      // "Mais lidas" 1–5
    listOpiniao(limit?: number): Promise<Article[]>;         // colunistas
    listRelated(articleId: string, limit?: number): Promise<Article[]>; // "Leia também"
  };
  media: {
    getById(id: string): Promise<Media | null>;
    listByTipo(tipo: MediaTipo, opts?: PageOpts): Promise<Paged<Media>>;
    listByEditoria(editoria: EditoriaSlug, opts?: PageOpts): Promise<Paged<Media>>;
    getLiveDestaque(): Promise<Media | null>;               // hero video-first da home
    listPlayShelf(): Promise<Playlist[]>;                    // faixa Lupa Play + "A seguir"
    listCortes(opts?: PageOpts): Promise<Paged<Media>>;      // feed vertical
    getNext(id: string, limit?: number): Promise<Media[]>;   // "A seguir" no player
  };
  editorias: { list(): Promise<Editoria[]>; get(slug: EditoriaSlug): Promise<Editoria | null>; };
  authors:   { getById(id: string): Promise<Author | null>; };
}

export interface PageOpts { page?: number; pageSize?: number; }
export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; }
```

Implementação inicial em `src/lib/data/mock/` (dados pt-BR plausíveis, extraídos do design).
Trocar por `src/lib/data/cms/` quando o CMS estiver pronto — **mesma interface**.

## 3. API interna (rotas Next) — Estúdio & ao vivo

```
POST /api/mux/upload
  → { uploadUrl, uploadId }         // cria direct upload no Mux (server)
POST /api/mux/webhook
  ← eventos Mux (video.asset.ready | .errored | upload.asset_created)
  → grava playbackId, duracaoSeg em Media; dispara transcrição/legendas se marcado
POST /api/media                     // cria/atualiza Media (título, editoria, tags, visibilidade…)
GET  /api/live/:id/viewers          → { viewers: number }   // polling ~15s
```

Contrato de criação de mídia (form do Estúdio):
```ts
interface CreateMediaInput {
  tipo: 'video' | 'podcast';
  titulo: string;                    // obrigatório
  descricao?: string;
  editoria: EditoriaSlug;            // obrigatório
  tags: string[];
  coverUrl?: string;
  visibilidade: Visibilidade;        // default 'rascunho'
  agendadoPara?: string;
  destaque: boolean;                 // default false
  transcricaoAuto: boolean;          // default true
  gerarLegendasVTT: boolean;         // default true
  muxUploadId: string;               // liga o asset processado a este registro
}
```

Validação (Zod recomendado): `titulo` 1–140 chars; `editoria` ∈ EditoriaSlug; arquivo
**MP4 · MOV · MP3 · WAV**, **≤ 4 GB**; `agendadoPara` no futuro se `visibilidade='rascunho'` + agendado.

## 4. Formatação pt-BR — `src/lib/format.ts`

- Datas: `1 de julho de 2026 · 08h20` (Intl `pt-BR`).
- Relativo: `há 12 min`, `há 1 h`, `há 3 h`.
- Duração: `mm:ss` (`4:12`) e `hh:mm:ss` quando ≥ 1h.
- Números grandes: `12,4 mil`, `1,2 mi` (vírgula decimal).
- Views: `24 mil visualizações`.
