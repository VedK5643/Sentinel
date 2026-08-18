import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, Zap, X } from 'lucide-react';
import { cn } from '@/utils';

interface DemoStep {
  label: string;
  description: string;
  path: string;
  agentId?: string;
  action?: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    label: 'Fragile Agent',
    description: 'Inspect SupportBot-Fragile — a vulnerable agent.',
    path: '/agents/supportbot-fragile',
  },
  {
    label: 'Run Audit',
    description: 'Start an adversarial audit and watch scenarios execute.',
    path: '/agents/supportbot-fragile/audits',
    action: 'audit',
  },
  {
    label: 'Injection Failure',
    description: 'See how the agent fails the injection scenario.',
    path: '/trace/trace-frag-injection',
  },
  {
    label: 'Hardened Agent',
    description: 'Switch to SupportBot-Hardened — the protected version.',
    path: '/agents/supportbot-hardened',
  },
  {
    label: 'Run Audit Again',
    description: 'The hardened agent passes the same injection scenario.',
    path: '/agents/supportbot-hardened/audits',
    action: 'audit',
  },
  {
    label: 'Compare',
    description: 'See the delta between both agents side by side.',
    path: '/compare',
  },
];

interface DemoBannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoBanner({ isOpen, onClose }: DemoBannerProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = React.useState(0);

  const step = DEMO_STEPS[currentStep];

  const handleNext = () => {
    navigate(step.path);
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-6 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4"
      >
        <div className="rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50 p-5 backdrop-blur">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-info/20">
                <Zap className="h-3.5 w-3.5 text-info" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-info">Demo Mode</span>
            </div>
            <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Steps */}
          <div className="mb-4 flex gap-1.5">
            {DEMO_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-0.5 rounded-full transition-colors',
                  i <= currentStep ? 'bg-info' : 'bg-border'
                )}
              />
            ))}
          </div>

          <div className="mb-4">
            <p className="text-base font-semibold text-primary">{step.label}</p>
            <p className="mt-1 text-sm text-muted">{step.description}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted">
              Step {currentStep + 1} of {DEMO_STEPS.length}
            </span>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary/90"
            >
              {currentStep === DEMO_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
