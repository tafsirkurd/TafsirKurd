/**
 * swipe-back.js — native-style left-edge swipe to go back
 *
 * Calls App.doBack({allowExit:false}) using the same priority logic as the
 * hardware back button. Safe around PTR, Mushaf, PDF zoom, and horizontal
 * carousels — each has its own guard that cancels the gesture early.
 */
(function () {
  'use strict';

  // ── Tuning ──────────────────────────────────────────────────────────────────
  var EDGE_PX   = 28;   // touch must start within this many px of the left edge
  var LOCK_PX   = 10;   // movement required before direction is decided
  var DIST_OK   = 80;   // px rightward travel → commit back
  var VEL_OK    = 0.35; // px/ms fast-flick threshold (also commits)
  var DRAG_RATIO = 0.38; // panel follows finger at this ratio (elastic feel)
  var DRAG_CAP  = 100;  // max px the panel translates

  // ── Panels that receive drag feedback (slide-in-from-right pattern) ─────────
  var SLIDE_PANELS = [
    'quranReader', 'ivSeriesView', 'profilePanel',
    'prayerProgressPanel', 'authPanel',
  ];

  // ── Gesture state ────────────────────────────────────────────────────────────
  var g = null; // null = idle; object = active gesture

  // ── Gate checks — called once on touchstart ──────────────────────────────────

  function _inputFocused() {
    var ae = document.activeElement;
    if (!ae) return false;
    var tag = ae.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || ae.contentEditable === 'true';
  }

  function _inHorizScroll(el) {
    // Reuse PTR helper when available (defined in app.js at global scope).
    if (typeof _ptrInHorizScroll === 'function') return _ptrInHorizScroll(el);
    // Fallback: walk DOM looking for overflow-x containers or known class names.
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
    if (document.body.classList.contains('mushaf-mode')) return true;  // mushaf swipe owns horizontal
    if (window._sbPdfZoomed) return true;                              // PDF zoomed — pan owns touch
    if (window._ptrGlobalRefreshing) return true;                      // PTR refresh in flight
    if (_inHorizScroll(target)) return true;                           // inside carousel / horiz list
    return false;
  }

  // ── Feedback element ─────────────────────────────────────────────────────────

  function _feedbackEl() {
    for (var i = 0; i < SLIDE_PANELS.length; i++) {
      var el = document.getElementById(SLIDE_PANELS[i]);
      if (el && (el.classList.contains('on') || el.classList.contains('open'))) return el;
    }
    return null; // sheets / overlays handle their own closing animation
  }

  // ── Visual drag & snap ───────────────────────────────────────────────────────

  function _applyDrag(el, dx) {
    if (!el) return;
    var tx = Math.min(dx * DRAG_RATIO, DRAG_CAP);
    el.style.transition = 'none';
    el.style.transform  = 'translateX(' + tx + 'px)';
  }

  function _snap(el, commit) {
    if (!el) return;
    if (commit) {
      // Let the close animation that App.doBack triggers take over.
      el.style.transition = '';
      el.style.transform  = '';
    } else {
      el.style.transition = 'transform 0.26s cubic-bezier(.22,1,.36,1)';
      el.style.transform  = '';
      var _ref = el;
      setTimeout(function () { _ref.style.transition = ''; }, 290);
    }
  }

  // ── Touch handlers ───────────────────────────────────────────────────────────

  document.addEventListener('touchstart', function (e) {
    g = null;
    if (e.touches.length !== 1) return;

    var t = e.touches[0];
    if (t.clientX > EDGE_PX) return;                              // not from left edge
    if (_shouldBlock(e.target)) return;                           // environmental gate
    if (!window.App || typeof App.hasBack !== 'function') return; // App not ready
    if (!App.hasBack()) return;                                   // nothing to go back to

    g = {
      x0:     t.clientX,
      y0:     t.clientY,
      t0:     Date.now(),
      dx:     0,
      locked: null, // null = undecided | 'h' = horizontal | cancelled → g=null
      el:     _feedbackEl(),
    };
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!g) return;

    var t  = e.touches[0];
    var dx = t.clientX - g.x0;
    var dy = t.clientY - g.y0;

    // Direction lock: wait for LOCK_PX of movement, then decide once.
    if (!g.locked) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return; // not enough yet

      if (Math.abs(dx) >= Math.abs(dy) && dx > 0) {
        g.locked = 'h'; // confirmed right-swipe — take it as back gesture
      } else {
        g = null; // vertical move or leftward — cancel, let scroll/PTR handle it
        return;
      }
    }

    // After lock: track distance and apply visual feedback.
    g.dx = dx > 0 ? dx : 0;
    _applyDrag(g.el, g.dx);

    // Only prevent default after we have confirmed horizontal intent.
    // This keeps vertical scroll / PTR fully functional before lock.
    e.preventDefault();
  }, { passive: false }); // must be non-passive so preventDefault works

  document.addEventListener('touchend', function () {
    if (!g || g.locked !== 'h') { g = null; return; }

    var elapsed = Date.now() - g.t0;
    var vel     = elapsed > 0 ? g.dx / elapsed : 0;
    var commit  = g.dx >= DIST_OK || vel >= VEL_OK;

    _snap(g.el, commit);

    if (commit && window.App && typeof App.doBack === 'function') {
      App.doBack({ allowExit: false });
    }

    g = null;
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    if (g) { _snap(g.el, false); g = null; }
  }, { passive: true });

})();
