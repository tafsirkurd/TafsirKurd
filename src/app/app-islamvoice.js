'use strict';

/* ===== ISLAMVOICE ===== */
var IV_CONFIG_URL='https://tafsirkurd.com/config';

// Callback queue: all callers that arrive while init is in-flight get queued here
// and fired together when the config fetch resolves or fails — no polling needed.
var _ivInitCbs=[];

function initIslamVoice(cb){
  // Already ready — fire immediately
  if(S.ivSupabase){if(cb)cb();return;}

  // In-flight — queue this callback and return; first fetch will fire it
  if(S.ivInited){if(cb)_ivInitCbs.push(cb);return;}
  S.ivInited=true;

  // Reuse shared Supabase client if already created (common case after first launch)
  if(S.supabase){
    S.ivSupabase=S.supabase;
    if(cb)cb();
    var _q=_ivInitCbs.splice(0);_q.forEach(function(fn){try{fn();}catch(e){}});
    return;
  }

  if(!window.supabase){
    console.error('Supabase JS not loaded');
    S.ivInited=false;
    _ivInitCbs=[];
    renderIvError(tSafe('iv.error.supabase'),'server');
    return;
  }

  if(cb)_ivInitCbs.push(cb);

  var _ivCfgCtrl=new AbortController();
  var _ivCfgTid=setTimeout(function(){_ivCfgCtrl.abort();},12000);
  var _ivCfgT0=Date.now();
  fetch(IV_CONFIG_URL,{signal:_ivCfgCtrl.signal}).then(function(r){
    clearTimeout(_ivCfgTid);
    AndroidLog.fetch(IV_CONFIG_URL,r.status,'iv-config',false,Date.now()-_ivCfgT0);
    if(!r.ok)throw new Error('Config HTTP '+r.status);
    return r.json();
  }).then(function(cfg){
    if(cfg.supabaseUrl&&cfg.supabaseKey){
      S.ivSupabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
      if(!S.supabase){S.supabase=S.ivSupabase;window._appSupabase=S.ivSupabase;_notifySupabaseReady();}
      // Fire all queued callbacks — they will each call ivFetchFresh
      var _q=_ivInitCbs.splice(0);_q.forEach(function(fn){try{fn();}catch(e){}});
    }else{
      throw new Error('Missing supabaseUrl/supabaseKey');
    }
  }).catch(function(e){
    clearTimeout(_ivCfgTid);
    AndroidLog.fetch(IV_CONFIG_URL,0,'iv-config',false,Date.now()-_ivCfgT0,e);
    console.error('IslamVoice init error:',e);
    S.ivInited=false;
    var _pendingCbs=_ivInitCbs.splice(0); // clear before any render so re-entrant calls queue fresh
    try{
      var cs=localStorage.getItem('iv_series_cache');
      var ce=localStorage.getItem('iv_episodes_cache');
      if(cs&&ce){S.ivSeries=JSON.parse(cs);S.ivEpisodes=JSON.parse(ce);renderIvGrid();_pendingCbs.forEach(function(fn){try{fn();}catch(e){}});return;}
    }catch(err){}
    renderIvError(tSafe('iv.error.server'),!navigator.onLine?'offline':'server');
    _pendingCbs.forEach(function(fn){try{fn();}catch(e){}});
  });
}

function renderIvError(msg,type){
  // Never show full-page error when we already have videos to display
  if(S.ivSeries&&S.ivSeries.length){renderIvBanner(msg);return;}
  $('ivLoading').classList.remove('on');
  var grid=$('ivGrid');
  clear(grid);
  grid.style.display='';

  var isOffline=!navigator.onLine||type==='offline';
  var isTimeout=type==='timeout';

  // Outer wrapper
  var wrap=el('div','iv-state-wrap');
  var card=el('div','iv-state-card');

  // Icon circle
  var icoWrap=el('div','iv-state-ico '+(isOffline?'iv-state-ico--off':'iv-state-ico--err'));
  var icoName=isOffline?'fas fa-plug':(isTimeout?'fas fa-clock':'fas fa-circle-exclamation');
  icoWrap.appendChild(icon(icoName));
  card.appendChild(icoWrap);

  // Title
  var titleText=isOffline?(tSafe('iv.error.offline_title')||'ئینتەرنێت نیە'):(isTimeout?(tSafe('iv.error.timeout_title')||'وەخت تەواو بوو'):(tSafe('iv.error.title')||'کێشەیەک هەیە'));
  card.appendChild(el('div','iv-state-title',titleText));

  // Subtitle — show the technical message only if no i18n title was resolved
  var subText=msg||tSafe('error.occurred')||'تکایە دووبارە هەوڵبدەوە';
  card.appendChild(el('div','iv-state-sub',subText));

  // Retry button
  var btn=el('button','iv-state-btn');
  var btnIco=icon('fas fa-arrows-rotate');
  btn.appendChild(btnIco);
  btn.appendChild(document.createTextNode(' '+(tSafe('iv.retry')||'دووبارە هەوڵبدەوە')));
  on(btn,'click',function(){
    S.ivInited=false;S.ivSupabase=null;
    loadIslamVoiceData(true);
  });
  card.appendChild(btn);

  wrap.appendChild(card);
  grid.appendChild(wrap);
}

function renderIvBanner(msg){
  var existing=document.getElementById('ivWarnBanner');
  if(existing&&existing.parentNode)existing.parentNode.removeChild(existing);
  var grid=$('ivGrid');
  if(!grid)return;
  $('ivLoading').classList.remove('on');
  grid.style.display='';

  var banner=el('div','iv-notice');
  banner.id='ivWarnBanner';

  // Icon circle
  var icoWrap=el('div','iv-notice-ico');
  icoWrap.appendChild(icon('fas fa-triangle-exclamation'));
  banner.appendChild(icoWrap);

  // Text
  banner.appendChild(el('span','iv-notice-text',msg||tSafe('iv.partial_load_warn')||'داتا پۆڵەکی بارکرا'));

  // Retry
  var retryBtn=el('button','iv-notice-btn');
  retryBtn.textContent=tSafe('iv.retry')||'نوێکردنەوە';
  on(retryBtn,'click',function(){
    if(banner.parentNode)banner.parentNode.removeChild(banner);
    ivFetchFresh(true);
  });
  banner.appendChild(retryBtn);

  if(grid.firstChild)grid.insertBefore(banner,grid.firstChild);
  else grid.appendChild(banner);
}

