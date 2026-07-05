'use client';

import { PortalErro } from '@/components/portal/PortalErro';

export default function GrupoError({ reset }: { error: Error; reset: () => void }) {
  return <PortalErro reset={reset} />;
}
