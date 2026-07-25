'use client';

import { useState } from 'react';
import { LupaMark } from '@/components/brand';

/**
 * Capa de imagem: usa `src` quando houver URL real e carregar;
 * senão placeholder monocromático (evita ícone quebrado).
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
  const resolved = resolvePublicSrc(src);
  const [failed, setFailed] = useState(false);

  if (resolved && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={label}
        className={`object-cover ${rounded} ${className}`}
        onError={() => setFailed(true)}
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

/** Paths de seed fictício ou vazios → undefined (placeholder). */
function resolvePublicSrc(src?: string): string | undefined {
  if (!src?.trim()) return undefined;
  const s = src.trim();
  if (s.startsWith('/media/cover-') || s.startsWith('/avatars/')) return undefined;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  // relativo /media/* sem host: não confiar no web CDN
  if (s.startsWith('/media/')) return undefined;
  return s;
}
