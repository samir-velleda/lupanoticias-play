import { NextResponse } from 'next/server';
import { auroraConfigurada } from '@/lib/data/db';
import { bootstrapDb } from '@/lib/data/aurora/bootstrap';

export const dynamic = 'force-dynamic';

/**
 * Bootstrap do banco (schema + seed idempotentes) — PARADA 4.
 * Roda DENTRO da VPC (Lambda) porque o Aurora é isolado.
 * Guardas em camadas:
 *  1) middleware exige o header secreto do CloudFront (Function URL crua = 403);
 *  2) esta rota exige `x-lupa-bootstrap` == LUPA_BOOTSTRAP_TOKEN (não injetado pelo CDN).
 * Idempotente e não-destrutivo (CREATE IF NOT EXISTS / ON CONFLICT DO NOTHING).
 */
export async function POST(req: Request) {
  const token = process.env.LUPA_BOOTSTRAP_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, erro: 'bootstrap desabilitado (sem token)' }, { status: 404 });
  }
  if (req.headers.get('x-lupa-bootstrap') !== token) {
    return NextResponse.json({ ok: false, erro: 'não autorizado' }, { status: 401 });
  }
  if (!auroraConfigurada()) {
    return NextResponse.json({ ok: false, erro: 'Aurora não configurado neste ambiente' }, { status: 503 });
  }
  try {
    const r = await bootstrapDb();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: e instanceof Error ? e.message : 'falha no bootstrap' },
      { status: 500 },
    );
  }
}
