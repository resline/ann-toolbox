import { ensureAudioContext } from '../../../lib/audio/chime';
import {
  VOICE_GRAMMAR_VERSION,
  VOICE_FRAGMENT_COUNT,
  VOICE_FRAGMENT_DEFINITIONS,
  VOICE_PACK_ID,
  VOICE_REGISTRY_SHA256,
  assertPlanIsResolvable,
  type AnnouncementPlan,
  type JoinClass,
} from './polishAnnouncementPlanner';

export const VOICE_MANIFEST_URL = '/audio/voice/' + VOICE_PACK_ID + '/manifest.json';
export const MAX_DECODED_VOICE_BYTES = 48 * 1024 * 1024;

export interface VoiceSpriteFragment {
  startFrame: number;
  frameCount: number;
  text: string;
  prosodyRole: string;
  promptId: string;
}

export interface VoiceSpriteManifest {
  schemaVersion: 1;
  grammarVersion: string;
  registrySha256: string;
  packId: string;
  model: string;
  voice: string;
  locale: string;
  sourceSampleRateHz: number;
  runtimeSampleRateHz: number;
  channels: number;
  generatedAt: string;
  sprite: {
    url: string;
    sha256: string;
    encodedBytes: number;
    sourceFrameCount: number;
  };
  fragments: Record<string, VoiceSpriteFragment>;
}

export type VoicePackFailureCode =
  | 'unsupported'
  | 'manifest-unavailable'
  | 'manifest-invalid'
  | 'sprite-unavailable'
  | 'integrity-failed'
  | 'decode-failed'
  | 'memory-limit'
  | 'pack-incomplete';

export type VoicePackPreparation =
  | { status: 'ready'; decodedBytes: number; fragmentCount: number }
  | { status: 'failed'; code: VoicePackFailureCode; message: string };

export interface ScheduledVoiceSequence {
  startAt: number;
  endAt: number;
  sources: readonly AudioBufferSourceNode[];
  done: Promise<'completed' | 'cancelled'>;
  reap: () => boolean;
  stop: () => void;
}

export interface SpriteSpeechPlayerOptions {
  context?: AudioContext | null;
  manifestUrl?: string;
  fetchImpl?: typeof fetch;
  cryptoImpl?: Crypto;
  maxDecodedBytes?: number;
  refreshVoiceCache?: () => Promise<void>;
}

const JOIN_GAPS_SECONDS: Record<JoinClass, number> = {
  'tight-word': 0.018,
  'neutral-word': 0.065,
  colon: 0.12,
  sentence: 0.24,
};

class VoicePackError extends Error {
  constructor(
    readonly code: VoicePackFailureCode,
    message: string
  ) {
    super(message);
    this.name = 'VoicePackError';
  }
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isInteger(value);
}

function validateManifest(value: unknown): VoiceSpriteManifest {
  if (!value || typeof value !== 'object') {
    throw new VoicePackError('manifest-invalid', 'Voice manifest is not an object.');
  }
  const manifest = value as Partial<VoiceSpriteManifest>;
  if (
    manifest.schemaVersion !== 1 ||
    manifest.packId !== VOICE_PACK_ID ||
    manifest.grammarVersion !== VOICE_GRAMMAR_VERSION ||
    manifest.registrySha256 !== VOICE_REGISTRY_SHA256 ||
    manifest.model !== 'gemini-3.1-flash-tts-preview' ||
    manifest.voice !== 'Kore' ||
    manifest.locale !== 'pl-PL' ||
    manifest.sourceSampleRateHz !== 24_000 ||
    manifest.runtimeSampleRateHz !== 24_000 ||
    manifest.channels !== 1 ||
    !manifest.sprite ||
    typeof manifest.sprite.url !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(manifest.sprite.sha256 || '') ||
    !isFiniteNonNegativeInteger(manifest.sprite.encodedBytes) ||
    manifest.sprite.encodedBytes <= 0 ||
    !isFiniteNonNegativeInteger(manifest.sprite.sourceFrameCount) ||
    manifest.sprite.sourceFrameCount <= 0 ||
    !manifest.fragments ||
    typeof manifest.fragments !== 'object'
  ) {
    throw new VoicePackError('manifest-invalid', 'Voice manifest contract does not match this build.');
  }

  const expectedSpriteUrl =
    '/audio/voice/' +
    VOICE_PACK_ID +
    '/sprite.' +
    manifest.sprite.sha256.toLowerCase() +
    '.ogg';
  if (manifest.sprite.url !== expectedSpriteUrl) {
    throw new VoicePackError('manifest-invalid', 'Voice sprite URL is not the immutable same-origin pack path.');
  }

  const fragmentEntries = Object.entries(manifest.fragments);
  if (fragmentEntries.length !== VOICE_FRAGMENT_COUNT) {
    throw new VoicePackError('pack-incomplete', 'Voice manifest has an unexpected fragment count.');
  }

  const ranges: Array<{ start: number; end: number; id: string }> = [];
  for (const [id, fragment] of fragmentEntries) {
    if (
      !id ||
      !fragment ||
      !isFiniteNonNegativeInteger(fragment.startFrame) ||
      !isFiniteNonNegativeInteger(fragment.frameCount) ||
      fragment.frameCount <= 0 ||
      fragment.startFrame + fragment.frameCount > manifest.sprite.sourceFrameCount
    ) {
      throw new VoicePackError('manifest-invalid', 'Invalid voice fragment boundary for ' + id + '.');
    }
    ranges.push({ start: fragment.startFrame, end: fragment.startFrame + fragment.frameCount, id });
  }
  ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index].start < ranges[index - 1].end) {
      throw new VoicePackError('manifest-invalid', 'Voice fragment ranges overlap.');
    }
  }
  for (const definition of VOICE_FRAGMENT_DEFINITIONS) {
    const fragment = manifest.fragments[definition.id];
    if (
      !fragment ||
      fragment.text !== definition.text ||
      fragment.prosodyRole !== definition.prosodyRole ||
      fragment.promptId !== definition.promptId
    ) {
      throw new VoicePackError('pack-incomplete', 'Voice fragment contract mismatch for ' + definition.id + '.');
    }
  }
  return manifest as VoiceSpriteManifest;
}

