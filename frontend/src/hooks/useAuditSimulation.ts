import * as React from 'react';
import type { ScenarioResult, ScenarioStatus, AuditPhase } from '@/types';
import {
  AUDIT_PHASES,
  getScenariosForAgent,
  getAuditResult,
} from '@/data/simulationData';
import { IS_LIVE, startAudit as apiStartAudit, streamAudit } from '@/api';

interface AuditState {
  phase: AuditPhase;
  phaseLabel: string;
  scenarios: ScenarioResult[];
  completedCount: number;
  currentRunningIndex: number | null;
  result: { reliability: number; pass: number; warn: number; fail: number; previousReliability: number } | null;
}

interface UseAuditSimulationReturn extends AuditState {
  isRunning: boolean;
  startAudit: () => void;
  reset: () => void;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export function useAuditSimulation(agentId: string): UseAuditSimulationReturn {
  const [phase, setPhase] = React.useState<AuditPhase>('idle');
  const [phaseLabel, setPhaseLabel] = React.useState('');
  const [scenarios, setScenarios] = React.useState<ScenarioResult[]>([]);
  const [completedCount, setCompletedCount] = React.useState(0);
  const [currentRunningIndex, setCurrentRunningIndex] = React.useState<number | null>(null);
  const [result, setResult] = React.useState<AuditState['result']>(null);
  const abortRef = React.useRef(false);

  const updateScenario = React.useCallback(
    (index: number, patch: Partial<ScenarioResult>) => {
      setScenarios(prev =>
        prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
      );
    },
    []
  );

  const startAuditMock = React.useCallback(async () => {
    const initialScenarios = getScenariosForAgent(agentId);
    setScenarios(initialScenarios);

    for (const phaseDef of AUDIT_PHASES.slice(0, 3)) {
      if (abortRef.current) return;
      setPhase(phaseDef.phase);
      setPhaseLabel(phaseDef.label);
      await sleep(phaseDef.durationMs);
    }

    setPhase('running');
    setPhaseLabel('Executing scenarios…');

    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    for (let i = 0; i < initialScenarios.length; i++) {
      if (abortRef.current) return;

      setCurrentRunningIndex(i);
      updateScenario(i, { status: 'running' });

      const scenario = initialScenarios[i];
      const durationMs = scenario.durationMs ?? 1500;
      await sleep(durationMs);

      if (abortRef.current) return;

      let finalStatus: ScenarioStatus;
      if (scenario.failure) {
        const sev = scenario.failure.severity;
        finalStatus = (sev === 'critical' || sev === 'high') ? 'fail' : 'warn';
      } else {
        finalStatus = 'pass';
      }

      updateScenario(i, { status: finalStatus });
      setCompletedCount(i + 1);

      if (finalStatus === 'pass') passCount++;
      else if (finalStatus === 'warn') warnCount++;
      else failCount++;

      await sleep(200);
    }

    setCurrentRunningIndex(null);
    const analyzingPhase = AUDIT_PHASES.find(p => p.phase === 'analyzing')!;
    setPhase('analyzing');
    setPhaseLabel(analyzingPhase.label);
    await sleep(analyzingPhase.durationMs);

    const scoringPhase = AUDIT_PHASES.find(p => p.phase === 'scoring')!;
    setPhase('scoring');
    setPhaseLabel(scoringPhase.label);
    await sleep(scoringPhase.durationMs);

    const auditResult = getAuditResult(agentId);
    setResult(auditResult);
    setPhase('complete');
    setPhaseLabel('Audit complete');
  }, [agentId, updateScenario]);

  const startAudit = React.useCallback(async () => {
    abortRef.current = false;
    setCompletedCount(0);
    setCurrentRunningIndex(null);
    setResult(null);

    if (!IS_LIVE) {
      await startAuditMock();
      return;
    }

    setPhase('initializing');
    setPhaseLabel('Initializing harness…');
    setScenarios([]); // We don't know scenarios beforehand

    try {
      const { runId } = await apiStartAudit(agentId);
      if (abortRef.current) return;

      streamAudit(runId, (event: MessageEvent) => {
        if (abortRef.current) return;
        const data = JSON.parse(event.data);
        
        if (data.type === 'phase_change') {
            setPhase(data.payload.phase);
            setPhaseLabel(data.payload.label);
        } else if (data.type === 'scenario_update') {
            const s = data.payload as ScenarioResult;
            setScenarios(prev => {
                const idx = prev.findIndex(p => p.id === s.id);
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = s;
                    return next;
                }
                return [...prev, s];
            });
            if (s.status === 'pass' || s.status === 'fail' || s.status === 'warn') {
                setCompletedCount(prev => prev + 1);
            }
        } else if (data.type === 'complete') {
            setResult(data.payload);
            setPhase('complete');
            setPhaseLabel('Audit complete');
        }
      }, (err) => {
          console.error('SSE error:', err);
      });
    } catch (err) {
      console.error('Failed to start audit:', err);
      setPhase('idle');
      setPhaseLabel('Error starting audit');
    }
  }, [agentId, startAuditMock]);

  const reset = React.useCallback(() => {
    abortRef.current = true;
    setPhase('idle');
    setPhaseLabel('');
    setScenarios([]);
    setCompletedCount(0);
    setCurrentRunningIndex(null);
    setResult(null);
  }, []);

  const isRunning = phase !== 'idle' && phase !== 'complete';

  return {
    phase,
    phaseLabel,
    scenarios,
    completedCount,
    currentRunningIndex,
    result,
    isRunning,
    startAudit,
    reset,
  };
}
