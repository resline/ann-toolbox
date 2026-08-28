import React, { useState, useMemo } from 'react';
import { useMicroTasksStore } from '../store';

interface TemplatesHubModalProps {
  onClose: () => void;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Wszystkie', value: 'Wszystkie' },
  { label: 'Dom 🏠', value: 'home' },
  { label: 'Praca 💼', value: 'work' },
  { label: 'Zdrowie 🏃‍♀️', value: 'health' },
  { label: 'Dobrostan 🧘‍♀️', value: 'selfcare' },
  { label: 'Moje Szablony ⭐', value: 'Moje Szablony' },
];

export const TemplatesHubModal: React.FC<TemplatesHubModalProps> = ({ onClose }) => {
  const { tasks, userTemplates, startTask } = useMicroTasksStore();
  const [activeCategory, setActiveCategory] = useState<string>('Wszystkie');
  const [search, setSearch] = useState('');

  const allTasks = useMemo(() => {
    return [...tasks, ...userTemplates];
  }, [tasks, userTemplates]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                          (task.description?.toLowerCase().includes(search.toLowerCase()));
      
      let matchCategory = true;
      if (activeCategory === 'Moje Szablony') {
          matchCategory = !!task.isCustomTemplate;
      } else if (activeCategory !== 'Wszystkie') {
          matchCategory = task.category === activeCategory && !task.isCustomTemplate;
      }

      return matchSearch && matchCategory;
    });
  }, [allTasks, search, activeCategory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true" aria-labelledby="templates-hub-title">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 id="templates-hub-title" className="text-2xl font-bold dark:text-white">Katalog Szablonów</h2>
          <button onClick={onClose} aria-label="Zamknij" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-6 flex flex-col space-y-4">
          <input 
            type="text" 
            placeholder="Szukaj szablonów..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
          
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.value 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.length > 0 ? filteredTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg dark:text-white">{task.title}</h3>
                  {task.isCustomTemplate && <span className="text-yellow-500 text-xl" title="Mój szablon">⭐</span>}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{task.description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Kroków: {task.steps.length}
                </div>
              </div>
              <button 
                onClick={() => {
                  startTask(task.id);
                  onClose();
                }}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                ▶ Uruchom zadanie
              </button>
            </div>
          )) : (
            <div className="col-span-1 md:col-span-2 text-center py-10 text-gray-500 dark:text-gray-400">
              Nie znaleziono szablonów spełniających kryteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
