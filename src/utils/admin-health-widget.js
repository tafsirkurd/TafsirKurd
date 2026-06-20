/**
 * admin-health-widget.js
 * Injects a compact health-status strip below .page-header on every admin page.
 * Reads/writes shared cache at localStorage['admin_health_cache_v1'].
 * admin-system-health.html also writes to the same key when it runs checks.
 */
(function () {
    'use strict';
    if (window.__ahwLoaded) return;
    window.__ahwLoaded = true;

    var CACHE_KEY = 'admin_health_cache_v1';
    var CACHE_TTL = 5 * 60 * 1000; // 5 min

    // ── URL → section mapping ─────────────────────────────────────────────
    // Patterns match with or without .html extension
    var URL_MAP = [
        [/admin-notification-analytics/,       'notifications'],
        [/admin-notifications/,                'notifications'],
        [/admin-schedule/,                     'notifications'],
        [/admin-islamvoice/,                   'islamvoice'],
        [/admin-videos/,                       'islamvoice'],
        [/admin-gencine/,                      'gencine'],
        [/admin-translations/,                 'translations'],
        [/admin-features/,                     'config'],
        [/admin-updates/,                      'config'],
        [/admin-db-health/,                    'assets'],
        [/admin-errors/,                       'admin_api'],
        [/admin-jobs/,                         'admin_api'],
        [/admin-widget-health/,                'config'],
        [/admin-users/,                        'notifications'],
        [/admin-images/,                       'assets'],
        [/admin-system-health/,                null],  // IS the full dashboard — skip
    ];

    // ── Section metadata ──────────────────────────────────────────────────
    var SECTION_META = {
        notifications: {
            name: 'Notifications', name_ku: 'ئاگادارکردنەوە',
            platforms: { android: true, ios: true, web: false },
            checks: ['notif_api', 'push_tokens', 'failed_notifs']
        },
        islamvoice: {
            name: 'IslamVoice', name_ku: 'دەنگی ئیسلام',
            platforms: { android: true, ios: true, web: true },
            checks: ['iv_episodes', 'iv_series']
        },
        gencine: {
            name: 'Gencine (Books · Adhkar · Dua · Hadith)', name_ku: 'گەنجینە',
            platforms: { android: true, ios: true, web: true },
            checks: ['gencine_cats', 'gencine_duas', 'gencine_books', 'gencine_hadiths']
        },
        prayer: {
            name: 'Prayer Times', name_ku: 'کاتەکانی نوێژ',
            platforms: { android: true, ios: true, web: true },
            checks: ['prayer_json', 'prayer_api']
        },
        quran: {
            name: 'Quran / Mushaf', name_ku: 'قورئان',
            platforms: { android: true, ios: true, web: true },
            checks: ['quran_json', 'mushaf_pages', 'mushaf_fonts']
        },
        tafsir: {
            name: 'Tafsir', name_ku: 'تەفسیر',
            platforms: { android: true, ios: true, web: true },
            checks: ['tafsir_json']
        },
        audio: {
            name: 'Reciters & Audio', name_ku: 'دەنگخوێنەران',
            platforms: { android: true, ios: true, web: true },
            checks: ['audio_cache_js', 'reciter_photos']
        },
        translations: {
            name: 'Translations (i18n)', name_ku: 'وەرگێڕان',
            platforms: { android: true, ios: true, web: true },
            checks: ['kmr_json', 'kmr_bundled', 'translations_db']
        },
        smart_dhikr: {
            name: 'Smart Dhikr', name_ku: 'زیکری زیرەک',
            platforms: { android: true, ios: true, web: true },
            checks: ['smart_dhikr_js', 'dhikr_data']
        },
        config: {
            name: 'App Config', name_ku: 'ڕێکخستنی ئەپ',
            platforms: { android: true, ios: true, web: true },
            checks: ['config_endpoint', 'sw_file']
        },
        assets: {
            name: 'Core Assets', name_ku: 'فایلەکانی بنەڕەت',
            platforms: { android: true, ios: true, web: true },
            checks: ['app_js', 'hafs_font', 'fontawesome']
        },
        admin_api: {
            name: 'Admin API Functions', name_ku: 'فەنکشنەکانی ئەدمین',
            platforms: { android: false, ios: false, web: true },
            checks: ['notif_api_fn', 'db_health_fn', 'config_fn']
        }
    };

    // ── Check definitions ─────────────────────────────────────────────────
    function buildCheckDefs(sb, tok) {
        function apiFetch(endpoint, action) {
            return fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
                body: JSON.stringify({ action: action })
            });
        }
        return {
            notif_api: { name: 'Notifications API', run: async function () {
                var r = await apiFetch('/admin-notifications-api', 'get_stats');
                var d = await r.json();
                if (!d.success) throw new Error(d.error || 'API error');
                return { detail: 'API responds · ' + (d.total || 0) + ' total' };
            }},
            push_tokens: { name: 'Push tokens registered', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('push_tokens').select('id', { count: 'exact', head: true });
                if (!res.count) return { warn: true, detail: 'No device tokens registered' };
                return { detail: res.count + ' tokens registered' };
            }},
            failed_notifs: { name: 'No recent failed sends', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var ago7 = new Date(Date.now() - 7 * 86400000).toISOString();
                var res = await sb.from('admin_notifications').select('id', { count: 'exact', head: true })
                    .eq('status', 'failed').gte('created_at', ago7);
                if (res.count && res.count > 0) return { warn: true, detail: res.count + ' failed in last 7 days' };
                return { detail: 'No failures in last 7 days' };
            }},
            iv_episodes: { name: 'Episodes in DB', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('islamvoice_episodes').select('id', { count: 'exact', head: true });
                if (!res.count) return { ok: false, detail: 'No episodes found' };
                return { detail: res.count + ' episodes' };
            }},
            iv_series: { name: 'Series in DB', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('islamvoice_series').select('id', { count: 'exact', head: true });
                if (!res.count) return { ok: false, detail: 'No series found' };
                return { detail: res.count + ' series' };
            }},
            gencine_cats: { name: 'Gencine categories', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('gencine_categories').select('id', { count: 'exact', head: true });
                if (!res.count) return { ok: false, detail: 'No categories' };
                return { detail: res.count + ' categories' };
            }},
            gencine_duas: { name: 'Adhkar & Dua', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('gencine_duas').select('id', { count: 'exact', head: true });
                if (!res.count) return { ok: false, detail: 'No duas found' };
                return { detail: res.count + ' duas / adhkar' };
            }},
            gencine_books: { name: 'Books', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('gencine_books').select('id', { count: 'exact', head: true });
                if (!res.count) return { ok: false, detail: 'No books found' };
                return { detail: res.count + ' books' };
            }},
            gencine_hadiths: { name: 'Hadiths', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('gencine_hadiths').select('id', { count: 'exact', head: true });
                if (!res.count) return { ok: false, detail: 'No hadiths found' };
                return { detail: res.count + ' hadiths' };
            }},
            prayer_json: { name: 'Prayer data files', run: async function () {
                var r = await fetch('/prayer-data/2026/Erbil.json', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'Prayer JSON accessible' };
            }},
            prayer_api: { name: 'Prayer API endpoint', run: async function () {
                var r = await fetch('/prayer-kurd', { method: 'HEAD' });
                if (!r.ok && r.status !== 405) return { warn: true, detail: 'Returned ' + r.status };
                return { detail: 'Endpoint reachable' };
            }},
            quran_json: { name: 'Quran JSON data', run: async function () {
                var r = await fetch('/data/quran.json', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'quran.json accessible' };
            }},
            mushaf_pages: { name: 'Mushaf page data', run: async function () {
                var r = await fetch('/data/mushaf-v4-pages.json?v=2', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'mushaf-v4-pages.json accessible' };
            }},
            mushaf_fonts: { name: 'QCF4 font CDN', run: async function () {
                var r = await fetch('https://qpc-v4-fonts.tefsirkurd.workers.dev/QCF4001.woff2', { method: 'HEAD', mode: 'cors' }).catch(function () { return null; });
                if (!r) return { warn: true, detail: 'CDN unreachable (CORS block)' };
                if (!r.ok) return { warn: true, detail: 'CDN returned ' + r.status };
                return { detail: 'QCF4 font CDN responds' };
            }},
            tafsir_json: { name: 'Kurdish Tafsir JSON', run: async function () {
                var r = await fetch('/data/kurdish_tafsir.json', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'kurdish_tafsir.json accessible' };
            }},
            audio_cache_js: { name: 'Audio cache script', run: async function () {
                var r = await fetch('/audio-cache.js?v=20260406a', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'audio-cache.js accessible' };
            }},
            reciter_photos: { name: 'Reciter photos', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('site_settings').select('key', { count: 'exact', head: true }).like('key', 'reciter_photo_%');
                if (!res.count) return { warn: true, detail: 'No reciter photos configured' };
                return { detail: res.count + ' reciter photo(s)' };
            }},
            kmr_json: { name: 'kmr.json translation file', run: async function () {
                var r = await fetch('/i18n/kmr.json', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'kmr.json accessible' };
            }},
            kmr_bundled: { name: 'kmr-bundled.js', run: async function () {
                var r = await fetch('/i18n/kmr-bundled.js?v=20260620b', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'kmr-bundled.js accessible' };
            }},
            translations_db: { name: 'Translations in DB', run: async function () {
                if (!sb) throw new Error('Supabase not ready');
                var res = await sb.from('kurdish_translations').select('id', { count: 'exact', head: true });
                if (!res.count) return { warn: true, detail: 'No translations in DB' };
                return { detail: res.count + ' translation entries' };
            }},
            smart_dhikr_js: { name: 'smart-dhikr.js', run: async function () {
                var r = await fetch('/dhikr/smart-dhikr.js?v=88', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'smart-dhikr.js accessible' };
            }},
            dhikr_data: { name: 'Dhikr data file', run: async function () {
                var r = await fetch('/dhikr/dua-data.js?v=20260326b', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'dua-data.js accessible' };
            }},
            config_endpoint: { name: '/config endpoint', run: async function () {
                var r = await fetch('/config');
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                var d = await r.json();
                if (!d.supabaseUrl) return { warn: true, detail: 'Config missing supabaseUrl' };
                return { detail: 'Config valid' };
            }},
            sw_file: { name: 'Service worker file', run: async function () {
                var r = await fetch('/service-worker.js', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'service-worker.js accessible' };
            }},
            app_js: { name: 'app.min.js', run: async function () {
                var r = await fetch('/app/app.min.js?v=1211', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'app.min.js accessible' };
            }},
            hafs_font: { name: 'Hafs Quran font', run: async function () {
                var r = await fetch('/assets/fonts/hafs.woff2', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'hafs.woff2 accessible' };
            }},
            fontawesome: { name: 'FontAwesome icons', run: async function () {
                var r = await fetch('/assets/fontawesome/all.min.css', { method: 'HEAD' });
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'fontawesome accessible' };
            }},
            notif_api_fn: { name: 'Notifications API fn', run: async function () {
                var r = await apiFetch('/admin-notifications-api', 'get_stats');
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'admin-notifications-api responds' };
            }},
            db_health_fn: { name: 'DB Health API fn', run: async function () {
                var r = await apiFetch('/admin-db-health-api', 'get_stats');
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: 'admin-db-health-api responds' };
            }},
            config_fn: { name: 'Config function', run: async function () {
                var r = await fetch('/config');
                if (!r.ok) return { ok: false, detail: 'HTTP ' + r.status };
                return { detail: '/config responds' };
            }}
        };
    }

    // ── Cache helpers ─────────────────────────────────────────────────────
    function readCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; }
    }
    function writeCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    // ── Detect section from current URL ───────────────────────────────────
    function detectSection() {
        var path = window.location.pathname;
        for (var i = 0; i < URL_MAP.length; i++) {
            if (URL_MAP[i][0].test(path)) return URL_MAP[i][1];
        }
        return null;
    }

    // ── Run health checks for a section ──────────────────────────────────
    async function runSection(sectionId, sb, tok) {
        var meta = SECTION_META[sectionId];
        if (!meta) return null;
        var defs = buildCheckDefs(sb, tok);
        var results = [];
        for (var i = 0; i < meta.checks.length; i++) {
            var def = defs[meta.checks[i]];
            if (!def) continue;
            try {
                var r = await def.run();
                if (r && r.ok === false) {
                    results.push({ name: def.name, status: 'err',  detail: r.detail || 'Failed' });
                } else if (r && r.warn) {
                    results.push({ name: def.name, status: 'warn', detail: r.detail || 'Warning' });
                } else {
                    results.push({ name: def.name, status: 'ok',  detail: (r && r.detail) || 'OK' });
                }
            } catch (e) {
                results.push({ name: def.name, status: 'err', detail: e.message || 'Error' });
            }
        }
        var hasErr  = results.some(function (c) { return c.status === 'err'; });
        var hasWarn = results.some(function (c) { return c.status === 'warn'; });
        return { status: hasErr ? 'err' : hasWarn ? 'warn' : 'ok', checks: results, ts: Date.now() };
    }

    // ── Styles ────────────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('ahw-styles')) return;
        var s = document.createElement('style');
        s.id = 'ahw-styles';
        var css = [
            '.ahw-strip{display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
            'padding:9px 14px;background:var(--bg-surface,#1a1b2e);',
            'border:1px solid var(--border-light,rgba(255,255,255,.09));',
            'border-radius:10px;margin-bottom:18px;font-family:var(--font-family,sans-serif)}',

            '.ahw-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;',
            'padding:4px 11px;border-radius:20px;cursor:pointer;user-select:none;',
            'border:none;font-family:inherit;transition:opacity .15s}',
            '.ahw-badge:hover{opacity:.8}',

            '.ahw-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}',

            '.ahw-ok{background:rgba(16,185,129,.13);color:#059669}',
            '.ahw-ok .ahw-dot{background:#10b981}',
            '.ahw-warn{background:rgba(245,158,11,.13);color:#b45309}',
            '.ahw-warn .ahw-dot{background:#f59e0b;animation:ahw-pulse 1.2s infinite}',
            '.ahw-err{background:rgba(239,68,68,.13);color:#dc2626}',
            '.ahw-err .ahw-dot{background:#ef4444;animation:ahw-pulse .8s infinite}',
            '.ahw-idle{background:rgba(156,163,175,.13);color:#6b7280}',
            '.ahw-idle .ahw-dot{background:#9ca3af}',

            '.ahw-plats{display:flex;gap:4px;align-items:center}',
            '.ahw-chip{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;',
            'background:var(--bg-active,rgba(255,255,255,.06));color:var(--text-tertiary,#6b7280)}',
            '.ahw-chip.ok{background:rgba(16,185,129,.11);color:#059669}',
            '.ahw-chip.warn{background:rgba(245,158,11,.11);color:#b45309}',
            '.ahw-chip.err{background:rgba(239,68,68,.11);color:#dc2626}',
            '.ahw-chip.na{opacity:.32}',

            '.ahw-sep{width:1px;height:20px;background:var(--border-light,rgba(255,255,255,.09));flex-shrink:0}',

            '.ahw-refresh{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;',
            'padding:4px 10px;border-radius:7px;border:1px solid var(--border-light,rgba(255,255,255,.12));',
            'background:none;color:var(--text-secondary,#9ca3af);cursor:pointer;font-family:inherit;transition:color .15s}',
            '.ahw-refresh:hover:not(:disabled){color:var(--text-primary,#e8e9f8)}',
            '.ahw-refresh:disabled{opacity:.5;cursor:default}',

            '.ahw-ts{font-size:11px;color:var(--text-tertiary,#6b7280);margin-left:auto;white-space:nowrap}',
            '.ahw-syslink{font-size:11px;color:var(--accent-blue,#3b82f6);text-decoration:none;white-space:nowrap}',
            '.ahw-syslink:hover{text-decoration:underline}',

            // Detail panel
            '.ahw-detail{display:none;background:var(--bg-surface,#1a1b2e);',
            'border:1px solid var(--border-light,rgba(255,255,255,.09));',
            'border-radius:10px;margin-bottom:18px;overflow:hidden}',
            '.ahw-detail.open{display:block}',
            '.ahw-detail-hdr{display:flex;align-items:center;justify-content:space-between;',
            'padding:9px 14px;font-size:12px;font-weight:700;',
            'color:var(--text-secondary,#9ca3af);',
            'border-bottom:1px solid var(--border-light,rgba(255,255,255,.08))}',
            '.ahw-detail-title{display:flex;align-items:center;gap:6px}',
            '.ahw-check-row{display:flex;align-items:flex-start;gap:9px;padding:8px 14px;',
            'font-size:12.5px;border-bottom:1px solid var(--border-light,rgba(255,255,255,.05))}',
            '.ahw-check-row:last-child{border-bottom:none}',
            '.ahw-check-icon{font-size:13px;flex-shrink:0;width:18px;text-align:center;margin-top:1px}',
            '.ahw-check-name{flex:1;color:var(--text-secondary,#9ca3af);line-height:1.4}',
            '.ahw-check-detail{font-size:11.5px;color:var(--text-tertiary,#6b7280);margin-top:2px}',
            '.ahw-fix{font-size:11px;color:var(--n-amber,#f59e0b);margin-top:3px}',

            '@keyframes ahw-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
            '@keyframes ahw-spin{to{transform:rotate(360deg)}}',
            '.ahw-spinning{display:inline-block;animation:ahw-spin .6s linear infinite}',
        ].join('');
        s.textContent = css;
        document.head.appendChild(s);
    }

    // ── DOM helpers ───────────────────────────────────────────────────────
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }

    function timeAgo(ts) {
        var s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60)   return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        return Math.floor(s / 3600) + 'h ago';
    }

    // ── Build the health strip ────────────────────────────────────────────
    function buildStrip(sectionId, result) {
        var meta = SECTION_META[sectionId];
        if (!meta) return null;
        var st = (result && result.status) ? result.status : 'idle';

        var STATUS = {
            ok:   { cls: 'ahw-ok',   label: 'Healthy' },
            warn: { cls: 'ahw-warn', label: 'Warning' },
            err:  { cls: 'ahw-err',  label: 'Error' },
            idle: { cls: 'ahw-idle', label: 'Not Checked' },
        };
        var sm = STATUS[st] || STATUS.idle;

        var strip = el('div', 'ahw-strip');
        strip.id = 'ahw-strip';

        // ── Status badge ──────────────────────────────────────────────────
        var badge = el('button', 'ahw-badge ' + sm.cls);
        var dot   = el('span',   'ahw-dot');
        badge.appendChild(dot);
        badge.appendChild(document.createTextNode(' ' + sm.label));
        badge.title = 'Click to see check details';
        badge.setAttribute('aria-expanded', 'false');
        badge.onclick = function () {
            var panel = document.getElementById('ahw-detail');
            if (!panel) return;
            var open = panel.classList.toggle('open');
            badge.setAttribute('aria-expanded', String(open));
        };
        strip.appendChild(badge);

        // ── Separator ─────────────────────────────────────────────────────
        strip.appendChild(el('div', 'ahw-sep'));

        // ── Platform chips ────────────────────────────────────────────────
        var plats = el('div', 'ahw-plats');
        [['android', 'Android'], ['ios', 'iOS'], ['web', 'Web']].forEach(function (p) {
            var pid = p[0], plabel = p[1];
            var chip = el('div', 'ahw-chip ' + (meta.platforms[pid] ? (st === 'idle' ? '' : st) : 'na'));
            var icon = meta.platforms[pid]
                ? (st === 'ok' ? ' ✅' : st === 'warn' ? ' ⚠️' : st === 'err' ? ' ❌' : ' …')
                : ' —';
            chip.textContent = plabel + icon;
            plats.appendChild(chip);
        });
        strip.appendChild(plats);

        // ── Separator ─────────────────────────────────────────────────────
        strip.appendChild(el('div', 'ahw-sep'));

        // ── Refresh button ────────────────────────────────────────────────
        var refreshBtn = el('button', 'ahw-refresh');
        refreshBtn.id = 'ahw-refresh-btn';
        refreshBtn.textContent = '↻ Refresh Status';
        refreshBtn.onclick = function () { triggerRefresh(sectionId); };
        strip.appendChild(refreshBtn);

        // ── Last checked timestamp ────────────────────────────────────────
        if (result && result.ts) {
            var tsEl = el('span', 'ahw-ts');
            tsEl.id = 'ahw-ts';
            tsEl.textContent = 'Checked ' + timeAgo(result.ts);
            strip.appendChild(tsEl);
        }

        // ── Link to full system health dashboard ──────────────────────────
        var link = document.createElement('a');
        link.className = 'ahw-syslink';
        link.href = '/admin-system-health.html';
        link.textContent = '→ System Health';
        strip.appendChild(link);

        return strip;
    }

    // ── Build the collapsible detail panel ────────────────────────────────
    function buildDetailPanel(sectionId, result) {
        var meta = SECTION_META[sectionId];
        var panel = el('div', 'ahw-detail');
        panel.id = 'ahw-detail';

        var checks = (result && result.checks) ? result.checks : [];

        // Header
        var hdr = el('div', 'ahw-detail-hdr');
        var titleWrap = el('div', 'ahw-detail-title');
        titleWrap.appendChild(el('span', null, (meta ? meta.name : sectionId) + ' · health checks'));
        if (checks.length) {
            var passed = checks.filter(function (c) { return c.status === 'ok'; }).length;
            var failed = checks.filter(function (c) { return c.status === 'err'; }).length;
            var warned = checks.filter(function (c) { return c.status === 'warn'; }).length;
            var summary = el('span', null, passed + '✅');
            summary.style.marginLeft = '6px';
            if (warned) { var w = el('span', null, ' ' + warned + '⚠️'); summary.appendChild(w); }
            if (failed) { var f = el('span', null, ' ' + failed + '❌'); summary.appendChild(f); }
            titleWrap.appendChild(summary);
        }
        hdr.appendChild(titleWrap);
        panel.appendChild(hdr);

        // Check rows
        if (checks.length === 0) {
            var empty = el('div', 'ahw-check-row');
            empty.appendChild(el('span', 'ahw-check-name', 'Click "Refresh Status" to run health checks.'));
            panel.appendChild(empty);
        } else {
            var ICONS = { ok: '✅', warn: '⚠️', err: '❌', idle: '—' };
            var FIX_HINTS = {
                err:  'Check Cloudflare deployment · verify Supabase credentials · check CDN/asset URL',
                warn: 'Review check detail · may need configuration update',
            };
            checks.forEach(function (ch) {
                var row = el('div', 'ahw-check-row');
                row.appendChild(el('div', 'ahw-check-icon', ICONS[ch.status] || '—'));
                var wrap = el('div');
                wrap.style.flex = '1';
                wrap.appendChild(el('div', 'ahw-check-name', ch.name));
                if (ch.detail) wrap.appendChild(el('div', 'ahw-check-detail', ch.detail));
                if (ch.status === 'err' || ch.status === 'warn') {
                    wrap.appendChild(el('div', 'ahw-fix', '💡 ' + FIX_HINTS[ch.status]));
                }
                row.appendChild(wrap);
                panel.appendChild(row);
            });
        }

        return panel;
    }

    // ── Replace strip + panel in place ───────────────────────────────────
    function updateUI(sectionId, result) {
        var oldStrip  = document.getElementById('ahw-strip');
        var oldDetail = document.getElementById('ahw-detail');
        var wasOpen   = oldDetail && oldDetail.classList.contains('open');

        var newStrip  = buildStrip(sectionId, result);
        var newDetail = buildDetailPanel(sectionId, result);
        if (wasOpen) newDetail.classList.add('open');

        if (oldStrip && oldStrip.parentNode) {
            oldStrip.parentNode.insertBefore(newStrip,  oldStrip);
            oldStrip.parentNode.insertBefore(newDetail, oldStrip);
            oldStrip.parentNode.removeChild(oldStrip);
            if (oldDetail && oldDetail.parentNode) oldDetail.parentNode.removeChild(oldDetail);
        }
    }

    // ── Run checks and update UI ──────────────────────────────────────────
    var _busy = false;
    function triggerRefresh(sectionId) {
        if (_busy) return;
        _busy = true;
        var btn = document.getElementById('ahw-refresh-btn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Checking…'; }

        var sb  = window.adminAuth ? window.adminAuth.getSupabase() : null;
        var tok = sessionStorage.getItem('adminToken') || '';

        runSection(sectionId, sb, tok).then(function (result) {
            var cache = readCache();
            cache[sectionId] = result;
            writeCache(cache);
            updateUI(sectionId, result);
            _busy = false;
        }).catch(function () { _busy = false; });
    }

    // ── Wait for adminAuth to be available ───────────────────────────────
    function waitForAuth(cb) {
        var n = 0;
        (function check() {
            if (window.adminAuth && typeof window.adminAuth.getSupabase === 'function') { cb(); return; }
            if (++n < 20) setTimeout(check, 300);
        })();
    }

    // ── Main init ─────────────────────────────────────────────────────────
    function init() {
        var sectionId = detectSection();
        if (!sectionId) return;

        var meta = SECTION_META[sectionId];
        if (!meta) return;

        // Works for both layouts:
        //   admin-system-health:  main.main-content > div.content-area > div.page-header
        //   most other pages:     main.main-content > div.page-header   (no .content-area)
        var pageHeader = document.querySelector('.page-header');
        if (!pageHeader) return;
        var container = pageHeader.parentNode;
        if (!container) return;

        injectStyles();

        var cache  = readCache();
        var cached = cache[sectionId] || null;
        var fresh  = cached && (Date.now() - cached.ts < CACHE_TTL);

        var strip  = buildStrip(sectionId, cached);
        var detail = buildDetailPanel(sectionId, cached);
        if (!strip) return;

        // Insert strip then detail panel, right after .page-header
        var anchor = pageHeader.nextSibling;
        container.insertBefore(detail, anchor);
        container.insertBefore(strip, detail);

        // Auto-run if cache is stale or missing
        if (!fresh) {
            waitForAuth(function () { triggerRefresh(sectionId); });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
