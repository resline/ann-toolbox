import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  VOICE_FRAGMENT_COUNT,
  VOICE_FRAGMENT_DEFINITIONS,
  VOICE_GRAMMAR_VERSION,
  VOICE_PACK_ID,
  VOICE_REGISTRY_SHA256,
  type ProsodyRole,
  type VoiceFragmentDefinition,
} from '../src/modules/speaking-clock/services/polishAnnouncementPlanner';

const PROJECT_ID = 'neurohypno-vertex-test';
const REQUIRED_ACCOUNT = 'blisko.link@gmail.com';
const LOCATION = 'global';
const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Kore';
const LOCALE = 'pl-PL';
const SAMPLE_RATE_HZ = 24_000;
const CHANNELS = 1;
const MAX_COST_USD = 5;
const MAX_CLIP_SECONDS = 12;
const AUDIO_TOKENS_PER_SECOND = 25;
const MAX_ACCEPTED_OUTPUT_TOKENS = MAX_CLIP_SECONDS * AUDIO_TOKENS_PER_SECOND;
const MODEL_MAX_OUTPUT_TOKENS = 16_384;
const MODEL_MAX_BILLED_SECONDS = MODEL_MAX_OUTPUT_TOKENS / AUDIO_TOKENS_PER_SECOND;
const AUDIO_COST_PER_SECOND_USD = 0.0005;
const INPUT_COST_PER_TOKEN_USD = 0.000001;
const OUTPUT_DIR = resolve('public', 'audio', 'voice', VOICE_PACK_ID);
const CACHE_DIR = resolve('.voice-generation-cache', VOICE_PACK_ID);
const AUDIT_DIR = resolve('docs', 'voice-packs', VOICE_PACK_ID);
const CONFIRM_FLAG = '--confirm-generate';
const REQUEST_TIMEOUT_MS = 60_000;
const GENERATION_LOCK_PATH = join(CACHE_DIR, '.generation.lock');

interface GeneratedClip {
  id: string;
  pcm: Buffer;
  mimeType: string;
  prompt: string;
  requestHash: string;
  cached: boolean;
}

interface ProcessedClip {
  id: string;
  pcm: Buffer;
  frameCount: number;
  sourceSha256: string;
}

interface VertexResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    promptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
    candidatesTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
  };
  error?: { code?: number; message?: string; status?: string };
}

interface BilledUsage {
  inputTokens: number;
  outputAudioTokens: number;
}

export interface BudgetSnapshot {
  maximumUsd: number;
  sentAttempts: number;
  uncertainAttempts: number;
  committedUsageCostUsd: number;
  inFlightReservedCostUsd: number;
  peakInFlightReservedCostUsd: number;
  cumulativeWorstCaseReservationsUsd: number;
}

export interface AttemptReservation {
  readonly worstCaseCostUsd: number;
  readonly settled: boolean;
  readonly sent: boolean;
  markSent(): void;
  settleFromUsage(usage: BilledUsage): number;
  settleUnknown(): void;
  releaseUnsent(): void;
}

/**
 * A per-process hard budget ledger. Each request owns the documented maximum
 * model output until usageMetadata converts that reservation to actual usage.
 * This permits a full pack while still bounding concurrent and retry spend.
 */
export class GenerationBudget {
  private sentAttempts = 0;
  private uncertainAttempts = 0;
  private committedUsageCostUsd = 0;
  private inFlightReservedCostUsd = 0;
  private peakInFlightReservedCostUsd = 0;
  private cumulativeWorstCaseReservationsUsd = 0;

  constructor(private readonly maximumUsd = MAX_COST_USD) {}

