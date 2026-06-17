/* Book Spotlight v1 — premium featured-book recommendation system
   Reads featured_book from gencine_books_v4 localStorage cache.
   Shows a floating card after 2 min, disappears permanently on discovery. */
(function(window) {
  'use strict';

  var LAUNCH_TIME = Date.now();
  var SHOW_DELAY  = 120000; /* 2 minutes */
  var DISC_KEY    = 'featured_book_discovered_v1';
  var DISM_KEY    = 'book_spotlight_dismissed_v1';

  /* ── CSS (injected once) ──────────────────────────────────────────── */
  (function() {
    if (document.getElementById('bs-style')) return;
    var s = document.createElement('style');
    s.id = 'bs-style';
    s.textContent = [
      '.book-spotlight-card{position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 80px);left:16px;width:280px;',
      'background:var(--bg-surface,#1c1c1e);border:1px solid rgba(255,255,255,0.08);border-radius:16px;',
      'box-shadow:0 8px 32px rgba(0,0,0,.4),0 2px 8px rgba(0,0,0,.2);',
      'display:flex;flex-direction:row;align-items:center;gap:12px;padding:12px;',
      'z-index:9000;opacity:0;transform:translateY(20px);',
      'transition:opacity 300ms ease,transform 300ms ease;pointer-events:none;cursor:pointer;',
      'direction:rtl;user-select:none;-webkit-tap-highlight-color:transparent;}',
      '.book-spotlight-card.bs-visible{opacity:1;transform:translateY(0);pointer-events:auto;}',
      '.bs-close{position:absolute;top:8px;left:8px;width:24px;height:24px;border-radius:50%;',
      'border:none;background:rgba(255,255,255,.1);color:var(--text-secondary,#888);',
      'cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;padding:0;flex-shrink:0;}',
      '.bs-close:active{background:rgba(255,255,255,.2);}',
      '.bs-cover-wrap{width:56px;height:72px;border-radius:8px;overflow:hidden;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.3);}',
      '.bs-cover{width:100%;height:100%;object-fit:cover;display:block;}',
      '.bs-cover-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;',
      'background:var(--bg-active,#2a2a2a);}',
      '.bs-cover-placeholder i{font-size:20px;color:var(--text-tertiary,#555);}',
      '.bs-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding-right:4px;}',
      '.bs-label{font-size:10px;font-weight:600;letter-spacing:.3px;color:#d4af37;',
      'text-transform:uppercase;display:flex;align-items:center;gap:4px;}',
      '.bs-title{font-size:13px;font-weight:700;color:var(--text-primary,#f0f0f0);line-height:1.35;',
      'font-family:"IBM Plex Sans Arabic",sans-serif;overflow:hidden;display:-webkit-box;',
      '-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
      '.bs-subtitle{font-size:11px;color:var(--text-secondary,#999);overflow:hidden;',
      'white-space:nowrap;text-overflow:ellipsis;}',
      '.bs-cta{margin-top:5px;padding:4px 10px;border-radius:8px;border:none;',
      'background:var(--primary,#4f8ef7);color:#fff;font-size:11px;font-weight:600;',
      'cursor:pointer;align-self:flex-start;font-family:"IBM Plex Sans Arabic",sans-serif;',
      'transition:opacity .15s;}'
    ].join('');
    document.head.appendChild(s);
  })();

  /* ── Helpers ──────────────────────────────────────────────────────── */
  function _lsGet(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; } }
  function _lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  function _getFeaturedBook() {
    try {
      var books = _lsGet('gencine_books_v4');
      if (!books || !books.length) return null;
      return books.find(function(b) {
        return b.featured_book === true && b.featured_enabled !== false && b.active !== false;
      }) || null;
    } catch(e) { return null; }
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
    title.textContent = book.featured_title || book.title_ku || book.title_ar || '';
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

    /* Click whole card → open book */
    card.addEventListener('click', function() {
      _trackEvent(book.id, 'open');
      _openFeaturedBook(book);
    });

    return card;
  }

  function _openFeaturedBook(book) {
    /* Navigate to Gencine tab and open the book */
    try {
      if (window.GencineUI && window.GencineUI.openBook) {
        /* Switch to Gencine tab first */
        var gencineTab = document.querySelector('[data-tab="gencine"]');
        if (gencineTab) gencineTab.click();
        setTimeout(function() {
          if (window.GencineUI) window.GencineUI.openBook(book.id);
        }, 150);
      }
    } catch(e) {}
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
        if (_card) _card.classList.add('bs-visible');
      });
    });
    _trackEvent(book.id, 'impression');
  }

  function _poll() {
    if (_shown) return;
    if ((Date.now() - LAUNCH_TIME) < SHOW_DELAY) return;
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
