import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  /** Identyfikator testowy zakładki — zawsze ze stałej modułu, nigdy literał. */
  testId?: string;
}

export interface SegmentedTabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
  label: string;
  /** Blokuje przełączanie — np. gdy zmiana trybu w trakcie pracy nie ma sensu. */
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Segmentowany przełącznik — zawsze w jednym rzędzie, także na najwęższym
 * telefonie. Poprzednia wersja układała trzy kafle jeden pod drugim aż do
 * breakpointu `sm`, przez co licznik lądował daleko pod zgięciem ekranu.
 */
export function SegmentedTabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  disabled = false,
  className,
  children,
}: SegmentedTabsProps<T>) {
  return (
    <RadixTabs.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className={cn('w-full', className)}
    >
      <RadixTabs.List
        aria-label={label}
        className="grid gap-1 p-1 rounded-control bg-surface-sunken"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            data-testid={item.testId}
            disabled={disabled}
            className={cn(
              'flex items-center justify-center gap-1.5 min-h-[2.75rem] px-2 rounded-[calc(var(--radius-control)-2px)]',
              'text-sm font-medium text-ink-muted transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]',
              'data-[state=active]:bg-surface-raised data-[state=active]:text-module-ink data-[state=active]:shadow-hairline',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;
