/* =========================================================
   admin-live-alerts.js  v8  —  Smart Online/Offline Edition
   Real-time event popups for the TafsirKurd admin panel.

   Online tracking: user_sessions.last_active_at (correct table)
   Offline detection: local timeout map (12 min inactivity)
   Profile enrichment: async fetch from profiles table

   Console API:
     _AdminLiveAlerts.test('user_joined')
     _AdminLiveAlerts.test('user_online')
     _AdminLiveAlerts.test('user_offline')
     _AdminLiveAlerts.test('new_message')
     _AdminLiveAlerts.test('new_video')
     _AdminLiveAlerts.demo()
   ========================================================= */
(function () {
  'use strict';

  var DURATION           = 15;
  var MAX_QUEUE          = 30;
  var WARMUP_MS          = 6000;
  var POLL_ONLINE_MS     = 30000;   // online/offline check every 30s
  var POLL_CONTENT_MS    = 45000;   // new videos / messages every 45s
  var PER_USER_GAP_MS    = 5 * 60 * 1000;

  /* ── event type definitions ─────────────────────────────── */
  var TYPES = {
    user_joined: {
      icon: '🎉',
      badge: 'NEW MEMBER',
      badgeCol: '#a78bfa',
      title:  function(d){ return (d.email||'Someone').split('@')[0] + ' just joined!'; },
      sub:    function(d){ return d.email || 'New account created'; },
      rows: function(d) { return [
        { label:'Email',    val:d.email                            || '—', span:true  },
        { label:'User ID',  val:d.id                              || '—', span:false },
        { label:'Platform', val:d.platform                        || 'Web App', span:false },
        { label:'Joined',   val:_fmtTime(d.created_at||new Date()), span:false },
        { label:'Status',   val:'Account Active ✓',                span:false },
      ]; },
      grad:     'linear-gradient(135deg,#120b2e 0%,#1e1151 40%,#3b1e85 75%,#5b21b6 100%)',
      glow:     '#7c3aed',
      ring:     '#a78bfa',
      confetti: ['#8b5cf6','#a78bfa','#c4b5fd','#6366f1','#fff','#e879f9','#f0abfc'],
    },
    user_online: {
      icon: '🟢',
      badge: 'ONLINE NOW',
      badgeCol: '#34d399',
      title:  function(d){ return (d.name || (d.email||'').split('@')[0] || 'A user') + ' is online'; },
      sub:    function(d){ return d.email || d.id || 'Active user'; },
      rows: function(d) { return [
        { label:'Name',        val:d.name || d.email              || '—', span:false },
        { label:'Platform',    val:d.platform                     || 'Web', span:false },
        { label:'Last active', val:_fmtTime(d.last_active_at||new Date()), span:false },
        { label:'Session',     val:'Active session ✓',            span:false },
        { label:'Status',      val:'● Online right now',          span:false },
      ]; },
      grad:     'linear-gradient(135deg,#011a14 0%,#033d2b 40%,#065f46 75%,#059669 100%)',
      glow:     '#059669',
      ring:     '#34d399',
      confetti: ['#10b981','#34d399','#6ee7b7','#06b6d4','#fff','#bef264'],
    },
    user_offline: {
      icon: '👋',
      badge: 'WENT OFFLINE',
      badgeCol: '#94a3b8',
      title:  function(d){ return (d.name || (d.email||'').split('@')[0] || 'A user') + ' went offline'; },
      sub:    function(d){ return d.email || d.id || 'User'; },
      rows: function(d) { return [
        { label:'Name',      val:d.name || d.email                || '—', span:false },
        { label:'Platform',  val:d.platform                       || 'Web', span:false },
        { label:'Last seen', val:_fmtTime(d.last_active_at||new Date(d.ts||Date.now())), span:false },
        { label:'Session',   val:'Session ended',                 span:false },
        { label:'Status',    val:'⚫ Offline',                    span:false },
      ]; },
      grad:     'linear-gradient(135deg,#0d1117 0%,#161b22 40%,#1c2333 75%,#21262d 100%)',
      glow:     '#334155',
      ring:     '#64748b',
      confetti: [],
    },
    new_message: {
      icon: '✉️',
      badge: 'NEW MESSAGE',
      badgeCol: '#fb7185',
      title:  function(d){ return d.name || d.email || 'Someone sent a message'; },
      sub:    function(d){ return d.subject ? '"'+d.subject+'"' : 'Sent you a message'; },
      rows: function(d) { return [
        { label:'From',     val:d.name                            || '—', span:false },
        { label:'Email',    val:d.email                           || '—', span:false },
        { label:'Subject',  val:d.subject                        || '(No subject)', span:true },
        { label:'Message',  val:d.message ? d.message.slice(0,120)+(d.message.length>120?'…':'') : '(No preview)', span:true },
        { label:'Received', val:_fmtTime(d.created_at||new Date()), span:false },
      ]; },
      grad:     'linear-gradient(135deg,#1a060d 0%,#450b1a 40%,#7f1230 75%,#be123c 100%)',
      glow:     '#be123c',
      ring:     '#fb7185',
      confetti: ['#f43f5e','#fb7185','#fda4af','#fb923c','#fff','#fde047','#fbbf24'],
    },
    new_video: {
      icon: '▶',
      badge: 'NEW EPISODE',
      badgeCol: '#fbbf24',
      title:  function(d){ return d.title || 'New Episode Added'; },
      sub:    function(d){ return d.description ? d.description.slice(0,70)+'…' : 'IslamVoice episode is now live'; },
      rows: function(d) { return [
        { label:'Title',     val:d.title                          || '—', span:true  },
        { label:'Series',    val:d.series                        || 'IslamVoice', span:false },
        { label:'Duration',  val:d.duration                      || '—', span:false },
        { label:'Published', val:_fmtTime(d.created_at||new Date()), span:false },
        { label:'Status',    val:'🔥 Live now',                  span:false },
      ]; },
      grad:     'linear-gradient(135deg,#160d00 0%,#3d1f00 40%,#78350f 75%,#b45309 100%)',
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
    } catch(e){ return String(val); }
  }

  function _mk(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  /* ── online polling state ───────────────────────────────── */
  var _onlineMap    = {};   // userId → { name, platform, lastActiveAt, ts }
  var _prevIds      = null; // null = not yet fetched; Set after first fetch
  var _perUserShown = {};   // userId → timestamp of last popup shown
  var _pollTimer    = null;

  function _pollOnline() {
    var tok = sessionStorage.getItem('adminToken');
    if (!tok) return;

    fetch('/admin-users-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_online_users', token: tok })
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (!data.success) return;

      var users   = data.users || [];
      var newIds  = new Set((data.userIds || []));
      var userMap = {};
      users.forEach(function(u){ userMap[u.userId] = u; });

      if (_prevIds !== null) {
        /* users who just came online */
        newIds.forEach(function(id) {
          if (!_prevIds.has(id)) {
            var u   = userMap[id] || {};
            var gapOk = Date.now() - (_perUserShown[id]||0) > PER_USER_GAP_MS;
            if (gapOk) {
              _perUserShown[id] = Date.now();
              _enqueue('user_online', {
                id:             id,
                name:           u.name     || id,
                email:          u.name     || id,
                platform:       u.platform || 'Web',
                last_active_at: u.lastActiveAt,
                avatar:         u.avatar   || null,
              });
            }
          }
        });

        /* users who just went offline */
        _prevIds.forEach(function(id) {
          if (!newIds.has(id)) {
            var u = _onlineMap[id] || {};
            _enqueue('user_offline', {
              id:             id,
              name:           u.name     || id,
              email:          u.email    || id,
              platform:       u.platform || 'Web',
              last_active_at: u.lastActiveAt,
              avatar:         u.avatar   || null,
              ts:             Date.now(),
            });
            delete _onlineMap[id];
          }
        });
      }

      /* update local map */
      _prevIds = newIds;
      users.forEach(function(u) {
        _onlineMap[u.userId] = {
          name:          u.name,
          email:         u.name,
          platform:      u.platform,
          lastActiveAt:  u.lastActiveAt,
          avatar:        u.avatar || null,
          ts:            Date.now(),
        };
      });
    })
    .catch(function(e){ console.warn('[LiveAlerts] poll error:', e); });
  }

  function _startPolling() {
    if (_pollTimer) return;
    setTimeout(function() {
      _pollOnline();
      _pollTimer = setInterval(_pollOnline, POLL_ONLINE_MS);
    }, WARMUP_MS);
  }

  /* ── content polling (videos + messages + new users) ────── */
  var _lastVideoTime   = null;
  var _lastMsgTime     = null;
  var _lastUserTime    = null;
  var _contentTimer    = null;

  function _pollContent() {
    var sb = window._supabase;
    if (!sb) return;

    /* new episodes ------------------------------------------ */
    sb.from('islamvoice_episodes')
      .select('id,title,description,duration,created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(function(res) {
        if (res.error || !res.data || !res.data.length) return;
        if (_lastVideoTime === null) {
          /* first fetch — baseline, no popup */
          _lastVideoTime = res.data[0].created_at;
          return;
        }
        /* enqueue every episode newer than the last we saw */
        res.data.forEach(function(ep) {
          if (ep.created_at > _lastVideoTime) {
            _enqueue('new_video', ep);
          }
        });
        _lastVideoTime = res.data[0].created_at;
      });

    /* new contact messages ---------------------------------- */
    sb.from('contact_messages')
      .select('id,name,email,subject,message,created_at')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(function(res) {
        if (res.error || !res.data || !res.data.length) return;
        if (_lastMsgTime === null) {
          _lastMsgTime = res.data[0].created_at;
          return;
        }
        res.data.forEach(function(msg) {
          if (msg.created_at > _lastMsgTime) {
            _enqueue('new_message', msg);
          }
        });
        _lastMsgTime = res.data[0].created_at;
      });

    /* new user accounts ------------------------------------- */
    sb.from('user_data')
      .select('id,email,created_at')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(function(res) {
        if (res.error || !res.data || !res.data.length) return;
        if (_lastUserTime === null) {
          _lastUserTime = res.data[0].created_at;
          return;
        }
        res.data.forEach(function(u) {
          if (u.created_at > _lastUserTime) {
            _enqueue('user_joined', u);
          }
        });
        _lastUserTime = res.data[0].created_at;
      });
  }

  function _startContentPoll() {
    if (_contentTimer) return;
    /* stagger slightly after online poll to avoid simultaneous fetches */
    setTimeout(function() {
      _pollContent();
      _contentTimer = setInterval(_pollContent, POLL_CONTENT_MS);
    }, WARMUP_MS + 3000);
  }

  /* ── popup queue state ──────────────────────────────────── */
  var _queue      = [];
  var _showing    = false;
  var _el         = null;
  var _ticker     = null;
  var _startTime  = Date.now();

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
    if (!colors || !colors.length) return;
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

    var C = 2*Math.PI*24;

    var backdrop = _mk('div','la-backdrop');
    var card     = _mk('div','la-card');
    card.style.borderColor = cfg.ring+'28';
    card.style.boxShadow =
      '0 0 0 1px '+cfg.ring+'14,'+
      '0 32px 100px rgba(0,0,0,.5),'+
      '0 0 60px '+cfg.glow+'14';

    /* ── HEADER ── */
    var hdr = _mk('div','la-hdr');
    hdr.style.background = cfg.grad;

    /* topbar */
    var topbar = _mk('div','la-topbar');

    var badge = _mk('div','la-badge');
    badge.style.color       = cfg.badgeCol;
    badge.style.background  = cfg.badgeCol+'1e';
    badge.style.borderColor = cfg.badgeCol+'4a';
    var bdot = _mk('span','la-bdot');
    bdot.style.background = cfg.badgeCol;
    badge.appendChild(bdot);
    badge.appendChild(document.createTextNode(' '+cfg.badge));
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

    /* hero */
    var hero = _mk('div','la-hero');
    var iw = _mk('div','la-iw');
    iw.style.background = cfg.glow+'28';
    iw.style.boxShadow  = '0 0 0 10px '+cfg.glow+'18,0 0 36px '+cfg.glow+'28';

    var hasAvatar = (type==='user_online'||type==='user_offline') && data.avatar;
    if (hasAvatar) {
      var img = _mk('img','la-avatar');
      img.src = data.avatar;
      img.alt = data.name || 'User';
      img.onerror = function() {
        iw.removeChild(img);
        iw.appendChild(Object.assign(_mk('div','la-icon'),{textContent:cfg.icon}));
      };
      iw.appendChild(img);
      /* status dot overlay */
      var sdot = _mk('span','la-sdot');
      sdot.style.background = type==='user_online' ? '#22c55e' : '#64748b';
      iw.appendChild(sdot);
    } else {
      iw.appendChild(Object.assign(_mk('div','la-icon'),{textContent:cfg.icon}));
    }
    hero.appendChild(iw);

    var ht = _mk('div','la-ht');
    Object.assign(_mk('div','la-ttl'),{textContent:String(cfg.title(data))});
    ht.appendChild(Object.assign(_mk('div','la-ttl'),{textContent:String(cfg.title(data))}));
    ht.appendChild(Object.assign(_mk('div','la-sb'),{textContent:String(cfg.sub(data))}));
    hero.appendChild(ht);
    hdr.appendChild(hero);
    card.appendChild(hdr);

    /* ── BODY ── */
    var body = _mk('div','la-body');
    body.appendChild(Object.assign(_mk('div','la-seclbl'),{textContent:'Event Details'}));

    var grid = _mk('div','la-grid');
    cfg.rows(data).forEach(function(row){
      var item = _mk('div','la-item');
      if (row.span) item.classList.add('la-span');
      item.appendChild(Object.assign(_mk('div','la-lbl'),{textContent:row.label}));
      item.appendChild(Object.assign(_mk('div','la-val'),{textContent:String(row.val||'—')}));
      grid.appendChild(item);
    });
    body.appendChild(grid);

    var pill = _mk('div','la-pill');
    var pd = _mk('span','la-pd');
    pd.style.background = cfg.ring;
    pill.appendChild(pd);
    pill.appendChild(Object.assign(_mk('span','la-pt'),{
      textContent: type==='user_offline'
        ? 'Session ended  ·  detected via activity timeout'
        : 'Live event  ·  received just now  ·  real-time via Supabase'
    }));
    body.appendChild(pill);
    card.appendChild(body);

    /* ── FOOTER ── */
    var foot = _mk('div','la-foot');

    var ringWrap = _mk('div','la-rw');
    ringWrap.innerHTML =
      '<svg class="la-ring" viewBox="0 0 56 56" fill="none">'+
        '<circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,.1)" stroke-width="3.5" fill="none"/>'+
        '<circle id="la_rc" cx="28" cy="28" r="24"'+
          ' stroke="'+cfg.ring+'" stroke-width="3.5" fill="none" stroke-linecap="round"'+
          ' stroke-dasharray="'+C.toFixed(2)+'" stroke-dashoffset="0"'+
          ' transform="rotate(-90 28 28)" style="transition:stroke-dashoffset 1s linear;"/>'+
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

    var btn = _mk('button','la-dismiss');
    btn.style.background = cfg.glow;
    btn.style.boxShadow  = '0 4px 20px '+cfg.glow+'44';
    btn.textContent = 'Got it  ✓';
    btn.addEventListener('click',_dismiss);
    foot.appendChild(btn);
    card.appendChild(foot);

    /* progress bar */
    var pgw = _mk('div','la-pgw');
    var pgb = _mk('div','la-pgb');
    pgb.id = 'la_pgb';
    pgb.style.background = 'linear-gradient(90deg,'+cfg.glow+'99,'+cfg.ring+')';
    pgw.appendChild(pgb); card.appendChild(pgw);

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    _el = backdrop;

    /* reset bar */
    pgb.style.transition='none'; pgb.style.width='100%';
    pgb.getBoundingClientRect();
    pgb.style.transition='';

    /* confetti (skip for offline) */
    if (cfg.confetti.length) setTimeout(function(){_burst(card,cfg.confetti);},70);

    /* countdown */
    _secsLeft = DURATION;
    var rc=document.getElementById('la_rc');
    var rt=document.getElementById('la_rt');
    var fn=document.getElementById('la_fn');
    var pb=document.getElementById('la_pgb');

    _ticker = setInterval(function(){
      _secsLeft--;
      var pct=_secsLeft/DURATION;
      if(rc) rc.style.strokeDashoffset=(C*(1-pct)).toFixed(2);
      if(rt) rt.textContent=_secsLeft;
      if(fn) fn.textContent=_secsLeft+'s';
      if(pb) pb.style.width=(pct*100).toFixed(1)+'%';
      if(_secsLeft<=0){_killTicker();_close(_next);}
    },1000);
  }

  var _secsLeft = 0;

  /* ── lifecycle ───────────────────────────────────────────── */
  function _dismiss(){ _killTicker(); _close(_next); }
  function _close(cb){
    if(!_el){if(cb)cb();return;}
    _el.classList.add('la-out');
    var c=_el.querySelector('.la-card');
    if(c)c.classList.add('la-card-out');
    setTimeout(function(){_remove();if(cb)cb();},340);
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

      '.la-backdrop{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;',
        'background:rgba(4,3,18,.38);',
        'backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);',
        'animation:la-bd-in .24s ease forwards;padding:16px;box-sizing:border-box;}',
      '.la-backdrop.la-out{animation:la-bd-out .32s ease forwards;}',

      '.la-card{position:relative;overflow:hidden;width:min(600px,100%);',
        'max-height:calc(100dvh - 32px);display:flex;flex-direction:column;',
        'background:rgba(11,10,26,.96);',
        'border:1px solid rgba(255,255,255,.09);border-radius:28px;',
        'animation:la-ci .5s cubic-bezier(.22,1,.36,1) forwards;}',
      '.la-card.la-card-out{animation:la-co .3s cubic-bezier(.55,0,1,.8) forwards!important;}',

      '.la-hdr{position:relative;z-index:1;flex-shrink:0;padding:20px 20px 22px;border-radius:28px 28px 0 0;overflow:hidden;}',

      '.la-topbar{position:relative;z-index:2;display:flex;align-items:center;gap:7px;margin-bottom:16px;}',
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

      '.la-hero{position:relative;z-index:2;display:flex;align-items:flex-start;gap:16px;}',
      '.la-iw{width:68px;height:68px;border-radius:20px;flex-shrink:0;position:relative;',
        'display:flex;align-items:center;justify-content:center;',
        'animation:la-pulse 2.8s ease-in-out infinite;overflow:visible;}',
      '.la-icon{font-size:2.2rem;line-height:1;user-select:none;}',
      '.la-avatar{width:100%;height:100%;object-fit:cover;border-radius:18px;display:block;}',
      '.la-sdot{position:absolute;bottom:-3px;right:-3px;width:16px;height:16px;',
        'border-radius:50%;border:2.5px solid rgba(11,10,26,.96);',
        'animation:la-pulse 2s ease-in-out infinite;}',
      '.la-ht{flex:1;min-width:0;padding-top:4px;}',
      '.la-ttl{font-size:1.3rem;font-weight:900;color:#fff;letter-spacing:-.028em;line-height:1.25;',
        'margin-bottom:5px;text-shadow:0 2px 16px rgba(0,0,0,.4);',
        'word-break:break-word;overflow-wrap:anywhere;}',
      '.la-sb{font-size:.83rem;color:rgba(255,255,255,.5);line-height:1.45;',
        'word-break:break-word;overflow-wrap:anywhere;}',

      '.la-body{position:relative;z-index:1;flex:1;overflow-y:auto;padding:18px 20px 6px;',
        'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent;}',
      '.la-body::-webkit-scrollbar{width:4px;}',
      '.la-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px;}',

      '.la-seclbl{font-size:.6rem;font-weight:700;letter-spacing:.14em;',
        'color:rgba(255,255,255,.2);text-transform:uppercase;margin-bottom:10px;}',

      '.la-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px;}',
      '.la-item{background:rgba(255,255,255,.042);border:1px solid rgba(255,255,255,.07);',
        'border-radius:12px;padding:9px 12px;min-width:0;}',
      '.la-span{grid-column:1/-1;}',
      '.la-lbl{font-size:.62rem;font-weight:700;letter-spacing:.1em;',
        'color:rgba(255,255,255,.26);text-transform:uppercase;margin-bottom:3px;}',
      '.la-val{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.84);line-height:1.45;',
        'word-break:break-word;overflow-wrap:anywhere;',
        'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;}',
      '.la-span .la-val{-webkit-line-clamp:3;}',

      '.la-pill{display:flex;align-items:center;gap:7px;margin-bottom:14px;',
        'padding:7px 12px;background:rgba(255,255,255,.028);',
        'border:1px solid rgba(255,255,255,.055);border-radius:10px;}',
      '.la-pd{width:6px;height:6px;border-radius:50%;flex-shrink:0;animation:la-blink .85s ease-in-out infinite;}',
      '.la-pt{font-size:.7rem;color:rgba(255,255,255,.3);word-break:break-word;}',

      '.la-foot{position:relative;z-index:1;display:flex;align-items:center;gap:12px;',
        'padding:12px 20px 14px;border-top:1px solid rgba(255,255,255,.065);flex-shrink:0;}',
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

      '.la-pgw{height:3px;background:rgba(255,255,255,.05);flex-shrink:0;}',
      '.la-pgb{height:100%;width:100%;transition:width 1s linear;}',
      '.la-cp{position:absolute;pointer-events:none;will-change:transform,opacity;}',

      '@media(max-width:480px){',
        '.la-ttl{font-size:1.08rem;}',
        '.la-hero{gap:12px;}',
        '.la-iw{width:54px;height:54px;}',
        '.la-icon{font-size:1.75rem;}',
        '.la-grid{grid-template-columns:1fr;}',
        '.la-span{grid-column:auto;}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  function _init(){
    /* online/offline: poll /admin-users-data every 30s */
    _startPolling();

    /* videos, messages, new users: poll Supabase directly every 45s */
    if (window._supabase) { _startContentPoll(); return; }
    var n=0, wait=setInterval(function(){
      if (window._supabase) { clearInterval(wait); _startContentPoll(); }
      else if (++n > 60)    { clearInterval(wait); console.warn('[LiveAlerts] _supabase unavailable'); }
    }, 500);
  }

  /* ── public API ─────────────────────────────────────────── */
  window._AdminLiveAlerts={
    test:function(type,data){
      var def={
        user_joined: {id:'usr_xk9201',email:'sara.ahmed@example.com',created_at:new Date(),platform:'iOS App'},
        user_online:  {id:'usr_mh7743',name:'Mohammed Khalid',email:'mohammed@example.com',platform:'iOS',last_active_at:new Date(),avatar:'https://i.pravatar.cc/150?u=mh7743'},
        user_offline: {id:'usr_mh7743',name:'Mohammed Khalid',email:'mohammed@example.com',platform:'iOS',last_active_at:new Date(Date.now()-13*60*1000),ts:Date.now()-13*60*1000,avatar:'https://i.pravatar.cc/150?u=mh7743'},
        new_message:  {name:'Ahmed Hassan',email:'ahmed@example.com',subject:'Question about the Quran app',message:'As-salamu alaykum, I wanted to ask about the Quran recitation feature and whether it supports multiple reciters. Jazakallah khair!',created_at:new Date()},
        new_video:    {id:'ep_034',title:'Tafsir Al-Baqarah — Episode 12',series:'IslamVoice',duration:'42:18',created_at:new Date()},
      };
      _enqueue(type||'user_joined',data||def[type]||def.user_joined);
    },
    demo:function(){
      ['user_joined','user_online','user_offline','new_message','new_video'].forEach(function(t,i){
        setTimeout(function(){window._AdminLiveAlerts.test(t);},i*1000);
      });
    },
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',_init);
  } else { _init(); }
})();
