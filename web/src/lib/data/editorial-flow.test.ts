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

describe('correção de matéria publicada (reabrir sem despublicar)', () => {
  async function publicar() {
    const m = await repo.materias.criar(baseInput());
    await repo.materias.enviarParaRevisao(m.id);
    return repo.materias.aprovar(m.id, 'rev-1'); // → publicada
  }

  it('a origem segue publicada e inalterada até a correção ser aprovada; então recebe o novo conteúdo (mesmo slug)', async () => {
    const origem = await publicar();
    const tituloOriginal = origem.titulo;

    const draft = await repo.materias.reabrirParaCorrecao(origem.id, 'a-2');
    expect(draft.status).toBe('rascunho');
    expect(draft.id).not.toBe(origem.id);

    // durante a correção: origem intocada e no ar
    await repo.materias.atualizar(draft.id, {
      titulo: 'Título corrigido',
      corpo: [{ type: 'paragraph', text: 'texto corrigido' }],
    });
    await repo.materias.enviarParaRevisao(draft.id); // → pendente
    const origemDurante = await repo.materias.getById(origem.id);
    expect(origemDurante?.status).toBe('publicada');
    expect(origemDurante?.titulo).toBe(tituloOriginal);

    // aprovar a correção aplica na ORIGEM (mesmo id/slug, segue publicada); draft arquivado
    const aplicada = await repo.materias.aprovar(draft.id, 'rev-9');
    expect(aplicada.id).toBe(origem.id);
    expect(aplicada.status).toBe('publicada');
    expect(aplicada.slug).toBe(origem.slug);
    expect(aplicada.titulo).toBe('Título corrigido');
    const draftDepois = await repo.materias.getById(draft.id);
    expect(draftDepois?.status).toBe('arquivada');
  });

  it('só publicada pode ser reaberta para correção', async () => {
    const rascunho = await repo.materias.criar(baseInput());
    await expect(repo.materias.reabrirParaCorrecao(rascunho.id, 'a-2')).rejects.toThrow(/publicadas/i);
  });

  it('reusa o rascunho de correção aberto (não duplica)', async () => {
    const origem = await publicar();
    const d1 = await repo.materias.reabrirParaCorrecao(origem.id, 'a-2');
    const d2 = await repo.materias.reabrirParaCorrecao(origem.id, 'a-2');
    expect(d2.id).toBe(d1.id);
  });
});
