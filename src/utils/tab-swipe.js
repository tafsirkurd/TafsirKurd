/**
 * tab-swipe.js v16 — native-feel root tab swipe navigation
 *
 * Two-phase gesture detection:
 *   Phase 1 (_onDetect, passive:true): pure observation — never blocks scroll.
 *     Vertical dominance (|dy|>VERT_LOCK_PX && dy>dx) releases immediately.
 *     Horizontal lock requires |dx|>LOCK_PX && |dx|>|dy|*HORIZ_RATIO.
 *   Phase 2 (_onActive, passive:false): rAF-batched translate3d, preventDefault.
 *
 * Both panels tile exactly side-by-side during drag (no overlap, no gap).
 * Swipe accessible from any vertical position on screen — no zone restriction.
 * Multi-touch during drag cancels safely (no stuck panels).
 *
 * Adaptive durations:
 *   Commit: 110–270ms depending on how far user dragged and flick velocity.
 *   Cancel: 100–190ms depending on how far user dragged (shorter = barely moved).
 *
 * RTL-aware: html[dir=rtl] → swipe right = higher index.
 *
 * v16 over v15:
 *   - Live pill color fill: source icon pill fades out, target fills in as you drag
 *   - Live font-weight interpolation on tab labels (700 ↔ 500 smoothly)
 *   - Velocity-carry easing: CSS linear() with exponential deceleration matched to
 *     release speed; falls back to cubic-bezier on older engines
 *   - Interruptible commits: new swipe during commit snaps previous animation instantly
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
  var EDGE_EXCLUDE     = 20;    // px — small exclusion so stray left-edge taps don't trigger
  var DEAD_PX          = 6;     // px — no decision below this in either axis
  var LOCK_PX          = 12;    // px horizontal travel needed to claim the gesture
  var VERT_LOCK_PX     = 10;    // px vertical travel that immediately releases control to scroll
  var HORIZ_RATIO      = 1.35;  // horizontal must be this much stronger than vertical
  var DIST_COMMIT_FRAC = 0.25;  // complete if |dx| > this fraction of screen width
  var VEL_OK           = 0.55;  // px/ms fast-flick commit threshold
  var ANIM_MS          = 270;   // max commit duration (adaptive: shorter if mostly dragged)
  var CANCEL_MS        = 190;   // max cancel snap-back duration (adaptive: shorter if barely moved)
  var SCROLL_SETTLE_MS = 150;   // ms after last scroll event before gestures re-enable
  var EDGE_RESISTANCE  = 0.18;  // rubber-band damping at first/last tab

  var _isRTL = document.documentElement.dir === 'rtl';

  // ── CSS linear() easing support ──────────────────────────────────────────────
  var _supportsLinear = (function () {
    try { return CSS.supports('transition-timing-function', 'linear(0,1)'); } catch (_e) { return false; }
  })();

  // Generates an exponential-deceleration easing matched to finger release velocity.
  // v0 (px/ms) × durMs / remaining gives how many "remaining distances" per animation
  // the finger was travelling — that ratio drives the deceleration curve steepness.
  function _velocityEasing(vel, remaining, durMs) {
    if (!_supportsLinear || !vel || remaining <= 0 || durMs <= 0) {
      return 'cubic-bezier(0.22,1,0.36,1)';
    }
    var ratio = vel * durMs / remaining;
    if (ratio < 1.5) return 'cubic-bezier(0.22,1,0.36,1)';
    var k     = Math.min((ratio - 1) * 1.5, 8);
    var denom = 1 - Math.exp(-k);
    if (denom < 1e-9) return 'cubic-bezier(0.22,1,0.36,1)';
    var N = 14, pts = ['0'];
    for (var i = 1; i <= N; i++) {
      var f = (1 - Math.exp(-k * (i / N))) / denom;
      pts.push(+(Math.min(1, f).toFixed(4)));
    }
    return 'linear(' + pts.join(',') + ')';
  }

  // ── Color helpers ─────────────────────────────────────────────────────────────
  function _parseRgb(css) {
    var m = css.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function _parseHex(hex) {
    hex = hex.replace(/^\s*#/, '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length !== 6) return null;
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
  }
  // Reads the computed accent pill color from the active tab icon, caches per icon.
  function _readAccentRgb(activeIcon) {
    if (!activeIcon) return null;
    var bg  = window.getComputedStyle(activeIcon).backgroundColor;
    var rgb = _parseRgb(bg);
    if (rgb && (rgb[0] + rgb[1] + rgb[2]) > 30) return rgb;
    var acc = window.getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return _parseRgb(acc) || _parseHex(acc);
  }

  // ── Icon spring bounce ────────────────────────────────────────────────────────
  // Called on both swipe-commit and direct tap. Pre-sets icon to scale(1.25) then
  // spring-animates it back to scale(1.06) (.on CSS value) with overshoot, matching
  // native iOS tab bar behaviour. Exposed globally so App.tab() can call it on tap.
  function _springTabIcon(tabName) {
    var item = document.querySelector('.tab-item[data-tab="' + tabName + '"]');
    if (!item) return;
    var ico = item.querySelector('i');
    if (!ico) return;
    ico.style.transition = 'none';
    ico.style.transform  = 'scale(1.25)';
    requestAnimationFrame(function () {
      ico.style.transition = 'transform 320ms cubic-bezier(0.34,1.56,0.64,1)';
      ico.style.transform  = '';  // → let .tab-item.on i {transform:scale(1.06)} take over
      setTimeout(function () { ico.style.transition = ''; }, 320);
    });
  }
  window._tsSpringTabIcon = _springTabIcon;

  // ── Scroll activity tracking ─────────────────────────────────────────────────
  var _lastScrollMs = 0;
  document.addEventListener('scroll', function () {
    _lastScrollMs = Date.now();
  }, { passive: true, capture: true });

  window._tkIsScrolling = function () {
    return _lastScrollMs > 0 && (Date.now() - _lastScrollMs) < SCROLL_SETTLE_MS;
  };

  // ── Animation lock ───────────────────────────────────────────────────────────
  var _busy            = false;
  var _cancelTid       = null;  // pending cancel timeout
  var _commitTid       = null;  // pending commit cleanup timeout
  var _inFlightCommit  = null;  // target object of in-flight commit (for interrupt)

  // ── Horizontal scroll / carousel detection ───────────────────────────────────
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
      node = node.parentElement;
    }
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
    cs.zIndex        = '99';  // cur stays on top — tgt slides in beneath, not over
    cs.willChange    = 'transform';
    cs.transition    = 'none';
    cs.transform     = 'translate3d(0,0,0)';
    cs.boxShadow     = (t.dir === 'left') ? '8px 0 28px rgba(0,0,0,0.13)' : '-8px 0 28px rgba(0,0,0,0.13)';

    var ts = t.tgt.style;
    ts.position         = 'fixed';
    ts.top              = 'var(--safe-t)';
    ts.left             = '0';
    ts.right            = '0';
    ts.bottom           = '0';
    ts.display          = 'flex';
    ts.flexDirection    = 'column';
    ts.zIndex           = '98';  // tgt below cur, revealed as cur peels away
    ts.willChange        = 'transform';
    ts.transition        = 'none';
    ts.transform         = 'translate3d(' + targetStart + 'px,0,0)';
    ts.contentVisibility = 'visible';
    ts.visibility        = 'visible';

    // Kill CSS transitions on icon/span so _dragMove can drive them frame-by-frame
    if (t._curTabIcon) t._curTabIcon.style.transition = 'none';
    if (t._tgtTabIcon) t._tgtTabIcon.style.transition = 'none';
    if (t._curTabSpan) t._curTabSpan.style.transition = 'none';
    if (t._tgtTabSpan) t._tgtTabSpan.style.transition = 'none';

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

  // ── 1:1 finger tracking + live tab bar animation ─────────────────────────────
  function _dragMove(t, dx) {
    if (!t.started) return;
    t.cur.style.transform = 'translate3d(' + dx + 'px,0,0)';
    if (t.tgt) {
      t.tgt.style.transform = 'translate3d(' + (_targetStart(t.dir, t.W) + dx) + 'px,0,0)';

      var p   = Math.min(1, Math.abs(dx) / t.W);
      var rgb = t._accentRgbStr;

      // Source tab: dims overall + pill fades out
      if (t._curTabItem) t._curTabItem.style.opacity = (1 - p * 0.35).toFixed(3);
      if (t._curTabIcon && rgb) t._curTabIcon.style.background = 'rgba(' + rgb + ',' + (1 - p).toFixed(3) + ')';
      if (t._curTabSpan) t._curTabSpan.style.fontWeight = Math.round(700 - p * 200);

      // Target tab: pill fills in + label weight rises
      if (t._tgtTabIcon && rgb) t._tgtTabIcon.style.background = 'rgba(' + rgb + ',' + p.toFixed(3) + ')';
      if (t._tgtTabSpan) t._tgtTabSpan.style.fontWeight = Math.round(500 + p * 200);
    }
  }

  // ── Snap tab bar to final committed state ────────────────────────────────────
  // Swaps .on on the tab bar BUTTONS (not panel elements) so CSS drives the pill
  // reliably — no rgba parsing, no null-color risk. Clears all drag inline overrides.
  // Called at commit start so the tab bar leads the panel animation.
  function _snapIconsToFinal(t) {
    if (t._curTabItem) {
      t._curTabItem.classList.remove('on');
      t._curTabItem.setAttribute('aria-selected', 'false');
      t._curTabItem.style.opacity = '';
    }
    if (t._tgtTabItem) {
      t._tgtTabItem.classList.add('on');
      t._tgtTabItem.setAttribute('aria-selected', 'true');
      t._tgtTabItem.style.opacity = '';
    }
    // Clear inline icon/span overrides — CSS (.on state) takes over immediately
    if (t._curTabIcon) { t._curTabIcon.style.transition = ''; t._curTabIcon.style.background = ''; }
    if (t._tgtTabIcon) { t._tgtTabIcon.style.transition = ''; t._tgtTabIcon.style.background = ''; }
    if (t._curTabSpan) { t._curTabSpan.style.transition = ''; t._curTabSpan.style.fontWeight  = ''; }
    if (t._tgtTabSpan) { t._tgtTabSpan.style.transition = ''; t._tgtTabSpan.style.fontWeight  = ''; }
  }

  // ── Restore CSS transitions after App.tab() has set the correct .on class ───
  function _clearDragOverrides(t) {
    if (t._curTabItem) t._curTabItem.style.opacity = '';
    if (t._tgtTabItem) t._tgtTabItem.style.opacity = '';
    if (t._curTabIcon) { t._curTabIcon.style.transition = ''; t._curTabIcon.style.background = ''; }
    if (t._tgtTabIcon) { t._tgtTabIcon.style.transition = ''; t._tgtTabIcon.style.background = ''; }
    if (t._curTabSpan) { t._curTabSpan.style.transition = ''; t._curTabSpan.style.fontWeight  = ''; }
    if (t._tgtTabSpan) { t._tgtTabSpan.style.transition = ''; t._tgtTabSpan.style.fontWeight  = ''; }
  }

  // ── Commit ───────────────────────────────────────────────────────────────────
  function _commit(t) {
    _busy = true;
    if (_commitTid) { clearTimeout(_commitTid); _commitTid = null; }
    _cancelRaf();
    if (window.H && typeof H.light === 'function') H.light();

    var W         = t.W || window.innerWidth;
    var vel       = t._vel || 0;
    var progress  = Math.min(1, Math.abs(t.dx) / W);
    var durMs     = Math.max(vel > 1.2 ? 110 : 150, Math.round(ANIM_MS * (1 - progress * 0.5)));
    var remaining = Math.max(1, W - Math.abs(t.dx));
    var ease      = _velocityEasing(vel, remaining, durMs);
    var dur       = durMs + 'ms ' + ease;
    var curFinal  = (t.dir === 'left') ? -W : W;

    t._curFinal       = curFinal;
    _inFlightCommit   = t;

    t.cur.style.transition = 'transform ' + dur;
    t.cur.style.transform  = 'translate3d(' + curFinal + 'px,0,0)';
    t.tgt.style.transition = 'transform ' + dur;
    t.tgt.style.transform  = 'translate3d(0,0,0)';

    // Snap tab bar icons/labels to final state immediately — tab bar leads the
    // panel animation (new tab looks active, old tab looks inactive) for the full
    // commit duration. CSS transitions restored only after App.tab() fires.
    _snapIconsToFinal(t);

    _commitTid = setTimeout(function () {
      _commitTid      = null;
      _inFlightCommit = null;
      // Clear any ongoing CSS icon/span transitions BEFORE spring fires —
      // otherwise _clearDragOverrides would override spring's transition:'none'
      // and a competing CSS scale transition would corrupt the bounce.
      _clearDragOverrides(t);
      _springTabIcon(t.tabName);
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
    _busy = true;
    if (_cancelTid) { clearTimeout(_cancelTid); _cancelTid = null; }
    _cancelRaf();

    if (!t || !t.started) {
      document.body.classList.remove('ts-dragging');
      _busy = false;
      return;
    }

    // Release overrides immediately so CSS transitions animate the icons back
    _clearDragOverrides(t);

    var ease = 'cubic-bezier(0.22,1,0.36,1)';
    var W    = t.W || window.innerWidth;
    var cancelProgress = Math.min(1, Math.abs(t.dx) / W);
    var cancelMs       = Math.round(100 + (CANCEL_MS - 100) * cancelProgress);

    if (!t.tgt) {
      t.cur.style.transition = 'transform ' + cancelMs + 'ms ' + ease;
      t.cur.style.transform  = 'translate3d(0,0,0)';
      _cancelTid = setTimeout(function () {
        _cancelTid = null;
        var s = t.cur.style;
        s.willChange = ''; s.transition = ''; s.transform = '';
        document.body.classList.remove('ts-dragging');
        _busy = false;
      }, cancelMs + 16);
      return;
    }

    var tgtFinal = _targetStart(t.dir, W);
    var dur      = cancelMs + 'ms ' + ease;

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
    }, cancelMs + 16);
  }

  // ── Style cleanup ────────────────────────────────────────────────────────────
  function _clearCur(t) {
    var s = t.cur.style;
    s.position = ''; s.top = ''; s.left = ''; s.right = ''; s.bottom = '';
    s.display = ''; s.flexDirection = ''; s.zIndex = '';
    s.transition = ''; s.transform = ''; s.willChange = ''; s.opacity = '';
    s.boxShadow = '';
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

  function _lockHorizontal(dx) {
    var W   = window.innerWidth;
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
      g.target = { cur: curPanel, tgt: null, tabName: null, dir: dir, started: false, dx: dx * EDGE_RESISTANCE, W: W };
      _edgeStart(g.target);
    } else {
      var tgtPanel    = document.getElementById(PANEL_IDS[TAB_ORDER[targetIdx]]);
      if (!tgtPanel) { g = null; return; }
      var tabName     = TAB_ORDER[targetIdx];
      var curTabItem  = document.querySelector('.tab-item[data-tab="' + TAB_ORDER[idx] + '"]');
      var tgtTabItem  = document.querySelector('.tab-item[data-tab="' + tabName + '"]');
      var curTabIcon  = curTabItem ? curTabItem.querySelector('i')    : null;
      var tgtTabIcon  = tgtTabItem ? tgtTabItem.querySelector('i')    : null;
      var curTabSpan  = curTabItem ? curTabItem.querySelector('span') : null;
      var tgtTabSpan  = tgtTabItem ? tgtTabItem.querySelector('span') : null;

      // Read computed accent color from the active icon (has var(--accent) resolved)
      var accentRgb    = _readAccentRgb(curTabIcon);
      var accentRgbStr = accentRgb ? (accentRgb[0] + ',' + accentRgb[1] + ',' + accentRgb[2]) : null;

      g.target = {
        cur:          curPanel,
        tgt:          tgtPanel,
        tabName:      tabName,
        dir:          dir,
        started:      false,
        dx:           dx,
        W:            W,
        _curTabItem:  curTabItem,
        _tgtTabItem:  tgtTabItem,
        _curTabIcon:  curTabIcon,
        _tgtTabIcon:  tgtTabIcon,
        _curTabSpan:  curTabSpan,
        _tgtTabSpan:  tgtTabSpan,
        _accentRgbStr: accentRgbStr,
      };
      _gestureStart(g.target);
    }

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

    if (ady > VERT_LOCK_PX && ady > adx) {
      document.removeEventListener('touchmove', _onDetect);
      g = null;
      return;
    }

    if (adx > LOCK_PX && adx > ady * HORIZ_RATIO) {
      document.removeEventListener('touchmove', _onDetect);
      _lockHorizontal(dx);
      return;
    }
  }

  // Phase 2 — active tracking: rAF-batched, calls preventDefault
  function _onActive(e) {
    if (!g || g.locked !== 'h') return;

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
      g.dx = dx * EDGE_RESISTANCE;
    } else {
      if (g.dir === 'left') g.dx = Math.min(dx, 0);
      else                  g.dx = Math.max(dx, 0);
    }

    g.target.dx = g.dx;
    _rafDx      = g.dx;
    _rafTarget  = g.target;
    _scheduleRender();

    var now = Date.now();
    g._moves.push({ t: now, dx: g.dx });
    while (g._moves.length > 1 && now - g._moves[0].t > 100) g._moves.shift();

    // Only call preventDefault when the browser hasn't already committed to scroll.
    // If cancelable=false the browser ignores it anyway — skip to silence the warning.
    // The swipe animation still works because panels have no horizontal scroll content.
    if (e.cancelable) e.preventDefault();
  }

  document.addEventListener('touchstart', function (e) {
    // ── Interrupt in-flight commit ───────────────────────────────────────────
    // If a commit animation is playing and the user starts a new swipe, snap the
    // old animation to its final position and let the new gesture start cleanly.
    if (_busy && _inFlightCommit) {
      var ifc = _inFlightCommit;
      _inFlightCommit = null;
      if (_commitTid) { clearTimeout(_commitTid); _commitTid = null; }
      // Snap panels to final positions
      ifc.cur.style.transition = 'none';
      ifc.cur.style.transform  = 'translate3d(' + ifc._curFinal + 'px,0,0)';
      ifc.tgt.style.transition = 'none';
      ifc.tgt.style.transform  = 'translate3d(0,0,0)';
      // Fix icon/label state before App.tab() moves .on — same as normal commit path
      _snapIconsToFinal(ifc);
      try {
        if (window.App && typeof App.tab === 'function') App.tab(ifc.tabName);
      } catch (_e) {}
      // Restore CSS transitions now .on is on the correct tab item
      _clearDragOverrides(ifc);
      void ifc.cur.clientWidth;  // force layout before clearing inline panel styles
      _clearCur(ifc);
      _clearTgt(ifc);
      document.body.classList.remove('ts-dragging');
      _busy = false;
      // fall through — allow the new gesture to start below
    }

    // Second finger while gesture is locked: cancel before clearing g
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
    if (_shouldBlock(e.target)) return;
    if (_currentIdx() === -1) return;

    g = {
      x0:     t.clientX,
      y0:     t.clientY,
      t0:     Date.now(),
      dx:     0,
      locked: null,
      dir:    null,
      target: null,
      _moves: [],
    };
    document.addEventListener('touchmove', _onDetect, { passive: true });
  }, { passive: true });

  document.addEventListener('touchend', function () {
    document.removeEventListener('touchmove', _onDetect);
    document.removeEventListener('touchmove', _onActive);
    if (!g) return;
    if (g.locked !== 'h') { g = null; return; }

    var absDx  = Math.abs(g.dx);
    var W      = (g.target && g.target.W) || window.innerWidth;
    var vel = 0;
    var moves = g._moves;
    if (moves.length >= 2) {
      var mFirst = moves[0], mLast = moves[moves.length - 1];
      var mDt = mLast.t - mFirst.t;
      if (mDt > 0) vel = Math.abs(mLast.dx - mFirst.dx) / mDt;
    } else {
      var elapsed = Date.now() - g.t0;
      if (elapsed > 0) vel = absDx / elapsed;
    }
    var commit  = !!(g.target && g.target.tgt) && (absDx >= Math.min(W * DIST_COMMIT_FRAC, 120) || vel >= VEL_OK);
    var tgt     = g.target;
    g = null;

    if (!tgt) return;
    if (commit) { tgt._vel = vel; _commit(tgt); }
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
