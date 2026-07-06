'use client';

import { useState, useTransition } from 'react';
import type { ArticleBlock, Editoria, Materia, Pauta } from '@/types';
import { salvarMateria } from '@/lib/actions/materias';
import { BlocoVideo } from '@/components/portal/BlocoVideo';

type BlocoTipo = ArticleBlock['type'];

const NOVO_BLOCO: Record<BlocoTipo, () => ArticleBlock> = {
  paragraph: () => ({ type: 'paragraph', text: '' }),
  heading: () => ({ type: 'heading', text: '' }),
  pullquote: () => ({ type: 'pullquote', text: '', cite: '' }),
  image: () => ({ type: 'image', url: '', caption: '' }),
  embed: () => ({ type: 'embed', mediaId: '' }),
};

const BLOCO_LABEL: Record<BlocoTipo, string> = {
  paragraph: 'Parágrafo',
  heading: 'Subtítulo (H2)',
  pullquote: 'Citação',
  image: 'Imagem',
  embed: 'Vídeo/Podcast',
};

/** Editor de matéria por blocos (DATA_MODEL ArticleBlock[]). Salva via server action. */
export function MateriaEditor({
  materia,
  editorias,
  pautas,
  pautaInicial,
}: {
  materia: Materia | null;
  editorias: Editoria[];
  pautas: Pauta[];
  pautaInicial?: string;
}) {
  const [titulo, setTitulo] = useState(materia?.titulo ?? '');
  const [standfirst, setStandfirst] = useState(materia?.standfirst ?? '');
  const [editoria, setEditoria] = useState<string>(materia?.editoria ?? editorias[0]?.slug ?? '');
  const [tags, setTags] = useState<string[]>(materia?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState(materia?.heroImageUrl ?? '');
  const [heroCaption, setHeroCaption] = useState(materia?.heroCaption ?? '');
  const [pautaId, setPautaId] = useState(materia?.pautaId ?? pautaInicial ?? '');
  const [corpo, setCorpo] = useState<ArticleBlock[]>(materia?.corpo ?? [{ type: 'paragraph', text: '' }]);
  const [erro, setErro] = useState('');
  const [pending, startTransition] = useTransition();

  const addBloco = (t: BlocoTipo) => setCorpo((c) => [...c, NOVO_BLOCO[t]()]);
  const updBloco = (i: number, patch: Partial<ArticleBlock>) =>
    setCorpo((c) => c.map((b, idx) => (idx === i ? ({ ...b, ...patch } as ArticleBlock) : b)));
  const rmBloco = (i: number) => setCorpo((c) => c.filter((_, idx) => idx !== i));
  const moveBloco = (i: number, dir: -1 | 1) =>
    setCorpo((c) => {
      const j = i + dir;
      if (j < 0 || j >= c.length) return c;
      const next = [...c];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((x) => [...x, t]);
    setTagInput('');
  };

  const salvar = (enviar: boolean) => {
    setErro('');
    if (!titulo.trim()) {
      setErro('O título é obrigatório.');
      return;
    }
    startTransition(async () => {
      try {
        await salvarMateria({
          id: materia?.id,
          titulo,
          standfirst,
          editoria,
          tags,
          corpo,
          heroImageUrl,
          heroCaption,
          pautaId: pautaId || undefined,
          enviar,
        });
      } catch (e) {
        // redirect() lança NEXT_REDIRECT (esperado); só mostra erros reais
        if (e instanceof Error && !/NEXT_REDIRECT/.test(e.message)) setErro(e.message);
      }
    });
  };

  const label = 'mb-1.5 block font-mono text-[11px] uppercase tracking-kicker text-gray-500';
  const field =
    'w-full rounded border border-line bg-surface px-3 py-2 font-serif text-[15px] text-ink outline-none focus:border-ink';

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
      {/* Coluna principal */}
      <div className="space-y-5">
        <div>
          <label className={label} htmlFor="titulo">Título</label>
          <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={140} className={`${field} font-display text-xl font-bold`} placeholder="Manchete da matéria" />
        </div>
        <div>
          <label className={label} htmlFor="standfirst">Olho / standfirst</label>
          <textarea id="standfirst" value={standfirst} onChange={(e) => setStandfirst(e.target.value)} rows={2} className={field} placeholder="Resumo em uma ou duas frases" />
        </div>

        {/* Corpo em blocos */}
        <div>
          <span className={label}>Corpo</span>
          <div className="space-y-3">
            {corpo.map((b, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-kicker text-gray-400">{BLOCO_LABEL[b.type]}</span>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <button type="button" onClick={() => moveBloco(i, -1)} aria-label="Mover para cima" className="hover:text-ink">↑</button>
                    <button type="button" onClick={() => moveBloco(i, 1)} aria-label="Mover para baixo" className="hover:text-ink">↓</button>
                    <button type="button" onClick={() => rmBloco(i)} aria-label="Remover bloco" className="hover:text-ink">✕</button>
                  </div>
                </div>
                {b.type === 'paragraph' || b.type === 'heading' ? (
                  <textarea value={b.text} onChange={(e) => updBloco(i, { text: e.target.value })} rows={b.type === 'heading' ? 1 : 3} className={field} placeholder={b.type === 'heading' ? 'Subtítulo' : 'Texto do parágrafo'} />
                ) : null}
                {b.type === 'pullquote' ? (
                  <div className="space-y-2">
                    <textarea value={b.text} onChange={(e) => updBloco(i, { text: e.target.value })} rows={2} className={field} placeholder="Citação" />
                    <input value={b.cite ?? ''} onChange={(e) => updBloco(i, { cite: e.target.value })} className={field} placeholder="Autoria da citação (opcional)" />
                  </div>
                ) : null}
                {b.type === 'image' ? (
                  <div className="space-y-2">
                    <input value={b.url} onChange={(e) => updBloco(i, { url: e.target.value })} className={field} placeholder="URL da imagem" />
                    <input value={b.caption ?? ''} onChange={(e) => updBloco(i, { caption: e.target.value })} className={field} placeholder="Legenda (opcional)" />
                  </div>
                ) : null}
                {b.type === 'embed' ? (
                  <BlocoVideo
                    mediaId={b.mediaId}
                    onMediaId={(id) => updBloco(i, { mediaId: id })}
                    editoria={editoria}
                    tituloArtigo={titulo}
                  />
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(BLOCO_LABEL) as BlocoTipo[]).map((t) => (
              <button key={t} type="button" onClick={() => addBloco(t)} className="rounded-pill border border-line px-3 py-1.5 font-mono text-[11px] text-gray-700 hover:border-ink">
                + {BLOCO_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
        {erro ? <p role="alert" aria-live="assertive" className="rounded border border-ink bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink">{erro}</p> : null}
        <div>
          <label className={label} htmlFor="editoria">Editoria</label>
          <select id="editoria" value={editoria} onChange={(e) => setEditoria(e.target.value)} className={field}>
            {editorias.map((e) => (
              <option key={e.slug} value={e.slug}>{e.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pauta">Vincular pauta</label>
          <select id="pauta" value={pautaId} onChange={(e) => setPautaId(e.target.value)} className={field}>
            <option value="">Nenhuma</option>
            {pautas.map((p) => (
              <option key={p.id} value={p.id}>{p.tema}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Tags</label>
          <div className="flex gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} className={field} placeholder="Adicionar tag + Enter" />
            <button type="button" onClick={addTag} className="rounded border border-line px-3 font-display text-sm font-semibold">+</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button key={t} type="button" onClick={() => setTags((x) => x.filter((y) => y !== t))} className="rounded-pill border border-line px-2.5 py-1 font-mono text-[11px] text-gray-700 hover:border-ink">
                {t} ✕
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="hero">Imagem principal (URL)</label>
          <input id="hero" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} className={field} placeholder="URL" />
          <input value={heroCaption} onChange={(e) => setHeroCaption(e.target.value)} className={`${field} mt-2`} placeholder="Legenda da imagem" />
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <button type="button" disabled={pending} onClick={() => salvar(true)} className="rounded bg-ink px-4 py-2.5 font-display text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            {pending ? 'Enviando…' : 'Enviar para revisão'}
          </button>
          <button type="button" disabled={pending} onClick={() => salvar(false)} className="rounded border border-line px-4 py-2.5 font-display text-sm font-semibold text-ink hover:border-ink disabled:opacity-50">
            Salvar rascunho
          </button>
        </div>
      </aside>
    </div>
  );
}
