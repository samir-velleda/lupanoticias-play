import { LupaMark } from '@/components/brand';

/**
 * Placeholder de imagem monocromático (as imagens reais virão do CMS/upload — DESIGN_SPEC).
 * `role="img"` + aria-label garante acessibilidade sem asset real.
 */
export function Cover({
  label,
  tone = 'light',
  rounded = 'rounded',
  className = '',
}: {
  label: string;
  tone?: 'light' | 'dark';
  rounded?: string;
  className?: string;
}) {
  const bg =
    tone === 'dark'
      ? 'bg-gradient-to-br from-dark-line to-ink'
      : 'bg-gradient-to-br from-surface-2 to-surface-3';
  const mark = tone === 'dark' ? 'text-white/10' : 'text-ink/10';
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center overflow-hidden ${bg} ${rounded} ${className}`}
    >
      <LupaMark className={`h-1/3 max-h-16 w-auto ${mark}`} title={label} />
    </div>
  );
}
