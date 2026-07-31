import { describe, expect, it } from 'vitest';
import { desapegoRepo } from './index';

describe('desapegoRepo', () => {
  it('lista anúncios ativos do seed', async () => {
    const list = await desapegoRepo.listAnuncios();
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.every((a) => a.status === 'ativo' || a.status === 'reservado')).toBe(true);
  });

  it('filtra por categoria e busca', async () => {
    const roupas = await desapegoRepo.listAnuncios({ categoria: 'roupas' });
    expect(roupas.every((a) => a.categoria === 'roupas')).toBe(true);
    const q = await desapegoRepo.listAnuncios({ q: 'kindle' });
    expect(q.some((a) => a.titulo.includes('kindle'))).toBe(true);
  });

  it('cria anúncio e resolve por slug', async () => {
    const criado = await desapegoRepo.criar({
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
    const found = await desapegoRepo.getBySlug(criado.slug);
    expect(found?.id).toBe(criado.id);
    const loja = await desapegoRepo.listAnuncios({ vendedorSlug: criado.vendedor.slug });
    expect(loja.map((a) => a.id)).toContain(criado.id);
  });
});
