#!/usr/bin/env node
// Removes web-only font formats from the iOS Capacitor bundle after cap sync.
// Apple's ITMS-90853 validator detects woff/woff2 by magic bytes and rejects them.
// After stripping:
//   - QCF4 mushaf fonts  → loaded from Cloudflare Worker (already in @font-face fallback)
//   - FontAwesome        → TTF files remain in bundle (CSS has ttf fallback src)
//   - Other Arabic fonts → iOS system fonts (Al Nile / Geeza Pro)

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

console.log('\nStripping web-only fonts from iOS bundle (ITMS-90853 fix)...');

rmDir(path.join(IOS_PUBLIC, 'assets', 'fonts', 'qcf4'));
rmDir(path.join(IOS_PUBLIC, 'assets', 'fonts', 'qcf2'));
rmFonts(path.join(IOS_PUBLIC, 'assets', 'fonts'));
rmFonts(path.join(IOS_PUBLIC, 'fonts'));
rmFonts(path.join(IOS_PUBLIC, 'assets', 'fontawesome', 'webfonts'));

// Verify no web fonts remain in fonts directories — hard fail if any found
function verifyClean(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
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
console.log('[QuranFont] invalid assets excluded from ios bundle — verification passed');

console.log('Done.\n');
