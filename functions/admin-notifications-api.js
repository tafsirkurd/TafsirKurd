// Admin Notifications API — full CRUD + FCM send
// Actions: list, get, create, update, send, send_test, cancel, delete, duplicate, get_stats, get_token_count
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

export async function onRequest(context) {
    try { return await _handleRequest(context); }
    catch (e) { return new Response(JSON.stringify({ success: false, error: 'Internal error: ' + (e?.message || e) }), { status: 500, headers: CORS }); }
}

async function _handleRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const action = body.action;

    // ── PROCESS SCHEDULED (cron secret OR valid admin session) ──
    if (action === 'process_scheduled') {
        const authHeader = request.headers.get('Authorization') || '';
        const isCron = [env.CRON_SECRET, env.NOTIF_CRON_SECRET]
            .filter(Boolean)
            .some(s => authHeader === `Bearer ${s}`);
        // Also allow admin sessions to trigger manually from the dashboard
        if (!isCron) {
            const adminToken = authHeader.replace('Bearer ', '').trim();
            if (adminToken) {
                const { data: adminSess } = await supabase
                    .from('admin_sessions').select('user_id')
                    .eq('token', adminToken).gt('expires_at', new Date().toISOString()).single();
                if (!adminSess) return json({ error: 'Unauthorized' }, 401);
            } else {
                return json({ error: 'Unauthorized' }, 401);
            }
        }

        // Each batch is a separate Pages Function invocation with its own 50 subrequest budget.
        // PAGE_SIZE=40: 8 batches × 40 = 320 slots covers all users with budget headroom.
        const batchNum = Number(body.batch_num ?? 0);
        // Optional: caller (admin Send action) may pass the exact notification to target,
        // preventing the discovery query from accidentally claiming a different overdue notification.
        const targetNotifId = body.notif_id ?? null;
        const PAGE_SIZE = 40;

        // Recovery only on generic cron batch_0 — not when targeting a specific notification,
        // to avoid accidentally recovering a legitimately in-flight cron send.
        // Uses a single RPC (1 subrequest) to stay within the 50-subrequest budget.
        // The RPC reads delivery log counts before deciding status — never emits SENT 0/X.
        if (batchNum === 0 && !targetNotifId) {
            await supabase.rpc('recover_stuck_notifications')
                .catch(e => console.error('[recovery] rpc failed:', e.message));
        }

        let notif;
        if (batchNum === 0) {
            // Find and atomically claim the target notification.
            // targetNotifId: direct claim (admin Send) — bypasses discovery so we never
            // accidentally pick a different overdue notification instead.
            // No targetNotifId: cron path — claim the oldest overdue scheduled notification.
            let candidateId;
            if (targetNotifId) {
                candidateId = targetNotifId;
            } else {
                const { data: due } = await supabase
                    .from('admin_notifications')
                    .select('id')
                    .eq('status', 'scheduled')
                    .eq('is_template', false)
                    .lte('scheduled_at', new Date().toISOString())
                    .order('scheduled_at', { ascending: true })
                    .limit(1);
                if (!due?.length) return json({ success: true, processed: 0 });
                candidateId = due[0].id;
            }
            const { data: claimed } = await supabase
                .from('admin_notifications')
                .update({ status: 'sending' })
                .eq('id', candidateId)
                .eq('status', 'scheduled')
                .select()
                .single();
            if (!claimed) return json({ success: true, processed: 0 });
            notif = claimed;
        } else {
            // Resume the in-flight notification — use targetNotifId when provided for safety.
            let q = supabase.from('admin_notifications').select('*').eq('status', 'sending')
                .gt('tokens_targeted', 0).is('sent_at', null);
            if (targetNotifId) q = q.eq('id', targetNotifId);
            const { data: inFlight } = await q.limit(1).single();
            if (!inFlight) return json({ success: true, processed: 0 });
            notif = inFlight;
        }

        let allTokens;
        try { allTokens = await getTokensForAudience(env, notif.audience, notif.platform); }
        catch (e) {
            if (batchNum === 0) {
                await supabase.from('admin_notifications')
                    .update({ status: 'failed', error_message: 'Token fetch: ' + e.message })
                    .eq('id', notif.id);
            }
            return json({ error: 'Token fetch failed: ' + e.message });
        }

        // Interleave FCM and APNs so both platforms share each batch's subrequest budget
        const _apns = allTokens.filter(t => isApnsToken(t.token));
        const _fcm  = allTokens.filter(t => !isApnsToken(t.token));
        const interleaved = [];
        for (let i = 0; i < Math.max(_fcm.length, _apns.length); i++) {
            if (i < _fcm.length)  interleaved.push({ ..._fcm[i],  _type: 'fcm' });
            if (i < _apns.length) interleaved.push({ ..._apns[i], _type: 'apns' });
        }

        // Write total count on batch 0 as crash-recovery checkpoint.
        // If this write fails, recovery will see tokens_targeted=0 and mark the notification
        // 'failed' even though sends proceed — log so we know, but don't abort.
        if (batchNum === 0) {
            const { error: ttErr } = await supabase.from('admin_notifications')
                .update({ tokens_targeted: allTokens.length })
                .eq('id', notif.id);
            if (ttErr) console.error('[process_scheduled] tokens_targeted write failed:', ttErr.message);

            // Insert all tokens as 'pending' in delivery log.
            // ON CONFLICT DO NOTHING: retries don't reset rows already updated to sent/failed.
            // Uses raw fetch (same pattern as getTokensForAudience) — Supabase JS client
            // resolves (not rejects) on PostgREST HTTP errors, making .catch() unreliable.
            const logRows = allTokens.map(t => ({
                notification_id: notif.id,
                token: t.token,
                platform: isApnsToken(t.token) ? 'ios' : 'android',
                status: 'pending',
                attempt_count: 0,
            }));
            if (logRows.length) {
                const dlRes = await fetch(
                    `${env.SUPABASE_URL}/rest/v1/admin_notification_delivery_logs?on_conflict=notification_id,token`,
                    {
                        method: 'POST',
                        headers: {
                            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            'Content-Type': 'application/json',
                            Prefer: 'return=minimal,resolution=ignore-duplicates',
                        },
                        body: JSON.stringify(logRows),
                    }
                ).catch(e => ({ ok: false, _err: e.message }));
                if (!dlRes.ok) {
                    const errBody = await dlRes.text?.().catch(() => '') ?? dlRes._err ?? '';
                    console.error('[delivery_log] insert pending failed:', dlRes.status ?? 'network', errBody.slice(0, 300));
                }
            }
        }

        const batchSlice = interleaved.slice(batchNum * PAGE_SIZE, (batchNum + 1) * PAGE_SIZE);
        const hasMore = interleaved.length > (batchNum + 1) * PAGE_SIZE;

        const batchResult = await sendBatch(env, supabase, notif, batchSlice);

        // Stale tokens: remove eagerly per-batch so subsequent batches don't retry them.
        if (batchResult.staleTokens.length) {
            await removeStaleTokens(env, batchResult.staleTokens).catch(() => {});
        }

        // Status is finalized by finalize_send (called by cron/send after all batches).
        // This keeps token count accumulation accurate: each batch reports its slice,
        // finalize_send sums them and writes tokens_sent/tokens_failed/status='sent'.
        return json({
            success: true,
            notif_id: notif.id,
            total_targeted: allTokens.length,
            batch_sent: batchResult.sent,
            batch_failed: batchResult.failed,
            stale_tokens: batchResult.staleTokens,
            has_more: hasMore,
        });
    }

    // ── FINALIZE SEND (cron secret only) ─────────────────────────────
    if (action === 'finalize_send') {
        const authHeader = request.headers.get('Authorization') || '';
        const isCron = [env.CRON_SECRET, env.NOTIF_CRON_SECRET]
            .filter(Boolean)
            .some(s => authHeader === `Bearer ${s}`);
        if (!isCron) return json({ error: 'Unauthorized' }, 401);

        const { notif_id, tokens_sent, tokens_failed, stale_tokens, error_msg } = body;
        if (!notif_id) return json({ error: 'Missing notif_id' }, 400);

        const { data: notif } = await supabase.from('admin_notifications')
            .select('*').eq('id', notif_id).single();
        if (!notif) return json({ error: 'Notification not found' }, 404);

        // Idempotency guard: skip only if already fully finalized with counts.
        // Allow re-entry when status='sent' but tokens_sent is still null (crash-recovery
        // set status='sent' without counts — finalize_send must still write the counts).
        if (notif.status === 'sent' && notif.tokens_sent != null) {
            return json({ success: true, finalized: notif_id, skipped: true, reason: 'already_finalized' });
        }
        // Never touch a failed/cancelled row.
        if (['failed', 'cancelled', 'scheduled', 'draft'].includes(notif.status)) {
            return json({ success: true, finalized: notif_id, skipped: true, reason: notif.status });
        }

        if (stale_tokens?.length) await removeStaleTokens(env, stale_tokens).catch(() => {});

        // Read counts from delivery log for accuracy; fall back to worker-aggregated values
        // for notifications that predate delivery logging.
        const { data: logRows } = await supabase
            .from('admin_notification_delivery_logs')
            .select('status')
            .eq('notification_id', notif_id);
        const logSent   = logRows?.filter(r => r.status === 'sent').length   ?? tokens_sent   ?? 0;
        const logFailed = logRows?.filter(r => r.status === 'failed' || r.status === 'pending' || r.status === 'retrying').length ?? tokens_failed ?? 0;
        const logStale  = logRows?.filter(r => r.status === 'stale').length  ?? stale_tokens?.length ?? 0;

        const finalSent   = logRows?.length ? logSent   : (tokens_sent   ?? 0);
        const finalFailed = logRows?.length ? logFailed : (tokens_failed ?? 0);
        const finalStale  = logRows?.length ? logStale  : (stale_tokens?.length ?? 0);

        // Hard rule: SENT 0/X (when X > 0) is an impossible state.
        // If no tokens were delivered but the audience was non-empty, mark failed.
        const finalStatus = (finalSent === 0 && (notif.tokens_targeted ?? 0) > 0) ? 'failed' : 'sent';
        const finalError  = finalStatus === 'failed' && !error_msg
            ? `0 of ${notif.tokens_targeted} tokens delivered`
            : (error_msg || null);

        await supabase.from('admin_notifications').update({
            status: finalStatus,
            sent_at: notif.sent_at || new Date().toISOString(),
            tokens_sent:   finalSent,
            tokens_failed: finalFailed,
            stale_removed: finalStale,
            error_message: finalError,
        }).eq('id', notif_id);

        if (notif.recurrence && notif.recurrence !== 'none') {
            try {
                const nextAt = nextOccurrence(notif.recurrence, notif.recurrence_day, notif.scheduled_at);
                if (nextAt) {
                    const { count: dupCount } = await supabase
                        .from('admin_notifications')
                        .select('id', { count: 'exact', head: true })
                        .eq('title', notif.title)
                        .eq('recurrence', notif.recurrence)
                        .eq('scheduled_at', nextAt)
                        .in('status', ['scheduled', 'sending']);
                    if (!dupCount) {
                        await supabase.from('admin_notifications').insert({
                            title: notif.title, body: notif.body, image_url: notif.image_url || null,
                            platform: notif.platform || 'all', audience: notif.audience || 'all',
                            deep_link_type: notif.deep_link_type || 'none', deep_link_id: notif.deep_link_id || null,
                            recurrence: notif.recurrence, recurrence_day: notif.recurrence_day || null,
                            notes: notif.notes || null, created_by: 'cron',
                            status: 'scheduled', scheduled_at: nextAt, is_template: false,
                        });
                    }
                }
            } catch (e) { console.error('nextOccurrence error:', e.message); }
        }

        return json({ success: true, finalized: notif_id });
    }

    // ── DELIVERY STATS ────────────────────────────────────────────
    if (action === 'delivery_stats') {
        const adminToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        const { data: adminSess } = await supabase.from('admin_sessions').select('user_id')
            .eq('token', adminToken).gt('expires_at', new Date().toISOString()).single();
        if (!adminSess) return json({ error: 'Unauthorized' }, 401);

        const { notif_id } = body;
        if (!notif_id) return json({ error: 'notif_id required' }, 400);

        const { data: rows } = await supabase
            .from('admin_notification_delivery_logs')
            .select('status, platform')
            .eq('notification_id', notif_id);

        if (!rows?.length) return json({ has_log: false });

        const nonStale = rows.filter(r => r.status !== 'stale');
        const stats = {
            has_log: true,
            total: rows.length,
            sent:     rows.filter(r => r.status === 'sent').length,
            failed:   rows.filter(r => r.status === 'failed').length,
            pending:  rows.filter(r => r.status === 'pending').length,
            retrying: rows.filter(r => r.status === 'retrying').length,
            stale:    rows.filter(r => r.status === 'stale').length,
            android_sent:   rows.filter(r => r.platform === 'android' && r.status === 'sent').length,
            android_failed: rows.filter(r => r.platform === 'android' && (r.status === 'failed' || r.status === 'pending')).length,
            ios_sent:   rows.filter(r => r.platform === 'ios' && r.status === 'sent').length,
            ios_failed: rows.filter(r => r.platform === 'ios' && (r.status === 'failed' || r.status === 'pending')).length,
        };
        // retry_count excludes 'retrying' rows — they're already in-flight
        stats.retry_count = stats.failed + stats.pending;
        stats.delivery_rate = nonStale.length > 0 ? Math.round(stats.sent / nonStale.length * 100) : 0;
        return json(stats);
    }

    // ── RETRY FAILED ──────────────────────────────────────────────
    if (action === 'retry_failed') {
        const adminToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        const { data: adminSess } = await supabase.from('admin_sessions').select('user_id')
            .eq('token', adminToken).gt('expires_at', new Date().toISOString()).single();
        if (!adminSess) return json({ error: 'Unauthorized' }, 401);

        const { notif_id, confirm } = body;
        if (!notif_id) return json({ error: 'notif_id required' }, 400);

        const { data: logRows } = await supabase
            .from('admin_notification_delivery_logs')
            .select('status, platform, token')
            .eq('notification_id', notif_id);

        if (!logRows?.length) return json({ error: 'No delivery log for this notification — only notifications sent after the delivery-tracking update support retry.' }, 404);

        const summary = {
            sent:    logRows.filter(r => r.status === 'sent').length,
            failed:  logRows.filter(r => r.status === 'failed').length,
            pending: logRows.filter(r => r.status === 'pending').length,
            stale:   logRows.filter(r => r.status === 'stale').length,
        };
        summary.retry_count = summary.failed + summary.pending;

        // Without confirm: return summary only (used by UI to show the confirmation modal)
        if (!confirm) return json({ success: true, summary, notif_id });

        if (summary.retry_count === 0) return json({ success: true, retried: 0, sent: 0, message: 'No failed tokens to retry' });

        // One-click retry ALL failed/pending tokens via internal sub-invocations.
        // Each sub-invocation (retry_batch) gets its own 50-subrequest budget.
        // Batches run concurrently — they operate on disjoint token sets.
        const failedRows = logRows.filter(r => r.status === 'failed' || r.status === 'pending');
        const RETRY_PAGE = 35;
        const totalBatches = Math.ceil(failedRows.length / RETRY_PAGE);
        const siteOrigin = new URL(request.url).origin;
        const cronHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.CRON_SECRET}`,
        };

        const batchResults = await Promise.all(
            Array.from({ length: totalBatches }, (_, i) => {
                const slice = failedRows.slice(i * RETRY_PAGE, (i + 1) * RETRY_PAGE);
                return fetch(`${siteOrigin}/admin-notifications-api`, {
                    method: 'POST', headers: cronHeaders,
                    body: JSON.stringify({
                        action: 'retry_batch',
                        notif_id,
                        tokens: slice.map(r => ({ token: r.token, platform: r.platform })),
                    }),
                }).then(r => r.ok ? r.json().catch(() => ({})) : {}).catch(() => ({}));
            })
        );

        let totalSent = 0, totalFailed = 0, totalStale = 0;
        for (const b of batchResults) {
            totalSent   += b.sent   ?? 0;
            totalFailed += b.failed ?? 0;
            totalStale  += b.stale  ?? 0;
        }

        // Refresh notification totals from delivery log
        const { data: newLog } = await supabase
            .from('admin_notification_delivery_logs').select('status').eq('notification_id', notif_id);
        if (newLog?.length) {
            await supabase.from('admin_notifications').update({
                tokens_sent:   newLog.filter(r => r.status === 'sent').length,
                tokens_failed: newLog.filter(r => r.status === 'failed' || r.status === 'pending').length,
                stale_removed: newLog.filter(r => r.status === 'stale').length,
            }).eq('id', notif_id);
        }

        return json({
            success: true,
            retried: failedRows.length,
            sent: totalSent,
            failed: totalFailed,
            stale: totalStale,
        });
    }

    // ── RETRY BATCH (internal sub-invocation, cron-secret auth) ──
    if (action === 'retry_batch') {
        const authHeader = request.headers.get('Authorization') || '';
        const isCron = [env.CRON_SECRET, env.NOTIF_CRON_SECRET]
            .filter(Boolean).some(s => authHeader === `Bearer ${s}`);
        if (!isCron) return json({ error: 'Unauthorized' }, 401);

        const { notif_id, tokens } = body;
        if (!notif_id || !tokens?.length) return json({ error: 'notif_id and tokens required' }, 400);

        // Atomically claim tokens by transitioning failed/pending → retrying.
        // If two concurrent retry_failed calls both dispatched this token,
        // only the first claim succeeds; the second gets an empty result and
        // skips the send — guaranteeing at-most-one delivery per retry click.
        const { data: claimed } = await supabase.rpc('claim_retry_tokens', {
            p_notification_id: notif_id,
            p_tokens: tokens.map(t => t.token),
        });
        if (!claimed?.length) {
            return json({ success: true, sent: 0, failed: 0, stale: 0, skipped: tokens.length });
        }

        const { data: notif } = await supabase.from('admin_notifications').select('*').eq('id', notif_id).single();
        if (!notif) return json({ error: 'Notification not found' }, 404);

        const retryTokens = claimed.map(t => ({
            token: t.token, platform: t.platform,
            _type: t.platform === 'ios' ? 'apns' : 'fcm',
        }));
        const result = await sendBatch(env, supabase, notif, retryTokens);
        if (result.staleTokens.length) await removeStaleTokens(env, result.staleTokens).catch(() => {});

        return json({ success: true, sent: result.sent, failed: result.failed, stale: result.staleTokens.length, skipped: tokens.length - claimed.length });
    }

    // ── PUBLIC INBOX (no auth — app users fetch recent sent notifications) ──
    if (action === 'public_inbox') {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        let q = supabase
            .from('admin_notifications')
            .select('id, title, body, deep_link_type, deep_link_id, sent_at, image_url')
            .eq('status', 'sent').eq('is_template', false).eq('audience', 'all')
            .eq('show_in_app', true)
            .gte('sent_at', cutoff)
            .order('sent_at', { ascending: false }).limit(20);
        // Incremental fetch: client passes `since` (ISO string of last known sent_at)
        // to download only notifications newer than their local cache cursor.
        if (body.since) q = q.gt('sent_at', body.since);
        const { data: notifications } = await q;
        return json({ notifications: notifications || [] });
    }

    // ── AUTO-NOTIFY NEW CONTENT (cron — no admin auth) ────────────
    if (action === 'auto_notify_content') {
        const authHeader = request.headers.get('Authorization') || '';
        const isCron = [env.CRON_SECRET, env.NOTIF_CRON_SECRET]
            .filter(Boolean)
            .some(s => authHeader === `Bearer ${s}`);
        if (!isCron) return json({ error: 'Unauthorized' }, 401);

        if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID)
            return json({ error: 'FCM not configured' }, 503);

        const twoHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
        const notified = [];

        // ── Daily send limits — anti-spam ─────────────────────────
        // Max N auto-notifications per content type per Baghdad calendar day.
        // Overflow items are scheduled for the next available future day at a
        // random PM time (14:00–20:59 Baghdad = 11:00–17:59 UTC) and appear
        // in the Scheduled tab of admin-notifications.
        const DAILY_LIMITS = { video: 3, book: 1, hadith: 1 };

        // Baghdad date string (YYYY-MM-DD) for any timestamp
        function bgDate(ts) {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' })
                .format(typeof ts === 'number' ? new Date(ts) : new Date(ts));
        }
        const todayBg = bgDate(Date.now());

        // Random PM scheduled_at ISO string on a given Baghdad date
        // Hours 14-20 Baghdad (UTC+3) = hours 11-17 UTC
        function randomPmOn(bgDateStr) {
            const [y, m, d] = bgDateStr.split('-').map(Number);
            const bgHour = 14 + Math.floor(Math.random() * 7); // 14–20 inclusive
            const bgMin  = Math.floor(Math.random() * 60);
            return new Date(Date.UTC(y, m - 1, d, bgHour - 3, bgMin, 0)).toISOString();
        }

        // Advance a Baghdad date string by one calendar day
        function nextBgDay(bgDateStr) {
            const [y, m, d] = bgDateStr.split('-').map(Number);
            return bgDate(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
        }

        // Build usage map from existing auto-notifications so overflow from
        // previous cron runs is correctly counted when assigning new slots.
        // Counts: { 'video:2026-06-07': 2, 'book:2026-06-08': 1, … }
        const { data: existingAuto } = await supabase
            .from('admin_notifications')
            .select('deep_link_type, scheduled_at, status, created_at')
            .eq('created_by', 'auto')
            .in('status', ['sent', 'sending', 'scheduled'])
            .in('deep_link_type', ['video', 'book', 'hadith'])
            .limit(500);

        const usage = {};
        for (const n of (existingAuto || [])) {
            // Scheduled items count on their scheduled date; sent/sending on creation date
            const dt = (n.status === 'scheduled' && n.scheduled_at) ? n.scheduled_at : n.created_at;
            const key = n.deep_link_type + ':' + bgDate(dt);
            usage[key] = (usage[key] || 0) + 1;
        }

        // Find the next Baghdad date (starting from today) that has a free slot
        function nextAvailableDay(type, startDay) {
            let day = startDay;
            for (let i = 0; i < 60; i++) {
                if ((usage[type + ':' + day] || 0) < DAILY_LIMITS[type]) return day;
                day = nextBgDay(day);
            }
            return null; // safety — shouldn't happen
        }

        // Load editable auto-notification texts from translations DB
        const AUTO_KEYS = ['notif.auto_book_body','notif.auto_book_title_fallback','notif.auto_hadith_body','notif.auto_hadith_title_fallback'];
        const { data: txRows } = await supabase.from('kurdish_translations').select('key_id,kurdish_text').in('key_id', AUTO_KEYS);
        const tx = Object.fromEntries((txRows || []).map(r => [r.key_id, r.kurdish_text]));
        const autoBookBody           = tx['notif.auto_book_body']            || 'پەرتووکەکا نوی د تەفسیر کورد دا یا بەردەستە. نوکە بخوینە.';
        const autoBookTitleFallback  = tx['notif.auto_book_title_fallback']  || 'پەرتوکەکا نوی';
        const autoHadithBody         = tx['notif.auto_hadith_body']          || 'فەرموودەکا نوی د تەفسیر کورد دا یا بەردەستە. نوکە بخوینە.';
        const autoHadithTitleFallback= tx['notif.auto_hadith_title_fallback']|| 'فەرمودەکا نوی';

        // Insert a notification and either send immediately (no scheduledAt) or
        // save as scheduled for a future PM slot (scheduledAt provided).
        // Dedup: explicit pre-check so it works regardless of whether the unique index
        // is full or partial (partial indexes exclude cancelled rows and would miss skips).
        async function sendAutoNotif(title, body, image_url, dlType, dlId, scheduledAt) {
            // Check for any existing row for this item (sent, scheduled, or manually skipped)
            const { data: existing } = await supabase
                .from('admin_notifications')
                .select('id, status')
                .eq('deep_link_type', dlType)
                .eq('deep_link_id', String(dlId))
                .in('status', ['sent', 'sending', 'scheduled', 'cancelled'])
                .limit(1)
                .maybeSingle();
            if (existing) return { skipped: true };

            const { data: notif, error } = await supabase
                .from('admin_notifications')
                .insert({
                    title,
                    body,
                    image_url:      image_url || null,
                    platform:       'all',
                    audience:       'all',
                    deep_link_type: dlType,
                    deep_link_id:   String(dlId),
                    // Always insert as 'scheduled' — the cron's process_scheduled pipeline
                    // sends to ALL tokens via multi-batch Pages Functions (no SEND_CAP).
                    // When scheduledAt is null (isToday), scheduled_at=now() makes it
                    // immediately due so the batch loop in the same cron run picks it up.
                    status:         'scheduled',
                    scheduled_at:   scheduledAt || new Date().toISOString(),
                    created_by:     'auto',
                })
                .select()
                .single();
            if (error?.code === '23505') return { skipped: true }; // fallback for unique constraint
            if (error || !notif) return { error: error?.message || 'insert failed' };
            return { scheduled: true, scheduled_at: scheduledAt || notif.scheduled_at };
        }

        // Helper: assign a slot, call sendAutoNotif, update usage counter
        async function assignAndSend(title, msgBody, image_url, dlType, dlId, type) {
            const slot = nextAvailableDay(type, todayBg);
            if (!slot) return { error: 'no-slot' };
            const isToday  = slot === todayBg;
            const sched    = isToday ? null : randomPmOn(slot);
            const r        = await sendAutoNotif(title, msgBody, image_url, dlType, dlId, sched);
            if (!r.skipped && !r.error) {
                const key = type + ':' + slot;
                usage[key] = (usage[key] || 0) + 1;
            }
            return { ...r, slot, isToday };
        }

        // ── New episodes ──────────────────────────────────────────
        const { data: episodes } = await supabase
            .from('islamvoice_episodes')
            .select('id,title,thumbnail_url,created_at,series_id,islamvoice_series(name_ku)')
            .eq('is_published', true)
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false });

        // One notification per series per run — when a playlist gains 2+ new episodes
        // in the same sync cycle, both show the same series-name title and look like
        // duplicates to users. Send only the most recent episode (first in DESC order).
        //
        // Pre-populate from DB so cron retries (Cloudflare at-least-once guarantee)
        // don't bypass the in-memory set and send a second episode from the same series.
        const notifiedSeries = new Set();
        const { data: recentVideoNotifs } = await supabase
            .from('admin_notifications')
            .select('deep_link_id')
            .eq('deep_link_type', 'video')
            .in('status', ['sent', 'sending', 'scheduled'])
            .gte('created_at', twoHoursAgo);
        if (recentVideoNotifs?.length) {
            const sentEpIds = recentVideoNotifs.map(n => n.deep_link_id).filter(Boolean);
            if (sentEpIds.length) {
                const { data: sentEps } = await supabase
                    .from('islamvoice_episodes')
                    .select('series_id')
                    .in('id', sentEpIds);
                for (const e of (sentEps || [])) {
                    if (e.series_id) notifiedSeries.add(e.series_id);
                }
            }
        }

        for (const ep of (episodes || [])) {
            const seriesName = ep.islamvoice_series?.name_ku || ep.title;
            if (ep.series_id && notifiedSeries.has(ep.series_id)) {
                console.log(`[auto_notify] series-dedup skip ep=${ep.id} series=${ep.series_id}`);
                notified.push({ type: 'video', id: ep.id, title: seriesName, skipped: true, reason: 'series_dedup' });
                continue;
            }
            const r = await assignAndSend(seriesName, ep.title, ep.thumbnail_url, 'video', ep.id, 'video');
            if (ep.series_id && !r.skipped && !r.error) notifiedSeries.add(ep.series_id);
            console.log(`[auto_notify] video ep=${ep.id} series=${ep.series_id} slot=${r.slot||'now'} skipped=${!!r.skipped}`);
            notified.push({ type: 'video', id: ep.id, title: seriesName, ...r });
        }

        // ── New books ─────────────────────────────────────────────
        const { data: books } = await supabase
            .from('gencine_books')
            .select('id,title_ku,title_ar,cover_url,created_at')
            .eq('active', true)
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false });

        for (const book of (books || [])) {
            const bookTitle = book.title_ku || book.title_ar || autoBookTitleFallback;
            const r = await assignAndSend(bookTitle, autoBookBody, book.cover_url, 'book', book.id, 'book');
            notified.push({ type: 'book', id: book.id, title: bookTitle, ...r });
        }

        // ── New hadiths ───────────────────────────────────────────
        const { data: hadiths } = await supabase
            .from('gencine_hadiths')
            .select('id,title,created_at')
            .eq('active', true)
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false });

        for (const h of (hadiths || [])) {
            const r = await assignAndSend(
                h.title || autoHadithTitleFallback,
                autoHadithBody, null,
                'hadith', h.id, 'hadith'
            );
            notified.push({ type: 'hadith', id: h.id, title: h.title, ...r });
        }

        return json({ success: true, notified: notified.length, results: notified });
    }

    const token = ((request.headers.get('Authorization') || '').replace('Bearer ', '') || body.token || '').trim();
    if (!token) return json({ error: 'No token' }, 401);

    const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id, admin_users(role, email)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!session?.admin_users) return json({ error: 'Unauthorized' }, 403);
    const role = session.admin_users.role;
    const adminEmail = session.admin_users.email;

    const isWriter = role === 'super_admin' || role === 'editor';
    const isSuperAdmin = role === 'super_admin';

    // ── SKIP AUTO-NOTIFY — pre-insert cancelled row so cron won't send ──
    if (action === 'skip_auto_notify') {
        if (!isWriter) return json({ error: 'Forbidden' }, 403);
        const { dlType, dlId } = body;
        if (!dlType || !dlId) return json({ error: 'dlType and dlId required' }, 400);
        const { error } = await supabase.from('admin_notifications').insert({
            title: '—', body: '—',
            platform: 'all', audience: 'all',
            deep_link_type: dlType,
            deep_link_id: String(dlId),
            status: 'cancelled',
            created_by: 'skip',
        });
        if (error && error.code !== '23505') return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── CLEAN SERIES — keep only the soonest, cancel the rest ────
    // Fixes duplicates created by old pre-create logic.
    if (action === 'clean_series') {
        const { data: allSched } = await supabase
            .from('admin_notifications')
            .select('id, title, recurrence, recurrence_day, scheduled_at')
            .eq('status', 'scheduled')
            .neq('recurrence', 'none')
            .eq('is_template', false)
            .order('scheduled_at', { ascending: true });

        if (!allSched?.length) return json({ success: true, cancelled: 0 });

        // Group by series key
        const groups = {};
        for (const n of allSched) {
            const key = n.title + '::' + n.recurrence + '::' + (n.recurrence_day ?? '');
            if (!groups[key]) groups[key] = [];
            groups[key].push(n);
        }

        let totalCancelled = 0;
        for (const items of Object.values(groups)) {
            if (items.length <= 1) continue;
            // Keep the soonest (first after sort), cancel the rest
            const toCancel = items.slice(1).map(x => x.id);
            try {
                await supabase.from('admin_notifications')
                    .update({ status: 'cancelled' })
                    .in('id', toCancel);
                totalCancelled += toCancel.length;
            } catch (_) {}
        }
        return json({ success: true, cancelled: totalCancelled });
    }

    // ── BACKFILL RECURRING — now a no-op ─────────────────────────
    // Pre-creating multiple future entries caused spam. doSend() chains
    // the next occurrence. This action is kept so old frontend calls don't 404.
    if (action === 'backfill_recurring') {
        return json({ success: true, created: 0 });
    }

    // ── LIST ──────────────────────────────────────────────────────
    if (action === 'list') {
        let q = supabase
            .from('admin_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        q = q.neq('deep_link_type', 'prayer_reminder_config');
        if (body.status) q = q.eq('status', body.status);
        if (body.platform && body.platform !== 'all') q = q.eq('platform', body.platform);
        if (body.search) q = q.or(`title.ilike.%${body.search}%,body.ilike.%${body.search}%`);

        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notifications: data || [] });
    }

    // ── GET ───────────────────────────────────────────────────────
    if (action === 'get') {
        if (!body.id) return json({ error: 'id required' }, 400);
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('id', body.id)
            .single();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: 'Not found' }, 404);
        return json({ success: true, notification: data });
    }

    // ── GET STATS ─────────────────────────────────────────────────
    if (action === 'get_stats') {
        const [{ data: allNotifs }, { data: tokenCount }] = await Promise.all([
            supabase.from('admin_notifications').select('status, tokens_targeted, tokens_sent, tokens_failed'),
            supabase.from('push_tokens').select('id', { count: 'exact', head: true })
        ]);

        const sent = (allNotifs || []).filter(n => n.status === 'sent');
        const scheduled = (allNotifs || []).filter(n => n.status === 'scheduled').length;
        const totalSent = sent.length;
        const totalTargeted = sent.reduce((s, n) => s + (n.tokens_targeted || 0), 0);
        const totalDelivered = sent.reduce((s, n) => s + (n.tokens_sent || 0), 0);
        const deliveryRate = totalTargeted > 0 ? Math.round((totalDelivered / totalTargeted) * 100) : 0;

        return json({
            success: true,
            stats: {
                totalSent,
                totalScheduled: scheduled,
                totalNotifications: (allNotifs || []).length,
                activeTokens: tokenCount || 0,
                deliveryRate,
                totalDelivered,
                totalTargeted,
            }
        });
    }

    // ── LIST TOKENS (devices tab) ─────────────────────────────────
    if (action === 'list_tokens') {
        const { data, error } = await supabase
            .from('push_tokens')
            .select('id,token,platform,user_id,created_at,updated_at')
            .order('created_at', { ascending: false })
            .limit(1000);
        if (error) return json({ error: error.message }, 500);

        // Enrich tokens that have a user_id with name/email from auth.users
        const userIds = [...new Set((data || []).map(t => t.user_id).filter(Boolean))];
        let userMap = {};
        if (userIds.length) {
            const usersRes = await fetch(
                `${env.SUPABASE_URL}/auth/v1/admin/users?per_page=1000`,
                { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }
            ).catch(() => null);
            if (usersRes?.ok) {
                const usersData = await usersRes.json().catch(() => ({}));
                for (const u of (usersData.users || [])) {
                    if (userIds.includes(u.id)) {
                        userMap[u.id] = {
                            name: u.user_metadata?.full_name || u.user_metadata?.name || null,
                            email: u.email || null,
                        };
                    }
                }
            }
        }

        const tokens = (data || []).map(t => ({
            ...t,
            user_name: t.user_id ? (userMap[t.user_id]?.name || null) : null,
            user_email: t.user_id ? (userMap[t.user_id]?.email || null) : null,
        }));
        return json({ success: true, tokens });
    }

    // ── GET TOKEN COUNT (preview) ─────────────────────────────────
    if (action === 'get_token_count') {
        const audience = body.audience || 'all';
        const platform = body.platform || 'all';

        let q = supabase.from('push_tokens').select('id', { count: 'exact', head: true });
        if (platform !== 'all') q = q.eq('platform', platform);
        if (audience.startsWith('user:')) q = q.eq('user_id', audience.slice(5));
        else if (audience === 'authenticated') q = q.not('user_id', 'is', null);
        else if (audience === 'unauthenticated') q = q.is('user_id', null);
        else if (audience === 'android') q = q.eq('platform', 'android');
        else if (audience === 'ios') q = q.eq('platform', 'ios');

        const { count, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, count: count || 0 });
    }

    // ── SEARCH USERS ──────────────────────────────────────────────
    if (action === 'search_users') {
        const q = (body.query || body.email || '').trim().toLowerCase();
        if (!q) return json({ error: 'query required' }, 400);

        // Search auth.users via Supabase Admin API
        const searchUrl = `${env.SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`;
        const usersRes = await fetch(searchUrl, {
            headers: {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
        });
        if (!usersRes.ok) return json({ error: 'Failed to fetch users' }, 500);
        const usersData = await usersRes.json();
        const allUsers = usersData.users || [];

        // Filter by name or email substring
        const matched = allUsers.filter(u => {
            const name = (u.user_metadata?.full_name || u.user_metadata?.name || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            return name.includes(q) || email.includes(q);
        }).slice(0, 10);

        // Get token counts for matched users
        const userIds = matched.map(u => u.id);
        let tokenMap = {};
        if (userIds.length > 0) {
            const inList = userIds.map(id => `"${id}"`).join(',');
            const tokRes = await fetch(
                `${env.SUPABASE_URL}/rest/v1/push_tokens?select=user_id&user_id=in.(${inList})`,
                {
                    headers: {
                        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                }
            );
            if (tokRes.ok) {
                const toks = await tokRes.json();
                for (const t of toks) {
                    if (t.user_id) tokenMap[t.user_id] = (tokenMap[t.user_id] || 0) + 1;
                }
            }
        }

        const users = matched.map(u => ({
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || null,
            token_count: tokenMap[u.id] || 0,
        }));

        return json({ success: true, users });
    }

    // ── GET ANALYTICS ─────────────────────────────────────────────
    if (action === 'get_analytics') {
        const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();
        const [{ data: sentNotifs }, { data: allNotifs }] = await Promise.all([
            supabase.from('admin_notifications')
                .select('sent_at, platform, tokens_targeted, tokens_sent, tokens_failed, title')
                .eq('status', 'sent')
                .eq('is_template', false)
                .gte('sent_at', ago30)
                .order('sent_at', { ascending: true })
                .limit(500),
            supabase.from('admin_notifications')
                .select('status, platform, tokens_targeted, tokens_sent, tokens_failed')
                .eq('is_template', false)
        ]);

        // Daily sends + delivery rate last 30 days
        const dayMap = {};
        for (let d = 0; d < 30; d++) {
            const dt = new Date(Date.now() - (29 - d) * 86400000);
            dayMap[dt.toISOString().slice(0, 10)] = { sent: 0, delivered: 0, targeted: 0 };
        }
        for (const n of (sentNotifs || [])) {
            if (!n.sent_at) continue;
            const k = new Date(n.sent_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
            if (dayMap[k]) {
                dayMap[k].sent++;
                dayMap[k].delivered += n.tokens_sent || 0;
                dayMap[k].targeted  += n.tokens_targeted || 0;
            }
        }
        const dailyData = Object.keys(dayMap).sort().map(date => ({
            date,
            sent:      dayMap[date].sent,
            delivered: dayMap[date].delivered,
            targeted:  dayMap[date].targeted,
            rate: dayMap[date].targeted > 0
                ? Math.round((dayMap[date].delivered / dayMap[date].targeted) * 100) : 0
        }));

        // Platform breakdown
        const byPlatform = { all: 0, android: 0, ios: 0 };
        for (const n of (allNotifs || []).filter(n => n.status === 'sent'))
            byPlatform[n.platform] = (byPlatform[n.platform] || 0) + 1;

        // Top 5 by delivery rate (min 10 targeted)
        const topNotifs = (sentNotifs || [])
            .filter(n => (n.tokens_targeted || 0) >= 10)
            .map(n => ({
                title: n.title,
                sent_at: n.sent_at,
                targeted: n.tokens_targeted || 0,
                delivered: n.tokens_sent || 0,
                failed: n.tokens_failed || 0,
                rate: Math.round(((n.tokens_sent || 0) / n.tokens_targeted) * 100)
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5);

        // Totals
        const sentAll = (allNotifs || []).filter(n => n.status === 'sent');
        const totalTargeted  = sentAll.reduce((s, n) => s + (n.tokens_targeted || 0), 0);
        const totalDelivered = sentAll.reduce((s, n) => s + (n.tokens_sent    || 0), 0);
        const avgRate = totalTargeted > 0 ? Math.round((totalDelivered / totalTargeted) * 100) : 0;

        return json({
            success: true,
            dailyData,
            byPlatform,
            topNotifs,
            totals: {
                campaigns: sentAll.length,
                totalDelivered,
                totalTargeted,
                avgRate
            }
        });
    }

    // ── WRITE OPERATIONS — require editor or super_admin ──────────
    if (!isWriter) return json({ error: 'Insufficient permissions' }, 403);

    // ── CREATE ────────────────────────────────────────────────────
    if (action === 'create') {
        const { title, body: msgBody, image_url, platform, audience, deep_link_type, deep_link_id,
                scheduled_at, recurrence, recurrence_day, notes, is_template, show_in_app } = body;

        if (!title || !msgBody) return json({ error: 'title and body required' }, 400);

        const schedErr = validateScheduledAt(scheduled_at, recurrence, is_template);
        if (schedErr) return json({ error: schedErr }, 400);

        const status = scheduled_at ? 'scheduled' : 'draft';
        const { data, error } = await supabase
            .from('admin_notifications')
            .insert({
                title, body: msgBody, image_url: image_url || null,
                platform: platform || 'all',
                audience: audience || 'all',
                deep_link_type: deep_link_type || 'none',
                deep_link_id: deep_link_id || null,
                status,
                scheduled_at: scheduled_at || null,
                recurrence: recurrence || 'none',
                recurrence_day: recurrence_day != null ? recurrence_day : null,
                notes: notes || null,
                is_template: is_template === true,
                show_in_app: show_in_app === true,
                created_by: adminEmail,
            })
            .select()
            .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notification: data });
    }

    // ── UPDATE ────────────────────────────────────────────────────
    if (action === 'update') {
        if (!body.id) return json({ error: 'id required' }, 400);

        const { data: existing } = await supabase
            .from('admin_notifications')
            .select('status')
            .eq('id', body.id)
            .single();

        if (!existing) return json({ error: 'Not found' }, 404);
        if (!['draft', 'scheduled'].includes(existing.status))
            return json({ error: 'Can only edit draft or scheduled notifications' }, 400);

        const { title, body: msgBody, image_url, platform, audience, deep_link_type, deep_link_id,
                scheduled_at, recurrence, recurrence_day, notes, is_template, show_in_app } = body;

        const schedErrU = validateScheduledAt(scheduled_at, recurrence, is_template);
        if (schedErrU) return json({ error: schedErrU }, 400);

        const status = scheduled_at ? 'scheduled' : 'draft';
        const { data, error } = await supabase
            .from('admin_notifications')
            .update({
                title, body: msgBody, image_url: image_url || null,
                platform: platform || 'all',
                audience: audience || 'all',
                deep_link_type: deep_link_type || 'none',
                deep_link_id: deep_link_id || null,
                status,
                scheduled_at: scheduled_at || null,
                recurrence: recurrence || 'none',
                recurrence_day: recurrence_day != null ? recurrence_day : null,
                notes: notes || null,
                is_template: is_template === true,
                show_in_app: show_in_app === true,
            })
            .eq('id', body.id)
            .select()
            .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notification: data });
    }

    // ── SEND ──────────────────────────────────────────────────────
    if (action === 'send') {
        if (!body.id) return json({ error: 'id required' }, 400);

        const { data: notif } = await supabase.from('admin_notifications').select('*').eq('id', body.id).single();
        if (!notif) return json({ error: 'Not found' }, 404);
        if (notif.status === 'sending') return json({ error: 'Already sending' }, 400);
        if (notif.status === 'sent' && !body.force_resend) return json({ error: 'Already sent. Pass force_resend:true to resend.' }, 400);
        if (notif.status === 'cancelled') return json({ error: 'Cannot send cancelled notification' }, 400);
        // Explicit Send is always an override — skip the scheduled-time guard.
        if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID) return json({ error: 'FCM not configured' }, 503);

        const now = new Date().toISOString();
        let trackingId = body.id;
        if (notif.is_template) {
            // Create a non-template copy, scheduled for immediate pickup below.
            const { data: copy } = await supabase.from('admin_notifications').insert({
                title: notif.title, body: notif.body, image_url: notif.image_url,
                platform: notif.platform, audience: notif.audience,
                deep_link_type: notif.deep_link_type, deep_link_id: notif.deep_link_id,
                recurrence: notif.recurrence, recurrence_day: notif.recurrence_day,
                notes: notif.notes, created_by: adminEmail,
                status: 'scheduled', scheduled_at: now, is_template: false,
            }).select().single();
            if (!copy) return json({ error: 'Failed to create send record' }, 500);
            trackingId = copy.id;
        } else {
            // Optimistic lock: claim this row before the batch loop starts.
            const { data: claimed } = await supabase
                .from('admin_notifications')
                .update({ status: 'scheduled', scheduled_at: now })
                .eq('id', body.id)
                .eq('status', notif.status)
                .select('id')
                .single();
            if (!claimed) return json({ error: 'Concurrent send detected — refresh and try again' }, 409);
        }

        // Immediately run the full multi-batch pipeline — same as the cron does, but
        // triggered right now from this Pages Function invocation.
        //
        // Subrequest budget for THIS invocation:
        //   3 above (auth + get + claim) + 1 (batch 0) + N-1 (batches 1..N, concurrent)
        //   + 1 (finalize) = well within 50 for any realistic user count.
        //
        // Each batch call is a SEPARATE Pages Function invocation with its own
        // 50-subrequest budget, so token sends are not constrained by this invocation.
        const siteOrigin = new URL(request.url).origin;
        const cronHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.CRON_SECRET}`,
        };
        const PAGE_SIZE = 40;

        let totalSent = 0, totalFailed = 0, totalTargeted = 0;
        const allStale = [];

        // Batch 0 — sequential: recovery + direct claim of trackingId + first token slice.
        // Pass notif_id so process_scheduled claims exactly this notification, not any other
        // overdue 'scheduled' row that might be in the DB at the same time.
        const b0Res = await fetch(`${siteOrigin}/admin-notifications-api`, {
            method: 'POST', headers: cronHeaders,
            body: JSON.stringify({ action: 'process_scheduled', batch_num: 0, notif_id: trackingId }),
        }).catch(() => null);
        const b0 = b0Res?.ok ? await b0Res.json().catch(() => ({})) : {};
        totalSent   += b0.batch_sent   ?? 0;
        totalFailed += b0.batch_failed ?? 0;
        totalTargeted = b0.total_targeted ?? 0;
        if (b0.stale_tokens?.length) allStale.push(...b0.stale_tokens);

        // Batches 1..N — run concurrently (each has its own subrequest budget).
        // Pass notif_id so each batch resumes exactly this notification.
        if (b0.notif_id && b0.has_more) {
            const totalBatches = Math.ceil(totalTargeted / PAGE_SIZE);
            const batchResults = await Promise.all(
                Array.from({ length: totalBatches - 1 }, (_, i) => i + 1).map(bn =>
                    fetch(`${siteOrigin}/admin-notifications-api`, {
                        method: 'POST', headers: cronHeaders,
                        body: JSON.stringify({ action: 'process_scheduled', batch_num: bn, notif_id: trackingId }),
                    })
                    .then(r => r.ok ? r.json().catch(() => ({})) : {})
                    .catch(() => ({}))
                )
            );
            for (const b of batchResults) {
                totalSent   += b.batch_sent   ?? 0;
                totalFailed += b.batch_failed ?? 0;
                if (b.stale_tokens?.length) allStale.push(...b.stale_tokens);
            }
        }

        // Finalize — mark sent + create next recurrence
        if (b0.notif_id) {
            await fetch(`${siteOrigin}/admin-notifications-api`, {
                method: 'POST', headers: cronHeaders,
                body: JSON.stringify({
                    action: 'finalize_send', notif_id: b0.notif_id,
                    tokens_sent: totalSent, tokens_failed: totalFailed,
                    stale_tokens: allStale, error_msg: null,
                }),
            }).catch(() => {});
        }

        return json({ success: true, sent: totalSent, failed: totalFailed,
                      total: totalTargeted, notification_id: trackingId });
    }

    // ── SEND TEST (admin's own devices only — no DB status change) ─
    if (action === 'send_test') {
        if (!body.id) return json({ error: 'id required' }, 400);

        const { data: notif } = await supabase.from('admin_notifications').select('*').eq('id', body.id).single();
        if (!notif) return json({ error: 'Not found' }, 404);
        if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID) return json({ error: 'FCM not configured' }, 503);

        const { data: myTokens } = await supabase
            .from('push_tokens')
            .select('token, platform')
            .eq('user_id', session.user_id);

        if (!myTokens?.length)
            return json({ error: 'No device tokens found for your account. Open TafsirKurd on your device and log in, then try again.' }, 400);

        const r = await doSendTokenList(env, notif, myTokens);
        if (r.error) return json({ error: r.error }, 500);
        return json({ success: true, sent: r.sent, failed: r.failed, total: r.total });
    }

    // ── CANCEL ────────────────────────────────────────────────────
    if (action === 'cancel') {
        if (!body.id) return json({ error: 'id required' }, 400);
        const { error } = await supabase
            .from('admin_notifications')
            .update({ status: 'cancelled' })
            .eq('id', body.id)
            .in('status', ['draft', 'scheduled']);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── CANCEL SERIES — cancel all future scheduled occurrences with same title ──
    if (action === 'cancel_series') {
        if (!body.id) return json({ error: 'id required' }, 400);
        const { data: ref } = await supabase
            .from('admin_notifications').select('title, recurrence').eq('id', body.id).single();
        if (!ref) return json({ error: 'Not found' }, 404);
        const { data: cancelled, error } = await supabase
            .from('admin_notifications')
            .update({ status: 'cancelled' })
            .eq('title', ref.title)
            .eq('recurrence', ref.recurrence)
            .eq('is_template', false)
            .in('status', ['scheduled'])
            .gt('scheduled_at', new Date().toISOString())
            .select('id');
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, cancelled: (cancelled || []).length });
    }

    // ── DELETE ────────────────────────────────────────────────────
    if (action === 'delete') {
        if (!isSuperAdmin) return json({ error: 'Super Admin only' }, 403);
        if (!body.id) return json({ error: 'id required' }, 400);
        const { error } = await supabase.from('admin_notifications').delete().eq('id', body.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── DELETE ALL CANCELLED ───────────────────────────────────────
    if (action === 'delete_cancelled') {
        if (!isWriter) return json({ error: 'Editor or Super Admin only' }, 403);
        const { data: deleted, error } = await supabase
            .from('admin_notifications')
            .delete()
            .eq('status', 'cancelled')
            .select('id');
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, deleted: (deleted || []).length });
    }

    // ── DUPLICATE ─────────────────────────────────────────────────
    if (action === 'duplicate') {
        if (!body.id) return json({ error: 'id required' }, 400);
        const { data: src } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('id', body.id)
            .single();
        if (!src) return json({ error: 'Not found' }, 404);

        const { data, error } = await supabase
            .from('admin_notifications')
            .insert({
                title: src.title + ' (Copy)',
                body: src.body,
                image_url: src.image_url,
                platform: src.platform,
                audience: src.audience,
                deep_link_type: src.deep_link_type,
                deep_link_id: src.deep_link_id,
                status: 'draft',
                notes: src.notes,
                show_in_app: src.show_in_app || false,
                created_by: adminEmail,
            })
            .select()
            .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notification: data });
    }

    return json({ error: 'Unknown action' }, 400);
}

