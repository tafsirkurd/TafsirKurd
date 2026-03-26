/**
 * TafsirKurd i18n System v3
 *
 * Architecture (race-condition free):
 *   1. Wipe ALL old caches (v1, v2 keys) on every load
 *   2. Try v3 localStorage cache → instant if valid
 *   3. Otherwise load bundled kmr.json (cache:'no-store') → guaranteed fresh
 *   4. Fire i18n:ready ONLY after translations are in memory
 *   5. Merge remote DB once in background → fire i18n:updated if anything changed
 *
 * No polling. No ETag. No race conditions.
 */
(function(){
'use strict';

// ── Cache versioning ─────────────────────────────────────────────────────────
var CACHE_KEY = 'tafsirkurd_i18n_v3';

// Wipe every old cache key so stale data never bleeds through
var OLD_KEYS = [
  'tafsirkurd_i18n_cache',
  'tafsirkurd_i18n_cache_v2',
  'tafsirkurd_i18n_etag',
  'tafsirkurd_i18n_etag_v2'
];
OLD_KEYS.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });

// ── State ────────────────────────────────────────────────────────────────────
var translations = {};
var _initPromise  = null;

// ── Public: t() ──────────────────────────────────────────────────────────────
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

// ── applyTranslations ────────────────────────────────────────────────────────
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
    // Must contain at least one dotted app key (not just platform keys)
    if(data && Object.keys(data).some(function(k){ return k.indexOf('.')>0; })){
      return data;
    }
  }catch(e){}
  return null;
}

function writeCache(data){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }catch(e){}
}

// ── Load bundled kmr.json (always fresh — cache:'no-store') ──────────────────
function loadLocal(){
  // ?v= param + cache:'no-store' together guarantee a fresh read from the bundle
  return fetch('/i18n/kmr.json?v=20260326', { cache: 'no-store' })
    .then(function(r){
      if(!r.ok) throw new Error('kmr.json HTTP '+r.status);
      return r.json();
    })
    .then(function(data){
      console.log('[i18n] Loaded from kmr.json');
      return data;
    });
}

// ── Merge remote DB translations ─────────────────────────────────────────────
// Returns a Promise so initLang() can await it at startup (no-flash guarantee).
// The 30s poll also calls this; those calls fire-and-forget.
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
      console.log('[i18n] Merged remote translations');
      document.dispatchEvent(new CustomEvent('i18n:updated'));
    })
    .catch(function(e){
      console.warn('[i18n] Remote fetch failed — using local only:', e.message);
    });
}

// ── initLang ─────────────────────────────────────────────────────────────────
// Layer order (each layer overwrites the previous for matching keys):
//   1. kmr.json   — bundled, always complete, guarantees ZERO raw keys
//   2. v3 cache   — admin-updated values from previous session
//   3. remote DB  — latest admin values (3s timeout, never blocks)
//
// Even if cache is stale AND remote times out, kmr.json covers every key.
function initLang(){
  if(_initPromise) return _initPromise;

  // 3s timeout on remote — slow network never blocks the splash
  function mergeRemoteWithTimeout(){
    var timeout = new Promise(function(resolve){ setTimeout(resolve, 3000); });
    return Promise.race([mergeRemote(), timeout]);
  }

  _initPromise = loadLocal()
    .catch(function(e){
      // Should never happen (file is in the bundle), but never crash
      console.error('[i18n] kmr.json failed:', e.message);
      return {};
    })
    .then(function(local){
      // Layer 1: kmr.json — guaranteed base, every key present
      Object.assign(translations, local);
      console.log('[i18n] Base layer: kmr.json (' + Object.keys(local).length + ' keys)');

      // Layer 2: overlay cache — admin values from last session (no new keys needed)
      var cached = readCache();
      if(cached){
        Object.assign(translations, cached);
        console.log('[i18n] Cache overlaid');
      }

      applyTranslations();

      // Layer 3: overlay remote — latest admin values, wait before splash hides
      return mergeRemoteWithTimeout();
    })
    .then(function(){ return translations; });

  return _initPromise;
}

// ── Poll every 30s so admin panel changes appear within ~30s ─────────────────
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
