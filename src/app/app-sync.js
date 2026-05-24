'use strict';

/* ===== SUPABASE AUTH & CLOUD SYNC ===== */
var SUPA_CONFIG_URL='https://tafsirkurd.com/config';

// Subscribers that want to be called as soon as window._appSupabase is set.
// Used by Gencine (dhikr.js) and any other module that needs Supabase early.
var _appSupabaseReadyCbs=[];
function _notifySupabaseReady(){
  var cbs=_appSupabaseReadyCbs.splice(0);
  cbs.forEach(function(fn){try{fn();}catch(e){}});
}
// Exposed globally so dhikr.js and other lazy-loaded modules can subscribe
window._onAppSupabaseReady=function(fn){
  if(window._appSupabase){try{fn();}catch(e){}}
  else _appSupabaseReadyCbs.push(fn);
};

function initSupabase(cb){
  if(S.supabase){if(cb)cb();return}
  if(!window.supabase){console.warn('Supabase JS library not loaded');if(cb)cb();return}

  // Use cached config immediately (enables offline auth session recovery)
  var cachedCfg=null;
  try{cachedCfg=JSON.parse(localStorage.getItem('supa_cfg'))}catch(e){}
  if(cachedCfg&&cachedCfg.supabaseUrl&&cachedCfg.supabaseKey){
    S.supabase=window.supabase.createClient(cachedCfg.supabaseUrl,cachedCfg.supabaseKey);
    window._appSupabase=S.supabase;
    _notifySupabaseReady();
    checkAuthSession();
    if(cb)cb();
  }

  // Update config from network in background
  var _supaCfgCtrl=new AbortController();
  var _supaCfgTid=setTimeout(function(){_supaCfgCtrl.abort();},12000);
  var _supaCfgT0=Date.now();
  fetch(SUPA_CONFIG_URL,{signal:_supaCfgCtrl.signal}).then(function(r){
    clearTimeout(_supaCfgTid);
    AndroidLog.fetch(SUPA_CONFIG_URL,r.status,'supa-config',false,Date.now()-_supaCfgT0);
    if(!r.ok)throw new Error('Config HTTP '+r.status);
    return r.json();
  }).then(function(cfg){
    if(cfg.supabaseUrl&&cfg.supabaseKey){
      try{localStorage.setItem('supa_cfg',JSON.stringify(cfg))}catch(e){}
      if(!S.supabase){
        S.supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
        window._appSupabase=S.supabase;
        _notifySupabaseReady();
        checkAuthSession();
        if(cb)cb();
      }
    }
    // Remote prayer cache version — if admin bumped it, purge all local prayer caches
    // so every phone fetches fresh data from amozhgary.tv on next prayer tab open.
    if(cfg.prayerCacheVersion){
      var _storedVer=localStorage.getItem('prayer_cache_schema_ver')||'';
      if(_storedVer!==String(cfg.prayerCacheVersion)){
        if(window.PrayerCache&&window.PrayerCache.purgeAllCaches)window.PrayerCache.purgeAllCaches();
        try{localStorage.setItem('prayer_cache_schema_ver',String(cfg.prayerCacheVersion));}catch(e){}
        console.log('[PrayerCache] remote version changed to',cfg.prayerCacheVersion,'— all caches purged');
      }
    }
    // Remote widget refresh nonce — if admin bumped it, force-push all widget data
    // so every iOS device gets a fresh App Group write and WidgetCenter reload.
    if(cfg.widgetRefreshNonce){
      var _storedWidgetNonce=localStorage.getItem('widget_refresh_nonce_seen')||'';
      if(_storedWidgetNonce!==String(cfg.widgetRefreshNonce)){
        localStorage.setItem('widget_refresh_nonce_seen',String(cfg.widgetRefreshNonce));
        console.log('[WidgetRefresh] admin nonce changed → forceWidgetRefresh');
        if(window.PrayerUI&&window.PrayerUI.forceWidgetRefresh){
          window.PrayerUI.forceWidgetRefresh('adminNonce');
        }
      }
    }
    // Remote i18n cache version — if admin bumped it, purge translation cache
    // so every device fetches fresh translations from Supabase on next open.
    if(cfg.i18nCacheVersion){
      var _storedI18nVer=localStorage.getItem('i18n_schema_ver')||'';
      if(_storedI18nVer!==String(cfg.i18nCacheVersion)){
        if(window.i18n&&window.i18n.purgeCache)window.i18n.purgeCache();
        try{localStorage.setItem('i18n_schema_ver',String(cfg.i18nCacheVersion));}catch(e){}
        console.log('[i18n] remote version changed to',cfg.i18nCacheVersion,'— translation cache purged');
        // Flag so health report on this session includes the purge event
        try{sessionStorage.setItem('i18n_version_purged','1');}catch(e){}
        // Rebuild search index so new translations are reflected immediately
        if(window.QuranSearch&&S.quranData&&S.tafsirData){
          setTimeout(function(){QuranSearch.init(S.quranData,S.tafsirData);},500);
        }
      }
    }
    // i18n health reporting gate — admin can disable/enable remotely
    if(cfg.i18nHealthReportingEnabled!==undefined){
      window.i18nHealthReportingEnabled = cfg.i18nHealthReportingEnabled!=='false';
    }
  }).catch(function(e){
    clearTimeout(_supaCfgTid);
    AndroidLog.fetch(SUPA_CONFIG_URL,0,'supa-config',false,Date.now()-_supaCfgT0,e);
    console.warn('Supabase config fetch failed:',e&&e.message);
    if(!S.supabase&&cb)cb();
  });
}

function checkAuthSession(){
  if(!S.supabase)return;
  S.supabase.auth.getSession().then(function(resp){
    var session=resp.data.session;
    if(session){
      setUserFromSession(session);
      _renderHash.settings=null; // auth changed — force settings re-render
      startCloudSync();
      if(S.tab==='settings')renderSettings();
    }
  }).catch(function(e){console.error('Auth session check error:',e)});

  S.supabase.auth.onAuthStateChange(function(event,session){
    // Auth state changed (session details not logged for security)
    if(event==='SIGNED_IN'&&session){
      setUserFromSession(session);
      _renderHash.settings=null;
      startCloudSync();
      if(S.tab==='settings')renderSettings();
    }else if(event==='SIGNED_OUT'){
      S.user=null;
      _renderHash.settings=null;
      stopCloudSync();
      if(S.tab==='settings')renderSettings();
    }
  });
}

function setUserFromSession(session){
  var u=session.user;
  var meta=u.user_metadata||{};
  S.user={
    id:u.id,
    email:u.email,
    name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:'User'),
    avatar:meta.avatar_url||null,
    provider:(u.app_metadata&&u.app_metadata.provider)||'email'
  };
}

/* --- Cloud Sync --- */
/* ===== PRODUCTION SYNC SYSTEM ===== */

