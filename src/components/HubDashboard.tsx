import React from 'react';
import { ArrowRight, Zap, Clock, Battery } from 'lucide-react';
import { getTools, TOOL_CATEGORIES } from '../core/registry';
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
    <div className={`w-full max-w-4xl mx-auto space-y-8 sm:space-y-10 p-4 sm:p-6 ${className}`}>
      {/* Header / Greeting Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-sage-950 dark:text-sage-50 tracking-tight animate-fade-in">
          Witaj w swojej spokojnej przestrzeni, Aniu ✨
        </h1>
        <p className="text-lg text-warmgray-600 dark:text-warmgray-300 max-w-2xl mx-auto">
          Wybierz narzędzie dopasowane do tego, czego teraz potrzebujesz.
        </p>
      </section>

      {/* Sekcja "Szybka Pomoc / W czym Ci dzisiaj pomóc?" */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-warmgray-800 dark:text-warmgray-100 px-1">
          Szybka Pomoc / W czym Ci dzisiaj pomóc?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onSelectTool('micro-tasks')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-200">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100 leading-tight">
                ⚡ Mam paraliż zadaniowy
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTool('speaking-clock')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-200">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100 leading-tight">
                ⏰ Gubię poczucie czasu
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTool('dopamine-menu')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-200">
              <Battery className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-rose-900 dark:text-rose-100 leading-tight">
                🔋 Brak mi energii i chęci
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Karty Narzędzi z Podglądem na Żywo (Tool Cards) */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-warmgray-800 dark:text-warmgray-100 px-1">
          Wszystkie Narzędzia
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {allTools.map((tool: ToolModule) => {
            const Icon = tool.icon;
            const categoryObj = TOOL_CATEGORIES.find(c => c.id === tool.category);
            const categoryLabel = categoryObj ? categoryObj.label : tool.category;
            
            return (
              <div
                key={tool.id}
                data-testid={`tool-card-${tool.id}`}
                className="group relative flex flex-col justify-between bg-white/80 dark:bg-warmgray-800/80 backdrop-blur-xl border border-warmgray-200/80 dark:border-warmgray-700/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-sage-500/15 dark:bg-sage-400/20 text-sage-700 dark:text-sage-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-sage-600 dark:text-sage-400 uppercase tracking-wider">
                          {categoryLabel}
                        </span>
                        <h3 className="text-lg font-bold text-warmgray-900 dark:text-warmgray-50 group-hover:text-sage-700 dark:group-hover:text-sage-300 transition-colors">
                          {tool.title}
                        </h3>
                      </div>
                    </div>
                    
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300/50 dark:border-emerald-700/50 text-xs font-semibold whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Aktywny
                    </span>
                  </div>
                  
                  <p className="text-sm text-warmgray-600 dark:text-warmgray-300 leading-relaxed min-h-[2.5rem]">
                    {tool.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className="mt-6 w-full py-3 px-4 rounded-xl bg-sage-100 dark:bg-sage-900/50 text-sage-800 dark:text-sage-200 font-semibold flex items-center justify-center gap-2 hover:bg-sage-200 dark:hover:bg-sage-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                >
                  Otwórz moduł <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HubDashboard;
