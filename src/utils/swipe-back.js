/**
 * swipe-back.js v10 — native-style left-edge swipe to go back
 *
 * Visual types:
 *   A  (quranReader, ivSeriesView): iOS-style card — fg slides right as fixed overlay,
 *      bg revealed beneath. fg moved to <body> to escape contain:paint clipping.
 *   AG (Gencine sub-views except book-reader): same iOS-style card as A, but bg is a
 *      temporary pre-rendered destination element inside panelGencine. Built at
 *      drag-lock time via GencineUI._renderDestInto(), removed after commit/cancel.
 *   G+ (Gencine book-reader): fg moved to <body> like A/AG, scrim + shadow, but no
 *      pre-render — destination (books list) requires async load. Clean themed bg.
 *   B  (overlays, profiles): fg translates 1:1, no bg reveal. Subtle shadow.
 *
 * Navigation logic: unchanged — App.doBack({allowExit:false}) fires after animation.
 *
 * Two-phase gesture detection (matching tab-swipe v9 lifecycle):
 *   Phase 1 (_onDetect, passive:true): never blocks scroll. Vertical lock releases
 *     immediately. Horizontal lock requires dx>LOCK_PX && dx>|dy|*HORIZ_RATIO.
 *   Phase 2 (_onActive, passive:false): rAF-batched translate3d tracking.
 *     preventDefault only here — scroll is never touched until gesture is owned.
 *
 * Lifecycle matches tab-swipe v9:
 *   _cancel sets _busy=true immediately; _cancelTid saved and cleared on each
 *   new _cancel call; App.doBack wrapped in try/catch so _busy can't stay stuck.
 */
