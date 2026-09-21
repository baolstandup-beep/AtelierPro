'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Loader2, Scissors, ShieldCheck, Sparkles, Star, Zap } from 'lucide-react';
import type { Plan, SaaSProvider } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type PlanSlug = 'discovery' | 'starter' | 'pro';
const ORDER: PlanSlug[] = ['discovery', 'starter', 'pro'];
const COPY: Record<PlanSlug, { description: string; features: string[] }> = {
  discovery: { description: 'Pour découvrir AtelierPro et démarrer la gestion de votre atelier sans frais.', features: ['Jusqu’à 5 clients enregistrés', 'Carnet de mesures de base', 'Gestion basique des commandes', 'Suivi de production basique', 'Dashboard essentiel'] },
  starter: { description: 'Idéal pour structurer et développer un atelier actif.', features: ['Clients illimités', 'Mesures illimitées', 'Commandes illimitées', 'Tableau Kanban de production', 'Paiements Wave & Orange Money', 'Factures et reçus PDF', 'Rappels et reçus WhatsApp', 'Dashboard complet'] },
  pro: { description: 'Pour les ateliers et maisons de couture en pleine expansion.', features: ['Tout le plan Starter', 'Rapports financiers avancés', 'Export Excel comptable', 'Gestion d’équipe et tailleurs', 'Catalogue de modèles', 'Statistiques avancées', 'Support prioritaire'] },
};
const slugOf = (plan: Plan): PlanSlug => ORDER.includes(plan.slug as PlanSlug) ? plan.slug as PlanSlug : 'discovery';

export default function AbonnementPage() {
  return <Suspense fallback={<Loader />}><AbonnementContent /></Suspense>;
}

function Loader() {
  return <div className="flex min-h-screen items-center justify-center bg-[#08100D] text-[#35B88A]"><Loader2 className="h-7 w-7 animate-spin" aria-label="Chargement" /></div>;
}