// ── Helpers ─────────────────────────────────────────────────────────

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: CORS });
}

// Returns an error string if scheduled_at is invalid or in the past, null if OK.
// Recurring notifications and templates are exempt from the past-time check.
function validateScheduledAt(scheduled_at, recurrence, is_template) {
    if (!scheduled_at || is_template) return null;
    const schedDate = new Date(scheduled_at);
    if (isNaN(schedDate.getTime())) return 'Invalid scheduled_at date';
    if ((recurrence || 'none') === 'none' && schedDate <= new Date()) {
        return 'Scheduled time is in the past. Please pick a future time.';
    }
    return null;
}

async function sendBatch(env, supabase, notif, batchTokens) {
    if (!batchTokens.length) return { sent: 0, failed: 0, staleTokens: [], errors: [] };

    const apnsInBatch = batchTokens.filter(t => t._type === 'apns');
    const fcmInBatch  = batchTokens.filter(t => t._type === 'fcm');

    let accessToken = null, fcmAuthError = null;
    if (fcmInBatch.length && env.FCM_SERVICE_ACCOUNT) {
        try { accessToken = await getFCMAccessToken(env.FCM_SERVICE_ACCOUNT); }
        catch (e) { fcmAuthError = 'FCM auth: ' + e.message; }
    }

    let apnsJwt = null, apnsJwtError = null;
    if (apnsInBatch.length && env.APNS_KEY_P8) {
        try { apnsJwt = await getAPNsJWT(env.APNS_KEY_P8, env.APNS_KEY_ID || 'KLG2RRCRNR', env.APNS_TEAM_ID || '8KA7UDSC9D'); }
        catch (e) { apnsJwtError = 'APNs JWT: ' + e.message; }
    }

    const deepLinkData = buildDeepLinkData(notif.deep_link_type, notif.deep_link_id);
    const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
    let successCount = 0, failCount = fcmAuthError ? fcmInBatch.length : 0;
    const staleTokens = [], errors = [];
    // Per-token result tracking for delivery log
    const sentList = [], failedList = [];
    if (fcmAuthError) {
        errors.push(fcmAuthError);
        fcmInBatch.forEach(t => failedList.push({ token: t.token, platform: 'android', error: fcmAuthError }));
    }

    const jobs = batchTokens.map(t => async () => {
        const platform = t._type === 'fcm' ? 'android' : 'ios';
        if (t._type === 'fcm') {
            if (!accessToken) { failCount++; failedList.push({ token: t.token, platform, error: 'No FCM token' }); return; }
            const res = await fetch(FCM_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: buildFCMMessage(t.token, t.platform, notif.title, notif.body, notif.image_url, deepLinkData) }),
            });
            if (res.ok) { successCount++; sentList.push({ token: t.token, platform }); }
            else {
                const err = await res.json().catch(() => ({}));
                const errMsg = `FCM ${res.status} ${err?.error?.status || ''}: ${err?.error?.message || ''}`;
                errors.push(errMsg);
                if (err?.error?.status === 'NOT_FOUND' || err?.error?.status === 'UNREGISTERED') staleTokens.push(t.token);
                else failedList.push({ token: t.token, platform, error: errMsg });
                failCount++;
            }
        } else {
            if (!apnsJwt) { errors.push(apnsJwtError || 'APNs JWT missing'); failCount++; failedList.push({ token: t.token, platform, error: apnsJwtError || 'APNs JWT missing' }); return; }
            const res = await sendApns(t.token, notif.title, notif.body, deepLinkData, apnsJwt, 'com.tafsirkurd.app');
            if (res.ok) { successCount++; sentList.push({ token: t.token, platform }); }
            else {
                const errText = await res.text().catch(() => '');
                const err = (() => { try { return JSON.parse(errText || '{}'); } catch { return {}; } })();
                const errMsg = `APNs ${res.status}: ${err?.reason || errText}`;
                errors.push(errMsg);
                if (res.status === 410 || err?.reason === 'BadDeviceToken' || err?.reason === 'Unregistered') staleTokens.push(t.token);
                else failedList.push({ token: t.token, platform, error: errMsg });
                failCount++;
            }
        }
    });

    await Promise.allSettled(jobs.map(fn => fn()));

    // Update delivery log atomically via RPC — increments attempt_count correctly on retry
    if (supabase && notif?.id && (sentList.length || failedList.length || staleTokens.length)) {
        const failedErrors = Object.fromEntries(
            failedList.map(t => [t.token, (t.error || '').slice(0, 500)])
        );
        await supabase.rpc('upsert_delivery_results', {
            p_notification_id: notif.id,
            p_sent_tokens:   sentList.map(t => t.token),
            p_failed_tokens: failedList.map(t => t.token),
            p_failed_errors: failedErrors,
            p_stale_tokens:  staleTokens,
        }).catch(e => console.error('[delivery_log] rpc upsert_delivery_results failed:', e.message));
    }

    return { sent: successCount, failed: failCount, staleTokens, errors };
}

