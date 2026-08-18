import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils';
import type { TraceEvent, TraceRole } from '@/types';

// ─── Tool Call Block ──────────────────────────────────────────────────────────

export function ToolCallBlock({
  toolName,
  args,
  result,
  timestamp,
  role,
}: {
  toolName: string;
  args?: string;
  result?: string;
  timestamp: string;
  role: TraceRole;
}) {
  const [expanded, setExpanded] = React.useState(true);

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const isCall = role === 'tool_call';

  return (
    <div className="rounded-lg border border-border bg-background font-mono text-xs overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className={cn(
            'rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            isCall
              ? 'bg-info/15 text-info'
              : 'bg-success/15 text-success'
          )}>
            {isCall ? 'CALL' : 'RESPONSE'}
          </span>
          <span className="text-primary font-semibold">{toolName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted">{timestamp}</span>
          <button
            onClick={e => {
              e.stopPropagation();
              copy(args ?? result ?? '');
            }}
            className="text-muted hover:text-primary transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted" />
          }
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="border-t border-border bg-background px-4 py-3 text-[11px] leading-relaxed text-primary/80 overflow-x-auto whitespace-pre-wrap">
              {args ?? result}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Injection Highlight Block ────────────────────────────────────────────────

export function InjectionHighlight({ snippet }: { snippet: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-danger" />
        <span className="text-xs font-bold uppercase tracking-widest text-danger">
          Injection Detected
        </span>
      </div>
      <pre className="font-mono text-[11px] leading-relaxed text-danger/90 whitespace-pre-wrap">
        {snippet}
      </pre>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-danger/20 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Category</p>
          <p className="mt-0.5 text-xs text-primary">Injection Susceptibility</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Severity</p>
          <p className="mt-0.5 text-xs font-semibold text-danger">Critical</p>
        </div>
      </div>
    </motion.div>
  );
}
