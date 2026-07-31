'use server';

import { z } from 'zod';
import { repositories } from '@/lib/data/repositories';
import { listarJornalistasAtribuiveis } from '@/lib/data/jornalistas';
import { exigirGrupo } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { isEditoriaSlug } from '@/lib/editorias';
import {
  contextoEditorial,
  licencaPermiteEscrita,
} from '@/lib/tenant';
import type { EditoriaSlug } from '@/types';
import { isNextControlFlowError, mensagemErro, safeRevalidatePath } from '@/lib/cache-safe';

const pautaSchema = z.object({
  tema: z.string().trim().min(3, 'Informe o tema da pauta.').max(140),
  descricao: z.string().trim().min(3, 'Descreva a pauta para o jornalista.').max(5000),
  categoriaSugerida: z.string().refine((v) => !v || isEditoriaSlug(v), 'Editoria inválida.'),
  prioridade: z.enum(['baixa', 'media', 'alta']),
  prazo: z.string().optional(),
  atribuidos: z.array(z.string().trim().min(1)).default([]),
});

export type CriarPautaPayload = z.input<typeof pautaSchema>;
export interface PautaActionResult {
  ok: boolean;
  erro?: string;
  redirectTo?: string;
}

function revalidarPautas() {
  safeRevalidatePath('/admin');
  safeRevalidatePath('/admin/redacao');
  safeRevalidatePath('/admin/redacao/pautas');
  safeRevalidatePath('/admin/redacao/pautas/nova');
  safeRevalidatePath('/jornalista/pautas');
  safeRevalidatePath('/jornalista/materia/nova');
}

/** Cria e distribui uma pauta. Admin Master ou Diretor da cidade. */
export async function criarPauta(payload: CriarPautaPayload): Promise<PautaActionResult> {
  try {
    const usuario = await exigirGrupo('admin', 'diretor');
    const ctx = await contextoEditorial(usuario);
    if (!ctx.isMaster) {
      if (!licencaPermiteEscrita(ctx.cidade)) {
        return {
          ok: false,
          erro: `Licença ${ctx.cidade?.status ?? 'indisponível'}: publicação suspensa. Contate o Master.`,
        };
      }
    }

    const parsed = pautaSchema.safeParse({
      ...payload,
      // Form pode mandar string vazia / undefined
      atribuidos: Array.isArray(payload.atribuidos) ? payload.atribuidos.filter(Boolean) : [],
      categoriaSugerida: payload.categoriaSugerida ?? '',
      prazo: payload.prazo || undefined,
    });
    if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    const data = parsed.data;
    const atribuidos = [...new Set(data.atribuidos)];
    const cidadeFiltro = ctx.isMaster ? undefined : (ctx.cidadeId ?? undefined);
    const jornalistas = await listarJornalistasAtribuiveis(cidadeFiltro);
    if (atribuidos.length > 0) {
      const idsOk = new Set(jornalistas.map((j) => j.id));
      if (!atribuidos.every((id) => idsOk.has(id))) {
        return { ok: false, erro: 'Um dos jornalistas selecionados não está disponível nesta cidade.' };
      }
    }
    const prazo = data.prazo?.trim();
    if (prazo && Number.isNaN(Date.parse(prazo))) {
      return { ok: false, erro: 'Prazo inválido.' };
    }
    const criadoPor = await autorIdDoUsuario(usuario);
    // Master sem cidade: pauta na matriz; Diretor: sempre na sua cidade
    const cidadeId = ctx.cidadeId ?? ctx.cidade?.id ?? 'cid-matriz';
    await repositories.pautas.criar({
      tema: data.tema,
      descricao: data.descricao,
      categoriaSugerida: (data.categoriaSugerida || undefined) as EditoriaSlug | undefined,
      prioridade: data.prioridade,
      prazo: prazo || undefined,
      atribuidos,
      criadoPor,
      cidadeId,
    });
    revalidarPautas();
    return { ok: true, redirectTo: '/admin/redacao/pautas' };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[lupa] criarPauta', e);
    const msg = mensagemErro(e, 'Falha ao criar pauta.');
    // Mensagens legíveis para schema antigo / coluna ausente (deploy incompleto).
    if (/cidade_id|column|relation|does not exist/i.test(msg)) {
      return {
        ok: false,
        erro:
          'Schema multi-cidade ainda não está ativo neste ambiente. Faça deploy do web com as migrations de cidade/pauta.',
      };
    }
    return { ok: false, erro: msg };
  }
}

/** O jornalista confirma uma pauta antes de abrir o editor da matéria. */
export async function iniciarPauta(pautaId: string): Promise<PautaActionResult> {
  try {
    if (!pautaId?.trim()) return { ok: false, erro: 'Pauta inválida.' };
    const usuario = await exigirGrupo('jornalista', 'diretor', 'admin');
    const ctx = await contextoEditorial(usuario);
    const autorId = ctx.author.id;
    const disponiveis = await repositories.pautas.listAbertas(
      ctx.isMaster ? undefined : autorId,
      ctx.cidadeId ?? undefined,
    );
    const pauta = disponiveis.find((p) => p.id === pautaId);
    if (!pauta) return { ok: false, erro: 'Esta pauta não está disponível para você.' };
    if (pauta.status === 'aberta') await repositories.pautas.atualizar(pauta.id, { status: 'em_producao' });
    revalidarPautas();
    return { ok: true, redirectTo: `/jornalista/materia/nova?pauta=${encodeURIComponent(pauta.id)}` };
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    console.error('[lupa] iniciarPauta', e);
    return { ok: false, erro: mensagemErro(e, 'Falha ao confirmar pauta.') };
  }
}
