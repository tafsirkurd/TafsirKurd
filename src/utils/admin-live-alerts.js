/* =========================================================
   admin-live-alerts.js  v3  —  Modern Toast Edition
   Real-time corner notifications for the TafsirKurd admin panel.

   No overlay — stacks up to 3 toasts in bottom-right corner.
   Each toast is independent with its own countdown.

   Console API:
     _AdminLiveAlerts.test('user_joined')
     _AdminLiveAlerts.test('user_online')
     _AdminLiveAlerts.test('new_message')
     _AdminLiveAlerts.test('new_video')
     _AdminLiveAlerts.demo()
   ========================================================= */
(function () {
  'use strict';

  var DURATION      = 12;     // seconds per toast
  var MAX_VISIBLE   = 3;      // max simultaneous toasts
  var MAX_QUEUE     = 30;
  var ONLINE_GAP_MS = 60000;  // 1 "user online" per minute max
  var WARMUP_MS     = 30000;  // ignore UPDATE events for 30s after load

  var TYPES = {
    user_joined: {
      emoji:    '🎉',
      label:    'New Member Joined!',
      sub:      function(d){ return d.email || 'Unknown user'; },
      detail:   function(d){ return 'Just created a TafsirKurd account ✨'; },
      color:    '#818cf8',
      colorBg:  'rgba(99,102,241,.15)',
      glow:     'rgba(129,140,248,.25)',
      confetti: ['#6366f1','#8b5cf6','#a78bfa','#e879f9','#fff','#c4b5fd'],
    },
    user_online: {
      emoji:    '🟢',
      label:    'User Online!',
      sub:      function(d){ return d.email || d.id || 'A user'; },
      detail:   function(d){ return 'Just opened the TafsirKurd app 📱'; },
      color:    '#34d399',
      colorBg:  'rgba(16,185,129,.15)',
      glow:     'rgba(52,211,153,.25)',
      confetti: ['#10b981','#34d399','#6ee7b7','#06b6d4','#fff','#bef264'],
    },
    new_message: {
      emoji:    '💬',
      label:    'New Message!',
      sub:      function(d){ return d.name || d.email || 'Anonymous'; },
      detail:   function(d){ return d.subject ? '“' + d.subject + '”' : 'Sent a contact message'; },
      color:    '#fb7185',
      colorBg:  'rgba(244,63,94,.15)',
      glow:     'rgba(251,113,133,.25)',
      confetti: ['#f43f5e','#fb7185','#fda4af','#fb923c','#fff','#fde047'],
    },
    new_video: {
      emoji:    '🎬',
      label:    'New Episode Added!',
      sub:      function(d){ return d.title || 'Untitled Episode'; },
      detail:   function(d){ return 'A new IslamVoice episode is live 🔥'; },
      color:    '#fbbf24',
      colorBg:  'rgba(245,158,11,.15)',
      glow:     'rgba(251,191,36,.25)',
      confetti: ['#f59e0b','#fbbf24','#fcd34d','#f97316','#fff','#a3e635'],
    },
  };

  /* ── state ──────────────────────────────────────────────── */
  var _container  = null;
  var _active     = [];
  var _queue      = [];
  var _startTime  = Date.now();
  var _lastOnline = 0;
  var _channel    = null;

  /* ── DOM helper ─────────────────────────────────────────── */
  function _mk(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  /* ── stack container ────────────────────────────────────── */
  function _getContainer() {
    if (_container && _container.parentNode) return _container;
    _container = _mk('div', 'la-stack');
    document.body.appendChild(_container);
    return _container;
  }

  /* ── queue ──────────────────────────────────────────────── */
  function _enqueue(type, data) {
    if (_queue.length >= MAX_QUEUE) return;
    _queue.push({ type: type, data: data || {} });
    _processQueue();
  }

  function _processQueue() {
    while (_active.length < MAX_VISIBLE && _queue.length > 0) {
      var ev = _queue.shift();
      _spawn(ev.type, ev.data);
    }
  }

  /* ── confetti burst ─────────────────────────────────────── */
  function _burst(card, colors) {
    for (var i = 0; i < 14; i++) {
      (function () {
        var p = _mk('div', 'la-cp');
        var sz    = 3 + Math.random() * 6;
        var cx    = ((Math.random() - 0.5) * 220).toFixed(1);
        var cy    = (-(40 + Math.random() * 110)).toFixed(1);
        var rot   = (Math.random() * 600).toFixed(1);
        var dur   = (0.45 + Math.random() * 0.45).toFixed(2);
        var delay = (Math.random() * 0.25).toFixed(2);
        var col   = colors[Math.floor(Math.random() * colors.length)];
        p.style.cssText =
          'width:' + sz + 'px;height:' + sz + 'px;' +
          'border-radius:' + (Math.random() > 0.4 ? '50%' : '2px') + ';' +
          'background:' + col + ';' +
          'position:absolute;top:44px;left:50%;' +
          'pointer-events:none;z-index:10;opacity:0;' +
          '--cx:' + cx + 'px;--cy:' + cy + 'px;--cr:' + rot + 'deg;' +
          'animation:la-burst ' + dur + 's ease-out ' + delay + 's forwards;';
        card.appendChild(p);
        setTimeout(function () {
          if (p.parentNode) p.parentNode.removeChild(p);
        }, (parseFloat(dur) + parseFloat(delay) + 0.1) * 1000);
      })();
    }
  }

  /* ── spawn toast ────────────────────────────────────────── */
  function _spawn(type, data) {
    var cfg = TYPES[type];
    if (!cfg) { _processQueue(); return; }
    _injectCSS();

    var wrap = _getContainer();

    /* card */
    var card = _mk('div', 'la-card');
    card.style.boxShadow =
      '-3px 0 18px ' + cfg.glow + ',' +
      '0 18px 56px rgba(0,0,0,.55),' +
      '0 0 0 1px rgba(255,255,255,.06)';

    /* left accent strip */
    var accent = _mk('div', 'la-accent');
    accent.style.background = cfg.color;
    card.appendChild(accent);

    /* close button */
    var xBtn = _mk('button', 'la-x');
    xBtn.setAttribute('aria-label', 'Dismiss');
    xBtn.textContent = '✕';
    card.appendChild(xBtn);

    /* body */
    var body = _mk('div', 'la-body');

    /* emoji block */
    var ew = _mk('div', 'la-ew');
    ew.style.background  = cfg.colorBg;
    ew.style.boxShadow   = 'inset 0 0 0 1px ' + cfg.color + '40';
    ew.textContent = cfg.emoji;
    body.appendChild(ew);

    /* text */
    var meta = _mk('div', 'la-meta');

    var live = _mk('div', 'la-live');
    var dot  = _mk('span', 'la-dot');
    live.appendChild(dot);
    live.appendChild(document.createTextNode(' LIVE'));
    meta.appendChild(live);

    var title = _mk('div', 'la-title');
    title.style.color = cfg.color;
    title.textContent = cfg.label;
    meta.appendChild(title);

    var sub = _mk('div', 'la-sub');
    sub.textContent = String(cfg.sub(data) || '');
    meta.appendChild(sub);

    var detail = _mk('div', 'la-detail');
    detail.textContent = String(cfg.detail(data) || '');
    meta.appendChild(detail);

    body.appendChild(meta);
    card.appendChild(body);

    /* queue badge */
    if (_queue.length > 0) {
      var badge = _mk('div', 'la-qbadge');
      badge.textContent = '+' + _queue.length + ' more';
      card.appendChild(badge);
    }

    /* progress bar */
    var pgw = _mk('div', 'la-pgw');
    var pgb = _mk('div', 'la-pgb');
    pgb.style.background = 'linear-gradient(90deg,' + cfg.color + 'cc,' + cfg.color + ')';
    pgw.appendChild(pgb);
    card.appendChild(pgw);

    wrap.appendChild(card);

    /* reset progress without flash */
    pgb.style.transition = 'none';
    pgb.style.width = '100%';
    pgb.getBoundingClientRect();
    pgb.style.transition = '';

    /* confetti */
    setTimeout(function () { _burst(card, cfg.confetti); }, 50);

    /* toast record */
    var secsLeft = DURATION;
    var toast = { el: card, ticker: null };
    _active.push(toast);

    /* countdown */
    toast.ticker = setInterval(function () {
      secsLeft--;
      pgb.style.width = (secsLeft / DURATION * 100).toFixed(1) + '%';
      if (secsLeft <= 0) _closeToast(toast);
    }, 1000);

    xBtn.addEventListener('click', function () { _closeToast(toast); });
  }

  /* ── close toast ────────────────────────────────────────── */
  function _closeToast(toast) {
    if (toast.ticker) { clearInterval(toast.ticker); toast.ticker = null; }
    var card = toast.el;
    if (!card || !card.parentNode) {
      _active = _active.filter(function (t) { return t !== toast; });
      _processQueue();
      return;
    }
    card.style.pointerEvents = 'none';
    card.classList.add('la-out');
    setTimeout(function () {
      if (card.parentNode) card.parentNode.removeChild(card);
      _active = _active.filter(function (t) { return t !== toast; });
      _processQueue();
    }, 300);
  }

  /* ── CSS ────────────────────────────────────────────────── */
  var _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected || document.getElementById('la-styles')) { _cssInjected = true; return; }
    _cssInjected = true;
    var s = document.createElement('style');
    s.id = 'la-styles';
    s.textContent =
      /* keyframes */
      '@keyframes la-in{from{transform:translateX(calc(100% + 28px));opacity:0}to{transform:translateX(0);opacity:1}}' +
      '@keyframes la-out{0%{transform:translateX(0);opacity:1}100%{transform:translateX(calc(100% + 28px));opacity:0}}' +
      '@keyframes la-blink{0%,100%{opacity:1}50%{opacity:.08}}' +
      '@keyframes la-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}' +
      '@keyframes la-burst{0%{opacity:1;transform:translate(-50%,-50%) rotate(0deg)}' +
        '100%{opacity:0;transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy))) rotate(var(--cr))}}' +

      /* stack container */
      '.la-stack{position:fixed;bottom:24px;right:24px;z-index:999999;' +
        'display:flex;flex-direction:column;gap:10px;' +
        'width:min(390px,calc(100vw - 40px));pointer-events:none;}' +

      /* card */
      '.la-card{position:relative;pointer-events:auto;overflow:hidden;' +
        'background:rgba(10,10,18,0.94);' +
        'backdrop-filter:blur(36px) saturate(1.8);' +
        '-webkit-backdrop-filter:blur(36px) saturate(1.8);' +
        'border:1px solid rgba(255,255,255,0.07);border-radius:18px;' +
        'animation:la-in .38s cubic-bezier(0.22,1,0.36,1) forwards;}' +
      '.la-out{animation:la-out .28s cubic-bezier(.55,0,1,.8) forwards!important;}' +

      /* left accent */
      '.la-accent{position:absolute;left:0;top:0;bottom:0;width:3px;}' +

      /* × button */
      '.la-x{position:absolute;top:11px;right:11px;width:22px;height:22px;' +
        'border-radius:50%;background:rgba(255,255,255,0.07);border:none;cursor:pointer;' +
        'color:rgba(255,255,255,0.4);font-size:0.58rem;z-index:5;' +
        'display:flex;align-items:center;justify-content:center;' +
        'transition:background .15s,color .15s;}' +
      '.la-x:hover{background:rgba(255,255,255,0.14);color:#fff;}' +

      /* body */
      '.la-body{display:flex;align-items:center;gap:13px;padding:15px 38px 12px 16px;}' +

      /* emoji block */
      '.la-ew{width:46px;height:46px;border-radius:14px;flex-shrink:0;' +
        'display:flex;align-items:center;justify-content:center;' +
        'font-size:1.5rem;animation:la-pulse 2.8s ease-in-out infinite;}' +

      /* text */
      '.la-meta{flex:1;min-width:0;}' +
      '.la-live{display:inline-flex;align-items:center;gap:4px;margin-bottom:5px;' +
        'font-size:0.55rem;font-weight:800;letter-spacing:0.2em;color:#ef4444;}' +
      '.la-dot{width:5px;height:5px;border-radius:50%;background:#ef4444;' +
        'animation:la-blink .85s ease-in-out infinite;}' +
      '.la-title{font-size:0.96rem;font-weight:800;letter-spacing:-0.02em;line-height:1.2;margin-bottom:3px;}' +
      '.la-sub{font-size:0.79rem;font-weight:500;color:rgba(255,255,255,0.48);' +
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;}' +
      '.la-detail{font-size:0.72rem;color:rgba(255,255,255,0.28);line-height:1.4;}' +

      /* queue badge */
      '.la-qbadge{margin:0 16px 10px auto;width:fit-content;' +
        'font-size:0.62rem;font-weight:700;color:rgba(255,255,255,0.35);' +
        'background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:10px;}' +

      /* progress */
      '.la-pgw{height:3px;background:rgba(255,255,255,0.06);}' +
      '.la-pgb{height:100%;width:100%;transition:width 1s linear;}' +

      /* confetti particles */
      '.la-cp{position:absolute;pointer-events:none;will-change:transform,opacity;}' +

      /* mobile */
      '@media(max-width:480px){.la-stack{bottom:16px;right:12px;left:12px;width:auto;}}';

    document.head.appendChild(s);
  }

  /* ── Supabase realtime ──────────────────────────────────── */
  function _setup() {
    var sb = window._supabase;
    if (!sb || _channel) return;

    _channel = sb
      .channel('admin_live_alerts_v3')

      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_data' },
        function (p) { _enqueue('user_joined', p.new || {}); })

      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_data' },
        function (p) {
          if (Date.now() - _startTime < WARMUP_MS) return;
          var rec = p.new || {};
          var ua  = rec.updated_at ? new Date(rec.updated_at).getTime() : 0;
          if (Date.now() - ua > 12000) return;
          if (Date.now() - _lastOnline < ONLINE_GAP_MS) return;
          _lastOnline = Date.now();
          _enqueue('user_online', rec);
        })

      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        function (p) { _enqueue('new_message', p.new || {}); })

      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'islamvoice_episodes' },
        function (p) { _enqueue('new_video', p.new || {}); })

      .subscribe(function (status) {
        console.log('[LiveAlerts] Realtime:', status);
      });
  }

  function _init() {
    if (window._supabase) { _setup(); return; }
    var n = 0;
    var poll = setInterval(function () {
      if (window._supabase)  { clearInterval(poll); _setup(); }
      else if (++n > 60)     { clearInterval(poll); console.warn('[LiveAlerts] _supabase unavailable'); }
    }, 500);
  }

  /* ── public API ─────────────────────────────────────────── */
  window._AdminLiveAlerts = {
    test: function (type, data) {
      var defaults = {
        user_joined: { email: 'sara.ahmed@example.com' },
        user_online:  { email: 'mohammed@example.com', id: 'u_demo' },
        new_message:  { name: 'Ahmed Hassan', email: 'ahmed@example.com', subject: 'Question about the app' },
        new_video:    { title: 'Tafsir Al-Baqarah — Episode 12' },
      };
      _enqueue(type || 'user_joined', data || defaults[type] || defaults.user_joined);
    },
    demo: function () {
      ['user_joined', 'user_online', 'new_message', 'new_video'].forEach(function (t, i) {
        setTimeout(function () { window._AdminLiveAlerts.test(t); }, i * 650);
      });
    },
  };

  /* ── boot ───────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
