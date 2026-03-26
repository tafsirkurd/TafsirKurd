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
var CACHE_KEY = 'tafsirkurd_i18n_cache_v2';
var ETAG_KEY  = 'tafsirkurd_i18n_etag_v2';  // persisted across sessions for 304 short-circuit
var _lastETag = localStorage.getItem(ETAG_KEY) || null;

/**
 * Try loading from remote endpoint (background merge only — do not use as primary source)
 */
function loadRemote(){
  var headers = { 'Cache-Control': 'no-cache' };
  if(_lastETag) headers['If-None-Match'] = _lastETag;

  return fetch('https://tafsirkurd.com/app-translations?platform=android', {
    cache: 'no-cache',
    headers: headers
  })
    .then(function(r){
      // 304 Not Modified — nothing changed, skip parse entirely
      if(r.status === 304) return null;
      if(!r.ok) throw new Error('HTTP ' + r.status);
      var etag = r.headers.get('ETag');
      if(etag){ _lastETag = etag; try{ localStorage.setItem(ETAG_KEY, etag); }catch(e){} }
      return r.json();
    })
    .then(function(data){
      if(data === null) return null; // 304 short-circuit
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
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(translations)); } catch(e){}
}

/**
 * Initialize language on app load
 * Priority: 1) Valid cache (has dotted keys)  2) Bundled kmr.json  3) Remote merge (background)
 */
function initLang(){
  if(loadPromise) return loadPromise;

  var cached = loadCache();

  // Always merge remote updates in background — applies any admin changes silently
  function bgMergeRemote(){
    loadRemote().then(function(data){
      if(data === null) return; // 304 Not Modified — translations already current
      Object.assign(translations, data);
      applyTranslations();
      saveCache();
      // Notify app so JS-rendered screens (Settings etc.) can re-render with new values
      document.dispatchEvent(new CustomEvent('i18n:updated'));
    }).catch(function(){});
  }

  if(cached){
    // Stale-while-revalidate: serve cache instantly (zero flash), refresh in background
    translations = cached;
    applyTranslations();
    bgMergeRemote();
    loadPromise = Promise.resolve(translations);
    return loadPromise;
  }

  // No cache at all (first ever launch) — load bundled kmr.json for instant display
  loadPromise = loadLocal()
    .catch(function(){ return {}; })
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

// Live polling: re-merge remote translations every 3s so admin changes appear
// within ~13s total (10s CDN cache + 3s poll interval).
// When nothing changed the server returns 304 Not Modified — no JSON parse, no DOM work.
(function startPolling(){
  setInterval(function(){
    loadRemote().then(function(data){
      if(data === null) return; // 304 Not Modified — nothing to do
      var changed = Object.keys(data).some(function(k){ return translations[k] !== data[k]; });
      if(changed){
        Object.assign(translations, data);
        applyTranslations();
        saveCache();
        document.dispatchEvent(new CustomEvent('i18n:updated'));
      }
    }).catch(function(){});
  }, 3000);
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
