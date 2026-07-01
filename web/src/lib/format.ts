/**
 * Formatação pt-BR — datas, duração e números.
 * Ver docs/DATA_MODEL.md §5. Determinístico: timeZone explícita (default Brasil).
 */

const TZ_PADRAO = 'America/Sao_Paulo';

export interface FormatDataOpts {
  timeZone?: string;
}

/** `1 de julho de 2026 · 08h20` */
export function formatData(iso: string, opts: FormatDataOpts = {}): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const timeZone = opts.timeZone ?? TZ_PADRAO;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')} de ${get('month')} de ${get('year')} · ${get('hour')}h${get('minute')}`;
}

/** `há 12 min`, `há 1 h`, `há 3 h`, `há 2 d` — ou `agora`. */
export function formatRelativo(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const seg = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seg < 45) return 'agora';
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `há ${dias} d`;
  const sem = Math.floor(dias / 7);
  if (dias < 30) return `há ${sem} sem`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} mês${meses > 1 ? 'es' : ''}`;
  return `há ${Math.floor(dias / 365)} a`;
}

/** `4:12` (< 1h) ou `1:01:01` (≥ 1h). */
export function formatDuracao(totalSeg: number): string {
  if (!Number.isFinite(totalSeg) || totalSeg < 0) return '0:00';
  const seg = Math.floor(totalSeg);
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/** `12,4 mil`, `1,2 mi`, `999`. */
export function formatNumero(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  if (abs >= 1_000_000) return `${nf.format(n / 1_000_000)} mi`;
  if (abs >= 1_000) return `${nf.format(n / 1_000)} mil`;
  return nf.format(n);
}

/** `24 mil visualizações` (singular quando aplicável). */
export function formatViews(n: number): string {
  const label = n === 1 ? 'visualização' : 'visualizações';
  return `${formatNumero(n)} ${label}`;
}