// Episodes grouped by series_id — avoids O(series*episodes) filter on every renderIvGrid call.
var _ivEpsBySeriesId=null;
function _buildIvEpsCache(){
  _ivEpsBySeriesId={};
  if(!S.ivEpisodes)return;
  S.ivEpisodes.forEach(function(ep){
    if(!_ivEpsBySeriesId[ep.series_id])_ivEpsBySeriesId[ep.series_id]=[];
    _ivEpsBySeriesId[ep.series_id].push(ep);
  });
}

// Explicitly preload IV series thumbnails using new Image() so they fetch
// even when the IV panel is hidden (display:none blocks normal img fetches).
// Keep references in _preloadedIvImages to prevent GC clearing the cache.
var _preloadedIvImages=[];
function preloadIvThumbnails(){
  if(!S.ivSeries||!S.ivSeries.length)return;
  _preloadedIvImages=[];
  var sorted=S.ivSeries.slice().sort(function(a,b){return(a.display_order||999)-(b.display_order||999);});
  sorted.slice(0,6).forEach(function(series){
    if(!series.thumbnail_url)return;
    var src=series.thumbnail_url.replace('maxresdefault.jpg','mqdefault.jpg');
    var img=new Image();
    img.src=src;
    _preloadedIvImages.push(img);
  });
  console.log('[Startup] Preloading',_preloadedIvImages.length,'IV thumbnails');
}

function loadIslamVoiceData(force){
  // Always pre-populate from cache into memory — even on force=true — so that
  // a network failure degrades to an inline banner rather than a blank error page.
  if(!S.ivSeries){
    try{
      var cs=localStorage.getItem('iv_series_cache');
      var ce=localStorage.getItem('iv_episodes_cache');
      if(cs&&ce){S.ivSeries=JSON.parse(cs);S.ivEpisodes=JSON.parse(ce);_buildIvEpsCache();}
    }catch(e){}
  }

  // Only show loading spinner when we have no data at all.
  if(!S.ivSeries||!S.ivSeries.length){
    renderIvLoading();
  }

  // Render cached data immediately for instant display (non-force)
  if(!force&&S.ivSeries&&S.ivSeries.length){
    renderIvGrid();
    preloadIvThumbnails();
    if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
  }

  // If offline and we already have something to show, stop here
  if(!navigator.onLine&&S.ivSeries&&S.ivSeries.length){
    if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
    return;
  }

  // Fetch fresh from Supabase
  if(!S.ivSupabase){
    initIslamVoice(function(){ivFetchFresh(force)});
    return;
  }
  ivFetchFresh(force);
}

function ivFetchFresh(force){
  if(!S.ivSupabase)return;
  if(S.ivLoading&&!force)return; // in-flight guard — prevent duplicate fetches
  S.ivLoading=true;
  _ivEpsBySeriesId=null; // invalidate cache — fresh data incoming
  var _ivFetchT0=Date.now();

  var _ivTimeout=new Promise(function(_,rej){setTimeout(function(){rej(new Error('iv_timeout'));},15000);});
  Promise.race([
    Promise.all([
      S.ivSupabase.from('islamvoice_series').select('*').order('display_order',{ascending:true}),
      S.ivSupabase.from('islamvoice_episodes').select('*').or('is_published.eq.true,is_published.is.null').order('episode_number',{ascending:true})
    ]),
    _ivTimeout
  ]).then(function(results){
    var seriesRes=results[0];
    var epRes=results[1];
    S.ivLoading=false;

    if(seriesRes.error||epRes.error){
      console.error('IV load error:',seriesRes.error||epRes.error);
      if(S.ivSeries&&S.ivSeries.length){
        renderIvBanner(tSafe('iv.partial_load_warn'));
      }else{
        renderIvError(tSafe('iv.error.load'),!navigator.onLine?'offline':null);
      }
      if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
      return;
    }

    AndroidLog.fetch('supabase:islamvoice',200,'islamvoice',false,Date.now()-_ivFetchT0);
    S.ivSeries=seriesRes.data||[];
    S.ivEpisodes=epRes.data||[];
    _buildIvEpsCache();
    _ivHeroInvalidate(); // fresh data → pick new random slides next render

    // Cache
    try{
      localStorage.setItem('iv_series_cache',JSON.stringify(S.ivSeries));
      localStorage.setItem('iv_episodes_cache',JSON.stringify(S.ivEpisodes));
    }catch(e){console.warn('IV cache save failed')}

    // Remove any lingering warning banner — fetch succeeded
    var _wb=document.getElementById('ivWarnBanner');
    if(_wb&&_wb.parentNode)_wb.parentNode.removeChild(_wb);

    renderIvGrid();
    preloadIvThumbnails(); // refresh preload cache with latest data
    if(S.ivCurrentSeries)renderIvEpisodes(S.ivCurrentSeries);
    if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
  }).catch(function(e){
    S.ivLoading=false;
    AndroidLog.fetch('supabase:islamvoice',0,'islamvoice',false,Date.now()-_ivFetchT0,e);
    console.error('IV fetch error:',e);
    var _errType=(e&&e.message==='iv_timeout')?'timeout':(!navigator.onLine?'offline':null);
    if(S.ivSeries&&S.ivSeries.length){
      renderIvBanner(tSafe('iv.partial_load_warn'));
    }else{
      renderIvError(tSafe('iv.error.load_retry'),_errType);
    }
    if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
  });
}

function renderIslamVoice(){
  if(S.ivSeries&&S.ivSeries.length){
    renderIvGrid();
    // Also refresh in background
    if(!S.ivLoading)loadIslamVoiceData(false);
  }else if(!S.ivLoading){
    loadIslamVoiceData(false);
  }
}

function renderIvLoading(){
  var grid=$('ivGrid');
  clear(grid);
  grid.style.display='none';
  var ld=$('ivLoading');
  clear(ld);
  ld.classList.add('on');
  // Skeleton: 6 cards matching the 2-column iv-grid layout
  var wrap=el('div','iv-skel');
  function sk(cls){var e=document.createElement('div');e.className=cls+' skel-block';return e;}
  for(var i=0;i<6;i++){
    var card=el('div','iv-skel-card');
    card.appendChild(sk('iv-skel-thumb'));
    var body=el('div','iv-skel-body');
    body.appendChild(sk('iv-skel-title'));
    body.appendChild(sk('iv-skel-title2'));
    body.appendChild(sk('iv-skel-speaker'));
    card.appendChild(body);
    wrap.appendChild(card);
  }
  ld.appendChild(wrap);
}

