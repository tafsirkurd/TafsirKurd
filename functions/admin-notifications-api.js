// Admin Notifications API — full CRUD + FCM send
// Actions: list, get, create, update, send, cancel, delete, duplicate, get_stats, get_token_count
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

    // ── PROCESS SCHEDULED (cron secret OR valid admin session) ──
    if (body.action === 'process_scheduled') {
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

        const { data: due } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('status', 'scheduled')
            .eq('is_template', false)
            .lte('scheduled_at', new Date().toISOString())
            .limit(20);

        if (!due?.length) return json({ success: true, processed: 0 });

        const results = [];
        for (const notif of due) {
            try {
                // Atomically claim the notification (prevent double-send)
                const { data: claimed } = await supabase
                    .from('admin_notifications')
                    .update({ status: 'sending' })
                    .eq('id', notif.id)
                    .eq('status', 'scheduled')
                    .select()
                    .single();
                if (!claimed) continue; // already claimed by another run

                const r = await doSend(supabase, env, notif, notif.id, 'cron');
                results.push({ id: notif.id, ...r });
            } catch (e) {
                try { await supabase.from('admin_notifications')
                    .update({ status: 'failed', error_message: 'Cron error: ' + e.message })
                    .eq('id', notif.id); } catch (_) {}
                results.push({ id: notif.id, error: e.message });
            }
        }
        return json({ success: true, processed: results.length, results });
    }

    // ── AUTO-NOTIFY NEW CONTENT (cron — no admin auth) ────────────
    if (body.action === 'auto_notify_content') {
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
        const autoBookBody           = tx['notif.auto_book_body']            || 'پەرتووکەکا نوو د تەفسیر کورد دا یا بەردەستە. نوکە بخوینە.';
        const autoBookTitleFallback  = tx['notif.auto_book_title_fallback']  || 'کتێبێ نوی';
        const autoHadithBody         = tx['notif.auto_hadith_body']          || 'فەرموودەکا نوو د تەفسیر کورد دا یا بەردەستە. نوکە بخوینە.';
        const autoHadithTitleFallback= tx['notif.auto_hadith_title_fallback']|| 'حەدیس';

        // Insert a notification and either send immediately (no scheduledAt) or
        // save as scheduled for a future PM slot (scheduledAt provided).
        // The unique index on (deep_link_type, deep_link_id) deduplicates across runs.
        async function sendAutoNotif(title, body, image_url, dlType, dlId, scheduledAt) {
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
                    status:         scheduledAt ? 'scheduled' : 'sending',
                    scheduled_at:   scheduledAt || null,
                    created_by:     'auto',
                })
                .select()
                .single();
            if (error?.code === '23505') return { skipped: true }; // already notified
            if (error || !notif) return { error: error?.message || 'insert failed' };
            if (scheduledAt) return { scheduled: true, scheduled_at: scheduledAt };
            return await doSend(supabase, env, notif, notif.id, 'auto');
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
            .select('id,title,thumbnail_url,created_at,islamvoice_series(name_ku)')
            .eq('is_published', true)
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false });

        for (const ep of (episodes || [])) {
            const seriesName = ep.islamvoice_series?.name_ku || ep.title;
            const r = await assignAndSend(seriesName, ep.title, ep.thumbnail_url, 'video', ep.id, 'video');
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

    const { action } = body;

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
                scheduled_at, recurrence, recurrence_day, notes, is_template } = body;

        if (!title || !msgBody) return json({ error: 'title and body required' }, 400);

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
                scheduled_at, recurrence, recurrence_day, notes, is_template } = body;

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
        if (notif.status === 'cancelled') return json({ error: 'Cannot send cancelled notification' }, 400);
        if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID) return json({ error: 'FCM not configured' }, 503);

        let trackingId = body.id;
        if (notif.is_template) {
            const { data: copy } = await supabase.from('admin_notifications').insert({
                title: notif.title, body: notif.body, image_url: notif.image_url,
                platform: notif.platform, audience: notif.audience,
                deep_link_type: notif.deep_link_type, deep_link_id: notif.deep_link_id,
                recurrence: notif.recurrence, recurrence_day: notif.recurrence_day,
                notes: notif.notes, created_by: adminEmail,
                status: 'sending', is_template: false,
            }).select().single();
            if (!copy) return json({ error: 'Failed to create send record' }, 500);
            trackingId = copy.id;
        } else {
            await supabase.from('admin_notifications').update({ status: 'sending' }).eq('id', body.id);
        }

        const r = await doSend(supabase, env, notif, trackingId, adminEmail);
        if (r.error) return json({ error: r.error }, 500);
        return json({ success: true, sent: r.sent, failed: r.failed, total: r.total,
                      stale_removed: r.stale_removed, next_scheduled: notif.recurrence !== 'none' });
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

    if (!tokens.length) {
        await supabase.from('admin_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString(),
                      tokens_targeted: 0, tokens_sent: 0, tokens_failed: 0, stale_removed: 0 })
            .eq('id', trackingId);
        return { sent: 0, failed: 0, total: 0, stale_removed: 0 };
    }

    const apnsTokens = tokens.filter(t => isApnsToken(t.token));
    const fcmTokens  = tokens.filter(t => !isApnsToken(t.token));

    let accessToken = null;
    if (fcmTokens.length && env.FCM_SERVICE_ACCOUNT) {
        try { accessToken = await getFCMAccessToken(env.FCM_SERVICE_ACCOUNT); }
        catch (e) {
            if (!apnsTokens.length) {
                await supabase.from('admin_notifications')
                    .update({ status: 'failed', error_message: 'FCM auth: ' + e.message })
                    .eq('id', trackingId);
                return { error: 'FCM auth error: ' + e.message };
            }
        }
    }

    let apnsJwt = null, apnsJwtError = null;
    if (apnsTokens.length && env.APNS_KEY_P8) {
        try { apnsJwt = await getAPNsJWT(env.APNS_KEY_P8, env.APNS_KEY_ID || 'KLG2RRCRNR', env.APNS_TEAM_ID || '8KA7UDSC9D'); }
        catch (e) { apnsJwtError = 'APNs JWT: ' + e.message; }
    }

    const deepLinkData = buildDeepLinkData(notif.deep_link_type, notif.deep_link_id);
    const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
    const staleTokens = [], apnsErrors = [], fcmErrors = [];
    let successCount = 0, failCount = 0;

    // Send in chunks of 200 to stay within Cloudflare's 1000-subrequest limit
    const CHUNK = 200;
    const allJobs = [
        ...fcmTokens.map(({ token, platform }) => async () => {
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
        }),
        ...apnsTokens.map(({ token }) => async () => {
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
        }),
    ];
    for (let i = 0; i < allJobs.length; i += CHUNK) {
        await Promise.allSettled(allJobs.slice(i, i + CHUNK).map(fn => fn()));
    }

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

async function getTokensForAudience(env, audience, platform) {
    let url = `${env.SUPABASE_URL}/rest/v1/push_tokens?select=token,platform`;

    // Platform filter (from notification's platform field)
    if (platform === 'android') url += '&platform=eq.android';
    else if (platform === 'ios') url += '&platform=eq.ios';

    // Audience filter
    if (audience.startsWith('user:')) url += '&user_id=eq.' + audience.slice(5);
    else if (audience === 'authenticated') url += '&user_id=not.is.null';
    else if (audience === 'unauthenticated') url += '&user_id=is.null';
    else if (audience === 'android') url += '&platform=eq.android';
    else if (audience === 'ios') url += '&platform=eq.ios';

    // Max 10k tokens
    url += '&limit=10000';

    const res = await fetch(url, {
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return await res.json();
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
