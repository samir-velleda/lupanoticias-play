/**
 * Config de auth Cognito — lida do ambiente (do SSM /lupa/<env>/* no Lambda).
 * Ver docs/AWS_ARCHITECTURE.md §6 e docs/EDITORIAL_WORKFLOW.md §1.
 */
export interface AuthConfig {
  region: string;
  userPoolId?: string;
  clientId?: string;
  /** domínio hospedado do Cognito, ex.: https://lupa-users-dev.auth.us-east-1.amazoncognito.com */
  domain?: string;
  appBaseUrl: string;
}

export function getAuthConfig(): AuthConfig {
  return {
    region: process.env.AWS_REGION ?? 'us-east-1',
    userPoolId: process.env.LUPA_COGNITO_USER_POOL_ID,
    clientId: process.env.LUPA_COGNITO_CLIENT_ID,
    domain: process.env.LUPA_COGNITO_DOMAIN,
    appBaseUrl: process.env.LUPA_WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3000',
  };
}

/** Auth está configurada (deploy com Cognito)? Em dev local costuma ser false. */
export function authConfigurada(c = getAuthConfig()): boolean {
  return !!(c.userPoolId && c.clientId && c.domain);
}

export const SESSION_COOKIE = 'lupa_session';
export const STATE_COOKIE = 'lupa_oauth_state';
export const REDIRECT_PATH = '/api/auth/callback';
