import Link from 'next/link';
import { exigirLogin } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
import { KycForm } from '@/components/desapegoo/KycForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cadastro vendedor (KYC)' };

export default async function DesapegooKycPage() {
  const usuario = await exigirLogin('/desapegoo/kyc');
  const vendedor = await desapegoRepo.ensureVendedorFromCognito({
    cognitoSub: usuario.sub,
    email: usuario.email,
    nome: usuario.nome,
  });

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-10">
      <p className="mb-2 text-[13px] text-[var(--d-muted)]">
        <Link href="/desapegoo">desapegoo</Link> / cadastro vendedor
      </p>
      <h1 className="d-display text-[32px] text-[var(--d-navy)]">cadastro KYC</h1>
      <p className="mb-7 mt-1.5 text-[15px] text-[var(--d-body)]">
        Logado como <strong>{usuario.email ?? usuario.nome}</strong>. Preencha para anunciar e
        receber via Boovest no futuro.
      </p>
      <KycForm vendedor={vendedor} />
    </div>
  );
}
