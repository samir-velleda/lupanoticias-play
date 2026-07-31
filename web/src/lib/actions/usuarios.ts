'use server';

import { z } from 'zod';
import { exigirGrupo } from '@/lib/auth/session';
import { criarUsuario } from '@/lib/auth/admin';
import { repositories } from '@/lib/data/repositories';
import { isNextControlFlowError, mensagemErro, safeRevalidatePath } from '@/lib/cache-safe';
import type { Papel } from '@/types';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  nome: z.string().trim().min(1, 'Nome obrigatório'),
  grupo: z.enum(['admin', 'diretor', 'jornalista']),
  cidadeId: z.string().trim().optional(),
});

export interface CriarUsuarioResult {
  ok: boolean;
  erro?: string;
}

/** Cria um usuário Cognito, atribui papel e vincula à cidade (licença). Só Master. */
export async function criarUsuarioAction(
  _prev: CriarUsuarioResult,
  formData: FormData,
): Promise<CriarUsuarioResult> {
  await exigirGrupo('admin');
  const parsed = schema.safeParse({
    email: formData.get('email'),
    nome: formData.get('nome'),
    grupo: formData.get('grupo'),
    cidadeId: formData.get('cidadeId') || undefined,
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { email, nome, grupo, cidadeId } = parsed.data;
  if (grupo !== 'admin' && !cidadeId) {
    return { ok: false, erro: 'Diretor e Jornalista precisam de uma cidade/licença.' };
  }
  if (cidadeId) {
    const c = await repositories.cidades.getById(cidadeId);
    if (!c) return { ok: false, erro: 'Cidade/licença inválida.' };
  }
  try {
    const criado = await criarUsuario(email, nome, grupo as Papel);
    // Espelha author + tenant (Master sem cidadeId).
    if (criado.sub) {
      await repositories.authors.ensureFromCognito({
        sub: criado.sub,
        nome: criado.nome,
        email: criado.email,
        papel: criado.grupo,
        cidadeId: grupo === 'admin' ? null : (cidadeId ?? null),
      });
    }
    safeRevalidatePath('/admin/usuarios');
    safeRevalidatePath('/admin/cidades');
    safeRevalidatePath('/admin/redacao/pautas/nova');
    return { ok: true };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return { ok: false, erro: mensagemErro(e, 'Falha ao criar usuário') };
  }
}
