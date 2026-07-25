'use client';

import { useRef, useState } from 'react';

/**
 * Upload de imagem de matéria: pre-signed PUT → CDN.
 * Atualiza o valor (publicUrl) no formulário pai.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  materiaId,
  placeholder = 'URL ou envie um arquivo',
  caption,
  onCaptionChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  materiaId?: string;
  placeholder?: string;
  caption?: string;
  onCaptionChange?: (c: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState('');
  const [progress, setProgress] = useState('');

  const field =
    'w-full rounded border border-line bg-surface px-3 py-2 font-serif text-[15px] text-ink outline-none focus:border-ink';
  const labelCls = 'mb-1.5 block font-mono text-[11px] uppercase tracking-kicker text-gray-500';

  const upload = async (file: File) => {
    setErro('');
    setProgress('');
    if (!file.type.startsWith('image/')) {
      setErro('Selecione uma imagem (JPEG, PNG, WebP ou GIF).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErro('Arquivo acima de 15 MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await fetch('/api/media/upload-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contentType: file.type || 'image/jpeg',
          materiaId,
          sizeBytes: file.size,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        uploadUrl?: string;
        publicUrl?: string;
      };
      if (!res.ok || !data.uploadUrl || !data.publicUrl) {
        throw new Error(data.error ?? 'Falha ao obter URL de upload');
      }
      setProgress('Enviando…');
      const put = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!put.ok) {
        throw new Error(`Upload S3 falhou (HTTP ${put.status})`);
      }
      onChange(data.publicUrl);
      setProgress('Enviado');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={field}
        placeholder={placeholder}
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded border border-line px-3 py-1.5 font-mono text-[11px] text-ink hover:border-ink disabled:opacity-50"
        >
          {uploading ? 'Enviando…' : 'Enviar arquivo'}
        </button>
        {progress ? (
          <span className="font-mono text-[10px] text-gray-400">{progress}</span>
        ) : null}
      </div>
      {erro ? (
        <p className="font-mono text-[11px] text-ink">{erro}</p>
      ) : null}
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Pré-visualização"
          className="mt-1 h-28 w-full rounded border border-line object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : null}
      {onCaptionChange !== undefined ? (
        <input
          value={caption ?? ''}
          onChange={(e) => onCaptionChange(e.target.value)}
          className={field}
          placeholder="Legenda da imagem"
        />
      ) : null}
    </div>
  );
}
