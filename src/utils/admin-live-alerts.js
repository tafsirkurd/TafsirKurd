/* =========================================================
   admin-live-alerts.js  v1
   Real-time live event pop-ups for the TafsirKurd admin panel.

   Subscribes to Supabase realtime and shows a premium 10-second
   countdown popup for new users, messages, and videos.

   Test from browser console:
     _AdminLiveAlerts.test('user_joined')
     _AdminLiveAlerts.demo()
   ========================================================= */
(function () {
  'use strict';

  var DURATION  = 10;   // seconds before auto-close
  var MAX_QUEUE = 30;
  var CIRC      = +(2 * Math.PI * 18).toFixed(3); // r=18

  var TYPES = {
    user_joined: {
      label:  'New User Joined',
      sub:    function(d){ return d.email || 'Unknown user'; },
      detail: function(d){ return 'Just created a TafsirKurd account'; },
      icon:   'fa-user-plus',
      color:  '#3b82f6',
      glow:   'rgba(59,130,246,.18)',
      bg:     'rgba(59,130,246,.10)',
    },
    new_message: {
      label:  'New Message',
      sub:    function(d){ return d.name || d.email || 'Anonymous'; },
      detail: function(d){ return d.subject ? '“' + d.subject + '”' : 'Sent a contact message'; },
      icon:   'fa-envelope',
      color:  '#ef4444',
      glow:   'rgba(239,68,68,.18)',
      bg:     'rgba(239,68,68,.10)',
    },
    new_video: {
      label:  'New Video Added',
      sub:    function(d){ return d.title || 'Untitled'; },
      detail: function(d){ return 'A new episode was added to IslamVoice'; },
      icon:   'fa-film',
      color:  '#f59e0b',
      glow:   'rgba(245,158,11,.18)',
      bg:     'rgba(245,158,11,.10)',
    },
  };

  /* ── state ──────────────────────────────────────────────── */
  var _queue   = [];
  var _showing = false;
  var _el      = null;
  var _ticker  = null;
  var _channel = null;
  var _secsLeft= 0;

  /* ── helpers ─────────────────────────────────────────────── */
  function _el_(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  /* ── queue / dispatch ────────────────────────────────────── */
  function _enqueue(type, data) {
    if (_queue.length >= MAX_QUEUE) return;
    _queue.push({ type: type, data: data || {} });
    if (!_showing) _next();
  }

  function _next() {
    if (!_queue.length) { _showing = false; return; }
    _showing = true;
    var ev = _queue.shift();
    _show(ev.type, ev.data);
  }

  /* ── build popup using safe DOM methods ──────────────────── */
  function _show(type, data) {
    var cfg = TYPES[type];
    if (!cfg) { _showing = false; _next(); return; }

    _killTicker();
    _remove();
    _injectCSS();

    /* overlay */
    var overlay = _el_('div', 'la-overlay');

    /* card */
    var card = _el_('div', 'la-card');

    /* top accent bar */
    var bar = _el_('div', 'la-bar');
    bar.style.background = cfg.color;
    card.appendChild(bar);

    /* close × button */
    var xBtn = _el_('button', 'la-x');
    xBtn.setAttribute('aria-label', 'Dismiss');
    var xIcon = _el_('i');
    xIcon.className = 'fas fa-times';
    xBtn.appendChild(xIcon);
    xBtn.addEventListener('click', _dismiss);
    card.appendChild(xBtn);

    /* body row */
    var body = _el_('div', 'la-body');

    /* icon */
    var iconWrap = _el_('div', 'la-icon');
    iconWrap.style.background  = cfg.bg;
    iconWrap.style.color       = cfg.color;
    iconWrap.style.boxShadow   = '0 0 0 6px ' + cfg.glow;
    var iEl = _el_('i');
    iEl.className = 'fas ' + cfg.icon;
    iconWrap.appendChild(iEl);
    body.appendChild(iconWrap);

    /* text block */
    var info = _el_('div', 'la-info');

    var liveBadge = _el_('div', 'la-live');
    var dot = _el_('span', 'la-dot');
    liveBadge.appendChild(dot);
    var liveText = document.createTextNode('LIVE');
    liveBadge.appendChild(liveText);
    info.appendChild(liveBadge);

    var titleEl = _el_('div', 'la-title');
    titleEl.textContent = cfg.label;
    info.appendChild(titleEl);

    var subEl = _el_('div', 'la-sub');
    subEl.textContent = String(cfg.sub(data) || '');
    info.appendChild(subEl);

    var detailEl = _el_('div', 'la-detail');
    detailEl.textContent = String(cfg.detail(data) || '');
    info.appendChild(detailEl);

    body.appendChild(info);
    card.appendChild(body);

    /* footer */
    var foot = _el_('div', 'la-foot');

    /* countdown ring */
    var timerWrap = _el_('div', 'la-timer');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.setAttribute('class', 'la-svg'); /* SVG: use setAttribute, not .className */

    var track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('cx', '20'); track.setAttribute('cy', '20'); track.setAttribute('r', '18');
    track.setAttribute('class', 'la-track');
    svg.appendChild(track);

    var fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fill.setAttribute('cx', '20'); fill.setAttribute('cy', '20'); fill.setAttribute('r', '18');
    fill.setAttribute('id', 'la_fill');
    fill.setAttribute('stroke', cfg.color);
    fill.setAttribute('stroke-dasharray', String(CIRC));
    fill.setAttribute('stroke-dashoffset', '0');
    fill.setAttribute('class', 'la-fill');
    svg.appendChild(fill);

    timerWrap.appendChild(svg);

    var numEl = _el_('span', 'la-num');
    numEl.setAttribute('id', 'la_num');
    numEl.textContent = String(DURATION);
    timerWrap.appendChild(numEl);
    foot.appendChild(timerWrap);

    /* queue badge */
    var more = _queue.length;
    if (more > 0) {
      var badge = _el_('span', 'la-more');
      badge.textContent = '+' + more + ' more';
      foot.appendChild(badge);
    }

    /* skip button */
    var skip = _el_('button', 'la-skip');
    var skipText = document.createTextNode('Skip ');
    skip.appendChild(skipText);
    var skipIcon = _el_('i');
    skipIcon.className = 'fas fa-forward-step';
    skip.appendChild(skipIcon);
    skip.addEventListener('click', _dismiss);
    foot.appendChild(skip);

    card.appendChild(foot);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    _el = overlay;

    /* start countdown */
    _secsLeft = DURATION;
    _ticker = setInterval(function () {
      _secsLeft--;
      var n = document.getElementById('la_num');
      var f = document.getElementById('la_fill');
      if (n) n.textContent = String(_secsLeft);
      if (f) f.setAttribute('stroke-dashoffset',
        String(+(CIRC * (1 - _secsLeft / DURATION)).toFixed(3)));
      if (_secsLeft <= 0) { _killTicker(); _close(_next); }
    }, 1000);
  }

  /* ── dismiss ─────────────────────────────────────────────── */
  function _dismiss() { _killTicker(); _close(_next); }

  /* ── animate close ───────────────────────────────────────── */
  function _close(cb) {
    if (!_el) { if (cb) cb(); return; }
    _el.style.animation = 'la-fo .22s ease forwards';
    var card = _el.querySelector('.la-card');
    if (card) card.style.animation = 'la-so .22s cubic-bezier(.55,0,1,1) forwards';
    setTimeout(function () { _remove(); if (cb) cb(); }, 230);
  }

  function _remove() {
    if (_el && _el.parentNode) _el.parentNode.removeChild(_el);
    _el = null;
  }

  function _killTicker() {
    if (_ticker) { clearInterval(_ticker); _ticker = null; }
  }

  /* ── CSS (injected once) ─────────────────────────────────── */
  var _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected || document.getElementById('la-styles')) { _cssInjected = true; return; }
    _cssInjected = true;
    var s = document.createElement('style');
    s.id = 'la-styles';
    /* All style values are hard-coded — no user data reaches here */
    s.textContent =
      '@keyframes la-fi{from{opacity:0}to{opacity:1}}' +
      '@keyframes la-fo{from{opacity:1}to{opacity:0}}' +
      '@keyframes la-si{from{opacity:0;transform:translateY(-32px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}' +
      '@keyframes la-so{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-18px) scale(.96)}}' +
      '@keyframes la-blink{0%,100%{opacity:1}50%{opacity:.15}}' +
      '@keyframes la-glow{0%,100%{box-shadow:0 20px 60px rgba(0,0,0,.26),0 0 0 1px var(--border-light,#e5e5e5)}' +
        '50%{box-shadow:0 28px 80px rgba(0,0,0,.36),0 0 0 1px var(--border-light,#e5e5e5)}}' +

      '.la-overlay{position:fixed;inset:0;z-index:999999;' +
        'display:flex;align-items:flex-start;justify-content:center;padding-top:72px;' +
        'background:rgba(0,0,0,.46);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);' +
        'animation:la-fi .26s ease;}' +

      '.la-card{position:relative;width:min(520px,calc(100vw - 32px));' +
        'background:var(--bg-surface,#fff);border-radius:22px;overflow:hidden;' +
        'box-shadow:0 20px 60px rgba(0,0,0,.26),0 0 0 1px var(--border-light,#e5e5e5);' +
        'animation:la-si .36s cubic-bezier(.22,1,.36,1) forwards,la-glow 2.6s ease-in-out .5s infinite;}' +

      '.la-bar{height:5px;width:100%;}' +

      '.la-x{position:absolute;top:13px;right:13px;width:28px;height:28px;border-radius:50%;' +
        'background:var(--bg-hover,#f0f0f0);border:none;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;' +
        'font-size:.68rem;color:var(--text-secondary,#666);transition:background .15s;z-index:2;}' +
      '.la-x:hover{background:var(--bg-active,#e0e0e0);}' +

      '.la-body{display:flex;align-items:center;gap:20px;padding:24px 22px 18px;}' +

      '.la-icon{width:64px;height:64px;border-radius:18px;flex-shrink:0;' +
        'display:flex;align-items:center;justify-content:center;font-size:1.7rem;}' +

      '.la-info{flex:1;min-width:0;}' +

      '.la-live{display:inline-flex;align-items:center;gap:5px;margin-bottom:9px;' +
        'font-size:.62rem;font-weight:800;letter-spacing:.12em;color:#ef4444;' +
        'font-family:var(--font-family,inherit);}' +
      '.la-dot{width:7px;height:7px;border-radius:50%;background:#ef4444;' +
        'animation:la-blink 1s ease-in-out infinite;}' +

      '.la-title{font-size:1.18rem;font-weight:800;' +
        'color:var(--text-primary,#000);letter-spacing:-.02em;line-height:1.2;margin-bottom:5px;' +
        'font-family:var(--font-family,inherit);}' +

      '.la-sub{font-size:.88rem;font-weight:600;color:var(--text-secondary,#555);' +
        'margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
        'font-family:var(--font-family,inherit);}' +

      '.la-detail{font-size:.79rem;color:var(--text-tertiary,#999);line-height:1.5;' +
        'font-family:var(--font-family,inherit);}' +

      '.la-foot{display:flex;align-items:center;gap:10px;' +
        'padding:14px 22px 20px;border-top:1px solid var(--border-light,#e5e5e5);}' +

      '.la-timer{display:flex;align-items:center;gap:8px;flex-shrink:0;}' +
      '.la-svg{display:block;}' +
      '.la-track{fill:none;stroke:var(--border-light,#ddd);stroke-width:3;}' +
      '.la-fill{fill:none;stroke-width:3;stroke-linecap:round;' +
        'transform:rotate(-90deg);transform-origin:50% 50%;' +
        'transition:stroke-dashoffset 1s linear;}' +
      '.la-num{font-size:.8rem;font-weight:700;color:var(--text-secondary,#666);' +
        'min-width:14px;text-align:center;font-family:var(--font-family,inherit);}' +

      '.la-more{font-size:.72rem;font-weight:700;' +
        'padding:4px 11px;border-radius:20px;' +
        'background:var(--bg-hover,#f0f0f0);color:var(--text-secondary,#666);white-space:nowrap;' +
        'font-family:var(--font-family,inherit);}' +

      '.la-skip{margin-left:auto;display:inline-flex;align-items:center;gap:6px;' +
        'padding:9px 20px;border-radius:10px;border:none;cursor:pointer;' +
        'background:var(--bg-hover,#f0f0f0);color:var(--text-secondary,#555);' +
        'font-size:.82rem;font-weight:700;font-family:var(--font-family,inherit);' +
        'transition:background .15s;white-space:nowrap;}' +
      '.la-skip:hover{background:var(--bg-active,#e0e0e0);}' +
      '.la-more + .la-skip{margin-left:0;}';
    document.head.appendChild(s);
  }

  /* ── Supabase realtime ───────────────────────────────────── */
  function _setup() {
    var sb = window._supabase;
    if (!sb || _channel) return;
    _channel = sb
      .channel('admin_live_alerts_v1')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_data' },
        function (p) { _enqueue('user_joined', p.new || {}); })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        function (p) { _enqueue('new_message', p.new || {}); })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'islamvoice_episodes' },
        function (p) { _enqueue('new_video', p.new || {}); })
      .subscribe(function (status) {
        console.log('[LiveAlerts] Realtime status:', status);
      });
  }

  /* ── wait for Supabase ───────────────────────────────────── */
  function _init() {
    if (window._supabase) { _setup(); return; }
    var n = 0;
    var poll = setInterval(function () {
      if (window._supabase) { clearInterval(poll); _setup(); }
      else if (++n > 60) { clearInterval(poll); console.warn('[LiveAlerts] _supabase unavailable'); }
    }, 500);
  }

  /* ── public API ──────────────────────────────────────────── */
  window._AdminLiveAlerts = {
    dismiss: _dismiss,
    test: function (type, data) {
      var defaults = {
        user_joined: { email: 'sara@example.com' },
        new_message: { name: 'Ahmed Hassan', email: 'ahmed@example.com', subject: 'Question about the app' },
        new_video:   { title: 'Tafsir Al-Baqarah — Episode 12' },
      };
      _enqueue(type || 'user_joined', data || defaults[type] || defaults.user_joined);
    },
    demo: function () {
      ['user_joined', 'new_message', 'new_video'].forEach(function (t, i) {
        setTimeout(function () { window._AdminLiveAlerts.test(t); }, i * 600);
      });
    },
  };

  /* ── boot ────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
