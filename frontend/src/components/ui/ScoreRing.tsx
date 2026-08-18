import * as React from 'react';
import { cn } from '@/utils';

interface ScoreRingProps {
  score: number;       // 0–100
  size?: number;       // px
  strokeWidth?: number;
  className?: string;
  label?: string;
}

function scoreToColor(score: number): string {
  if (score >= 90) return 'hsl(142, 72%, 29%)';   // success green
  if (score >= 75) return 'hsl(38, 92%, 50%)';    // warning amber
  return 'hsl(348, 83%, 47%)';                     // danger red
}

export function ScoreRing({ score, size = 120, strokeWidth = 8, className, label }: ScoreRingProps) {
  const [displayed, setDisplayed] = React.useState(0);

  React.useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 900;
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = scoreToColor(score);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(0 0% 16%)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tighter text-primary">{displayed}</span>
        {label && (
          <span className="mt-0.5 text-[10px] font-semibold tracking-widest text-muted uppercase">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
