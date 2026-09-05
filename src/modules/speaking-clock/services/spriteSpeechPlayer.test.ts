import { describe, expect, it, vi } from 'vitest';
import {
  VOICE_FRAGMENT_DEFINITIONS,
  VOICE_GRAMMAR_VERSION,
  VOICE_PACK_ID,
  VOICE_REGISTRY_SHA256,
  type AnnouncementPlan,
} from './polishAnnouncementPlanner';
import { SpriteSpeechPlayer, type VoiceSpriteManifest } from './spriteSpeechPlayer';

function createManifest(hash = '00'.repeat(32)): VoiceSpriteManifest {
  const fragments: VoiceSpriteManifest['fragments'] = {};
  let cursor = 0;
  for (const definition of VOICE_FRAGMENT_DEFINITIONS) {
    fragments[definition.id] = {
      startFrame: cursor,
      frameCount: 10,
      text: definition.text,
      prosodyRole: definition.prosodyRole,
      promptId: definition.promptId,
    };
    cursor += 10;
  }
  return {
    schemaVersion: 1,
    grammarVersion: VOICE_GRAMMAR_VERSION,
    registrySha256: VOICE_REGISTRY_SHA256,
    packId: VOICE_PACK_ID,
    model: 'gemini-3.1-flash-tts-preview',
    voice: 'Kore',
    locale: 'pl-PL',
    sourceSampleRateHz: 24_000,
    runtimeSampleRateHz: 24_000,
    channels: 1,
    generatedAt: '2026-08-29T00:00:00.000Z',
    sprite: {
      url: '/audio/voice/' + VOICE_PACK_ID + '/sprite.' + hash + '.ogg',
      sha256: hash,
      encodedBytes: 4,
      sourceFrameCount: cursor,
    },
    fragments,
  };
}

function createAudioContext(decodedLength = 48_000, sampleRate = 24_000) {
  const sources: Array<{
    buffer: AudioBuffer | null;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }> = [];
  const context = {
    state: 'running' as AudioContextState,
    sampleRate,
    currentTime: 5,
    destination: {},
    resume: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async () => ({
      length: decodedLength,
      numberOfChannels: 1,
      sampleRate: 24_000,
      duration: decodedLength / 24_000,
    } as AudioBuffer)),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null as AudioBuffer | null,
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
      sources.push(source);
      return source as unknown as AudioBufferSourceNode;
    }),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as GainNode)),
  };
  return { context: context as unknown as AudioContext, sources };
}

function createCrypto(digestByte = 0): Crypto {
  return {
    subtle: {
      digest: vi.fn(async () => new Uint8Array(32).fill(digestByte).buffer),
    },
  } as unknown as Crypto;
}

function createFetch(manifest: VoiceSpriteManifest) {
  return vi.fn(async (url: string | URL | Request) => {
    if (String(url).includes('manifest')) {
      return { ok: true, status: 200, json: async () => manifest } as Response;
    }
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    } as Response;
  }) as unknown as typeof fetch;
}