  reserve(prompt: string): AttemptReservation {
    // UTF-8 bytes are a conservative upper bound for tokenized prompt pieces;
    // the accepted-output preview intentionally uses the more realistic /4.
    const reservedInputTokens = Math.max(
      Math.ceil(prompt.length / 4),
      Buffer.byteLength(prompt, 'utf8')
    );
    const worstCaseCostUsd =
      MODEL_MAX_BILLED_SECONDS * AUDIO_COST_PER_SECOND_USD +
      reservedInputTokens * INPUT_COST_PER_TOKEN_USD;
    const projectedUsd =
      this.committedUsageCostUsd + this.inFlightReservedCostUsd + worstCaseCostUsd;
    if (projectedUsd > this.maximumUsd + Number.EPSILON) {
      throw new Error(
        'The hard local $' +
          this.maximumUsd.toFixed(2) +
          ' budget cannot reserve another Vertex attempt (committed $' +
          this.committedUsageCostUsd.toFixed(4) +
          ', in flight $' +
          this.inFlightReservedCostUsd.toFixed(4) +
          ').'
      );
    }

    this.inFlightReservedCostUsd += worstCaseCostUsd;
    this.cumulativeWorstCaseReservationsUsd += worstCaseCostUsd;
    this.peakInFlightReservedCostUsd = Math.max(
      this.peakInFlightReservedCostUsd,
      this.inFlightReservedCostUsd
    );

    let settled = false;
    let sent = false;
    const finish = (committedCostUsd: number, uncertain: boolean) => {
      if (settled) throw new Error('Vertex attempt budget reservation was already settled.');
      if (!Number.isFinite(committedCostUsd) || committedCostUsd < 0) {
        throw new Error('Vertex attempt cost is invalid.');
      }
      this.inFlightReservedCostUsd = Math.max(
        0,
        this.inFlightReservedCostUsd - worstCaseCostUsd
      );
      this.committedUsageCostUsd += committedCostUsd;
      if (uncertain) this.uncertainAttempts += 1;
      settled = true;
      if (
        this.committedUsageCostUsd + this.inFlightReservedCostUsd >
        this.maximumUsd + Number.EPSILON
      ) {
        throw new Error('Vertex usage exceeded its reserved local budget envelope.');
      }
    };

    return {
      worstCaseCostUsd,
      get settled() {
        return settled;
      },
      get sent() {
        return sent;
      },
      markSent: () => {
        if (settled) throw new Error('Cannot send a settled Vertex attempt reservation.');
        if (sent) throw new Error('Vertex attempt reservation was already marked sent.');
        sent = true;
        this.sentAttempts += 1;
      },
      settleFromUsage: (usage) => {
        if (!sent) throw new Error('Cannot settle usage for an unsent Vertex attempt.');
        if (
          !Number.isInteger(usage.inputTokens) ||
          usage.inputTokens < 0 ||
          !Number.isInteger(usage.outputAudioTokens) ||
          usage.outputAudioTokens < 0
        ) {
          throw new Error('Vertex usageMetadata contains invalid token counts.');
        }
        const actualCostUsd =
          usage.inputTokens * INPUT_COST_PER_TOKEN_USD +
          (usage.outputAudioTokens / AUDIO_TOKENS_PER_SECOND) *
            AUDIO_COST_PER_SECOND_USD;
        if (actualCostUsd > worstCaseCostUsd + Number.EPSILON) {
          throw new Error('Vertex usageMetadata exceeds the reserved attempt maximum.');
        }
        finish(actualCostUsd, false);
        return actualCostUsd;
      },
      settleUnknown: () => {
        if (!sent) throw new Error('Cannot retain billing for an unsent Vertex attempt.');
        finish(worstCaseCostUsd, true);
      },
      releaseUnsent: () => {
        if (sent) throw new Error('Cannot release a Vertex attempt after it was sent.');
        finish(0, false);
      },
    };
  }

  snapshot(): BudgetSnapshot {
    return {
      maximumUsd: this.maximumUsd,
      sentAttempts: this.sentAttempts,
      uncertainAttempts: this.uncertainAttempts,
      committedUsageCostUsd: this.committedUsageCostUsd,
      inFlightReservedCostUsd: this.inFlightReservedCostUsd,
      peakInFlightReservedCostUsd: this.peakInFlightReservedCostUsd,
      cumulativeWorstCaseReservationsUsd: this.cumulativeWorstCaseReservationsUsd,
    };
  }
}

