'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Author, Cidade, StatusLicenca } from '@/types';
import { criarCidade, atualizarCidade } from '@/lib/actions/cidades';

const field =
  'mt-1 w-full rounded border border-line bg-surface px-3 py-2 font-serif text-sm text-ink outline-none focus:border-ink';
const label = 'font-mono text-[10px] uppercase tracking-kicker text-gray-500';

export function CidadeForm({
  cidade,
  diretores,
}: {
  cidade?: Cidade | null;
  diretores: Author[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [pending, startTransition] = useTransition();
  const edit = Boolean(cidade);

  function submit(formData: FormData) {
    setErro('');
    const payload = {
      nome: String(formData.get('nome') ?? ''),
      uf: String(formData.get('uf') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      status: String(formData.get('status') ?? 'trial') as StatusLicenca,
      permiteEstadual: formData.get('permiteEstadual') === 'on',
      permiteNacional: formData.get('permiteNacional') === 'on',
      diretorAuthorId: String(formData.get('diretorAuthorId') ?? '') || undefined,
    };
    startTransition(async () => {
      const result = edit
        ? await atualizarCidade(cidade!.id, payload)
        : await criarCidade(payload);
      if (!result.ok) {
        setErro(result.erro ?? 'Não foi possível salvar a licença.');
        return;
      }
      router.push(result.redirectTo ?? '/admin/cidades');
      router.refresh();
    });
  }

  return (
    <form action={submit} className="max-w-2xl space-y-5 rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nome" className={label}>
            Nome da cidade / licença *
          </label>
          <input
            id="nome"
            name="nome"
            required
            maxLength={80}
            defaultValue={cidade?.nome}
            className={field}
            placeholder="Ex.: Campinas"
          />
        </div>
        <div>
          <label htmlFor="uf" className={label}>
            UF *
          </label>
          <input
            id="uf"
            name="uf"
            required
            maxLength={2}
            defaultValue={cidade?.uf}
            className={field}
            placeholder="SP"
          />
        </div>
        <div>
          <label htmlFor="slug" className={label}>
            Slug (URL) *
          </label>
          <input
            id="slug"
            name="slug"
            required
            maxLength={40}
            defaultValue={cidade?.slug}
            className={field}
            placeholder="campinas"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
        </div>
        <div>
          <label htmlFor="status" className={label}>
            Status da mensalidade
          </label>
          <select id="status" name="status" className={field} defaultValue={cidade?.status ?? 'trial'}>
            <option value="trial">Trial</option>
            <option value="ativa">Ativa</option>
            <option value="inadimplente">Inadimplente</option>
            <option value="suspensa">Suspensa</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div>
          <label htmlFor="diretorAuthorId" className={label}>
            Diretor da licença
          </label>
          <select
            id="diretorAuthorId"
            name="diretorAuthorId"
            className={field}
            defaultValue={cidade?.diretorAuthorId ?? ''}
          >
            <option value="">— Definir depois —</option>
            {diretores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className={label}>Rede editorial</legend>
        <label className="flex items-center gap-2 font-display text-sm text-ink">
          <input
            type="checkbox"
            name="permiteEstadual"
            defaultChecked={cidade?.permiteEstadual ?? true}
            className="h-4 w-4 accent-black"
          />
          Pode publicar conteúdo estadual
        </label>
        <label className="flex items-center gap-2 font-display text-sm text-ink">
          <input
            type="checkbox"
            name="permiteNacional"
            defaultChecked={cidade?.permiteNacional ?? false}
            className="h-4 w-4 accent-black"
          />
          Pode publicar conteúdo nacional
        </label>
      </fieldset>
      {erro ? (
        <p role="alert" className="rounded border border-line bg-surface-2 px-3 py-2 font-serif text-sm text-ink">
          {erro}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border border-line px-4 py-2 font-display text-sm font-semibold text-ink"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-ink px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Salvando…' : edit ? 'Salvar licença' : 'Criar licença'}
        </button>
      </div>
    </form>
  );
}
