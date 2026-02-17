/**
 * TafsirKurd i18n System
 * Kurdish Badini (kmr) translations
 * Fetches live from Supabase via /app-translations, falls back to local kmr.json
 */
(function(){
'use strict';

var translations = {};
var loadPromise = null;
var CACHE_KEY = 'tafsirkurd_i18n_cache';
var CACHE_TS_KEY = 'tafsirkurd_i18n_ts';
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Try loading from remote endpoint (Supabase via Cloudflare function)
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
      if(!data || typeof data !== 'object' || Object.keys(data).length < 10) {
        throw new Error('Invalid data');
      }
      // Cache in localStorage
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch(e){}
      return data;
    });
}

/**
 * Try loading from localStorage cache
 */
function loadCache(){
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if(cached) return JSON.parse(cached);
  } catch(e){}
  return null;
}

/**
 * Load the local Badini translation JSON (bundled fallback)
 */
function loadLocal(){
  return fetch('/i18n/kmr.json?v=' + Date.now())
    .then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
}

/**
 * Initialize language on app load
 * Priority: 1) Remote (Supabase) 2) localStorage cache 3) Local kmr.json
 */
function initLang(){
  if(loadPromise) return loadPromise;
  loadPromise = loadRemote()
    .catch(function(){
      // Remote failed — try cache, then local file
      var cached = loadCache();
      if(cached) return cached;
      return loadLocal();
    })
    .then(function(data){
      translations = data;
      applyTranslations();
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

// Export
window.i18n = {
  t: t,
  initLang: initLang,
  applyTranslations: applyTranslations,
  getTranslations: function(){ return Object.assign({}, translations); }
};
window.t = t;

})();
