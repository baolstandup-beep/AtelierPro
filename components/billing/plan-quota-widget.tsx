'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, AlertTriangle, CheckCircle2, RefreshCw, Calendar, Zap, Star } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PlanQuotaWidgetProps {
  currentCount?: number;
  className?: string;
  onUpgradeClick?: () => void;
}

export function PlanQuotaWidget({ currentCount, className = '', onUpgradeClick }: PlanQuotaWidgetProps) {
  const [data, setData] = useState<{
    planSlug: string;
    planName?: string;
    clientCount: number;
    clientLimit: number | null;
    isLimitReached: boolean;
    isNearLimit: boolean;
    status?: string;
    currentPeriodEnd?: string | null;
    isExpired?: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchSubscriptionState() {
      try {
        // 1. Quotas
        const qRes = await fetch('/api/subscription/quota');
        const qData = qRes.ok ? await qRes.json() : null;

        // 2. Subscription status & dates
        const sRes = await fetch('/api/subscription/renew');
        const sData = sRes.ok ? await sRes.json() : null;

        const sub = sData?.subscription;
        const slug = (sub?.plan?.slug || qData?.planSlug || 'discovery').toLowerCase();
        const planName = sub?.plan?.name || (slug === 'pro' ? 'Pro' : slug === 'starter' ? 'Starter' : 'Découverte');
        const isExp =
          sData?.level === 'READ_ONLY' ||
          sub?.status === 'expired' ||
          (sub?.current_period_end && new Date(sub.current_period_end) < new Date());

        setData({
          planSlug: slug,
          planName,
          clientCount: currentCount ?? qData?.clientCount ?? 0,
          clientLimit: qData?.clientLimit ?? (slug === 'discovery' ? 5 : null),
          isLimitReached: qData?.isLimitReached ?? false,
          isNearLimit: qData?.isNearLimit ?? false,
          status: sub?.status || 'active',
          currentPeriodEnd: sub?.current_period_end || null,
          isExpired: Boolean(isExp),
        });
      } catch {
        setData({
          planSlug: 'discovery',
          planName: 'Découverte',
          clientCount: currentCount ?? 0,
          clientLimit: 5,
          isLimitReached: false,
          isNearLimit: false,
          status: 'active',
          currentPeriodEnd: null,
          isExpired: false,
        });
      }
    }

    fetchSubscriptionState();
  }, [currentCount]);

  if (!data) return null;

  const { planSlug, planName, clientCount, clientLimit, isExpired, currentPeriodEnd } = data;
  const count = currentCount ?? clientCount;
  const limit = clientLimit ?? 5;
  const isReached = count >= limit;

  // ══════════════════════════════════════════════════════════════
  // ÉTAT 3 : ABONNEMENT EXPIRÉ
  // ══════════════════════════════════════════════════════════════
  if (isExpired && planSlug !== 'discovery') {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-left shadow-sm ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white flex items-center gap-1 shadow-sm">
                <AlertTriangle className="w-3 h-3" />
                <span>ABONNEMENT EXPIRÉ</span>
              </span>
            </div>
            <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
              Votre abonnement a expiré.
            </p>
            <p className="text-xs text-amber-900 dark:text-amber-300">
              Votre compte et vos données sont conservés.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/abonnement"
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réactiver mon abonnement</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ÉTAT 2 : FORMULE PAYANTE ACTIVE (STARTER ou PRO)
  // ══════════════════════════════════════════════════════════════
  if (planSlug === 'starter' || planSlug === 'pro') {
    const formattedDate = currentPeriodEnd ? formatDate(currentPeriodEnd) : 'En cours';
    const isPro = planSlug === 'pro';

    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121A16] border border-[#E7E2D8] dark:border-white/10 text-left shadow-sm ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                isPro
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-200'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-[#0F3B32] dark:text-[#2E9D74] border border-emerald-200'
              }`}>
                {isPro ? <Zap className="w-3 h-3 text-amber-600" /> : <Star className="w-3 h-3 text-[#2E9D74]" />}
                <span>FORMULE {isPro ? 'PRO' : 'STARTER'}</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Actif
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Actif jusqu&apos;au :</span>
              <span className="text-sm font-bold text-[#111827] dark:text-white font-mono">
                {formattedDate}
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Clients illimités • Fonctionnalités {isPro ? 'complètes' : 'avancées'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/abonnement"
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all"
            >
              <span>Changer de formule</span>
            </Link>
            <Link
              href="/abonnement"
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Renouveler</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ÉTAT 1 : FORMULE DÉCOUVERTE (0 FCFA)
  // ══════════════════════════════════════════════════════════════
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all text-left ${
        isReached
          ? 'bg-amber-50/90 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
          : 'bg-white dark:bg-[#121A16] border-[#E7E2D8] dark:border-white/10'
      } shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>FORMULE DÉCOUVERTE</span>
            </span>
            {isReached && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Limite atteinte
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-xs text-slate-600 dark:text-slate-400">Clients enregistrés :</span>
            <span className="text-sm font-black text-[#111827] dark:text-white font-mono">
              {count} / {limit}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isReached
              ? 'Vous avez atteint la limite de 5 clients de la formule Découverte.'
              : 'Plan Découverte — Gratuit à vie'}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Link
            href="/abonnement"
            onClick={onUpgradeClick}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all ${
              isReached
                ? 'bg-gradient-to-r from-[#D97706] to-amber-700 hover:from-amber-700 hover:to-[#D97706] text-white'
                : 'bg-[#0F3B32] hover:bg-[#185c4e] text-white'
            }`}
          >
            <span>Voir les formules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
