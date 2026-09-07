'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { PageHeader, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Zap,
  ExternalLink,
} from 'lucide-react';
import type { SubscriptionPlanId } from '@/lib/types';

export default function BillingSettingsPage() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  const canceledParam = searchParams.get('canceled');

  const { currentWorkshop } = useAppStore();
  const { success, error: showError } = useToast();

  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<SubscriptionPlanId>('STARTER'); // Default demo active plan

  async function handleSubscribe(planId: SubscriptionPlanId) {
    if (planId === 'FREE') return;

    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          planId,
          workshopId: currentWorkshop?.id || 'demo-workshop',
          customerEmail: 'contact@atelierpro.app',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur Checkout');

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showError('Erreur Stripe', err?.message || 'Impossible d\'initialiser Stripe Checkout.');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <Link href="/settings">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Retour aux paramètres
        </Button>
      </Link>

      <PageHeader
        title="Abonnement & Facturation"
        subtitle="Gérez votre forfait AtelierPro et vos paiements sécurisés via Stripe."
      />

      {/* Success / Canceled Banners */}
      {successParam && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-900 text-sm">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Abonnement activé avec succès !</p>
            <p className="text-xs text-green-700">Votre atelier bénéficie désormais de toutes les fonctionnalités du plan choisi.</p>
          </div>
        </div>
      )}

      {canceledParam && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-sm">
          <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="font-medium">Le paiement Stripe a été annulé. Vous pouvez réessayer quand vous le souhaitez.</p>
        </div>
      )}

      {/* ─── Current Plan Card ─── */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-700">Plan actuel de l'atelier</span>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-gray-900">Atelier Pro (Actif)</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">
                9 900 FCFA / mois
              </span>
            </div>
            <p className="text-xs text-gray-500">Prochain renouvellement automatique via carte bancaire.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              Portail Facturation Stripe
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── Plans Comparison Grid ─── */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-gray-900">Changer de forfait</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                  plan.isPopular
                    ? 'bg-gradient-to-b from-green-50/50 to-white border-green-500 shadow-md relative'
                    : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-green-800 text-white shadow">
                    Le plus populaire
                  </span>
                )}

                <div>
                  <div className="mb-3">
                    <h4 className="text-base font-bold text-gray-900">{plan.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{plan.description}</p>
                  </div>

                  <div className="my-4 pb-4 border-b border-gray-100">
                    <span className="text-2xl font-extrabold text-gray-900 font-mono">
                      {plan.priceXOF > 0 ? `${plan.priceXOF.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                    </span>
                    {plan.priceXOF > 0 && <span className="text-xs text-gray-500 font-normal"> / mois</span>}
                    {plan.priceEUR > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">soit {plan.priceEUR} € / mois</p>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-gray-600 mb-6">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-700 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Forfait actuel
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.isPopular ? 'primary' : 'outline'}
                      loading={loadingPlan === plan.id}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {plan.priceXOF === 0 ? 'Choisir Découverte' : 'Souscrire avec Stripe'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stripe Security info */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-700" />
          <span>Paiements par carte bancaire chiffrés et sécurisés par <strong>Stripe</strong>. Aucun numéro de carte n'est stocké sur nos serveurs.</span>
        </div>
        <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );
}
