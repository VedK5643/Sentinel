import * as React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Bot } from 'lucide-react';
import { MOCK_AGENTS } from '@/data/mockData';
import { AgentCard } from '@/components/AgentCard';
import type { Agent } from '@/types';

type SortKey = 'reliability' | 'lastAudit' | 'name';

export default function Agents() {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('reliability');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const filtered = React.useMemo<Agent[]>(() => {
    let list = [...MOCK_AGENTS];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        a =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter(a => a.status === statusFilter);
    }

    list.sort((a, b) => {
      if (sort === 'reliability') return b.reliability - a.reliability;
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'lastAudit') {
        const ta = a.lastAudit ? new Date(a.lastAudit.timestamp).getTime() : 0;
        const tb = b.lastAudit ? new Date(b.lastAudit.timestamp).getTime() : 0;
        return tb - ta;
      }
      return 0;
    });

    return list;
  }, [query, sort, statusFilter]);

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 md:px-8">

      {/* Header */}
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Agents</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Monitor the reliability of every agent{' '}
          <span className="text-muted">before it reaches production.</span>
        </h1>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search agents..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm text-primary placeholder:text-muted outline-none transition-colors focus:border-border/80"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4 text-muted" />
          {(['all', 'active', 'degraded', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-surface border border-border text-primary'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-4 w-4 text-muted" />
          {([
            { key: 'reliability' as SortKey, label: 'Reliability' },
            { key: 'lastAudit' as SortKey, label: 'Recent' },
            { key: 'name' as SortKey, label: 'Name' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === key
                  ? 'bg-surface border border-border text-primary'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="mb-4 text-xs text-muted">
        {filtered.length} agent{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
            <Bot className="h-5 w-5 text-muted" />
          </div>
          <p className="mb-1 text-sm font-medium text-primary">
            {query ? 'No agents match your search' : 'No agents yet'}
          </p>
          <p className="text-xs text-muted">
            {query
              ? `Try a different search term.`
              : 'Register your first agent to begin reliability testing.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
