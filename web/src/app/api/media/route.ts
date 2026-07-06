import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getUsuarioAtual, temAcesso } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { repositories } from '@/lib/data/repositories';
import { isEditoriaSlug } from '@/lib/editorias';
import type { CreateMediaInput, EditoriaSlug } from '@/types';
import { MAX_DURATION_SEC, MAX_UPLOAD_BYTES, chaveUpload, validarArquivo } from '@/lib/media/upload-config';
import { presignUploadPut, uploadConfigurado } from '@/lib/media/s3';

const schema = z.object({
  tipo: z.enum(['video', 'podcast']).default('video'),
  titulo: z.string().trim().min(1, 'Título obrigatório').max(200),
  editoria: z.string().refine(isEditoriaSlug, 'Editoria inválida'),
  tags: z.array(z.string().trim()).default([]),
  descricao: z.string().trim().optional(),
  filename: z.string().trim().min(1).max(260),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  durationSec: z.number().positive().max(MAX_DURATION_SEC).optional(),
});

/** POST /api/media — cria o registro de mídia (processando) + devolve URL de upload. */
export async function POST(req: Request) {
  const usuario = await getUsuarioAtual();
  if (!usuario) return Response.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (!temAcesso(usuario, ['jornalista', 'diretor'])) {
    return Response.json({ erro: 'Sem permissão.' }, { status: 403 });
  }
  if (!uploadConfigurado()) {
    return Response.json({ erro: 'Upload não configurado neste ambiente.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ erro: 'JSON inválido.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }
  const data = parsed.data;

  // Revalida formato/tamanho/duração no servidor (defesa em profundidade).
  const v = validarArquivo({
    filename: data.filename,
    contentType: data.contentType,
    sizeBytes: data.sizeBytes,
    durationSec: data.durationSec,
  });
  if (!v.ok) return Response.json({ erro: v.erro }, { status: 400 });

  const mediaId = `media-${randomUUID().slice(0, 12)}`;
  const uploadKey = chaveUpload(mediaId, data.filename);

  const input: CreateMediaInput = {
    tipo: data.tipo,
    titulo: data.titulo,
    descricao: data.descricao,
    editoria: data.editoria as EditoriaSlug,
    tags: data.tags,
    visibilidade: 'rascunho', // vive embutido na matéria; não entra no Lupa Play por ora
    destaque: false,
    transcricaoAuto: false,
    gerarLegendasVTT: false, // legendas VTT ficam para depois
    uploadKey,
  };

  await repositories.media.criarUpload(input, { id: mediaId, autorId: autorIdDoUsuario(usuario) });
  const presigned = await presignUploadPut({ key: uploadKey, contentType: data.contentType });

  return Response.json(
    { mediaId, uploadKey, uploadUrl: presigned.url, expiresIn: presigned.expiresIn },
    { headers: { 'cache-control': 'no-store' } },
  );
}
