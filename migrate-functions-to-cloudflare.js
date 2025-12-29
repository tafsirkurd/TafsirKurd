/**
 * Migrate Netlify Functions to Cloudflare Pages Functions
 *
 * This script automatically converts Netlify function syntax to Cloudflare Pages syntax
 *
 * Usage: node migrate-functions-to-cloudflare.js
 */

const fs = require('fs');
const path = require('path');

const netlifyFunctionsDir = path.join(__dirname, 'netlify', 'functions');
const cloudflareFunctionsDir = path.join(__dirname, 'functions');

// Create functions directory if it doesn't exist
if (!fs.existsSync(cloudflareFunctionsDir)) {
    fs.mkdirSync(cloudflareFunctionsDir, { recursive: true });
    console.log('✅ Created functions/ directory');
}

// Function conversion map
const conversionMap = {
    // Simple API functions - convert to GET/POST handlers
    'config.js': convertConfigFunction,
    'auth-config.js': convertSimpleGetFunction,
    'get-client-ip.js': convertGetClientIP,
    'get-location.js': convertSimpleGetFunction,
    'analytics.js': convertAnalyticsFunction,
    'geo-analytics.js': convertAnalyticsFunction,

    // Auth functions
    'auth.js': convertAuthFunction,
    'admin-auth.js': convertAuthFunction,
    'send-otp.js': convertPostFunction,
    'verify-otp.js': convertPostFunction,
    'delete-account.js': convertPostFunction,

    // Email functions
    'send-email-notification.js': convertPostFunction,
    'send-bulk-email.js': convertPostFunction,
    'test-brevo-email.js': convertPostFunction,
    'brevo-email-stats.js': convertSimpleGetFunction,

    // Discord functions
    'discord-notify.js': convertPostFunction,
    'discord-interactions.js': convertPostFunction,

    // Data functions
    'user-data.js': convertDataFunction,
    'db-info.js': convertSimpleGetFunction,
    'instagram-feed.js': convertSimpleGetFunction,
    'check-owner.js': convertSimpleGetFunction,
    'track-location.js': convertPostFunction,
    'log-bot.js': convertPostFunction,
    'activity-monitor.js': convertPostFunction,

    // Scheduled functions (need to be handled differently)
    'scheduled-daily-reminders.js': convertScheduledFunction,
    'scheduled-cleanup-activities.js': convertScheduledFunction,
    'test-daily-reminders.js': convertSimpleGetFunction,

    // Special functions
    'og-image.js': convertOGImageFunction,
    'google-search-console.js': convertPostFunction,
    'test-zceer-minimal.js': convertSimpleGetFunction
};

// Conversion functions

function convertSimpleGetFunction(content, filename) {
    // Basic conversion for GET functions
    return `// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/${filename}

${content.replace(/exports\.handler\s*=\s*async\s*\((event|context|event,\s*context)\)\s*=>\s*{/, 'export async function onRequest(context) {\n    const { request, env } = context;')
    .replace(/return\s*{\s*statusCode:\s*(\d+),\s*body:\s*JSON\.stringify\(([^)]+)\)\s*}/g, 'return new Response(JSON.stringify($2), { status: $1, headers: { "Content-Type": "application/json" } })')
    .replace(/return\s*{\s*statusCode:\s*(\d+),\s*headers:\s*({[^}]+}),\s*body:\s*([^}]+)\s*}/g, 'return new Response($3, { status: $1, headers: $2 })')
    .replace(/process\.env\.(\w+)/g, 'env.$1')
    .replace(/event\.body/g, 'await request.text()')
    .replace(/event\.headers/g, 'Object.fromEntries(request.headers)')
    .replace(/event\.httpMethod/g, 'request.method')
    .replace(/event\.queryStringParameters/g, 'Object.fromEntries(new URL(request.url).searchParams)')
}`;
}

function convertPostFunction(content, filename) {
    return convertSimpleGetFunction(content, filename);
}

function convertConfigFunction(content, filename) {
    return `// Migrated from Netlify to Cloudflare Pages
// Configuration endpoint

export async function onRequest(context) {
    const { env } = context;

    const config = {
        supabaseUrl: env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co',
        supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
        turnstileSiteKey: env.CLOUDFLARE_TURNSTILE_SITE_KEY || ''
    };

    return new Response(JSON.stringify(config), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}`;
}

