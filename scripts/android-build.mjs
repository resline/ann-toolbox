import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mode = process.argv[2] ?? 'debug';
if (!['debug', 'release', 'test'].includes(mode)) throw new Error('Expected debug, release or test');
const java = process.env.ANN_ANDROID_JAVA_HOME ?? process.env.JAVA_HOME ?? join(homedir(), '.cache/ann-toolbox/java21/current');
if (!existsSync(join(java, 'bin/javac'))) throw new Error('Set ANN_ANDROID_JAVA_HOME to a complete JDK 21 installation.');
const sdk = process.env.ANDROID_HOME ?? join(homedir(), 'Android/Sdk');
const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk };
function run(command, args, options = {}) {
  const r = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', ...options });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${command} failed (${r.status})`);
  return r.stdout;
}

if (mode === 'release') {
  if (!env.ANN_ANDROID_KEYSTORE) {
    const privateDir = join(homedir(), '.local/share/ann-toolbox/android-signing');
    mkdirSync(privateDir, { recursive: true, mode: 0o700 });
    const credentials = join(privateDir, 'signing.json');
    const keystore = join(privateDir, 'przystan-release.jks');
    if (!existsSync(credentials)) {
      if (existsSync(keystore)) throw new Error('Existing keystore has no signing.json. Restore its credentials; do not replace the key.');
      writeFileSync(credentials, JSON.stringify({ password: randomBytes(32).toString('hex') }), { mode: 0o600, flag: 'wx' });
    }
    const { password } = JSON.parse(readFileSync(credentials, 'utf8'));
    env.ANN_ANDROID_KEYSTORE = keystore;
    env.ANN_ANDROID_STORE_PASSWORD = password;
    env.ANN_ANDROID_KEY_PASSWORD = password;
    if (!existsSync(keystore)) {
      run(join(java, 'bin/keytool'), ['-genkeypair', '-keystore', keystore, '-storetype', 'JKS',
        '-alias', 'przystan', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
        '-dname', 'CN=Przystan, O=Resline', '-storepass:env', 'ANN_ANDROID_STORE_PASSWORD',
        '-keypass:env', 'ANN_ANDROID_KEY_PASSWORD', '-noprompt']);
      chmodSync(keystore, 0o600);
    }
  }
  if (!env.ANN_ANDROID_STORE_PASSWORD || !env.ANN_ANDROID_KEY_PASSWORD) throw new Error('Signing passwords must be supplied through the documented environment variables.');
}

// Both the web and native build validate the immutable source pack.
run('npm', ['run', mode === 'test' ? 'voice:validate' : 'build']);
if (mode !== 'test') {
  run(join(root, 'node_modules/.bin/cap'), ['sync', 'android']);
  // The website distributes APKs; a native APK must never embed another APK.
  rmSync(join(root, 'android/app/src/main/assets/public/downloads'), { recursive: true, force: true });
}
const task = mode === 'test' ? 'testDebugUnitTest' : mode === 'release' ? 'assembleRelease' : 'assembleDebug';
run(join(root, 'android/gradlew'), ['-p', 'android', `:app:${task}`, ...(mode === 'release' ? [':app:lintRelease'] : []), '--console=plain']);
if (mode !== 'test') {
  const apk = join(root, `android/app/build/outputs/apk/${mode}/app-${mode}.apk`);
  const buildTools = readdirSync(join(sdk, 'build-tools')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1);
  const certificates = run(join(sdk, 'build-tools', buildTools, 'apksigner'), ['verify', '--verbose', '--print-certs', apk], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
  const output = join(root, 'artifacts/android');
  mkdirSync(output, { recursive: true });
  const filename = `przystan-1.0-${mode}.apk`;
  copyFileSync(apk, join(output, filename));
  const sha256 = createHash('sha256').update(readFileSync(apk)).digest('hex');
  writeFileSync(join(output, `${filename}.sha256`), `${sha256}  ${filename}\n`);
  writeFileSync(join(output, `${filename}.certificate.txt`), certificates);
  if (mode === 'release') {
    const downloads = join(root, 'public/downloads');
    mkdirSync(downloads, { recursive: true });
    copyFileSync(apk, join(downloads, 'przystan.apk'));
    writeFileSync(join(downloads, 'przystan.apk.sha256'), `${sha256}  przystan.apk\n`);
  }
  console.log(`APK: ${join(output, filename)}\nSHA-256: ${sha256}`);
}