export interface GenerationLock {
  readonly path: string;
  release(): Promise<void>;
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new Error('Voice generation was cancelled.');
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    if (signal?.aborted) {
      rejectPromise(abortError(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolvePromise();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      rejectPromise(signal ? abortError(signal) : new Error('Voice generation was cancelled.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function usageTokenCount(
  explicitCount: number | undefined,
  details: Array<{ tokenCount?: number }> | undefined
): number | undefined {
  if (Number.isInteger(explicitCount) && (explicitCount as number) >= 0) {
    return explicitCount;
  }
  if (!details?.length) return undefined;
  const counts = details.map((detail) => detail.tokenCount);
  if (counts.some((count) => !Number.isInteger(count) || (count as number) < 0)) {
    return undefined;
  }
  return counts.reduce<number>((sum, count) => sum + (count as number), 0);
}

function extractBilledUsage(response: VertexResponse): BilledUsage | null {
  const metadata = response.usageMetadata;
  if (!metadata) return null;
  const inputTokens = usageTokenCount(metadata.promptTokenCount, metadata.promptTokensDetails);
  const audioDetails = metadata.candidatesTokensDetails?.filter(
    (detail) => detail.modality?.toUpperCase() === 'AUDIO'
  );
  const outputAudioTokens = usageTokenCount(
    audioDetails?.length ? undefined : metadata.candidatesTokenCount,
    audioDetails
  );
  if (inputTokens === undefined || outputAudioTokens === undefined) return null;
  return { inputTokens, outputAudioTokens };
}

export async function acquireGenerationLock(
  lockPath = GENERATION_LOCK_PATH
): Promise<GenerationLock> {
  const owner = JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() });
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(lockPath, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const currentOwner = await readFile(lockPath, 'utf8').catch(() => 'unreadable owner');
    throw new Error(
      'Another confirmed voice generation owns ' +
        lockPath +
        ' (' +
        currentOwner.trim() +
        '). Wait for it to finish. Crash recovery: verify the recorded local PID with `kill -0 PID`; only when it reports no such process, remove exactly this lock file and retry.'
    );
  }
  try {
    await handle.writeFile(owner + '\n');
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(lockPath).catch(() => {});
    throw error;
  }

  let released = false;
  return {
    path: lockPath,
    release: async () => {
      if (released) return;
      released = true;
      await handle.close();
      const currentOwner = await readFile(lockPath, 'utf8').catch(() => '');
      if (currentOwner !== owner + '\n') {
        throw new Error(
          'Generation lock ownership changed unexpectedly; refusing to remove ' + lockPath + '.'
        );
      }
      await unlink(lockPath);
    },
  };
}

function roleInstruction(role: ProsodyRole): string {
  switch (role) {
    case 'initial-continuing':
      return 'To poczatek dluzszego zdania: zakoncz otwarta, kontynuujaca intonacja.';
    case 'medial-continuing':
      return 'To srodkowy fragment zdania: bez akcentu koncowego, z kontynuujaca intonacja.';
    case 'emphatic-terminal':
      return 'To koniec komunikatu: cieply, wyrazny i lekko emfatyczny.';
    default:
      return 'To koniec zdania: spokojna, naturalna intonacja koncowa.';
  }
}

function buildPrompt(definition: VoiceFragmentDefinition): string {
  return [
    'Mow po polsku, cieplym i spokojnym glosem lektorskim.',
    'Tempo stale i naturalne. Bez muzyki, efektow, wstepu ani dodatkowych slow.',
    roleInstruction(definition.prosodyRole),
    'Wypowiedz dokladnie ten tekst: ' + JSON.stringify(definition.text),
  ].join(' ');
}

function buildRequest(prompt: string) {
  return {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        languageCode: LOCALE,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: VOICE },
        },
      },
    },
  };
}

function getAccessToken(): string {
  const token = execFileSync(
    'gcloud',
    ['auth', 'print-access-token', '--account=' + REQUIRED_ACCOUNT],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  ).trim();
  if (!token) throw new Error('The verified gcloud account returned an empty token.');
  return token;
}

