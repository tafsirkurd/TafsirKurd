// Service Worker version bump script
// Updates cache version in service worker before deployment

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../src/service-worker.js');
const isProduction = process.argv[2] === 'production-deploy';

try {
    if (fs.existsSync(swPath)) {
        let swContent = fs.readFileSync(swPath, 'utf8');

        // Update cache version with timestamp
        const timestamp = Date.now();
        const dateStr = new Date().toISOString().split('T')[0];

        swContent = swContent.replace(
            /const CACHE_VERSION = ['"].*?['"]/,
            `const CACHE_VERSION = 'v${dateStr}-${timestamp}'`
        );

        fs.writeFileSync(swPath, swContent);
        console.log(`✅ Service worker cache version updated: v${dateStr}-${timestamp}`);

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
