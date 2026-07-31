'use client';

import { useState } from 'react';

/**
 * Etapa 1: UI do protótipo (reserva visual).
 * Etapa 3: troca por checkout Boovest Pay + escrow.
 */
export function ComprarButton() {
  const [reservado, setReservado] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setReservado(true)}
      disabled={reservado}
      className="d-btn-primary min-w-[180px] flex-1 px-9 py-3.5 text-base"
    >
      {reservado ? '✓ reservado pra você!' : 'quero!'}
    </button>
  );
}
