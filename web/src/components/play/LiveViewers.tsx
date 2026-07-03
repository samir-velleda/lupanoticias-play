'use client';

import { useEffect, useState } from 'react';
import { formatNumero } from '@/lib/format';

/**
 * "Assistindo agora" — faz polling de GET /api/live/:id/viewers a cada ~15s.
 * Endpoint é mock por ora (ligado ao IVS no prompt 05). DESIGN_SPEC §2/M2.
 */
export function LiveViewers({ id, inicial = 0 }: { id: string; inicial?: number }) {
  const [viewers, setViewers] = useState(inicial);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/live/${id}/viewers`, { cache: 'no-store' });
        if (!r.ok) return;
        const data = (await r.json()) as { viewers?: number };
        if (alive && typeof data.viewers === 'number') setViewers(data.viewers);
      } catch {
        /* ignora falhas transitórias */
      }
    };
    void load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  return (
    <span className="font-mono text-xs text-gray-400" aria-live="polite">
      {formatNumero(viewers)} assistindo agora
    </span>
  );
}
