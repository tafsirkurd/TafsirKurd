#!/usr/bin/env node
// USB live-test script for Android
// Patches capacitor.config.ts with server.url, builds & installs APK,
// then starts a local file server so the phone hits your src/ directly.

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const CAP_CONFIG = path.join(ROOT, 'capacitor.config.ts');
const PORT = 3000;
const LOCAL_URL = `http://localhost:${PORT}`;

// ── helpers ────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: opts.silent ? 'pipe' : 'inherit',
    shell: true,
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !opts.allowFail) {
    console.error(`\n[error] "${cmd} ${args.join(' ')}" exited with code ${result.status}`);
    if (result.stderr) console.error(result.stderr.toString());
    process.exit(result.status ?? 1);
  }
  return result;
}

function adb(...args) {
  return run('adb', args);
}

function adbOut(...args) {
  const r = run('adb', args, { silent: true });
  return (r.stdout || '').toString().trim();
}

// ── check USB device ────────────────────────────────────────────────────────

console.log('\n[1/6] Checking USB device…');
const devicesOut = adbOut('devices');
const lines = devicesOut.split('\n').slice(1).filter(l => l.includes('\tdevice'));
if (lines.length === 0) {
  console.error('No USB device found. Connect your phone and enable USB debugging.');
  process.exit(1);
}
const deviceSerial = lines[0].split('\t')[0].trim();
console.log(`     Found: ${deviceSerial}`);

// ── port forwarding ─────────────────────────────────────────────────────────

console.log(`\n[2/6] Setting up adb reverse tcp:${PORT} tcp:${PORT}…`);
adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`);

// ── patch capacitor.config.ts ───────────────────────────────────────────────

console.log('\n[3/6] Patching capacitor.config.ts with server.url…');
const original = fs.readFileSync(CAP_CONFIG, 'utf8');
let patched = original;

// Insert server block if not present; otherwise update existing url
if (/server\s*:/.test(original)) {
  patched = original.replace(
    /(server\s*:\s*\{[^}]*)(url\s*:[^,\n}]*)?/,
    (m, before) => `${before}url: '${LOCAL_URL}',\n    `,
  );
} else {
  patched = original.replace(
    /(\}\s*;?\s*)$/,
    `  server: {\n    url: '${LOCAL_URL}',\n    cleartext: true,\n  },\n$1`,
  );
}
fs.writeFileSync(CAP_CONFIG, patched, 'utf8');

function restore() {
  try { fs.writeFileSync(CAP_CONFIG, original, 'utf8'); } catch (_) {}
  console.log('\n[cleanup] capacitor.config.ts restored.');
}
process.on('SIGINT', () => { restore(); process.exit(0); });
process.on('exit', restore);

// ── cap sync ────────────────────────────────────────────────────────────────

console.log('\n[4/6] Running npx cap sync android…');
run('npx', ['cap', 'sync', 'android']);

// ── build debug APK ─────────────────────────────────────────────────────────

console.log('\n[5/6] Building debug APK (gradlew assembleDebug)…');
const gradlew = path.join(ROOT, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const JAVA_HOME = process.env.JAVA_HOME ||
  'C:\\Program Files\\Android\\Android Studio\\jbr';
const buildEnv = {
  ...process.env,
  JAVA_HOME,
  PATH: `${JAVA_HOME}\\bin;${process.env.PATH}`,
};
run(gradlew, ['assembleDebug'], { cwd: path.join(ROOT, 'android'), env: buildEnv });

const APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(APK)) {
  console.error('APK not found at expected path:', APK);
  process.exit(1);
}

// ── install & launch ────────────────────────────────────────────────────────

console.log('\n[6/6] Installing APK and launching app…');
adb('install', '-r', APK);

// Get package name from capacitor.config.ts
const pkgMatch = original.match(/appId\s*:\s*['"]([^'"]+)['"]/);
const pkg = pkgMatch ? pkgMatch[1] : 'com.tafsirkurd.app';
adb('shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1');

// ── serve src/ locally ──────────────────────────────────────────────────────

const SERVE_DIR = path.join(ROOT, 'src');
const mime = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
};

const https = require('https');

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Proxy Cloudflare Functions to the real endpoint
  if (urlPath === '/update-config') {
    https.get('https://tafsirkurd.com/update-config', (pr) => {
      res.writeHead(pr.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      pr.pipe(res);
    }).on('error', () => { res.writeHead(502); res.end('{}'); });
    return;
  }

  if (urlPath === '/' || urlPath === '') urlPath = '/app/index.html';
  const filePath = path.join(SERVE_DIR, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    const index = path.join(SERVE_DIR, 'app', 'index.html');
    if (fs.existsSync(index)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(index).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n✓ Live server at http://localhost:${PORT}`);
  console.log('  Phone requests are forwarded via adb reverse.');
  console.log('  Edit files in src/ — reload the app to see changes.');
  console.log('\n  Press Ctrl+C to stop and restore config.\n');
});
