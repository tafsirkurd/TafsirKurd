#!/usr/bin/env node
// Strips web-only font formats from the iOS Capacitor bundle after cap sync.
// Apple's ITMS-90853 validator detects woff/woff2 by magic bytes and rejects them.
//
// For QCF4 mushaf fonts: converts woff2 → TTF using wawoff2 (WASM-based decompressor)
// and writes them to qcf4ttf/ before removing qcf4/.  The app uses TTF on iOS so
// Mushaf mode works fully offline (no network needed for fonts).
//
// Other fonts: CSS already has ttf fallback src entries that survive the strip.

const fs   = require('fs');
const path = require('path');

const IOS_PUBLIC = path.join(__dirname, '..', 'ios', 'App', 'App', 'public');

const WEB_FONT_EXTS = ['.woff2', '.woff', '.bin'];

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('  rmdir', path.relative(process.cwd(), dir));
}

function rmFonts(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (WEB_FONT_EXTS.some(ext => f.endsWith(ext))) {
      fs.unlinkSync(path.join(dir, f));
      console.log('  rm   ', path.relative(process.cwd(), path.join(dir, f)));
    }
  }
}

// Convert all woff2 files in srcDir to TTF files in dstDir using wawoff2.
// Returns a Promise that resolves when done.
async function convertQCF4ToTTF(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) {
    console.log('  [qcf4] source dir not found, skipping TTF conversion');
    return;
  }

  let wawoff2;
  try {
    wawoff2 = require('wawoff2');
  } catch (e) {
    console.warn('  [qcf4] wawoff2 not installed — run: npm install --save-dev wawoff2');
    console.warn('  [qcf4] Skipping TTF conversion; iOS Mushaf will fall back to network fonts.');
    return;
  }

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.woff2'));
  if (!files.length) { console.log('  [qcf4] no woff2 files found'); return; }

  fs.mkdirSync(dstDir, { recursive: true });

  console.log(`  [qcf4] converting ${files.length} woff2 → ttf...`);
  let ok = 0, fail = 0;
  for (const file of files) {
    try {
      const woff2Data = fs.readFileSync(path.join(srcDir, file));
      const ttfData = await wawoff2.decompress(woff2Data);
      const ttfName = file.replace('.woff2', '.ttf');
      fs.writeFileSync(path.join(dstDir, ttfName), Buffer.from(ttfData));
      ok++;
    } catch (e) {
      console.warn('  [qcf4] failed to convert', file, e.message);
      fail++;
    }
  }
  const totalKB = Math.round(
    fs.readdirSync(dstDir)
      .reduce((s, f) => s + fs.statSync(path.join(dstDir, f)).size, 0) / 1024
  );
  console.log(`  [qcf4] ${ok} converted, ${fail} failed — qcf4ttf/ ${totalKB} KB`);
}

async function main() {
  console.log('\nPreparing iOS font bundle...');

  const qcf4Src = path.join(IOS_PUBLIC, 'assets', 'fonts', 'qcf4');
  const qcf4Dst = path.join(IOS_PUBLIC, 'assets', 'fonts', 'qcf4ttf');

  // Convert QCF4 woff2 → TTF for offline Mushaf on iOS (ITMS-90853 safe)
  await convertQCF4ToTTF(qcf4Src, qcf4Dst);

  // Remove directories/files with web font formats
  rmDir(qcf4Src);
  rmDir(path.join(IOS_PUBLIC, 'assets', 'fonts', 'qcf2'));
  rmFonts(path.join(IOS_PUBLIC, 'assets', 'fonts'));
  rmFonts(path.join(IOS_PUBLIC, 'fonts'));
  rmFonts(path.join(IOS_PUBLIC, 'assets', 'fontawesome', 'webfonts'));

  // Verify no web fonts remain — hard fail if any found
  function verifyClean(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        verifyClean(full);
      } else if (WEB_FONT_EXTS.some(ext => entry.name.endsWith(ext))) {
        console.error('ERROR: web font not stripped:', path.relative(process.cwd(), full));
        process.exit(1);
      }
    }
  }
  verifyClean(path.join(IOS_PUBLIC, 'assets', 'fonts'));
  verifyClean(path.join(IOS_PUBLIC, 'fonts'));
  verifyClean(path.join(IOS_PUBLIC, 'assets', 'fontawesome'));

  console.log('[strip-ios-fonts] verification passed');
  console.log('Done.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
