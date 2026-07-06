'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ACCEPT_ATTR,
  humanBytes,
  humanDuracao,
  validarArquivo,
} from '@/lib/media/upload-config';

type Fase = 'idle' | 'validando' | 'enviando' | 'processando' | 'pronto' | 'erro';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lê a duração do vídeo no cliente (metadata), quando possível. */
function lerDuracao(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(v.duration) ? v.duration : undefined);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      v.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

function uploadComProgresso(url: string, file: File, contentType: string, onProg: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProg(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no envio ao S3 (HTTP ${xhr.status}).`));
    xhr.onerror = () => reject(new Error('Erro de rede durante o envio.'));
    xhr.send(file);
  });
}

/**
 * Bloco de vídeo/podcast do editor: DUAS abas.
 * - "Enviar arquivo": dropzone (arrastar/soltar + selecionar; no celular abre câmera/galeria),
 *   valida (formato/tamanho/duração), sobe via URL pré-assinada com barra de progresso,
 *   e faz polling do processamento até tocar. Grava o mediaId no bloco.
 * - "Colar link": comportamento atual (id da mídia no Lupa Play).
 */
export function BlocoVideo({
  mediaId,
  onMediaId,
  editoria,
  tituloArtigo,
}: {
  mediaId: string;
  onMediaId: (id: string) => void;
  editoria: string;
  tituloArtigo: string;
}) {
  const [aba, setAba] = useState<'upload' | 'link'>(mediaId ? 'link' : 'upload');
  const [fase, setFase] = useState<Fase>('idle');
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelado = useRef(false);

  useEffect(() => () => { cancelado.current = true; }, []);

  async function processar(file: File) {
    setErro('');
    setProgresso(0);
    setFase('validando');
    const contentType = file.type || 'application/octet-stream';
    const durationSec = await lerDuracao(file);
    setDetalhe(
      `${humanBytes(file.size)}${durationSec ? ` · ${humanDuracao(durationSec)}` : ''}`,
    );
    const v = validarArquivo({ filename: file.name, contentType, sizeBytes: file.size, durationSec });
    if (!v.ok) {
      setFase('erro');
      setErro(v.erro ?? 'Arquivo inválido.');
      return;
    }
    try {
      // 1) cria o registro + pega a URL de upload
      const criar = await fetch('/api/media', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tipo: 'video',
          titulo: tituloArtigo?.trim() || file.name,
          editoria,
          tags: [],
          filename: file.name,
          contentType,
          sizeBytes: file.size,
          durationSec,
        }),
      });
      const cj = await criar.json().catch(() => ({}));
      if (!criar.ok) throw new Error(cj.erro ?? 'Falha ao iniciar o upload.');
      const novoId: string = cj.mediaId;

      // 2) sobe o arquivo direto ao S3 com progresso
      setFase('enviando');
      await uploadComProgresso(cj.uploadUrl, file, contentType, (p) => setProgresso(p));
      if (cancelado.current) return;

      // 3) o registro já está no bloco; acompanha o processamento
      onMediaId(novoId);
      setFase('processando');
      for (let i = 0; i < 220; i++) {
        await sleep(3000);
        if (cancelado.current) return;
        const st = await fetch(`/api/media/${novoId}/status`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (!st) continue;
        if (st.status === 'pronto') {
          setDetalhe(st.duracaoSeg ? `Pronto · ${humanDuracao(st.duracaoSeg)}` : 'Pronto');
          setFase('pronto');
          return;
        }
        if (st.status === 'erro') throw new Error('O processamento do vídeo falhou.');
      }
      throw new Error('Tempo esgotado aguardando o processamento.');
    } catch (e) {
      if (cancelado.current) return;
      setFase('erro');
      setErro(e instanceof Error ? e.message : 'Falha no upload.');
    }
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void processar(file);
  }

  const tab = 'flex-1 rounded px-3 py-1.5 font-display text-[13px] font-semibold transition-colors';

  return (
    <div className="space-y-3">
      {/* Abas */}
      <div className="flex gap-1 rounded-lg bg-surface-2 p-1" role="tablist" aria-label="Fonte do vídeo">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'upload'}
          onClick={() => setAba('upload')}
          className={`${tab} ${aba === 'upload' ? 'bg-surface text-ink shadow-sm' : 'text-gray-500'}`}
        >
          Enviar arquivo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'link'}
          onClick={() => setAba('link')}
          className={`${tab} ${aba === 'link' ? 'bg-surface text-ink shadow-sm' : 'text-gray-500'}`}
        >
          Colar link
        </button>
      </div>

      {aba === 'link' ? (
        <input
          value={mediaId}
          onChange={(e) => onMediaId(e.target.value)}
          className="w-full rounded border border-line bg-surface px-3 py-2 font-serif text-[15px] text-ink outline-none focus:border-ink"
          placeholder="ID da mídia (Lupa Play)"
          aria-label="ID da mídia do Lupa Play"
        />
      ) : (
        <div>
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={(e) => { e.preventDefault(); setDragover(false); onFiles(e.dataTransfer.files); }}
            className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragover ? 'border-ink bg-surface-2' : 'border-line bg-surface'
            }`}
          >
            <p className="font-serif text-[15px] text-gray-600">
              Arraste um vídeo aqui ou
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white hover:opacity-90"
            >
              Selecionar arquivo
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => onFiles(e.target.files)}
            />
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-kicker text-gray-400">
              MP4 ou MOV · até 10 min · até 4 GB
            </p>
          </div>

          {/* Estados (anunciados a leitor de tela) */}
          <div aria-live="polite" className="mt-3">
            {fase === 'validando' ? (
              <p className="font-mono text-[11.5px] text-gray-500">Validando… {detalhe}</p>
            ) : null}
            {fase === 'enviando' ? (
              <div>
                <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-gray-500">
                  <span>Enviando… {detalhe}</span>
                  <span>{progresso}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-3" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-ink transition-[width]" style={{ width: `${progresso}%` }} />
                </div>
              </div>
            ) : null}
            {fase === 'processando' ? (
              <p className="font-mono text-[11.5px] text-gray-500">
                Enviado. Processando o vídeo (HLS)… isso pode levar alguns minutos.
              </p>
            ) : null}
            {fase === 'pronto' ? (
              <p className="rounded border border-line bg-surface-2 px-3 py-2 font-mono text-[11.5px] text-ink">
                ✓ Vídeo pronto e vinculado à matéria. {detalhe}
              </p>
            ) : null}
            {fase === 'erro' ? (
              <div role="alert" className="rounded border border-ink bg-surface-2 px-3 py-2">
                <p className="font-mono text-[11.5px] text-ink">{erro}</p>
                <button
                  type="button"
                  onClick={() => { setFase('idle'); setErro(''); inputRef.current?.click(); }}
                  className="mt-1.5 font-mono text-[11px] font-bold text-ink underline"
                >
                  Reenviar
                </button>
              </div>
            ) : null}
            {mediaId && fase === 'idle' ? (
              <p className="font-mono text-[11px] text-gray-400">Mídia vinculada: {mediaId}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
