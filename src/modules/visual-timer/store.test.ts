import { describe, it, expect, beforeEach } from 'vitest';
import { useVisualTimerStore, DEFAULT_TIMER_PRESETS } from './store';

/**
 * Store sesji skupienia — przeciwko presetom, które naprawdę istnieją.
 *
 * Poprzednia wersja tego pliku wstrzykiwała przez setState własne presety
 * (focus-25 / deep-50 / quick-15) i sprawdzała, czy da się je odczytać —
 * czyli testowała Object.assign, a nie moduł. Tutaj wszystko idzie po p-1
 * i p-2, tych samych, które widzi użytkowniczka.
 */

const STORAGE_KEY = 'ann_visual_timer';
const state = () => useVisualTimerStore.getState();

beforeEach(() => {
  useVisualTimerStore.setState({
    presets: DEFAULT_TIMER_PRESETS,
    activePresetId: null,
    currentPhase: null,
    timeRemainingSeconds: 0,
    totalPhaseSeconds: 0,
    isRunning: false,
  });
  localStorage.clear();
});

describe('store Skupienia — presety', () => {
  it('ma dwa presety o fazach 2/25/3 oraz 5/15/2', () => {
    expect(state().presets.map((p) => p.id)).toEqual(['p-1', 'p-2']);

    const [deep, light] = state().presets;
    expect([deep.warmupMinutes, deep.flowMinutes, deep.cooldownMinutes]).toEqual([2, 25, 3]);
    expect([light.warmupMinutes, light.flowMinutes, light.cooldownMinutes]).toEqual([5, 15, 2]);
  });

  it('start presetu wchodzi w rozgrzewkę na pełne 120 sekund', () => {
    state().startTimer('p-1');

    expect(state().activePresetId).toBe('p-1');
    expect(state().currentPhase).toBe('warmup');
    expect(state().timeRemainingSeconds).toBe(120);
    expect(state().totalPhaseSeconds).toBe(120);
    expect(state().isRunning).toBe(true);
  });

  it('start nieznanego presetu nie rusza stanu', () => {
    state().startTimer('nie-ma-takiego');

    expect(state().activePresetId).toBeNull();
    expect(state().currentPhase).toBeNull();
    expect(state().isRunning).toBe(false);
  });
});

describe('store Skupienia — bieg czasu', () => {
  it('tik odejmuje sekundę', () => {
    state().startTimer('p-2');
    state().tick();

    expect(state().timeRemainingSeconds).toBe(5 * 60 - 1);
  });

  it('tik po wstrzymaniu nie zmienia niczego', () => {
    state().startTimer('p-2');
    state().pauseTimer();

    const before = state().timeRemainingSeconds;
    state().tick();
    state().tick();

    expect(state().timeRemainingSeconds).toBe(before);
    expect(state().currentPhase).toBe('warmup');
  });

  it('wyczerpana rozgrzewka sama przechodzi w skupienie', () => {
    state().startTimer('p-1');
    useVisualTimerStore.setState({ timeRemainingSeconds: 0 });

    state().tick();

    expect(state().currentPhase).toBe('flow');
    expect(state().timeRemainingSeconds).toBe(25 * 60);
    expect(state().totalPhaseSeconds).toBe(25 * 60);
    expect(state().isRunning).toBe(true);
  });

  it('po skupieniu idzie wyciszenie, a po nim koniec sesji', () => {
    state().startTimer('p-1');

    state().skipPhase();
    expect(state().currentPhase).toBe('flow');

    state().skipPhase();
    expect(state().currentPhase).toBe('cooldown');
    expect(state().timeRemainingSeconds).toBe(3 * 60);

    state().skipPhase();
    expect(state().currentPhase).toBeNull();
    expect(state().activePresetId).toBeNull();
    expect(state().isRunning).toBe(false);
  });

  it('wstrzymanie zostawia fazę, powrót wznawia tę samą', () => {
    state().startTimer('p-1');
    state().skipPhase();
    state().pauseTimer();

    expect(state().isRunning).toBe(false);
    expect(state().currentPhase).toBe('flow');

    state().resumeTimer();
    expect(state().isRunning).toBe(true);
    expect(state().currentPhase).toBe('flow');
  });

  it('zatrzymanie czyści całą sesję', () => {
    state().startTimer('p-1');
    state().stopTimer();

    expect(state().currentPhase).toBeNull();
    expect(state().activePresetId).toBeNull();
    expect(state().timeRemainingSeconds).toBe(0);
    expect(state().totalPhaseSeconds).toBe(0);
    expect(state().isRunning).toBe(false);
  });
});

describe('store Skupienia — trwałość', () => {
  it('zapisuje bieżącą sesję pod kluczem ann_visual_timer', () => {
    state().startTimer('p-1');

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const saved = JSON.parse(raw as string).state;
    expect(saved.activePresetId).toBe('p-1');
    expect(saved.currentPhase).toBe('warmup');
    expect(saved.timeRemainingSeconds).toBe(120);
  });
});
