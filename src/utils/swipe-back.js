/**
 * swipe-back.js v14 — native iOS-style swipe-to-go-back
 *
 * Every deep screen becomes one fixed full-screen layer:
 *   fg body-appended as position:fixed; top:var(--safe-t); z-index:400
 *   Escapes contain:paint clipping on .panel parents — no split-page effect.
 *   Full page (header + content + buttons) slides as one complete sheet.
 *
 * Types:
 *   page    — quranReader, ivSeriesView: body-append; bg naturally revealed in DOM
 *   gencine — panelGencine: body-append; pre-rendered destEl at z-index:399
 *   overlay — profilePanel etc.: already position:fixed; blocker covers background
 *
 * Gesture detection: two-phase
 *   Phase 1 (_onDetect, passive:true)  — pure observation; never blocks scroll
 *   Phase 2 (_onActive, passive:false) — rAF-batched translate3d; preventDefault only here
 *
 * 1:1 finger tracking during drag via rAF. No easing, smoothing, or delay.
 * After release: commit 280ms cubic-bezier(.2,0,.2,1)
 *              / cancel 290ms cubic-bezier(.22,1,.36,1)
 * No blur, scale, opacity change, parallax, or dim on any element.
 *
 * window._sbLocked: true from _dragStart to _clearFg.
 * App.tab checks this to block tab switching only during active gesture/animation.
 * No deferred-release timers — cleared immediately on animation completion.
 *
 * Blocker (z-index:350): transparent fixed div; prevents background taps and scrolls.
 * body.sb-reveal: forces content-visibility:visible on destination cards.
 */