async function doSend(supabase, env, notif, trackingId, sentBy) {
    // Get tokens
    let tokens;
    try { tokens = await getTokensForAudience(env, notif.audience, notif.platform); }
    catch (e) {
        await supabase.from('admin_notifications')
            .update({ status: 'failed', error_message: 'Token fetch: ' + e.message })
            .eq('id', trackingId);
        return { error: 'Token fetch failed: ' + e.message };
    }

    // Write tokens_targeted immediately so recovery can distinguish
    // "crashed before sending" (0) from "crashed after sending" (>0).
    await supabase.from('admin_notifications')
        .update({ tokens_targeted: tokens.length })
        .eq('id', trackingId).catch(() => {});

    if (!tokens.length) {
        await supabase.from('admin_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString(),
                      tokens_targeted: 0, tokens_sent: 0, tokens_failed: 0, stale_removed: 0 })
            .eq('id', trackingId);
        return { sent: 0, failed: 0, total: 0, stale_removed: 0 };
    }

    const apnsTokens = tokens.filter(t => isApnsToken(t.token));
    const fcmTokens  = tokens.filter(t => !isApnsToken(t.token));

    let accessToken = null, fcmAuthError = null;
    if (fcmTokens.length && env.FCM_SERVICE_ACCOUNT) {
        try { accessToken = await getFCMAccessToken(env.FCM_SERVICE_ACCOUNT); }
        catch (e) {
            if (!apnsTokens.length) {
                await supabase.from('admin_notifications')
                    .update({ status: 'failed', error_message: 'FCM auth: ' + e.message })
                    .eq('id', trackingId);
                return { error: 'FCM auth error: ' + e.message };
            }
            // APNs tokens exist — continue for iOS but record FCM failure
            fcmAuthError = 'FCM auth failed (' + fcmTokens.length + ' Android skipped): ' + e.message;
            console.error('[sendNotification] FCM auth failed, Android tokens skipped:', e.message);
        }
    }

    let apnsJwt = null, apnsJwtError = null;
    if (apnsTokens.length && env.APNS_KEY_P8) {
        try { apnsJwt = await getAPNsJWT(env.APNS_KEY_P8, env.APNS_KEY_ID || 'KLG2RRCRNR', env.APNS_TEAM_ID || '8KA7UDSC9D'); }
        catch (e) { apnsJwtError = 'APNs JWT: ' + e.message; }
    }

    const deepLinkData = buildDeepLinkData(notif.deep_link_type, notif.deep_link_id);
    const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
    let successCount = 0, failCount = 0;
    const staleTokens = [], apnsErrors = [], fcmErrors = [];
    if (fcmAuthError) { fcmErrors.push(fcmAuthError); failCount += fcmTokens.length; }

    // Interleave Android (FCM) and iOS (APNs) jobs so both platforms get a fair share
    // of Cloudflare's per-invocation subrequest budget. Previously all FCM jobs ran
    // first, exhausting the budget before a single APNs request could be made.
    const makeFCMJob = ({ token, platform }) => async () => {
        if (!accessToken) { failCount++; return; }
        const res = await fetch(FCM_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: buildFCMMessage(token, platform, notif.title, notif.body, notif.image_url, deepLinkData) }),
        });
        if (res.ok) { successCount++; }
        else {
            const err = await res.json().catch(() => ({}));
            fcmErrors.push(`FCM ${res.status} ${err?.error?.status || ''}: ${err?.error?.message || JSON.stringify(err)}`);
            if (err?.error?.status === 'NOT_FOUND' || err?.error?.status === 'UNREGISTERED') staleTokens.push(token);
            failCount++;
        }
    };
    const makeAPNsJob = ({ token }) => async () => {
        if (!apnsJwt) { apnsErrors.push(apnsJwtError || 'JWT missing'); failCount++; return; }
        const res = await sendApns(token, notif.title, notif.body, deepLinkData, apnsJwt, 'com.tafsirkurd.app');
        if (res.ok) { successCount++; }
        else {
            const errText = await res.text().catch(() => '');
            const err = (() => { try { return JSON.parse(errText || '{}'); } catch { return {}; } })();
            apnsErrors.push(`APNs ${res.status}: ${err?.reason || errText}`);
            if (res.status === 410 || err?.reason === 'BadDeviceToken' || err?.reason === 'Unregistered') staleTokens.push(token);
            failCount++;
        }
    };
    // Interleave: FCM[0], APNs[0], FCM[1], APNs[1], ...
    const maxLen = Math.max(fcmTokens.length, apnsTokens.length);
    const allJobs = [];
    for (let i = 0; i < maxLen; i++) {
        if (i < fcmTokens.length) allJobs.push(makeFCMJob(fcmTokens[i]));
        if (i < apnsTokens.length) allJobs.push(makeAPNsJob(apnsTokens[i]));
    }
    // Cloudflare free plan: 50 subrequests per Worker invocation.
    // Budget: 3 before sends (token fetch, tokens_targeted write, FCM auth)
    //       + 4 after sends (stale removal, final DB update, next-occurrence check+insert)
    //       = 43 available for actual sends.
    // We cap at 42 for a safety margin so the final DB update always succeeds.
    // Upgrade to Cloudflare Workers Paid ($5/mo) for 1000 subrequests — removes this cap.
    const SEND_CAP = 42;
    await Promise.allSettled(allJobs.slice(0, SEND_CAP).map(fn => fn()));

    if (staleTokens.length) await removeStaleTokens(env, staleTokens).catch(() => {});

    await supabase.from('admin_notifications').update({
        status: 'sent', sent_at: new Date().toISOString(),
        tokens_targeted: tokens.length, tokens_sent: successCount,
        tokens_failed: failCount, stale_removed: staleTokens.length,
        error_message: apnsErrors.length ? apnsErrors[0] : (fcmErrors.length ? fcmErrors[0] : null),
    }).eq('id', trackingId);

    // Auto-schedule next occurrence — only if it wasn't already pre-created on save.
    if (notif.recurrence && notif.recurrence !== 'none') {
        try {
            const nextAt = nextOccurrence(notif.recurrence, notif.recurrence_day, notif.scheduled_at);
            if (nextAt) {
                // Skip if a scheduled occurrence already exists at this exact time (pre-created on save)
                const { count: dupCount } = await supabase
                    .from('admin_notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('title', notif.title)
                    .eq('recurrence', notif.recurrence)
                    .eq('scheduled_at', nextAt)
                    .in('status', ['scheduled', 'sending']);
                if (!dupCount) {
                    const { error: insErr } = await supabase.from('admin_notifications').insert({
                        title: notif.title, body: notif.body, image_url: notif.image_url || null,
                        platform: notif.platform || 'all', audience: notif.audience || 'all',
                        deep_link_type: notif.deep_link_type || 'none', deep_link_id: notif.deep_link_id || null,
                        recurrence: notif.recurrence, recurrence_day: notif.recurrence_day || null,
                        notes: notif.notes || null, created_by: sentBy || 'cron',
                        status: 'scheduled', scheduled_at: nextAt, is_template: false,
                    });
                    if (insErr) console.error('Next occurrence insert failed:', insErr.message);
                }
            }
        } catch (e) { console.error('nextOccurrence error:', e.message); }
    }

    return { sent: successCount, failed: failCount, total: tokens.length, stale_removed: staleTokens.length };
}

