import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from '../../../lib/icons';
import { cn } from '../../../lib/cn';
import {
  Button,
  EmptyState,
  Heading,
  LabelText,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  Stack,
} from '../../../components/ui';
import { common, energia } from '../../../copy';
import { useMotionPreference } from '../../../lib/motion';
import { playChime } from '../../../lib/audio/chime';
import { energiaIds as ids } from '../testIds';
import { DopamineItem } from '../types';
import {
  LINE_HEIGHT_EM,
  WHEEL_FONT_SIZE,
  WHEEL_SLICES,
  firstLineOffsetEm,
  landingRotation,
  maxCharsPerLine,
  sampleWithoutRepeats,
  sliceFill,
  sliceGeometry,
  wrapRadial,
} from '../wheel';
import { DopamineDetailBody } from './DopamineDetailBody';

interface DopamineRouletteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pula po filtrze energii — koło losuje z niej ośmioelementową próbkę. */
  items: DopamineItem[];
  onDone: (item: DopamineItem) => void;
  onResetFilter: () => void;
}

const SPIN_MS = 4000;
const TICKS = 12;
const VIEW = 320;
const CENTER = VIEW / 2;
const RADIUS = 150;
const CHARS_PER_LINE = maxCharsPerLine(RADIUS);

/** Kolejne tyknięcia zwalniają — stąd krzywa, a nie stały odstęp. */
function tickSchedule(): number[] {
  return Array.from({ length: TICKS }, (_, i) => {
    const progress = (i + 1) / TICKS;
    return Math.round(SPIN_MS * (1 - (1 - progress) ** 2));
  });
}

/**
 * Koło energii.
 *
 * Trzy rzeczy, które trzeba było naprawić naraz:
 *
 * 1. Koło ZOSTAJE na ekranie po zatrzymaniu. Wcześniej wynik podmieniał całą
 *    gałąź renderu dokładnie w tej samej klatce, w której kończyło się przejście
 *    CSS — więc wskaźnik nigdy nie pokazał wylosowanego wycinka, a cała
 *    geometria lądowania była pracą, której nikt nie widział.
 * 2. „Biorę to" NIE zamyka arkusza i nie otwiera drugiego. Zamknięcie jednego
 *    arkusza i otwarcie drugiego w jednym ticku oznacza `history.pushState()`
 *    i `history.back()` obok siebie — cofnięcie zdejmowało świeżo dołożony wpis
 *    i zamykało arkusz, który miał się właśnie pokazać. Szczegóły pokazujemy
 *    więc w TYM arkuszu, jednym wpisem historii.
 * 3. Nazwy na wycinkach mieszczą się w całości i nie wchodzą pod piastę —
 *    długość linii liczy `maxCharsPerLine`, a nie stała wpisana ręcznie.
 */
