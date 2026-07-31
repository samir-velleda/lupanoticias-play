'use server';

import { z } from 'zod';
import { desapegoRepo } from '@/lib/data/desapego';
import { exigirLogin, getUsuarioAtual } from '@/lib/auth/session';
import { podeVender } from '@/types/desapego';
import {
  chavePixValida,
  cpfValido,
  soDigitos,
  telefoneValido,
} from '@/lib/desapego/kyc-validate';
import { safeRevalidatePath, mensagemErro, isNextControlFlowError } from '@/lib/cache-safe';

const anuncioSchema = z.object({
  titulo: z.string().trim().min(3, 'Informe um título.').max(120),
  descricao: z.string().trim().min(10, 'Conte um pouco a história do item.').max(5000),
  categoria: z.enum(['roupas', 'eletronicos', 'moveis', 'outros']),
  estado: z.enum(['novinho', 'usado_com_amor', 'bem_vivido']),
  precoCentavos: z.number().int().min(100, 'Preço mínimo R$ 1,00.').max(10_000_000),
  precoAntigoCentavos: z.number().int().positive().optional(),
  fotos: z.array(z.string()).max(8).default([]),
  freteGratis: z.boolean().optional(),
});

export type CriarAnuncioPayload = z.input<typeof anuncioSchema>;

export interface CriarAnuncioResult {
  ok: boolean;
  erro?: string;
  slug?: string;
  redirectTo?: string;
}

export async function criarAnuncioDesapego(
  payload: CriarAnuncioPayload,
): Promise<CriarAnuncioResult> {
  try {
    const usuario = await exigirLogin('/desapegoo/vender');
    const vendedor = await desapegoRepo.ensureVendedorFromCognito({
      cognitoSub: usuario.sub,
      email: usuario.email,
      nome: usuario.nome,
    });
    if (!podeVender(vendedor)) {
      return {
        ok: false,
        erro: 'Complete o cadastro KYC (CPF, telefone e Pix) antes de anunciar.',
        redirectTo: '/desapegoo/kyc',
      };
    }

    const parsed = anuncioSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }
    const data = parsed.data;
    const anuncio = await desapegoRepo.criar({
      titulo: data.titulo,
      descricao: data.descricao,
      categoria: data.categoria,
      estado: data.estado,
      precoCentavos: data.precoCentavos,
      precoAntigoCentavos: data.precoAntigoCentavos,
      fotos: data.fotos,
      freteGratis: data.freteGratis,
      vendedorId: vendedor.id,
    });
    safeRevalidatePath('/desapegoo');
    safeRevalidatePath('/desapegoo/busca');
    safeRevalidatePath(`/desapegoo/p/${anuncio.slug}`);
    safeRevalidatePath(`/desapegoo/lojinha/${anuncio.vendedor.slug}`);
    safeRevalidatePath('/desapegoo/minha-lojinha');
    return {
      ok: true,
      slug: anuncio.slug,
      redirectTo: `/desapegoo/p/${anuncio.slug}`,
    };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[desapegoo] criarAnuncio', e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao publicar anúncio.') };
  }
}

const kycSchema = z.object({
  nomeLojinha: z.string().trim().min(3, 'Nome da lojinha obrigatório.').max(80),
  nomeCompleto: z.string().trim().min(5, 'Nome completo obrigatório.').max(120),
  cpf: z.string().trim().min(11),
  telefone: z.string().trim().min(10),
  chavePix: z.string().trim().min(5).max(77),
  cidade: z.string().trim().max(80).optional(),
  uf: z.string().trim().max(2).optional(),
  bio: z.string().trim().max(500).optional(),
});

export interface SalvarKycResult {
  ok: boolean;
  erro?: string;
  redirectTo?: string;
}

export async function salvarKycDesapego(form: {
  nomeLojinha: string;
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  chavePix: string;
  cidade?: string;
  uf?: string;
  bio?: string;
}): Promise<SalvarKycResult> {
  try {
    const usuario = await exigirLogin('/desapegoo/kyc');
    const parsed = kycSchema.safeParse(form);
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }
    const data = parsed.data;
    const cpf = soDigitos(data.cpf);
    if (!cpfValido(cpf)) return { ok: false, erro: 'CPF inválido.' };
    if (!telefoneValido(data.telefone)) return { ok: false, erro: 'Telefone inválido (DDD + número).' };
    if (!chavePixValida(data.chavePix)) return { ok: false, erro: 'Chave Pix inválida.' };

    await desapegoRepo.ensureVendedorFromCognito({
      cognitoSub: usuario.sub,
      email: usuario.email,
      nome: data.nomeLojinha,
    });
    const v = await desapegoRepo.salvarKyc(usuario.sub, {
      nomeLojinha: data.nomeLojinha,
      nomeCompleto: data.nomeCompleto,
      cpf,
      telefone: soDigitos(data.telefone),
      chavePix: data.chavePix.trim(),
      cidade: data.cidade,
      uf: data.uf,
      bio: data.bio,
    });
    safeRevalidatePath('/desapegoo/kyc');
    safeRevalidatePath('/desapegoo/minha-lojinha');
    safeRevalidatePath('/desapegoo/vender');
    safeRevalidatePath(`/desapegoo/lojinha/${v.slug}`);
    return { ok: true, redirectTo: '/desapegoo/vender' };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[desapegoo] salvarKyc', e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao salvar cadastro.') };
  }
}

/** Snapshot do vendedor logado (ou null). */
export async function getMinhaLojinha() {
  const u = await getUsuarioAtual();
  if (!u) return null;
  return desapegoRepo.ensureVendedorFromCognito({
    cognitoSub: u.sub,
    email: u.email,
    nome: u.nome,
  });
}