function AbonnementContent() {
  const router = useRouter();
  const paymentStatus = useSearchParams().get('payment');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState('discovery');
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [provider, setProvider] = useState<SaaSProvider>('WAVE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(paymentStatus === 'error' ? 'Le paiement a été interrompu ou n’a pas pu être validé. Vous pouvez réessayer.' : null);
  const [success, setSuccess] = useState<string | null>(paymentStatus === 'success' ? 'Votre paiement a été reçu et votre abonnement est actif.' : null);

  useEffect(() => {
    async function load() {
      try {
        const [plansRes, subRes] = await Promise.all([fetch('/api/subscription/plans'), fetch('/api/subscription/renew')]);
        if (plansRes.ok) {
          const data = await plansRes.json();
          setPlans(((data.plans || []) as Plan[]).sort((a, b) => ORDER.indexOf(slugOf(a)) - ORDER.indexOf(slugOf(b))));
        }
        if (subRes.ok) {
          const data = await subRes.json();
          if (data.subscription) {
            setCurrent((data.subscription.plan?.slug || 'discovery').toLowerCase());
            setExpired(Boolean(data.level === 'READ_ONLY' || data.subscription.status === 'expired' || (data.subscription.current_period_end && new Date(data.subscription.current_period_end) < new Date())));
          }
        }
      } catch (cause) {
        console.error('[Abonnement load error]', cause);
        setError('Impossible de charger les formules. Veuillez réessayer.');
      } finally { setLoading(false); }
    }
    load();
  }, [paymentStatus]);

  async function choose(plan: Plan) {
    setError(null); setSuccess(null);
    const slug = slugOf(plan);
    if (slug === 'discovery' && slug === current && !expired) return;
    if (slug === 'discovery' || Number(plan.price) === 0) {
      if (!confirm('Voulez-vous passer à la formule Découverte ? Vos données existantes seront conservées, mais vous serez limité à 5 clients.')) return;
      setSubmitting(true);
      try {
        const res = await fetch('/api/subscription/renew', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan.id || 'discovery', provider: 'WAVE' }) });
        const data = await res.json();
        if (res.ok && data.success) {
          setCurrent('discovery'); setExpired(false); setSuccess('Votre atelier est maintenant sur la formule Découverte.');
          setTimeout(() => router.push('/dashboard'), 1500);
        } else setError(data.error || 'Erreur lors du changement de formule.');
      } catch { setError('Erreur réseau. Veuillez réessayer.'); }
      finally { setSubmitting(false); }
      return;
    }
    setSelected(plan);
  }

  async function confirmPayment() {
    if (!selected) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/subscription/renew', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: selected.id, provider }) });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Impossible d’initialiser le paiement.'); setSubmitting(false); return; }
      if (data.checkout_url) window.location.href = data.checkout_url;
      else { setError('Lien de paiement non reçu du fournisseur.'); setSubmitting(false); }
    } catch { setError('Erreur réseau lors de la communication avec le serveur de paiement.'); setSubmitting(false); }
  }

  function label(plan: Plan) {
    const slug = slugOf(plan);
    const name = slug === 'discovery' ? 'Découverte' : slug === 'starter' ? 'Starter' : 'Pro';
    if (slug === current && !expired) return slug === 'discovery' ? 'Formule actuelle' : `Renouveler ${name}`;
    if (slug === current && expired) return `Renouveler ${name}`;
    return `Passer à ${name}`;
  }

  return <div className="min-h-screen bg-[#08100D] pb-20 font-sans text-[#F5F7F6] antialiased selection:bg-[#35B88A] selection:text-[#08100D]">
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#08100D]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#98A69F] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A]"><ArrowLeft className="h-4 w-4" aria-hidden /> Tableau de bord</Link>
        <Link href="/dashboard" className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#103E30]"><Scissors className="h-4 w-4 text-[#E28732]" aria-hidden /></span><span className="text-base font-bold">Atelier<span className="text-[#E28732]">Pro</span></span></Link>
        <div className="w-[116px]" aria-hidden />
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#35B88A]">Abonnement AtelierPro</p>
        <h1 className="text-balance text-3xl font-bold tracking-[-0.035em] text-white sm:text-5xl">Choisissez la formule adaptée à votre atelier</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#B3BEB8] sm:text-lg">Commencez gratuitement et évoluez lorsque votre activité grandit.</p>
        <p className="mt-2 text-sm text-[#74827B]">Vous pouvez changer de formule ou renouveler votre abonnement à tout moment.</p>
      </section>
      <div className="mx-auto mt-9 max-w-5xl space-y-3" aria-live="polite">
        {success && <Status tone="success">{success}</Status>}
        {error && <Status tone="error">{error}</Status>}
        {expired && <Status tone="warning">Votre abonnement a expiré. Votre compte et vos données restent conservés pendant le renouvellement.</Status>}
      </div>
      {loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#35B88A]" aria-label="Chargement des formules" /></div> :
        <section className="mt-12 grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Formules d’abonnement">
          {plans.map(plan => <PricingCard key={plan.id || slugOf(plan)} plan={plan} slug={slugOf(plan)} current={slugOf(plan) === current && !expired} submitting={submitting} label={label(plan)} onSelect={() => choose(plan)} />)}
        </section>}
      <section className="mt-10 grid gap-4 rounded-2xl border border-white/[0.08] bg-[#101915] p-5 sm:grid-cols-[auto_1fr] sm:p-6" aria-labelledby="trust-title">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#35B88A]/10 text-[#49C99A]"><ShieldCheck className="h-5 w-5" aria-hidden /></div>
        <div><h2 id="trust-title" className="font-semibold text-white">Paiements sécurisés</h2><p className="mt-1 text-sm leading-6 text-[#A5B1AA]">Les paiements sont confirmés côté serveur via Wave ou Orange Money.</p><p className="mt-1 text-sm text-[#74827B]">Vos données restent conservées lors d’un renouvellement ou changement de formule.</p></div>
      </section>
      <FAQ />
    </main>
    {selected && <PaymentModal plan={selected} provider={provider} submitting={submitting} renewal={slugOf(selected) === current} onProvider={setProvider} onClose={() => !submitting && setSelected(null)} onConfirm={confirmPayment} />}
  </div>;
}

