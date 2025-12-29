// Migrated from Netlify to Cloudflare Pages
// SCHEDULED FUNCTION - This needs to be set up as a Cloudflare Cron Trigger
// See: https://developers.cloudflare.com/workers/configuration/cron-triggers/
//
// Original: netlify/functions/scheduled-cleanup-activities.js
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

    // TODO: Copy logic from netlify/functions/scheduled-cleanup-activities.js
}

// For manual testing via HTTP:
export async function onRequest(context) {
    const { env } = context;

    // Call the scheduled function
    await scheduled(null, env, null);

    return new Response('Scheduled function executed', { status: 200 });
}