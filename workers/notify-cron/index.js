/**
 * notify-cron Worker
 * Runs every 15 minutes via Cloudflare Cron Trigger.
 * 1. Syncs YouTube playlists → inserts new episodes
 * 2. Sends push notifications for any new videos / books / hadiths
 *    published in the last 2 hours (dedup handled server-side).
 *
 * Required secrets (set via wrangler secret put):
 *   CRON_SECRET   — shared secret matching the Pages Function env var
 */

export default {
  async scheduled(event, env, ctx) {
    const site    = (env.SITE_URL || 'https://tafsirkurd.com').replace(/\/$/, '');
    const secret  = env.CRON_SECRET;
    const headers = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${secret}`,
    };

    // 1. Sync YouTube playlists (also triggers video notifications internally)
    const syncRes = await fetch(`${site}/cron-sync`, {
      method:  'POST',
      headers,
      body:    '{}',
    }).catch(e => ({ ok: false, _err: e.message }));

    // 2. Dispatch any scheduled notifications whose time has arrived
    const schedRes = await fetch(`${site}/admin-notifications-api`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ action: 'process_scheduled' }),
    }).catch(e => ({ ok: false, _err: e.message }));

    // 3. Auto-notify new content (videos + books + hadiths added in last 2 h)
    const notifRes = await fetch(`${site}/admin-notifications-api`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ action: 'auto_notify_content' }),
    }).catch(e => ({ ok: false, _err: e.message }));

    console.log('[notify-cron]', new Date().toISOString(),
      'sync:', syncRes.ok ? 'ok' : 'fail',
      'scheduled:', schedRes.ok ? 'ok' : 'fail',
      'notify:', notifRes.ok ? 'ok' : 'fail');
  },

  // Health check — GET /
  async fetch(request, env) {
    return new Response(JSON.stringify({ ok: true, worker: 'notify-cron' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
