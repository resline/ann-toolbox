// @vitest-environment node

import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GenerationBudget,
  acquireGenerationLock,
  publishContentAddressedSprite,
} from './generate-speaking-clock-voice';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ann-toolbox-generator-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe('GenerationBudget', () => {
  it('allows a fresh 337-fragment run by converting in-flight reservations to measured usage', () => {
    const budget = new GenerationBudget(5);
    const prompt = 'Mow dokladnie ten krotki tekst.';
    const initialReservations = Array.from({ length: 4 }, () => budget.reserve(prompt));

    for (const reservation of initialReservations) {
      reservation.markSent();
      reservation.settleFromUsage({ inputTokens: 120, outputAudioTokens: 300 });
    }
    for (let index = 4; index < 337; index += 1) {
      const reservation = budget.reserve(prompt);
      reservation.markSent();
      reservation.settleFromUsage({ inputTokens: 120, outputAudioTokens: 300 });
    }

    const snapshot = budget.snapshot();
    expect(snapshot.sentAttempts).toBe(337);
    expect(snapshot.committedUsageCostUsd).toBeLessThan(5);
    expect(snapshot.inFlightReservedCostUsd).toBe(0);
    expect(snapshot.peakInFlightReservedCostUsd).toBeGreaterThan(1.3);
    expect(snapshot.cumulativeWorstCaseReservationsUsd).toBeGreaterThan(100);
  });

  it('enforces committed plus in-flight cost and retains unknown attempts at worst case', () => {
    const budget = new GenerationBudget(0.5);
    const first = budget.reserve('prompt');

    expect(() => budget.reserve('prompt')).toThrow(/cannot reserve another Vertex attempt/);
    first.markSent();
    first.settleUnknown();
    expect(() => budget.reserve('prompt')).toThrow(/cannot reserve another Vertex attempt/);

    const snapshot = budget.snapshot();
    expect(snapshot.uncertainAttempts).toBe(1);
    expect(snapshot.committedUsageCostUsd).toBeCloseTo(first.worstCaseCostUsd, 8);
    expect(snapshot.inFlightReservedCostUsd).toBe(0);
  });

  it('releases an attempt that was reserved but provably not sent', () => {
    const budget = new GenerationBudget(0.5);
    const reservation = budget.reserve('prompt');
    reservation.releaseUnsent();

    expect(budget.snapshot()).toMatchObject({
      sentAttempts: 0,
      committedUsageCostUsd: 0,
      inFlightReservedCostUsd: 0,
    });
  });
});

describe('confirmed generation lock', () => {
  it('fails fast for a concurrent owner and can be reacquired after safe release', async () => {
    const directory = await temporaryDirectory();
    const lockPath = join(directory, '.generation.lock');
    const first = await acquireGenerationLock(lockPath);

    await expect(acquireGenerationLock(lockPath)).rejects.toThrow(
      /Another confirmed voice generation owns/
    );
    await first.release();

    const second = await acquireGenerationLock(lockPath);
    await second.release();
  });
});

describe('content-addressed sprite publication', () => {
  it('publishes through a destination-side temporary file and is idempotent', async () => {
    const directory = await temporaryDirectory();
    const outputDirectory = join(directory, 'output');
    await mkdir(outputDirectory);
    const bytes = Buffer.from('immutable sprite bytes');
    const digest = createHash('sha256').update(bytes).digest('hex');
    const finalPath = join(outputDirectory, 'sprite.' + digest + '.ogg');
    const firstSource = join(directory, 'first.ogg');
    await writeFile(firstSource, bytes);

    await publishContentAddressedSprite(firstSource, finalPath, digest);
    await expect(readFile(finalPath)).resolves.toEqual(bytes);
    await expect(readFile(firstSource)).rejects.toMatchObject({ code: 'ENOENT' });

    const secondSource = join(directory, 'second.ogg');
    await writeFile(secondSource, bytes);
    await publishContentAddressedSprite(secondSource, finalPath, digest);
    await expect(readFile(finalPath)).resolves.toEqual(bytes);
    await expect(readFile(secondSource)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses to replace unexpected bytes at a content-addressed path', async () => {
    const directory = await temporaryDirectory();
    const source = join(directory, 'source.ogg');
    const finalPath = join(directory, 'sprite.hash.ogg');
    const expected = Buffer.from('expected');
    await writeFile(source, expected);
    await writeFile(finalPath, 'corrupt');

    await expect(
      publishContentAddressedSprite(
        source,
        finalPath,
        createHash('sha256').update(expected).digest('hex')
      )
    ).rejects.toThrow(/unexpected content/);
    await expect(readFile(source)).resolves.toEqual(expected);
  });
});
