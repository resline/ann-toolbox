import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import {
  VOICE_FRAGMENT_COUNT,
  VOICE_FRAGMENT_DEFINITIONS,
  VOICE_GRAMMAR_VERSION,
  VOICE_PACK_ID,
  VOICE_REGISTRY_SHA256,
} from '../src/modules/speaking-clock/services/polishAnnouncementPlanner';

interface ManifestFragment {
  startFrame: number;
  frameCount: number;
  text: string;
  prosodyRole: string;
  promptId: string;
}

interface Manifest {
  schemaVersion: number;
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
  fragments: Record<string, ManifestFragment>;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sampleAt(buffer: Buffer, frame: number): number {
  return buffer.readInt16LE(frame * 2);
}

function rms(buffer: Buffer, startFrame: number, endFrame: number): number {
  let squareSum = 0;
  let count = 0;
  for (let frame = Math.max(0, startFrame); frame < endFrame && frame * 2 + 1 < buffer.length; frame += 1) {
    const sample = sampleAt(buffer, frame);
    squareSum += sample * sample;
    count += 1;
  }
  return count > 0 ? Math.sqrt(squareSum / count) : 0;
}

async function main(): Promise<void> {
  const directory = resolve('public', 'audio', 'voice', VOICE_PACK_ID);
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')) as Manifest;
  const reportPath = resolve('docs', 'voice-packs', VOICE_PACK_ID, 'verification-report.json');
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
    generatedAt?: string;
    budget?: {
      maximumUsd?: number;
      estimatedTotalCostUsd?: number;
      committedUsageCostUsd?: number;
      peakInFlightReservedCostUsd?: number;
      reservedWorstCaseAttemptCostUsd?: number;
    };
    asset?: {
      fragmentCount?: number;
      encodedBytes?: number;
      sourceFrames?: number;
      spriteSha256?: string;
      decodedAudioBufferBytesAt24k?: number;
      decodedAudioBufferBytesAt48k?: number;
    };
  };
  assert(manifest.schemaVersion === 1, 'Unexpected manifest schema.');
  assert(manifest.grammarVersion === VOICE_GRAMMAR_VERSION, 'Grammar version mismatch.');
  const registrySha256 = sha256(
    Buffer.from(
      JSON.stringify(
        VOICE_FRAGMENT_DEFINITIONS
          .map(({ id, text, prosodyRole, promptId }) => ({ id, text, prosodyRole, promptId }))
          .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
      )
    )
  );
  assert(registrySha256 === VOICE_REGISTRY_SHA256, 'Source registry fingerprint mismatch.');
  assert(manifest.registrySha256 === VOICE_REGISTRY_SHA256, 'Manifest registry fingerprint mismatch.');
  assert(manifest.packId === VOICE_PACK_ID, 'Pack id mismatch.');
  assert(manifest.model === 'gemini-3.1-flash-tts-preview', 'Model mismatch.');
  assert(manifest.voice === 'Kore' && manifest.locale === 'pl-PL', 'Voice contract mismatch.');
  assert(manifest.sourceSampleRateHz === 24_000 && manifest.channels === 1, 'PCM contract mismatch.');
  assert(manifest.runtimeSampleRateHz === 24_000, 'Runtime sample-rate contract mismatch.');
  assert(Object.keys(manifest.fragments).length === VOICE_FRAGMENT_COUNT, 'Fragment count mismatch.');
  assert(
    Number.isFinite(Date.parse(manifest.generatedAt)) && report.generatedAt === manifest.generatedAt,
    'Manifest/report generation timestamp mismatch.'
  );
  assert(
    Number.isSafeInteger(manifest.sprite.encodedBytes) && manifest.sprite.encodedBytes > 0,
    'Invalid encoded sprite size.'
  );
  assert(
    Number.isSafeInteger(manifest.sprite.sourceFrameCount) && manifest.sprite.sourceFrameCount > 0,
    'Invalid source frame count.'
  );

  const ranges: Array<{ start: number; end: number }> = [];

