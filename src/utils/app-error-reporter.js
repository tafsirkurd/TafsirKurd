/* ================================================================
   app-error-reporter.js  v1
   Catches uncaught JS errors and unhandled rejections and POSTs
   them to /app-error-report (Cloudflare Worker → app_error_logs).

   What it reports:
     • window.onerror          — uncaught exceptions
     • unhandledrejection      — unhandled promise rejections
     • AppErrors.report()      — manual reports from anywhere
     • logger.error() hook     — if logger.js is loaded

   Limits:
     • Max 10 reports per session (sessionStorage counter)
     • Same error message deduped within 60 s
     • Only on tafsirkurd.com (silent on localhost/dev)
     • Network errors from the reporter itself are swallowed
   ================================================================ */
(function () {
  'use strict';

  var ENDPOINT      = 'https://tafsirkurd.com/app-error-report';
  var SESSION_KEY   = 'aer_count_v1';
  var MAX_PER_SESSION = 10;

  // Only report on production domain
  var _enabled = (window.location.hostname === 'tafsirkurd.com');

  // ── cached state ──────────────────────────────────────────────
  var _platform   = 'web';
  var _appVersion = null;
  var _sessionId  = null;
  var _recentMsgs = {}; // message → timestamp, for 60s dedup

  // ── session ID ────────────────────────────────────────────────
  function _getSessionId() {
    if (_sessionId) return _sessionId;
    try {
      var id = sessionStorage.getItem('aer_sid');
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('aer_sid', id);
      }
      _sessionId = id;
    } catch(e) {
      _sessionId = 'nostorage';
    }
    return _sessionId;
  }

  // ── rate limit ────────────────────────────────────────────────
  function _canSend() {
    try {
      var n = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
      return n < MAX_PER_SESSION;
    } catch(e) { return true; }
  }
  function _bumpCount() {
    try {
      var n = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
      sessionStorage.setItem(SESSION_KEY, String(n + 1));
    } catch(e) {}
  }

  // ── dedup: same message within 60 s → skip ───────────────────
  function _isDupe(msg) {
    var now = Date.now();
    var key = String(msg || '').slice(0, 120);
    if (_recentMsgs[key] && (now - _recentMsgs[key]) < 60000) return true;
    _recentMsgs[key] = now;
    return false;
  }

  // ── classify error type ───────────────────────────────────────
  function _classify(msg, stack) {
    var m = String(msg || '').toLowerCase();
    var s = String(stack || '').toLowerCase();
    if (m.includes('network') || m.includes('fetch') || m.includes('load') ||
        m.includes('failed to fetch') || m.includes('networkerror'))
      return 'network_error';
    if (m.includes('render') || m.includes('display') || m.includes('paint') ||
        s.includes('render') || s.includes('buildpanel') || s.includes('buildview'))
      return 'render_error';
    if (m.includes('translation') || m.includes('i18n') || m.includes('t(') ||
        s.includes('i18n') || s.includes('translations'))
      return 'i18n_error';
    return 'js_error';
  }

  // ── sanitise string ───────────────────────────────────────────
  function _san(v, max) {
    if (v === null || v === undefined) return null;
    return String(v).slice(0, max || 200);
  }

  // ── send ──────────────────────────────────────────────────────
  function _send(type, message, stack, context) {
    if (!_enabled) return;
    if (!_canSend()) return;
    if (_isDupe(message)) return;
    _bumpCount();

    var body = {
      platform:      _platform,
      app_version:   _appVersion,
      error_type:    type || 'js_error',
      error_message: _san(message, 500),
      stack_trace:   _san(stack, 2000),
      page_context:  _san(context || window.location.pathname, 100),
      session_id:    _getSessionId(),
    };

    // Use sendBeacon when available (survives page unload), fall back to fetch
    try {
      var json = JSON.stringify(body);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([json], { type: 'application/json' }));
      } else {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
          keepalive: true,
        }).catch(function() {});
      }
    } catch(e) { /* never throw from the reporter */ }
  }

  // ── resolve platform + version (async, Capacitor native) ─────
  function _resolveNativeInfo() {
    try {
      if (!window.Capacitor || !Capacitor.Plugins || !Capacitor.Plugins.App) return;
      _platform = Capacitor.getPlatform ? Capacitor.getPlatform() : 'web';
      Capacitor.Plugins.App.getInfo().then(function(info) {
        if (info && info.version) {
          _appVersion = info.build ? info.version + '.' + info.build : info.version;
        }
      }).catch(function() {});
    } catch(e) {}
  }

  // ── window.onerror ────────────────────────────────────────────
  var _prevOnError = window.onerror;
  window.onerror = function(msg, src, line, col, error) {
    var _msg = String(msg || '');

    // "Script error." with no source/line is the browser's cross-origin sanitization.
    // It is always produced by errors inside cross-origin iframes (YouTube embeds,
    // browser extensions, third-party widgets) and never contains actionable info.
    // Reporting it fills the log with noise — skip it entirely.
    if (_msg === 'Script error.' || _msg === 'Script error') {
      if (_prevOnError) return _prevOnError.apply(this, arguments);
      return false;
    }

    // Service worker script load failures are handled gracefully: both the landing page
    // and the app already have .catch() on navigator.serviceWorker.register(). These
    // failures are always transient (network blip, CDN moment, browser update check)
    // and never actionable. Some browsers also fire window.onerror for them, which
    // would otherwise flood the error log.
    if (_msg.indexOf('service-worker') !== -1 || String(src || '').indexOf('service-worker') !== -1) {
      if (_prevOnError) return _prevOnError.apply(this, arguments);
      return false;
    }
    var stack = error && error.stack ? error.stack : (src + ':' + line + ':' + col);
    var type  = _classify(_msg, stack);
    _send(type, _msg, stack, null);
    if (_prevOnError) return _prevOnError.apply(this, arguments);
    return false;
  };

  // ── unhandledrejection ────────────────────────────────────────
  window.addEventListener('unhandledrejection', function(ev) {
    var reason = ev.reason;
    var msg    = reason instanceof Error ? reason.message : String(reason || 'Unhandled rejection');
    var stack  = reason instanceof Error ? reason.stack   : null;
    // SW load failures are transient network blips — same logic as in window.onerror
    if (msg.indexOf('service-worker') !== -1 || msg.indexOf('ServiceWorker') !== -1) return;
    _send(_classify(msg, stack), msg, stack, null);
  });

  // ── hook logger.js if present ─────────────────────────────────
  function _hookLogger() {
    if (!window.logger || !window.logger.error || window.logger.__aerHooked) return;
    var orig = window.logger.error.bind(window.logger);
    window.logger.error = function() {
      orig.apply(null, arguments);
      try {
        var msg   = Array.prototype.slice.call(arguments).join(' ');
        var stack = arguments[0] instanceof Error ? arguments[0].stack : null;
        _send(_classify(msg, stack), msg, stack, 'logger');
      } catch(e) {}
    };
    window.logger.__aerHooked = true;
  }

  // ── public API ────────────────────────────────────────────────
  window.AppErrors = {
    // Manual report: AppErrors.report('network_error', 'Prayer fetch failed', err.stack)
    report: function(type, message, stack, context) {
      _send(type || 'js_error', message, stack, context);
    },
    // Enable/disable (e.g. during tests)
    enable:  function() { _enabled = true; },
    disable: function() { _enabled = false; },
  };

  // ── init ──────────────────────────────────────────────────────
  _resolveNativeInfo();
  // Hook logger if it's already loaded, or wait for it
  if (window.logger) {
    _hookLogger();
  } else {
    var _t = 0;
    var _w = setInterval(function() {
      if (window.logger) { _hookLogger(); clearInterval(_w); }
      else if (++_t > 20) clearInterval(_w);
    }, 300);
  }
})();
