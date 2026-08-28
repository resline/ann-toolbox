import React from 'react';
import { LabelText, Stack, Text } from '../../../components/ui';
import { energia } from '../../../copy';
import { energiaIds as ids } from '../testIds';
import { DopamineItem } from '../types';

interface DopamineDetailBodyProps {
  item: DopamineItem;
}

const Meta: React.FC<{ label: string; value: string; testId?: string }> = ({
  label,
  value,
  testId,
}) => (
  <div className="flex flex-col gap-0.5">
    <dt>
      <LabelText>{label}</LabelText>
    </dt>
    <dd data-testid={testId}>
      <Text size="sm" as="span">
        {value}
      </Text>
    </dd>
  </div>
);

/**
 * Historia jednej pozycji: ile razy i kiedy ostatnio. Dzisiejsze wykonanie
 * podajemy godziną, starsze datą — „dzisiaj o 14:20" niesie więcej niż „28.08".
 */
function historyValue(item: DopamineItem): string {
  const count = item.completedCount ?? 0;
  if (count === 0) return energia.detail.lastNever;

  const times = energia.detail.countValue(count);
  if (!item.lastCompletedAt) return times;

  const date = new Date(item.lastCompletedAt);
  if (Number.isNaN(date.getTime())) return times;

  const today = new Date();
  const when =
    date.toDateString() === today.toDateString()
      ? energia.detail.lastToday(
          date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        )
      : date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

  return `${times}, ${when}`;
}

/**
 * Wnętrze szczegółów pozycji — jedno na obie drogi: z karty i z koła.
 *
 * Karta pokazuje wyłącznie nazwę i dwie plakietki, bo menu ma się przeglądać
 * wzrokiem. Wszystko, co dłuższe — po co to robić, ile razy już było, kiedy
 * ostatnio — jest tutaj i nigdzie indziej.
 */
export const DopamineDetailBody: React.FC<DopamineDetailBodyProps> = ({ item }) => (
  <Stack gap="lg" data-testid={ids.detail}>
    <Text tone={item.description ? 'default' : 'faint'} data-testid={ids.detailDescription}>
      {item.description || energia.detail.noDescription}
    </Text>

    <dl className="grid grid-cols-2 gap-4">
      <Meta
        label={energia.detail.durationLabel}
        value={
          item.durationMinutes
            ? energia.card.duration(item.durationMinutes)
            : energia.detail.durationUnknown
        }
        testId={ids.detailDuration}
      />
      <Meta
        label={energia.detail.energyLabel}
        value={energia.energy[item.energyRequired].label}
        testId={ids.detailEnergy}
      />
      <Meta
        label={energia.detail.categoryLabel}
        value={energia.category[item.category].title}
        testId={ids.detailCategory}
      />
      <Meta
        label={energia.detail.countLabel}
        value={historyValue(item)}
        testId={ids.detailHistory}
      />
    </dl>
  </Stack>
);
