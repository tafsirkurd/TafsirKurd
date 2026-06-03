/**
 * swipe-back.js — native-style left-edge swipe to go back
 *
 * All types are simple foreground-only translateX. No background manipulation.
 *
 * Multi-touch safety:
 *   _abortGesture() is called at every touchstart (cleans up any active gesture
 *   before starting a new one) and when touches.length > 1 appears in touchmove.
 *   It restores all inline styles and scroll state instantly, without animation
 *   or navigation. Stale timeout/rAF callbacks are invalidated via _gid counter.
 *
 * Scroll lock:
 *   At horizontal lock, overflowY is set to 'hidden' on the scroll host.
 *   Restored immediately in cancel/abort, and before doBack() in commit.
 */
(function () {
  'use strict';

  // ── Tuning ──────────────────────────────────────────────────────────────────
  var EDGE_PX   = 32;
  var LOCK_PX   = 10;
  var DIST_OK   = 80;
  var VEL_OK    = 0.35;
  var ANIM_MS   = 300;
  var CANCEL_MS = 290;

  // ── State ────────────────────────────────────────────────────────────────────
  var _busy        = false;
  var _cancelTimer = null;
  var _gid         = 0;   // gesture generation — incremented on each abort/new gesture

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

  // ── Scroll host ──────────────────────────────────────────────────────────────

  function _scrollHost(fg) {
    if (fg.classList && fg.classList.contains('panel')) return fg;
    var n = fg.parentElement;
    while (n && n !== document.body) {
      if (n.classList && n.classList.contains('panel')) return n;
      n = n.parentElement;
    }
    return fg;
  }

  // ── Target resolution ────────────────────────────────────────────────────────

  function _getTarget() {
    var W = window.innerWidth;

    var overlayIds = ['profilePanel', 'prayerProgressPanel', 'authPanel'];
    for (var i = 0; i < overlayIds.length; i++) {
      var ov = document.getElementById(overlayIds[i]);
      if (ov && ov.classList.contains('on')) return { fg: ov, W: W };
    }

    var iv = document.getElementById('ivSeriesView');
    if (iv && iv.classList.contains('on')) return { fg: iv, W: W };

    var qr = document.getElementById('quranReader');
    if (qr && qr.classList.contains('on')) return { fg: qr, W: W };

    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gp = document.getElementById('panelGencine');
      if (gp) return { fg: gp, W: W };
    }

    return null;
  }

  // ── Scroll lock / unlock ─────────────────────────────────────────────────────

  function _lockScroll(t) {
    var sh = _scrollHost(t.fg);
    t._sbSH    = sh;
    t._sbSHOvY = sh.style.overflowY;
    sh.style.overflowY = 'hidden';
  }

  function _unlockScroll(t) {
    if (t._sbSH) {
      t._sbSH.style.overflowY = t._sbSHOvY || '';
      t._sbSH    = null;
      t._sbSHOvY = undefined;
    }
  }

  // ── Safe abort ───────────────────────────────────────────────────────────────
  // Instantly cancels any active gesture without animation or navigation.
  // Called: (a) at every touchstart before creating a new gesture, and
  //         (b) in touchmove when a second finger appears (touches.length > 1).
  // After this, the DOM is fully restored and g is null.

  function _abortGesture() {
    if (!g) return;
    var t       = g.target;
    var wasLock = g.locked === 'h';
    g = null;
    if (!wasLock || !t) return;

    // Invalidate stale commit/cancel timeout callbacks
    _gid++;

    // Cancel pending cleanup timer
    if (_cancelTimer) { clearTimeout(_cancelTimer); _cancelTimer = null; }

    // Restore scroll immediately
    _unlockScroll(t);

    // Remove all inline styles instantly (no animation — second touch is present)
    var s = t.fg.style;
    s.transition = '';
    s.transform  = '';
    s.willChange = '';
  }

  // ── Drag start ───────────────────────────────────────────────────────────────

  function _dragStart(t) {
    t.started = true;
    if (_cancelTimer) { clearTimeout(_cancelTimer); _cancelTimer = null; }
    _lockScroll(t);
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
    var capturedId = _gid;   // snapshot — if _gid changes before timeout, skip

    var id = t.fg.id;
    if (_isTablet() && (id === 'quranReader' || id === 'ivSeriesView')) {
      _unlockScroll(t);
      _clearFg(t);
      if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      _busy = false;
      return;
    }

    var ease = 'cubic-bezier(.2,0,.2,1)';
    t.fg.style.transition = 'transform ' + ANIM_MS + 'ms ' + ease;
    t.fg.style.transform  = 'translateX(' + t.W + 'px)';

    setTimeout(function () {
      if (_gid !== capturedId) { _busy = false; return; }  // gesture was aborted
      _unlockScroll(t);
      try {
        if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      } catch (_e) {}
      requestAnimationFrame(function () {
        if (_gid !== capturedId) { _busy = false; return; }
        _clearFg(t);
        _busy = false;
      });
    }, ANIM_MS + 16);
  }

  // ── Cancel ───────────────────────────────────────────────────────────────────

  function _cancel(t) {
    if (!t.started) return;
    _unlockScroll(t);
    t.fg.style.transition = 'transform ' + CANCEL_MS + 'ms cubic-bezier(.22,1,.36,1)';
    t.fg.style.transform  = 'translateX(0)';
    var capturedId = _gid;
    _cancelTimer = setTimeout(function () {
      _cancelTimer = null;
      if (_gid !== capturedId) return;  // gesture was aborted or superseded
      _clearFg(t);
    }, CANCEL_MS + 16);
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

    // Multi-touch: second finger appeared during drag — abort immediately
    if (e.touches.length > 1) {
      document.removeEventListener('touchmove', _onTouchMove);
      _abortGesture();
      return;
    }

    var t  = e.touches[0];
    var dx = t.clientX - g.x0;
    var dy = t.clientY - g.y0;

    if (!g.locked) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) {
        e.preventDefault();
        return;
      }
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
    // Always abort any active gesture before deciding what to do next.
    // This is the single safe cleanup point — covers new touch, second finger,
    // and any other scenario where a previous gesture was left open.
    _abortGesture();

    if (e.touches.length !== 1) return;   // multi-touch: don't start new gesture
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
