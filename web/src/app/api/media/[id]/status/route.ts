import { getUsuarioAtual, temAcesso } from '@/lib/auth/session';
import { repositories } from '@/lib/data/repositories';

/** GET /api/media/:id/status — polling do estado do processamento (enviando/processando/pronto/erro). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await getUsuarioAtual();
  if (!usuario) return Response.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (!temAcesso(usuario, ['jornalista', 'diretor'])) {
    return Response.json({ erro: 'Sem permissão.' }, { status: 403 });
  }
  const { id } = await params;
  const media = await repositories.media.getById(id);
  if (!media) return Response.json({ erro: 'Mídia não encontrada.' }, { status: 404 });
  return Response.json(
    {
      id: media.id,
      status: media.status,
      tipo: media.tipo,
      titulo: media.titulo,
      playbackUrl: media.playbackUrl ?? null,
      coverUrl: media.coverUrl ?? null,
      duracaoSeg: media.duracaoSeg ?? null,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
