import React, { useState } from 'react';
import { Plus, ListTodo, Sparkles, ArrowRight } from 'lucide-react';
import { TaskDecomposerModal } from './TaskDecomposerModal';
import { StepProgressCard } from './StepProgressCard';
import { SingleStepFocusView } from './SingleStepFocusView';
import { CelebrationOverlay } from './CelebrationOverlay';
import { MICRO_TASK_TEMPLATES } from '../templates';

interface Step {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Task {
  id: string;
  title: string;
  steps: Step[];
}

export const MicroTasksModule: React.FC = () => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDecomposerOpen, setIsDecomposerOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleStartTemplate = (template: typeof MICRO_TASK_TEMPLATES[0]) => {
    setActiveTask({
      id: template.id,
      title: template.title,
      steps: template.steps.map((s, i) => ({
        id: `step-${i}`,
        title: s.title,
        isCompleted: false,
      })),
    });
    setFocusMode(true);
  };

  const handleSaveTask = (data: { title: string; steps: string[] }) => {
    setActiveTask({
      id: Math.random().toString(36).substr(2, 9),
      title: data.title,
      steps: data.steps.map((title, i) => ({
        id: `step-${i}`,
        title,
        isCompleted: false,
      })),
    });
    setFocusMode(true);
  };

  const handleStepComplete = (stepId: string) => {
    if (!activeTask) return;
    
    const updatedSteps = activeTask.steps.map(step => 
      step.id === stepId ? { ...step, isCompleted: true } : step
    );
    
    setActiveTask({ ...activeTask, steps: updatedSteps });
    
    // Check if all done
    if (updatedSteps.every(s => s.isCompleted)) {
      setShowCelebration(true);
    }
  };

  const currentStepIndex = activeTask?.steps.findIndex(s => !s.isCompleted) ?? -1;

  return (
    <div className="w-full h-full flex flex-col">
      {!activeTask ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500 max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-sage-100 dark:bg-sage-900/40 rounded-3xl flex items-center justify-center text-sage-600 dark:text-sage-300 mx-auto mb-4 shadow-sm">
              <ListTodo className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-warmgray-900 dark:text-white mb-1.5 tracking-tight">
              Mikro-Zadania
            </h1>
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400 max-w-md mx-auto">
              Czujesz paraliż zadaniowy? Rozbij duże zadanie na maleńkie mikrokroki poniżej 2 minut.
            </p>
          </div>

          {/* Quick 1-tap templates */}
          <div className="w-full space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-warmgray-500 dark:text-warmgray-400 uppercase tracking-wider px-1">
              <Sparkles className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400" />
              <span>Szybkie Szablony na start</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MICRO_TASK_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleStartTemplate(tmpl)}
                  className="p-3.5 text-left rounded-2xl bg-white/80 dark:bg-warmgray-800/80 hover:bg-sage-50/80 dark:hover:bg-sage-900/30 border border-warmgray-200/80 dark:border-warmgray-700/80 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-warmgray-900 dark:text-warmgray-100 group-hover:text-sage-800 dark:group-hover:text-sage-200">
                      {tmpl.title}
                    </span>
                    <ArrowRight className="w-4 h-4 text-warmgray-400 group-hover:text-sage-600 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-xs text-warmgray-500 dark:text-warmgray-400 mt-1 line-clamp-1">
                    {tmpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full pt-2">
            <button
              onClick={() => setIsDecomposerOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 min-h-[52px] rounded-2xl text-base font-bold text-white bg-sage-600 hover:bg-sage-700 active:bg-sage-800 shadow-md hover:shadow-lg active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            >
              <Plus className="w-5 h-5" />
              <span>Własne Mikro-Zadanie</span>
            </button>
          </div>
        </div>
      ) : focusMode && currentStepIndex !== -1 ? (
        <div className="flex-1 overflow-y-auto">
          <SingleStepFocusView
            taskTitle={activeTask.title}
            stepTitle={activeTask.steps[currentStepIndex].title}
            stepNumber={currentStepIndex + 1}
            totalSteps={activeTask.steps.length}
            onComplete={() => handleStepComplete(activeTask.steps[currentStepIndex].id)}
            onViewList={() => setFocusMode(false)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-2xl mx-auto animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-warmgray-900 dark:text-white mb-1">
                {activeTask.title}
              </h2>
              <p className="text-sm text-warmgray-500 dark:text-warmgray-400">
                {activeTask.steps.filter(s => s.isCompleted).length} of {activeTask.steps.length} steps completed
              </p>
            </div>
            {currentStepIndex !== -1 && (
              <button
                onClick={() => setFocusMode(true)}
                className="px-4 py-2 min-h-[48px] rounded-xl text-sm font-medium text-sage-700 bg-sage-100 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              >
                Focus Mode
              </button>
            )}
          </div>
          
          <div className="space-y-3 pb-24">
            {activeTask.steps.map((step, index) => (
              <StepProgressCard
                key={step.id}
                id={step.id}
                title={step.title}
                isCompleted={step.isCompleted}
                isActive={index === currentStepIndex}
                onClick={() => {
                  if (!step.isCompleted) {
                    handleStepComplete(step.id);
                  }
                }}
              />
            ))}
          </div>
          
          {currentStepIndex === -1 && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setActiveTask(null)}
                className="px-6 py-3 min-h-[48px] rounded-xl font-medium text-white bg-warmgray-900 dark:bg-white dark:text-warmgray-900 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
              >
                Start Another Task
              </button>
            </div>
          )}
        </div>
      )}

      <TaskDecomposerModal
        isOpen={isDecomposerOpen}
        onClose={() => setIsDecomposerOpen(false)}
        onSave={handleSaveTask}
      />
      
      <CelebrationOverlay
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
};
