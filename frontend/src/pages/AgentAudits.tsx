import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Play, RefreshCcw, BarChart2, Search } from 'lucide-react';
import type { Agent } from '@/types';
import { useAuditSimulation } from '@/hooks/useAuditSimulation';
import { ScenarioRow } from '@/components/ScenarioRow';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Button } from '@/components/ui/Button';

interface Context { agent: Agent; }

const PHASE_PROGRESS: Record<string, number> = {
  idle: 0,
  initializing: 8,
  generating: 18,
  sandbox: 25,
  running: 30,   // augmented by scenario progress
  analyzing: 88,
  scoring: 95,
  complete: 100,
};

export default function AgentAudits() {
  const { agent } = useOutletContext<Context>();
  const navigate = useNavigate();

  const sim = useAuditSimulation(agent.id);

  // Compute progress bar value
  const progressBase = PHASE_PROGRESS[sim.phase] ?? 0;
  const progressValue = React.useMemo(() => {
    if (sim.phase === 'running' && sim.scenarios.length > 0) {
      const scenarioProgress =
        (sim.completedCount / sim.scenarios.length) * 58; // 58% window for running
      return 30 + scenarioProgress;
    }
    return progressBase;
  }, [sim.phase, sim.completedCount, sim.scenarios.length, progressBase]);

  const handleViewTrace = React.useCallback(
    (traceId: string) => navigate(`/trace/${traceId}`),
    [navigate]
  );

  const handleViewScorecard = React.useCallback(
    () => navigate(`/agents/${agent.id}/scorecard`),
    [navigate, agent.id]
  );

  const firstFailure = sim.scenarios.find(s => s.status === 'fail' && s.failure);

  // ── Idle state ──
  if (sim.phase === 'idle') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Audit Runs</h2>
        </div>

        {/* Last audit summary */}
        {agent.lastAudit && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-muted">{agent.lastAudit.runId}</p>
                <p className="mt-1 text-sm text-primary">
                  {new Date(agent.lastAudit.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p className="mt-0.5 text-xs text-muted capitalize">
                  Triggered by {agent.lastAudit.triggeredBy}
                </p>
              </div>
              <div className="flex items-center gap-6 text-center">
                {[
                  { label: 'Scenarios', value: agent.lastAudit.totalScenarios, color: 'text-primary' },
                  { label: 'Pass', value: agent.lastAudit.pass, color: 'text-success' },
                  { label: 'Warn', value: agent.lastAudit.warn, color: 'text-warning' },
                  { label: 'Fail', value: agent.lastAudit.fail, color: 'text-danger' },
                  { label: 'Score', value: agent.lastAudit.reliability, color: 'text-primary', large: true },
                ].map(s => (
                  <div key={s.label}>
                    <p className={`text-xs ${s.color}`}>{s.label}</p>
                    <p className={`font-semibold ${s.large ? 'text-xl' : ''} ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex h-40 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted">Ready to run a new adversarial audit</p>
          <Button onClick={sim.startAudit}>
            <Play className="mr-2 h-4 w-4" />
            Run Audit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Audit Header ── */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                sim.phase === 'complete' ? 'text-success' : 'text-info'
              }`}>
                {sim.phase === 'complete' ? 'Audit Complete' : 'Audit Running'}
              </span>
              <span className="font-mono text-xs text-muted">{agent.name}</span>
            </div>

            <motion.p
              key={sim.phaseLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-muted"
            >
              {sim.phaseLabel}
            </motion.p>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background">
              <motion.div
                className={`h-full rounded-full ${
                  sim.phase === 'complete' ? 'bg-success' : 'bg-info'
                }`}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {sim.phase === 'running' && sim.scenarios.length > 0 && (
              <p className="mt-1.5 text-xs text-muted">
                {sim.completedCount} / {sim.scenarios.length} scenarios
              </p>
            )}
          </div>

          {/* Live score */}
          <div className="flex items-center gap-4 shrink-0">
            {sim.phase === 'complete' && sim.result ? (
              <ScoreRing
                score={sim.result.reliability}
                size={80}
                strokeWidth={6}
                label="Score"
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-3xl font-bold tabular-nums text-primary">
                  {sim.scenarios.length > 0
                    ? Math.round(
                        (sim.completedCount === 0 ? 100 :
                          (sim.scenarios.filter(s => s.status === 'pass').length / Math.max(sim.completedCount, 1)) * 100
                        )
                      )
                    : '—'}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted">Live Score</span>
              </div>
            )}

            {sim.phase !== 'complete' && (
              <button
                onClick={sim.reset}
                className="rounded-lg border border-border p-2 text-muted transition-colors hover:text-primary"
                title="Cancel audit"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Completion Summary ── */}
      <AnimatePresence>
        {sim.phase === 'complete' && sim.result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-success/20 bg-success/5 p-6"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-success">
                  Audit Complete
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tighter text-primary">
                    {sim.result.reliability}
                  </span>
                  <span className="text-muted">Reliability Score</span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="text-success">{sim.result.pass} pass</span>
                  <span className="text-warning">{sim.scenarios.filter(s => s.status === 'warn').length} warn</span>
                  <span className="text-danger">{sim.scenarios.filter(s => s.status === 'fail').length} fail</span>
                  <span className="text-muted">{sim.scenarios.length} total</span>
                </div>
                {sim.result.previousReliability && (
                  <p className="mt-2 text-sm text-muted">
                    {sim.result.reliability >= sim.result.previousReliability
                      ? `↑ ${sim.result.reliability - sim.result.previousReliability} points from previous version`
                      : `↓ ${sim.result.previousReliability - sim.result.reliability} points from previous version`}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleViewScorecard} variant="secondary" size="sm">
                  <BarChart2 className="mr-1.5 h-4 w-4" />
                  View Scorecard
                </Button>
                {firstFailure?.traceId && (
                  <Button
                    onClick={() => handleViewTrace(firstFailure.traceId!)}
                    variant="danger"
                    size="sm"
                  >
                    <Search className="mr-1.5 h-4 w-4" />
                    Inspect Failure
                  </Button>
                )}
                <Button
                  onClick={sim.reset}
                  variant="ghost"
                  size="sm"
                  className="text-muted"
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scenario Stream ── */}
      {sim.scenarios.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Scenarios
          </h3>
          {sim.scenarios.map(scenario => (
            <ScenarioRow
              key={scenario.id}
              scenario={scenario}
              onViewTrace={handleViewTrace}
            />
          ))}
        </div>
      )}
    </div>
  );
}
