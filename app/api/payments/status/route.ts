import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // On utilise la clé de service uniquement si nécessaire, ou on laisse RLS gérer 
    // vu que l'utilisateur authentifié a le droit de SELECT sur les paiements de son workshop.
    const { data: payment, error } = await supabase
      .from('subscription_payments')
      .select('status, amount, currency, created_at, paid_at')
      .eq('reference', reference)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      reference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paid_at: payment.paid_at
    });

  } catch (error) {
    console.error('Status fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
