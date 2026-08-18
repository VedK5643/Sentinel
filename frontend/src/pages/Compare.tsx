import * as React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import { FRAGILE_AGENT, HARDENED_AGENT } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trend } from '@/components/ui/Trend';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(0 0% 10%)',
  border: '1px solid hsl(0 0% 16%)',
  borderRadius: '8px',
  color: 'hsl(0 0% 98%)',
  fontSize: '12px',
};

function scoreColor(score: number) {
  if (score >= 90) return 'hsl(142, 72%, 29%)';
  if (score >= 75) return 'hsl(38, 92%, 50%)';
  return 'hsl(348, 83%, 47%)';
}

export default function Compare() {
  const a = HARDENED_AGENT;
  const b = FRAGILE_AGENT;

  const compareRows = a.categoryScores.map((cat, i) => ({
    name: cat.name,
    [a.name]: cat.score,
    [b.name]: b.categoryScores[i]?.score ?? 0,
  }));

  const radarData = a.categoryScores.map((cat, i) => ({
    subject: cat.name.split(' ')[0],
    [a.name]: cat.score,
    [b.name]: b.categoryScores[i]?.score ?? 0,
    fullMark: 100,
  }));

  const categories = a.categoryScores.map((cat, i) => ({
    name: cat.name,
    aScore: cat.score,
    bScore: b.categoryScores[i]?.score ?? 0,
    aTrend: cat.trend,
    bTrend: b.categoryScores[i]?.trend ?? 0,
  }));

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 md:px-8">

      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Compare</p>
        <h1 className="text-3xl font-bold tracking-tight">Agent Reliability Comparison</h1>
      </div>

      {/* Agents side by side */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-[1fr_auto_1fr]">
        {/* Hardened */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="mb-1 font-mono text-xs text-muted">{a.currentVersion}</p>
          <h2 className="text-lg font-semibold text-primary">{a.name}</h2>
          <div
            className="mt-3 text-5xl font-bold tracking-tighter"
            style={{ color: scoreColor(a.reliability) }}
          >
            {a.reliability}
          </div>
          <Trend value={a.reliabilityDelta} unit="%" className="mt-1" />
        </div>

        {/* VS label */}
        <div className="hidden md:flex items-center justify-center">
          <span className="text-2xl font-bold text-muted/40">vs</span>
        </div>

        {/* Fragile */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="mb-1 font-mono text-xs text-muted">{b.currentVersion}</p>
          <h2 className="text-lg font-semibold text-primary">{b.name}</h2>
          <div
            className="mt-3 text-5xl font-bold tracking-tighter"
            style={{ color: scoreColor(b.reliability) }}
          >
            {b.reliability}
          </div>
          <Trend value={b.reliabilityDelta} unit="%" className="mt-1" />
        </div>
      </div>

      {/* Category comparison table */}
      <div className="mb-10 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr] border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted">
          <span>Category</span>
          <span className="text-center">{a.name.split('-')[1]}</span>
          <span className="text-center">{b.name.split('-')[1]}</span>
        </div>
        {categories.map(cat => {
          const diff = cat.aScore - cat.bScore;
          return (
            <div
              key={cat.name}
              className="grid grid-cols-[2fr_1fr_1fr] items-center border-b border-border/40 px-5 py-3 last:border-0 hover:bg-background/40 transition-colors"
            >
              <span className="text-sm text-primary">{cat.name}</span>
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{ color: scoreColor(cat.aScore) }}
                >
                  {cat.aScore}
                </span>
                <Trend value={cat.aTrend} className="text-xs" />
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{ color: scoreColor(cat.bScore) }}
                >
                  {cat.bScore}
                </span>
                <Trend value={cat.bTrend} className="text-xs" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted">
            Category Score Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={compareRows}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(0 0% 60%)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => v.split(' ')[0]}
              />
              <YAxis domain={[0, 100]} tick={{ fill: 'hsl(0 0% 60%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey={a.name} fill="hsl(142, 72%, 29%)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey={b.name} fill="hsl(348, 83%, 47%)" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted">
            Radar Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="hsl(0 0% 16%)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(0 0% 60%)', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(0 0% 60%)', fontSize: 10 }} />
              <Radar
                name={a.name}
                dataKey={a.name}
                stroke="hsl(142, 72%, 29%)"
                fill="hsl(142, 72%, 29%)"
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
              <Radar
                name={b.name}
                dataKey={b.name}
                stroke="hsl(348, 83%, 47%)"
                fill="hsl(348, 83%, 47%)"
                fillOpacity={0.12}
                strokeWidth={1.5}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
