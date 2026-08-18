// ─── Core Domain Types ───────────────────────────────────────────────────────

export type Verdict = 'pass' | 'warn' | 'fail';
export type AgentStatus = 'active' | 'inactive' | 'degraded';

export interface CategoryScore {
  id: string;
  name: string;
  score: number;
  trend: number;
  scenariosTested: number;
  failures: number;
  warns: number;
}

export interface AgentVersion {
  version: string;
  date: string;
  reliability: number;
  categories: CategoryScore[];
  regression: boolean;
}

export interface AuditRun {
  runId: string;
  agentId: string;
  timestamp: string;
  durationMs: number;
  totalScenarios: number;
  pass: number;
  warn: number;
  fail: number;
  reliability: number;
  triggeredBy: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  currentVersion: string;
  reliability: number;
  reliabilityDelta: number;
  totalScenarios: number;
  pass: number;
  warn: number;
  fail: number;
  categoryScores: CategoryScore[];
  versions: AgentVersion[];
  lastAudit: AuditRun | null;
  createdAt: string;
}

export interface ReliabilityPoint {
  date: string;
  reliability: number;
  version: string;
}

// ─── Audit Simulation Types ───────────────────────────────────────────────────

export type ScenarioStatus = 'pending' | 'running' | 'pass' | 'warn' | 'fail';
export type AuditPhase =
  | 'idle'
  | 'initializing'
  | 'generating'
  | 'sandbox'
  | 'running'
  | 'analyzing'
  | 'scoring'
  | 'complete';

export interface FailureDetail {
  category: string;
  categoryId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  callCount?: number;
  expected: string;
  observed: string;
  confidence: number;
  injectionDetected?: boolean;
  injectionSnippet?: string;
}

export interface ScenarioResult {
  id: string;
  index: number;
  title: string;
  categoryId: string;
  categoryName: string;
  status: ScenarioStatus;
  durationMs?: number;
  traceId?: string;
  failure?: FailureDetail;
}

// ─── Trace Types ──────────────────────────────────────────────────────────────

export type TraceRole = 'user' | 'agent' | 'tool_call' | 'tool_response' | 'warning' | 'failure';

export interface TraceEvent {
  id: string;
  role: TraceRole;
  timestamp: string;
  content: string;
  toolName?: string;
  toolArgs?: string;       // JSON string
  toolResult?: string;     // JSON string
  injectionHighlight?: boolean;
  injectionSnippet?: string;
}

export interface TraceData {
  traceId: string;
  scenarioId: string;
  scenarioTitle: string;
  agentId: string;
  agentName: string;
  verdict: Verdict;
  failure?: FailureDetail;
  events: TraceEvent[];
}
