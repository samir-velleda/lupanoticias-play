/** Domínio Desapegoo (C2C) — separado do editorial. */

export type DesapegoCategoria = 'roupas' | 'eletronicos' | 'moveis' | 'outros';

export type DesapegoEstadoItem = 'novinho' | 'usado_com_amor' | 'bem_vivido';

export type DesapegoAnuncioStatus = 'rascunho' | 'ativo' | 'reservado' | 'vendido' | 'oculto';

/** KYC de vendedor — dados para futuro repasse Boovest. */
export type DesapegoKycStatus = 'incompleto' | 'pendente' | 'aprovado' | 'recusado';

export interface DesapegoVendedor {
  id: string;
  slug: string;
  nome: string;
  iniciais: string;
  cidade?: string;
  uf?: string;
  nota?: number;
  vendas?: number;
  bio?: string;
  desde?: string;
  /** Cognito sub — lojinha real do usuário. */
  cognitoSub?: string;
  email?: string;
  /** Nome civil (KYC). */
  nomeCompleto?: string;
  /** CPF só dígitos (11). Nunca expor completo na UI pública. */
  cpf?: string;
  telefone?: string;
  chavePix?: string;
  kycStatus: DesapegoKycStatus;
  kycAtualizadoEm?: string;
}

export interface SalvarKycInput {
  nomeLojinha: string;
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  chavePix: string;
  cidade?: string;
  uf?: string;
  bio?: string;
}

export function kycCompleto(v: DesapegoVendedor | null | undefined): boolean {
  if (!v) return false;
  return (
    (v.kycStatus === 'aprovado' || v.kycStatus === 'pendente') &&
    Boolean(v.cpf && v.telefone && v.chavePix && v.nomeCompleto)
  );
}

export function podeVender(v: DesapegoVendedor | null | undefined): boolean {
  if (!v) return false;
  if (v.kycStatus === 'recusado') return false;
  return kycCompleto(v);
}

/** Máscara CPF para exibição: ***.***.***-XX */
export function mascararCpf(cpf?: string): string {
  const d = (cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11) return '—';
  return `***.***.***-${d.slice(9)}`;
}

export interface DesapegoAnuncio {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  categoria: DesapegoCategoria;
  estado: DesapegoEstadoItem;
  precoCentavos: number;
  precoAntigoCentavos?: number;
  fotos: string[];
  freteGratis: boolean;
  status: DesapegoAnuncioStatus;
  vendedor: DesapegoVendedor;
  cidadeId?: string;
  /** Placeholder visual do protótipo (monograma). */
  placeholderBg?: string;
  placeholderFg?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface CriarDesapegoAnuncioInput {
  titulo: string;
  descricao: string;
  categoria: DesapegoCategoria;
  estado: DesapegoEstadoItem;
  precoCentavos: number;
  precoAntigoCentavos?: number;
  fotos: string[];
  freteGratis?: boolean;
  vendedorId?: string;
  vendedorNome?: string;
  cidadeId?: string;
}

export const DESAPEGO_CATEGORIAS: { slug: DesapegoCategoria; label: string }[] = [
  { slug: 'roupas', label: 'roupas' },
  { slug: 'eletronicos', label: 'eletrônicos' },
  { slug: 'moveis', label: 'móveis' },
  { slug: 'outros', label: 'outros' },
];

export const DESAPEGO_ESTADOS: { slug: DesapegoEstadoItem; label: string }[] = [
  { slug: 'novinho', label: 'novinho' },
  { slug: 'usado_com_amor', label: 'usado com amor' },
  { slug: 'bem_vivido', label: 'bem vivido' },
];

export function rotuloEstado(e: DesapegoEstadoItem): string {
  return DESAPEGO_ESTADOS.find((x) => x.slug === e)?.label ?? e;
}

export function rotuloCategoria(c: DesapegoCategoria): string {
  return DESAPEGO_CATEGORIAS.find((x) => x.slug === c)?.label ?? c;
}

export function formatPrecoBRL(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

export function descontoPct(preco: number, antigo?: number): number | undefined {
  if (!antigo || antigo <= preco) return undefined;
  return Math.round(((antigo - preco) / antigo) * 100);
}

export function inicialTitulo(titulo: string): string {
  const t = titulo.trim();
  return t ? t[0]!.toLowerCase() : '?';
}

// ---- Pedido + wallet (sem split; custódia até entrega; cashout mesma titularidade) ----

/** Taxa plataforma em basis points (500 = 5%). Fica na master; vendedor recebe o líquido. */
export const DESAPEGO_TAXA_BPS = 500;

export type DesapegoPedidoStatus =
  | 'aguardando_pagamento'
  | 'em_custodia'
  | 'enviado'
  | 'entregue'
  | 'liberado'
  | 'cancelado'
  | 'disputa';

export type DesapegoCashoutStatus = 'solicitado' | 'concluido' | 'falhou' | 'cancelado';

export interface DesapegoPedido {
  id: string;
  anuncioId: string;
  anuncioSlug: string;
  anuncioTitulo: string;
  vendedorId: string;
  compradorCognitoSub: string;
  compradorEmail?: string;
  valorCentavos: number;
  taxaCentavos: number;
  liquidoVendedorCentavos: number;
  status: DesapegoPedidoStatus;
  /** Ref externa futura (Boovest/Celcoin) — não inventamos a API. */
  paymentRef?: string;
  codigoRastreio?: string;
  criadoEm: string;
  pagoEm?: string;
  enviadoEm?: string;
  entregueEm?: string;
  liberadoEm?: string;
}

export interface DesapegoWallet {
  vendedorId: string;
  /** Liberado para cashout. */
  disponivelCentavos: number;
  /** Pago pelo comprador, ainda não liberado (até confirmar entrega). */
  bloqueadoCentavos: number;
}

export interface DesapegoCashout {
  id: string;
  vendedorId: string;
  valorCentavos: number;
  /** Conta destino — mesma titularidade do CPF KYC. */
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: 'corrente' | 'poupanca';
  cpfTitular: string;
  status: DesapegoCashoutStatus;
  /** Sem chamada Celcoin inventada: liquidação bancária fica para Boovest. */
  observacao?: string;
  criadoEm: string;
  concluidoEm?: string;
}

export function calcularTaxaELiquido(precoCentavos: number): {
  taxaCentavos: number;
  liquidoVendedorCentavos: number;
} {
  const taxaCentavos = Math.floor((precoCentavos * DESAPEGO_TAXA_BPS) / 10_000);
  return {
    taxaCentavos,
    liquidoVendedorCentavos: precoCentavos - taxaCentavos,
  };
}

export function rotuloPedidoStatus(s: DesapegoPedidoStatus): string {
  const map: Record<DesapegoPedidoStatus, string> = {
    aguardando_pagamento: 'Aguardando pagamento',
    em_custodia: 'Em custódia (bloqueado)',
    enviado: 'Enviado',
    entregue: 'Entregue',
    liberado: 'Liberado na wallet',
    cancelado: 'Cancelado',
    disputa: 'Em disputa',
  };
  return map[s] ?? s;
}
