import { NextResponse } from 'next/server';
import { authConfigurada, STATE_COOKIE } from '@/lib/auth/config';
import { authorizeUrl } from '@/lib/auth/cognito';

/** Inicia o login: gera state (CSRF) e redireciona ao Hosted UI do Cognito. */
export async function GET(req: Request) {
  if (!authConfigurada()) {
    return NextResponse.redirect(new URL('/entrar?erro=config', req.url));
  }
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
