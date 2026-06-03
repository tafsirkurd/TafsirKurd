/**
 * tab-swipe.js — Instagram-style root tab swipe navigation
 *
 * Swipe left (next tab) or right (prev tab) between root tabs.
 * Tab order matches the bottom tab bar: quran → islamvoice → gencine → prayer → settings
 *
 * Both panels translate together at 1:1 finger speed — no resistance, no ratio.
 * Target panel is position:fixed off-screen; slides in from the correct side.
 * Current panel translates in-flow. Gap between them is always exactly screen width.
 *
 * Scroll settle window (150ms) prevents activation after momentum scrolling.
 * Strong direction lock (10px) — vertical wins, never switches to horizontal.
 *
 * Does NOT touch: App.doBack(), swipe-back.js, navigation stack, tabHistory logic.
 * Conflict with swipe-back: mutually exclusive touch zones (tab-swipe > 40px from edge).
 */
(function () {
  'use strict';

  var TAB_ORDER = ['quran', 'islamvoice', 'gencine', 'prayer', 'settings'];
  var PANEL_IDS = {
    quran:      'panelQuran',
    islamvoice: 'panelIslamvoice',
    gencine:    'panelGencine',
    prayer:     'panelPrayer',
    settings:   'panelSettings'
  };

  var EDGE_EXCLUDE     = 40;    // px — must be > swipe-back EDGE_PX (32), gives clear separation
  var LOCK_PX          = 10;    // px before direction is decided
  var DIST_OK          = 65;    // px rightward/leftward travel → commit
  var VEL_OK           = 0.30;  // px/ms fast-flick threshold
  var ANIM_MS          = 280;   // commit slide animation
  var CANCEL_MS        = 260;   // cancel snap-back animation
  var SCROLL_SETTLE_MS = 150;   // ms after last scroll event before gestures re-enable

  // ── Scroll activity tracking ─────────────────────────────────────────────────
  // Single capture listener catches all panel scrolls.
  // Exported as window._tkIsScrolling so swipe-back.js can share the same state.
  var _lastScrollMs = 0;
  document.addEventListener('scroll', function () {
    _lastScrollMs = Date.now();
  }, { passive: true, capture: true });

  window._tkIsScrolling = function () {
    return _lastScrollMs > 0 && (Date.now() - _lastScrollMs) < SCROLL_SETTLE_MS;
  };

  // ── Animation lock ───────────────────────────────────────────────────────────
  var _busy = false;

  // ── Horizontal scroll detection (mirrors swipe-back.js) ─────────────────────
  function _inHorizScroll(el) {
    if (typeof _ptrInHorizScroll === 'function') return _ptrInHorizScroll(el);
    var node = el, steps = 0;
    while (node && node !== document.body && steps++ < 15) {
      var cn = typeof node.className === 'string' ? node.className : '';
      if (cn.indexOf('iv-hero')        >= 0 ||
          cn.indexOf('book-cat-row')   >= 0 ||
          cn.indexOf('mushaf-view')    >= 0 ||
          cn.indexOf('heatmap-scroll') >= 0) return true;
      try {
        var ox = window.getComputedStyle(node).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 8) return true;
      } catch (_e) {}
      node = node.parentElement;
    }
    return false;
  }

  // ── Block conditions ─────────────────────────────────────────────────────────
  function _on(id)      { var el = document.getElementById(id); return !!(el && el.classList.contains('on')); }
  function _open(id)    { var el = document.getElementById(id); return !!(el && el.classList.contains('open')); }

  function _shouldBlock(touchTarget) {
    // Scroll still settling (momentum or active)
    if (window._tkIsScrolling()) return true;

    // Input / keyboard
    var ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.contentEditable === 'true')) return true;

    // Special app modes
    if (document.body.classList.contains('mushaf-mode')) return true;
    if (window._sbPdfZoomed)        return true;
    if (window._ptrGlobalRefreshing) return true;
    if (_inHorizScroll(touchTarget)) return true;

    // Full-screen overlays
    if (_on('fuOverlay'))             return true;  // audio full player
    if (_on('profilePanel'))          return true;
    if (_on('prayerProgressPanel'))   return true;
    if (_on('authPanel'))             return true;
    if (_on('audioSettingsPanel'))    return true;
    if (_on('qsSheet'))               return true;  // reader settings
    if (_open('dlMgrSheet'))          return true;
    if (_on('wizard'))                return true;
    if (_on('goalConfirmOverlay'))    return true;
    if (_on('goalStartChoiceOverlay')) return true;
    if (_on('repeatModal'))           return true;
    if (_on('khatmCelebOverlay'))     return true;
    if (_on('pppCelebOverlay'))       return true;
    if (_on('pppDayOverlay'))         return true;
    if (document.querySelector('.note-modal-ov.on')) return true;
    if (window.S && S.sidebar)        return true;

    // Deep navigation screens
    if (_on('quranReader'))           return true;
    if (_on('ivSeriesView'))          return true;
    if (window.S && S.ivCurrentSeries && S.tab === 'islamvoice') return true;
    if (window.S && S.surah          && S.tab === 'quran')       return true;
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') return true;

    return false;
  }

  // ── Current tab index ────────────────────────────────────────────────────────
  function _currentIdx() {
    return (window.S && S.tab) ? TAB_ORDER.indexOf(S.tab) : -1;
  }

  // ── Gesture start — called exactly once at direction lock ────────────────────
  // Sets up target panel as position:fixed off-screen, then applies current dx.
  function _gestureStart(t) {
    t.started = true;
    var W           = window.innerWidth;
    var targetStart = (t.dir === 'left') ? W : -W;

    // Current panel: GPU hint only — stays in flex flow
    t.cur.style.willChange = 'transform';
    t.cur.style.transition = 'none';

    // Target panel: fixed full-screen, translated off-screen
    // position:fixed takes it out of the flex flow — no height splitting.
    // visibility:visible overrides #panelPrayer's visibility:hidden when not .on.
    // contentVisibility:visible overrides .safe-render's content-visibility:hidden.
    var ts = t.tgt.style;
    ts.position         = 'fixed';
    ts.top              = '0';
    ts.left             = '0';
    ts.right            = '0';
    ts.bottom           = '0';
    ts.display          = 'flex';
    ts.flexDirection    = 'column';
    ts.zIndex           = '99';
    ts.willChange       = 'transform';
    ts.transition       = 'none';
    ts.transform        = 'translateX(' + targetStart + 'px)';
    ts.contentVisibility = 'visible';
    ts.visibility       = 'visible';

    // Suppress all panel CSS transitions/animations during drag
    document.body.classList.add('ts-dragging');

    // Apply current dx immediately — no lag at the lock point
    _dragMove(t, t.dx);
  }

  // ── 1:1 finger tracking — no resistance, no ratio ───────────────────────────
  // Current and target panels always stay exactly W apart.
  function _dragMove(t, dx) {
    if (!t.started) return;
    var W           = window.innerWidth;
    var targetStart = (t.dir === 'left') ? W : -W;

    t.cur.style.transition = 'none';
    t.cur.style.transform  = 'translateX(' + dx + 'px)';

    t.tgt.style.transition = 'none';
    t.tgt.style.transform  = 'translateX(' + (targetStart + dx) + 'px)';
  }

  // ── Commit ───────────────────────────────────────────────────────────────────
  function _commit(t) {
    _busy = true;
    var W        = window.innerWidth;
    var ease     = 'cubic-bezier(.4,0,.2,1)';
    var dur      = ANIM_MS + 'ms ' + ease;
    var curFinal = (t.dir === 'left') ? -W : W;

    t.cur.style.transition = 'transform ' + dur;
    t.cur.style.transform  = 'translateX(' + curFinal + 'px)';
    t.tgt.style.transition = 'transform ' + dur;
    t.tgt.style.transform  = 'translateX(0)';

    setTimeout(function () {
      // App.tab() handles: S.tab update, .on class swap, tab bar, H.light() haptic,
      // deferred renders (prayer sky, gencine, settings), tabHistory push.
      if (window.App && typeof App.tab === 'function') App.tab(t.tabName);
      requestAnimationFrame(function () {
        _clearCur(t);
        _clearTgt(t);
        document.body.classList.remove('ts-dragging');
        _busy = false;
      });
    }, ANIM_MS + 16);
  }

  // ── Cancel (snap back) ───────────────────────────────────────────────────────
  function _cancel(t) {
    if (!t || !t.started) {
      document.body.classList.remove('ts-dragging');
      _busy = false;
      return;
    }
    var W        = window.innerWidth;
    var ease     = 'cubic-bezier(.22,1,.36,1)';
    var dur      = CANCEL_MS + 'ms ' + ease;
    var tgtFinal = (t.dir === 'left') ? W : -W;

    t.cur.style.transition = 'transform ' + dur;
    t.cur.style.transform  = 'translateX(0)';
    t.tgt.style.transition = 'transform ' + dur;
    t.tgt.style.transform  = 'translateX(' + tgtFinal + 'px)';

    setTimeout(function () {
      _clearCur(t);
      _clearTgt(t);
      document.body.classList.remove('ts-dragging');
      _busy = false;
    }, CANCEL_MS + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────
  function _clearCur(t) {
    var s = t.cur.style;
    s.transition = '';
    s.transform  = '';
    s.willChange = '';
  }

  function _clearTgt(t) {
    var s = t.tgt.style;
    s.position          = '';
    s.top               = '';
    s.left              = '';
    s.right             = '';
    s.bottom            = '';
    s.display           = '';
    s.flexDirection     = '';
    s.zIndex            = '';
    s.willChange        = '';
    s.transition        = '';
    s.transform         = '';
    s.contentVisibility = '';
    s.visibility        = '';
  }

  // ── Gesture state ────────────────────────────────────────────────────────────
  var g = null;

  function _onTouchMove(e) {
    if (!g) return;
    var touch = e.touches[0];
    var dx = touch.clientX - g.x0;
    var dy = touch.clientY - g.y0;

    if (!g.locked) {
      // Wait for enough movement to decide direction
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;

      if (Math.abs(dy) >= Math.abs(dx)) {
        // Vertical wins — hand control back to scroll
        g = null;
        document.removeEventListener('touchmove', _onTouchMove);
        return;
      }

      // Horizontal wins — lock direction
      var dir   = (dx < 0) ? 'left' : 'right';
      var idx   = _currentIdx();
      if (idx === -1) {
        g = null;
        document.removeEventListener('touchmove', _onTouchMove);
        return;
      }

      var targetIdx = (dir === 'left') ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= TAB_ORDER.length) {
        // At boundary — no adjacent tab, snap back immediately
        g = null;
        document.removeEventListener('touchmove', _onTouchMove);
        return;
      }

      var targetTabName = TAB_ORDER[targetIdx];
      var curPanel = document.getElementById(PANEL_IDS[TAB_ORDER[idx]]);
      var tgtPanel = document.getElementById(PANEL_IDS[targetTabName]);
      if (!curPanel || !tgtPanel) {
        g = null;
        document.removeEventListener('touchmove', _onTouchMove);
        return;
      }

      g.locked = 'h';
      g.dir    = dir;
      g.target = {
        cur:     curPanel,
        tgt:     tgtPanel,
        tabName: targetTabName,
        dir:     dir,
        started: false,
        dx:      dx   // pass current dx so gestureStart has no lag at lock point
      };
      _gestureStart(g.target);
    }

    // Clamp: only move in the locked direction, never reverse
    if (g.dir === 'left')  g.dx = Math.min(dx, 0);
    else                   g.dx = Math.max(dx, 0);

    g.target.dx = g.dx;
    _dragMove(g.target, g.dx);
    e.preventDefault();
  }

  document.addEventListener('touchstart', function (e) {
    g = null;
    if (e.touches.length !== 1) return;
    if (_busy) return;
    var t = e.touches[0];
    // Stay clear of swipe-back zone (≤32px from left edge)
    if (t.clientX <= EDGE_EXCLUDE) return;
    if (_shouldBlock(e.target)) return;
    // Only on root tabs — not bookmarks/goals sub-views
    if (_currentIdx() === -1) return;

    g = {
      x0:     t.clientX,
      y0:     t.clientY,
      t0:     Date.now(),
      dx:     0,
      locked: null,
      dir:    null,
      target: null
    };
    document.addEventListener('touchmove', _onTouchMove, { passive: false });
  }, { passive: true });

  document.addEventListener('touchend', function () {
    document.removeEventListener('touchmove', _onTouchMove);
    if (!g) return;
    if (g.locked !== 'h') { g = null; return; }

    var elapsed = Date.now() - g.t0;
    var absDx   = Math.abs(g.dx);
    var vel     = elapsed > 0 ? absDx / elapsed : 0;
    var commit  = absDx >= DIST_OK || vel >= VEL_OK;
    var tgt     = g.target;
    g = null;

    if (!tgt) return;
    if (commit) _commit(tgt);
    else        _cancel(tgt);
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    document.removeEventListener('touchmove', _onTouchMove);
    var tgt = g && g.target;
    g = null;
    if (tgt) _cancel(tgt);
    else { document.body.classList.remove('ts-dragging'); _busy = false; }
  }, { passive: true });

})();
