import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeadlineTimer } from './useDeadlineTimer';

/**
 * Atrapa workera. Pętla tyknięć w prawdziwym workerze jest nietestowalna w
 * jsdom (nie ma tam klasy `Worker`), więc sprawdzamy kontrakt: jaki komunikat
 * hook wysyła, jak reaguje na TICK i czy sprząta po sobie.
 */
const workerMocks = vi.hoisted(() => {
  class FakeTimerWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    readonly posted: unknown[] = [];
    terminated = false;

    postMessage(message: unknown): void {
      this.posted.push(message);
    }

    terminate(): void {
      this.terminated = true;
    }

    emitTick(): void {
      this.onmessage?.({ data: { type: 'TICK', timestamp: Date.now() } } as MessageEvent);
    }
  }

  return {
    enabled: false,
    instances: [] as FakeTimerWorker[],
    FakeTimerWorker,
  };
});

vi.mock('./timerWorker', () => ({
  createTimerWorker: () => {
    if (!workerMocks.enabled) return null;
    const worker = new workerMocks.FakeTimerWorker();
    workerMocks.instances.push(worker);
    return worker as unknown as Worker;
  },
}));

/** Stały punkt odniesienia — wszystkie terminy liczymy względem niego. */
const BASE = new Date('2026-08-31T10:00:00.000Z').getTime();

/** Pięć minut, czyli typowa faza skupienia. */
const FIVE_MINUTES = 5 * 60 * 1000;

function renderTimer(deadlineAt: number | null, isRunning: boolean, onExpire?: () => void) {
  return renderHook(
    (props: { deadlineAt: number | null; isRunning: boolean }) =>
      useDeadlineTimer({ ...props, onExpire }),
    { initialProps: { deadlineAt, isRunning } }
  );
}

describe('useDeadlineTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);
    workerMocks.enabled = false;
    workerMocks.instances.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('startuje od pełnej wartości terminu', () => {
    const { result } = renderTimer(BASE + FIVE_MINUTES, true);

    expect(result.current.remainingMs).toBe(FIVE_MINUTES);
    expect(result.current.remainingSeconds).toBe(300);
    expect(result.current.isExpired).toBe(false);
  });

  it('odlicza w miarę upływu czasu', () => {
    const { result } = renderTimer(BASE + FIVE_MINUTES, true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingSeconds).toBe(299);
  });

  it('po uśpieniu karty na 60 sekund pokazuje prawdę, a nie sumę tyknięć', () => {
    const { result } = renderTimer(BASE + FIVE_MINUTES, true);

    // Uśpiona karta nie dostaje tyknięć: zegar idzie, pętla stoi.
    act(() => {
      vi.setSystemTime(BASE + 60_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.remainingMs).toBe(FIVE_MINUTES - 60_000);
    expect(result.current.remainingSeconds).toBe(240);
  });

  it('pierwsze tyknięcie po wybudzeniu też pokazuje prawdę bez zdarzenia widoczności', () => {
    const { result } = renderTimer(BASE + FIVE_MINUTES, true);

    act(() => {
      vi.setSystemTime(BASE + 60_000);
      vi.advanceTimersByTime(250);
    });

    expect(result.current.remainingSeconds).toBe(240);
  });

  it('pauza zamraża wartość z chwili zatrzymania', () => {
    const { result, rerender } = renderTimer(BASE + FIVE_MINUTES, true);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    act(() => {
      rerender({ deadlineAt: BASE + FIVE_MINUTES, isRunning: false });
    });

    const frozen = result.current.remainingMs;
    expect(frozen).toBe(FIVE_MINUTES - 30_000);

    act(() => {
      vi.advanceTimersByTime(20_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.remainingMs).toBe(frozen);
  });

  it('wznowienie z przesuniętym terminem odlicza dalej od zamrożonej wartości', () => {
    const { result, rerender } = renderTimer(BASE + FIVE_MINUTES, true);

    act(() => {
      vi.advanceTimersByTime(30_000);
      rerender({ deadlineAt: BASE + FIVE_MINUTES, isRunning: false });
    });
    act(() => {
      vi.advanceTimersByTime(120_000);
      rerender({ deadlineAt: Date.now() + result.current.remainingMs, isRunning: true });
    });

    expect(result.current.remainingMs).toBe(FIVE_MINUTES - 30_000);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.remainingSeconds).toBe(269);
  });

  it('zgłasza koniec dokładnie raz i zatrzymuje się na zerze', () => {
    const onExpire = vi.fn();
    const { result } = renderTimer(BASE + 1000, true, onExpire);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.isExpired).toBe(true);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
  });

  it('nie odlicza bez terminu', () => {
    const onExpire = vi.fn();
    const { result } = renderTimer(null, true, onExpire);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.remainingMs).toBe(0);
    expect(result.current.isExpired).toBe(false);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('po odmontowaniu nie tyka i nie zgłasza końca', () => {
    const onExpire = vi.fn();
    const { unmount } = renderTimer(BASE + 5000, true, onExpire);

    unmount();

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(onExpire).not.toHaveBeenCalled();
  });

  it('gdy worker jest dostępny, to on napędza przeliczenia', () => {
    workerMocks.enabled = true;
    const { result } = renderTimer(BASE + FIVE_MINUTES, true);
    const worker = workerMocks.instances[workerMocks.instances.length - 1];

    expect(worker.posted).toContainEqual({ type: 'START', intervalMs: 250 });

    act(() => {
      vi.setSystemTime(BASE + 60_000);
      worker.emitTick();
    });

    expect(result.current.remainingSeconds).toBe(240);
  });

  it('zatrzymuje i zwalnia workera przy odmontowaniu', () => {
    workerMocks.enabled = true;
    const { unmount } = renderTimer(BASE + FIVE_MINUTES, true);
    const worker = workerMocks.instances[workerMocks.instances.length - 1];

    unmount();

    expect(worker.posted).toContainEqual({ type: 'STOP' });
    expect(worker.terminated).toBe(true);
  });
});