var _ivHeroTimer=null;
var _ivHeroIdx=0;
var _ivHeroSlides=[];
var _ivHeroBuilt=false;
var _ivHeroTrackEl=null;
var _ivHeroDotsEls=null;
var _ivHeroTouchListened=false;
var _ivHeroDragActive=false,_ivHeroDragDecided=false,_ivHeroDragHoriz=false;
var _ivHeroDragSX=0,_ivHeroDragSY=0;
var _ivHeroVx=0,_ivHeroVtLast=0,_ivHeroXLast=0;

function _ivThumb(url){
  // mqdefault (320×180) — already warmed by preloadIvThumbnails(), best quality/size balance
  return (url||'').replace('maxresdefault.jpg','mqdefault.jpg').replace('hqdefault.jpg','mqdefault.jpg');
}

function renderIvHero(){
  var hero=$('ivHero');
  if(!hero)return;

  // Hide hero when search is active
  var q=S.ivSearchQuery||'';
  var spkFilter=S.ivSpeakerFilter||null;
  if(q||spkFilter){hero.style.display='none';return;}

  // Don't rebuild if already built (going back from series, background refresh, etc.)
  if(_ivHeroBuilt&&_ivHeroSlides.length){
    hero.style.display='';
    _ivHeroResetTimer();
    return;
  }

  var track=$('ivHeroTrack');
  var dotsEl=$('ivHeroDots');
  if(!track||!dotsEl)return;

  // Pick one random episode per series, shuffle, take up to 5
  var all=[];
  if(S.ivEpisodes&&S.ivSeries){
    var seriesMap={};
    S.ivSeries.forEach(function(s){seriesMap[s.id]=s;});
    // Pick the most recent episode per series; fall back to episode thumbnail if series has none
    var bestEpMap={};
    S.ivEpisodes.forEach(function(ep){
      var ser=seriesMap[ep.series_id];
      if(!ser)return;
      var prev=bestEpMap[ep.series_id];
      if(!prev||(ep.created_at&&ep.created_at>prev.created_at))bestEpMap[ep.series_id]=ep;
    });
    Object.keys(bestEpMap).forEach(function(sid){
      var ep=bestEpMap[sid],ser=seriesMap[sid];
      var thumb=ser.thumbnail_url||(ep&&ep.thumbnail_url)||'';
      if(thumb)all.push({ep:ep,series:ser});
    });
  }
  if(all.length<2){hero.style.display='none';return;}

  // Shuffle and take 5
  for(var i=all.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=all[i];all[i]=all[j];all[j]=tmp;}
  _ivHeroSlides=all.slice(0,5);
  _ivHeroIdx=0;

  // Preload all thumbnails immediately so iOS WKWebView has them in cache
  _ivHeroSlides.forEach(function(item){
    var pi=new Image();
    pi.src=_ivThumb(item.series.thumbnail_url||(item.ep&&item.ep.thumbnail_url)||'');
  });

  hero.style.display='';
  clear(track);
  clear(dotsEl);
  _ivHeroDotsEls=null;

  _ivHeroSlides.forEach(function(item,idx){
    var ser=item.series;
    var ep=item.ep;
    var _rawThumb=ser.thumbnail_url||(ep&&ep.thumbnail_url)||'';
    var thumb=(_rawThumb||'').replace('mqdefault.jpg','maxresdefault.jpg').replace('hqdefault.jpg','maxresdefault.jpg').replace('sddefault.jpg','maxresdefault.jpg')||_rawThumb;

    var slide=document.createElement('div');
    slide.className='iv-hero-slide';

    var bg=document.createElement('div');
    bg.className='iv-hero-bg';
    bg.style.backgroundImage='url('+thumb+')';
    slide.appendChild(bg);

    var imgWrap=document.createElement('div');
    imgWrap.className='iv-hero-img';
    imgWrap.style.backgroundImage='url('+thumb+')';
    slide.appendChild(imgWrap);

    var grad=document.createElement('div');
    grad.className='iv-hero-gradient';
    slide.appendChild(grad);

    var content=document.createElement('div');
    content.className='iv-hero-content';

    var playBtn=document.createElement('div');
    playBtn.className='iv-hero-play';
    var playI=document.createElement('i');
    playI.className='fas fa-play';
    playBtn.appendChild(playI);

    var info=document.createElement('div');
    info.className='iv-hero-info';
    var epTitle=document.createElement('div');
    epTitle.className='iv-hero-ep';
    epTitle.textContent=ep.title_ku||ep.title||'';
    var seriesName=document.createElement('div');
    seriesName.className='iv-hero-series';
    seriesName.textContent=ser.name_ku||ser.name||'';
    info.appendChild(epTitle);
    info.appendChild(seriesName);
    if(ser.speaker){
      var spk=document.createElement('div');
      spk.className='iv-hero-speaker';
      spk.textContent=ser.speaker;
      info.appendChild(spk);
    }
    content.appendChild(playBtn);
    content.appendChild(info);
    slide.appendChild(content);

    (function(sid){slide.addEventListener('click',function(){App.ivShowSeries(sid);});})(ser.id);
    track.appendChild(slide);
  });

  // page is dir=rtl so flex items go right-to-left; first appended = rightmost.
  // Loop 0→count-1 so dot[0] (active) is appended first = rightmost.
  _ivHeroDotsEls=new Array(_ivHeroSlides.length);
  for(var di=0;di<_ivHeroSlides.length;di++){
    (function(idx){
      var dot=document.createElement('div');
      dot.className='iv-hero-dot'+(idx===0?' on':'');
      dotsEl.appendChild(dot);
      _ivHeroDotsEls[idx]=dot;
    })(di);
  }

  _ivHeroTrackEl=track;

  // Attach touch listeners once — reusing the same hero element across rebuilds
  if(!_ivHeroTouchListened){
    _ivHeroTouchListened=true;
    hero.addEventListener('touchstart',function(e){
      if(!_ivHeroSlides.length)return;
      _ivHeroDragActive=true;_ivHeroDragDecided=false;_ivHeroDragHoriz=false;
      _ivHeroDragSX=e.touches[0].clientX;_ivHeroDragSY=e.touches[0].clientY;
      _ivHeroVx=0;_ivHeroVtLast=performance.now();_ivHeroXLast=_ivHeroDragSX;
      if(_ivHeroTimer){clearInterval(_ivHeroTimer);_ivHeroTimer=null;}
    },{passive:true});
    hero.addEventListener('touchmove',function(e){
      if(!_ivHeroDragActive||!_ivHeroSlides.length)return;
      var cx=e.touches[0].clientX,cy=e.touches[0].clientY;
      var dx=cx-_ivHeroDragSX,dy=cy-_ivHeroDragSY;
      if(!_ivHeroDragDecided){
        if(Math.abs(dx)<5&&Math.abs(dy)<5)return;
        _ivHeroDragDecided=true;
        _ivHeroDragHoriz=Math.abs(dx)>=Math.abs(dy);
        if(!_ivHeroDragHoriz){_ivHeroDragActive=false;_ivHeroResetTimer();return;}
      }
      if(!_ivHeroDragHoriz)return;
      if(e.cancelable)e.preventDefault();
      var now=performance.now(),dt=now-_ivHeroVtLast;
      if(dt>0)_ivHeroVx=(cx-_ivHeroXLast)/dt;
      _ivHeroVtLast=now;_ivHeroXLast=cx;
    },{passive:false});
    hero.addEventListener('touchend',function(e){
      if(!_ivHeroDragActive)return;
      _ivHeroDragActive=false;
      if(!_ivHeroDragDecided||!_ivHeroDragHoriz||!_ivHeroSlides.length){_ivHeroResetTimer();return;}
      var endX=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientX:_ivHeroDragSX;
      var delta=endX-_ivHeroDragSX;
      var vxFresh=(performance.now()-_ivHeroVtLast)<80?_ivHeroVx:0;
      var flick=Math.abs(vxFresh)>0.3;
      if(flick||Math.abs(delta)>40){
        /* RTL: swipe right (delta>0 / vx>0) = next (+1), swipe left = prev (-1) */
        var dir=vxFresh!==0?(vxFresh>0?1:-1):(delta>0?1:-1);
        _ivHeroGoTo(_ivHeroIdx+dir);
      }
      _ivHeroResetTimer();
    },{passive:false});
    hero.addEventListener('touchcancel',function(){
      _ivHeroDragActive=false;
      _ivHeroResetTimer();
    },{passive:false});
  }

  _ivHeroBuilt=true;
  _ivHeroGoTo(0);
  _ivHeroResetTimer();
}

