'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui';

/** Linha do canal: avatar + "Lupa · Editoria" + botão Seguir (toggle otimista). */
export function ChannelRow({ editoria }: { editoria: string }) {
  const [seguindo, setSeguindo] = useState(false);
  return (
    <div className="flex items-center gap-3 border-y border-line py-4">
      <Avatar nome="Lupa" size={42} />
      <div className="flex-1">
        <div className="font-display text-sm font-bold text-ink">Lupa Play</div>
        <div className="font-mono text-[11px] text-gray-400">Lupa · {editoria}</div>
      </div>
      <button
        type="button"
        onClick={() => setSeguindo((s) => !s)}
        aria-pressed={seguindo}
        className={`rounded-pill px-5 py-2 font-display text-sm font-bold transition-colors ${
          seguindo ? 'border border-line text-ink' : 'bg-ink text-white hover:opacity-90'
        }`}
      >
        {seguindo ? 'Seguindo' : 'Seguir'}
      </button>
    </div>
  );
}