async function refreshVoicePackThroughServiceWorker(): Promise<void> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.serviceWorker?.controller ||
    typeof MessageChannel === 'undefined'
  ) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeoutId = setTimeout(() => reject(new Error('Voice cache refresh timed out.')), 15_000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeoutId);
      if (event.data?.ok) resolve();
      else reject(new Error(event.data?.message || 'Voice cache refresh failed.'));
    };
    navigator.serviceWorker.controller?.postMessage(
      { type: 'REFRESH_VOICE_PACK' },
      [channel.port2]
    );
  });
}

async function sha256Hex(buffer: ArrayBuffer, cryptoImpl: Crypto): Promise<string> {
  if (!cryptoImpl.subtle) {
    throw new VoicePackError('unsupported', 'Web Crypto is unavailable.');
  }
  const digest = await cryptoImpl.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function failureFrom(error: unknown): VoicePackPreparation {
  if (error instanceof VoicePackError) {
    return { status: 'failed', code: error.code, message: error.message };
  }
  const message = error instanceof Error ? error.message : 'Unknown voice-pack error.';
  return { status: 'failed', code: 'decode-failed', message };
}

export class SpriteSpeechPlayer {
  private context: AudioContext | null;
  private readonly manifestUrl: string;
  private readonly fetchImpl: typeof fetch | null;
  private readonly cryptoImpl: Crypto | null;
  private readonly maxDecodedBytes: number;
  private readonly refreshVoiceCache: () => Promise<void>;
  private manifest: VoiceSpriteManifest | null = null;
  private buffer: AudioBuffer | null = null;
  private preparation: Promise<VoicePackPreparation> | null = null;
  private lastPreparation: VoicePackPreparation | null = null;
  private activeSequences = new Set<ScheduledVoiceSequence>();
  private preparationGeneration = 0;
  private preparationAbortController: AbortController | null = null;

  constructor(options: SpriteSpeechPlayerOptions = {}) {
    this.context = options.context ?? null;
    this.manifestUrl = options.manifestUrl ?? VOICE_MANIFEST_URL;
    this.fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.cryptoImpl = options.cryptoImpl ?? (typeof crypto !== 'undefined' ? crypto : null);
    this.maxDecodedBytes = options.maxDecodedBytes ?? MAX_DECODED_VOICE_BYTES;
    this.refreshVoiceCache = options.refreshVoiceCache ?? refreshVoicePackThroughServiceWorker;
  }

  getState(): 'idle' | 'loading' | 'ready' | 'failed' {
    if (this.buffer && this.manifest) return 'ready';
    if (this.preparation) return 'loading';
    return this.lastPreparation?.status === 'failed' ? 'failed' : 'idle';
  }

  getLastPreparation(): VoicePackPreparation | null {
    return this.lastPreparation;
  }

  getAudioContext(): AudioContext | null {
    return this.context;
  }

  prepare(forceRefresh = false): Promise<VoicePackPreparation> {
    if (this.buffer && this.manifest && !forceRefresh) {
      return Promise.resolve({
        status: 'ready',
        decodedBytes: this.buffer.length * this.buffer.numberOfChannels * 4,
        fragmentCount: Object.keys(this.manifest.fragments).length,
      });
    }
    if (this.preparation) return this.preparation;

    const generation = ++this.preparationGeneration;
    const abortController = typeof AbortController === 'undefined' ? null : new AbortController();
    this.preparationAbortController = abortController;
    let currentPreparation: Promise<VoicePackPreparation>;
    currentPreparation = (forceRefresh
      ? this.refreshVoiceCache().then(() => {
          this.assertPreparationCurrent(generation);
          return this.loadPack(generation, true, abortController?.signal);
        })
      : this.loadPack(generation, false, abortController?.signal))
      .then((result) => {
        if (generation === this.preparationGeneration) this.lastPreparation = result;
        return result;
      })
      .catch((error) => {
        const result = failureFrom(error);
        if (generation === this.preparationGeneration) this.lastPreparation = result;
        return result;
      })
      .finally(() => {
        if (this.preparation === currentPreparation) {
          this.preparation = null;
          this.preparationAbortController = null;
        }
      });
    this.preparation = currentPreparation;
    return currentPreparation;
  }

  private async loadPack(
    generation: number,
    forceRefresh: boolean,
    signal?: AbortSignal
  ): Promise<VoicePackPreparation> {
    if (!this.fetchImpl || !this.cryptoImpl) {
      throw new VoicePackError('unsupported', 'Required offline-audio APIs are unavailable.');
    }
    this.context = this.context ?? ensureAudioContext();
    if (!this.context) {
      throw new VoicePackError('unsupported', 'Web Audio is unavailable.');
    }

    let manifestResponse: Response;
    try {
      manifestResponse = await this.fetchImpl(this.manifestUrl, {
        cache: forceRefresh ? 'reload' : 'force-cache',
        signal,
      });
    } catch {
      throw new VoicePackError('manifest-unavailable', 'Offline voice manifest could not be loaded.');
    }
    if (!manifestResponse.ok) {
      throw new VoicePackError('manifest-unavailable', 'Offline voice manifest returned HTTP ' + manifestResponse.status + '.');
    }
    this.assertPreparationCurrent(generation);

    let manifest: VoiceSpriteManifest;
    try {
      manifest = validateManifest(await manifestResponse.json());
    } catch (error) {
      if (error instanceof VoicePackError) throw error;
      throw new VoicePackError('manifest-invalid', 'Offline voice manifest is not valid JSON.');
    }
    this.assertPreparationCurrent(generation);
    const predictedDecodedBytes =
      Math.ceil(
        (manifest.sprite.sourceFrameCount / manifest.sourceSampleRateHz) * this.context.sampleRate
      ) *
      manifest.channels *
      4;
    if (predictedDecodedBytes > this.maxDecodedBytes) {
      throw new VoicePackError(
        'memory-limit',
        'Offline voice would exceed the decoded-memory limit on this device.'
      );
    }

    let spriteResponse: Response;
    try {
      spriteResponse = await this.fetchImpl(manifest.sprite.url, {
        cache: forceRefresh ? 'reload' : 'force-cache',
        signal,
      });
    } catch {
      throw new VoicePackError('sprite-unavailable', 'Offline voice audio could not be loaded.');
    }
    if (!spriteResponse.ok) {
      throw new VoicePackError('sprite-unavailable', 'Offline voice audio returned HTTP ' + spriteResponse.status + '.');
    }
    this.assertPreparationCurrent(generation);

    const encoded = await spriteResponse.arrayBuffer();
    this.assertPreparationCurrent(generation);
    if (encoded.byteLength !== manifest.sprite.encodedBytes) {
      throw new VoicePackError('integrity-failed', 'Offline voice audio size does not match its manifest.');
    }
    const hash = await sha256Hex(encoded, this.cryptoImpl);
    this.assertPreparationCurrent(generation);
    if (hash !== manifest.sprite.sha256.toLowerCase()) {
      throw new VoicePackError('integrity-failed', 'Offline voice audio failed its SHA-256 check.');
    }

    let decoded: AudioBuffer;
    try {
      this.assertPreparationCurrent(generation);
      decoded = await this.context.decodeAudioData(encoded);
    } catch {
      throw new VoicePackError('decode-failed', 'Offline voice audio could not be decoded.');
    }
    this.assertPreparationCurrent(generation);
    const decodedBytes = decoded.length * decoded.numberOfChannels * 4;
    if (decodedBytes > this.maxDecodedBytes) {
      throw new VoicePackError('memory-limit', 'Decoded offline voice exceeds the 48 MiB safety limit.');
    }
    const expectedDuration = manifest.sprite.sourceFrameCount / manifest.sourceSampleRateHz;
    if (
      decoded.numberOfChannels !== manifest.channels ||
      decoded.sampleRate !== manifest.runtimeSampleRateHz ||
      decoded.duration + 0.1 < expectedDuration
    ) {
      throw new VoicePackError('integrity-failed', 'Decoded offline voice duration or channels are invalid.');
    }

    if (generation !== this.preparationGeneration) {
      throw new VoicePackError('decode-failed', 'Offline voice preparation was cancelled.');
    }
    this.manifest = manifest;
    this.buffer = decoded;
    return {
      status: 'ready',
      decodedBytes,
      fragmentCount: Object.keys(manifest.fragments).length,
    };
  }

  private assertPreparationCurrent(generation: number): void {
    if (generation !== this.preparationGeneration) {
      throw new VoicePackError('decode-failed', 'Offline voice preparation was cancelled.');
    }
  }

  async resumeFromUserGesture(): Promise<boolean> {
    this.context = this.context ?? ensureAudioContext();
    if (!this.context) return false;
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        return false;
      }
    }
    return this.context.state !== 'closed';
  }

  schedule(plan: AnnouncementPlan, startAt: number, volume: number): ScheduledVoiceSequence {
    if (!this.context || !this.manifest || !this.buffer) {
      throw new VoicePackError('pack-incomplete', 'Offline voice is not ready.');
    }
    assertPlanIsResolvable(plan);

    const context = this.context;
    const manifest = this.manifest;
    const buffer = this.buffer;
    const outputVolume = Math.max(0, Math.min(1, volume));
    const sources: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];
    let cursor = Math.max(startAt, context.currentTime);
    let settled = false;
    let resolveDone: (status: 'completed' | 'cancelled') => void = () => {};
    const done = new Promise<'completed' | 'cancelled'>((resolve) => {
      resolveDone = resolve;
    });

    const cleanup = (status: 'completed' | 'cancelled') => {
      if (settled) return;
      settled = true;
      for (const source of sources) {
        source.onended = null;
        try {
          source.disconnect();
        } catch {
          // Already disconnected.
        }
      }
      for (const gain of gains) {
        try {
          gain.disconnect();
        } catch {
          // Already disconnected.
        }
      }
      this.activeSequences.delete(sequence);
      resolveDone(status);
    };

    const stop = () => {
      if (settled) return;
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // A source may already have ended.
        }
      }
      cleanup('cancelled');
    };

    const reap = () => {
      if (settled) return true;
      if (context.currentTime + 0.001 < sequence.endAt) return false;
      cleanup('completed');
      return true;
    };

    const sequence: ScheduledVoiceSequence = {
      startAt: cursor,
      endAt: cursor,
      sources,
      done,
      reap,
      stop,
    };

    try {
      for (const planned of plan.fragments) {
        const fragment = manifest.fragments[planned.id];
        if (!fragment) {
          throw new VoicePackError('pack-incomplete', 'Offline voice is missing fragment ' + planned.id + '.');
        }
        const offset = fragment.startFrame / manifest.sourceSampleRateHz;
        const duration = fragment.frameCount / manifest.sourceSampleRateHz;
        const source = context.createBufferSource();
        const gain = context.createGain();
        const fade = Math.min(0.006, duration / 4);
        source.buffer = buffer;
        gain.gain.setValueAtTime(0, cursor);
        gain.gain.linearRampToValueAtTime(outputVolume, cursor + fade);
        gain.gain.setValueAtTime(outputVolume, Math.max(cursor + fade, cursor + duration - fade));
        gain.gain.linearRampToValueAtTime(0, cursor + duration);
        source.connect(gain);
        gain.connect(context.destination);
        sources.push(source);
        gains.push(gain);
        source.start(cursor, offset, duration);
        cursor += duration + (planned.joinAfter ? JOIN_GAPS_SECONDS[planned.joinAfter] : 0);
      }
    } catch (error) {
      stop();
      throw error;
    }

    sequence.endAt = cursor;
    const lastSource = sources[sources.length - 1];
    if (lastSource) {
      lastSource.onended = () => cleanup('completed');
    } else {
      cleanup('completed');
    }
    this.activeSequences.add(sequence);
    return sequence;
  }

  cancel(sequence?: ScheduledVoiceSequence): void {
    if (sequence) {
      sequence.stop();
      return;
    }
    for (const active of Array.from(this.activeSequences)) active.stop();
  }

  release(): void {
    this.preparationGeneration += 1;
    this.preparationAbortController?.abort();
    this.preparationAbortController = null;
    this.cancel();
    this.buffer = null;
    this.manifest = null;
    this.preparation = null;
    this.lastPreparation = null;
  }
}