// Call this when data reloads so hero picks fresh random slides next time
function _ivHeroInvalidate(){_ivHeroBuilt=false;_ivHeroSlides=[];if(_ivHeroTimer){clearInterval(_ivHeroTimer);_ivHeroTimer=null;}}

function _ivHeroGoTo(idx){
  if(!_ivHeroSlides.length||!_ivHeroTrackEl)return;
  _ivHeroIdx=(idx+_ivHeroSlides.length)%_ivHeroSlides.length;
  var slides=_ivHeroTrackEl.querySelectorAll('.iv-hero-slide');
  slides.forEach(function(s,i){s.classList.toggle('iv-hero-active',i===_ivHeroIdx);});
  if(_ivHeroDotsEls)_ivHeroDotsEls.forEach(function(d,i){d.classList.toggle('on',i===_ivHeroIdx);});
}

function _ivHeroResetTimer(){
  if(_ivHeroTimer)clearInterval(_ivHeroTimer);
  _ivHeroTimer=setInterval(function(){_ivHeroGoTo(_ivHeroIdx+1);},4500);
}

function renderIvGrid(){
  $('ivLoading').classList.remove('on');
  renderIvHero();
  var grid=$('ivGrid');
  clear(grid);
  grid.style.display='';

  if(!S.ivSeries||!S.ivSeries.length){
    var empty=el('div','iv-empty');
    empty.appendChild(icon('fas fa-video'));
    empty.appendChild(el('p','',t('iv.no_series')));
    var refreshBtn=el('button','iv-refresh');
    refreshBtn.appendChild(icon('fas fa-sync-alt'));
    refreshBtn.appendChild(document.createTextNode(' '+t('iv.refresh')));
    on(refreshBtn,'click',function(){loadIslamVoiceData(true)});
    empty.appendChild(refreshBtn);
    grid.appendChild(empty);
    return;
  }

  // Sort by latest episode date (newest series first), fallback to display_order
  var _now24h=Date.now()-86400000;
  var sorted=S.ivSeries.slice().sort(function(a,b){
    var epsA=_ivEpsBySeriesId?(_ivEpsBySeriesId[a.id]||[]):[];
    var epsB=_ivEpsBySeriesId?(_ivEpsBySeriesId[b.id]||[]):[];
    function maxDate(eps){
      var m=0;
      for(var i=0;i<eps.length;i++){
        var t2=eps[i].created_at?new Date(eps[i].created_at).getTime():0;
        if(t2>m)m=t2;
      }
      return m;
    }
    var da=maxDate(epsA)||0;
    var db=maxDate(epsB)||0;
    if(da!==db)return db-da;
    return(a.display_order||999)-(b.display_order||999);
  });

  var q=S.ivSearchQuery||'';
  var spkFilter=S.ivSpeakerFilter||null;

  // Update filter button active state
  var spkBtn=document.getElementById('ivSpeakerFilterBtn');
  if(spkBtn)spkBtn.classList.toggle('on',!!spkFilter);

  var _ivCardIdx=0; // counts actually-rendered cards (for eager/lazy decision)
  sorted.forEach(function(series){
    var eps=_ivEpsBySeriesId?(_ivEpsBySeriesId[series.id]||[]):(S.ivEpisodes?S.ivEpisodes.filter(function(ep){return ep.series_id===series.id}):[]);
    var epCount=eps.length;
    if(epCount===0)return;

    // Filter by speaker
    if(spkFilter&&(series.speaker||'')!==spkFilter)return;

    // Filter by search query
    if(q){
      var seriesMatch=(series.name_ku||series.name||'').toLowerCase().indexOf(q)!==-1
        ||(series.speaker||'').toLowerCase().indexOf(q)!==-1
        ||(series.description_ku||'').toLowerCase().indexOf(q)!==-1;
      var epMatch=eps.some(function(ep){
        return(ep.title_ku||ep.title||'').toLowerCase().indexOf(q)!==-1;
      });
      if(!seriesMatch&&!epMatch)return;
    }

    var card=el('div','iv-card');

    // Thumbnail — prefer series thumbnail, fall back to first episode thumbnail
    var imgWrap=el('div','iv-card-img');
    var _thumbSrc=series.thumbnail_url||(eps[0]&&eps[0].thumbnail_url)||'';
    _thumbSrc=_thumbSrc.replace('maxresdefault.jpg','mqdefault.jpg').replace('hqdefault.jpg','mqdefault.jpg');
    if(_thumbSrc){
      var img=document.createElement('img');
      img.src=_thumbSrc;
      img.alt='';
      // First 4 cards: eager — browser fetches even in hidden panels
      img.loading=_ivCardIdx<4?'eager':'lazy';
      img.onload=function(){this.parentNode.style.animation='none';this.parentNode.style.background='none'};
      img.onerror=function(){AndroidLog.img(this.src);this.style.display='none'};
      imgWrap.appendChild(img);
    }
    var fallback=el('div','iv-fallback');
    fallback.appendChild(icon('fas fa-play-circle'));
    imgWrap.appendChild(fallback);
    imgWrap.appendChild(el('div','iv-card-badge',epCount+' '+t('iv.episodes')));
    card.appendChild(imgWrap);

    // Body
    var body=el('div','iv-card-body');
    body.appendChild(el('div','iv-card-title',series.name_ku||series.name||''));
    if(series.speaker){
      body.appendChild(el('div','iv-card-speaker',series.speaker));
    }
    // New-videos badge: count episodes added in last 24h
    var newEpCount=eps.filter(function(ep){
      return ep.created_at&&new Date(ep.created_at).getTime()>_now24h;
    }).length;
    if(newEpCount>0){
      body.appendChild(el('div','iv-card-new-badge',newEpCount+' '+(tSafe('iv.new_eps')||'نوی')));
    }
    card.appendChild(body);

    on(card,'click',function(){App.ivShowSeries(series.id)});
    grid.appendChild(card);
    _ivCardIdx++;
  });

  // No results for search
  if(q&&!grid.children.length){
    var noRes=el('div','iv-empty');
    noRes.appendChild(icon('fas fa-search'));
    noRes.appendChild(el('p','',t('iv.no_results')+' "'+q+'"'));
    grid.appendChild(noRes);
  }
}

