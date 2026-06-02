/**
 * swipe-back.js — native-style left-edge swipe to go back
 *
 * Visual types:
 *   A (phone):   fg lifts to fixed, bg revealed with counter-parallax underneath
 *   B (overlays + tablet inline): fg translates 1:1, destination already visible
 *   G (Gencine): gencineContent translates within overflow-x:hidden panel
 *
 * Navigation logic: unchanged — App.doBack({allowExit:false}) fires after animation.
 * All guards preserved: _sbPdfZoomed, mushaf-mode, PTR, horiz-scroll, input.
 */
(function () {
  'use strict';

  // ── Tuning ──────────────────────────────────────────────────────────────────
  var EDGE_PX   = 32;    // touch must start within this many px of left edge
  var LOCK_PX   = 10;    // movement before direction is decided
  var DIST_OK   = 80;    // px rightward travel → commit
  var VEL_OK    = 0.35;  // px/ms fast-flick threshold
  var ANIM_MS   = 270;   // commit animation duration
  var CANCEL_MS = 260;   // cancel snap-back duration

  // ── Animation lock — blocks new gesture during commit ────────────────────────
  var _busy = false;

  // ── Gate checks (all original guards preserved) ──────────────────────────────

  function _inputFocused() {
    var ae = document.activeElement;
    if (!ae) return false;
    var tag = ae.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || ae.contentEditable === 'true';
  }

  function _inHorizScroll(el) {
    if (typeof _ptrInHorizScroll === 'function') return _ptrInHorizScroll(el);
    var node = el, steps = 0;
    while (node && node !== document.body && steps++ < 15) {
      var cn = typeof node.className === 'string' ? node.className : '';
      if (cn.indexOf('iv-hero') >= 0 || cn.indexOf('book-cat-row') >= 0 ||
          cn.indexOf('mushaf-view') >= 0 || cn.indexOf('heatmap-scroll') >= 0) return true;
      try {
        var ox = window.getComputedStyle(node).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 8) return true;
      } catch (_e) {}
      node = node.parentElement;
    }
    return false;
  }

  function _shouldBlock(target) {
    if (_inputFocused()) return true;
    if (document.body.classList.contains('mushaf-mode')) return true;  // mushaf owns horizontal
    if (window._sbPdfZoomed) return true;                              // PDF zoomed, pan owns touch
    if (window._ptrGlobalRefreshing) return true;                      // PTR refresh in flight
    if (_inHorizScroll(target)) return true;                           // inside carousel / horiz list
    return false;
  }

  // ── Layout detection ─────────────────────────────────────────────────────────

  function _isTablet() {
    return window.innerWidth >= 768 || document.documentElement.classList.contains('is-ipad');
  }

  // ── Target resolution ────────────────────────────────────────────────────────
  // Priority follows App.doBack() order so the correct element receives feedback.

  function _getTarget() {
    var W = window.innerWidth;
    var tablet = _isTablet();

    // Type B: full-screen fixed overlays — destination always visible underneath
    var overlayIds = ['profilePanel', 'prayerProgressPanel', 'authPanel'];
    for (var i = 0; i < overlayIds.length; i++) {
      var ov = document.getElementById(overlayIds[i]);
      if (ov && ov.classList.contains('on')) return { type: 'B', fg: ov, bg: null, W: W };
    }

    // IslamVoice series
    var iv = document.getElementById('ivSeriesView');
    if (iv && iv.classList.contains('on')) {
      if (tablet) return { type: 'B', fg: iv, bg: null, W: W };
      var ivBg = document.getElementById('ivHome');
      return { type: 'A', fg: iv, bg: ivBg || null, W: W };
    }

    // Quran reader
    var qr = document.getElementById('quranReader');
    if (qr && qr.classList.contains('on')) {
      if (tablet) return { type: 'B', fg: qr, bg: null, W: W };
      var qh = document.getElementById('quranHome');
      return { type: 'A', fg: qr, bg: qh || null, W: W };
    }

    // Gencine sub-views
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gc = document.getElementById('gencineContent');
      if (gc) return { type: 'G', fg: gc, bg: null, W: W };
    }

    return null;
  }

  // ── Drag start (at direction lock — bg never shown for vertical scrolls) ──────

  function _dragStart(t) {
    t.started = true;

    if (t.type === 'A') {
      if (!t.bg) {
        // bg unavailable — degrade to simple translate
        t.type = 'B';
      } else {
        // Read fg rect BEFORE showing bg so layout is still stable
        var r = t.fg.getBoundingClientRect();
        // Show bg, set initial parallax position
        t.bg.style.display    = '';
        t.bg.style.transition = 'none';
        t.bg.style.willChange = 'transform';
        t.bg.style.transform  = 'scale(0.96) translateX(-20%)';
        // Lift fg to fixed at its current visual position
        t.fg.style.position   = 'fixed';
        t.fg.style.top        = r.top    + 'px';
        t.fg.style.left       = r.left   + 'px';
        t.fg.style.width      = r.width  + 'px';
        t.fg.style.height     = r.height + 'px';
        t.fg.style.zIndex     = '200';
        t.fg.style.willChange = 'transform';
        t.fg.style.transition = 'none';
        return;
      }
    }

    // Type B and G (also A degraded to B)
    t.fg.style.willChange = 'transform';
    t.fg.style.transition = 'none';
  }

  // ── Apply drag ───────────────────────────────────────────────────────────────

  function _dragMove(t, dx) {
    if (!t.started) return;
    t.fg.style.transition = 'none';
    t.fg.style.transform  = 'translateX(' + dx + 'px)';
    if (t.type === 'A' && t.bg) {
      var progress = Math.min(dx / t.W, 1);
      var sc = 0.96 + 0.04 * progress;
      var tx = -20  * (1 - progress);
      t.bg.style.transition = 'none';
      t.bg.style.transform  = 'scale(' + sc + ') translateX(' + tx + '%)';
    }
  }

  // ── Commit ───────────────────────────────────────────────────────────────────

  function _commit(t) {
    _busy = true;

    if (!t.started) {
      // Fast flick committed before direction lock — fire directly
      _busy = false;
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      return;
    }

    // Tablet inline readers: CSS forces display:flex!important so slide-off creates
    // a snap on cleanup. Clear immediately and let App.doBack handle the state change.
    var isTabletReader = t.type === 'B' &&
      (t.fg.id === 'quranReader' || t.fg.id === 'ivSeriesView');
    if (isTabletReader) {
      _clearFg(t);
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      _busy = false;
      return;
    }

    // Animate fg off-screen to the right
    var ease = 'cubic-bezier(.4,0,.2,1)';
    var dur  = ANIM_MS + 'ms ' + ease;
    t.fg.style.transition = 'transform ' + dur;
    t.fg.style.transform  = 'translateX(' + t.W + 'px)';

    if (t.type === 'A' && t.bg) {
      t.bg.style.transition = 'transform ' + dur;
      t.bg.style.transform  = 'scale(1) translateX(0)';
    }

    // Fire doBack after animation completes, then clean up inline styles
    setTimeout(function () {
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      requestAnimationFrame(function () {
        _clearFg(t);
        if (t.type === 'A' && t.bg) {
          // App.doBack already restored bg.style.display — clear transforms only
          t.bg.style.transition = '';
          t.bg.style.transform  = '';
          t.bg.style.willChange = '';
        }
        _busy = false;
      });
    }, ANIM_MS + 16);
  }

  // ── Cancel (snap back) ───────────────────────────────────────────────────────

  function _cancel(t) {
    if (!t.started) return;

    var ease = 'cubic-bezier(.22,1,.36,1)';
    var dur  = CANCEL_MS + 'ms ' + ease;
    t.fg.style.transition = 'transform ' + dur;
    t.fg.style.transform  = 'translateX(0)';

    if (t.type === 'A' && t.bg) {
      t.bg.style.transition = 'transform ' + dur;
      t.bg.style.transform  = 'scale(0.96) translateX(-20%)';
    }

    setTimeout(function () {
      _clearFg(t);
      if (t.type === 'A' && t.bg) {
        t.bg.style.transition = '';
        t.bg.style.transform  = '';
        t.bg.style.willChange = '';
        t.bg.style.display    = 'none';  // restore hidden state (was hidden before gesture)
      }
    }, CANCEL_MS + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────

  function _clearFg(t) {
    var s = t.fg.style;
    s.transition = '';
    s.transform  = '';
    s.willChange = '';
    if (t.type === 'A') {
      s.position = '';
      s.top      = '';
      s.left     = '';
      s.width    = '';
      s.height   = '';
      s.zIndex   = '';
    }
  }

  // ── Gesture state ────────────────────────────────────────────────────────────
  var g = null;

  function _onTouchMove(e) {
    if (!g) return;
    var t  = e.touches[0];
    var dx = t.clientX - g.x0;
    var dy = t.clientY - g.y0;

    if (!g.locked) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      if (Math.abs(dx) >= Math.abs(dy) && dx > 0) {
        g.locked = 'h';
        if (g.target) _dragStart(g.target);
      } else {
        // Vertical or leftward — cancel, let scroll/PTR take over
        g = null;
        document.removeEventListener('touchmove', _onTouchMove);
        return;
      }
    }

    g.dx = dx > 0 ? dx : 0;
    if (g.target) _dragMove(g.target, g.dx);
    e.preventDefault();
  }

  document.addEventListener('touchstart', function (e) {
    g = null;
    if (e.touches.length !== 1) return;
    if (_busy) return;
    var t = e.touches[0];
    if (t.clientX > EDGE_PX) return;
    if (_shouldBlock(e.target)) return;
    if (!window.App || typeof App.hasBack !== 'function') return;
    if (!App.hasBack()) return;

    g = {
      x0:     t.clientX,
      y0:     t.clientY,
      t0:     Date.now(),
      dx:     0,
      locked: null,
      target: _getTarget(),
    };
    document.addEventListener('touchmove', _onTouchMove, { passive: false });
  }, { passive: true });

  document.addEventListener('touchend', function () {
    document.removeEventListener('touchmove', _onTouchMove);
    if (!g || g.locked !== 'h') { g = null; return; }

    var elapsed = Date.now() - g.t0;
    var vel     = elapsed > 0 ? g.dx / elapsed : 0;
    var commit  = g.dx >= DIST_OK || vel >= VEL_OK;
    var tgt     = g.target;
    g = null;

    if (tgt) {
      if (commit) _commit(tgt);
      else        _cancel(tgt);
    } else if (commit) {
      // No visual target (e.g. modal state with no feedback element) — fire directly
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    document.removeEventListener('touchmove', _onTouchMove);
    if (g && g.locked === 'h' && g.target) _cancel(g.target);
    g = null;
  }, { passive: true });

})();
