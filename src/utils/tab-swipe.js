/**
 * tab-swipe.js v12 — Instagram-style root tab swipe navigation
 *
 * Two-phase gesture detection:
 *   Phase 1 (_onDetect, passive:true): observes movement without ever blocking
 *     scroll. Vertical lock (|dy|>10 && dy>dx) releases immediately. Horizontal
 *     lock requires |dx|>14 && |dx|>|dy|*1.25. Ambiguous diagonal → keep watching.
 *   Phase 2 (_onActive, passive:false): rAF-batched translate3d tracking.
 *     preventDefault only here — scroll is never touched until gesture is owned.
 *
 * Edge rubber-band: swiping past first/last tab moves at EDGE_RESISTANCE (0.25×)
 *   instead of hard-blocking, snaps back on release.
 *
 * Adaptive commit duration: short distance dragged → longer animation to travel
 *   the remaining distance. Nearly complete drag → short snap. Clamp 180–340ms.
 *
 * RTL-aware: html[dir=rtl] → swipe right = higher index.
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

  // Gesture thresholds
  var EDGE_EXCLUDE     = 40;    // px — left edge reserved for swipe-back (> swipe-back's 32)
  var DEAD_PX          = 6;     // px — no decision below this in either axis
  var LOCK_PX          = 14;    // px horizontal travel needed to claim the gesture
  var VERT_LOCK_PX     = 10;    // px vertical travel that immediately releases control to scroll
  var HORIZ_RATIO      = 1.25;  // horizontal must be this much stronger than vertical
  var DIST_COMMIT_FRAC = 0.28;  // complete if |dx| > this fraction of screen width
  var VEL_OK           = 0.55;  // px/ms fast-flick commit threshold
  var ANIM_MS          = 320;   // max commit duration (shorter if mostly dragged already)
  var CANCEL_MS        = 220;   // cancel snap-back duration
  var SCROLL_SETTLE_MS = 150;   // ms after last scroll event before gestures re-enable
  var SWIPE_ZONE_FRAC  = 0.55;  // touch must start below this fraction of screen height
  var EDGE_RESISTANCE  = 0.25;  // rubber-band factor at first/last tab

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
  var _busy      = false;
  var _cancelTid = null;  // pending cancel timeout — cleared on each new _cancel call

  // ── Horizontal scroll / carousel detection ───────────────────────────────────
  function _inHorizScroll(el) {
    if (typeof _ptrInHorizScroll === 'function') return _ptrInHorizScroll(el);
    // Pass 1: class-name check — no style flush; covers all known horizontal scrollers
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
      node = node.parentElement;
    }
    // Pass 2: computed-style fallback — forces style flush; runs only if pass 1 found nothing
    node = el; steps = 0;
    while (node && node !== document.body && steps++ < 15) {
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

  // ── Target panel start position ─────────────────────────────────────────────
  function _targetStart(dir, W) {
    return (dir === 'left') ? W : -W;
  }

  // ── Panel setup — both panels go fixed and tile side-by-side ────────────────
  function _gestureStart(t) {
    t.started = true;
    var W           = window.innerWidth;
    var targetStart = _targetStart(t.dir, W);

    document.body.classList.add('ts-dragging');

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

    var ts = t.tgt.style;
    ts.position         = 'fixed';
    ts.top              = 'var(--safe-t)';
    ts.left             = '0';
    ts.right            = '0';
    ts.bottom           = '0';
    ts.display          = 'flex';
    ts.flexDirection    = 'column';
    ts.zIndex           = '99';
    ts.willChange        = 'transform';
    ts.transition        = 'none';
    ts.transform         = 'translate3d(' + targetStart + 'px,0,0)';
    ts.contentVisibility = 'visible';
    ts.visibility        = 'visible';

    // Force layout flush so tgt is fully rendered before first animation frame
    void t.tgt.clientWidth;
    _dragMove(t, t.dx);
  }

  // ── Edge rubber-band setup (no target panel) ─────────────────────────────────
  function _edgeStart(t) {
    t.started = true;
    document.body.classList.add('ts-dragging');
    t.cur.style.willChange = 'transform';
    t.cur.style.transition = 'none';
    void t.cur.clientWidth;
    _dragMove(t, t.dx);
  }

  // ── rAF render scheduling ────────────────────────────────────────────────────
  // Batches multiple touchmove events within a single frame into one paint.
  var _rafId     = null;
  var _rafDx     = 0;
  var _rafTarget = null;

  function _scheduleRender() {
    if (_rafId) return;
    _rafId = requestAnimationFrame(function () {
      _rafId = null;
      if (_rafTarget && _rafTarget.started) _dragMove(_rafTarget, _rafDx);
    });
  }

  function _cancelRaf() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    _rafTarget = null;
  }

  // ── 1:1 finger tracking ─────────────────────────────────────────────────────
  function _dragMove(t, dx) {
    if (!t.started) return;
    t.cur.style.transform = 'translate3d(' + dx + 'px,0,0)';
    if (t.tgt) {
      var W = window.innerWidth;
      t.tgt.style.transform = 'translate3d(' + (_targetStart(t.dir, W) + dx) + 'px,0,0)';
    }
  }

  // ── Commit ───────────────────────────────────────────────────────────────────
  function _commit(t) {
    _busy = true;
    _cancelRaf();
    // Haptic fires exactly on commit — not on cancel, not during drag.
    // Respects user's haptic setting via the app's global helper.
    if (window.H && typeof H.light === 'function') H.light();

    var W        = window.innerWidth;
    var ease     = 'cubic-bezier(0.22,1,0.36,1)';
    // Shorter animation when user already dragged most of the way
    var progress = Math.min(1, Math.abs(t.dx) / W);
    var durMs    = Math.round(Math.max(180, ANIM_MS * (1 - progress * 0.45)));
    var dur      = durMs + 'ms ' + ease;
    var curFinal = (t.dir === 'left') ? -W : W;

    t.cur.style.transition = 'transform ' + dur;
    t.cur.style.transform  = 'translate3d(' + curFinal + 'px,0,0)';
    t.tgt.style.transition = 'transform ' + dur;
    t.tgt.style.transform  = 'translate3d(0,0,0)';

    setTimeout(function () {
      // try/catch guarantees the rAF cleanup always runs even if App.tab() throws,
      // so _busy can never remain stuck true after a commit (fix #7).
      try {
        if (window.App && typeof App.tab === 'function') App.tab(t.tabName);
      } catch (_e) {}
      requestAnimationFrame(function () {
        _clearCur(t);
        _clearTgt(t);
        document.body.classList.remove('ts-dragging');
        _busy = false;
      });
    }, durMs + 16);
  }

  // ── Cancel (snap back) ───────────────────────────────────────────────────────
  function _cancel(t) {
    // Lock _busy immediately — prevents a new gesture starting during snap-back
    // and having its inline styles wiped by this cancel's cleanup timeout (fix #6).
    _busy = true;
    // Clear any prior cancel timeout so stale closures never reach panel elements.
    if (_cancelTid) { clearTimeout(_cancelTid); _cancelTid = null; }
    _cancelRaf();

    if (!t || !t.started) {
      document.body.classList.remove('ts-dragging');
      _busy = false;
      return;
    }

    var ease = 'cubic-bezier(0.22,1,0.36,1)';

    // Edge rubber-band: just snap cur back, no tgt involved
    if (!t.tgt) {
      t.cur.style.transition = 'transform 220ms ' + ease;
      t.cur.style.transform  = 'translate3d(0,0,0)';
      _cancelTid = setTimeout(function () {
        _cancelTid = null;
        var s = t.cur.style;
        s.willChange = ''; s.transition = ''; s.transform = '';
        document.body.classList.remove('ts-dragging');
        _busy = false;
      }, 236);
      return;
    }

    var W        = window.innerWidth;
    var dur      = CANCEL_MS + 'ms ' + ease;
    var tgtFinal = _targetStart(t.dir, W);

    t.cur.style.transition = 'transform ' + dur;
    t.cur.style.transform  = 'translate3d(0,0,0)';
    t.tgt.style.transition = 'transform ' + dur;
    t.tgt.style.transform  = 'translate3d(' + tgtFinal + 'px,0,0)';

    _cancelTid = setTimeout(function () {
      _cancelTid = null;
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
    if (!t.tgt) return;
    var s = t.tgt.style;
    s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = '';
    s.display = ''; s.flexDirection = ''; s.zIndex = '';
    s.willChange = ''; s.transition = ''; s.transform = '';
    s.contentVisibility = ''; s.visibility = '';
  }

  // ── Gesture state ────────────────────────────────────────────────────────────
  var g = null;

  // Called once horizontal intent is confirmed — builds target, starts visual
  function _lockHorizontal(dx) {
    var dir = (dx < 0) ? 'left' : 'right';
    var idx = _currentIdx();
    if (idx === -1) { g = null; return; }

    var targetIdx = _isRTL
      ? ((dir === 'left') ? idx - 1 : idx + 1)
      : ((dir === 'left') ? idx + 1 : idx - 1);

    var curPanel = document.getElementById(PANEL_IDS[TAB_ORDER[idx]]);
    if (!curPanel) { g = null; return; }

    g.locked = 'h';
    g.dir    = dir;
    g.dx     = dx;

    if (targetIdx < 0 || targetIdx >= TAB_ORDER.length) {
      // Edge: rubber-band — no target tab, just damped resistance on cur
      g.target = { cur: curPanel, tgt: null, tabName: null, dir: dir, started: false, dx: dx * EDGE_RESISTANCE };
      _edgeStart(g.target);
    } else {
      var tgtPanel = document.getElementById(PANEL_IDS[TAB_ORDER[targetIdx]]);
      if (!tgtPanel) { g = null; return; }
      g.target = { cur: curPanel, tgt: tgtPanel, tabName: TAB_ORDER[targetIdx], dir: dir, started: false, dx: dx };
      _gestureStart(g.target);
    }

    // Switch to active (non-passive) handler — we now own the gesture
    document.addEventListener('touchmove', _onActive, { passive: false });
  }

  // Phase 1 — passive detection: never blocks scroll
  function _onDetect(e) {
    if (!g) return;
    var touch = e.touches[0];
    var dx  = touch.clientX - g.x0;
    var dy  = touch.clientY - g.y0;
    var adx = Math.abs(dx);
    var ady = Math.abs(dy);

    // Dead zone: no decision yet
    if (adx < DEAD_PX && ady < DEAD_PX) return;

    // Vertical lock: clearly scrolling — immediately release, no interference
    if (ady > VERT_LOCK_PX && ady > adx) {
      document.removeEventListener('touchmove', _onDetect);
      g = null;
      return;
    }

    // Horizontal lock: clearly swiping — claim the gesture
    if (adx > LOCK_PX && adx > ady * HORIZ_RATIO) {
      document.removeEventListener('touchmove', _onDetect);
      _lockHorizontal(dx);
      return;
    }

    // Ambiguous diagonal: keep observing without blocking anything
  }

  // Phase 2 — active tracking: rAF-batched, calls preventDefault
  function _onActive(e) {
    if (!g || g.locked !== 'h') return;

    // Second finger during drag: abort cleanly so panels are never left stuck
    if (e.touches.length > 1) {
      document.removeEventListener('touchmove', _onActive);
      _cancelRaf();
      var tgt = g.target;
      g = null;
      if (tgt) _cancel(tgt);
      else { document.body.classList.remove('ts-dragging'); _busy = false; }
      return;
    }

    var dx = e.touches[0].clientX - g.x0;

    if (!g.target.tgt) {
      // Edge rubber-band
      g.dx = dx * EDGE_RESISTANCE;
    } else {
      // Clamp: only move in locked direction
      if (g.dir === 'left') g.dx = Math.min(dx, 0);
      else                  g.dx = Math.max(dx, 0);
    }

    g.target.dx = g.dx;
    _rafDx      = g.dx;
    _rafTarget  = g.target;
    _scheduleRender();
    e.preventDefault();
  }

  document.addEventListener('touchstart', function (e) {
    // Second finger while gesture is locked: cancel before clearing g so panels
    // are not left stuck in mid-animation fixed positioning.
    if (e.touches.length > 1 && g && g.locked === 'h') {
      document.removeEventListener('touchmove', _onDetect);
      document.removeEventListener('touchmove', _onActive);
      _cancelRaf();
      var tgt = g.target;
      g = null;
      if (tgt) _cancel(tgt);
      else { document.body.classList.remove('ts-dragging'); _busy = false; }
      return;
    }

    g = null;
    if (e.touches.length !== 1) return;
    if (_busy) return;
    var t = e.touches[0];
    if (t.clientX <= EDGE_EXCLUDE) return;
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
    // Passive: pure observation — does not interfere with scroll in any way
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
    var W       = window.innerWidth;
    // Only commit if there is a real target tab (edge bounce never commits)
    var commit  = !!(g.target && g.target.tgt) && (absDx >= Math.min(W * DIST_COMMIT_FRAC, 120) || vel >= VEL_OK);
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
    else { document.body.classList.remove('ts-dragging'); _cancelRaf(); _busy = false; }
  }, { passive: true });

})();
