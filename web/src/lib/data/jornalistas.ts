/**
 * Resolve jornalistas atribuíveis a uma pauta (por cidade).
 * Em produção (Cognito): sincroniza grupo `jornalista` → `author`, filtrando pela cidade.
 * Em mock/local: `authors.listByPapel('jornalista', cidadeId)`.
 */
import type { Author } from '@/types';
import { listarUsuarios } from '@/lib/auth/admin';
import { repositories } from '@/lib/data/repositories';

export async function listarJornalistasAtribuiveis(cidadeId?: string): Promise<Author[]> {
  // Preferência: authors já vinculados à cidade (inclui mock e Cognito já espelhado).
  const daCidade = await repositories.authors.listByPapel('jornalista', cidadeId);
  if (daCidade.length > 0) return daCidade;

  // Fallback Cognito: espelha jornalistas e, se cidadeId, associa ao tenant.
  try {
    const usuarios = await listarUsuarios();
    const doGrupo = usuarios.filter((u) => u.grupos.includes('jornalista') && u.sub);
    if (doGrupo.length > 0) {
      const authors = await Promise.all(
        doGrupo.map((u) =>
          repositories.authors.ensureFromCognito({
            sub: u.sub!,
            nome: u.nome || u.email || u.username,
            email: u.email,
            papel: 'jornalista',
            cidadeId: cidadeId ?? undefined,
          }),
        ),
      );
      const filtrados = cidadeId
        ? authors.filter((a) => a.cidadeId === cidadeId)
        : authors;
      const byId = new Map(filtrados.map((a) => [a.id, a]));
      return [...byId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
  } catch (e) {
    console.error('[lupa] listarJornalistasAtribuiveis (cognito)', e);
  }
  return repositories.authors.listByPapel('jornalista', cidadeId);
}
