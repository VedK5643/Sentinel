import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Bot, Wrench, Terminal,
  AlertTriangle, XCircle, Shield,
} from 'lucide-react';
import { cn } from '@/utils';
import type { TraceEvent, TraceRole } from '@/types';
import { getTrace } from '@/data/simulationData';
import { ToolCallBlock, InjectionHighlight } from '@/components/TraceComponents';
import { VerdictBadge } from '@/components/VerdictBadge';

// ─── Filter types ──────────────────────────────────────────────────────────────

type FilterOption = 'all' | TraceRole;

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'user', label: 'User' },
  { value: 'agent', label: 'Agent' },
  { value: 'tool_call', label: 'Tool Calls' },
  { value: 'tool_response', label: 'Responses' },
  { value: 'warning', label: 'Warnings' },
  { value: 'failure', label: 'Failures' },
];

// ─── Role config ───────────────────────────────────────────────────────────────

const roleConfig: Record<TraceRole, {
  label: string;
  icon: React.FC<{ className?: string }>;
  labelClass: string;
  borderClass: string;
  dotClass: string;
}> = {
  user: {
    label: 'User',
    icon: User,
    labelClass: 'text-primary',
    borderClass: 'border-border',
    dotClass: 'bg-border',
  },
  agent: {
    label: 'Agent',
    icon: Bot,
    labelClass: 'text-info',
    borderClass: 'border-info/30',
    dotClass: 'bg-info',
  },
  tool_call: {
    label: 'Tool Call',
    icon: Wrench,
    labelClass: 'text-warning',
    borderClass: 'border-warning/30',
    dotClass: 'bg-warning',
  },
  tool_response: {
    label: 'Tool Response',
    icon: Terminal,
    labelClass: 'text-success',
    borderClass: 'border-success/30',
    dotClass: 'bg-success',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    labelClass: 'text-warning',
    borderClass: 'border-warning/40',
    dotClass: 'bg-warning',
  },
  failure: {
    label: 'Failure',
    icon: XCircle,
    labelClass: 'text-danger',
    borderClass: 'border-danger/40',
    dotClass: 'bg-danger',
  },
};

// ─── Single trace event ────────────────────────────────────────────────────────

