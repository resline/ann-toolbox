import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';
import { app } from '../copy';
import { Link, useRoute } from './router';
import { ROUTES } from './routes';
import { shellIds } from './testIds';

/**
 * Dolna nawigacja.
 *
 * Etykiety są zawsze widoczne — ikona bez podpisu to zagadka, a rozwiązywanie
 * zagadek jest dokładnie tym, na co nie ma zasobów w gorszy dzień.
 *
 * Aktywna pozycja nie pulsuje ani nie migocze; przesuwa się pod nią jedna
 * pigułka, żeby zmiana miejsca była widoczna bez ruchu przyciągającego wzrok.
 */
export const TabBar: React.FC = () => {
  const active = useRoute();

  return (
    <nav
      data-testid={shellIds.tabBar}
      aria-label={app.nav.label}
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md shadow-[0_-1px_0_0_rgb(var(--line))] pb-safe"
    >
      <ul className="flex items-stretch max-w-lg mx-auto px-1 h-tabbar">
        {ROUTES.map((route) => {
          const isActive = route.id === active.id;
          const Icon = route.icon;
          return (
            <li key={route.id} className="flex-1 flex">
              <Link
                to={route.path}
                data-testid={shellIds.tab(route.id)}
                aria-current={isActive ? 'page' : undefined}
                data-module={route.module ?? undefined}
                className={cn(
                  'relative flex-1 flex flex-col items-center justify-center gap-1 rounded-control',
                  'text-2xs font-medium tracking-normal normal-case transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--focus-ring))]',
                  isActive ? 'text-module-ink' : 'text-ink-faint hover:text-ink-muted'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-1.5 inset-y-2 -z-10 rounded-control bg-module-soft"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                <span>{route.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
