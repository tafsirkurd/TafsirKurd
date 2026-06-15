#!/usr/bin/env node
/**
 * bundle-book-covers.js
 * Downloads all 53 book covers from the bundle, converts them to WebP,
 * compresses large files, and writes them to src/assets/books/{id}.webp
 *
 * Usage: node scripts/bundle-book-covers.js
 * Requires: sharp (already in devDependencies)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');
const sharp = require('sharp');

const OUT_DIR    = path.join(__dirname, '..', 'src', 'assets', 'books');
const BUNDLE     = path.join(__dirname, '..', 'src', 'data', 'gencine-bundle.js');
const MAX_DIM    = 400;  // max width or height in px — covers render at ~120px
const WEBP_Q     = 82;   // quality for normal covers
const WEBP_Q_LG  = 75;   // quality for originally large files (>200KB)
const LARGE_THRESH = 200 * 1024; // 200KB

// ── Load bundle ────────────────────────────────────────────────────────────
// The bundle file is exactly: window.GENCINE_BUNDLE={...};
// Strip the JS assignment wrapper and parse the JSON literal directly.
const bundleRaw = fs.readFileSync(BUNDLE, 'utf8');
const jsonStart = bundleRaw.indexOf('{');
const jsonEnd   = bundleRaw.lastIndexOf('}');
if (jsonStart < 0 || jsonEnd < 0) { console.error('Cannot find JSON in bundle'); process.exit(1); }
const bundle = JSON.parse(bundleRaw.slice(jsonStart, jsonEnd + 1));
const books  = bundle.books;
console.log(`Loaded ${books.length} books from bundle`);

// ── Ensure output dir ──────────────────────────────────────────────────────
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Fetch helper ───────────────────────────────────────────────────────────
function fetchBuffer(url) {
  return new Promise(function(resolve, reject) {
    var mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'TafsirKurd-build/1.0' } }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() { resolve(Buffer.concat(chunks)); });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Process one book ───────────────────────────────────────────────────────
async function processBook(book) {
  var outPath = path.join(OUT_DIR, book.id + '.webp');

  // Skip if already done (resume support)
  if (fs.existsSync(outPath)) {
    var existing = fs.statSync(outPath).size;
    process.stdout.write(`  [${book.id}] SKIP (exists, ${(existing/1024).toFixed(1)}KB)\n`);
    return { id: book.id, status: 'skip', size: existing };
  }

  var buf;
  try {
    buf = await fetchBuffer(book.cover_url);
  } catch (e) {
    process.stdout.write(`  [${book.id}] FAIL fetch: ${e.message}\n`);
    return { id: book.id, status: 'fail', error: e.message };
  }

  var origSize = buf.length;
  var quality  = origSize > LARGE_THRESH ? WEBP_Q_LG : WEBP_Q;

  try {
    var webpBuf = await sharp(buf)
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: quality })
      .toBuffer();

    fs.writeFileSync(outPath, webpBuf);
    var ratio = ((1 - webpBuf.length / origSize) * 100).toFixed(0);
    process.stdout.write(`  [${book.id}] OK  ${(origSize/1024).toFixed(1)}KB → ${(webpBuf.length/1024).toFixed(1)}KB (-${ratio}%)\n`);
    return { id: book.id, status: 'ok', orig: origSize, size: webpBuf.length };
  } catch (e) {
    process.stdout.write(`  [${book.id}] FAIL convert: ${e.message}\n`);
    return { id: book.id, status: 'fail', error: e.message };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
(async function() {
  console.log(`Output: ${OUT_DIR}\n`);

  var results = [];
  // Serial to avoid hammering the CDN
  for (var book of books) {
    results.push(await processBook(book));
  }

  var ok     = results.filter(function(r){ return r.status === 'ok' || r.status === 'skip'; });
  var failed = results.filter(function(r){ return r.status === 'fail'; });
  var totalBytes = ok.reduce(function(s, r){ return s + (r.size || 0); }, 0);

  console.log('\n── Summary ───────────────────────────────────────');
  console.log(`OK:     ${ok.length} / ${books.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total:  ${(totalBytes/1024).toFixed(1)} KB  (${(totalBytes/1048576).toFixed(2)} MB)`);
  if (failed.length) {
    console.log('Failed IDs:', failed.map(function(r){ return r.id; }).join(', '));
  }

  // ── Generate BOOK_LOCAL_COVERS map ──────────────────────────────────────
  var successIds = ok.map(function(r){ return r.id; });
  var mapLines = successIds.map(function(id){
    return "  '" + id + "':'/assets/books/" + id + ".webp'";
  });
  var mapJs = '/* Auto-generated by scripts/bundle-book-covers.js — do not edit by hand */\n'
    + 'var BOOK_LOCAL_COVERS={\n' + mapLines.join(',\n') + '\n};';

  var mapOut = path.join(__dirname, '..', 'src', 'data', 'book-covers-map.js');
  fs.writeFileSync(mapOut, mapJs, 'utf8');
  console.log(`\nWrote map: ${mapOut}  (${successIds.length} entries)`);
  console.log('Done.');
})();
