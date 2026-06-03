/**
 * swipe-back.js v4 — native-style left-edge swipe to go back
 *
 * Visual types:
 *   A (quranReader, ivSeriesView): iOS-style card — foreground slides right as a
 *     fixed overlay while the background page is revealed beneath it.
 *     Background is un-hidden before the first animation frame (layout flush) so
 *     there is no blank beige area or delayed header pop-in.
 *   B (overlays, profiles): fg translates 1:1, no bg reveal.
 *     Subtle left-edge shadow gives depth.
 *   G (Gencine sub-views): gencineContent translates within overflow-x:hidden panel.
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

  var _busy = false;

  // ── Gate checks ──────────────────────────────────────────────────────────────

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
    if (window._tkIsScrolling && window._tkIsScrolling()) return true;
    if (_inputFocused()) return true;
    if (document.body.classList.contains('mushaf-mode')) return true;
    if (window._sbPdfZoomed) return true;
    if (window._ptrGlobalRefreshing) return true;
    if (_inHorizScroll(target)) return true;
    return false;
  }

  // ── Layout detection ─────────────────────────────────────────────────────────

  function _isTablet() {
    return window.innerWidth >= 768 || document.documentElement.classList.contains('is-ipad');
  }

  // ── Target resolution ────────────────────────────────────────────────────────

  function _getTarget() {
    var W = window.innerWidth;

    // Type B: full-screen fixed overlays
    var overlayIds = ['profilePanel', 'prayerProgressPanel', 'authPanel'];
    for (var i = 0; i < overlayIds.length; i++) {
      var ov = document.getElementById(overlayIds[i]);
      if (ov && ov.classList.contains('on')) return { type: 'B', fg: ov, W: W };
    }

    // IslamVoice series — Type A: reveal ivHome behind sliding card
    var iv = document.getElementById('ivSeriesView');
    if (iv && iv.classList.contains('on')) {
      return { type: 'A', fg: iv, bg: document.getElementById('ivHome'), W: W };
    }

    // Quran reader — Type A: reveal quranHome behind sliding card (iOS navigation feel)
    var qr = document.getElementById('quranReader');
    if (qr && qr.classList.contains('on')) {
      return { type: 'A', fg: qr, bg: document.getElementById('quranHome'), W: W };
    }

    // Gencine sub-views — Type G (panel-contained translate)
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gc = document.getElementById('gencineContent');
      if (gc) return { type: 'G', fg: gc, W: W };
    }

    return null;
  }

  // ── Drag start ───────────────────────────────────────────────────────────────

  function _dragStart(t) {
    t.started = true;

    if (t.type === 'A') {
      // Reveal the background page before the first animation frame.
      // bg has display:none (set by openSurah/openSeries) — remove it so it renders.
      if (t.bg) {
        t.bg.style.display = '';
      }
      // Float reader as a fixed full-screen card on top of background.
      // position:fixed takes it out of flex flow → no height/layout conflict.
      t.fg.style.position = 'fixed';
      t.fg.style.top      = '0';
      t.fg.style.left     = '0';
      t.fg.style.right    = '0';
      t.fg.style.bottom   = '0';
      t.fg.style.zIndex   = '10';
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      // Shadow on the left/leading edge — depth cue as card separates from bg
      t.fg.style.boxShadow = '-8px 0 32px rgba(0,0,0,.28)';
      // Force layout flush — ensures bg is fully rendered (header, content)
      // before the first animation frame. Prevents blank background flash.
      void t.fg.clientWidth;
    } else {
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      if (t.type === 'B') {
        t.fg.style.boxShadow = '-6px 0 24px rgba(0,0,0,.32)';
      }
    }
  }

  // ── Apply drag ───────────────────────────────────────────────────────────────

  function _dragMove(t, dx) {
    if (!t.started) return;
    t.fg.style.transition = 'none';
    t.fg.style.transform  = 'translateX(' + dx + 'px)';
  }

  // ── Commit ───────────────────────────────────────────────────────────────────

  function _commit(t) {
    _busy = true;

    if (!t.started) {
      _busy = false;
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      return;
    }

    // Tablet inline readers: CSS forces display:flex!important — skip animation
    if (_isTablet() && (t.fg.id === 'quranReader' || t.fg.id === 'ivSeriesView')) {
      _clearFg(t, false);
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      _busy = false;
      return;
    }

    var ease = 'cubic-bezier(.4,0,.2,1)';
    var dur  = ANIM_MS + 'ms ' + ease;
    t.fg.style.transition = 'transform ' + dur;
    t.fg.style.transform  = 'translateX(' + t.W + 'px)';

    setTimeout(function () {
      // App.doBack() will: remove .on from fg, restore bg visibility (display:'')
      // For Type A this is fine — bg is already visible, doBack just confirms it.
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      requestAnimationFrame(function () {
        // Clean up inline styles. For Type A: doBack already handles .on removal,
        // so fg is display:none via CSS. We just clear the position/transform/shadow.
        _clearFg(t, false);
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

    setTimeout(function () {
      // On cancel, restore bg to hidden (App.doBack was NOT called)
      _clearFg(t, true);
    }, CANCEL_MS + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────
  // restoreBg: true on cancel (re-hide bg), false on commit (App.doBack handles it)

  function _clearFg(t, restoreBg) {
    var s = t.fg.style;
    s.transition  = '';
    s.transform   = '';
    s.willChange  = '';
    s.boxShadow   = '';
    if (t.type === 'A') {
      s.position = '';
      s.top      = '';
      s.left     = '';
      s.right    = '';
      s.bottom   = '';
      s.zIndex   = '';
      if (restoreBg && t.bg) {
        t.bg.style.display = 'none';
      }
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
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    document.removeEventListener('touchmove', _onTouchMove);
    if (g && g.locked === 'h' && g.target) _cancel(g.target);
    g = null;
  }, { passive: true });

})();
