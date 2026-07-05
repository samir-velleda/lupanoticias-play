import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Trava de regressão do soft-404 (rota de 2 segmentos com slug inexistente devolvia
 * HTTP 200 em vez de 404).
 *
 * CAUSA RAIZ: um `loading.tsx` cria um Suspense boundary que STREAMA o shell da página
 * com HTTP 200 ANTES de o Server Component resolver e chamar `notFound()`. Com o status
 * já enviado, o not-found renderiza mas o código fica preso em 200 (soft-404). Basta um
 * `loading.tsx` em QUALQUER segmento ancestral (grupo, [editoria], [slug]) para reintroduzir
 * o bug — mesmo que a própria página não tenha um loading.tsx.
 *
 * INVARIANTE TRAVADA AQUI: nenhuma `page.tsx` que chama `notFound()` pode ter um
 * `loading.tsx` na sua cadeia de ancestrais (dela até `src/app`). Skeleton de carregamento,
 * quando necessário, deve vir de um `<Suspense>` INTERNO à página — depois do `notFound()`,
 * que fixa o 404 antes de qualquer stream.
 *
 * (O 404 HTTP real em si foi verificado de ponta a ponta no servidor standalone; este teste
 * garante que a condição estrutural que o quebra não volte pelo código.)
 */

const APP = join(process.cwd(), 'src', 'app');

/** Todas as `page.tsx` (recursivo) cujo código chama `notFound(`. */
function pagesComNotFound(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...pagesComNotFound(full));
    } else if (entry.name === 'page.tsx' && readFileSync(full, 'utf8').includes('notFound(')) {
      out.push(full);
    }
  }
  return out;
}

/** `loading.tsx` ancestrais de um arquivo de página — do próprio segmento até `src/app`. */
function loadingsAncestrais(pageFile: string): string[] {
  const found: string[] = [];
  let dir = join(pageFile, '..');
  // sobe segmento a segmento até (e incluindo) src/app
  for (;;) {
    const loading = join(dir, 'loading.tsx');
    if (existsSync(loading)) found.push(loading);
    if (dir === APP) break;
    dir = join(dir, '..');
  }
  return found;
}

describe('404 real — soft-404 por loading.tsx ancestral', () => {
  const pages = pagesComNotFound(APP);

  it('existem rotas que usam notFound() (sanidade do próprio teste)', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages.map((p) => [relative(APP, p).split(sep).join('/'), p] as const))(
    'rota %s (chama notFound) não tem loading.tsx ancestral',
    (_rel, page) => {
      const loadings = loadingsAncestrais(page).map((l) => relative(APP, l).split(sep).join('/'));
      expect(
        loadings,
        `loading.tsx ancestral cria Suspense boundary que streama HTTP 200 antes do ` +
          `notFound() → soft-404. Remova-o(s) ou mova o skeleton para um <Suspense> ` +
          `interno à página (depois do notFound). Encontrado(s): ${loadings.join(', ')}`,
      ).toEqual([]);
    },
  );

  it('a rota de matéria [editoria]/[slug] chama notFound() para slug inexistente', () => {
    const src = readFileSync(join(APP, '(site)', '[editoria]', '[slug]', 'page.tsx'), 'utf8');
    expect(src).toContain('notFound()');
    // o gate de existência: editoria fora da união fixa OU matéria não encontrada → null → 404
    expect(src).toContain('if (!materia) notFound()');
  });
});