function verifyGoogleIdentity(): void {
  const account = execFileSync('gcloud', ['config', 'get-value', 'account'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  if (account !== REQUIRED_ACCOUNT) {
    throw new Error('Expected gcloud account ' + REQUIRED_ACCOUNT + ', got ' + account + '.');
  }
}

function extractAudio(response: VertexResponse): { pcm: Buffer; mimeType: string } {
  const part = response.candidates?.[0]?.content?.parts?.find((candidatePart) =>
    candidatePart.inlineData?.mimeType?.toLowerCase().startsWith('audio/')
  );
  const data = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType || '';
  if (!data) {
    throw new Error('Vertex response did not contain inline audio data.');
  }
  assertRawPcmMimeType(mimeType);
  const pcm = Buffer.from(data, 'base64');
  if (pcm.length < SAMPLE_RATE_HZ * 2 * 0.1 || pcm.length % 2 !== 0) {
    throw new Error('Vertex returned an invalid or empty PCM payload.');
  }
  if (pcm.length > SAMPLE_RATE_HZ * 2 * MAX_CLIP_SECONDS) {
    throw new Error('Vertex clip exceeds the ' + MAX_CLIP_SECONDS + ' second safety limit.');
  }
  return { pcm, mimeType };
}

function assertRawPcmMimeType(mimeType: string): void {
  const parts = mimeType.toLowerCase().split(';').map((part) => part.trim()).filter(Boolean);
  if (parts.shift() !== 'audio/l16') {
    throw new Error('Vertex audio MIME must be audio/L16 PCM.');
  }
  const parameters = new Map<string, string>();
  for (const part of parts) {
    const separator = part.indexOf('=');
    if (separator <= 0) throw new Error('Vertex audio MIME contains an invalid parameter.');
    parameters.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  if (
    parameters.get('rate') !== String(SAMPLE_RATE_HZ) ||
    parameters.get('channels') !== String(CHANNELS) ||
    (parameters.has('codec') && parameters.get('codec') !== 'pcm') ||
    Array.from(parameters.keys()).some((key) => !['rate', 'channels', 'codec'].includes(key))
  ) {
    throw new Error('Vertex audio MIME does not match mono 24 kHz PCM.');
  }
}

async function generateClip(
  definition: VoiceFragmentDefinition,
  getToken: (refresh?: boolean) => string,
  budget: GenerationBudget,
  sharedSignal: AbortSignal
): Promise<GeneratedClip> {
  const prompt = buildPrompt(definition);
  const request = buildRequest(prompt);
  const requestHash = sha256(JSON.stringify({
    project: PROJECT_ID,
    location: LOCATION,
    model: MODEL,
    voice: VOICE,
    locale: LOCALE,
    promptId: definition.promptId,
    request,
  }));
  const safeName = definition.id.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const pcmPath = join(CACHE_DIR, safeName + '.pcm');
  const metadataPath = join(CACHE_DIR, safeName + '.json');

  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as {
      requestHash?: string;
      mimeType?: string;
      pcmSha256?: string;
    };
    const pcm = await readFile(pcmPath);
    if (
      metadata.requestHash === requestHash &&
      metadata.pcmSha256 === sha256(pcm) &&
      pcm.length >= SAMPLE_RATE_HZ * 2 * 0.1 &&
      pcm.length <= SAMPLE_RATE_HZ * 2 * MAX_CLIP_SECONDS &&
      pcm.length % 2 === 0
    ) {
      assertRawPcmMimeType(metadata.mimeType || '');
      return {
        id: definition.id,
        pcm,
        mimeType: metadata.mimeType || 'audio/L16;codec=pcm;rate=24000',
        prompt,
        requestHash,
        cached: true,
      };
    }
  } catch {
    // Missing or stale cache: call Vertex.
  }

  const endpoint =
    'https://aiplatform.googleapis.com/v1beta1/projects/' +
    PROJECT_ID +
    '/locations/' +
    LOCATION +
    '/publishers/google/models/' +
    MODEL +
    ':generateContent';

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    if (sharedSignal.aborted) throw abortError(sharedSignal);
    const accessToken = getToken(attempt > 1);
    if (sharedSignal.aborted) throw abortError(sharedSignal);

    const reservation = budget.reserve(prompt);
    const attemptController = new AbortController();
    let timedOut = false;
    const onSharedAbort = () => attemptController.abort(sharedSignal.reason);
    sharedSignal.addEventListener('abort', onSharedAbort, { once: true });
    if (sharedSignal.aborted) onSharedAbort();
    const timeout = setTimeout(() => {
      timedOut = true;
      attemptController.abort(new Error('Vertex request timed out.'));
    }, REQUEST_TIMEOUT_MS);

    let response: Response;
    let body: VertexResponse;
    try {
      if (attemptController.signal.aborted) {
        reservation.releaseUnsent();
        throw abortError(sharedSignal);
      }
      const responsePromise = fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: attemptController.signal,
      });
      reservation.markSent();
      response = await responsePromise;
      body = (await response.json()) as VertexResponse;
    } catch (error) {
      // Once fetch has begun, a transport failure or timeout is billing-
      // ambiguous. Retaining the full reservation keeps the $5 ceiling strict.
      if (!reservation.settled) {
        if (reservation.sent) reservation.settleUnknown();
        else reservation.releaseUnsent();
      }
      if (sharedSignal.aborted) throw abortError(sharedSignal);
      lastError = timedOut
        ? new Error('Vertex request timed out after ' + REQUEST_TIMEOUT_MS + ' ms.')
        : new Error(
            'Vertex transport error: ' +
              (error instanceof Error ? error.message : String(error))
          );
      if (attempt === 5) break;
      await sleep(Math.min(16_000, 750 * 2 ** (attempt - 1)), sharedSignal);
      continue;
    } finally {
      clearTimeout(timeout);
      sharedSignal.removeEventListener('abort', onSharedAbort);
    }

    const billedUsage = extractBilledUsage(body);
    let usageError: Error | null = null;
    if (billedUsage) {
      try {
        reservation.settleFromUsage(billedUsage);
      } catch (error) {
        if (!reservation.settled) reservation.settleUnknown();
        usageError = error instanceof Error ? error : new Error(String(error));
      }
    } else {
      reservation.settleUnknown();
    }
    if (usageError) throw usageError;
    if (sharedSignal.aborted) throw abortError(sharedSignal);

    if (response.ok) {
      if (!billedUsage) {
        throw new Error(
          'Vertex success response omitted usable usageMetadata; the attempt was charged at its full reserved maximum and generation stopped.'
        );
      }
      if (body.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new Error('Vertex reached the model output-token limit; refusing truncated audio.');
      }
      const outputAudioTokens = billedUsage.outputAudioTokens;
      if (outputAudioTokens > MAX_ACCEPTED_OUTPUT_TOKENS) {
        throw new Error('Vertex reported audio usage above the accepted 12-second clip limit.');
      }
      const audio = extractAudio(body);
      await writeFile(pcmPath, audio.pcm);
      await writeFile(
        metadataPath,
        JSON.stringify(
          {
            id: definition.id,
            text: definition.text,
            promptId: definition.promptId,
            requestHash,
            pcmSha256: sha256(audio.pcm),
            pcmBytes: audio.pcm.length,
            mimeType: audio.mimeType,
            outputAudioTokens,
          },
          null,
          2
        ) + '\n'
      );
      return { ...audio, id: definition.id, prompt, requestHash, cached: false };
    }

    lastError = new Error(
      'Vertex HTTP ' + response.status + ': ' + (body.error?.message || response.statusText)
    );
    const retryable =
      response.status === 401 ||
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500;
    if (!retryable || attempt === 5) break;
    await sleep(Math.min(16_000, 750 * 2 ** (attempt - 1)), sharedSignal);
  }
  throw lastError || new Error('Vertex generation failed for ' + definition.id + '.');
}

