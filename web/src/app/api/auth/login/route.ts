import { NextResponse } from 'next/server';
import {
  authConfigurada,
  STATE_COOKIE,
  NEXT_COOKIE,
  pathInternoSeguro,
} from '@/lib/auth/config';
import { authorizeUrl } from '@/lib/auth/cognito';

/** Inicia o login: gera state (CSRF) e redireciona ao Hosted UI do Cognito. */
export async function GET(req: Request) {
  if (!authConfigurada()) {
    const url = new URL(req.url);
    const next = pathInternoSeguro(url.searchParams.get('next'));
    const entrar = new URL('/entrar?erro=config', req.url);
    if (next) entrar.searchParams.set('next', next);
    return NextResponse.redirect(entrar);
  }
  const url = new URL(req.url);
  const next = pathInternoSeguro(url.searchParams.get('next'));
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  if (next) {
    res.cookies.set(NEXT_COOKIE, next, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
  } else {
    res.cookies.delete(NEXT_COOKIE);
  }
  return res;
}
