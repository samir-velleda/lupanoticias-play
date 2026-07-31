'use server';

import { z } from 'zod';
import { desapegoRepo } from '@/lib/data/desapego';
import { safeRevalidatePath, mensagemErro, isNextControlFlowError } from '@/lib/cache-safe';

const schema = z.object({
  titulo: z.string().trim().min(3, 'Informe um título.').max(120),
  descricao: z.string().trim().min(10, 'Conte um pouco a história do item.').max(5000),
  categoria: z.enum(['roupas', 'eletronicos', 'moveis', 'outros']),
  estado: z.enum(['novinho', 'usado_com_amor', 'bem_vivido']),
  precoCentavos: z.number().int().min(100, 'Preço mínimo R$ 1,00.').max(10_000_000),
  precoAntigoCentavos: z.number().int().positive().optional(),
  fotos: z.array(z.string()).max(8).default([]),
  freteGratis: z.boolean().optional(),
  vendedorNome: z.string().trim().max(80).optional(),
});

export type CriarAnuncioPayload = z.input<typeof schema>;

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
    const parsed = schema.safeParse(payload);
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
      vendedorNome: data.vendedorNome,
    });
    safeRevalidatePath('/desapegoo');
    safeRevalidatePath('/desapegoo/busca');
    safeRevalidatePath(`/desapegoo/p/${anuncio.slug}`);
    safeRevalidatePath(`/desapegoo/lojinha/${anuncio.vendedor.slug}`);
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
