import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { Papel } from '@/types';
import { getAuthConfig, SESSION_COOKIE } from './config';

export interface Usuario {
  sub: string;
  email?: string;
  nome?: string;
  grupos: Papel[];
}

const PAPEIS: Papel[] = ['admin', 'diretor', 'jornalista'];

type Verifier = ReturnType<typeof CognitoJwtVerifier.create>;
let verifierCache: Verifier | null = null;

function getVerifier(): Verifier | null {
  const c = getAuthConfig();
  if (!c.userPoolId || !c.clientId) return null;
  if (!verifierCache) {
    verifierCache = CognitoJwtVerifier.create({
      userPoolId: c.userPoolId,
      clientId: c.clientId,
      tokenUse: 'id',
    });
  }
  return verifierCache;
}

/** Usuário logado (verifica o id token do cookie de sessão). null se não logado. */
export async function getUsuarioAtual(): Promise<Usuario | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verifier = getVerifier();
  if (!verifier) return null;
  try {
    const payload = await verifier.verify(token);
    const raw = payload['cognito:groups'];
    const grupos = (Array.isArray(raw) ? raw : []).filter((g): g is Papel =>
      PAPEIS.includes(g as Papel),
    );
    return {
      sub: payload.sub,
      email: payload.email as string | undefined,
      nome: (payload.name as string | undefined) ?? (payload.email as string | undefined),
      grupos,
    };
  } catch {
    return null;
  }
}

/** Admin herda tudo; senão precisa de ao menos um dos grupos pedidos. */
export function temAcesso(u: Usuario | null, grupos: Papel[]): boolean {
  if (!u) return false;
  if (u.grupos.includes('admin')) return true;
  return grupos.some((g) => u.grupos.includes(g));
}

/** Exige um dos grupos; redireciona para login (não logado) ou /sem-acesso (sem grupo). */
export async function exigirGrupo(...grupos: Papel[]): Promise<Usuario> {
  const u = await getUsuarioAtual();
  if (!u) redirect('/api/auth/login');
  if (!temAcesso(u, grupos)) redirect('/sem-acesso');
  return u;
}
