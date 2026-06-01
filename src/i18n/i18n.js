/**
 * TafsirKurd i18n System v4
 *
 * Layer order (highest priority wins per key):
 *   1. window.KMR_TRANSLATIONS — bundled JS, synchronous, zero-fetch, covers all keys
 *   2. localStorage v3 cache   — last-known remote values from previous session
 *   3. Remote DB (30s poll)    — live admin edits, 3s timeout at startup
 *
 * Hardening over v3:
 *   ATOMIC SWAP        — remote fetched into a temp object; live translations
 *                        only replaced after full validation passes. No partial
 *                        mutation of the live state during fetch/merge.
 *   PAYLOAD GUARD      — remote payload rejected entirely if: JSON parse fails,
 *                        shape invalid, key count < MIN_REMOTE_KEYS, value types
 *                        not all strings, empty-value ratio > MAX_EMPTY_RATIO.
 *                        Fallback: cached → bundled. Status: rejected_remote_payload.
 *   CRITICAL KEY GUARD — protected list of keys where the bundled value always wins
 *                        when the remote value is absent or blank. Admin can still
 *                        provide valid non-empty remote values for these keys.
 *   READY FLAG         — i18n.ready set synchronously after Layer 1 loads.
 *                        UI can render immediately without waiting for network.
 *   FETCH GUARD        — one mergeRemote() in-flight at a time; duplicate calls
 *                        during a slow fetch are silently dropped.
 *   INTERVAL GUARD     — polling interval created exactly once; no stacking on
 *                        repeated loads or hot-module scenarios.
 *   SESSION STATS      — tracks rejectedCount, swapCount, avgFetchMs per session.
 *                        Included in every health report, no personal data.
 *   NO PRIVATE DATA    — health reports contain only platform, layer, key count,
 *                        version, stats. Never user ID, email, or identifier.
 */
(function(){
'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
var CACHE_KEY        = 'tafsirkurd_i18n_v3';
var HEALTH_SENT_KEY  = 'i18n_health_sent_session'; // sessionStorage — one report/session
var _platform        = (function(){ try{ return (window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform())||'web'; }catch(e){ return 'web'; } })();
var REMOTE_URL       = (_platform==='web'?'':'https://tafsirkurd.com')+'/app-translations?platform='+_platform;
var POLL_MS          = 10000;  // 10s polling interval
var STARTUP_TIMEOUT  = 1500;   // max ms to wait for remote before unblocking splash
var MIN_REMOTE_KEYS  = 10;     // below this → obviously broken payload, reject
var MAX_EMPTY_RATIO  = 0.15;   // >15% blank values → reject

// Keys where bundled value wins if remote value is blank or absent.
// Admin CAN override these with valid non-empty remote values.
var CRITICAL_KEYS = [
  // Bottom navigation
  'tabs.quran','tabs.video','tabs.prayer','tabs.gencine','tabs.settings',
  'tabs.goals','tabs.bookmarks',
  // Screen headers
  'header.prayer','header.gencine',
  // Prayer labels (shown on prayer screen every day)
  'prayer.fajr','prayer.sunrise','prayer.dhuhr',
  'prayer.asr','prayer.maghrib','prayer.isha',
  // Quran controls
  'quran.loading','quran.search',
  // Core auth/settings
  'settings.language','settings.notifications','settings.theme',
  // Gencine / islamvoice loading states
  'iv.loading','iv.empty',
  // Generic UI
  'common.loading','common.error','common.retry','common.close','common.save'
];

// ── Wipe legacy cache keys ────────────────────────────────────────────────────
['tafsirkurd_i18n_cache','tafsirkurd_i18n_cache_v2',
 'tafsirkurd_i18n_etag','tafsirkurd_i18n_etag_v2'].forEach(function(k){
  try{ localStorage.removeItem(k); }catch(e){}
});

// ── Module state ──────────────────────────────────────────────────────────────
var translations     = {};      // LIVE object — only ever replaced, never mutated
var _bundledSnapshot = {};      // immutable copy of Layer 1, set once in loadBundled()
var _cachedSnapshot  = null;    // what was in localStorage at startup, set once
var _initPromise     = null;
var _fetchInFlight   = false;   // prevents duplicate concurrent mergeRemote calls
var _pollInterval    = null;    // single interval reference

// Per-session stats (not per-user — no identifiers)
var _rejectedCount   = 0;
var _swapCount       = 0;
var _fetchTimes      = [];      // ms durations of remote fetches this session
var _initStatus      = 'pending';
var _initLayer       = 'bundled';

// ── t() ──────────────────────────────────────────────────────────────────────
function t(key, replacements){
  var value = translations[key];
  if(value === undefined) return key;
  if(replacements && typeof value === 'string'){
    Object.keys(replacements).forEach(function(k){
      value = value.replace(new RegExp('\\$\\{'+k+'\\}','g'), String(replacements[k]));
    });
  }
  return value;
}

// ── applyTranslations — rewrites data-i18n DOM after every swap ───────────────
function applyTranslations(){
  if(!Object.keys(translations).length) return;
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var v = translations[el.getAttribute('data-i18n')];
    if(v !== undefined) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
    var v = translations[el.getAttribute('data-i18n-placeholder')];
    if(v !== undefined) el.placeholder = v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el){
    var v = translations[el.getAttribute('data-i18n-title')];
    if(v !== undefined) el.title = v;
  });
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
function readCache(){
  try{
    var raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return null;
    var data = JSON.parse(raw);
    // Sanity check: must contain at least one dotted key (e.g. "tabs.quran")
    if(data && typeof data === 'object' &&
       Object.keys(data).some(function(k){ return k.indexOf('.')>0; })){
      return data;
    }
  }catch(e){}
  return null;
}

function writeCache(data){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }catch(e){}
}

