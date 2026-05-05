/* admin-security-max.js — loaded on every admin page after auth */
(function () {
    'use strict';

    // ── Helpers ──────────────────────────────────────────────────────────────
    function escHtml(s) {
        return String(s || '')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function getInitials(name) {
        var p = String(name || '').trim().split(/\s+/);
        return (p.length >= 2 ? p[0][0] + p[p.length-1][0] : String(name||'A').substring(0,2)).toUpperCase();
    }

    // ── 1. PRINT PROTECTION ───────────────────────────────────────────────────
    var ps = document.createElement('style');
    ps.textContent = '@media print{html,body{display:none!important;}}';
    document.head.appendChild(ps);
    window.addEventListener('beforeprint', function() { document.documentElement.style.display = 'none'; });
    window.addEventListener('afterprint',  function() { document.documentElement.style.display = ''; });

    // ── 2. CLIPBOARD AUTO-WIPE (60 seconds) ───────────────────────────────────
    var _wipeTimer = null;
    function armClipboardWipe() {
        clearTimeout(_wipeTimer);
        _wipeTimer = setTimeout(function () {
            navigator.clipboard.writeText('').catch(function () {});
        }, 60000);
    }
    document.addEventListener('copy', armClipboardWipe);
    try {
        var _origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = function (text) {
            armClipboardWipe();
            return _origWrite(text);
        };
    } catch(e) {}

    // ── 3. RIGHT-CLICK SUPPRESS on sensitive data areas ───────────────────────
    document.addEventListener('contextmenu', function (e) {
        if (e.target.closest('table, .acct-card, .user-row, .metric-card, [data-sensitive]')) {
            e.preventDefault();
        }
    });

    // ── 4. LOCK SCREEN ────────────────────────────────────────────────────────
    var _lockEl    = null;
    var _isLocked  = false;
    var _lockTimer = null;

    function injectLockCSS() {
        if (document.getElementById('adminLockCSS')) return;
        var s = document.createElement('style');
        s.id = 'adminLockCSS';
        s.textContent = [
            '#adminLockScreen{',
                'position:fixed;inset:0;z-index:999999;',
                'background:rgba(8,12,22,.97);',
                'backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);',
                'display:flex;align-items:center;justify-content:center;',
                'animation:lockIn .28s cubic-bezier(.22,.68,0,1.2) both;',
            '}',
            '@keyframes lockIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',
            '@keyframes lockOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.97)}}',
            '.lock-inner{',
                'display:flex;flex-direction:column;align-items:center;gap:10px;',
                'width:100%;max-width:320px;padding:0 24px;text-align:center;',
            '}',
            '.lock-avatar{',
                'width:76px;height:76px;border-radius:50%;',
                'background:linear-gradient(135deg,#3b82f6,#6366f1);',
                'display:flex;align-items:center;justify-content:center;',
                'font-size:26px;font-weight:800;color:#fff;letter-spacing:-1px;',
                'box-shadow:0 0 0 4px rgba(59,130,246,.15),0 8px 32px rgba(99,102,241,.3);',
                'margin-bottom:6px;',
            '}',
            '.lock-name{font-size:20px;font-weight:700;color:#f1f5f9;letter-spacing:-.3px;}',
            '.lock-role{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;',
                'color:#3b82f6;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);',
                'padding:2px 10px;border-radius:20px;margin-bottom:4px;}',
            '.lock-sub{font-size:12px;color:#475569;line-height:1.55;margin-bottom:6px;}',
            '.lock-session{',
                'display:flex;align-items:center;gap:6px;',
                'font-size:11px;color:#334155;background:rgba(255,255,255,.03);',
                'border:1px solid rgba(255,255,255,.06);border-radius:8px;',
                'padding:5px 10px;margin-bottom:4px;',
            '}',
            '.lock-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;',
                'box-shadow:0 0 8px #22c55e;flex-shrink:0;animation:dotPulse2 1.8s ease-in-out infinite;}',
            '@keyframes dotPulse2{0%,100%{opacity:.5;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}',
            '.lock-unlock-btn{',
                'width:100%;padding:13px;border-radius:12px;',
                'background:linear-gradient(135deg,#3b82f6,#6366f1);',
                'color:#fff;font-size:14px;font-weight:700;font-family:inherit;',
                'border:none;cursor:pointer;display:flex;align-items:center;',
                'justify-content:center;gap:8px;',
                'transition:opacity .15s,transform .1s,box-shadow .15s;',
                'box-shadow:0 4px 20px rgba(59,130,246,.35);',
            '}',
            '.lock-unlock-btn:hover{opacity:.92;box-shadow:0 6px 28px rgba(59,130,246,.45);}',
            '.lock-unlock-btn:active{transform:scale(.98);}',
            '.lock-unlock-btn:disabled{opacity:.55;cursor:default;}',
            '.lock-logout-btn{',
                'background:none;border:none;cursor:pointer;color:#334155;',
                'font-size:11px;font-family:inherit;padding:6px 12px;border-radius:6px;',
                'transition:color .15s;margin-top:2px;',
            '}',
            '.lock-logout-btn:hover{color:#64748b;}',
            '.lock-elapsed{font-size:10px;color:#1e293b;margin-top:4px;letter-spacing:.03em;}',
            '.lock-err{font-size:12px;color:#f87171;margin-top:4px;min-height:16px;}',
            /* Floating lock button */
            '#adminLockFab{',
                'position:fixed;bottom:24px;right:24px;z-index:9998;',
                'width:40px;height:40px;border-radius:50%;',
                'background:var(--bg-surface,#fff);',
                'border:1px solid var(--border-light,#e5e7eb);',
                'box-shadow:0 2px 12px rgba(0,0,0,.1);',
                'display:flex;align-items:center;justify-content:center;',
                'cursor:pointer;transition:box-shadow .2s,transform .15s;',
                'color:var(--text-tertiary,#9ca3af);',
            '}',
            '#adminLockFab:hover{',
                'box-shadow:0 4px 20px rgba(0,0,0,.15);transform:scale(1.08);',
                'color:var(--primary,#6366f1);',
            '}',
        ].join('');
        document.head.appendChild(s);
    }

    function showLockScreen(reason) {
        if (_isLocked) return;
        _isLocked = true;
        injectLockCSS();

        var name  = sessionStorage.getItem('adminFullName') || sessionStorage.getItem('adminEmail') || 'Admin';
        var role  = (sessionStorage.getItem('adminRole') || '').replace(/_/g,' ');
        var since = sessionStorage.getItem('adminSessionStart');
        var sinceStr = '';
        if (since) {
            try { sinceStr = 'Session since ' + new Date(since).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); } catch(e){}
        }

        _lockEl = document.createElement('div');
        _lockEl.id = 'adminLockScreen';
        _lockEl.innerHTML =
            '<div class="lock-inner">' +
                '<div class="lock-avatar">' + escHtml(getInitials(name)) + '</div>' +
                '<div class="lock-name">'   + escHtml(name) + '</div>' +
                (role ? '<div class="lock-role">' + escHtml(role) + '</div>' : '') +
                (sinceStr ? '<div class="lock-session"><div class="lock-dot"></div><span>' + escHtml(sinceStr) + '</span></div>' : '') +
                '<div class="lock-sub">' + escHtml(reason || 'Screen locked. Click to verify your session.') + '</div>' +
                '<button class="lock-unlock-btn" id="lockUnlockBtn">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>' +
                    '<span>Unlock</span>' +
                '</button>' +
                '<div class="lock-err" id="lockErr"></div>' +
                '<button class="lock-logout-btn" id="lockLogoutBtn">Sign out instead</button>' +
                '<div class="lock-elapsed" id="lockElapsed"></div>' +
            '</div>';
        document.body.appendChild(_lockEl);

        var _lockedAt = Date.now();
        _lockTimer = setInterval(function () {
            var el = document.getElementById('lockElapsed');
            if (!el) { clearInterval(_lockTimer); return; }
            var sec = Math.floor((Date.now() - _lockedAt) / 1000);
            var m = Math.floor(sec / 60), s = sec % 60;
            el.textContent = 'Locked for ' + (m > 0 ? m + 'm ' : '') + s + 's';
        }, 1000);

        document.getElementById('lockUnlockBtn').addEventListener('click', async function () {
            var btn = this;
            var span = btn.querySelector('span');
            btn.disabled = true;
            span.textContent = 'Verifying…';
            var errEl = document.getElementById('lockErr');
            errEl.textContent = '';
            try {
                var token = sessionStorage.getItem('adminToken');
                var fp = window.deviceFingerprint ? await window.deviceFingerprint.get() : null;
                var res = await fetch('/admin-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'verify', token: token, deviceFingerprint: fp })
                });
                var data = await res.json();
                if (data.success) {
                    clearInterval(_lockTimer);
                    _lockEl.style.animation = 'lockOut .22s ease both';
                    setTimeout(function () {
                        if (_lockEl && _lockEl.parentNode) _lockEl.parentNode.removeChild(_lockEl);
                        _lockEl = null;
                        _isLocked = false;
                    }, 230);
                } else {
                    sessionStorage.clear();
                    localStorage.removeItem('adminGraceToken');
                    window.location.replace('/admin-login.html');
                }
            } catch (e) {
                span.textContent = 'Unlock';
                btn.disabled = false;
                if (errEl) errEl.textContent = 'Connection error — try again';
            }
        });

        document.getElementById('lockLogoutBtn').addEventListener('click', function () {
            sessionStorage.clear();
            localStorage.removeItem('adminGraceToken');
            window.location.replace('/admin-login.html');
        });
    }

    // ── 5. TAB VISIBILITY → AUTO-LOCK (5 minutes in background) ──────────────
    var _hiddenAt = null;
    var BLUR_LOCK_MS = 5 * 60 * 1000;
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

    // ── 6. FLOATING LOCK BUTTON ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        injectLockCSS();
        var fab = document.createElement('button');
        fab.id = 'adminLockFab';
        fab.title = 'Lock screen';
        fab.setAttribute('aria-label', 'Lock screen');
        fab.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        fab.addEventListener('click', function () { showLockScreen('Locked manually.'); });
        document.body.appendChild(fab);
    });

    // ── 7. EXPOSE GLOBALLY ────────────────────────────────────────────────────
    window.adminSecurityMax = { lock: showLockScreen };

})();
