/**
 * Selo AO VIVO — ponto branco pulsante (keyframe opacidade 1→.3 / escala 1→.6 / 1.4s).
 * Sempre sobre preenchimento escuro para contraste. DESIGN_SPEC §7.
 */
export function LiveBadge({ label = 'AO VIVO' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill bg-ink px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.08em] text-white">
      <span className="h-1.5 w-1.5 animate-live-pulse rounded-pill bg-white" aria-hidden />
      {label}
    </span>
  );
}
