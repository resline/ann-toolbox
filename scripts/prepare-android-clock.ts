import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DEFAULT_SPEAKING_CLOCK_SETTINGS } from '../src/modules/speaking-clock/types';
import { CHIME_TONES } from '../src/lib/audio/chime';
import { VOICE_PACK_ID, VOICE_FRAGMENT_DEFINITIONS, planTimeAnnouncement, planDepartureAnnouncement, planInteger } from '../src/modules/speaking-clock/services/polishAnnouncementPlanner';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'android/app/build/generated/clock/assets/clock');
await mkdir(out, { recursive: true });
const manifest = JSON.parse(await readFile(join(root, 'public/audio/voice', VOICE_PACK_ID, 'manifest.json'), 'utf8'));
const sprite = join(root, 'public', manifest.sprite.url);
const sha = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
if (sha(await readFile(sprite)) !== manifest.sprite.sha256) throw new Error('Voice source hash mismatch');
const pcmFile = join(out, 'voice.pcm');
execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', sprite, '-ac', '1', '-ar', '24000', '-f', 's16le', pcmFile]);
const pcm = await readFile(pcmFile);
if (pcm.length !== manifest.sprite.sourceFrameCount * 2 || pcm.length * 2 > 48 * 1024 * 1024) {
  throw new Error('Invalid decoded voice size');
}
const nativeManifest = { ...manifest, pcmSha256: sha(pcm), pcmBytes: pcm.length };
await writeFile(join(out, 'manifest.json'), JSON.stringify(nativeManifest));
const timeTexts: Record<string, string[]> = {};
for (const style of ['natural', 'precise', 'short'] as const) {
  timeTexts[style] = Array.from({ length: 1440 }, (_, minute) =>
    planTimeAnnouncement(new Date(2026, 0, 1, Math.floor(minute / 60), minute % 60), style).text);
}
await writeFile(join(out, 'config.json'), JSON.stringify({
  settings: { ...DEFAULT_SPEAKING_CLOCK_SETTINGS, keepAwake: false },
  chimes: CHIME_TONES,
  timeTexts,
}));

// Golden vectors originate from the existing production planner, not the Kotlin port.
// UTC makes JVM and Node comparisons independent of the build machine timezone.
process.env.TZ = 'UTC';
const vectors: unknown[] = [];
for (let minute = 0; minute < 1440; minute++) {
  const date = new Date(Date.UTC(2026, 0, 1, Math.floor(minute / 60), minute % 60));
  for (const style of ['natural', 'precise', 'short', 'elapsed'] as const) {
    vectors.push({ kind: 'time', timestamp: date.getTime(), style, elapsed: minute,
      plan: planTimeAnnouncement(date, style, { elapsedMinutes: minute }) });
  }
}
const target = new Date(Date.UTC(2026, 0, 2, 8, 30));
for (const elapsed of [0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 101, 112, 1000, 2002, 1_000_000, Number.MAX_SAFE_INTEGER]) {
  vectors.push({ kind: 'integer', value: elapsed, fragments: planInteger(elapsed) });
  for (const end of [false, true]) vectors.push({ kind: 'time', timestamp: target.getTime(), style: 'elapsed', elapsed, end,
    plan: planTimeAnnouncement(target, 'elapsed', { elapsedMinutes: elapsed, isSessionEnd: end }) });
}
for (const label of [...DEFAULT_LABELS(), 'Dentysta', '  SPOTKANIE  ']) {
  for (const seconds of [0, 1, 30, 31, 59, 60, 89, 90, 120, 240, 300, 660, 720, 840, 899, 900, 1260, 1320, 86400]) {
    for (const withTarget of [false, true]) vectors.push({ kind: 'departure', seconds, label,
      target: withTarget ? target.getTime() : null, plan: planDepartureAnnouncement(seconds, label, withTarget ? target : undefined) });
  }
}
await writeFile(join(root, 'android/app/build/generated/clock/planner-vectors.json'), JSON.stringify(vectors));
console.log(`Android clock: ${VOICE_FRAGMENT_DEFINITIONS.length} fragments, ${pcm.length} PCM bytes, ${vectors.length} parity vectors`);

function DEFAULT_LABELS() { return ['Wyjście z domu', 'Spotkanie', 'Pociąg lub autobus', 'Leki', 'Gotowanie', 'Przerwa']; }
