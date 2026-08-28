import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, LayoutList, Play, Pause, RotateCcw, Plus, Star } from '../../../lib/icons';
import { cn } from '../../../lib/cn';

interface SingleStepFocusViewProps {
  taskTitle: string;
  stepTitle: string;
  stepNumber: number;
  totalSteps: number;
  onComplete: () => void;
  onSkip?: () => void;
  onViewList: () => void;
  onAddInFlightStep?: (title: string) => void;
  onSaveTemplate?: () => void;
}

export const SingleStepFocusView: React.FC<SingleStepFocusViewProps> = ({
  taskTitle,
  stepTitle,
  stepNumber,
  totalSteps,
  onComplete,
  onSkip,
  onViewList,
  onAddInFlightStep,
  onSaveTemplate,
}) => {
  const [resistanceTimeLeft, setResistanceTimeLeft] = useState<number>(120); // 2 minutes
  const [isResistanceActive, setIsResistanceActive] = useState<boolean>(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResistanceActive && resistanceTimeLeft > 0) {
      interval = setInterval(() => {
        setResistanceTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (resistanceTimeLeft === 0) {
      setIsResistanceActive(false);
    }
    return () => clearInterval(interval);
  }, [isResistanceActive, resistanceTimeLeft]);

  // Reset timer when step changes
  useEffect(() => {
    setResistanceTimeLeft(120);
    setIsResistanceActive(false);
    setShowAddStep(false);
    setNewStepTitle('');
  }, [stepNumber]);

  const toggleResistanceTimer = () => {
    if (resistanceTimeLeft === 0) {
      setResistanceTimeLeft(120);
    }
    setIsResistanceActive(!isResistanceActive);
  };

  const handleAddStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStepTitle.trim() && onAddInFlightStep) {
      onAddInFlightStep(newStepTitle);
      setNewStepTitle('');
      setShowAddStep(false);
    }
  };

  const progressPct = resistanceTimeLeft > 0 ? ((120 - resistanceTimeLeft) / 120) * 100 : 100;
  
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto px-4 py-8 sm:py-12 duration-700 ease-out relative">
      {/* Top Header - Zen & Minimal */}
      <div className="flex items-center justify-between mb-8 sm:mb-12">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-500 dark:text-sage-400 mb-1.5 opacity-80">
            Zen Focus
          </span>
          <h2 className="text-lg font-medium text-warmgray-500 dark:text-warmgray-400 truncate max-w-[200px] sm:max-w-md">
            {taskTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onSaveTemplate && (
            <button
              onClick={onSaveTemplate}
              className="flex items-center gap-2 px-4 py-2 min-h-[48px] rounded-2xl text-sm font-medium text-yellow-600 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 transition-all focus:outline-none"
              title="Zapisz ten zestaw kroków jako szablon ⭐"
            >
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Zapisz szablon</span>
            </button>
          )}
          <button
            onClick={onViewList}
            className="flex items-center gap-2 px-4 py-2 min-h-[48px] rounded-2xl text-sm font-medium text-warmgray-600 bg-warmgray-100/50 hover:bg-warmgray-200 dark:bg-warmgray-800/50 dark:text-warmgray-300 dark:hover:bg-warmgray-700 transition-all focus:outline-none active:scale-95"
          >
            <LayoutList className="w-4 h-4" />
            <span className="hidden sm:inline">Pełna lista</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
        {/* Step Beads Indicator */}
        <div className="flex items-center gap-2 mb-10" aria-label={`Krok ${stepNumber} z ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isCompleted = i + 1 < stepNumber;
            const isCurrent = i + 1 === stepNumber;
            return (
              <div
                key={i}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-500 ease-out",
                  isCurrent ? "w-8 bg-sage-500 shadow-[0_0_8px_rgba(139,168,154,0.6)]" : 
                  isCompleted ? "w-2.5 bg-sage-300 dark:bg-sage-700" : "w-2.5 bg-warmgray-200 dark:bg-warmgray-800"
                )}
              />
            );
          })}
        </div>
        
        {/* Zen Focus Text */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-warmgray-900 dark:text-white mb-8 leading-[1.2] max-w-2xl text-balance tracking-tight">
          {stepTitle}
        </h1>

        {/* 2-Minute Resistance Countdown Ring */}
        <div className="mb-14 flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4 flex items-center justify-center group cursor-pointer" onClick={toggleResistanceTimer}>
            <svg className="absolute inset-0 w-full h-full -rotate-90 transform transition-transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" className="fill-none stroke-warmgray-100 dark:stroke-warmgray-800" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="46"
                className="fill-none stroke-sage-400 dark:stroke-sage-500 transition-all duration-1000 ease-linear"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="289.02" // 2 * pi * 46
                strokeDashoffset={289.02 - (289.02 * progressPct) / 100}
              />
            </svg>
            <button 
              className="relative z-10 w-16 h-16 rounded-full bg-white dark:bg-warmgray-850 shadow-sm border border-warmgray-100 dark:border-warmgray-800 flex items-center justify-center text-sage-600 dark:text-sage-400 group-hover:scale-105 group-active:scale-95 transition-all"
              aria-label="Toggle 2-minute resistance timer"
            >
              {resistanceTimeLeft === 0 ? <RotateCcw className="w-6 h-6" /> : isResistanceActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
          </div>
          <div className="text-sm font-medium text-warmgray-500 dark:text-warmgray-400">
            {resistanceTimeLeft > 0 ? (
              <>
                <span className="font-mono text-sage-600 dark:text-sage-400 font-bold">{Math.floor(resistanceTimeLeft / 60)}:{(resistanceTimeLeft % 60).toString().padStart(2, '0')}</span> - Zacznij na 2 minuty
              </>
            ) : (
              <span className="text-sage-600 dark:text-sage-400">Opór pokonany! Kontynuuj.</span>
            )}
          </div>
        </div>

        {/* Large Satisfying Action Buttons */}
        <div className="flex flex-col items-center gap-4 w-full max-w-md mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <button
              onClick={onComplete}
              className={cn(
                  'flex-1 w-full flex items-center justify-center gap-3 px-8 py-4 min-h-[64px] rounded-3xl text-lg font-bold text-white',
                  'bg-sage-600 hover:bg-sage-500 active:bg-sage-700 shadow-xl shadow-sage-600/20 active:scale-[0.98]',
                  'transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-sage-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-warmgray-900'
                )
              }
            >
              <Check className="w-6 h-6" />
              Zrobione! Następny krok ✨
            </button>
            
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-6 py-4 min-h-[64px] min-w-[64px] rounded-3xl text-warmgray-500 bg-white dark:bg-warmgray-850 border border-warmgray-200 dark:border-warmgray-800 hover:bg-warmgray-50 dark:hover:bg-warmgray-800 dark:text-warmgray-400 shadow-sm hover:shadow active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 flex items-center justify-center"
                aria-label="Pomiń krok"
                title="Pomiń krok"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {onAddInFlightStep && (
            <div className="w-full mt-4">
              {!showAddStep ? (
                <button
                  onClick={() => setShowAddStep(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  + Dodaj kolejny krok w locie
                </button>
              ) : (
                <form onSubmit={handleAddStepSubmit} className="flex gap-2 w-full duration-300">
                  <input
                    type="text"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    placeholder="Wpisz nowy krok..."
                    autoFocus
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!newStepTitle.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Dodaj
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStep(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Anuluj
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Overall Progress for screen readers and tests */}
      <div className="sr-only">
        <span>Overall Progress</span>
        <span>{Math.round((stepNumber / totalSteps) * 100)}%</span>
      </div>
    </div>
  );
};
