/**
 * Desapegoo em Aurora (produção) — só tabelas lupa desapego_*.
 */
import { randomUUID } from 'crypto';
import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoCashout,
  DesapegoCategoria,
  DesapegoEstadoItem,
  DesapegoAnuncioStatus,
  DesapegoKycStatus,
  DesapegoPedido,
  DesapegoPedidoStatus,
  DesapegoVendedor,
  DesapegoWallet,
  SalvarKycInput,
} from '@/types/desapego';
import { calcularTaxaELiquido } from '@/types/desapego';
import { ensureSchema, query, withClient } from '../aurora/client';
import { desapegoAnunciosSeed, desapegoVendedores } from './seed';
import type {
  CriarPedidoInput,
  DesapegoRepository,
  EnsureVendedorInput,
  ListarAnunciosOpts,
  SolicitarCashoutInput,
} from './types';

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
  cognito_sub: string | null;
  email: string | null;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  chave_pix: string | null;
  kyc_status: string | null;
  kyc_atualizado_em: Date | string | null;
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
    cognitoSub: r.cognito_sub ?? undefined,
    email: r.email ?? undefined,
    nomeCompleto: r.nome_completo ?? undefined,
    cpf: r.cpf ?? undefined,
    telefone: r.telefone ?? undefined,
    chavePix: r.chave_pix ?? undefined,
    kycStatus: (r.kyc_status as DesapegoKycStatus) || 'incompleto',
    kycAtualizadoEm: iso(r.kyc_atualizado_em),
  };
}

