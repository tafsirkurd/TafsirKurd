#!/usr/bin/env node
// Run once after cloning: node scripts/install-hooks.js
// Installs a post-push git hook that reminds you to deploy to Cloudflare Pages

import { writeFileSync, chmodSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = join(root, '.git', 'hooks');

if (!existsSync(hooksDir)) {
    console.error('No .git/hooks directory found — are you in the repo root?');
    process.exit(1);
}

const hookPath = join(hooksDir, 'post-push');
const hookContent = `#!/bin/sh
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  REMINDER: GitHub deploy is broken on this project.  ║"
echo "║  Run: npm run deploy                                  ║"
echo "║  Or:  npx wrangler pages deploy src --project-name tafsirkurd ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
`;

writeFileSync(hookPath, hookContent);
chmodSync(hookPath, '755');
console.log('✓ post-push hook installed at', hookPath);
console.log('  You will now see a deploy reminder after every git push.');
