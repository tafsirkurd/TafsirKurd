/* =========================================================
   admin-live-alerts.js  v4  —  2026 Full-Screen Edition
   Real-time event popups for the TafsirKurd admin panel.

   Full centered modal. Big, detailed, professional.
   Each event type has its own aurora gradient + full info.

   Console API:
     _AdminLiveAlerts.test('user_joined')
     _AdminLiveAlerts.test('user_online')
     _AdminLiveAlerts.test('new_message')
     _AdminLiveAlerts.test('new_video')
     _AdminLiveAlerts.demo()
   ========================================================= */
(function () {
  'use strict';

  var DURATION      = 14;    // seconds per popup
  var MAX_QUEUE     = 30;
  var ONLINE_GAP_MS = 60000;
  var WARMUP_MS     = 30000;

  /* ── event type definitions ─────────────────────────────── */
  var TYPES = {
    user_joined: {
      icon:     '👤',
      badge:    'NEW MEMBER',
      badgeCol: '#a78bfa',
      title:    function(d){ return (d.email || 'Someone').split('@')[0] + ' just joined!'; },
      sub:      function(d){ return d.email || 'Unknown user'; },
      rows: function(d) {
        var now = new Date();
        return [
          { label: 'Email',       val: d.email        || '—' },
          { label: 'User ID',     val: d.id           || '—' },
          { label: 'Joined at',   val: _fmtTime(d.created_at || now) },
          { label: 'Platform',    val: d.platform     || 'Web App' },
          { label: 'Status',      val: 'Account Active ✓' },
        ];
      },
      grad:     'linear-gradient(135deg,#1e1040 0%,#2d1b69 40%,#4c1d95 70%,#6d28d9 100%)',
      aurora:   ['rgba(139,92,246,.55)','rgba(99,102,241,.4)','rgba(196,125,248,.3)'],
      glow:     '#7c3aed',
      ring:     '#a78bfa',
      confetti: ['#8b5cf6','#a78bfa','#c4b5fd','#6366f1','#fff','#e879f9','#f0abfc'],
    },
    user_online: {
      icon:     '🌐',
      badge:    'LIVE NOW',
      badgeCol: '#34d399',
      title:    function(d){ return (d.email || d.id || 'A user').split('@')[0] + ' is online'; },
      sub:      function(d){ return d.email || d.id || 'Active user'; },
      rows: function(d) {
        return [
          { label: 'User',        val: d.email        || d.id    || '—' },
          { label: 'Last seen',   val: _fmtTime(d.updated_at || new Date()) },
          { label: 'Session',     val: 'Active session ✓' },
          { label: 'App',         val: 'TafsirKurd Web / Mobile' },
          { label: 'Status',      val: '● Online right now' },
        ];
      },
      grad:     'linear-gradient(135deg,#022c22 0%,#064e3b 40%,#065f46 70%,#059669 100%)',
      aurora:   ['rgba(16,185,129,.5)','rgba(6,182,212,.35)','rgba(52,211,153,.3)'],
      glow:     '#059669',
      ring:     '#34d399',
      confetti: ['#10b981','#34d399','#6ee7b7','#06b6d4','#fff','#bef264'],
    },
    new_message: {
      icon:     '✉️',
      badge:    'NEW MESSAGE',
      badgeCol: '#fb7185',
      title:    function(d){ return d.name || d.email || 'Someone'; },
      sub:      function(d){ return d.subject ? '"' + d.subject + '"' : 'Sent you a message'; },
      rows: function(d) {
        return [
          { label: 'From',        val: d.name         || '—' },
          { label: 'Email',       val: d.email        || '—' },
          { label: 'Subject',     val: d.subject      || '(No subject)' },
          { label: 'Message',     val: d.message ? (d.message.slice(0,80) + (d.message.length > 80 ? '…' : '')) : '(No preview)' },
          { label: 'Received',    val: _fmtTime(d.created_at || new Date()) },
        ];
      },
      grad:     'linear-gradient(135deg,#1f0a12 0%,#4c0519 40%,#881337 70%,#be123c 100%)',
      aurora:   ['rgba(244,63,94,.5)','rgba(251,146,60,.35)','rgba(253,164,175,.3)'],
      glow:     '#be123c',
      ring:     '#fb7185',
      confetti: ['#f43f5e','#fb7185','#fda4af','#fb923c','#fff','#fde047','#fbbf24'],
    },
    new_video: {
      icon:     '▶',
      badge:    'NEW EPISODE',
      badgeCol: '#fbbf24',
      title:    function(d){ return d.title || 'New Episode Added'; },
      sub:      function(d){ return d.description ? d.description.slice(0,60) + '…' : 'IslamVoice episode is now live'; },
      rows: function(d) {
        return [
          { label: 'Title',       val: d.title        || '—' },
          { label: 'Series',      val: d.series       || 'IslamVoice' },
          { label: 'Duration',    val: d.duration     || '—' },
          { label: 'Published',   val: _fmtTime(d.created_at || new Date()) },
          { label: 'Status',      val: '🔥 Live now' },
        ];
      },
      grad:     'linear-gradient(135deg,#1c1003 0%,#451a03 40%,#78350f 70%,#b45309 100%)',
      aurora:   ['rgba(245,158,11,.5)','rgba(249,115,22,.4)','rgba(253,186,116,.25)'],
      glow:     '#b45309',
      ring:     '#fbbf24',
      confetti: ['#f59e0b','#fbbf24','#fcd34d','#f97316','#fff','#a3e635','#fb923c'],
    },
  };

  /* ── helpers ────────────────────────────────────────────── */
  function _fmtTime(val) {
    if (!val) return '—';
    try {
      var d = val instanceof Date ? val : new Date(val);
      if (isNaN(d)) return String(val);
      var now = Date.now();
      var diff = now - d.getTime();
      if (diff < 10000)  return 'Just now';
      if (diff < 60000)  return Math.floor(diff/1000) + 's ago';
      if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
      return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    } catch(e){ return String(val); }
  }

  function _mk(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  /* ── state ──────────────────────────────────────────────── */
  var _queue      = [];
  var _showing    = false;
  var _el         = null;
  var _ticker     = null;
  var _channel    = null;
  var _secsLeft   = 0;
  var _startTime  = Date.now();
  var _lastOnline = 0;

  /* ── queue ──────────────────────────────────────────────── */
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

  /* ── confetti ────────────────────────────────────────────── */
  function _burst(root, colors) {
    for (var i = 0; i < 28; i++) {
      (function () {
        var p = _mk('div', 'la-cp');
        var sz    = 4 + Math.random() * 8;
        var cx    = ((Math.random() - 0.5) * 600).toFixed(1);
        var cy    = (-(60 + Math.random() * 260)).toFixed(1);
        var rot   = (Math.random() * 900).toFixed(1);
        var dur   = (0.6 + Math.random() * 0.7).toFixed(2);
        var delay = (Math.random() * 0.4).toFixed(2);
        var col   = colors[Math.floor(Math.random() * colors.length)];
        p.style.cssText =
          'width:' + sz + 'px;height:' + sz + 'px;' +
          'border-radius:' + (Math.random() > 0.4 ? '50%' : '3px') + ';' +
          'background:' + col + ';position:absolute;top:160px;left:50%;' +
          'pointer-events:none;z-index:40;opacity:0;' +
          '--cx:' + cx + 'px;--cy:' + cy + 'px;--cr:' + rot + 'deg;' +
          'animation:la-burst ' + dur + 's ease-out ' + delay + 's forwards;';
        root.appendChild(p);
        setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); },
          (parseFloat(dur) + parseFloat(delay) + 0.15) * 1000);
      })();
    }
  }

  /* ── build popup ─────────────────────────────────────────── */
  function _show(type, data) {
    var cfg = TYPES[type];
    if (!cfg) { _showing = false; _next(); return; }
    _killTicker();
    _remove();
    _injectCSS();

    /* ── backdrop ── */
    var backdrop = _mk('div', 'la-backdrop');

    /* ── card ── */
    var card = _mk('div', 'la-card');

    /* aurora orbs */
    cfg.aurora.forEach(function (col, i) {
      var orb = _mk('div', 'la-orb la-orb' + i);
      orb.style.background = col;
      card.appendChild(orb);
    });

    /* ── header ── */
    var header = _mk('div', 'la-header');
    header.style.background = cfg.grad;

    /* noise overlay */
    var noise = _mk('div', 'la-noise');
    header.appendChild(noise);

    /* top row: badge + close */
    var topRow = _mk('div', 'la-toprow');

    var badge = _mk('div', 'la-badge');
    badge.style.color       = cfg.badgeCol;
    badge.style.background  = cfg.badgeCol + '22';
    badge.style.borderColor = cfg.badgeCol + '55';
    var bDot = _mk('span', 'la-bdot');
    bDot.style.background = cfg.badgeCol;
    badge.appendChild(bDot);
    badge.appendChild(document.createTextNode(' ' + cfg.badge));
    topRow.appendChild(badge);

    var filler = _mk('div');
    filler.style.flex = '1';
    topRow.appendChild(filler);

    /* queue count */
    if (_queue.length > 0) {
      var qc = _mk('div', 'la-qc');
      qc.textContent = '+' + _queue.length + ' queued';
      topRow.appendChild(qc);
    }

    var xBtn = _mk('button', 'la-x');
    xBtn.setAttribute('aria-label', 'Dismiss');
    xBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    xBtn.addEventListener('click', _dismiss);
    topRow.appendChild(xBtn);

    header.appendChild(topRow);

    /* hero icon + title */
    var hero = _mk('div', 'la-hero');

    var iconWrap = _mk('div', 'la-iconwrap');
    iconWrap.style.boxShadow = '0 0 0 12px ' + cfg.glow + '33, 0 0 50px ' + cfg.glow + '55';
    iconWrap.style.background = cfg.glow + '33';
    var iconEl = _mk('div', 'la-icon');
    iconEl.textContent = cfg.icon;
    iconWrap.appendChild(iconEl);
    hero.appendChild(iconWrap);

    var heroText = _mk('div', 'la-herotext');

    var htitle = _mk('div', 'la-htitle');
    htitle.textContent = String(cfg.title(data));
    heroText.appendChild(htitle);

    var hsub = _mk('div', 'la-hsub');
    hsub.textContent = String(cfg.sub(data));
    heroText.appendChild(hsub);

    hero.appendChild(heroText);
    header.appendChild(hero);
    card.appendChild(header);

    /* ── details body ── */
    var body = _mk('div', 'la-body');

    var bodyTitle = _mk('div', 'la-body-title');
    bodyTitle.textContent = 'Event Details';
    body.appendChild(bodyTitle);

    var rows = cfg.rows(data);
    var grid = _mk('div', 'la-grid');
    rows.forEach(function (row) {
      var item = _mk('div', 'la-item');

      var lbl = _mk('div', 'la-lbl');
      lbl.textContent = row.label;
      item.appendChild(lbl);

      var val = _mk('div', 'la-val');
      val.textContent = row.val;
      item.appendChild(val);

      grid.appendChild(item);
    });
    body.appendChild(grid);

    /* live indicator line */
    var liveBar = _mk('div', 'la-livebar');
    var liveDot = _mk('span', 'la-livedot');
    liveDot.style.background = cfg.ring;
    var liveText = _mk('span', 'la-livetext');
    liveText.textContent = 'Live event — received just now';
    liveBar.appendChild(liveDot);
    liveBar.appendChild(liveText);
    body.appendChild(liveBar);

    card.appendChild(body);

    /* ── footer ── */
    var foot = _mk('div', 'la-foot');

    var timer = _mk('div', 'la-timer');
    var timerLabel = _mk('span', 'la-timer-label');
    timerLabel.textContent = 'Auto-closing in ';
    var timerNum = _mk('span', 'la-timer-num');
    timerNum.id = 'la_timernum';
    timerNum.style.color = cfg.ring;
    timerNum.textContent = DURATION + 's';
    timer.appendChild(timerLabel);
    timer.appendChild(timerNum);
    foot.appendChild(timer);

    var dimissBtn = _mk('button', 'la-dismiss');
    dimissBtn.style.background = cfg.glow;
    dimissBtn.style.boxShadow  = '0 4px 24px ' + cfg.glow + '66';
    dimissBtn.textContent = 'Got it';
    dimissBtn.addEventListener('click', _dismiss);
    foot.appendChild(dimissBtn);

    card.appendChild(foot);

    /* ── progress ring ── */
    var ringWrap = _mk('div', 'la-ringwrap');
    var C = 2 * Math.PI * 52; // circumference for r=52
    ringWrap.innerHTML =
      '<svg class="la-ring" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,.07)" stroke-width="5" fill="none"/>' +
        '<circle id="la_ring" cx="60" cy="60" r="52"' +
          ' stroke="' + cfg.ring + '"' +
          ' stroke-width="5" fill="none"' +
          ' stroke-linecap="round"' +
          ' stroke-dasharray="' + C.toFixed(2) + '"' +
          ' stroke-dashoffset="0"' +
          ' transform="rotate(-90 60 60)"' +
          ' style="transition:stroke-dashoffset 1s linear;"/>' +
        '<text x="60" y="64" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="11" font-family="system-ui,sans-serif">AUTO</text>' +
      '</svg>';
    card.appendChild(ringWrap);

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    _el = backdrop;

    /* confetti for celebratory events */
    if (type === 'user_joined' || type === 'new_video') {
      setTimeout(function () { _burst(backdrop, cfg.confetti); }, 80);
    }

    /* countdown */
    _secsLeft = DURATION;
    var ring = document.getElementById('la_ring');
    var tn   = document.getElementById('la_timernum');

    _ticker = setInterval(function () {
      _secsLeft--;
      var pct = _secsLeft / DURATION;
      if (ring) ring.style.strokeDashoffset = (C * (1 - pct)).toFixed(2);
      if (tn)   tn.textContent = _secsLeft + 's';
      if (_secsLeft <= 0) { _killTicker(); _close(_next); }
    }, 1000);
  }

  /* ── lifecycle ───────────────────────────────────────────── */
  function _dismiss() { _killTicker(); _close(_next); }

  function _close(cb) {
    if (!_el) { if (cb) cb(); return; }
    _el.classList.add('la-out');
    var c = _el.querySelector('.la-card');
    if (c) c.classList.add('la-card-out');
    setTimeout(function () { _remove(); if (cb) cb(); }, 350);
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

    var C = (2 * Math.PI * 52).toFixed(2);

    var s = document.createElement('style');
    s.id = 'la-styles';
    s.textContent = [

      /* keyframes */
      '@keyframes la-bd-in{from{opacity:0}to{opacity:1}}',
      '@keyframes la-bd-out{from{opacity:1}to{opacity:0}}',
      '@keyframes la-card-in{',
        '0%{opacity:0;transform:translateY(40px) scale(.93)}',
        '60%{opacity:1;transform:translateY(-6px) scale(1.005)}',
        '100%{opacity:1;transform:none}}',
      '@keyframes la-card-out{',
        '0%{opacity:1;transform:none}',
        '100%{opacity:0;transform:translateY(30px) scale(.95)}}',
      '@keyframes la-blink{0%,100%{opacity:1}50%{opacity:.1}}',
      '@keyframes la-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
      '@keyframes la-orb{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-20px) scale(1.12)}}',
      '@keyframes la-orb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-18px,14px) scale(1.08)}}',
      '@keyframes la-orb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(10px,20px) scale(1.1)}}',
      '@keyframes la-burst{',
        '0%{opacity:1;transform:translate(-50%,-50%) rotate(0deg)}',
        '100%{opacity:0;transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy))) rotate(var(--cr))}}',
      '@keyframes la-shimmer{',
        '0%{background-position:-600px 0}',
        '100%{background-position:600px 0}}',

      /* backdrop */
      '.la-backdrop{',
        'position:fixed;inset:0;z-index:999999;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(0,0,0,.72);',
        'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
        'animation:la-bd-in .25s ease forwards;}',
      '.la-backdrop.la-out{animation:la-bd-out .3s ease forwards;}',

      /* card */
      '.la-card{',
        'position:relative;overflow:hidden;',
        'width:min(580px,calc(100vw - 32px));',
        'background:rgba(8,8,16,.92);',
        'border:1px solid rgba(255,255,255,.08);',
        'border-radius:28px;',
        'box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04);',
        'animation:la-card-in .52s cubic-bezier(.22,1,.36,1) forwards;}',
      '.la-card.la-card-out{animation:la-card-out .32s cubic-bezier(.55,0,1,.8) forwards!important;}',

      /* aurora orbs */
      '.la-orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:.7;pointer-events:none;}',
      '.la-orb0{width:280px;height:280px;top:-80px;right:-60px;animation:la-orb 7s ease-in-out infinite;}',
      '.la-orb1{width:220px;height:220px;bottom:-60px;left:-40px;animation:la-orb1 9s ease-in-out infinite;}',
      '.la-orb2{width:160px;height:160px;top:40%;right:10%;animation:la-orb2 11s ease-in-out infinite;}',

      /* header */
      '.la-header{',
        'position:relative;padding:22px 22px 24px;overflow:hidden;',
        'border-radius:28px 28px 0 0;}',

      /* noise texture */
      '.la-noise{',
        'position:absolute;inset:0;pointer-events:none;',
        'background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E");',
        'opacity:.4;}',

      /* top row */
      '.la-toprow{position:relative;display:flex;align-items:center;gap:8px;margin-bottom:18px;}',

      /* badge */
      '.la-badge{',
        'display:inline-flex;align-items:center;gap:5px;',
        'font-size:.6rem;font-weight:800;letter-spacing:.18em;',
        'padding:4px 11px 4px 8px;border-radius:20px;',
        'border:1px solid transparent;}',
      '.la-bdot{width:5px;height:5px;border-radius:50%;flex-shrink:0;animation:la-blink .8s ease-in-out infinite;}',

      /* queue count */
      '.la-qc{',
        'font-size:.62rem;font-weight:700;color:rgba(255,255,255,.35);',
        'background:rgba(255,255,255,.08);padding:3px 9px;border-radius:20px;}',

      /* × */
      '.la-x{',
        'width:30px;height:30px;border-radius:50%;',
        'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);',
        'cursor:pointer;color:rgba(255,255,255,.45);',
        'display:flex;align-items:center;justify-content:center;',
        'transition:background .15s,color .15s,transform .15s;}',
      '.la-x:hover{background:rgba(255,255,255,.16);color:#fff;transform:scale(1.1);}',

      /* hero */
      '.la-hero{position:relative;display:flex;align-items:center;gap:18px;}',

      '.la-iconwrap{',
        'width:72px;height:72px;border-radius:22px;flex-shrink:0;',
        'display:flex;align-items:center;justify-content:center;',
        'animation:la-pulse 2.6s ease-in-out infinite;}',
      '.la-icon{font-size:2.4rem;line-height:1;user-select:none;}',

      '.la-herotext{flex:1;min-width:0;}',
      '.la-htitle{',
        'font-size:1.38rem;font-weight:900;color:#fff;',
        'letter-spacing:-.03em;line-height:1.2;margin-bottom:6px;',
        'text-shadow:0 2px 20px rgba(0,0,0,.5);}',
      '.la-hsub{',
        'font-size:.85rem;color:rgba(255,255,255,.55);',
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',

      /* body */
      '.la-body{padding:20px 22px 4px;}',

      '.la-body-title{',
        'font-size:.62rem;font-weight:700;letter-spacing:.14em;',
        'color:rgba(255,255,255,.22);text-transform:uppercase;margin-bottom:12px;}',

      /* grid of details */
      '.la-grid{',
        'display:grid;grid-template-columns:1fr 1fr;',
        'gap:10px;margin-bottom:14px;}',
      '@media(max-width:420px){.la-grid{grid-template-columns:1fr;}}',

      '.la-item{',
        'background:rgba(255,255,255,.04);',
        'border:1px solid rgba(255,255,255,.07);',
        'border-radius:12px;padding:10px 13px;}',

      '.la-lbl{font-size:.65rem;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.28);text-transform:uppercase;margin-bottom:4px;}',
      '.la-val{',
        'font-size:.84rem;font-weight:600;color:rgba(255,255,255,.82);',
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',

      /* live indicator */
      '.la-livebar{',
        'display:flex;align-items:center;gap:7px;',
        'margin-bottom:18px;padding:8px 13px;',
        'background:rgba(255,255,255,.03);',
        'border:1px solid rgba(255,255,255,.06);border-radius:10px;}',
      '.la-livedot{',
        'width:7px;height:7px;border-radius:50%;flex-shrink:0;',
        'animation:la-blink .85s ease-in-out infinite;}',
      '.la-livetext{font-size:.72rem;color:rgba(255,255,255,.35);}',

      /* footer */
      '.la-foot{',
        'display:flex;align-items:center;justify-content:space-between;',
        'padding:14px 22px 20px;',
        'border-top:1px solid rgba(255,255,255,.06);}',

      '.la-timer{display:flex;align-items:center;gap:4px;font-size:.78rem;color:rgba(255,255,255,.25);}',
      '.la-timer-num{font-weight:700;font-variant-numeric:tabular-nums;}',

      '.la-dismiss{',
        'padding:10px 30px;border:none;border-radius:12px;cursor:pointer;',
        'color:#fff;font-size:.86rem;font-weight:800;letter-spacing:.02em;',
        'transition:opacity .15s,transform .12s;opacity:.92;}',
      '.la-dismiss:hover{opacity:1;transform:scale(1.03);}',
      '.la-dismiss:active{transform:scale(.97);}',

      /* countdown ring */
      '.la-ringwrap{',
        'position:absolute;bottom:14px;left:22px;',
        'width:42px;height:42px;opacity:.55;}',
      '.la-ring{width:100%;height:100%;}',

      /* confetti particles */
      '.la-cp{position:absolute;pointer-events:none;will-change:transform,opacity;}',

    ].join('');

    document.head.appendChild(s);
  }

  /* ── Supabase realtime ───────────────────────────────────── */
  function _setup() {
    var sb = window._supabase;
    if (!sb || _channel) return;

    _channel = sb
      .channel('admin_live_alerts_v4')

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
        user_joined: { id: 'usr_xk9201', email: 'sara.ahmed@example.com', created_at: new Date(), platform: 'iOS App' },
        user_online:  { id: 'usr_mh7743', email: 'mohammed@example.com', updated_at: new Date() },
        new_message:  { name: 'Ahmed Hassan', email: 'ahmed@example.com', subject: 'Question about the app', message: 'As-salamu alaykum, I wanted to ask about the Quran recitation feature and whether it supports multiple reciters...', created_at: new Date() },
        new_video:    { id: 'ep_034', title: 'Tafsir Al-Baqarah — Episode 12', series: 'IslamVoice', duration: '42:18', created_at: new Date() },
      };
      _enqueue(type || 'user_joined', data || defaults[type] || defaults.user_joined);
    },
    demo: function () {
      ['user_joined', 'user_online', 'new_message', 'new_video'].forEach(function (t, i) {
        setTimeout(function () { window._AdminLiveAlerts.test(t); }, i * 800);
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
