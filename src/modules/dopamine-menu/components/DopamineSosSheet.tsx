import React, { useEffect, useState } from 'react';
import { RefreshCw } from '../../../lib/icons';
import {
  Button,
  Card,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  Stack,
  Text,
} from '../../../components/ui';
import { common, energia } from '../../../copy';
import { playChime } from '../../../lib/audio/chime';
import { useDopamineMenuStore } from '../store';
import { energiaIds as ids } from '../testIds';

interface DopamineSosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = energia.sos.steps;

/**
 * Ratunek na paraliż: jedna czynność, dwa wyjścia — zrobione albo inna.
 *
 * Dźwięk idzie przez wspólny syntezator z `src/lib/audio/chime`. Wcześniej komponent budował
 * własny `AudioContext`, który w jsdom rzucał wyjątkiem przy każdym otwarciu.
 */
export const DopamineSosSheet: React.FC<DopamineSosSheetProps> = ({ open, onOpenChange }) => {
  const completeItem = useDopamineMenuStore((state) => state.completeItem);
  const addItem = useDopamineMenuStore((state) => state.addItem);
  const items = useDopamineMenuStore((state) => state.items);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.floor(Math.random() * STEPS.length));
    void playChime({ volume: 0.35, tone: 'gentle' });
  }, [open]);

  const step = STEPS[index];

  const handleDone = () => {
    void playChime({ volume: 0.45, tone: 'warm' });

    const existing = items.find((item) => item.title === step && item.category === 'special');
    if (existing) {
      completeItem(existing.id);
    } else {
      const id = crypto.randomUUID();
      addItem({ id, title: step, category: 'special', energyRequired: 'low', durationMinutes: 1 });
      completeItem(id);
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm">
        <SheetHeader
          title={energia.sos.title}
          description={energia.sos.lead}
          closeLabel={common.action.close}
        />
        <SheetBody data-testid={ids.sos}>
          <Stack gap="md">
            <Card variant="sunken">
              <div className="px-card py-6 flex items-center justify-center min-h-[7rem]">
                <Text size="lg" className="text-center text-balance" data-testid={ids.sosStep}>
                  {step}
                </Text>
              </div>
            </Card>
            <Button
              variant="quiet"
              tone="neutral"
              data-testid={ids.sosNext}
              onClick={() => setIndex((prev) => (prev + 1) % STEPS.length)}
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              {energia.sos.next}
            </Button>
          </Stack>
        </SheetBody>
        <SheetFooter>
          <Button
            variant="primary"
            tone="module"
            className="flex-1"
            data-testid={ids.sosDone}
            onClick={handleDone}
          >
            {energia.sos.done}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