export const DopamineRouletteSheet: React.FC<DopamineRouletteSheetProps> = ({
  open,
  onOpenChange,
  items,
  onDone,
  onResetFilter,
}) => {
  const { reduced } = useMotionPreference();
  const [sample, setSample] = useState<DopamineItem[]>([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landing, setLanding] = useState<number | null>(null);
  const [taken, setTaken] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Próbkę bierzemy przy otwarciu i po każdej zmianie puli (np. zdjęciu filtru).
  useEffect(() => {
    clearTimers();
    setSpinning(false);
    setLanding(null);
    setTaken(false);
    setRotation(0);
    setSample(open ? sampleWithoutRepeats(items, WHEEL_SLICES) : []);
  }, [open, items, clearTimers]);

  const result = landing === null ? null : sample[landing] ?? null;

  const spin = () => {
    if (spinning || sample.length === 0) return;

    const index = Math.floor(Math.random() * sample.length);
    const turns = 5 + Math.floor(Math.random() * 3);
    setLanding(null);

    if (reduced) {
      // Bez kręcenia: koło ustawia się na wylosowanym wycinku, wynik od razu.
      setRotation(landingRotation(index, sample.length, 0));
      setLanding(index);
      void playChime({ volume: 0.4, tone: 'warm' });
      return;
    }

    setSpinning(true);
    setRotation(landingRotation(index, sample.length, turns));

    for (const at of tickSchedule()) {
      timers.current.push(
        setTimeout(() => {
          void playChime({ volume: 0.08, tone: 'bright' });
        }, at)
      );
    }

    timers.current.push(
      setTimeout(() => {
        setSpinning(false);
        setLanding(index);
        void playChime({ volume: 0.4, tone: 'warm' });
      }, SPIN_MS)
    );
  };

  const again = () => {
    clearTimers();
    setLanding(null);
    setTaken(false);
    setSample(sampleWithoutRepeats(items, WHEEL_SLICES));
    setRotation(0);
  };

  const wheel = useMemo(
    () =>
      sample.map((item, index) => ({
        item,
        geometry: sliceGeometry(index, sample.length, CENTER, RADIUS),
        lines: wrapRadial(item.title, CHARS_PER_LINE),
        fill: sliceFill(index, sample.length),
      })),
    [sample]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md">
        {/* Po „Biorę to" arkusz jest już o TEJ pozycji — nagłówek mówi to wprost. */}
        <SheetHeader
          title={taken && result ? result.title : energia.roulette.title}
          description={taken && result ? undefined : energia.roulette.hint}
          closeLabel={common.action.close}
        />

        <SheetBody data-testid={ids.roulette}>
          {sample.length === 0 ? (
            <div data-testid={ids.rouletteEmpty}>
              <EmptyState
                title={energia.roulette.emptyTitle}
                description={energia.roulette.emptyBody}
                className="py-6"
                action={
                  <Button
                    variant="secondary"
                    tone="module"
                    data-testid={ids.rouletteReset}
                    onClick={onResetFilter}
                  >
                    {common.action.showAll}
                  </Button>
                }
              />
            </div>
          ) : taken && result ? (
            <DopamineDetailBody item={result} />
          ) : (
            <Stack gap="md" className="items-center">
              <div
                className={cn(
                  'relative w-full aspect-square mx-auto',
                  // po wylosowaniu koło ustępuje miejsca nazwie, ale zostaje —
                  // wskaźnik ma pokazywać wycinek, który wypadł
                  result ? 'max-w-[15rem]' : 'max-w-[20rem]',
                  !reduced && 'transition-[max-width] duration-500'
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-5 h-5 text-module"
                  aria-hidden
                >
                  <path d="M12 22 3 4h18z" />
                </svg>

                <div
                  className="w-full h-full rounded-full bg-surface-raised shadow-hairline overflow-hidden"
                  data-testid={ids.rouletteWheel}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? `transform ${SPIN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
                      : 'none',
                  }}
                >
                  <svg
                    viewBox={`0 0 ${VIEW} ${VIEW}`}
                    className="w-full h-full -rotate-90"
                    aria-hidden
                  >
                    {wheel.map(({ item, geometry, lines, fill }, index) => (
                      <g key={item.id} data-testid={ids.rouletteSlice(index)}>
                        <path
                          d={geometry.path}
                          fill={fill}
                          stroke={
                            landing === index ? 'rgb(var(--module))' : 'rgb(var(--surface))'
                          }
                          strokeWidth={landing === index ? 3 : 1.5}
                        />
                        <text
                          x={geometry.textX}
                          y={geometry.textY}
                          transform={`rotate(${geometry.textRotation}, ${geometry.textX}, ${geometry.textY})`}
                          textAnchor={geometry.textAnchor}
                          fill="rgb(var(--ink))"
                          fontSize={WHEEL_FONT_SIZE}
                          fontWeight="500"
                        >
                          {lines.map((line, row) => (
                            <tspan
                              key={`${line}-${row}`}
                              x={geometry.textX}
                              dy={
                                row === 0
                                  ? `${firstLineOffsetEm(lines.length)}em`
                                  : `${LINE_HEIGHT_EM}em`
                              }
                            >
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/*
                  Piasta idzie w PROCENTACH koła, nie w stałych 56 px: gdy koło
                  maleje po wylosowaniu, stała szerokość zjadałaby coraz większy
                  kawałek promienia i chowałaby pod sobą początki napisów.
                  17,5% = HUB_RADIUS z wheel.ts w skali viewBoxa.
                */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[17.5%] h-[17.5%] rounded-full bg-surface-raised shadow-hairline flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-module-ink" aria-hidden />
                </div>

                {/* Nazwy na kole są rysowane wektorowo — czytnik ekranu dostaje je tutaj. */}
                <ul className="sr-only" aria-label={energia.roulette.wheelLabel}>
                  {sample.map((item) => (
                    <li key={item.id}>{item.title}</li>
                  ))}
                </ul>
              </div>

              {result ? (
                <Stack
                  gap="xs"
                  role="status"
                  className="items-center text-center pb-2"
                  data-testid={ids.rouletteResult}
                >
                  <LabelText>{energia.roulette.resultLabel}</LabelText>
                  <Heading level={1}>{result.title}</Heading>
                </Stack>
              ) : null}
            </Stack>
          )}
        </SheetBody>

        {sample.length === 0 ? null : (
          <SheetFooter>
            {taken && result ? (
              <>
                <Button
                  variant="quiet"
                  tone="neutral"
                  className="flex-1"
                  data-testid={ids.rouletteAgain}
                  onClick={again}
                >
                  {energia.roulette.again}
                </Button>
                <Button
                  variant="primary"
                  tone="module"
                  className="flex-1"
                  data-testid={ids.detailDone}
                  onClick={() => onDone(result)}
                >
                  {energia.action.done}
                </Button>
              </>
            ) : result ? (
              <>
                <Button
                  variant="quiet"
                  tone="neutral"
                  className="flex-1"
                  data-testid={ids.rouletteAgain}
                  onClick={again}
                >
                  {energia.roulette.again}
                </Button>
                <Button
                  variant="primary"
                  tone="module"
                  className="flex-1"
                  data-testid={ids.rouletteAccept}
                  onClick={() => setTaken(true)}
                >
                  {energia.roulette.accept}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                tone="module"
                className="flex-1"
                disabled={spinning}
                data-testid={ids.rouletteSpin}
                onClick={spin}
              >
                {spinning ? energia.roulette.spinning : energia.roulette.spin}
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
