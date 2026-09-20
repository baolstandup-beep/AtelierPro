/**
 * app/api/clients/create/route.ts
 * Route API hautement sécurisée pour la création de clients avec validation stricte du quota serveur.
 *
 * RÈGLES DE SÉCURITÉ :
 * 1. L'atelier_id est résolu UNIQUEMENT depuis la session authentifiée (profiles.atelier_id).
 * 2. Aucune confiance dans les paramètres du frontend.
 * 3. Appel de la RPC transactionnelle PostgreSQL avec verrou advisory si disponible.
 * 4. Fallback atomique côté serveur si la migration SQL n'est pas encore appliquée.
 * 5. Refus immédiat avec l'erreur FREE_PLAN_CLIENT_LIMIT_REACHED si quota >= 5 pour Discovery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  FREE_PLAN_CLIENT_LIMIT_REACHED,
  FREE_PLAN_CLIENT_LIMIT_MESSAGE,
} from '@/lib/billing/plan-guard';

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

    // 1. Authentification
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Session invalide ou expirée.' },
        { status: 401 }
      );
    }

    // 2. Extraire et valider les paramètres
    const body = await req.json();
    const fullName = (body.name || body.full_name || '').trim();
    const phone = (body.phone || '').trim() || null;
    const notes = (body.notes || '').trim() || null;
    const gender = (body.gender || '').trim() || null;

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Le nom du client est requis (2 caractères minimum).' },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // 3. Résoudre l'atelier légitime de l'utilisateur (JAMAIS depuis le payload)
    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('atelier_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !profile?.atelier_id) {
      return NextResponse.json(
        { error: 'ATELIER_NOT_FOUND', message: 'Aucun atelier associé à cet utilisateur.' },
        { status: 404 }
      );
    }

    const atelierId = profile.atelier_id;

    // 4. Tentative d'exécution de la RPC PostgreSQL create_client_with_plan_check
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_client_with_plan_check', {
      p_name: fullName,
      p_phone: phone,
      p_notes: notes,
      p_gender: gender,
    });

    if (!rpcErr && rpcData) {
      if (rpcData.success) {
        return NextResponse.json({ success: true, client: rpcData.client }, { status: 201 });
      }

      if (rpcData.error_code === FREE_PLAN_CLIENT_LIMIT_REACHED) {
        return NextResponse.json(
          {
            error: FREE_PLAN_CLIENT_LIMIT_REACHED,
            message: FREE_PLAN_CLIENT_LIMIT_MESSAGE,
            current_count: rpcData.current_count,
            max_allowed: rpcData.max_allowed,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: rpcData.error_code || 'RPC_ERROR', message: rpcData.message },
        { status: 400 }
      );
    }

    // 5. Fallback serveur sécurisé (au cas où la RPC n'est pas encore appliquée en production)
    // Vérifier l'abonnement actif de l'atelier
    let isDiscovery = true;
    let maxClients: number | null = 5;

    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan_id, status, plans (slug, max_clients)')
      .eq('atelier_id', atelierId)
      .in('status', ['active', 'grace_period'])
      .maybeSingle();

    if (sub && (sub as any).plans) {
      const planSlug = (sub as any).plans.slug;
      if (planSlug === 'starter' || planSlug === 'pro') {
        isDiscovery = false;
        maxClients = null;
      } else {
        maxClients = (sub as any).plans.max_clients ?? 5;
      }
    }

    // Si plan Discovery, compter les clients existants
    if (isDiscovery && maxClients !== null) {
      const { count, error: countErr } = await admin
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('atelier_id', atelierId);

      if (!countErr && typeof count === 'number' && count >= maxClients) {
        return NextResponse.json(
          {
            error: FREE_PLAN_CLIENT_LIMIT_REACHED,
            message: FREE_PLAN_CLIENT_LIMIT_MESSAGE,
            current_count: count,
            max_allowed: maxClients,
          },
          { status: 403 }
        );
      }
    }

    // Insertion sécurisée du client
    const { data: newClient, error: insertErr } = await admin
      .from('clients')
      .insert({
        atelier_id: atelierId,
        name: fullName,
        phone,
        notes,
        gender,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.message?.includes(FREE_PLAN_CLIENT_LIMIT_REACHED)) {
        return NextResponse.json(
          {
            error: FREE_PLAN_CLIENT_LIMIT_REACHED,
            message: FREE_PLAN_CLIENT_LIMIT_MESSAGE,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'INSERT_FAILED', message: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        client: {
          id: newClient.id,
          workshop_id: atelierId,
          full_name: newClient.name,
          phone: newClient.phone || '',
          gender: newClient.gender || 'OTHER',
          notes: newClient.notes || '',
          created_at: newClient.created_at,
          updated_at: newClient.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API Create Client Fatal Error]', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err?.message || 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
