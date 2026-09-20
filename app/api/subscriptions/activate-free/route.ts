/**
 * POST /api/subscriptions/activate-free
 * Activation atomique, sécurisée et idempotente du plan Découverte (0 FCFA).
 * NE PASSE JAMAIS PAR WAVE OU ORANGE MONEY.
 * 
 * Diagnostic complet en 7 étapes :
 * STEP 1 — AUTH USER
 * STEP 2 — PROFILE
 * STEP 3 — ATELIER
 * STEP 4 — DISCOVERY PLAN
 * STEP 5 — EXISTING SUBSCRIPTION
 * STEP 6 — CREATE/ACTIVATE SUBSCRIPTION
 * STEP 7 — FINAL VERIFICATION
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { computePinHash, generateUserSalt, CURRENT_CREDENTIAL_VERSION } from '@/lib/crypto-pin';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL non configuré côté serveur.');
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

export async function POST(req: NextRequest) {
  const sbAdmin = getAdminClient();
  const sbAnon = getAnonClient();

  try {
    const body = await req.json().catch(() => ({}));
    const {
      firstName,
      lastName,
      phone,
      workshopName,
      pin,
      planId,
      slug,
    } = body;

    console.log('[FREE ACTIVATION] Requested at', new Date().toISOString(), {
      hasPhone: !!phone,
      hasPlanId: !!planId,
      slug,
    });

    // ─── STEP 1 — AUTH USER ──────────────────────────────────────────────────
    let userId: string | null = null;
    let userPhone: string = '';
    let userFullName: string = '';
    let sessionData: any = null;

    // A. Tenter d'abord de lire la session active via Cookies (@supabase/ssr)
    try {
      const cookieStore = await cookies();
      const ssrClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {}
            },
          },
        }
      );

      const { data: { user: cookieUser } } = await ssrClient.auth.getUser();
      if (cookieUser) {
        userId = cookieUser.id;
        userPhone = cookieUser.phone || cookieUser.user_metadata?.phone || '';
        userFullName = cookieUser.user_metadata?.full_name || '';
      }
    } catch (cookieErr: any) {
      console.warn('[FREE ACTIVATION] Cookie auth check skipped:', cookieErr?.message);
    }

    // B. Si non trouvé via cookies, tenter via header Authorization: Bearer
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const { data: tokenUser, error: tokenErr } = await sbAdmin.auth.getUser(token);
        if (!tokenErr && tokenUser?.user) {
          userId = tokenUser.user.id;
          userPhone = tokenUser.user.phone || tokenUser.user.user_metadata?.phone || '';
          userFullName = tokenUser.user.user_metadata?.full_name || '';
        }
      }
    }

    // C. Si toujours non authentifié, vérifier si c'est une inscription complète
    if (!userId) {
      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const rawPhone = String(phone || '').replace(/\s+/g, '');

      if (!cleanFirstName || !cleanLastName || !rawPhone || rawPhone.length < 9) {
        console.error({
          step: 'STEP 1 — AUTH USER',
          code: 'FREE_ACTIVATION_AUTH_REQUIRED',
          message: 'Utilisateur non authentifié et données d’inscription incomplètes.',
        });
        return NextResponse.json(
          {
            error: 'Veuillez vous connecter ou renseigner vos coordonnées complètes.',
            code: 'FREE_ACTIVATION_AUTH_REQUIRED',
          },
          { status: 401 }
        );
      }

      const normalizedPhone = rawPhone.startsWith('+')
        ? rawPhone
        : (rawPhone.startsWith('221') ? `+${rawPhone}` : `+221${rawPhone}`);
      const cleanDigits = normalizedPhone.replace('+', '').trim();
      const internalEmail = `user${cleanDigits}@atelierpro.app`;
      const wName = (workshopName || `Atelier ${cleanFirstName}`).trim();

      // Vérifier si un profil existe déjà avec ce téléphone
      const { data: existingProf, error: profLookupErr } = await sbAdmin
        .from('profiles')
        .select('id, atelier_id, full_name, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (profLookupErr) {
        console.error({
          step: 'STEP 1 — AUTH USER',
          code: profLookupErr.code,
          message: profLookupErr.message,
          details: profLookupErr.details,
          hint: profLookupErr.hint,
        });
      }

      if (existingProf) {
        userId = existingProf.id;
        userPhone = existingProf.phone || normalizedPhone;
        userFullName = existingProf.full_name || `${cleanFirstName} ${cleanLastName}`;
      } else {
        // Définir le PIN (4 chiffres)
        let effectivePin = String(pin || '').trim();
        if (!effectivePin || !/^\d{4}$/.test(effectivePin)) {
          effectivePin = cleanDigits.slice(-4);
          if (!/^\d{4}$/.test(effectivePin)) effectivePin = '0000';
        }

        const userSalt = generateUserSalt();
        const pinHash = computePinHash(effectivePin, userSalt, CURRENT_CREDENTIAL_VERSION);
        const virtualPassword = `${effectivePin}_${process.env.PIN_SECRET || 'AtelierPro_Secure_Salt_2024'}`;

        const { data: newUser, error: createAuthErr } = await sbAdmin.auth.admin.createUser({
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

        if (createAuthErr || !newUser?.user) {
          // Si l'utilisateur auth existe déjà
          const { data: listData } = await sbAdmin.auth.admin.listUsers();
          const found = listData?.users?.find((u) => u.email === internalEmail);
          if (found) {
            userId = found.id;
          } else {
            console.error({
              step: 'STEP 1 — AUTH USER',
              code: createAuthErr?.code || 'AUTH_CREATE_FAILED',
              message: createAuthErr?.message || 'Échec création auth.users',
            });
            return NextResponse.json(
              { error: 'Erreur lors de la création du compte.', code: 'AUTH_USER_CREATION_FAILED' },
              { status: 500 }
            );
          }
        } else {
          userId = newUser.user.id;
        }

        userPhone = normalizedPhone;
        userFullName = `${cleanFirstName} ${cleanLastName}`;
      }

      // Générer une session JWT pour connecter l'utilisateur immédiatement
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
      } catch (sessErr: any) {
        console.warn('[FREE ACTIVATION] Session token generation warning:', sessErr?.message);
      }
    }

    if (!userId) {
      console.error({
        step: 'STEP 1 — AUTH USER',
        code: 'FREE_ACTIVATION_AUTH_REQUIRED',
        message: 'Impossible de valider ou créer l’utilisateur auth.',
      });
      return NextResponse.json(
        { error: 'Authentification requise pour activer l’atelier.', code: 'FREE_ACTIVATION_AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    console.log('[FREE ACTIVATION] STEP 1 AUTH USER PASS', { userId });

    // ─── STEP 2 — PROFILE ────────────────────────────────────────────────────
    let { data: profile, error: profErr } = await sbAdmin
      .from('profiles')
      .select('id, atelier_id, full_name, phone, role')
      .eq('id', userId)
      .maybeSingle();

    if (profErr) {
      console.error({
        step: 'STEP 2 — PROFILE',
        code: profErr.code,
        message: profErr.message,
        details: profErr.details,
        hint: profErr.hint,
      });
    }

    console.log('[FREE ACTIVATION] STEP 2 PROFILE PASS', {
      profileExists: !!profile,
      hasAtelierId: !!profile?.atelier_id,
    });

    // ─── STEP 3 — ATELIER ────────────────────────────────────────────────────
    let atelierId: string | null = profile?.atelier_id || null;

    // Si le profil a un atelier_id, vérifier qu'il existe réellement dans la table ateliers
    if (atelierId) {
      const { data: existingAtelier } = await sbAdmin
        .from('ateliers')
        .select('id, name')
        .eq('id', atelierId)
        .maybeSingle();

      if (!existingAtelier) {
        console.warn('[FREE ACTIVATION] atelier_id dans profil orphelin, recréation requise.');
        atelierId = null;
      } else {
        console.log('[FREE ACTIVATION] STEP 3 ATELIER REUSED', { atelierId, name: existingAtelier.name });
      }
    }

    // Si aucun atelier existant, le créer proprement
    // Colonnes réelles vérifiées : id, name, created_at, phone, address, currency
    if (!atelierId) {
      const wName = (workshopName || `Atelier ${userFullName || 'Couture'}`).trim();
      const { data: newAtelier, error: createAtelierErr } = await sbAdmin
        .from('ateliers')
        .insert({
          name: wName,
          phone: userPhone || null,
          currency: 'XOF',
        })
        .select('id, name')
        .single();

      if (createAtelierErr || !newAtelier) {
        console.error({
          step: 'STEP 3 — ATELIER',
          code: createAtelierErr?.code || 'ATELIER_CREATION_FAILED',
          message: createAtelierErr?.message || 'Erreur insertion table ateliers',
          details: createAtelierErr?.details,
          hint: createAtelierErr?.hint,
        });

        return NextResponse.json(
          { error: 'Impossible de créer votre atelier. Veuillez réessayer.', code: 'ATELIER_CREATION_FAILED' },
          { status: 500 }
        );
      }

      atelierId = newAtelier.id;

      // Mettre à jour le profil avec cet atelier_id
      const { error: upsertProfErr } = await sbAdmin.from('profiles').upsert({
        id: userId,
        atelier_id: atelierId,
        full_name: userFullName || 'Tailleur',
        phone: userPhone || null,
        role: 'owner',
      });

      if (upsertProfErr) {
        console.error({
          step: 'STEP 3 — ATELIER (profile link)',
          code: upsertProfErr.code,
          message: upsertProfErr.message,
          details: upsertProfErr.details,
          hint: upsertProfErr.hint,
        });
      }

      console.log('[FREE ACTIVATION] STEP 3 ATELIER CREATED', { atelierId });
    }

    console.log('[FREE ACTIVATION] STEP 3 ATELIER PASS', { atelierId });

    // ─── STEP 4 — DISCOVERY PLAN ─────────────────────────────────────────────
    // Récupération stricte par slug 'discovery'
    const { data: discoveryPlan, error: planErr } = await sbAdmin
      .from('plans')
      .select('id, slug, name, price, currency, max_clients, is_active')
      .eq('slug', 'discovery')
      .maybeSingle();

    if (planErr || !discoveryPlan) {
      console.error({
        step: 'STEP 4 — DISCOVERY PLAN',
        code: planErr?.code || 'DISCOVERY_PLAN_NOT_FOUND',
        message: planErr?.message || 'Plan Découverte introuvable dans la table plans',
        details: planErr?.details,
        hint: planErr?.hint,
      });

      return NextResponse.json(
        { error: 'Le plan Découverte est introuvable.', code: 'DISCOVERY_PLAN_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Protection anti-fraude absolue : prix DOIT être 0
    if (Number(discoveryPlan.price) !== 0) {
      console.error({
        step: 'STEP 4 — DISCOVERY PLAN',
        code: 'PLAN_NOT_FREE',
        message: 'Le plan Découverte en DB a un prix non nul !',
        details: { price: discoveryPlan.price },
      });
      return NextResponse.json(
        { error: 'Ce plan n’est pas gratuit.', code: 'PLAN_NOT_FREE' },
        { status: 403 }
      );
    }

    console.log('[FREE ACTIVATION] STEP 4 DISCOVERY PLAN PASS', {
      planId: discoveryPlan.id,
      slug: discoveryPlan.slug,
      price: discoveryPlan.price,
    });

    // ─── STEP 5 — EXISTING SUBSCRIPTION (IDEMPOTENCE) ────────────────────────
    const { data: existingSub, error: subCheckErr } = await sbAdmin
      .from('subscriptions')
      .select('id, plan_id, status, current_period_end')
      .eq('atelier_id', atelierId)
      .maybeSingle();

    if (subCheckErr) {
      console.error({
        step: 'STEP 5 — EXISTING SUBSCRIPTION',
        code: subCheckErr.code,
        message: subCheckErr.message,
        details: subCheckErr.details,
        hint: subCheckErr.hint,
      });
    }

    if (existingSub && existingSub.status === 'active' && existingSub.plan_id === discoveryPlan.id) {
      console.log('[FREE ACTIVATION] STEP 5 EXISTING SUBSCRIPTION ALREADY ACTIVE', {
        subscriptionId: existingSub.id,
      });

      return NextResponse.json({
        success: true,
        code: 'FREE_PLAN_ALREADY_ACTIVE',
        message: 'Votre atelier possède déjà le plan Découverte actif.',
        redirect: '/dashboard',
        plan: {
          slug: 'discovery',
          name: discoveryPlan.name,
          price: 0,
          currency: 'XOF',
          client_limit: 5,
        },
        session: sessionData,
        atelier_id: atelierId,
      });
    }

    console.log('[FREE ACTIVATION] STEP 5 EXISTING SUBSCRIPTION PASS');

    // ─── STEP 6 — CREATE / ACTIVATE SUBSCRIPTION ─────────────────────────────
    // Appel de la RPC atomique activate_discovery_subscription
    const { data: rpcData, error: rpcErr } = await sbAdmin.rpc('activate_discovery_subscription', {
      p_atelier_id: atelierId,
    });

    if (rpcErr) {
      console.error({
        step: 'STEP 6 — CREATE/ACTIVATE SUBSCRIPTION (RPC)',
        code: rpcErr.code,
        message: rpcErr.message,
        details: rpcErr.details,
        hint: rpcErr.hint,
      });

      // Fallback direct en cas d'indisponibilité RPC
      const nowIso = new Date().toISOString();
      const { error: upsertSubErr } = await sbAdmin.from('subscriptions').upsert(
        {
          atelier_id: atelierId,
          plan_id: discoveryPlan.id,
          status: 'active',
          started_at: nowIso,
          current_period_start: nowIso,
          current_period_end: null,
          created_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'atelier_id' }
      );

      if (upsertSubErr) {
        console.error({
          step: 'STEP 6 — CREATE/ACTIVATE SUBSCRIPTION (Fallback)',
          code: upsertSubErr.code,
          message: upsertSubErr.message,
          details: upsertSubErr.details,
          hint: upsertSubErr.hint,
        });

        return NextResponse.json(
          {
            error: 'Erreur lors de l’activation de l’abonnement Découverte.',
            code: 'SUBSCRIPTION_CREATION_FAILED',
          },
          { status: 500 }
        );
      }
    } else {
      console.log('[FREE ACTIVATION] STEP 6 RPC SUCCESS', rpcData);
    }

    console.log('[FREE ACTIVATION] STEP 6 CREATE/ACTIVATE SUBSCRIPTION PASS');

    // ─── STEP 7 — FINAL VERIFICATION ─────────────────────────────────────────
    const { data: verifiedSub, error: verifyErr } = await sbAdmin
      .from('subscriptions')
      .select('id, status, plan_id, atelier_id')
      .eq('atelier_id', atelierId)
      .eq('status', 'active')
      .maybeSingle();

    if (verifyErr || !verifiedSub) {
      console.error({
        step: 'STEP 7 — FINAL VERIFICATION',
        code: verifyErr?.code || 'SUBSCRIPTION_NOT_VERIFIED',
        message: verifyErr?.message || 'Abonnement non trouvé comme actif après insertion.',
        details: verifyErr?.details,
        hint: verifyErr?.hint,
      });

      return NextResponse.json(
        {
          error: 'Échec de la vérification finale de l’abonnement.',
          code: 'SUBSCRIPTION_CREATION_FAILED',
        },
        { status: 500 }
      );
    }

    console.log('[FREE ACTIVATION] STEP 7 FINAL VERIFICATION PASS', {
      subscriptionId: verifiedSub.id,
      atelierId,
      status: verifiedSub.status,
    });

    return NextResponse.json({
      success: true,
      message: 'Votre atelier est activé !',
      redirect: '/dashboard',
      plan: {
        slug: 'discovery',
        name: discoveryPlan.name,
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
    console.error({
      step: 'GLOBAL UNCAUGHT ERROR',
      code: err?.code || 'INTERNAL_ERROR',
      message: err?.message || 'Erreur inattendue.',
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        error: 'Erreur interne lors de l’activation gratuite.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
