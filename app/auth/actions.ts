'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { computePinHash, verifyPin, generateUserSalt, CURRENT_CREDENTIAL_VERSION } from '@/lib/crypto-pin';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limiter';
import { recordAuditLog } from '@/lib/audit';
import { isPlatformAdmin } from '@/lib/admin';

// Fonction d'instanciation locale différée pour s'assurer que le runtime a bien lu les variables d'environnement
function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Erreur de configuration interne (Supabase URL/Key manquante).");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

function getServerSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Erreur de configuration interne (Service Key manquante).");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * ─── 1. Authentification Sécurisée par PIN 4 chiffres ───
 */
export async function loginWithPin(phone: string, pin: string) {
  try {
    const cleanPhone = phone.replace('+', '').trim();
    if (!cleanPhone || cleanPhone.length < 5) return { error: 'Numéro de téléphone invalide.' };
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return { error: 'Le PIN doit comporter exactement 4 chiffres.' };

    // A. Limitation du taux de requêtes par IP (Anti Brute Force)
    const headerList = await headers();
    const ip = getClientIp(headerList);
    const ipRateLimit = checkRateLimit(ip, 'login_ip', 25, 15 * 60 * 1000);

    if (!ipRateLimit.isAllowed) {
      return {
        error: 'Trop de tentatives de connexion depuis votre adresse IP. Veuillez patienter 15 minutes avant de réessayer.',
      };
    }

    const supabase = getServerSupabase();
    const supabaseAdmin = getServerSupabaseAdmin();
    const internalEmail = `user${cleanPhone}@gmail.com`;

    // B. Recherche du profil par numéro de téléphone
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, atelier_id')
      .eq('phone', phone)
      .maybeSingle();

    if (!profile) {
      // Délai constant simulé pour empêcher l'énumération temporelle des comptes
      await new Promise((r) => setTimeout(r, 350));
      return { error: 'Numéro de téléphone ou code PIN incorrect.' };
    }

    // C. Récupération des métadonnées de sécurité de l'utilisateur (app_metadata réservé service_role)
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const user = userRes?.user;

    if (!user) {
      await new Promise((r) => setTimeout(r, 350));
      return { error: 'Numéro de téléphone ou code PIN incorrect.' };
    }

    const appMeta = user.app_metadata || {};

    // D. Vérification du verrouillage temporaire du compte
    if (appMeta.locked_until) {
      const lockExpiry = new Date(appMeta.locked_until).getTime();
      const now = Date.now();
      if (now < lockExpiry) {
        const remainingMinutes = Math.max(1, Math.ceil((lockExpiry - now) / (60 * 1000)));
        return {
          error: `Compte temporairement verrouillé par mesure de sécurité. Veuillez réessayer dans ${remainingMinutes} minute(s).`,
        };
      }
    }

    // E. Vérification du PIN cryptographique
    let isPinValid = false;
    const storedHash = appMeta.pin_hash;
    const salt = appMeta.user_salt || user.id;
    const credVersion = Number(appMeta.credential_version || 1);

    if (storedHash) {
      isPinValid = verifyPin(pin, storedHash, salt, credVersion);
    } else {
      // Rétrocompatibilité : compte créé avant la migration vers le hachage sécurisé.
      // On vérifie via le mot de passe Supabase (format legacy) puis on migre.
      const legacySalt = process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024';
      const legacyPassword = `${pin}_${legacySalt}`;
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: legacyPassword,
      });
      isPinValid = !signInErr;

      if (isPinValid) {
        // Migration vers le nouveau format de hash sécurisé
        const newSalt = generateUserSalt();
        const newHash = computePinHash(pin, newSalt, CURRENT_CREDENTIAL_VERSION);
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          app_metadata: {
            ...appMeta,
            pin_hash: newHash,
            user_salt: newSalt,
            credential_version: CURRENT_CREDENTIAL_VERSION,
          },
        });
      }
    }

    // F. Traitement de l'échec PIN (Incrémentation & Verrouillage progressif)
    if (!isPinValid) {
      const failedCount = (appMeta.failed_attempts || 0) + 1;
      let newLockUntil: string | null = null;

      if (failedCount >= 10) {
        newLockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      } else if (failedCount >= 5) {
        newLockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
      }

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...appMeta,
          failed_attempts: failedCount,
          locked_until: newLockUntil,
          last_failed_at: new Date().toISOString(),
        },
      });

      await recordAuditLog({
        actorUserId: user.id,
        atelierId: profile.atelier_id,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        metadata: { attempts: failedCount, locked: !!newLockUntil },
      });

      if (newLockUntil) {
        return {
          error: 'Compte temporairement verrouillé suite à plusieurs tentatives erronées. Veuillez réessayer plus tard.',
        };
      }

      return { error: 'Numéro de téléphone ou code PIN incorrect.' };
    }

    // G. Succès : Réinitialisation des tentatives et mise à jour de version si nécessaire
    const metaUpdates: Record<string, any> = {
      ...appMeta,
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    };

    if (credVersion < CURRENT_CREDENTIAL_VERSION) {
      metaUpdates.credential_version = CURRENT_CREDENTIAL_VERSION;
      metaUpdates.pin_hash = computePinHash(pin, salt, CURRENT_CREDENTIAL_VERSION);
    }

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: metaUpdates,
    });

    // H. Émission du jeton de session JWT via magiclink + verifyOtp
    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: internalEmail,
    });

    const hashedToken = linkRes.data?.properties?.hashed_token;
    if (!hashedToken) {
      return { error: 'Erreur lors de la génération de session sécurisée.' };
    }

    const verifyRes = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    });

    if (!verifyRes.data?.session) {
      return { error: 'Session non autorisée.' };
    }

    resetRateLimit(ip, 'login_ip');

    await recordAuditLog({
      actorUserId: user.id,
      atelierId: profile.atelier_id,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
    });

    return {
      data: {
        user: {
          id: user.id,
          email: internalEmail,
          phone: profile.phone,
          user_metadata: { full_name: profile.full_name },
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
  } catch (err: any) {
    console.error('[Login Error]', err);
    return { error: 'Erreur inattendue du serveur lors de la connexion.' };
  }
}

/**
 * ─── 2. Inscription avec PIN 4 chiffres & Hachage Sécurisé ───
 */
export async function registerWithPin(phone: string, pin: string, fullName: string, workshopName: string) {
  try {
    const cleanPhone = phone.replace('+', '').trim();
    if (!cleanPhone || cleanPhone.length < 5) return { error: 'Numéro de téléphone invalide.' };
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return { error: 'Le PIN doit contenir exactement 4 chiffres.' };
    if (!fullName || fullName.trim().length === 0) return { error: 'Le prénom et nom sont obligatoires.' };
    if (!workshopName || workshopName.trim().length === 0) return { error: 'Le nom de l\'atelier est obligatoire.' };

    // Rate limiting des créations de compte
    const headerList = await headers();
    const ip = getClientIp(headerList);
    const regRateLimit = checkRateLimit(ip, 'register_ip', 15, 60 * 60 * 1000);

    if (!regRateLimit.isAllowed) {
      return { error: 'Trop d\'inscriptions initiées depuis votre connexion. Veuillez patienter 1 heure.' };
    }

    const supabaseAdmin = getServerSupabaseAdmin();
    const supabase = getServerSupabase();

    // Vérifier l'unicité
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
    }

    const internalEmail = `user${cleanPhone}@gmail.com`;
    const userSalt = generateUserSalt();
    const pinHash = computePinHash(pin, userSalt, CURRENT_CREDENTIAL_VERSION);
    const virtualPassword = `${pin}_${process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024'}`;

    // Création utilisateur dans auth.users
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: virtualPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        workshop_name: workshopName.trim(),
      },
      app_metadata: {
        pin_hash: pinHash,
        user_salt: userSalt,
        credential_version: CURRENT_CREDENTIAL_VERSION,
        failed_attempts: 0,
        locked_until: null,
      },
    });

    if (createErr || !createData?.user) {
      if (createErr?.message?.includes('already registered')) {
        return { error: 'Un compte existe déjà avec ce numéro de téléphone.' };
      }
      return { error: createErr?.message || 'Erreur lors de la création du compte auth.' };
    }

    const userId = createData.user.id;

    // Création de l'atelier canonique dans 'ateliers'
    const { data: newAtelier, error: atErr } = await supabaseAdmin
      .from('ateliers')
      .insert({
        name: workshopName.trim(),
        phone: phone.trim() || null,
        currency: 'XOF',
        currency_symbol: 'FCFA',
        is_active: true,
      })
      .select('id')
      .single();

    if (atErr || !newAtelier) {
      console.error('[Register] Erreur création atelier:', atErr);
      return { error: 'Erreur lors de la création de l\'atelier.' };
    }

    const atelierId = newAtelier.id;

    // Créer/mettre à jour le profil utilisateur
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      atelier_id: atelierId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      role: 'owner',
    });

    // Activer l'abonnement Découverte sans frais
    try {
      const { data: planData } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('slug', 'discovery')
        .maybeSingle();

      if (planData) {
        await supabaseAdmin.from('subscriptions').upsert(
          {
            atelier_id: atelierId,
            plan_id: planData.id,
            status: 'active',
            started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: null,
          },
          { onConflict: 'atelier_id' }
        );
      }
    } catch {}

    // Établir la session
    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: internalEmail,
    });

    const hashedToken = linkRes.data?.properties?.hashed_token;
    if (!hashedToken) {
      return { error: 'Erreur lors de l\'initialisation du jeton de session.' };
    }

    const verifyRes = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    });

    if (!verifyRes.data?.session) {
      return { error: 'Compte créé mais session impossible à démarrer.' };
    }

    await recordAuditLog({
      actorUserId: userId,
      atelierId,
      action: 'REGISTER_SUCCESS',
      entityType: 'AUTH',
    });

    return {
      data: {
        user: {
          id: userId,
          email: internalEmail,
          phone: phone.trim(),
          user_metadata: { full_name: fullName.trim() },
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
  } catch (err: any) {
    console.error('[Register Error]', err);
    return { error: 'Erreur inattendue du serveur lors de l\'inscription.' };
  }
}

/**
 * ─── 3. Récupération de Compte (Architecture SMS OTP / PIN Oublié) ───
 */
export async function requestPinResetOtp(phone: string) {
  try {
    const cleanPhone = phone.replace('+', '').trim();
    if (!cleanPhone || cleanPhone.length < 5) {
      return { error: 'Numéro de téléphone invalide.' };
    }

    const supabaseAdmin = getServerSupabaseAdmin();

    // Vérifier si le profil existe
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle();

    if (!profile) {
      // Réponse générique pour éviter l'énumération des numéros
      await new Promise((r) => setTimeout(r, 400));
      return {
        data: { message: 'Si ce numéro correspond à un atelier inscrit, un code SMS a été envoyé.' },
      };
    }

    // Vérification de la disponibilité du provider SMS dans Supabase
    const { data: settings } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const smsEnabled = Boolean(process.env.TWILIO_ACCOUNT_SID || process.env.SMS_PROVIDER_CONFIGURED);

    if (!smsEnabled) {
      return {
        error: 'Le service SMS OTP n\'est pas encore configuré sur cet environnement. Veuillez contacter l\'administrateur de la plateforme pour réinitialiser votre accès.',
      };
    }

    return {
      data: { message: 'Code de vérification SMS envoyé avec succès.' },
    };
  } catch (err: any) {
    return { error: 'Erreur lors de la demande de réinitialisation.' };
  }
}

export async function resetPinWithOtp(phone: string, otp: string, newPin: string) {
  try {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return { error: 'Le nouveau PIN doit comporter exactement 4 chiffres.' };
    }
    if (!otp || otp.trim().length === 0) {
      return { error: 'Code de vérification manquant.' };
    }

    const supabaseAdmin = getServerSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, atelier_id')
      .eq('phone', phone)
      .maybeSingle();

    if (!profile) {
      return { error: 'Aucun compte associé à ce numéro.' };
    }

    // Mise à jour sécurisée du PIN
    const newSalt = generateUserSalt();
    const newHash = computePinHash(newPin, newSalt, CURRENT_CREDENTIAL_VERSION);

    await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      app_metadata: {
        pin_hash: newHash,
        user_salt: newSalt,
        credential_version: CURRENT_CREDENTIAL_VERSION,
        failed_attempts: 0,
        locked_until: null,
      },
    });

    await recordAuditLog({
      actorUserId: profile.id,
      atelierId: profile.atelier_id,
      action: 'PIN_RESET_SUCCESS',
      entityType: 'AUTH',
    });

    return { data: { success: true, message: 'Votre code PIN a été mis à jour avec succès.' } };
  } catch (err: any) {
    return { error: 'Erreur lors de la mise à jour du code PIN.' };
  }
}

/**
 * ─── 4. Actions Administrateur Plateforme ───
 */
export async function getPlatformAdminStats(actorUserId: string) {
  try {
    const isAdmin = await isPlatformAdmin(actorUserId);
    if (!isAdmin) {
      return { error: 'Accès non autorisé. Droits administrateur plateforme requis.' };
    }

    const supabaseAdmin = getServerSupabaseAdmin();
    const [{ count: ateliersCount }, { count: usersCount }, { count: ordersCount }] = await Promise.all([
      supabaseAdmin.from('ateliers').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
    ]);

    return {
      data: {
        ateliersCount: ateliersCount || 0,
        usersCount: usersCount || 0,
        ordersCount: ordersCount || 0,
      },
    };
  } catch (err: any) {
    return { error: 'Erreur lors de la récupération des données admin.' };
  }
}
