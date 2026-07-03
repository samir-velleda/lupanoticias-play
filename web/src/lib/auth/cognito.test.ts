import { describe, it, expect } from 'vitest';
import { gruposDoIdToken, destinoPorGrupos } from './cognito';

function fakeIdToken(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.assinatura`;
}

describe('gruposDoIdToken', () => {
  it('extrai cognito:groups do payload', () => {
    expect(gruposDoIdToken(fakeIdToken({ 'cognito:groups': ['admin', 'diretor'] }))).toEqual([
      'admin',
      'diretor',
    ]);
  });
  it('retorna [] quando não há grupos', () => {
    expect(gruposDoIdToken(fakeIdToken({ sub: '123' }))).toEqual([]);
  });
  it('retorna [] para token inválido', () => {
    expect(gruposDoIdToken('nao-e-jwt')).toEqual([]);
  });
});

describe('destinoPorGrupos (redirect por papel)', () => {
  it('admin → /admin', () => {
    expect(destinoPorGrupos(['admin'])).toBe('/admin');
  });
  it('diretor → /admin', () => {
    expect(destinoPorGrupos(['diretor'])).toBe('/admin');
  });
  it('jornalista → /jornalista', () => {
    expect(destinoPorGrupos(['jornalista'])).toBe('/jornalista');
  });
  it('admin tem precedência sobre jornalista', () => {
    expect(destinoPorGrupos(['jornalista', 'admin'])).toBe('/admin');
  });
  it('sem grupo → home', () => {
    expect(destinoPorGrupos([])).toBe('/');
  });
});