function convertAuthFunction(content, filename) {
    return convertSimpleGetFunction(content, filename)
        .replace(/const\s+crypto\s*=\s*require\(['"]crypto['"]\)/g, '// crypto is available globally in Cloudflare Workers');
}

function convertAnalyticsFunction(content, filename) {
    return convertSimpleGetFunction(content, filename);
}

function convertDataFunction(content, filename) {
    return convertSimpleGetFunction(content, filename);
}

function convertGetClientIP(content, filename) {
    return `// Migrated from Netlify to Cloudflare Pages
// Get client IP address

export async function onRequest(context) {
    const { request } = context;

    // Cloudflare provides the client IP in CF-Connecting-IP header
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
               'unknown';

    return new Response(JSON.stringify({ ip }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}`;
}

function convertScheduledFunction(content, filename) {
    return `// Migrated from Netlify to Cloudflare Pages
// SCHEDULED FUNCTION - This needs to be set up as a Cloudflare Cron Trigger
// See: https://developers.cloudflare.com/workers/configuration/cron-triggers/
//
// Original: netlify/functions/${filename}
//
// NOTE: To enable scheduling:
// 1. Create a Cloudflare Worker (not Pages Function)
// 2. Add cron trigger in wrangler.toml:
//    [triggers]
//    crons = ["0 8 * * *"]  // Example: daily at 8 AM
// 3. Use the code below

export async function scheduled(event, env, ctx) {
    // Original Netlify scheduled function code here
    // You'll need to manually adapt the logic

    console.log('Scheduled function triggered');

    // TODO: Copy logic from netlify/functions/${filename}
}

// For manual testing via HTTP:
export async function onRequest(context) {
    const { env } = context;

    // Call the scheduled function
    await scheduled(null, env, null);

    return new Response('Scheduled function executed', { status: 200 });
}`;
}

function convertOGImageFunction(content, filename) {
    return `// Migrated from Netlify to Cloudflare Pages
// OG Image generation
//
// NOTE: This function may need additional setup for image generation
// Cloudflare Workers have different image handling than Netlify

${convertSimpleGetFunction(content, filename)}`;
}

// Main migration logic

console.log('🚀 Starting Netlify → Cloudflare Pages Function Migration\n');

// Get all function files
const files = fs.readdirSync(netlifyFunctionsDir).filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} functions to migrate:\n`);

let migrated = 0;
let skipped = 0;
const warnings = [];

files.forEach(filename => {
    const filePath = path.join(netlifyFunctionsDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');

    const converter = conversionMap[filename] || convertSimpleGetFunction;

    try {
        const convertedContent = converter(content, filename);
        const outputPath = path.join(cloudflareFunctionsDir, filename);

        fs.writeFileSync(outputPath, convertedContent);
        console.log(`✅ ${filename}`);
        migrated++;

        // Add warnings for special cases
        if (filename.startsWith('scheduled-')) {
            warnings.push(`⚠️  ${filename} - Needs Cloudflare Cron Trigger setup`);
        }
        if (filename === 'og-image.js') {
            warnings.push(`⚠️  ${filename} - May need image handling adjustments`);
        }

    } catch (error) {
        console.log(`❌ ${filename} - Error: ${error.message}`);
        skipped++;
    }
});

console.log(`\n📊 Migration Summary:`);
console.log(`   ✅ Migrated: ${migrated} functions`);
console.log(`   ❌ Skipped: ${skipped} functions`);

if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    warnings.forEach(w => console.log(`   ${w}`));
}

console.log(`\n📁 Functions migrated to: ${cloudflareFunctionsDir}`);
console.log(`\n🎯 Next Steps:`);
console.log(`   1. Review the migrated functions in functions/ directory`);
console.log(`   2. Test each function to ensure it works correctly`);
console.log(`   3. Set up environment variables in Cloudflare Pages`);
console.log(`   4. For scheduled functions, create Cloudflare Workers with Cron Triggers`);
console.log(`   5. Deploy to Cloudflare Pages`);
console.log(`\n✨ Done! Your functions are ready for Cloudflare Pages!`);
