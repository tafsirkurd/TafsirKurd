// Minifies app.js and i18n.js into their .min counterparts.
// Run: node scripts/minify-js.js

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const jobs = [
  { src: 'src/app/app.js',   out: 'src/app/app.min.js'   },
  { src: 'src/i18n/i18n.js', out: 'src/i18n/i18n.min.js' },
];

jobs.forEach(({ src, out }) => {
  const srcPath = path.join(root, src);
  const outPath = path.join(root, out);
  const beforeKB = Math.round(fs.statSync(srcPath).size / 1024);

  const result = spawnSync('npx', [
    'terser', srcPath,
    '--compress', 'passes=2',
    '--mangle',
    '--ecma', '2020',
    '--output', outPath,
  ], { cwd: root, stdio: 'inherit', shell: false });

  if (result.status !== 0) {
    console.error(`✗ Failed to minify ${src}`);
    process.exit(1);
  }

  const afterKB = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`✓ ${src}: ${beforeKB}KB → ${afterKB}KB`);
});