  for (const definition of VOICE_FRAGMENT_DEFINITIONS) {
    const fragment = manifest.fragments[definition.id];
    assert(fragment, 'Missing fragment ' + definition.id + '.');
    assert(fragment.text === definition.text, 'Transcript mismatch for ' + definition.id + '.');
    assert(fragment.prosodyRole === definition.prosodyRole, 'Prosody mismatch for ' + definition.id + '.');
    assert(fragment.promptId === definition.promptId, 'Prompt mismatch for ' + definition.id + '.');
    assert(fragment.frameCount > 0, 'Empty fragment ' + definition.id + '.');
    assert(
      fragment.startFrame + fragment.frameCount <= manifest.sprite.sourceFrameCount,
      'Out-of-bounds fragment ' + definition.id + '.'
    );
    ranges.push({ start: fragment.startFrame, end: fragment.startFrame + fragment.frameCount });
  }
  ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < ranges.length; index += 1) {
    assert(ranges[index].start >= ranges[index - 1].end, 'Fragment ranges overlap.');
  }

  const spritePath = join(directory, basename(manifest.sprite.url));
  const encoded = await readFile(spritePath);
  assert(encoded.length === manifest.sprite.encodedBytes, 'Encoded size mismatch.');
  assert(sha256(encoded) === manifest.sprite.sha256, 'Sprite SHA-256 mismatch.');
  assert(basename(spritePath) === 'sprite.' + manifest.sprite.sha256 + '.ogg', 'Sprite is not content addressed.');
  assert(
    manifest.sprite.url ===
      '/audio/voice/' + VOICE_PACK_ID + '/sprite.' + manifest.sprite.sha256 + '.ogg',
    'Sprite URL is not the exact immutable same-origin pack path.'
  );
  const publicFiles = await readdir(directory);
  assert(!publicFiles.includes('generation-report.json'), 'Private generation report must not be public.');
  assert(
    publicFiles.filter((fileName) => /^sprite\.[a-f0-9]{64}\.ogg$/.test(fileName)).length === 1,
    'The public pack must contain exactly one active sprite.'
  );

  const decodedPath = join(tmpdir(), 'ann-toolbox-voice-validate-' + process.pid + '.pcm');
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', spritePath,
      '-f', 's16le', '-ar', String(manifest.sourceSampleRateHz), '-ac', '1', decodedPath,
    ],
    { stdio: 'inherit' }
  );
  const decoded = await readFile(decodedPath);
  await unlink(decodedPath);
  const decodedFrames = decoded.length / 2;
  assert(decodedFrames + 2400 >= manifest.sprite.sourceFrameCount, 'Decoded timeline is too short.');
  const decodedAudioBufferBytesAt24k = decodedFrames * 4;
  const decodedAudioBufferBytesAt48k = Math.ceil((decodedFrames / 24_000) * 48_000) * 4;
  assert(decodedAudioBufferBytesAt24k <= 48 * 1024 * 1024, 'Decoded memory exceeds 48 MiB.');

  let peak = 0;
  let clippingSamples = 0;
  let largestDcOffset = 0;
  let quietFragments = 0;
  for (const fragment of Object.values(manifest.fragments)) {
    let sum = 0;
    let fragmentPeak = 0;
    for (let frame = fragment.startFrame; frame < fragment.startFrame + fragment.frameCount; frame += 1) {
      const sample = sampleAt(decoded, frame);
      sum += sample;
      fragmentPeak = Math.max(fragmentPeak, Math.abs(sample));
      peak = Math.max(peak, Math.abs(sample));
      if (Math.abs(sample) >= 32760) clippingSamples += 1;
    }
    largestDcOffset = Math.max(largestDcOffset, Math.abs(sum / fragment.frameCount));
    if (rms(decoded, fragment.startFrame, fragment.startFrame + fragment.frameCount) < 200) quietFragments += 1;
  }
  assert(quietFragments === 0, quietFragments + ' fragments have no audible signal.');
  assert(clippingSamples === 0, 'Decoded sprite contains clipping.');
  assert(peak > 1000, 'Decoded sprite has no audible peak.');
  assert(largestDcOffset < 1500, 'Decoded fragment DC offset is too large.');

  assert(report.asset?.fragmentCount === VOICE_FRAGMENT_COUNT, 'Report fragment count mismatch.');
  assert(report.asset?.encodedBytes === encoded.length, 'Report encoded-size mismatch.');
  assert(
    report.asset?.sourceFrames === manifest.sprite.sourceFrameCount,
    'Report source-frame mismatch.'
  );
  assert(report.asset?.spriteSha256 === manifest.sprite.sha256, 'Report hash mismatch.');
  assert(
    report.asset?.decodedAudioBufferBytesAt24k === decodedAudioBufferBytesAt24k,
    'Report 24 kHz decoded-memory mismatch.'
  );
  assert(
    report.asset?.decodedAudioBufferBytesAt48k === decodedAudioBufferBytesAt48k,
    'Report 48 kHz decoded-memory mismatch.'
  );
  assert(report.budget?.maximumUsd === 5, 'Report must use the reviewed $5 budget.');
  assert(
    (report.budget?.estimatedTotalCostUsd ?? Number.POSITIVE_INFINITY) <= (report.budget?.maximumUsd ?? 0),
    'Estimated cost exceeds the report budget.'
  );
  const measuredOrReservedCost =
    report.budget?.committedUsageCostUsd ?? report.budget?.reservedWorstCaseAttemptCostUsd;
  assert(
    measuredOrReservedCost === undefined || measuredOrReservedCost <= (report.budget?.maximumUsd ?? 0),
    'Recorded generation usage exceeds the report budget.'
  );
  assert(
    report.budget?.peakInFlightReservedCostUsd === undefined ||
      report.budget.peakInFlightReservedCostUsd <= (report.budget?.maximumUsd ?? 0),
    'Peak in-flight reservation exceeds the report budget.'
  );

  const info = await stat(spritePath);
  console.log(
    '[voice:validate] ' +
      VOICE_FRAGMENT_COUNT +
      '/' +
      VOICE_FRAGMENT_COUNT +
      ' fragments resolve and contain audio.'
  );
  console.log('[voice:validate] SHA-256 ' + manifest.sprite.sha256 + ' (' + info.size + ' bytes).');
  console.log(
    '[voice:validate] AudioBuffer @24k: ' +
      decodedAudioBufferBytesAt24k +
      ' bytes; @48k: ' +
      decodedAudioBufferBytesAt48k +
      ' bytes.'
  );
  console.log('[voice:validate] peak: ' + peak + '; max DC: ' + largestDcOffset.toFixed(2) + '; clipping: 0.');
}

main().catch((error) => {
  console.error('[voice:validate] failed: ' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
