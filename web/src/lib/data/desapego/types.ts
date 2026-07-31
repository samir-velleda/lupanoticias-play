import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoCashout,
  DesapegoCategoria,
  DesapegoPedido,
  DesapegoVendedor,
  DesapegoWallet,
  SalvarKycInput,
} from '@/types/desapego';

export interface ListarAnunciosOpts {
  q?: string;
  categoria?: DesapegoCategoria | null;
  vendedorSlug?: string;
  cidadeId?: string;
  limit?: number;
}

export interface EnsureVendedorInput {
  cognitoSub: string;
  email?: string;
  nome?: string;
}

export interface CriarPedidoInput {
  anuncioId: string;
  compradorCognitoSub: string;
  compradorEmail?: string;
}

export interface SolicitarCashoutInput {
  vendedorId: string;
  valorCentavos: number;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: 'corrente' | 'poupanca';
  cpfTitular: string;
}

export interface DesapegoRepository {
  listAnuncios(opts?: ListarAnunciosOpts): Promise<DesapegoAnuncio[]>;
  getById(id: string): Promise<DesapegoAnuncio | null>;
  getBySlug(slug: string): Promise<DesapegoAnuncio | null>;
  getVendedorBySlug(slug: string): Promise<DesapegoVendedor | null>;
  getVendedorByCognitoSub(sub: string): Promise<DesapegoVendedor | null>;
  listVendedores(): Promise<DesapegoVendedor[]>;
  ensureVendedorFromCognito(input: EnsureVendedorInput): Promise<DesapegoVendedor>;
  salvarKyc(cognitoSub: string, input: SalvarKycInput): Promise<DesapegoVendedor>;
  criar(input: CriarDesapegoAnuncioInput): Promise<DesapegoAnuncio>;

  // Pedidos (custódia sem split)
  criarPedido(input: CriarPedidoInput): Promise<DesapegoPedido>;
  getPedido(id: string): Promise<DesapegoPedido | null>;
  listPedidosComprador(cognitoSub: string): Promise<DesapegoPedido[]>;
  listPedidosVendedor(vendedorId: string): Promise<DesapegoPedido[]>;
  /** Marca pago na master → em_custodia + bloqueia líquido na wallet do vendedor. */
  confirmarPagamento(pedidoId: string, paymentRef?: string): Promise<DesapegoPedido>;
  marcarEnviado(pedidoId: string, codigoRastreio: string): Promise<DesapegoPedido>;
  /** Comprador confirma entrega → liberado: bloqueado → disponível. */
  confirmarEntrega(pedidoId: string, compradorSub: string): Promise<DesapegoPedido>;
  cancelarPedido(pedidoId: string, por: 'comprador' | 'vendedor' | 'sistema'): Promise<DesapegoPedido>;

  // Wallet + cashout
  getWallet(vendedorId: string): Promise<DesapegoWallet>;
  listCashouts(vendedorId: string): Promise<DesapegoCashout[]>;
  solicitarCashout(input: SolicitarCashoutInput): Promise<DesapegoCashout>;
}
