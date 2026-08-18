import * as React from 'react';
import { cn } from '@/utils';
import type { AgentStatus } from '@/types';

interface AgentStatusBadgeProps {
  status: AgentStatus;
  className?: string;
}

const config: Record<AgentStatus, { label: string; dot: string; text: string }> = {
  active: { label: 'Active', dot: 'bg-success', text: 'text-success' },
  inactive: { label: 'Inactive', dot: 'bg-muted', text: 'text-muted' },
  degraded: { label: 'Degraded', dot: 'bg-danger', text: 'text-danger' },
};

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const { label, dot, text } = config[status];
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      <span className={cn('text-xs font-medium', text)}>{label}</span>
    </div>
  );
}
