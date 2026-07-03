import { EmBreve } from '@/components/portal/EmBreve';

export default function EstudioPublicarShell() {
  return (
    <EmBreve
      titulo="Publicar vídeo / podcast"
      descricao="Upload real (S3 pré-signed → MediaConvert → HLS), dropzone, progresso e toggles chegam no Bloco 6 (Estúdio + pipeline de mídia)."
    />
  );
}
