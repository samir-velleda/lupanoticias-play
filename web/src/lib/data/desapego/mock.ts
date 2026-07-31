/**
 * Mock em memória — pedidos, wallet (bloqueado/disponível) e cashout.
 * Sem split; sem chamada Celcoin inventada.
 */
import { randomUUID } from 'crypto';
import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoCashout,
  DesapegoPedido,
  DesapegoVendedor,
  DesapegoWallet,
  SalvarKycInput,
} from '@/types/desapego';
import { calcularTaxaELiquido } from '@/types/desapego';
import { desapegoAnunciosSeed, desapegoVendedores } from './seed';
import type {
  CriarPedidoInput,
  DesapegoRepository,
  EnsureVendedorInput,
  ListarAnunciosOpts,
  SolicitarCashoutInput,
} from './types';

const _anuncios: DesapegoAnuncio[] = desapegoAnunciosSeed.map((a) => ({
  ...a,
  fotos: [...a.fotos],
  vendedor: { ...a.vendedor },
}));
const _vendedores: DesapegoVendedor[] = desapegoVendedores.map((v) => ({
  ...v,
  kycStatus: v.kycStatus ?? 'incompleto',
}));
const _pedidos: DesapegoPedido[] = [];
const _wallets = new Map<string, DesapegoWallet>();
const _cashouts: DesapegoCashout[] = [];

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

function ensureWallet(vendedorId: string): DesapegoWallet {
  let w = _wallets.get(vendedorId);
  if (!w) {
    w = { vendedorId, disponivelCentavos: 0, bloqueadoCentavos: 0 };
    _wallets.set(vendedorId, w);
  }
  return w;
}

