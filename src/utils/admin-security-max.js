/* admin-security-max.js v2 — Apple-level security for all admin pages
   Loaded automatically on every authenticated admin page via admin-guard.js */
(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────────────────────
    var REVALIDATE_MS  = 5  * 60 * 1000;  // silent token re-check every 5 min
    var BLUR_LOCK_MS   = 5  * 60 * 1000;  // lock after 5 min in background
    var CLIPBOARD_MS   = 60 * 1000;        // wipe clipboard after 60 s
    var CHANNEL        = 'tk-admin-bus';   // BroadcastChannel name
    var TAB_ID         = Date.now() + '-' + Math.random().toString(36).substr(2, 8);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function initials(n) {
        var p = String(n||'').trim().split(/\s+/);
        return (p.length>=2 ? p[0][0]+p[p.length-1][0] : String(n||'A').substr(0,2)).toUpperCase();
    }
    function ss(k) { try { return sessionStorage.getItem(k); } catch(e) { return null; } }
    function lockIcon(size) {
        size = size || 16;
        return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    }
    function shieldIcon(size) {
        size = size || 16;
        return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
    }

    // ── Security Event Journal (client-side log, shown in console + stored) ──
    var _journal = [];
    function logSec(type, detail) {
        var entry = { t: new Date().toISOString(), type: type, detail: detail || '' };
        _journal.push(entry);
        if (_journal.length > 50) _journal.shift();
        try { sessionStorage.setItem('adminSecLog', JSON.stringify(_journal.slice(-20))); } catch(e) {}
    }

    // ── 1. PRINT PROTECTION ───────────────────────────────────────────────────
    var _ps = document.createElement('style');
    _ps.id  = 'adminPrintBlock';
    _ps.textContent = '@media print{html,body{display:none!important;visibility:hidden!important;}}';
    document.head.appendChild(_ps);
    window.addEventListener('beforeprint', function () {
        logSec('print_attempt');
        document.documentElement.style.setProperty('display', 'none', 'important');
    });
    window.addEventListener('afterprint', function () {
        document.documentElement.style.removeProperty('display');
    });

    // ── 2. CLIPBOARD AUTO-WIPE ────────────────────────────────────────────────
    var _wipeTimer = null;
    function armClipboardWipe() {
        clearTimeout(_wipeTimer);
        _wipeTimer = setTimeout(function () {
            navigator.clipboard.writeText('').catch(function(){});
            logSec('clipboard_wiped');
        }, CLIPBOARD_MS);
    }
    document.addEventListener('copy', armClipboardWipe);
    try {
        var _origCB = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = function (t) { armClipboardWipe(); return _origCB(t); };
    } catch(e) {}

    // ── 3. RIGHT-CLICK GUARD on sensitive areas ───────────────────────────────
    document.addEventListener('contextmenu', function (e) {
        if (e.target.closest('table, .acct-card, .user-row, .metric-card, [data-sensitive]')) {
            e.preventDefault();
            logSec('contextmenu_blocked');
        }
    });

    // ── 4. PERIODIC SILENT TOKEN RE-VALIDATION ────────────────────────────────
    // Every 5 minutes: quietly ping server. If token invalid → force logout.
    setInterval(async function () {
        var token = ss('adminToken');
        if (!token) return;
        try {
            var fp  = window.deviceFingerprint ? await window.deviceFingerprint.get() : null;
            var res = await fetch('/admin-auth', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ action:'verify', token:token, deviceFingerprint:fp })
            });
            var d = await res.json();
            if (!d.success) { logSec('revalidation_failed'); _forceLogout('Session invalidated by server.'); }
            else logSec('revalidation_ok');
        } catch(e) { /* network blip — don't logout */ }
    }, REVALIDATE_MS);

    function _forceLogout(msg) {
        logSec('force_logout', msg);
        try { sessionStorage.setItem('adminLogoutReason', msg); } catch(e) {}
        sessionStorage.clear();
        try { localStorage.removeItem('adminGraceToken'); } catch(e) {}
        window.location.replace('/admin-login.html?expired=1');
    }

    // ── 5. MULTI-TAB DETECTION via BroadcastChannel ───────────────────────────
    // Only ONE admin tab is allowed. Opening a second tab locks it immediately.
    var _bc = null;
    var _isPrimary = true;
    try {
        _bc = new BroadcastChannel(CHANNEL);
        // Announce ourselves
        _bc.postMessage({ type:'TAB_OPEN', id: TAB_ID });

        _bc.addEventListener('message', function (e) {
            if (!e.data || e.data.id === TAB_ID) return;

            if (e.data.type === 'TAB_OPEN') {
                // A new tab just opened — we are the primary, tell it
                _bc.postMessage({ type:'PRIMARY_EXISTS', id: TAB_ID });
                logSec('secondary_tab_blocked', e.data.id);
            }
            if (e.data.type === 'PRIMARY_EXISTS' && _isPrimary) {
                // We just opened and a primary already exists — we are secondary
                _isPrimary = false;
                _showDuplicateTabWall();
            }
            if (e.data.type === 'FORCE_LOCK') {
                showLockScreen('Another tab requested a lock.');
            }
        });
    } catch(e) {}

    function _showDuplicateTabWall() {
        document.body.style.overflow = 'hidden';
        var wall = document.createElement('div');
        wall.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(6,9,18,.98);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(24px)';
        wall.innerHTML =
            '<div style="text-align:center;max-width:360px;padding:40px 32px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,.6)">' +
                '<div style="font-size:48px;margin-bottom:16px">🔒</div>' +
                '<div style="font-size:19px;font-weight:700;color:#f1f5f9;margin-bottom:8px">Duplicate Session Blocked</div>' +
                '<div style="font-size:13px;color:#64748b;line-height:1.65;margin-bottom:24px">For security, only one admin tab is allowed at a time. An active admin session is already open in another tab.</div>' +
                '<button onclick="window.close()" style="width:100%;padding:12px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;font-weight:700;font-size:14px;border:none;cursor:pointer;font-family:inherit">Close This Tab</button>' +
                '<div style="font-size:11px;color:#1e293b;margin-top:12px">If this is the only tab, refresh the other window.</div>' +
            '</div>';
        document.body.appendChild(wall);
        logSec('duplicate_tab_wall_shown');
    }

    // ── 6. ADMIN PAGE WATERMARK ───────────────────────────────────────────────
    // Subtle repeating diagonal watermark — makes screenshots identifiable.
    // Rendered as a tiled SVG background so it's impossible to remove via DOM.
    function injectWatermark() {
        if (document.getElementById('adminWatermark')) return;
        var name = ss('adminFullName') || ss('adminEmail') || 'Admin';
        var role = (ss('adminRole') || '').replace(/_/g,' ');
        var date = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        var text = esc(name + ' · ' + role + ' · ' + date);

        // SVG tile: two diagonal lines of text per 300×150 tile
        var svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150">',
            '<text x="150" y="55" text-anchor="middle" dominant-baseline="middle"',
            ' transform="rotate(-25 150 55)"',
            ' font-family="Inter,system-ui,sans-serif" font-size="10.5" font-weight="500"',
            ' fill="context-fill" opacity="0.045" letter-spacing="0.4">',
            text, '</text>',
            '<text x="150" y="120" text-anchor="middle" dominant-baseline="middle"',
            ' transform="rotate(-25 150 120)"',
            ' font-family="Inter,system-ui,sans-serif" font-size="10.5" font-weight="500"',
            ' fill="context-fill" opacity="0.045" letter-spacing="0.4">',
            text, '</text>',
            '</svg>',
        ].join('');

        var wm = document.createElement('div');
        wm.id = 'adminWatermark';
        wm.setAttribute('aria-hidden', 'true');
        wm.style.cssText = [
            'position:fixed;inset:0;z-index:99990;pointer-events:none;',
            'user-select:none;-webkit-user-select:none;',
            'background-image:url("data:image/svg+xml,', encodeURIComponent(svg), '");',
            'background-repeat:repeat;background-size:300px 150px;',
            'color:var(--text-primary,#000);',
        ].join('');
        document.body.appendChild(wm);
    }

    // ── 7. SENSITIVE DATA AUTO-MASKING ────────────────────────────────────────
    // Add class .mask-sensitive to any element to blur it until hover/click.
    // Auto-re-blurs after 8 seconds of reveal.
    function initSensitiveMask() {
        if (document.getElementById('adminMaskCSS')) return;
        var s = document.createElement('style');
        s.id  = 'adminMaskCSS';
        s.textContent = [
            '.mask-sensitive{',
                'filter:blur(6px);transition:filter .25s;cursor:pointer;',
                'user-select:none;-webkit-user-select:none;',
                'border-radius:3px;',
            '}',
            '.mask-sensitive.revealed{filter:none;user-select:auto;-webkit-user-select:auto;}',
            '.mask-sensitive:focus-visible{outline:2px solid #3b82f6;}',
        ].join('');
        document.head.appendChild(s);

        document.addEventListener('click', function (e) {
            var el = e.target.closest('.mask-sensitive');
            if (!el) return;
            el.classList.add('revealed');
            logSec('sensitive_data_revealed', el.getAttribute('data-label') || '');
            clearTimeout(el._maskTimer);
            el._maskTimer = setTimeout(function () { el.classList.remove('revealed'); }, 8000);
        });
    }

    // ── 8. LOCK SCREEN ───────────────────────────────────────────────────────
    var _lockEl   = null;
    var _isLocked = false;
    var _lockTmr  = null;

    function injectLockCSS() {
        if (document.getElementById('adminLockCSS')) return;
        var s = document.createElement('style');
        s.id  = 'adminLockCSS';
        s.textContent = [
            // Overlay
            '#adminLockScreen{position:fixed;inset:0;z-index:999999;',
                'background:rgba(5,8,18,.975);',
                'backdrop-filter:blur(32px) saturate(180%);',
                '-webkit-backdrop-filter:blur(32px) saturate(180%);',
                'display:flex;align-items:center;justify-content:center;',
                'animation:lkIn .3s cubic-bezier(.22,.68,0,1.2) both;}',
            '@keyframes lkIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}',
            '@keyframes lkOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.96)}}',
            // Card
            '.lk-card{width:100%;max-width:360px;padding:40px 32px 32px;',
                'background:rgba(255,255,255,.025);',
                'border:1px solid rgba(255,255,255,.07);border-radius:24px;',
                'text-align:center;',
                'box-shadow:0 40px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04);',
                'display:flex;flex-direction:column;align-items:center;gap:0;}',
            // Avatar
            '.lk-av{width:84px;height:84px;border-radius:50%;',
                'background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);',
                'display:flex;align-items:center;justify-content:center;',
                'font-size:30px;font-weight:800;color:#fff;letter-spacing:-1px;',
                'box-shadow:0 0 0 6px rgba(59,130,246,.12),0 16px 48px rgba(99,102,241,.4);',
                'margin-bottom:18px;}',
            '.lk-nm{font-size:21px;font-weight:700;color:#f1f5f9;letter-spacing:-.4px;margin-bottom:6px;}',
            '.lk-rl{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;',
                'color:#3b82f6;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);',
                'padding:3px 12px;border-radius:20px;margin-bottom:20px;}',
            // Info row
            '.lk-info{display:flex;align-items:center;gap:8px;justify-content:center;',
                'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);',
                'border-radius:10px;padding:8px 14px;margin-bottom:20px;',
                'font-size:11px;color:#334155;}',
            '.lk-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;',
                'box-shadow:0 0 8px #22c55e;animation:lkdot 1.8s ease-in-out infinite;}',
            '@keyframes lkdot{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}',
            // Reason box
            '.lk-why{font-size:12px;color:#475569;line-height:1.6;',
                'background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);',
                'border-radius:10px;padding:10px 16px;margin-bottom:22px;width:100%;}',
            // Session bar
            '.lk-sess-bar{width:100%;background:rgba(255,255,255,.05);border-radius:6px;',
                'height:3px;margin-bottom:22px;overflow:hidden;}',
            '.lk-sess-fill{height:100%;border-radius:6px;',
                'background:linear-gradient(90deg,#3b82f6,#6366f1);',
                'transition:width 1s linear;}',
            // Button
            '.lk-btn{width:100%;padding:14px;border-radius:13px;',
                'background:linear-gradient(135deg,#3b82f6,#6366f1);',
                'color:#fff;font-size:15px;font-weight:700;font-family:inherit;',
                'border:none;cursor:pointer;',
                'display:flex;align-items:center;justify-content:center;gap:9px;',
                'box-shadow:0 8px 28px rgba(59,130,246,.45);',
                'transition:opacity .15s,box-shadow .15s,transform .1s;}',
            '.lk-btn:hover{opacity:.93;box-shadow:0 10px 36px rgba(59,130,246,.55);}',
            '.lk-btn:active{transform:scale(.98);}',
            '.lk-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;}',
            '.lk-out{background:none;border:none;cursor:pointer;color:#2d3748;',
                'font-size:12px;font-family:inherit;padding:8px 16px;border-radius:8px;',
                'transition:color .15s;margin-top:10px;}',
            '.lk-out:hover{color:#64748b;}',
            '.lk-meta{font-size:10px;color:#1a2035;margin-top:10px;letter-spacing:.03em;}',
            '.lk-err{font-size:12px;color:#f87171;min-height:18px;margin-top:8px;}',
            // FAB
            '#adminLockFab{position:fixed;bottom:22px;right:22px;z-index:9998;',
                'width:44px;height:44px;border-radius:50%;',
                'background:var(--bg-surface,#fff);',
                'border:1px solid var(--border-light,#e5e7eb);',
                'box-shadow:0 2px 14px rgba(0,0,0,.12);',
                'display:flex;align-items:center;justify-content:center;cursor:pointer;',
                'color:var(--text-tertiary,#9ca3af);',
                'transition:box-shadow .2s,transform .15s,color .15s,background .15s;}',
            '#adminLockFab:hover{box-shadow:0 6px 24px rgba(99,102,241,.25);',
                'transform:scale(1.1);color:#6366f1;background:rgba(99,102,241,.07);}',
            '#adminLockFab:active{transform:scale(.96);}',
            '#adminLockFab[title]:hover::before{',
                'content:attr(title);position:absolute;bottom:calc(100% + 8px);right:0;',
                'background:#1e293b;color:#e2e8f0;font-size:11px;font-weight:600;',
                'padding:4px 9px;border-radius:6px;white-space:nowrap;pointer-events:none;',
                'font-family:Inter,system-ui,sans-serif;}',
        ].join('');
        document.head.appendChild(s);
    }

    function showLockScreen(reason) {
        if (_isLocked) return;
        _isLocked = true;
        logSec('lock_screen', reason || 'manual');
        injectLockCSS();

        var name  = ss('adminFullName') || ss('adminEmail') || 'Admin';
        var role  = (ss('adminRole') || '').replace(/_/g, ' ');
        var since = ss('adminSessionStart');
        var sinceStr = '', sessBarPct = 100;

        if (since) {
            try {
                var d   = new Date(since);
                var now = Date.now();
                sinceStr = 'Session since ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
                // Calculate % of 2-hour session remaining for the progress bar
                var elapsed = now - d.getTime();
                var SESS_MS = 2 * 60 * 60 * 1000;
                sessBarPct = Math.max(0, Math.min(100, (1 - elapsed / SESS_MS) * 100)).toFixed(1);
            } catch(e) {}
        }

        _lockEl = document.createElement('div');
        _lockEl.id = 'adminLockScreen';
        _lockEl.innerHTML =
            '<div class="lk-card">' +
                '<div class="lk-av">' + esc(initials(name)) + '</div>' +
                '<div class="lk-nm">' + esc(name) + '</div>' +
                (role ? '<span class="lk-rl">' + esc(role) + '</span>' : '') +
                (sinceStr
                    ? '<div class="lk-info"><div class="lk-dot"></div>' + esc(sinceStr) + '</div>'
                    : '') +
                '<div class="lk-sess-bar"><div class="lk-sess-fill" id="lkSessBar" style="width:' + sessBarPct + '%"></div></div>' +
                '<div class="lk-why">' + esc(reason || 'Screen locked. Click Unlock to verify your session and continue.') + '</div>' +
                '<button class="lk-btn" id="lkBtn">' +
                    lockIcon(16) +
                    '<span id="lkBtnTxt">Unlock Session</span>' +
                '</button>' +
                '<div class="lk-err" id="lkErr"></div>' +
                '<button class="lk-out" id="lkOut">Sign out instead</button>' +
                '<div class="lk-meta" id="lkMeta"></div>' +
            '</div>';
        document.body.appendChild(_lockEl);

        // Live elapsed timer on the lock screen
        var _at = Date.now();
        _lockTmr = setInterval(function () {
            var m = document.getElementById('lkMeta');
            if (!m) return;
            var sec = Math.floor((Date.now() - _at) / 1000);
            var min = Math.floor(sec / 60), s = sec % 60;
            m.textContent = 'Locked ' + (min > 0 ? min + 'm ' : '') + s + 's ago';
        }, 1000);

        document.getElementById('lkBtn').addEventListener('click', async function () {
            var btn  = document.getElementById('lkBtn');
            var span = document.getElementById('lkBtnTxt');
            var err  = document.getElementById('lkErr');
            btn.disabled = true;
            span.textContent = 'Verifying…';
            err.textContent  = '';
            try {
                var token = ss('adminToken');
                var fp    = window.deviceFingerprint ? await window.deviceFingerprint.get() : null;
                var res   = await fetch('/admin-auth', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ action:'verify', token:token, deviceFingerprint:fp })
                });
                var data = await res.json();
                if (data.success) {
                    logSec('lock_screen_unlocked');
                    clearInterval(_lockTmr);
                    _lockEl.style.animation = 'lkOut .22s ease both';
                    setTimeout(function () {
                        if (_lockEl && _lockEl.parentNode) _lockEl.parentNode.removeChild(_lockEl);
                        _lockEl = null; _isLocked = false;
                    }, 230);
                } else {
                    _forceLogout('Session expired while locked.');
                }
            } catch(e) {
                span.textContent = 'Unlock Session';
                btn.disabled = false;
                err.textContent = 'Connection error — try again';
            }
        });

        document.getElementById('lkOut').addEventListener('click', function () {
            sessionStorage.clear();
            try { localStorage.removeItem('adminGraceToken'); } catch(e) {}
            window.location.replace('/admin-login.html');
        });
    }

    // ── 9. TAB VISIBILITY → AUTO-LOCK ────────────────────────────────────────
    var _hiddenAt = null;
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            _hiddenAt = Date.now();
        } else {
            if (_hiddenAt && (Date.now() - _hiddenAt) > BLUR_LOCK_MS) {
                showLockScreen('You were away for more than 5 minutes.');
            }
            _hiddenAt = null;
        }
    });

    // ── 10. KEYBOARD SHORTCUT: Ctrl+L to lock ────────────────────────────────
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            showLockScreen('Locked with Ctrl+L.');
        }
    });

    // ── 11. FLOATING LOCK FAB ─────────────────────────────────────────────────
    function injectFAB() {
        if (document.getElementById('adminLockFab')) return;
        injectLockCSS();
        var fab = document.createElement('button');
        fab.id   = 'adminLockFab';
        fab.title = 'Lock screen (Ctrl+L)';
        fab.setAttribute('aria-label', 'Lock screen');
        fab.innerHTML = lockIcon(17);
        fab.addEventListener('click', function () { showLockScreen('Locked manually.'); });
        document.body.appendChild(fab);
    }

    // ── INIT (after DOM ready) ────────────────────────────────────────────────
    function init() {
        injectFAB();
        injectWatermark();
        initSensitiveMask();
        logSec('security_max_loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already ready (script loaded with defer)
        init();
    }

    // ── GLOBAL API ────────────────────────────────────────────────────────────
    window.adminSecurityMax = {
        lock:    function (reason) { showLockScreen(reason); },
        logout:  _forceLogout,
        journal: function () { return _journal.slice(); },
        maskReveal: function (el) { if (el) el.classList.toggle('revealed'); }
    };

})();
