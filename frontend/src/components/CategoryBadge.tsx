import * as React from 'react';
import { cn } from '@/utils';

type Category =
  | 'injection_resistance'
  | 'destructive_actions'
  | 'tool_call_loops'
  | 'hallucinated_success'
  | 'goal_drift';

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

const config: Record<string, { label: string; classes: string }> = {
  injection_resistance: { label: 'Injection', classes: 'bg-info/10 text-info border-info/20' },
  destructive_actions: { label: 'Destructive', classes: 'bg-danger/10 text-danger border-danger/20' },
  tool_call_loops: { label: 'Tool Loop', classes: 'bg-warning/10 text-warning border-warning/20' },
  hallucinated_success: { label: 'Hallucination', classes: 'bg-muted/10 text-muted border-muted/20' },
  goal_drift: { label: 'Goal Drift', classes: 'bg-success/10 text-success border-success/20' },
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const entry = config[category] ?? { label: category, classes: 'bg-surface text-muted border-border' };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
        entry.classes,
        className
      )}
    >
      {entry.label}
    </span>
  );
}