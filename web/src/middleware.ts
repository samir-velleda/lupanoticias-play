import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Guarda de origem (endurecimento — CLAUDE.md §0 / pendência de segurança).
 * O CloudFront injeta o header `x-lupa-origin` com um segredo (Secrets Manager);
 * o Lambda recebe o mesmo segredo em `LUPA_ORIGIN_SECRET`. Requisições sem o header
 * correto (ex.: acesso DIRETO à Function URL pública) recebem 403.
 *
 * Em dev/local `LUPA_ORIGIN_SECRET` não está setado → o guard fica inativo (não atrapalha).
 * NOTA: proibido `authType NONE` com dado real — este guard é a barreira até o OAC forte.
 */
const PORTAIS_PROTEGIDOS = ['/admin', '/jornalista', '/estudio'];

export function middleware(req: NextRequest) {
  // 1) Guarda de origem (endurecimento — bloqueia acesso direto à Function URL).
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

  // 2) Gate grosso dos portais: sem cookie de sessão → manda pro login.
  //    A verificação fina do JWT + grupo acontece nos layouts via exigirGrupo().
  const { pathname } = req.nextUrl;
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

// Roda em páginas e APIs; ignora assets estáticos internos do Next (servidos via CDN
// com o header mesmo assim). Cobre todo conteúdo sensível (páginas, /api/*).
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
