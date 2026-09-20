/**
 * GET /api/subscription/plans
 * Endpoint public pour récupérer les plans actifs.
 * Retourne les plans depuis la base de données ou les plans canoniques sécurisés en fallback.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCanonicalPlansList } from '@/lib/billing/plan-guard';

export async function GET() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await sb
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ plans: data });
    }

    // Fallback canonique garanti (Discovery, Starter, Pro)
    return NextResponse.json({ plans: getCanonicalPlansList() });
  } catch (err) {
    return NextResponse.json({ plans: getCanonicalPlansList() });
  }
}
