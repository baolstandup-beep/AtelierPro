'use client';

import { ToastProvider } from '@/components/ui/toaster';
import { PwaRegister } from '@/components/pwa/pwa-register';
import { SupabaseAuthSync } from '@/components/auth/supabase-auth-sync';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PwaRegister />
      <SupabaseAuthSync />
      {children}
    </ToastProvider>
  );
}
