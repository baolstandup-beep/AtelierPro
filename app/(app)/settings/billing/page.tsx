'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillingSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/abonnement');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-xs text-slate-500">Redirection vers l&apos;espace abonnement...</p>
    </div>
  );
}
