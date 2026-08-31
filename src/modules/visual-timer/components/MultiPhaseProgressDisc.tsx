import React from 'react';
import { LabelText, NumberDisplay, ProgressDisc, Text } from '../../../components/ui';
import { skupienieIds as ids } from '../testIds';

export interface MultiPhaseProgressDiscProps {
  /** 0–100. Ile fazy już minęło. */
  progress: number;
  /** Nazwa fazy po polsku — komponent nie tłumaczy enumów. */
  phaseLabel: string;
  /** Gotowy napis licznika, np. „24:59". */
  timeLeft: string;
  /** Podpis pod licznikiem, np. „z 25 min". */
  totalLabel: string;
  /** Nazwa dostępna paska postępu. */
  progressLabel: string;
  paused?: boolean;
}

/*
 * Tarcza sesji.
 *
 * Sam pierścień i jego ARIA to dziś prymityw `ProgressDisc` — ten sam wzorzec
 * był tu i w module Czas napisany dwa razy od zera. Zostaje wyłącznie to, co
 * jest własnością Skupienia: trzy poziomy odczytu w środku tarczy.
 */
export const MultiPhaseProgressDisc: React.FC<MultiPhaseProgressDiscProps> = ({
  progress,
  phaseLabel,
  timeLeft,
  totalLabel,
  progressLabel,
  paused = false,
}) => (
  <ProgressDisc
    data-testid={ids.disc}
    value={progress}
    label={progressLabel}
    valueText={[phaseLabel, timeLeft, totalLabel]}
    paused={paused}
  >
    <LabelText tone="module" data-testid={ids.discPhase}>
      {phaseLabel}
    </LabelText>
    <NumberDisplay value={timeLeft} size="md" data-testid={ids.discValue} />
    <Text size="sm" tone="faint" data-testid={ids.discTotal}>
      {totalLabel}
    </Text>
  </ProgressDisc>
);
