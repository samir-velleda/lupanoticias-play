'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Author, Editoria } from '@/types';
import { criarPauta } from '@/lib/actions/pautas';

const field = 'mt-1 w-full rounded border border-line bg-surface px-3 py-2 font-serif text-sm text-ink outline-none focus:border-ink';
const label = 'font-mono text-[10px] uppercase tracking-kicker text-gray-500';

export function PautaForm({ jornalistas, editorias }: { jornalistas: Author[]; editorias: Editoria[] }) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setErro('');
    const tema = String(formData.get('tema') ?? '').trim();
    const descricao = String(formData.get('descricao') ?? '').trim();
    if (tema.length < 3) {
      setErro('Informe o tema da pauta (mín. 3 caracteres).');
      return;
    }
    if (descricao.length < 3) {
      setErro('Descreva a pauta para o jornalista (mín. 3 caracteres).');
      return;
    }
    startTransition(async () => {
      try {
        const result = await criarPauta({
          tema,
          descricao,
          categoriaSugerida: String(formData.get('categoriaSugerida') ?? ''),
          prioridade: String(formData.get('prioridade') ?? 'media') as 'baixa' | 'media' | 'alta',
          prazo: String(formData.get('prazo') ?? '') || undefined,
          atribuidos: formData.getAll('atribuidos').map(String).filter(Boolean),
        });
        if (!result.ok) {
          setErro(result.erro ?? 'Não foi possível criar a pauta.');
          return;
        }
        router.push(result.redirectTo ?? '/admin/redacao/pautas');
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        setErro(
          msg && !/unexpected response/i.test(msg)
            ? msg
            : 'Falha de comunicação ao criar pauta. Atualize a página e tente de novo (sessão/CloudFront).',
        );
      }
    });
  }

  return (
    <form action={submit} className="max-w-3xl space-y-5 rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div>
        <label htmlFor="tema" className={label}>Tema *</label>
        <input id="tema" name="tema" required maxLength={140} className={field} placeholder="Ex.: Impactos locais da nova medida" />
      </div>
      <div>
        <label htmlFor="descricao" className={label}>Orientação para a reportagem *</label>
        <textarea id="descricao" name="descricao" required maxLength={5000} rows={7} className={field} placeholder="Contexto, recorte, fontes sugeridas e o que precisa ser apurado." />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="categoriaSugerida" className={label}>Editoria sugerida</label>
          <select id="categoriaSugerida" name="categoriaSugerida" className={field} defaultValue="">
            <option value="">Sem definição</option>
            {editorias.map((e) => <option key={e.slug} value={e.slug}>{e.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="prioridade" className={label}>Prioridade</label>
          <select id="prioridade" name="prioridade" className={field} defaultValue="media">
            <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
          </select>
        </div>
        <div>
          <label htmlFor="prazo" className={label}>Prazo</label>
          <input id="prazo" name="prazo" type="date" className={field} />
        </div>
      </div>
      <fieldset>
        <legend className={label}>Enviar para jornalistas</legend>
        <p className="mt-1 font-serif text-sm text-gray-500">Sem seleção, a pauta ficará aberta para toda a redação.</p>
        {jornalistas.length === 0 ? (
          <p className="mt-3 rounded border border-line bg-surface-2 px-3 py-2 font-serif text-sm text-gray-500">Nenhum jornalista disponível ainda. Você pode publicar como pauta geral.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {jornalistas.map((j) => (
              <label key={j.id} className="flex cursor-pointer items-center gap-2 rounded border border-line px-3 py-2 font-display text-sm text-ink">
                <input type="checkbox" name="atribuidos" value={j.id} className="h-4 w-4 accent-black" /> {j.nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {erro ? <p role="alert" className="rounded border border-line bg-surface-2 px-3 py-2 font-serif text-sm text-ink">{erro}</p> : null}
      <div className="flex justify-end gap-3 border-t border-line pt-4">
        <button type="button" onClick={() => router.back()} className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink">Cancelar</button>
        <button type="submit" disabled={pending} className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-60">{pending ? 'Enviando…' : 'Enviar pauta'}</button>
      </div>
    </form>
  );
}