function TraceEventCard({ event, index }: { event: TraceEvent; index: number }) {
  const cfg = roleConfig[event.role];
  const Icon = cfg.icon;

  const isToolCall = event.role === 'tool_call';
  const isToolResp = event.role === 'tool_response';
  const isFailure  = event.role === 'failure';
  const isWarning  = event.role === 'warning';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: 'easeOut' }}
      className="relative flex gap-4"
    >
      {/* Timeline line + dot */}
      <div className="relative flex flex-col items-center">
        <div className={cn(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background',
          cfg.borderClass
        )}>
          <Icon className={cn('h-4 w-4', cfg.labelClass)} />
        </div>
        <div className="mt-1 w-px flex-1 bg-border/40" />
      </div>

      {/* Card */}
      <div className={cn(
        'mb-4 flex-1 rounded-xl border p-4',
        isFailure ? 'border-danger/40 bg-danger/5' :
        isWarning ? 'border-warning/30 bg-warning/[0.04]' :
        event.injectionHighlight ? 'border-danger/20 bg-surface' :
        'border-border/60 bg-surface/60'
      )}>
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', cfg.labelClass)}>
            {cfg.label}
          </span>
          <span className="font-mono text-[10px] text-muted">{event.timestamp}</span>
        </div>

        {/* Body */}
        {(isToolCall || isToolResp) ? (
          <ToolCallBlock
            toolName={event.toolName ?? ''}
            args={isToolCall ? event.toolArgs : undefined}
            result={isToolResp ? event.toolResult : undefined}
            timestamp={event.timestamp}
            role={event.role}
          />
        ) : (
          <p className={cn(
            'text-sm leading-relaxed',
            isFailure ? 'font-mono text-danger/80' :
            isWarning ? 'text-warning/90' :
            'text-primary/90'
          )}>
            {event.content}
          </p>
        )}

        {/* Injection highlight */}
        {event.injectionHighlight && event.injectionSnippet && (
          <InjectionHighlight snippet={event.injectionSnippet} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Trace Viewer ─────────────────────────────────────────────────────────

export default function TraceViewer() {
  const { traceId } = useParams<{ traceId: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<FilterOption>('all');
  const [isReplaying, setIsReplaying] = React.useState(false);
  const [replayIndex, setReplayIndex] = React.useState(0);

  const trace = traceId ? getTrace(traceId) : null;

  React.useEffect(() => {
    if (!isReplaying || !trace) return;
    const interval = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= trace.events.length) {
          setIsReplaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [isReplaying, trace]);

  if (!trace) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-12 md:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-muted">Trace not found.</p>
      </div>
    );
  }

  const eventsToDisplay = isReplaying ? trace.events.slice(0, replayIndex) : trace.events;

  const filteredEvents = filter === 'all'
    ? eventsToDisplay
    : eventsToDisplay.filter(e => e.role === filter);

  const isPass = trace.verdict === 'pass';

  return (
    <div className="container mx-auto max-w-screen-lg px-4 py-8 md:px-8">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Audits
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <VerdictBadge verdict={trace.verdict} />
          <span className="font-mono text-xs text-muted">{trace.traceId}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          {trace.scenarioTitle}
        </h1>
        <p className="mt-1 text-sm text-muted">{trace.agentName}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

        {/* ── Timeline ── */}
        <div>
          {/* Filter bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    filter === f.value
                      ? 'bg-surface border border-border text-primary'
                      : 'text-muted hover:text-primary'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                setReplayIndex(0);
                setIsReplaying(true);
              }}
              disabled={isReplaying}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <div className="h-2 w-2 rounded-full bg-black animate-pulse" style={{ display: isReplaying ? 'block' : 'none' }} />
              {isReplaying ? 'Replaying...' : 'Replay Trace'}
            </button>
          </div>

          {/* Events */}
          <div>
            <AnimatePresence>
              {filteredEvents.map((ev, i) => (
                <TraceEventCard key={ev.id} event={ev} index={i} />
              ))}
            </AnimatePresence>
            {filteredEvents.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">
                No events match this filter.
              </p>
            )}
          </div>
        </div>

        {/* ── Analysis Panel ── */}
        <div className="space-y-4">

          {/* Verdict card */}
          <div className={cn(
            'rounded-xl border p-5',
            isPass
              ? 'border-success/30 bg-success/5'
              : 'border-danger/30 bg-danger/5'
          )}>
            <div className="mb-3 flex items-center gap-2">
              <Shield className={cn('h-5 w-5', isPass ? 'text-success' : 'text-danger')} />
              <span className={cn(
                'text-xs font-bold uppercase tracking-widest',
                isPass ? 'text-success' : 'text-danger'
              )}>
                {isPass ? 'Scenario Passed' : 'Scenario Failed'}
              </span>
            </div>
            {trace.failure && (
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Category</p>
                  <p className="mt-0.5 text-sm text-primary">{trace.failure.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Severity</p>
                  <p className={cn('mt-0.5 text-sm font-semibold capitalize', {
                    'text-danger': trace.failure.severity === 'critical' || trace.failure.severity === 'high',
                    'text-warning': trace.failure.severity === 'medium',
                    'text-muted': trace.failure.severity === 'low',
                  })}>
                    {trace.failure.severity}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Why Sentinel flagged this */}
          {trace.failure && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">
                Why Sentinel Flagged This
              </p>
              <p className="text-sm text-primary leading-relaxed">
                {trace.failure.summary}
              </p>

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Expected Behavior</p>
                  <p className="mt-1 text-xs text-primary/80">{trace.failure.expected}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Observed Behavior</p>
                  <p className="mt-1 text-xs text-primary">{trace.failure.observed}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Confidence</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background">
                      <motion.div
                        className="h-full rounded-full bg-danger"
                        initial={{ width: 0 }}
                        animate={{ width: `${trace.failure.confidence}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      />
                    </div>
                    <span className="font-mono text-xs text-primary shrink-0">
                      {trace.failure.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pass analysis */}
          {isPass && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-success">
                Guardrails Active
              </p>
              <p className="text-sm text-primary/80 leading-relaxed">
                The agent correctly identified and rejected the injected instruction. All security policies applied as expected.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Trace Stats</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Events</span>
                <span className="font-mono text-primary">{trace.events.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tool calls</span>
                <span className="font-mono text-primary">
                  {trace.events.filter(e => e.role === 'tool_call').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Warnings</span>
                <span className="font-mono text-warning">
                  {trace.events.filter(e => e.role === 'warning').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Injections detected</span>
                <span className="font-mono text-danger">
                  {trace.events.filter(e => e.injectionHighlight).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
