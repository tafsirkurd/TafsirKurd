/**
 * Download all 604 QPC V1 woff2 fonts from the QUL CDN.
 * Source: https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1/woff2/p{N}.woff2
 * Dest:   src/assets/fonts/qpcv1/p{N}.woff2
 *
 * Run: node scripts/download-qpcv1-fonts.cjs
 * Resume-safe: skips pages already downloaded.
 * Rate: 6 concurrent downloads (polite to CDN).
 */

'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const CDN_BASE  = 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1/woff2';
const OUT_DIR   = path.join(__dirname, '..', 'src', 'assets', 'fonts', 'qpcv1');
const PAGES     = 604;
const CONCURR   = 6;
const MAX_RETRY = 3;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function downloadFile(url, dest, retries) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest + '.tmp');
    const req  = https.get(url, { timeout: 30000 }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(dest + '.tmp', () => {});
        return downloadFile(res.headers.location, dest, retries).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest + '.tmp', () => {});
        return reject(new Error('HTTP ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          fs.rename(dest + '.tmp', dest, err => {
            if (err) reject(err); else resolve();
          });
        });
      });
    });
    req.on('error', err => {
      file.close();
      fs.unlink(dest + '.tmp', () => {});
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      file.close();
      fs.unlink(dest + '.tmp', () => {});
      reject(new Error('timeout'));
    });
  });
}

async function downloadWithRetry(page) {
  const url  = CDN_BASE + '/p' + page + '.woff2';
  const dest = path.join(OUT_DIR, 'p' + page + '.woff2');
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return 'skip';
  let lastErr;
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      await downloadFile(url, dest, i);
      const size = fs.statSync(dest).size;
      if (size < 1000) throw new Error('file too small: ' + size + 'B');
      return size;
    } catch (e) {
      lastErr = e;
      if (i < MAX_RETRY - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

async function run() {
  const startTime = Date.now();
  const results   = { ok: 0, skip: 0, fail: 0, failPages: [] };
  const queue     = Array.from({ length: PAGES }, (_, i) => i + 1);

  console.log('Downloading ' + PAGES + ' QPC V1 woff2 fonts → ' + OUT_DIR);
  console.log('Concurrency: ' + CONCURR + ' | CDN: ' + CDN_BASE + '\n');

  async function worker() {
    while (queue.length) {
      const page = queue.shift();
      try {
        const r = await downloadWithRetry(page);
        if (r === 'skip') {
          results.skip++;
          process.stdout.write('.');
        } else {
          results.ok++;
          process.stdout.write('+');
        }
      } catch (e) {
        results.fail++;
        results.failPages.push(page);
        process.stdout.write('!');
        console.error('\n  FAIL p' + page + ': ' + e.message);
      }
      if ((results.ok + results.skip + results.fail) % 60 === 0) {
        const done = results.ok + results.skip + results.fail;
        const pct  = Math.round(done / PAGES * 100);
        process.stdout.write(' ' + done + '/' + PAGES + ' (' + pct + '%)\n');
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURR }, () => worker()));
  process.stdout.write('\n');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total   = results.ok + results.skip;

  // Verify final file count
  const files   = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.woff2'));
  const totalKB = files.reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0);

  console.log('\n── Result ──────────────────────────────');
  console.log('Downloaded  : ' + results.ok);
  console.log('Skipped     : ' + results.skip + ' (already exist)');
  console.log('Failed      : ' + results.fail + (results.failPages.length ? ' — pages: ' + results.failPages.join(', ') : ''));
  console.log('Total files : ' + files.length + ' / ' + PAGES);
  console.log('Total size  : ' + (totalKB / 1024 / 1024).toFixed(1) + ' MB');
  console.log('Time        : ' + elapsed + 's');

  if (files.length < PAGES) {
    console.error('\nERROR: Only ' + files.length + ' of ' + PAGES + ' fonts downloaded.');
    process.exit(1);
  }
  if (results.fail > 0) {
    console.error('\nWARN: ' + results.fail + ' fonts failed. Re-run to retry.');
    process.exit(1);
  }
  console.log('\nAll 604 fonts downloaded. Ready for bundling.');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
