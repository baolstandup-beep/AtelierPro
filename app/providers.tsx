'use client';

import { ToastProvider } from '@/components/ui/toaster';
import { PwaRegister } from '@/components/pwa/pwa-register';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PwaRegister />
      {children}
    </ToastProvider>
  );
}
