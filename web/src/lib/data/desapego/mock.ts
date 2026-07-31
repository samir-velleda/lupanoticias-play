/**
 * Mock em memória — usado só quando Aurora está desligado.
 */
import { randomUUID } from 'crypto';
import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoVendedor,
  SalvarKycInput,
} from '@/types/desapego';
import { desapegoAnunciosSeed, desapegoVendedores } from './seed';
import type { DesapegoRepository, EnsureVendedorInput, ListarAnunciosOpts } from './types';

const _anuncios: DesapegoAnuncio[] = desapegoAnunciosSeed.map((a) => ({
  ...a,
  fotos: [...a.fotos],
  vendedor: { ...a.vendedor },
}));
const _vendedores: DesapegoVendedor[] = desapegoVendedores.map((v) => ({
  ...v,
  kycStatus: v.kycStatus ?? 'incompleto',
}));

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

function iniciaisDe(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return nome.slice(0, 2).toUpperCase() || 'XX';
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

    async getVendedorByCognitoSub(sub: string) {
      return clone(_vendedores.find((v) => v.cognitoSub === sub)) ?? null;
    },

    async listVendedores() {
      return clone(_vendedores);
    },

    async ensureVendedorFromCognito(input: EnsureVendedorInput) {
      const existing = _vendedores.find((v) => v.cognitoSub === input.cognitoSub);
      if (existing) {
        if (input.email && !existing.email) existing.email = input.email;
        if (input.nome && existing.nome.startsWith('lojinha ')) {
          /* keep */
        }
        return clone(existing);
      }
      const nome = input.nome?.trim() || input.email?.split('@')[0] || 'Minha lojinha';
      const lojaNome = nome.toLowerCase().startsWith('lojinha') ? nome : `lojinha de ${nome}`;
      const novo: DesapegoVendedor = {
        id: `dv-${randomUUID().slice(0, 8)}`,
        slug: uniqueVendedorSlug(slugify(lojaNome)),
        nome: lojaNome,
        iniciais: iniciaisDe(nome),
        email: input.email,
        cognitoSub: input.cognitoSub,
        vendas: 0,
        nota: 5,
        desde: new Date().toISOString().slice(0, 10),
        kycStatus: 'incompleto',
      };
      _vendedores.push(novo);
      return clone(novo);
    },

    async salvarKyc(cognitoSub: string, input: SalvarKycInput) {
      let v = _vendedores.find((x) => x.cognitoSub === cognitoSub);
      if (!v) {
        v = await this.ensureVendedorFromCognito({ cognitoSub, nome: input.nomeLojinha });
        v = _vendedores.find((x) => x.cognitoSub === cognitoSub)!;
      }
      const slugBase = slugify(input.nomeLojinha);
      if (!_vendedores.some((x) => x.slug === slugBase && x.id !== v!.id)) {
        v.slug = slugBase;
      }
      v.nome = input.nomeLojinha.trim();
      v.nomeCompleto = input.nomeCompleto.trim();
      v.cpf = input.cpf.replace(/\D/g, '');
      v.telefone = input.telefone.replace(/\D/g, '');
      v.chavePix = input.chavePix.trim();
      v.cidade = input.cidade?.trim() || v.cidade;
      v.uf = input.uf?.trim().toUpperCase().slice(0, 2) || v.uf;
      v.bio = input.bio?.trim() || v.bio;
      v.iniciais = iniciaisDe(input.nomeCompleto || input.nomeLojinha);
      // MVP: auto-aprovado quando dados válidos (pronto para Boovest depois).
      v.kycStatus = 'aprovado';
      v.kycAtualizadoEm = new Date().toISOString();
      return clone(v);
    },

    async criar(input: CriarDesapegoAnuncioInput) {
      const agora = new Date().toISOString();
      let vendedor =
        (input.vendedorId
          ? _vendedores.find((v) => v.id === input.vendedorId)
          : undefined) ?? _vendedores[0]!;

      if (input.vendedorNome && input.vendedorNome.trim() && !input.vendedorId) {
        const nome = input.vendedorNome.trim();
        const slugBase = slugify(nome);
        const existing = _vendedores.find(
          (v) => v.slug === slugBase || v.nome.toLowerCase() === nome.toLowerCase(),
        );
        if (existing) {
          vendedor = existing;
        } else {
          const novo: DesapegoVendedor = {
            id: `dv-${randomUUID().slice(0, 8)}`,
            slug: uniqueVendedorSlug(slugBase),
            nome,
            iniciais: iniciaisDe(nome),
            vendas: 0,
            nota: 5,
            desde: agora.slice(0, 10),
            kycStatus: 'incompleto',
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