App.ivShowSeries=function(seriesId){
  var _piv=$('panelIslamvoice');if(_piv)S._ivHomeScroll=_piv.scrollTop;
  S.ivCurrentSeries=seriesId;
  $('ivHome').style.display='none';
  $('ivSeriesView').classList.add('on');

  var series=null;
  if(S.ivSeries){
    for(var i=0;i<S.ivSeries.length;i++){
      if(S.ivSeries[i].id===seriesId){series=S.ivSeries[i];break}
    }
  }
  $('ivSeriesTitle').textContent=series?(series.name_ku||series.name||''):'';
  var descEl=$('ivSeriesDesc');
  if(series&&series.description_ku){
    descEl.textContent=series.description_ku;
    descEl.style.display='';
  }else{
    descEl.style.display='none';
  }

  clear($('ivPlayer'));
  renderIvEpisodes(seriesId);
};

function renderIvEpisodes(seriesId){
  var list=$('ivEpList');
  clear(list);

  if(!S.ivEpisodes)return;

  var eps=S.ivEpisodes.filter(function(ep){return ep.series_id===seriesId});
  eps.sort(function(a,b){return(a.episode_number||0)-(b.episode_number||0)});

  if(!eps.length){
    var empty=el('div','iv-empty');
    empty.appendChild(icon('fas fa-film'));
    empty.appendChild(el('p','',t('iv.no_episodes')));
    list.appendChild(empty);
    return;
  }

  var progress={};
  try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e){}

  eps.forEach(function(ep,idx){
    var item=el('div','iv-ep-item');
    item.setAttribute('data-ep-id',ep.id);

    // Thumbnail (full-width 16:9, episode number badge overlaid inside)
    var thumb=el('div','iv-ep-thumb');
    var thumbUrl=ep.thumbnail_url;
    if(!thumbUrl&&ep.video_url&&ep.video_type!=='s3'){
      thumbUrl='https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg';
    }
    if(thumbUrl){
      var tImg=document.createElement('img');
      tImg.src=thumbUrl;tImg.alt='';tImg.loading='lazy';
      tImg.onerror=function(){AndroidLog.img(this.src);this.style.display='none'};
      thumb.appendChild(tImg);
    }
    var playIcon=el('div','iv-play-icon');
    playIcon.appendChild(icon('fas fa-play'));
    thumb.appendChild(playIcon);
    // Episode number badge — overlaid top-right corner
    thumb.appendChild(el('div','iv-ep-num',String(ep.episode_number||idx+1)));
    item.appendChild(thumb);

    // Info
    var info=el('div','iv-ep-info');
    info.appendChild(el('div','iv-ep-title',ep.title||t('iv.episode_prefix')+' '+(ep.episode_number||idx+1)));
    var meta=el('div','iv-ep-meta');
    if(ep.duration){
      var mins=Math.floor(ep.duration/60);
      var secs=ep.duration%60;
      meta.appendChild(el('span','',mins+':'+String(secs).padStart(2,'0')));
    }
    if(ep.view_count){
      meta.appendChild(el('span','',ep.view_count+' '+t('iv.views')));
    }
    info.appendChild(meta);

    // Watch progress bar & watched badge
    var wp=progress[ep.id];
    if(wp&&wp.percent>=95){
      item.classList.add('watched');
      var badge=el('div','iv-watched-badge');
      badge.appendChild(icon('fas fa-check-circle'));
      badge.appendChild(document.createTextNode(' '+t('iv.watched')));
      info.appendChild(badge);
    } else if(wp&&wp.percent>0){
      var pBar=el('div','iv-ep-progress');
      var pFill=el('div','iv-ep-progress-fill');
      pFill.style.width=wp.percent+'%';
      pBar.appendChild(pFill);
      info.appendChild(pBar);
    }
    item.appendChild(info);

    // NEW badge — show for 24h after created_at
    if(ep.created_at&&(Date.now()-new Date(ep.created_at).getTime())<86400000){
      var newBadge=el('div','iv-new-badge');newBadge.textContent=t('iv.new_badge')||'نوی';item.appendChild(newBadge);
    }

    // Save button
    var saved=ivIsSaved(ep.id);
    var saveBtn=el('button','iv-ep-save'+(saved?' saved':''));
    saveBtn.appendChild(icon('fas fa-bookmark'));
    on(saveBtn,'click',function(e){
      e.stopPropagation();
      ivToggleSave(ep.id,ep);
      saveBtn.classList.toggle('saved',ivIsSaved(ep.id));
      haptic([8]);
    });
    item.appendChild(saveBtn);

    on(item,'click',function(){App.ivPlay(ep.id)});
    list.appendChild(item);
  });
}

