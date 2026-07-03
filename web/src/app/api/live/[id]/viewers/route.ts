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
  const base = media?.liveViewers ?? media?.views ?? 0;
  // variação suave e determinística (sem PII, sem estado)
  const jitter = Math.floor((Date.now() / 1000) % 400) - 200;
  const viewers = Math.max(0, base + jitter);
  return Response.json(
    { id, viewers, live: media?.tipo === 'live' },
    { headers: { 'cache-control': 'no-store' } },
  );
}