// ── Sync panel live-update helpers ─────────────────────────────────────────
var _syncPanelStatusEl=null;
var _syncPanelBtnEl=null;

function _syncStatusInfo(){
  if(!S.user)return null;
  if(!navigator.onLine)return{dot:'⚠',txt:t('settings.sync_status_offline'),col:'#f09000'};
  if(S.isSyncing)return{dot:'⟳',txt:t('settings.sync_status_syncing'),col:'var(--text3)'};
  if(S.syncFailed)return{dot:'✕',txt:(t('settings.sync_status_failed')||'Sync failed')+(S.syncErrorDetail?' ['+S.syncErrorDetail.slice(0,60)+']':''),col:'#e53935'};
  if(S.lastSyncTime){
    var ts=new Date(S.lastSyncTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return{dot:'✓',txt:(t('settings.sync_last')||'')+' '+ts,col:'#43a047'};
  }
  return{dot:'○',txt:t('settings.sync_never'),col:'var(--text3)'};
}

function _updateSyncPanelStatus(){
  if(!_syncPanelStatusEl)return;
  var info=_syncStatusInfo();
  if(!info)return;
  _syncPanelStatusEl.textContent=info.dot+' '+info.txt;
  _syncPanelStatusEl.style.color=info.col;
  if(!_syncPanelBtnEl)return;
  _syncPanelBtnEl.disabled=S.isSyncing||!navigator.onLine;
  clear(_syncPanelBtnEl);
  _syncPanelBtnEl.appendChild(icon(S.syncFailed?'fas fa-redo':'fas fa-cloud-arrow-up'));
  _syncPanelBtnEl.appendChild(document.createTextNode(' '+(S.syncFailed?t('settings.sync_retry_btn'):t('settings.sync_btn'))));
}

// ── Device / Session management ────────────────────────────────────────────

function _getDeviceId(){
  var id=localStorage.getItem('_deviceId');
  if(!id){
    id='dk_'+Math.random().toString(36).slice(2,10)+'_'+Date.now().toString(36);
    localStorage.setItem('_deviceId',id);
  }
  return id;
}

function _getDeviceInfo(){
  var platform='web',label='Web';
  if(window.Capacitor&&Capacitor.getPlatform){
    platform=Capacitor.getPlatform();
  }
  var ua=navigator.userAgent||'';
  if(platform==='android'){
    label='Android Phone';
  }else if(platform==='ios'){
    label=/iPad/.test(ua)?'iPad':'iPhone';
  }else{
    if(/Edg\//.test(ua))label='Edge Browser';
    else if(/Chrome\//.test(ua))label='Chrome Browser';
    else if(/Firefox\//.test(ua))label='Firefox Browser';
    else if(/Safari\//.test(ua))label='Safari Browser';
    else label='Web Browser';
  }
  return{platform:platform,label:label};
}

function _timeAgo(date){
  var s=Math.floor((Date.now()-date.getTime())/1000);
  if(s<90)return t('profile.time_now')||'ئێستا';
  var m=Math.floor(s/60);
  if(m<60)return m+' '+(t('profile.time_min')||'خولەک');
  var h=Math.floor(m/60);
  if(h<24)return h+' '+(t('profile.time_hour')||'کاتژمێر');
  var d=Math.floor(h/24);
  if(d<8)return d+' '+(t('profile.time_day')||'ڕۆژ');
  return date.toLocaleDateString();
}

var _sessionHeartbeatInterval=null;
var _sessionFgHandler=null;
var _sessionRevChannel=null;

function _sessionTouchActive(){
  if(!S.supabase||!S.user)return;
  S.supabase.from('user_sessions')
    .update({last_active_at:new Date().toISOString()})
    .eq('user_id',S.user.id).eq('device_id',_getDeviceId())
    .then(function(){});
}

function _registerSession(){
  if(!S.supabase||!S.user)return;
  var info=_getDeviceInfo();
  S.supabase.from('user_sessions').upsert({
    user_id:S.user.id,
    device_id:_getDeviceId(),
    platform:info.platform,
    device_label:info.label,
    last_active_at:new Date().toISOString()
  },{onConflict:'user_id,device_id',ignoreDuplicates:false})
  .then(function(r){
    if(r.error){console.error('Session register:',r.error);return;}
    // Prune sessions idle for more than 30 days (except this device)
    var cutoff=new Date(Date.now()-30*24*60*60*1000).toISOString();
    S.supabase.from('user_sessions').delete()
      .eq('user_id',S.user.id).lt('last_active_at',cutoff).neq('device_id',_getDeviceId())
      .then(function(){});
  });
}

function _startSessionHeartbeat(){
  if(_sessionHeartbeatInterval)clearInterval(_sessionHeartbeatInterval);
  _sessionHeartbeatInterval=setInterval(_sessionTouchActive,5*60*1000);
  _sessionFgHandler=function(){if(!document.hidden)_sessionTouchActive();};
  document.addEventListener('visibilitychange',_sessionFgHandler);
}

function _stopSessionHeartbeat(){
  if(_sessionHeartbeatInterval){clearInterval(_sessionHeartbeatInterval);_sessionHeartbeatInterval=null;}
  if(_sessionFgHandler){document.removeEventListener('visibilitychange',_sessionFgHandler);_sessionFgHandler=null;}
}

function _subscribeSessionRevocation(){
  if(!S.supabase||!S.user||_sessionRevChannel)return;
  var myDeviceId=_getDeviceId();
  _sessionRevChannel=S.supabase
    .channel('sess-rev-'+S.user.id)
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'user_sessions',
      filter:'user_id=eq.'+S.user.id},function(payload){
      if(payload.old&&payload.old.device_id===myDeviceId){
        toast(t('profile.session_revoked')||'چوونا دەرەوەکراوی ل ئامێرا دی');
        setTimeout(function(){S.supabase.auth.signOut();},1500);
      }
    }).subscribe();
}

function _unsubscribeSessionRevocation(){
  if(_sessionRevChannel){
    try{S.supabase.removeChannel(_sessionRevChannel);}catch(e){}
    _sessionRevChannel=null;
  }
}

function _removeCurrentDeviceSession(){
  if(!S.supabase||!S.user)return;
  S.supabase.from('user_sessions').delete()
    .eq('user_id',S.user.id).eq('device_id',_getDeviceId()).then(function(){});
}
// Field categories:
//   ADDITIVE  — always union across devices (never lose data)
//   LWW       — last-write-wins (settings, scroll positions)
//   FURTHEST  — take whichever position is further in the Quran (lastRead)

var SYNC_SIMPLE_KEYS=[
  'lastRead','readingGoal','readLog','readAyahsToday','trackingResetAt','fullResetAt',
  'app_bookmarks','iv_watch_progress','iv_saved_eps',
  'showTafsir','bgAudio','theme','keepAwake',
  'app_arSize','app_tfSize','app_lineH',
  'app_reciter','app_speed','app_repeat','app_repeatCount',
  'autoAdvance','scrollFollowsAudio','hapticFeedback',
  'bestStreak',
  'mushafMode','readerFont','mushafFont','mushafLineH',
  'mushafFontSize_qcf1',
  'book_saved','book_read_ids',
  'prayerCity','prayerMethod','prayerAthanEnabled','prayerToggles',
  'prayerAthanVoice','prayerTimeFormat',
  'tasbihDhikr','tasbihTarget'
];

// ── Merge helpers ─────────────────────────────────────────────────────────────

// NOTE: bookmarks use LWW (last-write-wins) — see mergeSyncData.
// Additive union was removed because it prevented deletions from propagating:
// removing a bookmark on one device would be restored by the union on other devices.

// readLog: per-date max (keep highest ayah count for each day)
// sinceMs: if provided, discard entries with dates before this timestamp
function _mergeReadLog(aStr,bStr,sinceMs){
  try{
    var a=JSON.parse(aStr||'{}');var b=JSON.parse(bStr||'{}');
    var r=Object.assign({},a);
    Object.keys(b).forEach(function(d){r[d]=Math.max(r[d]||0,b[d]||0)});
    if(sinceMs){
      Object.keys(r).forEach(function(d){
        if(new Date(d).getTime()<sinceMs)delete r[d];
      });
    }
    return JSON.stringify(r);
  }catch(e){return aStr||bStr||'{}'}
}

// surah_progress: union of ayah numbers read
function _mergeProgress(aStr,bStr){
  try{
    var a=JSON.parse(aStr||'[]');var b=JSON.parse(bStr||'[]');
    if(!Array.isArray(a))a=[];if(!Array.isArray(b))b=[];
    var set={};
    a.concat(b).forEach(function(n){set[n]=true});
    return JSON.stringify(Object.keys(set).map(Number).sort(function(x,y){return x-y}));
  }catch(e){return aStr||bStr||'[]'}
}

// Master merge — called on both login-load and realtime push
function mergeSyncData(local,cloud){
  if(!local)return cloud;
  if(!cloud)return local;
  var lTime=new Date(local._syncTime||0).getTime();
  var cTime=new Date(cloud._syncTime||0).getTime();
  // Start with the newer set as LWW base for settings.
  // Strict >: when timestamps are equal, cloud IS what we last pushed — local wins
  // because the user may have changed settings after that push without syncing yet.
  var base=cTime>lTime?cloud:local;
  var result=Object.assign({},base);

  // Determine if either side has a reset — the newer reset wins
  var localReset=new Date(local.trackingResetAt||0).getTime();
  var cloudReset=new Date(cloud.trackingResetAt||0).getTime();
  var newestReset=Math.max(localReset,cloudReset);
  // The side that owns the newest reset is the authoritative source for progress
  var resetWinner=cloudReset>=localReset?cloud:local;

  // ADDITIVE: reading log — per-day max, but discard entries before the newest reset
  result.readLog=_mergeReadLog(local.readLog,cloud.readLog,newestReset||undefined);

  // ADDITIVE (with reset): surah progress — union, but if a reset exists use only reset-winner's data
  for(var i=1;i<=114;i++){
    var pk='surah_progress_'+i;
    if(newestReset>0){
      // After a reset, trust only the side that did the reset — don't restore stale data
      var rv=resetWinner[pk];
      if(rv)result[pk]=rv; else delete result[pk];
    } else if(local[pk]||cloud[pk]){
      result[pk]=_mergeProgress(local[pk],cloud[pk]);
    }
  }

  // surah_read_v3: take whichever side has read further (max value) per surah
  for(var j=1;j<=114;j++){
    var vrk='surah_read_v3_'+j;
    var lrv=parseInt(local[vrk]||'0');var crv=parseInt(cloud[vrk]||'0');
    if(lrv>0||crv>0){result[vrk]=String(Math.max(lrv,crv));}
  }

  // FURTHEST: last read position — take whichever is deeper in the Quran,
  // UNLESS a full reset has happened (fullResetAt) — then use reset-winner's lastRead
  try{
    var localFull=new Date(local.fullResetAt||0).getTime();
    var cloudFull=new Date(cloud.fullResetAt||0).getTime();
    var newestFull=Math.max(localFull,cloudFull);
    if(newestFull>0){
      // Full reset happened — the side that owns the newest reset is authoritative for lastRead
      var fullWinner=cloudFull>=localFull?cloud:local;
      if(fullWinner.lastRead){result.lastRead=fullWinner.lastRead;}else{delete result.lastRead;}
    }else{
      var lLR=JSON.parse(local.lastRead||'{}');
      var cLR=JSON.parse(cloud.lastRead||'{}');
      var lPos=(lLR.surah||0)*300+(lLR.ayah||0);
      var cPos=(cLR.surah||0)*300+(cLR.ayah||0);
      result.lastRead=lPos>=cPos?local.lastRead:cloud.lastRead;
    }
  }catch(e){}

  // book_read_ids — additive union across devices
  try{
    var _lIds=JSON.parse(local.book_read_ids||'[]');
    var _cIds=JSON.parse(cloud.book_read_ids||'[]');
    var _idSet={};
    _lIds.forEach(function(id){_idSet[String(id)]=true;});
    _cIds.forEach(function(id){_idSet[String(id)]=true;});
    result.book_read_ids=JSON.stringify(Object.keys(_idSet));
  }catch(e){}
  // pdfProg_* — per-book LWW by ts (highest ts = most recently read)
  var _allBpKeys={};
  Object.keys(local).forEach(function(k){if(k.indexOf('pdfProg_')===0)_allBpKeys[k]=true;});
  Object.keys(cloud).forEach(function(k){if(k.indexOf('pdfProg_')===0)_allBpKeys[k]=true;});
  Object.keys(_allBpKeys).forEach(function(k){
    var lv=local[k]?JSON.parse(local[k]):null;
    var cv=cloud[k]?JSON.parse(cloud[k]):null;
    if(!lv)result[k]=cloud[k];
    else if(!cv)result[k]=local[k];
    else result[k]=(cv.ts||0)>(lv.ts||0)?cloud[k]:local[k];
  });

  result._syncTime=new Date().toISOString();
  return result;
}

// ── Gather / Apply ────────────────────────────────────────────────────────────

function gatherSyncData(){
  var data={};
  SYNC_SIMPLE_KEYS.forEach(function(k){
    var v=localStorage.getItem(k);
    if(v!==null)data[k]=v;
  });
  for(var i=1;i<=114;i++){
    var pk='surah_progress_'+i;var sk='surah_scroll_'+i;var rk='surah_read_v3_'+i;
    var pv=localStorage.getItem(pk);var sv=localStorage.getItem(sk);var rv=localStorage.getItem(rk);
    if(pv!==null)data[pk]=pv;
    if(sv!==null)data[sk]=sv;
    if(rv!==null)data[rk]=rv;
  }
  // Book reading progress — pdfProg_{bookId} keys
  var _bpKeys=[];
  for(var _bi=0;_bi<localStorage.length;_bi++){var _bk=localStorage.key(_bi);if(_bk&&_bk.indexOf('pdfProg_')===0)_bpKeys.push(_bk);}
  _bpKeys.forEach(function(k){var v=localStorage.getItem(k);if(v!==null)data[k]=v;});
  // _syncTime set by caller so reads never pollute the timestamp
  return data;
}

function applySyncData(data){
  if(!data)return;
  Object.keys(data).forEach(function(k){
    if(k==='_syncTime')return;
    try{localStorage.setItem(k,data[k]);}catch(e){}
  });
  S.theme=localStorage.getItem('theme')||'noor';
  S.arSize=parseFloat(localStorage.getItem('app_arSize'))||2.0;
  S.tfSize=parseFloat(localStorage.getItem('app_tfSize'))||1.0;
  S.lineH=parseFloat(localStorage.getItem('app_lineH'))||2.2;
  S.showTafsir=localStorage.getItem('showTafsir')!=='false';
  S.bgAudio=localStorage.getItem('bgAudio')==='true';
  S.keepAwake=localStorage.getItem('keepAwake')==='true';
  S.autoAdvance=localStorage.getItem('autoAdvance')==='true';
  S.scrollFollowsAudio=localStorage.getItem('scrollFollowsAudio')!=='false';
  S.hapticFeedback=localStorage.getItem('hapticFeedback')!=='false';
  S.mushafMode=localStorage.getItem('mushafMode')==='true';
  S.readerFont=localStorage.getItem('readerFont')||'hafs';
  S.mushafFont='qcf1';
  try{localStorage.setItem('mushafFont','qcf1');}catch(e){}
  S.mushafFontSize=Math.min(32,Math.max(25,parseInt(localStorage.getItem('mushafFontSize_qcf1'))||30));
  S.mushafLineH=Math.min(2.3,Math.max(1.8,parseFloat(localStorage.getItem('mushafLineH'))||1.8));
  S.prayerCity=localStorage.getItem('prayerCity')||'Duhok';
  S.prayerMethod=parseInt(localStorage.getItem('prayerMethod')||'13');
  S.prayerAthanEnabled=localStorage.getItem('prayerAthanEnabled')===null?(!(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='mac')):localStorage.getItem('prayerAthanEnabled')==='true';
  S.prayerToggles=(function(){try{return JSON.parse(localStorage.getItem('prayerToggles')||'{}')}catch(e){return{}}})();
  applyTheme();applySizes();
  // Sync in-memory bookmark map with whatever applySyncData wrote to localStorage.
  // Without this, _bmMap lags after a user-switch wipe or realtime push that
  // updated app_bookmarks in localStorage but not in the authoritative in-memory map.
  _loadBookmarks();
}

function renderCurrentTab(){
  renderContinue();
  if(S.tab==='settings')renderSettings();
  if(S.tab==='bookmarks')renderBookmarks();
  if(S.tab==='goals')renderGoals();
  if(S.tab==='prayer'&&window.PrayerUI)PrayerUI.render();
}

// ── Sync to cloud ─────────────────────────────────────────────────────────────

var _syncRetryDelay=2000;
var _syncRetryTimer=null;

function syncToCloud(){
  if(!S.supabase||!S.user||S.isSyncing)return;
  var now=Date.now();
  if(now-S.lastSyncTime<5000)return;
  S.isSyncing=true;
  _updateSyncPanelStatus(); // show "syncing…" immediately
  var payload=gatherSyncData();
  payload._syncTime=new Date().toISOString();
  S.supabase.from('user_data').upsert({
    user_id:S.user.id,
    app_data:payload,
    updated_at:new Date().toISOString()
  },{onConflict:'user_id',ignoreDuplicates:false}).then(function(resp){
    if(resp.error){
      console.error('Sync error:',resp.error);
      S.syncErrorDetail=(resp.error.code||'')+' '+(resp.error.message||'');
      S.syncFailed=true;
      _schedSyncRetry();
    }else{
      S.lastSyncTime=Date.now();
      S.syncFailed=false;
      S.syncErrorDetail=null;
      localStorage.setItem('_lastSyncTime',payload._syncTime);
      _syncRetryDelay=2000;
    }
  }).catch(function(e){
    console.error('Sync failed:',e);
    S.syncFailed=true;
    _schedSyncRetry();
  }).finally(function(){S.isSyncing=false;_updateSyncPanelStatus();});
}

function _schedSyncRetry(){
  if(!S.user)return;
  clearTimeout(_syncRetryTimer);
  _syncRetryTimer=setTimeout(function(){
    _syncRetryDelay=Math.min(_syncRetryDelay*2,60000); // cap at 60s
    syncToCloud();
  },_syncRetryDelay);
}

// ── Load from cloud ───────────────────────────────────────────────────────────

function loadFromCloud(cb){
  if(!S.supabase||!S.user){if(cb)cb();return}
  S.supabase.from('user_data').select('app_data,updated_at').eq('user_id',S.user.id).single()
  .then(function(resp){
    if(resp.error){
      if(resp.error.code==='PGRST116'){
        syncToCloud(); // first login — upload local data
      }else{
        console.error('Load cloud error:',resp.error);
        S.syncErrorDetail=(resp.error.code||'')+' '+(resp.error.message||'');
        // JWT/auth errors — try refreshing the token once before giving up
        var isAuthErr=resp.error.status===401||resp.error.message&&resp.error.message.indexOf('JWT')!==-1;
        if(isAuthErr&&S.supabase){
          S.supabase.auth.refreshSession().then(function(r){
            if(r.data&&r.data.session){
              setUserFromSession(r.data.session);
              loadFromCloud(cb); // one retry
            }else{
              S.syncFailed=true;_updateSyncPanelStatus();
              if(cb)cb();
            }
          }).catch(function(re){S.syncErrorDetail=String(re);S.syncFailed=true;_updateSyncPanelStatus();if(cb)cb();});
          return;
        }
        S.syncFailed=true;_updateSyncPanelStatus();
      }
      if(cb)cb();return;
    }
    if(resp.data&&resp.data.app_data){
      var localData=gatherSyncData();
      localData._syncTime=localStorage.getItem('_lastSyncTime')||'0';
      var merged=mergeSyncData(localData,resp.data.app_data);
      applySyncData(merged);
      localStorage.setItem('_lastSyncTime',merged._syncTime);
      // Push merged result back if it added anything from local
      setTimeout(syncToCloud,500);
      renderCurrentTab();
    }
    if(cb)cb();
  }).catch(function(e){console.error('Load cloud failed:',e);S.syncErrorDetail=String(e);S.syncFailed=true;_updateSyncPanelStatus();if(cb)cb();});
}

// ── Realtime (instant cross-device push) ─────────────────────────────────────

function subscribeRealtime(){
  if(!S.supabase||!S.user||S.realtimeChannel)return;
  S.realtimeChannel=S.supabase
    .channel('user-data-'+S.user.id)
    .on('postgres_changes',{
      event:'UPDATE',schema:'public',table:'user_data',
      filter:'user_id=eq.'+S.user.id
    },function(payload){
      if(S.isSyncing)return; // ignore echo while we are uploading
      if(!payload.new||!payload.new.app_data)return;
      // Echo detection: skip if this update's _syncTime matches our own last push
      var incomingTime=payload.new.app_data._syncTime;
      var myLastSync=localStorage.getItem('_lastSyncTime');
      if(incomingTime&&myLastSync&&incomingTime===myLastSync)return;
      var localData=gatherSyncData();
      localData._syncTime=localStorage.getItem('_lastSyncTime')||'0';
      var merged=mergeSyncData(localData,payload.new.app_data);
      applySyncData(merged);
      localStorage.setItem('_lastSyncTime',merged._syncTime);
      renderCurrentTab();
    })
    .subscribe();
}

function unsubscribeRealtime(){
  if(S.realtimeChannel){
    try{S.supabase.removeChannel(S.realtimeChannel)}catch(e){}
    S.realtimeChannel=null;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/* Clear all user-specific local data (called when a different account logs in) */
function _clearUserLocalData(){
  _syncPanelStatusEl=null;_syncPanelBtnEl=null;S.syncFailed=false;
  SYNC_SIMPLE_KEYS.forEach(function(k){localStorage.removeItem(k);});
  for(var i=1;i<=114;i++){
    localStorage.removeItem('surah_progress_'+i);
    localStorage.removeItem('surah_scroll_'+i);
    localStorage.removeItem('surah_read_v3_'+i);  // list-mode read progress
  }
  ['_lastSyncTime','readingGoal','readLog','readAyahsToday','bestStreak','readSessions'].forEach(function(k){localStorage.removeItem(k);});
  var _clearBpKeys=[];
  for(var _ci=0;_ci<localStorage.length;_ci++){var _ck=localStorage.key(_ci);if(_ck&&_ck.indexOf('pdfProg_')===0)_clearBpKeys.push(_ck);}
  _clearBpKeys.forEach(function(k){localStorage.removeItem(k);});
  /* Cancel all old user's scheduled notifications */
  scheduleStreakReminder();     // cancels streak ID 30 (streak=0 after log clear → no reschedule)
  /* Cancel old reminder/verse slots in case user upgrading from old build */
  (function(){ var LN=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications; if(LN) LN.cancel({notifications:[1,10,11,12,13,14,15,16,20,21,22,23,24,25,26,50].map(function(id){return{id:id};})}).catch(function(){}); })();
  localStorage.removeItem('dailyVerse');
  localStorage.removeItem('dailyVerseScheduledDate');
  /* Reset in-memory state to defaults */
  S.arSize=2.0;S.tfSize=1.0;S.lineH=2.2;S.showTafsir=true;S.bgAudio=false;
  S.keepAwake=false;S.autoAdvance=false;S.scrollFollowsAudio=true;
  S.hapticFeedback=true;
  if(S.theme!=='noor'){S.theme='noor';applyTheme();}
  applySizes();
  /* Reset in-memory caches that mirror now-cleared localStorage keys */
  initTodayVerses();  // clears S.todayVerses so new user doesn't inherit old counts
  _loadBookmarks();   // clears _bmMap so new user doesn't inherit old bookmarks
}

/* Evict stale localStorage entries to recover space.
   Removes old-prefix prayer keys first, then out-of-window prayer-kurd3 months. */
function _freeLocalStorage(){
  var now=new Date();
  var keepMonths={};
  for(var d=-1;d<=2;d++){
    var m=new Date(now.getFullYear(),now.getMonth()+d,1);
    keepMonths[m.getFullYear()+':'+(m.getMonth()+1)]=true;
  }
  var toRemove=[];
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i);
    if(!k)continue;
    // Always drop legacy prefix keys
    if(k.startsWith('prayer3:')||k.startsWith('prayer-kurd1:')||k.startsWith('prayer-kurd2:')){
      toRemove.push(k);continue;
    }
    // Drop prayer-kurd3 entries outside the keep window
    if(k.startsWith('prayer-kurd3:')){
      var parts=k.split(':'); // prayer-kurd3:CITY:YYYY:M
      var ym=parts[2]+':'+parts[3];
      if(!keepMonths[ym])toRemove.push(k);
    }
  }
  toRemove.forEach(function(k){localStorage.removeItem(k);});
}

/* Safe localStorage.setItem — frees stale data on QuotaExceededError then retries. */
function lsSet(key,val){
  try{localStorage.setItem(key,val);}catch(e){
    if(e&&(e.name==='QuotaExceededError'||e.code===22)){
      _freeLocalStorage();
      try{localStorage.setItem(key,val);}catch(e2){}
    }
  }
}
window.lsSet=lsSet;

var _syncLaunching=false;
function startCloudSync(){
  if(_syncLaunching)return; // prevent concurrent calls from double-fire events
  _syncLaunching=true;
  setTimeout(function(){_syncLaunching=false;},3000);
  stopCloudSync();
  /* Data isolation: wipe previous user's local data when a new user logs in */
  var prevUserId=localStorage.getItem('_lastUserId');
  if(prevUserId&&prevUserId!==S.user.id){
    _clearUserLocalData();
  }
  lsSet('_lastUserId',S.user.id);
  loadFromCloud(function(){
    S.syncInterval=setInterval(syncToCloud,30000);
    subscribeRealtime();
  });
  document.addEventListener('visibilitychange',syncOnHide);
  // Register this device and start heartbeat
  _registerSession();
  _startSessionHeartbeat();
  _subscribeSessionRevocation();
}

function stopCloudSync(){
  if(S.syncInterval){clearInterval(S.syncInterval);S.syncInterval=null}
  document.removeEventListener('visibilitychange',syncOnHide);
  unsubscribeRealtime();
  _stopSessionHeartbeat();
  _unsubscribeSessionRevocation();
}

function syncOnHide(){if(document.hidden&&S.user)syncToCloud()}

function debouncedSync(){
  if(!S.user)return;
  clearTimeout(S._syncDebounce);
  S._syncDebounce=setTimeout(syncToCloud,2000);
}

// Re-sync immediately when network comes back after being offline
window.addEventListener('online',function(){
  if(S.user){_syncRetryDelay=2000;syncToCloud();}
  // Auto-refresh prayer and islamvoice with fresh data
  setTimeout(function(){
    if(S.tab==='prayer'&&window.PrayerUI)PrayerUI.refresh();
    if(S.tab==='islamvoice'&&S.ivInited!==false)loadIslamVoiceData(true);
  },800);
  // Show reconnected toast
  toast(t('toast.network_reconnected'));
});


/* --- Auth Panel --- */
App.openLogin=function(){
  var panel=$('authPanel');
  clear(panel);

  // Header
  var hdr=el('div','auth-hdr');
  var closeBtn=el('button','close-btn');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',function(){App.closeLogin()});
  hdr.appendChild(closeBtn);
  hdr.appendChild(el('div','auth-title',t('auth.login')));
  panel.appendChild(hdr);

  // Body scroll container
  var body=el('div','auth-body');

  // Message area
  var msg=el('div','auth-message');
  msg.id='authMsg';
  body.appendChild(msg);

  // Tabs
  var tabs=el('div','auth-tabs');
  var tabSignin=el('div','auth-tab on',t('auth.login'));
  var tabSignup=el('div','auth-tab',t('auth.signup'));
  tabs.appendChild(tabSignin);
  tabs.appendChild(tabSignup);
  body.appendChild(tabs);

  // Forms container
  var forms=el('div','auth-forms');
  forms.id='authForms';
  body.appendChild(forms);

  panel.appendChild(body);
  panel.classList.add('on');

  var mode='signin';

  function showMsg(text,type){
    msg.textContent=text;
    msg.className='auth-message '+type;
  }
  function clearMsg(){msg.className='auth-message';msg.textContent=''}

  // Translate common Supabase auth error strings to user-friendly Badini messages.
  // Technical details are logged separately; users never see raw API strings.
  function _mapAuthError(msg){
    if(!msg)return t('error.generic');
    var m=msg.toLowerCase();
    if(m.indexOf('invalid login')!==-1||m.indexOf('invalid credentials')!==-1||m.indexOf('wrong password')!==-1)
      return t('auth.err_wrong_credentials')||'Email an jî şîfre şaş e.';
    if(m.indexOf('email not confirmed')!==-1||m.indexOf('not confirmed')!==-1)
      return t('auth.err_email_not_confirmed')||'E-name pejirandî nîn e. Sanduqa xwe kontrol bike.';
    if(m.indexOf('too many requests')!==-1||m.indexOf('rate limit')!==-1||m.indexOf('over_email_send_rate_limit')!==-1)
      return t('auth.err_rate_limit')||'Gelek caran hewl daye. Hinekî bisekine û dûbaré biceribîne.';
    if(m.indexOf('user already registered')!==-1||m.indexOf('already been registered')!==-1||m.indexOf('already exists')!==-1)
      return t('auth.err_already_registered')||'Ev e-name berê hatiye tomarkirin. Têkeve hesabê xwe.';
    if(m.indexOf('network')!==-1||m.indexOf('fetch')!==-1)
      return t('auth.err_network')||'Yek pirsgirêka torê derket. Girêdana xwe kontrol bike.';
    if(m.indexOf('token')!==-1&&m.indexOf('expired')!==-1)
      return t('auth.err_token_expired')||'Koda xwe ya pejirandinê derbasbûye. Koda nû bixwaze.';
    if(m.indexOf('token')!==-1&&(m.indexOf('invalid')!==-1||m.indexOf('wrong')!==-1))
      return t('auth.err_token_invalid')||'Koda te şaş e. Kontrol bike û dûbaré biceribîne.';
    return t('error.generic');
  }

  function buildSigninForm(){
    clear(forms);
    var f=el('div','auth-form');

    var emailGrp=el('div','auth-form-group');
    var emailInput=document.createElement('input');
    emailInput.className='auth-form-input';emailInput.type='email';emailInput.placeholder=t('auth.email');emailInput.dir='ltr';
    on(emailInput,'focus',clearMsg);
    emailGrp.appendChild(emailInput);
    f.appendChild(emailGrp);

    var passGrp=el('div','auth-form-group');
    var passInput=document.createElement('input');
    passInput.className='auth-form-input';passInput.type='password';passInput.placeholder=t('auth.password');passInput.dir='ltr';
    on(passInput,'focus',clearMsg);
    passGrp.appendChild(passInput);
    f.appendChild(passGrp);

    // Enter on email → focus password; Enter on password → submit
    on(emailInput,'keydown',function(e){if(e.key==='Enter'){e.preventDefault();passInput.focus();}});

    function doSignin(){
      var email=emailInput.value.trim();
      var pass=passInput.value;
      if(!email||!pass){showMsg(t('auth.fill_all'),'error');return}
      clearMsg();
      submitBtn.disabled=true;submitBtn.textContent='...';
      S.supabase.auth.signInWithPassword({email:email,password:pass}).then(function(resp){
        if(resp.error){
          console.warn('[Auth] signin error:',resp.error.message);
          showMsg(_mapAuthError(resp.error.message),'error');
          submitBtn.disabled=false;submitBtn.textContent=t('auth.login');
          return;
        }
        var session=resp.data.session;
        if(!session){
          S.supabase.auth.getSession().then(function(r2){
            if(r2.data&&r2.data.session){checkProfileComplete(r2.data.session);}
            else{showMsg(t('auth.verify_email'),'info');submitBtn.disabled=false;submitBtn.textContent=t('auth.login');}
          });
          return;
        }
        checkProfileComplete(session);
      }).catch(function(e){
        console.error('[Auth] signin catch:',e);
        showMsg(_mapAuthError(e.message),'error');
        submitBtn.disabled=false;submitBtn.textContent=t('auth.login');
      });
    }
    on(passInput,'keydown',function(e){if(e.key==='Enter'){e.preventDefault();doSignin();}});

    var submitBtn=el('button','auth-submit-btn',t('auth.login'));
    on(submitBtn,'click',doSignin);
    f.appendChild(submitBtn);

    var divider=el('div','auth-divider');
    divider.appendChild(el('span','',t('auth.or')));
    f.appendChild(divider);

    if(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios'){
      var appleBtn=el('button','auth-apple-btn');
      appleBtn.appendChild(icon('fab fa-apple'));
      appleBtn.appendChild(el('span','',t('auth.apple_login')));
      on(appleBtn,'click',function(){signInWithApple()});
      f.appendChild(appleBtn);
    }

    var googleBtn=el('button','auth-google-btn');
    googleBtn.appendChild(icon('fab fa-google'));
    googleBtn.appendChild(el('span','',t('auth.google_login')));
    on(googleBtn,'click',function(){signInWithGoogle(googleBtn)});
    f.appendChild(googleBtn);

    var guestBtn=el('button','auth-guest-btn',t('auth.continue_guest'));
    on(guestBtn,'click',function(){App.closeLogin()});
    f.appendChild(guestBtn);

    forms.appendChild(f);
  }

  function buildSignupForm(){
    clear(forms);
    var f=el('div','auth-form');

    var nameGrp=el('div','auth-form-group');
    var nameInput=document.createElement('input');
    nameInput.className='auth-form-input';nameInput.type='text';nameInput.placeholder=t('auth.name');
    on(nameInput,'focus',clearMsg);
    nameGrp.appendChild(nameInput);
    f.appendChild(nameGrp);

    var emailGrp=el('div','auth-form-group');
    var emailInput=document.createElement('input');
    emailInput.className='auth-form-input';emailInput.type='email';emailInput.placeholder=t('auth.email');emailInput.dir='ltr';
    on(emailInput,'focus',clearMsg);
    emailGrp.appendChild(emailInput);
    f.appendChild(emailGrp);

    var passGrp=el('div','auth-form-group');
    var passInput=document.createElement('input');
    passInput.className='auth-form-input';passInput.type='password';passInput.placeholder=t('auth.password');passInput.dir='ltr';
    on(passInput,'focus',clearMsg);
    passGrp.appendChild(passInput);
    f.appendChild(passGrp);

    on(nameInput,'keydown',function(e){if(e.key==='Enter'){e.preventDefault();emailInput.focus();}});
    on(emailInput,'keydown',function(e){if(e.key==='Enter'){e.preventDefault();passInput.focus();}});

    function doSignup(){
      var name=nameInput.value.trim();
      var email=emailInput.value.trim();
      var pass=passInput.value;
      if(!name||!email||!pass){showMsg(t('auth.fill_all'),'error');return}
      if(pass.length<6){showMsg(t('auth.pass_min'),'error');return}
      clearMsg();
      submitBtn.disabled=true;submitBtn.textContent='...';
      S.supabase.auth.signUp({
        email:email,password:pass,
        options:{data:{full_name:name,registration_source:'email'}}
      }).then(function(resp){
        if(resp.error){
          console.warn('[Auth] signup error:',resp.error.message);
          showMsg(_mapAuthError(resp.error.message),'error');
          submitBtn.disabled=false;submitBtn.textContent=t('auth.signup');
          return;
        }
        buildOtpForm(email);
      }).catch(function(e){
        console.error('[Auth] signup catch:',e);
        showMsg(_mapAuthError(e.message),'error');
        submitBtn.disabled=false;submitBtn.textContent=t('auth.signup');
      });
    }
    on(passInput,'keydown',function(e){if(e.key==='Enter'){e.preventDefault();doSignup();}});

    var submitBtn=el('button','auth-submit-btn',t('auth.signup'));
    on(submitBtn,'click',doSignup);
    f.appendChild(submitBtn);

    var divider=el('div','auth-divider');
    divider.appendChild(el('span','',t('auth.or')));
    f.appendChild(divider);

    if(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios'){
      var appleBtn=el('button','auth-apple-btn');
      appleBtn.appendChild(icon('fab fa-apple'));
      appleBtn.appendChild(el('span','',t('auth.apple_signup')));
      on(appleBtn,'click',function(){signInWithApple()});
      f.appendChild(appleBtn);
    }

    var googleBtn=el('button','auth-google-btn');
    googleBtn.appendChild(icon('fab fa-google'));
    googleBtn.appendChild(el('span','',t('auth.google_signup')));
    on(googleBtn,'click',function(){signInWithGoogle(googleBtn)});
    f.appendChild(googleBtn);

    var guestBtn=el('button','auth-guest-btn',t('auth.continue_guest'));
    on(guestBtn,'click',function(){App.closeLogin()});
    f.appendChild(guestBtn);

    forms.appendChild(f);
  }

  function buildOtpForm(email){
    clear(forms);
    var f=el('div','auth-form');

    f.appendChild(el('div','auth-otp-info',t('auth.otp_sent',{email:email})));

    var otpGrp=el('div','auth-form-group');
    var otpInput=document.createElement('input');
    otpInput.className='auth-form-input';otpInput.type='text';otpInput.placeholder=t('auth.otp_placeholder');
    otpInput.dir='ltr';otpInput.maxLength=6;otpInput.inputMode='numeric';otpInput.autocomplete='one-time-code';
    on(otpInput,'focus',clearMsg);
    otpGrp.appendChild(otpInput);
    f.appendChild(otpGrp);

    function doVerify(){
      var token=otpInput.value.trim();
      if(!token){showMsg(t('auth.enter_code'),'error');return}
      clearMsg();
      submitBtn.disabled=true;submitBtn.textContent='...';
      resendBtn.disabled=true;
      S.supabase.auth.verifyOtp({email:email,token:token,type:'signup'}).then(function(resp){
        if(resp.error){
          console.warn('[Auth] OTP error:',resp.error.message);
          showMsg(_mapAuthError(resp.error.message),'error');
          submitBtn.disabled=false;submitBtn.textContent=t('auth.verify');
          resendBtn.disabled=false;
          return;
        }
        createAppProfile(resp.data.session);
      }).catch(function(e){
        console.error('[Auth] OTP catch:',e);
        showMsg(_mapAuthError(e.message),'error');
        submitBtn.disabled=false;submitBtn.textContent=t('auth.verify');
        resendBtn.disabled=false;
      });
    }
    on(otpInput,'keydown',function(e){if(e.key==='Enter'){e.preventDefault();doVerify();}});

    var submitBtn=el('button','auth-submit-btn',t('auth.verify'));
    on(submitBtn,'click',doVerify);
    f.appendChild(submitBtn);

    var resendBtn=el('button','auth-guest-btn',t('auth.resend_code')||'Koda nû bişîne');
    on(resendBtn,'click',function(){
      resendBtn.disabled=true;resendBtn.textContent='...';
      S.supabase.auth.resend({type:'signup',email:email}).then(function(){
        showMsg(t('auth.code_resent')||'Koda nû hat şandin.','info');
        setTimeout(function(){resendBtn.disabled=false;resendBtn.textContent=t('auth.resend_code')||'Koda nû bişîne';},30000);
      }).catch(function(e){
        console.warn('[Auth] resend error:',e);
        showMsg(_mapAuthError(e.message),'error');
        resendBtn.disabled=false;resendBtn.textContent=t('auth.resend_code')||'Koda nû bişîne';
      });
    });
    f.appendChild(resendBtn);

    forms.appendChild(f);
    // Auto-focus OTP input after render
    setTimeout(function(){otpInput.focus();},100);
  }

  function loginSuccess(session){
    setUserFromSession(session);
    // startCloudSync() is triggered by onAuthStateChange(SIGNED_IN) — don't call twice
    App.closeLogin();
    App.tab('settings');
    renderSettings();
  }

  function createAppProfile(session){
    if(!session)return;
    var u=session.user;
    var meta=u.user_metadata||{};
    S.supabase.from('profiles').upsert({
      id:u.id,
      email:u.email,
      full_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
      display_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
      avatar_url:meta.avatar_url||null,
      registration_source:meta.registration_source||(meta.provider==='google'?'google':'email'),
      has_completed_signup:true,
      first_login_at:new Date().toISOString()
    },{onConflict:'id'}).then(function(){
      toast(t('toast.account_created'));
      loginSuccess(session);
    }).catch(function(e){console.error('Profile creation error:',e);loginSuccess(session)});
  }

  function checkProfileComplete(session){
    if(!session){App.closeLogin();return}
    S.supabase.from('profiles').select('has_completed_signup').eq('id',session.user.id).single()
    .then(function(resp){
      if(resp.error&&resp.error.code==='PGRST116'){
        createAppProfile(session);
        return;
      }
      if(resp.data&&!resp.data.has_completed_signup){
        S.supabase.from('profiles').update({has_completed_signup:true}).eq('id',session.user.id).then(function(){});
      }
      toast(t('toast.logged_in'));
      loginSuccess(session);
    }).catch(function(){loginSuccess(session)});
  }

  var _googleBusy=false;
  function signInWithGoogle(btn){
    if(_googleBusy)return;
    if(!S.supabase){showMsg(t('error.system_not_ready'),'error');return}
    _googleBusy=true;
    if(btn){btn.disabled=true;btn.style.opacity='0.6';}

    var redirectUrl='com.tafsirkurd.app://auth/callback';
    if(!window.Capacitor||!window.Capacitor.isNativePlatform()){
      redirectUrl=window.location.origin+'/app/index.html';
    }

    S.supabase.auth.signInWithOAuth({
      provider:'google',
      options:{
        redirectTo:redirectUrl,
        queryParams:{access_type:'offline',prompt:'consent'},
        skipBrowserRedirect:true
      }
    }).then(function(resp){
      if(resp.error){
        console.warn('[Google] OAuth error:',resp.error.message);
        showMsg(_mapAuthError(resp.error.message),'error');
        _googleBusy=false;
        if(btn){btn.disabled=false;btn.style.opacity='';}
        return;
      }
      if(resp.data&&resp.data.url){
        if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser){
          window.Capacitor.Plugins.Browser.open({url:resp.data.url});
        }else{
          window.location.href=resp.data.url;
        }
      }
      // Browser opened — restore button after 3s so user can retry if browser dismissed
      setTimeout(function(){
        _googleBusy=false;
        if(btn){btn.disabled=false;btn.style.opacity='';}
      },3000);
    }).catch(function(e){
      console.error('[Google] OAuth catch:',e);
      showMsg(_mapAuthError(e.message),'error');
      _googleBusy=false;
      if(btn){btn.disabled=false;btn.style.opacity='';}
    });
  }

  function _genNonce(len){
    var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var arr=new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function(x){return chars[x%chars.length]}).join('');
  }
  function _sha256hex(str){
    return crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0')}).join('');
    });
  }
  var _appleBusy=false;
  function signInWithApple(){
    if(_appleBusy)return;
    if(!S.supabase){showMsg(t('error.system_not_ready'),'error');return}
    var plugin=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TafsirAppleSignIn;
    if(!plugin){showMsg(t('error.apple_unavailable')||'Sign in with Apple is not available on this device.','error');return}
    _appleBusy=true;
    // Set loading state on Apple button
    var appleBtn=document.querySelector('.auth-apple-btn');
    if(appleBtn){appleBtn.disabled=true;appleBtn.style.opacity='0.6';}
    console.log('[Apple] authorize() — starting');
    var rawNonce=_genNonce(32);
    _sha256hex(rawNonce).then(function(hashedNonce){
      console.log('[Apple] nonce ready, calling plugin.authorize()');
      return plugin.authorize({nonce:hashedNonce});
    }).then(function(res){
      console.log('[Apple] native result — user:',res&&res.user,'token present:',(res&&!!res.identityToken),'email:',res&&res.email,'givenName:',res&&res.givenName);
      var token=res&&res.identityToken;
      if(!token){
        console.warn('[Apple] no identityToken in result');
        showMsg(t('error.apple_failed')||'Apple sign-in failed. Please try again.','error');
        return null;
      }
      console.log('[Apple] calling supabase.auth.signInWithIdToken()');
      return S.supabase.auth.signInWithIdToken({provider:'apple',token:token,nonce:rawNonce});
    }).then(function(resp){
      if(!resp)return;
      if(resp.error){
        console.error('[Apple] Supabase token exchange error:',resp.error.message);
        showMsg(t('error.apple_failed')||'Apple sign-in failed. Please try again.','error');
        return;
      }
      var session=resp.data&&resp.data.session;
      console.log('[Apple] Supabase session OK — user:',session&&session.user&&session.user.email);
      if(session){
        // checkProfileComplete handles profile creation + startCloudSync + loginSuccess
        checkProfileComplete(session);
      }
    }).catch(function(e){
      var code=e&&e.data&&e.data.errorCode;
      var msg=e&&(e.message||e.errorMessage||'');
      console.log('[Apple] error — code:',code,'msg:',msg);
      // 1001 = user cancelled — always silent
      if(code===1001||msg.indexOf('1001')!==-1||msg.toLowerCase().indexOf('cancel')!==-1)return;
      // 1000 = presentation/context error — show friendly retry message
      if(code===1000||msg.indexOf('1000')!==-1){
        showMsg(t('error.apple_try_again')||'Could not open Sign in with Apple. Please try again.','error');
        return;
      }
      // Any other error — friendly message, not raw system string
      showMsg(t('error.apple_failed')||'Apple sign-in failed. Please try again.','error');
    }).finally(function(){
      _appleBusy=false;
      var appleBtn=document.querySelector('.auth-apple-btn');
      if(appleBtn){appleBtn.disabled=false;appleBtn.style.opacity='';}
    });
  }

  on(tabSignin,'click',function(){
    if(mode==='signin')return;
    mode='signin';
    tabSignin.classList.add('on');tabSignup.classList.remove('on');
    clearMsg();buildSigninForm();
  });
  on(tabSignup,'click',function(){
    if(mode==='signup')return;
    mode='signup';
    tabSignup.classList.add('on');tabSignin.classList.remove('on');
    clearMsg();buildSignupForm();
  });

  buildSigninForm();
};

App.closeLogin=function(){
  var panel=$('authPanel');
  if(panel)panel.classList.remove('on');
};

App.logout=function(){
  if(!S.supabase)return;
  // confirm() is blocked in iOS WKWebView — skip it on native; the explicit tap is confirmation
  var _plat=window.Capacitor&&window.Capacitor.getPlatform?window.Capacitor.getPlatform():'web';
  var _isNative=(_plat==='ios'||_plat==='android');
  if(!_isNative&&!confirm(t('profile.confirm_logout')))return;
  _removeCurrentDeviceSession(); // clean up before sign-out
  S.supabase.auth.signOut().then(function(){
    S.user=null;
    stopCloudSync();
    App.closeProfile(); // close only after successful logout
    toast(t('toast.logged_out'));
    renderSettings();
  }).catch(function(e){console.error('Logout error:',e)});
};

App.forceSync=function(){
  if(!S.user){toast(t('profile.login_first'));return}
  syncToCloud();
  toast(t('toast.synced'));
};

// Pure merge helpers exposed for unit testing
window._AppSyncMerge={mergeSyncData:mergeSyncData,_mergeReadLog:_mergeReadLog,_mergeProgress:_mergeProgress};

