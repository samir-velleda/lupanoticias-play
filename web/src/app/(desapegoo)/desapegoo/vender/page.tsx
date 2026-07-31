import Link from 'next/link';
import { redirect } from 'next/navigation';
import { exigirLogin } from '@/lib/auth/session';
import { desapegoRepo } from '@/lib/data/desapego';
import { VenderForm } from '@/components/desapegoo/VenderForm';
import { podeVender } from '@/types/desapego';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vender' };

export default async function DesapegooVenderPage() {
  const usuario = await exigirLogin('/desapegoo/vender');
  const vendedor = await desapegoRepo.ensureVendedorFromCognito({
    cognitoSub: usuario.sub,
    email: usuario.email,
    nome: usuario.nome,
  });

  if (!podeVender(vendedor)) {
    redirect('/desapegoo/kyc');
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-10">
      <p className="mb-2 text-[13px] text-[var(--d-muted)]">
        <Link href="/desapegoo/minha-lojinha">{vendedor.nome}</Link> · KYC ok
      </p>
      <h1 className="d-display text-[32px] text-[var(--d-navy)]">bora desapegar?</h1>
      <p className="mb-7 mt-1.5 text-[15px] text-[var(--d-body)]">
        anúncio no ar em 2 minutos. pagamentos oficiais Boovest (checkout na próxima etapa).
      </p>
      <VenderForm />
    </div>
  );
}
