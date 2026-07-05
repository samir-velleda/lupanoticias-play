import { describe, it, expect } from 'vitest';
import { createMockRepositories } from '@/lib/data/mock';
import type { CriarMateriaInput } from '@/types';

/**
 * Trava da máquina de estados editorial (guardas de transição de status).
 * Exercita o repositório MOCK (mesmo contrato do Aurora) para garantir que:
 *  - conteúdo publicado não é editado/despublicado direto;
 *  - aprovar/recusar só valem sobre 'pendente' (sem re-publicação / reset de data);
 *  - recusa exige justificativa; recusada é editável e reenviável.
 * O estado do mock é de módulo (compartilhado); cada teste cria a SUA matéria.
 */
let _n = 0;
const baseInput = (): CriarMateriaInput => ({
  titulo: `Fluxo editorial teste ${++_n}`,
  standfirst: 'resumo',
  editoria: 'economia', // sem modo automático no seed → vai para pendente
  corpo: [{ type: 'paragraph', text: 'corpo' }],
  tags: [],
});

const repo = createMockRepositories();

describe('máquina de estados editorial', () => {
  it('criar → rascunho; atualizar permitido; enviar → pendente', async () => {
    const m = await repo.materias.criar(baseInput());
    expect(m.status).toBe('rascunho');
    const upd = await repo.materias.atualizar(m.id, { titulo: 'Título revisado' });
    expect(upd.titulo).toBe('Título revisado');
    const enviada = await repo.materias.enviarParaRevisao(m.id);
    expect(enviada.status).toBe('pendente');
  });

  it('aprovar publica só a partir de pendente; re-aprovar rejeita', async () => {
    const m = await repo.materias.criar(baseInput());
    await repo.materias.enviarParaRevisao(m.id);
    const pub = await repo.materias.aprovar(m.id, 'rev-1');
    expect(pub.status).toBe('publicada');
    expect(pub.publishedAt).toBeTruthy();
    await expect(repo.materias.aprovar(m.id, 'rev-1')).rejects.toThrow(/pendentes/i);
  });

  it('editar OU reenviar matéria publicada é bloqueado', async () => {
    const m = await repo.materias.criar(baseInput());
    await repo.materias.enviarParaRevisao(m.id);
    await repo.materias.aprovar(m.id, 'rev-1');
    await expect(repo.materias.atualizar(m.id, { titulo: 'x' })).rejects.toThrow();
    await expect(repo.materias.enviarParaRevisao(m.id)).rejects.toThrow();
  });

  it('recusar exige pendente + justificativa; recusada reenvia', async () => {
    const m = await repo.materias.criar(baseInput());
    await repo.materias.enviarParaRevisao(m.id);
    await expect(repo.materias.recusar(m.id, 'rev-1', '   ')).rejects.toThrow(/justificativa/i);
    const rec = await repo.materias.recusar(m.id, 'rev-1', 'Faltou fonte oficial');
    expect(rec.status).toBe('recusada');
    const revs = await repo.materias.listRevisoes(m.id);
    expect(revs.some((r) => r.justificativa === 'Faltou fonte oficial')).toBe(true);
    // recusada é editável e reenviável
    const reenviada = await repo.materias.enviarParaRevisao(m.id);
    expect(reenviada.status).toBe('pendente');
    // não se pode recusar uma que já não está pendente
    await repo.materias.aprovar(m.id, 'rev-1');
    await expect(repo.materias.recusar(m.id, 'rev-1', 'tarde demais')).rejects.toThrow(/pendentes/i);
  });
});
