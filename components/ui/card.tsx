'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ─── Card ─────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ className, padding = 'md', hover = false, children, ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        paddings[padding],
        hover && 'hover:shadow-md hover:border-gray-300 transition-all duration-150 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const dotColors = {
    default: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}

// ─── Divider ──────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-gray-200', className)} />;
}

// ─── Avatar ───────────────────────────────────────────────────
interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-green-800 text-white flex items-center justify-center font-semibold flex-shrink-0',
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />
  );
}

export function SkeletonCard() {
  return (
    <Card>
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'gray';
  onClick?: () => void;
}

export function StatCard({ label, value, icon, color = 'green', onClick }: StatCardProps) {
  const colors = {
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-600' },
  };

  const c = colors[color];

  return (
    <Card
      className={cn(onClick && 'cursor-pointer')}
      hover={!!onClick}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className={cn('text-xl font-bold mt-0.5 truncate', c.text)}>{value}</p>
        </div>
        {icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', c.bg)}>
            <span className={cn('text-sm', c.icon)}>{icon}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