function ivGetSaved(){try{return JSON.parse(localStorage.getItem('iv_saved_eps')||'[]')}catch(e){return[]}}
function ivIsSaved(id){return ivGetSaved().some(function(e){return String(e.id)===String(id)})}
function ivToggleSave(id,ep){
  var saved=ivGetSaved();
  var idx=saved.findIndex(function(e){return String(e.id)===String(id)});
  if(idx>=0){saved.splice(idx,1)}else{
    var series=S.ivSeries?S.ivSeries.find(function(s){return s.id===ep.series_id}):null;
    saved.unshift({id:ep.id,series_id:ep.series_id,title:ep.title,episode_number:ep.episode_number,thumbnail_url:ep.thumbnail_url,video_url:ep.video_url,video_type:ep.video_type,series_title:series?series.title:''});
    if(saved.length>200)saved=saved.slice(0,200);
  }
  localStorage.setItem('iv_saved_eps',JSON.stringify(saved));
}

App.ivBack=function(){
  App.ivCloseVideo();
  S.ivCurrentSeries=null;
  $('ivSeriesView').classList.remove('on');
  $('ivHome').style.display='';
  if(S._ivHomeScroll!=null){var _piv=$('panelIslamvoice');if(_piv)setTimeout(function(){_piv.scrollTop=S._ivHomeScroll;S._ivHomeScroll=null;},0);}
};

App.ivPlay=function(episodeId){
  var ep=null;
  if(S.ivEpisodes){
    for(var i=0;i<S.ivEpisodes.length;i++){
      if(S.ivEpisodes[i].id===episodeId){ep=S.ivEpisodes[i];break}
    }
  }
  if(!ep)return;

  var container=$('ivPlayer');
  clear(container);

  var isYouTube=ep.video_type==='youtube'||(ep.video_url&&!ep.video_url.startsWith('http')&&/^[a-zA-Z0-9_-]{11}$/.test(ep.video_url));
  var isIOS=window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios';

  var playerEl; // will be set to the top-level element appended to container

  if(isYouTube&&isIOS){
    // iOS: polished preview card — open in SFSafariViewController (no broken iframe)
    var videoId=ep.video_url;
    var ytUrl='https://www.youtube.com/watch?v='+videoId;

    var card=el('div','iv-yt-card');
    playerEl=card;

    var closeBtn=el('button','iv-player-close');
    closeBtn.appendChild(icon('fas fa-times'));
    on(closeBtn,'click',function(){App.ivCloseVideo()});
    card.appendChild(closeBtn);

    var thumbDiv=el('div','iv-yt-card-thumb');
    var img=document.createElement('img');
    img.src='https://img.youtube.com/vi/'+videoId+'/hqdefault.jpg';
    img.alt=ep.title||'';
    img.loading='lazy';
    img.onerror=function(){this.style.display='none';};
    thumbDiv.appendChild(img);
    var playOver=el('div','iv-yt-play-over');
    var playCircle=el('div','iv-yt-play-circle');
    playCircle.appendChild(icon('fas fa-play'));
    playOver.appendChild(playCircle);
    thumbDiv.appendChild(playOver);
    card.appendChild(thumbDiv);

    var body=el('div','iv-yt-card-body');
    if(ep.title){body.appendChild(el('div','iv-yt-card-title',ep.title));}
    var metaParts=[];
    if(ep.series_title)metaParts.push(ep.series_title);
    if(ep.duration)metaParts.push(ep.duration);
    if(metaParts.length){body.appendChild(el('div','iv-yt-card-meta',metaParts.join(' · ')));}
    var btn=el('button','iv-yt-card-btn');
    btn.appendChild(icon('fab fa-youtube'));
    btn.appendChild(document.createTextNode(' '+t('iv.watch_on_youtube')));
    body.appendChild(btn);
    card.appendChild(body);

    function openYT(){
      // Try YouTube app via custom scheme first; SFSafariViewController as fallback
      try{window.open('youtube://watch?v='+videoId,'_system');}catch(e){}
      setTimeout(function(){
        var B=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser;
        if(B){B.open({url:ytUrl});}else{window.open(ytUrl,'_blank');}
      },600);
    }
    on(thumbDiv,'click',openYT);
    on(btn,'click',openYT);

    container.appendChild(card);
  }else{
    var wrapper=el('div','iv-player');
    playerEl=wrapper;

    var closeBtn=el('button','iv-player-close');
    closeBtn.appendChild(icon('fas fa-times'));
    on(closeBtn,'click',function(){App.ivCloseVideo()});
    wrapper.appendChild(closeBtn);

    if(isYouTube){
      // Android / Web: inline iframe, full error detection + native YouTube fallback
      var videoId=ep.video_url;
      var iframe=document.createElement('iframe');
      iframe.src='https://www.youtube.com/embed/'+videoId+'?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=https://tafsirkurd.com';
      iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen=true;
      wrapper.appendChild(iframe);

      var _ytReady=false;
      var _ytErrShown=false;

      // Opens YouTube app on Android (native intent), Browser plugin elsewhere
      function _openYTNative(){
        var ytUrl='https://www.youtube.com/watch?v='+videoId;
        var plat=window.Capacitor&&window.Capacitor.getPlatform?window.Capacitor.getPlatform():'web';
        if(plat==='android'){
          // _system target → Capacitor routes to Android Intent → opens YouTube app if installed
          try{window.open('vnd.youtube://watch?v='+videoId,'_system');}catch(e){}
          // Delayed browser fallback in case YouTube app is not installed
          setTimeout(function(){
            var B=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser;
            if(B){B.open({url:ytUrl});}
          },600);
        }else{
          var B=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser;
          if(B){B.open({url:ytUrl});}else{window.open(ytUrl,'_blank');}
        }
      }

      function showYTErr(){
        if(_ytErrShown)return;
        _ytErrShown=true;
        clearTimeout(window._ytTimeout);
        if(wrapper.querySelector('.yt-err-overlay'))return;
        var ov=el('div','yt-err-overlay');
        var ic=icon('fas fa-lock');ic.className+=' yt-err-icon';
        ov.appendChild(ic);
        ov.appendChild(el('div','yt-err-msg',t('iv.video_blocked_msg')));
        var ob=el('button','yt-err-btn');
        ob.appendChild(icon('fab fa-youtube'));
        ob.appendChild(document.createTextNode(' '+t('iv.open_in_youtube')));
        on(ob,'click',_openYTNative);
        ov.appendChild(ob);
        wrapper.appendChild(ov);
      }

      // Timeout: if no onReady / onStateChange in 10 s → player is stuck or showing bot-wall
      if(window._ytTimeout){clearTimeout(window._ytTimeout);window._ytTimeout=null;}
      window._ytTimeout=setTimeout(function(){
        if(!_ytReady&&!_ytErrShown)showYTErr();
      },10000);

      if(window._ytErrHandler){window.removeEventListener('message',window._ytErrHandler);window._ytErrHandler=null;}
      window._ytErrHandler=function(e){
        if(!e.data)return;
        try{
          var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
          // Player alive signals — cancel timeout
          if(d.event==='onReady'||(d.event==='onStateChange'&&d.info!==undefined)){
            _ytReady=true;
            clearTimeout(window._ytTimeout);
          }
          // onError: info = YT error code (100=not found, 101/150=embed disabled)
          if(d.event==='onError'){showYTErr();}
        }catch(ex){}
      };
      window.addEventListener('message',window._ytErrHandler);
    }else{
      var video=document.createElement('video');
      video.src=ep.video_url;
      video.controls=true;
      video.playsInline=true;
      video.muted=false;
      video.autoplay=true;
      video.preload='auto';

      var progress={};
      try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e2){}
      if(progress[episodeId]&&progress[episodeId].currentTime){
        video.currentTime=progress[episodeId].currentTime;
      }
      on(video,'timeupdate',function(){
        if(!video.duration)return;
        var pct=(video.currentTime/video.duration)*100;
        try{
          var p=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}');
          p[episodeId]={currentTime:video.currentTime,duration:video.duration,percent:pct,ts:Date.now()};
          localStorage.setItem('iv_watch_progress',JSON.stringify(p));
        }catch(e3){}
      });
      wrapper.appendChild(video);
    }

    container.appendChild(wrapper);
  }

  // Track view
  ivTrackView(episodeId);

  // Highlight playing episode
  var items=document.querySelectorAll('.iv-ep-item');
  items.forEach(function(it){
    it.classList.toggle('playing',String(it.getAttribute('data-ep-id'))===String(episodeId));
  });

  // Scroll player into view
  playerEl.scrollIntoView({behavior:'smooth',block:'start'});
};

