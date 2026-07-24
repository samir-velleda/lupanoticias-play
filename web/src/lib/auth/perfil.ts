import type { Papel } from '@/types';
import type { Usuario } from './session';
import { repositories } from '@/lib/data/repositories';

function papelPrincipal(u: Usuario): Papel {
  if (u.grupos.includes('admin')) return 'admin';
  if (u.grupos.includes('diretor')) return 'diretor';
  return 'jornalista';
}

/**
 * Resolve (e cria se preciso) o `author.id` a partir do Cognito sub.
 * Em mock, devolve o autor demo do papel correspondente.
 */
export async function autorIdDoUsuario(u: Usuario): Promise<string> {
  const author = await repositories.authors.ensureFromCognito({
    sub: u.sub,
    nome: u.nome,
    email: u.email,
    papel: papelPrincipal(u),
  });
  return author.id;
}