(function () {
  'use strict';

  var EDGE_PX      = 32;     // px — left-edge trigger zone
  var DEAD_PX      = 6;      // px — no decision until one axis exceeds this
  var LOCK_PX      = 10;     // px horizontal travel needed to claim gesture
  var VERT_LOCK_PX = 8;      // px vertical travel that immediately releases to scroll
  var HORIZ_RATIO  = 1.4;    // horizontal must be this much stronger than vertical
  var DIST_OK      = 80;     // px — commit if drag ≥ this
  var VEL_OK       = 0.35;   // px/ms fast-flick commit threshold
  var ANIM_MS      = 270;    // max commit animation (adaptive: shorter if mostly dragged)
  var CANCEL_MS    = 220;    // cancel snap-back duration

  // ── Animation lock ──────────────────────────────────────────────────────────
  var _busy      = false;
  var _cancelTid = null;  // pending cancel timeout — cleared on each new _cancel call

  // ── rAF render scheduling ────────────────────────────────────────────────────
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

  function _shouldBlock(target) {
    if (window._tkIsScrolling && window._tkIsScrolling()) return true;
    if (_inputFocused()) return true;
    if (document.body.classList.contains('mushaf-mode')) return true;
    if (window._sbPdfZoomed)         return true;
    if (window._ptrGlobalRefreshing) return true;
    if (_inHorizScroll(target))      return true;
    return false;
  }

  function _isTablet() {
    return window.innerWidth >= 768 || document.documentElement.classList.contains('is-ipad');
  }

  // ── Target resolution ────────────────────────────────────────────────────────

  function _getTarget() {
    var W = window.innerWidth;

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

    // Gencine sub-views
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gc = document.getElementById('gencineContent');
      var pg = document.getElementById('panelGencine');
      if (gc && pg) {
        // book-reader: destination requires async load — use G+ (no pre-render)
        if (GencineUI._view === 'book-reader') {
          return { type: 'G+', fg: gc, panel: pg, W: W };
        }
        // all other sub-views: full destination reveal via pre-render (Type AG)
        return { type: 'AG', fg: gc, panel: pg, W: W };
      }
    }

    return null;
  }

  // ── Drag start ───────────────────────────────────────────────────────────────

  function _dragStart(t) {
    t.started = true;

    if (t.type === 'A') {
      // Override content-visibility:auto on bg cards BEFORE revealing the panel.
      // .surah-card/.iv-card/.iv-ep-item use content-visibility:auto on safe-render devices —
      // when quranHome/ivHome was display:none those cards were outside the rendering tree,
      // so the browser treats them as off-screen placeholders when display is restored.
      // sb-reveal forces content-visibility:visible so cards paint synchronously in
      // the first frame instead of showing beige placeholder boxes.
      document.body.classList.add('sb-reveal');

      // Show the background page.
      // bg has display:none (set by openSurah/openSeries) — remove it so it renders.
      if (t.bg) {
        t.bg.style.display = '';
        // Force layout specifically on bg's paint container — panelQuran has contain:paint,
        // so accessing clientWidth on fg (which moved to body) does NOT trigger panelQuran's
        // paint chunk scheduling. offsetHeight on bg does.
        void t.bg.offsetHeight;
      }

      // Move fg to <body> — .panel has contain:paint which clips position:fixed children
      // to the panel border-box. Moving fg to body escapes this so position:fixed covers
      // the real viewport and the element can translate off-screen without clipping.
      t._fgParent  = t.fg.parentElement;
      t._fgSibling = t.fg.nextSibling;
      if (t._fgParent) document.body.appendChild(t.fg);

      // Position as fixed full-screen card on top of everything (above tab bar z:300).
      // top:'var(--safe-t)' prevents the ~50px safe-area jump on notched devices.
      t.fg.style.position   = 'fixed';
      t.fg.style.top        = 'var(--safe-t)';
      t.fg.style.left       = '0';
      t.fg.style.right      = '0';
      t.fg.style.bottom     = '0';
      t.fg.style.zIndex     = '400';
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      t.fg.style.boxShadow  = '-12px 0 40px rgba(0,0,0,.38)';

      // Dim scrim — makes bg read as "previous screen in stack".
      var scrim = document.createElement('div');
      scrim.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000;opacity:0.30;z-index:399;pointer-events:none;transition:none;will-change:opacity;';
      document.body.appendChild(scrim);
      t._scrim = scrim;

      void t.fg.clientWidth;

    } else if (t.type === 'AG' || t.type === 'G+') {
      // Both AG and G+ escape panelGencine's contain:paint by moving fg to body.
      // AG additionally pre-renders the destination into panelGencine as a bg layer.

      if (t.type === 'AG' && window.GencineUI && typeof GencineUI._renderDestInto === 'function') {
        // Build destination bg BEFORE saving _fgSibling so sibling points to destEl,
        // ensuring fg reinserts in front of destEl on cleanup (preserving original order).
        var destEl = document.createElement('div');
        destEl.className = 'gencine-dest-layer';
        t.panel.appendChild(destEl);
        GencineUI._renderDestInto(destEl);
        t._destEl = destEl;
        // Force panelGencine's paint chunk — same as void t.bg.offsetHeight in Type A.
        // panelGencine has contain:paint (global .panel rule), so we force layout inside it.
        void destEl.offsetHeight;
      }

      // Save fg's DOM position (after destEl append so sibling = destEl for AG, null for G+)
      t._fgParent  = t.fg.parentElement;
      t._fgSibling = t.fg.nextSibling;

      // Save panelGencine scroll; reset to 0 so destination shows from top during drag.
      // Restored on cancel; _draw() handles scroll on commit.
      t._savedScroll = t.panel.scrollTop;
      t.panel.scrollTop = 0;

      // Move fg to body — same contain:paint escape as Type A
      if (t._fgParent) document.body.appendChild(t.fg);

      t.fg.style.position   = 'fixed';
      t.fg.style.top        = 'var(--safe-t)';
      t.fg.style.left       = '0';
      t.fg.style.right      = '0';
      t.fg.style.bottom     = '0';
      t.fg.style.zIndex     = '400';
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      t.fg.style.boxShadow  = '-12px 0 40px rgba(0,0,0,.38)';

      var scrim2 = document.createElement('div');
      scrim2.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000;opacity:0.30;z-index:399;pointer-events:none;transition:none;will-change:opacity;';
      document.body.appendChild(scrim2);
      t._scrim = scrim2;

      void t.fg.clientWidth;

    } else {
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      if (t.type === 'B') {
        t.fg.style.boxShadow = '-6px 0 24px rgba(0,0,0,.32)';
      }
    }
  }

  // ── Apply drag (called via rAF) ──────────────────────────────────────────────

  function _dragMove(t, dx) {
    if (!t.started) return;
    t.fg.style.transition = 'none';
    t.fg.style.transform  = 'translate3d(' + dx + 'px,0,0)';
    if (t._scrim) {
      var p = Math.min(1, Math.max(0, dx / t.W));
      t._scrim.style.opacity = (0.30 * (1 - p)).toFixed(3);
    }
  }

  // ── Commit ───────────────────────────────────────────────────────────────────

  function _commit(t) {
    _busy = true;
    _cancelRaf();

    if (!t.started) {
      // Gesture was claimed (horizontal lock) but drag never started visually.
      // Still need to navigate back — no animation needed.
      try {
        if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      } catch (_e) {}
      _busy = false;
      return;
    }

    // Tablet inline readers and Gencine: panels are non-overlaying — skip animation
    if (_isTablet() && (t.fg.id === 'quranReader' || t.fg.id === 'ivSeriesView' || t.fg.id === 'gencineContent')) {
      _clearFg(t, false);
      try {
        if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      } catch (_e) {}
      _busy = false;
      return;
    }

    var ease     = 'cubic-bezier(0.22,1,0.36,1)';
    // Adaptive duration: shorter when user already dragged most of the way across.
    // Matches tab-swipe v9 formula — fast flicks snap instantly, slow drags accelerate.
    var progress = Math.min(1, t.dx / t.W);
    var durMs    = Math.round(Math.max(180, ANIM_MS * (1 - progress * 0.50)));
    var dur      = durMs + 'ms ' + ease;

    t.fg.style.transition = 'transform ' + dur;
    t.fg.style.transform  = 'translate3d(' + t.W + 'px,0,0)';
    if (t._scrim) {
      t._scrim.style.transition = 'opacity ' + dur;
      t._scrim.style.opacity    = '0';
    }

    setTimeout(function () {
      // try/catch guarantees the rAF cleanup always runs even if App.doBack() throws,
      // so _busy can never remain stuck true after a commit.
      try {
        if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      } catch (_e) {}
      requestAnimationFrame(function () {
        _clearFg(t, false);
        _busy = false;
      });
    }, durMs + 16);
  }

  // ── Cancel (snap back) ───────────────────────────────────────────────────────

  function _cancel(t) {
    // Lock _busy immediately — prevents a new gesture from starting during snap-back
    // and having its inline styles/DOM position wiped by this cancel's cleanup timeout.
    _busy = true;
    // Clear any prior cancel timeout so stale closures can't reach fg elements.
    if (_cancelTid) { clearTimeout(_cancelTid); _cancelTid = null; }
    _cancelRaf();

    if (!t.started) {
      _busy = false;
      return;
    }

    var ease = 'cubic-bezier(0.22,1,0.36,1)';
    var dur  = CANCEL_MS + 'ms ' + ease;
    t.fg.style.transition = 'transform ' + dur;
    t.fg.style.transform  = 'translate3d(0,0,0)';
    if (t._scrim) {
      t._scrim.style.transition = 'opacity ' + dur;
      t._scrim.style.opacity    = '0.30';
    }

    _cancelTid = setTimeout(function () {
      _cancelTid = null;
      _clearFg(t, true);
      _busy = false;
    }, CANCEL_MS + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────
  // restoreBg: true on cancel (undo visual state), false on commit (App.doBack handles it)
  function _clearFg(t, restoreBg) {
    var s = t.fg.style;
    s.transition = '';
    s.transform  = '';
    s.willChange = '';
    s.boxShadow  = '';

    if (t.type === 'A') {
      document.body.classList.remove('sb-reveal');
      s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = ''; s.zIndex = '';
      if (t._fgParent) {
        if (t._fgSibling && t._fgSibling.parentElement === t._fgParent) {
          t._fgParent.insertBefore(t.fg, t._fgSibling);
        } else {
          t._fgParent.appendChild(t.fg);
        }
      }
      if (restoreBg && t.bg) t.bg.style.display = 'none';
      if (t._scrim) {
        if (t._scrim.parentNode) t._scrim.parentNode.removeChild(t._scrim);
        t._scrim = null;
      }

    } else if (t.type === 'AG' || t.type === 'G+') {
      s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = ''; s.zIndex = '';
      // Reinsert fg before its original next sibling (= destEl for AG, null/end for G+).
      // For AG this places fg at its original position, then we remove destEl, leaving
      // panelGencine with only gencineContent — identical content, no visible flash.
      if (t._fgParent) {
        if (t._fgSibling && t._fgSibling.parentElement === t._fgParent) {
          t._fgParent.insertBefore(t.fg, t._fgSibling);
        } else {
          t._fgParent.appendChild(t.fg);
        }
      }
      // Remove the pre-rendered destination overlay (AG only)
      if (t._destEl) {
        if (t._destEl.parentNode) t._destEl.parentNode.removeChild(t._destEl);
        t._destEl = null;
      }
      // On cancel: restore the panel's original scroll position
      if (restoreBg && t._savedScroll != null && t.panel) {
        t.panel.scrollTop = t._savedScroll;
      }
      if (t._scrim) {
        if (t._scrim.parentNode) t._scrim.parentNode.removeChild(t._scrim);
        t._scrim = null;
      }
    }
  }

  // ── Gesture state ────────────────────────────────────────────────────────────
  var g = null;

  // Called once horizontal intent is confirmed — starts visual and upgrades listener
  function _lockHorizontal() {
    g.locked = 'h';
    if (g.target) _dragStart(g.target);
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

    // Moving away from left edge — not a swipe-back, release immediately
    if (dx < -DEAD_PX) {
      document.removeEventListener('touchmove', _onDetect);
      g = null;
      return;
    }

    // Vertical lock: clearly scrolling — immediately release, no interference
    if (ady > VERT_LOCK_PX && ady > adx) {
      document.removeEventListener('touchmove', _onDetect);
      g = null;
      return;
    }

    // Horizontal lock: clearly a rightward swipe from the edge
    if (dx > LOCK_PX && dx > ady * HORIZ_RATIO) {
      document.removeEventListener('touchmove', _onDetect);
      _lockHorizontal();
      return;
    }

    // Ambiguous diagonal: keep observing without blocking anything
  }

  // Phase 2 — active tracking: rAF-batched, calls preventDefault
  function _onActive(e) {
    if (!g || g.locked !== 'h') return;
    var dx = e.touches[0].clientX - g.x0;
    g.dx = dx > 0 ? dx : 0;
    if (g.target) {
      _rafDx     = g.dx;
      _rafTarget = g.target;
      _scheduleRender();
    }
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
    // Passive: pure observation — does not interfere with scroll in any way
    document.addEventListener('touchmove', _onDetect, { passive: true });
  }, { passive: true });

  document.addEventListener('touchend', function () {
    document.removeEventListener('touchmove', _onDetect);
    document.removeEventListener('touchmove', _onActive);
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
    document.removeEventListener('touchmove', _onDetect);
    document.removeEventListener('touchmove', _onActive);
    _cancelRaf();
    var tgt = g && g.target;
    g = null;
    if (tgt) _cancel(tgt);
    // No else: _busy is false during Phase 1 detection (only set by _commit/_cancel)
  }, { passive: true });

})();
