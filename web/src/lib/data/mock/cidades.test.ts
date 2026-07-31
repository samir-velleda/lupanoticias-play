import { describe, expect, it } from 'vitest';
import { createMockRepositories } from './index';

describe('multi-cidade / licenças', () => {
  it('isola pautas e jornalistas por cidade', async () => {
    const repo = createMockRepositories();

    const matriz = await repo.pautas.listAbertas(undefined, 'cid-matriz');
    const campinas = await repo.pautas.listAbertas(undefined, 'cid-campinas');
    expect(matriz.length).toBeGreaterThan(0);
    expect(campinas.every((p) => p.cidadeId === 'cid-campinas' || !p.cidadeId)).toBe(true);

    const jMatriz = await repo.authors.listByPapel('jornalista', 'cid-matriz');
    const jCampinas = await repo.authors.listByPapel('jornalista', 'cid-campinas');
    expect(jMatriz.some((j) => j.id === 'a-2')).toBe(true);
    expect(jCampinas.some((j) => j.id === 'a-8')).toBe(true);
    expect(jCampinas.some((j) => j.id === 'a-2')).toBe(false);
  });

  it('Master cria licença e pauta da cidade só aparece no tenant', async () => {
    const repo = createMockRepositories();
    const cidade = await repo.cidades.criar({
      nome: 'Ribeirão Preto',
      uf: 'SP',
      slug: 'ribeirao-preto',
      status: 'ativa',
      permiteEstadual: true,
      permiteNacional: false,
    });
    expect(cidade.slug).toBe('ribeirao-preto');

    // Jornalista da nova cidade
    await repo.authors.setCidade('a-8', cidade.id);
    const j = await repo.authors.listByPapel('jornalista', cidade.id);
    expect(j.map((x) => x.id)).toContain('a-8');

    const pauta = await repo.pautas.criar({
      tema: 'Feira agropecuária local',
      descricao: 'Cobrir abertura e números de público.',
      prioridade: 'alta',
      atribuidos: ['a-8'],
      criadoPor: 'a-7',
      cidadeId: cidade.id,
    });

    const naCidade = await repo.pautas.listAbertas('a-8', cidade.id);
    const naMatriz = await repo.pautas.listAbertas('a-2', 'cid-matriz');
    expect(naCidade.map((p) => p.id)).toContain(pauta.id);
    expect(naMatriz.map((p) => p.id)).not.toContain(pauta.id);
  });

  it('matéria herda cidade e escopo', async () => {
    const repo = createMockRepositories();
    const m = await repo.materias.criar({
      titulo: 'Obra do viaduto avança no centro',
      standfirst: 'Prefeitura prevê entrega em 90 dias.',
      editoria: 'cidades',
      corpo: [{ type: 'paragraph', text: 'Texto local.' }],
      tags: ['campinas'],
      autorId: 'a-8',
      cidadeId: 'cid-campinas',
      escopo: 'local',
    });
    expect(m.cidadeId).toBe('cid-campinas');
    expect(m.escopo).toBe('local');

    const pendentesCampinas = await repo.materias.listPendentes({ cidadeId: 'cid-campinas' });
    // rascunho ainda não é pendente
    expect(pendentesCampinas.items.find((x) => x.id === m.id)).toBeUndefined();
    await repo.materias.enviarParaRevisao(m.id);
    const fila = await repo.materias.listPendentes({ cidadeId: 'cid-campinas' });
    expect(fila.items.map((x) => x.id)).toContain(m.id);
    const filaOutra = await repo.materias.listPendentes({ cidadeId: 'cid-matriz' });
    expect(filaOutra.items.map((x) => x.id)).not.toContain(m.id);
  });
});
