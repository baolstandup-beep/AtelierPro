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
    const internalEmail = `user${cleanPhone}@gmail.com`;
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
    const internalEmail = `user${cleanPhone}@gmail.com`;
    const securePassword = `${pin}_${PIN_SECRET}`;

    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: securePassword,
      email_confirm: true, // Auto-confirm to skip email verification
      user_metadata: {
        full_name: fullName,
        phone: phone,
        workshop_name: workshopName,
      },
    });

    let sessionData = null;
    if (!error && newUser.user) {
      // Connecter l'utilisateur fraîchement créé
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: securePassword,
      });
      if (signInError) {
        return { error: 'Compte créé, mais erreur de connexion automatique.' };
      }
      sessionData = signInData;
    }

    if (error) {
      if (error.message && (error.message.includes('User already registered') || error.message.includes('already exists'))) {
         return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
      }
      const debugInfo = `Msg: ${error.message}, Name: ${error.name}, Keys: ${Object.keys(error).join(',')}, Code: ${(error as any).code}`;
      return { error: `Erreur Supabase Auth: ${debugInfo}` };
    }

    // Le trigger handle_new_user sur Supabase s'occupe de créer le profil, l'atelier et l'association membre automatiquement.

    return { data: sessionData };
  } catch (err: any) {
    const debugInfo = `Msg: ${err?.message}, Name: ${err?.name}, Keys: ${err ? Object.keys(err).join(',') : 'null'}`;
    return { error: `Exception Interceptée: ${debugInfo}` };
  }
}
