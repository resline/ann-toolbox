import React from 'react';
import { Clock, Sparkles, Footprints } from '../../../lib/icons';
import { czas } from '../../../copy';
import { SegmentedTabs } from '../../../components/ui';
import { type ClockMode } from '../types';
import { czasIds } from '../testIds';

export interface ModeTabsProps {
  activeMode: ClockMode;
  onModeChange: (mode: ClockMode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Przełącznik trybu.
 *
 * Zawsze w jednym rzędzie — wcześniej do breakpointu `sm` układał trzy kafle jeden
 * pod drugim, przez co tarcza lądowała około 150 px niżej, poniżej zgięcia ekranu.
 * W module, którego sensem jest jedno spojrzenie na tarczę, to była główna wada.
 */
export const ModeTabs: React.FC<ModeTabsProps> = ({
  activeMode,
  onModeChange,
  disabled = false,
  className = '',
}) => {
  const items = [
    { value: 'continuous' as const, label: czas.mode.continuous.title, testId: czasIds.modeTab('continuous'), icon: <Clock className="w-4 h-4" aria-hidden /> },
    { value: 'focus' as const, label: czas.mode.focus.title, testId: czasIds.modeTab('focus'), icon: <Sparkles className="w-4 h-4" aria-hidden /> },
    { value: 'departure' as const, label: czas.mode.departure.title, testId: czasIds.modeTab('departure'), icon: <Footprints className="w-4 h-4" aria-hidden /> },
  ];

  return (
    <div data-testid={czasIds.modeTabs} className={className}>
      <SegmentedTabs<ClockMode>
        label={czas.modeLabel}
        value={activeMode}
        onValueChange={onModeChange}
        disabled={disabled}
        items={items}
      />
    </div>
  );
};

export default ModeTabs;
