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

    let body;
    try {
        body = await request.json();
    } catch (_) {
        return json({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }
    const { action } = body;

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('admin-translations-api: missing env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        return json({ error: 'Server config error', action: action || null }, 500, corsHeaders);
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {

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
            const { error } = await supabase.from('kurdish_translations').update({ ...fields, manually_edited: true }).eq('id', id);
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        // ── INSERT one row — returns inserted row ─────────────────────────
        if (action === 'insert') {
            const { fields } = body;
            if (!fields) return json({ error: 'fields required' }, 400, corsHeaders);
            const { data, error } = await supabase
                .from('kurdish_translations').insert([{ ...fields, manually_edited: true }]).select().single();
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

            // Block deleted keys so import never re-inserts them (best-effort — table may not exist)
            try {
                const blocks = key_ids.map(k => ({ key_id: k }));
                await supabase.from('deleted_translation_keys').upsert(blocks, { onConflict: 'key_id' });
            } catch (_) {}

            return json({ success: true, deleted: key_ids.length });
        }

        // ── UPSERT by key_id ──────────────────────────────────────────────
        // force:true  → always write (admin panel edits)
        // force:false → skip if row already has a non-empty kurdish_text (bulk scripts)
        if (action === 'upsert_by_key') {
            const { key_id, kurdish_text, page, context } = body;
            const force = body.force !== false; // default true; bulk scripts pass force:false
            if (!key_id) return json({ error: 'key_id required' }, 400, corsHeaders);

            // Always block permanently-deleted keys
            const { data: blocked } = await supabase
                .from('deleted_translation_keys').select('key_id').eq('key_id', key_id).maybeSingle();
            if (blocked) return json({ success: true, skipped: 'deleted_key' });

            // If not forced, skip rows that already have a non-empty translation
            if (!force) {
                const { data: existing } = await supabase
                    .from('kurdish_translations').select('kurdish_text').eq('key_id', key_id).maybeSingle();
                if (existing?.kurdish_text?.trim()) return json({ success: true, skipped: 'already_translated' });
            }

            const { error } = await supabase.from('kurdish_translations')
                .upsert({
                    key_id,
                    kurdish_text: kurdish_text || '',
                    context: context || '',
                    page: page || 'about',
                    category: body.category || 'general',
                    manually_edited: force ? true : undefined
                }, { onConflict: 'key_id' });
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

        // ── BULK INSERT many rows (never overwrites existing translations) ──
        if (action === 'bulk_insert') {
            const { rows } = body;
            if (!Array.isArray(rows) || rows.length === 0)
                return json({ error: 'rows array required' }, 400, corsHeaders);
            // Use upsert with ignoreDuplicates so existing rows are never touched
            const { error } = await supabase.from('kurdish_translations')
                .upsert(rows, { onConflict: 'key_id', ignoreDuplicates: true });
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true, count: rows.length });
        }

        // ── BULK UPDATE by key_id (page/category fixes) ───────────────────
        if (action === 'bulk_update_by_key') {
            const { items } = body; // [{ key_id, fields }]
            if (!Array.isArray(items) || items.length === 0)
                return json({ error: 'items array required' }, 400, corsHeaders);
            const results = await Promise.all(items.map(item =>
                supabase.from('kurdish_translations').update({ ...item.fields, manually_edited: true }).eq('key_id', item.key_id)
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

        // ── VALIDATE translations before publish ──────────────────────────
        // Checks critical keys for empty values and structural issues.
        // Returns { valid: bool, errors: [], warnings: [] } — never writes.
        if (action === 'validate_translations') {
            const { platform } = body; // optional — filter by page

            // Keys that MUST exist in the DB with a non-empty value.
            // Only include keys confirmed to exist in kmr-bundled.js (bundle-verified).
            // Keys that are bundled-only and never stored in the DB are not listed here —
            // missing from DB + covered by bundle = not broken, not an error.
            const CRITICAL_DB_KEYS = [
                'tabs.quran','tabs.video','tabs.settings',
                'tabs.goals','tabs.bookmarks',
                'header.gencine',
                'iv.loading'
            ];

            let query = supabase.from('kurdish_translations').select('key_id, kurdish_text, page');
            if (platform) query = query.eq('page', platform);
            const { data: rows, error: qErr } = await query;
            if (qErr) return json({ error: qErr.message }, 500, corsHeaders);

            const keyMap = Object.fromEntries((rows || []).map(r => [r.key_id, r.kurdish_text]));
            const errors = [], warnings = [];

            // Error: critical DB key is present but empty (bundled covers missing, not empty)
            for (const k of CRITICAL_DB_KEYS) {
                if (k in keyMap && (!keyMap[k] || !keyMap[k].trim())) {
                    errors.push({ key: k, issue: 'empty' });
                }
                // Not in DB at all = bundled covers it = warning only
                if (!(k in keyMap)) {
                    warnings.push({ key: k, issue: 'db_missing_covered_by_bundle' });
                }
            }

            // Error: any row where value literally equals the key (raw key leaked into DB)
            // Error: any row with obviously corrupted value
            for (const row of (rows || [])) {
                const v = row.kurdish_text;
                if (v === row.key_id) {
                    errors.push({ key: row.key_id, issue: 'value_equals_key' });
                } else if (v && (v.includes('[object') || v.includes('undefined'))) {
                    errors.push({ key: row.key_id, issue: 'corrupted_value', value: v.slice(0, 60) });
                } else if (!v || !v.trim()) {
                    warnings.push({ key: row.key_id, issue: 'empty_value' });
                }
            }

            return json({
                success: true,
                valid: errors.length === 0,
                total_keys: (rows || []).length,
                errors,
                warnings: warnings.slice(0, 50)
            });
        }

        // ── BUMP i18n cache version (force all apps to clear translation cache) ─
        // Also records i18n_last_published_at so dashboard can show it.
        if (action === 'bump_i18n_version') {
            const newVersion = String(Date.now());
            const publishedAt = new Date().toISOString();

            const [vErr, tErr] = await Promise.all([
                supabase.from('site_settings')
                    .upsert({ key: 'i18n_cache_version', value: newVersion }, { onConflict: 'key' })
                    .then(r => r.error),
                supabase.from('site_settings')
                    .upsert({ key: 'i18n_last_published_at', value: publishedAt }, { onConflict: 'key' })
                    .then(r => r.error)
            ]);

            if (vErr || tErr) return json({ error: (vErr || tErr).message }, 500, corsHeaders);

            // Log activity
            const adminName = session.admin_users?.full_name || session.admin_users?.email || 'Admin';
            await supabase.from('admin_activity_log').insert({
                admin_name: adminName,
                action_type: 'i18n_version_bump',
                description: 'i18n cache version bumped to ' + newVersion + ' — all devices will clear translation cache'
            });

            return json({ success: true, version: newVersion, published_at: publishedAt });
        }

        // ── SET i18n health reporting enabled/disabled ────────────────────
        if (action === 'set_i18n_health_reporting') {
            const { enabled } = body;
            if (typeof enabled !== 'boolean') return json({ error: 'enabled (boolean) required' }, 400, corsHeaders);
            const { error } = await supabase.from('site_settings')
                .upsert({ key: 'i18n_health_reporting_enabled', value: enabled ? 'true' : 'false' }, { onConflict: 'key' });
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true, enabled });
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

        // ── SET featured_until on gencine_books ───────────────────────────
        if (action === 'set_featured') {
            const { id, featured_until } = body;
            if (!id) return json({ error: 'id required' }, 400, corsHeaders);
            const { error } = await supabase.from('gencine_books').update({ featured_until: featured_until || null }).eq('id', id);
            if (error) return json({ error: error.message }, 500, corsHeaders);
            return json({ success: true });
        }

        return json({ error: 'Unknown action' }, 400, corsHeaders);

    } catch (err) {
        console.error('admin-translations error [action=' + (action || '?') + ']:', err?.message || err);
        return json({ error: 'Internal server error', action: action || null, detail: err?.message || null }, 500, corsHeaders);
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
