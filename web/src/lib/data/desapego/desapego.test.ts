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

  it('ensure + KYC vincula lojinha ao Cognito sub', async () => {
    const repo = createMockDesapegoRepo();
    const v = await repo.ensureVendedorFromCognito({
      cognitoSub: 'sub-teste-123',
      email: 'vendedor@lupa.test',
      nome: 'Samir',
    });
    expect(v.kycStatus).toBe('incompleto');
    expect(v.cognitoSub).toBe('sub-teste-123');

    const kyc = await repo.salvarKyc('sub-teste-123', {
      nomeLojinha: 'brechó do samir',
      nomeCompleto: 'Samir Teste',
      cpf: '52998224725',
      telefone: '11988887777',
      chavePix: 'vendedor@lupa.test',
      cidade: 'São Paulo',
      uf: 'SP',
    });
    expect(kyc.kycStatus).toBe('aprovado');
    expect(kyc.cpf).toBe('52998224725');
    expect((await repo.getVendedorByCognitoSub('sub-teste-123'))?.slug).toContain('brecho');
  });
});

