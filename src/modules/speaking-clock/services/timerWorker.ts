/**
 * Worker odliczania przeprowadził się do warstwy wspólnej (src/lib/timer/),
 * bo z tej samej pętli tyknięć korzysta teraz nie tylko moduł „Czas".
 *
 * Zostaje tu wyłącznie re-eksport. Powód jest konkretny: worker ładuje się
 * przez `new URL('./timerWorker.ts', import.meta.url)`, czyli względem pliku,
 * w którym to wywołanie stoi — dlatego samo wywołanie musiało pojechać razem
 * z kodem workera. Silnik backgroundTimerEngine.ts importuje `createTimerWorker`
 * pod niezmienioną ścieżką i nie wie o przeprowadzce.
 */

export { createTimerWorker } from '../../../lib/timer/timerWorker';
export type {
  TimerWorkerIncomingMessage,
  TimerWorkerOutgoingMessage,
} from '../../../lib/timer/timerWorker';
