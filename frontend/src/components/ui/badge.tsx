import type { ReactNode } from 'react';
import { cn } from '@rupayaid/ui';

export function Badge({
  className,
  children,
  tone = 'neutral',
}: {
  className?: string;
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-50 text-emerald-800',
    warning: 'bg-amber-50 text-amber-800',
    danger: 'bg-red-50 text-red-800',
    info: 'bg-sky-50 text-sky-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  const value = (status || '').toUpperCase();
  if (['APPROVED', 'ACTIVE', 'PAID', 'SUCCESS', 'VERIFIED', 'CONVERTED'].includes(value)) {
    return 'success';
  }
  if (['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'SCHEDULED', 'DRAFT', 'PROCESSING', 'RESUBMISSION_REQUIRED'].includes(value)) {
    return 'warning';
  }
  if (['REJECTED', 'FAILED', 'DEFAULTED', 'LOCKED', 'BANNED', 'PAST_DUE'].includes(value)) {
    return 'danger';
  }
  if (['DISBURSED', 'ELIGIBLE'].includes(value)) {
    return 'info';
  }
  return 'neutral';
}
