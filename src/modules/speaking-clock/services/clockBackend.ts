import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { ClockState, EngineCallbacks, SpeakingClockSettings, SpeechOutcome, TickPayload } from '../types';
import type { VoicePackPreparation } from './spriteSpeechPlayer';
import { BackgroundTimerEngine } from './backgroundTimerEngine';

export type BackgroundProtection = 'web' | 'checking' | 'ready' | 'battery-required' | 'unavailable';
export interface BackendStatus {
  protection: BackgroundProtection;
  interrupted: boolean;
  error: string | null;
}
export interface ClockBackendCallbacks extends EngineCallbacks {
  onSettingsChange?: (settings: SpeakingClockSettings) => void;
  onBackendStatus?: (status: BackendStatus) => void;
}
export interface ClockBackend {
  prepareVoicePack(force?: boolean): Promise<VoicePackPreparation>;
  getVoicePackState(): 'idle' | 'loading' | 'ready' | 'failed';
  getState(): ClockState;
  getSettings(): SpeakingClockSettings;
  start(): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  stop(): void;
  updateSettings(settings: Partial<SpeakingClockSettings>): void;
  addMinutes(minutes: number): void;
  triggerImmediateAnnouncement(): Promise<void>;
  destroy(): void;
  openBatterySettings?(): Promise<void>;
  exportDiagnostics?(): Promise<void>;
}

/** Native wire contract: dates are epoch milliseconds, never JS Date objects. */
export interface NativeClockSnapshot {
  revision: number;
  state: ClockState;
  settings: SpeakingClockSettings;
  voiceReady: boolean;
  voiceError?: string | null;
  protection: Exclude<BackgroundProtection, 'web' | 'checking'>;
  interrupted: boolean;
  error: string | null;
  currentTime: number;
  nextAnnouncementTime: number | null;
  elapsedSeconds: number;
  secondsUntilNext: number;
  secondsRemaining?: number;
  totalSeconds?: number;
  lastAnnouncementText: string | null;
  speechOutcome: SpeechOutcome | null;
}
export interface NativeClockPlugin {
  prepare(): Promise<NativeClockSnapshot>;
  getStatus(): Promise<NativeClockSnapshot>;
  command(options: { action: string; settings?: Partial<SpeakingClockSettings>; minutes?: number }): Promise<NativeClockSnapshot>;
  openBatterySettings(): Promise<void>;
  exportDiagnostics(): Promise<void>;
  addListener(name: 'status', callback: (snapshot: NativeClockSnapshot) => void): Promise<PluginListenerHandle>;
}
const nativePlugin = registerPlugin<NativeClockPlugin>('SpeakingClock');
export const isNativeClock = () => Capacitor.getPlatform() === 'android';

export class AndroidClockBackend implements ClockBackend {
  private snapshot: NativeClockSnapshot | null = null;
  private listener: Promise<PluginListenerHandle> | null = null;
  private disposed = false;
  private pausedRefresh: ReturnType<typeof setInterval>;
  private queue: Promise<unknown> = Promise.resolve();
  private commandGeneration = 0;
  private voiceState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  private onVisible = () => {
    if (document.visibilityState === 'visible') void this.refresh();
  };

  constructor(private settings: SpeakingClockSettings, private callbacks: ClockBackendCallbacks,
    private plugin: NativeClockPlugin = nativePlugin) {
    document.addEventListener('visibilitychange', this.onVisible);
    this.pausedRefresh = setInterval(() => {
      if (document.visibilityState === 'visible' && this.snapshot?.state === 'paused' && this.settings.mode === 'departure') {
        void this.refresh();
      }
    }, 1000);
  }

