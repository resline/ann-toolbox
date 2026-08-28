import React from 'react';
import { cn } from '../../lib/cn';

export type CardVariant = 'paper' | 'sunken' | 'outline';

const VARIANT: Record<CardVariant, string> = {
  // domyślnie cienka linia zamiast cienia — cień jest wyjątkiem, nie regułą
  paper: 'bg-surface-raised shadow-hairline',
  sunken: 'bg-surface-sunken',
  outline: 'bg-transparent shadow-hairline',
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  as?: 'div' | 'article' | 'section' | 'li';
}

export const Card: React.FC<CardProps> = ({
  variant = 'paper',
  as: Tag = 'div',
  className,
  children,
  ...rest
}) => (
  <Tag className={cn('rounded-card', VARIANT[variant], className)} {...(rest as React.HTMLAttributes<HTMLElement>)}>
    {children}
  </Tag>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...rest
}) => <div className={cn('px-card pt-card pb-2 flex items-start justify-between gap-3', className)} {...rest} />;

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('px-card py-card', className)} {...rest} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cn('px-card pb-card pt-2 flex items-center gap-2', className)} {...rest} />
);
