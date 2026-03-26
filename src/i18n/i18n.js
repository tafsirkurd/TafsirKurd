/**
 * TafsirKurd i18n System v3
 *
 * Layer order (each layer overwrites matching keys from the previous):
 *   1. window.KMR_TRANSLATIONS  — embedded JS object, loaded synchronously
 *                                  by kmr-bundled.js. ZERO fetch. Works 100%
 *                                  offline on first launch with no cache.
 *   2. v3 localStorage cache    — admin-updated values from previous session
 *   3. remote DB (30s poll)     — latest admin values, 3s timeout at startup
 *
 * If remote times out or the device is offline, layers 1+2 cover every key.
 * If there is no cache (fresh install), layer 1 alone covers every key.
 * Raw keys (iv.*, etc.) are therefore impossible after this change.
 */
(function(){
'use strict';

// ── Cache versioning ──────────────────────────────────────────────────────────
var CACHE_KEY = 'tafsirkurd_i18n_v3';

// Wipe every old cache key so stale data never bleeds through
['tafsirkurd_i18n_cache','tafsirkurd_i18n_cache_v2',
 'tafsirkurd_i18n_etag','tafsirkurd_i18n_etag_v2'].forEach(function(k){
  try{ localStorage.removeItem(k); }catch(e){}
});

// ── State ─────────────────────────────────────────────────────────────────────
var translations = {};
var _initPromise = null;

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

// ── applyTranslations ─────────────────────────────────────────────────────────
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
    if(data && Object.keys(data).some(function(k){ return k.indexOf('.')>0; })){
      return data;
    }
  }catch(e){}
  return null;
}

function writeCache(data){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }catch(e){}
}

// ── Layer 1: bundled translations (synchronous, no fetch, always offline-safe)
function loadBundled(){
  var data = window.KMR_TRANSLATIONS;
  if(data && typeof data === 'object' && Object.keys(data).length > 0){
    console.log('[i18n] Layer 1: bundled object ('+Object.keys(data).length+' keys)');
    return data;
  }
  // kmr-bundled.js was not loaded — fatal misconfiguration
  console.error('[i18n] FATAL: window.KMR_TRANSLATIONS missing. kmr-bundled.js not loaded.');
  return {};
}

// ── Layer 3: remote DB merge ──────────────────────────────────────────────────
function mergeRemote(){
  return fetch('https://tafsirkurd.com/app-translations?platform=android', { cache: 'no-cache' })
    .then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    })
    .then(function(data){
      if(!data || typeof data !== 'object') return;
      var changed = Object.keys(data).some(function(k){ return translations[k] !== data[k]; });
      if(!changed){ console.log('[i18n] Remote: no changes'); return; }
      Object.assign(translations, data);
      writeCache(translations);
      applyTranslations();
      console.log('[i18n] Layer 3: remote merged');
      document.dispatchEvent(new CustomEvent('i18n:updated'));
    })
    .catch(function(e){
      console.warn('[i18n] Remote unavailable (offline or timeout) — layers 1+2 in use:', e.message);
    });
}

// ── initLang ──────────────────────────────────────────────────────────────────
function initLang(){
  if(_initPromise) return _initPromise;

  // 3s hard timeout on remote so splash never blocks on slow networks
  function mergeRemoteWithTimeout(){
    var timeout = new Promise(function(resolve){ setTimeout(resolve, 3000); });
    return Promise.race([mergeRemote(), timeout]);
  }

  // Layer 1 — synchronous, always succeeds, covers every key
  var bundled = loadBundled();
  Object.assign(translations, bundled);

  // Layer 2 — cached admin translations from last session
  var cached = readCache();
  if(cached){
    Object.assign(translations, cached);
    console.log('[i18n] Layer 2: cache overlaid');
  }

  // Apply layers 1+2 immediately — UI can render without waiting for network
  applyTranslations();

  // Layer 3 — remote, wait for it before resolving so splash hides fully loaded
  _initPromise = mergeRemoteWithTimeout().then(function(){ return translations; });
  return _initPromise;
}

// ── Poll every 30s — admin changes appear within 30s ─────────────────────────
setInterval(mergeRemote, 30000);

// ── Exports ───────────────────────────────────────────────────────────────────
window.i18n = {
  t: t,
  initLang: initLang,
  applyTranslations: applyTranslations,
  getTranslations: function(){ return Object.assign({}, translations); }
};
window.t = t;

})();
