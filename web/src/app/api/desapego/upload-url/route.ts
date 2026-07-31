import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUsuarioAtual } from '@/lib/auth/session';
import {
  criarPresignedDesapegoImage,
  isAllowedImageType,
  MAX_ARTICLE_IMAGE_BYTES,
} from '@/lib/aws';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().optional(),
});

/** Pre-signed upload de foto de anúncio Desapegoo (Etapa 1: público). */
export async function POST(req: Request) {
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
  const { contentType, sizeBytes } = parsed.data;
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

  const usuario = await getUsuarioAtual();
  try {
    const presign = await criarPresignedDesapegoImage({
      contentType,
      userSub: usuario?.sub,
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
    // Dev local sem bucket: cliente usa data URL.
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
