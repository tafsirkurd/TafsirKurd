// Cloudflare Pages Function - App Translations Endpoint
// Returns translations for Android/iOS apps as flat JSON { "key": "value" }

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform') || 'android';

    const allowedPlatforms = ['android', 'ios', 'web'];
    if (!allowedPlatforms.includes(platform)) {
        return new Response(JSON.stringify({ error: 'Invalid platform' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const origin = request.headers.get('Origin') || '';
    // Note: translations are public content. The Origin/Referer check below is a
    // weak advisory CORS hint only — it is not a security boundary since these
    // headers are spoofable from non-browser clients. Real access control is not
    // required here because translations contain no sensitive data.
    const allowedDomains = ['tafsirkurd.com', 'localhost', '127.0.0.1'];
    const isCapacitor = origin === 'capacitor://localhost' || origin === 'https://localhost';
    const referer = request.headers.get('Referer') || '';
    const isAllowed = allowedDomains.some(d => origin.includes(d) || referer.includes(d));

    if (!isAllowed && !isCapacitor) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': origin || 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        // 5-minute edge cache + 1-hour stale-while-revalidate + 24-hour stale-if-error.
        // stale-if-error: when Supabase is unreachable or CF kills the function (503),
        // the edge cache serves the last-known-good response instead of propagating
        // the error to the browser. Eliminates "Failed to load resource: 503" console
        // errors during transient Supabase downtime or CF cold-start race conditions.
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
        const supabaseKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, '');

        if (!supabaseUrl || !supabaseKey) {
            return new Response(JSON.stringify({ error: 'Config error' }), {
                status: 500, headers: corsHeaders
            });
        }

        // Global deadline — Promise.race ensures a response is always sent within
        // 10 seconds even if the AbortController signal doesn't propagate correctly
        // in this CF Workers runtime (known issue: signal may not abort a hung fetch).
        // ERR_CONNECTION_CLOSED is caused by CF killing the worker at its wall-clock
        // limit before we can send any response — this prevents that.
        const globalDeadline = new Promise((_, reject) =>
            setTimeout(() => {
                const e = new Error('global_timeout');
                e.name = 'AbortError';
                reject(e);
            }, 10000)
        );

        // Fetch ALL translations across every page/category (paginated — Supabase max 1000/batch).
        // We intentionally do NOT filter by `page` here: the admin panel stores keys under
        // page values like 'android', 'index', 'bookmarks', 'goals', 'islamvoice', etc.
        // Filtering by platform meant 642/1000 records were never returned, so admin edits
        // to those keys never reached the app. All keys share one Kurdish language — every
        // client receives everything and the i18n system merges on top of kmr.json.
        const BATCH = 1000;
        const dbHeaders = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };

        const fetchAllRows = async () => {
            let rows = [];
            let offset = 0;
            while (true) {
                // Per-batch AbortController (4s) as inner safety.
                // The outer Promise.race (10s global) is the real guard against hung workers.
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 4000);
                let res;
                try {
                    res = await fetch(
                        `${supabaseUrl}/rest/v1/kurdish_translations?select=key_id,kurdish_text&limit=${BATCH}&offset=${offset}`,
                        { headers: dbHeaders, signal: controller.signal }
                    );
                } finally {
                    clearTimeout(tid);
                }

                if (!res.ok) {
                    const err = new Error('db_error');
                    err.isDbError = true;
                    throw err;
                }

                const batch = await res.json();
                rows = rows.concat(batch);
                if (batch.length < BATCH) break;
                offset += BATCH;
            }
            return rows;
        };

        const rows = await Promise.race([fetchAllRows(), globalDeadline]);

        // Convert to flat { "key": "value" } format for i18n.js
        const translations = {};
        for (const row of rows) {
            translations[row.key_id] = row.kurdish_text;
        }

        return new Response(JSON.stringify(translations), {
            status: 200, headers: corsHeaders
        });
    } catch (error) {
        const isTimeout = error && error.name === 'AbortError';
        const isDbError = error && error.isDbError;
        console.error('app-translations error:', isTimeout ? 'timeout' : isDbError ? 'DB error' : error);
        if (isDbError) {
            return new Response(JSON.stringify({ error: 'DB error' }), {
                status: 502, headers: corsHeaders
            });
        }
        return new Response(JSON.stringify({ error: isTimeout ? 'timeout' : 'Internal error' }), {
            status: isTimeout ? 504 : 500, headers: corsHeaders
        });
    }
}
