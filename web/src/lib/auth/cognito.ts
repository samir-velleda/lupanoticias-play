import { getAuthConfig, REDIRECT_PATH } from './config';

/** URL do Hosted UI (authorization code grant). */
export function authorizeUrl(state: string): string {
  const c = getAuthConfig();
  const params = new URLSearchParams({
    client_id: c.clientId ?? '',
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: `${c.appBaseUrl}${REDIRECT_PATH}`,
    state,
  });
  return `${c.domain}/oauth2/authorize?${params.toString()}`;
}

/** URL de logout do Cognito (limpa a sessão do Hosted UI). */
export function logoutUrl(): string {
  const c = getAuthConfig();
  const params = new URLSearchParams({
    client_id: c.clientId ?? '',
    logout_uri: `${c.appBaseUrl}/`,
  });
  return `${c.domain}/logout?${params.toString()}`;
}

export interface CognitoTokens {
  id_token: string;
  access_token: string;
  expires_in: number;
}

/** Troca o `code` por tokens (app client é público, sem secret). */
export async function trocarCodePorTokens(code: string): Promise<CognitoTokens | null> {
  const c = getAuthConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: c.clientId ?? '',
    code,
    redirect_uri: `${c.appBaseUrl}${REDIRECT_PATH}`,
  });
  const res = await fetch(`${c.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as CognitoTokens;
}
