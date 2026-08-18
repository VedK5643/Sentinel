import * as React from 'react';
import { cn } from '@/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendProps {
  value: number;
  unit?: string;
  className?: string;
}

export function Trend({ value, unit = '', className }: TrendProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isNeutral ? 'text-muted' : isPositive ? 'text-success' : 'text-danger',
        className
      )}
    >
      {isNeutral ? (
        <Minus className="h-3.5 w-3.5" />
      ) : isPositive ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      {isNeutral ? '—' : `${isPositive ? '+' : ''}${value}${unit}`}
    </span>
  );
}
