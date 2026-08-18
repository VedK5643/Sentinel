import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, XCircle, Loader2, Play,
  BarChart2, Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { ScenarioResult } from '@/types';
import { cn } from '@/utils';

// ─── Scenario row status icon ─────────────────────────────────────────────────

function StatusIcon({ status }: { status: ScenarioResult['status'] }) {
  if (status === 'pending') return <div className="h-4 w-4 rounded-full border border-border/60 bg-background" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-info" />;
  if (status === 'pass')   return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === 'warn')   return <AlertCircle className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-danger" />;
}

// ─── Category pill ────────────────────────────────────────────────────────────

const catColors: Record<string, string> = {
  injection_resistance: 'text-info bg-info/10',
  destructive_actions:  'text-danger bg-danger/10',
  tool_call_loops:      'text-warning bg-warning/10',
  hallucinated_success: 'text-muted bg-muted/10',
  goal_drift:           'text-success bg-success/10',
};

// ─── Failure expansion panel ──────────────────────────────────────────────────

function FailurePanel({
  scenario,
  onViewTrace,
}: {
  scenario: ScenarioResult;
  onViewTrace: (traceId: string) => void;
}) {
  const f = scenario.failure!;
  const severityColor = {
    critical: 'text-danger border-danger/40 bg-danger/5',
    high:     'text-danger border-danger/30 bg-danger/5',
    medium:   'text-warning border-warning/30 bg-warning/5',
    low:      'text-muted border-border bg-surface',
  }[f.severity];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className={cn('mx-4 mb-4 rounded-xl border p-5', severityColor)}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-danger">
                Scenario Failed
              </span>
              <span className={cn(
                'rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
                severityColor
              )}>
                {f.severity}
              </span>
            </div>
            <p className="text-base font-semibold text-primary">{f.category}</p>
          </div>
          {f.callCount && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted">Tool calls</p>
              <p className="text-2xl font-bold text-danger">{f.callCount}</p>
            </div>
          )}
        </div>

        <p className="mb-4 text-sm text-muted">{f.summary}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Expected
            </p>
            <p className="text-sm text-primary/80">{f.expected}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Observed
            </p>
            <p className="text-sm text-primary">{f.observed}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-current/10">
          {scenario.traceId && (
            <button
              onClick={() => onViewTrace(scenario.traceId!)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Search className="h-3.5 w-3.5" />
              View Trace
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-primary"
          >
            <Play className="h-3 w-3" />
            Replay Scenario
          </button>
          <span className="ml-auto text-xs text-muted font-mono">
            Confidence: {f.confidence}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Single scenario row ──────────────────────────────────────────────────────

function ScenarioRow({
  scenario,
  onViewTrace,
}: {
  scenario: ScenarioResult;
  onViewTrace: (traceId: string) => void;
}) {
  const isFailed = scenario.status === 'fail';
  const isWarn = scenario.status === 'warn';
  const [expanded, setExpanded] = React.useState(false);

  // Auto-expand failures
  React.useEffect(() => {
    if (isFailed && scenario.failure) setExpanded(true);
  }, [isFailed, scenario.failure]);

  const hasFail = (isFailed || isWarn) && scenario.failure;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'rounded-xl border transition-colors',
        isFailed ? 'border-danger/30 bg-danger/[0.04]' :
        isWarn   ? 'border-warning/30 bg-warning/[0.04]' :
                   'border-border/60 bg-surface/40'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          hasFail ? 'cursor-pointer' : ''
        )}
        onClick={() => hasFail && setExpanded(e => !e)}
      >
        <span className="w-6 shrink-0 font-mono text-xs text-muted text-right">
          {String(scenario.index).padStart(2, '0')}
        </span>
        <StatusIcon status={scenario.status} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            scenario.status === 'pending' ? 'text-muted' : 'text-primary'
          )}>
            {scenario.title}
          </p>
          <div className={cn(
            'mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
            catColors[scenario.categoryId] ?? 'text-muted bg-muted/10'
          )}>
            {scenario.categoryName}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {scenario.status !== 'pending' && scenario.status !== 'running' && (
            <span className={cn(
              'font-mono text-xs font-bold uppercase tracking-widest',
              scenario.status === 'pass' ? 'text-success' :
              scenario.status === 'warn' ? 'text-warning' : 'text-danger'
            )}>
              {scenario.status}
            </span>
          )}
          {hasFail && (
            <button className="text-muted hover:text-primary transition-colors">
              {expanded
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && hasFail && (
          <FailurePanel scenario={scenario} onViewTrace={onViewTrace} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export { ScenarioRow };