function Status({ tone, children }: { tone: 'success' | 'error' | 'warning'; children: React.ReactNode }) {
  const style = tone === 'success' ? 'border-[#35B88A]/30 bg-[#35B88A]/10 text-[#BDEBD9]' : tone === 'error' ? 'border-red-400/30 bg-red-400/10 text-red-100' : 'border-[#E28732]/30 bg-[#E28732]/10 text-amber-100';
  const Icon = tone === 'success' ? ShieldCheck : AlertTriangle;
  return <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${style}`}><Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><p>{children}</p></div>;
}

function PricingCard({ plan, slug, current, submitting, label, onSelect }: { plan: Plan; slug: PlanSlug; current: boolean; submitting: boolean; label: string; onSelect: () => void }) {
  const recommended = slug === 'starter';
  const Icon = slug === 'pro' ? Zap : slug === 'starter' ? Sparkles : Scissors;
  const disabled = current && slug === 'discovery';
  return <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`relative flex min-h-[560px] flex-col rounded-[22px] border p-7 shadow-[0_18px_60px_rgba(0,0,0,0.12)] transition duration-200 motion-safe:hover:-translate-y-0.5 sm:p-8 ${current ? 'border-[#35B88A]/65 bg-[#111C17]' : recommended ? 'border-[#E28732]/40 bg-[linear-gradient(180deg,rgba(226,135,50,0.06),transparent_28%),#101915]' : 'border-white/[0.09] bg-[#101915] hover:border-white/[0.16]'}`}>
    <div className="mb-6 flex min-h-7 items-center justify-between gap-3">{current ? <Badge icon={Check}>Formule actuelle</Badge> : recommended ? <Badge icon={Star} orange>Recommandé</Badge> : <span />}<span className={`flex h-10 w-10 items-center justify-center rounded-xl ${slug === 'pro' ? 'bg-[#E28732]/10 text-[#EAA259]' : 'bg-[#35B88A]/10 text-[#49C99A]'}`}><Icon className="h-[18px] w-[18px]" aria-hidden /></span></div>
    <h2 className="text-2xl font-semibold tracking-tight text-white">{plan.name}</h2><p className="mt-2 min-h-[48px] text-sm leading-6 text-[#98A69F]">{COPY[slug].description}</p>
    <div className="mt-7"><div className="flex flex-wrap items-end gap-x-2 gap-y-1"><span className="whitespace-nowrap text-[36px] font-bold leading-none tracking-[-0.04em] text-white sm:text-[42px]">{formatCurrency(Number(plan.price))}</span><span className="pb-1 text-sm font-medium text-[#98A69F]">{slug === 'discovery' ? 'Gratuit à vie' : '/ mois'}</span></div>{slug === 'discovery' && <div className="mt-4 inline-flex rounded-lg border border-[#35B88A]/15 bg-[#35B88A]/[0.07] px-3 py-2 text-xs font-medium text-[#A9DCC9]">Jusqu’à 5 clients inclus</div>}</div>
    <div className="my-7 h-px bg-white/[0.08]" />
    <ul className="space-y-3.5">{COPY[slug].features.map(feature => <li key={feature} className="flex items-start gap-3 text-sm leading-5 text-[#C4CCC7]"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#35B88A]/10 text-[#49C99A]"><Check className="h-3 w-3" aria-hidden /></span>{feature}</li>)}</ul>
    <div className="mt-auto pt-8"><button type="button" disabled={disabled || submitting} onClick={onSelect} className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ED9B1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101915] disabled:cursor-not-allowed ${disabled ? 'border border-white/[0.08] bg-white/[0.06] text-[#89958E]' : slug === 'pro' ? 'bg-[#D97821] text-white hover:bg-[#E28732] disabled:opacity-60' : 'bg-[#259C74] text-white hover:bg-[#2EAE81] disabled:opacity-60'}`}>{submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Traitement...</> : label}</button></div>
  </motion.article>;
}

