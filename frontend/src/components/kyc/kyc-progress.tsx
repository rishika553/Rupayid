import { KYC_STEPS } from '@/lib/kyc';
import { cn } from '@rupayaid/ui';

export function KycProgress({ current }: { current: number }) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-sm text-muted-foreground">
        Step {current} of {KYC_STEPS.length} · {KYC_STEPS[current - 1]?.title}
      </p>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="KYC progress">
        {KYC_STEPS.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} className="min-w-0">
              <div
                className={cn(
                  'h-1.5 rounded-full',
                  done && 'bg-primary',
                  active && 'bg-primary/70',
                  !done && !active && 'bg-muted',
                )}
              />
              <p
                className={cn(
                  'mt-2 hidden truncate text-[11px] sm:block',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.title}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
