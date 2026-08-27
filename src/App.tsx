import React from 'react';
import { Clock } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-warmgray-100 dark:bg-warmgray-900 text-warmgray-700 dark:text-warmgray-200 flex flex-col items-center justify-center p-6">
      <header className="text-center max-w-md space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-100 dark:bg-sage-900/60 text-sage-600 dark:text-sage-300 mb-2">
          <Clock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-sage-800 dark:text-sage-100">
          Narzędziownik Ani
        </h1>
        <p className="text-sm text-warmgray-500 dark:text-warmgray-400">
          Zintegrowany pakiet narzędzi wspierających skupienie i percepcję czasu.
        </p>
      </header>
    </div>
  );
};

export default App;
