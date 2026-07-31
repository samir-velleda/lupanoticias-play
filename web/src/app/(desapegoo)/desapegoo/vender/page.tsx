import { VenderForm } from '@/components/desapegoo/VenderForm';

export const metadata = {
  title: 'Vender',
};

export default function DesapegooVenderPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-10">
      <h1 className="d-display text-[32px] text-[var(--d-navy)]">bora desapegar?</h1>
      <p className="mb-7 mt-1.5 text-[15px] text-[var(--d-body)]">
        anúncio no ar em 2 minutos. taxa zero no seu primeiro desapego · pagamentos oficiais
        Boovest.
      </p>
      <VenderForm />
    </div>
  );
}
