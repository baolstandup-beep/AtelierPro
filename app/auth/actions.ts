'use server';

import { createClient } from '@supabase/supabase-js';

// Utiliser une variable d'environnement avec fallback sécurisé pour le développement
const PIN_SECRET = process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024';

// Fonction d'instanciation locale différée pour s'assurer que le runtime a bien lu les variables d'environnement
function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Configuration Supabase manquante dans l'environnement serveur.");
    throw new Error("Erreur de configuration interne (Supabase URL/Key manquante).");
  }

  // Option persistSession: false indispensable pour les actions serveur (sinon fetch warning)
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

function getServerSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Configuration Supabase Service Role manquante dans l'environnement serveur.");
    throw new Error("Erreur de configuration interne (Service Key manquante).");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function loginWithPin(phone: string, pin: string) {
  try {
    const supabase = getServerSupabase();
    const cleanPhone = phone.replace('+', '').trim();
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
      return { error: 'Erreur lors de la connexion. Veuillez réessayer.' };
    }

    return { data };
  } catch (err: any) {
    return { error: 'Erreur inattendue du serveur lors de la connexion.' };
  }
}

export async function registerWithPin(phone: string, pin: string, fullName: string, workshopName: string) {
  try {
    // 1. Validations Serveur strictes
    const cleanPhone = phone.replace('+', '').trim();
    if (!cleanPhone || cleanPhone.length < 5) return { error: 'Numéro de téléphone invalide.' };
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return { error: 'Le PIN doit contenir exactement 4 chiffres.' };
    if (!fullName || fullName.trim().length === 0) return { error: 'Le prénom et nom sont obligatoires.' };
    if (!workshopName || workshopName.trim().length === 0) return { error: 'Le nom de l\'atelier est obligatoire.' };

    const supabaseAdmin = getServerSupabaseAdmin();
    const supabase = getServerSupabase();

    // 2. Vérification d'existence de profil (pour un retour rapide sans erreur obscure de Auth)
    const { data: existingProfiles, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
    }

    // 3. Inscription via Admin API (car l'inscription Email classique est désactivée dans le projet)
    const internalEmail = `user${cleanPhone}@gmail.com`;
    const securePassword = `${pin}_${PIN_SECRET}`;

    console.log(`[DEBUG] Tentative d'inscription (Admin API) pour: ${cleanPhone}`);

    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: securePassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        workshop_name: workshopName.trim(),
      }
    });

    if (error) {
      console.error(`[Supabase Auth Error] Message: ${error.message}, Status: ${error.status}, Code: ${(error as any).code}`);
      
      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
         return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
      }
      if (error.message.includes('FetchError') || error.status === undefined) {
          return { error: 'Problème de connexion au serveur d\'authentification. Réessayez plus tard.' };
      }
      return { error: `Impossible de créer le compte : ${error.message}` };
    }

    if (!newUser || !newUser.user) {
        return { error: 'La création du compte a échoué (réponse vide).' };
    }

    console.log(`[DEBUG] Inscription réussie. UID: ${newUser.user.id}`);

    // Connecter l'utilisateur pour lui fournir une session active
    let sessionData = null;
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: securePassword,
    });
    
    if (signInError) {
      console.error(`[Supabase Sign-In Error] ${signInError.message}`);
      return { error: 'Compte créé, mais erreur de connexion automatique.' };
    }
    sessionData = signInData;

    return { data: sessionData };
  } catch (err: any) {
    console.error(`[Exception Interceptée] Msg: ${err?.message}, Name: ${err?.name}`);
    return { error: 'Erreur inattendue du serveur lors de l\'inscription.' };
  }
}