App.ivCloseVideo=function(){
  var container=$('ivPlayer');
  // Exit fullscreen if active
  if(document.fullscreenElement)try{document.exitFullscreen()}catch(e){}
  if(document.webkitFullscreenElement)try{document.webkitExitFullscreen()}catch(e){}
  // Clean up YouTube postMessage error listener + stuck-player timeout
  if(window._ytErrHandler){window.removeEventListener('message',window._ytErrHandler);window._ytErrHandler=null;}
  if(window._ytTimeout){clearTimeout(window._ytTimeout);window._ytTimeout=null;}
  // Pause any playing video
  var video=container.querySelector('video');
  if(video){video.pause();video.src=''}
  // Remove iframe to stop YouTube
  var iframe=container.querySelector('iframe');
  if(iframe){iframe.src='';iframe.remove()}
  clear(container);
  // Remove playing highlight
  var items=document.querySelectorAll('.iv-ep-item.playing');
  items.forEach(function(it){it.classList.remove('playing')});
  // Force layout recalc after fullscreen exit
  setTimeout(function(){window.dispatchEvent(new Event('resize'))},150);
};

App.ivRefresh=function(){
  loadIslamVoiceData(true);
};

function ivRenderSavedList(){
  var overlay=$('ivSavedOverlay');
  var list=$('ivSavedList');
  clear(list);
  var saved=ivGetSaved();
  if(!saved.length){
    var emp=el('div','iv-overlay-empty');
    var eico=el('div','iv-overlay-empty-icon');eico.appendChild(icon('fas fa-bookmark'));emp.appendChild(eico);
    emp.appendChild(el('div','iv-overlay-empty-title',t('iv.no_saved_episodes')));
    emp.appendChild(el('div','iv-overlay-empty-sub',t('iv.bookmark_to_save')));
    list.appendChild(emp);
  }else{
    saved.forEach(function(ep){
      var item=el('div','iv-overlay-ep');
      var thumb=el('div','iv-overlay-ep-thumb');
      var thumbUrl=ep.thumbnail_url||(ep.video_url&&ep.video_type!=='s3'?'https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg':null);
      if(thumbUrl){var img=document.createElement('img');img.src=thumbUrl;img.alt='';thumb.appendChild(img)}
      item.appendChild(thumb);
      var info=el('div','iv-overlay-ep-info');
      if(ep.series_title)info.appendChild(el('div','iv-overlay-ep-series',ep.series_title));
      info.appendChild(el('div','iv-overlay-ep-title',ep.title||('ئەپیسۆد '+(ep.episode_number||''))));
      item.appendChild(info);
      var del=el('button','iv-overlay-ep-del');del.appendChild(icon('fas fa-xmark'));
      on(del,'click',function(e){e.stopPropagation();ivToggleSave(ep.id,ep);haptic([8]);ivRenderSavedList();
        // also update bookmark button in episode list if visible
        document.querySelectorAll('.iv-ep-save').forEach(function(b){var row=b.closest('[data-ep-id]');if(row&&row.dataset.epId==ep.id)b.classList.toggle('saved',ivIsSaved(ep.id))});
      });
      item.appendChild(del);
      on(item,'click',function(){overlay.classList.remove('open');App.ivShowSeries(ep.series_id);App.ivPlay(ep.id)});
      list.appendChild(item);
    });
  }
}
App.ivShowSaved=function(){$('ivSavedOverlay').classList.add('open');ivRenderSavedList();haptic([8])};
App.ivCloseSaved=function(){$('ivSavedOverlay').classList.remove('open')};