  private fail(error: unknown) {
    if (this.disposed) return;
    this.callbacks.onBackendStatus?.({ protection: 'unavailable', interrupted: true, error: 'native-unavailable' });
    this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  private accept(next: NativeClockSnapshot) {
    if (this.disposed || (this.snapshot && next.revision < this.snapshot.revision)) return;
    const previous = this.snapshot;
    this.snapshot = next;
    this.settings = next.settings;
    this.voiceState = next.voiceReady ? 'ready' : 'failed';
    this.callbacks.onSettingsChange?.(next.settings);
    this.callbacks.onStateChange?.(next.state);
    this.callbacks.onBackendStatus?.({ protection: next.protection, interrupted: next.interrupted, error: next.error });
    const tick: TickPayload = {
      state: next.state,
      currentTime: new Date(next.currentTime),
      nextAnnouncementTime: next.nextAnnouncementTime === null ? null : new Date(next.nextAnnouncementTime),
      elapsedSeconds: next.elapsedSeconds,
      remainingSecondsToNextAnnouncement: next.secondsUntilNext,
      secondsRemaining: next.secondsRemaining,
      totalSeconds: next.totalSeconds,
      focusRemainingSeconds: next.settings.mode === 'focus' ? next.secondsRemaining : undefined,
      progressPercent: next.totalSeconds ? 100 * (1 - (next.secondsRemaining ?? 0) / next.totalSeconds) : 0,
    };
    this.callbacks.onTick?.(tick);
    if (next.lastAnnouncementText && next.lastAnnouncementText !== previous?.lastAnnouncementText) {
      this.callbacks.onAnnounce?.({ text: next.lastAnnouncementText, timestamp: tick.currentTime,
        elapsedMinutes: Math.floor(next.elapsedSeconds / 60), reason: 'interval' });
    }
    if (next.speechOutcome) this.callbacks.onSpeechOutcome?.(next.speechOutcome);
  }

  private async refresh() {
    try { this.accept(await this.plugin.getStatus()); } catch (error) { this.fail(error); }
  }

  async prepareVoicePack(): Promise<VoicePackPreparation> {
    this.voiceState = 'loading';
    try {
      if (!this.listener) this.listener = this.plugin.addListener('status', snapshot => this.accept(snapshot));
      await this.listener;
      if (this.disposed) return { status: 'failed', code: 'unsupported', message: 'Disconnected' };
      const next = await this.plugin.prepare();
      this.accept(next);
      return next.voiceReady
        ? { status: 'ready', fragmentCount: 337, decodedBytes: 0 }
        : { status: 'failed', code: 'pack-incomplete', message: next.voiceError ?? 'Native voice unavailable' };
    } catch (error) {
      this.voiceState = 'failed';
      this.fail(error);
      return { status: 'failed', code: 'unsupported', message: 'Native clock unavailable' };
    }
  }

  private command(action: string, extras: { settings?: Partial<SpeakingClockSettings>; minutes?: number } = {}): Promise<void> {
    const generation = this.commandGeneration;
    const operation = this.queue.then(async () => {
      if (this.disposed) return;
      if (['start', 'resume', 'test'].includes(action) && generation !== this.commandGeneration) return;
      this.accept(await this.plugin.command({ action, ...extras }));
    });
    // Keep subsequent Stop/recovery commands usable after a rejected command.
    this.queue = operation.catch(error => this.fail(error));
    return this.queue.then(() => {});
  }
  getState() { return this.snapshot?.state ?? 'idle'; }
  getSettings() { return this.settings; }
  getVoicePackState() { return this.voiceState; }
  start() { return this.command('start'); }
  private interrupt(action: 'pause' | 'stop') {
    if (this.disposed) return;
    this.commandGeneration++;
    // Stop must reach Android even while Start is waiting for service preparation.
    void this.plugin.command({ action }).then(snapshot => this.accept(snapshot)).catch(error => this.fail(error));
  }
  pause() { this.interrupt('pause'); }
  resume() { return this.command('resume'); }
  stop() { this.interrupt('stop'); }
  updateSettings(settings: Partial<SpeakingClockSettings>) { void this.command('settings', { settings }); }
  addMinutes(minutes: number) { void this.command('adjust', { minutes }); }
  triggerImmediateAnnouncement() { return this.command('test'); }
  async openBatterySettings() {
    try { await this.plugin.openBatterySettings(); } catch (error) { this.fail(error); }
  }
  async exportDiagnostics() {
    try { await this.plugin.exportDiagnostics(); } catch (error) { this.fail(error); }
  }
  destroy() {
    this.disposed = true;
    clearInterval(this.pausedRefresh);
    document.removeEventListener('visibilitychange', this.onVisible);
    void this.listener?.then(handle => handle.remove()).catch(() => {});
    // The Android service owns the run; a WebView teardown must never stop it.
  }
}

export function createClockBackend(settings: SpeakingClockSettings, callbacks: ClockBackendCallbacks): ClockBackend {
  if (isNativeClock()) return new AndroidClockBackend(settings, callbacks);
  callbacks.onBackendStatus?.({ protection: 'web', interrupted: false, error: null });
  return new BackgroundTimerEngine(settings, callbacks);
}
