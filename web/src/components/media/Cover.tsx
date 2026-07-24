import { LupaMark } from '@/components/brand';

/**
 * Capa de imagem: usa `src` quando houver URL real; senão placeholder monocromático.
 */
export function Cover({
  label,
  src,
  tone = 'light',
  rounded = 'rounded',
  className = '',
}: {
  label: string;
  src?: string;
  tone?: 'light' | 'dark';
  rounded?: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        className={`object-cover ${rounded} ${className}`}
      />
    );
  }

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
