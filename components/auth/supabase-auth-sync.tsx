'use client';

import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

export function SupabaseAuthSync() {
  const { syncWithSupabase, signOut, currentUserId } = useAppStore();

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    // 1. Initial Session Restoration
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0];
        syncWithSupabase(session.user.id, fullName);
      }
    });

    // 2. Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const fullName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0];
          syncWithSupabase(session.user.id, fullName);
        }
      } else if (event === 'SIGNED_OUT') {
        if (currentUserId && currentUserId !== 'demo-user-001') {
          signOut();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncWithSupabase, signOut, currentUserId]);

  return null;
}
