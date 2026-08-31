/**
 * Odliczanie liczone od terminu, nie od licznika tyknięć.
 *
 * Odejmowanie sekundy przy każdym tyknięciu `setInterval` jest poprawne tylko
 * dopóki karta jest widoczna. Uśpiona karta dostaje tyknięcia rzadziej (albo
 * wcale), więc licznik oparty na dekrementacji po wybudzeniu spóźnia się o cały
 * czas, który przespał. Tutaj tyknięcie jest wyłącznie sygnałem „przelicz się":
 * pozostały czas to zawsze różnica `deadlineAt - Date.now()`, więc po powrocie
 * do karty widać prawdę, a nie sumę tego, co się udało odtyknąć.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createTimerWorker,
  type TimerWorkerIncomingMessage,
  type TimerWorkerOutgoingMessage,
} from './timerWorker';

/** Co ile prosimy o przeliczenie. 250 ms — tyle samo, ile silnik modułu „Czas". */
const DEFAULT_INTERVAL_MS = 250;

export interface DeadlineTimerOptions {
  /**
   * Znacznik czasu zakończenia w skali `Date.now()`. `null` oznacza brak biegu.
   * Przy wznowieniu po pauzie wywołujący podaje nowy termin (teraz + reszta).
   */
  deadlineAt: number | null;
  /** `false` zamraża wynik na wartości z chwili pauzy i wygasza pętlę tyknięć. */
  isRunning: boolean;
  intervalMs?: number;
  /** Wołane raz na termin, w chwili dojścia do zera podczas biegu. */
  onExpire?: () => void;
}

export interface DeadlineTimerState {
  /** Pozostałe milisekundy, nigdy ujemne. */
  remainingMs: number;
  /**
   * Pozostałe sekundy zaokrąglone w górę: 24 999 ms to dla patrzącej wciąż
   * „25 s", a start odliczania ma pokazać pełną zadaną wartość, nie o jeden mniej.
   */
  remainingSeconds: number;
  isExpired: boolean;
}

export function useDeadlineTimer({
  deadlineAt,
  isRunning,
  intervalMs = DEFAULT_INTERVAL_MS,
  onExpire,
}: DeadlineTimerOptions): DeadlineTimerState {
  const [remainingMs, setRemainingMs] = useState(() =>
    deadlineAt === null ? 0 : Math.max(0, deadlineAt - Date.now())
  );

  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Callback w refie, żeby zmiana jego tożsamości nie restartowała pętli.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Nowy termin to nowy bieg, więc sygnał końca może paść ponownie.
  // Efekt stoi przed pętlą celowo — efekty wykonują się w kolejności deklaracji.
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;
  }, [deadlineAt]);

  useEffect(() => {
    const readRemaining = () => (deadlineAt === null ? 0 : Math.max(0, deadlineAt - Date.now()));

    const stopLoop = () => {
      if (workerRef.current) {
        try {
          const stop: TimerWorkerIncomingMessage = { type: 'STOP' };
          workerRef.current.postMessage(stop);
          workerRef.current.terminate();
        } catch {
          // Przeglądarka mogła już ubić workera przy usypianiu karty.
        }
        workerRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const sync = () => {
      const next = readRemaining();
      setRemainingMs(next);
      if (next > 0) return;

      stopLoop();
      if (isRunning && deadlineAt !== null && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    // Przeliczenie natychmiastowe: dzięki niemu pauza zamraża wartość z chwili
    // wciśnięcia pauzy, a nie tę sprzed ostatniego tyknięcia.
    sync();

    if (!isRunning || deadlineAt === null || readRemaining() === 0) {
      return stopLoop;
    }

    const worker = createTimerWorker();
    if (worker) {
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<TimerWorkerOutgoingMessage>) => {
        if (event.data?.type === 'TICK') sync();
      };
      const start: TimerWorkerIncomingMessage = { type: 'START', intervalMs };
      worker.postMessage(start);
    } else {
      // Bez workera zostaje zwykły interwał. Dławienie w tle mu nie szkodzi:
      // wartość i tak liczymy z zegara, więc rzadsze tyknięcia to tylko rzadsze
      // odświeżenie napisu, nigdy zła wartość.
      intervalRef.current = setInterval(sync, intervalMs);
    }

    // Powrót do karty to najczęstszy moment, w którym licznik jest nieświeży.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopLoop();
    };
  }, [deadlineAt, isRunning, intervalMs]);

  return useMemo(
    () => ({
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      isExpired: deadlineAt !== null && remainingMs === 0,
    }),
    [remainingMs, deadlineAt]
  );
}
