(function () {
    'use strict';

    var REVALIDATE_MS  = 5  * 60 * 1000;
    var BLUR_LOCK_MS   = 5  * 60 * 1000;
    var CLIPBOARD_MS   = 60 * 1000;
    var CHANNEL        = 'tk-admin-bus';
    var TAB_ID         = Date.now() + '-' + Math.random().toString(36).substr(2, 8);

    function injectWallThemeCSS() {
        if (document.getElementById('adminWallThemeCSS')) return;
        var s = document.createElement('style');
        s.id  = 'adminWallThemeCSS';
        s.textContent = [
            /* Default (light) */
            ':root{',
                '--wall-bg:rgba(244,246,251,.97);',
                '--wall-card-bg:#ffffff;',
                '--wall-card-border:rgba(0,0,0,.08);',
                '--wall-card-shadow:0 24px 64px rgba(0,0,0,.12);',
                '--wall-title:#0f172a;',
                '--wall-body:#475569;',
                '--wall-em:#0f172a;',
                '--wall-note-bg:rgba(0,0,0,.03);',
                '--wall-note-border:rgba(0,0,0,.07);',
                '--wall-note:#64748b;',
                '--wall-foot:#94a3b8;',
                '--wall-btn:linear-gradient(135deg,#3b82f6,#6366f1);',
                '--wall-btn-shadow:rgba(59,130,246,.35);',
                '--wall-btn2-color:#64748b;',
            '}',
            /* Dark mode */
            'body.dark-mode{',
                '--wall-bg:rgba(4,6,14,.97);',
                '--wall-card-bg:rgba(255,255,255,.025);',
                '--wall-card-border:rgba(255,255,255,.08);',
                '--wall-card-shadow:0 40px 80px rgba(0,0,0,.7);',
                '--wall-title:#f1f5f9;',
                '--wall-body:#475569;',
                '--wall-em:#f1f5f9;',
                '--wall-note-bg:rgba(255,255,255,.03);',
                '--wall-note-border:rgba(255,255,255,.06);',
                '--wall-note:#334155;',
                '--wall-foot:#4b5563;',
            '}',
            /* Sakina theme */
            'body[data-admin-theme="sakina"]{',
                '--wall-bg:rgba(8,12,8,.97);',
                '--wall-card-bg:rgba(201,168,76,.04);',
                '--wall-card-border:rgba(201,168,76,.14);',
                '--wall-title:#f5f0e0;',
                '--wall-body:#6b7280;',
                '--wall-em:#e8d5a0;',
                '--wall-note-bg:rgba(201,168,76,.05);',
                '--wall-note-border:rgba(201,168,76,.1);',
                '--wall-note:#78716c;',
                '--wall-foot:#292524;',
                '--wall-btn:linear-gradient(135deg,#b5922e,#c9a84c);',
                '--wall-btn-shadow:rgba(185,146,46,.35);',
            '}',
            /* Noor theme */
            'body[data-admin-theme="noor"]{',
                '--wall-bg:rgba(4,12,6,.97);',
                '--wall-card-bg:rgba(34,197,94,.03);',
                '--wall-card-border:rgba(34,197,94,.12);',
                '--wall-title:#f0fdf4;',
                '--wall-body:#4b5563;',
                '--wall-em:#bbf7d0;',
                '--wall-note-bg:rgba(34,197,94,.04);',
                '--wall-note-border:rgba(34,197,94,.1);',
                '--wall-note:#374151;',
                '--wall-foot:#14532d;',
                '--wall-btn:linear-gradient(135deg,#16a34a,#22c55e);',
                '--wall-btn-shadow:rgba(22,163,74,.35);',
            '}',
            /* Êvar theme */
            'body[data-admin-theme="evar"]{',
                '--wall-bg:rgba(20,22,30,.97);',
                '--wall-card-bg:rgba(129,140,248,.04);',
                '--wall-card-border:rgba(129,140,248,.14);',
                '--wall-title:#dde1ec;',
                '--wall-body:#545c72;',
                '--wall-em:#818cf8;',
                '--wall-note-bg:rgba(129,140,248,.05);',
                '--wall-note-border:rgba(129,140,248,.1);',
                '--wall-note:#4a5068;',
                '--wall-foot:#2a2e3c;',
                '--wall-btn:linear-gradient(135deg,#6366f1,#818cf8);',
                '--wall-btn-shadow:rgba(99,102,241,.35);',
            '}',
        ].join('');
        document.head.appendChild(s);
    }

    function _closeOrNavigate() {
        window.close();
        setTimeout(function () {
            if (!window.closed) window.location.replace('/admin-login.html');
        }, 400);
    }

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

    var _journal = [];
    function logSec(type, detail) {
        var entry = { t: new Date().toISOString(), type: type, detail: detail || '' };
        _journal.push(entry);
        if (_journal.length > 50) _journal.shift();
        try { sessionStorage.setItem('adminSecLog', JSON.stringify(_journal.slice(-20))); } catch(e) {}
    }

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

    document.addEventListener('contextmenu', function (e) {
        if (e.target.closest('table, .acct-card, .user-row, .metric-card, [data-sensitive]')) {
            e.preventDefault();
            logSec('contextmenu_blocked');
        }
    });

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

    var TAB_KEY = 'tkAdminTab';
    var TAB_TTL = 4000;
    var TAB_HB  = 2500;
    var _tabHbInterval = null;
    var _isSecondary = false;

    function _tabBeat() {
        try { localStorage.setItem(TAB_KEY, JSON.stringify({ id: TAB_ID, at: Date.now() })); } catch(e) {}
    }

    function _startTabHeartbeat() {
        _tabBeat();
        _tabHbInterval = setInterval(_tabBeat, TAB_HB);
        function _tabCleanup() {
            clearInterval(_tabHbInterval);
            try {
                var cur = JSON.parse(localStorage.getItem(TAB_KEY) || 'null');
                if (cur && cur.id === TAB_ID) localStorage.removeItem(TAB_KEY);
            } catch(e) {}
        }
        // beforeunload fires on desktop; pagehide fires on iOS Safari navigation
        window.addEventListener('beforeunload', _tabCleanup);
        window.addEventListener('pagehide', _tabCleanup);
    }

    function _checkForExistingTab() {
        try {
            var existing = JSON.parse(localStorage.getItem(TAB_KEY) || 'null');
            if (existing && existing.id !== TAB_ID && (Date.now() - existing.at) < TAB_TTL) {
                return true;
            }
        } catch(e) {}
        return false;
    }

    if (_checkForExistingTab()) {
        _isSecondary = true;
        logSec('duplicate_tab_blocked');
        // Show wall after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _showDuplicateTabWall);
        } else {
            _showDuplicateTabWall();
        }
    } else {
        _startTabHeartbeat();
        try {
            var _bc = new BroadcastChannel(CHANNEL);
            _bc.postMessage({ type: 'TAB_OPEN', id: TAB_ID });
            _bc.addEventListener('message', function (e) {
                if (!e.data || e.data.id === TAB_ID) return;
                if (e.data.type === 'TAB_OPEN') {
                    _bc.postMessage({ type: 'PRIMARY_EXISTS', id: TAB_ID });
                }
                if (e.data.type === 'FORCE_LOCK') {
                    showLockScreen('A remote lock was triggered.');
                }
            });
        } catch(e) {}
    }

    function _showDuplicateTabWall() {
        injectWallThemeCSS();
        document.body.style.overflow = 'hidden';
        document.documentElement.style.visibility = 'visible';

        var overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed;inset:0;z-index:9999999;',
            'background:var(--wall-bg,rgba(4,6,14,.97));',
            'display:flex;align-items:center;justify-content:center;',
            'backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);',
            'font-family:Inter,system-ui,sans-serif;padding:24px;',
        ].join('');

        var card = document.createElement('div');
        card.style.cssText = [
            'text-align:center;max-width:400px;width:100%;',
            'padding:48px 36px;',
            'background:var(--wall-card-bg);',
            'border:1px solid var(--wall-card-border);',
            'border-radius:24px;',
            'box-shadow:var(--wall-card-shadow);',
        ].join('');

        card.innerHTML =
            '<div style="font-size:52px;margin-bottom:18px">🔒</div>' +
            '<div style="font-size:20px;font-weight:700;color:var(--wall-title);margin-bottom:10px;letter-spacing:-.3px">One Session at a Time</div>' +
            '<div style="font-size:13px;color:var(--wall-body);line-height:1.75;margin-bottom:28px">' +
                'For your security, only <strong style="color:var(--wall-em)">one admin tab</strong> is allowed at a time. ' +
                'An active admin session is already running in another window. ' +
                'Close that window first, then refresh this tab.' +
            '</div>' +
            '<button id="_wallCloseBtn" style="width:100%;padding:13px;border-radius:12px;' +
                'background:var(--wall-btn,linear-gradient(135deg,#3b82f6,#6366f1));color:#fff;' +
                'font-weight:700;font-size:14px;border:none;cursor:pointer;font-family:inherit;' +
                'box-shadow:0 6px 24px var(--wall-btn-shadow,rgba(59,130,246,.4));' +
                'transition:opacity .15s">' +
                'Close This Tab' +
            '</button>' +
            '<div style="font-size:11px;color:var(--wall-foot);margin-top:14px">' +
                'If no other admin tab is open, wait 7 s then refresh this page.' +
            '</div>';

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        document.getElementById('_wallCloseBtn').addEventListener('click', _closeOrNavigate);
    }

    async function checkGeoAccess() {
        try {
            var c = JSON.parse(sessionStorage.getItem('adminGeoCheck') || 'null');
            if (c && (Date.now() - c.at) < 30 * 60 * 1000) {
                if (!c.ok) _showGeoBlock(c.name || c.code);
                return c.ok;
            }
        } catch(e) {}

        try {
            var ctrl = new AbortController();
            var timer = setTimeout(function () { ctrl.abort(); }, 7000);
            var res  = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
            clearTimeout(timer);
            var data = await res.json();
            var code = (data.country_code || '').toUpperCase();
            var name = data.country_name || code;
            var ok   = code === 'IQ';
            sessionStorage.setItem('adminGeoCheck', JSON.stringify({ ok: ok, code: code, name: name, at: Date.now() }));
            if (!ok) { logSec('geo_blocked', code); _showGeoBlock(name); }
            return ok;
        } catch(e) {
            logSec('geo_check_failed', 'api_unreachable');
            return true;
        }
    }

    function _showGeoBlock(countryName) {
        injectWallThemeCSS();
        document.documentElement.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
        document.body.innerHTML = '';
        document.body.style.cssText = [
            'margin:0;padding:0;',
            'background:var(--wall-bg,rgba(4,6,14,.97));',
            'display:flex;align-items:center;justify-content:center;',
            'min-height:100vh;font-family:Inter,system-ui,sans-serif;padding:24px;',
            'box-sizing:border-box;',
        ].join('');

        var card = document.createElement('div');
        card.style.cssText = [
            'text-align:center;max-width:460px;width:100%;',
            'padding:52px 40px;',
            'background:var(--wall-card-bg);',
            'border:1px solid var(--wall-card-border);',
            'border-radius:28px;',
            'box-shadow:var(--wall-card-shadow);',
        ].join('');
        card.innerHTML =
            '<div style="width:76px;height:76px;border-radius:50%;' +
                'background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.2);' +
                'display:flex;align-items:center;justify-content:center;' +
                'font-size:34px;margin:0 auto 22px">🚫</div>' +
            '<div style="font-size:22px;font-weight:800;color:var(--wall-title);margin-bottom:10px;letter-spacing:-.3px">' +
                'Access Restricted</div>' +
            '<div style="font-size:14px;color:var(--wall-body);line-height:1.75;margin-bottom:28px">' +
                'Admin access is only permitted from <strong style="color:var(--wall-em)">Iraq 🇮🇶</strong>.<br>' +
                'Your current location (<strong style="color:#ef4444">' + esc(countryName) + '</strong>) is not authorized.' +
            '</div>' +
            '<div style="background:var(--wall-note-bg);border:1px solid var(--wall-note-border);' +
                'border-radius:12px;padding:14px 18px;font-size:12px;color:var(--wall-note);line-height:1.7;margin-bottom:0">' +
                'If you are in Iraq and seeing this message, your ISP or VPN may be routing through another country. ' +
                'Disconnect your VPN, or use an Iraqi-based network.' +
            '</div>' +
            '<div style="margin-top:18px;font-size:10px;color:var(--wall-foot)">Security block · TafsirKurd Admin</div>';
        document.body.appendChild(card);
    }

    // Run geo check immediately (async, non-blocking for UI)
    if (!_isSecondary) checkGeoAccess();

    function injectWatermark() {
        if (document.getElementById('adminWatermark')) return;
        var name = ss('adminFullName') || ss('adminEmail') || 'Admin';
        var role = (ss('adminRole') || '').replace(/_/g,' ');
        var date = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        var text = esc(name + ' · ' + role + ' · ' + date);

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

    var _lockEl   = null;
    var _isLocked = false;
    var _lockTmr  = null;

    function injectLockCSS() {
        if (document.getElementById('adminLockCSS')) return;
        var s = document.createElement('style');
        s.id  = 'adminLockCSS';
        s.textContent = [
            // Overlay
            '#adminLockScreen{',
                'position:fixed;inset:0;z-index:999999;',
                'background:rgba(3,5,14,.97);',
                'backdrop-filter:blur(40px) saturate(160%);',
                '-webkit-backdrop-filter:blur(40px) saturate(160%);',
                'display:flex;flex-direction:column;align-items:center;justify-content:center;',
                'padding:24px;box-sizing:border-box;',
                'animation:lkIn .35s cubic-bezier(.22,.68,0,1.15) both;}',
            '@keyframes lkIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',
            '@keyframes lkOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.97)}}',

            // Clock block above card
            '.lk-clock-wrap{',
                'display:flex;flex-direction:column;align-items:center;gap:4px;',
                'margin-bottom:32px;user-select:none;}',
            '.lk-clock{',
                'font-size:clamp(52px,9vw,76px);font-weight:200;color:#f1f5f9;',
                'letter-spacing:-2px;line-height:1;',
                'font-variant-numeric:tabular-nums;}',
            '.lk-date{font-size:14px;font-weight:500;color:#64748b;letter-spacing:.02em;}',

            // Card
            '.lk-card{',
                'width:100%;max-width:380px;',
                'padding:32px 28px 24px;',
                'background:rgba(255,255,255,.03);',
                'border:1px solid rgba(255,255,255,.08);',
                'border-radius:28px;',
                'box-shadow:0 32px 72px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.04);',
                'display:flex;flex-direction:column;align-items:center;gap:0;',
                'text-align:center;}',

            // Avatar row
            '.lk-av-row{display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:20px;}',
            '.lk-av{',
                'width:72px;height:72px;border-radius:50%;flex-shrink:0;',
                'background:linear-gradient(135deg,#3b82f6,#6366f1);',
                'display:flex;align-items:center;justify-content:center;',
                'font-size:26px;font-weight:800;color:#fff;letter-spacing:-1px;',
                'box-shadow:0 0 0 5px rgba(99,102,241,.15),0 12px 36px rgba(99,102,241,.4);}',
            '.lk-nm{font-size:18px;font-weight:700;color:#f1f5f9;letter-spacing:-.3px;line-height:1.2;}',
            '.lk-rl{',
                'display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;',
                'color:#818cf8;background:rgba(129,140,248,.1);border:1px solid rgba(129,140,248,.2);',
                'padding:3px 11px;border-radius:20px;}',

            // Divider
            '.lk-divider{width:100%;height:1px;background:rgba(255,255,255,.06);margin:4px 0 16px;}',

            // Info row
            '.lk-info{',
                'display:flex;align-items:center;gap:8px;justify-content:center;',
                'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);',
                'border-radius:10px;padding:7px 14px;',
                'font-size:11px;color:#64748b;width:100%;box-sizing:border-box;',
                'margin-bottom:14px;}',
            '.lk-dot{',
                'width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;',
                'box-shadow:0 0 7px #22c55e;animation:lkdot 2s ease-in-out infinite;}',
            '@keyframes lkdot{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}',

            // Session bar
            '.lk-sess-bar{',
                'width:100%;background:rgba(255,255,255,.05);border-radius:99px;',
                'height:2px;margin-bottom:16px;overflow:hidden;}',
            '.lk-sess-fill{height:100%;border-radius:99px;',
                'background:linear-gradient(90deg,#3b82f6,#6366f1);',
                'transition:width 1s linear;}',

            // Reason box
            '.lk-why{',
                'font-size:12px;color:#475569;line-height:1.65;',
                'background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);',
                'border-radius:10px;padding:10px 14px;',
                'margin-bottom:18px;width:100%;box-sizing:border-box;}',

            // Unlock button
            '.lk-btn{',
                'width:100%;padding:13px;border-radius:14px;',
                'background:linear-gradient(135deg,#3b82f6,#6366f1);',
                'color:#fff;font-size:14px;font-weight:700;font-family:inherit;',
                'border:none;cursor:pointer;',
                'display:flex;align-items:center;justify-content:center;gap:8px;',
                'box-shadow:0 6px 24px rgba(59,130,246,.4);',
                'transition:opacity .15s,box-shadow .15s,transform .12s;}',
            '.lk-btn:hover{opacity:.92;box-shadow:0 8px 32px rgba(59,130,246,.55);}',
            '.lk-btn:active{transform:scale(.98);}',
            '.lk-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;}',

            // Bottom actions row
            '.lk-actions{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:12px;}',
            '.lk-out{',
                'background:none;border:none;cursor:pointer;color:#475569;',
                'font-size:12px;font-family:inherit;padding:6px 10px;border-radius:8px;',
                'transition:color .15s;}',
            '.lk-out:hover{color:#94a3b8;}',
            '.lk-meta{font-size:10px;color:#334155;letter-spacing:.03em;}',
            '.lk-err{font-size:12px;color:#f87171;min-height:16px;margin-top:6px;width:100%;text-align:center;}',

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

        function _fmtClock() {
            var d = new Date();
            var h = d.getHours(), m = d.getMinutes();
            return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
        }
        function _fmtDate() {
            return new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
        }

        _lockEl = document.createElement('div');
        _lockEl.id = 'adminLockScreen';
        _lockEl.innerHTML =
            // Clock above card
            '<div class="lk-clock-wrap">' +
                '<div class="lk-clock" id="lkClock">' + _fmtClock() + '</div>' +
                '<div class="lk-date" id="lkDateStr">' + _fmtDate() + '</div>' +
            '</div>' +

            '<div class="lk-card">' +
                // Avatar + name
                '<div class="lk-av-row">' +
                    '<div class="lk-av">' + esc(initials(name)) + '</div>' +
                    '<div>' +
                        '<div class="lk-nm">' + esc(name) + '</div>' +
                        (role ? '<span class="lk-rl">' + esc(role) + '</span>' : '') +
                    '</div>' +
                '</div>' +

                '<div class="lk-divider"></div>' +

                (sinceStr
                    ? '<div class="lk-info"><div class="lk-dot"></div>' + esc(sinceStr) + '</div>'
                    : '') +
                '<div class="lk-sess-bar"><div class="lk-sess-fill" id="lkSessBar" style="width:' + sessBarPct + '%"></div></div>' +
                '<div class="lk-why">' + esc(reason || 'Screen locked. Click Unlock to verify your session and continue.') + '</div>' +

                '<button class="lk-btn" id="lkBtn">' +
                    lockIcon(15) +
                    '<span id="lkBtnTxt">Unlock Session</span>' +
                '</button>' +
                '<div class="lk-err" id="lkErr"></div>' +

                '<div class="lk-actions">' +
                    '<button class="lk-out" id="lkOut">Sign out instead</button>' +
                    '<div class="lk-meta" id="lkMeta"></div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(_lockEl);

        // Live clock + elapsed timer
        var _at = Date.now();
        _lockTmr = setInterval(function () {
            var cl = document.getElementById('lkClock');
            var dt = document.getElementById('lkDateStr');
            var m  = document.getElementById('lkMeta');
            if (cl) cl.textContent = _fmtClock();
            if (dt) dt.textContent = _fmtDate();
            if (m) {
                var sec = Math.floor((Date.now() - _at) / 1000);
                var min = Math.floor(sec / 60), s = sec % 60;
                m.textContent = 'Locked ' + (min > 0 ? min + 'm ' : '') + s + 's ago';
            }
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

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            showLockScreen('Locked with Ctrl+L.');
        }
    });

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

    function init() {
        injectWallThemeCSS();
        injectFAB();
        injectWatermark();
        initSensitiveMask();
        logSec('security_max_loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.adminSecurityMax = {
        lock:    function (reason) { showLockScreen(reason); },
        logout:  _forceLogout,
        journal: function () { return _journal.slice(); },
        maskReveal: function (el) { if (el) el.classList.toggle('revealed'); }
    };

})();
