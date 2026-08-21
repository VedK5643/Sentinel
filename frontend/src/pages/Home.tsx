import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, GitCompare, ArrowRight, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { AgentCard } from '@/components/AgentCard';
import { Trend } from '@/components/ui/Trend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { UploadAgentModal } from '@/components/UploadAgentModal';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { HARDENED_AGENT, HARDENED_TREND } from '@/data/mockData';
import { getAgents } from '@/api';
import type { Agent } from '@/types';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(0 0% 10%)',
  border: '1px solid hsl(0 0% 16%)',
  borderRadius: '8px',
  color: 'hsl(0 0% 97%)',
  fontSize: '12px',
  boxShadow: 'none',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

import { useQuery } from '@tanstack/react-query';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function Home() {
  const navigate = useNavigate();
  const featured = HARDENED_AGENT;
  const trendData = HARDENED_TREND.map(p => ({ ...p, date: formatDate(p.date) }));
  const [uploadOpen, setUploadOpen] = React.useState(false);
  
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const stats = [
    { label: 'Scenarios Run', value: featured.totalScenarios },
    { label: 'Passed', value: featured.pass, color: 'text-success' },
    { label: 'Warned', value: featured.warn, color: 'text-warning' },
    { label: 'Failed', value: featured.fail, color: 'text-danger' },
  ];

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-10 md:px-8 md:py-16">

      {/* ── Hero ── */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl space-y-5">
          <motion.p
            custom={0} variants={fadeUp} initial="hidden" animate="visible"
            className="text-xs font-semibold uppercase tracking-widest text-muted"
          >
            AI Agent Reliability
          </motion.p>
          <motion.h1
            custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="text-4xl font-bold tracking-tight leading-[1.15] sm:text-5xl"
          >
            Know exactly how your agent fails{' '}
            <span className="text-muted">before your users do.</span>
          </motion.h1>
          <motion.p
            custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="text-base text-muted leading-relaxed"
          >
            Run adversarial tests, inspect every decision, and track reliability across versions.
          </motion.p>
          <motion.div
            custom={3} variants={fadeUp} initial="hidden" animate="visible"
            className="flex flex-wrap items-center gap-3 pt-1"
          >
            <Button
              size="lg"
              onClick={() => navigate('/agents')}
              className="text-sm"
              aria-label="Run a new audit"
            >
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              Run New Audit
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/compare')}
              className="text-sm"
              aria-label="Compare agent versions"
            >
              <GitCompare className="mr-2 h-4 w-4" aria-hidden="true" />
              Compare Versions
            </Button>
          </motion.div>
        </div>

        {/* ── Score Centerpiece ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex shrink-0 flex-col items-center gap-4 lg:pt-4"
        >
          <ScoreRing
            score={featured.reliability}
            size={156}
            strokeWidth={9}
            label="Reliability"
          />
          <div className="text-center">
            <Trend value={featured.reliabilityDelta} unit="%" className="justify-center" />
            <p className="mt-1 text-xs text-muted">vs. previous version</p>
          </div>
        </motion.div>
      </div>

      {/* ── Stats row ── */}
      <div className="mt-12 grid grid-cols-2 gap-3 border-t border-border/40 pt-10 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i} variants={fadeUp} initial="hidden" animate="visible"
            className="rounded-lg border border-border/30 bg-surface/50 px-4 py-3"
          >
            <p className="text-xs text-muted">{stat.label}</p>
            <p
              className={`mt-1.5 text-2xl font-bold tracking-tight ${stat.color ?? 'text-primary'}`}
              aria-label={`${stat.label}: ${stat.value}`}
            >
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Reliability Trend ── */}
      <div className="mt-8">
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted">
                Reliability Trend — {featured.name}
              </CardTitle>
              <span className="font-mono text-[10px] text-muted">{featured.currentVersion}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData} margin={{ top: 2, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(0 0% 55%)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fill: 'hsl(0 0% 55%)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v}`, 'Reliability']}
                  labelFormatter={(l: string) => `Date: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="reliability"
                  stroke="hsl(142, 55%, 36%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 55%, 36%)', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Agent Cards ── */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Agents</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setUploadOpen(true)}
              aria-label="Upload a new agent config"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Upload Agent
            </Button>
            <button
              onClick={() => navigate('/agents')}
              className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-primary"
              aria-label="View all agents"
            >
              View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      <UploadAgentModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={(newAgent) => {
          setAgents(prev => [...prev, newAgent]);
        }}
      />

    </div>
  );
}