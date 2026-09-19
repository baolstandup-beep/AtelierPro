import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('votre-projet') &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseAnonKey !== 'votre-cle-anonyme'
);

export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase non configuré. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env.local'
    );
  }
  return supabase;
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase non configuré');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase non configuré');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  if (!supabase) {
    throw new Error('Supabase non configuré');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
