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
    // 1. Validations Serveur
    const cleanPhone = phone.replace('+', '').trim();
    if (!cleanPhone || cleanPhone.length < 5) return { error: 'Numéro de téléphone invalide.' };
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return { error: 'Le PIN doit contenir exactement 4 chiffres.' };
    if (!fullName || fullName.trim().length === 0) return { error: 'Le prénom et nom sont obligatoires.' };
    if (!workshopName || workshopName.trim().length === 0) return { error: 'Le nom de l\'atelier est obligatoire.' };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return { error: 'Configuration Supabase incomplète sur le serveur.' };
    }

    const supabaseAdmin = getServerSupabaseAdmin();
    const supabase = getServerSupabase();

    // Vérifier si un profil existe déjà avec ce téléphone
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
    }

    const internalEmail = `user${cleanPhone}@gmail.com`;
    const securePassword = `${pin}_${PIN_SECRET}`;

    // [REGISTER] 2 - appel Auth
    console.log("[REGISTER] 2 - appel Auth");

    // Utilisation directe du endpoint admin pour garantir la lecture du corps d'erreur HTTP même sur les 500
    const authEndpoint = `${supabaseUrl}/auth/v1/admin/users`;
    const authResponse = await fetch(authEndpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: internalEmail,
        password: securePassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          workshop_name: workshopName.trim(),
        },
      }),
    });

    const responseText = await authResponse.text();
    let authJson: any = null;
    try {
      authJson = JSON.parse(responseText);
    } catch {
      authJson = { message: responseText };
    }

    if (!authResponse.ok) {
      const error = {
        name: 'SupabaseAuthError',
        status: authResponse.status,
        code: authJson?.code,
        message: authJson?.message || authJson?.error_description || responseText || 'Erreur d\'authentification',
        cause: authJson?.detail || authJson,
      };

      console.error("REGISTER ERROR RAW:", error);
      console.error("REGISTER ERROR NAME:", error?.name);
      console.error("REGISTER ERROR MESSAGE:", error?.message);
      console.error("REGISTER ERROR STATUS:", error?.status);
      console.error("REGISTER ERROR CODE:", error?.code);
      console.error("REGISTER ERROR CAUSE:", error?.cause);

      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
        return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
      }

      const detailInfo = error.cause && typeof error.cause === 'string' ? ` (${error.cause})` : '';
      return { error: `Impossible de créer le compte Auth (HTTP ${error.status}) : ${error.message}${detailInfo}` };
    }

    const user = authJson;
    const userId = user?.id;

    if (!userId) {
      return { error: 'La création du compte a échoué (aucun identifiant utilisateur retourné).' };
    }

    // [REGISTER] 3 - Auth réussi
    console.log("[REGISTER] 3 - Auth réussi", userId);

    // [REGISTER] 4 - création profil
    console.log("[REGISTER] 4 - création profil");

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // Création de l'atelier dans la table 'ateliers'
      const { data: newAtelier, error: atelierError } = await supabaseAdmin
        .from('ateliers')
        .insert({
          name: workshopName.trim(),
          phone: phone.trim(),
        })
        .select('id')
        .single();

      const atelierId = newAtelier?.id;

      // Création du profil lié
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          atelier_id: atelierId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: 'owner',
        });

      if (profileError) {
        console.error("REGISTER ERROR (PROFILE):", profileError.message);
      }
    }

    // [REGISTER] 5 - profil créé
    console.log("[REGISTER] 5 - profil créé");

    // Connexion pour fournir la session active
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: securePassword,
    });

    if (signInError) {
      console.error(`[Supabase Sign-In Error] ${signInError.message}`);
      return { error: 'Compte créé, mais erreur de connexion automatique.' };
    }

    // Retourner un objet purement sérialisable en RSC (sans symboles ni méthodes Supabase internes)
    return {
      data: {
        user: {
          id: sessionData.user?.id,
          email: sessionData.user?.email,
          phone: sessionData.user?.phone,
        },
        session: sessionData.session ? {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: sessionData.session.expires_at,
          expires_in: sessionData.session.expires_in,
          token_type: sessionData.session.token_type,
        } : null,
      },
    };
  } catch (err: any) {
    console.error("REGISTER ERROR RAW:", err);
    console.error("REGISTER ERROR NAME:", err?.name);
    console.error("REGISTER ERROR MESSAGE:", err?.message);
    console.error("REGISTER ERROR STATUS:", err?.status);
    console.error("REGISTER ERROR CODE:", err?.code);
    console.error("REGISTER ERROR CAUSE:", err?.cause);
    return { error: `Erreur inattendue du serveur lors de l'inscription : ${err?.message || 'Erreur inconnue'}` };
  }
}
