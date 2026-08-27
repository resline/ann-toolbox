import React, { useState } from 'react';
import { Plus, ListTodo } from 'lucide-react';
import { TaskDecomposerModal } from './TaskDecomposerModal';
import { StepProgressCard } from './StepProgressCard';
import { SingleStepFocusView } from './SingleStepFocusView';
import { CelebrationOverlay } from './CelebrationOverlay';

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
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 max-w-md mx-auto">
          <div className="w-20 h-20 bg-sage-100 dark:bg-sage-900/30 rounded-3xl flex items-center justify-center text-sage-600 dark:text-sage-400 mb-6 shadow-sm">
            <ListTodo className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-warmgray-900 dark:text-white mb-2 tracking-tight">
            Micro-Tasks
          </h1>
          <p className="text-warmgray-500 dark:text-warmgray-400 mb-8">
            Overwhelmed by a big task? Break it down into tiny, doable steps.
          </p>
          <button
            onClick={() => setIsDecomposerOpen(true)}
            className="flex items-center gap-2 px-8 py-4 min-h-[64px] rounded-2xl text-lg font-bold text-white bg-sage-600 hover:bg-sage-700 active:bg-sage-800 shadow-md hover:shadow-lg active:scale-95 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-sage-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-warmgray-900"
          >
            <Plus className="w-6 h-6" />
            New Task
          </button>
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
