import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoCategoria,
  DesapegoVendedor,
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

export interface DesapegoRepository {
  listAnuncios(opts?: ListarAnunciosOpts): Promise<DesapegoAnuncio[]>;
  getById(id: string): Promise<DesapegoAnuncio | null>;
  getBySlug(slug: string): Promise<DesapegoAnuncio | null>;
  getVendedorBySlug(slug: string): Promise<DesapegoVendedor | null>;
  getVendedorByCognitoSub(sub: string): Promise<DesapegoVendedor | null>;
  listVendedores(): Promise<DesapegoVendedor[]>;
  /** Cria lojinha mínima vinculada ao Cognito (KYC incompleto). */
  ensureVendedorFromCognito(input: EnsureVendedorInput): Promise<DesapegoVendedor>;
  /** Salva/atualiza dados KYC e marca status. */
  salvarKyc(cognitoSub: string, input: SalvarKycInput): Promise<DesapegoVendedor>;
  criar(input: CriarDesapegoAnuncioInput): Promise<DesapegoAnuncio>;
}
