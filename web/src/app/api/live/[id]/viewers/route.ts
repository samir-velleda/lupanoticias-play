import { repositories } from '@/lib/data/repositories';

/**
 * "Assistindo agora" (mock). Será ligado às métricas do Amazon IVS no prompt 05.
 * GET /api/live/:id/viewers → { id, viewers, live }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const media = await repositories.media.getById(id);
  // Não fabrica contador para id inexistente/não-live: mídia ausente → 404;
  // mídia que existe mas não é 'live' → live:false honesto (sem número).
  if (!media) {
    return Response.json(
      { id, viewers: 0, live: false },
      { status: 404, headers: { 'cache-control': 'no-store' } },
    );
  }
  if (media.tipo !== 'live') {
    return Response.json(
      { id, viewers: 0, live: false },
      { headers: { 'cache-control': 'no-store' } },
    );
  }
  const base = media.liveViewers ?? media.views ?? 0;
  // variação suave e determinística (sem PII, sem estado)
  const jitter = Math.floor((Date.now() / 1000) % 400) - 200;
  const viewers = Math.max(0, base + jitter);
  return Response.json(
    { id, viewers, live: true },
    { headers: { 'cache-control': 'no-store' } },
  );
}
