/**
 * Desapegoo em Aurora (produção) — só tabelas lupa desapego_*.
 */
import { randomUUID } from 'crypto';
import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoCategoria,
  DesapegoEstadoItem,
  DesapegoAnuncioStatus,
  DesapegoVendedor,
} from '@/types/desapego';
import { ensureSchema, query, withClient } from '../aurora/client';
import { desapegoAnunciosSeed, desapegoVendedores } from './seed';
import type { DesapegoRepository, ListarAnunciosOpts } from './types';

type VendedorRow = {
  id: string;
  slug: string;
  nome: string;
  iniciais: string;
  cidade: string | null;
  uf: string | null;
  nota: number | null;
  vendas: number;
  bio: string | null;
  desde: Date | string | null;
};

type AnuncioRow = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  categoria: string;
  estado: string;
  preco_centavos: number;
  preco_antigo_centavos: number | null;
  fotos: string[] | string;
  frete_gratis: boolean;
  status: string;
  vendedor_id: string;
  cidade_id: string | null;
  placeholder_bg: string | null;
  placeholder_fg: string | null;
  criado_em: Date | string;
  atualizado_em: Date | string | null;
};

const iso = (v: Date | string | null | undefined): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'anuncio';

function mapVendedor(r: VendedorRow): DesapegoVendedor {
  return {
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    iniciais: r.iniciais || r.nome.slice(0, 2).toUpperCase(),
    cidade: r.cidade ?? undefined,
    uf: r.uf ?? undefined,
    nota: r.nota ?? undefined,
    vendas: r.vendas ?? 0,
    bio: r.bio ?? undefined,
    desde: r.desde
      ? typeof r.desde === 'string'
        ? r.desde.slice(0, 10)
        : r.desde.toISOString().slice(0, 10)
      : undefined,
  };
}

