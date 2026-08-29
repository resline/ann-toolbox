/*
 * Service Worker (Przystań PWA)
 *
 * Cache-first with network fallback. Install-time caches are immutable,
 * content-addressed snapshots. A pointer is written only after a snapshot is
 * complete, which keeps a failed install from replacing an active snapshot.
 */

const CORE_CACHE_PREFIX = 'przystan-core-';
const CORE_LEGACY_CACHE_NAME = 'przystan-core-v3';
const CORE_RUNTIME_CACHE_NAME = 'przystan-runtime-v1';
const ASSET_MANIFEST_URL = '/asset-manifest.json';

const VOICE_CACHE_PREFIX = 'przystan-voice-';
const ACTIVE_POINTER_CACHE_NAME = 'przystan-snapshot-index-v1';
const ACTIVE_POINTER_URL = '/__przystan_current__';
const PENDING_POINTER_CACHE_NAME = 'przystan-snapshot-index-staging-v1';
const PENDING_POINTER_URL = '/__przystan_pending__';
const VOICE_PACK_ID = 'pl-PL-kore-gemini-3.1-v1';
const VOICE_MANIFEST_URL = '/audio/voice/' + VOICE_PACK_ID + '/manifest.json';
const VOICE_PACK_PATH = '/audio/voice/' + VOICE_PACK_ID + '/';
const VOICE_GRAMMAR_VERSION = 'pl-clock-fragments-v1';
const VOICE_MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE_NAME = 'Kore';
const VOICE_LOCALE = 'pl-PL';
const VOICE_SAMPLE_RATE_HZ = 24000;
const VOICE_CHANNELS = 1;
const VOICE_FRAGMENT_COUNT = 337;
const VOICE_REGISTRY_SHA256 = 'b88d01bcd3cdb82b559d1aec60e99cb59a4c38c37d73136544f697ddbe575504';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  ASSET_MANIFEST_URL,
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/apple-touch-icon-180.png',
  '/fonts/inter-latin.woff2',
  '/fonts/inter-latin-ext.woff2',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafePositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isSafeNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function coreContentHash(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const identity = new TextEncoder().encode(
    entries.map((entry) => entry.url + '\0' + entry.hash).join('\n')
  );
  return sha256Hex(identity.buffer);
}

function sameOriginPath(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const parsed = new URL(value, self.location.origin);
    if (parsed.origin !== self.location.origin || parsed.search || parsed.hash) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}

function expectedSpriteUrl(sha256) {
  return VOICE_PACK_PATH + 'sprite.' + sha256 + '.ogg';
}

async function validateVoiceManifest(value) {
  if (!isObject(value)) throw new Error('Voice manifest is not an object');
  if (
    value.schemaVersion !== 1 ||
    value.grammarVersion !== VOICE_GRAMMAR_VERSION ||
    value.packId !== VOICE_PACK_ID ||
    value.model !== VOICE_MODEL ||
    value.voice !== VOICE_NAME ||
    value.locale !== VOICE_LOCALE ||
    value.sourceSampleRateHz !== VOICE_SAMPLE_RATE_HZ ||
    value.runtimeSampleRateHz !== VOICE_SAMPLE_RATE_HZ ||
    value.channels !== VOICE_CHANNELS ||
    typeof value.generatedAt !== 'string' ||
    value.generatedAt.trim().length === 0 ||
    !isObject(value.sprite) ||
    !/^[a-f0-9]{64}$/.test(value.sprite.sha256 || '') ||
    sameOriginPath(value.sprite.url) !== expectedSpriteUrl(value.sprite.sha256) ||
    !isSafePositiveInteger(value.sprite.encodedBytes) ||
    !isSafePositiveInteger(value.sprite.sourceFrameCount) ||
    !isObject(value.fragments) ||
    Object.keys(value.fragments).length !== VOICE_FRAGMENT_COUNT
  ) {
    throw new Error('Voice manifest integrity contract failed');
  }

  const ranges = [];
  for (const [id, fragment] of Object.entries(value.fragments)) {
    const endFrame =
      isSafeNonNegativeInteger(fragment?.startFrame) &&
      isSafePositiveInteger(fragment?.frameCount)
        ? fragment.startFrame + fragment.frameCount
        : NaN;
    if (
      id.trim().length === 0 ||
      !isObject(fragment) ||
      !isSafeNonNegativeInteger(fragment.startFrame) ||
      !isSafePositiveInteger(fragment.frameCount) ||
      !Number.isSafeInteger(endFrame) ||
      endFrame > value.sprite.sourceFrameCount ||
      typeof fragment.text !== 'string' ||
      fragment.text.trim().length === 0 ||
      typeof fragment.prosodyRole !== 'string' ||
      fragment.prosodyRole.trim().length === 0 ||
      typeof fragment.promptId !== 'string' ||
      fragment.promptId.trim().length === 0 ||
      (fragment.sourceSha256 !== undefined &&
        !/^[a-f0-9]{64}$/.test(fragment.sourceSha256))
    ) {
      throw new Error('Voice manifest fragment contract failed for ' + id);
    }
    ranges.push({ start: fragment.startFrame, end: endFrame });
  }

  ranges.sort((left, right) => left.start - right.start || left.end - right.end);
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index].start < ranges[index - 1].end) {
      throw new Error('Voice manifest fragment boundaries overlap');
    }
  }

  const registry = Object.entries(value.fragments)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([id, fragment]) => ({
      id,
      text: fragment.text,
      prosodyRole: fragment.prosodyRole,
      promptId: fragment.promptId,
    }));
  const registryHash = await sha256Hex(
    new TextEncoder().encode(JSON.stringify(registry)).buffer
  );
  if (value.registrySha256 !== VOICE_REGISTRY_SHA256 || registryHash !== VOICE_REGISTRY_SHA256) {
    throw new Error('Voice manifest registry integrity contract failed');
  }

  return value;
}

