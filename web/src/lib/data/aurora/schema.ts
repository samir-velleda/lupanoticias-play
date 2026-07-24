/**
 * DDL editorial mínimo (DATA_MODEL.md §2) — idempotente.
 */
import { query } from './client';

const DDL = `
CREATE TABLE IF NOT EXISTS editoria (
  slug TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS author (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  papel TEXT NOT NULL,
  cognito_sub TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS pauta (
  id TEXT PRIMARY KEY,
  tema TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  categoria_sugerida TEXT,
  prioridade TEXT NOT NULL DEFAULT 'media',
  prazo TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'aberta',
  criado_por TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pauta_atribuido (
  pauta_id TEXT NOT NULL REFERENCES pauta(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES author(id),
  PRIMARY KEY (pauta_id, author_id)
);

CREATE TABLE IF NOT EXISTS materia (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  editoria TEXT NOT NULL REFERENCES editoria(slug),
  titulo TEXT NOT NULL,
  standfirst TEXT NOT NULL DEFAULT '',
  corpo JSONB NOT NULL DEFAULT '[]'::jsonb,
  hero_image_url TEXT,
  hero_caption TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  pauta_id TEXT REFERENCES pauta(id),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  agendado_para TIMESTAMPTZ,
  reading_minutes INT,
  related_media_id TEXT,
  views INT NOT NULL DEFAULT 0,
  cliques INT NOT NULL DEFAULT 0,
  UNIQUE (editoria, slug)
);

CREATE INDEX IF NOT EXISTS idx_materia_status ON materia(status);
CREATE INDEX IF NOT EXISTS idx_materia_editoria_pub ON materia(editoria, published_at DESC);

CREATE TABLE IF NOT EXISTS materia_autor (
  materia_id TEXT NOT NULL REFERENCES materia(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES author(id),
  PRIMARY KEY (materia_id, author_id)
);

CREATE TABLE IF NOT EXISTS revisao_materia (
  id TEXT PRIMARY KEY,
  materia_id TEXT NOT NULL REFERENCES materia(id) ON DELETE CASCADE,
  revisor_id TEXT NOT NULL,
  decisao TEXT NOT NULL,
  justificativa TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modo_automatico (
  categoria TEXT PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  ativado_por TEXT,
  ativado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  editoria TEXT NOT NULL,
  autor_id TEXT,
  playback_url TEXT,
  cover_url TEXT,
  duracao_seg INT,
  published_at TIMESTAMPTZ NOT NULL,
  visibilidade TEXT NOT NULL DEFAULT 'publico',
  agendado_para TIMESTAMPTZ,
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  transcricao BOOLEAN,
  legendas_vtt BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pronto',
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  live_viewers INT DEFAULT 0,
  s3_key TEXT,
  mc_job_id TEXT
);

CREATE TABLE IF NOT EXISTS playlist (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_item (
  playlist_id TEXT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, media_id)
);
`;

export async function applySchema(): Promise<void> {
  // Executa statement a statement (pg não aceita multi bem com prepared params).
  const parts = DDL.split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of parts) {
    await query(stmt);
  }
}