export function createMockDesapegoRepo(): DesapegoRepository {
  return {
    async listAnuncios(opts: ListarAnunciosOpts = {}) {
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

    async getById(id) {
      return clone(_anuncios.find((a) => a.id === id)) ?? null;
    },

    async getBySlug(slug) {
      return clone(_anuncios.find((a) => a.slug === slug)) ?? null;
    },

    async getVendedorBySlug(slug) {
      return clone(_vendedores.find((v) => v.slug === slug)) ?? null;
    },

    async getVendedorByCognitoSub(sub) {
      return clone(_vendedores.find((v) => v.cognitoSub === sub)) ?? null;
    },

    async listVendedores() {
      return clone(_vendedores);
    },

    async ensureVendedorFromCognito(input: EnsureVendedorInput) {
      const existing = _vendedores.find((v) => v.cognitoSub === input.cognitoSub);
      if (existing) {
        if (input.email && !existing.email) existing.email = input.email;
        ensureWallet(existing.id);
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
      ensureWallet(novo.id);
      return clone(novo);
    },

    async salvarKyc(cognitoSub, input: SalvarKycInput) {
      let v = _vendedores.find((x) => x.cognitoSub === cognitoSub);
      if (!v) {
        await this.ensureVendedorFromCognito({ cognitoSub, nome: input.nomeLojinha });
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
      v.kycStatus = 'aprovado';
      v.kycAtualizadoEm = new Date().toISOString();
      ensureWallet(v.id);
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
        if (existing) vendedor = existing;
        else {
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

      const anuncio: DesapegoAnuncio = {
        id: `da-${randomUUID()}`,
        slug: uniqueAnuncioSlug(slugify(input.titulo)),
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
      ensureWallet(vendedor.id);
      return clone(anuncio);
    },

    async criarPedido(input: CriarPedidoInput) {
      const anuncio = _anuncios.find((a) => a.id === input.anuncioId);
      if (!anuncio) throw new Error('Anúncio não encontrado.');
      if (anuncio.status !== 'ativo') throw new Error('Anúncio não está disponível.');
      if (anuncio.vendedor.cognitoSub && anuncio.vendedor.cognitoSub === input.compradorCognitoSub) {
        throw new Error('Você não pode comprar o próprio anúncio.');
      }
      const { taxaCentavos, liquidoVendedorCentavos } = calcularTaxaELiquido(anuncio.precoCentavos);
      const pedido: DesapegoPedido = {
        id: `dp-${randomUUID()}`,
        anuncioId: anuncio.id,
        anuncioSlug: anuncio.slug,
        anuncioTitulo: anuncio.titulo,
        vendedorId: anuncio.vendedor.id,
        compradorCognitoSub: input.compradorCognitoSub,
        compradorEmail: input.compradorEmail,
        valorCentavos: anuncio.precoCentavos,
        taxaCentavos,
        liquidoVendedorCentavos,
        status: 'aguardando_pagamento',
        criadoEm: new Date().toISOString(),
      };
      _pedidos.unshift(pedido);
      anuncio.status = 'reservado';
      ensureWallet(anuncio.vendedor.id);
      return clone(pedido);
    },

    async getPedido(id) {
      return clone(_pedidos.find((p) => p.id === id)) ?? null;
    },

    async listPedidosComprador(cognitoSub) {
      return clone(
        _pedidos
          .filter((p) => p.compradorCognitoSub === cognitoSub)
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      );
    },

    async listPedidosVendedor(vendedorId) {
      return clone(
        _pedidos
          .filter((p) => p.vendedorId === vendedorId)
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      );
    },

    async confirmarPagamento(pedidoId, paymentRef) {
      const p = _pedidos.find((x) => x.id === pedidoId);
      if (!p) throw new Error('Pedido não encontrado.');
      if (p.status !== 'aguardando_pagamento') {
        throw new Error(`Pedido não está aguardando pagamento (status: ${p.status}).`);
      }
      // Cash-in na master (Celcoin) → custódia: bloqueia líquido do vendedor
      p.status = 'em_custodia';
      p.pagoEm = new Date().toISOString();
      p.paymentRef = paymentRef ?? `master-sim-${p.id}`;
      const w = ensureWallet(p.vendedorId);
      w.bloqueadoCentavos += p.liquidoVendedorCentavos;
      return clone(p);
    },

    async marcarEnviado(pedidoId, codigoRastreio) {
      const p = _pedidos.find((x) => x.id === pedidoId);
      if (!p) throw new Error('Pedido não encontrado.');
      if (p.status !== 'em_custodia') {
        throw new Error('Só é possível enviar pedidos em custódia.');
      }
      const cod = codigoRastreio.trim();
      if (cod.length < 3) throw new Error('Informe o código de rastreio ou “retirada local”.');
      p.status = 'enviado';
      p.codigoRastreio = cod;
      p.enviadoEm = new Date().toISOString();
      return clone(p);
    },

    async confirmarEntrega(pedidoId, compradorSub) {
      const p = _pedidos.find((x) => x.id === pedidoId);
      if (!p) throw new Error('Pedido não encontrado.');
      if (p.compradorCognitoSub !== compradorSub) {
        throw new Error('Apenas o comprador pode confirmar a entrega.');
      }
      if (p.status !== 'enviado' && p.status !== 'em_custodia') {
        throw new Error('Pedido não está em estado de entrega.');
      }
      const agora = new Date().toISOString();
      p.status = 'entregue';
      p.entregueEm = agora;
      // Liberação: bloqueado → disponível (sem split)
      const w = ensureWallet(p.vendedorId);
      if (w.bloqueadoCentavos < p.liquidoVendedorCentavos) {
        throw new Error('Saldo bloqueado inconsistente.');
      }
      w.bloqueadoCentavos -= p.liquidoVendedorCentavos;
      w.disponivelCentavos += p.liquidoVendedorCentavos;
      p.status = 'liberado';
      p.liberadoEm = agora;
      const anuncio = _anuncios.find((a) => a.id === p.anuncioId);
      if (anuncio) anuncio.status = 'vendido';
      const vend = _vendedores.find((v) => v.id === p.vendedorId);
      if (vend) vend.vendas = (vend.vendas ?? 0) + 1;
      return clone(p);
    },

    async cancelarPedido(pedidoId) {
      const p = _pedidos.find((x) => x.id === pedidoId);
      if (!p) throw new Error('Pedido não encontrado.');
      if (p.status === 'liberado' || p.status === 'cancelado') {
        throw new Error('Pedido não pode ser cancelado.');
      }
      if (p.status === 'em_custodia' || p.status === 'enviado') {
        const w = ensureWallet(p.vendedorId);
        w.bloqueadoCentavos = Math.max(0, w.bloqueadoCentavos - p.liquidoVendedorCentavos);
      }
      p.status = 'cancelado';
      const anuncio = _anuncios.find((a) => a.id === p.anuncioId);
      if (anuncio && anuncio.status === 'reservado') anuncio.status = 'ativo';
      return clone(p);
    },

    async getWallet(vendedorId) {
      return clone(ensureWallet(vendedorId));
    },

    async listCashouts(vendedorId) {
      return clone(
        _cashouts
          .filter((c) => c.vendedorId === vendedorId)
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      );
    },

    async solicitarCashout(input: SolicitarCashoutInput) {
      const v = _vendedores.find((x) => x.id === input.vendedorId);
      if (!v) throw new Error('Vendedor não encontrado.');
      if (!v.cpf) throw new Error('Complete o KYC antes do cashout.');
      const cpf = input.cpfTitular.replace(/\D/g, '');
      if (cpf !== v.cpf) {
        throw new Error('Conta deve ser da mesma titularidade (CPF do KYC).');
      }
      if (input.valorCentavos < 100) throw new Error('Valor mínimo R$ 1,00.');
      const w = ensureWallet(input.vendedorId);
      if (input.valorCentavos > w.disponivelCentavos) {
        throw new Error('Saldo disponível insuficiente.');
      }
      w.disponivelCentavos -= input.valorCentavos;
      const co: DesapegoCashout = {
        id: `dc-${randomUUID()}`,
        vendedorId: input.vendedorId,
        valorCentavos: input.valorCentavos,
        banco: input.banco.trim(),
        agencia: input.agencia.trim(),
        conta: input.conta.trim(),
        tipoConta: input.tipoConta,
        cpfTitular: cpf,
        status: 'concluido',
        observacao:
          'Saldo debitado na wallet Lupa. Liquidação bancária via Boovest/Celcoin (sem split) — integração de cashout externo.',
        criadoEm: new Date().toISOString(),
        concluidoEm: new Date().toISOString(),
      };
      _cashouts.unshift(co);
      return clone(co);
    },
  };
}
