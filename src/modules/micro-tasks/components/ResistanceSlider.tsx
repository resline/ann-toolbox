import React from 'react';

interface ResistanceSliderProps {
  level: number;
  onChange: (level: number) => void;
}

export const ResistanceSlider: React.FC<ResistanceSliderProps> = ({ level, onChange }) => {
  const getExplanation = (lvl: number) => {
    switch(lvl) {
      case 1: return "Lekki opór. Kształtujemy zadanie w naturalne bloki 5-10 minutowe.";
      case 2: return "Niewielka niechęć. Dzielimy na mniejsze, 3-5 minutowe kroczki.";
      case 3: return "Umiarkowany opór. Rozbijamy na bardzo konkretne akcje 1-3 minutowe.";
      case 4: return "Duża blokada. Każdy krok to zaledwie 30-60 sekund bez wysiłku.";
      case 5: return "Totalny paraliż. Mikroskopijne kroki (15-30s). Cel: po prostu zacząć.";
      default: return "";
    }
  };

  return (
    <div className="w-full py-4">
      <label htmlFor="resistance-slider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Jak duży opór czujesz przed tym zadaniem?
      </label>
      <input
        id="resistance-slider"
        type="range"
        min="1"
        max="5"
        step="1"
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
        <span>Lekki opór</span>
        <span>Umiarkowany</span>
        <span>Totalny paraliż</span>
      </div>
      <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 rounded-lg text-sm transition-all">
        <strong>Poziom {level}:</strong> {getExplanation(level)}
      </div>
    </div>
  );
};
