import React, { useState } from 'react';
import { ListTodo, Sparkles, ArrowRight, Plus, FolderHeart, Trophy } from 'lucide-react';
import { TaskDecomposerModal } from './TaskDecomposerModal';
import { StepProgressCard } from './StepProgressCard';
import { SingleStepFocusView } from './SingleStepFocusView';
import { CelebrationOverlay } from './CelebrationOverlay';
import { TemplatesHubModal } from './TemplatesHubModal';
import { TaskHistoryModal } from './TaskHistoryModal';
import { useMicroTasksStore } from '../store';
import { MicroTask } from '../types';

export const MicroTasksModule: React.FC = () => {
  const [activeTaskLocal, setActiveTaskLocal] = useState<any | null>(null);
  const [isDecomposerOpen, setIsDecomposerOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const [isTemplatesHubOpen, setIsTemplatesHubOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { tasks, userTemplates, saveCustomTemplate, recordTaskCompletion } = useMicroTasksStore();

  const handleStartTemplate = (template: any) => {
    setActiveTaskLocal({
      id: template.id,
      title: template.title,
      isCustomTemplate: template.isCustomTemplate,
      category: template.category,
      steps: template.steps.map((s: any, i: number) => ({
        id: `step-${i}-${Date.now()}`,
        title: s.title,
        isCompleted: false,
      })),
    });
    setFocusMode(true);
  };

  const handleSaveTask = (data: { title: string; steps: string[] }) => {
    setActiveTaskLocal({
      id: Math.random().toString(36).substr(2, 9),
      title: data.title,
      isCustomTemplate: true,
      category: 'home', // default
      steps: data.steps.map((title, i) => ({
        id: `step-${i}-${Date.now()}`,
        title,
        isCompleted: false,
      })),
    });
    setFocusMode(true);
  };

  const handleStepComplete = (stepId: string) => {
    if (!activeTaskLocal) return;
    
    const updatedSteps = activeTaskLocal.steps.map((step: any) => 
      step.id === stepId ? { ...step, isCompleted: true } : step
    );
    
    setActiveTaskLocal({ ...activeTaskLocal, steps: updatedSteps });
    
    // Check if all done
    if (updatedSteps.every((s: any) => s.isCompleted)) {
      setShowCelebration(true);
      
      const completedTaskForHistory = {
        id: activeTaskLocal.id,
        title: activeTaskLocal.title,
        category: activeTaskLocal.category,
        steps: updatedSteps
      } as MicroTask;
      
      recordTaskCompletion(completedTaskForHistory);
    }
  };

  const handleAddInFlightStep = (title: string) => {
    if (!activeTaskLocal) return;
    const currentStepIndex = activeTaskLocal.steps.findIndex((s: any) => !s.isCompleted);
    if (currentStepIndex === -1) return;
    
    const newStep = {
      id: `step-inflight-${Date.now()}`,
      title,
      isCompleted: false,
    };
    
    const updatedSteps = [...activeTaskLocal.steps];
    updatedSteps.splice(currentStepIndex + 1, 0, newStep);
    
    setActiveTaskLocal({ ...activeTaskLocal, steps: updatedSteps });
  };

  const handleSaveTemplate = () => {
    if (!activeTaskLocal) return;
    
    const newTemplate = {
      id: `t-custom-${Date.now()}`,
      title: activeTaskLocal.title,
      isCustomTemplate: true,
      category: 'home' as any,
      description: 'Zapisane z aktywnego zadania',
      steps: activeTaskLocal.steps.map((s: any) => ({
        id: `s-${Date.now()}-${Math.random()}`,
        title: s.title,
        status: 'pending',
        estimatedMinutes: 2
      }))
    };
    
    saveCustomTemplate(newTemplate as any);
    alert('Zapisano zestaw kroków jako Twój szablon ⭐!');
  };

  const currentStepIndex = activeTaskLocal?.steps.findIndex((s: any) => !s.isCompleted) ?? -1;
  const starterTemplates = tasks.slice(0, 4);

  return (
    <div className="w-full h-full flex flex-col">
      {!activeTaskLocal ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500 max-w-xl mx-auto space-y-6">
          <div className="text-center w-full relative">
            <div className="absolute right-0 top-0 flex gap-2">
               <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-yellow-600 bg-yellow-50 rounded-full hover:bg-yellow-100" title="Historia Sukcesów 🏆">
                 <Trophy className="w-5 h-5" />
               </button>
            </div>
            
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

          <div className="w-full flex gap-3">
             <button
              onClick={() => setIsTemplatesHubOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors"
            >
              <FolderHeart className="w-4 h-4" />
              <span>Katalog Szablonów (15+)</span>
            </button>
          </div>

          {/* User Custom Templates */}
          {userTemplates.length > 0 && (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider px-1">
                <span>Moje Szablony ⭐</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {userTemplates.slice(0, 2).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleStartTemplate(tmpl)}
                    className="p-3.5 text-left rounded-2xl bg-white/80 dark:bg-warmgray-800/80 hover:bg-yellow-50/80 border border-yellow-200 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98] focus:outline-none group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-warmgray-900 dark:text-warmgray-100 group-hover:text-yellow-800">
                        {tmpl.title}
                      </span>
                      <ArrowRight className="w-4 h-4 text-yellow-400 group-hover:text-yellow-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick 1-tap templates */}
          <div className="w-full space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-warmgray-500 dark:text-warmgray-400 uppercase tracking-wider px-1">
              <Sparkles className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400" />
              <span>Szybkie Szablony na start</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {starterTemplates.map((tmpl) => (
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
            taskTitle={activeTaskLocal.title}
            stepTitle={activeTaskLocal.steps[currentStepIndex].title}
            stepNumber={currentStepIndex + 1}
            totalSteps={activeTaskLocal.steps.length}
            onComplete={() => handleStepComplete(activeTaskLocal.steps[currentStepIndex].id)}
            onViewList={() => setFocusMode(false)}
            onAddInFlightStep={handleAddInFlightStep}
            onSaveTemplate={handleSaveTemplate}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-2xl mx-auto animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-warmgray-900 dark:text-white mb-1">
                {activeTaskLocal.title}
              </h2>
              <p className="text-sm text-warmgray-500 dark:text-warmgray-400">
                {activeTaskLocal.steps.filter((s: any) => s.isCompleted).length} of {activeTaskLocal.steps.length} steps completed
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
            {activeTaskLocal.steps.map((step: any, index: number) => (
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
                onClick={() => setActiveTaskLocal(null)}
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
      
      {isTemplatesHubOpen && (
        <TemplatesHubModal onClose={() => setIsTemplatesHubOpen(false)} />
      )}
      
      {isHistoryOpen && (
        <TaskHistoryModal onClose={() => setIsHistoryOpen(false)} />
      )}
      
      <CelebrationOverlay
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
};