function purgeCache(){
  try{ localStorage.removeItem(CACHE_KEY); }catch(e){}
  _cachedSnapshot = null;
  console.log('[i18n] cache purged (remote version bump)');
}

// ── Payload validation ────────────────────────────────────────────────────────
function _validateRemotePayload(data){
  if(!data || typeof data !== 'object' || Array.isArray(data))
    return { valid:false, reason:'invalid_shape' };

  var keys = Object.keys(data);
  if(keys.length < MIN_REMOTE_KEYS)
    return { valid:false, reason:'too_few_keys:'+keys.length };

  var emptyCount = 0, badTypeCount = 0;
  for(var i=0; i<keys.length; i++){
    var v = data[keys[i]];
    if(typeof v !== 'string'){ badTypeCount++; }
    else if(!v.trim()){ emptyCount++; }
  }

  if(badTypeCount > 0)
    return { valid:false, reason:'invalid_value_types:'+badTypeCount };

  if(keys.length > 0 && emptyCount/keys.length > MAX_EMPTY_RATIO)
    return { valid:false, reason:'too_many_empty_values:'+emptyCount+'/'+keys.length };

  return { valid:true };
}

// ── Critical key protection ───────────────────────────────────────────────────
// Accepts the fully-built temp object and patches any critical key whose remote
// value is missing or blank, restoring the bundled value.
// Returns the number of keys restored.
function _applyCriticalKeyGuard(temp){
  var restored = 0;
  for(var i=0; i<CRITICAL_KEYS.length; i++){
    var k = CRITICAL_KEYS[i];
    var bundledVal = _bundledSnapshot[k];
    var tempVal    = temp[k];
    if(bundledVal && (!tempVal || typeof tempVal !== 'string' || !tempVal.trim())){
      temp[k] = bundledVal;
      restored++;
    }
  }
  return restored;
}

// ── Layer 1: bundled translations ─────────────────────────────────────────────
function loadBundled(){
  // Also check __kmrBundle for backwards compat with older iOS builds that used that name
  var data = window.KMR_TRANSLATIONS || window.__kmrBundle;
  if(data && typeof data === 'object' && Object.keys(data).length > 0){
    _bundledSnapshot = Object.assign({}, data); // immutable copy
    console.log('[i18n] Layer 1: bundled ('+Object.keys(data).length+' keys)');
    return data;
  }
  console.error('[i18n] FATAL: window.KMR_TRANSLATIONS missing — kmr-bundled.js did not load.');
  _bundledSnapshot = {};
  return {};
}

