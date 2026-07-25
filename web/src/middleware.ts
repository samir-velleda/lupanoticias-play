import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { EDITORIA_SLUGS } from '@/lib/editorias';

/**
 * Guarda de origem + gate de portais + 404 de assets fictícios.
 * Server Actions (header next-action) NÃO podem receber redirect HTML/plain 403
 * genérico sem contexto — isso vira "An unexpected response was received from the server."
 */
const PORTAIS_PROTEGIDOS = ['/admin', '/jornalista', '/estudio'];

const ASSET_EXT =
  /\.(?:jpg|jpeg|png|gif|webp|svg|ico|map|txt|xml|json|woff2?|ttf|eot|mp4|mp3|m3u8|ts|css|js)$/i;

const EDITORIA_SET = new Set<string>(EDITORIA_SLUGS);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isServerAction = Boolean(req.headers.get('next-action'));

  // 0) Assets / seed fictício → 404 barato (nunca em Server Actions)
  if (
    !isServerAction &&
    (pathname.startsWith('/media/') ||
      pathname.startsWith('/avatars/') ||
      pathname.startsWith('/ads/') ||
      ASSET_EXT.test(pathname))
  ) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  // 0b) rotas lixo que não são editoria/portal (só GET de página)
  if (!isServerAction) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const head = parts[0];
      const reserved = new Set([
        'admin',
        'jornalista',
        'estudio',
        'play',
        'cortes',
        'api',
        'entrar',
        'sem-acesso',
        '_next',
      ]);
      if (!reserved.has(head) && !EDITORIA_SET.has(head)) {
        return new NextResponse('Not Found', {
          status: 404,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
    }
  }

  // 1) Guarda de origem (CloudFront injeta x-lupa-origin)
  const secret = process.env.LUPA_ORIGIN_SECRET;
  if (secret && secret.length > 0) {
    const provided = req.headers.get('x-lupa-origin');
    if (provided !== secret) {
      // Server Action: JSON (não plain Forbidden solto)
      if (isServerAction) {
        return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
      }
      return new NextResponse('Forbidden', {
        status: 403,
        headers: { 'content-type': 'text/plain' },
      });
    }
  }

  // 2) Gate portais
  const protegido = PORTAIS_PROTEGIDOS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (protegido && !req.cookies.get('lupa_session')) {
    // Server Action sem cookie: 401 JSON (redirect HTML quebra o protocol da action)
    if (isServerAction) {
      return NextResponse.json(
        { error: 'Sessão expirada. Faça login novamente.' },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = '/api/auth/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