function processPcm(clip: GeneratedClip): ProcessedClip {
  const sampleCount = clip.pcm.length / 2;
  const samples = new Int16Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = clip.pcm.readInt16LE(index * 2);
  }

  const threshold = 160;
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < threshold) first += 1;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < threshold) last -= 1;
  if (first >= samples.length || last - first < SAMPLE_RATE_HZ * 0.08) {
    throw new Error('Clip ' + clip.id + ' contains no usable speech signal.');
  }
  const trimPadding = Math.round(SAMPLE_RATE_HZ * 0.035);
  first = Math.max(0, first - trimPadding);
  last = Math.min(samples.length - 1, last + trimPadding);

  let mean = 0;
  for (let index = first; index <= last; index += 1) mean += samples[index];
  mean /= last - first + 1;
  let peak = 1;
  for (let index = first; index <= last; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index] - mean));
  }
  const normalization = Math.min(4, (0.82 * 32767) / peak);
  const output = Buffer.alloc((last - first + 1) * 2);
  const fadeFrames = Math.min(Math.round(SAMPLE_RATE_HZ * 0.006), Math.floor((last - first + 1) / 4));
  for (let index = first; index <= last; index += 1) {
    const relative = index - first;
    const distanceFromEnd = last - index;
    const fade = Math.min(1, relative / Math.max(1, fadeFrames), distanceFromEnd / Math.max(1, fadeFrames));
    const normalized = Math.round((samples[index] - mean) * normalization * fade);
    output.writeInt16LE(Math.max(-32768, Math.min(32767, normalized)), relative * 2);
  }
  return {
    id: clip.id,
    pcm: output,
    frameCount: output.length / 2,
    sourceSha256: sha256(clip.pcm),
  };
}

