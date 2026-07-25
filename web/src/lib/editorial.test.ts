import { describe, expect, it } from 'vitest';
import { corpoTemConteudo, limparCorpo, STATUS_EDITAVEL, STATUS_PODE_ENVIAR } from './editorial';

describe('editorial', () => {
  it('corpoTemConteudo exige texto real', () => {
    expect(corpoTemConteudo([])).toBe(false);
    expect(corpoTemConteudo([{ type: 'paragraph', text: '   ' }])).toBe(false);
    expect(corpoTemConteudo([{ type: 'paragraph', text: 'Olá mundo' }])).toBe(true);
    expect(corpoTemConteudo([{ type: 'image', url: 'https://x.com/a.jpg' }])).toBe(true);
  });

  it('limparCorpo remove vazios', () => {
    const out = limparCorpo([
      { type: 'paragraph', text: '' },
      { type: 'paragraph', text: 'Ok' },
      { type: 'heading', text: '  ' },
    ]);
    expect(out).toEqual([{ type: 'paragraph', text: 'Ok' }]);
  });

  it('status de workflow', () => {
    expect(STATUS_EDITAVEL.has('publicada')).toBe(false);
    expect(STATUS_PODE_ENVIAR.has('rascunho')).toBe(true);
    expect(STATUS_PODE_ENVIAR.has('em_correcao')).toBe(true);
  });
});
