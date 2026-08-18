import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Play, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';
import type { Agent } from '@/types';
import { AgentStatusBadge } from '@/components/ui/AgentStatusBadge';
import { Trend } from '@/components/ui/Trend';
import { Button } from '@/components/ui/Button';

interface AgentCardProps {
  agent: Agent;
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 90) return 'bg-success';
  if (score >= 75) return 'bg-warning';
  return 'bg-danger';
}

function scoreTextColor(score: number): string {
  if (score >= 90) return 'text-success';
  if (score >= 75) return 'text-warning';
  return 'text-danger';
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function AgentCard({ agent, className }: AgentCardProps) {
  const navigate = useNavigate();
  const { pass, warn, fail, totalScenarios } = agent;

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-lg hover:shadow-black/30 cursor-pointer',
        className
      )}
      onClick={() => navigate(`/agents/${agent.id}`)}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <AgentStatusBadge status={agent.status} />
            <span className="font-mono text-xs text-muted">{agent.currentVersion}</span>
          </div>
          <h3 className="truncate text-base font-semibold text-primary">{agent.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted">{agent.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn('text-3xl font-bold tracking-tighter', scoreTextColor(agent.reliability))}>
            {agent.reliability}
          </span>
          <Trend value={agent.reliabilityDelta} unit="%" />
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-background">
        <div
          className={cn('h-full rounded-full transition-all duration-700', scoreColor(agent.reliability))}
          style={{ width: `${agent.reliability}%` }}
        />
      </div>

      {/* Pass/Warn/Fail */}
      <div className="mb-5 flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {pass} pass
        </span>
        <span className="flex items-center gap-1.5 text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          {warn} warn
        </span>
        <span className="flex items-center gap-1.5 text-danger">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          {fail} fail
        </span>
        <span className="ml-auto text-muted">{totalScenarios} scenarios</span>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" />
          {agent.lastAudit ? formatRelative(agent.lastAudit.timestamp) : 'Never'}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted"
            onClick={() => navigate(`/agents/${agent.id}`)}
          >
            View
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Play className="mr-1 h-3 w-3" />
            Audit
          </Button>
        </div>
      </div>
    </div>
  );
}
