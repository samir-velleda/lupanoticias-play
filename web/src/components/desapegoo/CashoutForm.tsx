'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { solicitarCashoutDesapego } from '@/lib/actions/desapego-pedidos';

const field =
  'w-full rounded-[10px] border border-[var(--d-line)] px-3 py-2 text-sm outline-none focus:border-[var(--d-coral)]';
const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--d-muted)]';

export function CashoutForm({ cpfKyc }: { cpfKyc: string }) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    setErro('');
    startTransition(async () => {
      const r = await solicitarCashoutDesapego({
        valorReais: String(fd.get('valor') ?? ''),
        banco: String(fd.get('banco') ?? ''),
        agencia: String(fd.get('agencia') ?? ''),
        conta: String(fd.get('conta') ?? ''),
        tipoConta: String(fd.get('tipoConta') ?? 'corrente') as 'corrente' | 'poupanca',
        cpfTitular: String(fd.get('cpfTitular') ?? cpfKyc),
      });
      if (!r.ok) {
        setErro(r.erro ?? 'Falha no cashout.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-3 rounded-[18px] border border-[var(--d-line)] bg-white p-5">
      <h2 className="d-display text-lg text-[var(--d-navy)]">cashout</h2>
      <p className="text-xs text-[var(--d-muted)]">
        Conta bancária da <strong>mesma titularidade</strong> do CPF do KYC. Sem split: saque do
        saldo disponível da wallet.
      </p>
      <div>
        <label className={label} htmlFor="valor">
          valor (R$)
        </label>
        <input id="valor" name="valor" required className={field} placeholder="100" />
      </div>
      <div>
        <label className={label} htmlFor="banco">
          banco
        </label>
        <input id="banco" name="banco" required className={field} placeholder="Nubank / 260" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="agencia">
            agência
          </label>
          <input id="agencia" name="agencia" required className={field} />
        </div>
        <div>
          <label className={label} htmlFor="conta">
            conta
          </label>
          <input id="conta" name="conta" required className={field} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="tipoConta">
          tipo
        </label>
        <select id="tipoConta" name="tipoConta" className={field} defaultValue="corrente">
          <option value="corrente">corrente</option>
          <option value="poupanca">poupança</option>
        </select>
      </div>
      <div>
        <label className={label} htmlFor="cpfTitular">
          CPF do titular (mesmo do KYC)
        </label>
        <input
          id="cpfTitular"
          name="cpfTitular"
          required
          defaultValue={cpfKyc}
          className={field}
        />
      </div>
      {erro ? <p className="text-sm text-[var(--d-coral-dark)]">{erro}</p> : null}
      <button type="submit" disabled={pending} className="d-btn-primary w-full py-3 text-sm">
        {pending ? 'solicitando…' : 'solicitar cashout'}
      </button>
    </form>
  );
}
