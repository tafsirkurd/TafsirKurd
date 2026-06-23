// app-error-reporter.js v2 — comprehensive anonymous error telemetry
// Loaded early so boot errors are captured. No PII: IP hashed server-side.
(function(w, d) {
  'use strict';

  var EP          = '/app-error-report';
  var MAX_REPORTS = 25;
  var MAX_CRUMBS  = 12;

  var _sent    = 0;
  var _session = _uid();
  var _crumbs  = [];

  function _uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function _platform() {
    try {
      if (w.Capacitor && w.Capacitor.getPlatform) return w.Capacitor.getPlatform();
      if (w.Capacitor) return 'capacitor';
    } catch(e) {}
    var ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    return 'web';
  }

  function _version() {
    try {
      var m = d.querySelector('meta[name="app-version"]');
      if (m && m.content) return m.content.slice(0, 20);
    } catch(e) {}
    return '';
  }

  function _connection() {
    try {
      if (!navigator.onLine) return 'offline';
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return 'online';
      return c.effectiveType || c.type || 'online';
    } catch(e) { return 'unknown'; }
  }

  function _tab() {
    try {
      if (w.GencineUI && w.GencineUI._view) return 'gencine:' + w.GencineUI._view;
      var hash = (w.location.hash || '').replace('#', '');
      return hash || w.location.pathname.split('/').filter(Boolean).pop() || 'home';
    } catch(e) { return 'unknown'; }
  }

  function _component(src) {
    src = String(src || '');
    if (!src) return '';
    if (src.includes('prayer'))      return 'prayer';
    if (src.includes('smart-dhikr')) return 'smart-slides';
    if (src.includes('dhikr') || src.includes('gencine')) return 'gencine';
    if (src.includes('mushaf'))      return 'mushaf';
    if (src.includes('audio'))       return 'audio';
    if (src.includes('i18n'))        return 'i18n';
    if (src.includes('quran'))       return 'quran';
    if (src.includes('qibla'))       return 'qibla';
    if (src.includes('pdf-store'))   return 'books';
    if (src.includes('app.min') || src.includes('app.js')) return 'app';
    return '';
  }

  function _fingerprint(type, msg, stack) {
    var key = (type || '') + ':' + (msg || '').slice(0, 80) + ':' + ((stack || '').split('\n')[0] || '').slice(0, 80);
    var h = 5381;
    for (var i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  // ── Core send ──────────────────────────────────────────────────────────────
  function _send(type, msg, opts) {
    if (_sent >= MAX_REPORTS) return;
    _sent++;
    opts = opts || {};

    var payload = {
      error_type:      String(type || 'unknown').slice(0, 50),
      error_message:   String(msg  || '').slice(0, 500),
      stack_trace:     String(opts.stack    || '').slice(0, 2000),
      severity:        String(opts.severity || 'error').slice(0, 20),
      component:       String(opts.component || _component(opts.src || '') || '').slice(0, 50),
      page_context:    String(opts.page || _tab()).slice(0, 100),
      tab_context:     _tab(),
      session_id:      _session,
      platform:        _platform(),
      app_version:     _version(),
      user_agent:      (navigator.userAgent || '').slice(0, 200),
      connection_type: _connection(),
      breadcrumbs:     JSON.stringify(_crumbs).slice(0, 1000),
      fingerprint:     _fingerprint(type, msg, opts.stack),
      url:             (w.location.href || '').slice(0, 200),
    };

    try {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (navigator.sendBeacon && navigator.sendBeacon(EP, blob)) return;
      fetch(EP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function() {});
    } catch(e) {}
  }

  // ── Breadcrumbs ────────────────────────────────────────────────────────────
  function _crumb(type, label) {
    _crumbs.push({ t: type, l: String(label || '').slice(0, 40), ts: Date.now() });
    if (_crumbs.length > MAX_CRUMBS) _crumbs.shift();
  }

  d.addEventListener('click', function(e) {
    try {
      var el = e.target.closest('[data-tab],[data-section],[data-view],a[href^="#"],.tab-btn,.gencine-tab-btn,.nav-tab');
      if (el) {
        var label = el.dataset.tab || el.dataset.section || el.dataset.view
                  || el.getAttribute('href') || (el.textContent || '').trim().slice(0, 20);
        if (label) _crumb('tap', label);
      }
    } catch(ex) {}
  }, true);

  // ── Known third-party false positives ─────────────────────────────────────
  var _NOISE_MSG = [
    '_AutofillCallbackHandler',   // Instagram IAB on iOS injects this reference
    "Cannot assign to read only property 'pushState'", // Cloudflare beacon.min.js on old Chrome
  ];
  var _NOISE_SRC = [
    'cloudflareinsights.com',     // Cloudflare Web Analytics beacon — not our code
  ];

  function _isNoise(msg, src) {
    var m = String(msg || ''), s = String(src || '');
    for (var i = 0; i < _NOISE_MSG.length; i++) {
      if (m.indexOf(_NOISE_MSG[i]) !== -1) return true;
    }
    for (var j = 0; j < _NOISE_SRC.length; j++) {
      if (s.indexOf(_NOISE_SRC[j]) !== -1) return true;
    }
    return false;
  }

  // ── Global error capture ───────────────────────────────────────────────────
  var _prevOnerror = w.onerror;
  w.onerror = function(msg, src, line, col, err) {
    if (_isNoise(msg, src)) return false;
    _send('js_error', msg, {
      stack:    err ? err.stack : (String(src || '') + ':' + line + ':' + col),
      severity: 'error',
      src:      src,
    });
    if (typeof _prevOnerror === 'function') return _prevOnerror.apply(this, arguments);
    return false;
  };

  w.addEventListener('unhandledrejection', function(e) {
    var r = e.reason;
    var msg = r ? (r.message || String(r)) : 'Unhandled Promise rejection';
    _send('js_error', msg, {
      stack:     r && r.stack,
      severity:  'error',
      component: 'promise',
    });
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  w.ErrorReporter = {
    report:     _send,
    breadcrumb: _crumb,

    network: function(url, status, component) {
      _send('network_error', 'HTTP ' + status + ': ' + String(url || '').slice(0, 120), {
        severity:  status >= 500 ? 'error' : 'warning',
        component: component || 'network',
      });
    },

    cache: function(key, sizeKB, errName) {
      _send('cache_error', 'localStorage write failed: ' + key, {
        severity:  'warning',
        component: 'cache',
        stack:     'key=' + key + ' ~' + sizeKB + 'KB err=' + (errName || 'QuotaExceededError'),
      });
    },

    db: function(table, op, errMsg) {
      _send('db_error', table + ' ' + op + ' failed: ' + String(errMsg || '').slice(0, 100), {
        severity:  'error',
        component: 'supabase',
      });
    },

    warn: function(component, message) {
      _send('warning', message, { severity: 'warning', component: component });
    },

    critical: function(component, message, stack) {
      _send('critical_error', message, { severity: 'critical', component: component, stack: stack });
    },
  };

})(window, document);
