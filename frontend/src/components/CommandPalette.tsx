import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Home, Bot, BarChart2, GitCompare,
  Play, FileText, Layers,
} from 'lucide-react';
import { cn } from '@/utils';
import { MOCK_AGENTS } from '@/data/mockData';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.FC<{ className?: string }>;
  path: string;
  group: string;
}

const STATIC_COMMANDS: Command[] = [
  {
    id: 'overview', label: 'Overview',
    description: 'Go to dashboard',
    icon: Home, path: '/', group: 'Navigate',
  },
  {
    id: 'agents', label: 'All Agents',
    description: 'Browse registered agents',
    icon: Bot, path: '/agents', group: 'Navigate',
  },
  {
    id: 'compare', label: 'Compare Agents',
    description: 'View side-by-side reliability',
    icon: GitCompare, path: '/compare', group: 'Navigate',
  },
];

function buildAgentCommands(): Command[] {
  const cmds: Command[] = [];
  for (const agent of MOCK_AGENTS) {
    cmds.push({
      id: `audit-${agent.id}`,
      label: `Run Audit — ${agent.name}`,
      description: `Start adversarial audit for ${agent.currentVersion}`,
      icon: Play,
      path: `/agents/${agent.id}/audits`,
      group: 'Actions',
    });
    cmds.push({
      id: `scorecard-${agent.id}`,
      label: `Scorecard — ${agent.name}`,
      description: 'View reliability scorecard',
      icon: BarChart2,
      path: `/agents/${agent.id}/scorecard`,
      group: 'Actions',
    });
    cmds.push({
      id: `traces-${agent.id}`,
      label: `Traces — ${agent.name}`,
      description: 'Browse execution traces',
      icon: FileText,
      path: `/agents/${agent.id}/traces`,
      group: 'Actions',
    });
  }
  cmds.push({
    id: 'trace-frag',
    label: 'Open Injection Trace (Fragile)',
    description: 'View the flagship injection failure trace',
    icon: Layers,
    path: '/trace/trace-frag-injection',
    group: 'Traces',
  });
  cmds.push({
    id: 'trace-hard',
    label: 'Open Injection Trace (Hardened)',
    description: 'View how the hardened agent handled injection',
    icon: Layers,
    path: '/trace/trace-hard-injection',
    group: 'Traces',
  });
  return cmds;
}

const ALL_COMMANDS: Command[] = [...STATIC_COMMANDS, ...buildAgentCommands()];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS;
    const q = query.toLowerCase();
    return ALL_COMMANDS.filter(
      cmd =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filteredCommands) {
      const arr = map.get(cmd.group) ?? [];
      arr.push(cmd);
      map.set(cmd.group, arr);
    }
    return map;
  }, [filteredCommands]);

  const flatList = filteredCommands;

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(flatList.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + Math.max(flatList.length, 1)) % Math.max(flatList.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = flatList[selectedIndex];
      if (cmd) { navigate(cmd.path); onClose(); }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const execute = (cmd: Command) => {
    navigate(cmd.path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center border-b border-border px-4 py-3.5">
              <Search className="mr-3 h-4 w-4 shrink-0 text-muted" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
                placeholder="Search commands, agents, traces…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-autocomplete="list"
                aria-haspopup="listbox"
              />
              <kbd className="ml-3 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
                ESC
              </kbd>
            </div>

            <div className="max-h-[360px] overflow-y-auto py-2" role="listbox">
              {flatList.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                Array.from(grouped.entries()).map(([group, cmds]) => (
                  <div key={group}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                      {group}
                    </p>
                    {cmds.map(cmd => {
                      const Icon = cmd.icon;
                      const flatIdx = flatList.indexOf(cmd);
                      const isSelected = flatIdx === selectedIndex;
                      return (
                        <div
                          key={cmd.id}
                          role="option"
                          aria-selected={isSelected}
                          className={cn(
                            'mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                            isSelected
                              ? 'bg-border/80 text-primary'
                              : 'text-primary/70 hover:bg-border/40 hover:text-primary'
                          )}
                          onClick={() => execute(cmd)}
                          onMouseEnter={() => setSelectedIndex(flatIdx)}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted" />
                          <div className="flex-1 min-w-0">
                            <span className="block truncate">{cmd.label}</span>
                            {cmd.description && (
                              <span className="block truncate text-xs text-muted">
                                {cmd.description}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
                              ↵
                            </kbd>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border px-4 py-2 flex items-center gap-4">
              <span className="text-[10px] text-muted">
                <kbd className="font-mono">↑↓</kbd> navigate
              </span>
              <span className="text-[10px] text-muted">
                <kbd className="font-mono">↵</kbd> open
              </span>
              <span className="text-[10px] text-muted ml-auto">
                {flatList.length} result{flatList.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
