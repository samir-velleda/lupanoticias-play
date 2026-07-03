/**
 * Lógica de "item de navegação ativo", compartilhada pela nav do site (HeaderNav)
 * e pela nav dos portais (PortalNav). Pura e testável.
 */

/** Uma rota "casa" um href se for a própria rota ou uma sub-rota dela. `/` casa só a home. */
export function casaRota(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Href ativo entre `hrefs` = o de PREFIXO correspondente MAIS LONGO.
 * Evita que o item índice (ex.: `/admin`, `/jornalista`), que é prefixo de todas
 * as sub-rotas, fique aceso em todas elas. `null` quando nada casa.
 */
export function hrefAtivo(pathname: string, hrefs: string[]): string | null {
  return hrefs
    .filter((h) => casaRota(pathname, h))
    .reduce<string | null>((best, h) => (h.length > (best?.length ?? -1) ? h : best), null);
}
