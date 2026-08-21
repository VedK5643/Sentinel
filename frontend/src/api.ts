/**
 * api.ts — Sentinel typed API layer
 *
 * All functions return real backend data when VITE_API_URL is set.
 * Without it they fall through to the local mock data layer.
 *
 * Future integration: set VITE_API_URL=https://your-backend.com
 * and each function will switch to live fetch automatically.
 *
 * SSE streaming for audit runs uses the EventSource API:
 *   GET /runs/{run_id}/stream
 * Events arrive as JSON lines:
 *   { type: 'scenario_update', payload: ScenarioResult }
 *   { type: 'phase_change',    payload: { phase, label } }
 *   { type: 'complete',        payload: AuditResult }
 */

import type { Agent, AuditRun, TraceData } from '@/types';
import { MOCK_AGENTS, getAgent as getMockAgent } from '@/data/mockData';
import { getTrace as getMockTrace } from '@/data/simulationData';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
export const IS_LIVE = BASE_URL.length > 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Agents ───────────────────────────────────────────────────────────────────

/** Fetch all registered agents. Falls back to mock data. */
export async function getAgents(): Promise<Agent[]> {
  if (!IS_LIVE) return Promise.resolve(MOCK_AGENTS);
  return apiFetch<Agent[]>('/agents');
}

/** Fetch a single agent by ID. */
export async function getAgent(id: string): Promise<Agent | null> {
  if (!IS_LIVE) return Promise.resolve(getMockAgent(id) ?? null);
  try {
    return await apiFetch<Agent>(`/agents/${id}`);
  } catch {
    return null;
  }
}

// ─── Audits ───────────────────────────────────────────────────────────────────

/** Start a new audit run for an agent. Returns the run ID. */
export async function startAudit(agentId: string): Promise<{ runId: string }> {
  if (!IS_LIVE) {
    // Simulate a run ID — real audit driven by useAuditSimulation hook
    return Promise.resolve({ runId: `run_sim_${agentId}_${Date.now()}` });
  }
  const res = await fetch(`${BASE_URL}/agents/${agentId}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to start audit: ${res.statusText}`);
  return res.json();
}

/** Fetch a completed audit run summary. */
export async function getAudit(runId: string): Promise<AuditRun | null> {
  if (!IS_LIVE) return Promise.resolve(null);
  try {
    return await apiFetch<AuditRun>(`/runs/${runId}`);
  } catch {
    return null;
  }
}

/**
 * Subscribe to live audit run events via Server-Sent Events.
 * The onEvent callback receives raw SSE MessageEvent objects.
 * Returns a cleanup function that closes the connection.
 *
 * Architecture note: The UI (useAuditSimulation) is designed to
 * accept the same { type, payload } message shape from either:
 *   - This live SSE stream   (when IS_LIVE)
 *   - Local simulation loop  (when !IS_LIVE)
 * Switching to live requires only wiring this function.
 */
export function streamAudit(
  runId: string,
  onEvent: (event: MessageEvent) => void,
  onError?: (err: Event) => void
): () => void {
  if (!IS_LIVE) {
    console.info('[Sentinel] streamAudit: running in mock mode — use useAuditSimulation instead');
    return () => {};
  }
  const source = new EventSource(`${BASE_URL}/runs/${runId}/stream`);
  source.onmessage = onEvent;
  if (onError) source.onerror = onError;
  return () => source.close();
}

// ─── Traces ───────────────────────────────────────────────────────────────────

/** Fetch full trace data for a run/trace ID. */
export async function getTrace(traceId: string): Promise<TraceData | null> {
  if (!IS_LIVE) return Promise.resolve(getMockTrace(traceId));
  try {
    return await apiFetch<TraceData>(`/traces/${traceId}`);
  } catch {
    return null;
  }
}

// ─── Scorecards ───────────────────────────────────────────────────────────────

/** Fetch the latest scorecard for an agent (category scores + version history). */
export async function getScorecard(agentId: string): Promise<Agent | null> {
  // Currently the scorecard data lives on the Agent model.
  // When the backend exposes /agents/{id}/scorecard this can be split out.
  return getAgent(agentId);
}

// ─── Agent Upload ─────────────────────────────────────────────────────────────

/** Error type returned when the backend rejects an upload with a 422. */
export class UploadValidationError extends Error {
  constructor(public detail: string) {
    super(detail);
    this.name = 'UploadValidationError';
  }
}

/**
 * Upload a .json config file to register a new agent.
 * Returns the created Agent on success.
 * Throws UploadValidationError on 422 with the backend's error detail.
 */
export async function uploadAgent(file: File): Promise<Agent> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/agents/upload`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — the browser sets the multipart boundary
  });

  if (!res.ok) {
    if (res.status === 422) {
      const body = await res.json().catch(() => null);
      const detail = body?.detail ?? 'Upload rejected — check your JSON format.';
      throw new UploadValidationError(detail);
    }
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<Agent>;
}