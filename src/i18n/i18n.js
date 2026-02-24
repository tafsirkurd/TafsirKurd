/**
 * TafsirKurd i18n System
 * Kurdish Badini (kmr) translations
 * Priority: 1) localStorage cache (if valid)  2) Local bundled kmr.json  3) Remote merge in background
 *
 * NOTE: loadRemote() fetches platform=android translations (data-t system keys like android_div_9).
 * Those keys are MERGED on top of the local kmr.json keys — never used as a standalone replacement —
 * so the dotted i18n keys (reader.continue, settings.dark_mode, etc.) always come from kmr.json.
 */
(function(){
'use strict';

var translations = {};
var loadPromise = null;
var CACHE_KEY = 'tafsirkurd_i18n_cache';
var CACHE_TS_KEY = 'tafsirkurd_i18n_ts';
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Try loading from remote endpoint (background merge only — do not use as primary source)
 */
function loadRemote(){
  return fetch('https://tafsirkurd.com/app-translations?platform=android', {
    cache: 'no-cache'
  })
    .then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data){
      if(!data || typeof data !== 'object') throw new Error('Invalid data');
      return data;
    });
}

/**
 * Try loading from localStorage cache.
 * Only valid if it contains dotted i18n keys (e.g. "reader.continue").
 */
function loadCache(){
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if(!cached) return null;
    var data = JSON.parse(cached);
    // Validate: must have at least one dotted i18n key to avoid using a poisoned cache
    // (a previous loadRemote() may have cached only android_div_* keys)
    if(data && Object.keys(data).some(function(k){ return k.indexOf('.') > 0; })){
      return data;
    }
  } catch(e){}
  return null;
}

/**
 * Load the local Badini translation JSON (bundled in APK assets — always available)
 */
function loadLocal(){
  return fetch('/i18n/kmr.json')
    .then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
}

/**
 * Save current translations to localStorage cache
 */
function saveCache(){
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(translations));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch(e){}
}

/**
 * Initialize language on app load
 * Priority: 1) Valid cache (has dotted keys)  2) Bundled kmr.json  3) Remote merge (background)
 */
function initLang(){
  if(loadPromise) return loadPromise;

  var cached = loadCache();
  var cacheTs = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0');
  var cacheValid = cached && (Date.now() - cacheTs) < CACHE_TTL;

  // Merge remote updates in background then re-save cache
  function bgMergeRemote(){
    loadRemote().then(function(data){
      Object.assign(translations, data);
      applyTranslations();
      saveCache();
      // Notify app so JS-rendered screens (Settings etc.) can re-render with new values
      document.dispatchEvent(new CustomEvent('i18n:updated'));
    }).catch(function(){});
  }

  if(cacheValid){
    // Fresh valid cache — use immediately, refresh in background
    translations = cached;
    bgMergeRemote();
    loadPromise = Promise.resolve(translations);
    return loadPromise;
  }

  // No fresh valid cache — load bundled kmr.json first for instant, correct display
  loadPromise = loadLocal()
    .catch(function(){
      // Bundled file unavailable — fall back to stale valid cache if any
      return cached || {};
    })
    .then(function(data){
      translations = data;
      applyTranslations();
      saveCache();
      bgMergeRemote(); // merge any admin updates in background
      return translations;
    })
    .catch(function(e){
      console.warn('i18n load failed:', e);
    });
  return loadPromise;
}

/**
 * Get translation by key with optional interpolation
 * t('toast.goal_deleted') => "ئارمانج ھاتیە ژێبرن"
 * t('reader.ayah_count', {count: 7, total: 10}) => "7/10 ئایەت"
 */
function t(key, replacements){
  var value = translations[key];
  if(value === undefined) return key;
  if(replacements && typeof value === 'string'){
    Object.keys(replacements).forEach(function(k){
      value = value.replace(new RegExp('\\$\\{' + k + '\\}', 'g'), String(replacements[k]));
    });
  }
  return value;
}

/**
 * Apply translations to all elements with data-i18n attributes
 */
function applyTranslations(){
  if(!Object.keys(translations).length) return;

  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var key = el.getAttribute('data-i18n');
    var val = translations[key];
    if(val !== undefined) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
    var key = el.getAttribute('data-i18n-placeholder');
    var val = translations[key];
    if(val !== undefined) el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(function(el){
    var key = el.getAttribute('data-i18n-title');
    var val = translations[key];
    if(val !== undefined) el.title = val;
  });
}

// Live polling: re-merge remote translations every 30s so admin changes appear
// without needing an app restart (matches the 60s CDN cache on the endpoint).
(function startPolling(){
  setInterval(function(){
    loadRemote().then(function(data){
      var changed = Object.keys(data).some(function(k){ return translations[k] !== data[k]; });
      if(changed){
        Object.assign(translations, data);
        applyTranslations();
        saveCache();
        document.dispatchEvent(new CustomEvent('i18n:updated'));
      }
    }).catch(function(){});
  }, 30000);
})();

// Export
window.i18n = {
  t: t,
  initLang: initLang,
  applyTranslations: applyTranslations,
  getTranslations: function(){ return Object.assign({}, translations); }
};
window.t = t;

})();
