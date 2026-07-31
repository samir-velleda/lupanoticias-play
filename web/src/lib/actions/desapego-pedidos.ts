'use server';

import { z } from 'zod';
import { desapegoRepo } from '@/lib/data/desapego';
import { exigirLogin } from '@/lib/auth/session';
import { isNextControlFlowError, mensagemErro, safeRevalidatePath } from '@/lib/cache-safe';

export interface PedidoActionResult {
  ok: boolean;
  erro?: string;
  pedidoId?: string;
  redirectTo?: string;
}

function revalidarPedidos(pedidoId?: string, anuncioSlug?: string) {
  safeRevalidatePath('/desapegoo');
  safeRevalidatePath('/desapegoo/minha-lojinha');
  safeRevalidatePath('/desapegoo/wallet');
  safeRevalidatePath('/desapegoo/compras');
  safeRevalidatePath('/desapegoo/vendas');
  if (pedidoId) safeRevalidatePath(`/desapegoo/pedido/${pedidoId}`);
  if (anuncioSlug) safeRevalidatePath(`/desapegoo/p/${anuncioSlug}`);
}

/** Comprador inicia compra (pedido aguardando pagamento na master). */
export async function criarPedidoDesapego(anuncioId: string): Promise<PedidoActionResult> {
  try {
    const usuario = await exigirLogin('/desapegoo');
    if (!anuncioId?.trim()) return { ok: false, erro: 'Anúncio inválido.' };
    const pedido = await desapegoRepo.criarPedido({
      anuncioId,
      compradorCognitoSub: usuario.sub,
      compradorEmail: usuario.email,
    });
    revalidarPedidos(pedido.id, pedido.anuncioSlug);
    return {
      ok: true,
      pedidoId: pedido.id,
      redirectTo: `/desapegoo/pedido/${pedido.id}`,
    };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return { ok: false, erro: mensagemErro(e, 'Falha ao criar pedido.') };
  }
}

/**
 * Confirma cash-in na conta master (sem split).
 * Em produção, este passo será disparado pelo webhook Boovest/Celcoin.
 * Aqui o comprador confirma o pagamento no portal até a integração externa.
 */
export async function confirmarPagamentoPedido(pedidoId: string): Promise<PedidoActionResult> {
  try {
    const usuario = await exigirLogin('/desapegoo/compras');
    const pedido = await desapegoRepo.getPedido(pedidoId);
    if (!pedido) return { ok: false, erro: 'Pedido não encontrado.' };
    if (pedido.compradorCognitoSub !== usuario.sub) {
      return { ok: false, erro: 'Apenas o comprador pode confirmar o pagamento.' };
    }
    const atualizado = await desapegoRepo.confirmarPagamento(pedidoId);
    revalidarPedidos(pedidoId, atualizado.anuncioSlug);
    return { ok: true, pedidoId, redirectTo: `/desapegoo/pedido/${pedidoId}` };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return { ok: false, erro: mensagemErro(e, 'Falha ao confirmar pagamento.') };
  }
}

export async function marcarPedidoEnviado(
  pedidoId: string,
  codigoRastreio: string,
): Promise<PedidoActionResult> {
  try {
    const usuario = await exigirLogin('/desapegoo/vendas');
    const vendedor = await desapegoRepo.getVendedorByCognitoSub(usuario.sub);
    if (!vendedor) return { ok: false, erro: 'Lojinha não encontrada.' };
    const pedido = await desapegoRepo.getPedido(pedidoId);
    if (!pedido || pedido.vendedorId !== vendedor.id) {
      return { ok: false, erro: 'Pedido não é da sua lojinha.' };
    }
    const atualizado = await desapegoRepo.marcarEnviado(pedidoId, codigoRastreio);
    revalidarPedidos(pedidoId, atualizado.anuncioSlug);
    return { ok: true, pedidoId };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return { ok: false, erro: mensagemErro(e, 'Falha ao marcar envio.') };
  }
}

export async function confirmarEntregaPedido(pedidoId: string): Promise<PedidoActionResult> {
  try {
    const usuario = await exigirLogin('/desapegoo/compras');
    const atualizado = await desapegoRepo.confirmarEntrega(pedidoId, usuario.sub);
    revalidarPedidos(pedidoId, atualizado.anuncioSlug);
    return { ok: true, pedidoId, redirectTo: `/desapegoo/pedido/${pedidoId}` };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return { ok: false, erro: mensagemErro(e, 'Falha ao confirmar entrega.') };
  }
}

const cashoutSchema = z.object({
  valorCentavos: z.number().int().min(100),
  banco: z.string().trim().min(2).max(80),
  agencia: z.string().trim().min(1).max(20),
  conta: z.string().trim().min(2).max(30),
  tipoConta: z.enum(['corrente', 'poupanca']),
  cpfTitular: z.string().trim().min(11),
});

export async function solicitarCashoutDesapego(input: {
  valorReais: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: 'corrente' | 'poupanca';
  cpfTitular: string;
}): Promise<PedidoActionResult> {
  try {
    const usuario = await exigirLogin('/desapegoo/wallet');
    const vendedor = await desapegoRepo.getVendedorByCognitoSub(usuario.sub);
    if (!vendedor) return { ok: false, erro: 'Complete o KYC da lojinha.' };
    const reais = parseFloat(
      String(input.valorReais).replace(/\./g, '').replace(',', '.') || '0',
    );
    const valorCentavos = Math.round(reais * 100);
    const parsed = cashoutSchema.safeParse({
      valorCentavos,
      banco: input.banco,
      agencia: input.agencia,
      conta: input.conta,
      tipoConta: input.tipoConta,
      cpfTitular: input.cpfTitular,
    });
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }
    await desapegoRepo.solicitarCashout({
      vendedorId: vendedor.id,
      ...parsed.data,
    });
    revalidarPedidos();
    return { ok: true, redirectTo: '/desapegoo/wallet' };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    return { ok: false, erro: mensagemErro(e, 'Falha no cashout.') };
  }
}