// ── Layer 3: remote DB — atomic merge ────────────────────────────────────────
// Fetches remote into a TEMP object, validates, then atomically swaps.
// Never touches the live translations object until validation passes.
function mergeRemote(){
  if(navigator.onLine === false)
    return Promise.reject(Object.assign(new Error('offline'), {name:'OfflineError'}));
  var t0 = Date.now();

  return fetch(REMOTE_URL, { cache:'no-cache' })
    .then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    })
    .then(function(remote){
      var fetchMs = Date.now()-t0;
      _fetchTimes.push(fetchMs);
      if(_fetchTimes.length > 20) _fetchTimes.shift(); // keep last 20 for avg

      // ── Validate remote payload ──────────────────────────────────────────
      // Empty object {} = server timeout fallback (not a real payload rejection)
      if(remote && typeof remote === 'object' && Object.keys(remote).length === 0){
        console.log('[i18n] Remote: empty response (timeout) — kept cached/bundled');
        throw Object.assign(new Error('empty_response'), {name:'OfflineError'});
      }
      var check = _validateRemotePayload(remote);
      if(!check.valid){
        _rejectedCount++;
        console.warn('[i18n] Remote payload REJECTED ('+check.reason+') — kept cached/bundled');
        _reportHealth({ status:'rejected_remote_payload', error:check.reason });
        return; // leave live translations untouched
      }

      // ── Build new state in a temp object — never touch translations directly ──
      var temp = Object.assign(
        {},
        _bundledSnapshot,                          // base: bundled (every key)
        _cachedSnapshot  ? _cachedSnapshot  : {},  // overlay: last cached
        remote                                     // top: fresh remote
      );

      // ── Critical key guard: patch any remote-blanked critical keys ───────
      var restored = _applyCriticalKeyGuard(temp);
      if(restored > 0)
        console.log('[i18n] Critical key guard: restored '+restored+' bundled values');

      // ── Check whether anything actually changed ───────────────────────────
      var changed = Object.keys(remote).some(function(k){
        return translations[k] !== temp[k];
      });
      if(!changed){
        console.log('[i18n] Remote: no changes ('+fetchMs+'ms)');
        return;
      }

      // ── ATOMIC SWAP ───────────────────────────────────────────────────────
      translations = temp;
      _swapCount++;
      _initLayer = 'remote';

      writeCache(translations);
      applyTranslations(); // rewrite all data-i18n attributes
      console.log('[i18n] Layer 3: atomic swap ('+Object.keys(remote).length+' remote keys, '+fetchMs+'ms)');

      // Notify app.js — triggers re-render of currently visible tab/screen
      document.dispatchEvent(new CustomEvent('i18n:updated', {
        detail:{ keyCount:Object.keys(translations).length, fetchMs:fetchMs }
      }));

      // Call app-level re-render hook if registered
      if(typeof window._i18nRerenderHook === 'function'){
        try{ window._i18nRerenderHook(); }catch(e){}
      }
    })
    .catch(function(e){
      if(e && e.name === 'OfflineError') throw e; // propagate silently
      console.warn('[i18n] Remote fetch failed (offline or timeout) — layers 1+2 in use:', e.message);
      throw e;
    });
}

// ── Guarded poll — one in-flight at a time, with failure backoff ──────────────
var _fetchFailCount = 0;
var _lastFailTs     = 0;
var BACKOFF_AFTER   = 3;      // consecutive failures before backing off
var BACKOFF_MS      = 300000; // 5 minutes

function _mergeRemoteGuarded(){
  if(_fetchInFlight) return;
  // Back off for 5 min after 3+ consecutive failures (e.g. ERR_CONNECTION_CLOSED)
  if(_fetchFailCount >= BACKOFF_AFTER && Date.now() - _lastFailTs < BACKOFF_MS) return;
  _fetchInFlight = true;
  mergeRemote()
    .then(function(){ _fetchFailCount = 0; })
    .catch(function(){ _fetchFailCount++; _lastFailTs = Date.now(); })
    .then(function(){ _fetchInFlight = false; });
}

// ── Health reporting (no personal data) ──────────────────────────────────────
function _avgFetchMs(){
  if(!_fetchTimes.length) return null;
  return Math.round(_fetchTimes.reduce(function(s,v){ return s+v; },0)/_fetchTimes.length);
}

function _reportHealth(opts){
  if(window.i18nHealthReportingEnabled === false) return;

  // For non-rejection events: only one report per session (don't spam)
  if(opts.status !== 'rejected_remote_payload'){
    try{
      if(sessionStorage.getItem(HEALTH_SENT_KEY)) return;
      sessionStorage.setItem(HEALTH_SENT_KEY, '1');
    }catch(e){}
  }

  // Opaque session ID — not linked to any user account
  var sessionId;
  try{
    sessionId = sessionStorage.getItem('i18n_session_id');
    if(!sessionId){
      sessionId = Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
      sessionStorage.setItem('i18n_session_id', sessionId);
    }
  }catch(e){ sessionId = 'unknown'; }

  var platform = 'web';
  try{
    if(window.Capacitor && window.Capacitor.getPlatform)
      platform = window.Capacitor.getPlatform();
  }catch(e){}

  var payload = {
    platform:       platform,
    app_version:    window.APP_VERSION || null,
    layer_used:     opts.layer || _initLayer,
    cache_version:  (function(){ try{ return localStorage.getItem('i18n_schema_ver')||null; }catch(e){ return null; } })(),
    key_count:      Object.keys(translations).length,
    status:         opts.status,
    error_msg:      opts.error || null,
    session_id:     sessionId,
    // Session-level stats
    bundled_loaded: Object.keys(_bundledSnapshot).length > 0,
    rejected_count: _rejectedCount,
    swap_count:     _swapCount,
    fetch_time_ms:  _avgFetchMs()
  };

  fetch('https://tafsirkurd.com/i18n-health-report', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  }).catch(function(){});
}

