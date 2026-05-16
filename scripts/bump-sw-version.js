// Service Worker version bump script
// Updates cache version in service worker before deployment

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../src/service-worker.js');
const indexPath = path.join(__dirname, '../src/app/index.html');
const isProduction = process.argv[2] === 'production-deploy';

try {
    if (fs.existsSync(swPath)) {
        let swContent = fs.readFileSync(swPath, 'utf8');

        // Increment the numeric version in CACHE_NAME
        const match = swContent.match(/const CACHE_NAME = ['"]tafsir-kurd-v(\d+)['"]/);
        if (!match) {
            console.log('⚠️  Could not find CACHE_NAME pattern in service-worker.js');
            process.exit(0);
        }
        const nextVersion = parseInt(match[1], 10) + 1;

        swContent = swContent.replace(
            /const CACHE_NAME = ['"]tafsir-kurd-v\d+['"]/,
            `const CACHE_NAME = 'tafsir-kurd-v${nextVersion}'`
        );

        fs.writeFileSync(swPath, swContent);
        console.log(`✅ Service worker cache bumped: tafsir-kurd-v${nextVersion}`);

        // Also bump the ?v= query param on app.js in index.html so browsers
        // with the old immutable-cached JS fetch the new file immediately
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            html = html.replace(/app\/app\.js\?v=[^"']+/, `app/app.js?v=${nextVersion}`);
            fs.writeFileSync(indexPath, html);
            console.log(`✅ app.js cache-bust param updated: ?v=${nextVersion}`);
        }

        if (isProduction) {
            console.log('🚀 Production deployment mode');
        }
    } else {
        console.log('ℹ️ No service worker found, skipping version bump');
    }
} catch (error) {
    console.error('❌ Error updating service worker:', error.message);
    // Don't fail the build
    process.exit(0);
}
