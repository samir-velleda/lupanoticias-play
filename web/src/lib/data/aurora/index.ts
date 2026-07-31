/**
 * Implementação Aurora do contrato `Repositories` (matérias/workflow/media).
 * Ads/analytics permanecem no mock (Bloco 7) — sem alterar outros projetos.
 */
import { randomUUID } from 'crypto';
import type { Repositories } from '../repositories';
import { createMockRepositories } from '../mock';
import type {
  ArticleBlock,
  Author,
  Cidade,
  CreateMediaInput,
  CriarCidadeInput,
  CriarMateriaInput,
  Editoria,
  EditoriaSlug,
  EscopoConteudo,
  Materia,
  Media,
  MediaTipo,
  ModoAutomatico,
  PageOpts,
  Paged,
  Papel,
  Pauta,
  Playlist,
  RevisaoMateria,
  StatusLicenca,
  StatusMateria,
} from '@/types';
import { ensureSchema, query, withClient } from './client';

type MateriaRow = {
  id: string;
  slug: string;
  editoria: string;
  titulo: string;
  standfirst: string;
  corpo: ArticleBlock[] | string;
  hero_image_url: string | null;
  hero_caption: string | null;
  tags: string[] | null;
  status: string;
  pauta_id: string | null;
  cidade_id: string | null;
  escopo: string | null;
  published_at: Date | string | null;
  updated_at: Date | string | null;
  agendado_para: Date | string | null;
  reading_minutes: number | null;
  related_media_id: string | null;
  views: number | null;
  cliques: number | null;
};

type AuthorRow = {
  id: string;
  nome: string;
  bio: string | null;
  avatar_url: string | null;
  papel: string;
  cognito_sub: string | null;
  cidade_id: string | null;
};

type CidadeRow = {
  id: string;
  nome: string;
  uf: string;
  slug: string;
  status: string;
  diretor_author_id: string | null;
  permite_estadual: boolean;
  permite_nacional: boolean;
  criado_em: Date | string;
  atualizado_em: Date | string | null;
};

type MediaRow = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  editoria: string;
  autor_id: string | null;
  playback_url: string | null;
  cover_url: string | null;
  duracao_seg: number | null;
  published_at: Date | string;
  visibilidade: string;
  agendado_para: Date | string | null;
  destaque: boolean;
  transcricao: boolean | null;
  legendas_vtt: boolean | null;
  status: string;
  views: number | null;
  likes: number | null;
  live_viewers: number | null;
};

const iso = (v: Date | string | null | undefined): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
};

