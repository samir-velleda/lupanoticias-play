/**
 * Regras de upload de vídeo (Prompt 05). Módulo PURO (sem server-only) — usado no
 * CLIENTE (valida antes de subir) e no SERVIDOR (Zod das rotas de API) e por testes.
 * Dimensionamento aprovado: ≤10 min, ≤4 GB, MP4/MOV (celular).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB (teto do PUT único ≤5 GB)
export const MAX_DURATION_SEC = 600; // 10 min
export const UPLOAD_URL_TTL_SEC = 900; // validade da URL pré-assinada

/** MIME types aceitos (celular costuma mandar video/quicktime para .mov). */
export const MIME_ACEITOS = [
  'video/mp4',
  'video/quicktime',
  'video/x-quicktime',
  'video/mov',
  'video/x-m4v',
] as const;

/** Extensões aceitas (fallback quando o MIME vem vazio/genérico do celular). */
export const EXT_ACEITAS = ['.mp4', '.mov', '.qt', '.m4v'] as const;

/** `accept` do <input type=file> (inclui captura de câmera no mobile). */
export const ACCEPT_ATTR = 'video/mp4,video/quicktime,.mp4,.mov,.m4v';

export const humanBytes = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
};

export const humanDuracao = (seg: number): string => {
  const s = Math.max(0, Math.round(seg));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const temExtAceita = (nome: string): boolean =>
  EXT_ACEITAS.some((e) => nome.toLowerCase().endsWith(e));

export interface ArquivoInfo {
  filename: string;
  contentType: string;
  sizeBytes: number;
  /** duração em segundos, quando detectável no cliente (senão undefined). */
  durationSec?: number;
}

export interface Validacao {
  ok: boolean;
  erro?: string;
}

/**
 * Valida formato/tamanho/duração. Reutilizado no cliente e no servidor.
 * Duração só é checada quando conhecida (o cliente lê via metadata do vídeo).
 */
export function validarArquivo(info: ArquivoInfo): Validacao {
  const mimeOk = (MIME_ACEITOS as readonly string[]).includes(info.contentType);
  if (!mimeOk && !temExtAceita(info.filename)) {
    return { ok: false, erro: 'Formato não suportado. Envie um vídeo MP4 ou MOV.' };
  }
  if (!Number.isFinite(info.sizeBytes) || info.sizeBytes <= 0) {
    return { ok: false, erro: 'Arquivo vazio ou inválido.' };
  }
  if (info.sizeBytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      erro: `Arquivo de ${humanBytes(info.sizeBytes)} excede o limite de ${humanBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }
  if (info.durationSec != null && Number.isFinite(info.durationSec) && info.durationSec > MAX_DURATION_SEC) {
    return {
      ok: false,
      erro: `Vídeo de ${humanDuracao(info.durationSec)} excede o limite de ${humanDuracao(MAX_DURATION_SEC)}.`,
    };
  }
  return { ok: true };
}

/** Sanitiza o nome do arquivo para compor a chave do S3. */
export function chaveUpload(mediaId: string, filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'video';
  return `uploads/${mediaId}/${base}`;
}
