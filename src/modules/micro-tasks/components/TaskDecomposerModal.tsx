import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2 } from '../../../lib/icons';
import { ResistanceSlider } from './ResistanceSlider';
import { cn } from '../../../lib/cn';

interface TaskDecomposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: { title: string; steps: string[] }) => void;
}

export const TaskDecomposerModal: React.FC<TaskDecomposerModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [resistance, setResistance] = useState<number>(3);

  if (!isOpen) return null;

  const handleAddStep = () => setSteps([...steps, '']);
  const handleRemoveStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));
  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleMagicDecompose = () => {
    if (!title.trim()) return;
    
    // Simulate generation based on resistance level
    if (resistance === 5) {
      setSteps([
        'Wstań i stań przed zadaniem',
        'Dotknij pierwszego przedmiotu związanego z zadaniem',
        'Zrób 15 sekund pracy i odpocznij',
        'Zrób kolejne 15 sekund',
        'Podejmij decyzję czy robisz dalej'
      ]);
    } else if (resistance >= 3) {
      setSteps([
        'Przygotuj miejsce pracy',
        'Włącz stoper na 2 minuty',
        'Zrób pierwszą, najprostszą rzecz',
        'Oceń postęp',
        'Dokończ mały fragment'
      ]);
    } else {
      setSteps([
        'Zaplanuj pracę',
        'Wykonaj pierwszy etap (5-10 min)',
        'Wykonaj drugi etap (5-10 min)',
        'Sprawdź i zakończ'
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validSteps = steps.filter(s => s.trim().length > 0);
    if (title.trim() && validSteps.length > 0) {
      onSave({ title, steps: validSteps });
      setTitle('');
      setSteps(['']);
      setResistance(3);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-warmgray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className={cn(
            'bg-white dark:bg-warmgray-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-warmgray-200 dark:border-warmgray-700',
            'transform transition-all duration-300 scale-100 opacity-100'
          )
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-warmgray-100 dark:border-warmgray-700 gap-4">
          <div>
            <h2 className="text-xl font-bold text-warmgray-900 dark:text-warmgray-50">
              Nowe Mikro-Zadanie
            </h2>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400 mt-1">
              Rozbij duże zadanie na proste mikrokroki.
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:static p-2 rounded-full text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form id="task-decomposer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-1.5">
              Co masz do zrobienia?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 px-4 py-3 min-h-[48px] rounded-xl border border-warmgray-300 dark:border-warmgray-600 bg-white dark:bg-warmgray-900 text-warmgray-900 dark:text-white placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-500 dark:focus:ring-sage-400"
                placeholder="np. Posprzątać kuchnię"
                required
              />
            </div>
          </div>

          <ResistanceSlider level={resistance} onChange={setResistance} />
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleMagicDecompose}
              disabled={!title.trim()}
              title="Automatyczne rozbicie na kroki"
              className="px-4 py-2 flex items-center justify-center gap-2 rounded-xl bg-sage-100 text-sage-600 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-400 dark:hover:bg-sage-900/50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              <Sparkles className="w-5 h-5" />
              Magicznie rozbij zadanie
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-warmgray-700 dark:text-warmgray-300 mb-3">
              Mikrokroki (po kolei)
            </label>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warmgray-400 font-mono text-sm">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      className="w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl border border-warmgray-300 dark:border-warmgray-600 bg-white dark:bg-warmgray-900 text-warmgray-900 dark:text-white placeholder-warmgray-400 focus:outline-none focus:ring-2 focus:ring-sage-500 dark:focus:ring-sage-400"
                      placeholder="Następny prosty krok..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    disabled={steps.length === 1}
                    className="p-3 min-h-[48px] min-w-[48px] rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 flex items-center justify-center"
                    aria-label="Usuń krok"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={handleAddStep}
              className="mt-4 flex items-center gap-2 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 min-h-[44px] px-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              <Plus className="w-4 h-4" />
              Dodaj kolejny krok
            </button>
          </div>
        </form>
        
        <div className="p-4 sm:p-6 border-t border-warmgray-100 dark:border-warmgray-700 bg-warmgray-50 dark:bg-warmgray-800/50 flex justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 min-h-[48px] rounded-xl text-sm font-medium text-warmgray-700 bg-white border border-warmgray-300 hover:bg-warmgray-50 dark:bg-warmgray-800 dark:text-warmgray-300 dark:border-warmgray-600 dark:hover:bg-warmgray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
          >
            Anuluj
          </button>
          <button
            type="submit"
            form="task-decomposer-form"
            disabled={!title.trim() || !steps.some(s => s.trim())}
            className="px-6 py-2.5 min-h-[48px] rounded-xl text-sm font-medium text-white bg-sage-600 hover:bg-sage-700 active:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-warmgray-800 shadow-sm"
          >
            Rozpocznij Zadanie
          </button>
        </div>
      </div>
    </div>
  );
};