function extractHashedAssetUrls(source, basePath) {
  const found = new Set();
  const references = /(?:src|href)\s*=\s*["']([^"']+)["']|(?:import\s*\(|from\s+|url\s*\(|new\s+URL\s*\()\s*["']([^"']+)["']/gi;
  const plainRelativeReferences = /["']((?:\/assets\/|\.\.?\/)?[A-Za-z0-9_.-]+\.(?:js|css))["']/gi;
  let match;
  const rawReferences = [];
  while ((match = references.exec(source)) !== null) {
    rawReferences.push(match[1] || match[2]);
  }
  while ((match = plainRelativeReferences.exec(source)) !== null) {
    rawReferences.push(match[1]);
  }
  for (const rawUrl of rawReferences) {
    let parsed;
    try {
      parsed = new URL(rawUrl, new URL(basePath, self.location.origin));
    } catch {
      throw new Error('Invalid asset URL in ' + basePath);
    }
    if (parsed.origin !== self.location.origin) continue;
    const pathname = parsed.pathname;
    const filename = pathname.slice(pathname.lastIndexOf('/') + 1);
    if (
      !pathname.startsWith('/assets/') ||
      !/\.(?:js|css)$/i.test(pathname) ||
      !/[-.][A-Za-z0-9_-]{6,}\.(?:js|css)$/i.test(filename)
    ) {
      continue;
    }
    if (parsed.search || parsed.hash) {
      throw new Error('Hashed asset URL must not contain a query or hash');
    }
    found.add(pathname);
  }
  return Array.from(found);
}

function validateAssetManifest(value) {
  if (!isObject(value) || value.schemaVersion !== 1 || !Array.isArray(value.assets)) {
    throw new Error('Asset manifest integrity contract failed');
  }
  const assets = [];
  const seen = new Set();
  for (const rawUrl of value.assets) {
    const pathname = sameOriginPath(rawUrl);
    const filename = pathname ? pathname.slice(pathname.lastIndexOf('/') + 1) : '';
    if (
      !pathname ||
      !pathname.startsWith('/assets/') ||
      filename.length === 0 ||
      seen.has(pathname)
    ) {
      throw new Error('Asset manifest contains an invalid or duplicate asset');
    }
    seen.add(pathname);
    assets.push(pathname);
  }
  if (assets.length === 0) throw new Error('Asset manifest contains no assets');
  return assets;
}

function coreCacheName(contentHash, nonce) {
  return CORE_CACHE_PREFIX + contentHash + (nonce ? '-' + nonce : '');
}

function voiceCacheName(manifestHash, spriteHash, nonce) {
  return (
    VOICE_CACHE_PREFIX +
    VOICE_PACK_ID +
    '-' +
    manifestHash +
    '-' +
    spriteHash +
    (nonce ? '-' + nonce : '')
  );
}

function isCoreSnapshotName(name) {
  return /^przystan-core-[a-f0-9]{64}(?:-[a-z0-9-]+)?$/.test(name);
}

function isVoiceSnapshotName(name) {
  return /^przystan-voice-.+-[a-f0-9]{64}-[a-f0-9]{64}(?:-[a-z0-9-]+)?$/.test(name);
}

function hasSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function cacheNameForHash(cacheName, prefix, hash) {
  return (
    typeof cacheName === 'string' &&
    hasSha256(hash) &&
    (cacheName === prefix + hash || cacheName.startsWith(prefix + hash + '-'))
  );
}

function repairNonce() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function pointerResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function readPointer(cacheName, key) {
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(key);
    if (!response) return null;
    const value = await response.json();
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

async function verifyCoreSnapshot(snapshot) {
  try {
    if (
      !snapshot ||
      !hasSha256(snapshot.contentHash) ||
      !isCoreSnapshotName(snapshot.cacheName) ||
      !cacheNameForHash(snapshot.cacheName, CORE_CACHE_PREFIX, snapshot.contentHash) ||
      !Array.isArray(snapshot.entries) ||
      snapshot.entries.length === 0
    ) {
      return false;
    }
    if ((await coreContentHash(snapshot.entries)) !== snapshot.contentHash) return false;
    const cache = await caches.open(snapshot.cacheName);
    for (const entry of snapshot.entries) {
      const response = await cache.match(entry.url);
      if (!response || !response.ok) return false;
      const hash = await sha256Hex(await response.clone().arrayBuffer());
      if (hash !== entry.hash) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function verifyVoiceSnapshot(snapshot) {
  try {
    const voiceBaseName =
      VOICE_CACHE_PREFIX + VOICE_PACK_ID + '-' + snapshot?.manifestHash + '-' + snapshot?.spriteHash;
    if (
      !snapshot ||
      !hasSha256(snapshot.manifestHash) ||
      !hasSha256(snapshot.spriteHash) ||
      !isVoiceSnapshotName(snapshot.cacheName) ||
      !(snapshot.cacheName === voiceBaseName || snapshot.cacheName.startsWith(voiceBaseName + '-'))
    ) {
      return false;
    }
    const cache = await caches.open(snapshot.cacheName);
    const manifestResponse = await cache.match(VOICE_MANIFEST_URL);
    const spriteResponse = await cache.match(snapshot.manifest.sprite.url);
    if (!manifestResponse || !spriteResponse || !manifestResponse.ok || !spriteResponse.ok) {
      return false;
    }
    const manifestBytes = await manifestResponse.clone().arrayBuffer();
    if ((await sha256Hex(manifestBytes)) !== snapshot.manifestHash) return false;
    const manifest = await validateVoiceManifest(JSON.parse(new TextDecoder().decode(manifestBytes)));
    if (manifest.sprite.sha256 !== snapshot.spriteHash) return false;
    const spriteBytes = await spriteResponse.clone().arrayBuffer();
    return (
      spriteBytes.byteLength === manifest.sprite.encodedBytes &&
      (await sha256Hex(spriteBytes)) === snapshot.spriteHash
    );
  } catch {
    return false;
  }
}

async function deleteCacheQuietly(cacheName) {
  try {
    await caches.delete(cacheName);
  } catch {
    // The pointer is never changed before the snapshot is complete. An
    // unreferenced cache is therefore safe even when cleanup itself fails.
  }
}

async function fetchResponse(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response || !response.ok) {
    throw new Error('Asset HTTP ' + (response ? response.status : 'unknown') + ': ' + url);
  }
  return response;
}

async function fetchBuildAsset(url) {
  const response = await fetchResponse(url);
  if (/\.(?:js|css)$/i.test(url)) {
    const contentType =
      response.headers && typeof response.headers.get === 'function'
        ? response.headers.get('content-type')
        : null;
    const source = await response.clone().text();
    if (
      (contentType && /text\/html/i.test(contentType)) ||
      /^\s*(?:<!doctype\b|<html\b)/i.test(source)
    ) {
      throw new Error('Build asset returned HTML instead of code: ' + url);
    }
  }
  return response;
}

async function prepareCoreSnapshot() {
  const entries = [];
  const seen = new Set();
  const addEntry = async (url, response) => {
    if (seen.has(url)) return;
    seen.add(url);
    const bytes = await response.clone().arrayBuffer();
    entries.push({ url, response, hash: await sha256Hex(bytes) });
  };

  for (const url of STATIC_ASSETS) {
    await addEntry(url, await fetchResponse(url));
  }

  const indexEntry = entries.find((entry) => entry.url === '/index.html');
  if (!indexEntry) throw new Error('index.html was not fetched');

  const assetManifestEntry = entries.find((entry) => entry.url === ASSET_MANIFEST_URL);
  if (!assetManifestEntry) throw new Error('asset-manifest.json was not fetched');
  let assetManifest;
  try {
    assetManifest = JSON.parse(await assetManifestEntry.response.clone().text());
  } catch {
    throw new Error('asset-manifest.json is not valid JSON');
  }
  const declaredAssets = validateAssetManifest(assetManifest);
  const declaredAssetSet = new Set(declaredAssets);

  for (const url of declaredAssets) {
    await addEntry(url, await fetchBuildAsset(url));
  }

  // Follow the build's hashed imports as well as the references in
  // index.html. Vite emits the timer worker as a sibling chunk that is not
  // listed in the HTML, but it is required on the first offline clock start.
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!/\.(?:html|js|css)$/i.test(entry.url)) continue;
    const source = await entry.response.clone().text();
    for (const url of extractHashedAssetUrls(source, entry.url)) {
      if (!declaredAssetSet.has(url)) {
        throw new Error('Asset referenced by the build is missing from asset-manifest.json: ' + url);
      }
    }
  }

  const contentHash = await coreContentHash(entries);
  return { entries, contentHash, cacheName: coreCacheName(contentHash) };
}

async function writeCoreSnapshot(snapshot) {
  if (await verifyCoreSnapshot(snapshot)) return snapshot;

  const active = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
  const pending = await readPointer(PENDING_POINTER_CACHE_NAME, PENDING_POINTER_URL);
  const protectedNames = [
    active?.core?.cacheName,
    active?.corePrevious?.cacheName,
    pending?.core?.cacheName,
  ];
  const target =
    protectedNames.includes(snapshot.cacheName)
      ? { ...snapshot, cacheName: coreCacheName(snapshot.contentHash, repairNonce()) }
      : snapshot;

  try {
    const cache = await caches.open(target.cacheName);
    for (const entry of target.entries) {
      await cache.put(entry.url, entry.response.clone());
    }
    if (!(await verifyCoreSnapshot(target))) {
      throw new Error('Core cache verification failed');
    }
    return target;
  } catch (error) {
    await deleteCacheQuietly(target.cacheName);
    throw error;
  }
}

async function prepareVoiceSnapshot() {
  const manifestResponse = await fetchResponse(VOICE_MANIFEST_URL);
  const manifestBytes = await manifestResponse.clone().arrayBuffer();
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    throw new Error('Voice manifest is not valid JSON');
  }
  await validateVoiceManifest(manifest);
  const manifestHash = await sha256Hex(manifestBytes);

  const spriteResponse = await fetchResponse(manifest.sprite.url);
  const encoded = await spriteResponse.arrayBuffer();
  const spriteHash = await sha256Hex(encoded);
  if (encoded.byteLength !== manifest.sprite.encodedBytes || spriteHash !== manifest.sprite.sha256) {
    throw new Error('Voice sprite integrity check failed');
  }

  return {
    manifest,
    manifestResponse,
    manifestHash,
    spriteHash,
    spriteResponse: new Response(encoded, {
      status: 200,
      headers: spriteResponse.headers,
    }),
    cacheName: voiceCacheName(manifestHash, spriteHash),
  };
}

async function writeVoiceSnapshot(snapshot) {
  if (await verifyVoiceSnapshot(snapshot)) return snapshot;

  const active = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
  const pending = await readPointer(PENDING_POINTER_CACHE_NAME, PENDING_POINTER_URL);
  const protectedNames = [
    active?.voice?.cacheName,
    active?.voicePrevious?.cacheName,
    pending?.voice?.cacheName,
  ];
  const target =
    protectedNames.includes(snapshot.cacheName)
      ? { ...snapshot, cacheName: voiceCacheName(snapshot.manifestHash, snapshot.spriteHash, repairNonce()) }
      : snapshot;

  try {
    const cache = await caches.open(target.cacheName);
    const spriteUrl = target.manifest.sprite.url;
    // The manifest is the discoverable entry. Write it last so a pointer or
    // a cache lookup can never select a cache before its sprite is present.
    await cache.put(spriteUrl, target.spriteResponse.clone());
    await cache.put(VOICE_MANIFEST_URL, target.manifestResponse.clone());
    if (!(await verifyVoiceSnapshot(target))) {
      throw new Error('Voice cache verification failed');
    }
    return target;
  } catch (error) {
    await deleteCacheQuietly(target.cacheName);
    throw error;
  }
}

function corePointerPart(snapshot) {
  return snapshot
    ? {
        cacheName: snapshot.cacheName,
        contentHash: snapshot.contentHash,
        entries: snapshot.entries.map((entry) => ({ url: entry.url, hash: entry.hash })),
      }
    : null;
}

function voicePointerPart(snapshot) {
  return snapshot
    ? {
        cacheName: snapshot.cacheName,
        manifestHash: snapshot.manifestHash,
        spriteHash: snapshot.spriteHash,
        packId: VOICE_PACK_ID,
      }
    : null;
}

function samePointerPart(left, right) {
  return Boolean(left && right && left.cacheName === right.cacheName);
}

function pendingPointer(coreSnapshot, voiceSnapshot) {
  return {
    schemaVersion: 1,
    core: corePointerPart(coreSnapshot),
    voice: voicePointerPart(voiceSnapshot),
  };
}

async function writePendingInstallPointer(coreSnapshot, voiceSnapshot) {
  const value = pendingPointer(coreSnapshot, voiceSnapshot);
  const cache = await caches.open(PENDING_POINTER_CACHE_NAME);
  await cache.put(PENDING_POINTER_URL, pointerResponse(value));
  const stored = await readPointer(PENDING_POINTER_CACHE_NAME, PENDING_POINTER_URL);
  if (JSON.stringify(stored) !== JSON.stringify(value)) {
    throw new Error('Pending snapshot pointer verification failed');
  }
  return value;
}

async function commitActiveSnapshotsNow({ coreSnapshot, voiceSnapshot }) {
  const previous = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
  const incomingCore = corePointerPart(coreSnapshot);
  const incomingVoice = voicePointerPart(voiceSnapshot);
  const nextCore = incomingCore || previous?.core || null;
  const nextVoice = incomingVoice || previous?.voice || null;
  const coreChanged = Boolean(incomingCore && !samePointerPart(incomingCore, previous?.core));
  const voiceChanged = Boolean(incomingVoice && !samePointerPart(incomingVoice, previous?.voice));
  const pointer = {
    core: nextCore,
    corePrevious: coreChanged
      ? previous?.core || previous?.corePrevious || null
      : previous?.corePrevious || null,
    voice: nextVoice,
    voicePrevious: voiceChanged
      ? previous?.voice || previous?.voicePrevious || null
      : previous?.voicePrevious || null,
  };
  if (!pointer.core && !pointer.voice) throw new Error('No complete snapshot to activate');

  const cache = await caches.open(ACTIVE_POINTER_CACHE_NAME);
  await cache.put(ACTIVE_POINTER_URL, pointerResponse(pointer));
  const stored = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
  if (JSON.stringify(stored) !== JSON.stringify(pointer)) {
    throw new Error('Active snapshot pointer verification failed');
  }
  return pointer;
}

let activeCommitQueue = Promise.resolve();

function withPointerLock(callback) {
  try {
    const lockManager = self.navigator && self.navigator.locks;
    if (lockManager && typeof lockManager.request === 'function') {
      return lockManager.request(
        'przystan-snapshot-pointer-v1',
        { mode: 'exclusive' },
        callback
      );
    }
  } catch {
    // Browsers without Web Locks use the per-global queue below.
  }
  return callback();
}

function runSnapshotTransaction(callback) {
  const operation = activeCommitQueue.then(() => withPointerLock(callback));
  // Keep the queue usable after an individual pointer write fails.
  activeCommitQueue = operation.catch(() => undefined);
  return operation;
}

let refreshPromise = null;

function refreshVoicePack() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = prepareVoiceSnapshot()
    .then((snapshot) =>
      runSnapshotTransaction(async () => {
        const written = await writeVoiceSnapshot(snapshot);
        await commitActiveSnapshotsNow({ voiceSnapshot: written });
        return written;
      })
    )
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

let coreRefreshPromise = null;

function refreshCorePack() {
  if (coreRefreshPromise) return coreRefreshPromise;
  coreRefreshPromise = prepareCoreSnapshot()
    .then((snapshot) =>
      runSnapshotTransaction(async () => {
        const written = await writeCoreSnapshot(snapshot);
        await commitActiveSnapshotsNow({ coreSnapshot: written });
        return written;
      })
    )
    .catch(() => null)
    .finally(() => {
      coreRefreshPromise = null;
    });
  return coreRefreshPromise;
}

async function installSnapshots() {
  let coreSnapshot;
  let voiceSnapshot;
  let corePromise;
  let voicePromise;
  let pendingWritten = false;
  try {
    corePromise = prepareCoreSnapshot().then((snapshot) => writeCoreSnapshot(snapshot));
    voicePromise = prepareVoiceSnapshot().then((snapshot) => writeVoiceSnapshot(snapshot));
    const results = await Promise.all([corePromise, voicePromise]);
    coreSnapshot = results[0];
    voiceSnapshot = results[1];
    // Cache the complete pair before signalling that this worker may activate.
    // The pending pointer survives a service-worker global restart between
    // install and activate, so activation never depends on JS memory.
    await writePendingInstallPointer(coreSnapshot, voiceSnapshot);
    pendingWritten = true;
  } catch (error) {
    // Promise.all can reject before its other branch settles. Wait for both
    // branches before cleaning their unreferenced snapshots.
    const settled = await Promise.allSettled(
      [corePromise, voicePromise].filter(Boolean)
    );
    const coreResult = settled[0];
    const voiceResult = settled[1];
    if (!coreSnapshot && coreResult?.status === 'fulfilled') coreSnapshot = coreResult.value;
    if (!voiceSnapshot && voiceResult?.status === 'fulfilled') voiceSnapshot = voiceResult.value;
    if (!pendingWritten) {
      const active = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
      const pending = await readPointer(PENDING_POINTER_CACHE_NAME, PENDING_POINTER_URL);
      if (
        coreSnapshot &&
        active?.core?.cacheName !== coreSnapshot.cacheName &&
        pending?.core?.cacheName !== coreSnapshot.cacheName
      ) {
        await deleteCacheQuietly(coreSnapshot.cacheName);
      }
      if (
        voiceSnapshot &&
        active?.voice?.cacheName !== voiceSnapshot.cacheName &&
        pending?.voice?.cacheName !== voiceSnapshot.cacheName
      ) {
        await deleteCacheQuietly(voiceSnapshot.cacheName);
      }
    }
    throw error;
  }
}

// Installation is fail-closed: no activation signal is sent until both the
// shell snapshot and the complete, verified voice snapshot are committed.
self.addEventListener('install', (event) => {
  event.waitUntil(installSnapshots().then(() => self.skipWaiting()));
});

function isVoiceRequest(requestUrl) {
  return (
    requestUrl.pathname === VOICE_MANIFEST_URL ||
    (requestUrl.pathname.startsWith(VOICE_PACK_PATH) &&
      /\/sprite\.[a-f0-9]{64}\.ogg$/.test(requestUrl.pathname))
  );
}

async function completeVoiceCache(cacheName) {
  if (!isVoiceSnapshotName(cacheName)) return null;
  try {
    const nameParts = cacheName.match(
      /^przystan-voice-.+-([a-f0-9]{64})-([a-f0-9]{64})(?:-[a-z0-9-]+)?$/
    );
    if (!nameParts) return null;
    const cache = await caches.open(cacheName);
    const manifestResponse = await cache.match(VOICE_MANIFEST_URL);
    if (!manifestResponse) return null;
    const manifestBytes = await manifestResponse.clone().arrayBuffer();
    if ((await sha256Hex(manifestBytes)) !== nameParts[1]) return null;
    const manifest = await validateVoiceManifest(
      JSON.parse(new TextDecoder().decode(manifestBytes))
    );
    const spriteResponse = await cache.match(manifest.sprite.url);
    if (!spriteResponse) return null;
    const spriteBytes = await spriteResponse.clone().arrayBuffer();
    if (
      spriteBytes.byteLength !== manifest.sprite.encodedBytes ||
      (await sha256Hex(spriteBytes)) !== nameParts[2] ||
      manifest.sprite.sha256 !== nameParts[2]
    ) {
      return null;
    }
    return {
      cache,
      manifest,
      manifestHash: nameParts[1],
      spriteHash: nameParts[2],
    };
  } catch {
    return null;
  }
}

async function voiceCacheCandidates() {
  const pointer = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
  const names = (await caches.keys())
    .filter((name) => isVoiceSnapshotName(name))
    .sort()
    .reverse();
  const orderedNames = [];
  for (const part of [pointer?.voice, pointer?.voicePrevious]) {
    if (part?.packId === VOICE_PACK_ID && isVoiceSnapshotName(part.cacheName)) {
      orderedNames.push(part.cacheName);
    }
  }
  for (const name of names) {
    if (!orderedNames.includes(name)) orderedNames.push(name);
  }
  const candidates = [];
  for (const name of orderedNames) {
    const candidate = await completeVoiceCache(name);
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

async function matchVoiceRequest(request) {
  for (const candidate of await voiceCacheCandidates()) {
    const response = await candidate.cache.match(request);
    if (response) return response;
  }
  return null;
}

async function completeCoreCache(cacheName, expectedEntries, expectedContentHash) {
  if (
    !isCoreSnapshotName(cacheName) ||
    !hasSha256(expectedContentHash) ||
    !cacheNameForHash(cacheName, CORE_CACHE_PREFIX, expectedContentHash) ||
    !Array.isArray(expectedEntries) ||
    expectedEntries.length === 0
  ) {
    return null;
  }
  try {
    if ((await coreContentHash(expectedEntries)) !== expectedContentHash) return null;
    const cache = await caches.open(cacheName);
    const seen = new Set();
    for (const entry of expectedEntries) {
      if (
        !isObject(entry) ||
        typeof entry.url !== 'string' ||
        !sameOriginPath(entry.url) ||
        !hasSha256(entry.hash) ||
        seen.has(entry.url)
      ) {
        return null;
      }
      seen.add(entry.url);
      const response = await cache.match(entry.url);
      if (!response || !response.ok) return null;
      if ((await sha256Hex(await response.clone().arrayBuffer())) !== entry.hash) return null;
    }
    return cache;
  } catch {
    return null;
  }
}

async function coreCacheCandidates() {
  const pointer = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
  const ordered = [];
  const pointerParts = [pointer?.core, pointer?.corePrevious];
  for (const part of pointerParts) {
    if (
      part?.cacheName &&
      isCoreSnapshotName(part.cacheName) &&
      hasSha256(part.contentHash) &&
      Array.isArray(part.entries)
    ) {
      ordered.push(part);
    }
  }
  const candidates = [];
  for (const part of ordered) {
    const candidate = await completeCoreCache(part.cacheName, part.entries, part.contentHash);
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

async function readVerifiedPendingSnapshots() {
  const pending = await readPointer(PENDING_POINTER_CACHE_NAME, PENDING_POINTER_URL);
  if (!pending) return null;
  if (
    pending.schemaVersion !== 1 ||
    !isObject(pending.core) ||
    !isObject(pending.voice)
  ) {
    throw new Error('Pending snapshot pointer is invalid');
  }

  const corePart = pending.core;
  const voicePart = pending.voice;
  const coreCache = await completeCoreCache(
    corePart.cacheName,
    corePart.entries,
    corePart.contentHash
  );
  if (!coreCache) throw new Error('Pending core snapshot verification failed');

  if (
    voicePart.packId !== VOICE_PACK_ID ||
    !hasSha256(voicePart.manifestHash) ||
    !hasSha256(voicePart.spriteHash) ||
    !isVoiceSnapshotName(voicePart.cacheName)
  ) {
    throw new Error('Pending voice snapshot pointer is invalid');
  }
  const voiceCandidate = await completeVoiceCache(voicePart.cacheName);
  if (
    !voiceCandidate ||
    voiceCandidate.manifestHash !== voicePart.manifestHash ||
    voiceCandidate.spriteHash !== voicePart.spriteHash
  ) {
    throw new Error('Pending voice snapshot verification failed');
  }

  return {
    coreSnapshot: {
      cacheName: corePart.cacheName,
      contentHash: corePart.contentHash,
      entries: corePart.entries.map((entry) => ({ url: entry.url, hash: entry.hash })),
    },
    voiceSnapshot: {
      cacheName: voicePart.cacheName,
      manifest: voiceCandidate.manifest,
      manifestHash: voicePart.manifestHash,
      spriteHash: voicePart.spriteHash,
    },
  };
}

async function matchCoreRequest(request) {
  for (const candidate of await coreCacheCandidates()) {
    const response = await candidate.match(request);
    if (response) return response;
  }
  try {
    const runtime = await caches.open(CORE_RUNTIME_CACHE_NAME);
    return await runtime.match(request);
  } catch {
    return null;
  }
}

function isUsableNavigationResponse(response) {
  if (!response || !response.ok) return false;
  const contentType =
    response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('content-type')
      : null;
  return !contentType || /text\/html/i.test(contentType);
}

async function cacheRuntimeResponse(request, response) {
  try {
    const cache = await caches.open(CORE_RUNTIME_CACHE_NAME);
    await cache.put(request, response);
  } catch {
    // Runtime caching is opportunistic and must not change the network result.
  }
}

// Refresh is used by a runtime retry after a failed/offline voice load. The
// MessagePort receives a reply only after both cache entries and the pointer
// have been verified.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'REFRESH_VOICE_PACK') return;
  const port = event.ports && event.ports[0];
  const reply = (payload) => {
    if (port && typeof port.postMessage === 'function') {
      port.postMessage(payload);
    } else if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage(payload);
    }
  };
  const operation = refreshVoicePack()
    .then((snapshot) =>
      reply({
        ok: true,
        status: 'ok',
        cacheName: snapshot.cacheName,
        manifestHash: snapshot.manifestHash,
        spriteHash: snapshot.spriteHash,
      })
    )
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      reply({
        ok: false,
        message,
      });
    });
  if (typeof event.waitUntil === 'function') event.waitUntil(operation);
});

// Keep the current and one previous immutable snapshot for an already-running
// client. Failed staging snapshots and old app generations are removed.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    runSnapshotTransaction(async () => {
      const pending = await readVerifiedPendingSnapshots();
      if (pending) {
        // Re-verify the durable pair in this global before changing the active
        // pointer. This remains safe if the install global was discarded.
        await commitActiveSnapshotsNow(pending);
        await deleteCacheQuietly(PENDING_POINTER_CACHE_NAME);
      }
      const cacheNames = await caches.keys();
      const pointer = await readPointer(ACTIVE_POINTER_CACHE_NAME, ACTIVE_POINTER_URL);
      const keep = new Set([
        ACTIVE_POINTER_CACHE_NAME,
        CORE_RUNTIME_CACHE_NAME,
        CORE_LEGACY_CACHE_NAME,
        isCoreSnapshotName(pointer?.core?.cacheName) ? pointer.core.cacheName : null,
        isCoreSnapshotName(pointer?.corePrevious?.cacheName) ? pointer.corePrevious.cacheName : null,
        isVoiceSnapshotName(pointer?.voice?.cacheName) ? pointer.voice.cacheName : null,
        isVoiceSnapshotName(pointer?.voicePrevious?.cacheName) ? pointer.voicePrevious.cacheName : null,
      ]);
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('przystan-') && !keep.has(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event. Voice and core snapshots are resolved through their committed
// pointers; a global caches.match could observe an unreferenced half-write.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (isVoiceRequest(requestUrl)) {
    event.respondWith(
      matchVoiceRequest(event.request)
        .then((cached) => cached || fetch(event.request))
        .catch(
          () =>
            new Response('Offline voice resource unavailable', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
            })
        )
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) =>
            isUsableNavigationResponse(networkResponse) ? networkResponse : null
          )
          .catch(() => null);

        const fromNetwork = await networkFetch;
        if (fromNetwork) {
          // The service-worker script itself may be unchanged while Vite
          // emits new hashed bundles. Refreshing the complete core snapshot
          // on an online navigation advances the pointer atomically without
          // making an active client observe a half-written bundle set.
          if (typeof event.waitUntil === 'function') {
            event.waitUntil(refreshCorePack());
          } else {
            void refreshCorePack();
          }
          return fromNetwork;
        }

        const cached = await matchCoreRequest('/index.html');
        if (cached) return cached;

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
        });
      })()
    );
    return;
  }

  event.respondWith(
    matchCoreRequest(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === undefined || networkResponse.type === 'basic')
          ) {
            void cacheRuntimeResponse(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(
        () =>
          new Response('Offline resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
          })
      )
  );
});