async function doSendTokenList(env, notif, tokens) {
    if (!tokens.length) return { sent: 0, failed: 0, total: 0 };

    const apnsTokens = tokens.filter(t => isApnsToken(t.token));
    const fcmTokens  = tokens.filter(t => !isApnsToken(t.token));

    let accessToken = null, fcmAuthErr = null;
    if (fcmTokens.length && env.FCM_SERVICE_ACCOUNT) {
        try { accessToken = await getFCMAccessToken(env.FCM_SERVICE_ACCOUNT); }
        catch (e) {
            if (!apnsTokens.length) return { error: 'FCM auth: ' + e.message };
            fcmAuthErr = e.message;
            console.error('[doSendTokenList] FCM auth failed, Android skipped:', e.message);
        }
    }

    let apnsJwt = null;
    if (apnsTokens.length && env.APNS_KEY_P8) {
        try { apnsJwt = await getAPNsJWT(env.APNS_KEY_P8, env.APNS_KEY_ID || 'KLG2RRCRNR', env.APNS_TEAM_ID || '8KA7UDSC9D'); }
        catch (e) { /* proceed without APNs */ }
    }

    const deepLinkData = buildDeepLinkData(notif.deep_link_type, notif.deep_link_id);
    const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
    let successCount = 0, failCount = fcmAuthErr ? fcmTokens.length : 0;

    const CHUNK = 200;
    const allJobs = [
        ...fcmTokens.map(({ token, platform }) => async () => {
            if (!accessToken) { failCount++; return; }
            const res = await fetch(FCM_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: buildFCMMessage(token, platform, notif.title, notif.body, notif.image_url, deepLinkData) }),
            });
            if (res.ok) { successCount++; } else { failCount++; }
        }),
        ...apnsTokens.map(({ token }) => async () => {
            if (!apnsJwt) { failCount++; return; }
            const res = await sendApns(token, notif.title, notif.body, deepLinkData, apnsJwt, 'com.tafsirkurd.app');
            if (res.ok) { successCount++; } else { failCount++; }
        }),
    ];
    for (let i = 0; i < allJobs.length; i += CHUNK) {
        await Promise.allSettled(allJobs.slice(i, i + CHUNK).map(fn => fn()));
    }
    return { sent: successCount, failed: failCount, total: tokens.length };
}

