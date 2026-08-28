import React from 'react';
import { cn } from '../../lib/cn';

export type TextTone = 'default' | 'muted' | 'faint' | 'accent' | 'module';

const TONE: Record<TextTone, string> = {
  default: 'text-ink',
  muted: 'text-ink-muted',
  faint: 'text-ink-faint',
  accent: 'text-accent-ink',
  module: 'text-module-ink',
};

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3;
  tone?: TextTone;
}

/**
 * Hierarchia idzie rozmiarem i odstępem, nie grubością — stąd maksymalna waga
 * to 600, a nie 700/800.
 */
const HEADING_SIZE: Record<1 | 2 | 3, string> = {
  1: 'text-2xl font-semibold tracking-tight',
  2: 'text-xl font-semibold tracking-tight',
  3: 'text-base font-medium',
};

export const Heading: React.FC<HeadingProps> = ({
  level = 2,
  tone = 'default',
  className,
  children,
  ...rest
}) => {
  const Tag = ({ 1: 'h1', 2: 'h2', 3: 'h3' } as const)[level];
  return (
    <Tag className={cn(HEADING_SIZE[level], TONE[tone], className)} {...rest}>
      {children}
    </Tag>
  );
};

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'xs' | 'sm' | 'base' | 'lg';
  tone?: TextTone;
  as?: 'p' | 'span' | 'div';
}

const TEXT_SIZE = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
} as const;

export const Text: React.FC<TextProps> = ({
  size = 'base',
  tone = 'default',
  as: Tag = 'p',
  className,
  children,
  ...rest
}) => (
  <Tag className={cn(TEXT_SIZE[size], TONE[tone], 'leading-relaxed', className)} {...rest}>
    {children}
  </Tag>
);

export interface LabelTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TextTone;
}

/** Mikroetykieta kapitalikowa — nad liczbą, nad sekcją. */
export const LabelText: React.FC<LabelTextProps> = ({ tone = 'faint', className, children, ...rest }) => (
  <span className={cn('text-2xs font-medium uppercase', TONE[tone], className)} {...rest}>
    {children}
  </span>
);
