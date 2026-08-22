import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Printer } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { Agent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trend } from '@/components/ui/Trend';
import { VerdictBadge } from '@/components/VerdictBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils';

interface Context { agent: Agent; }

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(0 0% 10%)',
  border: '1px solid hsl(0 0% 16%)',
  borderRadius: '8px',
  color: 'hsl(0 0% 98%)',
  fontSize: '12px',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Scorecard() {
  const { agent } = useOutletContext<Context>();
  const trend = agent.versions.map(v => ({
    date: formatDate(v.date),
    reliability: v.reliability,
    version: v.version,
  }));

  const radarData = agent.categoryScores.map(c => ({
    subject: c.name.replace(' ', '\n'),
    score: c.score,
    fullMark: 100,
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Scorecard
        </Button>
      </div>

      {/* ── Category Scores – primary ── */}
      <div>
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted">
          Category Scores
        </h2>
        <div className="space-y-4">
          {agent.categoryScores.map(cat => {
            const verdict =
              cat.failures > 2 ? 'fail' : cat.failures > 0 || cat.warns > 2 ? 'warn' : 'pass';
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-primary">{cat.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {cat.scenariosTested} scenarios · {cat.failures} fail · {cat.warns} warn
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Trend value={cat.trend} />
                    <VerdictBadge verdict={verdict} />
                    <span className="text-2xl font-bold tracking-tighter text-primary">{cat.score}</span>
                  </div>
                </div>
                <ProgressBar
                  value={cat.score}
                  indicatorColor={
                    cat.score >= 90 ? 'bg-success' : cat.score >= 75 ? 'bg-warning' : 'bg-danger'
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Reliability History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted">
            Reliability History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(0 0% 60%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'hsl(0 0% 60%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}`, 'Reliability']} />
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
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 text-center">
              <p className="text-sm font-medium text-muted">No history available</p>
              <p className="text-xs text-muted/70">Run an audit to generate history.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Radar – secondary ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted">
            Category Coverage (Radar)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="hsl(0 0% 16%)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: 'hsl(0 0% 60%)', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: 'hsl(0 0% 60%)', fontSize: 10 }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(142, 72%, 29%)"
                fill="hsl(142, 72%, 29%)"
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}`, 'Score']} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Version History ── */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          Version History
        </h2>
        <div className="space-y-2">
          {agent.versions.length === 0 ? (
            <div className="flex h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 text-center">
              <p className="text-sm font-medium text-muted">No versions available</p>
              <p className="text-xs text-muted/70">Run an audit to generate history.</p>
            </div>
          ) : (
            [...agent.versions].reverse().map(ver => (
            <div
              key={ver.version}
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                ver.regression
                  ? 'border-danger/30 bg-danger/5'
                  : 'border-border/40 bg-surface/40'
              )}
            >
              <div className="flex items-center gap-4">
                <span className="w-12 font-mono text-sm font-semibold text-primary">{ver.version}</span>
                <span className="text-xs text-muted">
                  {new Date(ver.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {ver.regression && (
                  <span className="rounded border border-danger/30 bg-danger/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-danger">
                    Regression
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-4">
                  {ver.categories.slice(0, 3).map(c => (
                    <div key={c.id} className="text-center">
                      <p className="font-mono text-xs font-semibold text-primary">{c.score}</p>
                      <p className="text-[10px] text-muted capitalize">{c.id.split('_')[0]}</p>
                    </div>
                  ))}
                </div>
                <span
                  className={cn(
                    'text-xl font-bold tracking-tighter',
                    ver.reliability >= 90 ? 'text-success' :
                    ver.reliability >= 75 ? 'text-warning' : 'text-danger'
                  )}
                >
                  {ver.reliability}
                </span>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}