import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Repositories } from '../repositories';
import type {
  AdCampaign,
  AdCreative,
  AdMetrics,
  AdSlotId,
  CreateMediaInput,
  CriarMateriaInput,
  Editoria,
  EditoriaSlug,
  EventoAnalytics,
  Materia,
  Media,
  MediaTipo,
  ModoAutomatico,
  Paged,
  PageOpts,
  Pauta,
  Playlist,
  RelatorioOpts,
  RelatorioResultado,
  RevisaoMateria,
  StatusMateria,
} from '@/types';
import { q, tx, exec } from '../db';
import {
  erroNaoEditavel,
  podeEditar,
  podeEnviarParaRevisao,
  podeReabrirParaCorrecao,
  podeRevisar,
} from '@/lib/domain/materia';
import {
  mapAdCampaign,
  mapAdCreative,
  mapAuthor,
  mapEditoria,
  mapMateria,
  mapMedia,
  mapModo,
  mapPauta,
  mapRevisao,
  type Row,
} from './rows';

// ---- helpers ----
const nid = (prefixo: string) => `${prefixo}-${randomUUID().slice(0, 12)}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function pageOf(opts?: PageOpts) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.max(1, opts?.pageSize ?? 10);
  return { page, pageSize, offset: (page - 1) * pageSize };
}
const totalDe = (rows: Row[]): number => (rows.length ? Number(rows[0]._total ?? 0) : 0);

// SELECT de matéria com autores agregados (json).
const AUTORES_SUBQ = `COALESCE((
  SELECT json_agg(json_build_object('id',a.id,'nome',a.nome,'bio',a.bio,'avatarUrl',a.avatar_url,'papel',a.papel) ORDER BY ma.ordem, a.id)
  FROM materia_autor ma JOIN author a ON a.id = ma.author_id
  WHERE ma.materia_id = m.id
), '[]'::json) AS autores`;
const MAT = `m.id, m.slug, m.editoria, m.titulo, m.standfirst, m.corpo, m.hero_image_url,
  m.hero_caption, m.tags, m.status, m.pauta_id, m.published_at, m.updated_at, m.agendado_para,
  m.reading_minutes, m.related_media_id, m.views, m.cliques`;
const MAT_SELECT = `SELECT ${MAT}, ${AUTORES_SUBQ} FROM materia m`;

const MEDIA_SELECT = `SELECT me.id, me.tipo, me.titulo, me.descricao, me.editoria, me.autor_id,
  me.playback_url, me.cover_url, me.duracao_seg, me.published_at, me.visibilidade, me.agendado_para,
  me.destaque, me.transcricao, me.legendas_vtt, me.status, me.views, me.likes, me.live_viewers,
  a.nome AS autor_nome, a.bio AS autor_bio, a.avatar_url AS autor_avatar_url, a.papel AS autor_papel
  FROM media me LEFT JOIN author a ON a.id = me.autor_id`;

const PAUTA_SELECT = `SELECT p.id, p.tema, p.descricao, p.categoria_sugerida, p.prioridade, p.prazo,
  p.status, p.criado_por, p.criado_em,
  COALESCE((SELECT json_agg(pa.author_id ORDER BY pa.author_id) FROM pauta_atribuido pa WHERE pa.pauta_id = p.id), '[]'::json) AS atribuidos
  FROM pauta p`;

async function getMateriaById(id: string): Promise<Materia | null> {
  const rows = await q(`${MAT_SELECT} WHERE m.id = $1`, [id]);
  return rows[0] ? mapMateria(rows[0]) : null;
}

/** Gera slug único dentro da editoria (append curto em caso de colisão). */
async function slugUnico(editoria: EditoriaSlug, base: string, excetoId?: string): Promise<string> {
  const raiz = slugify(base) || 'materia';
  for (let i = 0; i < 5; i++) {
    const cand = i === 0 ? raiz : `${raiz}-${randomUUID().slice(0, 4)}`;
    const rows = await q<Row>(
      `SELECT 1 FROM materia WHERE editoria = $1 AND slug = $2 AND ($3::text IS NULL OR id <> $3) LIMIT 1`,
      [editoria, cand, excetoId ?? null],
    );
    if (rows.length === 0) return cand;
  }
  return `${raiz}-${randomUUID().slice(0, 8)}`;
}

// Migration 002 (aditiva) aplicada de forma PREGUIÇOSA e idempotente — só no caminho de
// correção, nunca nas queries públicas/normais. CREATE ... IF NOT EXISTS: seguro para
// re-executar; não dropa nada. Cacheado por instância de Lambda.
let _correcaoSchema: Promise<void> | null = null;
function ensureCorrecaoSchema(): Promise<void> {
  if (!_correcaoSchema) {
    _correcaoSchema = exec(`
      CREATE TABLE IF NOT EXISTS materia_correcao (
        draft_id  TEXT PRIMARY KEY REFERENCES materia(id) ON DELETE CASCADE,
        origem_id TEXT NOT NULL REFERENCES materia(id) ON DELETE CASCADE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_materia_correcao_origem ON materia_correcao (origem_id);
    `).catch((e) => {
      _correcaoSchema = null; // permite retry no próximo uso
      throw e;
    });
  }
  return _correcaoSchema;
}

export function createAuroraRepositories(): Repositories {
  return {
    materias: {
      async getById(id) {
        return getMateriaById(id);
      },
      async getBySlug(editoria, slug) {
        const rows = await q(`${MAT_SELECT} WHERE m.editoria = $1 AND m.slug = $2`, [editoria, slug]);
        return rows[0] ? mapMateria(rows[0]) : null;
      },
      async listByEditoria(editoria, opts) {
        const { page, pageSize, offset } = pageOf(opts);
        const rows = await q(
          `${MAT_SELECT.replace('FROM materia m', ', count(*) OVER() AS _total FROM materia m')}
           WHERE m.status = 'publicada' AND m.editoria = $1
           ORDER BY m.published_at DESC NULLS LAST
           LIMIT $2 OFFSET $3`,
          [editoria, pageSize, offset],
        );
        return { items: rows.map(mapMateria), page, pageSize, total: totalDe(rows) } as Paged<Materia>;
      },
      async listMaisLidas(limit = 5) {
        const rows = await q(
          `${MAT_SELECT} WHERE m.status = 'publicada' ORDER BY m.views DESC NULLS LAST LIMIT $1`,
          [limit],
        );
        return rows.map(mapMateria);
      },
      async listOpiniao(limit = 3) {
        const rows = await q(
          `${MAT_SELECT} WHERE m.status = 'publicada' AND m.editoria = 'opiniao'
           ORDER BY m.published_at DESC NULLS LAST LIMIT $1`,
          [limit],
        );
        return rows.map(mapMateria);
      },
      async listRelated(materiaId, limit = 3) {
        const rows = await q(
          `${MAT_SELECT}
           WHERE m.status = 'publicada' AND m.id <> $1
             AND m.editoria = (SELECT editoria FROM materia WHERE id = $1)
           ORDER BY m.published_at DESC NULLS LAST LIMIT $2`,
          [materiaId, limit],
        );
        return rows.map(mapMateria);
      },
      async listMinhas(autorId, status) {
        const rows = await q(
          `${MAT_SELECT}
           WHERE EXISTS (SELECT 1 FROM materia_autor ma WHERE ma.materia_id = m.id AND ma.author_id = $1)
             AND ($2::text IS NULL OR m.status = $2)
           ORDER BY m.updated_at DESC NULLS LAST`,
          [autorId, status ?? null],
        );
        return rows.map(mapMateria);
      },
      async listPendentes(opts) {
        const { page, pageSize, offset } = pageOf(opts);
        const rows = await q(
          `${MAT_SELECT.replace('FROM materia m', ', count(*) OVER() AS _total FROM materia m')}
           WHERE m.status = 'pendente'
           ORDER BY m.updated_at DESC NULLS LAST
           LIMIT $1 OFFSET $2`,
          [pageSize, offset],
        );
        return { items: rows.map(mapMateria), page, pageSize, total: totalDe(rows) } as Paged<Materia>;
      },
      async estatisticas() {
        const rows = await q<Row>(
          `SELECT count(*)::int AS publicadas,
                  COALESCE(SUM(views), 0)::bigint AS views,
                  COALESCE(SUM(cliques), 0)::bigint AS cliques
           FROM materia WHERE status = 'publicada'`,
        );
        const r = rows[0] ?? {};
        return {
          publicadas: Number(r.publicadas ?? 0),
          totalViews: Number(r.views ?? 0),
          totalCliques: Number(r.cliques ?? 0),
        };
      },
      async criar(input: CriarMateriaInput) {
        const id = nid('m');
        const slug = await slugUnico(input.editoria, input.titulo);
        return tx(async (c) => {
          // autor demo (o vínculo real cognito_sub → autor entra depois): 1º jornalista.
          const autorRows = (
            await c.query(`SELECT id FROM author WHERE papel = 'jornalista' ORDER BY id LIMIT 1`)
          ).rows as Row[];
          const autorId = autorRows[0] ? String(autorRows[0].id) : 'a-2';
          await c.query(
            `INSERT INTO materia (id, slug, editoria, titulo, standfirst, corpo, hero_image_url,
               hero_caption, tags, status, pauta_id, agendado_para, updated_at, views, cliques)
             VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,'rascunho',$10,$11, now(), 0, 0)`,
            [
              id,
              slug,
              input.editoria,
              input.titulo,
              input.standfirst,
              JSON.stringify(input.corpo ?? []),
              input.heroImageUrl ?? null,
              input.heroCaption ?? null,
              input.tags ?? [],
              input.pautaId ?? null,
              input.agendadoPara ?? null,
            ],
          );
          await c.query(
            `INSERT INTO materia_autor (materia_id, author_id, ordem) VALUES ($1,$2,0)`,
            [id, autorId],
          );
          const rows = (
            await c.query(`${MAT_SELECT} WHERE m.id = $1`, [id])
          ).rows as Row[];
          return mapMateria(rows[0]);
        });
      },
      async atualizar(id: string, input: Partial<CriarMateriaInput>) {
        const atual = await getMateriaById(id);
        if (!atual) throw new Error(`Matéria ${id} não encontrada`);
        if (!podeEditar(atual.status)) throw new Error(erroNaoEditavel(atual.status));
        const editoria = (input.editoria ?? atual.editoria) as EditoriaSlug;
        const slug = input.titulo ? await slugUnico(editoria, input.titulo, id) : atual.slug;
        await q(
          `UPDATE materia SET
             titulo = COALESCE($2, titulo),
             slug = $3,
             standfirst = COALESCE($4, standfirst),
             editoria = COALESCE($5, editoria),
             corpo = COALESCE($6::jsonb, corpo),
             tags = COALESCE($7, tags),
             hero_image_url = $8,
             hero_caption = $9,
             pauta_id = $10,
             agendado_para = $11,
             updated_at = now()
           WHERE id = $1`,
          [
            id,
            input.titulo ?? null,
            slug,
            input.standfirst ?? null,
            input.editoria ?? null,
            input.corpo ? JSON.stringify(input.corpo) : null,
            input.tags ?? null,
            input.heroImageUrl ?? null,
            input.heroCaption ?? null,
            input.pautaId ?? null,
            input.agendadoPara ?? null,
          ],
        );
        return (await getMateriaById(id))!;
      },
      async enviarParaRevisao(id: string) {
        const rows = await q<Row>(
          `SELECT ma.status, ma.editoria, COALESCE(mo.ativo, false) AS auto
           FROM materia ma LEFT JOIN modo_automatico mo ON mo.categoria = ma.editoria
           WHERE ma.id = $1`,
          [id],
        );
        if (!rows[0]) throw new Error(`Matéria ${id} não encontrada`);
        const status = String(rows[0].status) as StatusMateria;
        if (!podeEnviarParaRevisao(status)) throw new Error(erroNaoEditavel(status));
        const auto = rows[0].auto === true;
        if (auto) {
          await q(
            `UPDATE materia SET status='publicada', published_at=now(), updated_at=now() WHERE id=$1`,
            [id],
          );
        } else {
          await q(`UPDATE materia SET status='pendente', updated_at=now() WHERE id=$1`, [id]);
        }
        return (await getMateriaById(id))!;
      },
      async aprovar(id: string, revisorId: string, agendadoPara?: string) {
        await ensureCorrecaoSchema();
        // Draft de correção? aplica o conteúdo na ORIGEM (que segue publicada/no ar,
        // mesmo id e slug → URL preservada), arquiva o draft, registra revisão na origem.
        const linkRows = await q<Row>(
          `SELECT origem_id FROM materia_correcao WHERE draft_id = $1`,
          [id],
        );
        if (linkRows[0]) {
          const draft = await getMateriaById(id);
          if (!draft) throw new Error(`Matéria ${id} não encontrada`);
          if (!podeRevisar(draft.status)) {
            throw new Error('Só matérias pendentes podem ser aprovadas.');
          }
          const origemId = String(linkRows[0].origem_id);
          await tx(async (c) => {
            await c.query(
              `UPDATE materia SET titulo=$2, standfirst=$3, corpo=$4::jsonb, tags=$5,
                 hero_image_url=$6, hero_caption=$7, updated_at=now()
               WHERE id=$1`,
              [
                origemId, draft.titulo, draft.standfirst, JSON.stringify(draft.corpo),
                draft.tags, draft.heroImageUrl ?? null, draft.heroCaption ?? null,
              ],
            );
            await c.query(`UPDATE materia SET status='arquivada', updated_at=now() WHERE id=$1`, [id]);
            await c.query(
              `INSERT INTO revisao_materia (id, materia_id, revisor_id, decisao, criado_em)
               VALUES ($1,$2,$3,'aprovada', now())`,
              [nid('rev'), origemId, revisorId],
            );
          });
          const origem = await getMateriaById(origemId);
          if (!origem) throw new Error('Matéria de origem da correção não encontrada.');
          return origem;
        }
        const sql = agendadoPara
          ? `UPDATE materia SET status='aprovada', agendado_para=$2, updated_at=now()
             WHERE id=$1 AND status='pendente' RETURNING id`
          : `UPDATE materia SET status='publicada', published_at=now(), updated_at=now()
             WHERE id=$1 AND status='pendente' RETURNING id`;
        const upd = agendadoPara ? await q(sql, [id, agendadoPara]) : await q(sql, [id]);
        if (upd.length === 0) {
          const existe = await getMateriaById(id);
          if (!existe) throw new Error(`Matéria ${id} não encontrada`);
          throw new Error('Só matérias pendentes podem ser aprovadas.');
        }
        await q(
          `INSERT INTO revisao_materia (id, materia_id, revisor_id, decisao, criado_em)
           VALUES ($1,$2,$3,'aprovada', now())`,
          [nid('rev'), id, revisorId],
        );
        const m = await getMateriaById(id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        return m;
      },
      async recusar(id: string, revisorId: string, justificativa: string) {
        if (!justificativa || !justificativa.trim()) {
          throw new Error('Justificativa é obrigatória para recusar uma matéria.');
        }
        const upd = await q(
          `UPDATE materia SET status='recusada', updated_at=now()
           WHERE id=$1 AND status='pendente' RETURNING id`,
          [id],
        );
        if (upd.length === 0) {
          const existe = await getMateriaById(id);
          if (!existe) throw new Error(`Matéria ${id} não encontrada`);
          throw new Error('Só matérias pendentes podem ser recusadas.');
        }
        await q(
          `INSERT INTO revisao_materia (id, materia_id, revisor_id, decisao, justificativa, criado_em)
           VALUES ($1,$2,$3,'recusada',$4, now())`,
          [nid('rev'), id, revisorId, justificativa],
        );
        const m = await getMateriaById(id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        return m;
      },
      async listRevisoes(materiaId: string) {
        const rows = await q(
          `SELECT id, materia_id, revisor_id, decisao, justificativa, criado_em
           FROM revisao_materia WHERE materia_id = $1 ORDER BY criado_em DESC`,
          [materiaId],
        );
        return rows.map(mapRevisao) as RevisaoMateria[];
      },
      async reabrirParaCorrecao(origemId: string, autorId: string) {
        await ensureCorrecaoSchema();
        const origem = await getMateriaById(origemId);
        if (!origem) throw new Error(`Matéria ${origemId} não encontrada`);
        if (!podeReabrirParaCorrecao(origem.status)) {
          throw new Error('Só matérias publicadas podem ser reabertas para correção.');
        }
        // Reusa um draft de correção AINDA ABERTO (não arquivado) da mesma origem.
        const abertos = await q<Row>(
          `SELECT mc.draft_id FROM materia_correcao mc
           JOIN materia d ON d.id = mc.draft_id
           WHERE mc.origem_id = $1 AND d.status <> 'arquivada'
           ORDER BY mc.criado_em DESC LIMIT 1`,
          [origemId],
        );
        if (abertos[0]) {
          const existente = await getMateriaById(String(abertos[0].draft_id));
          if (existente) return existente;
        }
        const id = nid('m');
        // slug interno único (nunca servido: draft não é 'publicada').
        const slug = await slugUnico(origem.editoria, `${origem.titulo} correcao ${id}`);
        return tx(async (c) => {
          await c.query(
            `INSERT INTO materia (id, slug, editoria, titulo, standfirst, corpo, hero_image_url,
               hero_caption, tags, status, updated_at, views, cliques)
             VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,'rascunho', now(), 0, 0)`,
            [
              id, slug, origem.editoria, origem.titulo, origem.standfirst,
              JSON.stringify(origem.corpo ?? []), origem.heroImageUrl ?? null,
              origem.heroCaption ?? null, origem.tags,
            ],
          );
          await c.query(
            `INSERT INTO materia_autor (materia_id, author_id, ordem) VALUES ($1,$2,0)`,
            [id, autorId],
          );
          await c.query(
            `INSERT INTO materia_correcao (draft_id, origem_id) VALUES ($1,$2)`,
            [id, origemId],
          );
          const rows = (await c.query(`${MAT_SELECT} WHERE m.id = $1`, [id])).rows as Row[];
          return mapMateria(rows[0]);
        });
      },
    },

    pautas: {
      async listAbertas(autorId?: string) {
        const rows = await q(
          `${PAUTA_SELECT}
           WHERE p.status IN ('aberta','em_producao')
             AND ($1::text IS NULL OR EXISTS (
               SELECT 1 FROM pauta_atribuido pa WHERE pa.pauta_id = p.id AND pa.author_id = $1))
           ORDER BY p.criado_em DESC`,
          [autorId ?? null],
        );
        return rows.map(mapPauta);
      },
      async criar(input) {
        const id = nid('pt');
        await tx(async (c) => {
          await c.query(
            `INSERT INTO pauta (id, tema, descricao, categoria_sugerida, prioridade, prazo, status, criado_por, criado_em)
             VALUES ($1,$2,$3,$4,$5,$6,'aberta',$7, now())`,
            [
              id,
              input.tema,
              input.descricao,
              input.categoriaSugerida ?? null,
              input.prioridade,
              input.prazo ?? null,
              input.criadoPor,
            ],
          );
          for (const aid of input.atribuidos ?? []) {
            await c.query(
              `INSERT INTO pauta_atribuido (pauta_id, author_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
              [id, aid],
            );
          }
        });
        const rows = await q(`${PAUTA_SELECT} WHERE p.id = $1`, [id]);
        return mapPauta(rows[0]);
      },
      async atualizar(id: string, input: Partial<Pauta>) {
        await q(
          `UPDATE pauta SET
             tema = COALESCE($2, tema),
             descricao = COALESCE($3, descricao),
             categoria_sugerida = COALESCE($4, categoria_sugerida),
             prioridade = COALESCE($5, prioridade),
             prazo = COALESCE($6, prazo),
             status = COALESCE($7, status)
           WHERE id = $1`,
          [
            id,
            input.tema ?? null,
            input.descricao ?? null,
            input.categoriaSugerida ?? null,
            input.prioridade ?? null,
            input.prazo ?? null,
            input.status ?? null,
          ],
        );
        const rows = await q(`${PAUTA_SELECT} WHERE p.id = $1`, [id]);
        if (!rows[0]) throw new Error(`Pauta ${id} não encontrada`);
        return mapPauta(rows[0]);
      },
    },

    config: {
      async getModoAutomatico() {
        const rows = await q(
          `SELECT categoria, ativo, ativado_por, ativado_em FROM modo_automatico ORDER BY categoria`,
        );
        return rows.map(mapModo) as ModoAutomatico[];
      },
      async setModoAutomatico(categoria: EditoriaSlug, ativo: boolean, porId: string) {
        await q(
          `INSERT INTO modo_automatico (categoria, ativo, ativado_por, ativado_em)
           VALUES ($1,$2,$3, now())
           ON CONFLICT (categoria) DO UPDATE SET ativo = EXCLUDED.ativo,
             ativado_por = EXCLUDED.ativado_por, ativado_em = EXCLUDED.ativado_em`,
          [categoria, ativo, porId],
        );
      },
    },

    media: {
      async getById(id: string) {
        const rows = await q(`${MEDIA_SELECT} WHERE me.id = $1`, [id]);
        return rows[0] ? mapMedia(rows[0]) : null;
      },
      async listByTipo(tipo: MediaTipo, opts?: PageOpts) {
        const { page, pageSize, offset } = pageOf(opts);
        const rows = await q(
          `${MEDIA_SELECT.replace('FROM media me', ', count(*) OVER() AS _total FROM media me')}
           WHERE me.tipo = $1 AND me.visibilidade = 'publico' AND me.status = 'pronto'
           ORDER BY me.published_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
          [tipo, pageSize, offset],
        );
        return { items: rows.map(mapMedia), page, pageSize, total: totalDe(rows) } as Paged<Media>;
      },
      async listByEditoria(editoria: EditoriaSlug, opts?: PageOpts) {
        const { page, pageSize, offset } = pageOf(opts);
        const rows = await q(
          `${MEDIA_SELECT.replace('FROM media me', ', count(*) OVER() AS _total FROM media me')}
           WHERE me.editoria = $1 AND me.visibilidade = 'publico'
           ORDER BY me.published_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
          [editoria, pageSize, offset],
        );
        return { items: rows.map(mapMedia), page, pageSize, total: totalDe(rows) } as Paged<Media>;
      },
      async getLiveDestaque() {
        const rows = await q(
          `${MEDIA_SELECT} WHERE me.tipo = 'live' AND me.destaque = true AND me.status = 'pronto' LIMIT 1`,
        );
        return rows[0] ? mapMedia(rows[0]) : null;
      },
      async listPlayShelf() {
        const pls = await q<Row>(`SELECT id, titulo FROM playlist ORDER BY id`);
        const out: Playlist[] = [];
        for (const pl of pls) {
          const itens = await q(
            `${MEDIA_SELECT} JOIN playlist_item pi ON pi.media_id = me.id
             WHERE pi.playlist_id = $1 ORDER BY pi.ordem`,
            [pl.id],
          );
          out.push({ id: String(pl.id), titulo: String(pl.titulo), itens: itens.map(mapMedia) });
        }
        return out;
      },
      async listCortes(opts?: PageOpts) {
        const { page, pageSize, offset } = pageOf(opts);
        const rows = await q(
          `${MEDIA_SELECT.replace('FROM media me', ', count(*) OVER() AS _total FROM media me')}
           WHERE me.tipo = 'short' AND me.status = 'pronto'
           ORDER BY me.published_at DESC NULLS LAST LIMIT $1 OFFSET $2`,
          [pageSize, offset],
        );
        return { items: rows.map(mapMedia), page, pageSize, total: totalDe(rows) } as Paged<Media>;
      },
      async getNext(id: string, limit = 4) {
        const rows = await q(
          `${MEDIA_SELECT}
           WHERE me.id <> $1 AND me.status = 'pronto' AND me.tipo <> 'live'
           ORDER BY (me.editoria = (SELECT editoria FROM media WHERE id = $1)) DESC,
                    me.published_at DESC NULLS LAST
           LIMIT $2`,
          [id, limit],
        );
        return rows.map(mapMedia);
      },
      async criarUpload(input: CreateMediaInput, opts: { id: string; autorId: string }) {
        const id = opts.id;
        await q(
          `INSERT INTO media (id, tipo, titulo, descricao, editoria, autor_id, cover_url,
             published_at, visibilidade, agendado_para, destaque, transcricao, legendas_vtt,
             status, views, likes, s3_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7, now(), $8,$9,$10,$11,$12,'processando',0,0,$13)`,
          [
            id,
            input.tipo,
            input.titulo,
            input.descricao ?? null,
            input.editoria,
            opts.autorId,
            input.coverUrl ?? null,
            input.visibilidade,
            input.agendadoPara ?? null,
            input.destaque,
            input.transcricaoAuto,
            input.gerarLegendasVTT,
            input.uploadKey ?? null,
          ],
        );
        const rows = await q(`${MEDIA_SELECT} WHERE me.id = $1`, [id]);
        return mapMedia(rows[0]);
      },
    },

    ads: {
      async servir(slot: AdSlotId) {
        const rows = await q(
          `SELECT id, campanha_id, slot, tipo_midia, asset_url, link_destino, peso, ativo, impressoes, cliques
           FROM ad_creative WHERE slot = $1 AND ativo = true ORDER BY peso DESC LIMIT 1`,
          [slot],
        );
        return rows[0] ? mapAdCreative(rows[0]) : null;
      },
      async registrarImpressao(creativeId: string) {
        await q(`UPDATE ad_creative SET impressoes = impressoes + 1 WHERE id = $1`, [creativeId]);
      },
      async registrarClique(creativeId: string) {
        await q(`UPDATE ad_creative SET cliques = cliques + 1 WHERE id = $1`, [creativeId]);
      },
      async listCampanhas() {
        const rows = await q(
          `SELECT id, nome, anunciante, inicio, fim, status, ativado_por FROM ad_campaign ORDER BY inicio DESC NULLS LAST`,
        );
        return rows.map(mapAdCampaign) as AdCampaign[];
      },
      async upsertCampanha(c: AdCampaign) {
        await q(
          `INSERT INTO ad_campaign (id, nome, anunciante, inicio, fim, status, ativado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome, anunciante=EXCLUDED.anunciante,
             inicio=EXCLUDED.inicio, fim=EXCLUDED.fim, status=EXCLUDED.status, ativado_por=EXCLUDED.ativado_por`,
          [c.id, c.nome, c.anunciante, c.inicio, c.fim, c.status, c.ativadoPor],
        );
        return c;
      },
      async upsertCriativo(c: AdCreative) {
        await q(
          `INSERT INTO ad_creative (id, campanha_id, slot, tipo_midia, asset_url, link_destino, peso, ativo, impressoes, cliques)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET campanha_id=EXCLUDED.campanha_id, slot=EXCLUDED.slot,
             tipo_midia=EXCLUDED.tipo_midia, asset_url=EXCLUDED.asset_url, link_destino=EXCLUDED.link_destino,
             peso=EXCLUDED.peso, ativo=EXCLUDED.ativo`,
          [c.id, c.campanhaId, c.slot, c.tipoMidia, c.assetUrl, c.linkDestino, c.peso, c.ativo, c.impressoes ?? 0, c.cliques ?? 0],
        );
        return c;
      },
      async metricas(_opts: RelatorioOpts): Promise<AdMetrics[]> {
        const rows = await q<Row>(
          `SELECT id, campanha_id, slot, impressoes, cliques FROM ad_creative`,
        );
        return rows.map((r) => {
          const impressoes = Number(r.impressoes ?? 0);
          const cliques = Number(r.cliques ?? 0);
          return {
            creativeId: String(r.id),
            campanhaId: String(r.campanha_id),
            slot: String(r.slot) as AdSlotId,
            impressoes,
            cliques,
            ctr: impressoes > 0 ? cliques / impressoes : 0,
          };
        });
      },
    },

    analytics: {
      async ingest(evt: Omit<EventoAnalytics, 'id' | 'criadoEm'>) {
        await q(
          `INSERT INTO evento_analytics (id, tipo, entidade, entidade_id, categoria, autor_id, path, referrer, sessao_hash, dispositivo, criado_em)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())`,
          [
            nid('evt'),
            evt.tipo,
            evt.entidade,
            evt.entidadeId,
            evt.categoria ?? null,
            evt.autorId ?? null,
            evt.path,
            evt.referrer ?? null,
            evt.sessaoHash,
            evt.dispositivo,
          ],
        );
      },
      async relatorio(opts: RelatorioOpts): Promise<RelatorioResultado> {
        const rows = await q<Row>(
          `SELECT id, titulo, editoria, views, cliques FROM materia
           WHERE status = 'publicada' AND ($1::text IS NULL OR editoria = $1)
           ORDER BY views DESC NULLS LAST`,
          [opts.categoria ?? null],
        );
        const linhas = rows.map((r) => ({
          entidadeId: String(r.id),
          rotulo: String(r.titulo),
          categoria: String(r.editoria) as EditoriaSlug,
          views: Number(r.views ?? 0),
          cliques: Number(r.cliques ?? 0),
        }));
        return {
          de: opts.de,
          ate: opts.ate,
          totalViews: linhas.reduce((s, l) => s + l.views, 0),
          totalCliques: linhas.reduce((s, l) => s + l.cliques, 0),
          linhas,
        };
      },
    },

    editorias: {
      async list(): Promise<Editoria[]> {
        const rows = await q(`SELECT slug, nome, descricao FROM editoria ORDER BY slug`);
        return rows.map(mapEditoria);
      },
      async get(slug: EditoriaSlug) {
        const rows = await q(`SELECT slug, nome, descricao FROM editoria WHERE slug = $1`, [slug]);
        return rows[0] ? mapEditoria(rows[0]) : null;
      },
    },

    authors: {
      async getById(id: string) {
        const rows = await q(
          `SELECT id, nome, bio, avatar_url, papel FROM author WHERE id = $1`,
          [id],
        );
        return rows[0] ? mapAuthor(rows[0]) : null;
      },
    },
  } satisfies Repositories;
}
