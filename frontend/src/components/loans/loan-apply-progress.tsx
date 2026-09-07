import { APPLY_STEPS } from '@/lib/loan-apply';
import { cn } from '@rupayaid/ui';

export function LoanApplyProgress({ current }: { current: number }) {
  const step = APPLY_STEPS[current - 1];
  return (
    <div className="mb-6">
      <p className="mb-3 text-sm text-muted-foreground">
        Step {current} of {APPLY_STEPS.length}
        {step ? ` · ${step.title}` : ''}
      </p>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Application progress">
        {APPLY_STEPS.map((item) => {
          const done = item.id < current;
          const active = item.id === current;
          return (
            <li key={item.id} className="min-w-0">
              <div
                className={cn(
                  'h-1.5 rounded-full',
                  done && 'bg-primary',
                  active && 'bg-primary/70',
                  !done && !active && 'bg-muted',
                )}
                aria-current={active ? 'step' : undefined}
              />
              <p
                className={cn(
                  'mt-2 hidden truncate text-[11px] sm:block',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {item.title}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
