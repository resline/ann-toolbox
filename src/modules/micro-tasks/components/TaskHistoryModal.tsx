import React from 'react';
import { useMicroTasksStore } from '../store';

interface TaskHistoryModalProps {
  onClose: () => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ onClose }) => {
  const { taskHistory } = useMicroTasksStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true" aria-labelledby="task-history-title">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 id="task-history-title" className="text-2xl font-bold dark:text-white flex items-center gap-2">
            Historia Sukcesów 🏆
          </h2>
          <button onClick={onClose} aria-label="Zamknij" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-6 mb-6 text-center shadow-sm">
          <p className="text-xl font-medium text-amber-800 dark:text-amber-200">
            Brawo, Aniu! Ukończyłaś już <span className="font-bold text-2xl" data-testid="task-count">{taskHistory.length}</span> mikro-zadań ✨
          </p>
        </div>

        <div className="space-y-4">
          {taskHistory.length > 0 ? taskHistory.map((task, index) => (
            <div key={`${task.id}-${index}`} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{task.title}</h3>
                <p className="text-sm text-gray-500 dark:text-warmgray-400">
                  Zrobiono {task.stepsCount} kroków
                </p>
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 text-right">
                {task.completedAt 
                  ? new Date(task.completedAt).toLocaleDateString('pl-PL', { 
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    }) 
                  : 'Brak daty'}
              </div>
            </div>
          )) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              Jeszcze nie ukończyłaś żadnych zadań. Pierwszy krok przed Tobą! 🌟
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
