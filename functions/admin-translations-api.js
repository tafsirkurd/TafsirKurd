// Admin Translations API — authenticated write proxy for kurdish_translations
// Uses service role key so RLS can be locked to read-only for public
import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, corsHeaders);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const body = await request.json();
        const { action } = body;

        const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim()
            || (body.token || '').trim();
        if (!token) return json({ error: 'No token' }, 401, corsHeaders);

        const { data: session } = await supabase
            .from('admin_sessions')
            .select('user_id, admin_users(role)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session?.admin_users) return json({ error: 'Unauthorized' }, 403, corsHeaders);

        const role = session.admin_users.role;
        if (role !== 'super_admin' && role !== 'editor')
            return json({ error: 'Write access denied' }, 403, corsHeaders);

        // ── UPDATE one row by numeric ID ──────────────────────────────────
        if (action === 'update') {
            const { id, fields } = body;
            if (!id || !fields) return json({ error: 'id and fields required' }, 400, corsHeaders);
            const { error } = await supabase.from('kurdish_translations').update(fields).eq('id', id);
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        // ── INSERT one row — returns inserted row ─────────────────────────
        if (action === 'insert') {
            const { fields } = body;
            if (!fields) return json({ error: 'fields required' }, 400, corsHeaders);
            const { data, error } = await supabase
                .from('kurdish_translations').insert([fields]).select().single();
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true, row: data });
        }

        // ── DELETE one row by numeric ID ──────────────────────────────────
        if (action === 'delete') {
            const { id } = body;
            if (!id) return json({ error: 'id required' }, 400, corsHeaders);
            const { error } = await supabase.from('kurdish_translations').delete().eq('id', id);
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        // ── UPSERT by key_id (about page translations) ────────────────────
        if (action === 'upsert_by_key') {
            const { key_id, kurdish_text } = body;
            if (!key_id) return json({ error: 'key_id required' }, 400, corsHeaders);
            const { error } = await supabase.from('kurdish_translations')
                .upsert({ key_id, kurdish_text: kurdish_text || '' }, { onConflict: 'key_id' });
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        // ── UPSERT site_settings (social links etc.) ──────────────────────
        if (action === 'upsert_site_setting') {
            const { key, value } = body;
            if (!key) return json({ error: 'key required' }, 400, corsHeaders);
            const { error } = await supabase.from('site_settings')
                .upsert({ key, value: value || '' }, { onConflict: 'key' });
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        // ── BULK INSERT many rows ─────────────────────────────────────────
        if (action === 'bulk_insert') {
            const { rows } = body;
            if (!Array.isArray(rows) || rows.length === 0)
                return json({ error: 'rows array required' }, 400, corsHeaders);
            const { error } = await supabase.from('kurdish_translations').insert(rows);
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true, count: rows.length });
        }

        // ── BULK UPDATE by key_id (page/category fixes) ───────────────────
        if (action === 'bulk_update_by_key') {
            const { items } = body; // [{ key_id, fields }]
            if (!Array.isArray(items) || items.length === 0)
                return json({ error: 'items array required' }, 400, corsHeaders);
            const results = await Promise.all(items.map(item =>
                supabase.from('kurdish_translations').update(item.fields).eq('key_id', item.key_id)
            ));
            const errors = results.filter(r => r.error).length;
            return json({ success: true, updated: items.length - errors, errors });
        }

        return json({ error: 'Unknown action' }, 400, corsHeaders);

    } catch (err) {
        console.error('admin-translations error:', err);
        return json({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

function json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), { status, headers });
}
