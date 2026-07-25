import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUsuarioAtual, temAcesso } from '@/lib/auth/session';
import {
  criarPresignedArticleImage,
  isAllowedImageType,
  MAX_ARTICLE_IMAGE_BYTES,
} from '@/lib/aws';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  contentType: z.string().min(1),
  materiaId: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

/**
 * Gera URL pré-assinada PUT para upload de imagem de matéria (S3 → CDN).
 * Auth: jornalista | diretor | admin.
 */
export async function POST(req: Request) {
  const usuario = await getUsuarioAtual();
  if (!usuario || !temAcesso(usuario, ['jornalista', 'diretor', 'admin'])) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const { contentType, materiaId, sizeBytes } = parsed.data;
  if (!isAllowedImageType(contentType)) {
    return NextResponse.json(
      { error: 'Tipo não permitido. Use JPEG, PNG, WebP ou GIF.' },
      { status: 400 },
    );
  }
  if (sizeBytes && sizeBytes > MAX_ARTICLE_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Arquivo acima do limite (${MAX_ARTICLE_IMAGE_BYTES / (1024 * 1024)} MB).` },
      { status: 400 },
    );
  }

  try {
    const presign = await criarPresignedArticleImage({
      contentType,
      userSub: usuario.sub,
      materiaId,
    });
    return NextResponse.json({
      uploadUrl: presign.url,
      key: presign.key,
      publicUrl: presign.publicUrl,
      expiresIn: presign.expiresIn,
      contentType: presign.contentType,
      maxBytes: MAX_ARTICLE_IMAGE_BYTES,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao gerar URL de upload';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