function runFfmpeg(inputPath: string, outputPath: string): void {
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      's16le',
      '-ar',
      String(SAMPLE_RATE_HZ),
      '-ac',
      String(CHANNELS),
      '-i',
      inputPath,
      '-c:a',
      'libopus',
      '-b:a',
      '48k',
      '-vbr',
      'on',
      '-application',
      'audio',
      '-fflags',
      '+bitexact',
      '-flags:a',
      '+bitexact',
      outputPath,
    ],
    { stdio: 'inherit' }
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function writeTextAtomically(path: string, content: string): Promise<void> {
  const temporaryPath = path + '.tmp-' + process.pid + '-' + Date.now();
  await writeFile(temporaryPath, content);
  try {
    await rename(temporaryPath, path);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

export async function publishContentAddressedSprite(
  encodedPath: string,
  finalSpritePath: string,
  expectedSha256: string
): Promise<void> {
  if (await pathExists(finalSpritePath)) {
    const existing = await readFile(finalSpritePath);
    if (sha256(existing) !== expectedSha256) {
      throw new Error('Existing content-addressed sprite has unexpected content.');
    }
    await unlink(encodedPath);
    return;
  }

  // Copy to the destination filesystem first, then rename. The manifest can
  // never observe a partially copied content-addressed object.
  const temporaryPath =
    finalSpritePath + '.tmp-' + process.pid + '-' + Date.now() + '-' + randomUUID();
  try {
    await copyFile(encodedPath, temporaryPath);
    const publishedBytes = await readFile(temporaryPath);
    if (sha256(publishedBytes) !== expectedSha256) {
      throw new Error('Temporary sprite failed its content hash verification.');
    }
    await rename(temporaryPath, finalSpritePath);
    await unlink(encodedPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
}

async function main(): Promise<void> {
  const prompts = VOICE_FRAGMENT_DEFINITIONS.map(buildPrompt);
  const estimatedInputTokens = prompts.reduce((sum, prompt) => sum + Math.ceil(prompt.length / 4), 0);
  const maximumEstimatedCost =
    estimatedInputTokens * INPUT_COST_PER_TOKEN_USD +
    VOICE_FRAGMENT_COUNT * MAX_CLIP_SECONDS * AUDIO_COST_PER_SECOND_USD;

  console.log('[voice] generation preview');
  console.log('  account:  ' + REQUIRED_ACCOUNT);
  console.log('  project:  ' + PROJECT_ID);
  console.log('  location: ' + LOCATION);
  console.log('  model:    ' + MODEL);
  console.log('  voice:    ' + VOICE + ' (' + LOCALE + ')');
  console.log('  pack:     ' + VOICE_PACK_ID);
  console.log('  requests: ' + VOICE_FRAGMENT_COUNT);
  console.log('  accepted-output estimate: $' + maximumEstimatedCost.toFixed(2));
  console.log(
    '  provider worst-case reservation / attempt: $' +
      (MODEL_MAX_BILLED_SECONDS * AUDIO_COST_PER_SECOND_USD).toFixed(4)
  );
  console.log(
    '  peak reservation at 4 workers (before measured usage): $' +
      (4 * MODEL_MAX_BILLED_SECONDS * AUDIO_COST_PER_SECOND_USD).toFixed(4)
  );
  console.log(
    '  accounting: accepted-output estimate describes the finished 337 clips; ' +
      'each live request temporarily reserves the model maximum and then converts to usageMetadata'
  );
  console.log('  budget guard: $' + MAX_COST_USD.toFixed(2));

  if (VOICE_FRAGMENT_DEFINITIONS.length !== VOICE_FRAGMENT_COUNT) {
    throw new Error('Fragment registry count changed unexpectedly.');
  }
  const registrySha256 = sha256(
    JSON.stringify(
      VOICE_FRAGMENT_DEFINITIONS
        .map(({ id, text, prosodyRole, promptId }) => ({ id, text, prosodyRole, promptId }))
        .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    )
  );
  if (registrySha256 !== VOICE_REGISTRY_SHA256) {
    throw new Error('Voice registry fingerprint changed; publish a reviewed contract fingerprint.');
  }
  if (maximumEstimatedCost > MAX_COST_USD) {
    throw new Error('Pessimistic generation estimate exceeds the local $5 guard.');
  }
  if (!hasFlag(CONFIRM_FLAG)) {
    console.log('[voice] preview only; no Vertex request was sent.');
    console.log('[voice] run again with ' + CONFIRM_FLAG + ' to generate the immutable pack.');
    return;
  }

  await mkdir(CACHE_DIR, { recursive: true });
  const generationLock = await acquireGenerationLock();
  try {
    verifyGoogleIdentity();
    await mkdir(OUTPUT_DIR, { recursive: true });
    await mkdir(AUDIT_DIR, { recursive: true });

  let accessToken = '';
  let accessTokenCreatedAt = 0;
  const getToken = (refresh = false) => {
    if (refresh || !accessToken || Date.now() - accessTokenCreatedAt > 45 * 60 * 1000) {
      accessToken = getAccessToken();
      accessTokenCreatedAt = Date.now();
    }
    return accessToken;
  };

  const budget = new GenerationBudget();
  const sharedCancellation = new AbortController();

  const generated = new Array<GeneratedClip>(VOICE_FRAGMENT_COUNT);
  let nextIndex = 0;
  let completed = 0;
  let terminalWorkerError: Error | null = null;
  const worker = async () => {
    try {
      while (!sharedCancellation.signal.aborted) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= VOICE_FRAGMENT_COUNT) return;
        const definition = VOICE_FRAGMENT_DEFINITIONS[index];
        const clip = await generateClip(
          definition,
          getToken,
          budget,
          sharedCancellation.signal
        );
        generated[index] = clip;
        completed += 1;
        console.log(
          '[voice] ' +
            String(completed).padStart(3, ' ') +
            '/' +
            VOICE_FRAGMENT_COUNT +
            ' ' +
            definition.id +
            (clip.cached ? ' (cache)' : '')
        );
      }
    } catch (error) {
      if (!sharedCancellation.signal.aborted) {
        terminalWorkerError = error instanceof Error ? error : new Error(String(error));
        sharedCancellation.abort(terminalWorkerError);
      }
      throw error;
    }
  };
  const workerResults = await Promise.allSettled(Array.from({ length: 4 }, () => worker()));
  if (terminalWorkerError) throw terminalWorkerError;
  const rejectedWorker = workerResults.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  if (rejectedWorker) throw rejectedWorker.reason;

  const processed = generated.map(processPcm);
  const guardFrames = Math.round(SAMPLE_RATE_HZ * 0.03);
  const guard = Buffer.alloc(guardFrames * 2);
  const masterParts: Buffer[] = [];
  const fragmentManifest: Record<string, object> = {};
  let cursorFrames = 0;
  for (let index = 0; index < processed.length; index += 1) {
    const clip = processed[index];
    const definition = VOICE_FRAGMENT_DEFINITIONS[index];
    masterParts.push(guard);
    cursorFrames += guardFrames;
    fragmentManifest[definition.id] = {
      startFrame: cursorFrames,
      frameCount: clip.frameCount,
      text: definition.text,
      prosodyRole: definition.prosodyRole,
      promptId: definition.promptId,
      sourceSha256: clip.sourceSha256,
    };
    masterParts.push(clip.pcm);
    cursorFrames += clip.frameCount;
    masterParts.push(guard);
    cursorFrames += guardFrames;
  }

  const master = Buffer.concat(masterParts);
  const tempPrefix = join(tmpdir(), 'ann-toolbox-voice-' + process.pid);
  const masterPath = tempPrefix + '.pcm';
  const encodedPath = tempPrefix + '.ogg';
  const decodedPath = tempPrefix + '.decoded.pcm';
  await writeFile(masterPath, master);
  runFfmpeg(masterPath, encodedPath);

  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      encodedPath,
      '-f',
      's16le',
      '-ar',
      String(SAMPLE_RATE_HZ),
      '-ac',
      '1',
      decodedPath,
    ],
    { stdio: 'inherit' }
  );
  const encoded = await readFile(encodedPath);
  const decodedInfo = await stat(decodedPath);
  const decodedPcmBytesAt24k = decodedInfo.size;
  const decodedFramesAt24k = decodedPcmBytesAt24k / 2;
  const decodedDurationSeconds = decodedFramesAt24k / SAMPLE_RATE_HZ;
  const decodedAudioBufferBytesAt24k = decodedFramesAt24k * 4;
  const decodedAudioBufferBytesAt48k = Math.ceil(decodedDurationSeconds * 48_000) * 4;
  const sourceDurationSeconds = cursorFrames / SAMPLE_RATE_HZ;
  if (decodedAudioBufferBytesAt24k > 48 * 1024 * 1024) {
    throw new Error('Decoded sprite exceeds the 48 MiB runtime limit.');
  }
  if (decodedDurationSeconds + 0.1 < sourceDurationSeconds) {
    throw new Error('Decoded sprite is shorter than the source timeline.');
  }

  const spriteSha256 = sha256(encoded);
  const spriteName = 'sprite.' + spriteSha256 + '.ogg';
  const finalSpritePath = join(OUTPUT_DIR, spriteName);
  await publishContentAddressedSprite(encodedPath, finalSpritePath, spriteSha256);
  const totalPromptCharacters = prompts.reduce((sum, prompt) => sum + prompt.length, 0);
  const estimatedInputCostUsd = Math.ceil(totalPromptCharacters / 4) * INPUT_COST_PER_TOKEN_USD;
  const estimatedAudioCostUsd = processed.reduce(
    (sum, clip) => sum + (clip.frameCount / SAMPLE_RATE_HZ) * AUDIO_COST_PER_SECOND_USD,
    0
  );
  const estimatedTotalCostUsd = estimatedInputCostUsd + estimatedAudioCostUsd;
  if (estimatedTotalCostUsd > MAX_COST_USD) {
    throw new Error('Estimated generated cost exceeds the local $5 guard.');
  }

  const generatedAt = new Date().toISOString();
  const budgetSnapshot = budget.snapshot();
  if (budgetSnapshot.inFlightReservedCostUsd !== 0) {
    throw new Error('A Vertex request budget reservation was not settled.');
  }
  const manifest = {
    schemaVersion: 1,
    grammarVersion: VOICE_GRAMMAR_VERSION,
    registrySha256,
    packId: VOICE_PACK_ID,
    model: MODEL,
    voice: VOICE,
    locale: LOCALE,
    sourceSampleRateHz: SAMPLE_RATE_HZ,
    runtimeSampleRateHz: SAMPLE_RATE_HZ,
    channels: CHANNELS,
    generatedAt,
    sprite: {
      url: '/audio/voice/' + VOICE_PACK_ID + '/' + spriteName,
      sha256: spriteSha256,
      encodedBytes: encoded.length,
      sourceFrameCount: cursorFrames,
    },
    fragments: fragmentManifest,
  };
  const report = {
    generatedAt,
    generator: {
      account: REQUIRED_ACCOUNT,
      project: PROJECT_ID,
      location: LOCATION,
      model: MODEL,
      voice: VOICE,
      locale: LOCALE,
    },
    budget: {
      maximumUsd: MAX_COST_USD,
      pessimisticPreflightEstimateUsd: Number(maximumEstimatedCost.toFixed(6)),
      estimatedInputCostUsd: Number(estimatedInputCostUsd.toFixed(6)),
      estimatedAudioCostUsd: Number(estimatedAudioCostUsd.toFixed(6)),
      estimatedTotalCostUsd: Number(estimatedTotalCostUsd.toFixed(6)),
      sentAttempts: budgetSnapshot.sentAttempts,
      uncertainAttempts: budgetSnapshot.uncertainAttempts,
      committedUsageCostUsd: Number(budgetSnapshot.committedUsageCostUsd.toFixed(6)),
      peakInFlightReservedCostUsd: Number(
        budgetSnapshot.peakInFlightReservedCostUsd.toFixed(6)
      ),
      cumulativeWorstCaseReservationsUsd: Number(
        budgetSnapshot.cumulativeWorstCaseReservationsUsd.toFixed(6)
      ),
      note: 'Each in-flight attempt reserves the documented 16,384-token model maximum, then usageMetadata converts that reservation to measured usage. Billing-ambiguous failures retain the full reservation. Accepted audio remains limited to 12 seconds. This is a local per-invocation guard, not a provider-side quota.',
    },
    asset: {
      fragmentCount: processed.length,
      encodedBytes: encoded.length,
      sourceFrames: cursorFrames,
      sourceDurationSeconds: Number(sourceDurationSeconds.toFixed(3)),
      decodedPcmBytesAt24k,
      decodedAudioBufferBytesAt24k,
      decodedAudioBufferBytesAt48k,
      decodedDurationSeconds: Number(decodedDurationSeconds.toFixed(3)),
      spriteSha256,
    },
    requests: generated.map((clip, index) => ({
      id: clip.id,
      text: VOICE_FRAGMENT_DEFINITIONS[index].text,
      promptId: VOICE_FRAGMENT_DEFINITIONS[index].promptId,
      requestHash: clip.requestHash,
      sourceSha256: sha256(clip.pcm),
      sourceBytes: clip.pcm.length,
      mimeType: clip.mimeType,
      prompt: clip.prompt,
      request: buildRequest(clip.prompt),
      reusedFromCache: clip.cached,
    })),
  };
  const verificationReport = {
    generatedAt,
    budget: report.budget,
    asset: report.asset,
  };

  // Publish supporting audit data first. The manifest rename is the runtime
  // commit point: before it, the old manifest still references an existing old
  // sprite; after it, the fully-written content-addressed new sprite exists.
  await writeTextAtomically(
    join(CACHE_DIR, 'generation-report.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  await writeTextAtomically(
    join(AUDIT_DIR, 'verification-report.json'),
    JSON.stringify(verificationReport, null, 2) + '\n'
  );
  await writeTextAtomically(
    join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );

  // Only the committed manifest decides which sprite may be retired.
  const obsoleteDirectory = join(CACHE_DIR, 'obsolete-sprites');
  await mkdir(obsoleteDirectory, { recursive: true });
  for (const fileName of await readdir(OUTPUT_DIR)) {
    if (/^sprite\.[a-f0-9]{64}\.ogg$/.test(fileName) && fileName !== spriteName) {
      await rename(join(OUTPUT_DIR, fileName), join(obsoleteDirectory, fileName));
    }
  }
  await unlink(join(OUTPUT_DIR, 'generation-report.json')).catch(() => {});
  await Promise.all([unlink(masterPath), unlink(decodedPath)]);

  console.log('[voice] generated ' + finalSpritePath);
  console.log(
    '[voice] encoded: ' +
      encoded.length +
      ' bytes; AudioBuffer @24k: ' +
      decodedAudioBufferBytesAt24k +
      ' bytes; @48k: ' +
      decodedAudioBufferBytesAt48k +
      ' bytes'
  );
  console.log('[voice] duration: ' + sourceDurationSeconds.toFixed(2) + ' s');
  console.log('[voice] estimated cost: $' + estimatedTotalCostUsd.toFixed(4));
  } finally {
    await generationLock.release();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('[voice] failed: ' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
