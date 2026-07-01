import { describe, it, expect } from 'vitest';
import {
  formatData,
  formatRelativo,
  formatDuracao,
  formatNumero,
  formatViews,
} from './format';

describe('formatData', () => {
  it('formata data/hora pt-BR com timeZone UTC determinístico', () => {
    expect(formatData('2026-07-01T08:20:00Z', { timeZone: 'UTC' })).toBe(
      '1 de julho de 2026 · 08h20',
    );
  });
  it('zera minutos/horas à meia-noite', () => {
    expect(formatData('2026-12-25T00:05:00Z', { timeZone: 'UTC' })).toBe(
      '25 de dezembro de 2026 · 00h05',
    );
  });
  it('retorna vazio para data inválida', () => {
    expect(formatData('nao-e-data')).toBe('');
  });
});

describe('formatRelativo', () => {
  const now = new Date('2026-07-01T12:00:00Z');
  it('agora para < 45s', () => {
    expect(formatRelativo('2026-07-01T11:59:30Z', now)).toBe('agora');
  });
  it('minutos', () => {
    expect(formatRelativo('2026-07-01T11:48:00Z', now)).toBe('há 12 min');
  });
  it('1 hora', () => {
    expect(formatRelativo('2026-07-01T11:00:00Z', now)).toBe('há 1 h');
  });
  it('3 horas', () => {
    expect(formatRelativo('2026-07-01T09:00:00Z', now)).toBe('há 3 h');
  });
  it('dias', () => {
    expect(formatRelativo('2026-06-29T12:00:00Z', now)).toBe('há 2 d');
  });
});

describe('formatDuracao', () => {
  it('mm:ss', () => {
    expect(formatDuracao(252)).toBe('4:12');
  });
  it('padding de segundos', () => {
    expect(formatDuracao(65)).toBe('1:05');
  });
  it('hh:mm:ss quando >= 1h', () => {
    expect(formatDuracao(3661)).toBe('1:01:01');
  });
  it('0:00 para inválido/negativo', () => {
    expect(formatDuracao(-5)).toBe('0:00');
    expect(formatDuracao(NaN)).toBe('0:00');
  });
});

describe('formatNumero', () => {
  it('milhares com decimal', () => {
    expect(formatNumero(12400)).toBe('12,4 mil');
  });
  it('milhar exato sem decimal', () => {
    expect(formatNumero(24000)).toBe('24 mil');
  });
  it('milhões', () => {
    expect(formatNumero(1_200_000)).toBe('1,2 mi');
  });
  it('abaixo de mil', () => {
    expect(formatNumero(999)).toBe('999');
  });
});

describe('formatViews', () => {
  it('plural', () => {
    expect(formatViews(24000)).toBe('24 mil visualizações');
  });
  it('singular', () => {
    expect(formatViews(1)).toBe('1 visualização');
  });
});