async function getTokensForAudience(env, audience, platform) {
    // ORDER BY id ASC is critical for multi-batch sends: it makes the token list stable
    // across repeated calls within the same cron run. Without it, Postgres heap order can
    // shift between calls, causing a token to appear in two batch slices (duplicate send)
    // or fall through the gap between slices (missed send).
    let url = `${env.SUPABASE_URL}/rest/v1/push_tokens?select=token,platform&order=id.asc`;

    // Platform filter (from notification's platform field)
    if (platform === 'android') url += '&platform=eq.android';
    else if (platform === 'ios') url += '&platform=eq.ios';

    // Audience filter
    if (audience.startsWith('user:')) url += '&user_id=eq.' + audience.slice(5);
    else if (audience === 'authenticated') url += '&user_id=not.is.null';
    else if (audience === 'unauthenticated') url += '&user_id=is.null';
    else if (audience === 'android') url += '&platform=eq.android';
    else if (audience === 'ios') url += '&platform=eq.ios';

    // Paginate — Supabase returns at most 1000 rows by default; fetch all pages
    const PAGE = 1000;
    const allTokens = [];
    for (let offset = 0; ; offset += PAGE) {
        const pageUrl = url + `&limit=${PAGE}&offset=${offset}`;
        const res = await fetch(pageUrl, {
            headers: {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
        });
        if (!res.ok) throw new Error(`Supabase ${res.status}`);
        const page = await res.json();
        allTokens.push(...page);
        if (page.length < PAGE) break;
    }
    return allTokens;
}

async function removeStaleTokens(env, tokens) {
    const inList = tokens.map(t => `"${t}"`).join(',');
    await fetch(`${env.SUPABASE_URL}/rest/v1/push_tokens?token=in.(${inList})`, {
        method: 'DELETE',
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'return=minimal',
        },
    });
}

