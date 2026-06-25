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

    // 2. Dispatch scheduled notifications in batches of 40 tokens.
    //    Each process_scheduled call is a separate Pages Function invocation with its own
    //    50 subrequest budget. 20 batches × 40 = 800 slots; has_more breaks early when done.
    let schedNotifId = null, schedTotalSent = 0, schedTotalFailed = 0, schedTotal = 0;
    const schedStale = [], schedErrors = [];
    for (let batchNum = 0; batchNum < 20; batchNum++) {
      const bRes = await fetch(`${site}/admin-notifications-api`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({ action: 'process_scheduled', batch_num: batchNum }),
      }).catch(e => ({ ok: false, _err: e.message }));
      const bBody = bRes.ok ? await bRes.json().catch(() => ({})) : {};
      if (batchNum === 0) {
        schedNotifId = bBody.notif_id ?? null;
        schedTotal   = bBody.total_targeted ?? 0;
      }
      schedTotalSent   += bBody.batch_sent ?? 0;
      schedTotalFailed += bBody.batch_failed ?? 0;
      if (bBody.stale_tokens?.length) schedStale.push(...bBody.stale_tokens);
      if (bBody.error) schedErrors.push(bBody.error);
      if (!bBody.has_more || !schedNotifId) break;
    }
    if (schedNotifId) {
      await fetch(`${site}/admin-notifications-api`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({
          action:        'finalize_send',
          notif_id:      schedNotifId,
          tokens_sent:   schedTotalSent,
          tokens_failed: schedTotalFailed,
          stale_tokens:  schedStale,
          error_msg:     schedErrors[0] || null,
        }),
      }).catch(() => {});
    }
    const schedBody = { processed: schedNotifId ? 1 : 0, tokens_sent: schedTotalSent, total: schedTotal };

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
      `scheduled=${schedNotifId ? 'ok' : 'none'} sent=${schedTotalSent}/${schedTotal} failed=${schedTotalFailed}`,
      `notify=${notifRes.ok ? 'ok' : 'FAIL'} notified=${notifBody.notified ?? '?'}`);
  },

  // Health check — GET /
  async fetch(request, env) {
    return new Response(JSON.stringify({ ok: true, worker: 'notify-cron' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
