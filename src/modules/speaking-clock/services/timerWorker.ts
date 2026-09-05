/**
 * Web Worker for Speaking Clock Background Timer
 *
 * Runs a precise interval timer inside a dedicated Web Worker thread.
 * Reduces contention with rendering, but remains subject to browser/OS suspension.
 */

import type { WorkerIncomingMessage, WorkerOutgoingMessage } from '../types';

let timerId: ReturnType<typeof setInterval> | null = null;

// Worker message handling (runs in Worker scope)
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = (event: MessageEvent<WorkerIncomingMessage>) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'START') {
      if (timerId !== null) {
        clearInterval(timerId);
      }
      const interval = data.intervalMs || 500;
      timerId = setInterval(() => {
        const msg: WorkerOutgoingMessage = {
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
 * Creates a Web Worker instance running the timer loop.
 * Falls back safely to null in environments where Web Workers are unavailable.
 */
export function createTimerWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  try {
    return new Worker(new URL('./timerWorker.ts', import.meta.url), { type: 'module' });
  } catch {
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