function ivRenderHistoryList(){
  var overlay=$('ivHistoryOverlay');
  var list=$('ivHistoryList');
  clear(list);
  var progress={};try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e){}
  var keys=Object.keys(progress).filter(function(k){return progress[k]&&progress[k].percent>0});
  keys.sort(function(a,b){return(progress[b].ts||0)-(progress[a].ts||0)});
  if(!keys.length){
    var emp2=el('div','iv-overlay-empty');
    var eico2=el('div','iv-overlay-empty-icon');eico2.appendChild(icon('fas fa-clock-rotate-left'));emp2.appendChild(eico2);
    emp2.appendChild(el('div','iv-overlay-empty-title',t('iv.no_history')));
    emp2.appendChild(el('div','iv-overlay-empty-sub',t('iv.history_hint')));
    list.appendChild(emp2);
  }else{
    keys.forEach(function(epId){
      var wp=progress[epId];
      var ep=S.ivEpisodes?S.ivEpisodes.find(function(e){return String(e.id)===String(epId)}):null;
      if(!ep)return;
      var series=S.ivSeries?S.ivSeries.find(function(s){return s.id===ep.series_id}):null;
      var item=el('div','iv-overlay-ep');
      var thumb=el('div','iv-overlay-ep-thumb');
      var thumbUrl=ep.thumbnail_url||(ep.video_url&&ep.video_type!=='s3'?'https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg':null);
      if(thumbUrl){var img=document.createElement('img');img.src=thumbUrl;img.alt='';thumb.appendChild(img)}
      item.appendChild(thumb);
      var info=el('div','iv-overlay-ep-info');
      if(series)info.appendChild(el('div','iv-overlay-ep-series',series.title));
      info.appendChild(el('div','iv-overlay-ep-title',ep.title||(t('iv.episode_prefix')+' '+(ep.episode_number||''))));
      info.appendChild(el('div','iv-overlay-ep-pct',Math.round(wp.percent)+t('iv.percent_watched')));
      item.appendChild(info);
      var del=el('button','iv-overlay-ep-del');del.appendChild(icon('fas fa-trash'));
      on(del,'click',function(e){e.stopPropagation();delete progress[epId];try{localStorage.setItem('iv_watch_progress',JSON.stringify(progress))}catch(ex){}haptic([8]);ivRenderHistoryList()});
      item.appendChild(del);
      on(item,'click',function(){overlay.classList.remove('open');App.ivShowSeries(ep.series_id);App.ivPlay(ep.id)});
      list.appendChild(item);
    });
  }
}
App.ivShowHistory=function(){$('ivHistoryOverlay').classList.add('open');ivRenderHistoryList();haptic([8])};
App.ivCloseHistory=function(){$('ivHistoryOverlay').classList.remove('open')};

App.ivToggleSearch=function(){
  var bar=$('ivSearchBar');
  if(bar.classList.contains('on')){
    bar.classList.remove('on');
    $('ivSearchInput').value='';
    App.ivSearch('');
  }else{
    bar.classList.add('on');
    $('ivSearchInput').focus();
  }
};

App.ivSearch=function(val){
  var q=val.trim().toLowerCase();
  var clearBtn=document.querySelector('.iv-search-clear');
  if(clearBtn){
    if(q)clearBtn.classList.add('on');
    else clearBtn.classList.remove('on');
  }
  S.ivSearchQuery=q;
  renderIvGrid();
};

App.ivClearSearch=function(){
  $('ivSearchInput').value='';
  App.ivSearch('');
  $('ivSearchInput').focus();
};

App.ivShowSpeakerFilter=function(){
  if(!S.ivSeries)return;
  // Collect unique speakers
  var seen={};
  var speakers=[];
  S.ivSeries.forEach(function(s){
    if(s.speaker&&!seen[s.speaker]){seen[s.speaker]=true;speakers.push(s.speaker);}
  });
  if(!speakers.length)return;

  // Build bottom sheet
  var overlay=el('div','iv-spk-overlay');
  var sheet=el('div','iv-spk-sheet');

  // Header
  var sheetHdr=el('div','iv-spk-hdr');
  sheetHdr.appendChild(el('span','iv-spk-title',t('iv.sheikh_title')||'ماموستا'));
  var closeBtn=el('button','iv-spk-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',function(){if(overlay.parentNode)overlay.parentNode.removeChild(overlay);});
  sheetHdr.appendChild(closeBtn);
  sheet.appendChild(sheetHdr);

  // "All" option
  var list=el('div','iv-spk-list');
  var allBtn=el('button','iv-spk-item'+(S.ivSpeakerFilter===null?' on':''));
  allBtn.appendChild(icon('fas fa-users'));
  allBtn.appendChild(document.createTextNode(' '+t('iv.all')));
  on(allBtn,'click',function(){
    S.ivSpeakerFilter=null;
    renderIvGrid();
    if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
  });
  list.appendChild(allBtn);

  // Each speaker
  speakers.forEach(function(spk){
    var btn=el('button','iv-spk-item'+(S.ivSpeakerFilter===spk?' on':''));
    btn.appendChild(icon('fas fa-user'));
    btn.appendChild(document.createTextNode(' '+spk));
    on(btn,'click',function(){
      S.ivSpeakerFilter=spk;
      renderIvGrid();
      if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
    });
    list.appendChild(btn);
  });

  sheet.appendChild(list);
  overlay.appendChild(sheet);
  on(overlay,'click',function(e){if(e.target===overlay&&overlay.parentNode)overlay.parentNode.removeChild(overlay);});
  document.body.appendChild(overlay);
  // Animate in
  requestAnimationFrame(function(){overlay.classList.add('on');});
};

function ivTrackView(episodeId){
  if(!S.ivSupabase||!episodeId)return;
  var vk='iv_viewed_'+episodeId;
  if(sessionStorage.getItem(vk))return;
  sessionStorage.setItem(vk,'1');
  Promise.resolve(S.ivSupabase.rpc('increment_episode_view',{episode_id:episodeId})).catch(function(){});
}
