'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DESAPEGO_CATEGORIAS,
  DESAPEGO_ESTADOS,
  type DesapegoCategoria,
  type DesapegoEstadoItem,
} from '@/types/desapego';
import { criarAnuncioDesapego } from '@/lib/actions/desapego';

const field =
  'w-full rounded-[10px] border-[1.5px] border-[var(--d-line)] bg-white px-4 py-3 text-sm text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)]';
const label = 'mb-2 block text-sm font-bold text-[var(--d-navy)]';

export function VenderForm() {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setErro('');
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 5 - fotos.length)) {
        if (!file.type.startsWith('image/')) {
          setErro('Use apenas imagens (JPEG, PNG, WebP).');
          continue;
        }
        // Tenta pre-signed S3; se falhar (dev local), usa data URL de preview.
        try {
          const res = await fetch('/api/desapego/upload-url', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              uploadUrl: string;
              publicUrl: string;
              contentType: string;
            };
            const put = await fetch(data.uploadUrl, {
              method: 'PUT',
              headers: { 'content-type': data.contentType },
              body: file,
            });
            if (put.ok) {
              setFotos((f) => [...f, data.publicUrl]);
              continue;
            }
          }
        } catch {
          /* fallback local */
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error('Falha ao ler arquivo'));
          r.readAsDataURL(file);
        });
        setFotos((f) => [...f, dataUrl]);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no upload');
    } finally {
      setUploading(false);
    }
  }

  function submit(formData: FormData) {
    setErro('');
    const precoStr = String(formData.get('preco') ?? '').replace(/\./g, '').replace(',', '.');
    const preco = Math.round(parseFloat(precoStr || '0') * 100);
    startTransition(async () => {
      const result = await criarAnuncioDesapego({
        titulo: String(formData.get('titulo') ?? ''),
        descricao: String(formData.get('descricao') ?? ''),
        categoria: String(formData.get('categoria') ?? 'outros') as DesapegoCategoria,
        estado: String(formData.get('estado') ?? 'usado_com_amor') as DesapegoEstadoItem,
        precoCentavos: preco,
        fotos,
        freteGratis: formData.get('freteGratis') === 'on',
        vendedorNome: String(formData.get('vendedorNome') ?? '') || undefined,
      });
      if (!result.ok) {
        setErro(result.erro ?? 'Não foi possível publicar.');
        return;
      }
      router.push(result.redirectTo ?? `/desapegoo/p/${result.slug}`);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-5 rounded-[18px] border border-[var(--d-line)] bg-white p-7">
      <div>
        <div className={label}>fotos do item</div>
        <div className="flex flex-wrap gap-3">
          <label className="flex h-[110px] w-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#D8CFC0] text-[var(--d-muted)] hover:border-[var(--d-coral)] hover:text-[var(--d-coral)]">
            <span className="text-2xl leading-none">+</span>
            <span className="text-[11px] font-semibold">{uploading ? 'enviando…' : 'adicionar'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading || fotos.length >= 5}
              onChange={(e) => onPickFiles(e.target.files)}
            />
          </label>
          {fotos.map((f, i) => (
            <div key={i} className="relative h-[110px] w-[110px] overflow-hidden rounded-xl border border-[var(--d-line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setFotos((xs) => xs.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--d-muted)]">
          dica: luz natural e fundo limpo vendem 3x mais
        </p>
      </div>

      <div>
        <label htmlFor="titulo" className={label}>
          título do anúncio
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          maxLength={120}
          placeholder="ex.: jaqueta jeans oversized anos 90"
          className={field}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="categoria" className={label}>
            categoria
          </label>
          <select id="categoria" name="categoria" className={field} defaultValue="roupas">
            {DESAPEGO_CATEGORIAS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="estado" className={label}>
            estado
          </label>
          <select id="estado" name="estado" className={field} defaultValue="usado_com_amor">
            {DESAPEGO_ESTADOS.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label htmlFor="preco" className={label}>
            preço (R$)
          </label>
          <input id="preco" name="preco" required placeholder="89" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="descricao" className={label}>
          conta a história
        </label>
        <textarea
          id="descricao"
          name="descricao"
          required
          rows={4}
          placeholder="por que você tá desapegando? tem algum detalhe, marquinha de uso, memória boa?"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="vendedorNome" className={label}>
          nome da lojinha (opcional)
        </label>
        <input
          id="vendedorNome"
          name="vendedorNome"
          placeholder="ex.: lojinha da Ju"
          className={field}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--d-ink)]">
        <input type="checkbox" name="freteGratis" className="h-4 w-4 accent-[var(--d-coral)]" />
        frete grátis
      </label>

      {erro ? (
        <p role="alert" className="rounded-xl border border-[var(--d-line)] bg-[var(--d-cream-2)] px-3 py-2 text-sm">
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={pending || uploading} className="d-btn-primary py-4 text-base">
        {pending ? 'publicando…' : 'publicar desapego'}
      </button>
    </form>
  );
}
