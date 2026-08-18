import * as React from 'react';
import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getAgent } from '@/data/mockData';
import { AgentStatusBadge } from '@/components/ui/AgentStatusBadge';
import { Trend } from '@/components/ui/Trend';
import { cn } from '@/utils';

const TABS = [
  { label: 'Overview', path: '' },
  { label: 'Audits', path: 'audits' },
  { label: 'Scorecard', path: 'scorecard' },
  { label: 'Traces', path: 'traces' },
];

export default function AgentWorkspace() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const agent = agentId ? getAgent(agentId) : null;

  if (!agent) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-12 md:px-8">
        <button
          onClick={() => navigate('/agents')}
          className="mb-8 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Agents
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Not Found</p>
          <h2 className="mb-3 text-xl font-bold tracking-tight text-primary">Agent not found</h2>
          <p className="mb-6 text-sm text-muted max-w-xs">
            This agent ID doesn&apos;t exist in the system. It may have been removed or the URL is incorrect.
          </p>
          <button
            onClick={() => navigate('/agents')}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 md:px-8">

      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/agents')}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Agents
      </button>

      {/* Agent Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <AgentStatusBadge status={agent.status} />
            <span className="font-mono text-xs text-muted">{agent.currentVersion}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">{agent.name}</h1>
          <p className="mt-1 text-sm text-muted">{agent.description}</p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <span className="text-4xl font-bold tracking-tighter text-primary">
            {agent.reliability}
            <span className="text-xl text-muted"> / 100</span>
          </span>
          <Trend value={agent.reliabilityDelta} unit="%" />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex items-center gap-0 border-b border-border">
        {TABS.map(tab => {
          const to = tab.path
            ? `/agents/${agentId}/${tab.path}`
            : `/agents/${agentId}`;
          return (
            <NavLink
              key={tab.label}
              to={to}
              end={tab.path === ''}
              className={({ isActive }) =>
                cn(
                  'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                )
              }
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      {/* Tab content rendered by nested routes */}
      <Outlet context={{ agent }} />
    </div>
  );
}
