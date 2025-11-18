#!/usr/bin/env node

/**
 * Auto-increment Service Worker cache version
 * This ensures all users get fresh updates on every deployment
 */

const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(__dirname, '../src/service-worker.js');

try {
    let content = fs.readFileSync(SW_PATH, 'utf8');

    // Extract current version number
    const versionMatch = content.match(/const CACHE_NAME = 'tafsir-kurd-v(\d+)-([^']+)'/);

    if (!versionMatch) {
        console.error('❌ Could not find CACHE_NAME in service-worker.js');
        process.exit(1);
    }

    const currentVersion = parseInt(versionMatch[1]);
    const description = versionMatch[2];
    const newVersion = currentVersion + 1;

    // Get commit message or use generic description
    const commitMsg = process.argv[2] || 'cache-update';
    const newDescription = commitMsg.substring(0, 50).replace(/'/g, '').replace(/\s+/g, '-').toLowerCase();

    // Update CACHE_NAME
    content = content.replace(
        /const CACHE_NAME = 'tafsir-kurd-v\d+-[^']+'/,
        `const CACHE_NAME = 'tafsir-kurd-v${newVersion}-${newDescription}'`
    );

    // Update console.log message
    content = content.replace(
        /console\.log\('\[ServiceWorker\] Installing v\d+-[^']+'/,
        `console.log('[ServiceWorker] Installing v${newVersion}-${newDescription}'`
    );

    fs.writeFileSync(SW_PATH, content, 'utf8');

    console.log(`✅ Service Worker version bumped: v${currentVersion} → v${newVersion}`);
    console.log(`📝 Description: ${newDescription}`);

} catch (error) {
    console.error('❌ Error bumping service worker version:', error.message);
    process.exit(1);
}
