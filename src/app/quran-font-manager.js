/**
 * QuranFontManager — centralized Quran font loading, tracking, and fallback system.
 * Loaded before app.js so isReady() is synchronously usable on first render.
 *
 * window.QuranFontManager  — runtime API for loading and guarding renders
 * window.QuranFontDebug    — diagnostic helpers for remote debugging
 */
(function (w) {
  'use strict';

  var TIMEOUT_MS = 4000;
  var FALLBACK_COUNT = 0;

  // font name → 'pending' | 'loaded' | 'failed'
  var _state = {};
  // font name → cached Promise<boolean>
  var _promises = {};
  // font name → {start, duration}
  var _timings = {};
  // font name → [callback(ok: boolean)]
  var _subs = {};
  // mushaf page number → 'loaded' | 'failed'
  var _qcfPage = {};
  // mushaf page number → load duration ms
  var _qcfMs = {};

  function _log(msg) {
    console.log('[QuranFont] ' + msg);
  }

  function _settle(name, st) {
    if (_state[name] === st) return; // already settled
    _state[name] = st;
    var cbs = _subs[name] || [];
    _subs[name] = [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](st === 'loaded'); } catch (e) {}
    }
  }

  var QFM = {
    /**
     * Ensure font is loaded. Returns Promise<boolean>.
     * true = loaded and ready; false = failed/timeout → use safe fallback.
     * Calls are deduplicated — only one document.fonts.load per font name.
     */
    ensure: function (name, timeout) {
      if (_state[name] === 'loaded') return Promise.resolve(true);
      if (_state[name] === 'failed') return Promise.resolve(false);
      if (_promises[name]) return _promises[name];

      var ms = timeout || TIMEOUT_MS;
      _state[name] = 'pending';
      _timings[name] = { start: Date.now() };

      if (!w.document || !w.document.fonts || !w.document.fonts.load) {
        _settle(name, 'failed');
        return (_promises[name] = Promise.resolve(false));
      }

      var loadP = w.document.fonts.load('1em "' + name + '"').then(function (faces) {
        var dur = Date.now() - _timings[name].start;
        _timings[name].duration = dur;
        if (!faces || !faces.length) {
          FALLBACK_COUNT++;
          _log(name + ' status=timeout fallback=arabic_text ms=' + dur);
          _settle(name, 'failed');
          return false;
        }
        _log(name + ' status=loaded ms=' + dur);
        _settle(name, 'loaded');
        return true;
      }).catch(function () {
        var dur = Date.now() - _timings[name].start;
        FALLBACK_COUNT++;
        _log(name + ' status=error fallback=arabic_text ms=' + dur);
        _settle(name, 'failed');
        return false;
      });

      var timeoutP = new Promise(function (resolve) {
        setTimeout(function () {
          if (_state[name] === 'pending') {
            FALLBACK_COUNT++;
            _log(name + ' status=hard_timeout ms=' + ms);
            _settle(name, 'failed');
            resolve(false);
          } else {
            resolve(_state[name] === 'loaded');
          }
        }, ms);
      });

      _promises[name] = Promise.race([loadP, timeoutP]);
      return _promises[name];
    },

    /** Synchronous check — safe to call at render time. */
    isReady: function (name) {
      return _state[name] === 'loaded';
    },

    /** Force a font into failed state (e.g. after repeated load errors). */
    markFailed: function (name) {
      _log(name + ' status=mark_failed');
      _settle(name, 'failed');
    },

    /**
     * Register a callback fired when font settles (loaded or failed).
     * If already settled, callback fires synchronously.
     */
    onReady: function (name, fn) {
      if (_state[name] === 'loaded') { fn(true); return; }
      if (_state[name] === 'failed') { fn(false); return; }
      _subs[name] = _subs[name] || [];
      _subs[name].push(fn);
    },

    /**
     * Upgrade elements matching selector that have [data-glyph] from their
     * Arabic fallback textContent to the decorative glyph code.
     * Fades briefly to avoid jarring swap.
     */
    upgradeGlyphElements: function (selector) {
      try {
        var els = w.document.querySelectorAll(selector + '[data-glyph]');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          el.style.opacity = '0';
          el.textContent = el.dataset.glyph;
          el.offsetHeight; // commit opacity=0 before CSS transition fires
          el.style.opacity = '';
        }
      } catch (e) {}
    },

    // ── QCF page-level font tracking ──────────────────────────────────────

    qcfPageLoaded: function (pageNum, ms) {
      _qcfPage[pageNum] = 'loaded';
      _qcfMs[pageNum] = ms;
      _log('mode=' + QFD.activeMode() + ' page=' + pageNum + ' status=loaded ms=' + ms);
    },

    qcfPageFailed: function (pageNum, reason) {
      _qcfPage[pageNum] = 'failed';
      FALLBACK_COUNT++;
      _log('mode=' + QFD.activeMode() + ' page=' + pageNum +
           ' status=' + (reason || 'failed') + ' fallback=safe_reader');
    },

    qcfPageStatus: function (pageNum) {
      return _qcfPage[pageNum] || 'unknown';
    },

    // ── Exposed internals for QuranFontDebug ─────────────────────────────
    _state: _state,
    _timings: _timings,
    _qcfPage: _qcfPage,
    _qcfMs: _qcfMs,
    _fallbackCount: function () { return FALLBACK_COUNT; }
  };

  // ── QuranFontDebug ───────────────────────────────────────────────────────

  var QFD = {
    loadedFonts: function () {
      return Object.keys(_state).filter(function (k) { return _state[k] === 'loaded'; });
    },
    failedFonts: function () {
      return Object.keys(_state).filter(function (k) { return _state[k] === 'failed'; });
    },
    activeMode: function () {
      try {
        return (w.S && w.S.mushafFont) || localStorage.getItem('mushafFont') || 'qcf4';
      } catch (e) { return 'qcf4'; }
    },
    qcfStatus: function (page) {
      var pages = page
        ? [+page]
        : Object.keys(_qcfPage).map(Number).sort(function (a, b) { return a - b; });
      var out = {};
      for (var i = 0; i < pages.length; i++) {
        var p = pages[i];
        out[p] = { status: _qcfPage[p] || 'unknown', ms: _qcfMs[p] || null };
      }
      return out;
    },
    dump: function () {
      var info = {
        platform: (w.Capacitor && typeof w.Capacitor.getPlatform === 'function')
          ? w.Capacitor.getPlatform() : 'web',
        mode: QFD.activeMode(),
        fallbackCount: FALLBACK_COUNT,
        fonts: {},
        qcf: QFD.qcfStatus()
      };
      Object.keys(_state).forEach(function (k) {
        info.fonts[k] = {
          status: _state[k],
          ms: _timings[k] ? (_timings[k].duration || null) : null
        };
      });
      console.group('[QuranFontDebug] dump');
      console.log(JSON.stringify(info, null, 2));
      console.groupEnd();
      return info;
    }
  };

  w.QuranFontManager = QFM;
  w.QuranFontDebug = QFD;

  // ── Auto-start: kick off SurahName font loading immediately ──────────────
  // The manager starts loading as soon as this script executes (before app.js).
  // If fonts are in browser cache they resolve in <5ms; if not, they load in
  // parallel with the rest of the page. Either way the state is settled by the
  // time the user opens the Quran tab.
  function _init() {
    QFM.ensure('SurahName').then(function (ok) {
      if (ok) QFM.upgradeGlyphElements('.surah-name-ar');
    });
    QFM.ensure('SurahNameV2').then(function (ok) {
      if (ok) QFM.upgradeGlyphElements('.surah-reader-name');
    });
    QFM.ensure('SurahName').then(function (ok) {
      if (ok) QFM.upgradeGlyphElements('.continue-surah-deco');
    });
  }

  // document.fonts is available even before DOMContentLoaded
  _init();

})(window);
