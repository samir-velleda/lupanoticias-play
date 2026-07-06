import { describe, it, expect } from 'vitest';
import { createMockRepositories } from '@/lib/data/mock';
import type { CreateMediaInput } from '@/types';

/**
 * Máquina de estados da mídia (lado do app): criarUpload nasce 'processando' com o id
 * e autor dados; getById reflete. A transição processando→pronto/erro é do pipeline
 * (Lambda lupa-mc-complete grava no Aurora) e é validada de ponta a ponta no 1º upload.
 */
const repo = createMockRepositories();

const input: CreateMediaInput = {
  tipo: 'video',
  titulo: 'Vídeo de teste',
  editoria: 'economia',
  tags: [],
  visibilidade: 'rascunho',
  destaque: false,
  transcricaoAuto: false,
  gerarLegendasVTT: false,
  uploadKey: 'uploads/media-xyz/clipe.mp4',
};

describe('mídia — criarUpload', () => {
  it('cria com id/autor dados e status processando; getById reflete', async () => {
    const m = await repo.media.criarUpload(input, { id: 'media-xyz', autorId: 'a-2' });
    expect(m.id).toBe('media-xyz');
    expect(m.status).toBe('processando');
    expect(m.tipo).toBe('video');
    const lido = await repo.media.getById('media-xyz');
    expect(lido?.status).toBe('processando');
    expect(lido?.autor?.id).toBe('a-2');
  });
});
