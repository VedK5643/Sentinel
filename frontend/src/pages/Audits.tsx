import * as React from 'react';
import { SectionHeading } from '@/components/ui/SectionHeading';

export default function Audits() {
  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      <SectionHeading title="Audits" description="Review adversarial test runs for this agent." />
      <div className="mt-8 flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-surface/50">
        <p className="text-muted">Audits view coming soon...</p>
      </div>
    </div>
  );
}
