/**
 * POST /api/subscription/complete
 * Finalise la création du compte après paiement confirmé.
 * Vérifie que pending_signup.status = 'paid' avant de créer auth.users.
 *
 * SÉCURITÉ : Le serveur est la seule autorité. Le frontend ne peut pas
 * activer un abonnement ou créer un compte sans paiement réel.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  computePinHash,
  generateUserSalt,
  CURRENT_CREDENTIAL_VERSION,
} from '@/lib/crypto-pin';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pendingSignupId, pin, confirmPin } = body;

    // ─── Validation basique ──────────────────────────────────────────────────
    if (!pendingSignupId) {
      return NextResponse.json(
        { error: 'Identifiant de pré-inscription manquant.', code: 'MISSING_SIGNUP_ID' },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Le code PIN doit contenir exactement 4 chiffres.', code: 'INVALID_PIN' },
        { status: 400 }
      );
    }

    if (pin !== confirmPin) {
      return NextResponse.json(
        { error: 'Les codes PIN ne correspondent pas.', code: 'PIN_MISMATCH' },
        { status: 400 }
      );
    }

    const sb = getAdminClient();
    const anonSb = getAnonClient();

    // ─── Récupérer la pré-inscription (vérification serveur obligatoire) ─────
    const { data: signup, error: signupErr } = await sb
      .from('pending_signups')
      .select('*, plan:plans(*)')
      .eq('id', pendingSignupId)
      .maybeSingle();

    if (signupErr || !signup) {
      return NextResponse.json(
        { error: 'Pré-inscription introuvable.', code: 'SIGNUP_NOT_FOUND' },
        { status: 404 }
      );
    }

    // ─── Vérifications de sécurité strictes ────────────────────────────────

    // 1. Le paiement doit être confirmé côté serveur
    if (signup.status !== 'paid') {
      console.warn(`[COMPLETE_SIGNUP] Tentative sans paiement: status=${signup.status}, id=${pendingSignupId}`);
      return NextResponse.json(
        {
          error: 'Vous devez d\'abord activer un abonnement AtelierPro.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 403 }
      );
    }

    // 2. Vérifier que la pré-inscription n'est pas expirée
    if (new Date(signup.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Cette pré-inscription a expiré.', code: 'SIGNUP_EXPIRED' },
        { status: 410 }
      );
    }

    // 3. Idempotence : déjà complété ?
    if (signup.completed_at) {
      return NextResponse.json(
        { error: 'Ce compte a déjà été créé.', code: 'ALREADY_COMPLETED' },
        { status: 409 }
      );
    }

    // ─── Vérifier unicité du téléphone ──────────────────────────────────────
    const { data: existingProfile } = await sb
      .from('profiles')
      .select('id')
      .eq('phone', signup.phone)
      .maybeSingle();

    if (existingProfile) {
      // Compte déjà créé — idempotence
      return NextResponse.json(
        {
          error: 'Un compte existe déjà avec ce numéro de téléphone.',
          code: 'PHONE_ALREADY_EXISTS',
        },
        { status: 409 }
      );
    }

    // ─── Créer l'utilisateur dans auth.users ─────────────────────────────────
    const cleanPhone = signup.phone.replace('+', '').trim();
    const internalEmail = `user${cleanPhone}@atelierpro.app`;

    const userSalt = generateUserSalt();
    const pinHash = computePinHash(pin, userSalt, CURRENT_CREDENTIAL_VERSION);
    const virtualPassword = `${pin}_${process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024'}`;

    const { data: createData, error: createErr } = await sb.auth.admin.createUser({
      email: internalEmail,
      password: virtualPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `${signup.first_name} ${signup.last_name}`,
        phone: signup.phone,
        workshop_name: signup.workshop_name,
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
      console.error('[CREATE_USER_ERROR]', createErr);
      // NE PAS ANNULER LE PAIEMENT — l'utilisateur pourra réessayer
      return NextResponse.json(
        {
          error: 'Erreur lors de la création du compte. Votre paiement est conservé. Réessayez.',
          code: 'AUTH_CREATE_ERROR',
          canRetry: true,
        },
        { status: 500 }
      );
    }

    const userId = createData.user.id;

    // ─── Créer l'atelier (table ateliers) ────────────────────────────────────
    const { data: newAtelier, error: atelierErr } = await sb
      .from('ateliers')
      .insert({
        name: signup.workshop_name,
        phone: signup.phone,
        currency: 'XOF',
        currency_symbol: 'FCFA',
        is_active: true,
      })
      .select('id')
      .single();

    if (atelierErr || !newAtelier) {
      console.error('[CREATE_ATELIER_ERROR]', atelierErr);
      // Nettoyer l'utilisateur créé pour permettre un retry
      await sb.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json(
        {
          error: 'Erreur lors de la création de l\'atelier. Réessayez.',
          code: 'ATELIER_CREATE_ERROR',
          canRetry: true,
        },
        { status: 500 }
      );
    }

    const atelierId = newAtelier.id;

    // ─── Créer le profil utilisateur ─────────────────────────────────────────
    await sb.from('profiles').upsert({
      id: userId,
      atelier_id: atelierId,
      full_name: `${signup.first_name} ${signup.last_name}`,
      phone: signup.phone,
      role: 'owner',
    });

    // ─── Finaliser : créer abonnement + marquer pré-inscription complétée ────
    const { data: rpcResult, error: rpcErr } = await sb.rpc('complete_pending_signup', {
      p_pending_signup_id: pendingSignupId,
      p_auth_user_id: userId,
      p_atelier_id: atelierId,
    });

    if (rpcErr) {
      console.error('[COMPLETE_SIGNUP_RPC_ERROR]', rpcErr);
      // L'abonnement n'a pas pu être créé mais le compte oui
      // On retourne quand même succès — l'abonnement peut être récupéré
    }

    const rpcData = rpcResult as { success?: boolean; subscription_id?: string } | null;
    console.info(`[SUBSCRIPTION_CREATED] User ${userId}, Atelier ${atelierId}, Sub ${rpcData?.subscription_id}`);

    // ─── Créer la session JWT ────────────────────────────────────────────────
    const linkRes = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email: internalEmail,
    });

    const hashedToken = linkRes.data?.properties?.hashed_token;
    if (!hashedToken) {
      return NextResponse.json(
        { error: 'Compte créé mais impossible de démarrer la session. Connectez-vous.', code: 'SESSION_ERROR' },
        { status: 500 }
      );
    }

    const verifyRes = await anonSb.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    });

    if (!verifyRes.data?.session) {
      return NextResponse.json(
        { error: 'Compte créé. Connectez-vous avec votre téléphone et PIN.', code: 'SESSION_NOT_STARTED' },
        { status: 200 }
      );
    }

    console.info(`[REGISTER_COMPLETE] User ${userId} connecté après paiement`);

    return NextResponse.json({
      success: true,
      session: {
        access_token: verifyRes.data.session.access_token,
        refresh_token: verifyRes.data.session.refresh_token,
        expires_at: verifyRes.data.session.expires_at,
      },
      user: {
        id: userId,
        phone: signup.phone,
        full_name: `${signup.first_name} ${signup.last_name}`,
      },
      atelier_id: atelierId,
    });
  } catch (err) {
    console.error('[COMPLETE_SIGNUP_FATAL]', err);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscription/complete?pid=...
 * Vérifie l'état d'une pré-inscription (pour afficher la page de finalisation).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pid = searchParams.get('pid');
  const ref = searchParams.get('ref');

  if (!pid && !ref) {
    return NextResponse.json({ error: 'Paramètre manquant.' }, { status: 400 });
  }

  const sb = getAdminClient();

  let query = sb
    .from('pending_signups')
    .select('id, status, first_name, last_name, phone, plan_id, expires_at, paid_at, completed_at');

  if (pid) {
    query = query.eq('id', pid);
  } else if (ref) {
    query = query.eq('payment_reference', ref);
  }

  const { data: signup, error } = await query.maybeSingle();

  if (error || !signup) {
    return NextResponse.json({ error: 'Pré-inscription introuvable.' }, { status: 404 });
  }

  return NextResponse.json({
    id: signup.id,
    status: signup.status,
    first_name: signup.first_name,
    phone: signup.phone,
    expires_at: signup.expires_at,
    is_paid: signup.status === 'paid',
    is_completed: !!signup.completed_at,
  });
}
