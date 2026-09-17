'use server';

import { createClient } from '@supabase/supabase-js';

// Utiliser une variable d'environnement avec fallback sécurisé pour le développement
const PIN_SECRET = process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// On utilise l'anon_key ici, on pourrait utiliser le service_role_key si besoin de bypasser RLS lors de la création
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Instance Supabase côté serveur (sans persistance)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export async function loginWithPin(phone: string, pin: string) {
  try {
    const securePassword = `${pin}_${PIN_SECRET}`;

    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password: securePassword,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Numéro de téléphone ou code PIN incorrect.' };
      }
      return { error: error.message };
    }

    return { data };
  } catch (err: any) {
    return { error: err.message || 'Erreur serveur' };
  }
}

export async function registerWithPin(phone: string, pin: string, fullName: string, workshopName: string) {
  try {
    const securePassword = `${pin}_${PIN_SECRET}`;

    const { data, error } = await supabase.auth.signUp({
      phone,
      password: securePassword,
      options: {
        data: {
          full_name: fullName,
          workshop_name: workshopName,
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
         return { error: 'Ce numéro possède déjà un compte.' };
      }
      return { error: error.message };
    }

    return { data };
  } catch (err: any) {
    return { error: err.message || 'Erreur serveur' };
  }
}
