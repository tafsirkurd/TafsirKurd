/**
 * swipe-back.js v11 — native-style left-edge swipe to go back
 *
 * Visual types:
 *   A  (quranReader, ivSeriesView): iOS-style card — fg slides right as fixed overlay,
 *      bg revealed beneath. fg moved to <body> to escape contain:paint clipping.
 *      bg starts at scale(0.94) / opacity(0.75) / blur(2px), animates to full on commit.
 *   AG (Gencine sub-views except book-reader): same as A, but bg is a temporary
 *      pre-rendered destination element built at drag-lock time via _renderDestInto().
 *   G+ (Gencine book-reader): same as AG but bg is a shimmer skeleton (destination
 *      requires async load). Same depth treatment as A/AG.
 *   B  (overlays, profiles): fg translates 1:1, no bg reveal. Subtle shadow.
 *
 * Depth system (A / AG / G+):
 *   bg starts : scale(0.94)  opacity(0.75)  filter:blur(2px)  scrim:0.45
 *   during drag: scales to 1.0, fades to 1.0 proportional to progress; blur stays 2px
 *   on commit  : CSS transition → scale(1) opacity(1) blur(0px)
 *   on cancel  : CSS transition → scale(0.94) opacity(0.75)  blur stays
 *
 * Two-phase gesture detection (matching tab-swipe lifecycle):
 *   Phase 1 (_onDetect, passive:true): never blocks scroll. Vertical lock releases
 *     immediately. Horizontal lock requires dx>LOCK_PX && dx>|dy|*HORIZ_RATIO.
 *   Phase 2 (_onActive, passive:false): rAF-batched translate3d tracking.
 *     preventDefault only here — scroll is never touched until gesture is owned.
 *
 * Lifecycle: _cancel sets _busy=true immediately; _cancelTid saved and cleared on each
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

  // Scrim strength — higher than old 0.30 so bg reads clearly as "previous screen"
  var SCRIM_MAX    = 0.45;

  // ── Animation lock ──────────────────────────────────────────────────────────
  var _busy      = false;
  var _cancelTid = null;

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

    // Quran reader — Type A: reveal quranHome behind sliding card
    var qr = document.getElementById('quranReader');
    if (qr && qr.classList.contains('on')) {
      return { type: 'A', fg: qr, bg: document.getElementById('quranHome'), W: W };
    }

    // Gencine sub-views
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gc = document.getElementById('gencineContent');
      var pg = document.getElementById('panelGencine');
      if (gc && pg) {
        // book-reader: destination requires async load — G+ (shimmer backdrop, same depth treatment)
        if (GencineUI._view === 'book-reader') {
          return { type: 'G+', fg: gc, panel: pg, W: W };
        }
        // all other sub-views: full destination reveal (Type AG)
        return { type: 'AG', fg: gc, panel: pg, W: W };
      }
    }

    return null;
  }

  // ── Apply initial bg depth styling (shared by A, AG, G+) ─────────────────────
  // bg element starts receded: scaled down, dimmed, slightly blurred.
  // Signals "this is the previous screen in a navigation stack."

  function _applyBgDepth(el) {
    el.style.willChange      = 'transform, opacity, filter';
    el.style.transformOrigin = 'center center';
    el.style.transform       = 'scale(0.94) translateZ(0)';
    el.style.opacity         = '0.75';
    el.style.filter          = 'blur(2px)';
    el.style.transition      = 'none';
  }

  // ── Drag start ───────────────────────────────────────────────────────────────

  function _dragStart(t) {
    t.started = true;

    if (t.type === 'A') {
      document.body.classList.add('sb-reveal');

      if (t.bg) {
        t.bg.style.display = '';
        void t.bg.offsetHeight;  // force bg panel's paint chunk before any transform
        _applyBgDepth(t.bg);
      }

      t._fgParent  = t.fg.parentElement;
      t._fgSibling = t.fg.nextSibling;
      if (t._fgParent) document.body.appendChild(t.fg);

      t.fg.style.position   = 'fixed';
      t.fg.style.top        = 'var(--safe-t)';
      t.fg.style.left       = '0';
      t.fg.style.right      = '0';
      t.fg.style.bottom     = '0';
      t.fg.style.zIndex     = '400';
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      t.fg.style.boxShadow  = '-16px 0 48px rgba(0,0,0,.55)';

      var scrimA = document.createElement('div');
      scrimA.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000;opacity:0.45;z-index:399;pointer-events:none;transition:none;will-change:opacity;';
      document.body.appendChild(scrimA);
      t._scrim = scrimA;

      void t.fg.clientWidth;

    } else if (t.type === 'AG' || t.type === 'G+') {
      // Build bg destination layer — AG pre-renders real destination content,
      // G+ uses a shimmer skeleton (books list requires async data).
      var destEl = document.createElement('div');
      destEl.className = 'gencine-dest-layer';

      if (t.type === 'AG' && window.GencineUI && typeof GencineUI._renderDestInto === 'function') {
        GencineUI._renderDestInto(destEl);
      } else {
        // Shimmer skeleton — visually suggests the books destination while data loads
        destEl.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:16px;';
        for (var k = 0; k < 5; k++) {
          var sh = document.createElement('div');
          sh.className = 'genc-scripts-loading-card';
          sh.style.cssText = 'height:80px;border-radius:16px;flex-shrink:0;';
          destEl.appendChild(sh);
        }
      }

      // Append BEFORE saving _fgSibling: sibling → destEl, so reinsert puts fg in front
      t.panel.appendChild(destEl);
      t._destEl = destEl;

      // Force panelGencine's paint chunk (contain:paint) so destination renders before drag
      void destEl.offsetHeight;

      _applyBgDepth(destEl);

      // Save fg position + panel scroll
      t._fgParent       = t.fg.parentElement;
      t._fgSibling      = t.fg.nextSibling;  // = destEl
      t._savedScroll    = t.panel.scrollTop;
      t.panel.scrollTop = 0;

      if (t._fgParent) document.body.appendChild(t.fg);

      t.fg.style.position   = 'fixed';
      t.fg.style.top        = 'var(--safe-t)';
      t.fg.style.left       = '0';
      t.fg.style.right      = '0';
      t.fg.style.bottom     = '0';
      t.fg.style.zIndex     = '400';
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      t.fg.style.boxShadow  = '-16px 0 48px rgba(0,0,0,.55)';

      var scrimG = document.createElement('div');
      scrimG.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000;opacity:0.45;z-index:399;pointer-events:none;transition:none;will-change:opacity;';
      document.body.appendChild(scrimG);
      t._scrim = scrimG;

      void t.fg.clientWidth;

    } else {
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      if (t.type === 'B') t.fg.style.boxShadow = '-6px 0 24px rgba(0,0,0,.32)';
    }
  }

  // ── Apply drag (called via rAF) ──────────────────────────────────────────────

  function _dragMove(t, dx) {
    if (!t.started) return;
    // No redundant transition='none' write — already set at drag start, never reset
    t.fg.style.transform = 'translate3d(' + dx + 'px,0,0)';

    var p = Math.min(1, Math.max(0, dx / t.W));

    if (t._scrim) {
      t._scrim.style.opacity = (SCRIM_MAX * (1 - p)).toFixed(3);
    }

    // Drive bg depth: scales from 0.94→1.0, fades 0.75→1.0 proportional to drag
    // Blur stays at 2px during drag — only transitions on commit/cancel
    var bgEl = t.bg || t._destEl;
    if (bgEl) {
      bgEl.style.transform = 'scale(' + (0.94 + p * 0.06).toFixed(4) + ') translateZ(0)';
      bgEl.style.opacity   = (0.75 + p * 0.25).toFixed(3);
    }
  }

  // ── Commit ───────────────────────────────────────────────────────────────────

  function _commit(t) {
    _busy = true;
    _cancelRaf();

    if (!t.started) {
      try {
        if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      } catch (_e) {}
      _busy = false;
      return;
    }

    // Tablet: panels are non-overlaying — skip animation
    if (_isTablet() && (t.fg.id === 'quranReader' || t.fg.id === 'ivSeriesView' || t.fg.id === 'gencineContent')) {
      _clearFg(t, false);
      try {
        if (window.App && typeof App.doBack === 'function') App.doBack({ allowExit: false });
      } catch (_e) {}
      _busy = false;
      return;
    }

    var ease     = 'cubic-bezier(0.22,1,0.36,1)';
    var progress = Math.min(1, t.dx / t.W);
    var durMs    = Math.round(Math.max(180, ANIM_MS * (1 - progress * 0.50)));
    var dur      = durMs + 'ms ' + ease;

    t.fg.style.transition = 'transform ' + dur;
    t.fg.style.transform  = 'translate3d(' + t.W + 'px,0,0)';

    if (t._scrim) {
      t._scrim.style.transition = 'opacity ' + dur;
      t._scrim.style.opacity    = '0';
    }

    // bg comes forward: scale to 1.0, full opacity, blur dissolves to 0
    var bgEl = t.bg || t._destEl;
    if (bgEl) {
      bgEl.style.transition = 'transform ' + dur + ', opacity ' + dur + ', filter ' + dur;
      bgEl.style.transform  = 'scale(1) translateZ(0)';
      bgEl.style.opacity    = '1';
      bgEl.style.filter     = 'blur(0px)';
    }

    setTimeout(function () {
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
    _busy = true;
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
      t._scrim.style.opacity    = String(SCRIM_MAX);
    }

    // bg recedes back: scale + opacity return to start; blur stays at 2px
    var bgEl = t.bg || t._destEl;
    if (bgEl) {
      bgEl.style.transition = 'transform ' + dur + ', opacity ' + dur;
      bgEl.style.transform  = 'scale(0.94) translateZ(0)';
      bgEl.style.opacity    = '0.75';
    }

    _cancelTid = setTimeout(function () {
      _cancelTid = null;
      _clearFg(t, true);
      _busy = false;
    }, CANCEL_MS + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────
  // restoreBg: true on cancel (undo reveal), false on commit (App.doBack handles state)

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

      // Clear bg depth styles; on cancel, also re-hide it
      if (t.bg) {
        var bs = t.bg.style;
        bs.willChange = ''; bs.transformOrigin = ''; bs.transform = '';
        bs.opacity = ''; bs.filter = ''; bs.transition = '';
        if (restoreBg) bs.display = 'none';
      }

      if (t._scrim) {
        if (t._scrim.parentNode) t._scrim.parentNode.removeChild(t._scrim);
        t._scrim = null;
      }

    } else if (t.type === 'AG' || t.type === 'G+') {
      s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = ''; s.zIndex = '';

      // Reinsert fg before destEl (its saved sibling) — puts fg back at original position
      if (t._fgParent) {
        if (t._fgSibling && t._fgSibling.parentElement === t._fgParent) {
          t._fgParent.insertBefore(t.fg, t._fgSibling);
        } else {
          t._fgParent.appendChild(t.fg);
        }
      }

      // Remove the destination layer — DOM removal clears it, no need to clear styles
      if (t._destEl) {
        if (t._destEl.parentNode) t._destEl.parentNode.removeChild(t._destEl);
        t._destEl = null;
      }

      // On cancel: restore scroll position the user was at before the gesture
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

    if (adx < DEAD_PX && ady < DEAD_PX) return;

    if (dx < -DEAD_PX) {
      document.removeEventListener('touchmove', _onDetect);
      g = null;
      return;
    }

    if (ady > VERT_LOCK_PX && ady > adx) {
      document.removeEventListener('touchmove', _onDetect);
      g = null;
      return;
    }

    if (dx > LOCK_PX && dx > ady * HORIZ_RATIO) {
      document.removeEventListener('touchmove', _onDetect);
      _lockHorizontal();
      return;
    }
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
  }, { passive: true });

})();
