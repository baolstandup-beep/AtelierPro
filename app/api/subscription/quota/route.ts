/**
 * GET /api/subscription/quota
 * Retourne le quota et l'état de la formule de l'atelier connecté.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAtelierClientQuota } from '@/lib/billing/subscription-service';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
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
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const admin = getAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('atelier_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.atelier_id) {
      return NextResponse.json({
        planSlug: 'discovery',
        clientCount: 0,
        clientLimit: 5,
        canCreate: true,
        isNearLimit: false,
        isLimitReached: false,
      });
    }

    const quota = await getAtelierClientQuota(profile.atelier_id);
    return NextResponse.json(quota);
  } catch (err: any) {
    return NextResponse.json({
      planSlug: 'discovery',
      clientCount: 0,
      clientLimit: 5,
      canCreate: true,
      isNearLimit: false,
      isLimitReached: false,
    });
  }
}
