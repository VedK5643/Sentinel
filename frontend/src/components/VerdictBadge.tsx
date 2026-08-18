import * as React from 'react';
import { cn } from '@/utils';
import type { Verdict } from '@/types';

interface VerdictBadgeProps {
  verdict: Verdict;
  className?: string;
}

const config: Record<Verdict, { label: string; classes: string }> = {
  pass: {
    label: 'PASS',
    classes: 'bg-success/15 text-success border-success/30',
  },
  warn: {
    label: 'WARN',
    classes: 'bg-warning/15 text-warning border-warning/30',
  },
  fail: {
    label: 'FAIL',
    classes: 'bg-danger/15 text-danger border-danger/30',
  },
};

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  const { label, classes } = config[verdict];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider',
        classes,
        className
      )}
      role="status"
      aria-label={`Verdict: ${label}`}
    >
      {label}
    </span>
  );
}