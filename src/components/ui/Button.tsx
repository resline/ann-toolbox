import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from '../../lib/icons';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'ghost';
export type ButtonTone = 'accent' | 'module' | 'neutral' | 'attention';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
  /** Renderuj jako dziecko (np. <a>), zachowując style i zachowanie. */
  asChild?: boolean;
}

/*
 * `text-canvas` na solidnym tle nie jest skrótem — canvas jest jasny w motywie
 * dziennym i ciemny w nocnych, więc kontrast dopasowuje się sam, bez osobnego
 * tokenu kontrastu dla każdego z czterech akcentów modułów.
 * Progi pilnuje src/design/tokens.test.ts.
 */
const TONE_SOLID: Record<ButtonTone, string> = {
  accent: 'bg-accent hover:bg-accent-hover active:bg-accent-active text-canvas',
  module: 'bg-module text-canvas hover:opacity-90 active:opacity-80',
  neutral: 'bg-ink text-canvas hover:opacity-90 active:opacity-80',
  attention: 'bg-attention text-canvas hover:opacity-90 active:opacity-80',
};

const TONE_SOFT: Record<ButtonTone, string> = {
  accent: 'bg-accent-soft text-accent-ink hover:brightness-[0.97] active:brightness-95',
  module: 'bg-module-soft text-module-ink hover:brightness-[0.97] active:brightness-95',
  neutral: 'bg-surface-sunken text-ink hover:bg-surface-hover active:bg-surface-active',
  attention: 'bg-attention-soft text-attention-ink hover:brightness-[0.97] active:brightness-95',
};

const TONE_TEXT: Record<ButtonTone, string> = {
  accent: 'text-accent-ink',
  module: 'text-module-ink',
  neutral: 'text-ink-muted',
  attention: 'text-attention-ink',
};

const SIZE: Record<ButtonSize, string> = {
  // sm celowo poniżej --tap: wyłącznie do zagęszczonych pasków akcji,
  // nigdy jako pojedynczy cel dotykowy
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-control',
  md: 'min-h-tap px-4 text-base gap-2 rounded-control',
  lg: 'min-h-[3.5rem] px-6 text-lg gap-2.5 rounded-card w-full',
};

const BASE =
  'inline-flex items-center justify-center font-medium select-none ' +
  'transition-[background-color,color,opacity,filter] duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    tone = 'accent',
    size = 'md',
    loading = false,
    asChild = false,
    className,
    children,
    disabled,
    type,
    ...rest
  },
  ref
) {
  const look =
    variant === 'primary'
      ? TONE_SOLID[tone]
      : variant === 'secondary'
      ? TONE_SOFT[tone]
      : variant === 'quiet'
      ? cn('bg-transparent shadow-hairline', TONE_TEXT[tone], 'hover:bg-surface-hover active:bg-surface-active')
      : cn('bg-transparent', TONE_TEXT[tone], 'hover:bg-surface-hover active:bg-surface-active');

  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type ?? 'button'}
      className={cn(BASE, SIZE[size], look, className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {asChild ? children : (
        <>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
          {children}
        </>
      )}
    </Comp>
  );
});
