import React, { useState } from 'react';
import { useDopamineMenuStore } from '../store';
import { Sparkles, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export const DopamineBankWidget: React.FC = () => {
  const completedToday = useDopamineMenuStore((state) => state.completedToday) || [];
  const resetCompletedToday = useDopamineMenuStore((state) => state.resetCompletedToday);
  const [isExpanded, setIsExpanded] = useState(false);

  const count = completedToday.length;
  
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full bg-white dark:bg-warmgray-800 rounded-3xl p-5 shadow-sm border border-warmgray-200 dark:border-warmgray-700 animate-in fade-in duration-500 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-warmgray-900 dark:text-warmgray-100">
              {count > 0 ? `Dzisiaj zebrałaś ${count} iskierk${count === 1 ? 'ę' : count > 1 && count < 5 ? 'i' : ''} dopaminy ✨` : 'Zbierz swoją pierwszą iskierkę dopaminy na dziś 🌟'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <button
              onClick={() => resetCompletedToday()}
              className="p-2 text-warmgray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              aria-label="Wyczyść dzisiejsze iskierki"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 rounded-xl transition-colors"
            aria-label={isExpanded ? 'Zwiń listę' : 'Rozwiń listę'}
            disabled={count === 0}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {isExpanded && count > 0 && (
        <div className="mt-4 pt-4 border-t border-warmgray-100 dark:border-warmgray-700 space-y-2">
          {completedToday.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm py-1">
              <span className="text-warmgray-700 dark:text-warmgray-200">{item.title}</span>
              <span className="text-warmgray-400 font-mono text-xs">{formatTime(item.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
