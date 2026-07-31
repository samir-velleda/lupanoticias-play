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

  it('custódia bloqueia e entrega libera wallet; cashout mesma titularidade', async () => {
    const repo = createMockDesapegoRepo();
    const vend = await repo.ensureVendedorFromCognito({
      cognitoSub: 'sub-vend-1',
      email: 'v@test.com',
      nome: 'Vendedor',
    });
    await repo.salvarKyc('sub-vend-1', {
      nomeLojinha: 'loja v',
      nomeCompleto: 'Vendedor Teste',
      cpf: '52998224725',
      telefone: '11999990000',
      chavePix: 'v@test.com',
    });
    const anuncio = await repo.criar({
      titulo: 'item teste wallet',
      descricao: 'descrição longa o suficiente do item.',
      categoria: 'outros',
      estado: 'novinho',
      precoCentavos: 10_000,
      fotos: [],
      vendedorId: vend.id,
    });
    const pedido = await repo.criarPedido({
      anuncioId: anuncio.id,
      compradorCognitoSub: 'sub-comp-1',
      compradorEmail: 'c@test.com',
    });
    expect(pedido.status).toBe('aguardando_pagamento');

    await repo.confirmarPagamento(pedido.id);
    let w = await repo.getWallet(vend.id);
    expect(w.bloqueadoCentavos).toBe(pedido.liquidoVendedorCentavos);
    expect(w.disponivelCentavos).toBe(0);

    await repo.marcarEnviado(pedido.id, 'BR123456789');
    await repo.confirmarEntrega(pedido.id, 'sub-comp-1');
    w = await repo.getWallet(vend.id);
    expect(w.bloqueadoCentavos).toBe(0);
    expect(w.disponivelCentavos).toBe(pedido.liquidoVendedorCentavos);

    await expect(
      repo.solicitarCashout({
        vendedorId: vend.id,
        valorCentavos: 1000,
        banco: '260',
        agencia: '0001',
        conta: '12345-6',
        tipoConta: 'corrente',
        cpfTitular: '00000000000',
      }),
    ).rejects.toThrow(/mesma titularidade/);

    const co = await repo.solicitarCashout({
      vendedorId: vend.id,
      valorCentavos: 1000,
      banco: '260',
      agencia: '0001',
      conta: '12345-6',
      tipoConta: 'corrente',
      cpfTitular: '52998224725',
    });
    expect(co.status).toBe('concluido');
    w = await repo.getWallet(vend.id);
    expect(w.disponivelCentavos).toBe(pedido.liquidoVendedorCentavos - 1000);
  });
});


