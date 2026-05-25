/**
 * Admin Prayer Data — annual static JSON fetch + GitHub commit
 *
 * POST /admin-prayer-data
 * Body:
 *   { token, action: 'fetch_city', year, city }
 *     → fetches all 12 months for city, commits src/prayer-data/{year}/{city}.json to GitHub
 *
 *   { token, action: 'fetch_month', year, city, month }
 *     → correction mode: re-fetches one month, merges into existing file
 *
 *   { token, action: 'get_status', year }
 *     → returns which city files exist in GitHub and their generatedAt timestamps
 *
 * Requires env: GITHUB_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

const REPO   = 'tafsirkurd/TafsirKurd';
const BRANCH = 'main';

const ALL_CITIES = [
    'Sulaymaniyah', 'Erbil',    'Duhok',       'Kirkuk',  'Halabja',
    'Kfry',         'Rania',    'Koya',         'Qaladze', 'Zakho',
    'Bardarash',    'Mosul',    'Darbandikhan', 'Kalar',   'Akre',
    'Daquq',        'Makhmur',  'Mandali',      'Qarahanjir', 'DuzKhormatou',
];

// ── Auth ──────────────────────────────────────────────────────────────────────

async function verifyAdmin(token, env) {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id, admin_users(role, is_active)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();
    return session?.admin_users?.is_active === true;
}

// ── GitHub helpers ────────────────────────────────────────────────────────────

async function ghGet(path, ghToken) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
        headers: {
            'Accept':               'application/vnd.github.v3+json',
            'Authorization':        `Bearer ${ghToken}`,
            'User-Agent':           'TafsirKurd-Admin/1.0',
            'X-GitHub-Api-Version': '2022-11-28',
        }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('GitHub GET ' + res.status);
    return res.json();
}

async function ghPut(path, content, message, sha, ghToken) {
    const body = {
        message,
        content: btoa(unescape(encodeURIComponent(content))), // utf-8 → base64
        branch:  BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
        method:  'PUT',
        headers: {
            'Accept':               'application/vnd.github.v3+json',
            'Authorization':        `Bearer ${ghToken}`,
            'User-Agent':           'TafsirKurd-Admin/1.0',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type':         'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error('GitHub PUT ' + res.status + ': ' + err.slice(0, 200));
    }
    return res.json();
}

// ── Prayer fetch ──────────────────────────────────────────────────────────────

async function fetchMonthFromWorker(city, year, month, workerBase) {
    const url = workerBase + '/prayer-kurd?city=' + encodeURIComponent(city) +
                '&year=' + year + '&month=' + month;
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 20000);
    let res;
    try { res = await fetch(url, { signal: ctrl.signal }); }
    finally { clearTimeout(tid); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const count = Object.keys(data.days || {}).length;
    if (count < 20) throw new Error('only ' + count + ' days');
    return data.days;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Actions ───────────────────────────────────────────────────────────────────

async function actionFetchCity(year, city, env) {
    const workerBase = 'https://tafsirkurd.com';
    const ghPath     = 'src/prayer-data/' + year + '/' + city + '.json';

    // Fetch existing file from GitHub (to get SHA for update + merge)
    const existing = await ghGet(ghPath, env.GITHUB_TOKEN);
    let existingMonths = {};
    let existingSha    = null;
    if (existing) {
        existingSha = existing.sha;
        try {
            const decoded = decodeURIComponent(escape(atob(existing.content.replace(/\n/g, ''))));
            existingMonths = JSON.parse(decoded).months || {};
        } catch(e) { /* start fresh if parse fails */ }
    }

    // Fetch all 12 months
    const freshMonths = {};
    const errors      = [];
    for (let month = 1; month <= 12; month++) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                freshMonths[month] = await fetchMonthFromWorker(city, year, month, workerBase);
                break;
            } catch(e) {
                if (attempt === 3) errors.push(month + ': ' + e.message);
                else await sleep(2000 * attempt);
            }
        }
        await sleep(500);
    }

    const okCount = Object.keys(freshMonths).length;
    if (okCount === 0) throw new Error('all months failed for ' + city);

    const merged = {
        city,
        year,
        generatedAt: Date.now(),
        months: { ...existingMonths, ...freshMonths },
    };

    const json    = JSON.stringify(merged);
    const message = 'data(prayer): ' + year + ' ' + city + ' — ' + okCount + '/12 months via admin';
    await ghPut(ghPath, json, message, existingSha, env.GITHUB_TOKEN);

    return { city, ok: okCount, failed: errors };
}

