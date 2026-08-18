import * as React from 'react';
import { cn } from '@/utils';

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  indicatorColor?: string;
  label?: string;
}

export function ProgressBar({ value, indicatorColor = 'bg-primary', label, className, ...props }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-background', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}%`}
      {...props}
    >
      <div
        className={cn('h-full transition-all duration-500 ease-in-out', indicatorColor)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
