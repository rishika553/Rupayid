import { Badge, statusTone } from '@/components/ui/badge';
import { formatDate, statusLabel } from '@/lib/format';
import { decisionLabel, TRACKING_STEPS, trackingIndex } from '@/lib/loan-apply';
import { cn } from '@rupayaid/ui';
export function ApplicationTimeline({
  application,
}: {
  application: {
    status: string;
    timeline?: Array<{ fromState: string; toState: string; reason?: string | null; createdAt: string }>;
  };
}) {
  const current = trackingIndex(application.status);
  const rejected = application.status === 'REJECTED';
  const cancelled = application.status === 'CANCELLED' || application.status === 'DRAFT';

  return (
    <div>
      <ol className="space-y-4" aria-label="Application timeline">
        {TRACKING_STEPS.map((step, index) => {
          const position = index + 1;
          const reached = current >= position && !cancelled;
          const active = current === position && !cancelled;
          const label = step.key === 'DECISION' ? decisionLabel(application.status) : step.label;
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium',
                    reached && !rejected && 'border-primary bg-primary text-primary-foreground',
                    reached && rejected && step.key === 'DECISION' && 'border-destructive bg-destructive text-destructive-foreground',
                    !reached && 'border-muted-foreground/30 text-muted-foreground',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {position}
                </span>
                {index < TRACKING_STEPS.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
              </div>
              <div className="pb-4">
                <p className={cn('text-sm font-medium', active && 'text-foreground')}>{label}</p>
                {active ? (
                  <p className="text-xs text-muted-foreground">Current status · {statusLabel(application.status)}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {application.timeline && application.timeline.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t pt-4 text-sm">
          {application.timeline.map((event, index) => (
            <li key={`${event.toState}-${event.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <Badge tone={statusTone(event.toState)}>{statusLabel(event.toState)}</Badge>
                {event.reason ? <span className="ml-2 text-muted-foreground">{event.reason}</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
