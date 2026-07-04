import 'server-only';
import type { PoolClient } from 'pg';
import {
  adCampaigns,
  adCreatives,
  authors,
  editorias,
  materias,
  medias,
  modoAutomatico,
  pautas,
  playlists,
} from '../mock/data';

/**
 * Seed pt-BR idempotente (ON CONFLICT DO NOTHING) — mesmo conteúdo do mock/data.ts.
 * Roda dentro de uma transação, na ordem das FKs. Nunca sobrescreve nem deleta.
 */
export async function seedInicial(c: PoolClient): Promise<Record<string, number>> {
  for (const e of editorias) {
    await c.query(
      `INSERT INTO editoria (slug, nome, descricao) VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING`,
      [e.slug, e.nome, e.descricao],
    );
  }
  for (const a of authors) {
    await c.query(
      `INSERT INTO author (id, nome, bio, avatar_url, papel) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [a.id, a.nome, a.bio ?? null, a.avatarUrl ?? null, a.papel],
    );
  }
  for (const p of pautas) {
    await c.query(
      `INSERT INTO pauta (id, tema, descricao, categoria_sugerida, prioridade, prazo, status, criado_por, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.tema, p.descricao, p.categoriaSugerida ?? null, p.prioridade, p.prazo ?? null, p.status, p.criadoPor, p.criadoEm],
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
      `INSERT INTO materia (id, slug, editoria, titulo, standfirst, corpo, hero_image_url, hero_caption,
         tags, status, pauta_id, published_at, updated_at, agendado_para, reading_minutes, related_media_id, views, cliques)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO NOTHING`,
      [
        m.id, m.slug, m.editoria, m.titulo, m.standfirst, JSON.stringify(m.corpo),
        m.heroImageUrl ?? null, m.heroCaption ?? null, m.tags, m.status, m.pautaId ?? null,
        m.publishedAt ?? null, m.updatedAt ?? null, m.agendadoPara ?? null,
        m.readingMinutes ?? null, m.relatedMediaId ?? null, m.views ?? 0, m.cliques ?? 0,
      ],
    );
    for (let i = 0; i < m.autores.length; i++) {
      await c.query(
        `INSERT INTO materia_autor (materia_id, author_id, ordem) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [m.id, m.autores[i].id, i],
      );
    }
  }
  for (const mo of modoAutomatico) {
    await c.query(
      `INSERT INTO modo_automatico (categoria, ativo, ativado_por, ativado_em) VALUES ($1,$2,$3,$4)
       ON CONFLICT (categoria) DO NOTHING`,
      [mo.categoria, mo.ativo, mo.ativadoPor ?? null, mo.ativadoEm ?? null],
    );
  }
  for (const me of medias) {
    await c.query(
      `INSERT INTO media (id, tipo, titulo, descricao, editoria, autor_id, playback_url, cover_url,
         duracao_seg, published_at, visibilidade, agendado_para, destaque, transcricao, legendas_vtt,
         status, views, likes, live_viewers)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (id) DO NOTHING`,
      [
        me.id, me.tipo, me.titulo, me.descricao ?? null, me.editoria, me.autor?.id ?? null,
        me.playbackUrl ?? null, me.coverUrl ?? null, me.duracaoSeg ?? null, me.publishedAt,
        me.visibilidade, me.agendadoPara ?? null, me.destaque, me.transcricao ?? null,
        me.legendasVTT ?? null, me.status, me.views ?? 0, me.likes ?? 0, me.liveViewers ?? null,
      ],
    );
  }
  for (const pl of playlists) {
    await c.query(`INSERT INTO playlist (id, titulo) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`, [pl.id, pl.titulo]);
    for (let i = 0; i < pl.itens.length; i++) {
      await c.query(
        `INSERT INTO playlist_item (playlist_id, media_id, ordem) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [pl.id, pl.itens[i].id, i],
      );
    }
  }
  for (const cmp of adCampaigns) {
    await c.query(
      `INSERT INTO ad_campaign (id, nome, anunciante, inicio, fim, status, ativado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [cmp.id, cmp.nome, cmp.anunciante, cmp.inicio, cmp.fim, cmp.status, cmp.ativadoPor],
    );
  }
  for (const cr of adCreatives) {
    await c.query(
      `INSERT INTO ad_creative (id, campanha_id, slot, tipo_midia, asset_url, link_destino, peso, ativo, impressoes, cliques)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [cr.id, cr.campanhaId, cr.slot, cr.tipoMidia, cr.assetUrl, cr.linkDestino, cr.peso, cr.ativo, cr.impressoes ?? 0, cr.cliques ?? 0],
    );
  }

  const counts: Record<string, number> = {};
  for (const t of ['editoria', 'author', 'materia', 'media', 'pauta', 'modo_automatico', 'ad_creative']) {
    const r = await c.query(`SELECT count(*)::int AS n FROM ${t}`);
    counts[t] = Number(r.rows[0].n);
  }
  return counts;
}
