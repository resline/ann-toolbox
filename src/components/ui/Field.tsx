import React, { useId } from 'react';
import { cn } from '../../lib/cn';
import { Text } from './Text';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** Ukryj etykietę wizualnie, zostawiając ją czytnikowi ekranu. */
  hideLabel?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => React.ReactNode;
}

/**
 * Spina etykietę, podpowiedź i błąd z polem.
 *
 * Dzięki temu `aria-describedby` i `aria-invalid` nigdy nie zależą od tego,
 * czy ktoś pamiętał je dopisać.
 */
export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  hideLabel = false,
  className,
  children,
}) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error ? (
        <Text id={hintId} size="xs" tone="faint" as="span">
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text id={errorId} size="xs" as="span" className="text-attention-ink">
          {error}
        </Text>
      ) : null}
    </div>
  );
};

const CONTROL_BASE =
  'w-full bg-surface-raised text-ink placeholder:text-ink-faint rounded-control ' +
  'shadow-hairline px-3 transition-shadow ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))] ' +
  'aria-[invalid=true]:shadow-[0_0_0_1px_rgb(var(--attention))]';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL_BASE, 'min-h-tap', className)} {...rest} />;
  }
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(CONTROL_BASE, 'py-2.5 min-h-[6rem]', className)} {...rest} />;
});