async function actionFetchMonth(year, city, month, env) {
    const workerBase = 'https://tafsirkurd.com';
    const ghPath     = 'src/prayer-data/' + year + '/' + city + '.json';

    const existing = await ghGet(ghPath, env.GITHUB_TOKEN);
    let existingMonths = {};
    let existingSha    = null;
    if (existing) {
        existingSha = existing.sha;
        try {
            const decoded = decodeURIComponent(escape(atob(existing.content.replace(/\n/g, ''))));
            existingMonths = JSON.parse(decoded).months || {};
        } catch(e) {}
    }

    const days = await fetchMonthFromWorker(city, year, month, workerBase);
    existingMonths[month] = days;

    const merged = {
        city,
        year,
        generatedAt: Date.now(),
        months: existingMonths,
    };

    const json    = JSON.stringify(merged);
    const message = 'data(prayer): correction ' + city + '/' + month + '/' + year + ' via admin';
    await ghPut(ghPath, json, message, existingSha, env.GITHUB_TOKEN);

    return { city, month, days: Object.keys(days).length };
}

async function actionGetStatus(year, env) {
    const results = await Promise.allSettled(
        ALL_CITIES.map(async city => {
            const ghPath = 'src/prayer-data/' + year + '/' + city + '.json';
            const file   = await ghGet(ghPath, env.GITHUB_TOKEN);
            if (!file) return { city, exists: false };
            try {
                const decoded = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))));
                const data    = JSON.parse(decoded);
                return {
                    city,
                    exists:      true,
                    generatedAt: data.generatedAt || 0,
                    months:      Object.keys(data.months || {}).length,
                };
            } catch(e) {
                return { city, exists: true, parseError: true };
            }
        })
    );
    return results.map((r, i) => r.status === 'fulfilled' ? r.value : { city: ALL_CITIES[i], error: r.reason?.message });
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return resp(null, 204);
    if (request.method !== 'POST')    return resp({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); } catch { return resp({ error: 'Invalid JSON' }, 400); }

    const token = ((request.headers.get('Authorization') || '').replace('Bearer ', '') || body.token || '').trim();
    if (!token)                            return resp({ error: 'No token' }, 401);
    if (!await verifyAdmin(token, env))    return resp({ error: 'Unauthorized' }, 403);
    if (!env.GITHUB_TOKEN)                 return resp({ error: 'GITHUB_TOKEN not configured' }, 500);

    const { action, year, city, month } = body;

    if (!year || year < 2024 || year > 2035) return resp({ error: 'Invalid year' }, 400);

    try {
        if (action === 'get_status') {
            const status = await actionGetStatus(year, env);
            return resp({ success: true, year, status });
        }

        if (action === 'fetch_city') {
            if (!city || !ALL_CITIES.includes(city)) return resp({ error: 'Unknown city: ' + city }, 400);
            const result = await actionFetchCity(year, city, env);
            return resp({ success: true, ...result });
        }

        if (action === 'fetch_month') {
            if (!city || !ALL_CITIES.includes(city)) return resp({ error: 'Unknown city: ' + city }, 400);
            const m = parseInt(month);
            if (!m || m < 1 || m > 12) return resp({ error: 'Invalid month' }, 400);
            const result = await actionFetchMonth(year, city, m, env);
            return resp({ success: true, ...result });
        }

        return resp({ error: 'Unknown action: ' + action }, 400);
    } catch(e) {
        return resp({ error: String(e.message || e) }, 500);
    }
}

function resp(data, status) {
    return new Response(data == null ? '' : JSON.stringify(data), {
        status: status || 200,
        headers: CORS,
    });
}
