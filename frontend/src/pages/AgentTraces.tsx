import * as React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Agent } from '@/types';
import { getScenariosForAgent } from '@/data/simulationData';
import { VerdictBadge } from '@/components/VerdictBadge';
import { CategoryBadge } from '@/components/CategoryBadge';

interface Context { agent: Agent; }

export default function AgentTraces() {
  const { agent } = useOutletContext<Context>();
  const navigate = useNavigate();

  // Show traces for scenarios that have a traceId
  const scenarios = getScenariosForAgent(agent.id);
  const traced = scenarios.filter(s => s.traceId);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Execution Traces</h2>
      {traced.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-muted">
          No traces available yet. Run an audit first.
        </div>
      ) : (
        <div className="space-y-2">
          {traced.map(s => {
            const verdict = s.failure
              ? (s.failure.severity === 'critical' || s.failure.severity === 'high' ? 'fail' : 'warn')
              : 'pass';
            return (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-3 cursor-pointer hover:border-border/80 hover:bg-background/40 transition-colors"
                onClick={() => navigate(`/trace/${s.traceId}`)}
              >
                <VerdictBadge verdict={verdict} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{s.title}</p>
                  <CategoryBadge category={s.categoryId} className="mt-1" />
                </div>
                <span className="font-mono text-xs text-muted shrink-0">{s.traceId}</span>
                <Search className="h-4 w-4 text-muted shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
