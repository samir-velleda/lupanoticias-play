'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { exigirGrupo } from '@/lib/auth/session';
import { criarUsuario } from '@/lib/auth/admin';
import type { Papel } from '@/types';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  nome: z.string().trim().min(1, 'Nome obrigatório'),
  grupo: z.enum(['admin', 'diretor', 'jornalista']),
});

export interface CriarUsuarioResult {
  ok: boolean;
  erro?: string;
}

/** Cria um usuário Cognito e atribui o papel (só admin). */
export async function criarUsuarioAction(
  _prev: CriarUsuarioResult,
  formData: FormData,
): Promise<CriarUsuarioResult> {
  await exigirGrupo('admin');
  const parsed = schema.safeParse({
    email: formData.get('email'),
    nome: formData.get('nome'),
    grupo: formData.get('grupo'),
  });
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  try {
    await criarUsuario(parsed.data.email, parsed.data.nome, parsed.data.grupo as Papel);
    revalidatePath('/admin/usuarios');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao criar usuário' };
  }
}
