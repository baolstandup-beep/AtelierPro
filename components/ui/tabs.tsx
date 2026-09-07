'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

// ─── Tabs ─────────────────────────────────────────────────────
interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function Tabs({ tabs, value, onChange, className, variant = 'default' }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex border-b border-gray-200 overflow-x-auto', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
              value === tab.value
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-xs font-medium',
                value === tab.value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={cn('flex gap-1 overflow-x-auto pb-1', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              value === tab.value
                ? 'bg-green-800 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'rounded-full px-1.5 text-xs',
                value === tab.value ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-600'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex bg-gray-100 rounded-lg p-1 gap-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            value === tab.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────
interface StatusBadgeProps {
  status: OrderStatus;
  isLate?: boolean;
  size?: 'sm' | 'md';
}

export function OrderStatusBadge({ status, isLate, size = 'md' }: StatusBadgeProps) {
  const colorClass = isLate && status !== 'DELIVERED' && status !== 'CANCELLED'
    ? 'bg-red-100 text-red-700'
    : ORDER_STATUS_COLORS[status];

  const label = isLate && status !== 'DELIVERED' && status !== 'CANCELLED'
    ? `⚠ ${ORDER_STATUS_LABELS[status]} — Retard`
    : ORDER_STATUS_LABELS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colorClass,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {label}
    </span>
  );
}

// ─── Search bar ───────────────────────────────────────────────
interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher…', className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent"
      />
    </div>
  );
}

// ─── Priority indicator ───────────────────────────────────────
export function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-300',
    NORMAL: 'bg-blue-400',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500',
  };
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', colors[priority] || 'bg-gray-300')} />
  );
}

// ─── List Item ────────────────────────────────────────────────
interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  href?: string;
}

export function ListItem({ leading, title, subtitle, trailing, className, ...props }: ListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      {leading && <div className="flex-shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      {trailing && <div className="flex-shrink-0 text-right">{trailing}</div>}
    </div>
  );
}
