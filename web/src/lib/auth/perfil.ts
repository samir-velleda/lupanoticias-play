import type { Author, Papel } from '@/types';
import type { Usuario } from './session';
import { repositories } from '@/lib/data/repositories';

function papelPrincipal(u: Usuario): Papel {
  if (u.grupos.includes('admin')) return 'admin';
  if (u.grupos.includes('diretor')) return 'diretor';
  return 'jornalista';
}

/**
 * Resolve (e cria se preciso) o Author a partir do Cognito sub.
 * Em mock, devolve o autor demo do papel correspondente.
 */
export async function autorDoUsuario(u: Usuario): Promise<Author> {
  return repositories.authors.ensureFromCognito({
    sub: u.sub,
    nome: u.nome,
    email: u.email,
    papel: papelPrincipal(u),
  });
}

/**
 * Resolve (e cria se preciso) o `author.id` a partir do Cognito sub.
 */
export async function autorIdDoUsuario(u: Usuario): Promise<string> {
  const author = await autorDoUsuario(u);
  return author.id;
}

/** Cidade do usuário (undefined se Master/admin sem vínculo). */
export async function cidadeIdDoUsuario(u: Usuario): Promise<string | undefined> {
  if (u.grupos.includes('admin')) return undefined;
  const author = await autorDoUsuario(u);
  return author.cidadeId;
}
