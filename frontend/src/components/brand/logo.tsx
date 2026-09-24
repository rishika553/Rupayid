import Link from 'next/link';
import { Landmark } from 'lucide-react';
import { cn } from '@rupayaid/ui';

export function Logo({
  href = '/dashboard',
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="RupayAid dashboard"
      className={cn(
        'flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[-0.04em] text-primary',
        className,
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-white">
        <Landmark className="size-4" aria-hidden />
      </span>
      {compact ? null : (
        <span>
          Rupay<span className="text-emerald-600">Aid</span>
        </span>
      )}
    </Link>
  );
}
