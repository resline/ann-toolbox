import React from 'react';
import { cn } from '../../lib/cn';
import { Heading, Text } from './Text';

/** Rytm pionowy egzekwowany komponentem, a nie dyscypliną przy space-y-*. */
export const Stack: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { gap?: 'xs' | 'sm' | 'md' | 'lg' }
> = ({ gap = 'md', className, ...rest }) => (
  <div
    className={cn(
      'flex flex-col',
      { xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }[gap],
      className
    )}
    {...rest}
  />
);

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  action,
  className,
  children,
  ...rest
}) => (
  <section className={cn('flex flex-col gap-3', className)} {...rest}>
    {(title || action) && (
      <div className="flex items-baseline justify-between gap-3">
        {title ? <Heading level={2}>{title}</Heading> : <span />}
        {action}
      </div>
    )}
    {description ? (
      <Text size="sm" tone="muted">
        {description}
      </Text>
    ) : null}
    {children}
  </section>
);

export const Divider: React.FC<React.HTMLAttributes<HTMLHRElement>> = ({ className, ...rest }) => (
  <hr className={cn('border-0 h-px bg-line', className)} {...rest} />
);

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Stan pusty zawsze mówi, co się stało i co można zrobić.
 * Wcześniej filtr bez wyników dawał po prostu pusty ekran.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => (
  <div className={cn('flex flex-col items-center text-center gap-2 py-10 px-gutter', className)}>
    {icon ? <div className="text-ink-faint mb-1">{icon}</div> : null}
    <Heading level={3} tone="muted">
      {title}
    </Heading>
    {description ? (
      <Text size="sm" tone="faint" className="max-w-xs">
        {description}
      </Text>
    ) : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);
