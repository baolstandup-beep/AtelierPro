'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';

interface PlanQuotaWidgetProps {
  currentCount?: number;
  className?: string;
  onUpgradeClick?: () => void;
}

export function PlanQuotaWidget({ currentCount, className = '', onUpgradeClick }: PlanQuotaWidgetProps) {
  const [quota, setQuota] = useState<{
    planSlug: string;
    clientCount: number;
    clientLimit: number | null;
    isLimitReached: boolean;
    isNearLimit: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchQuota() {
      try {
        const res = await fetch('/api/subscription/quota');
        if (res.ok) {
          const data = await res.json();
          setQuota(data);
        }
      } catch {}
    }
    fetchQuota();
  }, [currentCount]);

  // Si plan payant (starter ou pro) et illimité, ne pas encombrer le dashboard
  if (quota && quota.planSlug !== 'discovery' && quota.clientLimit === null) {
    return null;
  }

  const count = currentCount ?? quota?.clientCount ?? 0;
  const limit = quota?.clientLimit ?? 5;
  const percentage = Math.min(100, Math.round((count / limit) * 100));
  const isReached = count >= limit;
  const isNear = count === limit - 1;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isReached
          ? 'bg-amber-50/80 border-amber-300 shadow-sm'
          : isNear
          ? 'bg-orange-50/70 border-orange-200'
          : 'bg-white/80 backdrop-blur-md border-[#E7E2D8] shadow-sm'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Formule Découverte</span>
            </span>
            {isReached && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Limite atteinte
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-stone-900">Clients enregistrés :</span>
            <span className="text-base font-black text-stone-900 font-mono">
              {count} / {limit}
            </span>
          </div>

          {isReached ? (
            <p className="text-xs text-amber-900 font-medium">
              Vous avez atteint la limite de 5 clients. Passez à Starter pour continuer à ajouter des clients.
            </p>
          ) : isNear ? (
            <p className="text-xs text-orange-800 font-medium">
              Vous approchez de la limite de votre formule (plus que 1 client disponible).
            </p>
          ) : (
            <p className="text-xs text-stone-500">
              Plan Découverte — Gratuit à vie
            </p>
          )}
        </div>

        {/* CTA Button */}
        <div className="shrink-0 flex items-center gap-2">
          {isReached ? (
            <Link
              href="/pricing?plan=starter"
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D97706] to-amber-700 hover:from-amber-700 hover:to-[#D97706] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              <span>Passer à Starter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold text-xs uppercase tracking-wider transition-all"
            >
              <span>Voir les formules</span>
            </Link>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 w-full bg-stone-200/80 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isReached ? 'bg-amber-600' : isNear ? 'bg-orange-500' : 'bg-[#0F3B32]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
