'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { AppLayout } from '@/components/layout/app-layout';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isOnboardingDone } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    } else if (!isOnboardingDone) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isOnboardingDone, router]);

  if (!isAuthenticated || !isOnboardingDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-green-700 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
