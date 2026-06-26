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
  // Owns all setInterval / setTimeout / requestAnimationFrame.
  //
  // Priorities (3rd arg or opts.priority):
  //   'critical'   — never paused (not by background, not by owner)
  //   'normal'     — pauses on background + owner-inactive  (default)
  //   'background' — survives app background; pauses on owner-inactive
  //   'idle'       — like 'normal'; timeouts use requestIdleCallback
  //
  // Lifecycle ownership (all timer types):
  //   Scheduler.interval/timeout/raf(fn, ms, { owner: 'key', label: '...' })
  //   Scheduler.setOwnerActive('key', false/true)
  //
  // DOM batching:
  //   Scheduler.read(fn, label)  — queued before writes this frame
  //   Scheduler.write(fn, label) — queued after reads this frame
  //
  // Exception isolation: every callback wrapped in try/catch — exceptions
  //   are logged with label/priority/owner/stack and never stop the scheduler.
  //
  // Backward compat: 3rd arg may still be a plain string label.

  var _ivEntries   = [];    // interval entries
  var _rafEntries  = [];    // RAF loop entries
  var _toEntries   = [];    // timeout entries
  var _owners      = {};    // ownerKey → boolean (true = active)
  var _schedPaused = false;
  var _dbgMode     = false;
  var _leakWatchId = null;

  // ── Global performance counters ─────────────────────────────────────────
  var _startedAt    = Date.now();
  var _lastFrameTs  = 0;
  var _frameCount   = 0;
  var _frameTimeSum = 0;
  var _worstFrameMs = 0;
  var _frames16     = 0;    // frames > 16.67ms (missed 60fps target)
  var _frames32     = 0;    // frames > 32ms
  var _frames50     = 0;    // frames > 50ms
  var _totalCbCalls = 0;
  var _totalCbDur   = 0;
  var _worstCbDur   = 0;
  var _worstCbLabel = '';
  var _longTaskCount = 0;   // callbacks > 32ms

  // ── Opts parser ──────────────────────────────────────────────────────────
  // 3rd arg: string label (backward compat) OR opts object.
  function _pOpts(x) {
    if (!x || x === '') return { label: '', priority: 'normal', owner: null };
    if (typeof x === 'string') return { label: x, priority: 'normal', owner: null };
    return { label: x.label || '', priority: x.priority || 'normal', owner: x.owner || null };
  }

  // ── Exception-safe timed runner ──────────────────────────────────────────
  // Calls fn(ts) for RAF or fn() for interval/timeout.
  // Measures duration, updates per-entry and global stats, never throws.
  // Returns fn's return value (or undefined on exception — loop continues).
  function _run(fn, ts, entry) {
    var t0 = performance.now();
    var result;
    try {
      result = (ts !== undefined) ? fn(ts) : fn();
    } catch (err) {
      console.error(
        '[AppRuntime.Scheduler] Exception in "' + (entry.label || '?') +
        '" (priority=' + (entry.priority || 'normal') +
        ', owner=' + (entry.owner || 'none') + ')\n' +
        (err ? (err.stack || err.message || String(err)) : 'unknown error')
      );
    }
    var dur = performance.now() - t0;
    entry._calls    = (entry._calls    || 0) + 1;
    entry._totalDur = (entry._totalDur || 0) + dur;
    if (dur > (entry._worstDur || 0)) entry._worstDur = dur;
    _totalCbCalls++;
    _totalCbDur += dur;
    if (dur > _worstCbDur) { _worstCbDur = dur; _worstCbLabel = entry.label || '?'; }
    if (dur > 32) {
      _longTaskCount++;
      if (_dbgMode) console.warn('[Scheduler] LONG TASK ' + dur.toFixed(1) + 'ms "' + (entry.label || '?') + '"');
    } else if (_dbgMode) {
      if (dur > 16) console.info('[Scheduler] slow 16ms+ ' + dur.toFixed(1) + 'ms "' + (entry.label || '?') + '"');
      else if (dur > 8) console.log('[Scheduler] slow 8ms+ '  + dur.toFixed(1) + 'ms "' + (entry.label || '?') + '"');
    }
    return result;
  }

  // ── Interval ─────────────────────────────────────────────────────────────
  function _schedInterval(fn, ms, labelOrOpts) {
    var o = _pOpts(labelOrOpts);
    var e = { fn: fn, ms: ms, label: o.label, priority: o.priority, owner: o.owner,
              rawId: null, paused: false, ownerPaused: false, cancelled: false,
              createdAt: Date.now(), _calls: 0, _totalDur: 0, _worstDur: 0 };
    function _ivFire() { _run(fn, undefined, e); }
    e._safe = _ivFire;
    var bgBlock    = _schedPaused && o.priority !== 'critical' && o.priority !== 'background';
    var ownerBlock = o.owner && _owners[o.owner] === false && o.priority !== 'critical';
    if (bgBlock)    e.paused      = true;
    if (ownerBlock) e.ownerPaused = true;
    if (!bgBlock && !ownerBlock) e.rawId = setInterval(_ivFire, ms);
    _ivEntries.push(e);
    if (_dbgMode && !e.label) console.warn('[Scheduler] interval missing label (ms=' + ms + ')');
    return {
      cancel: function() {
        if (e.rawId) { clearInterval(e.rawId); e.rawId = null; }
        e.cancelled = true;
        var i = _ivEntries.indexOf(e); if (i >= 0) _ivEntries.splice(i, 1);
      }
    };
  }

  // ── Timeout ───────────────────────────────────────────────────────────────
  function _schedTimeout(fn, ms, labelOrOpts) {
    var o = _pOpts(labelOrOpts);
    var e = { label: o.label, ms: ms, priority: o.priority, owner: o.owner,
              rawId: null, isIdle: false, ownerPaused: false,
              createdAt: Date.now(), _calls: 0, _totalDur: 0, _worstDur: 0 };
    if (o.owner && _owners[o.owner] === false && o.priority !== 'critical') e.ownerPaused = true;
    function _fire() {
      e.rawId = null;
      var i = _toEntries.indexOf(e); if (i >= 0) _toEntries.splice(i, 1);
      if (e.ownerPaused && e.priority !== 'critical') return; // owner inactive — skip
      _run(fn, undefined, e);
    }
    if (o.priority === 'idle' && window.requestIdleCallback) {
      e.rawId = window.requestIdleCallback(_fire, { timeout: ms });
      e.isIdle = true;
    } else {
      e.rawId = setTimeout(_fire, ms);
    }
    _toEntries.push(e);
    if (_dbgMode && !e.label) console.warn('[Scheduler] timeout missing label (ms=' + ms + ')');
    return {
      cancel: function() {
        if (e.rawId !== null) {
          if (e.isIdle && window.cancelIdleCallback) window.cancelIdleCallback(e.rawId);
          else clearTimeout(e.rawId);
          e.rawId = null;
        }
        var i = _toEntries.indexOf(e); if (i >= 0) _toEntries.splice(i, 1);
      }
    };
  }

  // ── RAF loop ──────────────────────────────────────────────────────────────
  // fn(ts) called each frame. Return false to stop. Scheduler owns rescheduling.
  // bgPaused and ownerPaused are independent — both must be false for the loop to run.
  function _schedRaf(fn, labelOrOpts) {
    var o = _pOpts(labelOrOpts);
    var e = { fn: fn, label: o.label, priority: o.priority, owner: o.owner,
              rawId: null, alive: true, bgPaused: false, ownerPaused: false,
              createdAt: Date.now(), _calls: 0, _totalDur: 0, _worstDur: 0 };
    function _tick(ts) {
      if (!e.alive) return;
      // Frame metrics — update once per frame (first loop to observe this ts wins)
      if (ts !== _lastFrameTs) {
        if (_lastFrameTs > 0) {
          var fdt = ts - _lastFrameTs;
          if (fdt < 1000) { // ignore gaps > 1s (resume from background)
            _frameCount++;
            _frameTimeSum += fdt;
            if (fdt > _worstFrameMs) _worstFrameMs = fdt;
            if (fdt > 16.67) _frames16++;
            if (fdt > 32)    _frames32++;
            if (fdt > 50)    _frames50++;
          }
        }
        _lastFrameTs = ts;
      }
      var cont = _run(e.fn, ts, e);
      if (cont === false) {
        e.alive = false; e.rawId = null;
        var i = _rafEntries.indexOf(e); if (i >= 0) _rafEntries.splice(i, 1);
        return;
      }
      e.rawId = requestAnimationFrame(_tick);
    }
    e._tick = _tick;
    if (e.owner && _owners[e.owner] === false) e.ownerPaused = true;
    if (_schedPaused && o.priority !== 'critical' && o.priority !== 'background') e.bgPaused = true;
    if (!e.bgPaused && !e.ownerPaused) e.rawId = requestAnimationFrame(_tick);
    _rafEntries.push(e);
    if (_dbgMode && !e.label) console.warn('[Scheduler] RAF loop missing label');
    return {
      cancel: function() {
        e.alive = false;
        if (e.rawId) { cancelAnimationFrame(e.rawId); e.rawId = null; }
        var i = _rafEntries.indexOf(e); if (i >= 0) _rafEntries.splice(i, 1);
      }
    };
  }

  // ── DOM Read / Write queue ────────────────────────────────────────────────
  // Scheduler.read(fn)  — batched before writes in the same frame.
  // Scheduler.write(fn) — batched after reads in the same frame.
  // Separating reads from writes prevents layout thrashing.
  var _readQueue  = [];
  var _writeQueue = [];
  var _rwRafId    = null;

  function _flushRW() {
    _rwRafId = null;
    var reads  = _readQueue.splice(0);
    var writes = _writeQueue.splice(0);
    for (var r = 0; r < reads.length;  r++) _run(reads[r].fn,  undefined, reads[r]);
    for (var w = 0; w < writes.length; w++) _run(writes[w].fn, undefined, writes[w]);
    if (_readQueue.length || _writeQueue.length) _schedRWFrame(); // re-flush if queued during flush
  }

  function _schedRWFrame() {
    if (!_rwRafId) _rwRafId = requestAnimationFrame(_flushRW);
  }

  function _schedRead(fn, label) {
    _readQueue.push({ fn: fn, label: label || 'read', priority: 'normal', owner: null,
                      _calls: 0, _totalDur: 0, _worstDur: 0 });
    _schedRWFrame();
  }

  function _schedWrite(fn, label) {
    _writeQueue.push({ fn: fn, label: label || 'write', priority: 'normal', owner: null,
                       _calls: 0, _totalDur: 0, _worstDur: 0 });
    _schedRWFrame();
  }

  // ── Owner control (all timer types) ──────────────────────────────────────
  function _setOwnerActive(key, isActive) {
    var wasActive = _owners[key] !== false;
    _owners[key] = isActive;

    if (!isActive && wasActive) {
      _ivEntries.forEach(function(e) {
        if (e.owner !== key || e.priority === 'critical') return;
        e.ownerPaused = true;
        if (e.rawId) { clearInterval(e.rawId); e.rawId = null; }
      });
      _rafEntries.forEach(function(e) {
        if (e.owner !== key || e.priority === 'critical') return;
        e.ownerPaused = true;
        if (e.rawId) { cancelAnimationFrame(e.rawId); e.rawId = null; }
      });
      _toEntries.forEach(function(e) { // timeouts: mark so _fire() skips the callback
        if (e.owner === key && e.priority !== 'critical') e.ownerPaused = true;
      });

    } else if (isActive && !wasActive) {
      _ivEntries.forEach(function(e) {
        if (e.owner !== key || !e.ownerPaused) return;
        e.ownerPaused = false;
        // Restart only if not also background-paused
        if (!e.cancelled && !e.paused && !e.rawId) e.rawId = setInterval(e._safe, e.ms);
      });
      _rafEntries.forEach(function(e) {
        if (e.owner !== key || !e.ownerPaused) return;
        e.ownerPaused = false;
        if (e.alive && !e.bgPaused && !e.rawId && e._tick) {
          e.rawId = requestAnimationFrame(e._tick);
        }
      });
      _toEntries.forEach(function(e) { // timeouts: unmark — next fire will execute
        if (e.owner === key && e.ownerPaused) e.ownerPaused = false;
      });
    }
  }

  // ── Background / resume ───────────────────────────────────────────────────
  function _schedPause() {
    _schedPaused = true;
    _ivEntries.forEach(function(e) {
      if (e.priority === 'critical' || e.priority === 'background') return;
      // Only set paused=true if actually running (rawId non-null); prevents
      // overwriting ownerPaused intervals that are already stopped.
      if (e.rawId) { clearInterval(e.rawId); e.rawId = null; e.paused = true; }
    });
    _rafEntries.forEach(function(e) {
      if (e.priority === 'critical' || e.priority === 'background') return;
      e.bgPaused = true;
      if (e.rawId) { cancelAnimationFrame(e.rawId); e.rawId = null; }
    });
  }

  function _schedResume() {
    _schedPaused = false;
    _ivEntries.forEach(function(e) {
      // Restart only if bg-paused AND not also owner-paused
      if (e.paused && !e.cancelled && !e.ownerPaused) {
        e.rawId = setInterval(e._safe, e.ms);
        e.paused = false;
      }
    });
    _rafEntries.forEach(function(e) {
      if (!e.bgPaused) return;
      e.bgPaused = false;
      if (e.alive && !e.ownerPaused && !e.rawId && e._tick) {
        e.rawId = requestAnimationFrame(e._tick);
      }
    });
  }

  _on('background', _schedPause);
  _on('resume',     _schedResume);

  // ── Leak detection ────────────────────────────────────────────────────────
  var _LEAK_MAX = { iv: 10, raf: 8, to: 20 };

  function _checkLeaks() {
    if (!_dbgMode) return [];
    var warns = []; var now = Date.now();
    if (_ivEntries.length  > _LEAK_MAX.iv)  warns.push('High interval count: '  + _ivEntries.length  + ' (limit ' + _LEAK_MAX.iv + ')');
    if (_rafEntries.length > _LEAK_MAX.raf) warns.push('High RAF count: '       + _rafEntries.length + ' (limit ' + _LEAK_MAX.raf + ')');
    if (_toEntries.length  > _LEAK_MAX.to)  warns.push('High timeout count: '   + _toEntries.length  + ' (limit ' + _LEAK_MAX.to + ')');
    _ivEntries.forEach(function(e)  { if (!e.label) warns.push('Unlabeled interval (ms=' + e.ms + ')'); });
    _rafEntries.forEach(function(e) {
      if (!e.label) warns.push('Unlabeled RAF loop');
      var age = now - e.createdAt;
      if (age > 600000) warns.push('RAF "' + (e.label || '?') + '" alive ' + Math.round(age / 60000) + 'min — leak?');
    });
    _toEntries.forEach(function(e) {
      var age = now - e.createdAt;
      if (age > Math.max(e.ms * 5, 30000))
        warns.push('Timeout "' + (e.label || '?') + '" alive ' + Math.round(age / 1000) + 's (expected ' + e.ms + 'ms) — leak?');
    });
    warns.forEach(function(w) { console.warn('[AppRuntime.Scheduler] ' + w); });
    return warns;
  }

  function _enableDebug(on) {
    _dbgMode = on !== false;
    if (_dbgMode && !_leakWatchId) {
      _leakWatchId = setInterval(_checkLeaks, 60000);
    } else if (!_dbgMode && _leakWatchId) {
      clearInterval(_leakWatchId); _leakWatchId = null;
    }
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────
  function _getDiagnostics() {
    var now = Date.now();
    var warns = _checkLeaks();
    var activeOwners = 0;
    for (var ok in _owners) {
      if (Object.prototype.hasOwnProperty.call(_owners, ok) && _owners[ok] !== false) activeOwners++;
    }
    return {
      paused: _schedPaused,
      owners: _owners,
      intervals: _ivEntries.map(function(e) {
        return { label: e.label, ms: e.ms, priority: e.priority, owner: e.owner,
                 ageMs: now - e.createdAt, paused: !!e.paused, ownerPaused: !!e.ownerPaused,
                 calls: e._calls || 0,
                 avgMs: e._calls ? e._totalDur / e._calls : 0,
                 worstMs: e._worstDur || 0 };
      }),
      rafs: _rafEntries.map(function(e) {
        return { label: e.label, priority: e.priority, owner: e.owner,
                 ageMs: now - e.createdAt, alive: e.alive,
                 bgPaused: e.bgPaused, ownerPaused: e.ownerPaused,
                 calls: e._calls || 0,
                 avgMs: e._calls ? e._totalDur / e._calls : 0,
                 worstMs: e._worstDur || 0 };
      }),
      timeouts: _toEntries.map(function(e) {
        return { label: e.label, ms: e.ms, priority: e.priority, owner: e.owner,
                 ageMs: now - e.createdAt, ownerPaused: !!e.ownerPaused };
      }),
      performance: {
        uptimeMs:           now - _startedAt,
        frameCount:         _frameCount,
        avgFrameMs:         _frameCount ? _frameTimeSum / _frameCount : 0,
        worstFrameMs:       _worstFrameMs,
        frames16:           _frames16,
        frames32:           _frames32,
        frames50:           _frames50,
        totalCallbacks:     _totalCbCalls,
        avgCallbackMs:      _totalCbCalls ? _totalCbDur / _totalCbCalls : 0,
        worstCallbackMs:    _worstCbDur,
        worstCallbackLabel: _worstCbLabel,
        longTaskCount:      _longTaskCount,
        activeOwners:       activeOwners,
        totalOwners:        Object.keys(_owners).length,
      },
      warnings: warns,
    };
  }

  var _Scheduler = {
    // Core scheduling (backward compatible — 3rd arg may be string label or opts)
    interval:       _schedInterval,
    timeout:        _schedTimeout,
    raf:            _schedRaf,
    // DOM batching — reads before writes, same frame
    read:           _schedRead,
    write:          _schedWrite,
    // Owner-based lifecycle control (all timer types)
    setOwnerActive: _setOwnerActive,
    // Manual pause/resume (AppRuntime uses these internally)
    pause:          _schedPause,
    resume:         _schedResume,
    // Debug and diagnostics
    enableDebug:    _enableDebug,
    getDiagnostics: _getDiagnostics,
    // Backward-compat count summary (unchanged from Phase 2)
    getStats: function() {
      return {
        intervals: _ivEntries.length,
        rafs:      _rafEntries.length,
        timeouts:  _toEntries.length,
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
