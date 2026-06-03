/**
 * swipe-back.js — native-style left-edge swipe to go back
 *
 * All types are simple foreground-only translateX. No background manipulation.
 *
 *   B (overlays): position:fixed panels slide right, app shows naturally behind
 *   B (readers):  quranReader / ivSeriesView translate in-flow; bg stays hidden
 *                 (display:none throughout — panel background shows, no header clash)
 *   B (gencine):  panelGencine (header + content) translates as one unit
 *   B (tablet):   quranReader / ivSeriesView clear instantly, doBack handles state
 *
 * Navigation: App.doBack({allowExit:false}) fires after animation.
 * Guards: _sbPdfZoomed, mushaf-mode, PTR, horiz-scroll, input — all preserved.
 */
(function () {
  'use strict';

  // ── Tuning ──────────────────────────────────────────────────────────────────
  var EDGE_PX   = 32;    // touch must start within this many px of left edge
  var LOCK_PX   = 10;    // movement before direction is decided
  var DIST_OK   = 80;    // px rightward travel → commit
  var VEL_OK    = 0.35;  // px/ms fast-flick threshold
  var ANIM_MS   = 320;   // commit animation duration
  var CANCEL_MS = 290;   // cancel snap-back duration

  // ── Animation lock ───────────────────────────────────────────────────────────
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

    // Fixed overlays — app content visible naturally underneath
    var overlayIds = ['profilePanel', 'prayerProgressPanel', 'authPanel'];
    for (var i = 0; i < overlayIds.length; i++) {
      var ov = document.getElementById(overlayIds[i]);
      if (ov && ov.classList.contains('on')) return { fg: ov, W: W };
    }

    // IslamVoice series — translate in-flow; ivHome stays hidden behind
    var iv = document.getElementById('ivSeriesView');
    if (iv && iv.classList.contains('on')) return { fg: iv, W: W };

    // Quran reader — translate in-flow; quranHome stays hidden behind
    var qr = document.getElementById('quranReader');
    if (qr && qr.classList.contains('on')) return { fg: qr, W: W };

    // Gencine sub-views — translate whole panel so header moves with content
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gp = document.getElementById('panelGencine');
      if (gp) return { fg: gp, W: W };
    }

    return null;
  }

  // ── Drag start ───────────────────────────────────────────────────────────────

  function _dragStart(t) {
    t.started = true;
    t.fg.style.willChange = 'transform';
    t.fg.style.transition = 'none';
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

    // Tablet inline readers have display:flex!important — slide-off causes a snap.
    // Clear immediately and let App.doBack handle the state change.
    var id = t.fg.id;
    if (_isTablet() && (id === 'quranReader' || id === 'ivSeriesView')) {
      _clearFg(t);
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      _busy = false;
      return;
    }

    var ease = 'cubic-bezier(.2,0,.2,1)';
    t.fg.style.transition = 'transform ' + ANIM_MS + 'ms ' + ease;
    t.fg.style.transform  = 'translateX(' + t.W + 'px)';

    setTimeout(function () {
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      requestAnimationFrame(function () {
        _clearFg(t);
        _busy = false;
      });
    }, ANIM_MS + 16);
  }

  // ── Cancel ───────────────────────────────────────────────────────────────────

  function _cancel(t) {
    if (!t.started) return;
    t.fg.style.transition = 'transform ' + CANCEL_MS + 'ms cubic-bezier(.22,1,.36,1)';
    t.fg.style.transform  = 'translateX(0)';
    setTimeout(function () { _clearFg(t); }, CANCEL_MS + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────

  function _clearFg(t) {
    var s = t.fg.style;
    s.transition = '';
    s.transform  = '';
    s.willChange = '';
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
