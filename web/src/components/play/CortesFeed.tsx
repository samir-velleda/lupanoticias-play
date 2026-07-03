'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Media } from '@/types';
import { formatNumero } from '@/lib/format';
import { editoriaNome } from '@/lib/editorias';
import { playableSrc } from '@/lib/playback';
import { LupaMark } from '@/components/brand';

/**
 * Feed de Cortes vertical full-screen com scroll-snap. Só o corte visível toca
 * (IntersectionObserver); autoplay mudo + tap para som. Pausa itens fora da viewport.
 * DESIGN_SPEC §4 / M4.
 */
export function CortesFeed({ cortes }: { cortes: Media[] }) {
  const videosRef = useRef<Array<HTMLVideoElement | null>>([]);
  const hlsRef = useRef<{ destroy: () => void } | undefined>(undefined);
  const activeRef = useRef<number>(-1);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(true);

  useEffect(() => {
    mutedRef.current = muted;
    const v = videosRef.current[activeRef.current];
    if (v) v.muted = muted;
  }, [muted]);

  // ativa o corte i: anexa fonte (nativo/hls.js) só nele e toca; pausa os demais.
  useEffect(() => {
    let cancelled = false;
    const activate = async (i: number) => {
      if (i === activeRef.current) return;
      videosRef.current.forEach((vid, idx) => {
        if (idx !== i && vid) vid.pause();
      });
      activeRef.current = i;
      setActive(i);
      const v = videosRef.current[i];
      const src = cortes[i] ? playableSrc(cortes[i]) : '';
      if (!v || !src) return;
      hlsRef.current?.destroy();
      hlsRef.current = undefined;
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = src;
      } else {
        try {
          const { default: Hls } = await import('hls.js');
          if (cancelled) return;
          if (Hls.isSupported()) {
            const h = new Hls({ enableWorker: true });
            h.loadSource(src);
            h.attachMedia(v);
            hlsRef.current = h;
          } else {
            v.src = src;
          }
        } catch {
          v.src = src;
        }
      }
      v.muted = mutedRef.current;
      v.loop = true;
      try {
        await v.play();
      } catch {
        /* autoplay pode ser bloqueado até interação */
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (e.isIntersecting && e.intersectionRatio >= 0.6) void activate(idx);
        });
      },
      { threshold: [0.6] },
    );
    const nodes = document.querySelectorAll('[data-corte-slide]');
    nodes.forEach((n) => io.observe(n));
    return () => {
      cancelled = true;
      io.disconnect();
      hlsRef.current?.destroy();
    };
  }, [cortes]);

  if (cortes.length === 0) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-ink text-on-dark-muted">
        <p className="font-mono text-xs uppercase tracking-kicker">Nenhum corte disponível.</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll overscroll-contain bg-ink">
      {/* Top overlay fixo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-5">
        <Link href="/play" className="pointer-events-auto text-white" aria-label="Fechar Cortes">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div className="flex items-center gap-2 text-white">
          <LupaMark className="h-4 w-4 text-white" title="Cortes" />
          <span className="font-mono text-[11px] uppercase tracking-kicker">Cortes</span>
        </div>
        <button type="button" onClick={() => setMuted((m) => !m)} className="pointer-events-auto text-white" aria-label={muted ? 'Ativar som' : 'Silenciar'}>
          {muted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z" /><path d="M16 8l4 8M20 8l-4 8" stroke="currentColor" strokeWidth="2" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z" /></svg>
          )}
        </button>
      </div>

      {cortes.map((c, i) => (
        <section
          key={c.id}
          data-corte-slide=""
          data-idx={i}
          className="relative flex h-[100dvh] snap-start items-center justify-center overflow-hidden"
        >
          <video
            ref={(el) => {
              videosRef.current[i] = el;
            }}
            className="h-full w-full object-cover"
            playsInline
            muted
            loop
            onClick={() => setMuted((m) => !m)}
            aria-label={c.titulo}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          {/* Rail de ações à direita */}
          <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-5 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-white/15 backdrop-blur">
              <LupaMark className="h-5 w-5 text-white" />
            </span>
            <RailBtn label={formatNumero(c.likes ?? 0)} aria="Curtir">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </RailBtn>
            <RailBtn label={formatNumero(Math.round((c.views ?? 0) / 400))} aria="Comentários">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </RailBtn>
            <RailBtn label="Enviar" aria="Enviar">
              <path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" />
            </RailBtn>
          </div>

          {/* Rodapé: handle + legenda */}
          <div className="absolute bottom-6 left-4 right-20 z-10 text-white">
            <div className="font-display text-sm font-bold">@lupa.{c.editoria}</div>
            <p className="mt-1.5 line-clamp-2 font-serif text-[15px] leading-snug">{c.titulo}</p>
            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-white/80">
              <LupaMark className="h-3 w-3 text-white" />
              Áudio original · {editoriaNome(c.editoria)}
            </div>
          </div>

          {i === active ? null : (
            <span className="absolute inset-0 z-0 flex items-center justify-center">
              <span className="h-16 w-16 rounded-pill border-2 border-white/50 bg-black/40" aria-hidden />
            </span>
          )}
        </section>
      ))}
    </div>
  );
}

function RailBtn({ label, aria, children }: { label: string; aria: string; children: React.ReactNode }) {
  return (
    <button type="button" className="flex flex-col items-center gap-1" aria-label={aria}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        {children}
      </svg>
      <span className="font-mono text-[11px]">{label}</span>
    </button>
  );
}
