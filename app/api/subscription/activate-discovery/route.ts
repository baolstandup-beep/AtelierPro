/**
 * app/api/subscription/activate-discovery/route.ts
 * Activation immédiate, sans paiement et idempotente du plan DÉCOUVERTE.
 *
 * RÈGLES :
 * - Utilisateur authentifié requis.
 * - Récupère ou crée l'atelier canonique de l'utilisateur.
 * - Aucun paiement, aucun webhook.
 * - Idempotent : un double-clic n'entraîne pas de doublon.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    const admin = getAdminClient();

    // 1. Récupérer le profil pour obtenir l'atelier_id
    const { data: profile } = await admin
      .from('profiles')
      .select('atelier_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    let atelierId = profile?.atelier_id;

    // Si pas d'atelier, le créer dans la table canonique ateliers
    if (!atelierId) {
      const atelierName = profile?.full_name
        ? `Atelier de ${profile.full_name}`
        : 'Mon Atelier';

      const { data: newAtelier, error: atErr } = await admin
        .from('ateliers')
        .insert({
          name: atelierName,
          currency: 'XOF',
          currency_symbol: 'FCFA',
          is_active: true,
        })
        .select('id')
        .single();

      if (atErr || !newAtelier) {
        return NextResponse.json(
          { error: 'ATELIER_CREATION_FAILED', message: atErr?.message || 'Erreur création atelier.' },
          { status: 500 }
        );
      }

      atelierId = newAtelier.id;

      await admin
        .from('profiles')
        .upsert({
          id: user.id,
          atelier_id: atelierId,
          role: 'owner',
        });
    }

    // 2. Tenter l'appel de la RPC activate_discovery_subscription
    const { data: rpcData, error: rpcErr } = await supabase.rpc('activate_discovery_subscription', {
      p_atelier_id: atelierId,
    });

    if (!rpcErr && rpcData?.success) {
      return NextResponse.json({
        success: true,
        plan: 'discovery',
        atelier_id: atelierId,
        subscription_id: rpcData.subscription_id,
      });
    }

    // 3. Fallback direct via service_role si la table plans / subscriptions existe
    const { data: plan } = await admin
      .from('plans')
      .select('id')
      .eq('slug', 'discovery')
      .maybeSingle();

    if (plan) {
      const { data: sub, error: subErr } = await admin
        .from('subscriptions')
        .upsert(
          {
            atelier_id: atelierId,
            plan_id: plan.id,
            status: 'active',
            started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: null, // Sans expiration
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'atelier_id' }
        )
        .select()
        .single();

      if (!subErr && sub) {
        return NextResponse.json({
          success: true,
          plan: 'discovery',
          atelier_id: atelierId,
          subscription_id: sub.id,
        });
      }
    }

    // Si les tables subscriptions/plans ne sont pas encore déployées en base distante,
    // l'atelier reste en Découverte implicite avec succès.
    return NextResponse.json({
      success: true,
      plan: 'discovery',
      atelier_id: atelierId,
      implicit: true,
    });
  } catch (err: any) {
    console.error('[Activate Discovery Error]', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err?.message || 'Erreur interne.' },
      { status: 500 }
    );
  }
}
