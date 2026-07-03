'use client';

import { useState } from 'react';
import { formatNumero } from '@/lib/format';

/**
 * Ações do player: Curtir (contador otimista) · Enviar (Web Share) · Salvar (toggle) · Baixar.
 * Estado local por ora; persistência entra com auth/analytics (prompts 06/08). DESIGN_SPEC M3.
 */
export function PlayerActions({
  titulo,
  likesIniciais = 0,
  downloadUrl,
}: {
  titulo: string;
  likesIniciais?: number;
  downloadUrl?: string;
}) {
  const [curtido, setCurtido] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [likes, setLikes] = useState(likesIniciais);

  const curtir = () => {
    setCurtido((c) => {
      setLikes((n) => n + (c ? -1 : 1));
      return !c;
    });
  };

  const enviar = async () => {
    try {
      if (navigator.share) await navigator.share({ title: titulo, url: window.location.href });
      else await navigator.clipboard?.writeText(window.location.href);
    } catch {
      /* cancelado pelo usuário */
    }
  };

  const btn =
    'flex items-center gap-2 rounded-pill border border-line px-4 py-2 font-display text-sm font-semibold transition-colors hover:border-ink';

  return (
    <div className="flex flex-wrap gap-2.5">
      <button type="button" onClick={curtir} aria-pressed={curtido} className={`${btn} ${curtido ? 'border-ink bg-ink text-white' : ''}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={curtido ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        {formatNumero(likes)}
      </button>
      <button type="button" onClick={enviar} className={btn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" /></svg>
        Enviar
      </button>
      <button type="button" onClick={() => setSalvo((s) => !s)} aria-pressed={salvo} className={`${btn} ${salvo ? 'border-ink bg-ink text-white' : ''}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={salvo ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M6 4v16l6-4 6 4V4z" /></svg>
        {salvo ? 'Salvo' : 'Salvar'}
      </button>
      <a
        href={downloadUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        aria-label="Baixar"
        aria-disabled={!downloadUrl}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
        Baixar
      </a>
    </div>
  );
}