function iniciaisDe(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return nome.slice(0, 2).toUpperCase() || 'XX';
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
          `INSERT INTO desapego_vendedor (
             id, slug, nome, iniciais, cidade, uf, nota, vendas, bio, desde,
             cognito_sub, email, nome_completo, cpf, telefone, chave_pix, kyc_status
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (id) DO NOTHING`,
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
            v.cognitoSub ?? null,
            v.email ?? null,
            v.nomeCompleto ?? null,
            v.cpf ?? null,
            v.telefone ?? null,
            v.chavePix ?? null,
            v.kycStatus ?? 'aprovado',
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
                        v.bio AS v_bio, v.desde AS v_desde, v.kyc_status AS v_kyc_status
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
          v_kyc_status: string | null;
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
          // Não expõe CPF/Pix na listagem pública
          kycStatus: (r.v_kyc_status as DesapegoKycStatus) || 'incompleto',
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

    async getVendedorByCognitoSub(sub) {
      await ready();
      const { rows } = await query<VendedorRow>(
        `SELECT * FROM desapego_vendedor WHERE cognito_sub = $1`,
        [sub],
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

    async ensureVendedorFromCognito(input: EnsureVendedorInput) {
      await ready();
      const existing = await this.getVendedorByCognitoSub(input.cognitoSub);
      if (existing) {
        if (input.email && !existing.email) {
          await query(`UPDATE desapego_vendedor SET email = $2 WHERE id = $1`, [
            existing.id,
            input.email,
          ]);
          return (await this.getVendedorByCognitoSub(input.cognitoSub))!;
        }
        return existing;
      }
      const nome = input.nome?.trim() || input.email?.split('@')[0] || 'Minha lojinha';
      const lojaNome = nome.toLowerCase().includes('lojinha') ? nome : `lojinha de ${nome}`;
      const id = `dv-${randomUUID().slice(0, 8)}`;
      const slug = await uniqueVendedorSlug(slugify(lojaNome));
      const agora = new Date().toISOString().slice(0, 10);
      await query(
        `INSERT INTO desapego_vendedor (
           id, slug, nome, iniciais, email, cognito_sub, nota, vendas, desde, kyc_status
         ) VALUES ($1,$2,$3,$4,$5,$6,5,0,$7,'incompleto')`,
        [id, slug, lojaNome, iniciaisDe(nome), input.email ?? null, input.cognitoSub, agora],
      );
      const v = await this.getVendedorByCognitoSub(input.cognitoSub);
      if (!v) throw new Error('Falha ao criar lojinha');
      return v;
    },

    async salvarKyc(cognitoSub: string, input: SalvarKycInput) {
      await ready();
      let v = await this.getVendedorByCognitoSub(cognitoSub);
      if (!v) {
        v = await this.ensureVendedorFromCognito({
          cognitoSub,
          nome: input.nomeLojinha,
        });
      }
      const slugBase = slugify(input.nomeLojinha);
      let slug = v.slug;
      const { rows: conflict } = await query<{ id: string }>(
        `SELECT id FROM desapego_vendedor WHERE slug = $1 AND id <> $2`,
        [slugBase, v.id],
      );
      if (!conflict[0]) slug = slugBase;

      const agora = new Date().toISOString();
      await query(
        `UPDATE desapego_vendedor SET
           nome = $2, slug = $3, nome_completo = $4, cpf = $5, telefone = $6, chave_pix = $7,
           cidade = COALESCE($8, cidade), uf = COALESCE($9, uf), bio = COALESCE($10, bio),
           iniciais = $11, kyc_status = 'aprovado', kyc_atualizado_em = $12
         WHERE id = $1`,
        [
          v.id,
          input.nomeLojinha.trim(),
          slug,
          input.nomeCompleto.trim(),
          input.cpf.replace(/\D/g, ''),
          input.telefone.replace(/\D/g, ''),
          input.chavePix.trim(),
          input.cidade?.trim() || null,
          input.uf?.trim().toUpperCase().slice(0, 2) || null,
          input.bio?.trim() || null,
          iniciaisDe(input.nomeCompleto || input.nomeLojinha),
          agora,
        ],
      );
      const updated = await this.getVendedorByCognitoSub(cognitoSub);
      if (!updated) throw new Error('Falha ao salvar KYC');
      return updated;
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
      await ensureWalletRow(vendedorId);
      return created;
    },

    async criarPedido(input: CriarPedidoInput) {
      await ready();
      const anuncio = await this.getById(input.anuncioId);
      if (!anuncio) throw new Error('Anúncio não encontrado.');
      if (anuncio.status !== 'ativo') throw new Error('Anúncio não está disponível.');
      if (anuncio.vendedor.cognitoSub === input.compradorCognitoSub) {
        throw new Error('Você não pode comprar o próprio anúncio.');
      }
      const { taxaCentavos, liquidoVendedorCentavos } = calcularTaxaELiquido(anuncio.precoCentavos);
      const id = `dp-${randomUUID()}`;
      const agora = new Date().toISOString();
      await withClient(async (c) => {
        await c.query('BEGIN');
        try {
          await c.query(
            `INSERT INTO desapego_pedido (
               id, anuncio_id, anuncio_slug, anuncio_titulo, vendedor_id,
               comprador_cognito_sub, comprador_email, valor_centavos, taxa_centavos,
               liquido_vendedor_centavos, status, criado_em
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'aguardando_pagamento',$11)`,
            [
              id,
              anuncio.id,
              anuncio.slug,
              anuncio.titulo,
              anuncio.vendedor.id,
              input.compradorCognitoSub,
              input.compradorEmail ?? null,
              anuncio.precoCentavos,
              taxaCentavos,
              liquidoVendedorCentavos,
              agora,
            ],
          );
          await c.query(`UPDATE desapego_anuncio SET status = 'reservado' WHERE id = $1`, [
            anuncio.id,
          ]);
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        }
      });
      await ensureWalletRow(anuncio.vendedor.id);
      const p = await this.getPedido(id);
      if (!p) throw new Error('Falha ao criar pedido');
      return p;
    },

    async getPedido(id) {
      await ready();
      const { rows } = await query<PedidoRow>(`SELECT * FROM desapego_pedido WHERE id = $1`, [id]);
      return rows[0] ? mapPedido(rows[0]) : null;
    },

    async listPedidosComprador(cognitoSub) {
      await ready();
      const { rows } = await query<PedidoRow>(
        `SELECT * FROM desapego_pedido WHERE comprador_cognito_sub = $1 ORDER BY criado_em DESC`,
        [cognitoSub],
      );
      return rows.map(mapPedido);
    },

    async listPedidosVendedor(vendedorId) {
      await ready();
      const { rows } = await query<PedidoRow>(
        `SELECT * FROM desapego_pedido WHERE vendedor_id = $1 ORDER BY criado_em DESC`,
        [vendedorId],
      );
      return rows.map(mapPedido);
    },

    async confirmarPagamento(pedidoId, paymentRef) {
      await ready();
      return withClient(async (c) => {
        await c.query('BEGIN');
        try {
          const { rows } = await c.query<PedidoRow>(
            `SELECT * FROM desapego_pedido WHERE id = $1 FOR UPDATE`,
            [pedidoId],
          );
          const row = rows[0];
          if (!row) throw new Error('Pedido não encontrado.');
          if (row.status !== 'aguardando_pagamento') {
            throw new Error(`Pedido não está aguardando pagamento (status: ${row.status}).`);
          }
          const agora = new Date().toISOString();
          const ref = paymentRef ?? `master-${pedidoId}`;
          await c.query(
            `UPDATE desapego_pedido SET status = 'em_custodia', pago_em = $2, payment_ref = $3 WHERE id = $1`,
            [pedidoId, agora, ref],
          );
          await c.query(
            `INSERT INTO desapego_wallet (vendedor_id, disponivel_centavos, bloqueado_centavos, atualizado_em)
             VALUES ($1, 0, $2, $3)
             ON CONFLICT (vendedor_id) DO UPDATE SET
               bloqueado_centavos = desapego_wallet.bloqueado_centavos + $2,
               atualizado_em = $3`,
            [row.vendedor_id, row.liquido_vendedor_centavos, agora],
          );
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        }
        const p = await this.getPedido(pedidoId);
        if (!p) throw new Error('Pedido não encontrado após pagamento');
        return p;
      });
    },

    async marcarEnviado(pedidoId, codigoRastreio) {
      await ready();
      const cod = codigoRastreio.trim();
      if (cod.length < 3) throw new Error('Informe o código de rastreio ou “retirada local”.');
      const { rows } = await query<PedidoRow>(`SELECT * FROM desapego_pedido WHERE id = $1`, [
        pedidoId,
      ]);
      if (!rows[0]) throw new Error('Pedido não encontrado.');
      if (rows[0].status !== 'em_custodia') {
        throw new Error('Só é possível enviar pedidos em custódia.');
      }
      const agora = new Date().toISOString();
      await query(
        `UPDATE desapego_pedido SET status = 'enviado', codigo_rastreio = $2, enviado_em = $3 WHERE id = $1`,
        [pedidoId, cod, agora],
      );
      const p = await this.getPedido(pedidoId);
      if (!p) throw new Error('Pedido não encontrado');
      return p;
    },

    async confirmarEntrega(pedidoId, compradorSub) {
      await ready();
      return withClient(async (c) => {
        await c.query('BEGIN');
        try {
          const { rows } = await c.query<PedidoRow>(
            `SELECT * FROM desapego_pedido WHERE id = $1 FOR UPDATE`,
            [pedidoId],
          );
          const row = rows[0];
          if (!row) throw new Error('Pedido não encontrado.');
          if (row.comprador_cognito_sub !== compradorSub) {
            throw new Error('Apenas o comprador pode confirmar a entrega.');
          }
          if (row.status !== 'enviado' && row.status !== 'em_custodia') {
            throw new Error('Pedido não está em estado de entrega.');
          }
          const agora = new Date().toISOString();
          await c.query(
            `UPDATE desapego_wallet SET
               bloqueado_centavos = bloqueado_centavos - $2,
               disponivel_centavos = disponivel_centavos + $2,
               atualizado_em = $3
             WHERE vendedor_id = $1 AND bloqueado_centavos >= $2`,
            [row.vendedor_id, row.liquido_vendedor_centavos, agora],
          );
          await c.query(
            `UPDATE desapego_pedido SET status = 'liberado', entregue_em = $2, liberado_em = $2 WHERE id = $1`,
            [pedidoId, agora],
          );
          await c.query(`UPDATE desapego_anuncio SET status = 'vendido' WHERE id = $1`, [
            row.anuncio_id,
          ]);
          await c.query(
            `UPDATE desapego_vendedor SET vendas = COALESCE(vendas,0) + 1 WHERE id = $1`,
            [row.vendedor_id],
          );
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        }
        const p = await this.getPedido(pedidoId);
        if (!p) throw new Error('Pedido não encontrado');
        return p;
      });
    },

    async cancelarPedido(pedidoId) {
      await ready();
      return withClient(async (c) => {
        await c.query('BEGIN');
        try {
          const { rows } = await c.query<PedidoRow>(
            `SELECT * FROM desapego_pedido WHERE id = $1 FOR UPDATE`,
            [pedidoId],
          );
          const row = rows[0];
          if (!row) throw new Error('Pedido não encontrado.');
          if (row.status === 'liberado' || row.status === 'cancelado') {
            throw new Error('Pedido não pode ser cancelado.');
          }
          if (row.status === 'em_custodia' || row.status === 'enviado') {
            await c.query(
              `UPDATE desapego_wallet SET
                 bloqueado_centavos = GREATEST(0, bloqueado_centavos - $2),
                 atualizado_em = NOW()
               WHERE vendedor_id = $1`,
              [row.vendedor_id, row.liquido_vendedor_centavos],
            );
          }
          await c.query(`UPDATE desapego_pedido SET status = 'cancelado' WHERE id = $1`, [
            pedidoId,
          ]);
          await c.query(
            `UPDATE desapego_anuncio SET status = 'ativo' WHERE id = $1 AND status = 'reservado'`,
            [row.anuncio_id],
          );
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        }
        const p = await this.getPedido(pedidoId);
        if (!p) throw new Error('Pedido não encontrado');
        return p;
      });
    },

    async getWallet(vendedorId) {
      await ready();
      await ensureWalletRow(vendedorId);
      const { rows } = await query<{
        vendedor_id: string;
        disponivel_centavos: number;
        bloqueado_centavos: number;
      }>(`SELECT * FROM desapego_wallet WHERE vendedor_id = $1`, [vendedorId]);
      return {
        vendedorId,
        disponivelCentavos: Number(rows[0]?.disponivel_centavos ?? 0),
        bloqueadoCentavos: Number(rows[0]?.bloqueado_centavos ?? 0),
      } satisfies DesapegoWallet;
    },

    async listCashouts(vendedorId) {
      await ready();
      const { rows } = await query<CashoutRow>(
        `SELECT * FROM desapego_cashout WHERE vendedor_id = $1 ORDER BY criado_em DESC`,
        [vendedorId],
      );
      return rows.map(mapCashout);
    },

    async solicitarCashout(input: SolicitarCashoutInput) {
      await ready();
      const v = await getVendedorById(input.vendedorId);
      if (!v) throw new Error('Vendedor não encontrado.');
      if (!v.cpf) throw new Error('Complete o KYC antes do cashout.');
      const cpf = input.cpfTitular.replace(/\D/g, '');
      if (cpf !== v.cpf) {
        throw new Error('Conta deve ser da mesma titularidade (CPF do KYC).');
      }
      if (input.valorCentavos < 100) throw new Error('Valor mínimo R$ 1,00.');

      return withClient(async (c) => {
        await c.query('BEGIN');
        try {
          const { rows: wrows } = await c.query<{
            disponivel_centavos: number;
          }>(`SELECT disponivel_centavos FROM desapego_wallet WHERE vendedor_id = $1 FOR UPDATE`, [
            input.vendedorId,
          ]);
          const disp = Number(wrows[0]?.disponivel_centavos ?? 0);
          if (input.valorCentavos > disp) throw new Error('Saldo disponível insuficiente.');
          const agora = new Date().toISOString();
          await c.query(
            `UPDATE desapego_wallet SET
               disponivel_centavos = disponivel_centavos - $2,
               atualizado_em = $3
             WHERE vendedor_id = $1`,
            [input.vendedorId, input.valorCentavos, agora],
          );
          const id = `dc-${randomUUID()}`;
          await c.query(
            `INSERT INTO desapego_cashout (
               id, vendedor_id, valor_centavos, banco, agencia, conta, tipo_conta,
               cpf_titular, status, observacao, criado_em, concluido_em
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'concluido',$9,$10,$10)`,
            [
              id,
              input.vendedorId,
              input.valorCentavos,
              input.banco.trim(),
              input.agencia.trim(),
              input.conta.trim(),
              input.tipoConta,
              cpf,
              'Saldo debitado na wallet Lupa. Liquidação bancária via Boovest/Celcoin (sem split).',
              agora,
            ],
          );
          await c.query('COMMIT');
          const { rows } = await query<CashoutRow>(`SELECT * FROM desapego_cashout WHERE id = $1`, [
            id,
          ]);
          return mapCashout(rows[0]!);
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        }
      });
    },
  };
}

type PedidoRow = {
  id: string;
  anuncio_id: string;
  anuncio_slug: string;
  anuncio_titulo: string;
  vendedor_id: string;
  comprador_cognito_sub: string;
  comprador_email: string | null;
  valor_centavos: number;
  taxa_centavos: number;
  liquido_vendedor_centavos: number;
  status: string;
  payment_ref: string | null;
  codigo_rastreio: string | null;
  criado_em: Date | string;
  pago_em: Date | string | null;
  enviado_em: Date | string | null;
  entregue_em: Date | string | null;
  liberado_em: Date | string | null;
};

type CashoutRow = {
  id: string;
  vendedor_id: string;
  valor_centavos: number;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  cpf_titular: string;
  status: string;
  observacao: string | null;
  criado_em: Date | string;
  concluido_em: Date | string | null;
};

function mapPedido(r: PedidoRow): DesapegoPedido {
  return {
    id: r.id,
    anuncioId: r.anuncio_id,
    anuncioSlug: r.anuncio_slug,
    anuncioTitulo: r.anuncio_titulo,
    vendedorId: r.vendedor_id,
    compradorCognitoSub: r.comprador_cognito_sub,
    compradorEmail: r.comprador_email ?? undefined,
    valorCentavos: Number(r.valor_centavos),
    taxaCentavos: Number(r.taxa_centavos),
    liquidoVendedorCentavos: Number(r.liquido_vendedor_centavos),
    status: r.status as DesapegoPedidoStatus,
    paymentRef: r.payment_ref ?? undefined,
    codigoRastreio: r.codigo_rastreio ?? undefined,
    criadoEm: iso(r.criado_em) ?? new Date().toISOString(),
    pagoEm: iso(r.pago_em),
    enviadoEm: iso(r.enviado_em),
    entregueEm: iso(r.entregue_em),
    liberadoEm: iso(r.liberado_em),
  };
}

function mapCashout(r: CashoutRow): DesapegoCashout {
  return {
    id: r.id,
    vendedorId: r.vendedor_id,
    valorCentavos: Number(r.valor_centavos),
    banco: r.banco,
    agencia: r.agencia,
    conta: r.conta,
    tipoConta: r.tipo_conta === 'poupanca' ? 'poupanca' : 'corrente',
    cpfTitular: r.cpf_titular,
    status: r.status as DesapegoCashout['status'],
    observacao: r.observacao ?? undefined,
    criadoEm: iso(r.criado_em) ?? new Date().toISOString(),
    concluidoEm: iso(r.concluido_em),
  };
}

async function ensureWalletRow(vendedorId: string): Promise<void> {
  await query(
    `INSERT INTO desapego_wallet (vendedor_id, disponivel_centavos, bloqueado_centavos)
     VALUES ($1, 0, 0) ON CONFLICT (vendedor_id) DO NOTHING`,
    [vendedorId],
  );
}
