/**
 * swipe-back.js — native-style left-edge swipe to go back
 *
 * Foreground: pure translateX only — no opacity, scale, or visual change.
 * Destination: revealed naturally (display:'') for readers; static behind fg.
 * Background interaction: blocked by a transparent fixed overlay (z-index 350).
 *
 * Scroll lock: overflowY:hidden on scroll host prevents iOS WKScrollView from
 *   scrolling within the same touch sequence (blocker alone cannot prevent this).
 *
 * UI ownership (window._sbOwns):
 *   Set true at horizontal direction lock; cleared when gesture fully ends.
 *   App.tab() returns immediately while true — tab switching is completely
 *   blocked until swipe-back is done. After a multi-touch abort the flag is
 *   held for 350 ms so the click synthesised from the concurrent touch is also
 *   blocked (click fires ~100-200 ms after touchend, well within the window).
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
  var _busy         = false;
  var _cancelTimer  = null;
  var _cancelTarget = null;   // target of the active cancel animation (interrupt cleanup)
  var _gid          = 0;
  var _blocker      = null;
  var _sbOwnsTimer  = null;
  window._sbOwns    = false;  // true while swipe-back owns the UI

  // ── UI-ownership helpers ──────────────────────────────────────────────────────
  // immediate=true  → release now (clean completion, no concurrent click pending)
  // immediate=false → release after 350 ms (abort path; defers past any synthesised click)
  function _releaseSbOwns(immediate) {
    if (_sbOwnsTimer) { clearTimeout(_sbOwnsTimer); _sbOwnsTimer = null; }
    if (immediate) {
      window._sbOwns = false;
    } else {
      _sbOwnsTimer = setTimeout(function () {
        _sbOwnsTimer = null;
        window._sbOwns = false;
      }, 350);
    }
  }

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

  // ── Background interaction blocker ───────────────────────────────────────────

  function _createBlocker() {
    if (_blocker) return;
    _blocker = document.createElement('div');
    _blocker.style.cssText = 'position:fixed;inset:0;z-index:350;background:transparent;';
    document.body.appendChild(_blocker);
  }

  function _removeBlocker() {
    if (_blocker) {
      if (_blocker.parentNode) _blocker.parentNode.removeChild(_blocker);
      _blocker = null;
    }
  }

  // ── Target resolution ────────────────────────────────────────────────────────

  function _getTarget() {
    var W = window.innerWidth;

    // Fixed overlays — destination (main app) naturally visible underneath
    var overlayIds = ['profilePanel', 'prayerProgressPanel', 'authPanel'];
    for (var i = 0; i < overlayIds.length; i++) {
      var ov = document.getElementById(overlayIds[i]);
      if (ov && ov.classList.contains('on')) return { fg: ov, bg: null, W: W };
    }

    // IslamVoice series — reveal ivHome behind
    var iv = document.getElementById('ivSeriesView');
    if (iv && iv.classList.contains('on')) {
      return { fg: iv, bg: document.getElementById('ivHome'), W: W };
    }

    // Quran reader — reveal quranHome behind
    var qr = document.getElementById('quranReader');
    if (qr && qr.classList.contains('on')) {
      return { fg: qr, bg: document.getElementById('quranHome'), W: W };
    }

    // Gencine sub-views — translate whole panel; panel bg (var(--bg)) shows behind
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gp = document.getElementById('panelGencine');
      if (gp) return { fg: gp, bg: null, W: W };
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

  // ── Cancel-animation interrupt ────────────────────────────────────────────────
  // Called when a new touchstart arrives during a running cancel animation.
  // Snaps the panel back to rest immediately; _sbOwns release is handled by caller.

  function _interruptCancel() {
    if (!_cancelTimer) return;
    clearTimeout(_cancelTimer);
    _cancelTimer = null;
    var ct = _cancelTarget;
    _cancelTarget = null;
    if (!ct) return;
    if (ct.bg) ct.bg.style.display = 'none';
    ct.fg.style.transition = '';
    ct.fg.style.transform  = '';
    ct.fg.style.willChange = '';
    _removeBlocker();
  }

  // ── Safe abort ───────────────────────────────────────────────────────────────

  function _abortGesture() {
    if (!g) return;
    var t       = g.target;
    var wasLock = g.locked === 'h';
    g = null;

    if (!wasLock) return;

    _gid++;
    _interruptCancel();  // clean up any concurrent cancel animation first

    if (!t) {
      // No visual target (e.g., PDF/book reader) — just release ownership deferred
      _releaseSbOwns(false);
      return;
    }

    _unlockScroll(t);
    if (t.bg) t.bg.style.display = 'none';
    _removeBlocker();
    t.fg.style.transition = '';
    t.fg.style.transform  = '';
    t.fg.style.willChange = '';
    _releaseSbOwns(false);  // deferred — blocks click synthesised from concurrent touch
  }

  // ── Drag start ───────────────────────────────────────────────────────────────

  function _dragStart(t) {
    t.started = true;
    _lockScroll(t);
    // Reveal destination — shown in its normal state, no transforms
    if (t.bg) t.bg.style.display = '';
    // Block all background interaction until gesture ends
    _createBlocker();
    t.fg.style.willChange = 'transform';
    t.fg.style.transition = 'none';
  }

  // ── Apply drag ───────────────────────────────────────────────────────────────

  function _dragMove(t, dx) {
    if (!t.started) return;
    t.fg.style.transition = 'none';
    t.fg.style.transform  = 'translateX(' + dx + 'px)';
    // bg is never touched — it stays clean, static, and fully opaque behind fg
  }

  // ── Commit ───────────────────────────────────────────────────────────────────

  function _commit(t) {
    _busy = true;
    var capturedId = _gid;

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
      if (_gid !== capturedId) { _removeBlocker(); _busy = false; return; }
      _unlockScroll(t);
      try {
        if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      } catch (_e) {}
      requestAnimationFrame(function () {
        if (_gid !== capturedId) { _removeBlocker(); _busy = false; return; }
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
    _cancelTarget = t;
    var capturedId = _gid;
    _cancelTimer = setTimeout(function () {
      _cancelTimer = null;
      _cancelTarget = null;
      if (_gid !== capturedId) { _removeBlocker(); return; }
      // Hide destination — gesture was cancelled, original state restored
      if (t.bg) t.bg.style.display = 'none';
      _clearFg(t);
    }, CANCEL_MS + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────

  function _clearFg(t) {
    var s = t.fg.style;
    s.transition = '';
    s.transform  = '';
    s.willChange = '';
    _removeBlocker();
    _releaseSbOwns(true);  // clean completion — release ownership immediately
  }

  // ── Gesture state ────────────────────────────────────────────────────────────
  var g = null;

  function _onTouchMove(e) {
    if (!g) return;

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
        // Claim ownership at lock for all gesture types (incl. no-target / PDF)
        window._sbOwns = true;
        if (_sbOwnsTimer) { clearTimeout(_sbOwnsTimer); _sbOwnsTimer = null; }
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
    _abortGesture();
    if (!_busy) _gid++;  // don't invalidate commit animation on incidental touches

    // Interrupt any running cancel animation — snaps panel to rest immediately.
    // Must run even when g was null (cancel from previous gesture still running).
    _interruptCancel();

    // If swipe-back still claims ownership (commit/cancel in progress, or just
    // aborted — deferred release pending), set/extend the deferred release so
    // any click synthesised from this touch sequence is blocked.
    if (window._sbOwns && !_sbOwnsTimer) {
      _releaseSbOwns(false);
    }

    if (window._tabAnimating) return;
    if (e.touches.length !== 1) return;
    if (_busy) return;
    var t = e.touches[0];
    if (t.clientX > EDGE_PX) return;
    if (_shouldBlock(e.target)) return;
    if (!window.App || typeof App.hasBack !== 'function') return;
    if (!App.hasBack()) return;

    var target = _getTarget();
    // Defensive: hide bg if a stale gesture left it visible
    if (target && target.bg && target.bg.style.display !== 'none') {
      target.bg.style.display = 'none';
    }

    g = {
      x0:     t.clientX,
      y0:     t.clientY,
      t0:     Date.now(),
      dx:     0,
      locked: null,
      target: target,
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
      _releaseSbOwns(true);
    } else {
      // No-target gesture cancelled (e.g., PDF reader, below-threshold swipe)
      _releaseSbOwns(true);
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    document.removeEventListener('touchmove', _onTouchMove);
    if (g && g.locked === 'h') {
      if (g.target) _cancel(g.target);
      else          _releaseSbOwns(true);  // no-target cancelled
    }
    g = null;
  }, { passive: true });

})();