function buildDeepLinkData(type, id) {
    if (!type || type === 'none') return {};
    const d = { type };
    if (id) d.id = String(id);
    return d;
}

function buildFCMMessage(token, platform, title, body, imageUrl, data) {
    const msg = {
        token,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };
    if (imageUrl) {
        if (platform === 'android') {
            msg.android = {
                priority: 'high',
                notification: {
                    icon: 'ic_notification',
                    color: '#1f5f4a',
                    image: imageUrl,
                },
            };
        } else if (platform === 'ios') {
            msg.apns = {
                payload: { aps: { badge: 1, sound: 'default' } },
                fcm_options: { image: imageUrl },
            };
        }
    } else {
        if (platform === 'android') {
            msg.android = {
                priority: 'high',
                notification: { icon: 'ic_notification', color: '#1f5f4a' },
            };
        } else if (platform === 'ios') {
            msg.apns = { payload: { aps: { badge: 1, sound: 'default' } } };
        }
    }
    return msg;
}

// ── FCM OAuth2 (Cloudflare-compatible, no googleapis) ────────────────

async function getFCMAccessToken(serviceAccountJson) {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    const headerB64 = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimB64 = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now, exp: now + 3600,
    }));
    const sigInput = `${headerB64}.${claimB64}`;
    const key = await importRSAKey(sa.private_key);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
    const jwt = `${sigInput}.${b64urlRaw(sig)}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const d = await res.json();
    if (!d.access_token) throw new Error(JSON.stringify(d));
    return d.access_token;
}

function b64url(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function b64urlRaw(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function pemToDer(pem) {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}
// Returns the next ISO timestamp for a recurring notification
function nextOccurrence(recurrence, recurrenceDay, scheduledAt) {
    const now = new Date();
    // Preserve the original HH:MM from the notification's scheduled_at
    const refTime = scheduledAt ? new Date(scheduledAt) : null;
    const h = refTime ? refTime.getUTCHours() : 9;
    const m = refTime ? refTime.getUTCMinutes() : 0;
    if (recurrence === 'daily') {
        const next = new Date(now);
        next.setUTCDate(next.getUTCDate() + 1);
        next.setUTCHours(h, m, 0, 0);
        return next.toISOString();
    }
    if (recurrence === 'weekly' && recurrenceDay != null) {
        const next = new Date(now);
        const currentDay = next.getUTCDay();
        let daysUntil = (recurrenceDay - currentDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7;
        next.setUTCDate(next.getUTCDate() + daysUntil);
        next.setUTCHours(h, m, 0, 0);
        return next.toISOString();
    }
    return null;
}

async function importRSAKey(pem) {
    return crypto.subtle.importKey('pkcs8', pemToDer(pem),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

// ── APNs direct delivery (for raw iOS device tokens) ────────────────

function isApnsToken(token) {
    // Raw APNs device tokens are exactly 64 lowercase hex characters
    return /^[0-9a-f]{64}$/i.test(token);
}

async function importECKey(pem) {
    return crypto.subtle.importKey('pkcs8', pemToDer(pem),
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function getAPNsJWT(keyP8, keyId, teamId) {
    const key = await importECKey(keyP8);
    const now = Math.floor(Date.now() / 1000);
    const header  = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
    const payload = b64url(JSON.stringify({ iss: teamId, iat: now }));
    const sigInput = `${header}.${payload}`;
    const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new TextEncoder().encode(sigInput)
    );
    return `${sigInput}.${b64urlRaw(sig)}`;
}

async function sendApns(deviceToken, title, body, extraData, jwt, bundleId) {
    const apsPayload = {
        aps: { alert: { title, body }, badge: 1, sound: 'default' },
        ...extraData,
    };
    return fetch(`https://api.push.apple.com/3/device/${deviceToken}`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${jwt}`,
            'apns-topic': bundleId,
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'content-type': 'application/json',
        },
        body: JSON.stringify(apsPayload),
    });
}
