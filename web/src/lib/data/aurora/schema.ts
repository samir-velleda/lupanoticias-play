/**
 * Schema Aurora PostgreSQL (v1) — reflete docs/DATA_MODEL.md §2 (snake_case).
 * Idempotente: CREATE ... IF NOT EXISTS. Aplicado pelo bootstrap (PARADA 4),
 * de DENTRO da VPC (o cluster é isolado). Migrations versionadas: este é 001_init.
 * Nada de DROP — só cria. Timestamps em timestamptz (convertidos p/ ISO na leitura).
 */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS editoria (
  slug        TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  descricao   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS author (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  papel       TEXT NOT NULL,
  cognito_sub TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS pauta (
  id                TEXT PRIMARY KEY,
  tema              TEXT NOT NULL,
  descricao         TEXT NOT NULL DEFAULT '',
  categoria_sugerida TEXT REFERENCES editoria(slug),
  prioridade        TEXT NOT NULL DEFAULT 'media',
  prazo             TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'aberta',
  criado_por        TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pauta_atribuido (
  pauta_id  TEXT NOT NULL REFERENCES pauta(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES author(id),
  PRIMARY KEY (pauta_id, author_id)
);

CREATE TABLE IF NOT EXISTS materia (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL,
  editoria         TEXT NOT NULL REFERENCES editoria(slug),
  titulo           TEXT NOT NULL,
  standfirst       TEXT NOT NULL DEFAULT '',
  corpo            JSONB NOT NULL DEFAULT '[]'::jsonb,
  hero_image_url   TEXT,
  hero_caption     TEXT,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'rascunho',
  pauta_id         TEXT REFERENCES pauta(id),
  published_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  agendado_para    TIMESTAMPTZ,
  reading_minutes  INT,
  related_media_id TEXT,
  views            INT NOT NULL DEFAULT 0,
  cliques          INT NOT NULL DEFAULT 0,
  UNIQUE (editoria, slug)
);
CREATE INDEX IF NOT EXISTS idx_materia_status ON materia (status);
CREATE INDEX IF NOT EXISTS idx_materia_editoria_pub ON materia (editoria, published_at DESC);

CREATE TABLE IF NOT EXISTS materia_autor (
  materia_id TEXT NOT NULL REFERENCES materia(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES author(id),
  ordem      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (materia_id, author_id)
);

CREATE TABLE IF NOT EXISTS revisao_materia (
  id            TEXT PRIMARY KEY,
  materia_id    TEXT NOT NULL REFERENCES materia(id) ON DELETE CASCADE,
  revisor_id    TEXT,
  decisao       TEXT NOT NULL,
  justificativa TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_revisao_materia ON revisao_materia (materia_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS modo_automatico (
  categoria   TEXT PRIMARY KEY REFERENCES editoria(slug),
  ativo       BOOLEAN NOT NULL DEFAULT false,
  ativado_por TEXT,
  ativado_em  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS media (
  id           TEXT PRIMARY KEY,
  tipo         TEXT NOT NULL,
  titulo       TEXT NOT NULL,
  descricao    TEXT,
  editoria     TEXT NOT NULL REFERENCES editoria(slug),
  autor_id     TEXT REFERENCES author(id),
  playback_url TEXT,
  cover_url    TEXT,
  duracao_seg  INT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visibilidade TEXT NOT NULL DEFAULT 'rascunho',
  agendado_para TIMESTAMPTZ,
  destaque     BOOLEAN NOT NULL DEFAULT false,
  transcricao  BOOLEAN,
  legendas_vtt BOOLEAN,
  status       TEXT NOT NULL DEFAULT 'processando',
  views        INT NOT NULL DEFAULT 0,
  likes        INT NOT NULL DEFAULT 0,
  live_viewers INT,
  s3_key       TEXT,
  mc_job_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_tipo_pub ON media (tipo, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_editoria_pub ON media (editoria, published_at DESC);

CREATE TABLE IF NOT EXISTS playlist (
  id     TEXT PRIMARY KEY,
  titulo TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS playlist_item (
  playlist_id TEXT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
  media_id    TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  ordem       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, media_id)
);

CREATE TABLE IF NOT EXISTS ad_campaign (
  id          TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  anunciante  TEXT NOT NULL,
  inicio      TIMESTAMPTZ,
  fim         TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'rascunho',
  ativado_por TEXT
);
CREATE TABLE IF NOT EXISTS ad_creative (
  id           TEXT PRIMARY KEY,
  campanha_id  TEXT NOT NULL REFERENCES ad_campaign(id) ON DELETE CASCADE,
  slot         TEXT NOT NULL,
  tipo_midia   TEXT NOT NULL,
  asset_url    TEXT NOT NULL DEFAULT '',
  link_destino TEXT NOT NULL DEFAULT '',
  peso         INT NOT NULL DEFAULT 1,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  impressoes   INT NOT NULL DEFAULT 0,
  cliques      INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS evento_analytics (
  id          TEXT PRIMARY KEY,
  tipo        TEXT NOT NULL,
  entidade    TEXT NOT NULL,
  entidade_id TEXT NOT NULL,
  categoria   TEXT,
  autor_id    TEXT,
  path        TEXT NOT NULL DEFAULT '',
  referrer    TEXT,
  sessao_hash TEXT NOT NULL DEFAULT '',
  dispositivo TEXT NOT NULL DEFAULT 'web',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evento_entidade ON evento_analytics (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_evento_tipo_criado ON evento_analytics (tipo, criado_em DESC);
`;
