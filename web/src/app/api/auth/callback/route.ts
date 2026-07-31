import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  NEXT_COOKIE,
  getAuthConfig,
  pathInternoSeguro,
} from '@/lib/auth/config';
import { trocarCodePorTokens, gruposDoIdToken, destinoPorGrupos } from '@/lib/auth/cognito';

function cookieValue(req: Request, name: string): string | undefined {
  return req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

/** Recebe o `code` do Cognito, valida o state, troca por tokens e cria a sessão. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const base = getAuthConfig().appBaseUrl;

  const stateCookie = cookieValue(req, STATE_COOKIE);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(new URL('/entrar?erro=state', base));
  }

  const tokens = await trocarCodePorTokens(code);
  if (!tokens) {
    return NextResponse.redirect(new URL('/entrar?erro=token', base));
  }

  // Preferência: return path (Desapegoo etc.). Senão papel editorial.
  const next = pathInternoSeguro(
    cookieValue(req, NEXT_COOKIE) ? decodeURIComponent(cookieValue(req, NEXT_COOKIE)!) : null,
  );
  const destino = next ?? destinoPorGrupos(gruposDoIdToken(tokens.id_token));
  const res = NextResponse.redirect(new URL(destino, base));
  res.cookies.set(SESSION_COOKIE, tokens.id_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expires_in ?? 3600,
  });
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(NEXT_COOKIE);
  return res;
}