const parseCorpo = (c: ArticleBlock[] | string): ArticleBlock[] => {
  if (Array.isArray(c)) return c;
  try {
    const p = JSON.parse(c) as ArticleBlock[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

function mapAuthor(r: AuthorRow): Author {
  return {
    id: r.id,
    nome: r.nome,
    bio: r.bio ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    papel: r.papel as Papel,
    cidadeId: r.cidade_id ?? undefined,
  };
}

function mapCidade(r: CidadeRow): Cidade {
  return {
    id: r.id,
    nome: r.nome,
    uf: r.uf,
    slug: r.slug,
    status: r.status as StatusLicenca,
    diretorAuthorId: r.diretor_author_id ?? undefined,
    permiteEstadual: !!r.permite_estadual,
    permiteNacional: !!r.permite_nacional,
    criadoEm: iso(r.criado_em) ?? new Date().toISOString(),
    atualizadoEm: iso(r.atualizado_em),
  };
}

async function loadAutores(materiaId: string): Promise<Author[]> {
  const { rows } = await query<AuthorRow>(
    `SELECT a.* FROM author a
     INNER JOIN materia_autor ma ON ma.author_id = a.id
     WHERE ma.materia_id = $1`,
    [materiaId],
  );
  return rows.map(mapAuthor);
}

async function mapMateria(r: MateriaRow): Promise<Materia> {
  const autores = await loadAutores(r.id);
  return {
    id: r.id,
    slug: r.slug,
    editoria: r.editoria as EditoriaSlug,
    titulo: r.titulo,
    standfirst: r.standfirst ?? '',
    corpo: parseCorpo(r.corpo),
    autores,
    heroImageUrl: r.hero_image_url ?? undefined,
    heroCaption: r.hero_caption ?? undefined,
    tags: r.tags ?? [],
    status: r.status as StatusMateria,
    pautaId: r.pauta_id ?? undefined,
    cidadeId: r.cidade_id ?? undefined,
    escopo: (r.escopo as EscopoConteudo) || 'local',
    publishedAt: iso(r.published_at),
    updatedAt: iso(r.updated_at),
    agendadoPara: iso(r.agendado_para),
    readingMinutes: r.reading_minutes ?? undefined,
    relatedMediaId: r.related_media_id ?? undefined,
    views: r.views ?? 0,
    cliques: r.cliques ?? 0,
  };
}

async function getAuthorById(id: string): Promise<Author | null> {
  const { rows } = await query<AuthorRow>(`SELECT * FROM author WHERE id = $1`, [id]);
  return rows[0] ? mapAuthor(rows[0]) : null;
}

function mapMedia(r: MediaRow, autor?: Author | null): Media {
  return {
    id: r.id,
    tipo: r.tipo as MediaTipo,
    titulo: r.titulo,
    descricao: r.descricao ?? undefined,
    editoria: r.editoria as EditoriaSlug,
    autor: autor ?? undefined,
    playbackUrl: r.playback_url ?? undefined,
    coverUrl: r.cover_url ?? undefined,
    duracaoSeg: r.duracao_seg ?? undefined,
    publishedAt: iso(r.published_at) ?? new Date().toISOString(),
    visibilidade: r.visibilidade as Media['visibilidade'],
    agendadoPara: iso(r.agendado_para),
    destaque: !!r.destaque,
    transcricao: r.transcricao ?? undefined,
    legendasVTT: r.legendas_vtt ?? undefined,
    status: r.status as Media['status'],
    views: r.views ?? 0,
    likes: r.likes ?? 0,
    liveViewers: r.live_viewers ?? undefined,
  };
}

async function mapMediaRow(r: MediaRow): Promise<Media> {
  const autor = r.autor_id ? await getAuthorById(r.autor_id) : null;
  return mapMedia(r, autor);
}

function paginateOpts(opts?: PageOpts) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.max(1, opts?.pageSize ?? 10);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'materia';

async function uniqueSlug(editoria: string, base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 0;
  for (;;) {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM materia WHERE editoria = $1 AND slug = $2`,
      [editoria, slug],
    );
    if (!rows[0] || rows[0].id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function getMateriaById(id: string): Promise<Materia | null> {
  const { rows } = await query<MateriaRow>(`SELECT * FROM materia WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  return mapMateria(rows[0]);
}

export function createAuroraRepositories(): Repositories {
  const mock = createMockRepositories();

  const ready = async () => {
    await ensureSchema();
  };

  return {
    materias: {
      async getById(id) {
        await ready();
        return getMateriaById(id);
      },
      async getBySlug(editoria, slug) {
        await ready();
        const { rows } = await query<MateriaRow>(
          `SELECT * FROM materia WHERE editoria = $1 AND slug = $2 AND status = 'publicada'`,
          [editoria, slug],
        );
        if (!rows[0]) return null;
        return mapMateria(rows[0]);
      },
      async listByEditoria(editoria, opts) {
        await ready();
        const { page, pageSize, offset } = paginateOpts(opts);
        const count = await query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM materia WHERE editoria = $1 AND status = 'publicada'`,
          [editoria],
        );
        const { rows } = await query<MateriaRow>(
          `SELECT * FROM materia WHERE editoria = $1 AND status = 'publicada'
           ORDER BY published_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
          [editoria, pageSize, offset],
        );
        const items = await Promise.all(rows.map(mapMateria));
        return { items, page, pageSize, total: Number(count.rows[0]?.n ?? 0) };
      },
      async listMaisLidas(limit = 5) {
        await ready();
        const { rows } = await query<MateriaRow>(
          `SELECT * FROM materia WHERE status = 'publicada'
           ORDER BY views DESC NULLS LAST LIMIT $1`,
          [limit],
        );
        return Promise.all(rows.map(mapMateria));
      },
      async listOpiniao(limit = 3) {
        await ready();
        const { rows } = await query<MateriaRow>(
          `SELECT * FROM materia WHERE status = 'publicada' AND editoria = 'opiniao'
           ORDER BY published_at DESC NULLS LAST LIMIT $1`,
          [limit],
        );
        return Promise.all(rows.map(mapMateria));
      },
      async listRelated(materiaId, limit = 3) {
        await ready();
        const base = await getMateriaById(materiaId);
        if (!base) return [];
        const { rows } = await query<MateriaRow>(
          `SELECT * FROM materia
           WHERE status = 'publicada' AND editoria = $1 AND id <> $2
           ORDER BY published_at DESC NULLS LAST LIMIT $3`,
          [base.editoria, materiaId, limit],
        );
        return Promise.all(rows.map(mapMateria));
      },
      async listMinhas(autorId, status) {
        await ready();
        const params: unknown[] = [autorId];
        let sql = `SELECT m.* FROM materia m
          INNER JOIN materia_autor ma ON ma.materia_id = m.id
          WHERE ma.author_id = $1`;
        if (status) {
          params.push(status);
          sql += ` AND m.status = $2`;
        }
        sql += ` ORDER BY COALESCE(m.updated_at, m.published_at) DESC NULLS LAST`;
        const { rows } = await query<MateriaRow>(sql, params);
        return Promise.all(rows.map(mapMateria));
      },
      async listPendentes(opts) {
        await ready();
        const { page, pageSize, offset } = paginateOpts(opts);
        const cidadeId = opts?.cidadeId;
        const params: unknown[] = [];
        let where = `status = 'pendente'`;
        if (cidadeId) {
          params.push(cidadeId);
          where += ` AND cidade_id = $${params.length}`;
        }
        const count = await query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM materia WHERE ${where}`,
          params,
        );
        params.push(pageSize, offset);
        const { rows } = await query<MateriaRow>(
          `SELECT * FROM materia WHERE ${where}
           ORDER BY updated_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
          params,
        );
        const items = await Promise.all(rows.map(mapMateria));
        return { items, page, pageSize, total: Number(count.rows[0]?.n ?? 0) } satisfies Paged<Materia>;
      },
      async criar(input) {
        await ready();
        const id = `m-${randomUUID()}`;
        const slug = await uniqueSlug(input.editoria, slugify(input.titulo));
        const agora = new Date().toISOString();
        const autorId = input.autorId;
        if (!autorId) {
          throw new Error('autorId é obrigatório ao criar matéria.');
        }
        const autor = await getAuthorById(autorId);
        const cidadeId = input.cidadeId ?? autor?.cidadeId ?? 'cid-matriz';
        const escopo = input.escopo ?? 'local';
        await withClient(async (c) => {
          await c.query('BEGIN');
          try {
            await c.query(
              `INSERT INTO materia (
                 id, slug, editoria, titulo, standfirst, corpo, hero_image_url, hero_caption,
                 tags, status, pauta_id, cidade_id, escopo, updated_at, agendado_para, views, cliques
               ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,'rascunho',$10,$11,$12,$13,$14,0,0)`,
              [
                id,
                slug,
                input.editoria,
                input.titulo,
                input.standfirst ?? '',
                JSON.stringify(input.corpo ?? []),
                input.heroImageUrl ?? null,
                input.heroCaption ?? null,
                input.tags ?? [],
                input.pautaId ?? null,
                cidadeId,
                escopo,
                agora,
                input.agendadoPara ?? null,
              ],
            );
            await c.query(
              `INSERT INTO materia_autor (materia_id, author_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
              [id, autorId],
            );
            await c.query('COMMIT');
          } catch (e) {
            await c.query('ROLLBACK');
            throw e;
          }
        });
        const m = await getMateriaById(id);
        if (!m) throw new Error('Falha ao criar matéria');
        return m;
      },
      async atualizar(id, input) {
        await ready();
        const cur = await getMateriaById(id);
        if (!cur) throw new Error(`Matéria ${id} não encontrada`);
        const titulo = input.titulo ?? cur.titulo;
        const editoria = input.editoria ?? cur.editoria;
        const slug =
          input.titulo || input.editoria
            ? await uniqueSlug(editoria, slugify(titulo), id)
            : cur.slug;
        const agora = new Date().toISOString();
        await query(
          `UPDATE materia SET
             slug = $2, editoria = $3, titulo = $4, standfirst = $5, corpo = $6::jsonb,
             hero_image_url = $7, hero_caption = $8, tags = $9, pauta_id = $10,
             agendado_para = $11, updated_at = $12,
             cidade_id = COALESCE($13, cidade_id),
             escopo = COALESCE($14, escopo)
           WHERE id = $1`,
          [
            id,
            slug,
            editoria,
            titulo,
            input.standfirst ?? cur.standfirst,
            JSON.stringify(input.corpo ?? cur.corpo),
            input.heroImageUrl !== undefined ? input.heroImageUrl || null : cur.heroImageUrl ?? null,
            input.heroCaption !== undefined ? input.heroCaption || null : cur.heroCaption ?? null,
            input.tags ?? cur.tags,
            input.pautaId !== undefined ? input.pautaId || null : cur.pautaId ?? null,
            input.agendadoPara !== undefined ? input.agendadoPara || null : cur.agendadoPara ?? null,
            agora,
            input.cidadeId ?? null,
            input.escopo ?? null,
          ],
        );
        if (input.autorId) {
          await query(`DELETE FROM materia_autor WHERE materia_id = $1`, [id]);
          await query(
            `INSERT INTO materia_autor (materia_id, author_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [id, input.autorId],
          );
        }
        const m = await getMateriaById(id);
        if (!m) throw new Error(`Matéria ${id} não encontrada após update`);
        return m;
      },
      async enviarParaRevisao(id) {
        await ready();
        const m = await getMateriaById(id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        const okEnvio = ['rascunho', 'pendente', 'recusada', 'em_correcao'].includes(m.status);
        if (!okEnvio) {
          throw new Error(`Não é possível enviar para revisão com status "${m.status}".`);
        }
        if (!m.corpo?.length || !m.titulo?.trim()) {
          throw new Error('Matéria incompleta: título e corpo são obrigatórios.');
        }
        const { rows: modo } = await query<{ ativo: boolean }>(
          `SELECT ativo FROM modo_automatico WHERE categoria = $1`,
          [m.editoria],
        );
        const auto = !!modo[0]?.ativo;
        const agora = new Date().toISOString();
        if (auto) {
          await query(
            `UPDATE materia SET status = 'publicada', published_at = $2, updated_at = $2 WHERE id = $1`,
            [id, agora],
          );
        } else {
          await query(`UPDATE materia SET status = 'pendente', updated_at = $2 WHERE id = $1`, [
            id,
            agora,
          ]);
        }
        const out = await getMateriaById(id);
        if (!out) throw new Error(`Matéria ${id} não encontrada`);
        return out;
      },
      async aprovar(id, revisorId, agendadoPara) {
        await ready();
        const cur = await getMateriaById(id);
        if (!cur) throw new Error(`Matéria ${id} não encontrada`);
        if (cur.status === 'publicada') return cur;
        if (cur.status !== 'pendente' && cur.status !== 'aprovada') {
          throw new Error(`Só é possível aprovar matérias pendentes (status atual: ${cur.status}).`);
        }
        const agora = new Date().toISOString();
        await withClient(async (c) => {
          await c.query('BEGIN');
          try {
            if (agendadoPara) {
              await c.query(
                `UPDATE materia SET status = 'aprovada', agendado_para = $2, updated_at = $3 WHERE id = $1`,
                [id, agendadoPara, agora],
              );
            } else {
              await c.query(
                `UPDATE materia SET status = 'publicada', published_at = $2, updated_at = $2 WHERE id = $1`,
                [id, agora],
              );
            }
            await c.query(
              `INSERT INTO revisao_materia (id, materia_id, revisor_id, decisao, criado_em)
               VALUES ($1,$2,$3,'aprovada',$4)`,
              [`rev-${randomUUID()}`, id, revisorId, agora],
            );
            await c.query('COMMIT');
          } catch (e) {
            await c.query('ROLLBACK');
            throw e;
          }
        });
        const m = await getMateriaById(id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        return m;
      },
      async recusar(id, revisorId, justificativa) {
        if (!justificativa?.trim()) {
          throw new Error('Justificativa é obrigatória para recusar uma matéria.');
        }
        await ready();
        const cur = await getMateriaById(id);
        if (!cur) throw new Error(`Matéria ${id} não encontrada`);
        if (cur.status === 'recusada' || cur.status === 'em_correcao') return cur;
        if (cur.status !== 'pendente') {
          throw new Error(`Só é possível recusar matérias pendentes (status atual: ${cur.status}).`);
        }
        const agora = new Date().toISOString();
        await withClient(async (c) => {
          await c.query('BEGIN');
          try {
            await c.query(`UPDATE materia SET status = 'recusada', updated_at = $2 WHERE id = $1`, [
              id,
              agora,
            ]);
            await c.query(
              `INSERT INTO revisao_materia (id, materia_id, revisor_id, decisao, justificativa, criado_em)
               VALUES ($1,$2,$3,'recusada',$4,$5)`,
              [`rev-${randomUUID()}`, id, revisorId, justificativa.trim(), agora],
            );
            await c.query('COMMIT');
          } catch (e) {
            await c.query('ROLLBACK');
            throw e;
          }
        });
        const m = await getMateriaById(id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        return m;
      },
      async marcarEmCorrecao(id) {
        await ready();
        const cur = await getMateriaById(id);
        if (!cur) throw new Error(`Matéria ${id} não encontrada`);
        if (cur.status !== 'recusada' && cur.status !== 'em_correcao') {
          return cur;
        }
        const agora = new Date().toISOString();
        await query(`UPDATE materia SET status = 'em_correcao', updated_at = $2 WHERE id = $1`, [
          id,
          agora,
        ]);
        const m = await getMateriaById(id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        return m;
      },
      async listRevisoes(materiaId) {
        await ready();
        const { rows } = await query<{
          id: string;
          materia_id: string;
          revisor_id: string;
          decisao: string;
          justificativa: string | null;
          criado_em: Date | string;
        }>(
          `SELECT * FROM revisao_materia WHERE materia_id = $1 ORDER BY criado_em DESC`,
          [materiaId],
        );
        return rows.map(
          (r): RevisaoMateria => ({
            id: r.id,
            materiaId: r.materia_id,
            revisorId: r.revisor_id,
            decisao: r.decisao as RevisaoMateria['decisao'],
            justificativa: r.justificativa ?? undefined,
            criadoEm: iso(r.criado_em) ?? new Date().toISOString(),
          }),
        );
      },
    },

    pautas: {
      async listAbertas(autorId, cidadeId) {
        await ready();
        const params: unknown[] = [];
        let sql = `SELECT * FROM pauta WHERE status IN ('aberta','em_producao')`;
        if (cidadeId) {
          params.push(cidadeId);
          sql += ` AND cidade_id = $1`;
        }
        sql += ` ORDER BY criado_em DESC`;
        const { rows } = await query<{
          id: string;
          tema: string;
          descricao: string;
          categoria_sugerida: string | null;
          prioridade: string;
          prazo: Date | string | null;
          status: string;
          criado_por: string;
          criado_em: Date | string;
          cidade_id: string | null;
        }>(sql, params);
        const out: Pauta[] = [];
        for (const r of rows) {
          const atrib = await query<{ author_id: string }>(
            `SELECT author_id FROM pauta_atribuido WHERE pauta_id = $1`,
            [r.id],
          );
          const atribuidos = atrib.rows.map((x) => x.author_id);
          // Pautas sem atribuição são gerais; pautas atribuídas são privadas ao jornalista.
          if (autorId && atribuidos.length > 0 && !atribuidos.includes(autorId)) continue;
          out.push({
            id: r.id,
            tema: r.tema,
            descricao: r.descricao,
            categoriaSugerida: (r.categoria_sugerida as EditoriaSlug) || undefined,
            prioridade: r.prioridade as Pauta['prioridade'],
            prazo: iso(r.prazo),
            atribuidos,
            status: r.status as Pauta['status'],
            criadoPor: r.criado_por,
            criadoEm: iso(r.criado_em) ?? new Date().toISOString(),
            cidadeId: r.cidade_id ?? undefined,
          });
        }
        return out;
      },
      async criar(input) {
        await ready();
        const id = `pt-${randomUUID()}`;
        const agora = new Date().toISOString();
        const cidadeId = input.cidadeId ?? 'cid-matriz';
        await withClient(async (c) => {
          await c.query(
            `INSERT INTO pauta (id, tema, descricao, categoria_sugerida, prioridade, prazo, status, criado_por, criado_em, cidade_id)
             VALUES ($1,$2,$3,$4,$5,$6,'aberta',$7,$8,$9)`,
            [
              id,
              input.tema,
              input.descricao,
              input.categoriaSugerida ?? null,
              input.prioridade,
              input.prazo ?? null,
              input.criadoPor,
              agora,
              cidadeId,
            ],
          );
          for (const a of input.atribuidos ?? []) {
            await c.query(
              `INSERT INTO pauta_atribuido (pauta_id, author_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
              [id, a],
            );
          }
        });
        return {
          ...input,
          id,
          status: 'aberta',
          criadoEm: agora,
        };
      },
      async atualizar(id, input) {
        await ready();
        const { rows } = await query(`SELECT * FROM pauta WHERE id = $1`, [id]);
        if (!rows[0]) throw new Error(`Pauta ${id} não encontrada`);
        // Minimal patch — campos usados pelo portal
        await query(
          `UPDATE pauta SET
             tema = COALESCE($2, tema),
             descricao = COALESCE($3, descricao),
             status = COALESCE($4, status),
             prioridade = COALESCE($5, prioridade)
           WHERE id = $1`,
          [
            id,
            input.tema ?? null,
            input.descricao ?? null,
            input.status ?? null,
            input.prioridade ?? null,
          ],
        );
        const list = await this.listAbertas();
        const found = list.find((p) => p.id === id);
        if (found) return found;
        return {
          id,
          tema: input.tema ?? '',
          descricao: input.descricao ?? '',
          prioridade: input.prioridade ?? 'media',
          atribuidos: input.atribuidos ?? [],
          status: input.status ?? 'aberta',
          criadoPor: input.criadoPor ?? '',
          criadoEm: new Date().toISOString(),
        };
      },
    },

    config: {
      async getModoAutomatico() {
        await ready();
        const { rows } = await query<{
          categoria: string;
          ativo: boolean;
          ativado_por: string | null;
          ativado_em: Date | string | null;
        }>(`SELECT * FROM modo_automatico`);
        return rows.map(
          (r): ModoAutomatico => ({
            categoria: r.categoria as EditoriaSlug,
            ativo: !!r.ativo,
            ativadoPor: r.ativado_por ?? undefined,
            ativadoEm: iso(r.ativado_em),
          }),
        );
      },
      async setModoAutomatico(categoria, ativo, porId) {
        await ready();
        const agora = new Date().toISOString();
        await query(
          `INSERT INTO modo_automatico (categoria, ativo, ativado_por, ativado_em)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (categoria) DO UPDATE SET ativo = $2, ativado_por = $3, ativado_em = $4`,
          [categoria, ativo, porId, agora],
        );
      },
    },

    media: {
      async getById(id) {
        await ready();
        const { rows } = await query<MediaRow>(`SELECT * FROM media WHERE id = $1`, [id]);
        if (!rows[0]) return null;
        return mapMediaRow(rows[0]);
      },
      async listByTipo(tipo, opts) {
        await ready();
        const { page, pageSize, offset } = paginateOpts(opts);
        const count = await query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM media
           WHERE tipo = $1 AND visibilidade = 'publico' AND status = 'pronto'`,
          [tipo],
        );
        const { rows } = await query<MediaRow>(
          `SELECT * FROM media
           WHERE tipo = $1 AND visibilidade = 'publico' AND status = 'pronto'
           ORDER BY published_at DESC LIMIT $2 OFFSET $3`,
          [tipo, pageSize, offset],
        );
        const items = await Promise.all(rows.map(mapMediaRow));
        return { items, page, pageSize, total: Number(count.rows[0]?.n ?? 0) };
      },
      async listByEditoria(editoria, opts) {
        await ready();
        const { page, pageSize, offset } = paginateOpts(opts);
        const count = await query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM media WHERE editoria = $1 AND visibilidade = 'publico'`,
          [editoria],
        );
        const { rows } = await query<MediaRow>(
          `SELECT * FROM media WHERE editoria = $1 AND visibilidade = 'publico'
           ORDER BY published_at DESC LIMIT $2 OFFSET $3`,
          [editoria, pageSize, offset],
        );
        const items = await Promise.all(rows.map(mapMediaRow));
        return { items, page, pageSize, total: Number(count.rows[0]?.n ?? 0) };
      },
      async getLiveDestaque() {
        await ready();
        const { rows } = await query<MediaRow>(
          `SELECT * FROM media WHERE tipo = 'live' AND destaque = true AND status = 'pronto' LIMIT 1`,
        );
        if (!rows[0]) return null;
        return mapMediaRow(rows[0]);
      },
      async listPlayShelf() {
        await ready();
        const { rows: pls } = await query<{ id: string; titulo: string }>(
          `SELECT * FROM playlist ORDER BY id`,
        );
        const out: Playlist[] = [];
        for (const pl of pls) {
          const { rows: items } = await query<MediaRow>(
            `SELECT m.* FROM media m
             INNER JOIN playlist_item pi ON pi.media_id = m.id
             WHERE pi.playlist_id = $1
             ORDER BY pi.ordem ASC`,
            [pl.id],
          );
          out.push({
            id: pl.id,
            titulo: pl.titulo,
            itens: await Promise.all(items.map(mapMediaRow)),
          });
        }
        return out;
      },
      async listCortes(opts) {
        return this.listByTipo('short', opts);
      },
      async getNext(id, limit = 4) {
        await ready();
        const base = await this.getById(id);
        const { rows } = await query<MediaRow>(
          `SELECT * FROM media WHERE id <> $1 AND status = 'pronto' AND tipo <> 'live'
           ORDER BY CASE WHEN editoria = $2 THEN 0 ELSE 1 END, published_at DESC
           LIMIT $3`,
          [id, base?.editoria ?? '', limit],
        );
        return Promise.all(rows.map(mapMediaRow));
      },
      async criarUpload(input: CreateMediaInput) {
        await ready();
        const id = `media-${randomUUID()}`;
        const agora = new Date().toISOString();
        await query(
          `INSERT INTO media (
             id, tipo, titulo, descricao, editoria, playback_url, cover_url, published_at,
             visibilidade, agendado_para, destaque, transcricao, legendas_vtt, status, s3_key
           ) VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,$9,$10,$11,$12,'processando',$13)`,
          [
            id,
            input.tipo,
            input.titulo,
            input.descricao ?? null,
            input.editoria,
            input.coverUrl ?? null,
            agora,
            input.visibilidade,
            input.agendadoPara ?? null,
            input.destaque,
            input.transcricaoAuto,
            input.gerarLegendasVTT,
            input.uploadKey,
          ],
        );
        const m = await this.getById(id);
        if (!m) throw new Error('Falha ao criar mídia');
        return m;
      },
    },

    // Bloco 7 — mantém mock (sem impacto editorial)
    ads: mock.ads,
    analytics: mock.analytics,

    editorias: {
      async list() {
        await ready();
        const { rows } = await query<{ slug: string; nome: string; descricao: string }>(
          `SELECT * FROM editoria ORDER BY nome`,
        );
        return rows.map(
          (r): Editoria => ({
            slug: r.slug as EditoriaSlug,
            nome: r.nome,
            descricao: r.descricao,
          }),
        );
      },
      async get(slug) {
        await ready();
        const { rows } = await query<{ slug: string; nome: string; descricao: string }>(
          `SELECT * FROM editoria WHERE slug = $1`,
          [slug],
        );
        if (!rows[0]) return null;
        return {
          slug: rows[0].slug as EditoriaSlug,
          nome: rows[0].nome,
          descricao: rows[0].descricao,
        };
      },
    },

    authors: {
      async getById(id) {
        await ready();
        return getAuthorById(id);
      },
      async listByPapel(papel, cidadeId) {
        await ready();
        if (cidadeId) {
          const { rows } = await query<AuthorRow>(
            `SELECT * FROM author WHERE papel = $1 AND cidade_id = $2 ORDER BY nome`,
            [papel, cidadeId],
          );
          return rows.map(mapAuthor);
        }
        const { rows } = await query<AuthorRow>(
          `SELECT * FROM author WHERE papel = $1 ORDER BY nome`,
          [papel],
        );
        return rows.map(mapAuthor);
      },
      async ensureFromCognito(input) {
        await ready();
        const { rows } = await query<AuthorRow>(
          `SELECT * FROM author WHERE cognito_sub = $1`,
          [input.sub],
        );
        if (rows[0]) {
          // Atualiza nome se mudou; cidade só se explicitamente enviada
          if (input.nome && input.nome !== rows[0].nome) {
            await query(`UPDATE author SET nome = $2 WHERE id = $1`, [rows[0].id, input.nome]);
          }
          if (input.cidadeId !== undefined) {
            await query(`UPDATE author SET cidade_id = $2 WHERE id = $1`, [
              rows[0].id,
              input.cidadeId,
            ]);
          }
          const refreshed = await getAuthorById(rows[0].id);
          return refreshed ?? mapAuthor(rows[0]);
        }
        const id = `a-${randomUUID()}`;
        const nome = input.nome || input.email || 'Redação Lupa';
        const cidadeId =
          input.papel === 'admin' ? null : (input.cidadeId ?? 'cid-matriz');
        await query(
          `INSERT INTO author (id, nome, bio, avatar_url, papel, cognito_sub, cidade_id)
           VALUES ($1,$2,NULL,NULL,$3,$4,$5)`,
          [id, nome, input.papel, input.sub, cidadeId],
        );
        return {
          id,
          nome,
          papel: input.papel,
          cidadeId: cidadeId ?? undefined,
        };
      },
      async setCidade(authorId, cidadeId) {
        await ready();
        await query(`UPDATE author SET cidade_id = $2 WHERE id = $1`, [authorId, cidadeId]);
        const a = await getAuthorById(authorId);
        if (!a) throw new Error(`Author ${authorId} não encontrado`);
        return a;
      },
    },

    cidades: {
      async list() {
        await ready();
        const { rows } = await query<CidadeRow>(`SELECT * FROM cidade ORDER BY nome`);
        return rows.map(mapCidade);
      },
      async getById(id) {
        await ready();
        const { rows } = await query<CidadeRow>(`SELECT * FROM cidade WHERE id = $1`, [id]);
        return rows[0] ? mapCidade(rows[0]) : null;
      },
      async getBySlug(slug) {
        await ready();
        const { rows } = await query<CidadeRow>(`SELECT * FROM cidade WHERE slug = $1`, [slug]);
        return rows[0] ? mapCidade(rows[0]) : null;
      },
      async criar(input: CriarCidadeInput) {
        await ready();
        const id = `cid-${randomUUID()}`;
        const slug = (input.slug || input.nome)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const agora = new Date().toISOString();
        await query(
          `INSERT INTO cidade (id, nome, uf, slug, status, diretor_author_id, permite_estadual, permite_nacional, criado_em)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            id,
            input.nome.trim(),
            input.uf.trim().toUpperCase().slice(0, 2),
            slug,
            input.status ?? 'trial',
            input.diretorAuthorId ?? null,
            input.permiteEstadual ?? true,
            input.permiteNacional ?? false,
            agora,
          ],
        );
        if (input.diretorAuthorId) {
          await query(`UPDATE author SET cidade_id = $2, papel = 'diretor' WHERE id = $1`, [
            input.diretorAuthorId,
            id,
          ]);
        }
        const c = await this.getById(id);
        if (!c) throw new Error('Falha ao criar cidade');
        return c;
      },
      async atualizar(id, input) {
        await ready();
        const cur = await this.getById(id);
        if (!cur) throw new Error(`Cidade ${id} não encontrada`);
        const agora = new Date().toISOString();
        const slug = input.slug
          ? input.slug
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          : cur.slug;
        await query(
          `UPDATE cidade SET
             nome = $2, uf = $3, slug = $4, status = $5,
             diretor_author_id = $6, permite_estadual = $7, permite_nacional = $8,
             atualizado_em = $9
           WHERE id = $1`,
          [
            id,
            input.nome?.trim() ?? cur.nome,
            (input.uf ?? cur.uf).trim().toUpperCase().slice(0, 2),
            slug,
            input.status ?? cur.status,
            input.diretorAuthorId !== undefined
              ? input.diretorAuthorId || null
              : cur.diretorAuthorId ?? null,
            input.permiteEstadual ?? cur.permiteEstadual,
            input.permiteNacional ?? cur.permiteNacional,
            agora,
          ],
        );
        if (input.diretorAuthorId) {
          await query(`UPDATE author SET cidade_id = $2, papel = 'diretor' WHERE id = $1`, [
            input.diretorAuthorId,
            id,
          ]);
        }
        const c = await this.getById(id);
        if (!c) throw new Error(`Cidade ${id} não encontrada após update`);
        return c;
      },
    },
  };
}
