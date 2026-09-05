import { describe, expect, it, vi } from 'vitest';
import { AndroidClockBackend, type NativeClockPlugin, type NativeClockSnapshot } from './clockBackend';
import { DEFAULT_SPEAKING_CLOCK_SETTINGS } from '../types';

function snapshot(revision = 1, state: NativeClockSnapshot['state'] = 'idle'): NativeClockSnapshot {
  return { revision, state, settings: { ...DEFAULT_SPEAKING_CLOCK_SETTINGS, keepAwake: false },
    voiceReady: true, protection: 'ready', interrupted: false, error: null, currentTime: 1000,
    nextAnnouncementTime: state === 'idle' ? null : 61000, elapsedSeconds: 0, secondsUntilNext: 60,
    lastAnnouncementText: null, speechOutcome: null };
}
function setup() {
  let listener: (s: NativeClockSnapshot) => void = () => {};
  const remove = vi.fn(async () => {});
  const plugin: NativeClockPlugin = {
    prepare: vi.fn(async () => snapshot()), getStatus: vi.fn(async () => snapshot()),
    command: vi.fn(async () => snapshot()), openBatterySettings: vi.fn(async () => {}),
    exportDiagnostics: vi.fn(async () => {}),
    addListener: vi.fn(async (_name, callback) => { listener = callback; return { remove }; }),
  };
  const callbacks = { onStateChange: vi.fn(), onSettingsChange: vi.fn(), onTick: vi.fn(), onBackendStatus: vi.fn() };
  const backend = new AndroidClockBackend(DEFAULT_SPEAKING_CLOCK_SETTINGS, callbacks, plugin);
  return { plugin, callbacks, backend, remove, emit: (s: NativeClockSnapshot) => listener(s) };
}
describe('AndroidClockBackend', () => {
  it('hydrates a running native session without sending Start or initial web settings', async () => {
    const { backend, plugin, callbacks } = setup();
    vi.mocked(plugin.prepare).mockResolvedValue(snapshot(2, 'running'));
    await backend.prepareVoicePack();
    expect(backend.getState()).toBe('running');
    expect(plugin.command).not.toHaveBeenCalled();
    expect(callbacks.onTick.mock.lastCall?.[0].nextAnnouncementTime).toEqual(new Date(61000));
    backend.destroy();
  });
  it('disconnects observers without stopping the Android service', async () => {
    const { backend, plugin, remove, emit, callbacks } = setup();
    await backend.prepareVoicePack();
    backend.destroy();
    await Promise.resolve();
    const calls = callbacks.onStateChange.mock.calls.length;
    emit(snapshot(2, 'running'));
    expect(remove).toHaveBeenCalledOnce();
    expect(plugin.command).not.toHaveBeenCalled();
    expect(callbacks.onStateChange).toHaveBeenCalledTimes(calls);
  });
  it('rejects stale snapshots that arrive after a Stop acknowledgement', async () => {
    const { backend, emit } = setup();
    await backend.prepareVoicePack();
    emit(snapshot(4, 'idle'));
    emit(snapshot(3, 'running'));
    expect(backend.getState()).toBe('idle');
    backend.destroy();
  });
  it('delivers Stop while Start is waiting on native initialization', async () => {
    const { backend, plugin } = setup();
    await backend.prepareVoicePack();
    let finishStart!: (s: NativeClockSnapshot) => void;
    vi.mocked(plugin.command).mockImplementation(({ action }) => action === 'start'
      ? new Promise(resolve => { finishStart = resolve; }) : Promise.resolve(snapshot(4)));
    const starting = backend.start();
    await Promise.resolve();
    backend.stop();
    expect(plugin.command).toHaveBeenCalledWith({ action: 'stop' });
    await Promise.resolve();
    finishStart(snapshot(3, 'running'));
    await starting;
    expect(backend.getState()).toBe('idle');
    backend.destroy();
  });
  it('cancels a queued Start when Stop is pressed before it is dispatched', async () => {
    const { backend, plugin } = setup();
    await backend.prepareVoicePack();
    const starting = backend.start();
    backend.stop();
    await starting;
    expect(plugin.command).toHaveBeenCalledTimes(1);
    expect(plugin.command).toHaveBeenCalledWith({ action: 'stop' });
    backend.destroy();
  });
  it('reports a failed native bridge instead of claiming a ready background clock', async () => {
    const { backend, plugin, callbacks } = setup();
    vi.mocked(plugin.prepare).mockRejectedValue(new Error('missing-plugin'));
    expect((await backend.prepareVoicePack()).status).toBe('failed');
    expect(callbacks.onBackendStatus).toHaveBeenLastCalledWith(expect.objectContaining({ protection: 'unavailable' }));
    expect(plugin.command).not.toHaveBeenCalled();
    backend.destroy();
  });
});
