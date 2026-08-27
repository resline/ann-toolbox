/**
 * HubDashboard Component (Pulpit Główny Narzędziownika Ani)
 *
 * Central launchpad for all ADHD support modules:
 * - "Głos Czasu" (Speaking Clock) - Available & interactive
 * - "Wizualny Timer", "Menu Dopaminowe", "Mikro-Zadania" - Planned future modules with friendly badges
 */

import React from 'react';
import { ArrowRight, Sparkles, Compass } from 'lucide-react';
import { getTools } from '../core/registry';
import type { ToolModule } from '../core/types';

export interface HubDashboardProps {
  onSelectTool: (toolId: string) => void;
  className?: string;
}

export const HubDashboard: React.FC<HubDashboardProps> = ({
  onSelectTool,
  className = '',
}) => {
  const allTools = getTools();

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 p-3 sm:p-6 ${className}`}>
      {/* Friendly Welcome Card */}
      <section className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-sage-500/15 via-warmgray-50 to-warmgray-100/60 dark:from-sage-950/40 dark:via-warmgray-850 dark:to-warmgray-900 border border-sage-200/70 dark:border-warmgray-800 shadow-sm">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage-100 dark:bg-sage-900/60 text-sage-800 dark:text-sage-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-sage-600 dark:text-sage-300" />
            <span>Twoja bezpieczna przestrzeń</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-sage-950 dark:text-sage-50">
            Cześć Aniu!
          </h2>

          <p className="text-sm sm:text-base text-warmgray-600 dark:text-warmgray-300 leading-relaxed">
            Wybierz narzędzie, które dziś najlepiej wesprze Twoją percepcję czasu, skupienie i spokój układu nerwowego.
          </p>
        </div>
      </section>

      {/* Toolbox Grid by Categories */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-warmgray-800 dark:text-warmgray-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-sage-600 dark:text-sage-400" />
            Dostępne i Planowane Narzędzia
          </h3>
          <span className="text-xs text-warmgray-500 dark:text-warmgray-400 font-medium">
            {allTools.filter((t) => t.status === 'available').length} aktywne moduły
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {allTools.map((tool: ToolModule) => {
            const Icon = tool.icon;
            const isAvailable = tool.status === 'available';

            if (isAvailable) {
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className="group relative flex flex-col justify-between text-left p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-warmgray-850/80 backdrop-blur-sm border-2 border-sage-500/30 dark:border-sage-500/30 hover:border-sage-500 dark:hover:border-sage-400 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                  aria-label={`Uruchom narzędzie: ${tool.title}`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-sage-500/15 dark:bg-sage-400/20 text-sage-700 dark:text-sage-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300/50 dark:border-emerald-700/50 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {tool.badge || 'Aktywny'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-warmgray-900 dark:text-warmgray-50 group-hover:text-sage-700 dark:group-hover:text-sage-300 transition-colors">
                        {tool.title}
                      </h4>
                      {tool.subtitle && (
                        <p className="text-xs font-medium text-sage-700/80 dark:text-sage-400 mt-0.5">
                          {tool.subtitle}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-warmgray-600 dark:text-warmgray-300 mt-2 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 flex items-center justify-between border-t border-warmgray-100 dark:border-warmgray-800 text-xs font-semibold text-sage-700 dark:text-sage-300">
                    <span>Otwórz moduł</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            }

            // Coming Soon Card
            return (
              <div
                key={tool.id}
                data-testid={`tool-card-${tool.id}`}
                className="relative flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-warmgray-50/60 dark:bg-warmgray-900/40 border border-warmgray-200/60 dark:border-warmgray-800/80 opacity-80"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-warmgray-200/60 dark:bg-warmgray-800 text-warmgray-500 dark:text-warmgray-400 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-warmgray-200/70 dark:bg-warmgray-800 text-warmgray-600 dark:text-warmgray-300 text-[11px] font-medium">
                      {tool.badge || 'Wkrótce'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-warmgray-700 dark:text-warmgray-300">
                      {tool.title}
                    </h4>
                    {tool.subtitle && (
                      <p className="text-xs font-medium text-warmgray-500 dark:text-warmgray-400 mt-0.5">
                        {tool.subtitle}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-warmgray-500 dark:text-warmgray-400 mt-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-warmgray-200/50 dark:border-warmgray-800/50 text-[11px] font-medium text-warmgray-400 dark:text-warmgray-500">
                  Moduł w przygotowaniu
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HubDashboard;