function parseFotos(f: string[] | string): string[] {
  if (Array.isArray(f)) return f;
  try {
    const p = JSON.parse(f) as string[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function mapAnuncio(r: AnuncioRow, v: DesapegoVendedor): DesapegoAnuncio {
  return {
    id: r.id,
    slug: r.slug,
    titulo: r.titulo,
    descricao: r.descricao ?? '',
    categoria: r.categoria as DesapegoCategoria,
    estado: r.estado as DesapegoEstadoItem,
    precoCentavos: Number(r.preco_centavos),
    precoAntigoCentavos: r.preco_antigo_centavos
      ? Number(r.preco_antigo_centavos)
      : undefined,
    fotos: parseFotos(r.fotos),
    freteGratis: !!r.frete_gratis,
    status: r.status as DesapegoAnuncioStatus,
    vendedor: v,
    cidadeId: r.cidade_id ?? undefined,
    placeholderBg: r.placeholder_bg ?? undefined,
    placeholderFg: r.placeholder_fg ?? undefined,
    criadoEm: iso(r.criado_em) ?? new Date().toISOString(),
    atualizadoEm: iso(r.atualizado_em),
  };
}

async function getVendedorById(id: string): Promise<DesapegoVendedor | null> {
  const { rows } = await query<VendedorRow>(`SELECT * FROM desapego_vendedor WHERE id = $1`, [id]);
  return rows[0] ? mapVendedor(rows[0]) : null;
}

async function uniqueAnuncioSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  for (;;) {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM desapego_anuncio WHERE slug = $1`,
      [slug],
    );
    if (!rows[0]) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function uniqueVendedorSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  for (;;) {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM desapego_vendedor WHERE slug = $1`,
      [slug],
    );
    if (!rows[0]) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function seedIfEmpty(): Promise<void> {
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM desapego_anuncio`,
  );
  if (Number(rows[0]?.n ?? 0) > 0) return;

  await withClient(async (c) => {
    await c.query('BEGIN');
    try {
      for (const v of desapegoVendedores) {
        await c.query(
          `INSERT INTO desapego_vendedor (id, slug, nome, iniciais, cidade, uf, nota, vendas, bio, desde)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [
            v.id,
            v.slug,
            v.nome,
            v.iniciais,
            v.cidade ?? null,
            v.uf ?? null,
            v.nota ?? null,
            v.vendas ?? 0,
            v.bio ?? null,
            v.desde ?? null,
          ],
        );
      }
      for (const a of desapegoAnunciosSeed) {
        await c.query(
          `INSERT INTO desapego_anuncio (
             id, slug, titulo, descricao, categoria, estado, preco_centavos, preco_antigo_centavos,
             fotos, frete_gratis, status, vendedor_id, cidade_id, placeholder_bg, placeholder_fg, criado_em
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [
            a.id,
            a.slug,
            a.titulo,
            a.descricao,
            a.categoria,
            a.estado,
            a.precoCentavos,
            a.precoAntigoCentavos ?? null,
            JSON.stringify(a.fotos),
            a.freteGratis,
            a.status,
            a.vendedor.id,
            a.cidadeId ?? null,
            a.placeholderBg ?? null,
            a.placeholderFg ?? null,
            a.criadoEm,
          ],
        );
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    }
  });
}

export function createAuroraDesapegoRepo(): DesapegoRepository {
  const ready = async () => {
    await ensureSchema();
    await seedIfEmpty();
  };

  return {
    async listAnuncios(opts: ListarAnunciosOpts = {}) {
      await ready();
      const params: unknown[] = [];
      let sql = `SELECT a.*, v.id AS v_id, v.slug AS v_slug, v.nome AS v_nome, v.iniciais AS v_iniciais,
                        v.cidade AS v_cidade, v.uf AS v_uf, v.nota AS v_nota, v.vendas AS v_vendas,
                        v.bio AS v_bio, v.desde AS v_desde
                 FROM desapego_anuncio a
                 INNER JOIN desapego_vendedor v ON v.id = a.vendedor_id
                 WHERE a.status IN ('ativo','reservado')`;
      if (opts.categoria) {
        params.push(opts.categoria);
        sql += ` AND a.categoria = $${params.length}`;
      }
      if (opts.vendedorSlug) {
        params.push(opts.vendedorSlug);
        sql += ` AND v.slug = $${params.length}`;
      }
      if (opts.cidadeId) {
        params.push(opts.cidadeId);
        sql += ` AND a.cidade_id = $${params.length}`;
      }
      if (opts.q?.trim()) {
        params.push(`%${opts.q.trim().toLowerCase()}%`);
        sql += ` AND (LOWER(a.titulo) LIKE $${params.length} OR LOWER(a.descricao) LIKE $${params.length} OR LOWER(v.nome) LIKE $${params.length})`;
      }
      sql += ` ORDER BY a.criado_em DESC`;
      if (opts.limit) {
        params.push(opts.limit);
        sql += ` LIMIT $${params.length}`;
      }
      const { rows } = await query<
        AnuncioRow & {
          v_id: string;
          v_slug: string;
          v_nome: string;
          v_iniciais: string;
          v_cidade: string | null;
          v_uf: string | null;
          v_nota: number | null;
          v_vendas: number;
          v_bio: string | null;
          v_desde: Date | string | null;
        }
      >(sql, params);
      return rows.map((r) =>
        mapAnuncio(r, {
          id: r.v_id,
          slug: r.v_slug,
          nome: r.v_nome,
          iniciais: r.v_iniciais,
          cidade: r.v_cidade ?? undefined,
          uf: r.v_uf ?? undefined,
          nota: r.v_nota ?? undefined,
          vendas: r.v_vendas,
          bio: r.v_bio ?? undefined,
          desde: r.v_desde
            ? typeof r.v_desde === 'string'
              ? r.v_desde.slice(0, 10)
              : r.v_desde.toISOString().slice(0, 10)
            : undefined,
        }),
      );
    },

    async getById(id) {
      await ready();
      const { rows } = await query<AnuncioRow>(`SELECT * FROM desapego_anuncio WHERE id = $1`, [
        id,
      ]);
      if (!rows[0]) return null;
      const v = await getVendedorById(rows[0].vendedor_id);
      if (!v) return null;
      return mapAnuncio(rows[0], v);
    },

    async getBySlug(slug) {
      await ready();
      const { rows } = await query<AnuncioRow>(`SELECT * FROM desapego_anuncio WHERE slug = $1`, [
        slug,
      ]);
      if (!rows[0]) return null;
      const v = await getVendedorById(rows[0].vendedor_id);
      if (!v) return null;
      return mapAnuncio(rows[0], v);
    },

    async getVendedorBySlug(slug) {
      await ready();
      const { rows } = await query<VendedorRow>(
        `SELECT * FROM desapego_vendedor WHERE slug = $1`,
        [slug],
      );
      return rows[0] ? mapVendedor(rows[0]) : null;
    },

    async listVendedores() {
      await ready();
      const { rows } = await query<VendedorRow>(
        `SELECT * FROM desapego_vendedor ORDER BY nome`,
      );
      return rows.map(mapVendedor);
    },

    async criar(input: CriarDesapegoAnuncioInput) {
      await ready();
      const agora = new Date().toISOString();
      let vendedorId = input.vendedorId;
      let vendedor: DesapegoVendedor | null = null;

      if (vendedorId) {
        vendedor = await getVendedorById(vendedorId);
      }

      if (!vendedor && input.vendedorNome?.trim()) {
        const nome = input.vendedorNome.trim();
        const slugBase = slugify(nome);
        const { rows: existing } = await query<VendedorRow>(
          `SELECT * FROM desapego_vendedor WHERE slug = $1 OR LOWER(nome) = LOWER($2) LIMIT 1`,
          [slugBase, nome],
        );
        if (existing[0]) {
          vendedor = mapVendedor(existing[0]);
          vendedorId = vendedor.id;
        } else {
          const parts = nome.split(/\s+/);
          const iniciais =
            parts.length >= 2
              ? `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
              : nome.slice(0, 2).toUpperCase();
          vendedorId = `dv-${randomUUID().slice(0, 8)}`;
          const slug = await uniqueVendedorSlug(slugBase);
          await query(
            `INSERT INTO desapego_vendedor (id, slug, nome, iniciais, nota, vendas, desde)
             VALUES ($1,$2,$3,$4,5,0,$5)`,
            [vendedorId, slug, nome, iniciais, agora.slice(0, 10)],
          );
          vendedor = await getVendedorById(vendedorId);
        }
      }

      if (!vendedor) {
        // Default: primeiro seed ou cria genérico
        const list = await this.listVendedores();
        if (list[0]) {
          vendedor = list[0];
          vendedorId = list[0].id;
        } else {
          vendedorId = `dv-${randomUUID().slice(0, 8)}`;
          await query(
            `INSERT INTO desapego_vendedor (id, slug, nome, iniciais, nota, vendas, desde)
             VALUES ($1,'redacao-lupa','Redação Lupa','RL',5,0,$2)`,
            [vendedorId, agora.slice(0, 10)],
          );
          vendedor = await getVendedorById(vendedorId);
        }
      }

      if (!vendedor || !vendedorId) throw new Error('Vendedor indisponível');

      const id = `da-${randomUUID()}`;
      const slug = await uniqueAnuncioSlug(slugify(input.titulo));
      await query(
        `INSERT INTO desapego_anuncio (
           id, slug, titulo, descricao, categoria, estado, preco_centavos, preco_antigo_centavos,
           fotos, frete_gratis, status, vendedor_id, cidade_id, placeholder_bg, placeholder_fg, criado_em
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,'ativo',$11,$12,$13,$14,$15)`,
        [
          id,
          slug,
          input.titulo.trim(),
          input.descricao.trim(),
          input.categoria,
          input.estado,
          input.precoCentavos,
          input.precoAntigoCentavos ?? null,
          JSON.stringify(input.fotos.filter(Boolean)),
          input.freteGratis ?? false,
          vendedorId,
          input.cidadeId ?? 'cid-matriz',
          '#FBE6DC',
          '#C63D1B',
          agora,
        ],
      );
      const created = await this.getById(id);
      if (!created) throw new Error('Falha ao criar anúncio');
      return created;
    },
  };
}
