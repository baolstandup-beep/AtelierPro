'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, XCircle, RefreshCcw } from 'lucide-react';
import type { SubscriptionAccessLevel } from '@/lib/types';

interface Props {
  level: SubscriptionAccessLevel;
  daysRemaining?: number;
  graceDaysRemaining?: number;
  message?: string;
}

export function SubscriptionBanner({ level, daysRemaining, graceDaysRemaining, message }: Props) {
  if (level === 'ACTIVE') {
    // Prévenir l'expiration imminente (≤ 7 jours)
    if (daysRemaining !== undefined && daysRemaining <= 7 && daysRemaining > 0) {
      return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800">
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              Votre abonnement expire dans <strong>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong>.
            </span>
          </div>
          <Link
            href="/settings/billing"
            className="shrink-0 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Renouveler
          </Link>
        </div>
      );
    }
    return null;
  }

  if (level === 'GRACE') {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-orange-50 border-b border-orange-300 text-orange-900">
        <div className="flex items-center gap-2.5 text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span>
            <strong>Abonnement expiré.</strong>{' '}
            {graceDaysRemaining !== undefined && graceDaysRemaining > 0
              ? `Période de grâce : ${graceDaysRemaining} jour${graceDaysRemaining > 1 ? 's' : ''} restant${graceDaysRemaining > 1 ? 's' : ''}.`
              : message || 'Renouvelez pour continuer à utiliser AtelierPro.'}
          </span>
        </div>
        <Link
          href="/settings/billing"
          className="shrink-0 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          <RefreshCcw className="w-3 h-3" /> Renouveler
        </Link>
      </div>
    );
  }

  if (level === 'READ_ONLY') {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 border-b border-red-300 text-red-900">
        <div className="flex items-center gap-2.5 text-sm">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>
            <strong>Abonnement expiré.</strong>{' '}
            Mode lecture seule activé — vos données sont conservées.
          </span>
        </div>
        <Link
          href="/settings/billing"
          className="shrink-0 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          <RefreshCcw className="w-3 h-3" /> Réactiver
        </Link>
      </div>
    );
  }

  return null;
}
