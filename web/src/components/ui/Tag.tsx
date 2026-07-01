import type { ReactNode } from 'react';
import Link from 'next/link';

/** Tag/chip com borda hairline (matéria). Vira link se `href` for passado. */
export function Tag({ children, href }: { children: ReactNode; href?: string }) {
  const cls =
    'inline-flex items-center rounded-pill border border-line px-3.5 py-1.5 font-mono text-xs text-gray-700 transition-colors hover:border-ink';
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}
