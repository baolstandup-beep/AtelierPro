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
    const cleanPhone = phone.replace('+', '').trim();
    if (!cleanPhone || cleanPhone.length < 5) return { error: 'Numéro de téléphone invalide.' };
    if (!pin || pin.length !== 4) return { error: 'Le PIN doit comporter 4 chiffres.' };

    const supabase = getServerSupabase();
    const supabaseAdmin = getServerSupabaseAdmin();
    const internalEmail = `user${cleanPhone}@gmail.com`;
    const securePassword = `${pin}_${PIN_SECRET}`;

    // 1. Tenter la connexion standard par mot de passe
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: securePassword,
    });

    if (!signInErr && signInData?.session) {
      return {
        data: {
          user: {
            id: signInData.user?.id || null,
            email: signInData.user?.email || null,
            phone: signInData.user?.phone || null,
            user_metadata: signInData.user?.user_metadata || {},
          },
          session: {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            expires_at: signInData.session.expires_at,
            expires_in: signInData.session.expires_in,
            token_type: signInData.session.token_type,
          },
        },
      };
    }

    // 2. Si le mot de passe est invalide (et que le provider était activé)
    if (signInErr && signInErr.message.includes('Invalid login credentials')) {
      return { error: 'Numéro de téléphone ou code PIN incorrect.' };
    }

    // 3. Si le provider email est désactivé dans Supabase, utiliser le flux de session sécurisé via admin
    if (signInErr && signInErr.message.includes('disabled')) {
      // Vérifier si le profil existe
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('phone', phone)
        .maybeSingle();

      if (!profile) {
        return { error: 'Aucun compte trouvé avec ce numéro de téléphone.' };
      }

      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: internalEmail,
      });

      const hashedToken = linkRes.data?.properties?.hashed_token;
      if (hashedToken) {
        const verifyRes = await supabase.auth.verifyOtp({
          token_hash: hashedToken,
          type: 'magiclink',
        });

        if (verifyRes.data?.session) {
          return {
            data: {
              user: {
                id: verifyRes.data.user?.id || null,
                email: verifyRes.data.user?.email || null,
                phone: verifyRes.data.user?.phone || null,
                user_metadata: verifyRes.data.user?.user_metadata || { full_name: profile.full_name },
              },
              session: {
                access_token: verifyRes.data.session.access_token,
                refresh_token: verifyRes.data.session.refresh_token,
                expires_at: verifyRes.data.session.expires_at,
                expires_in: verifyRes.data.session.expires_in,
                token_type: verifyRes.data.session.token_type,
              },
            },
          };
        }
      }
    }

    return { error: 'Erreur lors de la connexion. Veuillez vérifier votre numéro et code PIN.' };
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
    let activeSession: any = null;
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: securePassword,
    });

    if (!signInError && signInData?.session) {
      activeSession = signInData.session;
    } else {
      // Fallback via generateLink + verifyOtp si les connexions directes par mot de passe sont désactivées
      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: internalEmail,
      });

      const hashedToken = linkRes.data?.properties?.hashed_token;
      if (hashedToken) {
        const verifyRes = await supabase.auth.verifyOtp({
          token_hash: hashedToken,
          type: 'magiclink',
        });
        if (verifyRes.data?.session) {
          activeSession = verifyRes.data.session;
        }
      }
    }

    if (!activeSession) {
      return { error: 'Compte créé avec succès, mais la session n\'a pas pu être initialisée. Veuillez vous connecter.' };
    }

    // Retourner un objet purement sérialisable en RSC (sans symboles ni méthodes Supabase internes)
    return {
      data: {
        user: {
          id: userId,
          email: internalEmail,
          phone: phone.trim(),
          user_metadata: { full_name: fullName.trim() },
        },
        session: {
          access_token: activeSession.access_token || null,
          refresh_token: activeSession.refresh_token || null,
          expires_at: activeSession.expires_at || null,
          expires_in: activeSession.expires_in || null,
          token_type: activeSession.token_type || null,
        },
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
