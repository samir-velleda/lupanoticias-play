import { describe, it, expect } from 'vitest';
import { casaRota, hrefAtivo } from './nav';

describe('casaRota', () => {
  it('a home (/) só casa a própria home', () => {
    expect(casaRota('/', '/')).toBe(true);
    expect(casaRota('/economia', '/')).toBe(false);
    expect(casaRota('/economia/uma-materia', '/')).toBe(false);
  });

  it('uma seção casa a própria rota e suas sub-rotas', () => {
    expect(casaRota('/economia', '/economia')).toBe(true);
    expect(casaRota('/economia/uma-materia', '/economia')).toBe(true);
    expect(casaRota('/play/v-1', '/play')).toBe(true);
  });

  it('não casa por prefixo parcial fora do limite de segmento', () => {
    expect(casaRota('/economia-fake', '/economia')).toBe(false);
    expect(casaRota('/economiax', '/economia')).toBe(false);
  });
});

describe('hrefAtivo — nav dos portais (prefixo mais longo)', () => {
  const admin = ['/admin', '/admin/redacao', '/admin/relatorios', '/admin/usuarios'];

  it('o índice /admin acende SÓ na própria /admin, não nas sub-páginas', () => {
    expect(hrefAtivo('/admin', admin)).toBe('/admin');
    expect(hrefAtivo('/admin/usuarios', admin)).toBe('/admin/usuarios');
    expect(hrefAtivo('/admin/redacao', admin)).toBe('/admin/redacao');
  });

  const jornalista = ['/jornalista', '/jornalista/pautas', '/jornalista/materia/nova', '/jornalista/correcoes'];

  it('jornalista: sub-página não acende "Minhas matérias" (/jornalista)', () => {
    expect(hrefAtivo('/jornalista/pautas', jornalista)).toBe('/jornalista/pautas');
    expect(hrefAtivo('/jornalista', jornalista)).toBe('/jornalista');
  });

  it('rota sem item exato cai no ancestral mais próximo (edição → índice)', () => {
    // /jornalista/materia/m-1 não está na nav; casa só /jornalista.
    expect(hrefAtivo('/jornalista/materia/m-1', jornalista)).toBe('/jornalista');
  });

  it('retorna null quando nada casa', () => {
    expect(hrefAtivo('/outra-coisa', admin)).toBeNull();
  });
});
