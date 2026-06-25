/**
 * notify-cron Worker
 * Runs every 5 minutes via Cloudflare Cron Trigger.
 * 1. Syncs YouTube playlists → inserts new episodes          ─┐ parallel
 * 2. Auto-notify new content (videos / books / hadiths)       ─┘
 * 3. Dispatches scheduled notifications in concurrent batches
 *
 * Concurrency design (solves the 30 s wall-clock timeout):
 *   • cron-sync + auto_notify_content run in parallel first (~2 s)
 *   • Batch 0 runs sequentially: recovery + claim + send slice 0 (~4 s)
 *   • Batches 1..N-1 run concurrently: each is a separate Pages Function
 *     invocation with its own 50-subrequest budget (~4 s total)
 *   • finalize_send runs after all batches (~1 s)
 *   Total Worker time: ~11 s — well within the 30 s cron limit.
 *
 * Required secrets (set via wrangler secret put):
 *   CRON_SECRET   — shared secret matching the Pages Function env var
 */

const PAGE_SIZE = 40;

export default {
  async scheduled(event, env, ctx) {
    const site    = (env.SITE_URL || 'https://tafsirkurd.com').replace(/\/$/, '');
    const secret  = env.CRON_SECRET;
    const headers = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${secret}`,
    };

    const ts = new Date().toISOString();

    // ── Step 1+2: cron-sync and auto_notify_content in parallel ──────────────
    // auto_notify_content inserts newly detected content as 'scheduled' rows.
    // Running it BEFORE the batch loop means the same cron run can pick up those
    // rows if there is no other notification already in flight.
    const [syncRes, notifRes] = await Promise.all([
      fetch(`${site}/cron-sync`, {
        method: 'POST', headers, body: '{}',
      }).catch(e => ({ ok: false, _err: e.message })),

      fetch(`${site}/admin-notifications-api`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({ action: 'auto_notify_content' }),
      }).catch(e => ({ ok: false, _err: e.message })),
    ]);
    const syncBody  = syncRes.ok  ? await syncRes.json().catch(() => ({}))  : {};
    const notifBody = notifRes.ok ? await notifRes.json().catch(() => ({})) : {};

    // ── Step 3: dispatch scheduled notifications ──────────────────────────────
    // Batch 0 is always sequential: it does crash-recovery, atomically claims one
    // due notification, writes tokens_targeted, and sends the first 40-token slice.
    let schedNotifId = null, schedTotalSent = 0, schedTotalFailed = 0, schedTotal = 0;
    const schedStale = [];

    const b0Res = await fetch(`${site}/admin-notifications-api`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ action: 'process_scheduled', batch_num: 0 }),
    }).catch(e => ({ ok: false, _err: e.message }));
    const b0Body = b0Res.ok ? await b0Res.json().catch(() => ({})) : {};

    schedNotifId   = b0Body.notif_id ?? null;
    schedTotal     = b0Body.total_targeted ?? 0;
    schedTotalSent   += b0Body.batch_sent ?? 0;
    schedTotalFailed += b0Body.batch_failed ?? 0;
    if (b0Body.stale_tokens?.length) schedStale.push(...b0Body.stale_tokens);

    // Batches 1..N-1 can run concurrently — each is a separate Pages Function
    // invocation with its own subrequest budget and independent stable token slice.
    if (schedNotifId && b0Body.has_more) {
      const totalBatches = Math.ceil(schedTotal / PAGE_SIZE);
      const batchPromises = [];
      for (let bn = 1; bn < totalBatches; bn++) {
        batchPromises.push(
          fetch(`${site}/admin-notifications-api`, {
            method:  'POST',
            headers,
            body:    JSON.stringify({ action: 'process_scheduled', batch_num: bn }),
          })
          .then(r => r.ok ? r.json().catch(() => ({})) : {})
          .catch(() => ({}))
        );
      }
      // Await all concurrent batches — Wall-clock: max(batch times) ≈ 4 s
      const batchResults = await Promise.all(batchPromises);
      for (const bBody of batchResults) {
        schedTotalSent   += bBody.batch_sent ?? 0;
        schedTotalFailed += bBody.batch_failed ?? 0;
        if (bBody.stale_tokens?.length) schedStale.push(...bBody.stale_tokens);
      }
    }

    // Finalize: Worker is ~10 s at this point — finalize_send call is reliable.
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
          error_msg:     null,
        }),
      }).catch(() => {});
    }

    const schedBody = {
      processed: schedNotifId ? 1 : 0,
      tokens_sent: schedTotalSent,
      total: schedTotal,
    };

    // ── Step 4: daily DB cleanup (02:00 UTC only) ─────────────────────────────
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
