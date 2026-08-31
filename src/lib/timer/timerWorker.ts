/**
 * Wspólne źródło tyknięć — pętla interwału w dedykowanym Web Workerze.
 *
 * Wątek workera nie podlega dławieniu, które przeglądarki mobilne nakładają na
 * `setInterval` w nieaktywnej karcie, więc licznik nie milknie po schowaniu
 * aplikacji. Plik pełni podwójną rolę: jego treść jest jednocześnie kodem
 * workera (gałąź `self.onmessage`) i modułem, który tego workera tworzy.
 *
 * Mieszkał wcześniej w src/modules/speaking-clock/services/ i był dostępny
 * tylko dla modułu „Czas". Tu jest dostępny dla każdego odliczania.
 */

export type TimerWorkerIncomingMessage =
  | { type: 'START'; intervalMs?: number }
  | { type: 'STOP' }
  | { type: 'RESET' };

export type TimerWorkerOutgoingMessage = { type: 'TICK'; timestamp: number };

let timerId: ReturnType<typeof setInterval> | null = null;

// Gałąź wykonywana wyłącznie w zakresie workera — tam nie ma `window`.
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = (event: MessageEvent<TimerWorkerIncomingMessage>) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'START') {
      if (timerId !== null) {
        clearInterval(timerId);
      }
      const interval = data.intervalMs || 500;
      timerId = setInterval(() => {
        const msg: TimerWorkerOutgoingMessage = {
          type: 'TICK',
          timestamp: Date.now(),
        };
        self.postMessage(msg);
      }, interval);
    } else if (data.type === 'STOP' || data.type === 'RESET') {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }
  };
}

/**
 * Tworzy workera z pętlą tyknięć. Zwraca `null` tam, gdzie workerów nie ma
 * (jsdom w testach, render po stronie serwera) — wywołujący ma wtedy zejść do
 * zwykłego `setInterval`.
 */
export function createTimerWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  try {
    return new Worker(new URL('./timerWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    // Awaryjny worker z Bloba: gdy bundler nie potrafi rozwiązać `new URL(...)`
    // (np. przy nietypowym hostowaniu assetów), pętla i tak musi ruszyć.
    try {
      const inlineWorkerCode = `
        let timerId = null;
        self.onmessage = function(e) {
          var data = e.data;
          if (!data) return;
          if (data.type === 'START') {
            if (timerId !== null) clearInterval(timerId);
            var interval = data.intervalMs || 500;
            timerId = setInterval(function() {
              self.postMessage({ type: 'TICK', timestamp: Date.now() });
            }, interval);
          } else if (data.type === 'STOP' || data.type === 'RESET') {
            if (timerId !== null) {
              clearInterval(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([inlineWorkerCode], { type: 'application/javascript' });
      return new Worker(URL.createObjectURL(blob));
    } catch {
      return null;
    }
  }
}
