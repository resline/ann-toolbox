import React from 'react';
import { ChevronRight } from '../lib/icons';
import { cn } from '../lib/cn';
import { modules, teraz } from '../copy';
import { Text } from '../components/ui';
import { Link } from './router';
import { ROUTES, type ModuleKey } from './routes';
import { terazIds } from './testIds';
import { useModuleStates } from './useModuleStates';

function greetingFor(hour: number): string {
  if (hour < 5) return teraz.greetingNight;
  if (hour < 12) return teraz.greetingMorning;
  if (hour < 18) return teraz.greetingDay;
  if (hour < 23) return teraz.greetingEvening;
  return teraz.greetingNight;
}

const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export interface NowScreenProps {
  now?: Date;
}

/**
 * Ekran startowy pokazuje stan, nie reklamę.
 *
 * Wcześniej było tu powitanie z emoji, trzy kafle w trzech różnych kolorach i
 * cztery karty z opisem, którego nikt nie czyta po drugim uruchomieniu. Teraz
 * podtytuł każdego wejścia mówi, co się w nim właśnie dzieje.
 */
export const NowScreen: React.FC<NowScreenProps> = ({ now = new Date() }) => {
  const states = useModuleStates();
  const entries = ROUTES.filter((r) => r.module !== null);

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-col gap-1 pt-2">
        <Text size="sm" tone="faint" as="p" className="first-letter:uppercase">
          {DATE_FORMAT.format(now)}
        </Text>
        <h2 data-testid={terazIds.greeting} className="text-2xl font-semibold tracking-tight text-ink">
          {greetingFor(now.getHours())}
        </h2>
        <Text size="base" tone="muted">
          {teraz.prompt}
        </Text>
      </header>

      <ul className="flex flex-col">
        {entries.map((route, index) => {
          const key = route.module as ModuleKey;
          const state = states[key];
          const Icon = route.icon;

          return (
            <li key={route.id} data-module={key}>
              <Link
                to={route.path}
                data-testid={terazIds.entry(route.toolId ?? route.id)}
                className={cn(
                  'group flex items-center gap-4 py-5 min-h-tap',
                  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))] rounded-control',
                  index > 0 && 'shadow-[0_-1px_0_0_rgb(var(--line-faint))]'
                )}
              >
                <span className="shrink-0 w-10 h-10 rounded-control bg-module-soft text-module-ink flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden />
                </span>

                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-lg font-medium text-ink">{route.label}</span>
                  <span
                    data-testid={terazIds.entryState(route.toolId ?? route.id)}
                    className={cn(
                      'text-sm truncate',
                      state ? 'text-module-ink' : 'text-ink-faint'
                    )}
                  >
                    {state ?? modules[key].purpose}
                  </span>
                </span>

                <ChevronRight
                  className="w-5 h-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
