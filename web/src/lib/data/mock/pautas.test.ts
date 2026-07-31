import { describe, expect, it } from 'vitest';
import { createMockRepositories } from './index';

describe('pautas no mock', () => {
  it('mostra ao jornalista somente pautas gerais ou atribuídas a ele', async () => {
    const repo = createMockRepositories();

    const daBeatriz = await repo.pautas.listAbertas('a-3');
    const doRafael = await repo.pautas.listAbertas('a-2');

    expect(daBeatriz.map((p) => p.id)).toContain('pt-1');
    expect(daBeatriz.map((p) => p.id)).not.toContain('pt-2');
    expect(doRafael.map((p) => p.id)).toContain('pt-2');
    expect(doRafael.map((p) => p.id)).not.toContain('pt-1');
  });

  it('cria pauta geral e permite marcá-la como em produção', async () => {
    const repo = createMockRepositories();
    const pauta = await repo.pautas.criar({
      tema: 'Acompanhar a sessão desta semana',
      descricao: 'Apurar os destaques e ouvir os envolvidos.',
      prioridade: 'media',
      atribuidos: [],
      criadoPor: 'a-1',
    });

    expect((await repo.pautas.listAbertas('a-2')).map((p) => p.id)).toContain(pauta.id);
    const emProducao = await repo.pautas.atualizar(pauta.id, { status: 'em_producao' });
    expect(emProducao.status).toBe('em_producao');
  });

  it('diretor/admin sugerem pauta atribuída e só o jornalista-alvo a vê', async () => {
    const repo = createMockRepositories();
    const jornalistas = await repo.authors.listByPapel('jornalista', 'cid-matriz');
    expect(jornalistas.length).toBeGreaterThan(0);
    const alvo = jornalistas[0]!;
    const outro = jornalistas.find((j) => j.id !== alvo.id)!;

    const pauta = await repo.pautas.criar({
      tema: 'Apurar impacto da medida no interior',
      descricao: 'Falar com prefeitos e comércio local.',
      prioridade: 'alta',
      atribuidos: [alvo.id],
      criadoPor: 'a-1',
      cidadeId: 'cid-matriz',
    });

    const paraAlvo = await repo.pautas.listAbertas(alvo.id, 'cid-matriz');
    const paraOutro = await repo.pautas.listAbertas(outro.id, 'cid-matriz');
    const paraStaff = await repo.pautas.listAbertas(undefined, 'cid-matriz');

    expect(paraAlvo.map((p) => p.id)).toContain(pauta.id);
    expect(paraOutro.map((p) => p.id)).not.toContain(pauta.id);
    expect(paraStaff.map((p) => p.id)).toContain(pauta.id);
  });
});
