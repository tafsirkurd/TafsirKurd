/* TafsirKurd App Hardening Layer v1 — loads before app.min.js */
(function () {
  'use strict';

  // ── 1. safeParse ──────────────────────────────────────────────────────────────
  // Global replacement for bare JSON.parse — never throws.
  window.safeParse = function (str, fallback) {
    if (str === null || str === undefined || str === '') return fallback !== undefined ? fallback : null;
    try { return JSON.parse(str); }
    catch (e) {
      if (window.HealthLog) HealthLog.add('json_parse_fail', String(str).slice(0, 80));
      return fallback !== undefined ? fallback : null;
    }
  };

  // ── 2. HealthLog ──────────────────────────────────────────────────────────────
  // Stores last 20 health events in localStorage. Exposed on window for app.js.
  var HL_KEY = '_tk_health_log';
  var HL_MAX = 20;

  window.HealthLog = {
    _mem: [],          // in-memory copy (fast access)
    _dirty: false,

    add: function (type, msg, extra) {
      var entry = { ts: Date.now(), type: String(type), msg: String(msg || '').slice(0, 200) };
      if (extra) entry.extra = String(extra).slice(0, 100);
      this._mem.push(entry);
      if (this._mem.length > HL_MAX) this._mem.shift();
      this._flush();
      // Mirror to console so logcat picks it up
      console.warn('[HealthLog]', type, msg);
    },

    _flush: function () {
      try {
        localStorage.setItem(HL_KEY, JSON.stringify(this._mem));
      } catch (e) { /* quota full — keep in-memory only */ }
    },

    load: function () {
      try {
        var raw = localStorage.getItem(HL_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) this._mem = parsed.slice(-HL_MAX);
        }
      } catch (e) {}
    },

    getAll: function () { return this._mem.slice(); },

    // Counts per type since given timestamp (default: last 24h)
    counts: function (since) {
      since = since || (Date.now() - 86400000);
      var c = {};
      this._mem.forEach(function (e) {
        if (e.ts >= since) c[e.type] = (c[e.type] || 0) + 1;
      });
      return c;
    },

    // Returns summary string for diagnostics UI
    summary: function () {
      var c = this.counts();
      return Object.keys(c).map(function (k) { return k + ':' + c[k]; }).join(', ') || 'clean';
    }
  };

  // Load persisted log immediately
  HealthLog.load();

  // ── 3. Translation Validator ──────────────────────────────────────────────────
  // Called before any translation object is applied to the DOM.
  var MOJI_RE = /[ØÙÚÛÜÃÂÅÆƒŠŽ]/;

  window.TranslationValidator = {
    validate: function (obj) {
      if (!obj || typeof obj !== 'object') return false;
      var keys = Object.keys(obj);
      if (keys.length === 0) return false;
      var badCount = 0;
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = obj[k];
        // Skip internal meta keys
        if (k.charAt(0) === '_') continue;
        if (typeof v !== 'string') { badCount++; continue; }
        if (v.length > 10000) { badCount++; HealthLog.add('i18n_invalid', 'key too long: ' + k); continue; }
        if (v === '[object Object]') { badCount++; continue; }
        if (v === 'undefined') { badCount++; continue; }
        if (MOJI_RE.test(v)) {
          badCount++;
          HealthLog.add('i18n_mojibake', 'key=' + k + ' val=' + v.slice(0, 40));
        }
      }
      var ratio = badCount / Math.max(keys.length, 1);
      if (ratio > 0.05) {
        HealthLog.add('i18n_rejected', 'bad ratio=' + ratio.toFixed(2) + ' count=' + badCount);
        return false;
      }
      return true;
    },

    // Strips bad individual entries, returns cleaned copy (single-key validation)
    clean: function (obj) {
      if (!obj || typeof obj !== 'object') return {};
      var out = {};
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = obj[k];
        if (k.charAt(0) === '_') { out[k] = v; continue; }
        if (typeof v !== 'string' || v.length > 10000 || v === '[object Object]') continue;
        if (MOJI_RE.test(v)) { HealthLog.add('i18n_entry_dropped', k); continue; }
        out[k] = v;
      }
      return out;
    }
  };

  // ── 4. CrashShield — wraps a function with try/catch + optional fallback ─────
  window.CrashShield = {
    // Wrap fn — returns a shielded version. onError(err, name) called on failure.
    wrap: function (fn, name, onError) {
      return function () {
        try {
          return fn.apply(this, arguments);
        } catch (e) {
          HealthLog.add('render_crash', (name || 'unknown') + ': ' + (e && e.message || e));
          if (onError) { try { onError(e, name); } catch (e2) {} }
        }
      };
    },

    // Remove any existing fallback card from a panel (called on successful render)
    clearFallback: function (panelId) {
      var panel = document.getElementById(panelId);
      if (!panel) return;
      var fb = panel.querySelector('.hardening-fallback');
      if (fb) fb.parentNode.removeChild(fb);
    },

    // Show a fallback card — only when the panel has no real content and no card yet
    showFallback: function (panelId, label) {
      var panel = document.getElementById(panelId);
      if (!panel) return;
      // Don't double-inject
      if (panel.querySelector('.hardening-fallback')) return;
      // Don't inject if panel has substantial content (more than one non-fallback child)
      var realChildren = 0;
      for (var i = 0; i < panel.children.length; i++) {
        if (!panel.children[i].classList.contains('hardening-fallback')) realChildren++;
      }
      if (realChildren > 1) return;
      var card = document.createElement('div');
      card.className = 'hardening-fallback';
      card.style.cssText = 'padding:32px 16px;text-align:center;color:#888;font-size:14px;';
      var icon = document.createElement('div');
      icon.textContent = '⚠';
      icon.style.cssText = 'font-size:32px;margin-bottom:12px;';
      var msg = document.createElement('div');
      msg.textContent = (label || 'Module') + ' — بارکردن سەرنەکەفت';
      var retry = document.createElement('button');
      retry.textContent = 'دووبارە هەوڵبدە';
      retry.style.cssText = 'margin-top:16px;padding:8px 20px;border-radius:8px;border:1px solid #ccc;background:#f5f5f5;font-size:13px;cursor:pointer;';
      retry.onclick = function () { if (window.location) window.location.reload(); };
      card.appendChild(icon);
      card.appendChild(msg);
      card.appendChild(retry);
      panel.appendChild(card);
    }
  };

  // ── 5. SafeLoader — script loading with timeout, retry, fallback ──────────────
  window.SafeLoader = {
    TIMEOUT_MS: 12000,
    MAX_RETRIES: 1,

    load: function (src, onDone, onFail) {
      this._attempt(src, 0, onDone, onFail);
    },

    _attempt: function (src, attempt, onDone, onFail) {
      var self = this;
      var settled = false;
      var s = document.createElement('script');
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        HealthLog.add('script_timeout', src + ' attempt=' + attempt);
        s.onload = s.onerror = null;
        if (attempt < self.MAX_RETRIES) {
          self._attempt(src, attempt + 1, onDone, onFail);
        } else {
          HealthLog.add('script_fail', src + ' all attempts exhausted');
          if (onFail) try { onFail(src); } catch (e) {}
          if (onDone) try { onDone(); } catch (e) {}
        }
      }, this.TIMEOUT_MS);

      s.onload = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (onDone) try { onDone(); } catch (e) {}
      };
      s.onerror = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        HealthLog.add('script_load_error', src + ' attempt=' + attempt);
        if (attempt < self.MAX_RETRIES) {
          setTimeout(function () { self._attempt(src, attempt + 1, onDone, onFail); }, 800);
        } else {
          HealthLog.add('script_fail', src + ' failed after retries');
          if (onFail) try { onFail(src); } catch (e) {}
          if (onDone) try { onDone(); } catch (e) {}
        }
      };
      s.src = src;
      document.body.appendChild(s);
    }
  };

  // ── 6. Crash Counter + Emergency Safe Mode ────────────────────────────────────
  var CC_KEY    = '_tk_crash_pending';
  var CC_COUNT  = '_tk_crash_count';
  var CC_TS     = '_tk_crash_ts';
  var SM_KEY    = '_tk_safe_mode';
  var CRASH_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  var CRASH_THRESHOLD = 3;

  // On every cold start: check if previous launch was pending (= crashed)
  (function () {
    var prev = localStorage.getItem(CC_KEY);
    if (prev) {
      // Previous launch didn't clear the flag → count as crash
      var count = parseInt(localStorage.getItem(CC_COUNT) || '0', 10) + 1;
      var prevTs = parseInt(prev, 10);
      if (Date.now() - prevTs > CRASH_WINDOW_MS) count = 1; // outside window → reset
      try {
        localStorage.setItem(CC_COUNT, String(count));
        localStorage.setItem(CC_TS, String(Date.now()));
      } catch (e) {}
      HealthLog.add('crash_detected', 'count=' + count);

      if (count >= CRASH_THRESHOLD) {
        try { localStorage.setItem(SM_KEY, '1'); } catch (e) {}
        HealthLog.add('safe_mode_triggered', 'count=' + count);
        window._tkSafeMode = true;
        window._tkCrashCount = count;
      }
    }
    // Mark this launch as pending — cleared on successful splash dismiss
    try { localStorage.setItem(CC_KEY, String(Date.now())); } catch (e) {}
  })();

  // Call this when the app successfully loads (splash dismissed)
  window._tkMarkCleanLaunch = function () {
    try {
      localStorage.removeItem(CC_KEY);
      localStorage.removeItem(CC_COUNT);
      localStorage.removeItem(SM_KEY);
    } catch (e) {}
    window._tkSafeMode = false;
    window._tkCrashCount = 0;
  };

  // Expose safe mode state
  window._tkSafeMode = window._tkSafeMode || (localStorage.getItem(SM_KEY) === '1');

  // Show recovery banner if in safe mode (injected when DOM is ready)
  if (window._tkSafeMode) {
    document.addEventListener('DOMContentLoaded', function () {
      var banner = document.createElement('div');
      banner.id = 'tk-recovery-banner';
      banner.style.cssText = [
        'position:fixed;top:0;left:0;right:0;z-index:99999',
        'background:#b91c1c;color:#fff;padding:10px 14px',
        'display:flex;align-items:center;gap:10px',
        'font-size:13px;font-family:sans-serif'
      ].join(';');
      var icon = document.createElement('span');
      icon.textContent = '⚠';
      var text = document.createElement('span');
      text.style.flex = '1';
      text.textContent = 'ئەپ ' + (window._tkCrashCount || 3) + ' جار داهاتووە. دەستکەوتی کەمینە چالاک کرا.';
      var btn = document.createElement('button');
      btn.textContent = '×';
      btn.style.cssText = 'background:none;border:none;color:inherit;font-size:18px;cursor:pointer;padding:0 4px';
      btn.onclick = function () { if (banner.parentNode) banner.parentNode.removeChild(banner); };
      var reset = document.createElement('button');
      reset.textContent = 'ڕیست';
      reset.style.cssText = 'background:rgba(255,255,255,.2);border:none;color:#fff;padding:4px 10px;border-radius:5px;font-size:12px;cursor:pointer';
      reset.onclick = function () {
        window._tkMarkCleanLaunch();
        window.location.reload();
      };
      banner.appendChild(icon);
      banner.appendChild(text);
      banner.appendChild(reset);
      banner.appendChild(btn);
      document.body.appendChild(banner);
    });
  }

  // ── 7. Global error handlers ──────────────────────────────────────────────────
  var _prevOnerror = window.onerror;
  window.onerror = function (msg, src, line, col, err) {
    HealthLog.add('js_error', (msg || '').slice(0, 120) + ' @' + (src || '').split('/').pop() + ':' + line);
    if (_prevOnerror) try { _prevOnerror(msg, src, line, col, err); } catch (e) {}
    return false; // don't suppress — let browser also log it
  };

  var _prevUPR = window.onunhandledrejection;
  window.onunhandledrejection = function (ev) {
    var reason = ev && ev.reason;
    var msg = reason ? (reason.message || String(reason)) : 'unknown rejection';
    HealthLog.add('unhandled_promise', msg.slice(0, 120));
    if (_prevUPR) try { _prevUPR(ev); } catch (e) {}
  };

  // ── 8. Expose diagnostics API ─────────────────────────────────────────────────
  window.TKDiag = {
    health: function () { return HealthLog.getAll(); },
    summary: function () { return HealthLog.summary(); },
    safeMode: function () { return !!window._tkSafeMode; },
    resetSafeMode: function () { window._tkMarkCleanLaunch(); },
    crashCount: function () { return window._tkCrashCount || 0; }
  };

})();
