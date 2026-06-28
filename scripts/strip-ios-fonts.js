#!/usr/bin/env node
// Strips web-only font formats from the iOS Capacitor bundle after cap sync.
// Apple's ITMS-90853 validator detects woff/woff2 by magic bytes and rejects them.
//
// For QPC V1 mushaf fonts: converts woff2 → TTF into qpcv1ttf/ before removing qpcv1/.
// App uses TTF on iOS so Mushaf works fully offline.
//
// For QPC V2 reader fonts: converts woff2 → TTF into qpcv2ttf/ before removing qpcv2/.
// App uses TTF on iOS so Reader works fully offline.
//
// Other fonts: CSS already has ttf fallback src entries that survive the strip.

import { existsSync, rmSync, readdirSync, unlinkSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const IOS_PUBLIC = join(__dirname, '..', 'ios', 'App', 'App', 'public');

const WEB_FONT_EXTS = ['.woff2', '.woff'];

function rmDir(dir) {
  if (!existsSync(dir)) return;
  rmSync(dir, { recursive: true, force: true });
  console.log('  rmdir', relative(process.cwd(), dir));
}

// Recursively remove web font files under dir
function rmFontsRecursive(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      rmFontsRecursive(full);
    } else if (WEB_FONT_EXTS.some(ext => entry.name.endsWith(ext))) {
      unlinkSync(full);
      console.log('  rm   ', relative(process.cwd(), full));
    }
  }
}

// Convert all woff2 files in srcDir to TTF files in dstDir using wawoff2.
// label is used only for logging (e.g. 'qcf4', 'qpcv1', 'qpcv2').
async function convertWoff2ToTTF(srcDir, dstDir, label) {
  if (!existsSync(srcDir)) {
    console.log(`  [${label}] source dir not found, skipping TTF conversion`);
    return 0;
  }

  let wawoff2;
  try {
    const mod = await import('wawoff2');
    wawoff2 = mod.default || mod;
  } catch (e) {
    console.warn(`  [${label}] wawoff2 not installed — run: npm install --save-dev wawoff2`);
    console.warn(`  [${label}] Skipping TTF conversion; iOS fonts will fall back to network.`);
    return 0;
  }

  const files = readdirSync(srcDir).filter(f => f.endsWith('.woff2'));
  if (!files.length) { console.log(`  [${label}] no woff2 files found`); return 0; }

  mkdirSync(dstDir, { recursive: true });

  console.log(`  [${label}] converting ${files.length} woff2 → ttf...`);
  let ok = 0, fail = 0;
  for (const file of files) {
    try {
      const woff2Data = readFileSync(join(srcDir, file));
      const ttfData = await wawoff2.decompress(woff2Data);
      const ttfName = file.replace('.woff2', '.ttf');
      writeFileSync(join(dstDir, ttfName), Buffer.from(ttfData));
      ok++;
    } catch (e) {
      console.warn(`  [${label}] failed to convert`, file, e.message);
      fail++;
    }
  }
  const totalKB = Math.round(
    readdirSync(dstDir)
      .reduce((s, f) => s + statSync(join(dstDir, f)).size, 0) / 1024
  );
  console.log(`  [${label}] ${ok} converted, ${fail} failed — ${label}ttf/ ${totalKB} KB`);
  return ok;
}

async function main() {
  console.log('\nPreparing iOS font bundle...');
  console.log('  IOS_PUBLIC:', IOS_PUBLIC);

  const fontsDir  = join(IOS_PUBLIC, 'assets', 'fonts');

  const qpcv1Src  = join(fontsDir, 'qpcv1');
  const qpcv1Dst  = join(fontsDir, 'qpcv1ttf');
  const qpcv2Src  = join(fontsDir, 'qpcv2');
  const qpcv2Dst  = join(fontsDir, 'qpcv2ttf');

  // Convert QPC V1 woff2 → TTF for offline Mushaf on iOS (ITMS-90853 safe)
  const v1Count = await convertWoff2ToTTF(qpcv1Src, qpcv1Dst, 'qpcv1');
  if (v1Count > 0 && v1Count !== 604) {
    console.error(`  [qpcv1] ERROR: expected 604 TTFs, got ${v1Count}`);
    process.exit(1);
  }

  // Convert QPC V2 woff2 → TTF for offline Reader on iOS (ITMS-90853 safe)
  const v2Count = await convertWoff2ToTTF(qpcv2Src, qpcv2Dst, 'qpcv2');
  if (v2Count > 0 && v2Count !== 604) {
    console.error(`  [qpcv2] ERROR: expected 604 TTFs, got ${v2Count}`);
    process.exit(1);
  }

  // Remove original woff2 directories now that TTF copies exist
  rmDir(qpcv1Src);
  rmDir(qpcv2Src);
  // Remove qcf4 and qcf2 font dirs (no longer used by any active feature)
  rmDir(join(fontsDir, 'qcf4'));
  rmDir(join(fontsDir, 'qcf2'));

  // Recursively strip all remaining .woff / .woff2 from font directories
  rmFontsRecursive(fontsDir);
  rmFontsRecursive(join(IOS_PUBLIC, 'fonts'));
  rmFontsRecursive(join(IOS_PUBLIC, 'assets', 'fontawesome'));

  // Verify no web fonts remain in the bundle — hard fail if any found
  let foundBad = 0;
  function verifyClean(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        verifyClean(full);
      } else if (WEB_FONT_EXTS.some(ext => entry.name.endsWith(ext))) {
        console.error('ERROR: web font not stripped:', relative(process.cwd(), full));
        foundBad++;
      }
    }
  }
  verifyClean(join(IOS_PUBLIC, 'assets'));
  verifyClean(join(IOS_PUBLIC, 'fonts'));

  if (foundBad > 0) {
    console.error(`[strip-ios-fonts] ${foundBad} web font(s) remain — aborting`);
    process.exit(1);
  }

  console.log('[strip-ios-fonts] verification passed');
  console.log('Done.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
