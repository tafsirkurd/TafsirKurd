/* =========================================================
   admin-live-alerts.js  v2  —  Celebration Edition
   Real-time live event pop-ups for the TafsirKurd admin panel.

   Events:
     user_joined  — new account created (INSERT user_data)
     user_online  — user became active (UPDATE user_data, throttled)
     new_message  — contact form message (INSERT contact_messages)
     new_video    — new episode added   (INSERT islamvoice_episodes)

   Console API:
     _AdminLiveAlerts.test('user_joined')
     _AdminLiveAlerts.test('user_online')
     _AdminLiveAlerts.demo()
   ========================================================= */
(function () {
  'use strict';

  var DURATION       = 10;     // seconds per popup
  var MAX_QUEUE      = 30;
  var ONLINE_GAP_MS  = 60000;  // max 1 "user online" popup per minute
  var WARMUP_MS      = 30000;  // ignore UPDATE events for 30s after page load

  var TYPES = {
    user_joined: {
      emoji:    '🎉',
      label:    'New Member Joined!',
      sub:      function(d){ return d.email || 'Unknown user'; },
      detail:   function(d){ return 'Just created a TafsirKurd account ✨'; },
      color:    '#6366f1',
      grad:     'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
      glow:     'rgba(99,102,241,.28)',
      confetti: ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ffffff','#e879f9'],
    },
    user_online: {
      emoji:    '🟢',
      label:    'User Online!',
      sub:      function(d){ return d.email || d.id || 'A user'; },
      detail:   function(d){ return 'Just opened the TafsirKurd app 📱'; },
      color:    '#10b981',
      grad:     'linear-gradient(135deg,#10b981 0%,#06b6d4 100%)',
      glow:     'rgba(16,185,129,.28)',
      confetti: ['#10b981','#34d399','#6ee7b7','#06b6d4','#ffffff','#bef264'],
    },
    new_message: {
      emoji:    '💬',
      label:    'New Message!',
      sub:      function(d){ return d.name || d.email || 'Anonymous'; },
      detail:   function(d){ return d.subject ? '“' + d.subject + '”' : 'Sent a contact message'; },
      color:    '#f43f5e',
      grad:     'linear-gradient(135deg,#f43f5e 0%,#fb923c 100%)',
      glow:     'rgba(244,63,94,.28)',
      confetti: ['#f43f5e','#fb7185','#fda4af','#fb923c','#ffffff','#fde047'],
    },
    new_video: {
      emoji:    '🎬',
      label:    'New Episode Added!',
      sub:      function(d){ return d.title || 'Untitled Episode'; },
      detail:   function(d){ return 'A new IslamVoice episode is live 🔥'; },
      color:    '#f59e0b',
      grad:     'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)',
      glow:     'rgba(245,158,11,.28)',
      confetti: ['#f59e0b','#fbbf24','#fcd34d','#f97316','#ffffff','#a3e635'],
    },
  };

  /* ── state ──────────────────────────────────────────────── */
  var _queue          = [];
  var _showing        = false;
  var _el             = null;
  var _ticker         = null;
  var _channel        = null;
  var _secsLeft       = 0;
  var _startTime      = Date.now();
  var _lastOnline     = 0;

  /* ── small DOM helper ───────────────────────────────────── */
  function _mk(tag, cls) {
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

  /* ── confetti burst ──────────────────────────────────────── */
  function _burst(card, colors) {
    var N = 22;
    for (var i = 0; i < N; i++) {
      (function () {
        var p = _mk('div', 'la-cp');
        var size   = 5 + Math.random() * 8;
        var cx     = ((Math.random() - 0.5) * 360).toFixed(1);
        var cy     = (-(70 + Math.random() * 180)).toFixed(1);
        var rot    = (Math.random() * 720).toFixed(1);
        var dur    = (0.65 + Math.random() * 0.6).toFixed(2);
        var delay  = (Math.random() * 0.35).toFixed(2);
        var col    = colors[Math.floor(Math.random() * colors.length)];
        var circle = Math.random() > 0.45;
        p.style.cssText =
          'width:' + size + 'px;height:' + size + 'px;' +
          'border-radius:' + (circle ? '50%' : '2px') + ';' +
          'background:' + col + ';' +
          'position:absolute;top:50%;left:50%;' +
          'pointer-events:none;z-index:30;opacity:0;' +
          '--cx:' + cx + 'px;--cy:' + cy + 'px;--cr:' + rot + 'deg;' +
          'animation:la-burst ' + dur + 's ease-out ' + delay + 's forwards;';
        card.appendChild(p);
        setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); },
          (parseFloat(dur) + parseFloat(delay) + 0.15) * 1000);
      })();
    }
  }

  /* ── build & show popup ──────────────────────────────────── */
  function _show(type, data) {
    var cfg = TYPES[type];
    if (!cfg) { _showing = false; _next(); return; }

    _killTicker();
    _remove();
    _injectCSS();

    /* overlay ------------------------------------------------ */
    var overlay = _mk('div', 'la-overlay');

    /* card --------------------------------------------------- */
    var card = _mk('div', 'la-card');
    card.style.boxShadow =
      '0 28px 90px rgba(0,0,0,.32),' +
      '0 0 0 1px rgba(255,255,255,.06),' +
      '0 0 60px ' + cfg.glow;

    /* gradient accent bar */
    var bar = _mk('div', 'la-bar');
    bar.style.background = cfg.grad;
    card.appendChild(bar);

    /* close × */
    var xBtn = _mk('button', 'la-x');
    xBtn.setAttribute('aria-label', 'Dismiss');
    xBtn.textContent = '✕';
    xBtn.addEventListener('click', _dismiss);
    card.appendChild(xBtn);

    /* body --------------------------------------------------- */
    var body = _mk('div', 'la-body');

    /* emoji badge */
    var emojiWrap = _mk('div', 'la-ew');
    emojiWrap.style.cssText =
      'background:' + cfg.glow + ';' +
      'box-shadow:0 0 0 8px ' + cfg.glow + ';';
    var emojiEl = _mk('div', 'la-emoji');
    emojiEl.textContent = cfg.emoji;
    emojiWrap.appendChild(emojiEl);
    body.appendChild(emojiWrap);

    /* info block */
    var info = _mk('div', 'la-info');

    var live = _mk('div', 'la-live');
    var dot  = _mk('span', 'la-dot');
    live.appendChild(dot);
    live.appendChild(document.createTextNode(' LIVE'));
    info.appendChild(live);

    var title = _mk('div', 'la-title');
    title.style.color = cfg.color;
    title.textContent = String(cfg.label);
    info.appendChild(title);

    var sub = _mk('div', 'la-sub');
    sub.textContent = String(cfg.sub(data) || '');
    info.appendChild(sub);

    var detail = _mk('div', 'la-detail');
    detail.textContent = String(cfg.detail(data) || '');
    info.appendChild(detail);

    body.appendChild(info);
    card.appendChild(body);

    /* footer ------------------------------------------------- */
    var foot = _mk('div', 'la-foot');

    if (_queue.length > 0) {
      var more = _mk('span', 'la-more');
      more.textContent = '+' + _queue.length + ' more';
      foot.appendChild(more);
    }

    var gotIt = _mk('button', 'la-gotit');
    gotIt.style.background = cfg.grad;
    gotIt.textContent = 'Got it ✓';
    gotIt.addEventListener('click', _dismiss);
    foot.appendChild(gotIt);

    card.appendChild(foot);

    /* progress bar ------------------------------------------- */
    var pgWrap = _mk('div', 'la-pgw');
    var pgBar  = _mk('div', 'la-pgb');
    pgBar.id   = 'la_pgb';
    pgBar.style.background = cfg.grad;
    pgWrap.appendChild(pgBar);
    card.appendChild(pgWrap);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    _el = overlay;

    /* initialise progress bar without flash */
    var pg = document.getElementById('la_pgb');
    if (pg) {
      pg.style.transition = 'none';
      pg.style.width = '100%';
      pg.getBoundingClientRect(); // force reflow
      pg.style.transition = '';
    }

    /* confetti after card entrance animation */
    setTimeout(function () { _burst(card, cfg.confetti); }, 80);

    /* countdown */
    _secsLeft = DURATION;
    _ticker = setInterval(function () {
      _secsLeft--;
      var b = document.getElementById('la_pgb');
      if (b) b.style.width = (_secsLeft / DURATION * 100).toFixed(1) + '%';
      if (_secsLeft <= 0) { _killTicker(); _close(_next); }
    }, 1000);
  }

  /* ── lifecycle ───────────────────────────────────────────── */
  function _dismiss() { _killTicker(); _close(_next); }

  function _close(cb) {
    if (!_el) { if (cb) cb(); return; }
    _el.style.animation = 'la-fo .22s ease forwards';
    var c = _el.querySelector('.la-card');
    if (c) c.style.animation = 'la-so .22s cubic-bezier(.55,0,1,1) forwards';
    setTimeout(function () { _remove(); if (cb) cb(); }, 230);
  }

  function _remove() {
    if (_el && _el.parentNode) _el.parentNode.removeChild(_el);
    _el = null;
  }

  function _killTicker() {
    if (_ticker) { clearInterval(_ticker); _ticker = null; }
  }

  /* ── CSS ─────────────────────────────────────────────────── */
  var _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected || document.getElementById('la-styles')) { _cssInjected = true; return; }
    _cssInjected = true;
    var s = document.createElement('style');
    s.id = 'la-styles';
    s.textContent =
      '@keyframes la-fi{from{opacity:0}to{opacity:1}}' +
      '@keyframes la-fo{from{opacity:1}to{opacity:0}}' +
      '@keyframes la-si{0%{opacity:0;transform:translateY(-44px) scale(.9)}' +
        '60%{opacity:1;transform:translateY(4px) scale(1.01)}' +
        '100%{opacity:1;transform:none}}' +
      '@keyframes la-so{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-20px) scale(.95)}}' +
      '@keyframes la-blink{0%,100%{opacity:1}50%{opacity:.08}}' +
      '@keyframes la-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}' +
      '@keyframes la-burst{' +
        '0%{opacity:1;transform:translate(-50%,-50%) rotate(0deg)}' +
        '100%{opacity:0;transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy))) rotate(var(--cr))}}' +

      '.la-overlay{position:fixed;inset:0;z-index:999999;' +
        'display:flex;align-items:flex-start;justify-content:center;padding-top:60px;' +
        'background:rgba(0,0,0,.54);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);' +
        'animation:la-fi .2s ease;}' +

      '.la-card{position:relative;width:min(500px,calc(100vw - 24px));overflow:hidden;' +
        'background:var(--bg-surface,#fff);border-radius:24px;' +
        'animation:la-si .46s cubic-bezier(.22,1,.36,1) forwards;}' +

      '.la-bar{height:6px;width:100%;}' +

      '.la-x{position:absolute;top:11px;right:11px;width:26px;height:26px;border-radius:50%;' +
        'background:rgba(128,128,128,.12);border:none;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;' +
        'font-size:.68rem;color:var(--text-secondary,#666);z-index:20;}' +
      '.la-x:hover{background:rgba(128,128,128,.22);}' +

      '.la-body{display:flex;align-items:center;gap:18px;padding:22px 20px 14px;}' +

      '.la-ew{width:70px;height:70px;border-radius:22px;flex-shrink:0;' +
        'display:flex;align-items:center;justify-content:center;' +
        'animation:la-pulse 2.4s ease-in-out infinite;}' +
      '.la-emoji{font-size:2.3rem;line-height:1;user-select:none;}' +

      '.la-info{flex:1;min-width:0;}' +

      '.la-live{display:inline-flex;align-items:center;gap:4px;margin-bottom:9px;' +
        'font-size:.6rem;font-weight:900;letter-spacing:.14em;color:#ef4444;' +
        'background:rgba(239,68,68,.1);padding:3px 9px 3px 7px;border-radius:20px;}' +
      '.la-dot{width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;' +
        'animation:la-blink .85s ease-in-out infinite;}' +

      '.la-title{font-size:1.2rem;font-weight:900;letter-spacing:-.025em;line-height:1.2;margin-bottom:5px;}' +

      '.la-sub{font-size:.87rem;font-weight:600;color:var(--text-secondary,#555);' +
        'margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +

      '.la-detail{font-size:.78rem;color:var(--text-tertiary,#999);line-height:1.5;}' +

      '.la-foot{display:flex;align-items:center;gap:10px;' +
        'padding:12px 20px 16px;border-top:1px solid var(--border-light,rgba(0,0,0,.08));}' +

      '.la-more{font-size:.71rem;font-weight:700;padding:4px 10px;border-radius:20px;' +
        'background:var(--bg-hover,#f0f0f0);color:var(--text-secondary,#666);}' +

      '.la-gotit{margin-left:auto;padding:9px 22px;border-radius:10px;border:none;cursor:pointer;' +
        'color:#fff;font-size:.84rem;font-weight:800;letter-spacing:.01em;' +
        'transition:opacity .15s;opacity:.9;}' +
      '.la-gotit:hover{opacity:1;}' +

      '.la-pgw{height:5px;background:var(--bg-hover,rgba(0,0,0,.06));}' +
      '.la-pgb{height:100%;width:100%;transition:width 1s linear;}' +

      '.la-cp{position:absolute;pointer-events:none;will-change:transform,opacity;}';
    document.head.appendChild(s);
  }

  /* ── Supabase realtime ───────────────────────────────────── */
  function _setup() {
    var sb = window._supabase;
    if (!sb || _channel) return;

    _channel = sb
      .channel('admin_live_alerts_v2')

      /* new user signed up */
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_data' },
        function (p) { _enqueue('user_joined', p.new || {}); })

      /* user went online (UPDATE, rate-limited) */
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_data' },
        function (p) {
          if (Date.now() - _startTime < WARMUP_MS) return;
          var rec       = p.new || {};
          var updatedAt = rec.updated_at ? new Date(rec.updated_at).getTime() : 0;
          if (Date.now() - updatedAt > 12000) return;       // stale broadcast
          if (Date.now() - _lastOnline < ONLINE_GAP_MS) return; // throttle
          _lastOnline = Date.now();
          _enqueue('user_online', rec);
        })

      /* new contact message */
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        function (p) { _enqueue('new_message', p.new || {}); })

      /* new IslamVoice episode */
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'islamvoice_episodes' },
        function (p) { _enqueue('new_video', p.new || {}); })

      .subscribe(function (status) {
        console.log('[LiveAlerts] Realtime:', status);
      });
  }

  /* ── wait for _supabase ──────────────────────────────────── */
  function _init() {
    if (window._supabase) { _setup(); return; }
    var n = 0;
    var poll = setInterval(function () {
      if (window._supabase)       { clearInterval(poll); _setup(); }
      else if (++n > 60)          { clearInterval(poll); console.warn('[LiveAlerts] _supabase unavailable'); }
    }, 500);
  }

  /* ── public API ──────────────────────────────────────────── */
  window._AdminLiveAlerts = {
    dismiss: _dismiss,
    test: function (type, data) {
      var defaults = {
        user_joined:  { email: 'sara.ahmed@example.com' },
        user_online:  { email: 'mohammed@example.com', id: 'u_demo' },
        new_message:  { name: 'Ahmed Hassan', email: 'ahmed@example.com', subject: 'Question about the app' },
        new_video:    { title: 'Tafsir Al-Baqarah — Episode 12' },
      };
      _enqueue(type || 'user_joined', data || defaults[type] || defaults.user_joined);
    },
    demo: function () {
      var types = ['user_joined', 'user_online', 'new_message', 'new_video'];
      types.forEach(function (t, i) {
        setTimeout(function () { window._AdminLiveAlerts.test(t); }, i * 700);
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
