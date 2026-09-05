import { createHash, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://example.test';
const PACK_ID = 'pl-PL-kore-gemini-3.1-v1';
const MANIFEST_URL = '/audio/voice/' + PACK_ID + '/manifest.json';
const ACTIVE_POINTER_CACHE = 'przystan-snapshot-index-v1';
const ACTIVE_POINTER_URL = '/__przystan_current__';
const PENDING_POINTER_CACHE = 'przystan-snapshot-index-staging-v1';
const PENDING_POINTER_URL = '/__przystan_pending__';
const ASSET_MANIFEST_URL = '/asset-manifest.json';
const APP_ASSET = '/assets/app-AbCd1234.js';
const CSS_ASSET = '/assets/app-EfGh5678.css';
const WORKER_ASSET = '/assets/timerWorker-ZzYyXxWw.js';
const WORKER_ASSET_V2 = '/assets/timerWorker-AaBbCcDd.js';

type Body = string | ArrayBuffer | Uint8Array;

class FakeResponse {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Record<string, string>;
  readonly type = 'basic';

  constructor(
    private readonly body: Body,
    init: { status?: number; headers?: Record<string, string> } = {}
  ) {
    this.status = init.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = init.headers ?? {};
  }

  clone(): FakeResponse {
    return new FakeResponse(
      typeof this.body === 'string'
        ? this.body
        : this.body instanceof Uint8Array
          ? this.body.slice()
          : this.body.slice(0),
      { status: this.status, headers: this.headers }
    );
  }

  async text(): Promise<string> {
    if (typeof this.body === 'string') return this.body;
    return new TextDecoder().decode(
      this.body instanceof Uint8Array ? this.body : new Uint8Array(this.body)
    );
  }

  async json(): Promise<unknown> {
    return JSON.parse(await this.text());
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (typeof this.body === 'string') return new TextEncoder().encode(this.body).buffer;
    if (this.body instanceof Uint8Array) {
      return this.body.slice().buffer;
    }
    return this.body.slice(0);
  }
}

interface SharedLockManager {
  request(
    name: string,
    options: { mode: 'exclusive' },
    callback: () => Promise<unknown>
  ): Promise<unknown>;
  hold(): void;
  release(): void;
  waitForRequest(count: number): Promise<void>;
}

interface SharedWorkerState {
  cacheContents: Map<string, Map<string, FakeResponse>>;
  deleted: string[];
  putLog: Array<{ cacheName: string; key: string }>;
  voicePutCounts: Map<string, number>;
  locks: SharedLockManager;
}

function createSharedLockManager(): SharedLockManager {
  let blocked = false;
  let running = false;
  let requestCount = 0;
  const requestWaiters: Array<{ count: number; resolve: () => void }> = [];
  const queue: Array<{
    callback: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];
  const drain = () => {
    if (blocked || running || queue.length === 0) return;
    // Deliberately schedule the newest waiter first to exercise an adversarial
    // cross-global ordering without relying on Web Locks fairness.
    const next = queue.pop()!;
    running = true;
    Promise.resolve()
      .then(next.callback)
      .then(next.resolve, next.reject)
      .finally(() => {
        running = false;
        drain();
      });
  };
  return {
    request: vi.fn((
      _name: string,
      _options: { mode: 'exclusive' },
      callback: () => Promise<unknown>
    ) => new Promise<unknown>((resolve, reject) => {
      requestCount += 1;
      for (const waiter of requestWaiters.splice(0)) {
        if (requestCount >= waiter.count) waiter.resolve();
        else requestWaiters.push(waiter);
      }
      queue.push({ callback, resolve, reject });
      drain();
    })),
    hold() { blocked = true; },
    release() { blocked = false; drain(); },
    waitForRequest(count: number) {
      if (requestCount >= count) return Promise.resolve();
      return new Promise<void>((resolve) => requestWaiters.push({ count, resolve }));
    },
  };
}

function createSharedWorkerState(): SharedWorkerState {
  return {
    cacheContents: new Map(),
    deleted: [],
    putLog: [],
    voicePutCounts: new Map(),
    locks: createSharedLockManager(),
  };
}

function sha256(value: Body): string {
  const bytes =
    typeof value === 'string'
      ? new TextEncoder().encode(value)
      : value instanceof Uint8Array
        ? value
        : new Uint8Array(value);
  return createHash('sha256').update(bytes).digest('hex');
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface VoiceManifest {
  schemaVersion: number;
  grammarVersion: string;
  packId: string;
  model: string;
  voice: string;
  locale: string;
  sourceSampleRateHz: number;
  runtimeSampleRateHz: number;
  channels: number;
  generatedAt: string;
  registrySha256: string;
  sprite: {
    url: string;
    sha256: string;
    encodedBytes: number;
    sourceFrameCount: number;
  };
  fragments: Record<
    string,
    {
      startFrame: number;
      frameCount: number;
      text: string;
      prosodyRole: string;
      promptId: string;
    }
  >;
}

async function loadManifestFixture(): Promise<VoiceManifest> {
  const fixture = JSON.parse(
    await readFile(resolve('public', 'audio', 'voice', PACK_ID, 'manifest.json'), 'utf8')
  ) as VoiceManifest;
  // Keep the registry and all 337 real IDs/texts while using a tiny deterministic
  // sprite in this unit test.
  const sprite = new Uint8Array([1, 2, 3, 4]);
  const hash = sha256(sprite);
  fixture.registrySha256 = 'b88d01bcd3cdb82b559d1aec60e99cb59a4c38c37d73136544f697ddbe575504';
  fixture.sprite = {
    url: '/audio/voice/' + PACK_ID + '/sprite.' + hash + '.ogg',
    sha256: hash,
    encodedBytes: sprite.byteLength,
    sourceFrameCount: fixture.sprite.sourceFrameCount,
  };
  return fixture;
}

function cacheKey(request: unknown): string {
  const raw =
    typeof request === 'string'
      ? request
      : request && typeof request === 'object' && 'url' in request
        ? String((request as { url: string }).url)
        : String(request);
  try {
    const parsed = new URL(raw, ORIGIN);
    return parsed.pathname + parsed.search;
  } catch {
    return raw;
  }
}

interface WorkerOptions {
  manifestMutator?: (manifest: VoiceManifest) => void;
  spriteStatus?: number;
  missingAsset?: string;
  missingAssetStatus?: number;
  failVoicePutAt?: number;
  initialCaches?: string[];
  initialCacheContents?: Map<string, Map<string, FakeResponse>>;
  sharedState?: SharedWorkerState;
}

async function loadServiceWorker(options: WorkerOptions = {}) {
  const source = await readFile(resolve('public', 'sw.js'), 'utf8');
  const listeners = new Map<string, (event: any) => void>();
  const sharedState = options.sharedState;
  const cacheContents = sharedState?.cacheContents ?? new Map<string, Map<string, FakeResponse>>();
  for (const name of options.initialCaches ?? []) cacheContents.set(name, new Map());
  for (const [name, entries] of options.initialCacheContents ?? []) {
    cacheContents.set(
      name,
      new Map(Array.from(entries.entries(), ([key, response]) => [key, response.clone()] as const))
    );
  }
  const deleted = sharedState?.deleted ?? [];
  const putLog = sharedState?.putLog ?? [];
  const voicePutCounts = sharedState?.voicePutCounts ?? new Map<string, number>();
  const sprite = new Uint8Array([1, 2, 3, 4]);
  let manifest = await loadManifestFixture();
  options.manifestMutator?.(manifest);
  let coreVersion = 1;
  let offline = false;
  let navigationStatus = 200;
  let fetchHook: ((path: string) => Promise<void> | void) | null = null;

  const indexHtml = () =>
    '<!doctype html><html><head>' +
    '<script type="module" src="' + APP_ASSET + '"></script>' +
    '<link rel="stylesheet" href="' + CSS_ASSET + '"></head><body></body></html>';
  const workerAsset = () => coreVersion === 1 ? WORKER_ASSET : WORKER_ASSET_V2;
  const assetManifest = () =>
    JSON.stringify({ schemaVersion: 1, assets: [APP_ASSET, CSS_ASSET, workerAsset()] });
  const assetBody = (url: string): Body => {
    if (url === APP_ASSET) {
      return 'new Worker(new URL("' + workerAsset() + '", import.meta.url)); v' + coreVersion;
    }
    if (url === CSS_ASSET) return 'body{color:rgb(' + coreVersion + ',1,1)}';
    if (url === WORKER_ASSET || url === WORKER_ASSET_V2) {
      return 'self.postMessage("ready-' + (url === WORKER_ASSET ? 1 : 2) + '")';
    }
    return url + ':v' + coreVersion;
  };
  const manifestText = () => JSON.stringify(manifest);
  const manifestHash = () => sha256(manifestText());
  const spriteUrl = () => manifest.sprite.url;

  const skipWaiting = vi.fn(async () => {});
  const claim = vi.fn(async () => {});
  const caches = {
    keys: vi.fn(async () => Array.from(cacheContents.keys())),
    open: vi.fn(async (name: string) => {
      if (!cacheContents.has(name)) cacheContents.set(name, new Map());
      const entries = cacheContents.get(name)!;
      return {
        addAll: vi.fn(async () => {}),
        match: vi.fn(async (request: unknown) => entries.get(cacheKey(request))?.clone()),
        put: vi.fn(async (request: unknown, response: FakeResponse) => {
          const key = cacheKey(request);
          if (name.startsWith('przystan-voice-') &&
              !name.startsWith('przystan-voice-staging-') &&
              name !== ACTIVE_POINTER_CACHE) {
            const count = (voicePutCounts.get(name) ?? 0) + 1;
            voicePutCounts.set(name, count);
            if (options.failVoicePutAt === count) {
              throw new Error('voice put ' + count + ' failed');
            }
          }
          putLog.push({ cacheName: name, key });
          entries.set(key, response.clone());
        }),
      };
    }),
    delete: vi.fn(async (name: string) => {
      deleted.push(name);
      return cacheContents.delete(name);
    }),
    match: vi.fn(),
  };

  const fetchImpl = vi.fn(async (request: unknown) => {
    if (offline) throw new Error('offline');
    const raw =
      typeof request === 'string'
        ? request
        : request && typeof request === 'object' && 'url' in request
          ? String((request as { url: string }).url)
          : String(request);
    const path = new URL(raw, ORIGIN).pathname;
    await fetchHook?.(path);
    if (path === MANIFEST_URL) return new FakeResponse(manifestText());
    if (path === spriteUrl()) {
      return new FakeResponse(sprite, { status: options.spriteStatus ?? 200 });
    }
    if (path === ASSET_MANIFEST_URL) return new FakeResponse(assetManifest());
    if (options.missingAsset && path === options.missingAsset) {
      return new FakeResponse(
        (options.missingAssetStatus ?? 404) === 200 ? '<!doctype html><html>fallback</html>' : 'missing',
        { status: options.missingAssetStatus ?? 404 }
      );
    }
    if (path === '/' || path === '/index.html') {
      const isNavigation =
        request && typeof request === 'object' && 'mode' in request &&
        (request as { mode?: string }).mode === 'navigate';
      return new FakeResponse(indexHtml(), { status: isNavigation ? navigationStatus : 200 });
    }
    if (path.startsWith('/assets/')) return new FakeResponse(assetBody(path));
    return new FakeResponse(assetBody(path));
  });

  const selfMock: Record<string, any> = {
    location: { origin: ORIGIN },
    clients: { claim },
    skipWaiting,
    addEventListener: (name: string, handler: (event: any) => void) => {
      listeners.set(name, handler);
    },
  };
  if (sharedState) selfMock.navigator = { locks: sharedState.locks };

  const evaluate = new Function('self', 'caches', 'fetch', 'crypto', 'Response', 'TextDecoder', 'TextEncoder', source);
  evaluate(selfMock, caches, fetchImpl, webcrypto, FakeResponse, TextDecoder, TextEncoder);

  return {
    listeners,
    cacheContents,
    deleted,
    putLog,
    fetchImpl,
    skipWaiting,
    claim,
    manifestUrl: MANIFEST_URL,
    spriteUrl,
    manifest,
    manifestHash,
    setManifest(next: VoiceManifest) { manifest = cloneJson(next); },
    setCoreVersion(next: number) { coreVersion = next; },
    setOffline(next: boolean) { offline = next; },
    setNavigationStatus(next: number) { navigationStatus = next; },
    setFetchHook(next: ((path: string) => Promise<void> | void) | null) { fetchHook = next; },
  };
}

function runWaitUntil(handler: ((event: any) => void) | undefined): Promise<unknown> {
  let result: Promise<unknown> | undefined;
  handler?.({ waitUntil: (promise: Promise<unknown>) => { result = promise; } });
  if (!result) throw new Error('Handler did not call waitUntil.');
  return result;
}

async function seedVerifiedVoiceCache(worker: Awaited<ReturnType<typeof loadServiceWorker>>) {
  const prior = cloneJson(worker.manifest);
  prior.generatedAt = '2026-08-28T00:00:00.000Z';
  const priorText = JSON.stringify(prior);
  const priorHash = sha256(priorText);
  const priorCacheName = 'przystan-voice-' + PACK_ID + '-' + priorHash + '-' + prior.sprite.sha256;
  const entries = new Map<string, FakeResponse>();
  entries.set(MANIFEST_URL, new FakeResponse(priorText));
  entries.set(prior.sprite.url, new FakeResponse(new Uint8Array([1, 2, 3, 4])));
  worker.cacheContents.set(priorCacheName, entries);
  const pointer = {
    core: null,
    voice: {
      cacheName: priorCacheName,
      manifestHash: priorHash,
      spriteHash: prior.sprite.sha256,
      packId: PACK_ID,
    },
  };
  worker.cacheContents.set(
    ACTIVE_POINTER_CACHE,
    new Map([[ACTIVE_POINTER_URL, new FakeResponse(JSON.stringify(pointer))]])
  );
  return { priorCacheName, priorText, pointerText: JSON.stringify(pointer) };
}

describe('service worker voice-pack cache', () => {
  it.each(['navigate', 'cors'])('leaves APK downloads to the network in %s mode, even offline', async (mode) => {
    const worker = await loadServiceWorker();
    await runWaitUntil(worker.listeners.get('install'));
    await runWaitUntil(worker.listeners.get('activate'));
    worker.setOffline(true);
    const respondWith = vi.fn();
    worker.listeners.get('fetch')?.({
      request: { method: 'GET', mode, url: ORIGIN + '/downloads/przystan.apk' },
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('installs only after the complete verified voice pack and cold-start core are cached', async () => {
    const worker = await loadServiceWorker();
    await runWaitUntil(worker.listeners.get('install'));
    await runWaitUntil(worker.listeners.get('activate'));

    const voiceCaches = Array.from(worker.cacheContents.keys()).filter((name) =>
      name.startsWith('przystan-voice-' + PACK_ID + '-')
    );
    expect(voiceCaches).toHaveLength(1);
    const voiceCache = worker.cacheContents.get(voiceCaches[0]);
    expect(voiceCache?.has(worker.manifestUrl)).toBe(true);
    expect(voiceCache?.has(worker.spriteUrl())).toBe(true);
    const voicePuts = worker.putLog.filter((entry) => entry.cacheName === voiceCaches[0]);
    expect(voicePuts.map((entry) => entry.key)).toEqual([worker.spriteUrl(), worker.manifestUrl]);

    const coreCaches = Array.from(worker.cacheContents.keys()).filter((name) =>
      /^przystan-core-[a-f0-9]{64}$/.test(name)
    );
    expect(coreCaches).toHaveLength(1);
    expect(worker.cacheContents.get(coreCaches[0])?.has(WORKER_ASSET)).toBe(true);
    expect(worker.cacheContents.get(ACTIVE_POINTER_CACHE)?.has(ACTIVE_POINTER_URL)).toBe(true);
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('activates a complete install after the service-worker global is restarted', async () => {
    const installingWorker = await loadServiceWorker();
    await runWaitUntil(installingWorker.listeners.get('install'));

    expect(installingWorker.cacheContents.get(ACTIVE_POINTER_CACHE)?.has(ACTIVE_POINTER_URL)).toBe(false);
    expect(installingWorker.cacheContents.get(PENDING_POINTER_CACHE)?.has(PENDING_POINTER_URL)).toBe(true);

    const restartedWorker = await loadServiceWorker({
      initialCacheContents: installingWorker.cacheContents,
    });
    await runWaitUntil(restartedWorker.listeners.get('activate'));

    const pointerResponse = restartedWorker.cacheContents.get(ACTIVE_POINTER_CACHE)?.get(ACTIVE_POINTER_URL);
    expect(pointerResponse).toBeDefined();
    const pointer = JSON.parse(await pointerResponse!.text()) as {
      core: { cacheName: string };
      voice: { cacheName: string };
    };
    expect(restartedWorker.cacheContents.has(PENDING_POINTER_CACHE)).toBe(false);
    expect(restartedWorker.cacheContents.has(pointer.core.cacheName)).toBe(true);
    expect(restartedWorker.cacheContents.has(pointer.voice.cacheName)).toBe(true);
    expect(restartedWorker.claim).toHaveBeenCalledTimes(1);
  });

  it('rejects incomplete or malformed fragment manifests before creating a voice cache', async () => {
    const incomplete = await loadServiceWorker({
      manifestMutator: (manifest) => {
        const lastId = Object.keys(manifest.fragments).pop();
        if (lastId) delete manifest.fragments[lastId];
      },
    });
    await expect(runWaitUntil(incomplete.listeners.get('install'))).rejects.toThrow('Voice manifest integrity contract failed');
    expect(incomplete.skipWaiting).not.toHaveBeenCalled();
    expect(Array.from(incomplete.cacheContents.keys()).some((name) => name.startsWith('przystan-voice-' + PACK_ID + '-'))).toBe(false);

    const invalid = await loadServiceWorker({
      manifestMutator: (manifest) => {
        const secondId = Object.keys(manifest.fragments)[1];
        manifest.fragments[secondId].startFrame = 0;
      },
    });
    await expect(runWaitUntil(invalid.listeners.get('install'))).rejects.toThrow('overlap');
    expect(invalid.skipWaiting).not.toHaveBeenCalled();
  });

  it('fails closed when the sprite is unavailable or the generated worker bundle is missing', async () => {
    const spriteFailure = await loadServiceWorker({ spriteStatus: 503 });
    await expect(runWaitUntil(spriteFailure.listeners.get('install'))).rejects.toThrow('Asset HTTP 503');
    expect(spriteFailure.skipWaiting).not.toHaveBeenCalled();

    const bundleFailure = await loadServiceWorker({ missingAsset: WORKER_ASSET });
    await expect(runWaitUntil(bundleFailure.listeners.get('install'))).rejects.toThrow('Asset HTTP 404');
    expect(bundleFailure.skipWaiting).not.toHaveBeenCalled();
    expect(Array.from(bundleFailure.cacheContents.keys()).some((name) => /^przystan-core-[a-f0-9]{64}$/.test(name))).toBe(false);

    const spaFallback = await loadServiceWorker({
      missingAsset: WORKER_ASSET,
      missingAssetStatus: 200,
    });
    await expect(runWaitUntil(spaFallback.listeners.get('install'))).rejects.toThrow('Build asset returned HTML');
    expect(spaFallback.skipWaiting).not.toHaveBeenCalled();
  });

  it.each([1, 2])('retains the prior verified cache when voice put %s fails and removes the failed snapshot', async (failVoicePutAt) => {
    const worker = await loadServiceWorker({ failVoicePutAt });
    const prior = await seedVerifiedVoiceCache(worker);
    await expect(runWaitUntil(worker.listeners.get('install'))).rejects.toThrow('voice put ' + failVoicePutAt + ' failed');
    expect(worker.skipWaiting).not.toHaveBeenCalled();
    expect(worker.cacheContents.get(prior.priorCacheName)?.get(MANIFEST_URL)).toBeDefined();
    expect(worker.cacheContents.get(prior.priorCacheName)?.get(MANIFEST_URL) &&
      await worker.cacheContents.get(prior.priorCacheName)!.get(MANIFEST_URL)!.text()).toBe(prior.priorText);
    expect(Array.from(worker.cacheContents.keys()).filter((name) => name.startsWith('przystan-voice-' + PACK_ID + '-') && name !== prior.priorCacheName)).toHaveLength(0);
    expect(worker.cacheContents.get(ACTIVE_POINTER_CACHE)?.get(ACTIVE_POINTER_URL) &&
      await worker.cacheContents.get(ACTIVE_POINTER_CACHE)!.get(ACTIVE_POINTER_URL)!.text()).toBe(prior.pointerText);
  });

  it('refreshes a pack through a MessagePort only after complete writes', async () => {
    const worker = await loadServiceWorker();
    await runWaitUntil(worker.listeners.get('install'));
    await runWaitUntil(worker.listeners.get('activate'));
    const oldVoiceCache = Array.from(worker.cacheContents.keys()).find((name) => name.startsWith('przystan-voice-' + PACK_ID + '-'))!;
    const refreshed = cloneJson(worker.manifest);
    refreshed.generatedAt = '2026-08-29T12:00:00.000Z';
    worker.setManifest(refreshed);
    const port = { postMessage: vi.fn() };
    const messageWait = runWaitUntil((event) => worker.listeners.get('message')?.({
      data: { type: 'REFRESH_VOICE_PACK' },
      ports: [port],
      waitUntil: event.waitUntil,
    }));
    await messageWait;
    expect(port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ ok: true, status: 'ok' }));
    const newVoiceCache = Array.from(worker.cacheContents.keys()).find((name) =>
      name.startsWith('przystan-voice-' + PACK_ID + '-') && name !== oldVoiceCache
    );
    expect(newVoiceCache).toBeDefined();
    expect(worker.cacheContents.get(newVoiceCache!)?.has(MANIFEST_URL)).toBe(true);
  });

  it('keeps a cross-global refresh reply pointed at a retained cache', async () => {
    const shared = createSharedWorkerState();
    const oldWorker = await loadServiceWorker({ sharedState: shared });
    await runWaitUntil(oldWorker.listeners.get('install'));
    await runWaitUntil(oldWorker.listeners.get('activate'));

    const newWorker = await loadServiceWorker({
      sharedState: shared,
      manifestMutator: (next) => { next.generatedAt = '2026-08-30T00:00:00.000Z'; },
    });
    await runWaitUntil(newWorker.listeners.get('install'));

    const runtimeManifest = cloneJson(oldWorker.manifest);
    runtimeManifest.generatedAt = '2026-08-30T01:00:00.000Z';
    oldWorker.setManifest(runtimeManifest);
    let runtimePreparedResolve!: () => void;
    const runtimePrepared = new Promise<void>((resolve) => { runtimePreparedResolve = resolve; });
    oldWorker.setFetchHook((path) => {
      if (path === oldWorker.spriteUrl()) runtimePreparedResolve();
    });
    const port = { postMessage: vi.fn() };

    // Hold the shared lock until both the old runtime request and the new
    // activation are waiting. The test lock schedules the newest waiter first,
    // so activation cleanup runs before the old commit in the buggy ordering.
    shared.locks.hold();
    const refreshWait = runWaitUntil((event) => oldWorker.listeners.get('message')?.({
      data: { type: 'REFRESH_VOICE_PACK' },
      ports: [port],
      waitUntil: event.waitUntil,
    }));
    await runtimePrepared;
    await shared.locks.waitForRequest(2);

    const activateWait = runWaitUntil(newWorker.listeners.get('activate'));
    await shared.locks.waitForRequest(3);
    shared.locks.release();
    await Promise.all([refreshWait, activateWait]);

    const reply = port.postMessage.mock.calls[0]?.[0] as {
      ok: boolean;
      cacheName?: string;
    };
    expect(reply).toMatchObject({ ok: true });
    expect(reply.cacheName).toBeDefined();
    expect(shared.cacheContents.has(reply.cacheName!)).toBe(true);
    const pointerResponse = shared.cacheContents.get(ACTIVE_POINTER_CACHE)!.get(ACTIVE_POINTER_URL)!;
    const pointer = JSON.parse(await pointerResponse.text()) as { voice: { cacheName: string } };
    expect(pointer.voice.cacheName).toBe(reply.cacheName);
  });

  it('reports refresh failures through the MessagePort message field', async () => {
    const worker = await loadServiceWorker();
    await runWaitUntil(worker.listeners.get('install'));
    await runWaitUntil(worker.listeners.get('activate'));
    const invalid = cloneJson(worker.manifest);
    invalid.registrySha256 = '0'.repeat(64);
    worker.setManifest(invalid);
    const port = { postMessage: vi.fn() };

    await runWaitUntil((event) => worker.listeners.get('message')?.({
      data: { type: 'REFRESH_VOICE_PACK' },
      ports: [port],
      waitUntil: event.waitUntil,
    }));

    expect(port.postMessage).toHaveBeenCalledWith({
      ok: false,
      message: expect.stringContaining('registry'),
    });
  });

  it('retains the pointer-selected current and one previous voice snapshot while preserving unrelated caches', async () => {
    const worker = await loadServiceWorker({
      initialCaches: [
        'przystan-core-v2',
        'przystan-voice-' + PACK_ID + '-' + '0'.repeat(64) + '-' + '0'.repeat(64),
        'przystan-voice-' + PACK_ID + '-' + '1'.repeat(64) + '-' + '1'.repeat(64),
        'przystan-voice-' + PACK_ID + '-' + '2'.repeat(64) + '-' + '2'.repeat(64),
        ACTIVE_POINTER_CACHE,
        'unrelated-cache',
      ],
    });
    const current = 'przystan-voice-' + PACK_ID + '-' + '0'.repeat(64) + '-' + '0'.repeat(64);
    const previous = 'przystan-voice-' + PACK_ID + '-' + '2'.repeat(64) + '-' + '2'.repeat(64);
    worker.cacheContents.set(
      ACTIVE_POINTER_CACHE,
      new Map([[
        ACTIVE_POINTER_URL,
        new FakeResponse(JSON.stringify({
          voice: { cacheName: current },
          voicePrevious: { cacheName: previous },
        })),
      ]])
    );
    await runWaitUntil(worker.listeners.get('activate'));

    expect(worker.deleted).toContain('przystan-core-v2');
    expect(worker.deleted).not.toContain(current);
    expect(worker.deleted).not.toContain(previous);
    expect(worker.deleted).toContain('przystan-voice-' + PACK_ID + '-' + '1'.repeat(64) + '-' + '1'.repeat(64));
    expect(worker.deleted).not.toContain(ACTIVE_POINTER_CACHE);
    expect(worker.deleted).not.toContain('unrelated-cache');
    expect(worker.claim).toHaveBeenCalledTimes(1);
  });

  it('atomically advances the core pointer when an online navigation discovers a new bundle revision', async () => {
    const worker = await loadServiceWorker();
    await runWaitUntil(worker.listeners.get('install'));
    await runWaitUntil(worker.listeners.get('activate'));
    const oldCoreCache = Array.from(worker.cacheContents.keys()).find((name) => /^przystan-core-[a-f0-9]{64}$/.test(name))!;
    worker.setCoreVersion(2);
    let responsePromise: Promise<unknown> | undefined;
    const waits: Promise<unknown>[] = [];
    worker.listeners.get('fetch')?.({
      request: { method: 'GET', mode: 'navigate', url: ORIGIN + '/' },
      respondWith: (response: Promise<unknown>) => { responsePromise = response; },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await responsePromise;
    await Promise.all(waits);
    const pointer = JSON.parse(await worker.cacheContents.get(ACTIVE_POINTER_CACHE)!.get(ACTIVE_POINTER_URL)!.text()) as { core: { cacheName: string } };
    expect(pointer.core.cacheName).not.toBe(oldCoreCache);
    expect(worker.cacheContents.has(oldCoreCache)).toBe(true);
  });

  it('uses the verified cached shell when navigation receives an HTTP 5xx', async () => {
    const worker = await loadServiceWorker();
    await runWaitUntil(worker.listeners.get('install'));
    await runWaitUntil(worker.listeners.get('activate'));
    worker.setNavigationStatus(503);

    let responsePromise: Promise<unknown> | undefined;
    worker.listeners.get('fetch')?.({
      request: { method: 'GET', mode: 'navigate', url: ORIGIN + '/' },
      respondWith: (response: Promise<unknown>) => { responsePromise = response; },
    });
    const response = await responsePromise as FakeResponse;
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<!doctype html>');
  });

  it('keeps the pointer-selected previous core snapshot available to an older offline client', async () => {
    const worker = await loadServiceWorker();
    await runWaitUntil(worker.listeners.get('install'));
    await runWaitUntil(worker.listeners.get('activate'));
    const oldCoreCache = Array.from(worker.cacheContents.keys()).find((name) => /^przystan-core-[a-f0-9]{64}$/.test(name))!;

    worker.setCoreVersion(2);
    await runWaitUntil(worker.listeners.get('install'));
    const pointerBeforeActivate = JSON.parse(
      await worker.cacheContents.get(ACTIVE_POINTER_CACHE)!.get(ACTIVE_POINTER_URL)!.text()
    ) as { core: { cacheName: string }; corePrevious?: { cacheName: string } };
    expect(pointerBeforeActivate.core.cacheName).toBe(oldCoreCache);

    await runWaitUntil(worker.listeners.get('activate'));
    const pointer = JSON.parse(
      await worker.cacheContents.get(ACTIVE_POINTER_CACHE)!.get(ACTIVE_POINTER_URL)!.text()
    ) as { core: { cacheName: string }; corePrevious?: { cacheName: string } };
    expect(pointer.core.cacheName).not.toBe(oldCoreCache);
    expect(pointer.corePrevious?.cacheName).toBe(oldCoreCache);

    worker.setOffline(true);
    let responsePromise: Promise<unknown> | undefined;
    worker.listeners.get('fetch')?.({
      request: { method: 'GET', mode: 'same-origin', url: ORIGIN + WORKER_ASSET },
      respondWith: (response: Promise<unknown>) => { responsePromise = response; },
    });
    const response = await responsePromise as FakeResponse;
    expect(await response.text()).toContain('ready-1');
  });
});
