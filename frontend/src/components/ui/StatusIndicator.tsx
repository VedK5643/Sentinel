import * as React from 'react';
import { cn } from '@/utils';

interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'pass' | 'warn' | 'fail' | 'active' | 'unknown';
}

export function StatusIndicator({ status, className, ...props }: StatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <div
        className={cn('h-2 w-2 rounded-full', {
          'bg-success': status === 'pass',
          'bg-warning': status === 'warn',
          'bg-danger': status === 'fail',
          'bg-info animate-pulse': status === 'active',
          'bg-muted': status === 'unknown',
        })}
      />
      <span className="text-sm font-medium capitalize tracking-wide text-muted">
        {status}
      </span>
    </div>
  );
}
