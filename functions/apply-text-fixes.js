// Unauthenticated endpoint — applies versioned hardcoded text corrections to the DB.
// Safe to call from any client: only writes pre-approved key→value pairs.
// Version-gated in site_settings so the DB update runs exactly once.

import { createClient } from '@supabase/supabase-js';

// Bump this string whenever new corrections are added.
const FIXES_VERSION = '20260531b';

// Keys whose DB values drifted from the intended Kurdish text.
const CORRECTIONS = [
    { key_id: 'dl.manage',              kurdish_text: 'دابەزاندن' },
    { key_id: 'dl.nothing_downloaded',  kurdish_text: 'چ دابەزاندن نینن' },
    { key_id: 'dl.nothing_hint',        kurdish_text: 'پەرتووک و دەنگان دابەزینە بۆ خواندنا بێ ئینتەرنێت' },
    { key_id: 'prayer.marked_done',     kurdish_text: 'تەمام بوو ✓' },
    { key_id: 'schedule_thursday_topic', kurdish_text: 'صەڵەوات و سورەتا (الکهف)' },
    { key_id: 'schedule_thursday_desc',  kurdish_text: 'ناڤەڕۆکەکا تایبەت یا صەڵەواتان، ڕیلزێن سورەتا الکهف، کو دبیتە بیرئینان بۆ خواندنا وێ - (سونەت) نەریتێن پیرۆز یێن پێنجشەمبێ.' },
];

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST')    return json({ error: 'POST only' }, 405);

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
        return json({ error: 'config error' }, 500);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Skip if this version was already applied
    const { data: setting } = await supabase
        .from('site_settings').select('value')
        .eq('key', 'text_fixes_applied_v').maybeSingle();

    if (setting?.value === FIXES_VERSION)
        return json({ success: true, skipped: 'already_applied', version: FIXES_VERSION });

    // Apply each correction (only touches rows that exist)
    const results = await Promise.all(
        CORRECTIONS.map(fix =>
            supabase.from('kurdish_translations')
                .update({ kurdish_text: fix.kurdish_text })
                .eq('key_id', fix.key_id)
        )
    );

    const errors = results.filter(r => r.error).length;

    // Mark version as applied so subsequent calls are instant no-ops
    await supabase.from('site_settings')
        .upsert({ key: 'text_fixes_applied_v', value: FIXES_VERSION }, { onConflict: 'key' });

    return json({ success: true, applied: CORRECTIONS.length - errors, errors, version: FIXES_VERSION });
}
