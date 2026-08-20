import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileJson, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { uploadAgent, UploadValidationError } from '@/api';
import { cn } from '@/utils';
import type { Agent } from '@/types';

interface UploadAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agent: Agent) => void;
}

const EXAMPLE_JSON = `{
  "name": "MyCustomAgent",
  "system_prompt": "You are a helpful assistant that...",
  "tools": [
    {
      "name": "lookup_order",
      "description": "Look up an order by ID",
      "params": { "order_id": "string" }
    }
  ]
}`;

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function UploadAgentModal({ isOpen, onClose, onSuccess }: UploadAgentModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [state, setState] = React.useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = React.useCallback(() => {
    setFile(null);
    setState('idle');
    setErrorMessage('');
    setDragOver(false);
  }, []);

  React.useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const handleFile = (f: File) => {
    setFile(f);
    setState('idle');
    setErrorMessage('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setState('uploading');
    setErrorMessage('');

    try {
      const agent = await uploadAgent(file);
      setState('success');
      setTimeout(() => {
        onSuccess(agent);
        onClose();
      }, 800);
    } catch (err) {
      setState('error');
      if (err instanceof UploadValidationError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Upload failed unexpectedly.');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Upload agent configuration"
        >
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
                  <Upload className="h-3.5 w-3.5 text-info" />
                </div>
                <h2 className="text-sm font-semibold text-primary">Upload Agent Config</h2>
              </div>
              <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">

              {/* Drop zone */}
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
                  dragOver
                    ? 'border-info bg-info/5'
                    : file
                    ? 'border-success/40 bg-success/5'
                    : 'border-border hover:border-border/80'
                )}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {file ? (
                  <>
                    <FileJson className="mb-2 h-8 w-8 text-success" />
                    <p className="text-sm font-medium text-primary">{file.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {(file.size / 1024).toFixed(1)} KB — click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted" />
                    <p className="text-sm font-medium text-primary">
                      Drop your .json file here
                    </p>
                    <p className="mt-0.5 text-xs text-muted">or click to browse</p>
                  </>
                )}
              </div>

              {/* Example snippet */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-muted hover:text-primary transition-colors select-none">
                  Show expected format
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-primary/80">
                  {EXAMPLE_JSON}
                </pre>
              </details>

              {/* Error message */}
              <AnimatePresence>
                {state === 'error' && errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/5 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                      <p className="text-xs text-danger leading-relaxed whitespace-pre-wrap">
                        {errorMessage}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success message */}
              <AnimatePresence>
                {state === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/5 p-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <p className="text-xs text-success">Agent registered successfully!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!file || state === 'uploading' || state === 'success'}
              >
                {state === 'uploading' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload Agent
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
