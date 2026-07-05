import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Trava de regressão de SQL (bug que derrubava /economia e a fila da redação com
 * "syntax error at or near )").
 *
 * MAT_SELECT / MEDIA_SELECT terminam em "FROM <tabela>". Anexar
 * `${MAT_SELECT}, count(*) OVER() AS _total` joga o count DEPOIS do FROM
 * (→ `FROM materia m, count(*) OVER()`), o que o Postgres lê como table-function no
 * FROM clause → erro de sintaxe. O count TEM de entrar no SELECT via
 * `.replace('FROM materia m', ', count(*) OVER() AS _total FROM materia m')`.
 *
 * (O bug ficava latente enquanto as páginas eram estáticas/prerender-de-mock; virou 500
 * quando a categoria virou dinâmica e passou a rodar a query no Aurora em runtime.)
 */
const src = readFileSync(
  join(process.cwd(), 'src', 'lib', 'data', 'aurora', 'index.ts'),
  'utf8',
);

describe('aurora SQL — count(*) OVER() dentro do SELECT (antes do FROM)', () => {
  it('não usa o padrão quebrado ${MAT_SELECT}, count(*) OVER()', () => {
    expect(src).not.toMatch(/MAT_SELECT\}\s*,\s*count\(\*\)\s*OVER/);
  });

  it('não usa o padrão quebrado ${MEDIA_SELECT}, count(*) OVER()', () => {
    expect(src).not.toMatch(/MEDIA_SELECT\}\s*,\s*count\(\*\)\s*OVER/);
  });

  it('paginação de matéria injeta o count via replace(FROM materia m)', () => {
    expect(src).toMatch(/count\(\*\) OVER\(\) AS _total/); // o recurso existe
    expect(src).toMatch(
      /MAT_SELECT\.replace\(\s*'FROM materia m',\s*', count\(\*\) OVER\(\) AS _total FROM materia m'\s*\)/,
    );
  });
});
