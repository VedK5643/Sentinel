import * as React from 'react';
import { cn } from '@/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors premium-focus disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-primary text-background hover:bg-primary/90': variant === 'primary',
            'bg-surface border border-border text-primary hover:bg-border/50': variant === 'secondary',
            'hover:bg-surface text-primary': variant === 'ghost',
            'bg-danger/10 text-danger hover:bg-danger/20 border border-transparent': variant === 'danger',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
