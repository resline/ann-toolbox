import React from 'react';
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
} from '../../../components/ui';
import { common, energia } from '../../../copy';
import { energiaIds as ids } from '../testIds';
import { DopamineItem } from '../types';
import { DopamineDetailBody } from './DopamineDetailBody';

interface DopamineDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DopamineItem | null;
  onDone: (item: DopamineItem) => void;
}

/**
 * Brakujące ogniwo między „menu" a „zrobiłam".
 *
 * Kliknięcie karty wywoływało wcześniej `console.log`, więc opisu, historii
 * wykonań ani kategorii nie dało się przeczytać nigdzie.
 */
export const DopamineDetailSheet: React.FC<DopamineDetailSheetProps> = ({
  open,
  onOpenChange,
  item,
  onDone,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    {item ? (
      <SheetContent size="md">
        <SheetHeader title={item.title} closeLabel={common.action.close} />
        <SheetBody>
          <DopamineDetailBody item={item} />
        </SheetBody>
        <SheetFooter>
          <Button
            variant="primary"
            tone="module"
            className="flex-1"
            data-testid={ids.detailDone}
            onClick={() => onDone(item)}
          >
            {energia.action.done}
          </Button>
        </SheetFooter>
      </SheetContent>
    ) : null}
  </Sheet>
);
