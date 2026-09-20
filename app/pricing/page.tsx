import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import PricingClient from './pricing-client';
import type { Plan } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Tarifs AtelierPro — Gérez votre atelier de couture',
  description: 'Choisissez le plan AtelierPro adapté à votre atelier. Paiement Wave ou Orange Money. Sans engagement.',
};

async function getPlans(): Promise<Plan[]> {
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

    if (error || !data) return [];
    return data as Plan[];
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const plans = await getPlans();
  return <PricingClient plans={plans} />;
}
