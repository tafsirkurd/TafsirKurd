/* TafsirKurd — AppRuntime v1
   Central UI Runtime: lifecycle, network, safe-area, keyboard, cleanup registry.
   Loaded synchronously before app.min.js. Sets window.AppRuntime immediately.

   Event reference:
     'background'     — app went to background (visibilitychange OR appStateChange, deduped)
     'resume'         — app came to foreground (visibilitychange OR appStateChange, deduped)
     'pagehide'       — page unload (belt-and-suspenders; fire separate from 'background')
     'visibilityChange'— raw, every visibilitychange (not deduped)
     'appStateChange' — raw Capacitor native event (not deduped)
     'online'         — network restored
     'offline'        — network lost
     'resize'         — window resized (coalesced, includes safe-area values)
     'keyboardShow'   — keyboard opened (Capacitor only)
     'keyboardHide'   — keyboard closed (Capacitor only)
     'ready'          — runtime fully initialised
*/
(function () {
  'use strict';

  // ── Internal state ─────────────────────────────────────────────────────────
  var _state       = 'init';   // init | active | background | destroyed
  var _isOnline    = navigator.onLine;
  var _isVisible   = !document.hidden;
  var _safeTop     = 0;
  var _safeBottom  = 0;
  var _kbOpen      = false;
  var _kbHeight    = 0;
  var _bgAt        = 0;
  var _resumeAt    = 0;
  var _resumeCount = 0;

  // ── Event bus ──────────────────────────────────────────────────────────────
  var _bus = {};

  function _emit(type, data) {
    var arr = _bus[type];
    if (!arr || !arr.length) return;
    for (var i = 0; i < arr.length; i++) {
      try { arr[i](data); }
      catch (e) { console.warn('[AppRuntime] listener error "' + type + '":', e); }
    }
  }

  // Returns an unsubscribe function.
  function _on(type, fn) {
    if (!_bus[type]) _bus[type] = [];
    if (_bus[type].indexOf(fn) === -1) _bus[type].push(fn);
    return function off() { _off(type, fn); };
  }

  function _off(type, fn) {
    var arr = _bus[type];
    if (!arr) return;
    var idx = arr.indexOf(fn);
    if (idx >= 0) arr.splice(idx, 1);
  }

  // ── Cleanup registry ──────────────────────────────────────────────────────
  var _cleanupFns = [];
  function _onCleanup(fn) { _cleanupFns.push(fn); }
  function _runCleanup() {
    var fns = _cleanupFns.splice(0);
    for (var i = 0; i < fns.length; i++) { try { fns[i](); } catch (e) {} }
  }

  // ── Safe-area ─────────────────────────────────────────────────────────────
  function _readSafeAreas() {
    try {
      var s = getComputedStyle(document.documentElement);
      _safeTop    = parseInt(s.getPropertyValue('--safe-t').trim()) || 0;
      _safeBottom = parseInt(s.getPropertyValue('--safe-b').trim()) || 0;
    } catch (e) {}
  }

  // ── Deduplication for background/resume ───────────────────────────────────
  // On native Capacitor, visibilitychange fires ~100ms before appStateChange.
  // Dedup window: events within 600ms of the same type are collapsed to one.
  var _lastBgTs = 0;
  var _lastRsTs = 0;
  var DEDUP_MS  = 600;

  function _onBackground(source) {
    var now = Date.now();
    _isVisible = false;
    _state = 'background';
    _bgAt  = now;
    if (now - _lastBgTs < DEDUP_MS) return; // duplicate — skip
    _lastBgTs = now;
    _emit('background', { at: now, source: source });
  }

  function _onResume(source) {
    var now = Date.now();
    _isVisible = true;
    _state = 'active';
    _resumeAt = now;
    if (now - _lastRsTs < DEDUP_MS) return; // duplicate — skip
    _lastRsTs = now;
    _resumeCount++;
    _emit('resume', { at: now, source: source, count: _resumeCount });
  }

  // ── DOM listener: visibilitychange (ONE owner) ────────────────────────────
  function _handleVisibility() {
    if (document.hidden) {
      _onBackground('visibilitychange');
    } else {
      _onResume('visibilitychange');
    }
    _emit('visibilityChange', { hidden: document.hidden });
  }

  // ── DOM listener: pagehide (ONE owner) ────────────────────────────────────
  // pagehide fires on page unload — separate from background, not deduped.
  function _handlePageHide() {
    _emit('pagehide', {});
  }

  // ── DOM listeners: network (ONE owner each) ───────────────────────────────
  function _handleOnline()  { _isOnline = true;  _emit('online', {}); }
  function _handleOffline() { _isOnline = false; _emit('offline', {}); }

  // ── DOM listener: resize + safe-area (ONE owner, coalesced) ──────────────
  var _resizeTimer = null;
  function _handleResize() {
    _readSafeAreas();
    if (_resizeTimer) return; // coalesce rapid events
    _resizeTimer = setTimeout(function () {
      _resizeTimer = null;
      _emit('resize', { safeTop: _safeTop, safeBottom: _safeBottom });
    }, 80);
  }

  // ── DOM listener: scroll-pause class (ONE owner) ──────────────────────────
  // Adds tk-scrolling to <body> during scroll so CSS can pause GPU animations.
  var _scrollTimer = null;
  function _handleScroll() {
    document.body.classList.add('tk-scrolling');
    if (_scrollTimer) clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(function () {
      _scrollTimer = null;
      document.body.classList.remove('tk-scrolling');
    }, 120);
  }

  // Install all owned DOM listeners immediately (synchronous, before DOMContentLoaded)
  document.addEventListener('visibilitychange', _handleVisibility, false);
  window.addEventListener('pagehide',  _handlePageHide,  false);
  window.addEventListener('online',    _handleOnline,    false);
  window.addEventListener('offline',   _handleOffline,   false);
  window.addEventListener('resize',    _handleResize,    { passive: true });
  document.addEventListener('scroll',  _handleScroll,    { passive: true, capture: true });

  // ── Capacitor: appStateChange (ONE owner) ─────────────────────────────────
  var _capAdded = false;
  function _hookCapacitor() {
    if (_capAdded) return;
    var AP = window.Capacitor &&
             window.Capacitor.Plugins &&
             window.Capacitor.Plugins.App;
    if (!AP) return;
    _capAdded = true;
    try {
      AP.addListener('appStateChange', function (s) {
        if (!s.isActive) {
          _onBackground('appStateChange');
          _emit('appStateChange', { isActive: false });
        } else {
          _onResume('appStateChange');
          _emit('appStateChange', { isActive: true });
        }
      });
    } catch (e) { console.warn('[AppRuntime] appStateChange hook failed:', e); }
  }

  // ── Capacitor: Keyboard (ONE owner) ───────────────────────────────────────
  var _kbAdded = false;
  function _hookKeyboard() {
    if (_kbAdded) return;
    var KB = window.Capacitor &&
             window.Capacitor.Plugins &&
             window.Capacitor.Plugins.Keyboard;
    if (!KB) return;
    _kbAdded = true;
    try {
      KB.addListener('keyboardWillShow', function (info) {
        _kbOpen   = true;
        _kbHeight = (info && info.keyboardHeight) || 0;
        _emit('keyboardShow', { height: _kbHeight });
      });
      KB.addListener('keyboardWillHide', function () {
        _kbOpen   = false;
        _kbHeight = 0;
        _emit('keyboardHide', {});
      });
    } catch (e) {}
  }

  // ── Init (called on DOMContentLoaded) ────────────────────────────────────
  function _init() {
    if (_state !== 'init') return; // guard against double-call
    _state    = 'active';
    _isOnline = navigator.onLine;
    _isVisible = !document.hidden;
    _readSafeAreas();
    _hookCapacitor();
    _hookKeyboard();
    _emit('ready', {
      isOnline:  _isOnline,
      safeTop:   _safeTop,
      safeBottom: _safeBottom,
      perfLevel: (window.TKPerf && window.TKPerf.level) || 'high',
    });
    console.log('[AppRuntime] ready — online=' + _isOnline +
      ' perf=' + ((window.TKPerf && window.TKPerf.level) || '?'));
  }

  // ── Metrics ───────────────────────────────────────────────────────────────
  function _getMetrics() {
    var total = 0;
    for (var k in _bus) {
      if (Object.prototype.hasOwnProperty.call(_bus, k)) total += _bus[k].length;
    }
    return {
      state:          _state,
      isOnline:       _isOnline,
      isVisible:      _isVisible,
      bgAt:           _bgAt,
      resumeAt:       _resumeAt,
      resumeCount:    _resumeCount,
      listenerCount:  total,
      cleanupPending: _cleanupFns.length,
    };
  }

  // ── Scheduler ────────────────────────────────────────────────────────────
  // Centralizes all setInterval / setTimeout / requestAnimationFrame.
  // Intervals and rAF loops auto-pause when the app backgrounds and
  // auto-resume on foreground. Timeouts are fire-and-forget with cancel().
  var _intervals   = [];
  var _rafLoops    = [];
  var _timeouts    = [];
  var _schedPaused = false;

  function _schedInterval(fn, ms, label) {
    var entry = { fn: fn, ms: ms, label: label || '', rawId: null, paused: false };
    entry.rawId = setInterval(fn, ms);
    _intervals.push(entry);
    return {
      cancel: function() {
        if (entry.rawId) { clearInterval(entry.rawId); entry.rawId = null; }
        entry.cancelled = true;
        var i = _intervals.indexOf(entry);
        if (i >= 0) _intervals.splice(i, 1);
      }
    };
  }

  function _schedTimeout(fn, ms, label) {
    var entry = { label: label || '', rawId: null };
    entry.rawId = setTimeout(function() {
      entry.rawId = null;
      var i = _timeouts.indexOf(entry);
      if (i >= 0) _timeouts.splice(i, 1);
      fn();
    }, ms);
    _timeouts.push(entry);
    return {
      cancel: function() {
        if (entry.rawId) { clearTimeout(entry.rawId); entry.rawId = null; }
        var i = _timeouts.indexOf(entry);
        if (i >= 0) _timeouts.splice(i, 1);
      }
    };
  }

  // fn(ts) — called every animation frame. Return false to stop the loop.
  // The scheduler owns rescheduling; fn must NOT call requestAnimationFrame itself.
  function _schedRaf(fn, label) {
    var entry = { fn: fn, label: label || '', rawId: null, alive: true };
    function _tick(ts) {
      if (!entry.alive) return;
      var cont = fn(ts);
      if (cont === false) {
        entry.alive = false;
        entry.rawId = null;
        var i = _rafLoops.indexOf(entry);
        if (i >= 0) _rafLoops.splice(i, 1);
        return;
      }
      entry.rawId = requestAnimationFrame(_tick);
    }
    entry._tick = _tick;
    entry.rawId = requestAnimationFrame(_tick);
    _rafLoops.push(entry);
    return {
      cancel: function() {
        entry.alive = false;
        if (entry.rawId) { cancelAnimationFrame(entry.rawId); entry.rawId = null; }
        var i = _rafLoops.indexOf(entry);
        if (i >= 0) _rafLoops.splice(i, 1);
      }
    };
  }

  function _schedPause() {
    _schedPaused = true;
    _intervals.forEach(function(e) {
      if (e.rawId) { clearInterval(e.rawId); e.rawId = null; e.paused = true; }
    });
    _rafLoops.forEach(function(e) {
      if (e.rawId) { cancelAnimationFrame(e.rawId); e.rawId = null; }
    });
  }

  function _schedResume() {
    _schedPaused = false;
    _intervals.forEach(function(e) {
      if (e.paused && !e.cancelled) {
        e.rawId = setInterval(e.fn, e.ms);
        e.paused = false;
      }
    });
    _rafLoops.forEach(function(e) {
      if (e.alive && !e.rawId && e._tick) {
        e.rawId = requestAnimationFrame(e._tick);
      }
    });
  }

  _on('background', _schedPause);
  _on('resume',     _schedResume);

  var _Scheduler = {
    interval: _schedInterval,
    timeout:  _schedTimeout,
    raf:      _schedRaf,
    pause:    _schedPause,
    resume:   _schedResume,
    getStats: function() {
      return {
        intervals: _intervals.length,
        rafs:      _rafLoops.length,
        timeouts:  _timeouts.length,
        paused:    _schedPaused,
      };
    },
  };

  // ── Public API ────────────────────────────────────────────────────────────
  window.AppRuntime = {
    // Event bus
    on:  _on,
    off: _off,

    // Cleanup registry
    onCleanup: _onCleanup,
    cleanup:   _runCleanup,

    // Scheduler — managed timers that auto-pause/resume with app lifecycle
    Scheduler: _Scheduler,

    // Manual hooks (called by app.js after Capacitor is confirmed ready)
    hookCapacitor: _hookCapacitor,
    hookKeyboard:  _hookKeyboard,
    readSafeAreas: _readSafeAreas,
    init: _init,

    // State getters
    get state()         { return _state; },
    get isOnline()      { return _isOnline; },
    get isVisible()     { return _isVisible; },
    get isBackground()  { return _state === 'background'; },
    get safeTop()       { return _safeTop; },
    get safeBottom()    { return _safeBottom; },
    get keyboardOpen()  { return _kbOpen; },
    get keyboardHeight(){ return _kbHeight; },
    get perfLevel()     { return (window.TKPerf && window.TKPerf.level) || 'high'; },
    get isLowEnd()      {
      var l = window.TKPerf && window.TKPerf.level;
      return l === 'low' || l === 'critical';
    },
    get resumeCount()   { return _resumeCount; },

    // Debug
    getMetrics: _getMetrics,
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init, { once: true });
  } else {
    _init();
  }

}());
