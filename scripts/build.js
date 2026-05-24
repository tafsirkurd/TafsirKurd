/**
 * Build script: copies src/ → dist/ and minifies all .js files using esbuild.
 * Usage: node scripts/build.js
 * Deploy: npx wrangler pages deploy dist --project-name tafsirkurd
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync } from 'fs';
import { join, extname } from 'path';
import { transform } from 'esbuild';

// JS files to skip minification (already minified vendor files)
const SKIP_MINIFY = new Set([
  'supabase.js',           // already minified
  'all.min.css',           // vendor CSS — already minified
]);

// Directories to exclude entirely from the dist build
const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.wrangler', 'dist', 'tests', 'scripts', 'ios', 'android']);

let jsMinified = 0, jsCopied = 0, otherCopied = 0;

async function processDir(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });

  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const dstPath = join(dstDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry)) continue;
      await processDir(srcPath, dstPath);
    } else if (extname(entry) === '.js' && !SKIP_MINIFY.has(entry)) {
      const code = readFileSync(srcPath, 'utf8');
      try {
        const result = await transform(code, {
          minify: true,
          target: 'es2018',
          charset: 'utf8',
        });
        writeFileSync(dstPath, result.code);
        jsMinified++;
      } catch (e) {
        console.warn(`  [warn] could not minify ${srcPath}: ${e.message} — copying as-is`);
        copyFileSync(srcPath, dstPath);
        jsCopied++;
      }
    } else if (extname(entry) === '.css' && !SKIP_MINIFY.has(entry)) {
      const code = readFileSync(srcPath, 'utf8');
      try {
        const result = await transform(code, {
          minify: true,
          loader: 'css',
          charset: 'utf8',
        });
        writeFileSync(dstPath, result.code);
        jsMinified++;
      } catch (e) {
        console.warn(`  [warn] could not minify ${srcPath}: ${e.message} — copying as-is`);
        copyFileSync(srcPath, dstPath);
        jsCopied++;
      }
    } else {
      copyFileSync(srcPath, dstPath);
      otherCopied++;
    }
  }
}

// Clean dist/
try { rmSync('dist', { recursive: true, force: true }); } catch (_) {}

console.log('Building src/ → dist/ ...');
await processDir('src', 'dist');

console.log(`✓ ${jsMinified} JS files minified`);
console.log(`  ${jsCopied} JS files copied as-is (fallback)`);
console.log(`  ${otherCopied} other files copied`);
console.log('Build complete → dist/');
