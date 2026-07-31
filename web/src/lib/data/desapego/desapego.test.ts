import { describe, expect, it } from 'vitest';
import { createMockDesapegoRepo } from './mock';

describe('desapegoRepo mock', () => {
  it('lista anúncios ativos do seed', async () => {
    const repo = createMockDesapegoRepo();
    const list = await repo.listAnuncios();
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.every((a) => a.status === 'ativo' || a.status === 'reservado')).toBe(true);
  });

  it('filtra por categoria e busca', async () => {
    const repo = createMockDesapegoRepo();
    const roupas = await repo.listAnuncios({ categoria: 'roupas' });
    expect(roupas.every((a) => a.categoria === 'roupas')).toBe(true);
    const q = await repo.listAnuncios({ q: 'kindle' });
    expect(q.some((a) => a.titulo.includes('kindle'))).toBe(true);
  });

  it('cria anúncio e resolve por slug', async () => {
    const repo = createMockDesapegoRepo();
    const criado = await repo.criar({
      titulo: 'camisa xadrez vintage',
      descricao: 'tamanho M, pouquíssimo uso, perfeita pro friozinho.',
      categoria: 'roupas',
      estado: 'usado_com_amor',
      precoCentavos: 4500,
      fotos: [],
      freteGratis: true,
      vendedorNome: 'brechó teste',
    });
    expect(criado.slug).toContain('camisa');
    expect(criado.status).toBe('ativo');
    const found = await repo.getBySlug(criado.slug);
    expect(found?.id).toBe(criado.id);
    const loja = await repo.listAnuncios({ vendedorSlug: criado.vendedor.slug });
    expect(loja.map((a) => a.id)).toContain(criado.id);
  });
});
