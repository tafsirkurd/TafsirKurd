/* =========================================================
   admin-live-alerts.js  v5  —  2026 Pro Edition
   Real-time event popups for the TafsirKurd admin panel.

   Console API:
     _AdminLiveAlerts.test('user_joined')
     _AdminLiveAlerts.test('user_online')
     _AdminLiveAlerts.test('new_message')
     _AdminLiveAlerts.test('new_video')
     _AdminLiveAlerts.demo()
   ========================================================= */
(function () {
  'use strict';

  var DURATION      = 15;
  var MAX_QUEUE     = 30;
  var ONLINE_GAP_MS = 60000;
  var WARMUP_MS     = 30000;

  /* ── event types ────────────────────────────────────────── */
  var TYPES = {
    user_joined: {
      icon:     '👤',
      badge:    'NEW MEMBER',
      badgeCol: '#a78bfa',
      title:    function(d){ return (d.email||'Someone').split('@')[0] + ' just joined!'; },
      sub:      function(d){ return d.email || 'Unknown user'; },
      rows: function(d) {
        return [
          { label:'Email',    val:d.email        || '—',                span:true  },
          { label:'User ID',  val:d.id           || '—',                span:false },
          { label:'Platform', val:d.platform     || 'Web App',          span:false },
          { label:'Joined',   val:_fmtTime(d.created_at||new Date()),   span:false },
          { label:'Status',   val:'Account Active ✓',                   span:false },
        ];
      },
      grad:     'linear-gradient(135deg,#120b2e 0%,#1e1151 40%,#3b1e85 75%,#5b21b6 100%)',
      aurora:   ['rgba(139,92,246,.5)','rgba(99,102,241,.38)','rgba(167,139,250,.28)'],
      glow:     '#7c3aed',
      ring:     '#a78bfa',
      confetti: ['#8b5cf6','#a78bfa','#c4b5fd','#6366f1','#fff','#e879f9','#f0abfc'],
    },
    user_online: {
      icon:     '🌐',
      badge:    'LIVE NOW',
      badgeCol: '#34d399',
      title:    function(d){ return (d.email||d.id||'A user').split('@')[0] + ' is online'; },
      sub:      function(d){ return d.email || d.id || 'Active user'; },
      rows: function(d) {
        return [
          { label:'User',     val:d.email||d.id  || '—',                span:true  },
          { label:'Last seen',val:_fmtTime(d.updated_at||new Date()),   span:false },
          { label:'Session',  val:'Active session ✓',                   span:false },
          { label:'App',      val:'TafsirKurd Web / Mobile',            span:false },
          { label:'Status',   val:'● Online right now',                 span:false },
        ];
      },
      grad:     'linear-gradient(135deg,#011a14 0%,#033d2b 40%,#065f46 75%,#059669 100%)',
      aurora:   ['rgba(16,185,129,.48)','rgba(6,182,212,.32)','rgba(52,211,153,.26)'],
      glow:     '#059669',
      ring:     '#34d399',
      confetti: ['#10b981','#34d399','#6ee7b7','#06b6d4','#fff','#bef264'],
    },
    new_message: {
      icon:     '✉️',
      badge:    'NEW MESSAGE',
      badgeCol: '#fb7185',
      title:    function(d){ return d.name || d.email || 'Someone'; },
      sub:      function(d){ return d.subject ? '"'+d.subject+'"' : 'Sent you a message'; },
      rows: function(d) {
        return [
          { label:'From',     val:d.name         || '—',                span:false },
          { label:'Email',    val:d.email        || '—',                span:false },
          { label:'Subject',  val:d.subject      || '(No subject)',     span:true  },
          { label:'Message',  val:d.message ? d.message.slice(0,120)+(d.message.length>120?'…':'') : '(No preview)', span:true },
          { label:'Received', val:_fmtTime(d.created_at||new Date()),   span:false },
        ];
      },
      grad:     'linear-gradient(135deg,#1a060d 0%,#450b1a 40%,#7f1230 75%,#be123c 100%)',
      aurora:   ['rgba(244,63,94,.48)','rgba(251,146,60,.32)','rgba(253,164,175,.26)'],
      glow:     '#be123c',
      ring:     '#fb7185',
      confetti: ['#f43f5e','#fb7185','#fda4af','#fb923c','#fff','#fde047','#fbbf24'],
    },
    new_video: {
      icon:     '▶',
      badge:    'NEW EPISODE',
      badgeCol: '#fbbf24',
      title:    function(d){ return d.title || 'New Episode Added'; },
      sub:      function(d){ return d.description ? d.description.slice(0,70)+'…' : 'IslamVoice episode is now live'; },
      rows: function(d) {
        return [
          { label:'Title',     val:d.title        || '—',               span:true  },
          { label:'Series',    val:d.series       || 'IslamVoice',      span:false },
          { label:'Duration',  val:d.duration     || '—',               span:false },
          { label:'Published', val:_fmtTime(d.created_at||new Date()),  span:false },
          { label:'Status',    val:'🔥 Live now',                       span:false },
        ];
      },
      grad:     'linear-gradient(135deg,#160d00 0%,#3d1f00 40%,#78350f 75%,#b45309 100%)',
      aurora:   ['rgba(245,158,11,.5)','rgba(249,115,22,.38)','rgba(253,186,116,.24)'],
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
      if (isNaN(d.getTime())) return String(val);
      var diff = Date.now() - d.getTime();
      if (diff < 10000)   return 'Just now';
      if (diff < 60000)   return Math.floor(diff/1000)+'s ago';
      if (diff < 3600000) return Math.floor(diff/60000)+'m ago';
      return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    } catch(e) { return String(val); }
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
    _queue.push({ type:type, data:data||{} });
    if (!_showing) _next();
  }

  function _next() {
    if (!_queue.length) { _showing=false; return; }
    _showing = true;
    var ev = _queue.shift();
    _show(ev.type, ev.data);
  }

  /* ── confetti ────────────────────────────────────────────── */
  function _burst(root, colors) {
    for (var i=0;i<32;i++) {
      (function(){
        var p   = _mk('div','la-cp');
        var sz  = 4+Math.random()*8;
        var cx  = ((Math.random()-.5)*640).toFixed(1);
        var cy  = (-(50+Math.random()*280)).toFixed(1);
        var rot = (Math.random()*900).toFixed(1);
        var dur = (.55+Math.random()*.65).toFixed(2);
        var del = (Math.random()*.45).toFixed(2);
        var col = colors[Math.floor(Math.random()*colors.length)];
        p.style.cssText =
          'width:'+sz+'px;height:'+sz+'px;'+
          'border-radius:'+(Math.random()>.4?'50%':'3px')+';'+
          'background:'+col+';position:absolute;'+
          'top:50%;left:50%;'+
          'pointer-events:none;z-index:40;opacity:0;'+
          '--cx:'+cx+'px;--cy:'+cy+'px;--cr:'+rot+'deg;'+
          'animation:la-burst '+dur+'s ease-out '+del+'s forwards;';
        root.appendChild(p);
        setTimeout(function(){if(p.parentNode)p.parentNode.removeChild(p);},(parseFloat(dur)+parseFloat(del)+.12)*1000);
      })();
    }
  }

  /* ── build popup ─────────────────────────────────────────── */
  function _show(type, data) {
    var cfg = TYPES[type];
    if (!cfg) { _showing=false; _next(); return; }
    _killTicker(); _remove(); _injectCSS();

    var C = 2*Math.PI*24; // ring circumference r=24

    /* backdrop */
    var backdrop = _mk('div','la-backdrop');

    /* card */
    var card = _mk('div','la-card');
    card.style.borderColor = cfg.ring+'30';
    card.style.boxShadow   =
      '0 0 0 1px '+cfg.ring+'18,'+
      '0 32px 100px rgba(0,0,0,.55),'+
      '0 0 80px '+cfg.glow+'18';

    /* ── HEADER ── */
    var hdr = _mk('div','la-hdr');
    hdr.style.background = cfg.grad;

    /* top bar: badge · spacer · queue count · × */
    var topbar = _mk('div','la-topbar');

    var badge = _mk('div','la-badge');
    badge.style.color       = cfg.badgeCol;
    badge.style.background  = cfg.badgeCol+'1e';
    badge.style.borderColor = cfg.badgeCol+'4a';
    var bdot = _mk('span','la-bdot');
    bdot.style.background = cfg.badgeCol;
    badge.appendChild(bdot);
    badge.appendChild(document.createTextNode(' '+cfg.badge));
    topbar.appendChild(badge);

    topbar.appendChild(Object.assign(_mk('div'),{style:'flex:1'}));

    if (_queue.length>0) {
      var qc=_mk('div','la-qc');
      qc.textContent='+'+_queue.length+' queued';
      topbar.appendChild(qc);
    }

    var xBtn=_mk('button','la-x');
    xBtn.setAttribute('aria-label','Dismiss');
    xBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    xBtn.addEventListener('click',_dismiss);
    topbar.appendChild(xBtn);

    hdr.appendChild(topbar);

    /* hero row: icon + title block */
    var hero = _mk('div','la-hero');

    var iw = _mk('div','la-iw');
    iw.style.background = cfg.glow+'28';
    iw.style.boxShadow  = '0 0 0 10px '+cfg.glow+'1a,0 0 40px '+cfg.glow+'33';
    iw.appendChild(Object.assign(_mk('div','la-icon'),{textContent:cfg.icon}));
    hero.appendChild(iw);

    var ht = _mk('div','la-ht');
    var ttl = _mk('div','la-ttl');
    ttl.textContent = String(cfg.title(data));
    ht.appendChild(ttl);
    var sb = _mk('div','la-sb');
    sb.textContent = String(cfg.sub(data));
    ht.appendChild(sb);
    hero.appendChild(ht);

    hdr.appendChild(hero);
    card.appendChild(hdr);

    /* ── BODY ── */
    var body = _mk('div','la-body');

    /* section label */
    var seclbl = _mk('div','la-seclbl');
    seclbl.textContent = 'Event Details';
    body.appendChild(seclbl);

    /* details grid */
    var grid = _mk('div','la-grid');
    cfg.rows(data).forEach(function(row){
      var item = _mk('div','la-item');
      if (row.span) item.classList.add('la-span');
      var lbl = _mk('div','la-lbl');
      lbl.textContent = row.label;
      var val = _mk('div','la-val');
      val.textContent = String(row.val||'—');
      item.appendChild(lbl);
      item.appendChild(val);
      grid.appendChild(item);
    });
    body.appendChild(grid);

    /* live status pill */
    var pill = _mk('div','la-pill');
    var pd = _mk('span','la-pd');
    pd.style.background = cfg.ring;
    var pt = _mk('span','la-pt');
    pt.textContent = 'Live event  ·  received just now  ·  real-time via Supabase';
    pill.appendChild(pd); pill.appendChild(pt);
    body.appendChild(pill);

    card.appendChild(body);

    /* ── FOOTER ── */
    var foot = _mk('div','la-foot');

    /* inline countdown ring */
    var ringWrap = _mk('div','la-rw');
    ringWrap.innerHTML =
      '<svg class="la-ring" viewBox="0 0 56 56" fill="none">'+
        '<circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,.1)" stroke-width="3.5" fill="none"/>'+
        '<circle id="la_rc" cx="28" cy="28" r="24"'+
          ' stroke="'+cfg.ring+'"'+
          ' stroke-width="3.5" fill="none" stroke-linecap="round"'+
          ' stroke-dasharray="'+C.toFixed(2)+'"'+
          ' stroke-dashoffset="0"'+
          ' transform="rotate(-90 28 28)"'+
          ' style="transition:stroke-dashoffset 1s linear;"/>'+
        '<text id="la_rt" x="28" y="33" text-anchor="middle"'+
          ' fill="'+cfg.ring+'" font-size="11.5" font-weight="700"'+
          ' font-family="system-ui,sans-serif">'+DURATION+'</text>'+
      '</svg>';
    foot.appendChild(ringWrap);

    var footmid = _mk('div','la-footmid');
    var flt = _mk('div','la-flt');
    flt.textContent = 'Auto-dismissing in ';
    var fln = _mk('span','la-fln');
    fln.id = 'la_fn';
    fln.style.color = cfg.ring;
    fln.textContent = DURATION+'s';
    flt.appendChild(fln);
    footmid.appendChild(flt);
    foot.appendChild(footmid);

    var dismissBtn = _mk('button','la-dismiss');
    dismissBtn.style.background = cfg.glow;
    dismissBtn.style.boxShadow  = '0 4px 22px '+cfg.glow+'55';
    dismissBtn.textContent = 'Got it  ✓';
    dismissBtn.addEventListener('click',_dismiss);
    foot.appendChild(dismissBtn);

    card.appendChild(foot);

    /* ── PROGRESS BAR at very bottom ── */
    var pgw = _mk('div','la-pgw');
    var pgb = _mk('div','la-pgb');
    pgb.id = 'la_pgb';
    pgb.style.background = 'linear-gradient(90deg,'+cfg.glow+'aa,'+cfg.ring+')';
    pgw.appendChild(pgb);
    card.appendChild(pgw);

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    _el = backdrop;

    /* reset progress bar without flash */
    pgb.style.transition='none'; pgb.style.width='100%';
    pgb.getBoundingClientRect();
    pgb.style.transition='';

    /* confetti on every event */
    setTimeout(function(){_burst(card,cfg.confetti);},70);

    /* countdown */
    _secsLeft = DURATION;
    var rc = document.getElementById('la_rc');
    var rt = document.getElementById('la_rt');
    var fn = document.getElementById('la_fn');
    var pb = document.getElementById('la_pgb');

    _ticker = setInterval(function(){
      _secsLeft--;
      var pct = _secsLeft/DURATION;
      if (rc) rc.style.strokeDashoffset = (C*(1-pct)).toFixed(2);
      if (rt) rt.textContent = _secsLeft;
      if (fn) fn.textContent = _secsLeft+'s';
      if (pb) pb.style.width = (pct*100).toFixed(1)+'%';
      if (_secsLeft<=0) { _killTicker(); _close(_next); }
    },1000);
  }

  /* ── lifecycle ───────────────────────────────────────────── */
  function _dismiss(){ _killTicker(); _close(_next); }

  function _close(cb){
    if (!_el){ if(cb)cb(); return; }
    _el.classList.add('la-out');
    var c=_el.querySelector('.la-card');
    if(c)c.classList.add('la-card-out');
    setTimeout(function(){ _remove(); if(cb)cb(); },340);
  }

  function _remove(){
    if(_el&&_el.parentNode)_el.parentNode.removeChild(_el);
    _el=null;
  }

  function _killTicker(){
    if(_ticker){clearInterval(_ticker);_ticker=null;}
  }

  /* ── CSS ─────────────────────────────────────────────────── */
  var _cssInjected = false;
  function _injectCSS(){
    if(_cssInjected||document.getElementById('la-styles')){_cssInjected=true;return;}
    _cssInjected=true;
    var s=document.createElement('style');
    s.id='la-styles';
    s.textContent=[

      '@keyframes la-bd-in{from{opacity:0}to{opacity:1}}',
      '@keyframes la-bd-out{from{opacity:1}to{opacity:0}}',
      '@keyframes la-ci{0%{opacity:0;transform:translateY(36px) scale(.94)}60%{opacity:1;transform:translateY(-5px) scale(1.004)}100%{opacity:1;transform:none}}',
      '@keyframes la-co{from{opacity:1;transform:none}to{opacity:0;transform:translateY(28px) scale(.95)}}',
      '@keyframes la-blink{0%,100%{opacity:1}50%{opacity:.08}}',
      '@keyframes la-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
      '@keyframes la-burst{0%{opacity:1;transform:translate(-50%,-50%)rotate(0)}100%{opacity:0;transform:translate(calc(-50% + var(--cx)),calc(-50% + var(--cy)))rotate(var(--cr))}}',

      /* backdrop — dark navy, not pure black */
      '.la-backdrop{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;',
        'background:rgba(4,3,18,.62);',
        'backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);',
        'animation:la-bd-in .24s ease forwards;padding:16px;box-sizing:border-box;}',
      '.la-backdrop.la-out{animation:la-bd-out .32s ease forwards;}',

      /* card */
      '.la-card{position:relative;overflow:hidden;',
        'width:min(600px,100%);',
        'max-height:calc(100dvh - 32px);',
        'display:flex;flex-direction:column;',
        'background:rgba(11,10,26,.96);',
        'border:1px solid rgba(255,255,255,.09);',
        'border-radius:28px;',
        'animation:la-ci .5s cubic-bezier(.22,1,.36,1) forwards;}',
      '.la-card.la-card-out{animation:la-co .3s cubic-bezier(.55,0,1,.8) forwards!important;}',

      /* header */
      '.la-hdr{position:relative;z-index:1;flex-shrink:0;padding:20px 20px 22px;border-radius:28px 28px 0 0;overflow:hidden;}',

      /* topbar */
      '.la-topbar{position:relative;z-index:2;display:flex;align-items:center;gap:7px;margin-bottom:16px;}',

      /* badge */
      '.la-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px 3px 7px;border-radius:20px;',
        'border:1px solid transparent;font-size:.58rem;font-weight:800;letter-spacing:.17em;}',
      '.la-bdot{width:5px;height:5px;border-radius:50%;flex-shrink:0;animation:la-blink .85s ease-in-out infinite;}',

      '.la-qc{font-size:.62rem;font-weight:700;color:rgba(255,255,255,.38);',
        'background:rgba(255,255,255,.09);padding:3px 9px;border-radius:20px;white-space:nowrap;}',

      '.la-x{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.09);',
        'border:1px solid rgba(255,255,255,.12);cursor:pointer;color:rgba(255,255,255,.42);',
        'display:flex;align-items:center;justify-content:center;flex-shrink:0;',
        'transition:background .15s,color .15s,transform .15s;}',
      '.la-x:hover{background:rgba(255,255,255,.18);color:#fff;transform:scale(1.08);}',

      /* hero */
      '.la-hero{position:relative;z-index:2;display:flex;align-items:flex-start;gap:16px;}',

      '.la-iw{width:68px;height:68px;border-radius:20px;flex-shrink:0;',
        'display:flex;align-items:center;justify-content:center;',
        'animation:la-pulse 2.8s ease-in-out infinite;}',
      '.la-icon{font-size:2.2rem;line-height:1;user-select:none;}',

      '.la-ht{flex:1;min-width:0;padding-top:4px;}',

      /* title — wraps, never clips */
      '.la-ttl{font-size:1.32rem;font-weight:900;color:#fff;letter-spacing:-.028em;line-height:1.25;',
        'margin-bottom:5px;text-shadow:0 2px 16px rgba(0,0,0,.45);',
        'word-break:break-word;overflow-wrap:anywhere;}',

      /* subtitle — wraps too */
      '.la-sb{font-size:.83rem;color:rgba(255,255,255,.52);line-height:1.45;',
        'word-break:break-word;overflow-wrap:anywhere;}',

      /* body */
      '.la-body{position:relative;z-index:1;flex:1;overflow-y:auto;',
        'padding:18px 20px 6px;',
        'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent;}',
      '.la-body::-webkit-scrollbar{width:4px;}',
      '.la-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px;}',

      /* section label */
      '.la-seclbl{font-size:.6rem;font-weight:700;letter-spacing:.14em;',
        'color:rgba(255,255,255,.2);text-transform:uppercase;margin-bottom:10px;}',

      /* details grid */
      '.la-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px;}',

      '.la-item{background:rgba(255,255,255,.042);border:1px solid rgba(255,255,255,.07);',
        'border-radius:12px;padding:9px 12px;min-width:0;}',
      '.la-span{grid-column:1/-1;}', /* full-width rows */

      '.la-lbl{font-size:.62rem;font-weight:700;letter-spacing:.1em;',
        'color:rgba(255,255,255,.26);text-transform:uppercase;margin-bottom:3px;}',

      /* value — allows 2-line wrap, never clips hard */
      '.la-val{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.84);line-height:1.45;',
        'word-break:break-word;overflow-wrap:anywhere;',
        'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;}',
      '.la-span .la-val{-webkit-line-clamp:3;}', /* spanned rows get 3 lines */

      /* live pill */
      '.la-pill{display:flex;align-items:center;gap:7px;margin-bottom:14px;',
        'padding:7px 12px;background:rgba(255,255,255,.028);',
        'border:1px solid rgba(255,255,255,.055);border-radius:10px;}',
      '.la-pd{width:6px;height:6px;border-radius:50%;flex-shrink:0;animation:la-blink .85s ease-in-out infinite;}',
      '.la-pt{font-size:.7rem;color:rgba(255,255,255,.32);word-break:break-word;}',

      /* footer */
      '.la-foot{position:relative;z-index:1;display:flex;align-items:center;gap:12px;',
        'padding:12px 20px 14px;border-top:1px solid rgba(255,255,255,.065);flex-shrink:0;}',

      /* countdown ring — inline in footer */
      '.la-rw{width:44px;height:44px;flex-shrink:0;}',
      '.la-ring{width:100%;height:100%;}',

      '.la-footmid{flex:1;min-width:0;}',
      '.la-flt{font-size:.75rem;color:rgba(255,255,255,.28);white-space:nowrap;}',
      '.la-fln{font-weight:700;font-variant-numeric:tabular-nums;}',

      '.la-dismiss{padding:10px 26px;border:none;border-radius:12px;cursor:pointer;',
        'color:#fff;font-size:.84rem;font-weight:800;letter-spacing:.02em;white-space:nowrap;',
        'transition:opacity .15s,transform .12s;opacity:.92;flex-shrink:0;}',
      '.la-dismiss:hover{opacity:1;transform:scale(1.03);}',
      '.la-dismiss:active{transform:scale(.97);}',

      /* progress bar at bottom */
      '.la-pgw{height:3px;background:rgba(255,255,255,.05);flex-shrink:0;}',
      '.la-pgb{height:100%;width:100%;transition:width 1s linear;}',

      /* confetti */
      '.la-cp{position:absolute;pointer-events:none;will-change:transform,opacity;}',

      /* mobile tweaks */
      '@media(max-width:480px){',
        '.la-ttl{font-size:1.1rem;}',
        '.la-hero{gap:12px;}',
        '.la-iw{width:56px;height:56px;}',
        '.la-icon{font-size:1.8rem;}',
        '.la-grid{grid-template-columns:1fr;}',
        '.la-span{grid-column:auto;}',
      '}',

    ].join('');
    document.head.appendChild(s);
  }

  /* ── Supabase realtime ───────────────────────────────────── */
  function _setup(){
    var sb=window._supabase;
    if(!sb||_channel)return;

    _channel=sb.channel('admin_live_alerts_v5')

      .on('postgres_changes',{event:'INSERT',schema:'public',table:'user_data'},
        function(p){_enqueue('user_joined',p.new||{});})

      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'user_data'},
        function(p){
          if(Date.now()-_startTime<WARMUP_MS)return;
          var rec=p.new||{};
          var ua=rec.updated_at?new Date(rec.updated_at).getTime():0;
          if(Date.now()-ua>12000)return;
          if(Date.now()-_lastOnline<ONLINE_GAP_MS)return;
          _lastOnline=Date.now();
          _enqueue('user_online',rec);
        })

      .on('postgres_changes',{event:'INSERT',schema:'public',table:'contact_messages'},
        function(p){_enqueue('new_message',p.new||{});})

      .on('postgres_changes',{event:'INSERT',schema:'public',table:'islamvoice_episodes'},
        function(p){_enqueue('new_video',p.new||{});})

      .subscribe(function(s){console.log('[LiveAlerts]',s);});
  }

  function _init(){
    if(window._supabase){_setup();return;}
    var n=0,poll=setInterval(function(){
      if(window._supabase){clearInterval(poll);_setup();}
      else if(++n>60){clearInterval(poll);console.warn('[LiveAlerts] _supabase unavailable');}
    },500);
  }

  /* ── public API ─────────────────────────────────────────── */
  window._AdminLiveAlerts={
    test:function(type,data){
      var def={
        user_joined:{id:'usr_xk9201',email:'sara.ahmed@example.com',created_at:new Date(),platform:'iOS App'},
        user_online: {id:'usr_mh7743',email:'mohammed.khalid@example.com',updated_at:new Date()},
        new_message: {name:'Ahmed Hassan',email:'ahmed@example.com',subject:'Question about the Quran app',message:'As-salamu alaykum, I wanted to ask about the Quran recitation feature and whether it supports multiple reciters. Jazakallah khair for your amazing work!',created_at:new Date()},
        new_video:   {id:'ep_034',title:'Tafsir Al-Baqarah — Episode 12',series:'IslamVoice',duration:'42:18',created_at:new Date()},
      };
      _enqueue(type||'user_joined',data||def[type]||def.user_joined);
    },
    demo:function(){
      ['user_joined','user_online','new_message','new_video'].forEach(function(t,i){
        setTimeout(function(){window._AdminLiveAlerts.test(t);},i*900);
      });
    },
  };

  /* ── boot ───────────────────────────────────────────────── */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',_init);
  } else { _init(); }
})();
