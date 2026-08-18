import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Agent } from '@/types';
import { getTrend } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Trend } from '@/components/ui/Trend';
import { VerdictBadge } from '@/components/VerdictBadge';
import { CategoryBadge } from '@/components/CategoryBadge';

interface Context { agent: Agent; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

export default function AgentOverview() {
  const { agent } = useOutletContext<Context>();
  const trend = getTrend(agent.id).map(p => ({ ...p, date: formatDate(p.date) }));

  return (
    <div className="space-y-8">

      {/* Top row: score ring + summary cards */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6">
          <ScoreRing score={agent.reliability} size={140} strokeWidth={10} label="Reliability" />
          <Trend value={agent.reliabilityDelta} unit="%" />
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Version', value: agent.currentVersion, mono: true },
            { label: 'Scenarios', value: agent.totalScenarios.toString() },
            { label: 'Last Audit', value: agent.lastAudit ? formatDate(agent.lastAudit.timestamp) : '—', mono: true },
            { label: 'Duration', value: agent.lastAudit ? formatDuration(agent.lastAudit.durationMs) : '—' },
            { label: 'Pass', value: agent.pass.toString(), color: 'text-success' },
            { label: 'Warn', value: agent.warn.toString(), color: 'text-warning' },
            { label: 'Fail', value: agent.fail.toString(), color: 'text-danger' },
            { label: 'Triggered by', value: agent.lastAudit?.triggeredBy ?? '—', mono: true },
          ].map(({ label, value, color, mono }) => (
            <div key={label} className="rounded-lg border border-border/40 bg-background/50 p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className={`mt-1 text-lg font-semibold ${color ?? 'text-primary'} ${mono ? 'font-mono' : ''}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Reliability trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted">
            Reliability Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'hsl(0 0% 60%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fill: 'hsl(0 0% 60%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0 0% 10%)',
                  border: '1px solid hsl(0 0% 16%)',
                  borderRadius: '8px',
                  color: 'hsl(0 0% 98%)',
                  fontSize: '12px',
                }}
                formatter={(v: number) => [`${v}`, 'Reliability']}
              />
              <Line
                type="monotone"
                dataKey="reliability"
                stroke="hsl(142, 72%, 29%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(142, 72%, 29%)', r: 4 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Failure distribution */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          Failure Distribution
        </h3>
        <div className="space-y-3">
          {agent.categoryScores.map(cat => (
            <div key={cat.id} className="flex items-center gap-4 rounded-lg border border-border/30 bg-surface/40 px-4 py-3">
              <CategoryBadge category={cat.id} className="shrink-0 w-28 justify-center" />
              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    cat.score >= 90 ? 'bg-success' : cat.score >= 75 ? 'bg-warning' : 'bg-danger'
                  }`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-sm font-semibold text-primary">{cat.score}</span>
              <Trend value={cat.trend} className="w-16 justify-end" />
              {cat.failures > 0 && (
                <VerdictBadge verdict="fail" className="shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
