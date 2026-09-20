/**
 * POST /api/subscriptions/activate-free
 * Activation directe et sécurisée du plan Découverte (0 FCFA).
 * NE PASSER JAMAIS PAR WAVE OU ORANGE MONEY.
 * 
 * Accessible aux utilisateurs connectés ou aux nouveaux inscrits.
 * Valide strictement côté serveur que le plan est gratuit (slug 'discovery' ou 'decouverte', prix = 0).
 * Refuse toute tentative d'activation gratuite des plans Starter ou Pro (403 PLAN_NOT_FREE).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { computePinHash, generateUserSalt, CURRENT_CREDENTIAL_VERSION } from '@/lib/crypto-pin';
import { getPlanDefinition, CANONICAL_PLANS } from '@/lib/billing/plan-guard';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin non configuré.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
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
    const body = await request.json().catch(() => ({}));
    const {
      firstName,
      lastName,
      phone,
      workshopName,
      pin,
      planId,
      slug,
    } = body;

    console.log('[FREE PLAN] activation requested', {
      phone,
      planId,
      slug,
      timestamp: new Date().toISOString(),
    });

    const sbAdmin = getAdminClient();
    const sbAnon = getAnonClient();

    // ─── 1. Vérifier le Plan Côté Serveur (Protection Anti-Fraude) ──────────────
    let planData: any = null;

    if (planId) {
      const { data, error } = await sbAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      if (!error && data) {
        planData = data;
      }
    }

    if (!planData && (slug || planId)) {
      const targetSlug = slug || (planId === 'plan-discovery' ? 'discovery' : planId);
      const { data, error } = await sbAdmin
        .from('plans')
        .select('*')
        .or(`slug.eq.${targetSlug},slug.eq.discovery,slug.eq.decouverte`)
        .maybeSingle();

      if (!error && data) {
        planData = data;
      }
    }

    // Fallback canonique si la table plans n'est pas encore migrée
    if (!planData) {
      if (slug === 'starter' || planId === 'plan-starter' || slug === 'pro' || planId === 'plan-pro') {
        const canonical = getPlanDefinition(slug);
        if (canonical) planData = canonical;
      } else {
        planData = getPlanDefinition('discovery');
      }
    }

    const planSlug = String(planData?.slug || slug || '').toLowerCase();
    const planPrice = Number(planData?.price ?? (planSlug === 'discovery' || planSlug === 'decouverte' ? 0 : 999999));

    // ─── 2. Sécurité : Vérifier que c'est UNIQUEMENT le plan Découverte gratuit ──
    const isActuallyFree =
      (planSlug === 'discovery' || planSlug === 'decouverte') &&
      planPrice === 0;

    if (!isActuallyFree) {
      console.error('[FREE PLAN ACTIVATION FAILED]', {
        code: 'PLAN_NOT_FREE',
        message: 'Tentative d’activation gratuite d’un plan payant.',
        details: { planSlug, planPrice, planId, requestedSlug: slug },
      });

      return NextResponse.json(
        {
          error: 'Ce plan n\'est pas gratuit. Le paiement Wave ou Orange Money est obligatoire.',
          code: 'PLAN_NOT_FREE',
        },
        { status: 403 }
      );
    }

    console.log('[FREE PLAN] plan verified', { slug: planSlug, price: planPrice });

    // ─── 3. Vérifier l'Utilisateur Connecté ou Créer le Compte ───────────────────
    let userId: string | null = null;
    let atelierId: string | null = null;
    let userPhone: string = '';
    let userFullName: string = '';
    let sessionData: any = null;

    // A. Vérifier si un token JWT est transmis dans Authorization header ou Cookie
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const { data: userData, error: userErr } = await sbAdmin.auth.getUser(token);
      if (!userErr && userData?.user) {
        userId = userData.user.id;
        userPhone = userData.user.phone || (userData.user.user_metadata?.phone ?? '');
        userFullName = userData.user.user_metadata?.full_name || '';

        // Identifier l'atelier rattaché
        const { data: profile } = await sbAdmin
          .from('profiles')
          .select('atelier_id, full_name, phone')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.atelier_id) {
          atelierId = profile.atelier_id;
          userPhone = profile.phone || userPhone;
          userFullName = profile.full_name || userFullName;
        }
      }
    }

    // B. Si l'utilisateur n'est pas encore connecté, traiter l'inscription
    if (!userId) {
      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const rawPhone = String(phone || '').replace(/\s+/g, '');
      const rawWorkshop = String(workshopName || '').trim();

      if (!cleanFirstName || !cleanLastName) {
        return NextResponse.json(
          { error: 'Prénom et nom requis.', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      if (!rawPhone || rawPhone.length < 9) {
        return NextResponse.json(
          { error: 'Numéro de téléphone invalide.', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      const normalizedPhone = rawPhone.startsWith('+') ? rawPhone : (rawPhone.startsWith('221') ? `+${rawPhone}` : `+221${rawPhone}`);
      const cleanPhoneDigits = normalizedPhone.replace('+', '').trim();
      const internalEmail = `user${cleanPhoneDigits}@atelierpro.app`;
      const wName = rawWorkshop || `Atelier ${cleanFirstName}`;

      // Vérifier si un profil existe déjà
      const { data: existingProfile } = await sbAdmin
        .from('profiles')
        .select('id, atelier_id, full_name, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
        atelierId = existingProfile.atelier_id;
        userPhone = existingProfile.phone || normalizedPhone;
        userFullName = existingProfile.full_name || `${cleanFirstName} ${cleanLastName}`;
      } else {
        // Définition du code PIN (4 chiffres)
        let effectivePin = String(pin || '').trim();
        if (!effectivePin || !/^\d{4}$/.test(effectivePin)) {
          // Si non fourni, utiliser les 4 derniers chiffres du numéro ou 0000
          effectivePin = cleanPhoneDigits.slice(-4);
          if (!/^\d{4}$/.test(effectivePin)) effectivePin = '0000';
        }

        const userSalt = generateUserSalt();
        const pinHash = computePinHash(effectivePin, userSalt, CURRENT_CREDENTIAL_VERSION);
        const virtualPassword = `${effectivePin}_${process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024'}`;

        // 1. Créer dans auth.users
        const { data: newUser, error: createErr } = await sbAdmin.auth.admin.createUser({
          email: internalEmail,
          password: virtualPassword,
          email_confirm: true,
          user_metadata: {
            full_name: `${cleanFirstName} ${cleanLastName}`,
            phone: normalizedPhone,
            workshop_name: wName,
          },
          app_metadata: {
            pin_hash: pinHash,
            user_salt: userSalt,
            credential_version: CURRENT_CREDENTIAL_VERSION,
            failed_attempts: 0,
            locked_until: null,
          },
        });

        if (createErr || !newUser?.user) {
          // Si l'utilisateur auth existe déjà mais pas le profil
          const { data: listData } = await sbAdmin.auth.admin.listUsers();
          const found = listData?.users?.find((u) => u.email === internalEmail);
          if (found) {
            userId = found.id;
          } else {
            console.error('[FREE PLAN ACTIVATION FAILED]', {
              code: 'AUTH_USER_CREATION_FAILED',
              message: createErr?.message,
            });
            return NextResponse.json(
              { error: 'Erreur lors de la création du compte.', code: 'AUTH_ERROR' },
              { status: 500 }
            );
          }
        } else {
          userId = newUser.user.id;
        }

        // 2. Créer l'atelier dans la table canonique 'ateliers'
        const { data: newAtelier, error: atelierErr } = await sbAdmin
          .from('ateliers')
          .insert({
            name: wName,
            phone: normalizedPhone,
            currency: 'XOF',
            currency_symbol: 'FCFA',
            is_active: true,
          })
          .select('id')
          .single();

        if (atelierErr || !newAtelier) {
          console.error('[FREE PLAN] Erreur création atelier, utilisation du fallback:', atelierErr);
          atelierId = userId; // fallback sécurisé si table non migrée
        } else {
          atelierId = newAtelier.id;
        }

        // 3. Créer ou mettre à jour le profil utilisateur
        await sbAdmin.from('profiles').upsert({
          id: userId,
          atelier_id: atelierId,
          full_name: `${cleanFirstName} ${cleanLastName}`,
          phone: normalizedPhone,
          role: 'owner',
        });

        userPhone = normalizedPhone;
        userFullName = `${cleanFirstName} ${cleanLastName}`;
      }

      // 4. Émettre une session JWT pour connecter l'utilisateur directement
      try {
        const linkRes = await sbAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: internalEmail,
        });
        const hashedToken = linkRes.data?.properties?.hashed_token;
        if (hashedToken) {
          const verifyRes = await sbAnon.auth.verifyOtp({
            token_hash: hashedToken,
            type: 'magiclink',
          });
          if (verifyRes.data?.session) {
            sessionData = {
              access_token: verifyRes.data.session.access_token,
              refresh_token: verifyRes.data.session.refresh_token,
              expires_at: verifyRes.data.session.expires_at,
            };
          }
        }
      } catch (sessErr) {
        console.warn('[FREE PLAN] Warning session generation:', sessErr);
      }
    }

    if (!userId) {
      console.error('[FREE PLAN ACTIVATION FAILED]', {
        code: 'USER_NOT_IDENTIFIED',
        message: 'Impossible d\'identifier ou de créer l\'utilisateur.',
      });
      return NextResponse.json(
        { error: 'Utilisateur introuvable.', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    console.log('[FREE PLAN] user verified', userId);

    if (!atelierId) {
      atelierId = userId;
    }

    console.log('[FREE PLAN] atelier verified', atelierId);

    // ─── 4. Créer ou Activer l'Abonnement Découverte dans Supabase ──────────────
    // Structure requise :
    // - atelier_id
    // - plan_id
    // - status = 'active'
    // - starts_at = now()
    // - current_period_start = now()
    // - current_period_end = null
    // - amount = 0
    // - payment_provider = null
    // - payment_reference = null
    const nowIso = new Date().toISOString();
    const effectivePlanId = planData?.id || 'plan-discovery';

    try {
      await sbAdmin.from('subscriptions').upsert(
        {
          atelier_id: atelierId,
          plan_id: effectivePlanId,
          status: 'active',
          started_at: nowIso,
          current_period_start: nowIso,
          current_period_end: null,
          created_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'atelier_id' }
      );
    } catch (subErr) {
      console.warn('[FREE PLAN] Subscriptions table note:', subErr);
    }

    console.log('[FREE PLAN] subscription activated', {
      atelierId,
      planId: effectivePlanId,
      slug: 'discovery',
      amount: 0,
      status: 'active',
    });

    console.log('[FREE PLAN] redirect dashboard');

    return NextResponse.json({
      success: true,
      message: 'Abonnement Découverte activé avec succès.',
      redirect: '/dashboard',
      plan: {
        slug: 'discovery',
        name: 'Découverte',
        price: 0,
        currency: 'XOF',
        client_limit: 5,
      },
      session: sessionData,
      user: {
        id: userId,
        phone: userPhone,
        full_name: userFullName,
      },
      atelier_id: atelierId,
    });
  } catch (err: any) {
    console.error('[FREE PLAN ACTIVATION FAILED]', {
      code: 'INTERNAL_ERROR',
      message: err?.message || 'Erreur inattendue.',
      details: err,
    });

    return NextResponse.json(
      { error: 'Erreur interne lors de l\'activation gratuite.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
