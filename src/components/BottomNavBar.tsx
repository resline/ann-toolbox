import React from 'react';
import { LayoutGrid, Volume2, Timer, Sparkles, ListTodo } from 'lucide-react';

export interface BottomNavBarProps {
  activeToolId: string | null;
  onSelectTool: (id: string) => void;
}

const navItems = [
  { id: 'hub', label: 'Hub', icon: LayoutGrid },
  { id: 'speaking-clock', label: 'Kotwica', icon: Volume2 },
  { id: 'visual-timer', label: 'Timer', icon: Timer },
  { id: 'dopamine-menu', label: 'Dopamina', icon: Sparkles },
  { id: 'micro-tasks', label: 'Zadania', icon: ListTodo },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeToolId, onSelectTool }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-warmgray-900/90 backdrop-blur-lg border-t border-warmgray-200/80 dark:border-warmgray-800 pb-safe shadow-soft">
      <ul className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = activeToolId === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelectTool(item.id)}
                className={`w-full h-14 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-sage-100 text-sage-800 dark:bg-sage-900/60 dark:text-sage-200'
                    : 'text-warmgray-500 dark:text-warmgray-400 hover:bg-warmgray-100/50 dark:hover:bg-warmgray-800/50 hover:text-warmgray-900 dark:hover:text-warmgray-200'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'animate-pulse-gentle' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
