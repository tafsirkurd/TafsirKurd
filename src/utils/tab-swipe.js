/**
 * tab-swipe.js v2 — Instagram-style root tab swipe navigation
 *
 * Swipe to adjacent tab with 1:1 finger tracking. RTL-aware:
 *   RTL (Kurdish): swipe RIGHT = higher index (tab to the left in tab bar)
 *   LTR:           swipe LEFT  = higher index (tab to the right in tab bar)
 *
 * Scroll settle window (150ms) prevents activation after momentum scrolling.
 * Strong direction lock (10px) — vertical wins, never switches to horizontal.
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

  var EDGE_EXCLUDE     = 40;    // px — must be > swipe-back EDGE_PX (32)
  var LOCK_PX          = 16;    // px before direction is decided (raised: needs clearer travel)
  var HORIZ_RATIO      = 1.4;   // horizontal must be this much stronger than vertical at lock
  var DIST_OK          = 50;    // px travel → commit (lowered: easier to complete)
  var VEL_OK           = 0.35;  // px/ms fast-flick threshold
  var ANIM_MS          = 320;   // commit slide animation
  var CANCEL_MS        = 250;   // cancel snap-back animation
  var SCROLL_SETTLE_MS = 150;   // ms after last scroll event before gestures re-enable
  var SWIPE_ZONE_FRAC  = 0.55;  // touch must start below this fraction of screen height

  // RTL: html[dir=rtl] → flex row is right-to-left, so index 0 (quran) is rightmost.
  // In RTL, swiping RIGHT reveals the tab to the LEFT (higher index).
  // In LTR, swiping LEFT  reveals the tab to the RIGHT (higher index).
  var _isRTL = document.documentElement.dir === 'rtl';

  // ── Scroll activity tracking ─────────────────────────────────────────────────
  var _lastScrollMs = 0;
  document.addEventListener('scroll', function () {
    _lastScrollMs = Date.now();
  }, { passive: true, capture: true });

  window._tkIsScrolling = function () {
    return _lastScrollMs > 0 && (Date.now() - _lastScrollMs) < SCROLL_SETTLE_MS;
  };

  // ── Animation lock ───────────────────────────────────────────────────────────
  var _busy = false;

  // ── Horizontal scroll detection ─────────────────────────────────────────────
  function _inHorizScroll(el) {
    if (typeof _ptrInHorizScroll === 'function') return _ptrInHorizScroll(el);
    var node = el, steps = 0;
    while (node && node !== document.body && steps++ < 15) {
      var cn = typeof node.className === 'string' ? node.className : '';
      if (cn.indexOf('iv-hero')        >= 0 ||
          cn.indexOf('book-cat-row')   >= 0 ||
          cn.indexOf('mushaf-view')    >= 0 ||
          cn.indexOf('heatmap-scroll') >= 0 ||
          cn.indexOf('carousel')       >= 0 ||
          cn.indexOf('slider')         >= 0 ||
          cn.indexOf('swiper')         >= 0) return true;
      try {
        var ox = window.getComputedStyle(node).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 8) return true;
      } catch (_e) {}
      node = node.parentElement;
    }
    return false;
  }

  // ── Block conditions ─────────────────────────────────────────────────────────
  function _on(id)   { var el = document.getElementById(id); return !!(el && el.classList.contains('on')); }
  function _open(id) { var el = document.getElementById(id); return !!(el && el.classList.contains('open')); }

  function _shouldBlock(touchTarget) {
    if (window._tkIsScrolling()) return true;
    var ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.contentEditable === 'true')) return true;
    if (document.body.classList.contains('mushaf-mode')) return true;
    if (window._sbPdfZoomed)         return true;
    if (window._ptrGlobalRefreshing) return true;
    if (_inHorizScroll(touchTarget)) return true;
    if (_on('fuOverlay'))              return true;
    if (_on('profilePanel'))           return true;
    if (_on('prayerProgressPanel'))    return true;
    if (_on('authPanel'))              return true;
    if (_on('audioSettingsPanel'))     return true;
    if (_on('qsSheet'))                return true;
    if (_open('dlMgrSheet'))           return true;
    if (_on('wizard'))                 return true;
    if (_on('goalConfirmOverlay'))     return true;
    if (_on('goalStartChoiceOverlay')) return true;
    if (_on('repeatModal'))            return true;
    if (_on('khatmCelebOverlay'))      return true;
    if (_on('pppCelebOverlay'))        return true;
    if (_on('pppDayOverlay'))          return true;
    if (document.querySelector('.note-modal-ov.on')) return true;
    if (window.S && S.sidebar)         return true;
    if (_on('quranReader'))            return true;
    if (_on('ivSeriesView'))           return true;
    if (window.S && S.ivCurrentSeries && S.tab === 'islamvoice') return true;
    if (window.S && S.surah           && S.tab === 'quran')      return true;
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') return true;
    return false;
  }

  // ── Current tab index ────────────────────────────────────────────────────────
  function _currentIdx() {
    return (window.S && S.tab) ? TAB_ORDER.indexOf(S.tab) : -1;
  }

  // ── Target panel start position (which side it enters from) ─────────────────
  // dir is the PHYSICAL swipe direction ('left' = finger moves left, 'right' = right).
  // Both panels always translate in the direction of the finger, so the target
  // must start on the OPPOSITE side (e.g. finger goes left → target starts at +W on right).
  function _targetStart(dir, W) {
    return (dir === 'left') ? W : -W;
  }

  // ── Gesture start — called exactly once at direction lock ────────────────────
  function _gestureStart(t) {
    t.started = true;
    var W           = window.innerWidth;
    var targetStart = _targetStart(t.dir, W);

    // Suppress CSS transitions/animations FIRST to avoid any flash
    document.body.classList.add('ts-dragging');

    // Both panels go fixed and slide side-by-side in sync.
    // Keeping cur in flex-flow while tgt is fixed causes their headers to
    // share the same vertical band — two headers visible at once. Making cur
    // fixed too lets them tile flush so only one header is ever on-screen.
    var cs = t.cur.style;
    cs.position      = 'fixed';
    cs.top           = 'var(--safe-t)';
    cs.left          = '0';
    cs.right         = '0';
    cs.bottom        = '0';
    cs.display       = 'flex';
    cs.flexDirection = 'column';
    cs.zIndex        = '98';
    cs.willChange    = 'transform';
    cs.transition    = 'none';
    cs.transform     = 'translate3d(0,0,0)';

    // Target panel: fixed full-screen, translated off-screen.
    // visibility:visible overrides #panelPrayer visibility:hidden.
    // contentVisibility:visible overrides .safe-render content-visibility:hidden.
    var ts = t.tgt.style;
    ts.position         = 'fixed';
    ts.top              = 'var(--safe-t)';
    ts.left             = '0';
    ts.right            = '0';
    ts.bottom           = '0';
    ts.display          = 'flex';
    ts.flexDirection    = 'column';
    ts.zIndex           = '99';
    ts.willChange       = 'transform, opacity';
    ts.transition       = 'none';
    ts.transform        = 'translate3d(' + targetStart + 'px,0,0)';
    ts.opacity          = '0.97';
    ts.contentVisibility = 'visible';
    ts.visibility       = 'visible';

    // Force layout flush — panel was display:none; forces the browser to
    // compute layout so the header and content are rendered before the
    // first animation frame, preventing the blank/header-pop-in flash.
    void t.tgt.clientWidth;

    _dragMove(t, t.dx);
  }

  // ── 1:1 finger tracking ─────────────────────────────────────────────────────
  function _dragMove(t, dx) {
    if (!t.started) return;
    var W           = window.innerWidth;
    var targetStart = _targetStart(t.dir, W);

    t.cur.style.transition = 'none';
    t.cur.style.transform  = 'translate3d(' + dx + 'px,0,0)';

    t.tgt.style.transition = 'none';
    t.tgt.style.transform  = 'translate3d(' + (targetStart + dx) + 'px,0,0)';
  }

  // ── Commit ───────────────────────────────────────────────────────────────────
  function _commit(t) {
    _busy = true;
    var W        = window.innerWidth;
    var ease     = 'cubic-bezier(0.22,1,0.36,1)';
    var dur      = ANIM_MS + 'ms ' + ease;
    var curFinal = (t.dir === 'left') ? -W : W;

    t.cur.style.transition = 'transform ' + dur;
    t.cur.style.transform  = 'translate3d(' + curFinal + 'px,0,0)';
    t.tgt.style.transition = 'transform ' + dur + ', opacity ' + dur;
    t.tgt.style.transform  = 'translate3d(0,0,0)';
    t.tgt.style.opacity    = '1';

    setTimeout(function () {
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
    var ease     = 'cubic-bezier(0.22,1,0.36,1)';
    var dur      = CANCEL_MS + 'ms ' + ease;
    var tgtFinal = _targetStart(t.dir, W);

    t.cur.style.transition = 'transform ' + dur;
    t.cur.style.transform  = 'translate3d(0,0,0)';
    t.tgt.style.transition = 'transform ' + dur + ', opacity ' + dur;
    t.tgt.style.transform  = 'translate3d(' + tgtFinal + 'px,0,0)';
    t.tgt.style.opacity    = '0.96';

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
    s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = '';
    s.display = ''; s.flexDirection = ''; s.zIndex = '';
    s.transition = ''; s.transform = ''; s.willChange = ''; s.opacity = '';
  }

  function _clearTgt(t) {
    var s = t.tgt.style;
    s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = '';
    s.display = ''; s.flexDirection = ''; s.zIndex = '';
    s.willChange = ''; s.transition = ''; s.transform = ''; s.opacity = '';
    s.contentVisibility = ''; s.visibility = '';
  }

  // ── Gesture state ────────────────────────────────────────────────────────────
  var g = null;

  // Phase 1 — passive detection: never blocks scroll.
  // Waits for LOCK_PX travel, then checks direction ratio. Only if clearly
  // horizontal does it claim the gesture; otherwise drops g and lets scroll win.
  function _onDetect(e) {
    if (!g) return;
    var touch = e.touches[0];
    var dx = touch.clientX - g.x0;
    var dy = touch.clientY - g.y0;

    if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;

    // Direction decided — stop passive detection regardless of outcome
    document.removeEventListener('touchmove', _onDetect);

    // Require HORIZ_RATIO dominance: diagonal or vertical gestures abort here.
    // This is the key guard against accidentally stealing scroll or slider drags.
    if (Math.abs(dx) < Math.abs(dy) * HORIZ_RATIO) { g = null; return; }

    // Horizontal confirmed — resolve target tab
    var dir = (dx < 0) ? 'left' : 'right';
    var idx = _currentIdx();
    if (idx === -1) { g = null; return; }

    // RTL: swipe right → higher index (next tab to the left in tab bar)
    //      swipe left  → lower index (prev tab to the right in tab bar)
    // LTR: swipe left  → higher index (next tab to the right in tab bar)
    //      swipe right → lower index (prev tab to the left in tab bar)
    var targetIdx = _isRTL
      ? ((dir === 'left') ? idx - 1 : idx + 1)
      : ((dir === 'left') ? idx + 1 : idx - 1);

    if (targetIdx < 0 || targetIdx >= TAB_ORDER.length) { g = null; return; }

    var targetTabName = TAB_ORDER[targetIdx];
    var curPanel = document.getElementById(PANEL_IDS[TAB_ORDER[idx]]);
    var tgtPanel = document.getElementById(PANEL_IDS[targetTabName]);
    if (!curPanel || !tgtPanel) { g = null; return; }

    g.locked = 'h';
    g.dir    = dir;
    g.dx     = dx;
    g.target = {
      cur:     curPanel,
      tgt:     tgtPanel,
      tabName: targetTabName,
      dir:     dir,
      started: false,
      dx:      dx
    };
    _gestureStart(g.target);

    // Switch to active (non-passive) handler — we now own the gesture
    document.addEventListener('touchmove', _onActive, { passive: false });
  }

  // Phase 2 — active tracking: blocks scroll via preventDefault.
  // Only reached after clear horizontal lock — safe to own the touch.
  function _onActive(e) {
    if (!g || g.locked !== 'h') return;
    var dx = e.touches[0].clientX - g.x0;

    // Clamp: only move in the locked direction, never reverse
    if (g.dir === 'left') g.dx = Math.min(dx, 0);
    else                  g.dx = Math.max(dx, 0);

    g.target.dx = g.dx;
    _dragMove(g.target, g.dx);
    e.preventDefault();
  }

  document.addEventListener('touchstart', function (e) {
    g = null;
    if (e.touches.length !== 1) return;
    if (_busy) return;
    var t = e.touches[0];
    if (t.clientX <= EDGE_EXCLUDE) return;
    // Safe zone: only allow from the lower portion of the screen.
    // Protects hero sections, carousels, and video lists near the top.
    if (t.clientY < window.innerHeight * SWIPE_ZONE_FRAC) return;
    if (_shouldBlock(e.target)) return;
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
    // Passive: does not block scroll during direction detection
    document.addEventListener('touchmove', _onDetect, { passive: true });
  }, { passive: true });

  document.addEventListener('touchend', function () {
    document.removeEventListener('touchmove', _onDetect);
    document.removeEventListener('touchmove', _onActive);
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
    document.removeEventListener('touchmove', _onDetect);
    document.removeEventListener('touchmove', _onActive);
    var tgt = g && g.target;
    g = null;
    if (tgt) _cancel(tgt);
    else { document.body.classList.remove('ts-dragging'); _busy = false; }
  }, { passive: true });

})();