function Badge({ children, icon: Icon, orange = false }: { children: React.ReactNode; icon: typeof Check; orange?: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${orange ? 'border-[#E28732]/30 bg-[#E28732]/10 text-[#F0AF72]' : 'border-[#35B88A]/25 bg-[#35B88A]/10 text-[#85DBBC]'}`}><Icon className="h-3 w-3" aria-hidden />{children}</span>;
}

function FAQ() {
  const items = [['Puis-je changer de formule plus tard ?', 'Oui. Vous pouvez sélectionner une autre formule depuis cette page. Le changement est appliqué à votre abonnement existant.'], ['Que se passe-t-il lorsque mon abonnement expire ?', 'L’accès peut devenir limité jusqu’au renouvellement. La page vous permet alors de renouveler votre formule actuelle.'], ['Mes données sont-elles conservées ?', 'Oui. Vos clients, mesures et commandes restent rattachés à votre atelier lors d’un renouvellement ou d’un changement de formule.']];
  return <section className="mx-auto mt-14 max-w-3xl" aria-labelledby="faq-title"><div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#35B88A]">Questions fréquentes</p><h2 id="faq-title" className="mt-2 text-2xl font-semibold text-white">Avant de choisir votre formule</h2></div><div className="mt-7 divide-y divide-white/[0.08] border-y border-white/[0.08]">{items.map(([q, a]) => <details key={q} className="group py-1"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-[#E8ECEA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A]"><span>{q}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#74827B] transition-transform duration-200 group-open:rotate-180" aria-hidden /></summary><p className="max-w-2xl pb-5 pr-10 text-sm leading-6 text-[#98A69F]">{a}</p></details>)}</div></section>;
}

function PaymentModal({ plan, provider, submitting, renewal, onProvider, onClose, onConfirm }: { plan: Plan; provider: SaaSProvider; submitting: boolean; renewal: boolean; onProvider: (provider: SaaSProvider) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-title" onMouseDown={e => e.target === e.currentTarget && onClose()}><motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-[22px] border border-white/[0.1] bg-[#101915] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#35B88A]">{renewal ? 'Renouvellement' : 'Changement de formule'}</p><h2 id="payment-title" className="mt-2 text-xl font-semibold text-white">{renewal ? 'Renouveler' : 'Passer à'} {plan.name}</h2><p className="mt-1 text-sm text-[#98A69F]">{formatCurrency(Number(plan.price))} / mois</p></div><button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-[#98A69F] hover:bg-white/[0.1] hover:text-white">×</button></div><fieldset className="mt-7 space-y-3"><legend className="mb-3 text-sm font-medium text-white">Mode de paiement</legend><Provider label="Wave Sénégal" hint="Paiement instantané" value="WAVE" selected={provider === 'WAVE'} onSelect={onProvider} /><Provider label="Orange Money" hint="Validation par téléphone" value="ORANGE_MONEY" selected={provider === 'ORANGE_MONEY'} onSelect={onProvider} /></fieldset><div className="mt-7 flex gap-3"><button type="button" onClick={onClose} disabled={submitting} className="h-12 flex-1 rounded-xl border border-white/[0.1] text-sm font-semibold text-[#C4CCC7] hover:bg-white/[0.05] disabled:opacity-50">Annuler</button><button type="button" onClick={onConfirm} disabled={submitting} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#259C74] text-sm font-semibold text-white hover:bg-[#2EAE81] disabled:opacity-60">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Traitement...</> : `Payer ${formatCurrency(Number(plan.price))}`}</button></div></motion.div></div>;
}

function Provider({ label, hint, value, selected, onSelect }: { label: string; hint: string; value: SaaSProvider; selected: boolean; onSelect: (value: SaaSProvider) => void }) {
  return <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${selected ? 'border-[#35B88A]/60 bg-[#35B88A]/10' : 'border-white/[0.08] hover:border-white/[0.16]'}`}><span><span className="block text-sm font-semibold text-white">{label}</span><span className="mt-0.5 block text-xs text-[#98A69F]">{hint}</span></span><input type="radio" name="provider" value={value} checked={selected} onChange={() => onSelect(value)} className="h-4 w-4 accent-[#35B88A]" /></label>;
}
