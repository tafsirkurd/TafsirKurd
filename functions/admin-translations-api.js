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
            .select('user_id, admin_users(role, full_name, email)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session?.admin_users) return json({ error: 'Unauthorized' }, 403, corsHeaders);

        const role = session.admin_users.role;
        const userId = session.user_id;

        // super_admin and editor always have write access
        // custom role: check admin_permissions for translations page with can_edit
        if (role !== 'super_admin' && role !== 'editor') {
            if (role === 'custom') {
                const { data: perm } = await supabase
                    .from('admin_permissions')
                    .select('can_edit')
                    .eq('user_id', userId)
                    .eq('page_slug', 'translations')
                    .single();
                if (!perm?.can_edit) return json({ error: 'Write access denied' }, 403, corsHeaders);
            } else {
                return json({ error: 'Write access denied' }, 403, corsHeaders);
            }
        }

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

        // ── DELETE one row by numeric ID + permanently block its key_id ──
        if (action === 'delete') {
            const { id } = body;
            if (!id) return json({ error: 'id required' }, 400, corsHeaders);

            // Fetch key_id before deleting so we can block it
            const { data: row } = await supabase
                .from('kurdish_translations')
                .select('key_id')
                .eq('id', id)
                .single();

            const { error } = await supabase.from('kurdish_translations').delete().eq('id', id);
            if (error) return json({ error: error.message }, 500, corsHeaders);

            // Block key_id so import can never re-insert it
            if (row?.key_id) {
                await supabase.from('deleted_translation_keys')
                    .upsert({ key_id: row.key_id }, { onConflict: 'key_id' });
            }

            return json({ success: true });
        }

        // ── DELETE multiple rows by key_id list ───────────────────────────
        if (action === 'delete_by_keys') {
            const { key_ids } = body;
            if (!Array.isArray(key_ids) || !key_ids.length) return json({ error: 'key_ids required' }, 400, corsHeaders);

            const { error } = await supabase.from('kurdish_translations').delete().in('key_id', key_ids);
            if (error) return json({ error: error.message }, 500, corsHeaders);

            // Block all deleted keys so import never re-inserts them
            const blocks = key_ids.map(function(k) { return { key_id: k }; });
            await supabase.from('deleted_translation_keys').upsert(blocks, { onConflict: 'key_id' });

            return json({ success: true, deleted: key_ids.length });
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

        // ── LOG admin activity ────────────────────────────────────────────
        if (action === 'log_activity') {
            const { action_type, description } = body;
            if (!action_type || !description) return json({ error: 'action_type and description required' }, 400, corsHeaders);
            const adminName = session.admin_users?.full_name || session.admin_users?.email || 'Admin';
            const { error } = await supabase.from('admin_activity_log')
                .insert({ admin_name: adminName, action_type, description });
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        // ── SET badge_until on any gencine content row ────────────────────
        if (action === 'set_badge') {
            const ALLOWED = ['gencine_hadiths','gencine_duas','gencine_adhkar','gencine_books','gencine_sections'];
            const { table, id, badge_until } = body;
            if (!table || !ALLOWED.includes(table)) return json({ error: 'invalid table' }, 400, corsHeaders);
            if (!id) return json({ error: 'id required' }, 400, corsHeaders);
            const { error } = await supabase.from(table).update({ badge_until: badge_until || null }).eq('id', id);
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        return json({ error: 'Unknown action' }, 400, corsHeaders);

    } catch (err) {
        console.error('admin-translations error:', err);
        return json({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

function json(data, status = 200, headers = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
}) {
    return new Response(JSON.stringify(data), { status, headers });
}
