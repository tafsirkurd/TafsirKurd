(function () {
    'use strict';

    var POLL_INTERVAL = 45000;   // re-fetch every 45 s
    var ONLINE_THRESH = 2 * 60 * 1000;   // < 2 min = online
    var IDLE_THRESH   = 12 * 60 * 1000;  // < 12 min = idle

    var PALETTE = [
        { bg: 'rgba(99,102,241,.22)',  color: '#6366f1' },
        { bg: 'rgba(16,185,129,.22)',  color: '#10b981' },
        { bg: 'rgba(59,130,246,.22)',  color: '#3b82f6' },
        { bg: 'rgba(245,158,11,.22)',  color: '#f59e0b' },
        { bg: 'rgba(239,68,68,.22)',   color: '#ef4444' },
        { bg: 'rgba(6,182,212,.22)',   color: '#06b6d4' },
        { bg: 'rgba(236,72,153,.22)',  color: '#ec4899' },
        { bg: 'rgba(168,85,247,.22)',  color: '#a855f7' },
    ];

    function palette(ch) {
        return PALETTE[(ch || 'A').toUpperCase().charCodeAt(0) % PALETTE.length];
    }

    function status(hb) {
        if (!hb) return 'offline';
        var diff = Date.now() - new Date(hb).getTime();
        if (diff < ONLINE_THRESH) return 'online';
        if (diff < IDLE_THRESH)   return 'idle';
        return 'offline';
    }

    function seenAgo(hb) {
        if (!hb) return 'Never';
        var s = Math.floor((Date.now() - new Date(hb).getTime()) / 1000);
        if (s < 10)  return 'Just now';
        if (s < 60)  return s + 's ago';
        var m = Math.floor(s / 60);
        if (m < 60)  return m + 'm ago';
        var h = Math.floor(m / 60);
        if (h < 24)  return h + 'h ago';
        return Math.floor(h / 24) + 'd ago';
    }

    var ROLE_LABELS = { super_admin: 'Super Admin', editor: 'Editor', analyst: 'Analyst', custom: 'Custom' };

    // ── Styles ─────────────────────────────────────────────────────────────────
    function injectStyles() {
        var s = document.createElement('style');
        s.textContent = [
            '#pa-wrap{display:flex;align-items:center;gap:0;flex-shrink:0;}',

            /* stacked avatars overlap */
            '.pa-avatar-btn{position:relative;width:30px;height:30px;border-radius:50%;border:2px solid var(--topbar-bg,#fff);cursor:pointer;flex-shrink:0;transition:transform .15s,z-index 0s;z-index:1;margin-left:-8px;}',
            '.pa-avatar-btn:first-child{margin-left:0;}',
            '.pa-avatar-btn:hover{transform:scale(1.15) translateY(-2px);z-index:10;}',
            '.pa-avatar-inner{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;letter-spacing:0;line-height:1;}',

            /* status ring */
            '.pa-avatar-btn.pa-online::after{content:"";position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;background:#22c55e;border:1.5px solid var(--topbar-bg,#fff);box-shadow:0 0 0 2px rgba(34,197,94,.35);}',
            '.pa-avatar-btn.pa-idle::after{content:"";position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;background:#eab308;border:1.5px solid var(--topbar-bg,#fff);}',

            /* +N overflow pill */
            '#pa-more{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:var(--sidebar-hover,rgba(0,0,0,.08));font-size:10px;font-weight:700;color:var(--text-secondary,#6b7280);border:2px solid var(--topbar-bg,#fff);cursor:default;flex-shrink:0;margin-left:-8px;}',

            /* tooltip popup */
            '#pa-tooltip{position:fixed;z-index:99990;background:var(--card-bg,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:8px;min-width:200px;max-width:260px;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .15s,transform .15s;}',
            '#pa-tooltip.pa-tt-visible{opacity:1;transform:translateY(0);pointer-events:auto;}',
            '.pa-tt-header{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary,#9ca3af);padding:2px 6px 6px;border-bottom:1px solid var(--border-color,#e5e7eb);margin-bottom:6px;}',
            '.pa-tt-row{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:8px;}',
            '.pa-tt-row:hover{background:var(--sidebar-hover,rgba(0,0,0,.05));}',
            '.pa-tt-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}',
            '.pa-tt-info{flex:1;min-width:0;}',
            '.pa-tt-name{font-size:12px;font-weight:600;color:var(--text-primary,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pa-tt-meta{font-size:10px;color:var(--text-tertiary,#9ca3af);}',
            '.pa-tt-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}',
            '.pa-tt-dot.pa-online{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25);}',
            '.pa-tt-dot.pa-idle{background:#eab308;}',
            '.pa-tt-dot.pa-offline{background:#9ca3af;}',
        ].join('');
        document.head.appendChild(s);
    }

    // ── State ──────────────────────────────────────────────────────────────────
    var admins = [];
    var wrap, tooltip;
    var ttOpen = false;
    var pollTimer = null;
    var realtimeCh = null;
    var currentEmail = (sessionStorage.getItem('adminEmail') || '').toLowerCase();

    // ── Render avatars in topbar ───────────────────────────────────────────────
    var MAX_SHOW = 4;

    function render() {
        if (!wrap) return;
        while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

        // Sort: online → idle → offline; exclude self
        var sorted = admins.slice().sort(function (a, b) {
            var order = { online: 0, idle: 1, offline: 2 };
            return (order[status(a.last_heartbeat)] || 2) - (order[status(b.last_heartbeat)] || 2);
        });

        // Show only online + idle (skip pure offline)
        var visible = sorted.filter(function (a) { return status(a.last_heartbeat) !== 'offline'; });

        if (!visible.length) {
            wrap.style.display = 'none';
            return;
        }
        wrap.style.display = 'flex';

        var show = visible.slice(0, MAX_SHOW);
        show.forEach(function (a) {
            var initChar = (a.full_name || a.email).charAt(0).toUpperCase();
            var col = palette(initChar);
            var st  = status(a.last_heartbeat);

            var btn = document.createElement('button');
            btn.className = 'pa-avatar-btn topbar-btn pa-' + st;
            btn.title = '';

            var inner = document.createElement('div');
            inner.className = 'pa-avatar-inner';
            inner.style.background = col.bg;
            inner.style.color = col.color;
            inner.textContent = initChar;
            btn.appendChild(inner);

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleTooltip(btn, a, visible);
            });

            wrap.appendChild(btn);
        });

        if (visible.length > MAX_SHOW) {
            var more = document.createElement('div');
            more.id = 'pa-more';
            more.textContent = '+' + (visible.length - MAX_SHOW);
            more.title = (visible.length - MAX_SHOW) + ' more admin(s) online';
            more.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleTooltip(more, null, visible);
            });
            wrap.appendChild(more);
        }
    }

    // ── Tooltip ───────────────────────────────────────────────────────────────
    function buildTooltip() {
        tooltip = document.createElement('div');
        tooltip.id = 'pa-tooltip';
        document.body.appendChild(tooltip);
        document.addEventListener('click', function () { hideTooltip(); });
    }

    function toggleTooltip(anchor, _singleAdmin, allVisible) {
        if (ttOpen) { hideTooltip(); return; }
        showTooltip(anchor, allVisible);
    }

    function showTooltip(anchor, allVisible) {
        tooltip.textContent = '';

        var hdr = document.createElement('div');
        hdr.className = 'pa-tt-header';
        hdr.textContent = allVisible.length + ' admin' + (allVisible.length !== 1 ? 's' : '') + ' online';
        tooltip.appendChild(hdr);

        allVisible.forEach(function (a) {
            var st = status(a.last_heartbeat);
            var initChar = (a.full_name || a.email).charAt(0).toUpperCase();
            var col = palette(initChar);
            var isSelf = a.email.toLowerCase() === currentEmail;

            var row = document.createElement('div');
            row.className = 'pa-tt-row';

            var av = document.createElement('div');
            av.className = 'pa-tt-av';
            av.style.background = col.bg;
            av.style.color = col.color;
            av.textContent = initChar;

            var info = document.createElement('div');
            info.className = 'pa-tt-info';

            var name = document.createElement('div');
            name.className = 'pa-tt-name';
            name.textContent = (a.full_name || a.email.split('@')[0]) + (isSelf ? ' (you)' : '');

            var meta = document.createElement('div');
            meta.className = 'pa-tt-meta';
            meta.textContent = (ROLE_LABELS[a.role] || a.role) + ' · ' + seenAgo(a.last_heartbeat);

            info.appendChild(name);
            info.appendChild(meta);

            var dot = document.createElement('div');
            dot.className = 'pa-tt-dot pa-' + st;

            row.appendChild(av);
            row.appendChild(info);
            row.appendChild(dot);
            tooltip.appendChild(row);
        });

        // Position below anchor
        var rect = anchor.getBoundingClientRect();
        tooltip.style.top  = (rect.bottom + 8) + 'px';
        tooltip.style.right = (window.innerWidth - rect.right) + 'px';
        tooltip.style.left = 'auto';

        tooltip.classList.add('pa-tt-visible');
        ttOpen = true;
    }

    function hideTooltip() {
        if (!tooltip) return;
        tooltip.classList.remove('pa-tt-visible');
        ttOpen = false;
    }

    // ── Data ───────────────────────────────────────────────────────────────────
    async function fetchAdmins() {
        try {
            var sb = window.adminAuth && window.adminAuth.getSupabase && window.adminAuth.getSupabase();
            if (!sb) return;
            var res = await sb
                .from('admin_users')
                .select('id, full_name, email, role, last_heartbeat')
                .eq('is_active', true)
                .order('last_heartbeat', { ascending: false, nullsFirst: false });
            if (res.error) throw res.error;
            admins = res.data || [];
            render();
        } catch (e) {
            // silently ignore — presence is non-critical
        }
    }

    function subscribeRealtime() {
        var sb = window.adminAuth && window.adminAuth.getSupabase && window.adminAuth.getSupabase();
        if (!sb) return;
        if (realtimeCh) realtimeCh.unsubscribe();
        realtimeCh = sb
            .channel('pa-admin-presence')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_users' }, function (payload) {
                var u = payload.new;
                if (!u || !u.id) return;
                var mem = admins.find(function (a) { return a.id === u.id; });
                if (mem) {
                    mem.last_heartbeat = u.last_heartbeat;
                } else {
                    admins.push(u);
                }
                render();
            })
            .subscribe();
    }

    // ── Init ───────────────────────────────────────────────────────────────────
    function init() {
        injectStyles();
        buildTooltip();

        // Inject wrap into topbar-actions, before session timer
        var actions = document.querySelector('.topbar-actions');
        if (!actions) return;

        wrap = document.createElement('div');
        wrap.id = 'pa-wrap';
        wrap.style.display = 'none';

        var timer = actions.querySelector('#sessionTimer');
        actions.insertBefore(wrap, timer || actions.firstChild);

        // Wait for supabase client to be ready (auth.js runs first)
        function tryStart(attempts) {
            var sb = window.adminAuth && window.adminAuth.getSupabase && window.adminAuth.getSupabase();
            if (sb) {
                fetchAdmins();
                subscribeRealtime();
                pollTimer = setInterval(fetchAdmins, POLL_INTERVAL);
            } else if (attempts < 20) {
                setTimeout(function () { tryStart(attempts + 1); }, 300);
            }
        }
        tryStart(0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.presenceAvatars = { refresh: fetchAdmins };
})();
