'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDuracao } from '@/lib/format';
import { PlayButton, LiveBadge } from '@/components/ui';

export interface HlsPlayerProps {
  src: string;
  title: string;
  live?: boolean;
  captionsUrl?: string;
  className?: string;
}

/**
 * Player HLS estilizado (hls.js quando o browser não toca HLS nativo — ex.: Chrome/Firefox;
 * nativo no Safari). Controles: play, scrubber com knob, tempo, mudo, legendas VTT, fullscreen.
 * A11y: teclado (espaço/k play, ←/→ seek, m mudo, f fullscreen). DESIGN_SPEC §6/M3.
 */
export function HlsPlayer({ src, title, live = false, captionsUrl, className = '' }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [fs, setFs] = useState(false);

  // Anexa a fonte HLS (nativo ou hls.js).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: { destroy: () => void } | undefined;
    let cancelled = false;
    setError(false);
    setReady(false);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      setReady(true);
    } else {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported()) {
            const instance = new Hls({ enableWorker: true });
            hls = instance;
            instance.loadSource(src);
            instance.attachMedia(video);
            instance.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
            instance.on(Hls.Events.ERROR, (_evt, data) => {
              if (data?.fatal) setError(true);
            });
          } else {
            video.src = src;
            setReady(true);
          }
        })
        .catch(() => setError(true));
    }
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const seek = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + delta));
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const toggleCaptions = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.textTracks[0]) {
      setCaptionsOn((c) => !c);
      return;
    }
    const next = v.textTracks[0].mode !== 'showing';
    v.textTracks[0].mode = next ? 'showing' : 'disabled';
    setCaptionsOn(next);
  }, []);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-5);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    },
    [togglePlay, seek, toggleMute, toggleFullscreen],
  );

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const pct = dur > 0 ? (cur / dur) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`group relative aspect-video w-full overflow-hidden rounded bg-ink ${className}`}
      onKeyDown={onKey}
      tabIndex={0}
      role="region"
      aria-label={`Player de vídeo: ${title}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-ink"
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDur(e.currentTarget.duration)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        crossOrigin="anonymous"
      >
        {captionsUrl ? (
          <track kind="subtitles" src={captionsUrl} srcLang="pt" label="Português" default={captionsOn} />
        ) : null}
      </video>

      {live ? (
        <span className="absolute left-4 top-4 z-10">
          <LiveBadge />
        </span>
      ) : null}

      {/* Overlay de play central (quando pausado) */}
      {!playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproduzir"
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <PlayButton size={78} />
        </button>
      ) : null}

      {error ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/90 px-6 text-center font-mono text-xs text-on-dark-muted">
          Não foi possível carregar o vídeo.
        </div>
      ) : null}

      {/* Barra de controles */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <label className="sr-only" htmlFor="scrubber">
          Progresso
        </label>
        <input
          id="scrubber"
          type="range"
          min={0}
          max={dur || 0}
          step={0.1}
          value={cur}
          onChange={(e) => {
            const v = videoRef.current;
            if (v) v.currentTime = Number(e.target.value);
          }}
          aria-label="Barra de progresso"
          className="lupa-scrubber h-1 w-full cursor-pointer appearance-none rounded-pill bg-white/25"
          style={{ background: `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,.25) ${pct}%)` }}
          disabled={live}
        />
        <div className="flex items-center gap-4 text-on-dark">
          <button type="button" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproduzir'} className="text-white">
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <span className="font-mono text-[11px] text-on-dark">
            {live ? 'AO VIVO' : `${formatDuracao(cur)} / ${formatDuracao(dur)}`}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar'} className="text-white">
              {muted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z" opacity=".9" /><path d="M16 8l4 8M20 8l-4 8" stroke="currentColor" strokeWidth="2" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z" /></svg>
              )}
            </button>
            {captionsUrl ? (
              <button
                type="button"
                onClick={toggleCaptions}
                aria-pressed={captionsOn}
                aria-label="Legendas"
                className={`rounded-sm border px-1.5 font-mono text-[10px] font-bold ${captionsOn ? 'border-white bg-white text-ink' : 'border-white/50 text-white'}`}
              >
                CC
              </button>
            ) : null}
            <button type="button" onClick={toggleFullscreen} aria-label={fs ? 'Sair da tela cheia' : 'Tela cheia'} className="text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
            </button>
          </div>
        </div>
      </div>

      {!ready && !error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-ink" aria-hidden>
          <span className="h-8 w-8 animate-spin rounded-pill border-2 border-white/30 border-t-white" />
        </div>
      ) : null}
    </div>
  );
}
