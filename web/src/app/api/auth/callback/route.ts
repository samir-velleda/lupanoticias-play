import { NextResponse } from 'next/server';
import { SESSION_COOKIE, STATE_COOKIE, getAuthConfig } from '@/lib/auth/config';
import { trocarCodePorTokens } from '@/lib/auth/cognito';

/** Recebe o `code` do Cognito, valida o state, troca por tokens e cria a sessão. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const base = getAuthConfig().appBaseUrl;

  const stateCookie = req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split('=')[1];

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(new URL('/entrar?erro=state', base));
  }

  const tokens = await trocarCodePorTokens(code);
  if (!tokens) {
    return NextResponse.redirect(new URL('/entrar?erro=token', base));
  }

  const res = NextResponse.redirect(new URL('/', base));
  res.cookies.set(SESSION_COOKIE, tokens.id_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expires_in ?? 3600,
  });
  res.cookies.delete(STATE_COOKIE);
  return res;
}
