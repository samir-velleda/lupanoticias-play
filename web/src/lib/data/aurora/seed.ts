/**
 * Seed inicial a partir do mock — preserva Home/Play ao ligar Aurora.
 * Roda só se `editoria` estiver vazia (idempotente).
 */
import { query, withClient } from './client';
import {
  authors,
  editorias,
  materias,
  medias,
  modoAutomatico,
  pautas,
  playlists,
} from '../mock/data';

export async function seedIfEmpty(): Promise<void> {
  const { rows } = await query<{ n: string }>('SELECT COUNT(*)::text AS n FROM editoria');
  if (Number(rows[0]?.n ?? 0) > 0) return;

  await withClient(async (c) => {
    await c.query('BEGIN');
    try {
      for (const e of editorias) {
        await c.query(
          `INSERT INTO editoria (slug, nome, descricao) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [e.slug, e.nome, e.descricao],
        );
      }
      for (const a of authors) {
        await c.query(
          `INSERT INTO author (id, nome, bio, avatar_url, papel, cognito_sub)
           VALUES ($1,$2,$3,$4,$5,NULL) ON CONFLICT (id) DO NOTHING`,
          [a.id, a.nome, a.bio ?? null, a.avatarUrl ?? null, a.papel],
        );
      }
      for (const m of modoAutomatico) {
        await c.query(
          `INSERT INTO modo_automatico (categoria, ativo, ativado_por, ativado_em)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [m.categoria, m.ativo, m.ativadoPor ?? null, m.ativadoEm ?? null],
        );
      }
      for (const p of pautas) {
        await c.query(
          `INSERT INTO pauta (id, tema, descricao, categoria_sugerida, prioridade, prazo, status, criado_por, criado_em)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
          [
            p.id,
            p.tema,
            p.descricao,
            p.categoriaSugerida ?? null,
            p.prioridade,
            p.prazo ?? null,
            p.status,
            p.criadoPor,
            p.criadoEm,
          ],
        );
        for (const aid of p.atribuidos) {
          await c.query(
            `INSERT INTO pauta_atribuido (pauta_id, author_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [p.id, aid],
          );
        }
      }
      for (const m of materias) {
        await c.query(
          `INSERT INTO materia (
             id, slug, editoria, titulo, standfirst, corpo, hero_image_url, hero_caption,
             tags, status, pauta_id, published_at, updated_at, agendado_para, reading_minutes,
             related_media_id, views, cliques
           ) VALUES (
             $1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
           ) ON CONFLICT DO NOTHING`,
          [
            m.id,
            m.slug,
            m.editoria,
            m.titulo,
            m.standfirst,
            JSON.stringify(m.corpo),
            m.heroImageUrl ?? null,
            m.heroCaption ?? null,
            m.tags,
            m.status,
            m.pautaId ?? null,
            m.publishedAt ?? null,
            m.updatedAt ?? null,
            m.agendadoPara ?? null,
            m.readingMinutes ?? null,
            m.relatedMediaId ?? null,
            m.views ?? 0,
            m.cliques ?? 0,
          ],
        );
        for (const a of m.autores) {
          await c.query(
            `INSERT INTO materia_autor (materia_id, author_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [m.id, a.id],
          );
        }
      }
      for (const m of medias) {
        await c.query(
          `INSERT INTO media (
             id, tipo, titulo, descricao, editoria, autor_id, playback_url, cover_url,
             duracao_seg, published_at, visibilidade, agendado_para, destaque, transcricao,
             legendas_vtt, status, views, likes, live_viewers
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
           ) ON CONFLICT DO NOTHING`,
          [
            m.id,
            m.tipo,
            m.titulo,
            m.descricao ?? null,
            m.editoria,
            m.autor?.id ?? null,
            m.playbackUrl ?? null,
            m.coverUrl ?? null,
            m.duracaoSeg ?? null,
            m.publishedAt,
            m.visibilidade,
            m.agendadoPara ?? null,
            m.destaque,
            m.transcricao ?? null,
            m.legendasVTT ?? null,
            m.status,
            m.views ?? 0,
            m.likes ?? 0,
            m.liveViewers ?? 0,
          ],
        );
      }
      for (const pl of playlists) {
        await c.query(
          `INSERT INTO playlist (id, titulo) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [pl.id, pl.titulo],
        );
        for (let i = 0; i < pl.itens.length; i++) {
          await c.query(
            `INSERT INTO playlist_item (playlist_id, media_id, ordem) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [pl.id, pl.itens[i].id, i],
          );
        }
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    }
  });
}
