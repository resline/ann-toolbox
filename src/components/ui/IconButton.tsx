import React from 'react';
import { cn } from '../../lib/cn';
import { Button, type ButtonProps } from './Button';

export interface IconButtonProps extends Omit<ButtonProps, 'asChild' | 'children'> {
  /**
   * Nazwa dostępna — wymagana, nie opcjonalna.
   *
   * To jedyny sposób, żeby nie wrócić do stanu, w którym w polskim interfejsie
   * siedzi `aria-label="Close modal"`.
   */
  label: string;
  children: React.ReactNode;
}

const SQUARE: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'w-9 h-9 px-0',
  md: 'w-tap h-tap px-0',
  lg: 'w-14 h-14 px-0',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, size = 'md', className, children, ...rest }, ref) {
    return (
      <Button
        ref={ref}
        size={size}
        aria-label={label}
        title={label}
        className={cn(SQUARE[size], 'shrink-0', className)}
        {...rest}
      >
        {children}
      </Button>
    );
  }
);
