import type { Agent, AgentVersion, AuditRun, CategoryScore, ReliabilityPoint } from '@/types';

// ─── Category Templates ───────────────────────────────────────────────────────

const CATEGORIES = [
  'Injection Resistance',
  'Destructive Actions',
  'Tool Call Loops',
  'Hallucinated Success',
  'Goal Drift',
] as const;

function makeCategoryId(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_');
}

// ─── SupportBot-Fragile Categories ───────────────────────────────────────────

const fragileCategoryScores: CategoryScore[] = [
  {
    id: makeCategoryId('Injection Resistance'),
    name: 'Injection Resistance',
    score: 61,
    trend: -4,
    scenariosTested: 24,
    failures: 6,
    warns: 4,
  },
  {
    id: makeCategoryId('Destructive Actions'),
    name: 'Destructive Actions',
    score: 78,
    trend: +2,
    scenariosTested: 18,
    failures: 2,
    warns: 3,
  },
  {
    id: makeCategoryId('Tool Call Loops'),
    name: 'Tool Call Loops',
    score: 55,
    trend: -11,
    scenariosTested: 20,
    failures: 7,
    warns: 5,
  },
  {
    id: makeCategoryId('Hallucinated Success'),
    name: 'Hallucinated Success',
    score: 72,
    trend: +1,
    scenariosTested: 22,
    failures: 3,
    warns: 4,
  },
  {
    id: makeCategoryId('Goal Drift'),
    name: 'Goal Drift',
    score: 66,
    trend: -5,
    scenariosTested: 20,
    failures: 4,
    warns: 4,
  },
];

const fragileVersions: AgentVersion[] = [
  {
    version: 'v1.0',
    date: '2026-06-15',
    reliability: 74,
    regression: false,
    categories: fragileCategoryScores.map(c => ({ ...c, score: c.score - 4, trend: 0 })),
  },
  {
    version: 'v1.1',
    date: '2026-06-28',
    reliability: 71,
    regression: true,
    categories: fragileCategoryScores.map(c => ({ ...c, score: c.score - 7, trend: -3 })),
  },
  {
    version: 'v1.2',
    date: '2026-07-10',
    reliability: 75,
    regression: false,
    categories: fragileCategoryScores.map(c => ({ ...c, score: c.score - 2, trend: +4 })),
  },
  {
    version: 'v1.3',
    date: '2026-07-25',
    reliability: 66,
    regression: true,
    categories: fragileCategoryScores.map(c => ({ ...c, score: c.score - 10, trend: -9 })),
  },
];

const fragileLastAudit: AuditRun = {
  runId: 'run_frag_0401',
  agentId: 'supportbot-fragile',
  timestamp: '2026-08-17T14:22:00Z',
  durationMs: 47200,
  totalScenarios: 104,
  pass: 58,
  warn: 20,
  fail: 26,
  reliability: 66,
  triggeredBy: 'ci/cd push',
};

export const FRAGILE_AGENT: Agent = {
  id: 'supportbot-fragile',
  name: 'SupportBot-Fragile',
  description: 'Customer support agent with minimal guardrails. Susceptible to injection, goal drift, and tool loops under adversarial conditions.',
  status: 'degraded',
  currentVersion: 'v1.3',
  reliability: 66,
  reliabilityDelta: -9,
  totalScenarios: 104,
  pass: 58,
  warn: 20,
  fail: 26,
  categoryScores: fragileCategoryScores,
  versions: fragileVersions,
  lastAudit: fragileLastAudit,
  createdAt: '2026-06-10T09:00:00Z',
};

// ─── SupportBot-Hardened Categories ──────────────────────────────────────────

const hardenedCategoryScores: CategoryScore[] = [
  {
    id: makeCategoryId('Injection Resistance'),
    name: 'Injection Resistance',
    score: 97,
    trend: +3,
    scenariosTested: 24,
    failures: 0,
    warns: 1,
  },
  {
    id: makeCategoryId('Destructive Actions'),
    name: 'Destructive Actions',
    score: 100,
    trend: 0,
    scenariosTested: 18,
    failures: 0,
    warns: 0,
  },
  {
    id: makeCategoryId('Tool Call Loops'),
    name: 'Tool Call Loops',
    score: 88,
    trend: +5,
    scenariosTested: 20,
    failures: 1,
    warns: 2,
  },
  {
    id: makeCategoryId('Hallucinated Success'),
    name: 'Hallucinated Success',
    score: 94,
    trend: +2,
    scenariosTested: 22,
    failures: 0,
    warns: 2,
  },
  {
    id: makeCategoryId('Goal Drift'),
    name: 'Goal Drift',
    score: 91,
    trend: +4,
    scenariosTested: 20,
    failures: 1,
    warns: 1,
  },
];

const hardenedVersions: AgentVersion[] = [
  {
    version: 'v2.1',
    date: '2026-07-01',
    reliability: 82,
    regression: false,
    categories: hardenedCategoryScores.map(c => ({ ...c, score: Math.max(c.score - 12, 60), trend: 0 })),
  },
  {
    version: 'v2.2',
    date: '2026-07-14',
    reliability: 87,
    regression: false,
    categories: hardenedCategoryScores.map(c => ({ ...c, score: Math.max(c.score - 7, 70), trend: +5 })),
  },
  {
    version: 'v2.3',
    date: '2026-07-28',
    reliability: 84,
    regression: true,
    categories: hardenedCategoryScores.map(c => ({ ...c, score: Math.max(c.score - 10, 65), trend: -3 })),
  },
  {
    version: 'v2.4',
    date: '2026-08-12',
    reliability: 94,
    regression: false,
    categories: hardenedCategoryScores,
  },
];

const hardenedLastAudit: AuditRun = {
  runId: 'run_hard_0522',
  agentId: 'supportbot-hardened',
  timestamp: '2026-08-17T18:05:00Z',
  durationMs: 52100,
  totalScenarios: 104,
  pass: 92,
  warn: 6,
  fail: 6,
  reliability: 94,
  triggeredBy: 'manual trigger',
};

export const HARDENED_AGENT: Agent = {
  id: 'supportbot-hardened',
  name: 'SupportBot-Hardened',
  description: 'Production-grade support agent with comprehensive guardrails, input sanitisation, and loop detection. Stable under adversarial load.',
  status: 'active',
  currentVersion: 'v2.4',
  reliability: 94,
  reliabilityDelta: +6.2,
  totalScenarios: 104,
  pass: 92,
  warn: 6,
  fail: 6,
  categoryScores: hardenedCategoryScores,
  versions: hardenedVersions,
  lastAudit: hardenedLastAudit,
  createdAt: '2026-06-25T11:30:00Z',
};

// ─── All Agents ───────────────────────────────────────────────────────────────

export const MOCK_AGENTS: Agent[] = [HARDENED_AGENT, FRAGILE_AGENT];

// ─── Reliability Trend Data ───────────────────────────────────────────────────

export const HARDENED_TREND: ReliabilityPoint[] = hardenedVersions.map(v => ({
  date: v.date,
  reliability: v.reliability,
  version: v.version,
}));

export const FRAGILE_TREND: ReliabilityPoint[] = fragileVersions.map(v => ({
  date: v.date,
  reliability: v.reliability,
  version: v.version,
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

export function getAgent(id: string): Agent | undefined {
  return MOCK_AGENTS.find(a => a.id === id);
}

export function getTrend(id: string): ReliabilityPoint[] {
  if (id === 'supportbot-hardened') return HARDENED_TREND;
  if (id === 'supportbot-fragile') return FRAGILE_TREND;
  return [];
}
