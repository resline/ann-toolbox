import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'module' | 'positive' | 'caution' | 'attention';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted',
  accent: 'bg-accent-soft text-accent-ink',
  module: 'bg-module-soft text-module-ink',
  positive: 'bg-positive-soft text-positive-ink',
  caution: 'bg-caution-soft text-caution-ink',
  attention: 'bg-attention-soft text-attention-ink',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className, children, ...rest }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
      TONE[tone],
      className
    )}
    {...rest}
  >
    {children}
  </span>
);