(function () {
  'use strict';

  // ── Tuning ───────────────────────────────────────────────────────────────────
  var EDGE_PX      = 32;    // left-edge trigger zone (px)
  var DEAD_PX      = 6;     // no decision until one axis exceeds this
  var LOCK_PX      = 10;    // horizontal travel needed to claim gesture
  var VERT_LOCK_PX = 8;     // vertical travel that releases immediately to scroll
  var HORIZ_RATIO  = 1.4;   // horizontal must exceed |dy| by this factor to lock
  var DIST_OK      = 80;    // commit if drag distance ≥ this (px)
  var VEL_OK       = 0.35;  // commit if velocity ≥ this (px/ms)
  var ANIM_MS      = 280;   // max commit animation ms (adaptive: shorter if mostly dragged)
  var CANCEL_MS    = 290;   // cancel snap-back ms

  // ── State ────────────────────────────────────────────────────────────────────
  var _busy      = false;
  var _gid       = 0;       // generation counter — invalidates stale timer closures
  var _cancelTid = null;
  var _blocker   = null;

  // ── rAF scheduling ───────────────────────────────────────────────────────────
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

  // ── Blocker ──────────────────────────────────────────────────────────────────
  // Transparent fixed overlay below fg (z-400) that blocks all background interaction.

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

  // ── Gencine destination element ───────────────────────────────────────────────
  // Full-fidelity visual replica of panelGencine in destination state.
  // Sits at z-index:399 behind fg (z-400). pointer-events:none — visual only.

  function _buildGencineDestEl(pg) {
    // 1. Render destination content — _renderDestInto uses try/finally to restore state
    var destContent = document.createElement('div');
    destContent.style.cssText = 'flex:1;overflow:hidden;min-height:0;';
    if (window.GencineUI && typeof GencineUI._renderDestInto === 'function') {
      GencineUI._renderDestInto(destContent);
    }

    // 2. Compute destination view state (mirrors goHome() logic)
    var sv = GencineUI._view, si = GencineUI._hadithDetailIdx, sa = GencineUI._adhkarView;
    var dv = sv, di = si, da = sa;
    if      (sv === 'book-reader')             { dv = 'books'; }
    else if (sv === 'hadith' && si !== null)   { di = null;    }
    else if (sv === 'adhkar' && sa === 'list') { da = 'grid';  }
    else                                       { dv = 'home';  }

    // 3. Temporarily set destination state on GencineUI so _updateHeader applies
    //    the correct button visibility, then clone the header (IDs/onclicks removed
    //    to avoid duplicate-ID and stale-handler issues).
    var destHdr = null;
    try {
      GencineUI._view            = dv;
      GencineUI._hadithDetailIdx = di;
      GencineUI._adhkarView      = da;
      if (typeof GencineUI._updateHeader === 'function') GencineUI._updateHeader();
      var realHdr = pg.querySelector('.hdr');
      if (realHdr) {
        destHdr = realHdr.cloneNode(true);
        var idOrClick = destHdr.querySelectorAll('[id],[onclick]');
        for (var k = 0; k < idOrClick.length; k++) {
          idOrClick[k].removeAttribute('id');
          idOrClick[k].removeAttribute('onclick');
        }
      }
    } finally {
      // Always restore — even if cloneNode throws
      GencineUI._view            = sv;
      GencineUI._hadithDetailIdx = si;
      GencineUI._adhkarView      = sa;
      if (typeof GencineUI._updateHeader === 'function') GencineUI._updateHeader();
    }

    // 4. Assemble and append to body
    var destEl = document.createElement('section');
    destEl.className = 'panel on';
    destEl.style.cssText = 'position:fixed;top:var(--safe-t);left:0;right:0;bottom:0;z-index:399;pointer-events:none;';
    if (destHdr) destEl.appendChild(destHdr);
    destEl.appendChild(destContent);
    document.body.appendChild(destEl);
    return destEl;
  }

  // ── Target resolution ─────────────────────────────────────────────────────────

  function _getTarget() {
    var W = window.innerWidth;

    // Fixed overlays — already position:fixed; app background naturally visible behind
    var overlayIds = ['profilePanel', 'prayerProgressPanel', 'authPanel'];
    for (var i = 0; i < overlayIds.length; i++) {
      var ov = document.getElementById(overlayIds[i]);
      if (ov && ov.classList.contains('on')) {
        return { type: 'overlay', fg: ov, W: W, dx: 0 };
      }
    }

    // IslamVoice series — ivSeriesView contains iv-series-hdr + player + episode list
    var iv = document.getElementById('ivSeriesView');
    if (iv && iv.classList.contains('on')) {
      return { type: 'page', fg: iv, W: W, dx: 0 };
    }

    // Quran reader — quranReader contains reader-hdr + sticky-progress + ayahList
    var qr = document.getElementById('quranReader');
    if (qr && qr.classList.contains('on')) {
      return { type: 'page', fg: qr, W: W, dx: 0 };
    }

    // Gencine sub-views — slide full panelGencine; destEl pre-rendered as destination
    if (window.GencineUI && window.S && S.tab === 'gencine' && GencineUI._view !== 'home') {
      var gp = document.getElementById('panelGencine');
      if (gp) return { type: 'gencine', fg: gp, W: W, dx: 0 };
    }

    return null;
  }

  // ── Drag start ───────────────────────────────────────────────────────────────

  function _dragStart(t) {
    t.started        = true;
    window._sbLocked = true;
    document.body.classList.add('sb-reveal');

    if (t.type === 'page') {
      // Body-append as fixed — escapes contain:paint; full page becomes one sheet
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
      t.fg.style.transform  = 'translate3d(0,0,0)';
      _createBlocker();

    } else if (t.type === 'gencine') {
      // Body-append entire panelGencine; destEl already appended at z-399
      t._fgParent  = t.fg.parentElement;
      t._fgSibling = t.fg.nextSibling;
      t._destEl    = _buildGencineDestEl(t.fg);
      if (t._fgParent) document.body.appendChild(t.fg);
      t.fg.style.position   = 'fixed';
      t.fg.style.top        = 'var(--safe-t)';
      t.fg.style.left       = '0';
      t.fg.style.right      = '0';
      t.fg.style.bottom     = '0';
      t.fg.style.zIndex     = '400';
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      t.fg.style.transform  = 'translate3d(0,0,0)';

    } else if (t.type === 'overlay') {
      t.fg.style.willChange = 'transform';
      t.fg.style.transition = 'none';
      t.fg.style.transform  = 'translate3d(0,0,0)';
      _createBlocker();
    }

    void t.fg.clientWidth;  // force layout before first animation frame
  }

  // ── Drag move (via rAF) ── pure transform write; no layout reads ──────────────

  function _dragMove(t, dx) {
    if (!t.started) return;
    t.fg.style.transform = 'translate3d(' + dx + 'px,0,0)';
  }

  // ── Commit ───────────────────────────────────────────────────────────────────

  function _commit(t) {
    _busy = true;
    _cancelRaf();
    var capturedId = _gid;

    // Tablet: skip slide animation; just update state
    if (_isTablet() && t.type !== 'overlay') {
      _clearFg(t, false);
      try { if (window.App) App.doBack({ allowExit: false }); } catch (_e) {}
      _busy = false;
      return;
    }

    var ease  = 'cubic-bezier(.2,0,.2,1)';
    var prog  = Math.min(1, (t.dx || 0) / t.W);
    var durMs = Math.max(160, Math.round(ANIM_MS * (1 - prog * 0.5)));

    t.fg.style.transition = 'transform ' + durMs + 'ms ' + ease;
    t.fg.style.transform  = 'translate3d(' + t.W + 'px,0,0)';

    setTimeout(function () {
      if (_gid !== capturedId) { _removeBlocker(); _busy = false; return; }
      // Update app state while fg is off-screen (no visible change)
      try { if (window.App) App.doBack({ allowExit: false }); } catch (_e) {}
      requestAnimationFrame(function () {
        if (_gid !== capturedId) { _removeBlocker(); _busy = false; return; }
        _clearFg(t, false);
        _busy = false;
      });
    }, durMs + 16);
  }

  // ── Cancel (snap back) ───────────────────────────────────────────────────────

  function _cancel(t) {
    if (!t || !t.started) {
      _releaseLock();
      _busy = false;
      return;
    }
    _busy = true;
    if (_cancelTid) { clearTimeout(_cancelTid); _cancelTid = null; }
    _cancelRaf();
    var capturedId = _gid;

    t.fg.style.transition = 'transform ' + CANCEL_MS + 'ms cubic-bezier(.22,1,.36,1)';
    t.fg.style.transform  = 'translate3d(0,0,0)';

    _cancelTid = setTimeout(function () {
      _cancelTid = null;
      if (_gid !== capturedId) { _removeBlocker(); _busy = false; return; }
      _clearFg(t, true);
      _busy = false;
    }, CANCEL_MS + 16);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────
  // isCancelled:true  → fg returns to original state; no app state change
  // isCancelled:false → fg returns after App.doBack() has already updated state

  function _clearFg(t, isCancelled) {
    var s = t.fg.style;
    s.transform  = '';
    s.willChange = '';
    s.transition = '';

    if (t.type === 'page') {
      s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = ''; s.zIndex = '';
      _reinsert(t);
      _removeBlocker();

    } else if (t.type === 'gencine') {
      s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = ''; s.zIndex = '';
      _reinsert(t);
      if (t._destEl) {
        if (t._destEl.parentNode) t._destEl.parentNode.removeChild(t._destEl);
        t._destEl = null;
      }
      // _renderBooks (called by _renderDestInto) writes inline styles to the real header
      // buttons as a side effect. On cancel, re-sync header to current GencineUI state.
      if (isCancelled && window.GencineUI && typeof GencineUI._updateHeader === 'function') {
        GencineUI._updateHeader();
      }

    } else if (t.type === 'overlay') {
      _removeBlocker();
    }

    _releaseLock();
  }

  function _releaseLock() {
    document.body.classList.remove('sb-reveal');
    window._sbLocked = false;
  }

  function _reinsert(t) {
    if (!t._fgParent) return;
    if (t._fgSibling && t._fgSibling.parentElement === t._fgParent) {
      t._fgParent.insertBefore(t.fg, t._fgSibling);
    } else {
      t._fgParent.appendChild(t.fg);
    }
  }

  // ── Gesture state ─────────────────────────────────────────────────────────────
  var g = null;

  function _lockHorizontal() {
    g.locked = 'h';
    if (g.target) _dragStart(g.target);
    document.addEventListener('touchmove', _onActive, { passive: false });
  }

  // Phase 1 — passive: pure observation, never blocks scroll
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

  // Phase 2 — active: rAF-batched, calls preventDefault
  function _onActive(e) {
    if (!g || g.locked !== 'h') return;

    // Second finger: abort cleanly — no doBack, no tab switch
    if (e.touches.length > 1) {
      document.removeEventListener('touchmove', _onActive);
      _cancelRaf();
      var tgt = g.target;
      g = null;
      if (tgt && tgt.started) { _cancel(tgt); }
      else                    { _releaseLock(); _busy = false; }
      return;
    }

    var dx = e.touches[0].clientX - g.x0;
    g.dx = dx > 0 ? dx : 0;

    if (g.target) {
      g.target.dx = g.dx;  // keep target.dx current for commit duration calc
      _rafDx      = g.dx;
      _rafTarget  = g.target;
      _scheduleRender();
    }

    e.preventDefault();
  }

  // ── Touch event listeners ─────────────────────────────────────────────────────

  document.addEventListener('touchstart', function (e) {
    g = null;
    if (e.touches.length !== 1) return;
    if (_busy) return;
    if (window._tabAnimating) return;
    var t = e.touches[0];
    if (t.clientX > EDGE_PX) return;
    if (_shouldBlock(e.target)) return;
    if (!window.App || typeof App.hasBack !== 'function') return;
    if (!App.hasBack()) return;

    _gid++;
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
    _cancelRaf();
    if (!g || g.locked !== 'h') { g = null; return; }

    var elapsed = Date.now() - g.t0;
    var vel     = elapsed > 0 ? g.dx / elapsed : 0;
    var commit  = g.dx >= DIST_OK || vel >= VEL_OK;
    var tgt     = g.target;
    g = null;

    if (tgt) {
      if (commit) _commit(tgt); else _cancel(tgt);
    } else if (commit) {
      // No visual target — instant dismiss (modal without slide animation)
      try { if (window.App) App.doBack({ allowExit: false }); } catch (_e) {}
      _releaseLock();
    } else {
      _releaseLock();
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    document.removeEventListener('touchmove', _onDetect);
    document.removeEventListener('touchmove', _onActive);
    _cancelRaf();
    // Only touch gesture state — do NOT touch _busy if no gesture was active
    // (a commit animation may be running; interfering would corrupt cleanup)
    if (!g) return;
    var tgt       = g.target;
    var wasLocked = g.locked === 'h';
    g = null;
    if (wasLocked) {
      if (tgt && tgt.started) { _cancel(tgt); }
      else                    { _releaseLock(); _busy = false; }
    }
  }, { passive: true });

})();
