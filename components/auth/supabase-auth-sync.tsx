'use client';

import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

export function SupabaseAuthSync() {
  const { syncWithSupabase, clearSession, setAuthInitialized, currentUserId } = useAppStore();

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setAuthInitialized(true);
      return;
    }

    // 1. Initial Session Restoration
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0];
        
        // Prevent re-syncing if it's the same user
        if (currentUserId !== session.user.id) {
          syncWithSupabase(session.user.id, fullName);
        }
      } else {
        setAuthInitialized(true);
      }
    }).catch((error) => {
      console.error('[Auth] Session restoration failed:', error);
      setAuthInitialized(true);
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
            
          // If the user changed, we might have leftover state
          if (currentUserId !== session.user.id) {
            if (currentUserId !== null) clearSession();
            void syncWithSupabase(session.user.id, fullName);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        clearSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncWithSupabase, clearSession, setAuthInitialized, currentUserId]);

  return null;
}
