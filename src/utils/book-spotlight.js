/* Book Spotlight v3 — premium featured-book recommendation system
   Reads featured_book from gencine_books_v4 localStorage cache,
   or fetches directly from Supabase if cache is stale/missing.
   Shows a floating card after 2 min, disappears permanently on discovery. */
(function(window) {
  'use strict';

  var LAUNCH_TIME      = Date.now();
  var SHOW_DELAY       = 120000; /* 2 minutes after app launch */
  var AUTO_DISMISS_MS  = 7000;  /* auto-hide after 7 s if no interaction */
  var DISC_KEY    = 'featured_book_discovered_v1';
  var DISM_KEY    = 'book_spotlight_dismissed_v1';
  var BS_CACHE    = 'bs_featured_book_v1'; /* lightweight single-book cache */
  var _fetchPending = false;

  /* ── CSS (injected once) ──────────────────────────────────────────── */
  (function() {
    if (document.getElementById('bs-style')) return;
    var s = document.createElement('style');
    s.id = 'bs-style';
    s.textContent = [
      /* ── Card shell ── */
      '.book-spotlight-card{',
        'position:fixed;',
        'bottom:calc(env(safe-area-inset-bottom,0px) + 78px);',
        'left:12px;right:12px;',
        'background:#2a2420;',            /* warm dark brown — not cold black */
        'border:1px solid rgba(180,150,60,0.2);',
        'border-radius:20px;',
        'box-shadow:0 16px 48px rgba(0,0,0,.5),0 4px 16px rgba(0,0,0,.25),0 0 0 0.5px rgba(255,255,255,.04);',
        'display:flex;flex-direction:row;align-items:center;gap:14px;',
        'padding:14px 14px 14px 16px;',
        'z-index:9000;',
        'opacity:0;transform:translateY(28px);',
        'transition:opacity 420ms cubic-bezier(0.16,1,0.3,1),transform 420ms cubic-bezier(0.34,1.3,0.64,1);',
        'pointer-events:none;cursor:pointer;',
        'direction:rtl;user-select:none;-webkit-tap-highlight-color:transparent;}',

      '.book-spotlight-card.bs-visible{opacity:1;transform:translateY(0);pointer-events:auto;}',
      '.book-spotlight-card:active{opacity:.92;}',

      /* ── Light / noor theme override ── */
      '[data-theme="noor"] .book-spotlight-card,[data-theme="light"] .book-spotlight-card,[data-theme="parchment"] .book-spotlight-card{',
        'background:#f5edda;',            /* warm parchment */
        'border-color:rgba(160,120,40,0.25);',
        'box-shadow:0 8px 32px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.08);}',
      '[data-theme="noor"] .bs-title,[data-theme="light"] .bs-title,[data-theme="parchment"] .bs-title{color:#1a1208!important;}',
      '[data-theme="noor"] .bs-subtitle,[data-theme="light"] .bs-subtitle,[data-theme="parchment"] .bs-subtitle{color:#6b5a3e!important;}',
      '[data-theme="noor"] .bs-close,[data-theme="light"] .bs-close,[data-theme="parchment"] .bs-close{color:#8a7a60!important;background:rgba(0,0,0,.07)!important;}',

      /* ── Sakina theme override ── */
      '[data-theme="sakina"] .book-spotlight-card{background:#0f201a;}',

      /* ── Close button (top-left physical = top-end RTL) ── */
      '.bs-close{',
        'position:absolute;top:10px;left:10px;',
        'width:26px;height:26px;border-radius:50%;',
        'border:none;',
        'background:rgba(128,128,128,.15);',
        'color:var(--text-tertiary,#666);',
        'cursor:pointer;display:flex;align-items:center;justify-content:center;',
        'font-size:10px;padding:0;flex-shrink:0;',
        'transition:background .15s;}',
      '.bs-close:active{background:rgba(128,128,128,.28);}',

      /* ── Cover ── */
      '.bs-cover-wrap{',
        'width:68px;height:88px;',
        'border-radius:10px;overflow:hidden;flex-shrink:0;',
        'box-shadow:0 6px 18px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.25);}',
      '.bs-cover{width:100%;height:100%;object-fit:cover;display:block;}',
      '.bs-cover-placeholder{',
        'width:100%;height:100%;display:flex;align-items:center;justify-content:center;',
        'background:var(--bg-active,#2a2a2a);}',
      '.bs-cover-placeholder i{font-size:26px;color:var(--text-tertiary,#555);}',

      /* ── Content ── */
      '.bs-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:0;}',

      /* ── Label ── */
      '.bs-label{',
        'font-size:10px;font-weight:700;letter-spacing:.5px;',
        'color:#c9a040;',   /* warm Islamic gold */
        'text-transform:uppercase;',
        'display:flex;align-items:center;gap:5px;',
        'margin-bottom:5px;}',
      '.bs-label i{font-size:9px;}',

      /* ── Title ── */
      '.bs-title{',
        'font-size:15px;font-weight:700;',
        'color:var(--text-primary,#f0f0f0);',
        'line-height:1.3;',
        'font-family:"IBM Plex Sans Arabic",sans-serif;',
        'overflow:hidden;display:-webkit-box;',
        '-webkit-line-clamp:2;-webkit-box-orient:vertical;',
        'margin-bottom:4px;}',

      /* ── Subtitle ── */
      '.bs-subtitle{',
        'font-size:12px;color:var(--text-secondary,#888);',
        'overflow:hidden;white-space:nowrap;text-overflow:ellipsis;',
        'margin-bottom:8px;}',

      /* ── CTA button ── */
      '.bs-cta{',
        'padding:7px 16px;border-radius:10px;border:none;',
        'background:linear-gradient(135deg,#c9a040,#9a7820);',
        'color:#fff;font-size:12px;font-weight:700;',
        'cursor:pointer;align-self:flex-start;',
        'font-family:"IBM Plex Sans Arabic",sans-serif;',
        'letter-spacing:.2px;',
        'box-shadow:0 3px 10px rgba(160,120,30,.4);',
        'transition:opacity .15s;}',
      '.bs-cta:active{opacity:.8;}',

      /* ── Auto-dismiss progress bar ── */
      '.bs-progress{',
        'position:absolute;bottom:0;left:0;right:0;',
        'height:3px;border-radius:0 0 20px 20px;overflow:hidden;',
        'background:rgba(128,128,128,0.12);}',
      '.bs-progress-fill{',
        'height:100%;width:100%;',
        'background:linear-gradient(90deg,#c9a040,#9a7820);',
        'transform-origin:left center;will-change:transform;}'
    ].join('');
    document.head.appendChild(s);
  })();

  /* ── Helpers ──────────────────────────────────────────────────────── */
  function _lsGet(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; } }
  function _lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  function _getFeaturedBook() {
    /* 1. Try the full books cache first */
    try {
      var books = _lsGet('gencine_books_v4');
      if (books && books.length) {
        var found = books.find(function(b) {
          return b.featured_book === true && b.featured_enabled !== false && b.active !== false;
        });
        if (found) { _lsSet(BS_CACHE, found); return found; }
      }
    } catch(e) {}
    /* 2. Fall back to dedicated spotlight cache (populated by _fetchFeaturedBook) */
    try {
      var cached = _lsGet(BS_CACHE);
      if (cached && cached.id) return cached;
    } catch(e) {}
    /* 3. Neither found — trigger async Supabase fetch (once) */
    _fetchFeaturedBook();
    return null;
  }

  function _fetchFeaturedBook() {
    if (_fetchPending) return;
    _fetchPending = true;
    /* Wait for _appSupabase to be ready (may take a few seconds after app start) */
    var attempts = 0;
    var timer = setInterval(function() {
      var sb = window._appSupabase;
      if (!sb && ++attempts < 30) return; /* retry up to 30 times (45s) */
      clearInterval(timer);
      _fetchPending = false;
      if (!sb) return;
      sb.from('gencine_books')
        .select('id,title_ku,title_ar,author_ku,author_ar,cover_url,featured_book,featured_enabled,featured_title,featured_subtitle,series_title_ku,active')
        .eq('featured_book', true)
        .eq('active', true)
        .limit(1)
        .maybeSingle()
        .then(function(res) {
          if (res && res.data && res.data.id) {
            _lsSet(BS_CACHE, res.data);
          }
        })
        .catch(function() {});
    }, 1500);
  }

  function _isDiscovered(bookId) {
    var disc = _lsGet(DISC_KEY) || {};
    return !!disc[String(bookId)];
  }

  function _isDismissed(bookId) {
    var dism = _lsGet(DISM_KEY) || {};
    return !!dism[String(bookId)];
  }

  /* ── Analytics ────────────────────────────────────────────────────── */
  var _pendingKey = 'bs_pending_events';

  function _trackEvent(bookId, type) {
    /* Fire-and-forget. Try Supabase; on failure store in pending queue. */
    try {
      var sb = window._appSupabase;
      if (sb) {
        sb.from('book_spotlight_events').insert({ book_id: Number(bookId), event_type: type })
          .then(function() {}).catch(function() { _queueEvent(bookId, type); });
      } else {
        _queueEvent(bookId, type);
      }
    } catch(e) { _queueEvent(bookId, type); }
  }

  function _queueEvent(bookId, type) {
    var pending = _lsGet(_pendingKey) || [];
    pending.push({ book_id: Number(bookId), event_type: type, ts: Date.now() });
    if (pending.length > 50) pending = pending.slice(-50); /* cap */
    _lsSet(_pendingKey, pending);
  }

  function _flushPending() {
    try {
      var sb = window._appSupabase;
      if (!sb) return;
      var pending = _lsGet(_pendingKey);
      if (!pending || !pending.length) return;
      _lsSet(_pendingKey, []);
      sb.from('book_spotlight_events').insert(pending.map(function(e) {
        return { book_id: e.book_id, event_type: e.event_type };
      })).then(function() {}).catch(function() {});
    } catch(e) {}
  }

  /* ── Card DOM ─────────────────────────────────────────────────────── */
  var _card = null;

  function _buildCard(book) {
    var card = document.createElement('div');
    card.className = 'book-spotlight-card';

    /* Close button */
    var closeBtn = document.createElement('button');
    closeBtn.className = 'bs-close';
    closeBtn.setAttribute('aria-label', 'Close');
    var closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times';
    closeBtn.appendChild(closeIcon);
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      _dismiss(book.id);
    });
    card.appendChild(closeBtn);

    /* Cover */
    var coverWrap = document.createElement('div');
    coverWrap.className = 'bs-cover-wrap';
    if (book.cover_url) {
      var img = document.createElement('img');
      img.className = 'bs-cover';
      img.alt = '';
      img.loading = 'lazy';
      img.src = book.cover_url;
      coverWrap.appendChild(img);
    } else {
      var ph = document.createElement('div');
      ph.className = 'bs-cover-placeholder';
      var phi = document.createElement('i');
      phi.className = 'fas fa-book';
      ph.appendChild(phi);
      coverWrap.appendChild(ph);
    }
    card.appendChild(coverWrap);

    /* Content */
    var content = document.createElement('div');
    content.className = 'bs-content';

    var label = document.createElement('div');
    label.className = 'bs-label';
    var labelIcon = document.createElement('i');
    labelIcon.className = 'fas fa-star';
    label.appendChild(labelIcon);
    label.appendChild(document.createTextNode(' پێشنیاری تەفسیر کورد'));
    content.appendChild(label);

    var title = document.createElement('div');
    title.className = 'bs-title';
    title.textContent = book.series_title_ku || book.featured_title || book.title_ku || book.title_ar || '';
    content.appendChild(title);

    var subtitle = document.createElement('div');
    subtitle.className = 'bs-subtitle';
    subtitle.textContent = book.featured_subtitle || book.author_ku || book.author_ar || 'پەرتووکێ گرینگ';
    content.appendChild(subtitle);

    var cta = document.createElement('button');
    cta.className = 'bs-cta';
    cta.textContent = 'بخوێنە ←';
    content.appendChild(cta);

    card.appendChild(content);

    /* Progress bar (auto-dismiss indicator) */
    var _prog = document.createElement('div');
    _prog.className = 'bs-progress';
    var _fill = document.createElement('div');
    _fill.className = 'bs-progress-fill';
    _prog.appendChild(_fill);
    card.appendChild(_prog);

    /* Click whole card → hide immediately then open book */
    card.addEventListener('click', function() {
      _hideCard();
      _trackEvent(book.id, 'open');
      _openFeaturedBook(book);
    });

    return card;
  }

  function _openFeaturedBook(book) {
    try {
      /* Always click the Gencine tab first — loads dhikr.js if not yet loaded */
      var tabBtn = document.querySelector('.tab-item[data-tab="gencine"]');
      if (tabBtn) tabBtn.click();

      /* If GencineUI already ready, open immediately */
      if (window.GencineUI && typeof window.GencineUI.openBook === 'function') {
        setTimeout(function() { if (window.GencineUI) window.GencineUI.openBook(book.id); }, 120);
        return;
      }

      /* Otherwise poll until dhikr.js initializes GencineUI */
      var _att = 0;
      var _t = setInterval(function() {
        if (window.GencineUI && typeof window.GencineUI.openBook === 'function') {
          clearInterval(_t);
          window.GencineUI.openBook(book.id);
        }
        if (++_att > 40) clearInterval(_t);
      }, 200);
    } catch(e) { /* ignore */ }
  }

  /* ── Dismiss / Discover ───────────────────────────────────────────── */
  function _dismiss(bookId) {
    _trackEvent(bookId, 'dismiss');
    var dism = _lsGet(DISM_KEY) || {};
    dism[String(bookId)] = Date.now();
    _lsSet(DISM_KEY, dism);
    _hideCard();
  }

  function _markDiscovered(bookId) {
    if (_isDiscovered(bookId)) return;
    _trackEvent(bookId, 'discovered');
    var disc = _lsGet(DISC_KEY) || {};
    disc[String(bookId)] = Date.now();
    _lsSet(DISC_KEY, disc);
    _hideCard();
  }

  function _hideCard() {
    if (!_card) return;
    if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
    _card.classList.remove('bs-visible');
    var c = _card;
    setTimeout(function() { if (c && c.parentNode) c.parentNode.removeChild(c); }, 350);
    _card = null;
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  /* ── Show Logic ───────────────────────────────────────────────────── */
  var _lastScroll = 0;
  var _audioActive = false;
  var _pollTimer = null;
  var _autoTimer = null;
  var _shown = false;

  /* Scroll guard — suppress card if user scrolled in last 500ms */
  document.addEventListener('scroll', function() { _lastScroll = Date.now(); }, true);

  /* Audio guard */
  document.addEventListener('play', function(e) {
    if (e.target && (e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO')) {
      _audioActive = true;
    }
  }, true);
  document.addEventListener('pause', function(e) {
    if (e.target && (e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO')) {
      /* Only clear if no other audio is playing */
      setTimeout(function() {
        var playing = document.querySelector('audio:not([paused]),video:not([paused])');
        if (!playing) _audioActive = false;
      }, 100);
    }
  }, true);
  document.addEventListener('ended', function(e) {
    if (e.target && (e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO')) {
      _audioActive = false;
    }
  }, true);

  function _isEligibleTab() {
    /* Eligible tabs: quran, islamvoice, gencine.
       Ineligible: prayer, settings */
    var INELIGIBLE = ['panelPrayer', 'panelSettings'];
    var ELIGIBLE   = ['panelQuran', 'panelIslamvoice', 'panelGencine'];
    for (var i = 0; i < ELIGIBLE.length; i++) {
      var el = document.getElementById(ELIGIBLE[i]);
      if (el && el.classList.contains('on')) return true;
    }
    return false;
  }

  function _isScrolling() {
    return (Date.now() - _lastScroll) < 500;
  }

  function _showCard(book) {
    if (_card || _shown) return;
    _shown = true;
    _card = _buildCard(book);
    document.body.appendChild(_card);
    /* Animate in */
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (!_card) return;
        _card.classList.add('bs-visible');
        /* Start progress bar + auto-dismiss after card finishes sliding in (450ms) */
        setTimeout(function() {
          if (!_card) return;
          var fill = _card.querySelector('.bs-progress-fill');
          if (fill) {
            fill.style.transition = 'transform ' + (AUTO_DISMISS_MS / 1000) + 's linear';
            fill.style.transform = 'scaleX(0)';
          }
          _autoTimer = setTimeout(function() {
            _autoTimer = null;
            _trackEvent(book.id, 'auto_dismiss');
            _hideCard();
          }, AUTO_DISMISS_MS);
        }, 450);
      });
    });
    _trackEvent(book.id, 'impression');
  }

  function _poll() {
    if (_shown) return;
    var elapsed = Date.now() - LAUNCH_TIME;
    if (elapsed < SHOW_DELAY) return;
    if (_audioActive) return;
    if (_isScrolling()) return;
    if (!_isEligibleTab()) return;
    var book = _getFeaturedBook();
    if (!book) return;
    if (_isDiscovered(book.id)) return;
    if (_isDismissed(book.id)) return;
    _showCard(book);
  }

  /* ── Init ─────────────────────────────────────────────────────────── */
  function _init() {
    /* Start polling every 1200ms — cheap, no DOM thrash */
    _pollTimer = setInterval(_poll, 1200);

    /* Try flushing pending events once supabase is ready */
    var _flushAttempts = 0;
    var _flushTimer = setInterval(function() {
      if (window._appSupabase || ++_flushAttempts > 20) {
        clearInterval(_flushTimer);
        _flushPending();
      }
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  /* ── Public API ───────────────────────────────────────────────────── */
  window.BookSpotlight = {
    markDiscovered: _markDiscovered,
    isDiscovered:   _isDiscovered,
    getFeaturedBook: _getFeaturedBook,
    trackEvent:     _trackEvent,
    refresh: function() {
      _shown = false;
      if (_card) _hideCard();
    }
  };

})(window);
