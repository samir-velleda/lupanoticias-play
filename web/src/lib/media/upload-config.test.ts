import { describe, it, expect } from 'vitest';
import {
  MAX_DURATION_SEC,
  MAX_UPLOAD_BYTES,
  chaveUpload,
  validarArquivo,
} from './upload-config';

describe('validarArquivo — formato/tamanho/duração', () => {
  const base = { filename: 'clipe.mp4', contentType: 'video/mp4', sizeBytes: 50_000_000, durationSec: 120 };

  it('aceita MP4 dentro dos limites', () => {
    expect(validarArquivo(base).ok).toBe(true);
  });

  it('aceita MOV (video/quicktime)', () => {
    expect(validarArquivo({ ...base, filename: 'clipe.mov', contentType: 'video/quicktime' }).ok).toBe(true);
  });

  it('aceita por extensão quando o MIME vem vazio (comum no celular)', () => {
    expect(validarArquivo({ ...base, filename: 'IMG_0001.MOV', contentType: '' }).ok).toBe(true);
  });

  it('rejeita formato não suportado', () => {
    const r = validarArquivo({ ...base, filename: 'a.mkv', contentType: 'video/x-matroska' });
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/formato/i);
  });

  it('rejeita acima de 4 GB', () => {
    const r = validarArquivo({ ...base, sizeBytes: MAX_UPLOAD_BYTES + 1 });
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/limite/i);
  });

  it('rejeita acima de 10 min quando a duração é conhecida', () => {
    const r = validarArquivo({ ...base, durationSec: MAX_DURATION_SEC + 1 });
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/limite/i);
  });

  it('não bloqueia por duração quando ela é desconhecida', () => {
    expect(validarArquivo({ ...base, durationSec: undefined }).ok).toBe(true);
  });

  it('rejeita arquivo vazio', () => {
    expect(validarArquivo({ ...base, sizeBytes: 0 }).ok).toBe(false);
  });
});

describe('chaveUpload — chave S3 uploads/<mediaId>/<arquivo>', () => {
  it('prefixa com uploads/<id>/ e sanitiza o nome', () => {
    const k = chaveUpload('media-abc', 'Meu Vídeo (final).mp4');
    expect(k.startsWith('uploads/media-abc/')).toBe(true);
    expect(k).not.toMatch(/[()\s]/);
  });
});
