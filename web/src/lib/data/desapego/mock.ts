/**
 * Mock em memória — usado só quando Aurora está desligado.
 */
import { randomUUID } from 'crypto';
import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoVendedor,
} from '@/types/desapego';
import { desapegoAnunciosSeed, desapegoVendedores } from './seed';
import type { DesapegoRepository, ListarAnunciosOpts } from './types';

const _anuncios: DesapegoAnuncio[] = desapegoAnunciosSeed.map((a) => ({
  ...a,
  fotos: [...a.fotos],
  vendedor: { ...a.vendedor },
}));
const _vendedores: DesapegoVendedor[] = desapegoVendedores.map((v) => ({ ...v }));

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'anuncio';

function uniqueAnuncioSlug(base: string): string {
  let slug = base;
  let n = 0;
  while (_anuncios.some((a) => a.slug === slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function uniqueVendedorSlug(base: string): string {
  let slug = base;
  let n = 0;
  while (_vendedores.some((v) => v.slug === slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export function createMockDesapegoRepo(): DesapegoRepository {
  return {
    async listAnuncios(opts: ListarAnunciosOpts = {}): Promise<DesapegoAnuncio[]> {
      const q = opts.q?.trim().toLowerCase();
      let items = _anuncios.filter((a) => a.status === 'ativo' || a.status === 'reservado');
      if (opts.categoria) items = items.filter((a) => a.categoria === opts.categoria);
      if (opts.vendedorSlug) items = items.filter((a) => a.vendedor.slug === opts.vendedorSlug);
      if (opts.cidadeId) items = items.filter((a) => a.cidadeId === opts.cidadeId);
      if (q) {
        items = items.filter(
          (a) =>
            a.titulo.toLowerCase().includes(q) ||
            a.descricao.toLowerCase().includes(q) ||
            a.vendedor.nome.toLowerCase().includes(q),
        );
      }
      items = items.slice().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
      if (opts.limit) items = items.slice(0, opts.limit);
      return clone(items);
    },

    async getById(id: string) {
      return clone(_anuncios.find((a) => a.id === id)) ?? null;
    },

    async getBySlug(slug: string) {
      return clone(_anuncios.find((a) => a.slug === slug)) ?? null;
    },

    async getVendedorBySlug(slug: string) {
      return clone(_vendedores.find((v) => v.slug === slug)) ?? null;
    },

    async listVendedores() {
      return clone(_vendedores);
    },

    async criar(input: CriarDesapegoAnuncioInput) {
      const agora = new Date().toISOString();
      let vendedor =
        (input.vendedorId
          ? _vendedores.find((v) => v.id === input.vendedorId)
          : undefined) ?? _vendedores[0]!;

      if (input.vendedorNome && input.vendedorNome.trim()) {
        const nome = input.vendedorNome.trim();
        const slugBase = slugify(nome);
        const existing = _vendedores.find(
          (v) => v.slug === slugBase || v.nome.toLowerCase() === nome.toLowerCase(),
        );
        if (existing) {
          vendedor = existing;
        } else {
          const parts = nome.split(/\s+/);
          const iniciais =
            parts.length >= 2
              ? `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
              : nome.slice(0, 2).toUpperCase();
          const novo: DesapegoVendedor = {
            id: `dv-${randomUUID().slice(0, 8)}`,
            slug: uniqueVendedorSlug(slugBase),
            nome,
            iniciais,
            vendas: 0,
            nota: 5,
            desde: agora.slice(0, 10),
          };
          _vendedores.push(novo);
          vendedor = novo;
        }
      }

      const slug = uniqueAnuncioSlug(slugify(input.titulo));
      const anuncio: DesapegoAnuncio = {
        id: `da-${randomUUID()}`,
        slug,
        titulo: input.titulo.trim(),
        descricao: input.descricao.trim(),
        categoria: input.categoria,
        estado: input.estado,
        precoCentavos: input.precoCentavos,
        precoAntigoCentavos: input.precoAntigoCentavos,
        fotos: input.fotos.filter(Boolean),
        freteGratis: input.freteGratis ?? false,
        status: 'ativo',
        vendedor: { ...vendedor },
        cidadeId: input.cidadeId ?? 'cid-matriz',
        placeholderBg: '#FBE6DC',
        placeholderFg: '#C63D1B',
        criadoEm: agora,
      };
      _anuncios.unshift(anuncio);
      return clone(anuncio);
    },
  };
}
