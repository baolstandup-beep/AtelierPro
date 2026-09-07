'use client';

import React from 'react';
import { Banknote, Landmark, CreditCard, Smartphone } from 'lucide-react';
import type { PaymentMethod } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PaymentMethodIconProps {
  method: PaymentMethod | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PaymentMethodIcon({ method, size = 'md', className }: PaymentMethodIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  switch (method) {
    case 'WAVE':
      return (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-lg overflow-hidden flex items-center justify-center bg-[#1DC4FF] shadow-xs flex-shrink-0',
            className
          )}
        >
          <img
            src="/logos/wave.png"
            alt="Wave"
            className="w-full h-full object-cover"
          />
        </div>
      );

    case 'ORANGE_MONEY':
      return (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-lg overflow-hidden flex items-center justify-center bg-black shadow-xs flex-shrink-0',
            className
          )}
        >
          <img
            src="/logos/orange-money.png"
            alt="Orange Money"
            className="w-full h-full object-contain p-0.5"
          />
        </div>
      );

    case 'CASH':
      return (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-xs flex-shrink-0',
            className
          )}
        >
          <Banknote className={iconSizes[size]} strokeWidth={2.2} />
        </div>
      );

    case 'BANK':
      return (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-lg flex items-center justify-center bg-purple-100 text-purple-700 border border-purple-300 shadow-xs flex-shrink-0',
            className
          )}
        >
          <Landmark className={iconSizes[size]} strokeWidth={2.2} />
        </div>
      );

    case 'STRIPE':
      return (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-700 border border-indigo-300 shadow-xs flex-shrink-0',
            className
          )}
        >
          <CreditCard className={iconSizes[size]} strokeWidth={2.2} />
        </div>
      );

    case 'OTHER':
    default:
      return (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-lg flex items-center justify-center bg-slate-100 text-slate-700 border border-slate-300 shadow-xs flex-shrink-0',
            className
          )}
        >
          <Smartphone className={iconSizes[size]} strokeWidth={2.2} />
        </div>
      );
  }
}