// ── initLang ──────────────────────────────────────────────────────────────────
function initLang(){
  if(_initPromise) return _initPromise;

  // Layer 1 — synchronous, covers every key, no fetch needed
  var bundled = loadBundled();
  Object.assign(translations, bundled);

  // ready is true as soon as Layer 1 is applied — UI can render now
  window.i18n.ready       = Object.keys(_bundledSnapshot).length > 0;
  window.i18n.bundledLoaded = window.i18n.ready;

  // Layer 2 — cached remote values from last session
  _cachedSnapshot = readCache();
  if(_cachedSnapshot){
    // Build atomically: bundled + cache
    var merged = Object.assign({}, _bundledSnapshot, _cachedSnapshot);
    _applyCriticalKeyGuard(merged);
    translations = merged;
    _initLayer = 'cache';
    console.log('[i18n] Layer 2: cache overlaid ('+Object.keys(_cachedSnapshot).length+' keys)');
  }

  // Apply layers 1+2 immediately — UI renders with correct text before network
  applyTranslations();

  // Layer 3 — race against 3s timeout so splash is never blocked.
  // No AbortController: we let the fetch run to completion in the background.
  // If it finishes after the timeout, the .then() handler still fires and applies updates.
  var timeout = new Promise(function(resolve){
    setTimeout(resolve, STARTUP_TIMEOUT);
  });

  _initPromise = Promise.race([
    mergeRemote().then(
      function(){
        _initStatus = _cachedSnapshot ? 'valid_cache' : 'fresh_fetch';
        if(Object.keys(_bundledSnapshot).length === 0) _initStatus = 'fetch_failed_no_bundle';
      },
      function(err){
        if(err && err.name === 'OfflineError') return; // silent — device is offline
        _initStatus = Object.keys(_bundledSnapshot).length > 0
          ? 'fetch_failed_using_bundle'
          : 'fetch_failed_no_bundle';
        _reportHealth({ status:_initStatus, error:err&&err.message });
        return; // don't rethrow — layers 1+2 cover this
      }
    ),
    timeout
  ]).then(function(){
    // Report health for the non-rejection init paths
    if(_initStatus !== 'pending') _reportHealth({ status:_initStatus });
    else{
      // Timeout fired before remote resolved — still healthy if bundled loaded
      _initStatus = Object.keys(_bundledSnapshot).length > 0
        ? 'fetch_failed_using_bundle' // remote timed out
        : 'fetch_failed_no_bundle';
      _reportHealth({ status:_initStatus });
    }
    return translations;
  });

  return _initPromise;
}

// ── Start polling — exactly once, one fetch in-flight at a time ───────────────
if(!_pollInterval){
  _pollInterval = setInterval(_mergeRemoteGuarded, POLL_MS);
}

// ── Public API ────────────────────────────────────────────────────────────────
window.i18n = {
  t:                t,
  initLang:         initLang,
  applyTranslations:applyTranslations,
  purgeCache:       purgeCache,
  ready:            false,       // set true after Layer 1 loads in initLang()
  bundledLoaded:    false,       // set true if KMR_TRANSLATIONS was present
  isHealthy:        function(){
    return window.i18n.bundledLoaded && Object.keys(translations).length >= MIN_REMOTE_KEYS;
  },
  getTranslations:  function(){ return Object.assign({}, translations); },
  getStatus:        function(){
    return {
      ready:          window.i18n.ready,
      bundledLoaded:  window.i18n.bundledLoaded,
      layer:          _initLayer,
      status:         _initStatus,
      keyCount:       Object.keys(translations).length,
      bundledKeyCount:Object.keys(_bundledSnapshot).length,
      rejectedCount:  _rejectedCount,
      swapCount:      _swapCount,
      avgFetchMs:     _avgFetchMs()
    };
  }
};
window.t = t;

// ── One-time text-fix: update stale DB values from any client ─────────────────
// Calls /apply-text-fixes once per FIXES_VERSION. The server applies
// hardcoded corrections and marks the version in site_settings so the DB
// update runs exactly once globally. Client tracks locally to skip the call.
(function(){
  var _FIX_VER = '20260601g';
  var _LS_KEY  = 'tk_tf';
  try{ if(localStorage.getItem(_LS_KEY) === _FIX_VER) return; } catch(e){ return; }
  var _base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'https://tafsirkurd.com' : '';
  fetch(_base + '/apply-text-fixes', { method: 'POST' })
    .then(function(r){
      if(!r.ok) return;
      try{ localStorage.setItem(_LS_KEY, _FIX_VER); }catch(e){}
      // Re-fetch translations so the corrected values load immediately
      if(typeof window.i18n !== 'undefined' && typeof window.i18n.purgeCache === 'function'){
        window.i18n.purgeCache();
      }
    })
    .catch(function(){});
})();

})();
