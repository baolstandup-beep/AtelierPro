'use server';

import { createClient } from '@supabase/supabase-js';

// Utiliser une variable d'environnement avec fallback sécurisé pour le développement
const PIN_SECRET = process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Instance Supabase côté serveur (sans persistance)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Instance Admin (Service Role) pour mettre à jour les tables (ex: profiles) après l'inscription
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function loginWithPin(phone: string, pin: string) {
  try {
    const cleanPhone = phone.replace('+', '');
    const internalEmail = `${cleanPhone}@atelierpro.internal`;
    const securePassword = `${pin}_${PIN_SECRET}`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
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
    // Vérifier si le profil existe déjà avec ce téléphone (pour bloquer avant même la création auth)
    const { data: existingProfiles, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
    }

    const cleanPhone = phone.replace('+', '');
    const internalEmail = `${cleanPhone}@atelierpro.internal`;
    const securePassword = `${pin}_${PIN_SECRET}`;

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password: securePassword,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          workshop_name: workshopName, // Conservé dans metadata
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
         return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
      }
      return { error: error.message };
    }

    // Mettre à jour la table profiles avec le téléphone pour être sûr (le trigger crée la ligne initiale)
    if (data?.user?.id) {
       await supabaseAdmin.from('profiles').update({ phone }).eq('id', data.user.id);
    }

    return { data };
  } catch (err: any) {
    return { error: err.message || 'Erreur serveur' };
  }
}
