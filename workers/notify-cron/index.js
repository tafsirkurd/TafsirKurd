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

    const ts = new Date().toISOString();

    // 1. Sync YouTube playlists → insert new episodes into DB
    const syncRes = await fetch(`${site}/cron-sync`, {
      method:  'POST',
      headers,
      body:    '{}',
    }).catch(e => ({ ok: false, _err: e.message }));
    const syncBody = syncRes.ok ? await syncRes.json().catch(() => ({})) : {};

    // 2. Dispatch any scheduled notifications whose time has arrived
    const schedRes = await fetch(`${site}/admin-notifications-api`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ action: 'process_scheduled' }),
    }).catch(e => ({ ok: false, _err: e.message }));
    const schedBody = schedRes.ok ? await schedRes.json().catch(() => ({})) : {};

    // 3. Auto-notify new content (videos + books + hadiths added in last 8 h)
    //    One notification per series per run — series dedup handled server-side.
    const notifRes = await fetch(`${site}/admin-notifications-api`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ action: 'auto_notify_content' }),
    }).catch(e => ({ ok: false, _err: e.message }));
    const notifBody = notifRes.ok ? await notifRes.json().catch(() => ({})) : {};

    // 4. Daily DB cleanup — runs once per day at 02:00 UTC only
    let cleanBody = {};
    const nowUtc = new Date();
    if (nowUtc.getUTCHours() === 2 && nowUtc.getUTCMinutes() < 5) {
      const cleanRes = await fetch(`${site}/db-cleanup`, {
        method:  'POST',
        headers,
        body:    '{}',
      }).catch(e => ({ ok: false, _err: e.message }));
      cleanBody = cleanRes.ok ? await cleanRes.json().catch(() => ({})) : {};
      console.log('[notify-cron] db-cleanup', cleanBody.totalDeleted ?? 'FAIL', 'rows deleted');
    }

    console.log('[notify-cron]', ts,
      `sync=${syncRes.ok ? 'ok' : 'FAIL'} new_eps=${syncBody.totalNewEpisodes ?? '?'}`,
      `scheduled=${schedRes.ok ? 'ok' : 'FAIL'} processed=${schedBody.processed ?? '?'}`,
      `notify=${notifRes.ok ? 'ok' : 'FAIL'} notified=${notifBody.notified ?? '?'}`);
  },

  // Health check — GET /
  async fetch(request, env) {
    return new Response(JSON.stringify({ ok: true, worker: 'notify-cron' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
