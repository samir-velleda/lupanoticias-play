import type {
  CriarDesapegoAnuncioInput,
  DesapegoAnuncio,
  DesapegoCategoria,
  DesapegoVendedor,
} from '@/types/desapego';

export interface ListarAnunciosOpts {
  q?: string;
  categoria?: DesapegoCategoria | null;
  vendedorSlug?: string;
  cidadeId?: string;
  limit?: number;
}

export interface DesapegoRepository {
  listAnuncios(opts?: ListarAnunciosOpts): Promise<DesapegoAnuncio[]>;
  getById(id: string): Promise<DesapegoAnuncio | null>;
  getBySlug(slug: string): Promise<DesapegoAnuncio | null>;
  getVendedorBySlug(slug: string): Promise<DesapegoVendedor | null>;
  listVendedores(): Promise<DesapegoVendedor[]>;
  criar(input: CriarDesapegoAnuncioInput): Promise<DesapegoAnuncio>;
}