describe('SpriteSpeechPlayer', () => {
  it('refuses playback when a successful resume call leaves the context suspended', async () => {
    const { context, sources } = createAudioContext();
    Object.defineProperty(context, 'state', { value: 'suspended', configurable: true });
    const player = new SpriteSpeechPlayer({ context, fetchImpl: createFetch(createManifest()), cryptoImpl: createCrypto() });
    await player.prepare();

    await expect(player.resumeFromUserGesture()).resolves.toBe(false);
    expect(() => player.schedule({ text: 'test', fragments: [{ id: VOICE_FRAGMENT_DEFINITIONS[0].id }] }, 6, 1)).toThrow();
    expect(sources).toHaveLength(0);
  });

  it('fetches, verifies and decodes a complete pack only once', async () => {
    const { context } = createAudioContext();
    const fetchImpl = createFetch(createManifest());
    const player = new SpriteSpeechPlayer({ context, fetchImpl, cryptoImpl: createCrypto() });

    const [first, second] = await Promise.all([player.prepare(), player.prepare()]);

    expect(first.status).toBe('ready');
    expect(second.status).toBe('ready');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(context.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(player.getState()).toBe('ready');
  });

  it('schedules every fragment synchronously on one AudioContext timeline', async () => {
    const { context, sources } = createAudioContext();
    const player = new SpriteSpeechPlayer({
      context,
      fetchImpl: createFetch(createManifest()),
      cryptoImpl: createCrypto(),
    });
    await player.prepare();
    const plan: AnnouncementPlan = {
      text: 'test',
      fragments: [
        { id: VOICE_FRAGMENT_DEFINITIONS[0].id, joinAfter: 'neutral-word' },
        { id: VOICE_FRAGMENT_DEFINITIONS[1].id },
      ],
    };

    const sequence = player.schedule(plan, 10, 0.75);

    expect(sources).toHaveLength(2);
    expect(sources[0].start).toHaveBeenCalledWith(10, 0, 10 / 24_000);
    expect(sources[1].start).toHaveBeenCalledTimes(1);
    expect(sequence.endAt).toBeGreaterThan(sequence.startAt);
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
  });

  it('cancels all scheduled sources and resolves cancellation exactly once', async () => {
    const { context, sources } = createAudioContext();
    const player = new SpriteSpeechPlayer({
      context,
      fetchImpl: createFetch(createManifest()),
      cryptoImpl: createCrypto(),
    });
    await player.prepare();
    const sequence = player.schedule(
      { text: 'test', fragments: [{ id: VOICE_FRAGMENT_DEFINITIONS[0].id }] },
      6,
      1
    );
    sequence.stop();
    sequence.stop();
    await expect(sequence.done).resolves.toBe('cancelled');
    expect(sources[0].stop).toHaveBeenCalledTimes(1);
  });

  it('reaps a completed sequence from the audio clock when onended is delayed', async () => {
    const { context } = createAudioContext();
    const mutableContext = context as AudioContext & { currentTime: number };
    const player = new SpriteSpeechPlayer({
      context,
      fetchImpl: createFetch(createManifest()),
      cryptoImpl: createCrypto(),
    });
    await player.prepare();
    const sequence = player.schedule(
      { text: 'test', fragments: [{ id: VOICE_FRAGMENT_DEFINITIONS[0].id }] },
      6,
      1
    );

    mutableContext.currentTime = sequence.endAt + 0.01;
    expect(sequence.reap()).toBe(true);
    await expect(sequence.done).resolves.toBe('completed');
  });

  it('fails closed on an integrity mismatch', async () => {
    const { context } = createAudioContext();
    const player = new SpriteSpeechPlayer({
      context,
      fetchImpl: createFetch(createManifest('11'.repeat(32))),
      cryptoImpl: createCrypto(),
    });
    await expect(player.prepare()).resolves.toMatchObject({
      status: 'failed',
      code: 'integrity-failed',
    });
    expect(player.getState()).toBe('failed');
  });

  it('fails closed when the actual decoded buffer exceeds the memory gate', async () => {
    const { context } = createAudioContext(20_000_000);
    const player = new SpriteSpeechPlayer({
      context,
      fetchImpl: createFetch(createManifest()),
      cryptoImpl: createCrypto(),
    });
    await expect(player.prepare()).resolves.toMatchObject({
      status: 'failed',
      code: 'memory-limit',
    });
  });

  it('rejects an oversized device-rate allocation before sprite fetch or decode', async () => {
    const { context } = createAudioContext(48_000, 48_000);
    const manifest = createManifest();
    manifest.sprite.sourceFrameCount = 10_000_000;
    const fetchImpl = createFetch(manifest);
    const player = new SpriteSpeechPlayer({ context, fetchImpl, cryptoImpl: createCrypto() });

    await expect(player.prepare()).resolves.toMatchObject({
      status: 'failed',
      code: 'memory-limit',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(context.decodeAudioData).not.toHaveBeenCalled();
  });

  it('does not retain a pack when release wins a deferred decode race', async () => {
    let finishDecode!: (buffer: AudioBuffer) => void;
    const { context } = createAudioContext();
    vi.mocked(context.decodeAudioData).mockImplementationOnce(
      () => new Promise<AudioBuffer>((resolve) => { finishDecode = resolve; })
    );
    const player = new SpriteSpeechPlayer({
      context,
      fetchImpl: createFetch(createManifest()),
      cryptoImpl: createCrypto(),
    });

    const preparation = player.prepare();
    await vi.waitFor(() => expect(context.decodeAudioData).toHaveBeenCalledTimes(1));
    player.release();
    finishDecode({
      length: 48_000,
      numberOfChannels: 1,
      sampleRate: 24_000,
      duration: 2,
    } as AudioBuffer);

    await expect(preparation).resolves.toMatchObject({ status: 'failed' });
    expect(player.getState()).toBe('idle');
  });

  it('does not fetch the sprite or decode after release wins a manifest fetch race', async () => {
    let finishManifestFetch!: (response: Response) => void;
    const { context } = createAudioContext();
    const fetchImpl = vi.fn((url: string | URL | Request) => {
      if (String(url).includes('manifest')) {
        return new Promise<Response>((resolve) => { finishManifestFetch = resolve; });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      } as Response);
    }) as unknown as typeof fetch;
    const player = new SpriteSpeechPlayer({ context, fetchImpl, cryptoImpl: createCrypto() });

    const preparation = player.prepare();
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    player.release();
    finishManifestFetch({
      ok: true,
      status: 200,
      json: async () => createManifest(),
    } as Response);

    await expect(preparation).resolves.toMatchObject({ status: 'failed' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(context.decodeAudioData).not.toHaveBeenCalled();
    expect(player.getState()).toBe('idle');
  });

  it('refreshes a failed cache before retrying with reload semantics', async () => {
    const { context } = createAudioContext();
    const badManifest = createManifest('11'.repeat(32));
    const goodManifest = createManifest();
    let refreshed = false;
    const refreshVoiceCache = vi.fn(async () => { refreshed = true; });
    const fetchImpl = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      if (String(url).includes('manifest')) {
        return {
          ok: true,
          status: 200,
          json: async () => (refreshed ? goodManifest : badManifest),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      } as Response;
    }) as unknown as typeof fetch;
    const player = new SpriteSpeechPlayer({
      context,
      fetchImpl,
      cryptoImpl: createCrypto(),
      refreshVoiceCache,
    });

    await expect(player.prepare()).resolves.toMatchObject({ status: 'failed' });
    await expect(player.prepare(true)).resolves.toMatchObject({ status: 'ready' });
    expect(refreshVoiceCache).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchImpl).mock.calls.slice(-2).every((call) => call[1]?.cache === 'reload')).toBe(true);
  });
});
