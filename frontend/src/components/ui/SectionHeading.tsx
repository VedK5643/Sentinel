import * as React from 'react';
import { cn } from '@/utils';

interface SectionHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  title: string;
  description?: string;
}

export function SectionHeading({ title, description, className, ...props }: SectionHeadingProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      <h2 className="text-2xl font-semibold tracking-tight text-primary">{title}</h2>
      {description && <p className="text-sm text-muted">{description}</p>}
    </div>
  );
}
