import { NextResponse } from 'next/server';
import { SESSION_COOKIE, authConfigurada, getAuthConfig } from '@/lib/auth/config';
import { logoutUrl } from '@/lib/auth/cognito';

/** Encerra a sessão local e (se configurado) desloga do Hosted UI do Cognito. */
export async function GET() {
  const base = getAuthConfig().appBaseUrl;
  const destino = authConfigurada() ? logoutUrl() : `${base}/`;
  const res = NextResponse.redirect(destino);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
