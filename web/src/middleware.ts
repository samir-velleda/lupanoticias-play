import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { EDITORIA_SLUGS } from '@/lib/editorias';

/**
 * Guarda de origem + gate de portais + 404 rápido de assets fictícios.
 * Paths como /media/cover-*.jpg NÃO podem cair em [editoria]/[slug] (gera
 * digest RSC / prerender ENOENT no Lambda).
 */
const PORTAIS_PROTEGIDOS = ['/admin', '/jornalista', '/estudio'];

const ASSET_EXT = /\.(?:jpg|jpeg|png|gif|webp|svg|ico|map|txt|xml|json|woff2?|ttf|eot|mp4|mp3|m3u8|ts|css|js)$/i;

const EDITORIA_SET = new Set<string>(EDITORIA_SLUGS);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0) Assets e paths de seed fictício → 404 barato (sem Server Components).
  if (
    pathname.startsWith('/media/') ||
    pathname.startsWith('/avatars/') ||
    pathname.startsWith('/ads/') ||
    ASSET_EXT.test(pathname)
  ) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  // 0b) /{algo}/... que não é editoria conhecida, play, api, portal → 404 barato
  //     (evita [editoria]/[slug] processar lixo).
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

  // 1) Guarda de origem (CloudFront → Lambda).
  const secret = process.env.LUPA_ORIGIN_SECRET;
  if (secret && secret.length > 0) {
    const provided = req.headers.get('x-lupa-origin');
    if (provided !== secret) {
      return new NextResponse('Forbidden', {
        status: 403,
        headers: { 'content-type': 'text/plain' },
      });
    }
  }

  // 2) Gate grosso dos portais.
  const protegido = PORTAIS_PROTEGIDOS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (protegido && !req.cookies.get('lupa_session')) {
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
