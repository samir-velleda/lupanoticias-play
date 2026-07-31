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
