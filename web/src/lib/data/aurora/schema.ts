/**
 * DDL editorial mínimo (DATA_MODEL.md §2) — idempotente.
 */
import { query } from './client';

/** Paths de seed fictício que quebram no web CDN → limpa para placeholder. */
export async function normalizeBrokenImageUrls(): Promise<void> {
  await query(`
    UPDATE materia
    SET hero_image_url = NULL
    WHERE hero_image_url IS NOT NULL
      AND (
        hero_image_url LIKE '/media/cover-%'
        OR hero_image_url LIKE '/avatars/%'
      )
  `);
  // Só reescreve corpo se for array JSONB (evita erro em linhas inválidas).
  await query(`
    UPDATE materia
    SET corpo = (
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN elem->>'type' = 'image'
               AND (elem->>'url' LIKE '/media/cover-%' OR elem->>'url' = '')
          THEN elem || jsonb_build_object('url', '')
          ELSE elem
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(COALESCE(corpo, '[]'::jsonb)) = 'array'
             THEN COALESCE(corpo, '[]'::jsonb)
             ELSE '[]'::jsonb END
      ) AS elem
    )
    WHERE corpo IS NOT NULL
      AND corpo::text LIKE '%/media/cover-%'
  `);
}

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

CREATE TABLE IF NOT EXISTS cidade (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial',
  diretor_author_id TEXT,
  permite_estadual BOOLEAN NOT NULL DEFAULT TRUE,
  permite_nacional BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS desapego_vendedor (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  iniciais TEXT NOT NULL DEFAULT '',
  cidade TEXT,
  uf TEXT,
  nota REAL,
  vendas INT NOT NULL DEFAULT 0,
  bio TEXT,
  desde DATE,
  author_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS desapego_anuncio (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL,
  estado TEXT NOT NULL,
  preco_centavos INT NOT NULL,
  preco_antigo_centavos INT,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  frete_gratis BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ativo',
  vendedor_id TEXT NOT NULL REFERENCES desapego_vendedor(id),
  cidade_id TEXT,
  placeholder_bg TEXT,
  placeholder_fg TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_desapego_anuncio_status ON desapego_anuncio(status);
CREATE INDEX IF NOT EXISTS idx_desapego_anuncio_cat ON desapego_anuncio(categoria);
CREATE INDEX IF NOT EXISTS idx_desapego_anuncio_vendedor ON desapego_anuncio(vendedor_id);
`;

/** Migrações aditivas (idempotentes) — multi-cidade / licenças. */
const MIGRATIONS = [
  `ALTER TABLE author ADD COLUMN IF NOT EXISTS cidade_id TEXT`,
  `ALTER TABLE materia ADD COLUMN IF NOT EXISTS cidade_id TEXT`,
  `ALTER TABLE materia ADD COLUMN IF NOT EXISTS escopo TEXT NOT NULL DEFAULT 'local'`,
  `ALTER TABLE pauta ADD COLUMN IF NOT EXISTS cidade_id TEXT`,
  `ALTER TABLE media ADD COLUMN IF NOT EXISTS cidade_id TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_author_cidade ON author(cidade_id)`,
  `CREATE INDEX IF NOT EXISTS idx_materia_cidade ON materia(cidade_id)`,
  `CREATE INDEX IF NOT EXISTS idx_materia_escopo ON materia(escopo)`,
  `CREATE INDEX IF NOT EXISTS idx_pauta_cidade ON pauta(cidade_id)`,
  // Cidade matriz (tenant default) — ON CONFLICT por id
  `INSERT INTO cidade (id, nome, uf, slug, status, permite_estadual, permite_nacional, criado_em)
   VALUES ('cid-matriz', 'Lupa Matriz', 'BR', 'matriz', 'ativa', TRUE, TRUE, NOW())
   ON CONFLICT (id) DO NOTHING`,
  // Backfill: conteúdo legado → matriz
  `UPDATE author SET cidade_id = 'cid-matriz' WHERE cidade_id IS NULL AND papel <> 'admin'`,
  `UPDATE materia SET cidade_id = 'cid-matriz' WHERE cidade_id IS NULL`,
  `UPDATE pauta SET cidade_id = 'cid-matriz' WHERE cidade_id IS NULL`,
  // Desapegoo KYC (vendedor)
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS cognito_sub TEXT`,
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS email TEXT`,
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS nome_completo TEXT`,
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS cpf TEXT`,
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS telefone TEXT`,
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS chave_pix TEXT`,
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'incompleto'`,
  `ALTER TABLE desapego_vendedor ADD COLUMN IF NOT EXISTS kyc_atualizado_em TIMESTAMPTZ`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_desapego_vendedor_cognito ON desapego_vendedor(cognito_sub) WHERE cognito_sub IS NOT NULL`,
];

export async function applySchema(): Promise<void> {
  // Executa statement a statement (pg não aceita multi bem com prepared params).
  const parts = DDL.split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of parts) {
    await query(stmt);
  }
  for (const stmt of MIGRATIONS) {
    await query(stmt);
  }
}
