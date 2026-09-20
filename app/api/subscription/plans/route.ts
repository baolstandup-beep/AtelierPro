/**
 * GET /api/subscription/plans
 * Endpoint public pour récupérer les plans actifs (utilisé par /signup et /pricing).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    if (error) {
      return NextResponse.json({ plans: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: data || [] });
  } catch (err) {
    return NextResponse.json({ plans: [], error: 'Internal error' }, { status: 500 });
  }
}
