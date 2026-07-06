import { z } from 'zod';
import { getUsuarioAtual, temAcesso } from '@/lib/auth/session';
import { autorIdDoUsuario } from '@/lib/auth/perfil';
import { repositories } from '@/lib/data/repositories';
import { chaveUpload } from '@/lib/media/upload-config';
import { presignUploadPut, uploadConfigurado } from '@/lib/media/s3';

const schema = z.object({
  mediaId: z.string().trim().min(1),
  filename: z.string().trim().min(1).max(260),
  contentType: z.string().trim().min(1).max(120),
});

/**
 * POST /api/media/upload-url — (re)gera a URL pré-assinada de uma mídia já criada
 * (retry/expiração). Exige ser dono da mídia (ou admin) e que ela ainda esteja processando.
 */
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
  const { mediaId, filename, contentType } = parsed.data;

  const media = await repositories.media.getById(mediaId);
  if (!media) return Response.json({ erro: 'Mídia não encontrada.' }, { status: 404 });
  const ehAdmin = usuario.grupos.includes('admin');
  if (media.autor && media.autor.id !== autorIdDoUsuario(usuario) && !ehAdmin) {
    return Response.json({ erro: 'Você só pode enviar a sua própria mídia.' }, { status: 403 });
  }
  if (media.status !== 'processando' && media.status !== 'enviando') {
    return Response.json({ erro: 'Mídia não está aguardando upload.' }, { status: 409 });
  }

  const key = chaveUpload(mediaId, filename);
  const presigned = await presignUploadPut({ key, contentType });
  return Response.json(
    { uploadUrl: presigned.url, uploadKey: key, expiresIn: presigned.expiresIn },
    { headers: { 'cache-control': 'no-store' } },
  );
}
