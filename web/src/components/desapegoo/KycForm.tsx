'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DesapegoVendedor } from '@/types/desapego';
import { mascararCpf } from '@/types/desapego';
import { salvarKycDesapego } from '@/lib/actions/desapego';

const field =
  'w-full rounded-[10px] border-[1.5px] border-[var(--d-line)] bg-white px-4 py-3 text-sm text-[var(--d-ink)] outline-none focus:border-[var(--d-coral)]';
const label = 'mb-2 block text-sm font-bold text-[var(--d-navy)]';

export function KycForm({ vendedor }: { vendedor: DesapegoVendedor }) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [pending, startTransition] = useTransition();
  const completo = vendedor.kycStatus === 'aprovado' || vendedor.kycStatus === 'pendente';

  function submit(formData: FormData) {
    setErro('');
    startTransition(async () => {
      const result = await salvarKycDesapego({
        nomeLojinha: String(formData.get('nomeLojinha') ?? ''),
        nomeCompleto: String(formData.get('nomeCompleto') ?? ''),
        cpf: String(formData.get('cpf') ?? ''),
        telefone: String(formData.get('telefone') ?? ''),
        chavePix: String(formData.get('chavePix') ?? ''),
        cidade: String(formData.get('cidade') ?? '') || undefined,
        uf: String(formData.get('uf') ?? '') || undefined,
        bio: String(formData.get('bio') ?? '') || undefined,
      });
      if (!result.ok) {
        setErro(result.erro ?? 'Não foi possível salvar.');
        return;
      }
      router.push(result.redirectTo ?? '/desapegoo/vender');
      router.refresh();
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-5 rounded-[18px] border border-[var(--d-line)] bg-white p-7">
      {completo ? (
        <div className="rounded-xl border border-[#B7E0C6] bg-[var(--d-green-bg)] px-4 py-3 text-sm text-[var(--d-green)]">
          Cadastro KYC <strong>{vendedor.kycStatus}</strong>
          {vendedor.cpf ? ` · CPF ${mascararCpf(vendedor.cpf)}` : ''}. Você já pode anunciar.
        </div>
      ) : (
        <p className="text-sm text-[var(--d-body)]">
          Precisamos dos seus dados para liberar vendas e, em breve, repasses via{' '}
          <strong>Boovest Pay</strong>. Seus dados não aparecem na vitrine pública.
        </p>
      )}

      <div>
        <label htmlFor="nomeLojinha" className={label}>
          nome da lojinha *
        </label>
        <input
          id="nomeLojinha"
          name="nomeLojinha"
          required
          maxLength={80}
          defaultValue={vendedor.nome}
          className={field}
          placeholder="ex.: lojinha da Ju"
        />
      </div>

      <div>
        <label htmlFor="nomeCompleto" className={label}>
          nome completo (documento) *
        </label>
        <input
          id="nomeCompleto"
          name="nomeCompleto"
          required
          maxLength={120}
          defaultValue={vendedor.nomeCompleto ?? ''}
          className={field}
          placeholder="como no CPF"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cpf" className={label}>
            CPF *
          </label>
          <input
            id="cpf"
            name="cpf"
            required
            inputMode="numeric"
            defaultValue={vendedor.cpf ?? ''}
            className={field}
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label htmlFor="telefone" className={label}>
            telefone (WhatsApp) *
          </label>
          <input
            id="telefone"
            name="telefone"
            required
            inputMode="tel"
            defaultValue={vendedor.telefone ?? ''}
            className={field}
            placeholder="11 99999-0000"
          />
        </div>
      </div>

      <div>
        <label htmlFor="chavePix" className={label}>
          chave Pix * <span className="font-normal text-[var(--d-muted)]">(recebimento futuro)</span>
        </label>
        <input
          id="chavePix"
          name="chavePix"
          required
          defaultValue={vendedor.chavePix ?? ''}
          className={field}
          placeholder="e-mail, telefone, CPF ou chave aleatória"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="cidade" className={label}>
            cidade
          </label>
          <input
            id="cidade"
            name="cidade"
            defaultValue={vendedor.cidade ?? ''}
            className={field}
            placeholder="São Paulo"
          />
        </div>
        <div>
          <label htmlFor="uf" className={label}>
            UF
          </label>
          <input
            id="uf"
            name="uf"
            maxLength={2}
            defaultValue={vendedor.uf ?? ''}
            className={field}
            placeholder="SP"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className={label}>
          bio da lojinha
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={vendedor.bio ?? ''}
          className={field}
          placeholder="conte um pouco sobre o que você vende"
        />
      </div>

      {erro ? (
        <p role="alert" className="rounded-xl border border-[var(--d-line)] bg-[var(--d-cream-2)] px-3 py-2 text-sm">
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="d-btn-primary py-4 text-base">
        {pending ? 'salvando…' : completo ? 'atualizar cadastro' : 'salvar e liberar vendas'}
      </button>
    </form>
  );
}
