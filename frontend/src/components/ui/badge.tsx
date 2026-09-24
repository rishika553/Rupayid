import type { ReactNode } from 'react';
import { cn } from '@rupayaid/ui';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({
  className,
  children,
  tone = 'neutral',
}: {
  className?: string;
  children: ReactNode;
  tone?: Tone;
}) {
  const tones: Record<Tone, string> = {
    neutral: 'bg-muted text-muted-foreground ring-border',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200',
    danger: 'bg-red-50 text-red-800 ring-red-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
  };
  const dots: Record<Tone, string> = {
    neutral: 'bg-muted-foreground/60',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dots[tone])} aria-hidden />
      {children}
    </span>
  );
}

const SUCCESS = [
  'APPROVED',
  'ACTIVE',
  'PAID',
  'SUCCESS',
  'VERIFIED',
  'CONVERTED',
  'ACCEPTED',
  'DISBURSED',
  'CLOSED',
  'ELIGIBLE',
];
const WARNING = [
  'PENDING',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ELIGIBILITY_CHECK',
  'DISBURSEMENT_PENDING',
  'SCHEDULED',
  'DRAFT',
  'NOT_STARTED',
  'NOT_SUBMITTED',
  'HOLD',
  'INITIATED',
  'CREATED',
  'PROCESSING',
  'AWAITING_CONFIRMATION',
  'RESUBMISSION_REQUIRED',
  'MORE_INFO_REQUIRED',
  'ADDITIONAL_INFORMATION_REQUIRED',
  'UPCOMING',
  'DUE',
  'PARTIALLY_PAID',
];
const DANGER = [
  'REJECTED',
  'DECLINED',
  'FAILED',
  'DEFAULTED',
  'LOCKED',
  'BANNED',
  'PAST_DUE',
  'OVERDUE',
  'DISPUTED',
  'NOT_ELIGIBLE',
];

export function statusTone(status?: string): Tone {
  const value = (status || '').toUpperCase();
  if (SUCCESS.includes(value)) return 'success';
  if (WARNING.includes(value)) return 'warning';
  if (DANGER.includes(value)) return 'danger';
  return 'neutral';
}
