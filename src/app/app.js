/* Tafsir Kurd - Mobile App v2.0 */
/* Pure DOM methods only - no innerHTML for security */

/* ── localStorage quota guard ──────────────────────────────────────────────────
   Monkey-patches localStorage.setItem so every call throughout the app
   automatically evicts stale data and retries on QuotaExceededError.
   Must run before any other code. */
(function(){
  var _origSet = Storage.prototype.setItem;

  /* Eviction tiers — called in order until write succeeds */
  var _TIERS = [
    /* Tier 1: old-prefix prayer keys (always safe to drop) */
    function() {
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && /^prayer3:|^prayer-kurd[12]:/.test(k)) drop.push(k);
      }
      drop.forEach(function(k){ localStorage.removeItem(k); });
      return drop.length;
    },
    /* Tier 2: out-of-window prayer-kurd3 months (keep ±2 from today) */
    function() {
      var now = new Date(), keep = {};
      for (var d = -1; d <= 2; d++) {
        var m = new Date(now.getFullYear(), now.getMonth() + d, 1);
        keep[m.getFullYear() + ':' + (m.getMonth() + 1)] = true;
      }
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('prayer-kurd3:') !== 0) continue;
        var p = k.split(':');
        if (!keep[p[2] + ':' + p[3]]) drop.push(k);
      }
      drop.forEach(function(k){ localStorage.removeItem(k); });
      return drop.length;
    },
    /* Tier 3: large caches that can be rebuilt (IV data, photo cache, debug logs) */
    function() {
      var cacheable = ['iv_series_cache','iv_episodes_cache','reciter_photos_cache','push_debug','_ssCacheKey'];
      var removed = 0;
      cacheable.forEach(function(k){ if(localStorage.getItem(k)!==null){localStorage.removeItem(k);removed++;} });
      return removed;
    },
    /* Tier 4: ALL remaining prayer-kurd3 keys (nuclear option) */
    function() {
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('prayer-kurd3:') === 0) drop.push(k);
      }
      drop.forEach(function(k){ localStorage.removeItem(k); });
      return drop.length;
    },
  ];

  function _freeSpace() {
    for (var t = 0; t < _TIERS.length; t++) {
      if (_TIERS[t]() > 0) return;
    }
  }

  Storage.prototype.setItem = function(key, val) {
    try { _origSet.call(this, key, val); }
    catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
        _freeSpace();
        try { _origSet.call(this, key, val); } catch (e2) { /* truly full — skip silently */ }
      } else { throw e; }
    }
  };
})();

(function(){
'use strict';

// ── Android diagnostics logger ──────────────────────────────────────────────
// Lightweight flag-guarded logger. Enable with: localStorage.setItem('android_debug','1')
var _androidDebug = (typeof localStorage !== 'undefined' && localStorage.getItem('android_debug') === '1');
window.AndroidLog = {
  fetch: function(url, status, source, fromCache, ms, err){
    if(!_androidDebug) return;
    var msg = '[FETCH] ' + source + ' | ' + (status||'ERR') + ' | ' + (fromCache?'CACHE':'NET') + ' | ' + (ms||0) + 'ms | ' + url;
    if(err) msg += ' | ' + (err.message||err);
    console.log(msg);
  },
  tab: function(name, ms){
    if(!_androidDebug) return;
    console.log('[TAB] ' + name + ' loaded in ' + ms + 'ms');
  },
  img: function(url){
    if(!_androidDebug) return;
    console.warn('[IMG FAIL] ' + url);
  },
  warn: function(label, msg){
    if(!_androidDebug) return;
    console.warn('[' + label + '] ' + msg);
  }
};

// ── Global safe-translation helper ──────────────────────────────────────────
// window.t() returns the KEY STRING when a key is missing (truthy) — this
// wrapper converts that case to null so || fallback chains always work,
// even on first offline launch before Supabase translations have loaded.
function tSafe(key) {
  var v = window.t && window.t(key);
  return (v && v !== key) ? v : null;
}

// ── Slow-network detection ────────────────────────────────────────────────────
// Adapts timeouts, defers non-critical fetches, and prevents hung spinners on
// 2G / weak WiFi. Updated automatically when the connection changes.
var _sn = (function(){
  var _slow = false;
  function _check(){
    var nc = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(!nc){ _slow = false; return; }
    _slow = nc.saveData === true
      || nc.effectiveType === 'slow-2g'
      || nc.effectiveType === '2g'
      || (typeof nc.downlink === 'number' && nc.downlink > 0 && nc.downlink < 0.8)
      || (typeof nc.rtt    === 'number' && nc.rtt > 1200);
  }
  _check();
  try{ if(navigator.connection) navigator.connection.addEventListener('change', _check); }catch(e){}
  return {
    get: function(){ return _slow; },
    // Adaptive timeout — longer on slow connections
    ms:  function(fast, slow){ return _slow ? (slow || fast * 2) : fast; },
    // True when heavy background work should be skipped / deferred
    skip: function(){ return _slow; }
  };
})();

/* ===== FORCE UPDATE ===== */
window.ForceUpdate = (function(){
  var CFG_CACHE_KEY      = 'tk_update_cfg_v2';
  var SOFT_SNOOZE_KEY    = 'tk_soft_snooze_v2'; // {at, permanent}
  var _storeUrl          = '';
  var _lastCheckTs       = 0;
  var CHECK_DEBOUNCE     = 10 * 1000; // 10s between checks
  var _fuBtnBusy         = false;     // prevent double-tap on hard update btn

  // ── Semver comparison ─────────────────────────────────────────────────────
  function compareVersions(a, b) {
    var pa = String(a).split('.').map(Number);
    var pb = String(b).split('.').map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || 0, y = pb[i] || 0;
      if (x < y) return -1;
      if (x > y) return 1;
    }
    return 0;
  }

  // ── Config cache ──────────────────────────────────────────────────────────
  function readCache() {
    try { return JSON.parse(localStorage.getItem(CFG_CACHE_KEY)); } catch(e) { return null; }
  }
  function writeCache(cfg) {
    try { localStorage.setItem(CFG_CACHE_KEY, JSON.stringify(cfg)); } catch(e) {}
  }
  async function fetchConfig() {
    try {
      var r = await fetch('https://tafsirkurd.com/update-config', { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var cfg = await r.json();
      if (cfg && !cfg.error) { writeCache(cfg); return cfg; }
    } catch(e) {}
    return readCache();
  }

  // ── Resolve effective mode (includes auto-transition) ─────────────────────
  // update_stage: "release" | "soft" | "enforce"
  // Auto-transition: if stage="soft" AND enforce_delay has elapsed → treat as hard
  function resolveMode(cfg) {
    // Legacy compat: update_mode takes priority if present
    if (cfg.update_mode && cfg.update_mode !== 'off') {
      // Normalise: 'enforce' → 'hard'
      return cfg.update_mode === 'enforce' ? 'hard' : cfg.update_mode;
    }
    if (cfg.force_update_enabled === 'true') return 'hard';

    var stage = cfg.update_stage || 'release';
    if (stage === 'release') return 'off';
    if (stage === 'enforce') return 'hard';

    // stage = 'soft' — check auto-transition
    if (stage === 'soft' && cfg.update_release_time && cfg.update_enforce_delay_hours) {
      var releaseTs  = new Date(cfg.update_release_time).getTime();
      var delayMs    = parseFloat(cfg.update_enforce_delay_hours) * 3600000;
      if (!isNaN(releaseTs) && releaseTs > 0 && !isNaN(delayMs) && Date.now() > releaseTs + delayMs) {
        console.log('[Update] Auto-transition: soft → hard (delay elapsed)');
        return 'hard';
      }
    }
    return 'soft';
  }

  // ── Snooze helpers ────────────────────────────────────────────────────────
  function isSnoozed(cooldownDays, minVersion, sentAt) {
    try {
      var s = JSON.parse(localStorage.getItem(SOFT_SNOOZE_KEY));
      if (!s) return false;
      // If admin re-sent after user dismissed, show again
      if (sentAt) {
        var sentTs = new Date(sentAt).getTime();
        if (!isNaN(sentTs) && sentTs > s.at) return false;
      }
      // If admin pushed a new min_version, ignore old snooze
      if (minVersion && s.ver && s.ver !== String(minVersion)) return false;
      if (s.permanent) return true;
      var days = parseFloat(cooldownDays) || 7;
      return (Date.now() - s.at) < days * 86400000;
    } catch(e) { return false; }
  }
  function snoozeDismiss(minVersion) {
    try { localStorage.setItem(SOFT_SNOOZE_KEY, JSON.stringify({ at: Date.now(), permanent: false, ver: String(minVersion||'') })); } catch(e) {}
  }
  function snoozeForever(minVersion) {
    try { localStorage.setItem(SOFT_SNOOZE_KEY, JSON.stringify({ at: Date.now(), permanent: true, ver: String(minVersion||'') })); } catch(e) {}
  }

  // ── Store safety check ────────────────────────────────────────────────────
  // Verify store URL is reachable before hard-blocking. If unreachable → soft.
  async function isStoreReachable(url) {
    if (!url) return false;
    try {
      var ctrl = new AbortController();
      var tid = setTimeout(function(){ ctrl.abort(); }, 4000);
      var r = await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
      clearTimeout(tid);
      return true; // no-cors always resolves (opaque) if network is up
    } catch(e) { return false; }
  }

  // ── Open store ────────────────────────────────────────────────────────────
  function openStore() {
    if (!_storeUrl) return;
    try {
      window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser
        ? Capacitor.Plugins.Browser.open({ url: _storeUrl })
        : window.open(_storeUrl, '_system');
    } catch(e) { window.open(_storeUrl, '_system'); }
  }

  // ── Hard update UI ────────────────────────────────────────────────────────
  function _parseWhatsNew(raw) {
    if (!raw) return [];
    try { var p = JSON.parse(raw); if (Array.isArray(p)) return p.filter(Boolean); } catch(e) {}
    return raw.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
  }

  function showHard(version, minVersion, cfg) {
    var o = document.getElementById('fuOverlay');
    if (!o || o.classList.contains('on')) return;

    // Populate version row
    var curEl = document.getElementById('fuCurrentVer');
    var minEl = document.getElementById('fuMinVer');
    if (curEl) curEl.textContent = version ? 'v' + version : '';
    if (minEl) minEl.textContent = minVersion ? 'v' + minVersion : '';
    var verRow = o.querySelector('.fu-ver-row');
    if (verRow) verRow.style.display = (version || minVersion) ? '' : 'none';

    // What's new bullets (from config or defaults)
    var bullets = cfg ? _parseWhatsNew(cfg.update_whats_new) : [];
    if (!bullets.length) bullets = [
      tSafe('update.default_bullet1') || 'بەهێزترین بکرن و ئەزموونی نوێتر',
      tSafe('update.default_bullet2') || 'خوێندنی قورئان و ناڤبڕین باشتر بوو',
      tSafe('update.default_bullet3') || 'ئاگادارکرنەوەکان و پشکنینەکان باشتر بوون',
    ];
    var list = document.getElementById('fuNewsList');
    var card = document.getElementById('fuNewsCard');
    if (list && card) {
      while (list.firstChild) list.removeChild(list.firstChild);
      bullets.forEach(function(b) {
        var li = document.createElement('li');
        li.className = 'fu-news-item';
        li.textContent = b;
        list.appendChild(li);
      });
      card.style.display = '';
    }

    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';
    o.classList.add('on');
    requestAnimationFrame(function(){ o.classList.add('fu-visible'); });
    if (window.i18n) window.i18n.applyTranslations();

    var btn = document.getElementById('fuHardBtn');
    if (btn) {
      btn.onclick = function() {
        if (_fuBtnBusy) return;
        _fuBtnBusy = true;
        btn.classList.add('fu-btn-loading');
        openStore();
        setTimeout(function(){ _fuBtnBusy = false; btn.classList.remove('fu-btn-loading'); }, 3000);
      };
    }
  }

  // ── Soft update banner ────────────────────────────────────────────────────
  // whatsNew: optional string from cfg.update_whats_new (admin-set release notes)
  function showSoftBanner(whatsNew, minVersion) {
    if (document.getElementById('fuBanner')) return;

    var banner = document.createElement('div');
    banner.id = 'fuBanner';
    banner.className = 'fu-banner';

    var dot = document.createElement('div');
    dot.className = 'fu-banner-dot';

    var textWrap = document.createElement('div');
    textWrap.className = 'fu-banner-text';

    var title = document.createElement('div');
    title.className = 'fu-banner-title';
    title.setAttribute('data-i18n', 'update.notice_title');
    title.textContent = tSafe('update.notice_title') || 'وەشانێکی نوی هەیە';

    var msg = document.createElement('div');
    msg.className = 'fu-banner-msg';
    var msgText = (whatsNew && whatsNew.trim()) || tSafe('update.notice_message') || 'تکایە ئاپدەیت بکە';
    msg.textContent = msgText;

    textWrap.appendChild(title);
    textWrap.appendChild(msg);

    var updateBtn = document.createElement('button');
    updateBtn.className = 'fu-banner-btn';
    updateBtn.setAttribute('data-i18n', 'update.notice_btn');
    updateBtn.textContent = tSafe('update.notice_btn') || 'ئاپدەیت';
    updateBtn.onclick = function() {
      openStore();
      snoozeForever(minVersion);
      dismissBanner();
    };

    var dismissBtn = document.createElement('button');
    dismissBtn.className = 'fu-banner-dismiss';
    dismissBtn.textContent = '×';
    dismissBtn.onclick = function() { snoozeDismiss(minVersion); dismissBanner(); };

    banner.appendChild(dot);
    banner.appendChild(textWrap);
    banner.appendChild(updateBtn);
    banner.appendChild(dismissBtn);
    document.body.appendChild(banner);

    setTimeout(function(){ banner.classList.add('fu-banner-in'); }, 1500);
  }

  function dismissBanner() {
    var banner = document.getElementById('fuBanner');
    if (!banner) return;
    banner.classList.remove('fu-banner-in');
    banner.classList.add('fu-banner-out');
    setTimeout(function(){ if (banner.parentNode) banner.parentNode.removeChild(banner); }, 520);
  }

  // ── Main check ────────────────────────────────────────────────────────────
  async function check() {
    var now = Date.now();
    if (now - _lastCheckTs < CHECK_DEBOUNCE) return;
    _lastCheckTs = now;


    try {
      if (!window.Capacitor || !Capacitor.Plugins || !Capacitor.Plugins.App) return;
      var info     = await Capacitor.Plugins.App.getInfo();
      var version  = info.version;
      var platform = Capacitor.getPlatform ? Capacitor.getPlatform() : 'web';
      if (platform === 'web') return;

      var cfg = await fetchConfig();
      if (!cfg) { console.log('[Update] No config — skipping'); return; }

      var mode       = resolveMode(cfg);
      var minVersion = platform === 'ios' ? cfg.min_ios_version : cfg.min_android_version;
      _storeUrl      = platform === 'ios'
        ? (cfg.ios_store_url     || 'https://apps.apple.com/us/app/tafsirkurd/id6760433688')
        : (cfg.android_store_url || 'https://play.google.com/store/apps/details?id=com.tafsirkurd.app');

      var stage      = cfg.update_stage || cfg.update_mode || 'off';
      var cooldown   = cfg.soft_update_cooldown_days;
      var outdated   = minVersion ? compareVersions(version, minVersion) < 0 : false;

      console.log('[Update] v=' + version + ' min=' + (minVersion||'—') + ' stage=' + stage + ' mode=' + mode + ' outdated=' + outdated + ' platform=' + platform);

      if (mode === 'off' || !minVersion || !outdated) {
        // If hard overlay is showing but user has now updated (or admin lifted block), dismiss it
        var overlay = document.getElementById('fuOverlay');
        if (overlay && overlay.classList.contains('on')) {
          overlay.classList.remove('fu-visible');
          setTimeout(function(){ overlay.classList.remove('on'); document.body.style.overflow = ''; document.body.style.touchAction = ''; }, 400);
          console.log('[Update] Block lifted — overlay dismissed');
        }
        return;
      }

      if (mode === 'hard') {
        // Only fall back to soft when there is literally no store URL to send the user to.
        // The previous fetch-based reachability check caused a race on iOS where the HEAD
        // request failed immediately (ATS / CORS) before the 2s safety timer, making every
        // hard block silently degrade to soft.
        if (!_storeUrl) {
          console.log('[Update] HARD requested but no store URL — falling back to SOFT');
          if (!isSnoozed(cooldown, minVersion, cfg.update_sent_at)) showSoftBanner(cfg.update_whats_new, minVersion);
          return;
        }
        console.log('[Update] HARD — blocking app');
        showHard(version, minVersion, cfg);
      } else if (mode === 'soft') {
        if (isSnoozed(cooldown, minVersion, cfg.update_sent_at)) {
          console.log('[Update] SOFT — snoozed (cooldown active or permanent)');
          return;
        }
        console.log('[Update] SOFT — queuing banner (6s delay)');
        showSoftBanner(cfg.update_whats_new, minVersion);
      }
    } catch(e) {
      console.warn('[Update] check error:', e);
    }
  }

  return { check: check, openStore: openStore };
})();

/* ===== i18n ===== */
function t(k,v){return window.t?window.t(k,v):k}
// Read from kurdish_translations first (admin-editable), fall back to site_settings or hardcoded
function _ft(key,fb){var v=window.t&&window.t(key);return(v&&v!==key)?v:(fb||'');}

/* ===== HELPERS ===== */
function $(id){return document.getElementById(id)}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e}
function icon(name){var i=document.createElement('i');i.className=name;return i}
function on(e,ev,fn){if(e)e.addEventListener(ev,fn)}
function clear(e){if(e)while(e.firstChild)e.removeChild(e.firstChild)}

// ── Retry with exponential backoff + jitter ───────────────────────────────────
// _tkRetry(fn, opts) — fn() must return a Promise.
// Calls fn() fresh on each attempt so AbortControllers can be recreated.
// opts: { maxRetries:2, base:600 }
// Skips retries when: AbortError thrown | document backgrounded | offline
// Delay schedule (base=600, 2 retries): ~500ms → ~1000ms (with ±30% jitter)
function _tkRetry(fn, opts){
  var n=(opts&&opts.maxRetries)!==undefined?(opts&&opts.maxRetries):2;
  var base=(opts&&opts.base)||600;
  var attempt=0;
  function go(){
    return fn().catch(function(e){
      if(e&&e.name==='AbortError')throw e;       // explicit abort — don't retry
      if(document.hidden&&attempt>0)throw e;     // backgrounded — stop retrying
      if(!navigator.onLine)throw e;              // offline — no point retrying
      if(attempt<n){
        attempt++;
        var delay=Math.min(base*Math.pow(2,attempt-1),8000);
        delay=Math.round(delay*(0.7+Math.random()*0.6)); // ±30% jitter
        return new Promise(function(res){setTimeout(res,delay);}).then(go);
      }
      throw e;
    });
  }
  return go();
}

/* ===== SURAH DATA ===== */
var SURAHS=[
{n:1,en:'Al-Fatiha',ar:'الفاتحة',a:7,t:'Meccan'},{n:2,en:'Al-Baqarah',ar:'البقرة',a:286,t:'Medinan'},{n:3,en:'Ali Imran',ar:'آل عمران',a:200,t:'Medinan'},
{n:4,en:'An-Nisa',ar:'النساء',a:176,t:'Medinan'},{n:5,en:'Al-Ma\'idah',ar:'المائدة',a:120,t:'Medinan'},{n:6,en:'Al-An\'am',ar:'الأنعام',a:165,t:'Meccan'},
{n:7,en:'Al-A\'raf',ar:'الأعراف',a:206,t:'Meccan'},{n:8,en:'Al-Anfal',ar:'الأنفال',a:75,t:'Medinan'},{n:9,en:'At-Tawbah',ar:'التوبة',a:129,t:'Medinan'},
{n:10,en:'Yunus',ar:'يونس',a:109,t:'Meccan'},{n:11,en:'Hud',ar:'هود',a:123,t:'Meccan'},{n:12,en:'Yusuf',ar:'يوسف',a:111,t:'Meccan'},
{n:13,en:'Ar-Ra\'d',ar:'الرعد',a:43,t:'Medinan'},{n:14,en:'Ibrahim',ar:'إبراهيم',a:52,t:'Meccan'},{n:15,en:'Al-Hijr',ar:'الحجر',a:99,t:'Meccan'},
{n:16,en:'An-Nahl',ar:'النحل',a:128,t:'Meccan'},{n:17,en:'Al-Isra',ar:'الإسراء',a:111,t:'Meccan'},{n:18,en:'Al-Kahf',ar:'الكهف',a:110,t:'Meccan'},
{n:19,en:'Maryam',ar:'مريم',a:98,t:'Meccan'},{n:20,en:'Taha',ar:'طه',a:135,t:'Meccan'},{n:21,en:'Al-Anbiya',ar:'الأنبياء',a:112,t:'Meccan'},
{n:22,en:'Al-Hajj',ar:'الحج',a:78,t:'Medinan'},{n:23,en:'Al-Mu\'minun',ar:'المؤمنون',a:118,t:'Meccan'},{n:24,en:'An-Nur',ar:'النور',a:64,t:'Medinan'},
{n:25,en:'Al-Furqan',ar:'الفرقان',a:77,t:'Meccan'},{n:26,en:'Ash-Shu\'ara',ar:'الشعراء',a:227,t:'Meccan'},{n:27,en:'An-Naml',ar:'النمل',a:93,t:'Meccan'},
{n:28,en:'Al-Qasas',ar:'القصص',a:88,t:'Meccan'},{n:29,en:'Al-Ankabut',ar:'العنكبوت',a:69,t:'Meccan'},{n:30,en:'Ar-Rum',ar:'الروم',a:60,t:'Meccan'},
{n:31,en:'Luqman',ar:'لقمان',a:34,t:'Meccan'},{n:32,en:'As-Sajdah',ar:'السجدة',a:30,t:'Meccan'},{n:33,en:'Al-Ahzab',ar:'الأحزاب',a:73,t:'Medinan'},
{n:34,en:'Saba',ar:'سبأ',a:54,t:'Meccan'},{n:35,en:'Fatir',ar:'فاطر',a:45,t:'Meccan'},{n:36,en:'Ya-Sin',ar:'يس',a:83,t:'Meccan'},
{n:37,en:'As-Saffat',ar:'الصافات',a:182,t:'Meccan'},{n:38,en:'Sad',ar:'ص',a:88,t:'Meccan'},{n:39,en:'Az-Zumar',ar:'الزمر',a:75,t:'Meccan'},
{n:40,en:'Ghafir',ar:'غافر',a:85,t:'Meccan'},{n:41,en:'Fussilat',ar:'فصلت',a:54,t:'Meccan'},{n:42,en:'Ash-Shura',ar:'الشورى',a:53,t:'Meccan'},
{n:43,en:'Az-Zukhruf',ar:'الزخرف',a:89,t:'Meccan'},{n:44,en:'Ad-Dukhan',ar:'الدخان',a:59,t:'Meccan'},{n:45,en:'Al-Jathiyah',ar:'الجاثية',a:37,t:'Meccan'},
{n:46,en:'Al-Ahqaf',ar:'الأحقاف',a:35,t:'Meccan'},{n:47,en:'Muhammad',ar:'محمد',a:38,t:'Medinan'},{n:48,en:'Al-Fath',ar:'الفتح',a:29,t:'Medinan'},
{n:49,en:'Al-Hujurat',ar:'الحجرات',a:18,t:'Medinan'},{n:50,en:'Qaf',ar:'ق',a:45,t:'Meccan'},{n:51,en:'Adh-Dhariyat',ar:'الذاريات',a:60,t:'Meccan'},
{n:52,en:'At-Tur',ar:'الطور',a:49,t:'Meccan'},{n:53,en:'An-Najm',ar:'النجم',a:62,t:'Meccan'},{n:54,en:'Al-Qamar',ar:'القمر',a:55,t:'Meccan'},
{n:55,en:'Ar-Rahman',ar:'الرحمن',a:78,t:'Medinan'},{n:56,en:'Al-Waqi\'ah',ar:'الواقعة',a:96,t:'Meccan'},{n:57,en:'Al-Hadid',ar:'الحديد',a:29,t:'Medinan'},
{n:58,en:'Al-Mujadilah',ar:'المجادلة',a:22,t:'Medinan'},{n:59,en:'Al-Hashr',ar:'الحشر',a:24,t:'Medinan'},{n:60,en:'Al-Mumtahanah',ar:'الممتحنة',a:13,t:'Medinan'},
{n:61,en:'As-Saff',ar:'الصف',a:14,t:'Medinan'},{n:62,en:'Al-Jumu\'ah',ar:'الجمعة',a:11,t:'Medinan'},{n:63,en:'Al-Munafiqun',ar:'المنافقون',a:11,t:'Medinan'},
{n:64,en:'At-Taghabun',ar:'التغابن',a:18,t:'Medinan'},{n:65,en:'At-Talaq',ar:'الطلاق',a:12,t:'Medinan'},{n:66,en:'At-Tahrim',ar:'التحريم',a:12,t:'Medinan'},
{n:67,en:'Al-Mulk',ar:'الملك',a:30,t:'Meccan'},{n:68,en:'Al-Qalam',ar:'القلم',a:52,t:'Meccan'},{n:69,en:'Al-Haqqah',ar:'الحاقة',a:52,t:'Meccan'},
{n:70,en:'Al-Ma\'arij',ar:'المعارج',a:44,t:'Meccan'},{n:71,en:'Nuh',ar:'نوح',a:28,t:'Meccan'},{n:72,en:'Al-Jinn',ar:'الجن',a:28,t:'Meccan'},
{n:73,en:'Al-Muzzammil',ar:'المزمل',a:20,t:'Meccan'},{n:74,en:'Al-Muddaththir',ar:'المدثر',a:56,t:'Meccan'},{n:75,en:'Al-Qiyamah',ar:'القيامة',a:40,t:'Meccan'},
{n:76,en:'Al-Insan',ar:'الإنسان',a:31,t:'Medinan'},{n:77,en:'Al-Mursalat',ar:'المرسلات',a:50,t:'Meccan'},{n:78,en:'An-Naba',ar:'النبأ',a:40,t:'Meccan'},
{n:79,en:'An-Nazi\'at',ar:'النازعات',a:46,t:'Meccan'},{n:80,en:'Abasa',ar:'عبس',a:42,t:'Meccan'},{n:81,en:'At-Takwir',ar:'التكوير',a:29,t:'Meccan'},
{n:82,en:'Al-Infitar',ar:'الانفطار',a:19,t:'Meccan'},{n:83,en:'Al-Mutaffifin',ar:'المطففين',a:36,t:'Meccan'},{n:84,en:'Al-Inshiqaq',ar:'الانشقاق',a:25,t:'Meccan'},
{n:85,en:'Al-Buruj',ar:'البروج',a:22,t:'Meccan'},{n:86,en:'At-Tariq',ar:'الطارق',a:17,t:'Meccan'},{n:87,en:'Al-A\'la',ar:'الأعلى',a:19,t:'Meccan'},
{n:88,en:'Al-Ghashiyah',ar:'الغاشية',a:26,t:'Meccan'},{n:89,en:'Al-Fajr',ar:'الفجر',a:30,t:'Meccan'},{n:90,en:'Al-Balad',ar:'البلد',a:20,t:'Meccan'},
{n:91,en:'Ash-Shams',ar:'الشمس',a:15,t:'Meccan'},{n:92,en:'Al-Layl',ar:'الليل',a:21,t:'Meccan'},{n:93,en:'Ad-Duha',ar:'الضحى',a:11,t:'Meccan'},
{n:94,en:'Ash-Sharh',ar:'الشرح',a:8,t:'Meccan'},{n:95,en:'At-Tin',ar:'التين',a:8,t:'Meccan'},{n:96,en:'Al-Alaq',ar:'العلق',a:19,t:'Meccan'},
{n:97,en:'Al-Qadr',ar:'القدر',a:5,t:'Meccan'},{n:98,en:'Al-Bayyinah',ar:'البينة',a:8,t:'Medinan'},{n:99,en:'Az-Zalzalah',ar:'الزلزلة',a:8,t:'Medinan'},
{n:100,en:'Al-Adiyat',ar:'العاديات',a:11,t:'Meccan'},{n:101,en:'Al-Qari\'ah',ar:'القارعة',a:11,t:'Meccan'},{n:102,en:'At-Takathur',ar:'التكاثر',a:8,t:'Meccan'},
{n:103,en:'Al-Asr',ar:'العصر',a:3,t:'Meccan'},{n:104,en:'Al-Humazah',ar:'الهمزة',a:9,t:'Meccan'},{n:105,en:'Al-Fil',ar:'الفيل',a:5,t:'Meccan'},
{n:106,en:'Quraysh',ar:'قريش',a:4,t:'Meccan'},{n:107,en:'Al-Ma\'un',ar:'الماعون',a:7,t:'Meccan'},{n:108,en:'Al-Kawthar',ar:'الكوثر',a:3,t:'Meccan'},
{n:109,en:'Al-Kafirun',ar:'الكافرون',a:6,t:'Meccan'},{n:110,en:'An-Nasr',ar:'النصر',a:3,t:'Medinan'},{n:111,en:'Al-Masad',ar:'المسد',a:5,t:'Meccan'},
{n:112,en:'Al-Ikhlas',ar:'الإخلاص',a:4,t:'Meccan'},{n:113,en:'Al-Falaq',ar:'الفلق',a:5,t:'Meccan'},{n:114,en:'An-Nas',ar:'الناس',a:6,t:'Meccan'}
];
window.SURAHS=SURAHS; // expose for audio-downloads.js (outside IIFE)

var JUZS={1:1,2:2,3:2,4:3,5:4,6:4,7:5,8:6,9:7,10:8,11:9,12:11,13:12,14:13,15:15,16:17,17:18,18:20,19:21,20:23,21:25,22:27,23:29,24:31,25:34,26:36,27:39,28:46,29:51,30:67};

var RECITERS=[
  {id:'Nasser_Alqatami_128kbps',      name:'ناصر القطامي',               flag:'🇰🇼',style:'murattal'},
  {id:'Alafasy_128kbps',              name:'مشاري العفاسي',              flag:'🇰🇼',style:'murattal'},
  {id:'ahmed_ibn_ali_al_ajamy_128kbps',         name:'أحمد العجمي',       flag:'🇰🇼',style:'murattal'},
  {id:'MaherAlMuaiqly128kbps',        name:'ماهر المعيقلي',              flag:'🇸🇦',style:'murattal'},
  {id:'Abdurrahmaan_As-Sudais_192kbps',name:'عبد الرحمن السديس',         flag:'🇸🇦',style:'murattal'},
  {id:'Saood_ash-Shuraym_128kbps',    name:'سعود الشريم',                flag:'🇸🇦',style:'murattal'},
  {id:'Yasser_Ad-Dussary_128kbps',    name:'ياسر الدوسري',               flag:'🇸🇦',style:'murattal'},
  {id:'Hudhaify_128kbps',             name:'علي الحذيفي',                flag:'🇸🇦',style:'murattal'},
  {id:'Abu_Bakr_Ash-Shaatree_128kbps',name:'أبو بكر الشاطري',           flag:'🇸🇦',style:'murattal'},
  {id:'Muhammad_Jibreel_128kbps',     name:'محمد جبريل',                 flag:'🇸🇦',style:'murattal'},
  {id:'Hani_Rifai_192kbps',           name:'هاني الرفاعي',               flag:'🇸🇦',style:'murattal'},
  {id:'Muhammad_Ayyoub_128kbps',      name:'محمد أيوب',                  flag:'🇸🇦',style:'murattal'},
  {id:'Ghamadi_40kbps',               name:'سعد الغامدي',                flag:'🇸🇦',style:'murattal'},
  {id:'Abdullaah_3awwaad_Al-Juhaynee_128kbps',name:'عبد الله الجهني',    flag:'🇸🇦',style:'murattal'},
  {id:'Sahl_Yassin_128kbps',          name:'سهل ياسين',                  flag:'🇸🇦',style:'murattal'},
  {id:'Abdullah_Basfar_192kbps',      name:'عبد الله بصفر',              flag:'🇸🇦',style:'murattal'},
  {id:'Fares_Abbad_64kbps',           name:'فارس عباد',                  flag:'🇩🇿',style:'murattal'},
  {id:'Abdul_Basit_Murattal_192kbps', name:'عبد الباسط عبد الصمد',       flag:'🇪🇬',style:'murattal'},
  {id:'Abdul_Basit_Mujawwad_128kbps', name:'عبد الباسط عبد الصمد',       flag:'🇪🇬',style:'mujawwad'},
  {id:'Minshawy_Murattal_128kbps',    name:'محمد المنشاوي',              flag:'🇪🇬',style:'murattal'},
  {id:'Husary_128kbps',               name:'محمود الحصري',               flag:'🇪🇬',style:'murattal'},
  {id:'Mustafa_Ismail_48kbps',        name:'مصطفى إسماعيل',             flag:'🇪🇬',style:'mujawwad'},
  {id:'Mohammad_al_Tablaway_128kbps', name:'محمد الطبلاوي',              flag:'🇪🇬',style:'murattal'}
];
// Migrate old broken reciter IDs → correct ones
(function(){var map={'Ahmed_ibn_Ali_al-Ajamy_128kbps-almanar':'ahmed_ibn_ali_al_ajamy_128kbps','Ahmed_ibn_Ali_al-Ajamy_128kbps':'ahmed_ibn_ali_al_ajamy_128kbps'};var cur=localStorage.getItem('app_reciter');if(cur&&map[cur]){localStorage.setItem('app_reciter',map[cur]);localStorage.removeItem('reciter_photos_cache');}})();
var RECITER=localStorage.getItem('app_reciter')||'Nasser_Alqatami_128kbps';
// Load from localStorage cache instantly — no async wait
var RECITER_PHOTOS=(function(){try{return JSON.parse(localStorage.getItem('reciter_photos_cache')||'{}')}catch(e){return {}}}());
// Tracks which reciter IDs have their images fully decoded in browser memory this session
var _imgLoaded={};

// Preload a single reciter image and mark it loaded on completion.
// _imgLoaded[id]=true on success, ='err' on failure — both prevent retries this session.
function _preloadReciterImg(id){
  var url=RECITER_PHOTOS[id];
  if(!url||_imgLoaded[id])return;
  var img=new Image();
  img.onload=function(){_imgLoaded[id]=true;};
  img.onerror=function(){_imgLoaded[id]='err';};
  img.src=url;
}

// Startup: prime browser cache from localStorage-cached URLs immediately.
// On first install RECITER_PHOTOS is empty so this is a no-op.
// On second+ launch this starts downloading current reciter before Supabase refresh.
(function(){
  [RECITER].concat(RECITERS.slice(0,3).map(function(r){return r.id;})).forEach(function(id){
    var url=RECITER_PHOTOS[id];
    if(!url)return;
    var img=new Image();
    img.onload=function(){_imgLoaded[id]=true;};
    img.onerror=function(){_imgLoaded[id]='err';};
    img.src=url;
  });
})();

function loadReciterPhotos(){
  if(!S.supabase)return;
  S.supabase.from('site_settings').select('key,value').like('key','reciter_photo_%')
    .then(function(res){
      if(res.error||!res.data)return;
      res.data.forEach(function(row){
        var id=row.key.replace('reciter_photo_','');
        if(row.value)RECITER_PHOTOS[id]=row.value;
      });
      // Persist so next launch is instant
      try{localStorage.setItem('reciter_photos_cache',JSON.stringify(RECITER_PHOTOS))}catch(e){}
      // Patch any reciter chips that are already in the DOM but showing initials
      document.querySelectorAll('.qs-reciter-chip[data-reciter-id]').forEach(function(chip){
        var id=chip.dataset.reciterId;
        var url=RECITER_PHOTOS[id];
        if(!url)return;
        var avatar=chip.querySelector('.qs-reciter-chip-avatar');
        if(!avatar||avatar.querySelector('img'))return; // already has image
        var initSpan=avatar.querySelector('.qs-reciter-chip-avatar-initials');
        if(initSpan)avatar.removeChild(initSpan);
        var img=document.createElement('img');img.src=url;img.alt='';
        avatar.appendChild(img);
      });
      // Priority 1: current reciter + top 3 by index — start immediately, not idle
      _preloadReciterImg(RECITER);
      RECITERS.slice(0,3).forEach(function(r){_preloadReciterImg(r.id);});
      // Priority 2: remaining reciters — idle time to avoid initial network burst
      (window.requestIdleCallback||function(fn){setTimeout(fn,800)})(function(){
        RECITERS.forEach(function(r){_preloadReciterImg(r.id);});
      });
    }).catch(function(){});
}

/* ===== AUDIO HELPERS ===== */
function audioUrl(surah,ayah){
  return 'https://everyayah.com/data/'+RECITER+'/'+String(surah).padStart(3,'0')+String(ayah).padStart(3,'0')+'.mp3';
}

// Multi-slot lookahead cache — keeps up to 3 upcoming ayahs pre-downloaded as blobs
var _pfCache={}; // url → {blob, xhr}
var _blobToRevoke=null;
var _PF_AHEAD=5; // how many ayahs to fetch ahead

function _nextAyahPos(surah,ayah){
  var s=SURAHS[surah-1];if(!s)return null;
  var ns=surah,na=ayah+1;
  if(na>s.a){ns=surah+1;na=1;}
  if(ns>114)return null;
  return {surah:ns,ayah:na};
}

function prefetchAyahBlob(surah,ayah){
  // Build list of next _PF_AHEAD positions
  var toFetch=[];
  var cur={surah:surah,ayah:ayah};
  for(var i=0;i<_PF_AHEAD;i++){
    cur=_nextAyahPos(cur.surah,cur.ayah);
    if(!cur)break;
    toFetch.push(audioUrl(cur.surah,cur.ayah));
  }
  // Cancel and evict slots not in the new lookahead window
  Object.keys(_pfCache).forEach(function(u){
    if(toFetch.indexOf(u)===-1){
      var slot=_pfCache[u];
      if(slot.xhr){slot.xhr.abort();}
      if(u===_audioBufKey){
        // This blob is live inside _audioBuf — clear the prebuf first so playAyah
        // doesn't pick up the now-revoked URL, then revoke safely.
        _audioBuf=null;_audioBufKey=null;
      }
      if(slot.blob){URL.revokeObjectURL(slot.blob);}
      delete _pfCache[u];
    }
  });
  // Start fetching any slots not already cached/fetching
  toFetch.forEach(function(url){
    if(_pfCache[url])return; // already have it
    var slot={blob:null,xhr:null};
    _pfCache[url]=slot;
    var xhr=new XMLHttpRequest();
    xhr.open('GET',url,true);
    xhr.responseType='blob';
    xhr.onload=function(){
      if(xhr.status===200&&_pfCache[url]===slot){
        slot.blob=URL.createObjectURL(xhr.response);
        slot.xhr=null;
        // Persist to local cache — fire and forget, never interrupts playback
        if(window.AudioCache){
          var _p=url.match(/\/([^/]+)\/(\d{3})(\d{3})\.mp3$/);
          if(_p)AudioCache.saveBlob(_p[1],parseInt(_p[2],10),parseInt(_p[3],10),xhr.response);
        }
        // If this is the immediate next ayah, prime the secondary decode buffer now
        var _nxt=_nextAyahPos(surah,ayah);
        if(_nxt&&url===audioUrl(_nxt.surah,_nxt.ayah)){
          _primeNextBuffer(_nxt.surah,_nxt.ayah);
        }
      }
    };
    xhr.onerror=function(){if(_pfCache[url]===slot)delete _pfCache[url];};
    slot.xhr=xhr;
    xhr.send();
  });
}

function clearPrefetch(){
  Object.keys(_pfCache).forEach(function(u){
    var slot=_pfCache[u];
    if(slot.xhr)slot.xhr.abort();
    if(slot.blob)URL.revokeObjectURL(slot.blob);
  });
  _pfCache={};
  _audioBuf=null;_audioBufKey=null;
}

// Returns how many ms before natural end to trigger the next-ayah transition.
// Tighter when next ayah is pre-decoded/cached (near-instant swap); looser for streaming.
function _earlyMs(){
  var nxt=_nextAyahPos(S.audio.surah,S.audio.ayah);
  if(!nxt)return 150;
  var nxtUrl=audioUrl(nxt.surah,nxt.ayah);
  if(_audioBufKey===nxtUrl&&_audioBuf)return 30;
  var _hasLocal=(window.AudioDownloads&&AudioDownloads.getLocalUri&&AudioDownloads.getLocalUri(RECITER,nxt.surah,nxt.ayah))
              ||(window.AudioCache&&AudioCache.getLocalUri&&AudioCache.getLocalUri(RECITER,nxt.surah,nxt.ayah));
  if(_hasLocal)return 30;
  if(_pfCache[nxtUrl]&&_pfCache[nxtUrl].blob)return 80;
  return 200;
}

function _scheduleAyahEnd(){
  if(_audioEndTimer)return;
  var ae=S.audio.el;
  if(!ae||!ae.duration||ae.duration===Infinity||!S.audio.playing)return;
  var em=_earlyMs();
  var ms=(ae.duration-ae.currentTime)*1000-em;
  if(ms<=0||ms>30000)return;
  _audioEndTimer=setTimeout(function(){
    _audioEndTimer=null;
    var _nxt2=_nextAyahPos(S.audio.surah,S.audio.ayah);
    var _pr=_nxt2&&_audioBufKey===audioUrl(_nxt2.surah,_nxt2.ayah)&&!!_audioBuf;
    console.log('[QuranAudioPerf] earlyTrigger='+S.audio.surah+':'+S.audio.ayah
      +' earlyMs='+em+' preloadReady='+!!_pr);
    if(S.audio.playing&&!_audioNextCalled){_audioNextCalled=true;_audioGapT=Date.now();App.audioNext();}
  },ms);
}

// Called when prebuf becomes ready mid-ayah — reschedule with tighter early offset.
function _rescheduleEarlyEnd(){
  var ae=S.audio.el;
  if(!ae||!ae.duration||ae.duration===Infinity||!S.audio.playing||_audioNextCalled)return;
  var em=_earlyMs();
  var ms=(ae.duration-ae.currentTime)*1000-em;
  if(ms<=0||ms>8000)return;
  if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}
  _audioEndTimer=setTimeout(function(){
    _audioEndTimer=null;
    console.log('[QuranAudioPerf] earlyTrigger='+S.audio.surah+':'+S.audio.ayah
      +' earlyMs='+em+' preloadReady=true rescheduled=true');
    if(S.audio.playing&&!_audioNextCalled){_audioNextCalled=true;_audioGapT=Date.now();App.audioNext();}
  },ms);
}

// Pre-decode the next ayah blob into a secondary Audio element so the
// browser finishes network+decode before we need it. When playAyah fires
// it can swap src from _audioBuf instead of constructing a new Audio.
function _primeNextBuffer(surah,ayah){
  var url=audioUrl(surah,ayah);
  if(_audioBufKey===url)return; // already primed
  var slot=_pfCache[url];
  if(!slot||!slot.blob)return; // blob not ready yet — will prime when it arrives
  try{
    var buf=new Audio();
    buf.preload='auto';
    buf.src=slot.blob;
    buf.load(); // trigger decode without playing
    _audioBuf=buf;
    _audioBufKey=url;
    console.log('[QuranAudioPerf] primed next='+surah+':'+ayah);
    // Prebuf just became ready — tighten the early-end timer if it's still pending
    _rescheduleEarlyEnd();
  }catch(e){}
}

// Update play/pause/loading icon — also keeps full player in sync
function setAudioIcon(state){
  var ic=$('audioPlayIcon');if(!ic)return;
  ic.className=state==='loading'?'fas fa-spinner fa-spin':state==='pause'?'fas fa-pause':'fas fa-play';
  var av=$('audioBarAvatar');
  if(av){if(state==='pause')av.classList.add('playing');else av.classList.remove('playing');}
  var fi=$('fpPlayIcon');if(fi)fi.className=ic.className;
  var fa=$('fpAvatar');if(fa)fa.classList.toggle('playing',state==='pause');
}

var _audioEndTimer=null;var _audioNextCalled=false;
var _audioBuf=null;var _audioBufKey=null;var _audioGapT=0;
var _playStartT=0;var _lastSrcType='';

/* ===== STATE ===== */
var S={
  tab:'quran',tabHistory:[],
  surah:null,mushafMode:localStorage.getItem('mushafMode')==='true',quranData:null,tafsirData:null,
  showTafsir:localStorage.getItem('showTafsir')!=='false',
  audio:{el:null,playing:false,surah:0,ayah:0,speed:parseFloat(localStorage.getItem('app_speed'))||1,repeatMode:localStorage.getItem('app_repeat')||'none',repeatCount:parseInt(localStorage.getItem('app_repeatCount'))||1,currentRepeat:0},
  sidebar:false,sidebarMode:'surah',
  search:'',
  bmSort:'newest',bmSearch:'',
  goalYear:new Date().getFullYear(),goalMonth:new Date().getMonth(),
  wizardStep:0,wizardData:{},
  bgAudio:localStorage.getItem('bgAudio')==='true',
  keepAwake:localStorage.getItem('keepAwake')==='true',
  autoAdvance:localStorage.getItem('autoAdvance')==='true',
  scrollFollowsAudio:localStorage.getItem('scrollFollowsAudio')!=='false',
  hapticFeedback:localStorage.getItem('hapticFeedback')!=='false',
  prayerCity:localStorage.getItem('prayerCity')||'Duhok',
  prayerMethod:parseInt(localStorage.getItem('prayerMethod')||'13'),
  prayerAthanEnabled:localStorage.getItem('prayerAthanEnabled')===null?(!(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='mac')):localStorage.getItem('prayerAthanEnabled')==='true',
  prayerToggles:(function(){try{return JSON.parse(localStorage.getItem('prayerToggles')||'{}')}catch(e){return {}}}()),
  theme:localStorage.getItem('theme')||((function(){try{return JSON.parse(localStorage.getItem('userPreferences')||'{}');}catch(e){return {};}}()).darkMode?'dark':'noor'),
  dailyVerse:localStorage.getItem('dailyVerse')!=='false', // true by default — null/absent → ON; 'false' string → OFF
  arSize:parseFloat(localStorage.getItem('app_arSize'))||2.0,
  tfSize:parseFloat(localStorage.getItem('app_tfSize'))||1.0,
  lineH:parseFloat(localStorage.getItem('app_lineH'))||2.2,
  ivSupabase:null,ivSeries:null,ivEpisodes:null,ivCurrentSeries:null,ivLoading:false,ivInited:false,ivSearchQuery:'',ivSpeakerFilter:null,
  rm:{mode:'single',playCount:2,verseRepeat:1,delay:0,isPlaying:false,currentPlay:0},
  readSession:null,
  todayVerses:null,
  supabase:null,user:null,syncInterval:null,isSyncing:false,syncFailed:false,syncErrorDetail:null,lastSyncTime:0,realtimeChannel:null,
  readerFont:localStorage.getItem('readerFont')||'hafs',
  glyphVerses:{},
  mushafFont:'qcf1',
  mushafFontSize:(function(){var ip=document.documentElement.classList.contains('is-ipad');var raw=parseInt(localStorage.getItem(ip?'mushafFontSize_ipad_qcf1':'mushafFontSize_qcf1'))||0;return ip?Math.min(34,Math.max(24,raw||28)):Math.min(25,Math.max(23,raw||24));})(),
  mushafLineH:(function(){var ip=document.documentElement.classList.contains('is-ipad');var raw=parseFloat(localStorage.getItem(ip?'mushafLineH_ipad':'mushafLineH'))||0;return ip?Math.min(2.4,Math.max(1.8,raw||2.0)):Math.min(2.3,Math.max(1.8,raw||1.8));})(),
  copy:{surah:0,ayah:0,rangeFmt:'both'}
};
window.S = S; /* expose state for smart-dhikr.js and other external modules */

/* ===== INIT ===== */
function init(){
  _loadBookmarks(); // load bookmark map into memory before any render
  try{
    // v3: Force reset font sizes and clear stale caches
    if(localStorage.getItem('app_v')!=='3'){
      localStorage.setItem('app_arSize','2.0');
      localStorage.setItem('app_tfSize','1.0');
      localStorage.removeItem('quran_data_cache');
      localStorage.removeItem('tafsir_data_cache');
      localStorage.removeItem('tafsir_cache_v');
      localStorage.setItem('app_v','3');
      S.arSize=2.0;
      S.tfSize=1.0;
    }

    S.audio.el=$('audioEl');
    on(S.audio.el,'ended',function(){
      console.log('[QuranAudioPerf] ended='+S.audio.surah+':'+S.audio.ayah);
      if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}
      if(!_audioNextCalled){App.audioNext();}
      _audioNextCalled=false;
    });
    on(S.audio.el,'timeupdate',_scheduleAyahEnd);
    on(S.audio.el,'durationchange',function(){
      if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}
      _scheduleAyahEnd();
    });
    on(S.audio.el,'pause',function(){if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}});
    on(S.audio.el,'play',_scheduleAyahEnd);
    on(S.audio.el,'error',function(){
      if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
      if(!S.audio.surah)return;
      var errCode=S.audio.el.error&&S.audio.el.error.code;
      var currentSrc=S.audio.el.src||'';
      console.warn('[Audio] error — reciter:'+RECITER+' surah:'+S.audio.surah+' ayah:'+S.audio.ayah
        +' errCode:'+errCode+' src:'+currentSrc.slice(0,100));
      // If src was a local cached file — clear it and transparently retry with remote URL.
      // Local files can fail if the OS evicted them from cache storage.
      // errCode 4 (SRC_NOT_SUPPORTED) is the typical code when a capacitor:// file is missing.
      if(currentSrc.indexOf('capacitor://')===0||currentSrc.indexOf('file://')===0){
        console.warn('[Audio] local file failed — evicting from cache, retrying remote');
        if(window.AudioCache)AudioCache.clearLocalUri(RECITER,S.audio.surah,S.audio.ayah);
        var remoteUrl=audioUrl(S.audio.surah,S.audio.ayah);
        S.audio.el.src=remoteUrl;
        S.audio.el.play().catch(function(){});
        return; // transparent retry — no toast shown
      }
      // errCode 4 = MEDIA_ERR_SRC_NOT_SUPPORTED — reciter has no audio for this surah (404/unsupported)
      // errCode 2 = MEDIA_ERR_NETWORK — transient network failure (NOT a missing-reciter issue)
      // errCode 3 = MEDIA_ERR_DECODE — bad file data
      // errCode 1 = MEDIA_ERR_ABORTED — user/system cancelled (usually silent)
      var msg;
      if(errCode===4){
        msg=t('error.audio_unavailable')||'هذا القارئ لا تتوفر له تلاوة لهذه السورة';
        console.warn('[Audio] 404/unsupported — url:'+audioUrl(S.audio.surah,S.audio.ayah));
      } else if(errCode===1){
        return; // aborted — no toast
      } else {
        // code 2 (network) or code 3 (decode) — show a generic load error, not "not available"
        msg=t('error.audio_load')||'کێشەی بارکردنی دەنگ';
        console.error('[Audio] load error code:'+errCode+' reciter:'+RECITER
          +' url:'+audioUrl(S.audio.surah,S.audio.ayah));
      }
      toast(msg);
    });
    var _audioWaitTimer=null;
    on(S.audio.el,'waiting',function(){
      if(!S.audio.playing)return;
      setAudioIcon('loading');
      clearTimeout(_audioWaitTimer);
      // Prevent infinite spinner: if still buffering after 14s, reset icon so
      // the user can tap play again rather than seeing a locked loading state.
      _audioWaitTimer=setTimeout(function(){
        if(S.audio.playing&&S.audio.el.paused)setAudioIcon('play');
      },14000);
    });
    on(S.audio.el,'playing',function(){
      clearTimeout(_audioWaitTimer);_audioWaitTimer=null;
      setAudioIcon('pause');
      if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
      if(_playStartT){
        console.log('[QuranAudioPerf] playLatencyMs='+(Date.now()-_playStartT)+' src='+_lastSrcType);
        _playStartT=0;
      }
    });
    on(S.audio.el,'pause',function(){clearTimeout(_audioWaitTimer);_audioWaitTimer=null;if(!S.audio.playing)setAudioIcon('play')});

    applyTheme();
    applySizes();
    applyKeepAwake();
    initTodayVerses();
    if(window.AppRating)AppRating.init(); // track launch count + first-launch date
    renderSurahGrid();
    renderContinue();

    // Pull-to-refresh on all tabs
    // On tablet the quran panel is a flex row — quranHome is the actual scroll container.
    var _isTabletLayout=window.innerWidth>=768||document.documentElement.classList.contains('is-ipad');
    setupPullToRefresh(_isTabletLayout?'quranHome':'panelQuran',function(){renderSurahGrid();renderContinue();},_isTabletLayout?null:function(){return !S.surah});
    setupPullToRefresh('panelBookmarks',function(){_renderHash.bm=null;renderBookmarks();_renderHash.bm=_tabHash('bookmarks');});
    setupPullToRefresh('panelGoals',function(){_renderHash.goals=null;renderGoals();_renderHash.goals=_tabHash('goals');});
    setupPullToRefresh('panelIslamvoice',function(isRecent){_renderHash.iv=null;if(!isRecent&&typeof App.ivRefresh==='function')App.ivRefresh();else renderIslamVoice();});
    setupPullToRefresh('panelSettings',function(){_renderHash.settings=null;renderSettings();_renderHash.settings=_tabHash('settings');});
    setupPullToRefresh('panelPrayer',function(isRecent){if(window.PrayerUI){if(isRecent)PrayerUI.render();else PrayerUI.refresh();_renderHash.prayer=_tabHash('prayer');}});
    setupPullToRefresh('panelGencine',function(isRecent){if(window.GencineUI){if(isRecent)GencineUI.render();else GencineUI.refresh();}});

    // Fast-scroll pill for long lists
    if(window._initFastScroll) _initFastScroll();

    // Pre-render static tabs immediately — they don't need quran data.
    // By the time quran.json loads, these are already built.
    setTimeout(function(){
      renderSettings(); _renderHash.settings=_tabHash('settings');
      setTimeout(function(){
        renderBookmarks(); _renderHash.bm=_tabHash('bookmarks');
        setTimeout(function(){
          renderGoals(); _renderHash.goals=_tabHash('goals');
        },16);
      },16);
    },0);

    // Load data
    loadQuranData();
    loadTafsirData();

    // Init shared Supabase client and check auth
    initSupabase(function(){ loadReciterPhotos(); });

    // Belt-and-suspenders: write tk_last_bg on visibilitychange too.
    // appStateChange is the primary writer but may not fire under extreme memory pressure
    // before the OS kills the process. visibilitychange + pagehide are more reliable.
    document.addEventListener('visibilitychange',function(){
      if(document.hidden) localStorage.setItem('tk_last_bg',String(Date.now()));
    });
    window.addEventListener('pagehide',function(){
      localStorage.setItem('tk_last_bg',String(Date.now()));
    });

    // Pause audio and sky animations when app goes to background
    document.addEventListener('visibilitychange',function(){
      if(document.hidden){
        if(!S.bgAudio&&S.audio.playing){
          S.audio.el.pause();S.audio.playing=false;
          document.body.classList.remove('mushaf-audio-playing');
          var ic=$('audioPlayIcon');if(ic)ic.className='fas fa-play';
        }
        // Pause GPU-expensive sky animations when screen off/background
        var _skyEl=document.getElementById('prayerSkyScene');
        if(_skyEl)_skyEl.classList.add('sky-paused');
      } else {
        // Resume sky only if prayer tab is active
        if(S.tab==='prayer'){
          var _skyEl=document.getElementById('prayerSkyScene');
          if(_skyEl)_skyEl.classList.remove('sky-paused');
          // Re-render prayer panel on foreground — handles overnight stale date for web users.
          // Capacitor users get this via appStateChange below; this covers desktop/PWA.
          // Skipped on Capacitor (appStateChange fires there instead — avoids double render).
          if(!window.Capacitor&&window.PrayerUI){
            requestAnimationFrame(function(){PrayerUI.render();_renderHash.prayer=_tabHash('prayer');});
          }
        }
        // Restore playback highlight state if Quran tab is visible (handles browser bg/fg)
        if(S.tab==='quran')requestAnimationFrame(_hlRestoreAll);
      }
    });
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('appStateChange',function(state){
          if(!state.isActive){
            // Save background timestamp — used by startApp() warm-resume detection
            // when iOS/Android kills the WebView under memory pressure and reloads it.
            localStorage.setItem('tk_last_bg', String(Date.now()));
            console.log('[APP_LIFECYCLE] background');
            if(!S.bgAudio&&S.audio.playing){
              S.audio.el.pause();S.audio.playing=false;
              var ic=$('audioPlayIcon');
              if(ic)ic.className='fas fa-play';
            }
            // Sync data when app goes to background
            if(S.user)syncToCloud();
          } else {
            console.log('[APP_LIFECYCLE] warm_resume — appStateChange foreground');
            console.log('[APP_LIFECYCLE] resume_refresh_start');
            // Defer ForceUpdate network check — don't compete with UI settle on resume
            setTimeout(function(){ ForceUpdate.check(); }, 2000);
            // Refresh today's verse set so the date is correct after overnight open.
            // Without this, S.todayVerses stays as yesterday's Set and re-read ayahs
            // are skipped for today's goal count.
            initTodayVerses();
            // On every foreground resume: check exact alarm permission via native bridge.
            // If it was revoked → show warning; if it was just granted → clear rate-limit
            // and reschedule immediately (covers the case where user came back from Settings).
            (function(){
              var _AA=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.AthanAlarm;
              if(_AA&&window.PrayerUI&&window.S&&window.S.prayerAthanEnabled){
                _AA.canScheduleExact().then(function(r){
                  if(r&&r.canSchedule===false){
                    if(window._showAthanAlarmPermWarning)window._showAthanAlarmPermWarning();
                  } else if(r&&r.canSchedule===true&&localStorage.getItem('athanExactAlarmWarned')){
                    // Just got permission back — reschedule right now
                    localStorage.removeItem('athanExactAlarmWarned');
                    localStorage.removeItem('prayerLastScheduleTs');
                    PrayerUI.initScheduleOnStart();
                  }
                }).catch(function(){});
                // Check battery optimization on resume — re-check every 7 days in case user
                // reverted the exemption (Samsung OEM can reset it after OS updates).
                // Re-check battery opt every 7 days — Samsung OEM can silently revoke exemption
                var _bwAge=parseInt(localStorage.getItem('batteryOptWarnedAt')||'0');
                if(Date.now()-_bwAge>7*24*60*60*1000){
                  _AA.isIgnoringBatteryOpts&&_AA.isIgnoringBatteryOpts().then(function(r){
                    if(r&&r.ignoring===false&&window._showBatteryOptWarning)window._showBatteryOptWarning();
                  }).catch(function(){});
                }
              }
            })();
            // Reschedule athan + daily verse if new day
            if(window.PrayerUI)PrayerUI.initScheduleOnStart();
            // Rebuild prayer panel if active — handles overnight stale date.
            // Skipped on macOS: athan notifications bring app to foreground automatically;
            // re-rendering would cause a visible "refresh" the user didn't ask for.
            var _fgPlatform=window.Capacitor&&Capacitor.getPlatform?Capacitor.getPlatform():'';
            if(window.PrayerUI&&S.tab==='prayer'&&_fgPlatform!=='mac'){
              requestAnimationFrame(function(){PrayerUI.render();_renderHash.prayer=_tabHash('prayer');});
            } else if(window.PrayerUI&&_fgPlatform!=='mac'){
              // Not on prayer tab — just invalidate hash so it rebuilds fresh on next visit
              _renderHash.prayer=null;
            }
            // Push fresh widget data if date or city changed since last push
            if(window.PrayerUI)PrayerUI.pushWidgetIfStale();
            pushGoalDataToWidget();
            syncWidgetTranslations();
            initDailyVerse();
            scheduleStreakReminder();
            checkNewVideoNotif();
            checkNewBookNotif();
            // Re-run prefetch — capped to once per 10 min to avoid spawning 20 city
            // fetches on every single foreground event (rapid background/foreground cycles).
            (function(){
              var _now=Date.now(),_lp=parseInt(localStorage.getItem('tk_prefetch_ts')||'0');
              if(_now-_lp>600000){
                localStorage.setItem('tk_prefetch_ts',String(_now));
                if(window.PrayerUI&&PrayerUI.prefetchAllCities)PrayerUI.prefetchAllCities();
              }
            })();
            console.log('[APP_LIFECYCLE] resume_refresh_done');
            // Restore playback highlight state if Quran tab is active
            if(S.tab==='quran')requestAnimationFrame(_hlRestoreAll);
          }
        });
      }
    }catch(e){console.warn('App state listener not available',e)}

    // Handle iOS widget tap → deep link to prayer tab (tafsirkurd://prayer)
    try{
      if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App){
        Capacitor.Plugins.App.addListener('appUrlOpen',function(ev){
          if(ev&&ev.url&&ev.url.indexOf('://prayer')!==-1){App.tab('prayer');}
        });
      }
    }catch(e){}

    // Handle notification tap → deep link to ayah/video
    if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications){
      Capacitor.Plugins.LocalNotifications.addListener('localNotificationActionPerformed',function(ev){
        var extra=ev&&ev.notification&&ev.notification.extra;
        if(!extra)return;
        // On macOS, Alert-style athan notifications automatically bring the app to the
        // foreground without any user interaction. Guard prayer-tab navigation so it only
        // fires when the user explicitly tapped — not on every athan fire.
        var _isMac=(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==='mac');
        var _isUserTap=(!ev.actionId||ev.actionId==='tap');
        if(_isMac&&!_isUserTap)return;
        if(extra.type==='verse'&&extra.s&&extra.a){
          App.tab('quran');
          setTimeout(function(){App.openSurah(extra.s,extra.a);},300);
        }
        if(extra.type==='video'&&extra.id){
          App.tab('islamvoice');
          // Wait for islamvoice data to load then open episode
          var _ivTries=0;
          var _ivOpen=function(){
            if(S.ivEpisodes&&S.ivEpisodes.length){
              // Find the series for this episode then open series + play
              var ep=S.ivEpisodes.find(function(e){return String(e.id)===String(extra.id);});
              if(ep){App.ivShowSeries(ep.series_id);setTimeout(function(){App.ivPlay(ep.id);},200);}
            } else if(_ivTries++<20){setTimeout(_ivOpen,300);}
          };
          setTimeout(_ivOpen,400);
        }
        if(extra.type==='book'&&extra.id){
          App.tab('gencine');
          // Wait for gencine data to load then open book
          var _bkTries=0;
          var _bkOpen=function(){
            if(window.GencineUI&&GencineUI.openBook(extra.id))return;
            if(_bkTries++<20)setTimeout(_bkOpen,300);
          };
          setTimeout(_bkOpen,400);
        }
        if(extra.type==='hadith'){
          App.tab('gencine');
          var _hdTries=0;
          var _hdOpen=function(){
            if(window.GencineUI){GencineUI.section('hadith');return;}
            if(_hdTries++<20)setTimeout(_hdOpen,300);
          };
          setTimeout(_hdOpen,400);
        }
        if(extra.type==='adhkar'&&extra.id){
          App.tab('gencine');
          var _adhTries=0;
          var _adhOpen=function(){
            if(window.GencineUI){GencineUI.openAdhkar(extra.id);return;}
            if(_adhTries++<20)setTimeout(_adhOpen,300);
          };
          setTimeout(_adhOpen,400);
        }
        if(extra.type==='streak'){
          App.tab('quran');
        }
        if(extra.type==='prayer'){
          App.tab('prayer');
        }
        if(extra.type==='update'){
          // Tapping the update notification opens the store directly
          if(window.ForceUpdate)window.ForceUpdate.openStore();
        }
      });
    }

    // macOS: track last user interaction so AppDelegate can distinguish
    // user-initiated foreground from notification-triggered foreground.
    if(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==='mac'){
      var _updateMacInteraction=function(){
        var _pr=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Preferences;
        if(_pr)_pr.set({key:'macLastInteraction',value:String(Date.now()/1000)}).catch(function(){});
      };
      document.addEventListener('pointerdown',_updateMacInteraction,{passive:true});
      document.addEventListener('keydown',_updateMacInteraction,{passive:true});
      _updateMacInteraction(); // stamp once on launch so first open never auto-minimizes
    }

    // Android back button
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('backButton',function(){
          if($('fuOverlay')&&$('fuOverlay').classList.contains('on')){return} // hard block — back does nothing
          var _nmOv=document.querySelector('.note-modal-ov.on');if(_nmOv){_nmOv.classList.remove('on');return}
          if($('khatmCelebOverlay')){App.closeGoalCelebration();return}
          if($('pppCelebOverlay')){App.closePrayerCelebration();return}
          if($('pppDayOverlay')&&$('pppDayOverlay').classList.contains('on')){App.closePrayerDay();return}
          if($('prayerProgressPanel')&&$('prayerProgressPanel').classList.contains('on')){App.closePrayerProgress();return}
          if($('dlMgrSheet')&&$('dlMgrSheet').classList.contains('open')){closeDlManager();return}
          if($('profilePanel')&&$('profilePanel').classList.contains('on')){App.closeProfile();return}
          if($('authPanel')&&$('authPanel').classList.contains('on')){App.closeLogin();return}
          if($('goalConfirmOverlay')&&$('goalConfirmOverlay').classList.contains('on')){App.closeDeleteConfirm();return}
          if($('goalStartChoiceOverlay')&&$('goalStartChoiceOverlay').classList.contains('on')){App.closeStartChoice();return}
          if($('repeatModal').classList.contains('on')){App.closeRepeat();return}
          if($('audioSettingsPanel').classList.contains('on')){App.closeAudioSettings();return}
          if($('qsSheet')&&$('qsSheet').classList.contains('on')){App.closeReaderSettings();return}
          if(S.sidebar){App.closeSidebar();return}
          if($('wizard').classList.contains('on')){App.closeWizard();return}
          if(S.ivCurrentSeries){App.ivBack();return}
          if(S.surah){App.backToList();return}
          if(S.tab!=='quran'){App.tab('quran');return}
          window.Capacitor.Plugins.App.exitApp();
        });
      }
    }catch(e){console.warn('Back button handler not available',e)}

    // Handle OAuth deep link callback
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('appUrlOpen',function(event){
          if(event.url&&(event.url.indexOf('tafsirkurd://auth')===0||event.url.indexOf('com.tafsirkurd.app://auth')===0)){
            // Close the in-app browser
            try{if(window.Capacitor.Plugins.Browser)window.Capacitor.Plugins.Browser.close()}catch(e2){}

            var url=event.url;

            // Common session handler — upserts profile and signs the user in
            function _applySession(session){
              setUserFromSession(session);
              var u=session.user;var meta=u.user_metadata||{};
              S.supabase.from('profiles').upsert({
                id:u.id,email:u.email,
                full_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
                display_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
                avatar_url:meta.avatar_url||null,
                registration_source:'google',
                has_completed_signup:true,
                first_login_at:new Date().toISOString()
              },{onConflict:'id'}).then(function(){});
              App.closeLogin();
              toast(t('toast.logged_in'));
              if(S.tab==='settings')renderSettings();
            }

            if(!S.supabase)return;

            // ── PKCE flow (Supabase v2 default): code in query params ──────
            // Supabase returns ?code=... which must be exchanged for a session.
            var qStr=(url.split('?')[1]||'').split('#')[0];
            var code=new URLSearchParams(qStr).get('code');
            if(code){
              S.supabase.auth.exchangeCodeForSession(code).then(function(resp){
                if(resp.error){console.error('[OAuth] PKCE exchange error:',resp.error);return;}
                if(resp.data&&resp.data.session)_applySession(resp.data.session);
              }).catch(function(e3){console.error('[OAuth] PKCE catch:',e3);});
              return;
            }

            // ── Implicit grant (fallback): tokens in hash fragment ───────────
            var hashPart=url.split('#')[1]||'';
            var hParams=new URLSearchParams(hashPart);
            var accessToken=hParams.get('access_token');
            var refreshToken=hParams.get('refresh_token');
            if(accessToken&&refreshToken){
              S.supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken}).then(function(resp){
                if(resp.error){console.error('[OAuth] setSession error:',resp.error);return;}
                if(resp.data&&resp.data.session)_applySession(resp.data.session);
              }).catch(function(e3){console.error('[OAuth] setSession catch:',e3);});
            }
          }
        });
      }
    }catch(e){console.warn('Deep link handler not available',e)}

    // Fix tab bar after exiting fullscreen video
    document.addEventListener('fullscreenchange',function(){
      if(!document.fullscreenElement){
        setTimeout(function(){window.dispatchEvent(new Event('resize'))},100);
      }
    });
    document.addEventListener('webkitfullscreenchange',function(){
      if(!document.webkitFullscreenElement){
        setTimeout(function(){window.dispatchEvent(new Event('resize'))},100);
      }
    });

    // Scroll-pause: add tk-scrolling class during active scroll so CSS can
    // pause heavy GPU animations (sky, audio wave, etc.) — reduces compositor
    // work that causes scroll jank on mid-range Android devices.
    (function(){
      var _st=null;
      document.addEventListener('scroll',function(){
        document.body.classList.add('tk-scrolling');
        if(_st)clearTimeout(_st);
        _st=setTimeout(function(){_st=null;document.body.classList.remove('tk-scrolling');},120);
      },{passive:true,capture:true});
    })();
  }catch(e){
    console.error('App init error:',e);
  }

  // Ensure notification channels exist on Android (capacitor.config channels[] is iOS-only)
  // Note: requestPermissions() is NOT called here — _doSchedule() handles it at the right
  // time (after athan data is ready), preventing a premature dialog on top of the splash.
  if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications){
    try{
      var _LN=window.Capacitor.Plugins.LocalNotifications;
      // Create reminder channel immediately at startup
      _ensureReminderChannel(_LN);
      // Reschedule daily reminder on every launch so 7-day window never expires
    }catch(e){}
  }

  // Critical: schedule athan + daily verse immediately (notification timing matters)
  if(window.PrayerUI)PrayerUI.initScheduleOnStart();
  // Push widget data from cache if date/city changed (runs without network)
  if(window.PrayerUI)PrayerUI.pushWidgetIfStale();
  pushGoalDataToWidget();
  // Sync widget translations from Supabase (once per day, requires network)
  setTimeout(function(){if(!_sn.skip())syncWidgetTranslations();},3000);
  initDailyVerse();
  // Stagger non-critical background work to avoid network + CPU spike right after entry
  setTimeout(function(){scheduleStreakReminder();},800);
  setTimeout(function(){checkNewVideoNotif();},1500);
  setTimeout(function(){_warmAboutCache();},2000);
  setTimeout(function(){checkNewBookNotif();},2500);
  _initPushTapListener(); // register tap listener immediately — never miss cold-start events
  setTimeout(function(){initPushToken();},3000);
  setTimeout(function(){_reportAppVersion();},5000);
  // Load Gencine scripts immediately — all three are SW-precached so this is near-instant.
  // Pre-render runs as soon as scripts are ready so buttons are always there on first tap.
  _loadGencineScripts(function(){
    if(window.GencineUI&&S.tab!=='gencine'){
      var _gh=_tabHash('gencine');
      if(_gh!==_renderHash.gencine){GencineUI.render();_renderHash.gencine=_gh;}
    }
  });
  // Heavy: fetches prayer data for all 20 cities — skip on slow networks (user's city is already cached)
  setTimeout(function(){if(!_sn.skip()&&window.PrayerUI)PrayerUI.prefetchAllCities();},6000);
  // Athan voice decode is CPU-intensive — skip on slow networks
  setTimeout(function(){if(!_sn.skip()&&window.PrayerUI)PrayerUI.preloadAthanVoices();},5000);
  // Audio cache warmup — verify manifest entries still exist on disk, populate _uriMap
  setTimeout(function(){if(window.AudioCache)AudioCache.warmup();},4000);

  // Fetch prayer data immediately (no delay) so cache is ready for pre-render below
  if(window.PrayerAPI&&window.PrayerCache&&window.PrayerLogic){
    var _pwCity=localStorage.getItem('prayerCity')||'Duhok';
    var _pwToday=window.PrayerLogic.todayBaghdad();
    var _pwParts=_pwToday.split('-').map(Number);
    var _pwMkey=window.PrayerCache.monthKey(_pwCity,_pwParts[0],_pwParts[1]);
    if(!window.PrayerCache.read(_pwMkey)){
      window.PrayerAPI.fetchPrayerTimes(_pwCity,_pwToday).catch(function(){});
    }
  }

  // Mushaf font warm-up — prefetch current page ±4 fonts/data so Mushaf tab opens fast
  setTimeout(function(){
    getMushafPageRange(S.surah||1).then(function(pages){
      var cur=pages.start;
      for(var _wp=-2;_wp<=4;_wp++){
        if(cur+_wp>=1&&cur+_wp<=604)_prefetchMushafPage(cur+_wp);
      }
    }).catch(function(){});
  },500);

  // Early data prefetch — warm all API/DB caches before user taps any tab.
  // No DOM work here — just fires network requests so cache is hot when tab opens.
  setTimeout(function(){
    if(window.GencineUI&&GencineUI.prefetch)GencineUI.prefetch();
  },200);

  // Pre-render fallback — fires at 1500ms if _checkDataReady() hasn't triggered it yet.
  // Normal case: _checkDataReady() triggers _startTabPrerender() ~100ms after start.
  setTimeout(function(){_startTabPrerender();},1500);

  // Smart splash — 2 gates: quran data loaded + all tabs pre-rendered.
  // Hybrid timing: first launch / new version → 800ms minimum (logo animation).
  //                repeat same-version launches → immediate exit when data ready.
  var _splashStart = Date.now();
  var _splashReady = {quran:false}; // tabs removed as gate — pre-render runs in background
  var _splashDismissed = false;
  var _splashSeenKey = 'tk_splash_seen';
  var _splashMinPassed = false;

  // Version check — resolves in <10ms on device (Capacitor bridge call)
  (function(){
    try {
      if (!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.App) {
        _splashMinPassed=true; return; // web/dev — no minimum
      }
      Capacitor.Plugins.App.getInfo().then(function(info){
        if (localStorage.getItem(_splashSeenKey)===(info.version||'')) {
          // Repeat launch, same version — exit as soon as data is ready
          _splashMinPassed=true;
          _checkSplashReady();
        }
        // else: first launch or new version — 3s timer handles it below
      }).catch(function(){ _splashMinPassed=true; _checkSplashReady(); });
    } catch(e){ _splashMinPassed=true; }
  })();

  // 600ms minimum — only active for first launch / new version (logo animation duration).
  // Writes the "seen" flag so next launch exits as soon as data is ready.
  setTimeout(function(){
    if(_splashMinPassed)return; // already cleared (repeat launch)
    try {
      if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App)
        Capacitor.Plugins.App.getInfo().then(function(i){localStorage.setItem(_splashSeenKey,i.version||'');}).catch(function(){});
    }catch(e){}
    _splashMinPassed=true;
    _checkSplashReady();
  },600);

  function _doSplashTransition(){
    if(_splashDismissed)return;
    _splashDismissed=true;
    var sp=$('splash');
    var app=$('app');
    if(app)app.style.display='flex';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        console.log('[Startup] Transitioning into app at',Date.now()-_splashStart,'ms');
        // Dismiss themed native overlay (iOS MainViewController) — runs in parallel with HTML exit
        try{if(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.splashDismiss)
          window.webkit.messageHandlers.splashDismiss.postMessage(null);}catch(e){}
        // Logo exit animation — skipped on warm resume (instant restore)
        var logo=document.getElementById('splashLogo');
        if(logo&&!window._splashFastExit)logo.classList.add('exit');
        // App fades in at the same time as logo exits
        if(app)app.classList.add('visible');
        if(_pendingPushDeepLink){
          var _pl=_pendingPushDeepLink;_pendingPushDeepLink=null;
          setTimeout(function(){_handlePushDeepLink(_pl.type,_pl.id);},300);
        }
        // Splash bg fades out after logo animation finishes (~260ms)
        setTimeout(function(){
          if(sp){sp.style.transition='opacity .15s ease';sp.classList.add('hide');}
          setTimeout(function(){if(sp&&sp.parentNode)sp.parentNode.removeChild(sp);},200);
        },220);
        console.log('[Startup] App visible at',Date.now()-_splashStart,'ms');
      });
    });
  }

  function _checkSplashReady(){
    if(_splashDismissed)return;
    if(!_splashReady.quran)return;
    if(!_splashReady.video)return; // video gate (auto-passes — no video element)
    if(!_splashMinPassed)return; // first launch / new version: wait for 800ms minimum
    console.log('[Startup] All gates passed — exiting splash. Elapsed:',Date.now()-_splashStart,'ms');
    // Pre-warm app layout one frame before transition starts — gives browser a head start
    // painting the app before the splash fade begins (3 rAFs total on normal path).
    var app=$('app');
    if(app)app.style.display='flex';
    requestAnimationFrame(function(){_doSplashTransition();});
  }

  // Image-only splash — no video element, gate passes immediately
  var _splashVid=document.getElementById('splashVideo');
  if(_splashVid){
    // Legacy fallback if someone has a cached HTML with the old video element
    _splashVid.pause();
    _splashReady.video=true;
  } else {
    _splashReady.video=true;
  }

  // ── Warm resume fast path ─────────────────────────────────────────────────
  // WebView was killed while app was in background (iOS/Android memory pressure).
  // Skip ALL splash gates — user was already in the app, never show animation again.
  // This prevents the "blank → logo animation → delay → app" sequence on resume.
  if(window._isWarmResume){
    window._splashFastExit=true; // skip logo exit animation on resume
    _splashMinPassed=true;
    _splashReady.quran=true;
    _splashReady.tabs=true;
    _splashReady.video=true;
    console.log('[APP_LIFECYCLE] skipped_full_loader_on_resume');
    requestAnimationFrame(function(){
      // Instant fade (0.1s) instead of the normal exit animation — feels like native restore
      var _sp=$('splash');
      if(_sp)_sp.style.transition='opacity 0.1s';
      _doSplashTransition();
      console.log('[APP_LIFECYCLE] restored_last_ui_state');
    });
  }

  window._splashReadyQuran      =function(){if(_splashReady.quran)return;_splashReady.quran=true;_checkSplashReady();};
  window._splashReadyI18n       =function(){}; // not a gate — always fires before tabs anyway
  window._splashReadyGencine    =function(){}; // not a gate — Supabase-dependent, loads async
  window._splashReadyIslamvoice =function(){}; // not a gate — Supabase-dependent, loads async
  window._splashReadyTabs       =function(){}; // no longer a gate — pre-render runs in background
  // Overall failsafe — force app visible after 6s no matter what
  setTimeout(function(){_doSplashTransition();},6000);
  // Data always loads async now (no localStorage cache) — splash waits for both files
}

/* ===== LIVE TRANSLATION UPDATE ===== */
// Fires after every atomic translation swap in i18n.js (remote merge or version purge).
// Also called via window._i18nRerenderHook which i18n.js calls directly after a swap.
function _rerenderCurrentTab(){
  // Invalidate all pre-rendered caches so next tab visit rebuilds with fresh strings
  _renderHash={};
  if(window.PrayerUI) PrayerUI.invalidate();

  // Re-render the currently visible tab right now
  var tab=S.tab;
  if(tab==='bookmarks'){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');}
  else if(tab==='goals'){renderGoals();_renderHash.goals=_tabHash('goals');}
  else if(tab==='settings'){renderSettings();_renderHash.settings=_tabHash('settings');}
  else if(tab==='islamvoice'){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');}
  else if(tab==='prayer'&&window.PrayerUI){PrayerUI.redraw();}
  else if(tab==='gencine'&&window.GencineUI){GencineUI._homeEl=null;GencineUI._draw();}
  // quran tab uses data-i18n attributes — applyTranslations() handled by i18n.js before dispatch
}

// Register hook so i18n.js can trigger re-render directly after atomic swap
window._i18nRerenderHook = _rerenderCurrentTab;

document.addEventListener('i18n:updated', _rerenderCurrentTab);

/* ===== DATA LOADING ===== */
var _dataReady={quran:false,tafsir:false};
var _tabsPrerendering=false; // guard: pre-render runs only once
var _startupT0=Date.now();   // module load time for debug logs

function _checkDataReady(){
  if(!_dataReady.quran)return;
  // Signal splash gate as soon as quran.json is ready — tafsir (3MB) is only needed
  // when the user opens a surah to read, so it must not block the splash or tab pre-render.
  if(window._splashReadyQuran){window._splashReadyQuran();window._splashReadyQuran=null;}
  // Tab pre-render doesn't need tafsir — start immediately when quran is ready.
  // _tabsPrerendering guard ensures this runs only once even when called twice.
  setTimeout(_startTabPrerender,50);
  // Notify SmartDhikr that quranData is ready so the ayah card rebuilds with real text
  if(S.quranData&&window.SmartDhikr)SmartDhikr.onQuranReady();
  if(!_dataReady.tafsir)return;
  console.log('[Startup] quran+tafsir ready',Date.now()-_startupT0,'ms');
  if(S.surah)renderAyahs(S.surah);
  if(window.QuranSearch){
    QuranSearch.init(S.quranData,S.tafsirData);
    QuranSearch.setWorkerUrl('https://quran-search.tefsirkurd.workers.dev');
  }
}

// Pre-render all 6 tabs so they're built before user ever taps them.
// Called from _checkDataReady (early, data-driven) with 1500ms fallback in init().
function _startTabPrerender(){
  if(_tabsPrerendering)return;
  _tabsPrerendering=true;
  console.log('[Startup] Tab pre-render start',Date.now()-_startupT0,'ms');
  // Performance-tier gating: skip expensive pre-renders on weaker devices.
  // Skipped tabs still render on-demand when the user taps them (hash-cache check).
  var _perfLevel=window.TKPerf?window.TKPerf.level:'high';
  var _isLowEndDev=_perfLevel==='low'||_perfLevel==='critical';
  var _isMediumPerf=_perfLevel==='medium';
  console.log('[PERFORMANCE] pre-render tier: '+_perfLevel);
  var jobs=[
    function(){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');},
    function(){renderGoals();_renderHash.goals=_tabHash('goals');},
    // Settings: always pre-render — it's static DOM, cheap on all device tiers
    function(){renderSettings();_renderHash.settings=_tabHash('settings');},
    function(){if(window.PrayerUI){PrayerUI.render();_renderHash.prayer=_tabHash('prayer');
      requestAnimationFrame(function(){var _s=document.getElementById('prayerSkyScene');if(_s&&S.tab!=='prayer')_s.classList.add('sky-paused');});}},
    // IslamVoice/Gencine: skip on medium/low/critical — expensive, rarely first
    (_isLowEndDev||_isMediumPerf) ? null : function(){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');},
    (_isLowEndDev||_isMediumPerf) ? null : function(){if(window.GencineUI)GencineUI.render();}
  ].filter(Boolean); // remove nulls for lower perf tiers
  var _ji=0;
  // Low/critical: longer gap between jobs to reduce CPU burst at startup
  var _jobDelay=_isLowEndDev?32:_isMediumPerf?24:16;
  function _nextJob(){
    if(_ji>=jobs.length){
      console.log('[Startup] Tab pre-render done',Date.now()-_startupT0,'ms');
      if(window._splashReadyTabs)window._splashReadyTabs();
      return;
    }
    jobs[_ji++]();
    setTimeout(_nextJob,_jobDelay);
  }
  _nextJob();
}
// ── IndexedDB cache for large immutable data files ───────────────────────────
// Quran text and Kurdish tafsir never change between app versions, so we
// parse them once, store the JS object in IDB, and skip fetch+JSON.parse on
// every subsequent launch (~150 ms → ~15 ms for quran.json on repeat opens).
var _tkIDB=null;
function _openIDB(cb){
  if(_tkIDB){cb(_tkIDB);return;}
  // Reuse connection pre-opened by inline script in index.html (zero latency)
  if(window._tkIDBConn){_tkIDB=window._tkIDBConn;cb(_tkIDB);return;}
  try{
    var req=indexedDB.open('tk-data-v1',1);
    req.onupgradeneeded=function(e){e.target.result.createObjectStore('files');};
    req.onsuccess=function(e){_tkIDB=e.target.result;cb(_tkIDB);return;};
    req.onerror=function(){cb(null);};
  }catch(e){cb(null);}
}
function _idbGet(key,cb){
  _openIDB(function(db){
    if(!db){cb(null);return;}
    try{
      var req=db.transaction('files','readonly').objectStore('files').get(key);
      req.onsuccess=function(){cb(req.result||null);};
      req.onerror=function(){cb(null);};
    }catch(e){cb(null);}
  });
}
function _idbPut(key,val){
  _openIDB(function(db){
    if(!db)return;
    try{db.transaction('files','readwrite').objectStore('files').put(val,key);}catch(e){}
  });
}

var _QURAN_IDB_KEY='quran_v1';
function _fetchQuranData(){
  var _t0=Date.now();
  // Retry up to 2 times with exponential backoff before giving up.
  // Each attempt creates a fresh AbortController so the timeout resets.
  _tkRetry(function(){
    var ctrl=new AbortController();
    var tid=setTimeout(function(){ctrl.abort();},_sn.ms(12000,25000));
    return fetch('/data/quran.json',{signal:ctrl.signal}).then(function(r){
      clearTimeout(tid);
      if(!r.ok)throw new Error('HTTP '+r.status);
      return r.json();
    }).catch(function(e){clearTimeout(tid);throw e;});
  },{maxRetries:2,base:600})
  .then(function(d){
    AndroidLog.fetch('/data/quran.json',200,'quran',false,Date.now()-_t0);
    S.quranData=d;
    _idbPut(_QURAN_IDB_KEY,d);
    _dataReady.quran=true;
    _checkDataReady();
  })
  .catch(function(e){
    AndroidLog.fetch('/data/quran.json',0,'quran',false,Date.now()-_t0,e);
    console.error('[quran] failed after retries:',e);
    toast(t('error.data_load'));
    _dataReady.quran=true; // unblock splash even on final failure
    _checkDataReady();
  });
}
function loadQuranData(){
  // Fast path A: HTML preload script already read IDB during page parse — zero async wait.
  if(window._tkQuranPreload){
    S.quranData=window._tkQuranPreload;
    _dataReady.quran=true;
    _checkDataReady();
    return;
  }
  // Fast path B: IDB open succeeded but key absent (first launch) — skip IDB round-trip.
  if(window._tkQuranPreload===false){
    _fetchQuranData();
    return;
  }
  // Fallback: preload script not yet done (or IDB unavailable) — check IDB ourselves.
  _idbGet(_QURAN_IDB_KEY,function(cached){
    if(cached){
      S.quranData=cached;
      _dataReady.quran=true;
      _checkDataReady();
      return;
    }
    _fetchQuranData();
  });
}

function groupTafsirBySurah(data){
  if(!Array.isArray(data)||!data.length)return data;
  // Already grouped format (array of {verses:[...]})
  if(data[0]&&data[0].verses)return data;
  // Flat array with surah/ayah/kurdish_tafsir keys
  if(data[0]&&data[0].surah!=null){
    var grouped={};
    data.forEach(function(item){
      var sn=item.surah;
      if(!grouped[sn])grouped[sn]={verses:[]};
      var txt=item.kurdish_tafsir||item.text||item.tafsir||'';
      grouped[sn].verses.push({verse:parseInt(item.ayah),text:txt});
    });
    var result=[];
    for(var i=1;i<=114;i++){
      result.push(grouped[i]||{verses:[]});
    }
    return result;
  }
  return data;
}

var _TAFSIR_IDB_KEY='tafsir_v1';
function loadTafsirData(){
  // Try IDB first — stores the pre-processed grouped object so we skip
  // both the 3 MB fetch and groupTafsirBySurah() on every repeat launch.
  _idbGet(_TAFSIR_IDB_KEY,function(cached){
    if(cached){S.tafsirData=cached;_dataReady.tafsir=true;_checkDataReady();return;}
    var _t0=Date.now();
    _tkRetry(function(){
      var ctrl=new AbortController();
      var tid=setTimeout(function(){ctrl.abort();},_sn.ms(18000,32000));
      return fetch('/data/kurdish_tafsir.json',{signal:ctrl.signal}).then(function(r){
        clearTimeout(tid);
        if(!r.ok)throw new Error('HTTP '+r.status);
        return r.json();
      }).catch(function(e){clearTimeout(tid);throw e;});
    },{maxRetries:2,base:800})
    .then(function(d){
      var grouped=groupTafsirBySurah(d);
      S.tafsirData=grouped;
      _idbPut(_TAFSIR_IDB_KEY,grouped);
      _dataReady.tafsir=true;
      _checkDataReady();
    })
    .catch(function(e){
      console.error('[tafsir] failed after retries:',e);
      toast(t('error.tafsir_load'));
      _dataReady.tafsir=true; // unblock splash on final failure
      _checkDataReady();
    });
  });
}

/* ===== THEME & SIZES ===== */
function applyTheme(){
  // Pause sky CSS animations during theme cascade to prevent compositor jank.
  var _skyEl=document.getElementById('prayerSkyScene');
  var _skyWasRunning=_skyEl&&!_skyEl.classList.contains('sky-paused');
  if(_skyWasRunning)_skyEl.classList.add('sky-paused');

  var bgMap={light:'#fafafa',dark:'#0a0a0a',sakina:'#0c1c12',noor:'#f4e8cc'};
  var bg=bgMap[S.theme]||'#fafafa';
  document.documentElement.setAttribute('data-theme',S.theme);
  // Keep inline --bg in sync with the startup anti-flash script (index.html head).
  // Without this, the startup inline style overrides CSS [data-theme] rules on every theme switch.
  document.documentElement.style.background=bg;
  document.documentElement.style.setProperty('--bg',bg);
  localStorage.setItem('theme',S.theme);
  _nativeSyncTheme(S.theme);
  if(window.Capacitor&&window.Capacitor.Plugins.StatusBar){
    var isDark=S.theme==='dark'||S.theme==='sakina';
    try{window.Capacitor.Plugins.StatusBar.setStyle({style:isDark?'DARK':'LIGHT'})}catch(e){}
    try{window.Capacitor.Plugins.StatusBar.setBackgroundColor({color:bg})}catch(e){}
  }

  // Resume sky one frame later so the new theme paints before animations restart.
  if(_skyWasRunning){requestAnimationFrame(function(){var _s=document.getElementById('prayerSkyScene');if(_s)_s.classList.remove('sky-paused');});}
}
function applySizes(){
  document.documentElement.style.setProperty('--ar-size',S.arSize+'rem');
  document.documentElement.style.setProperty('--tf-size',S.tfSize+'rem');
  document.documentElement.style.setProperty('--line-h',String(S.lineH));
  var fontVal=S.readerFont==='amiri'?"'Amiri Quran','KFGQPC Hafs',sans-serif":"'KFGQPC Hafs','Scheherazade New','IBM Plex Sans Arabic',sans-serif";
  document.documentElement.style.setProperty('--font-ar',fontVal);
}
var _qsDimTimer=null;
function dimQsSheet(){
  var sheet=$('qsSheet'),ov=$('qsOverlay');
  if(sheet)sheet.style.opacity='0.12';
  if(ov)ov.style.opacity='0';
  clearTimeout(_qsDimTimer);
  _qsDimTimer=setTimeout(restoreQsSheet,1200);
}
function restoreQsSheet(){
  clearTimeout(_qsDimTimer);
  var sheet=$('qsSheet'),ov=$('qsOverlay');
  if(sheet)sheet.style.opacity='';
  if(ov)ov.style.opacity='';
}
function applyKeepAwake(){
  try{
    var KA=window.Capacitor&&window.Capacitor.Plugins.KeepAwake;
    if(!KA)return;
    if(S.keepAwake)KA.keepAwake();else KA.allowSleep();
  }catch(e){}
}

/* ===== TAB SWITCHING ===== */
var _renderHash={};
function _tabHash(name){
  if(name==='bookmarks'){
    var bms=getBookmarks();
    return bms.length+':'+S.bmSort;
  }
  if(name==='goals'){
    var log=getReadLog();var g=getGoal();var today=dateKey(new Date());
    var sl=0;try{sl=JSON.parse(localStorage.getItem('readSessions')||'[]').length;}catch(e){}
    return JSON.stringify(g)+':'+(log[today]||0)+':'+calcStreak(log)+':'+sl;
  }
  if(name==='settings'){
    return (S.user?S.user.email:'')+':'+S.theme+':'+S.hapticFeedback+':'+S.arSize+':'+S.tfSize+':'+S.keepAwake;
  }
  if(name==='islamvoice'){
    return (S.ivSeries?S.ivSeries.length:0)+':'+(S.ivSearchQuery||'')+(S.ivSpeakerFilter||'');
  }
  if(name==='prayer'){
    return 'p:'+(localStorage.getItem('prayerCity')||'Duhok')+':'+(localStorage.getItem('prayerMethod')||'13')+':'+new Date().toDateString();
  }
  if(name==='gencine'){
    // Version key + date — forces re-render on DB reload OR new day
    return 'g:'+(window._gencineDbVersion||0)+':'+new Date().toDateString();
  }
  return null;
}
window.App={};
// Cached panel/tab-item NodeLists — populated once on first tab switch (DOM is ready by then)
var _cachedPanels=null,_cachedTabItems=null,_cachedTabBtns={};
function _getCachedPanels(){if(!_cachedPanels)_cachedPanels=document.querySelectorAll('.panel');return _cachedPanels;}
function _getCachedTabItems(){if(!_cachedTabItems)_cachedTabItems=document.querySelectorAll('.tab-item');return _cachedTabItems;}
function _getCachedTabBtn(name){if(!_cachedTabBtns[name])_cachedTabBtns[name]=document.querySelector('.tab-item[data-tab="'+name+'"]');return _cachedTabBtns[name];}
// Track pending tab rAF renders so we can cancel them if user switches again
var _pendingTabRaf=null;
// Saved scroll positions per tab — panels preserve scrollTop naturally via display:none,
// but we need to re-apply it when content is rebuilt (hash change forces re-render).
var _tabScrollPos={};
App.tab=function(name){
  if(tapGuard('tab',80))return; // 80ms guard — fast enough for rapid switching
  if(name===S.tab){
    haptic([8]);
    if(name==='quran'){
      if(S.surah){
        // Inside surah: first re-tap scrolls to top, second goes back to grid
        var _mv=$('mushafView');
        var _se=(_mv&&_mv.style.display!=='none')?_mv:$('ayahList');
        if(_se&&_se.scrollTop>20){_se.scrollTo({top:0,behavior:'smooth'});}
        else{App.backToList();}
      }else{
        // On Quran grid: scroll to top
        var _qp=$('panelQuran');
        if(_qp&&_qp.scrollTop>20){_qp.scrollTo({top:0,behavior:'smooth'});}
      }
      return;
    }
    if(name==='islamvoice'){
      var _ip=$('panelIslamvoice');
      if(S.ivCurrentSeries){
        // Inside series view: scroll to top first, then back to home
        if(_ip&&_ip.scrollTop>20){_ip.scrollTo({top:0,behavior:'smooth'});}
        else{App.ivBack();}
      }else{
        // On video home: scroll to top
        if(_ip&&_ip.scrollTop>20){_ip.scrollTo({top:0,behavior:'smooth'});}
      }
      return;
    }
    if(name==='gencine'){
      var _gp=$('panelGencine');
      if(window.GencineUI&&GencineUI._view!=='home'){
        // Inside sub-view: scroll to top first, then go home
        if(_gp&&_gp.scrollTop>20){_gp.scrollTo({top:0,behavior:'smooth'});}
        else{GencineUI.goHome();}
      }else{
        // On Gencine home: scroll to top
        if(_gp&&_gp.scrollTop>20){_gp.scrollTo({top:0,behavior:'smooth'});}
      }
      return;
    }
    if(name==='settings'){
      var _sp=$('panelSettings');
      if(_sp&&_sp.scrollTop>20){_sp.scrollTo({top:0,behavior:'smooth'});}
      return;
    }
    return;
  }
  haptic([8]);

  // Cancel any pending rAF render from a previous fast tab switch
  if(_pendingTabRaf){cancelAnimationFrame(_pendingTabRaf);_pendingTabRaf=null;}

  var _prevTab=S.tab;
  S.tabHistory.push(_prevTab);
  S.tab=name;

  // ── Show new panel instantly — only touch the previous + new panel, not ALL panels ──
  // Suppress CSS transitions for exactly 1 frame so the panel swap is pixel-instant,
  // not a 150ms fade. Transitions resume on the next requestAnimationFrame.
  document.body.classList.add('tk-tab-switching');
  var prevPanel=$('panel'+_prevTab.charAt(0).toUpperCase()+_prevTab.slice(1));
  if(prevPanel)prevPanel.classList.remove('on');
  var panel=$('panel'+name.charAt(0).toUpperCase()+name.slice(1));
  if(panel)panel.classList.add('on');
  requestAnimationFrame(function(){document.body.classList.remove('tk-tab-switching');});

  // ── Tab bar icon + ARIA ──
  var prevBtnName=(_prevTab==='goals'||_prevTab==='bookmarks')?'quran':_prevTab;
  var prevBtn=_getCachedTabBtn(prevBtnName);
  if(prevBtn){prevBtn.classList.remove('on');prevBtn.setAttribute('aria-selected','false');}
  var tabBtnName=(name==='goals'||name==='bookmarks')?'quran':name;
  var tabBtn=_getCachedTabBtn(tabBtnName);
  if(tabBtn){tabBtn.classList.add('on');tabBtn.setAttribute('aria-selected','true');}

  // ── Prayer: unpause sky in next frame ──
  if(name==='prayer'){
    requestAnimationFrame(function(){
      var _skyEl=document.getElementById('prayerSkyScene');
      if(_skyEl)_skyEl.classList.remove('sky-paused');
    });
  }

  // ── Defer all cleanup + renders to next frame so tab switch paints first ──
  _pendingTabRaf=requestAnimationFrame(function(){
    _pendingTabRaf=null;

    // ── Save scroll of departing tab before any cleanup ──────────────────────
    // display:none preserves scrollTop natively, but render rebuilds reset it.
    // Saving now lets us restore position when user returns after a data change.
    var _prevPanelEl=document.getElementById('panel'+_prevTab.charAt(0).toUpperCase()+_prevTab.slice(1));
    if(_prevPanelEl)_tabScrollPos[_prevTab]=_prevPanelEl.scrollTop;
    // For IslamVoice home view specifically, also update the named scroll var
    if(_prevTab==='islamvoice'&&!S.ivCurrentSeries){var _piv0=$('panelIslamvoice');if(_piv0)S._ivHomeScroll=_piv0.scrollTop;}

    // Cleanup from previous tab
    if(_prevTab==='prayer'&&name!=='prayer'&&window.PrayerUI){
      PrayerUI.stopCountdown();
      var _skyEl2=document.getElementById('prayerSkyScene');
      if(_skyEl2)_skyEl2.classList.add('sky-paused');
    }
    if(_prevTab==='quran'&&name!=='quran'){
      var _sb=document.getElementById('searchBar');if(_sb)_sb.classList.remove('on');App.clearSearch();
      if(_surahBadgeObs){_surahBadgeObs.disconnect();}
      clearMushafHighlights();
    }
    if(_prevTab==='gencine'&&name!=='gencine'&&window.GencineUI){GencineUI.closeSheet();}
    if(_prevTab==='islamvoice'&&name!=='islamvoice'){if(typeof _ivHeroTimer!=='undefined'&&_ivHeroTimer){clearInterval(_ivHeroTimer);_ivHeroTimer=null;}}
    if(name==='islamvoice'&&typeof _ivHeroSlides!=='undefined'&&_ivHeroSlides.length){_ivHeroResetTimer();}
    if(S.surah&&name!=='quran'){_endSession();}
    App.closeRecPicker();
    if(typeof closeCfgSheet==='function')closeCfgSheet();
    App.closeReaderSettings();

    // Renders for new tab — hash checks prevent unnecessary rebuilds.
    // Each tab renders once (at pre-render or first open) and stays in DOM.
    // Only re-renders when the tab's data actually changes (hash mismatch).
    // Rebuilds are deferred by one rAF so the panel shows old content for
    // exactly one frame (16ms) before the new content replaces it atomically.
    // This eliminates all "blank container" flashes during tab switching.
    var _didRebuild=false;
    if(name==='quran'){requestAnimationFrame(_hlRestoreAll);}
    if(name==='bookmarks'){
      var _hbm=_tabHash('bookmarks');
      if(_hbm!==_renderHash.bm){
        _didRebuild=true;
        requestAnimationFrame(function(){
          if(S.tab!=='bookmarks')return;
          renderBookmarks();_renderHash.bm=_tabHash('bookmarks');
        });
      }
    }
    if(name==='goals'){
      var _hg=_tabHash('goals');
      if(_hg!==_renderHash.goals){
        _didRebuild=true;
        requestAnimationFrame(function(){
          if(S.tab!=='goals')return;
          renderGoals();_renderHash.goals=_tabHash('goals');
        });
      }
    }
    if(name==='islamvoice'){
      var _hiv=_tabHash('islamvoice');
      if(_hiv!==_renderHash.iv){
        _didRebuild=true;
        var _ivPre=$('panelIslamvoice');var _ivPreScroll=_ivPre?_ivPre.scrollTop:0;
        requestAnimationFrame(function(){
          if(S.tab!=='islamvoice')return;
          renderIslamVoice();
          if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');
          if(_ivPreScroll>0){requestAnimationFrame(function(){var _ivPost=$('panelIslamvoice');if(_ivPost)_ivPost.scrollTop=_ivPreScroll;});}
        });
      } else if(!S.ivCurrentSeries&&S._ivHomeScroll!=null){
        var _ivRestoreEl=$('panelIslamvoice');
        if(_ivRestoreEl){requestAnimationFrame(function(){_ivRestoreEl.scrollTop=S._ivHomeScroll||0;});}
      }
    }
    if(name==='settings'){
      var _hs=_tabHash('settings');
      if(_hs!==_renderHash.settings){
        _didRebuild=true;
        requestAnimationFrame(function(){
          if(S.tab!=='settings')return;
          renderSettings();_renderHash.settings=_tabHash('settings');
        });
      }
      _warmAboutCache();
    }
    if(name==='prayer'&&window.PrayerUI){
      var _hp=_tabHash('prayer');
      if(_hp!==_renderHash.prayer){
        _didRebuild=true;
        requestAnimationFrame(function(){
          if(S.tab!=='prayer'||!window.PrayerUI)return;
          PrayerUI.render();_renderHash.prayer=_hp;
        });
      }
      if(PrayerUI.ensureCountdown)PrayerUI.ensureCountdown();
    }
    if(name==='gencine'){
      _loadGencineScripts(function(){var _gh=_tabHash('gencine');if(_gh!==_renderHash.gencine&&S.tab==='gencine'){GencineUI.render();_renderHash.gencine=_gh;}});
    }

    // ── Restore scroll for tabs where content was NOT rebuilt ─────────────────
    // When content is preserved (hash same), scrollTop is already correct since
    // display:none panels keep their scrollTop. When content IS rebuilt (_didRebuild),
    // scroll naturally starts at 0 which is correct for fresh content.
    // Exception: explicitly restore saved positions for tabs with sub-views.
    if(!_didRebuild&&name!=='quran'&&name!=='islamvoice'){
      var _newPanelEl=document.getElementById('panel'+name.charAt(0).toUpperCase()+name.slice(1));
      if(_newPanelEl&&_tabScrollPos[name]){requestAnimationFrame(function(){_newPanelEl.scrollTop=_tabScrollPos[name];});}
    }
  });
};

/* ===== GENCINE SCRIPT LOADER ===== */
// Scripts are loaded immediately at startup (SW-precached, near-instant).
// Loader deduplicates: safe to call multiple times.
var _gencineScriptsLoaded = false;
var _gencineScriptsCbs = [];
var _gencineScriptsLoading = false;
function _loadGencineScripts(cb) {
  if (_gencineScriptsLoaded) { if (cb) cb(); return; }
  if (cb) _gencineScriptsCbs.push(cb);
  if (_gencineScriptsLoading) return;
  _gencineScriptsLoading = true;

  function _ls(src, next) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = next;
    s.onerror = next;
    document.body.appendChild(s);
  }

  function _done() {
    _gencineScriptsLoaded = true;
    _gencineScriptsLoading = false;
    var cbs = _gencineScriptsCbs.splice(0);
    cbs.forEach(function(fn) { try { fn(); } catch(e) {} });
  }

  // Load dua-data.js and smart-dhikr.js in PARALLEL (independent of each other),
  // then load dhikr.js only after both finish (it depends on both)
  var _p1 = false, _p2 = false;
  function _check() { if (_p1 && _p2) _ls('/dhikr/dhikr.js?v=20260531a', _done); }
  _ls('/dhikr/dua-data.js?v=20260326b',  function() { _p1 = true; _check(); });
  _ls('/dhikr/smart-dhikr.js?v=55',      function() { _p2 = true; _check(); });
}

/* ===== TAP GUARD ===== */
// Returns true if the call should be IGNORED (too soon after last call)
var _tapGuardLast={};
function tapGuard(key,ms){
  ms=ms||350;
  var now=Date.now();
  if(_tapGuardLast[key]&&now-_tapGuardLast[key]<ms)return true; // ignored
  _tapGuardLast[key]=now;
  return false; // allowed
}

/* ===== TOAST ===== */
var _toastTimer=null;
var _toastMsg=null;
function toast(msg){
  var el=$('toast');
  clearTimeout(_toastTimer);
  // Same message still visible → silently extend, no re-animation (prevents spam)
  if(msg===_toastMsg&&el.classList.contains('on')){
    _toastTimer=setTimeout(function(){el.classList.remove('on');_toastTimer=null;_toastMsg=null;},2500);
    return;
  }
  _toastMsg=msg;
  el.textContent=msg;
  el.classList.add('on');
  _toastTimer=setTimeout(function(){el.classList.remove('on');_toastTimer=null;_toastMsg=null;},2500);
}
App.toast=toast; // iOS: window.toast is the DOM element — use App.toast in other modules

/* ===== HAPTICS ===== */
// Centralized haptic system. Use H.xxx() for all new code.
//
// iOS native mapping (Capacitor Haptics plugin):
//   selection → UISelectionFeedbackGenerator.selectionChanged() — tightest/subtlest
//   light     → UIImpactFeedbackGenerator(.light)
//   medium    → UIImpactFeedbackGenerator(.medium)
//   heavy     → UIImpactFeedbackGenerator(.heavy)
//   success   → UINotificationFeedbackGenerator(.success)
//   warning   → UINotificationFeedbackGenerator(.warning)
//
// Android web fallback (navigator.vibrate):
//   selection → 8ms  | light → 18ms | medium → 35ms | heavy → 55ms
//   success   → [40,20,40] | warning → [60,30,60]
//
// Spam guard: standard haptics have a 50ms minimum gap.
// Notification haptics (success/warning) always fire but block for 200ms after.
var H=(function(){
  var _last=0;
  var _MIN=50; // ms minimum between standard haptics — prevents spam

  function _std(cap,webMs){
    if(!S.hapticFeedback)return;
    var now=Date.now();
    if(now-_last<_MIN)return;
    _last=now;
    try{
      var Hp=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
      if(Hp)cap(Hp);
      else if(navigator.vibrate)navigator.vibrate([webMs]);
    }catch(e){}
  }
  function _note(type,webPat){
    if(!S.hapticFeedback)return;
    _last=Date.now()+200; // block standard haptics for 200ms after notification
    try{
      var Hp=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
      if(Hp)Hp.notification({type:type});
      else if(navigator.vibrate)navigator.vibrate(webPat);
    }catch(e){}
  }

  return {
    // selection: subtlest tick — stepper adjustments, picker scrubbing, PTR arm
    selection:function(){_std(function(Hp){Hp.selectionChanged();},8);},
    // light: gentle tap — tabs, toggles, back navigation, most UI interactions
    light:    function(){_std(function(Hp){Hp.impact({style:'LIGHT'});},18);},
    // medium: clear feedback — play/pause, bookmark add, PTR commit, opening players
    medium:   function(){_std(function(Hp){Hp.impact({style:'MEDIUM'});},35);},
    // heavy: strong — use sparingly, only for the most intentional gestures
    heavy:    function(){_std(function(Hp){Hp.impact({style:'HEAVY'});},55);},
    // success: achievement/confirmation — goal complete, login, sync success
    success:  function(){_note('SUCCESS',[40,20,40]);},
    // warning: destructive/alert — confirm delete, dangerous actions
    warning:  function(){_note('WARNING',[60,30,60]);}
  };
})();

// Legacy shim — maps old numeric patterns to named semantics.
// All new code should call H.xxx() directly.
function haptic(pattern){
  var dur=pattern&&pattern[0]||20;
  if(dur<=8)H.selection();
  else if(dur<=25)H.light();
  else if(dur<=45)H.medium();
  else H.success();
}

/* ===== DAILY REMINDER ===== */
/* Create the 'reminder' channel on Android (capacitor.config channels[] is iOS-only) */
function _ensureReminderChannel(LN){
  return LN.createChannel({
    id:'reminder',
    name:'Daily Reminder',
    description:'Daily Quran reading and verse reminders',
    importance:4,
    vibration:true,
    lights:true
  }).catch(function(){});
}

/* Rotating motivational messages — keys live in kmr.json / admin-translations */
var REMINDER_MSGS_COUNT=14;
function _getReminderMsg(dayOfYear){
  var idx=dayOfYear%REMINDER_MSGS_COUNT;
  return t('notif.reminder_msg_'+idx)||t('notif.reminder_body')||'قورئانێ بخوێنە 📖';
}

function scheduleReminder(enabled){
  if(!window.Capacitor||!window.Capacitor.Plugins||!window.Capacitor.Plugins.LocalNotifications)return;
  var LN=window.Capacitor.Plugins.LocalNotifications;
  // Cancel old single-slot (ID:1) and 7-day slots (IDs 10-16)
  LN.cancel({notifications:[1,10,11,12,13,14,15,16].map(function(id){return{id:id};})}).catch(function(){});
  if(!enabled)return;
  var now=new Date();
  var notifications=[];
  // iOS 64-notification cap: keep to 3 days to leave room for athan+prayer-reminder slots
  var _isIOS=window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios';
  var _remDays=_isIOS?3:7;
  for(var d=0;d<_remDays;d++){
    var dayBase=new Date(now.getFullYear(),now.getMonth(),now.getDate()+d);
    var seed=_getDayOfYear(dayBase)*31+7;
    var h=7+(seed%13);var m=(seed*17)%60;
    var schedDate=new Date(dayBase.getFullYear(),dayBase.getMonth(),dayBase.getDate(),h,m,0,0);
    if(d===0&&schedDate<=now){schedDate.setDate(schedDate.getDate()+1);}
    if(d===0&&schedDate<=now)continue;
    var msg=_getReminderMsg(_getDayOfYear(schedDate));
    notifications.push({
      id:10+d,
      title:'TafsirKurd',
      body:msg,
      schedule:{at:schedDate,allowWhileIdle:true},
      smallIcon:'ic_notification',
      channelId:'reminder'
    });
  }
  LN.requestPermissions().then(function(){
    _ensureReminderChannel(LN).then(function(){
      LN.schedule({notifications:notifications}).catch(function(e){console.error('scheduleReminder error:',e);});
    });
  }).catch(function(){});
}

/* ===== DAILY VERSE NOTIFICATION ===== */
/* Curated list of powerful ayahs */
var DAILY_VERSE_LIST=[
  /* Al-Fatiha */
  {s:1,a:1},{s:1,a:2},{s:1,a:5},{s:1,a:6},{s:1,a:7},
  /* Al-Baqarah — famous & short */
  {s:2,a:45},{s:2,a:152},{s:2,a:153},{s:2,a:155},{s:2,a:177},{s:2,a:186},
  {s:2,a:255},{s:2,a:256},{s:2,a:257},{s:2,a:261},{s:2,a:269},{s:2,a:285},{s:2,a:286},
  /* Al-Imran */
  {s:3,a:8},{s:3,a:18},{s:3,a:26},{s:3,a:31},{s:3,a:103},{s:3,a:133},{s:3,a:139},{s:3,a:160},{s:3,a:173},{s:3,a:200},
  /* An-Nisa */
  {s:4,a:36},{s:4,a:103},{s:4,a:147},
  /* Al-Anam */
  {s:6,a:54},{s:6,a:162},
  /* Al-Araf */
  {s:7,a:23},{s:7,a:55},{s:7,a:56},{s:7,a:180},
  /* Al-Anfal */
  {s:8,a:2},{s:8,a:45},
  /* At-Tawbah */
  {s:9,a:40},{s:9,a:51},{s:9,a:128},{s:9,a:129},
  /* Yunus */
  {s:10,a:62},{s:10,a:107},
  /* Hud */
  {s:11,a:88},{s:11,a:123},
  /* Yusuf */
  {s:12,a:53},{s:12,a:64},{s:12,a:87},
  /* Ar-Rad */
  {s:13,a:28},
  /* Ibrahim */
  {s:14,a:7},{s:14,a:40},{s:14,a:41},
  /* Al-Hijr */
  {s:15,a:9},
  /* An-Nahl */
  {s:16,a:97},{s:16,a:98},{s:16,a:128},
  /* Al-Isra */
  {s:17,a:23},{s:17,a:44},{s:17,a:80},
  /* Al-Kahf */
  {s:18,a:10},{s:18,a:28},{s:18,a:30},{s:18,a:46},
  /* Ta-Ha */
  {s:20,a:8},{s:20,a:25},{s:20,a:114},{s:20,a:132},
  /* Al-Anbiya */
  {s:21,a:87},{s:21,a:107},
  /* Al-Hajj */
  {s:22,a:77},
  /* Al-Muminun */
  {s:23,a:1},{s:23,a:97},{s:23,a:115},{s:23,a:118},
  /* An-Nur */
  {s:24,a:35},
  /* Al-Furqan */
  {s:25,a:63},{s:25,a:70},
  /* An-Naml */
  {s:27,a:19},{s:27,a:62},
  /* Al-Qasas */
  {s:28,a:24},{s:28,a:88},
  /* Al-Ankabut */
  {s:29,a:45},{s:29,a:69},
  /* Ar-Rum */
  {s:30,a:21},
  /* Luqman */
  {s:31,a:17},{s:31,a:22},
  /* As-Sajdah */
  {s:32,a:15},
  /* Al-Ahzab */
  {s:33,a:41},{s:33,a:56},{s:33,a:70},
  /* Fatir */
  {s:35,a:29},
  /* Ya-Sin */
  {s:36,a:36},{s:36,a:58},{s:36,a:82},{s:36,a:83},
  /* Az-Zumar */
  {s:39,a:10},{s:39,a:53},
  /* Ghafir */
  {s:40,a:44},{s:40,a:60},
  /* Ash-Shura */
  {s:42,a:10},{s:42,a:19},
  /* Al-Jathiyah */
  {s:45,a:36},
  /* Muhammad */
  {s:47,a:19},
  /* Al-Fath */
  {s:48,a:29},
  /* Al-Hujurat */
  {s:49,a:13},
  /* Adh-Dhariyat */
  {s:51,a:56},
  /* At-Tur */
  {s:52,a:48},
  /* Ar-Rahman */
  {s:55,a:1},{s:55,a:2},{s:55,a:3},{s:55,a:13},{s:55,a:26},{s:55,a:27},
  /* Al-Waqiah */
  {s:56,a:95},{s:56,a:96},
  /* Al-Hadid */
  {s:57,a:3},{s:57,a:4},
  /* Al-Hashr */
  {s:59,a:22},{s:59,a:23},{s:59,a:24},
  /* As-Saff */
  {s:61,a:13},
  /* Al-Jumuah */
  {s:62,a:10},
  /* At-Taghabun */
  {s:64,a:13},
  /* At-Talaq */
  {s:65,a:2},{s:65,a:3},
  /* At-Tahrim */
  {s:66,a:8},
  /* Al-Mulk */
  {s:67,a:1},{s:67,a:2},{s:67,a:15},
  /* Nuh */
  {s:71,a:10},
  /* Al-Muzzammil */
  {s:73,a:8},
  /* Al-Insan */
  {s:76,a:9},
  /* An-Naba */
  {s:78,a:38},
  /* Al-Buruj */
  {s:85,a:11},{s:85,a:12},
  /* At-Tariq */
  {s:86,a:15},{s:86,a:16},{s:86,a:17},
  /* Al-Ala */
  {s:87,a:14},{s:87,a:15},{s:87,a:16},{s:87,a:17},
  /* Al-Fajr */
  {s:89,a:27},{s:89,a:28},{s:89,a:29},{s:89,a:30},
  /* Ash-Shams */
  {s:91,a:9},{s:91,a:10},
  /* Al-Layl */
  {s:92,a:20},{s:92,a:21},
  /* Ad-Duha */
  {s:93,a:1},{s:93,a:5},{s:93,a:8},{s:93,a:11},
  /* Ash-Sharh */
  {s:94,a:1},{s:94,a:5},{s:94,a:6},{s:94,a:7},{s:94,a:8},
  /* At-Tin */
  {s:95,a:4},{s:95,a:5},{s:95,a:8},
  /* Al-Alaq */
  {s:96,a:1},{s:96,a:2},{s:96,a:3},
  /* Al-Qadr */
  {s:97,a:1},{s:97,a:3},{s:97,a:4},{s:97,a:5},
  /* Az-Zalzalah */
  {s:99,a:7},{s:99,a:8},
  /* Al-Adiyat */
  {s:100,a:6},{s:100,a:7},{s:100,a:8},
  /* At-Takathur */
  {s:102,a:1},{s:102,a:2},
  /* Al-Asr */
  {s:103,a:1},{s:103,a:2},{s:103,a:3},
  /* Al-Humazah */
  {s:104,a:1},{s:104,a:2},
  /* Quraysh */
  {s:106,a:1},{s:106,a:2},{s:106,a:3},{s:106,a:4},
  /* Al-Maun */
  {s:107,a:1},{s:107,a:2},
  /* Al-Kawthar */
  {s:108,a:1},{s:108,a:2},{s:108,a:3},
  /* Al-Kafirun */
  {s:109,a:1},{s:109,a:6},
  /* An-Nasr */
  {s:110,a:1},{s:110,a:2},{s:110,a:3},
  /* Al-Ikhlas */
  {s:112,a:1},{s:112,a:2},{s:112,a:3},{s:112,a:4},
  /* Al-Falaq */
  {s:113,a:1},{s:113,a:2},
  /* An-Nas */
  {s:114,a:1},{s:114,a:2},{s:114,a:3}
];

function _getDayOfYear(d){
  return Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);
}

function scheduleDailyVerse(enabled){
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  var LN=Capacitor.Plugins.LocalNotifications;
  /* Cancel IDs 20-26 */
  LN.cancel({notifications:[20,21,22,23,24,25,26].map(function(id){return {id:id};})}).catch(function(){});
  if(!enabled)return;

  /* Wait until Quran + tafsir data is loaded */
  if(!S.quranData||!S.tafsirData){
    setTimeout(function(){scheduleDailyVerse(S.dailyVerse);},1200);
    return;
  }

  var now=new Date();
  var notifications=[];
  var _isIOSv=window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios';
  var _verseDays=_isIOSv?3:7;
  for(var d=0;d<_verseDays;d++){
    var dayBase=new Date(now.getFullYear(),now.getMonth(),now.getDate()+d);
    var seed=_getDayOfYear(dayBase)*31+43;
    var h=8+(seed%12);var m=(seed*19)%60;
    var schedDate=new Date(dayBase.getFullYear(),dayBase.getMonth(),dayBase.getDate(),h,m,0,0);
    if(d===0&&schedDate<=now){schedDate.setDate(schedDate.getDate()+1);}
    if(d===0&&schedDate<=now)continue;
    // Find a short powerful ayah for this day (skip long ones)
    var baseIdx=_getDayOfYear(schedDate)%DAILY_VERSE_LIST.length;
    var v=null;
    for(var tryI=0;tryI<DAILY_VERSE_LIST.length;tryI++){
      var candidate=DAILY_VERSE_LIST[(baseIdx+tryI)%DAILY_VERSE_LIST.length];
      try{
        var csd=S.quranData[String(candidate.s)];
        var cvv=csd.verses||csd;
        var cvObj=cvv[candidate.a-1];
        var cAr=String(cvObj.text||cvObj||'');
        if(cAr.length<=150){v=candidate;break;}
      }catch(e){}
    }
    if(!v)v=DAILY_VERSE_LIST[baseIdx];
    var arText='',kuText='';
    try{
      var sd=S.quranData[String(v.s)];
      var vv=sd.verses||sd;
      var vObj=vv[v.a-1];
      arText=String(vObj.text||vObj||'');
      var td=S.tafsirData[v.s-1];
      if(td&&td.verses&&td.verses[v.a-1])
        kuText=String(td.verses[v.a-1].text||td.verses[v.a-1].tafsir||'').substring(0,140);
    }catch(e){}
    var sName=SURAHS[v.s-1];
    var notifTitle=(sName?sName.ar:'')+' \u200f('+v.s+':'+v.a+')';
    var notifBody=kuText?kuText:(arText.substring(0,200));
    notifications.push({
      id:20+d,
      title:notifTitle,
      body:notifBody,
      extra:{type:'verse',s:v.s,a:v.a},
      schedule:{at:schedDate,allowWhileIdle:true},
      smallIcon:'ic_notification',
      channelId:'reminder'
    });
  }

  LN.requestPermissions().then(function(){
    _ensureReminderChannel(LN).then(function(){
      LN.schedule({notifications:notifications}).catch(function(e){console.error('dailyVerse schedule error:',e);});
      localStorage.setItem('dailyVerseScheduledDate',new Date().toDateString());
    });
  }).catch(function(){});
}

/* Show a one-time battery-optimization guidance dialog on Android */
window._showNotifSetupHint=function _showNotifSetupHint(force){
  if(!window.Capacitor)return;
  if(window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')return;
  if(!force&&localStorage.getItem('notifHintShown'))return;
  localStorage.setItem('notifHintShown','1');
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:0 0 var(--safe-b,20px)';
  var card=document.createElement('div');
  card.style.cssText='width:100%;max-width:480px;background:var(--surface,#fff);border-radius:20px 20px 0 0;padding:24px 20px 20px;text-align:center';
  var title=document.createElement('div');
  title.style.cssText='font-size:1.05rem;font-weight:700;margin-bottom:10px;color:var(--text,#000)';
  title.textContent=t('notif.setup_title')||'ئاگادارکرنەکان ڕێکبخە ✓';
  var msg=document.createElement('div');
  msg.style.cssText='font-size:.87rem;color:var(--text2,#666);line-height:1.9;direction:rtl;margin-bottom:18px;white-space:pre-line;text-align:right';
  msg.textContent=t('notif.setup_body')||
    'بۆ ئەوەی بانگ لە کاتا خۆیدا بێت، ئەم دووان پشتراست بکە:\n\n'+
    '① بیتاقورا: ڕێکخستن ← مەرج ← بیتاقورا ← بێ ئێشکالە\n'+
    '   (Unrestricted Battery Usage)\n\n'+
    '② ئالارم و بیرهاتن: ڕێکخستن ← مەرجا تایبەت ← ئالارم\n'+
    '   (Alarms & Reminders ← فەرمانی ئەپێ بدە)';
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:13px;background:var(--accent,#1f5f4a);color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer';
  btn.textContent=t('notif.setup_ok')||'تێگەیشتم';
  btn.onclick=function(){overlay.remove();};
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
  card.setAttribute('aria-label',title.textContent);
  overlay.addEventListener('keydown',function(e){if(e.key==='Escape')overlay.remove();});
  card.appendChild(title);card.appendChild(msg);card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  setTimeout(function(){btn.focus();},50); // move focus into dialog
};

/* Show battery-optimization guidance — triggered when isIgnoringBatteryOpts() returns false */
window._showBatteryOptWarning=function(){
  if(!window.Capacitor)return;
  if(window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')return;
  var _warnedAt=parseInt(localStorage.getItem('batteryOptWarnedAt')||'0');
  if(Date.now()-_warnedAt<7*24*60*60*1000)return; // shown within last 7 days
  localStorage.setItem('batteryOptWarnedAt',String(Date.now()));
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9002;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:0 0 var(--safe-b,20px)';
  var card=document.createElement('div');
  card.style.cssText='width:100%;max-width:480px;background:var(--surface,#fff);border-radius:20px 20px 0 0;padding:24px 20px 20px;text-align:center';
  var icon=document.createElement('div');
  icon.style.cssText='font-size:2rem;margin-bottom:8px';
  icon.textContent='🔋';
  var title=document.createElement('div');
  title.style.cssText='font-size:1.05rem;font-weight:700;margin-bottom:10px;color:var(--text,#000)';
  title.textContent='بانگ ڕاستەوخۆ بێت';
  var msg=document.createElement('div');
  msg.style.cssText='font-size:.87rem;color:var(--text2,#666);line-height:1.9;direction:rtl;margin-bottom:18px;white-space:pre-line;text-align:right';
  msg.textContent=
    'بۆ ئەوەی بانگ لە کاتا دروستدا بێت، ئەپ دەبێت لە کۆنترولی بیتاقورادا بێ ئێشکالە بێت.\n\n'+
    'دوگمەی خوارەوە بکە و "بێ ئێشکالە" (Unrestricted) هەڵبژێرە.';
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:13px;background:var(--accent,#1f5f4a);color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer';
  btn.textContent='کردنەوەی ڕێکخستن';
  btn.onclick=function(){
    overlay.remove();
    var _AA=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.AthanAlarm;
    if(_AA&&_AA.openBatteryOptSettings)_AA.openBatteryOptSettings().catch(function(){});
  };
  var dismissBtn=document.createElement('button');
  dismissBtn.style.cssText='width:100%;padding:10px;background:none;border:none;color:var(--text3,#999);font-size:.85rem;cursor:pointer;margin-top:6px';
  dismissBtn.textContent='دواتر';
  dismissBtn.onclick=function(){overlay.remove();};
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
  card.setAttribute('aria-label',title.textContent);
  overlay.addEventListener('keydown',function(e){if(e.key==='Escape')overlay.remove();});
  card.appendChild(icon);card.appendChild(title);card.appendChild(msg);
  card.appendChild(btn);card.appendChild(dismissBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  setTimeout(function(){btn.focus();},50);
};

/* Show exact-alarm-revoked warning — triggered when OS verification finds 0 pending after schedule */
window._showAthanAlarmPermWarning=function(){
  if(!window.Capacitor)return;
  if(window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')return;
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9001;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:0 0 var(--safe-b,20px)';
  var card=document.createElement('div');
  card.style.cssText='width:100%;max-width:480px;background:var(--surface,#fff);border-radius:20px 20px 0 0;padding:24px 20px 20px;text-align:center';
  // Warning icon row
  var icon=document.createElement('div');
  icon.style.cssText='font-size:2rem;margin-bottom:8px';
  icon.textContent='⚠️';
  var title=document.createElement('div');
  title.style.cssText='font-size:1.05rem;font-weight:700;margin-bottom:10px;color:#b45309';
  title.textContent='بانگ نادێت — مەرج هەیە';
  var msg=document.createElement('div');
  msg.style.cssText='font-size:.87rem;color:var(--text2,#666);line-height:1.9;direction:rtl;margin-bottom:18px;white-space:pre-line;text-align:right';
  msg.textContent=
    'مەرجا "ئالارم و بیرهاتن" هاتیە لەناوبردن.\n\n'+
    'بۆ چارەسەرکرنێ:\n'+
    'ڕێکخستن ← مەرجا تایبەت ← ئالارم و بیرهاتن\n'+
    '(Alarms & Reminders) ← ئەپێ TafsirKurd فەرمان بکە';
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:13px;background:#b45309;color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer';
  btn.textContent='هەرە ڕێکخستن';
  btn.onclick=function(){
    overlay.remove();
    // Open exact-alarm settings screen directly via native bridge
    if(window._openExactAlarmSettings){
      window._openExactAlarmSettings();
    }
  };
  var dismissBtn=document.createElement('button');
  dismissBtn.style.cssText='width:100%;padding:10px;background:none;border:none;color:var(--text3,#999);font-size:.85rem;cursor:pointer;margin-top:6px';
  dismissBtn.textContent='دواتر';
  dismissBtn.onclick=function(){overlay.remove();};
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
  card.setAttribute('aria-label',title.textContent);
  overlay.addEventListener('keydown',function(e){if(e.key==='Escape')overlay.remove();});
  card.appendChild(icon);card.appendChild(title);card.appendChild(msg);
  card.appendChild(btn);card.appendChild(dismissBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  setTimeout(function(){btn.focus();},50);
};

function initDailyVerse(){
  if(!S.dailyVerse)return;
  var last=localStorage.getItem('dailyVerseScheduledDate');
  if(last===new Date().toDateString())return; /* already scheduled today */
  scheduleDailyVerse(true);
}

/* ===== STREAK REMINDER NOTIFICATION ===== */
/* ID 30 — fires at 9pm if user has a streak but hasn't read today */
function scheduleStreakReminder(){
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  var LN=Capacitor.Plugins.LocalNotifications;
  LN.cancel({notifications:[{id:30}]}).catch(function(){});
  var log=getReadLog();
  var today=new Date();
  var todayK=dateKey(today);
  var streak=calcStreak(log);
  // Only schedule if user has a streak and hasn't read today
  if(streak<1||log[todayK])return;
  // Schedule for 9pm today (if still in future), else skip
  var at=new Date(today.getFullYear(),today.getMonth(),today.getDate(),21,0,0,0);
  if(at<=today)return;
  LN.requestPermissions().then(function(){
    _ensureReminderChannel(LN).then(function(){
      LN.schedule({notifications:[{
        id:30,
        title:t('notif.streak_title')||'ڕیزا ڕۆژانت لێ دەچێت! 🔥',
        body:t('notif.streak_body',{days:String(streak)})||('ئەڤرۆ '+streak+' ڕۆژ ل ڕێکێدایت. مەبەست بکە!'),
        schedule:{at:at,allowWhileIdle:true},
        smallIcon:'ic_notification',
        channelId:'reminder',
        extra:{type:'streak'}
      }]}).catch(function(){});
    });
  }).catch(function(){});
}

/* ===== PUSH TAP LISTENER — registered immediately on startup ===== */
/* Must not wait 3s — cold-start buffered events are delivered to the
   first listener registered, so we register it right away. */
var _pendingPushDeepLink=null; // set by tap listener, consumed after splash

function _initPushTapListener(){
  var PP=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PushNotifications;
  if(!PP){return;}
  PP.addListener('pushNotificationActionPerformed',function(action){
    var data=(action.notification&&action.notification.data)||{};
    var type=data.type||'';
    var id=data.id||'';
    console.log('[Push] tap type='+type+' id='+id);
    // Store pending link — execute after splash so app is fully visible
    _pendingPushDeepLink={type:type,id:id};
    // Also try immediately in case app is already past splash (background state)
    _handlePushDeepLink(type,id);
  });
}

/* ===== PUSH NOTIFICATION DEEP LINK HANDLER ===== */
/* Polls until the app is fully ready, then navigates.
   Handles cold starts (app killed) where data isn't loaded yet. */
function _handlePushDeepLink(type,id){
  var tries=0;
  var MAX=60; // 60 × 200ms = 12 seconds max wait

  function ready(){
    // App core must exist and tabs must be rendered
    if(typeof App==='undefined'||typeof App.tab!=='function'||typeof App.openSurah!=='function')return false;
    // For islamvoice: episode list must exist
    if(type==='islamvoice_episodes'||type==='video')return !!(S.ivEpisodes&&S.ivEpisodes.length);
    // For gencine: GencineUI must exist
    if(type==='gencine_books'||type==='gencine')return !!(window.GencineUI);
    // verse, prayer, update, default — just need App to exist
    return true;
  }

  function attempt(){
    if(!ready()&&tries++<MAX){setTimeout(attempt,200);return;}
    console.log('[Push] navigating type='+type+' id='+id+' tries='+tries);

    if(type==='verse'&&id){
      var parts=id.split(':');
      var s=+parts[0],a=+parts[1];
      App.tab('quran');
      setTimeout(function(){App.openSurah(s,a);},300);

    }else if(type==='islamvoice_episodes'||type==='video'){
      App.tab('islamvoice');
      if(id){
        var _ivT=0;
        var _ivOpen=function(){
          if(S.ivEpisodes&&S.ivEpisodes.length){
            var ep=S.ivEpisodes.find(function(e){return String(e.id)===String(id);});
            if(ep){App.ivShowSeries(ep.series_id);setTimeout(function(){App.ivPlay(ep.id);},200);}
          }else if(_ivT++<20)setTimeout(_ivOpen,300);
        };
        setTimeout(_ivOpen,300);
      }

    }else if(type==='gencine_books'||type==='gencine'){
      App.tab('gencine');
      if(id){
        var _bkT=0;
        var _bkOpen=function(){
          if(window.GencineUI&&GencineUI.openBook(id))return;
          if(_bkT++<20)setTimeout(_bkOpen,300);
        };
        setTimeout(_bkOpen,300);
      }

    }else if(type==='prayer'){
      App.tab('prayer');

    }else if(type==='update'){
      if(window.ForceUpdate)window.ForceUpdate.openStore();

    }else{
      App.tab('quran');
    }
  }

  // Small initial delay so the event doesn't fire before any tab exists
  setTimeout(attempt,300);
}
// Expose globally so SW NOTIF_TAP message handler (in index.html) and cold-start
// ?notif= param handler can call it after the IIFE has executed.
window._handlePushDeepLink = _handlePushDeepLink;

/* ===== REMOTE PUSH TOKEN REGISTRATION ===== */
/* Registers device with FCM (Android) or APNs via Firebase (iOS).
   Token is stored in Supabase push_tokens table.
   Requires:
     - @capacitor/push-notifications installed (package.json)
     - google-services.json at android/app/google-services.json
     - GoogleService-Info.plist at ios/App/App/GoogleService-Info.plist
     - Push Notifications capability enabled in Xcode for the App target
*/
function _pushLog(msg){
  try{
    var logs=JSON.parse(localStorage.getItem('push_debug')||'[]');
    logs.push(new Date().toISOString().slice(11,19)+' '+msg);
    if(logs.length>30)logs=logs.slice(-30);
    localStorage.setItem('push_debug',JSON.stringify(logs));
  }catch(e){}
  console.log('[Push] '+msg);
}

function _reportAppVersion(){
  try {
    if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.App)return;
    var platform=Capacitor.getPlatform?Capacitor.getPlatform():'web';
    if(platform==='web')return;
    Capacitor.Plugins.App.getInfo().then(function(info){
      if(!info||!info.build)return;
      var lsKey='ark_'+platform+'_'+info.build;
      if(localStorage.getItem(lsKey))return;
      fetch('https://tafsirkurd.com/app-version-report',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({platform:platform,build_number:String(info.build),app_version:info.version||null}),
        keepalive:true,
      }).then(function(r){if(r.ok)localStorage.setItem(lsKey,'1');}).catch(function(){});
    }).catch(function(){});
  }catch(e){}
}

function initPushToken(){
  var PP=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PushNotifications;
  if(!PP){_pushLog('plugin not available');return;}

  PP.requestPermissions().then(function(perm){
    _pushLog('requestPermissions result: '+perm.receive);
    if(perm.receive!=='granted'){return;}

    // Handle incoming push while app is in foreground
    PP.addListener('pushNotificationReceived',function(notif){
      console.log('[Push] received foreground notif: '+notif.title);
      var LN=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications;
      if(LN){
        LN.schedule({notifications:[{
          id:Math.floor(Math.random()*100000)+1000,
          title:notif.title||'',
          body:notif.body||'',
          schedule:{at:new Date(Date.now()+200),allowWhileIdle:true},
          smallIcon:'ic_notification',
          channelId:'reminder',
          extra:notif.data||{}
        }]}).catch(function(){});
      }
    });

    // Receive APNs/FCM token and store in DB via server endpoint (bypasses RLS).
    // Uses retry-with-backoff so a failed first attempt (common on slow networks
    // at first launch) doesn't permanently lose the token for the session.
    PP.addListener('registration',function(tokenData){
      var platform=window.Capacitor.getPlatform()||'unknown';
      var token=tokenData.value||'';
      _pushLog('registration event fired platform='+platform+' tokenLen='+token.length);
      localStorage.setItem('push_token_preview',token.slice(0,20)+'…');
      localStorage.setItem('push_token_platform',platform);
      if(!token){_pushLog('ERROR: empty token');return;}
      // Persist for cross-session retry (cleared on success)
      try{localStorage.setItem('push_token_pending',JSON.stringify({token:token,platform:platform}));}catch(e){}
      _registerPushToken(token,platform,0);
    });

    PP.addListener('registrationError',function(err){
      _pushLog('registrationError: '+(err&&err.error));
      localStorage.setItem('push_reg_error',err&&err.error);
    });

    _pushLog('calling PP.register()');
    PP.register();
  }).catch(function(e){
    _pushLog('requestPermissions EXCEPTION: '+(e&&e.message));
  });
}

// Retry-with-backoff push token registration.
// attempt 0 = immediate; 1 = 4s; 2 = 8s; 3 = 16s; 4 = 32s (cap).
// On cross-session retry (app re-opened before success), attempt starts at 1.
function _registerPushToken(token,platform,attempt){
  var delay=attempt===0?0:Math.min(4000*Math.pow(2,attempt-1),32000);
  setTimeout(function(){
    var ctrl=new AbortController();
    var tid=setTimeout(function(){ctrl.abort();},10000);
    fetch('https://tafsirkurd.com/register-push-token',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:token,platform:platform,user_id:(S.user&&S.user.id)||null}),
      signal:ctrl.signal
    }).then(function(r){clearTimeout(tid);return r.json();}).then(function(res){
      if(res.error){
        _pushLog('register FAILED (attempt '+attempt+'): '+res.error);
        localStorage.setItem('push_reg_api_error',res.error);
        if(attempt<4)_registerPushToken(token,platform,attempt+1);
      }else{
        _pushLog('token stored OK attempt='+attempt);
        localStorage.removeItem('push_reg_api_error');
        localStorage.removeItem('push_token_pending');
      }
    }).catch(function(e){
      clearTimeout(tid);
      _pushLog('register EXCEPTION (attempt '+attempt+'): '+(e&&e.message));
      if(attempt<4)_registerPushToken(token,platform,attempt+1);
    });
  },delay);
}

/* ===== NEW VIDEO NOTIFICATION ===== */
/* Check on app open if new IslamVoice video was added since last check. ID 31 */
function checkNewVideoNotif(){
  if(localStorage.getItem('appNotifEnabled')==='false')return;
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  if(!S.supabase)return;
  var now=new Date().toISOString();
  // First-ever launch: seed with now and skip so we never notify for pre-existing episodes
  if(!localStorage.getItem('lastVideoNotifCheck')){
    localStorage.setItem('lastVideoNotifCheck',now);
    return;
  }
  var lastCheck=localStorage.getItem('lastVideoNotifCheck');
  S.supabase.from('islamvoice_episodes').select('id,title,title_ku,created_at').eq('is_published',true).gt('created_at',lastCheck).order('created_at',{ascending:false}).limit(1)
    .then(function(res){
      localStorage.setItem('lastVideoNotifCheck',now);
      if(!res||!res.data||!res.data.length)return;
      var ep=res.data[0];
      var LN=Capacitor.Plugins.LocalNotifications;
      LN.requestPermissions().then(function(perm){
        if(perm.display!=='granted'&&perm.receive!=='granted')return;
        _ensureReminderChannel(LN).then(function(){
          LN.cancel({notifications:[{id:31}]}).catch(function(){});
          LN.schedule({notifications:[{
            id:31,
            title:tSafe('notif.new_video_title')||'ڤیدیۆیەکا نوی 🎬',
            body:(ep.title_ku||ep.title)||tSafe('notif.new_video_body')||'ڤیدیۆیەکا نوی زێدەبوو',
            schedule:{at:new Date(Date.now()+3000),allowWhileIdle:true},
            smallIcon:'ic_notification',
            channelId:'reminder',
            extra:{type:'video',id:ep.id}
          }]}).catch(function(){});
        });
      }).catch(function(){});
    }).catch(function(){});
}

/* ===== NEW BOOK NOTIFICATION ===== */
/* Check on app open if new book added since last check. ID 32 */
function checkNewBookNotif(){
  if(localStorage.getItem('appNotifEnabled')==='false')return;
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  if(!S.supabase)return;
  var now=new Date().toISOString();
  // First-ever launch: no lastCheck saved → seed with now and skip notification
  // so we never fire for books that existed before the user installed the app.
  if(!localStorage.getItem('lastBookNotifCheck')){
    localStorage.setItem('lastBookNotifCheck',now);
    return;
  }
  var lastCheck=localStorage.getItem('lastBookNotifCheck');
  S.supabase.from('gencine_books').select('id,title_ku,title_ar,created_at').eq('active',true).gt('created_at',lastCheck).order('created_at',{ascending:false}).limit(1)
    .then(function(res){
      localStorage.setItem('lastBookNotifCheck',now);
      if(!res||!res.data||!res.data.length)return;
      var book=res.data[0];
      var LN=Capacitor.Plugins.LocalNotifications;
      LN.requestPermissions().then(function(perm){
        if(perm.display!=='granted'&&perm.receive!=='granted')return;
        _ensureReminderChannel(LN).then(function(){
          LN.cancel({notifications:[{id:32}]}).catch(function(){});
          LN.schedule({notifications:[{
            id:32,
            title:tSafe('notif.new_book_title')||'پەرتوکەکا نوی 📖',
            body:(book.title_ku||book.title_ar)||tSafe('notif.new_book_body')||'پەرتوکەکا نوی زێدەبوو',
            schedule:{at:new Date(Date.now()+4000),allowWhileIdle:true},
            smallIcon:'ic_notification',
            channelId:'reminder',
            extra:{type:'book',id:book.id}
          }]}).catch(function(){});
        });
      }).catch(function(){});
    }).catch(function(){});
}

/* ===== SEARCH ===== */
var _searchTimer=null;
/* ─── Search result cache ──────────────────────────────────────── */
var _searchCache=new Map();
var _SEARCH_CACHE_MAX=50;
function _cachePut(k,v){if(_searchCache.size>=_SEARCH_CACHE_MAX){_searchCache.delete(_searchCache.keys().next().value);}_searchCache.set(k,v);}
function _cacheInvalidate(){_searchCache.clear();}

/* ─── Search history ───────────────────────────────────────────── */
var _SEARCH_HIST_KEY='qs_history';
var _SEARCH_HIST_MAX=8;
function _shGet(){try{return JSON.parse(localStorage.getItem(_SEARCH_HIST_KEY)||'[]');}catch(e){return[];}}
function _shAdd(q){
  if(!q||q.length<2)return;
  var h=_shGet().filter(function(x){return x!==q;});
  h.unshift(q);
  try{localStorage.setItem(_SEARCH_HIST_KEY,JSON.stringify(h.slice(0,_SEARCH_HIST_MAX)));}catch(e){}
}
function _shClear(){try{localStorage.removeItem(_SEARCH_HIST_KEY);}catch(e){}}
/* --- Search query context (set in _execSearch, used in _mkSearchItem) --- */
var _lastSearchQ={arN:'',arTokens:[],lo:'',loTokens:[]};

/* Extract a context window of ~radius chars centred on normPos */
function _ctxSnippet(text,normPos,radius){
  if(!text)return'';
  radius=radius||70;
  var len=text.length;
  if(len<=radius*2+20)return text;
  var origPos=normPos>=0?Math.min(Math.round(normPos*1.35),len-1):0;
  var start=Math.max(0,origPos-radius);
  var end=Math.min(len,origPos+radius+20);
  while(start>0&&text[start]!==' ')start--;
  while(end<len&&text[end]!==' ')end++;
  return(start>2?'\u2026':'')+text.slice(start,end).trim()+(end<len-2?'\u2026':'');
}

/* Build DOM nodes with highlighted matched tokens.
 * First token in `tokens` is treated as the full phrase (qArN) and gets
 * search-hl--phrase class for a continuous background; subsequent tokens
 * get the lighter search-hl class. */
function _hlNodes(text,tokens,isAr){
  if(!text)return[document.createTextNode('')];
  var REMOVE_AR=/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/;
  var AR_SUBS={'\u0622':'\u0627','\u0623':'\u0627','\u0625':'\u0627','\u0671':'\u0627',
               '\u0649':'\u064A','\u0624':'\u0648','\u0626':'\u064A','\u0629':'\u0647'};
  var norm='',toOrig=[];
  if(isAr){
    for(var i=0;i<text.length;i++){
      var c=text[i];
      if(REMOVE_AR.test(c))continue;
      norm+=(AR_SUBS[c]||c);toOrig.push(i);
    }
  }else{
    for(var i2=0;i2<text.length;i2++){norm+=text[i2].toLowerCase();toOrig.push(i2);}
  }
  var valid=tokens?tokens.filter(function(t){return t&&t.length>=2;}):[];
  if(!valid.length)return[document.createTextNode(text)];
  // ranges: [origStart, origEnd, isPhrase(0|1)]
  var ranges=[];
  for(var t=0;t<valid.length;t++){
    var tok=valid[t],pos=0;
    var isPhraseTok=(t===0&&tok.length>=5); // first token = full normalized phrase
    while(pos<norm.length){
      var idx=norm.indexOf(tok,pos);
      if(idx===-1)break;
      var nEnd=Math.min(idx+tok.length-1,toOrig.length-1);
      if(toOrig[idx]!==undefined&&toOrig[nEnd]!==undefined){
        var oS=toOrig[idx],oE=toOrig[nEnd]+1;
        if(isAr){
          while(oE<text.length&&REMOVE_AR.test(text[oE]))oE++;
          // expand to full word so Arabic letter-joining is never broken at element boundaries
          while(oS>0&&text[oS-1]!==' '&&text[oS-1]!=='\n'&&text[oS-1]!=='،'&&text[oS-1]!=='۔')oS--;
          while(oE<text.length&&text[oE]!==' '&&text[oE]!=='\n'&&text[oE]!=='،'&&text[oE]!=='۔')oE++;
        }
        if(oS<oE)ranges.push([oS,oE,isPhraseTok?1:0]);
      }
      pos=idx+1;
    }
  }
  if(!ranges.length)return[document.createTextNode(text)];
  ranges.sort(function(a,b){return a[0]-b[0];});
  // Merge overlapping ranges; propagate phrase flag through merge
  var merged=[[ranges[0][0],ranges[0][1],ranges[0][2]]];
  for(var r=1;r<ranges.length;r++){
    var last=merged[merged.length-1];
    if(ranges[r][0]<last[1]){
      if(ranges[r][1]>last[1])last[1]=ranges[r][1];
      if(ranges[r][2])last[2]=1; // phrase flag wins
    }else{
      merged.push([ranges[r][0],ranges[r][1],ranges[r][2]]);
    }
  }
  var nodes=[],prev=0;
  for(var m=0;m<merged.length;m++){
    var ms=merged[m][0],me=merged[m][1],ph=merged[m][2];
    if(ms>prev)nodes.push(document.createTextNode(text.slice(prev,ms)));
    var mark=document.createElement('mark');
    mark.className=ph?'search-hl search-hl--phrase':'search-hl';
    mark.textContent=text.slice(ms,me);
    nodes.push(mark);
    prev=me;
  }
  if(prev<text.length)nodes.push(document.createTextNode(text.slice(prev)));
  return nodes;
}

/* Append match-source pills to a result card */
function _appendSrcPills(item,srcs){
  if(!srcs||!srcs.length)return;
  var LABELS={arabic:'Arabic',translation:'\u0648\u06d5\u0631\u06af\u06ce\u0695\u0627\u0646',tafsir:'\u062a\u06d5\u0641\u0633\u06cc\u0631',semantic:'\u0645\u0627\u0646\u0627',surah:'\u0633\u0648\u0648\u0631\u06d5',ref:'\u0626\u0627\u06cc\u06d5\u062a'};
  var pills=document.createElement('div');
  pills.className='search-src-pills';
  srcs.forEach(function(src){
    if(!LABELS[src])return;
    var pill=document.createElement('span');
    pill.className='search-src-pill search-src-pill--'+src;
    pill.textContent=LABELS[src];
    pills.appendChild(pill);
  });
  item.appendChild(pills);
}



App.toggleSearch=function(){
  var bar=$('searchBar');
  bar.classList.toggle('on');
  if(bar.classList.contains('on')){
    var inp=$('searchInput');
    inp.focus();
    // Restore last session query if input is empty
    var lastQ='';try{lastQ=sessionStorage.getItem('qs_last')||'';}catch(e){}
    if(lastQ&&!inp.value){
      inp.value=lastQ;
      App.onSearch(lastQ);
    } else if(!inp.value){
      App._renderSearchHistory();
    }
    // Close when tapping outside the search bar
    setTimeout(function(){
      function _outsideClose(e){
        if(!bar.contains(e.target)){
          document.removeEventListener('pointerdown',_outsideClose,true);
          if(bar.classList.contains('on'))App.toggleSearch();
        }
      }
      document.addEventListener('pointerdown',_outsideClose,true);
    },0);
  } else {
    App.clearSearch();
  }
};

App.clearSearch=function(){
  clearTimeout(_searchTimer);_searchTimer=null;
  $('searchInput').value='';S.search='';
  $('searchResults').classList.remove('on');
  clear($('searchResults'));
};

App._renderSearchEmpty=function(){
  var res=$('searchResults');
  clear(res);
  var wrap=document.createElement('div');
  wrap.className='search-empty';
  var ic=document.createElement('i');
  ic.className='fas fa-magnifying-glass';
  ic.setAttribute('aria-hidden','true');
  wrap.appendChild(ic);
  wrap.appendChild(el('div','search-empty-hint',t('search.placeholder')));
  res.appendChild(wrap);
  res.classList.add('on');
};

/* Suggestions disabled — search only */
App._renderSuggestions=function(){
  var old=$('searchResults').querySelector('.search-suggestions');
  if(old)old.remove();
};

/* ===== SEARCH HISTORY ===== */
var _SH_KEY='search_history',_SH_MAX=10;
function _getSearchHistory(){try{return JSON.parse(localStorage.getItem(_SH_KEY))||[];}catch(e){return[];}}
function _saveSearchQuery(q){
  q=q.trim();if(!q||q.length<2)return;
  var h=_getSearchHistory().filter(function(x){return x!==q;});
  h.unshift(q);if(h.length>_SH_MAX)h=h.slice(0,_SH_MAX);
  try{localStorage.setItem(_SH_KEY,JSON.stringify(h));}catch(e){}
}
function _deleteSearchHistoryItem(q){
  var h=_getSearchHistory().filter(function(x){return x!==q;});
  try{localStorage.setItem(_SH_KEY,JSON.stringify(h));}catch(e){}
}
App._renderSearchHistory=function(){
  var h=_getSearchHistory();
  if(!h.length){App._renderSearchEmpty();return;}
  var res=$('searchResults');
  clear(res);
  var wrap=el('div','search-history');
  var hdr=el('div','sh-hdr');
  hdr.appendChild(el('span','sh-title',t('search.history_title')));
  var ca=el('button','sh-clear-all',t('search.history_clear'));
  ca.onclick=function(){try{localStorage.removeItem(_SH_KEY);}catch(e){}App._renderSearchEmpty();};
  hdr.appendChild(ca);
  wrap.appendChild(hdr);
  h.forEach(function(q){
    var item=el('div','sh-item');
    var left=el('div','sh-left');
    var ic=document.createElement('i');ic.className='fas fa-clock-rotate-left';ic.setAttribute('aria-hidden','true');
    left.appendChild(ic);
    left.appendChild(el('span','sh-text',q));
    left.onclick=function(){$('searchInput').value=q;App.onSearch(q);};
    item.appendChild(left);
    var del=document.createElement('button');del.className='sh-del';del.setAttribute('aria-label','Remove');
    var di=document.createElement('i');di.className='fas fa-times';del.appendChild(di);
    del.onclick=function(e){e.stopPropagation();_deleteSearchHistoryItem(q);item.remove();if(!$('searchResults').querySelector('.sh-item'))App._renderSearchEmpty();};
    item.appendChild(del);
    wrap.appendChild(item);
  });
  res.appendChild(wrap);res.classList.add('on');
};

/* Debounced entry point — called on every keystroke */
App.onSearch=function(v){
  clearTimeout(_searchTimer);
  if(!v.trim()){App._renderSearchHistory();return;}
  // Show live phrase suggestions immediately (no debounce)
  App._renderSuggestions(v);
  // Instant render for cached queries (no debounce needed)
  if(_searchCache.has(v.trim())){App._execSearch(v);return;}
  _searchTimer=setTimeout(function(){App._execSearch(v);},90);
};

/* Actual search execution after debounce */
App._execSearch=function(v){
  var q=v.trim();
  // Strip quote wrappers for display-side normalization (search.js handles them too)
  var isExactMode=(q.length>2&&((q[0]==='"'&&q[q.length-1]==='"')||(q[0]==='«'&&q[q.length-1]==='»')));
  S.search=q;
  var res=$('searchResults');
  if(!q){App._renderSearchEmpty();return;}

  // Quran data not loaded yet — show retry prompt instead of silently doing nothing
  if(!S.quranData){
    clear(res);res.classList.add('on');
    var _sd=el('div','search-unavailable');
    _sd.innerHTML='<i class="fas fa-wifi-slash"></i><p>'+t('search.unavailable','گەڕان بەردەست نییە')+'</p>';
    var _srb=el('button','search-retry-btn',t('search.retry','دووبارە هەوڵبدە'));
    _srb.onclick=function(){loadQuranData().then(function(){App._execSearch(v);});};
    _sd.appendChild(_srb);res.appendChild(_sd);
    return;
  }

  // Build normalized query tokens for context highlighting
  var _qArN=q.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g,'')
             .replace(/[\u0622\u0623\u0625\u0671]/g,'\u0627')
             .replace(/\u0649/g,'\u064A').replace(/\u0624/g,'\u0648')
             .replace(/\u0626/g,'\u064A').replace(/\u0629/g,'\u0647')
             .replace(/\u0648\u0627(\s|$)/g,'\u0648$1').replace(/\u0647\u0627(\s|$)/g,'\u0647$1') // typo fix
             .replace(/\s+/g,' ').trim();
  var _qLo=q.toLowerCase().trim();
  _lastSearchQ={
    arN:_qArN,
    arTokens:_qArN.split(/\s+/).filter(function(t){return t.length>=2;}),
    lo:_qLo,
    loTokens:_qLo.split(/\s+/).filter(function(t){return t.length>=2;})
  };

  // Serve from cache if available (instant, no recompute)
  var cached=_searchCache.get(q);
  if(cached){
    App._renderSearchResults(q,cached,isExactMode);
    return;
  }

  // Persist last successful query for session continuity + history
  try{sessionStorage.setItem('qs_last',q);}catch(e){}
  _saveSearchQuery(q);

  if(window.QuranSearch&&QuranSearch.isReady()){
    // queryAsync: cb fires immediately with keyword results, then again with
    // semantic-merged results when the CF Worker responds (or not at all on timeout)
    var _semActiveQ=q; // detect if user typed something new before semantic returns
    QuranSearch.queryAsync(q,SURAHS,30,function(results,isFinal){
      // Discard stale callbacks if the user has moved on
      if(S.search!==_semActiveQ) return;
      _cachePut(q,results);
      App._renderSearchResults(q,results,isExactMode);
    });
  } else {
    var results=App._basicSearch(q);
    _cachePut(q,results);
    App._renderSearchResults(q,results,isExactMode);
  }
};

App._renderSearchResults=function(q,results,isExactMode){
  var res=$('searchResults');
  if(!results||!results.length){App._renderSearchNoResults(q);return;}
  // Build fragment before clearing — old results stay visible until new ones are ready
  var frag=document.createDocumentFragment();
  // Exact-mode banner
  if(isExactMode){
    var exactBanner=el('div','search-exact-banner',t('search.exact_mode'));
    frag.appendChild(exactBanner);
  }
  // Ayah-first: when query has 2+ tokens, verses always lead; surah cards follow (max 1)
  var _av=results.filter(function(r){return r.type!=='surah';});
  var _as=results.filter(function(r){return r.type==='surah';});
  var _aq=_lastSearchQ.arTokens.filter(function(t){return t.length>=2;}).length>=2;
  var _ord=(_aq&&_av.length>0)?_av.concat(_as.slice(0,1)):results;
  for(var i=0;i<_ord.length;i++){
    var r=_ord[i];
    frag.appendChild(App._mkSearchItem(r,i===0&&r.type==='verse'));
  }
  clear(res); res.classList.add('on'); res.appendChild(frag); // atomic replace
};

/* No-results state — clean message only */
App._renderSearchNoResults=function(q){
  var res=$('searchResults');
  var wrap=document.createElement('div');
  wrap.className='search-noresult';
  wrap.appendChild(el('div','search-noresult-icon','◌'));
  wrap.appendChild(el('div','search-noresult-msg',t('search.no_results')));
  wrap.appendChild(el('div','search-noresult-sub',t('search.no_results_sub')));
  clear(res); res.appendChild(wrap); res.classList.add('on'); // atomic replace
};

/* Build a single result card — clean minimal layout */
App._mkSearchItem=function(r,isPrimary){
  var cls='search-result search-result--'+r.type+(isPrimary?' search-result--primary':'');
  var item=el('div',cls);
  var qArN=_lastSearchQ.arN,arToks=_lastSearchQ.arTokens;
  var qLo=_lastSearchQ.lo,loToks=_lastSearchQ.loTokens;
  var allAr=qArN?[qArN].concat(arToks).filter(function(t){return t&&t.length>=2;}):arToks;
  var allLo=qLo?[qLo].concat(loToks).filter(function(t){return t&&t.length>=2;}):loToks;

  if(r.type==='ref'){
    var badge=document.createElement('div');
    badge.className='search-ref-badge';
    badge.appendChild(el('span','search-ref-surah',r.surahAr||r.surahEn));
    badge.appendChild(el('span','search-ref-num',r.sn+':'+r.an));
    item.appendChild(badge);
    if(r.arO){
      var arDiv=document.createElement('div');
      arDiv.className='search-result-verse-ar';
      _hlNodes(_ctxSnippet(r.arO,r.posAr,90),allAr,true).forEach(function(n){arDiv.appendChild(n);});
      item.appendChild(arDiv);
    }
    if(r.kuO){
      var kuDiv=document.createElement('div');
      kuDiv.className='search-result-ku';
      _hlNodes(_ctxSnippet(r.kuO,r.posKu,110),allLo,false).forEach(function(n){kuDiv.appendChild(n);});
      item.appendChild(kuDiv);
    }
    on(item,'click',(function(sn,an,q){return function(){
      H.selection();
      if(window.QuranSearch&&QuranSearch.trackTap)QuranSearch.trackTap(sn,an);
      _shAdd(q);
      App.tab('quran');App.clearSearch();$('searchBar').classList.remove('on');
      setTimeout(function(){App.openSurah(sn,an);},100);
    };})(r.sn,r.an,S.search));

  }else if(r.type==='surah'){
    var row=document.createElement('div');
    row.className='search-surah-row';
    row.appendChild(el('div','search-surah-num',String(r.sn)));
    var info=document.createElement('div');
    info.className='search-surah-info';
    info.appendChild(el('div','search-result-title',r.surahEn));
    info.appendChild(el('div','search-result-sub',r.surahAr+' • '+r.ayahCount+' '+t('reader.ayah')));
    row.appendChild(info);
    item.appendChild(row);
    on(item,'click',(function(sn,q){return function(){
      _shAdd(q);
      App.openSurah(sn);App.clearSearch();$('searchBar').classList.remove('on');
    };})(r.sn,S.search));

  }else{
    var arDiv2=document.createElement('div');
    arDiv2.className='search-result-verse-ar';
    _hlNodes(_ctxSnippet(r.arO,r.posAr,90),allAr,true).forEach(function(n){arDiv2.appendChild(n);});
    item.appendChild(arDiv2);
    var metaRow=el('div','search-result-sub');
    metaRow.textContent=(r.surahAr||r.surahEn)+' • '+t('reader.ayah')+' '+r.an;
    item.appendChild(metaRow);
    if(r.kuO){
      var kuDiv2=document.createElement('div');
      kuDiv2.className='search-result-ku';
      _hlNodes(_ctxSnippet(r.kuO,r.posKu,110),allLo,false).forEach(function(n){kuDiv2.appendChild(n);});
      item.appendChild(kuDiv2);
    }
    on(item,'click',(function(sn,an,q){return function(){
      H.selection();
      if(window.QuranSearch&&QuranSearch.trackTap)QuranSearch.trackTap(sn,an);
      _shAdd(q);
      App.tab('quran');App.clearSearch();$('searchBar').classList.remove('on');
      setTimeout(function(){App.openSurah(sn,an);},100);
    };})(r.sn,r.an,S.search));
  }

  return item;
};

/* Lightweight fallback used while QuranSearch index is still building */
App._basicSearch=function(v){
  var q=v.trim().toLowerCase();
  var qD=q.replace(/[\u064B-\u065F\u0670]/g,'');
  var out=[];
  SURAHS.filter(function(s){
    return s.en.toLowerCase().indexOf(q)!==-1||s.ar.indexOf(q)!==-1||String(s.n)===q;
  }).slice(0,4).forEach(function(s){
    out.push({type:'surah',sn:s.n,surahAr:s.ar,surahEn:s.en,ayahCount:s.a,score:800});
  });
  if(q.length>=2&&S.quranData){
    var cnt=0;
    outer:for(var sn=1;sn<=114;sn++){
      var sd=S.quranData[String(sn)];if(!sd)continue;
      var vv=sd.verses||sd;
      var kd=S.tafsirData?(S.tafsirData[sn-1]||{verses:[]}):{verses:[]};
      for(var vi=0;vi<vv.length;vi++){
        var vObj=vv[vi];
        var ar=String(vObj.text||vObj||'').replace(/[\u064B-\u065F\u0670]/g,'');
        var ku=kd.verses&&kd.verses[vi]?String(kd.verses[vi].text||kd.verses[vi].tafsir||''):'';
        if(ar.indexOf(qD)!==-1||ku.toLowerCase().indexOf(q)!==-1){
          var sv=SURAHS[sn-1]||{};
          out.push({type:'verse',sn:sn,an:vi+1,arO:vObj.text||String(vObj),kuO:ku,surahAr:sv.ar||'',surahEn:sv.en||'',score:400});
          if(++cnt>=15)break outer;
        }
      }
    }
  }
  return out;
};

/* ===== SURAH GRID ===== */
var _surahGridReady=false;
var _surahBadgeObs=null; // IntersectionObserver for backdrop-filter-on-visible-badges
function renderSurahGrid(){
  var grid=$('surahGrid');
  var ayahLbl=t('surah.card.ayah_count');
  var frag=document.createDocumentFragment();
  for(var i=0;i<SURAHS.length;i++){
    var s=SURAHS[i];
    var card=document.createElement('div');
    card.className='surah-card';
    card.dataset.n=s.n;
    var imgPanel=document.createElement('div');
    imgPanel.className='surah-img-panel '+(s.t==='Meccan'?'meccan':'maddinah');
    var badge=document.createElement('div');
    badge.className='surah-num-badge';
    badge.textContent=s.n;
    var info=document.createElement('div');
    info.className='surah-info';
    var deco=document.createElement('div');
    deco.className='surah-name-ar no-kurdish-convert';
    var _gc='surah'+String(s.n).padStart(3,'0');
    deco.dataset.glyph=_gc;
    deco.textContent=_surahNameFontReady?_gc:s.ar;
    var nameEn=document.createElement('div');
    nameEn.className='surah-name-en';
    nameEn.textContent=s.en;
    var ayahsEl=document.createElement('div');
    ayahsEl.className='surah-ayahs';
    ayahsEl.textContent=s.a+' '+ayahLbl;
    info.appendChild(deco);info.appendChild(nameEn);info.appendChild(ayahsEl);
    card.appendChild(imgPanel);card.appendChild(badge);card.appendChild(info);
    frag.appendChild(card);
  }
  grid.textContent='';
  grid.appendChild(frag);
  if(!_surahGridReady){
    _surahGridReady=true;
    grid.addEventListener('click',function(e){
      var card=e.target.closest('.surah-card');
      if(card)App.openSurah(+card.dataset.n);
    });
  }
  // Recreate observer when null (happens after leaving Quran tab) then connect to current cards
  if(!_surahBadgeObs){
    _surahBadgeObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var badge=entry.target._badge||(entry.target._badge=entry.target.querySelector('.surah-num-badge'));
        if(!badge)return;
        var bf=entry.isIntersecting?'blur(6px) saturate(140%)':'none';
        badge.style.backdropFilter=bf;
        badge.style.webkitBackdropFilter=bf;
      });
    },{rootMargin:'0px'});
  }
  _surahBadgeObs.disconnect();
  grid.querySelectorAll('.surah-card').forEach(function(card){_surahBadgeObs.observe(card);});
}

/* ===== CONTINUE READING ===== */
function renderContinue(){
  var c=$('continueReading');
  clear(c);
  var last=null;
  try{last=JSON.parse(localStorage.getItem('lastRead'))}catch(e){}
  if(!last)return;
  var s=SURAHS[last.surah-1];
  if(!s)return;
  var card=el('div','continue-card');
  card.style.backgroundImage="url('/assets/icons/"+(s.t==='Meccan'?'Makkah':'Maddinah')+".webp')";
  var _cdec=document.createElement('div');
  _cdec.className='continue-surah-deco no-kurdish-convert';
  var _cglyph='surah'+String(s.n).padStart(3,'0');
  _cdec.dataset.glyph=_cglyph;
  _cdec.textContent=_surahNameFontReady?_cglyph:s.ar;
  var deco=_cdec;
  card.appendChild(deco);
  var info=el('div','continue-info');
  info.appendChild(el('div','continue-label',t('reader.continue')));
  info.appendChild(el('div','continue-title',s.en+' - '+s.ar));
  info.appendChild(el('div','continue-sub',t('reader.ayah')+' '+last.ayah));
  card.appendChild(info);
  on(card,'click',function(){App.openSurah(last.surah,last.ayah)});
  c.appendChild(card);
}

/* ===== OPEN SURAH ===== */
App.openSurah=function(num,scrollTo){
  if(S.surah===num&&$('quranReader').classList.contains('on'))return; // already open
  if(tapGuard('openSurah',300))return; // prevent double-tap race
  var s=SURAHS[num-1]; // bounds-check before any state mutation
  if(!s){console.warn('[openSurah] invalid surah num:',num);return;}
  haptic([8]);
  var _isT=window.innerWidth>=768||document.documentElement.classList.contains('is-ipad');
  // Auto-enable mushaf mode on iPad when no preference saved yet
  if(_isT&&!S.mushafMode&&localStorage.getItem('mushafMode')===null){
    S.mushafMode=true;
    localStorage.setItem('mushafMode','true');
    var _tmb=$('mushafToggleBtn');if(_tmb)_tmb.classList.add('on');
  }
  var _pq=$('panelQuran');
  if(_pq)S._quranListScroll=_isT?($('quranHome')||{scrollTop:0}).scrollTop:_pq.scrollTop;
  _startSession(num);
  S.surah=num;
  $('readerName').textContent=s.en+' - '+s.ar;
  if(!_isT){$('quranHome').style.display='none';}
  $('quranReader').classList.add('on');
  renderAyahs(num,scrollTo);
  try{localStorage.setItem('lastRead',JSON.stringify({surah:num,ayah:scrollTo||1}))}catch(e){}
  prefetchAyahBlob(num,(scrollTo||1)-1);
  var pb=$('mushafPlayBtn');if(pb){pb.style.display='';updateMushafPlayBtn();}
  if(S.mushafMode){
    var btn=$('mushafToggleBtn');if(btn)btn.classList.add('on');
    var al=$('ayahList');if(al)al.style.display='none';
    var mv=$('mushafView');if(mv){mv.style.display='';renderMushafView();}
    if(scrollTo&&scrollTo>1)_scrollMushafToAyah(num,scrollTo,0);
    _preBufferMushafAyah();
  }
};

App.backToList=function(){
  haptic([8]);
  if(S.surah){
    try{localStorage.setItem('surah_scroll_'+S.surah,String($('ayahList').scrollTop))}catch(e){}
  }
  // Clean up mushaf DOM + observer — keep mode preference so next surah reopens in mushaf
  if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
  _mqReset();
  clearMushafHighlights();
  var mv=$('mushafView');if(mv){mv.style.display='none';clear(mv);}
  var al=$('ayahList');if(al)al.style.display='';
  var pb=$('mushafPlayBtn');if(pb)pb.style.display='none';
  if(_progressCleanup){_progressCleanup();_progressCleanup=null;}
  _endSession();
  S.surah=null;
  $('quranReader').classList.remove('on');
  var _isT2=window.innerWidth>=768||document.documentElement.classList.contains('is-ipad');
  if(!_isT2){$('quranHome').style.display='';}
  if(al)al.scrollTop=0;
  if(S._quranListScroll!=null){
    var _scrollEl=_isT2?$('quranHome'):$('panelQuran');
    if(_scrollEl)setTimeout(function(){_scrollEl.scrollTop=S._quranListScroll;S._quranListScroll=null;},0);
  }
  renderContinue();
};

/* ===== MUSHAF MODE ===== */
var _qcfFontInjected={};
var _qcfV2FontInjected={};
var _qcfV4FontInjected={};
// pageNum → Promise<boolean> — deduplicates concurrent font-load waits
var _qcfV4FontLoadP={};
// Concurrency limiter: cap simultaneous QCF4 font fetches to 4 so fast-scroll
// doesn't exhaust the browser's HTTP connection pool (typically 6 per origin).
var _qcfFontActive=0,_qcfFontQueue=[];
function _qcfFontSlot(fn){
  if(_qcfFontActive<4){_qcfFontActive++;return fn().finally(function(){_qcfFontActive--;if(_qcfFontQueue.length)(_qcfFontQueue.shift())();});}
  return new Promise(function(res,rej){_qcfFontQueue.push(function(){_qcfFontActive++;fn().finally(function(){_qcfFontActive--;if(_qcfFontQueue.length)(_qcfFontQueue.shift())();}).then(res,rej);});});
}

// Detect iOS Capacitor once — strip script removes local woff2, so skip local src on iOS
var _isIOSCap=(function(){try{return window.Capacitor&&Capacitor.getPlatform()==='ios';}catch(e){return false;}}());

/* SurahName font readiness — delegates to QuranFontManager (quran-font-manager.js).
   Local flags mirror manager state so render-time isReady checks stay O(1). */
var _surahNameFontReady=false;
var _surahNameV2FontReady=false;
(function(){
  var QFM=window.QuranFontManager;
  if(!QFM)return;
  QFM.onReady('SurahName',function(ok){
    _surahNameFontReady=ok;
    if(ok)QFM.upgradeGlyphElements('.surah-name-ar');
    if(ok)QFM.upgradeGlyphElements('.continue-surah-deco');
  });
  QFM.onReady('SurahNameV2',function(ok){
    _surahNameV2FontReady=ok;
    if(ok)QFM.upgradeGlyphElements('.surah-reader-name');
  });
})();

function toArabicNum(n){return String(n).replace(/\d/g,function(d){return'٠١٢٣٤٥٦٧٨٩'[+d];});}

function injectQCFFont(pageNum){
  if(_qcfFontInjected[pageNum])return;
  _qcfFontInjected[pageNum]=true;
  var pad=String(pageNum).padStart(3,'0');
  var s=document.createElement('style');
  s.textContent="@font-face{font-family:'QCFv1p"+pageNum+"';src:url('https://raw.githubusercontent.com/alquran-foundation/qpc-fonts/master/mushaf-woff2/QCF_P"+pad+".woff2') format('woff2');font-display:block}";
  document.head.appendChild(s);
}
function injectQCFV2Font(pageNum){
  if(_qcfV2FontInjected[pageNum])return;
  _qcfV2FontInjected[pageNum]=true;
  var pad=String(pageNum).padStart(3,'0');
  var s=document.createElement('style');
  s.textContent="@font-face{font-family:'QCFv2p"+pageNum+"';src:url('https://raw.githubusercontent.com/alquran-foundation/qpc-fonts/master/mushaf-v2/QCF2"+pad+".ttf') format('truetype');font-display:block}";
  document.head.appendChild(s);
}
function injectQCFV4Font(pageNum){
  if(_qcfV4FontInjected[pageNum])return;
  _qcfV4FontInjected[pageNum]=true;
  var s=document.createElement('style');
  // iOS: woff2 stripped by strip-ios-fonts.js (ITMS-90853); use bundled TTF in qcf4ttf/
  // Android/web: use bundled woff2 in qcf4/ (local first, Cloudflare Worker fallback)
  var localSrc=_isIOSCap
    ?"url('/assets/fonts/qcf4ttf/p"+pageNum+".ttf') format('truetype'),"
    :"url('/assets/fonts/qcf4/p"+pageNum+".woff2') format('woff2'),";
  // font-display:block prevents WebKit from resolving document.fonts.load() with a
  // swap-fallback font, which would make fontOk=true when the real font never loaded.
  s.textContent="@font-face{font-family:'QCFv4p"+pageNum+"';src:"+localSrc+"url('https://qpc-v4-fonts.tefsirkurd.workers.dev/p"+pageNum+".woff2') format('woff2');font-display:block}";
  document.head.appendChild(s);
}

// Inject + wait for QCF4 font — returns Promise<boolean>.
// Deduplicates: calling for the same pageNum returns the same Promise.
function ensureQCFV4Font(pageNum){
  if(_qcfV4FontLoadP[pageNum])return _qcfV4FontLoadP[pageNum];
  injectQCFV4Font(pageNum);
  var fontName='QCFv4p'+pageNum;
  // Canvas sentinel: after document.fonts.load() says the font is ready, verify that
  // PUA glyphs (U+E001–U+E00A) render with a DIFFERENT width than the monospace fallback.
  // This catches WebKit/Android cases where fonts.load() resolves but the real file was
  // never applied (e.g. swap-fallback, wrong face, cached-then-evicted).
  function _sentinelOk(){
    try{
      var cv=document.createElement('canvas');
      var cx=cv.getContext('2d');
      if(!cx)return false;
      var s='';
      cx.font='48px monospace';
      var wRef=cx.measureText(s).width;
      cx.font='48px "'+fontName+'",monospace';
      var wQCF=cx.measureText(s).width;
      return wQCF>0&&Math.abs(wQCF-wRef)>2;
    }catch(e){return false;}
  }
  if(!document.fonts||!document.fonts.load){
    _qcfV4FontLoadP[pageNum]=Promise.resolve(false);
    return _qcfV4FontLoadP[pageNum];
  }
  var loadP=_qcfFontSlot(function(){
    return document.fonts.load('1em "'+fontName+'"').then(function(faces){
      if(!faces||!faces.length)return false;
      return _sentinelOk();
    }).catch(function(){return false;});
  });
  var timeoutP=new Promise(function(res){setTimeout(function(){res(false);},5000);});
  _qcfV4FontLoadP[pageNum]=Promise.race([loadP,timeoutP]);
  return _qcfV4FontLoadP[pageNum];
}

// Prefetch QCF4 font + page data for a page number — fire and forget.
function _prefetchMushafPage(pageNum){
  if(pageNum<1||pageNum>604)return;
  var pf=_getPageFields();
  if(S.mushafFont==='qcf4'){
    ensureQCFV4Font(pageNum);
  } else if(S.mushafFont==='qcf2'){
    injectQCFV2Font(pageNum);
  } else {
    injectQCFFont(pageNum);
  }
  getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId).catch(function(){});
}

// Medina Mushaf (QPC Hafs, mushaf=19) — surah page ranges bundled for offline use.
// Index = surah number - 1.  Each entry = [firstPage, lastPage].
// Source: api.quran.com/api/v4/chapters (retrieved 2026-05-15).
var _MUSHAF_PAGE_RANGES=[[1,1],[2,49],[50,76],[77,106],[106,127],[128,150],[151,176],[177,186],[187,207],[208,221],[221,235],[235,248],[249,255],[255,261],[262,267],[267,281],[282,293],[293,304],[305,312],[312,321],[322,331],[332,341],[342,349],[350,359],[359,366],[367,376],[377,385],[385,396],[396,404],[404,410],[411,414],[415,417],[418,427],[428,434],[434,440],[440,445],[446,452],[453,458],[458,467],[467,476],[477,482],[483,489],[489,495],[496,498],[499,502],[502,506],[507,510],[511,515],[515,517],[518,520],[520,523],[523,525],[526,528],[528,531],[531,534],[534,537],[537,541],[542,545],[545,548],[549,551],[551,552],[553,554],[554,555],[556,557],[558,559],[560,561],[562,564],[564,566],[566,568],[568,570],[570,571],[572,573],[574,575],[575,577],[577,578],[578,580],[580,581],[582,583],[583,584],[585,585],[586,586],[587,587],[587,589],[589,589],[590,590],[591,591],[591,592],[592,592],[593,594],[594,594],[595,595],[595,596],[596,596],[596,596],[597,597],[597,597],[598,598],[598,599],[599,599],[599,600],[600,600],[600,600],[601,601],[601,601],[601,601],[602,602],[602,602],[602,602],[603,603],[603,603],[603,603],[604,604],[604,604],[604,604]];

function getMushafPageRange(surahNum){
  // Bundled static data — works fully offline
  var r=_MUSHAF_PAGE_RANGES[surahNum-1];
  if(r)return Promise.resolve({start:r[0],end:r[1]});
  // localStorage cache (populated from previous API calls)
  var key='qcfRange_'+surahNum;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.start)return Promise.resolve(c);}catch(e){}
  // Network fallback
  return fetch('https://api.quran.com/api/v4/chapters/'+surahNum)
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){
      var ch=json.chapter;
      var pages={start:ch.pages[0],end:ch.pages[1]};
      try{localStorage.setItem(key,JSON.stringify(pages));}catch(e){}
      return pages;
    });
}

// Singleton Promise for loading mushaf-v4-pages.json.
// Shared across all getMushafPageData calls so the 3 MB file is fetched once only.
var _mushafV4DataP=null;
function _loadMushafBundledData(){
  if(window._mushafV4Pages)return Promise.resolve(window._mushafV4Pages);
  if(_mushafV4DataP)return _mushafV4DataP;
  var _mctrl=new AbortController();
  var _mtid=setTimeout(function(){_mctrl.abort();},_sn.ms(30000,55000));
  _mushafV4DataP=fetch('/data/mushaf-v4-pages.json',{signal:_mctrl.signal})
    .then(function(r){clearTimeout(_mtid);return r.ok?r.json():null;})
    .then(function(data){
      if(data&&Array.isArray(data))window._mushafV4Pages=data;
      return window._mushafV4Pages||null;
    })
    .catch(function(){clearTimeout(_mtid);return null;});
  return _mushafV4DataP;
}

function getMushafPageData(pageNum,fields,cachePrefix,mushafId){
  fields=fields||'code_v1';cachePrefix=cachePrefix||'qcfV1p_';
  var key=cachePrefix+pageNum;
  // 1. localStorage (fastest — populated from prior visits or bundle seed)
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.verses)return Promise.resolve(c);}catch(e){}
  // 2. For QCF4: wait for bundled data to finish loading, THEN check it.
  //    This resolves the race where getMushafPageData was called before the
  //    3 MB JSON fetch completed, causing the bundle check to be skipped.
  if(fields==='code_v2'&&mushafId===19){
    return _loadMushafBundledData().then(function(){
      if(window._mushafV4Pages){
        var bd=window._mushafV4Pages[pageNum-1];
        if(bd&&bd.verses&&bd.verses.length){
          try{localStorage.setItem(key,JSON.stringify(bd));}catch(e){}
          return bd;
        }
      }
      // 3. Network fallback — never reject; offline returns noData sentinel so caller
      //    can show Hafs fallback instead of an × error card.
      var _mc4=new AbortController();
      var _mt4=setTimeout(function(){_mc4.abort();},_sn.ms(12000,22000));
      return fetch('https://api.quran.com/api/v4/verses/by_page/'+pageNum+'?words=true&word_fields=code_v2&per_page=300&mushaf=19',{signal:_mc4.signal})
        .then(function(r){clearTimeout(_mt4);if(!r.ok)throw new Error(r.status);return r.json();})
        .then(function(json){try{localStorage.setItem(key,JSON.stringify(json));}catch(e){}return json;})
        .catch(function(){clearTimeout(_mt4);return{verses:[],_noData:true};});
    }).catch(function(){return{verses:[],_noData:true};});
  }
  // Other font modes: direct network
  var url='https://api.quran.com/api/v4/verses/by_page/'+pageNum+'?words=true&word_fields='+fields+'&per_page=300';
  if(mushafId)url+='&mushaf='+mushafId;
  var _mc=new AbortController();var _mt=setTimeout(function(){_mc.abort();},10000);
  return fetch(url,{signal:_mc.signal})
    .then(function(r){clearTimeout(_mt);if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){try{localStorage.setItem(key,JSON.stringify(json));}catch(e){}return json;})
    .catch(function(e){clearTimeout(_mt);throw e;});
}
function _getPageFields(){
  if(S.mushafFont==='qcf2')return{fields:'code_v2',cache:'qcfV2p_'};
  if(S.mushafFont==='qcf4')return{fields:'code_v2',cache:'qcfV4p_',mushafId:19};
  return{fields:'code_v1',cache:'qcfV1p_'};
}


// Returns the first ayah number currently visible in the normal ayah list
function _visibleAyahInList(){
  var list=$('ayahList');
  if(!list)return null;
  var listRect=list.getBoundingClientRect();
  var cards=list.querySelectorAll('.ayah-card[data-ayah]');
  for(var i=0;i<cards.length;i++){
    var r=cards[i].getBoundingClientRect();
    if(r.bottom>listRect.top+8&&r.top<listRect.bottom-8)return parseInt(cards[i].dataset.ayah)||null;
  }
  return null;
}

// Returns the topmost ayah number currently visible in mushaf view
function _visibleAyahInMushaf(){
  var view=$('mushafView');
  if(!view||!S.surah)return null;
  var vRect=view.getBoundingClientRect();
  var best=null,bestTop=Infinity;
  var vels=window._mushafVerseElements||{};
  Object.keys(vels).forEach(function(k){
    var parts=k.split(':');
    if(parseInt(parts[0])!==S.surah)return;
    (vels[k]||[]).forEach(function(e){
      if(!view.contains(e))return;
      var r=e.getBoundingClientRect();
      if(r.bottom>vRect.top&&r.top<vRect.bottom&&r.top<bestTop){bestTop=r.top;best=parseInt(parts[1]);}
    });
  });
  return best;
}

// Polls until mushaf has rendered the target ayah then scrolls to it (max ~2s)
// Scroll a container to center an element — explicit scrollTop, safe on iOS
function _scrollElToCenter(container,el){
  if(!container||!el)return;
  var elRect=el.getBoundingClientRect();
  var cRect=container.getBoundingClientRect();
  container.scrollTop+=elRect.top-cRect.top-(container.clientHeight-elRect.height)/2;
}

function _scrollMushafToAyah(surah,ayah,attempts){
  if(!surah||!ayah)return;
  attempts=attempts||0;
  if(attempts>20)return;
  var key=String(surah)+':'+String(ayah);
  var view=$('mushafView');
  var els=window._mushafVerseElements&&window._mushafVerseElements[key];
  if(els&&els.length&&view&&view.contains(els[0])){
    // Landscape iPad horizontal mode: scroll view to the spread, then page vertically
    var spread=els[0].closest&&els[0].closest('.mushaf-spread');
    if(spread){
      var spreadIdx=Array.prototype.indexOf.call(view.children,spread);
      view.scrollLeft=spreadIdx*view.clientWidth;
      // Scroll within the page
      var page=els[0].closest('.mushaf-text-page');
      if(page){
        var elRect=els[0].getBoundingClientRect();
        var pRect=page.getBoundingClientRect();
        page.scrollTop+=elRect.top-pRect.top-(page.clientHeight-elRect.height)/2;
      }
    }else{
      var _er=els[0].getBoundingClientRect();
      var _vr=view.getBoundingClientRect();
      var _relTop=_er.top-_vr.top+view.scrollTop;
      _mushafSmoothScrollTo(view,_relTop-_vr.height*0.38+_er.height/2,300);
    }
    return;
  }
  // On first attempt, if the target page isn't loaded yet, estimate its scroll
  // position from the cached page range so the IntersectionObserver fires and
  // triggers the page load. Subsequent retries then find the real elements.
  if(attempts===0&&view){
    try{
      var _rc=JSON.parse(localStorage.getItem('qcfRange_'+surah)||'null');
      if(_rc&&_rc.start){
        var _sa=SURAHS[surah-1];
        var _ta=_sa?_sa.a:1;
        var _estPg=_rc.start+Math.floor((ayah-1)/_ta*(_rc.end-_rc.start+1));
        _estPg=Math.max(_rc.start,Math.min(_rc.end,_estPg));
        view.scrollTop=(_estPg-1)*560;
      }
    }catch(e){}
  }
  setTimeout(function(){_scrollMushafToAyah(surah,ayah,attempts+1);},100);
}

App.toggleMushafMode=function(){
  S.mushafMode=!S.mushafMode;
  localStorage.setItem('mushafMode',String(S.mushafMode));
  var btn=$('mushafToggleBtn');
  if(btn)btn.classList.toggle('on',S.mushafMode);
  var playBtn=$('mushafPlayBtn');
  var ayahList=$('ayahList');
  var mushafView=$('mushafView');
  if(playBtn){updateMushafPlayBtn();}
  if(S.mushafMode){
    // Capture position before hiding normal list
    var fromAyah=_visibleAyahInList()||1;
    if(ayahList)ayahList.style.display='none';
    if(mushafView){mushafView.style.display='';renderMushafView();}
    _preBufferMushafAyah();
    // After mushaf renders, scroll to where user was
    _scrollMushafToAyah(S.surah,fromAyah,0);
  }else{
    // Capture position before hiding mushaf
    var fromAyahM=_visibleAyahInMushaf()||1;
    clearMushafHighlights();
    if(mushafView){mushafView.style.display='none';clear(mushafView);}
    if(ayahList)ayahList.style.display='';
    var s2=SURAHS[(S.surah||1)-1];
    updateProgress(ayahList,s2?s2.a:0);
    // Scroll normal list to where user was in mushaf — explicit scrollTop, safe on iOS
    requestAnimationFrame(function(){
      var card=ayahList&&ayahList.querySelector('.ayah-card[data-ayah="'+fromAyahM+'"]');
      _scrollElToCenter(ayahList,card);
    });
  }
};


// Standard Medina Mushaf (604-page Hafs/Uthmani) — juz start pages
var JUZ_PAGES=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
function juzForPage(p){for(var j=JUZ_PAGES.length-1;j>=0;j--){if(p>=JUZ_PAGES[j])return j+1;}return 1;}

function _mushafSkeleton(){
  var sk=el('div','mushaf-skeleton');

  // Surah header — title + basmala
  var hdr=el('div','mushaf-skel-hdr');
  var nm=el('div','mushaf-skel-name'); hdr.appendChild(nm);
  var bsm=el('div','mushaf-skel-basml'); bsm.style.animationDelay='.12s'; hdr.appendChild(bsm);
  sk.appendChild(hdr);

  // Text rows — widths + marker positions mimic a real Quran page
  // marker:true = verse ends on this line (shows circle at the left/end in RTL)
  var rows=[
    {w:'100',m:false},{w:'100',m:false},{w:'82',m:true},
    {w:'100',m:false},{w:'100',m:false},{w:'100',m:false},{w:'90',m:true},
    {w:'100',m:false},{w:'100',m:false},{w:'75',m:true},
    {w:'100',m:false},{w:'100',m:false},{w:'88',m:true},
    {w:'100',m:false},{w:'58',m:true}
  ];
  rows.forEach(function(r,i){
    var row=el('div','mushaf-skel-row');
    var delay=(i*0.045).toFixed(2)+'s';
    var ln=el('div','mushaf-skel-line');
    ln.style.width=r.w+'%';
    ln.style.animationDelay=delay;
    row.appendChild(ln); // first child = rightmost in RTL (text start)
    if(r.m){
      var num=el('div','mushaf-skel-num');
      num.style.animationDelay=delay;
      row.appendChild(num); // last child = leftmost in RTL (verse end marker)
    }
    sk.appendChild(row);
  });
  return sk;
}

// ── Mushaf integrity validation ──────────────────────────────────────────────
// pageData = the raw API json; pageEl = rendered DOM element
var _mushafRenderMetrics={};  // pageNum → {fontMs,dataMs,renderMs,total,height,ok}

function validateMushafPage(pageNum,pageData,pageEl){
  var verses=pageData.verses||[];
  var expectedKeys=[];
  verses.forEach(function(v){
    var k=String(v.surah_number||parseInt((v.verse_key||'0:0').split(':')[0]))+':'+String(v.verse_number);
    if(expectedKeys.indexOf(k)<0)expectedKeys.push(k);
  });
  var rendered=window._mushafVerseElements||{};
  var presentKeys=expectedKeys.filter(function(k){return !!(rendered[k]&&rendered[k].length);});
  var missingKeys=expectedKeys.filter(function(k){return !(rendered[k]&&rendered[k].length);});
  var lineCount=pageEl.querySelectorAll('.mushaf-qcf-line,.mushaf-flow-verse').length;
  var height=pageEl.offsetHeight;
  var ok=missingKeys.length===0;
  if(!ok){
    console.warn('[MushafIntegrity] FAIL page='+pageNum+' missing='+missingKeys.join(','));
  }
  return{pageNum:pageNum,expected:expectedKeys,present:presentKeys,missing:missingKeys,lineCount:lineCount,height:height,ok:ok};
}

window.MushafDebug={
  pageMetrics:function(pageNum){
    var m=_mushafRenderMetrics[pageNum];
    if(!m){console.log('[MushafDebug] no metrics for page '+pageNum);return null;}
    console.log('[MushafDebug] page='+pageNum,JSON.stringify(m,null,2));
    return m;
  },
  allMetrics:function(){
    Object.keys(_mushafRenderMetrics).sort(function(a,b){return+a-+b;}).forEach(function(p){
      var m=_mushafRenderMetrics[p];
      console.log('[MushafDebug] page='+p+' ok='+m.ok+' missing='+(m.missing||[]).join(',')
        +' dataMs='+m.dataMs+' fontMs='+m.fontMs+' total='+m.total+' height='+m.height+'px');
    });
    return _mushafRenderMetrics;
  },
  validate:function(pageNum){
    var view=$('mushafView');
    if(!view)return;
    var pageEl=view.querySelector('.mushaf-text-page[data-page="'+pageNum+'"]');
    if(!pageEl){console.warn('[MushafDebug] page el not found: '+pageNum);return;}
    var pf=_getPageFields();
    getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId).then(function(json){
      var r=validateMushafPage(pageNum,json,pageEl);
      console.log('[MushafDebug] validate page='+pageNum,r);
    });
  },
  visibleSurah:function(){
    var view=$('mushafView');
    if(!view)return null;
    var banners=view.querySelectorAll('.mushaf-surah-banner[data-surah]');
    var viewRect=view.getBoundingClientRect();
    var best=null,bestTop=Infinity;
    for(var b=0;b<banners.length;b++){
      var br=banners[b].getBoundingClientRect();
      var dist=Math.abs(br.top-viewRect.top);
      if(br.bottom>viewRect.top&&br.top<viewRect.bottom&&dist<bestTop){bestTop=dist;best=banners[b];}
    }
    if(!best){console.log('[MushafDebug] no banner visible');return null;}
    var sn=parseInt(best.dataset.surah);
    var s=SURAHS[sn-1];
    console.log('[MushafDebug] visibleSurah='+sn+(s?' ('+s.en+')':''));
    return sn;
  },
  renderedAyahs:function(pageNum){
    var view=$('mushafView');
    if(!view)return [];
    var pageEl=pageNum?view.querySelector('.mushaf-text-page[data-page="'+pageNum+'"]'):null;
    var container=pageEl||view;
    var segs=container.querySelectorAll('.mushaf-ayah-seg[data-surah][data-ayah]');
    var keys=[];
    for(var i=0;i<segs.length;i++){
      var k=segs[i].getAttribute('data-surah')+':'+segs[i].getAttribute('data-ayah');
      if(keys.indexOf(k)<0)keys.push(k);
    }
    console.log('[MushafDebug] renderedAyahs page='+pageNum+' count='+keys.length,keys);
    return keys;
  },
  missingAyahs:function(pageNum){
    var self=this;
    var pf=_getPageFields();
    return getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId).then(function(json){
      var verses=json.verses||[];
      var expected=[];
      verses.forEach(function(v){
        var k=String(v.surah_number||parseInt((v.verse_key||'0:0').split(':')[0]))+':'+String(v.verse_number);
        if(expected.indexOf(k)<0)expected.push(k);
      });
      var rendered=self.renderedAyahs(pageNum);
      var missing=expected.filter(function(k){return rendered.indexOf(k)<0;});
      if(missing.length){
        console.warn('[MushafDebug] missingAyahs page='+pageNum+' MISSING='+missing.join(','));
      } else {
        console.log('[MushafDebug] missingAyahs page='+pageNum+' ALL PRESENT ('+expected.length+' ayahs)');
      }
      return missing;
    });
  }
};

// Wrap mushaf pages into horizontal snap spreads for iPad
// Landscape (≥1024px): 2 pages per spread. Portrait (<1024px): 1 page per spread.
function _mushafWrapSpreads(view){
  var isLandscape=window.innerWidth>=1024;
  var step=isLandscape?2:1;
  var pages=Array.prototype.slice.call(view.querySelectorAll(':scope>.mushaf-text-page'));
  var nav=view.querySelector(':scope>.mushaf-surah-nav');
  pages.forEach(function(p){view.removeChild(p);});
  if(nav)view.removeChild(nav);
  for(var i=0;i<pages.length;i+=step){
    var spread=document.createElement('div');
    spread.className='mushaf-spread';
    spread.appendChild(pages[i]);
    if(isLandscape&&pages[i+1])spread.appendChild(pages[i+1]);
    else if(isLandscape)spread.classList.add('spread-single');
    view.appendChild(spread);
  }
  if(nav)view.appendChild(nav);
  // Re-setup lazy observer with horizontal rootMargin
  if(_mushafLazyObs){
    _mushafLazyObs.disconnect();
    _mushafLazyObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var pageEl=entry.target;
        if(pageEl.dataset.loaded)return;
        _mqEnqueue(pageEl,parseInt(pageEl.dataset.page),null);
      });
    },{root:view,rootMargin:'0px 600px'});
    view.querySelectorAll('.mushaf-text-page:not([data-loaded])').forEach(function(p){_mushafLazyObs.observe(p);});
    if(_mqScrollEl&&_mqScrollFn)_mqScrollEl.removeEventListener('scroll',_mqScrollFn);
    _mqScrollEl=view;
    _mqScrollFn=function(){_mqScrolling=true;clearTimeout(_mqScrollTimer);_mqScrollTimer=setTimeout(function(){_mqScrolling=false;_drainMQ();},200);};
    _mqScrollEl.addEventListener('scroll',_mqScrollFn,{passive:true});
  }
  view.scrollLeft=0;
}

function renderMushafView(){
  var view=$('mushafView');
  if(!view||!S.surah)return;
  // Start the 3 MB bundle fetch immediately so it's ready before the first page loads
  if(S.mushafFont==='qcf4')_loadMushafBundledData();
  clearMushafHighlights();
  // Disconnect previous lazy-load observer to prevent accumulation
  if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
  _mqReset();
  window._mushafVerseElements={};
  _mushafRenderMetrics={}; // reset per-surah — prevents unbounded growth across long sessions
  // Single clear + skeleton — never clear twice. When page range resolves we remove
  // only the skeleton node, so the view is never in a blank state between clears.
  clear(view);
  view.scrollTop=0;view.scrollLeft=0;
  var _skel=_mushafSkeleton();
  view.appendChild(_skel);

  var _renderSurah=S.surah; // capture at render time — abort if surah changes during async
  getMushafPageRange(S.surah).then(function(pages){
    if(!S.mushafMode||S.surah!==_renderSurah)return;
    if(_skel.parentNode===view)view.removeChild(_skel); // remove skeleton, not entire view
    view.scrollTop=0;view.scrollLeft=0;

    // Pre-inject QCF fonts for first 3 pages so they're downloading in parallel
    for(var pi=pages.start;pi<=Math.min(pages.end,pages.start+2);pi++){
      if(S.mushafFont==='qcf1')injectQCFFont(pi);
      else if(S.mushafFont==='qcf2')injectQCFV2Font(pi);
      else if(S.mushafFont==='qcf4')injectQCFV4Font(pi);
    }

    // Full Quran: page 1→604. Always start from page 1 so scrolling back to
    // Al-Fatiha from any surah works like a real Mushaf.
    // Pre-scroll to near the target surah before the observer fires so the
    // initial intersection check loads pages around the right position.
    var _estPx=(pages.start-1)*560; // ~560px per skeleton page
    // Build all 604 page containers in a DocumentFragment (single DOM insertion)
    // with no children — CSS min-height keeps scroll range intact. Skeletons are
    // added by the IO callback just before data loads, cutting initial DOM nodes
    // from ~9,000 (604×15 lines) down to 604 bare divs.
    var _frag=document.createDocumentFragment();
    for(var p=1;p<=604;p++){
      var pageEl=el('div','mushaf-text-page');
      pageEl.dataset.page=String(p);
      _frag.appendChild(pageEl);
    }
    view.appendChild(_frag);
    view.scrollTop=_estPx;

    var targetSurah=S.surah;
    var capturedSurah=targetSurah;
    var targetPageEl=view.querySelector('.mushaf-text-page[data-page="'+pages.start+'"]');

    function _mushafPageErr(pageEl){
      clear(pageEl);
      var ph=el('div','mushaf-page-ph mushaf-page-err','—');
      pageEl.appendChild(ph);
    }

    // Lazy-load: 3000px lookahead below, 1200px above. Large downward margin
    // pre-renders pages as the user reads forward; smaller upward margin limits
    // how many pages above the initial scroll position fire simultaneously,
    // reducing the cascade that caused the wrong-ayah landing.
    if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
    _mushafLazyObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var pe=entry.target;
        if(pe.dataset.loaded)return;
        if(S.surah!==capturedSurah)return;
        _mqEnqueue(pe,parseInt(pe.dataset.page),_mushafPageErr);
      });
    },{root:view,rootMargin:'600px 0px 1200px 0px'});
    view.querySelectorAll('.mushaf-text-page:not([data-loaded])').forEach(function(pe){
      _mushafLazyObs.observe(pe);
    });
    // Scroll gate — same pattern as PDF reader: pause queue during scroll, drain after settle
    if(_mqScrollEl&&_mqScrollFn)_mqScrollEl.removeEventListener('scroll',_mqScrollFn);
    _mqScrollEl=view;
    _mqScrollFn=function(){_mqScrolling=true;clearTimeout(_mqScrollTimer);_mqScrollTimer=setTimeout(function(){_mqScrolling=false;_drainMQ();},200);};
    _mqScrollEl.addEventListener('scroll',_mqScrollFn,{passive:true});

    // Preload target page + up to 8 pages above it, THEN scroll once.
    //
    // Old approach: load only the target page, then run a setTimeout retry loop
    // (×8, 200ms apart) to chase layout shifts. Each correction scrolled further
    // down because IO-triggered pages above were still growing from min-height
    // (560px) to real height (~900px). The cascade landed ~70 ayahs past ayah 1.
    //
    // Fix: mark all pages that affect b.offsetTop as loaded BEFORE calling any
    // scroll. Once Promise.all resolves every page above is at its final height,
    // so one scrollTop assignment lands exactly on ayah 1 with no jitter.
    var _preStart=Math.max(1,pages.start-8);
    var _prePromises=[];
    for(var _pi=_preStart;_pi<=pages.start;_pi++){
      (function(_pn){
        var _pe=view.querySelector('.mushaf-text-page[data-page="'+_pn+'"]');
        if(!_pe||_pe.dataset.loaded)return;
        _pe.dataset.loaded='1';
        _mushafLazyObs&&_mushafLazyObs.unobserve(_pe);
        if(!_pe.firstChild)_pe.appendChild(_mushafSkeleton());
        _prePromises.push(loadMushafPageQCF(_pe,_pn).catch(function(){_mushafPageErr(_pe);}));
      })(_pi);
    }
    Promise.all(_prePromises).then(function(){
      // Register preloaded pages in eviction tracker now that their heights are final
      for(var _tri=_preStart;_tri<=pages.start;_tri++){if(_mqLoadedPages.indexOf(_tri)<0)_mqLoadedPages.push(_tri);}
      if(S.surah!==capturedSurah||!S.mushafMode)return;
      var b=view.querySelector('.mushaf-surah-banner[data-surah="'+targetSurah+'"]');
      if(b)view.scrollTop=b.offsetTop;
      updateMushafProgress(view);
      // One residual check: any IO pages just outside the preload range may still
      // be settling. A single correction 500ms later is enough — no cascade.
      setTimeout(function(){
        if(S.surah!==capturedSurah||!S.mushafMode)return;
        var b2=view.querySelector('.mushaf-surah-banner[data-surah="'+targetSurah+'"]');
        if(!b2)return;
        var delta=b2.getBoundingClientRect().top-view.getBoundingClientRect().top;
        if(Math.abs(delta)>4)view.scrollTop+=delta;
      },500);
    }).catch(function(){
      var b=view.querySelector('.mushaf-surah-banner[data-surah="'+targetSurah+'"]');
      if(b)view.scrollTop=b.offsetTop;
    });

    // Header: update as user scrolls through pages — reflect topmost visible surah
    (function(){
      var _hdrTimer=null;
      function _updateHeaderFromScroll(){
        clearTimeout(_hdrTimer);
        _hdrTimer=setTimeout(function(){
          if(S.surah!==capturedSurah)return;
          var banners=view.querySelectorAll('.mushaf-surah-banner[data-surah]');
          var viewRect=view.getBoundingClientRect();
          var best=null,bestTop=Infinity;
          for(var b=0;b<banners.length;b++){
            var br=banners[b].getBoundingClientRect();
            var dist=Math.abs(br.top-viewRect.top);
            if(br.bottom>viewRect.top&&br.top<viewRect.bottom&&dist<bestTop){
              bestTop=dist;best=banners[b];
            }
          }
          if(!best)return;
          var sn=parseInt(best.dataset.surah);
          var ns=SURAHS[sn-1];
          if(ns&&$('readerName'))$('readerName').textContent=ns.en+' - '+ns.ar;
        },200);
      }
      view.addEventListener('scroll',_updateHeaderFromScroll,{passive:true});
    })();

    // Cancel any in-flight smooth scroll when the user touches the mushaf
    view.addEventListener('touchstart',function(){
      if(_mushafScrollAnim){_mushafScrollAnim.cancelled=true;_mushafScrollAnim=null;}
    },{passive:true});

    // iPad (any orientation ≥768px): page-by-page horizontal navigation
    if(document.documentElement.classList.contains('is-ipad')&&window.innerWidth>=768){
      _mushafWrapSpreads(view);
    }
  }).catch(function(){
    clear(view);
    var errWrap=el('div','mushaf-offline-err');
    var msg=el('div','mushaf-offline-err-msg',t('mushaf.offline_msg')||'Mushaf mode needs internet on first load.');
    var switchBtn=el('button','mushaf-offline-switch-btn',t('mushaf.switch_to_reading')||'Switch to reading mode');
    on(switchBtn,'click',function(){App.toggleMushafMode();});
    errWrap.appendChild(msg);
    errWrap.appendChild(switchBtn);
    view.appendChild(errWrap);
  });
}

// Preserve mushaf scroll position across orientation change / viewport resize.
// iOS WebKit can reset overflow-y scroll containers to 0 on rotation.
// Save on orientationchange (fires before resize/reflow), restore after layout settles.
(function(){
  var _saved=-1,_restoreTimer=null;
  function _saveMushaf(){
    if(!window.S||!S.mushafMode)return;
    var mv=document.getElementById('mushafView');
    if(mv&&mv.style.display!=='none'&&mv.scrollTop>0)_saved=mv.scrollTop;
  }
  function _restoreMushaf(){
    if(_saved<0)return;
    var pos=_saved;_saved=-1;
    if(!window.S||!S.mushafMode)return;
    var mv=document.getElementById('mushafView');
    // Only restore if browser actually reset the scroll (within 5px of 0)
    if(mv&&mv.style.display!=='none'&&mv.scrollTop<5)mv.scrollTop=pos;
  }
  window.addEventListener('orientationchange',_saveMushaf,{passive:true});
  window.addEventListener('resize',function(){
    clearTimeout(_restoreTimer);
    _restoreTimer=setTimeout(_restoreMushaf,120);
  },{passive:true});
})();

// Shrink QCF lines that overflow their container so no characters are clipped.
// Separates DOM reads from writes to avoid layout thrashing.
function _fitQCFLines(pageEl){
  var lines=pageEl.querySelectorAll('.mushaf-qcf-line');
  var n=lines.length;
  if(!n)return;
  // batch-reset transforms first so measurements reflect natural width
  for(var i=0;i<n;i++)lines[i].style.transform='';
  var scales=new Array(n);
  // batch-read
  for(var i=0;i<n;i++){
    var sw=lines[i].scrollWidth,cw=lines[i].clientWidth;
    scales[i]=(sw>cw&&cw>0)?cw/sw:1;
  }
  // batch-write
  for(var i=0;i<n;i++){
    if(scales[i]<1){
      lines[i].style.transform='scaleX('+scales[i].toFixed(4)+')';
      lines[i].style.transformOrigin='center';
    }
  }
}

// Returns a DocumentFragment rendering Quran text with KFGQPC Hafs font.
// verses: array from getMushafPageData — may be empty when page data unavailable.
// pageNum: used to look up which surahs fall on this page when verses is empty.
function _buildHafsFallbackFrag(verses,pageNum){
  var frag=document.createDocumentFragment();
  var prevSn=-1;
  function _hafsHeader(sn){
    if(sn===prevSn)return;prevSn=sn;
    var bn=el('div','mushaf-surah-banner');bn.dataset.surah=String(sn);
    var nt=document.createElement('div');nt.className='surah-name-ar no-kurdish-convert';
    var gc='surah'+String(sn).padStart(3,'0');nt.dataset.glyph=gc;
    var fr=(window.QuranFontManager&&window.QuranFontManager.isReady('SurahName'))||window._surahNameFontReady;
    var ss=SURAHS[sn-1];nt.textContent=fr?gc:(ss?ss.ar:('سورة '+sn));
    bn.appendChild(nt);frag.appendChild(bn);
    if(sn!==1&&sn!==9){var bm=el('div','mushaf-bismillah');bm.textContent='بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';frag.appendChild(bm);}
  }
  function _hafsVerse(sn,vn){
    var sd=S.quranData&&S.quranData[String(sn)];
    var ao=sd&&sd[vn-1];
    var txt=(ao&&ao.text)||('('+sn+':'+vn+')');
    var ve=el('div','mushaf-flow-verse');
    ve.style.fontFamily="'KFGQPC Hafs','Amiri Quran',serif";
    ve.textContent=txt+' ﴿'+toArabicNum(vn)+'﴾';
    (function(v,s){on(ve,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(v,s);});})(vn,sn);
    frag.appendChild(ve);
  }
  if(verses&&verses.length){
    verses.forEach(function(v){
      var sn=v.surah_number||parseInt((v.verse_key||'1:1').split(':')[0]);
      var vn=v.verse_number;
      _hafsHeader(sn);_hafsVerse(sn,vn);
    });
  } else {
    // No verse data available — approximate from quranData for surahs on this page
    for(var i=0;i<_MUSHAF_PAGE_RANGES.length;i++){
      var r=_MUSHAF_PAGE_RANGES[i];
      if(r[0]>pageNum||r[1]<pageNum)continue;
      var psn=i+1;
      var psd=S.quranData&&S.quranData[String(psn)];
      if(!psd)continue;
      _hafsHeader(psn);
      for(var vi=0;vi<psd.length;vi++){
        _hafsVerse(psn,psd[vi].verse||(vi+1));
      }
    }
  }
  return frag;
}

function loadMushafPageQCF(pageEl,pageNum){
  var font=S.mushafFont||'qcf1';
  var pf=_getPageFields();
  var _t0=Date.now();

  // Start font and data fetches in parallel
  var fontP;
  if(font==='qcf4'){
    fontP=ensureQCFV4Font(pageNum);
  } else {
    if(font==='qcf1')injectQCFFont(pageNum);
    else if(font==='qcf2')injectQCFV2Font(pageNum);
    fontP=Promise.resolve(true);
  }
  var _dataT=Date.now();
  // Race page data against a max-wait timeout. On slow networks the timeout is
  // longer, but if it expires we immediately render the Hafs fallback so the
  // user sees Quran text instead of a perpetual shimmer skeleton.
  var _pageMaxWait=_sn.ms(14000,26000);
  var _pageTimeoutP=new Promise(function(_,rej){setTimeout(function(){rej(new Error('page_timeout'));},_pageMaxWait);});
  var dataP=Promise.race([getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId),_pageTimeoutP]);

  return dataP.then(function(json){
    var _dataMs=Date.now()-_dataT;
    var verses=json.verses||[];
    if(!verses.length){
      // No page data — render Hafs Arabic text as fallback (never show ×)
      if(font==='qcf4'){
        var _nd=_buildHafsFallbackFrag([],pageNum);
        clear(pageEl);pageEl.classList.add('mushaf-page-hafs-fallback');pageEl.appendChild(_nd);
      } else {clear(pageEl);pageEl.appendChild(el('div','mushaf-page-ph','—'));}
      return;
    }

    // Render into a fragment — spinner stays visible until font is ready
    var frag=document.createDocumentFragment();
    // Juz banner — show only at the START of a new juz
    var juzIdx=JUZ_PAGES.indexOf(pageNum);
    if(juzIdx>=0){
      var juzBanner=el('div','mushaf-juz-banner',t('reader.juz_label')+' '+toArabicNum(juzIdx+1));
      frag.appendChild(juzBanner);
    }

    // Helper: surah banner + bismillah
    function addSurahHeader(sn){
      var s=SURAHS[sn-1];
      var banner=el('div','mushaf-surah-banner');
      banner.dataset.surah=String(sn);
      var gc='surah'+String(sn).padStart(3,'0');
      var titleEl=document.createElement('div');
      titleEl.className='surah-name-ar no-kurdish-convert';
      titleEl.dataset.glyph=gc;
      var fontReady=(window.QuranFontManager&&window.QuranFontManager.isReady('SurahName'))||window._surahNameFontReady;
      titleEl.textContent=fontReady?gc:(s?s.ar:('سورة '+sn));
      banner.appendChild(titleEl);
      frag.appendChild(banner);
      if(sn!==1&&sn!==9){
        var bism=el('div','mushaf-bismillah');
        bism.textContent='بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
        frag.appendChild(bism);
      }
    }

    if(font==='qcf1'||font==='qcf2'||font==='qcf4'){
      // ── QCF line-by-line rendering (V1, V2, or V4 tajweed) ──
      var fontFam=(font==='qcf2')?"'QCFv2p"+pageNum+"'":(font==='qcf4')?"'QCFv4p"+pageNum+"'":"'QCFv1p"+pageNum+"'";
      var codeField=(font==='qcf2'||font==='qcf4')?'code_v2':'code_v1';
      var lineOrder=[];var lineOrderSeen={};var lineStartsSurah={};var lineAyahGroups={};

      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        var isFirst=(vn===1);var markedLine=false;
        (verse.words||[]).forEach(function(w){
          if(!w[codeField])return;
          var ln=w.line_number||0;
          if(!lineOrderSeen[ln]){lineOrderSeen[ln]=true;lineOrder.push(ln);}
          if(!lineAyahGroups[ln])lineAyahGroups[ln]=[];
          var grps=lineAyahGroups[ln];
          var last=grps[grps.length-1];
          if(last&&last.vn===vn&&last.sn===sn){last.words.push(w[codeField]);}
          else{grps.push({sn:sn,vn:vn,words:[w[codeField]]});}
          if(isFirst&&!markedLine&&!lineStartsSurah[ln]){markedLine=true;lineStartsSurah[ln]={surahNum:sn};}
        });
      });

      lineOrder.sort(function(a,b){return a-b;});
      lineOrder.forEach(function(ln){
        var sc=lineStartsSurah[ln];
        if(sc)addSurahHeader(sc.surahNum);
        var lineEl=el('div','mushaf-qcf-line');
        lineEl.style.fontFamily=fontFam;
        var grps=lineAyahGroups[ln]||[];
        // Always wrap every ayah segment in a span — never register the full line div
        grps.forEach(function(g){
          var seg=document.createElement('span');
          seg.className='mushaf-ayah-seg';
          seg.setAttribute('data-surah',String(g.sn));
          seg.setAttribute('data-ayah',String(g.vn));
          seg.textContent=g.words.join('');
          var k=String(g.sn)+':'+String(g.vn);
          if(!window._mushafVerseElements[k])window._mushafVerseElements[k]=[];
          window._mushafVerseElements[k].push(seg);
          (function(v,s,segKey){
            // Highlight ALL segments of this ayah on press (handles multi-line ayahs)
            on(seg,'pointerdown',function(){
              var all=window._mushafVerseElements[segKey]||[];
              all.forEach(function(el){el.classList.add('mushaf-seg-sel');});
            });
            // Clean up if gesture cancelled (scroll, interrupt)
            on(seg,'pointercancel',function(){
              var all=window._mushafVerseElements[segKey]||[];
              all.forEach(function(el){el.classList.remove('mushaf-seg-sel');});
            });
            on(seg,'click',function(e){
              e.stopPropagation();
              var all=window._mushafVerseElements[segKey]||[];
              setTimeout(function(){all.forEach(function(el){el.classList.remove('mushaf-seg-sel');});},220);
              App.showMushafVerseTafsir(v,s);
            });
          })(g.vn,g.sn,k);
          lineEl.appendChild(seg);
        });
        // Line-level fallback: only for single-ayah lines (gaps between glyphs still clickable)
        // Multi-ayah lines: use segment spans directly — no ambiguous line-level handler
        if(grps.length===1){
          (function(v,s){on(lineEl,'click',function(){App.showMushafVerseTafsir(v,s);});})(grps[0].vn,grps[0].sn);
        }
        frag.appendChild(lineEl);
      });

    } else if(font==='tajweed'){
      // ── Tajweed: flowing text with safe DOM colored spans ──
      var stripTags=function(s){
        var out='',i=0;
        while(i<s.length){
          if(s[i]==='<'){var e=s.indexOf('>',i);i=(e===-1)?s.length:e+1;}
          else{out+=s[i++];}
        }
        return out;
      };
      var appendTjWord=function(raw,container){
        var chunks=raw.split('</rule>');
        for(var ci=0;ci<chunks.length;ci++){
          var chunk=chunks[ci];
          if(!chunk)continue;
          var tagIdx=chunk.indexOf('<rule class=');
          if(tagIdx===-1){container.appendChild(document.createTextNode(chunk));}
          else{
            if(tagIdx>0)container.appendChild(document.createTextNode(chunk.substring(0,tagIdx)));
            var inner=chunk.substring(tagIdx+12);
            var gtIdx=inner.indexOf('>');
            if(gtIdx>0){
              var txt=stripTags(inner.substring(gtIdx+1));
              if(txt){
                var sp=document.createElement('span');
                sp.className='tj-'+inner.substring(0,gtIdx);
                sp.textContent=txt;
                container.appendChild(sp);
              }
            }
          }
        }
      };
      var prevSurahT=-1;
      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        if(sn!==prevSurahT){prevSurahT=sn;addSurahHeader(sn);}
        var words=(verse.words||[]).filter(function(w){return w.char_type_name!=='end';});
        if(!words.length)return;
        var vEl=el('div','mushaf-flow-verse');
        vEl.style.fontFamily="'KFGQPC Hafs',serif";
        words.forEach(function(w,wi){
          appendTjWord(w.text_uthmani_tajweed||w.text||'',vEl);
          if(wi<words.length-1)vEl.appendChild(document.createTextNode(' '));
        });
        var endSp=document.createElement('span');endSp.className='tj-end';
        endSp.textContent=' \uFD3F'+toArabicNum(vn)+'\uFD3E';
        vEl.appendChild(endSp);
        (function(v,s){on(vEl,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(v,s);});})(vn,sn);
        frag.appendChild(vEl);
      });

    } else {
      // ── Fallback: flowing plain text ──
      var prevSurahF=-1;
      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        if(sn!==prevSurahF){prevSurahF=sn;addSurahHeader(sn);}
        var words=(verse.words||[]).map(function(w){return w.text||'';}).filter(Boolean);
        if(!words.length)return;
        var vEl=el('div','mushaf-flow-verse');
        vEl.style.fontFamily="'KFGQPC Hafs',serif";
        vEl.textContent=words.join(' ')+' \uFD3F'+toArabicNum(vn)+'\uFD3E';
        (function(v,s){on(vEl,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(v,s);});})(vn,sn);
        frag.appendChild(vEl);
      });
    }

    var foot=el('div','mushaf-page-foot');
    foot.appendChild(el('span','mushaf-page-num',toArabicNum(pageNum)));
    frag.appendChild(foot);

    // Metadata — set on pageEl immediately (progress tracking reads dataset)
    // dataset.verses  : verse numbers for S.surah only (legacy, used by scroll-resume)
    // dataset.verseKeys: all "surah:ayah" pairs on this page (multi-surah progress tracking)
    var svn=[],vks=[];
    verses.forEach(function(v){
      var sn=Number(v.surah_number)||parseInt((v.verse_key||'0:0').split(':')[0]);
      var vn=Number(v.verse_number);
      if(sn===S.surah)svn.push(vn);
      vks.push(sn+':'+vn);
    });
    pageEl.dataset.verses=JSON.stringify(svn);
    pageEl.dataset.verseKeys=JSON.stringify(vks);

    // Prefetch adjacent pages: next 2 and previous 1 for instant scroll in any direction
    _prefetchMushafPage(pageNum+1);
    _prefetchMushafPage(pageNum+2);
    _prefetchMushafPage(pageNum-1);

    var showContent=function(fontMs){
      var _rT=Date.now();
      clear(pageEl);
      pageEl.appendChild(frag);
      // Restore all active highlight states on the newly-rendered page
      if(S.audio.playing&&S.audio.surah===S.surah)_hlRestoreMushafPage(pageEl);
      var _renderMs=Date.now()-_rT;
      var _total=Date.now()-_t0;
      // Re-fit once QCF1/QCF2 font actually downloads (fontP resolved instantly so
      // the first RAF below measures with the fallback font — this corrects it)
      if(font==='qcf1'||font==='qcf2'){
        var _qcfFam=(font==='qcf2')?"1em 'QCFv2p"+pageNum+"'":"1em 'QCFv1p"+pageNum+"'";
        if(document.fonts&&document.fonts.load){
          document.fonts.load(_qcfFam).then(function(){
            requestAnimationFrame(function(){_fitQCFLines(pageEl);});
          });
        }
      }
      // Integrity validation + line auto-fit — runs after DOM commit
      requestAnimationFrame(function(){
        _fitQCFLines(pageEl);
        var result=validateMushafPage(pageNum,json,pageEl);
        _mushafRenderMetrics[pageNum]={
          fontMs:fontMs||0,dataMs:_dataMs,renderMs:_renderMs,total:_total,
          height:pageEl.offsetHeight,ok:result.ok,
          expected:result.expected,missing:result.missing
        };
        console.log('[MushafPerf] page='+pageNum+' dataMs='+_dataMs+' fontMs='+(fontMs||0)+' renderMs='+_renderMs+' total='+_total+' ok='+result.ok+(result.missing.length?' MISSING='+result.missing.join(','):''));
      });
    };

    // For QCF4 font already resolved by ensureQCFV4Font; for other modes font is always ready
    return fontP.then(function(fontOk){
      var QFM=window.QuranFontManager;
      var _fontMs=Date.now()-_t0-_dataMs;
      if(font==='qcf4'&&!fontOk){
        // QCF4 font unavailable — sentinel test failed or font timed out.
        // Render readable Hafs Arabic text; never show broken PUA glyph codes.
        if(QFM)QFM.qcfPageFailed(pageNum,'font-unavailable');
        clear(pageEl);
        pageEl.classList.add('mushaf-page-hafs-fallback');
        pageEl.appendChild(_buildHafsFallbackFrag(verses,pageNum));
        _mushafRenderMetrics[pageNum]={fontMs:_fontMs,dataMs:_dataMs,total:Date.now()-_t0,ok:false,missing:['qcf4-font']};
        console.log('[MushafPerf] page='+pageNum+' status=hafs-fallback total='+(Date.now()-_t0));
        return;
      }
      if(font==='qcf4'&&QFM)QFM.qcfPageLoaded(pageNum,Date.now()-_t0);
      showContent(_fontMs);
    });
  }).catch(function(err){
    console.warn('[Mushaf] page='+pageNum+' render error:',err&&err.message||err);
    clear(pageEl);
    // Never show ×: attempt Hafs fallback so users on slow networks see
    // readable text immediately instead of a perpetual shimmer skeleton.
    // Mark the page so tapping it re-queues the proper font load.
    try{
      var _ef=_buildHafsFallbackFrag([],pageNum);
      pageEl.classList.add('mushaf-page-hafs-fallback');
      pageEl.appendChild(_ef);
      if(err&&err.message==='page_timeout'){
        // Tapping any timed-out page re-queues it for proper font load
        pageEl.dataset.retryOnTap='1';
        var _retryOnce=function(){
          if(!pageEl.dataset.retryOnTap)return;
          delete pageEl.dataset.retryOnTap;
          delete pageEl.dataset.loaded;
          clear(pageEl);
          pageEl.appendChild(_mushafSkeleton());
          loadMushafPageQCF(pageEl,pageNum).catch(function(){});
        };
        pageEl.addEventListener('click',_retryOnce,{once:true});
      }
    }catch(e2){pageEl.appendChild(el('div','mushaf-page-ph','—'));}
  });
}

/* ===== RENDER AYAHS ===== */
function renderAyahs(surahNum,scrollTo){
  var list=$('ayahList');
  var s=SURAHS[surahNum-1];
  if(!s)return;

  // Glyph font mode: fetch per-page word codes from API
  var glyphMode=(S.readerFont==='qpcv2'||S.readerFont==='v4tajweed');
  if(glyphMode&&!S.glyphVerses[surahNum]){
    var _isV4=S.readerFont==='v4tajweed';
    var _gkey='rfGlyph_'+(_isV4?'v4':'v2')+'_'+surahNum;
    var _gc=null;try{_gc=JSON.parse(localStorage.getItem(_gkey));}catch(e){}
    if(_gc){S.glyphVerses[surahNum]=_gc;}
    else{
      // In-flight dedup: if already fetching for this surah+font, wait for it
      S.glyphFetching=S.glyphFetching||{};
      if(S.glyphFetching[_gkey])return;
      S.glyphFetching[_gkey]=true;
      // Keep existing list content visible while loading — don't clear.
      // Only show spinner when list is actually empty.
      var _hadContent=list.hasChildNodes();
      if(!_hadContent){
        var sp=el('div','prayer-status');sp.textContent=t('prayer.loading')||'تەماشەکرن...';
        list.appendChild(sp);
      }
      var _gctrl=new AbortController();
      var _gtid=setTimeout(function(){_gctrl.abort();},_sn.ms(12000,22000));
      fetch('https://api.quran.com/api/v4/verses/by_chapter/'+surahNum+'?words=true&word_fields=code_v2,page_number,char_type_name&per_page=300'+(_isV4?'&mushaf=19':''),{signal:_gctrl.signal})
        .then(function(r){clearTimeout(_gtid);return r.json();})
        .then(function(d){
          delete S.glyphFetching[_gkey];
          var vs=d.verses||[];
          S.glyphVerses[surahNum]=vs;
          try{localStorage.setItem(_gkey,JSON.stringify(vs));}catch(e){}
          if(S.surah!==surahNum)return; // user navigated away — discard
          renderAyahs(surahNum,scrollTo);
        })
        .catch(function(){
          delete S.glyphFetching[_gkey];
          clearTimeout(_gtid);
          if(S.surah!==surahNum)return;
          if(!_hadContent){
            clear(list);
            var e2=el('div','prayer-status prayer-error');e2.textContent=t('prayer.error')||'هەلە — دووباره هەوڵبدە';list.appendChild(e2);
          }
          // If list already had content, keep it — silent fail is better than blank screen
        });
      return;
    }
  }

  // Data is ready — clear and render
  clear(list);
  list.scrollTop=0; // reset scroll after clear, not before

  // Inject per-page fonts upfront when in glyph mode
  if(glyphMode&&S.glyphVerses[surahNum]){
    var _pages={};
    S.glyphVerses[surahNum].forEach(function(v){(v.words||[]).forEach(function(w){if(w.page_number)_pages[w.page_number]=true;});});
    Object.keys(_pages).forEach(function(pn){
      if(S.readerFont==='v4tajweed')injectQCFV4Font(+pn);else injectQCFV2Font(+pn);
    });
  }

  var ayahs=[];
  if(S.quranData){
    // quran.json format: object with string keys {"1":[...],"2":[...]}
    var surahData=S.quranData[String(surahNum)];
    if(surahData){
      var verses=surahData.verses||surahData;
      if(Array.isArray(verses)){
        ayahs=verses;
      }
    }
  }

  var tafsirs={};
  if(S.tafsirData){
    var td=S.tafsirData[surahNum-1]||S.tafsirData[String(surahNum)];
    if(td){
      var tv=td.verses||td;
      if(Array.isArray(tv)){
        tv.forEach(function(v,i){
          var vNum=v.verse||v.ayah||(i+1);
          tafsirs[vNum]=v.text||v.tafsir||v;
        });
      } else if(typeof tv==='object'){
        Object.keys(tv).forEach(function(k){tafsirs[k]=tv[k].text||tv[k].tafsir||tv[k]});
      }
    }
  }


  // bmSet removed — buildCard calls isBookmarked() directly (O(1), no storage read)

  // Read active position mark for this surah (used in buildCard + to restore timer)
  var _markState=null;
  try{var _mk=JSON.parse(localStorage.getItem('ayahMark'));if(_mk&&_mk.surah===surahNum&&_mk.expiresAt>Date.now())_markState=_mk;}catch(e){}

  var total=ayahs.length||s.a;

  // Surah header
  var hdr=el('div','surah-reader-header');
  // Giant faded number as background watermark
  hdr.appendChild(el('div','surah-reader-num-bg no-kurdish-convert',toArabicNum(surahNum)));
  // Calligraphy name
  var _rn=document.createElement('div');
  _rn.className='surah-reader-name no-kurdish-convert';
  var _rnglyph='surah'+String(surahNum).padStart(3,'0');
  _rn.dataset.glyph=_rnglyph;
  _rn.textContent=_surahNameV2FontReady?_rnglyph:(s.ar||'');
  hdr.appendChild(_rn);
  // Bismillah
  if(surahNum!==1&&surahNum!==9){
    hdr.appendChild(el('div','surah-reader-bismillah','بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'));
  }
  list.appendChild(hdr);

  // Single delegated click handler — added once ever (list is a persistent element)
  if(!list._clickSetup){
    list._clickSetup=true;
    list.addEventListener('click',function(e){
      var plBtn=e.target.closest('[data-play]');
      var bmBtn=e.target.closest('[data-bm]');
      var cpBtn=e.target.closest('[data-cp]');
      var wgtBtn=e.target.closest('[data-wgt]');
      if(plBtn){
        var an=+plBtn.dataset.play;
        haptic([8]);
        if(S.audio.playing&&S.audio.surah===S.surah&&S.audio.ayah===an){App.audioToggle();}
        else{playAyah(S.surah,an);}
      }
      if(bmBtn){
        var an2=+bmBtn.dataset.bm;
        var added=toggleBookmark(S.surah,an2);
        // Surgical update — toggle classes on this card only, no re-render
        var bCard=bmBtn.closest('.ayah-card');
        if(bCard)bCard.classList.toggle('bookmarked',added);
        bmBtn.classList.toggle('active',added);
      }
      if(cpBtn){App.openCopyModal(S.surah,+cpBtn.dataset.cp);}
      if(wgtBtn){pushAyahToWidget(S.surah,+wgtBtn.dataset.wgt);}
    });
  }

  // Hold detection via 400ms timer in touchstart (fires before touchend/touchcancel).
  // This is reliable on Android WebView where long-press triggers touchcancel, not touchend.
  if(!list._markSetup){
    list._markSetup=true;
    var _lpTimer=null,_lpCard=null,_lpX=0,_lpY=0;
    list.addEventListener('touchstart',function(e){
      var mc=e.target.closest('.ayah-card');
      if(!mc||e.target.closest('[data-play],[data-bm],[data-cp],[data-wgt]'))return;
      _lpCard=mc;_lpX=e.touches[0].clientX;_lpY=e.touches[0].clientY;
      _tapStartMs=Date.now();_tapMoved=false;
      mc.classList.add('ayah-card--pressing');
      clearTimeout(_lpTimer);
      _lpTimer=setTimeout(function(){
        if(!_lpCard)return;
        var c=_lpCard;_lpCard=null;
        c.classList.remove('ayah-card--pressing');
        _ayahMarkLpAt=Date.now();
        _setAyahMark(S.surah,+c.dataset.ayah);
      },1000);
    },{passive:true});
    list.addEventListener('touchmove',function(e){
      if(!_lpCard)return;
      var dx=e.touches[0].clientX-_lpX,dy=e.touches[0].clientY-_lpY;
      var dist2=dx*dx+dy*dy;
      if(dist2>36)_tapMoved=true; // ≥6px movement — will block tap highlight in onclick
      if(dist2>80){clearTimeout(_lpTimer);_lpTimer=null;_lpCard.classList.remove('ayah-card--pressing');_lpCard=null;}
    },{passive:true});
    list.addEventListener('touchend',function(){
      clearTimeout(_lpTimer);_lpTimer=null;
      if(_lpCard){_lpCard.classList.remove('ayah-card--pressing');_lpCard=null;}
    },{passive:true});
    list.addEventListener('touchcancel',function(){
      clearTimeout(_lpTimer);_lpTimer=null;
      if(_lpCard){_lpCard.classList.remove('ayah-card--pressing');_lpCard=null;}
    },{passive:true});
    list.addEventListener('contextmenu',function(e){if(e.target.closest('.ayah-card'))e.preventDefault();});
  }

  // Nav buttons (always at bottom — batches insert before them)
  var nav=el('div','surah-nav');
  var prevBtn=el('button','surah-nav-btn');
  prevBtn.appendChild(icon('fas fa-arrow-right'));
  prevBtn.appendChild(document.createTextNode(' '+t('reader.prev_surah')));
  if(surahNum<=1)prevBtn.disabled=true;
  on(prevBtn,'click',function(){App.openSurah(surahNum-1)});
  nav.appendChild(prevBtn);
  var nextBtn=el('button','surah-nav-btn');
  nextBtn.appendChild(document.createTextNode(t('reader.next_surah')+' '));
  nextBtn.appendChild(icon('fas fa-arrow-left'));
  if(surahNum>=114)nextBtn.disabled=true;
  on(nextBtn,'click',function(){App.openSurah(surahNum+1)});
  nav.appendChild(nextBtn);
  list.appendChild(nav);

  // Batch rendering — keeps DOM small for smooth scroll
  var BATCH=25;
  var _renderedTo=0;
  var _sentinel=null;
  var _sentinelObs=null;

  function buildCard(ayahNum){
    var card=el('div','ayah-card');
    if(isBookmarked(surahNum,ayahNum))card.classList.add('bookmarked');
    if(_markState&&_markState.ayah===ayahNum)card.classList.add('ayah-card--marked');
    card.dataset.ayah=String(ayahNum);
    var head=el('div','ayah-head');
    head.appendChild(el('div','ayah-badge',String(ayahNum)));
    var actions=el('div','ayah-actions');
    var isPlayingThis=S.audio.playing&&S.audio.surah===surahNum&&S.audio.ayah===ayahNum;
    var playBtn=el('button','ayah-act'+(isPlayingThis?' playing':''));
    playBtn.dataset.play=String(ayahNum);
    playBtn.appendChild(icon(isPlayingThis?'fas fa-pause':'fas fa-play'));
    actions.appendChild(playBtn);
    var bmBtn=el('button','ayah-act'+(isBookmarked(surahNum,ayahNum)?' active':''));
    bmBtn.dataset.bm=String(ayahNum);
    bmBtn.appendChild(icon('fas fa-bookmark'));
    actions.appendChild(bmBtn);
    var copyBtn=el('button','ayah-act');
    copyBtn.dataset.cp=String(ayahNum);
    copyBtn.appendChild(icon('fas fa-copy'));
    actions.appendChild(copyBtn);
    // Widget button — iOS only (Android has no widget support)
    var _isIOS=window.Capacitor&&typeof Capacitor.getPlatform==='function'&&Capacitor.getPlatform()==='ios';
    if(_isIOS){
      var wgtBtn=el('button','ayah-act');
      wgtBtn.dataset.wgt=String(ayahNum);
      wgtBtn.appendChild(icon('fas fa-star'));
      actions.appendChild(wgtBtn);
    }
    head.appendChild(actions);
    card.appendChild(head);
    var arabic=el('div','ayah-arabic');
    if(glyphMode&&S.glyphVerses[surahNum]&&S.glyphVerses[surahNum][ayahNum-1]){
      var _isV4g=S.readerFont==='v4tajweed';
      var _vd=S.glyphVerses[surahNum][ayahNum-1];
      // Show normal Hafs text immediately — no blank box while glyph font loads
      arabic.textContent=ayahs[ayahNum-1]?(ayahs[ayahNum-1].text||ayahs[ayahNum-1]):'';
      // Build glyph spans in detached container
      var _glyphDiv=document.createElement('div');
      _glyphDiv.style.wordSpacing='normal';
      var _pageNums=[],_curPg=null,_curCodes=[];
      var _flush=function(pg,codes){
        if(!codes.length)return;
        if(_pageNums.indexOf(pg)<0)_pageNums.push(pg);
        var sp=document.createElement('span');
        sp.style.fontFamily=_isV4g?"'QCFv4p"+pg+"',serif":"'QCFv2p"+pg+"',serif";
        sp.textContent=codes.join('\u200c');
        _glyphDiv.appendChild(sp);
      };
      (_vd.words||[]).forEach(function(w){
        if(!w.code_v2||w.char_type_name==='end')return;
        if(w.page_number!==_curPg){if(_curPg!==null)_flush(_curPg,_curCodes);_curPg=w.page_number;_curCodes=[w.code_v2];}
        else{_curCodes.push(w.code_v2);}
      });
      if(_curPg!==null)_flush(_curPg,_curCodes);
      // Swap to glyphs once all page fonts are loaded
      if(_pageNums.length&&document.fonts){
        var _fp=_isV4g?'QCFv4p':'QCFv2p';
        Promise.all(_pageNums.map(function(pg){return document.fonts.load("1em '"+_fp+pg+"'");}))
          .then(function(){
            arabic.textContent='';
            arabic.style.wordSpacing='normal';
            while(_glyphDiv.firstChild)arabic.appendChild(_glyphDiv.firstChild);
          }).catch(function(){});
      }else{
        arabic.textContent='';
        arabic.style.wordSpacing='normal';
        while(_glyphDiv.firstChild)arabic.appendChild(_glyphDiv.firstChild);
      }
    }else{
      arabic.textContent=ayahs[ayahNum-1]?(ayahs[ayahNum-1].text||ayahs[ayahNum-1]):'';
    }
    card.appendChild(arabic);
    if(tafsirs[ayahNum]&&S.showTafsir){
      var taf=el('div','ayah-tafsir');
      taf.textContent=typeof tafsirs[ayahNum]==='string'?tafsirs[ayahNum]:'';
      card.appendChild(taf);
    }
    // Tap to mark: per-card onclick avoids stacking across renderAyahs calls.
    // Guards: skip action buttons; skip if long-press just fired; skip if touch
    // was too quick (<120ms) or moved ≥6px (likely a scroll or accidental graze).
    card.onclick=function(e){
      if(e.target.closest('[data-play],[data-bm],[data-cp],[data-wgt]'))return;
      if(Date.now()-_ayahMarkLpAt<700)return;  // suppress post-long-press click
      if(_tapMoved)return;                      // touch moved — was a scroll
      if(Date.now()-_tapStartMs<120)return;     // too quick — accidental graze
      _setAyahMark(surahNum,ayahNum);
    };
    return card;
  }

  function setupSentinel(){
    if(_renderedTo>=total)return;
    _sentinel=document.createElement('div');
    _sentinel.className='ayah-load-sentinel';
    list.insertBefore(_sentinel,nav);
    _sentinelObs=new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting){
        _sentinelObs.disconnect();_sentinelObs=null;
        if(_sentinel&&_sentinel.parentNode)_sentinel.parentNode.removeChild(_sentinel);_sentinel=null;
        appendBatch(_renderedTo+1,_renderedTo+BATCH,false);
      }
    },{root:$('ayahList'),rootMargin:'500px'});
    _sentinelObs.observe(_sentinel);
  }

  function appendBatch(from,to,sync,onTarget,targetAyah){
    var end=Math.min(to,total);
    if(sync===false){
      // rAF staggered: 12 cards per frame for subsequent batches
      var SUB=12,cur=from;
      (function renderFrame(){
        if(S.surah!==surahNum||!nav.parentNode)return; // surah changed while rendering — bail
        var frameEnd=Math.min(cur+SUB-1,end);
        var frag=document.createDocumentFragment();
        for(var i=cur;i<=frameEnd;i++){var c=buildCard(i);if(window._onNewAyahCard)window._onNewAyahCard(c);frag.appendChild(c);}
        list.insertBefore(frag,nav);
        // Fire scroll callback the frame the target card lands in DOM
        if(onTarget&&targetAyah&&frameEnd>=targetAyah){var cb=onTarget;onTarget=null;cb();}
        cur=frameEnd+1;
        if(cur<=end&&!document.hidden)requestAnimationFrame(renderFrame);
        else if(cur<=end){setTimeout(function(){if(!document.hidden)requestAnimationFrame(renderFrame);},200);}
        else{_renderedTo=end;setupSentinel();if(onTarget){onTarget=null;}}
      })();
    }else{
      // Synchronous for first batch — fast initial render
      var frag=document.createDocumentFragment();
      for(var i=from;i<=end;i++){var c=buildCard(i);if(window._onNewAyahCard)window._onNewAyahCard(c);frag.appendChild(c);}
      _renderedTo=end;
      list.insertBefore(frag,nav);
      setupSentinel();
    }
  }

  // Always sync-render only the first BATCH — never block main thread on large surahs
  appendBatch(1,BATCH,true);
  // Restore any active playback highlight state onto the freshly-rendered cards
  requestAnimationFrame(_hlRestoreAll);

  // Progress
  updateProgress(list,total);

  // Restore position mark timer if there's an active mark for this surah
  if(_markState){
    clearTimeout(_ayahMarkTimer);
    var _remaining=_markState.expiresAt-Date.now();
    _ayahMarkTimer=setTimeout(function(){
      var c=document.querySelector('.ayah-card--marked');
      if(c)c.classList.remove('ayah-card--marked');
      localStorage.removeItem('ayahMark');
    },_remaining);
  }

  // Jump to target ayah — instant scroll, no smooth animation
  if(scrollTo&&scrollTo>1){
    var _jumpDone=false;
    function _jumpScroll(){
      if(_jumpDone)return;_jumpDone=true;
      var card=list.querySelector('[data-ayah="'+scrollTo+'"]');
      if(!card)return;
      var lRect=list.getBoundingClientRect();
      var cRect=card.getBoundingClientRect();
      list.scrollTop+=cRect.top-lRect.top-Math.max(0,(list.clientHeight-cRect.height)/2);
    }
    if(scrollTo<=BATCH){
      // Card already in DOM — scroll next frame
      requestAnimationFrame(_jumpScroll);
    }else{
      // Render cards up to target async (rAF-batched), scroll the moment target lands
      appendBatch(BATCH+1,scrollTo+3,false,_jumpScroll,scrollTo);
    }
  }
}

// Track active progress listener so we can clean up on surah switch
var _progressCleanup=null;
// Track mushaf lazy-load observer so we can disconnect on re-render
var _mushafLazyObs=null;

// ── Mushaf render queue — same memory-safe architecture as PDF reader ─────────
// Without this, IntersectionObserver fires loadMushafPageQCF for every page
// entering the extended viewport during fast scroll with no concurrency cap,
// and all loaded pages stay in DOM forever (font resources + many DOM nodes
// per page accumulate until the WKWebView process is killed on low-end devices).
var _mqRQ=[];          // pending: [{pe, n, errFn}]
var _mqActive=0;       // currently loading count
var _mqLoadedPages=[]; // page numbers in DOM — used for eviction targeting
var _mqInFlight=[];    // page numbers mid-load — eviction skips these
var _mqScrolling=false,_mqScrollTimer=null;
var _mqScrollEl=null,_mqScrollFn=null;
var MAX_MQ=2,MAX_MQ_KEPT=10; // 10 pages × ~300 DOM nodes × ~50KB font each

// Evict pages farthest from anchor, preserving slot heights to avoid scroll jump
function _mqEvictFar(anchor){
  var max=document.documentElement.classList.contains('perf-critical')?6:MAX_MQ_KEPT;
  if(_mqLoadedPages.length<=max)return;
  var view=$('mushafView');
  while(_mqLoadedPages.length>max){
    var fIdx=0;
    for(var ei=1;ei<_mqLoadedPages.length;ei++){
      if(Math.abs(_mqLoadedPages[ei]-anchor)>Math.abs(_mqLoadedPages[fIdx]-anchor))fIdx=ei;
    }
    var evP=_mqLoadedPages.splice(fIdx,1)[0];
    if(_mqInFlight.indexOf(evP)>=0)continue; // in-flight: load already paid for, keep
    var evEl=view&&view.querySelector('.mushaf-text-page[data-page="'+evP+'"]');
    if(!evEl)continue;
    // Capture rendered height BEFORE clearing — prevents scroll jump when slot empties
    var h=evEl.offsetHeight;
    if(h>0)evEl.style.minHeight=h+'px';
    // Remove segment references belonging to this page from the global verse index
    try{
      var vksRaw=evEl.dataset.verseKeys;
      if(vksRaw){
        JSON.parse(vksRaw).forEach(function(k){
          if(window._mushafVerseElements&&window._mushafVerseElements[k]){
            var kept=window._mushafVerseElements[k].filter(function(s){return !evEl.contains(s);});
            if(kept.length)window._mushafVerseElements[k]=kept;
            else delete window._mushafVerseElements[k];
          }
        });
      }
    }catch(e){}
    clear(evEl);
    evEl.classList.remove('mushaf-page-hafs-fallback');
    delete evEl.dataset.loaded;
    delete evEl.dataset.verses;
    delete evEl.dataset.verseKeys;
    delete evEl.dataset.retryOnTap;
    // Re-observe so page re-renders when user scrolls back to it
    if(_mushafLazyObs)_mushafLazyObs.observe(evEl);
  }
}

function _drainMQ(){
  if(_mqScrolling)return;
  while(_mqActive<MAX_MQ&&_mqRQ.length>0){
    var task=_mqRQ.shift();
    if(!task||task.pe.dataset.loaded)continue;
    task.pe.dataset.loaded='1';
    if(_mushafLazyObs)_mushafLazyObs.unobserve(task.pe);
    if(!task.pe.firstChild)task.pe.appendChild(_mushafSkeleton());
    _mqActive++;
    _mqInFlight.push(task.n);
    (function(tk){
      loadMushafPageQCF(tk.pe,tk.n)
        .then(function(){
          var fi=_mqInFlight.indexOf(tk.n);if(fi>=0)_mqInFlight.splice(fi,1);
          if(_mqLoadedPages.indexOf(tk.n)<0)_mqLoadedPages.push(tk.n);
          _mqEvictFar(tk.n);
        })
        .catch(function(){
          var fi=_mqInFlight.indexOf(tk.n);if(fi>=0)_mqInFlight.splice(fi,1);
          if(tk.errFn)try{tk.errFn(tk.pe);}catch(e){}
        })
        .then(function(){_mqActive=Math.max(0,_mqActive-1);_drainMQ();});
    })(task);
  }
}

function _mqEnqueue(pe,n,errFn){
  if(!pe||pe.dataset.loaded)return;
  for(var qi=_mqRQ.length-1;qi>=0;qi--){if(_mqRQ[qi].pe===pe)_mqRQ.splice(qi,1);}
  _mqRQ.push({pe:pe,n:n,errFn:errFn||null});
  if(_mqRQ.length>12)_mqRQ.splice(0,_mqRQ.length-12); // cap: fast scroll can't build unbounded backlog
  _drainMQ();
}

function _mqReset(){
  _mqRQ=[];_mqActive=0;_mqLoadedPages=[];_mqInFlight=[];
  clearTimeout(_mqScrollTimer);_mqScrolling=false;
  if(_mqScrollEl&&_mqScrollFn){
    try{_mqScrollEl.removeEventListener('scroll',_mqScrollFn);}catch(e){}
    _mqScrollEl=null;_mqScrollFn=null;
  }
}

// RAF-based smooth scroll for mushaf — ease-out-cubic, self-cancelling.
// Avoids browser smooth-scroll which jank on iOS WebView (300-800ms lag).
var _mushafScrollAnim=null;
function _mushafSmoothScrollTo(view,targetTop,duration){
  if(_mushafScrollAnim){_mushafScrollAnim.cancelled=true;}
  targetTop=Math.max(0,Math.round(targetTop));
  var startTop=view.scrollTop;
  var delta=targetTop-startTop;
  if(Math.abs(delta)<2){return;}
  var anim={cancelled:false};
  _mushafScrollAnim=anim;
  var t0=null;
  function step(ts){
    if(anim.cancelled)return;
    if(!t0)t0=ts;
    var prog=Math.min((ts-t0)/duration,1);
    var ease=1-Math.pow(1-prog,3); // ease-out-cubic — fast start, gentle landing
    view.scrollTop=startTop+delta*ease;
    if(prog<1)requestAnimationFrame(step);
    else _mushafScrollAnim=null;
  }
  requestAnimationFrame(step);
}
// Ayah position marker — 2-minute highlight so user knows where they are
var _ayahMarkTimer=null;
var _ayahMarkLpAt=0;  // timestamp of last long-press mark, to suppress following click event
var _tapStartMs=0;    // touchstart timestamp — used to require minimum hold duration for tap highlight
var _tapMoved=false;  // true if touch moved ≥6px — prevents scroll from triggering highlight
function _setAyahMark(surahNum,ayahNum){
  clearTimeout(_ayahMarkTimer);
  // Remove existing highlight
  var prev=document.querySelector('.ayah-card--marked');
  if(prev)prev.classList.remove('ayah-card--marked');
  // Toggle off if tapping the same already-marked ayah
  var cur=null;
  try{cur=JSON.parse(localStorage.getItem('ayahMark'));}catch(e){}
  if(cur&&cur.surah===surahNum&&cur.ayah===ayahNum&&cur.expiresAt>Date.now()){
    localStorage.removeItem('ayahMark');
    return;
  }
  // Set new mark
  var expiresAt=Date.now()+2*60*1000;
  try{localStorage.setItem('ayahMark',JSON.stringify({surah:surahNum,ayah:ayahNum,expiresAt:expiresAt}));}catch(e){}
  var card=document.querySelector('.ayah-card[data-ayah="'+ayahNum+'"]');
  if(card)card.classList.add('ayah-card--marked');
  haptic([8]);
  _ayahMarkTimer=setTimeout(function(){
    var c=document.querySelector('.ayah-card--marked');
    if(c)c.classList.remove('ayah-card--marked');
    localStorage.removeItem('ayahMark');
  },expiresAt-Date.now());
}

function updateProgress(list,total){
  window._onNewAyahCard=null; // clear immediately so old hook can't fire on new surah's cards
  if(_progressCleanup){_progressCleanup();_progressCleanup=null}

  var progressEl=document.querySelector('.sticky-progress');
  var surahId=S.surah;
  var scrollEl=$('ayahList');
  var saveTimer=null;
  var destroyed=false;

  // Always show progress bar
  if(progressEl)progressEl.style.display='';

  // One-time migration: clear all old incorrectly-saved progress data
  if(localStorage.getItem('surah_progress_ver')!=='10'){
    var _pk=[];for(var _pi=0;_pi<localStorage.length;_pi++){var _k=localStorage.key(_pi);if(_k)_pk.push(_k);}
    _pk.forEach(function(k){if(k.indexOf('surah_progress_')===0||k.indexOf('surah_read_')===0)localStorage.removeItem(k);});
    localStorage.setItem('surah_progress_ver','10');
  }

  // Progress = highest ayah number that's been visible on screen.
  // Scroll to ayah 1 → 1/total. Scroll further → count increases naturally.
  var maxSeen=0;
  try{
    var saved=parseInt(localStorage.getItem('surah_read_v3_'+surahId))||0;
    if(saved>=1&&saved<=total)maxSeen=saved;
  }catch(e){}

  var _rafPending=false;
  function updateHeader(){
    if(destroyed||S.surah!==surahId)return;
    if(_rafPending)return;
    _rafPending=true;
    requestAnimationFrame(function(){
      _rafPending=false;
      if(destroyed||S.surah!==surahId)return;
      if(maxSeen>0){try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:maxSeen}))}catch(e){}}
      var pct=Math.min(100,Math.round(maxSeen/total*100));
      $('readerProgressFill').style.width=pct+'%';
      $('readerAyahLabel').textContent=maxSeen+'/'+total+' '+t('reader.ayah');
      $('readerPct').textContent=pct+'%';
    });
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      if(destroyed||S.surah!==surahId)return;
      try{localStorage.setItem('surah_read_v3_'+surahId,String(maxSeen))}catch(e){}
      try{localStorage.setItem('surah_scroll_'+surahId,String(scrollEl.scrollTop))}catch(e){}
      debouncedSync();
    },300);
  }

  // Show saved progress on open
  if(maxSeen>0)updateHeader();

  // IntersectionObserver: browser tracks visibility natively — zero reflow, zero polling
  var _ioProgress=new IntersectionObserver(function(entries){
    if(destroyed||S.surah!==surahId)return;
    var highest=maxSeen;
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      var idx=parseInt(entry.target.dataset.ayah)||0;
      if(idx&&idx<=total&&idx>highest)highest=idx;
    });
    if(highest>maxSeen){
      var prevMax=maxSeen;
      maxSeen=highest;
      for(var _av=prevMax+1;_av<=maxSeen;_av++){trackVerse(surahId,_av);}
      updateHeader();
      scheduleSave();
    }
  },{root:scrollEl,threshold:0.1});

  // Observe cards already in DOM
  list.querySelectorAll('.ayah-card').forEach(function(c){_ioProgress.observe(c);});

  // New cards appended during progressive loading get observed automatically
  window._onNewAyahCard=function(c){_ioProgress.observe(c);};

  _progressCleanup=function(){
    destroyed=true;
    _ioProgress.disconnect();
    clearTimeout(saveTimer);
    window._onNewAyahCard=null;
  };
}

function updateMushafProgress(view){
  if(_progressCleanup){_progressCleanup();_progressCleanup=null;}

  var sessionSurah=S.surah; // surah that opened this mushaf session
  var destroyed=false;
  var saveTimer=null;
  var dwellTimer=null;var dwellPage=null;var retryTimer=null;
  var scrollTick=null;var initTimer=null;var periodic=null;
  var markedPages=new Set();

  // Always show the progress bar in mushaf mode
  var progressEl=document.querySelector('.sticky-progress');
  if(progressEl)progressEl.style.display='';

  // ── All-Quran totals ──────────────────────────────────────────────────────
  var _totalQ=0;SURAHS.forEach(function(s){_totalQ+=s.a;});

  // ── Per-surah seen sets, loaded lazily from localStorage ─────────────────
  var _surahSeen={}; // surahNum (int) → Set<ayahNum>
  function _getSeen(sn){
    sn=parseInt(sn);
    if(!_surahSeen[sn]){
      var s=SURAHS[sn-1];
      var set=new Set();
      if(s){try{JSON.parse(localStorage.getItem('surah_progress_'+sn)||'[]')
        .forEach(function(n){if(n>=1&&n<=s.a)set.add(n);});}catch(e){}}
      _surahSeen[sn]=set;
    }
    return _surahSeen[sn];
  }
  // ── Dirty-save tracker — saves all modified surahs in one debounced flush ─
  var _dirty=new Set();
  function scheduleSave(sn){
    _dirty.add(parseInt(sn));
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      if(destroyed)return;
      _dirty.forEach(function(dirtyS){
        var set=_getSeen(dirtyS);
        var s2=SURAHS[dirtyS-1];if(!s2)return;
        var valid=[];set.forEach(function(n){if(n>=1&&n<=s2.a)valid.push(n);});
        try{localStorage.setItem('surah_progress_'+dirtyS,JSON.stringify(valid));}catch(e){}
      });
      _dirty.clear();
      debouncedSync();
    },400);
  }

  // ── Current visible surah (updates on scroll) ─────────────────────────────
  var _currentSurah=sessionSurah;
  function _detectSurah(){
    // Find the last surah banner whose top is at/above the current scroll position
    var banners=view.querySelectorAll('.mushaf-surah-banner[data-surah]');
    if(!banners.length)return _currentSurah;
    var scrollTop=view.scrollTop;
    var best=null;var bestTop=-1;
    for(var b=0;b<banners.length;b++){
      var bTop=banners[b].offsetTop;
      if(bTop<=scrollTop+80&&bTop>bestTop){bestTop=bTop;best=banners[b];}
    }
    if(!best)best=banners[0]; // all banners below fold — show first surah
    return parseInt(best.dataset.surah)||_currentSurah;
  }

  // ── Update visible label + all-Quran bar ─────────────────────────────────
  function updateHeader(){
    if(destroyed)return;
    var dispS=_currentSurah||sessionSurah;
    var sData=SURAHS[(dispS||1)-1];
    var total=sData?sData.a:0;
    var seen=_getSeen(dispS);
    var count=Math.min(seen.size,total);

    // Ayah label = per-surah progress
    var lbl=$('readerAyahLabel');
    if(lbl)lbl.textContent=count+'/'+total+' '+t('reader.ayah');

    // Bar + % = positional all-Quran progress (cumulative ayahs up to current surah)
    var cumul=0;
    for(var ci=1;ci<=dispS;ci++){var cs=SURAHS[ci-1];if(cs)cumul+=cs.a;}
    var allPct=_totalQ>0?Math.min(100,Math.round(cumul/_totalQ*100)):0;
    var fill=$('readerProgressFill');if(fill)fill.style.width=allPct+'%';
    var pctEl=$('readerPct');if(pctEl)pctEl.textContent=allPct+'%';

    // Update lastRead
    var max=0;seen.forEach(function(n){if(n>max)max=n;});
    if(max>0){try{localStorage.setItem('lastRead',JSON.stringify({surah:dispS,ayah:max}));}catch(e){}}
  }

  // ── Mark a single ayah seen ───────────────────────────────────────────────
  function markAyahSeen(sn,vn){
    sn=parseInt(sn);vn=parseInt(vn);
    var s2=SURAHS[sn-1];if(!s2||vn<1||vn>s2.a)return false;
    var set=_getSeen(sn);
    if(set.has(vn))return false;
    set.add(vn);
    trackVerse(sn,vn);
    return true;
  }

  // ── Mark a whole page seen (uses verseKeys for multi-surah pages) ─────────
  function markPage(pageEl){
    var changed=false;var changedSurahs={};
    var vks=[];
    try{vks=JSON.parse(pageEl.dataset.verseKeys||'[]');}catch(e){}
    if(vks.length){
      vks.forEach(function(vk){
        var p=vk.split(':');
        if(markAyahSeen(p[0],p[1])){changed=true;changedSurahs[parseInt(p[0])]=true;}
      });
    } else {
      // Fallback: verseKeys not yet set (page loaded before this session started)
      var vns=[];try{vns=JSON.parse(pageEl.dataset.verses||'[]');}catch(e){}
      vns.forEach(function(vn){if(markAyahSeen(sessionSurah,vn)){changed=true;changedSurahs[sessionSurah]=true;}});
    }
    if(changed){
      updateHeader();
      Object.keys(changedSurahs).forEach(function(sn){scheduleSave(sn);});
    }
  }

  // Show saved progress immediately on open
  updateHeader();

  // ── Dwell tracking: mark page after 2.5s of dominance ───────────────────
  function visibleRatio(pageEl){
    var pr=pageEl.getBoundingClientRect();
    if(pr.right<=0||pr.left>=window.innerWidth)return 0;
    var top=Math.max(pr.top,0);
    var bot=Math.min(pr.bottom,window.innerHeight);
    return Math.max(0,bot-top)/Math.max(1,window.innerHeight);
  }

  function checkVisible(){
    if(destroyed)return;
    // Update which surah label to show
    var newSurah=_detectSurah();
    if(newSurah!==_currentSurah){_currentSurah=newSurah;updateHeader();}

    var pages=view.querySelectorAll('.mushaf-text-page');
    var bestRatio=0;var bestPage=null;
    pages.forEach(function(pageEl){
      var r=visibleRatio(pageEl);
      if(r>bestRatio){bestRatio=r;bestPage=pageEl;}
    });
    var bestPn=bestPage?bestPage.dataset.page||'0':null;
    if(dwellPage&&(dwellPage!==bestPage||bestRatio<0.3)){
      clearTimeout(dwellTimer);dwellTimer=null;dwellPage=null;
    }
    if(bestPage&&bestRatio>=0.35&&!dwellTimer&&!markedPages.has(bestPn)){
      dwellPage=bestPage;
      dwellTimer=setTimeout(function(){
        dwellTimer=null;dwellPage=null;
        if(destroyed)return;
        markedPages.add(bestPn);
        if(bestPage.dataset.verseKeys||bestPage.dataset.verses){
          markPage(bestPage);
        } else {
          retryTimer=setTimeout(function(){
            retryTimer=null;
            if(!destroyed&&(bestPage.dataset.verseKeys||bestPage.dataset.verses))markPage(bestPage);
          },2000);
        }
      },2500);
    }
  }

  var onScroll=function(){
    if(scrollTick)return;
    scrollTick=setTimeout(function(){scrollTick=null;checkVisible();},150);
  };
  window.addEventListener('scroll',onScroll,{passive:true,capture:true});
  view.addEventListener('scroll',onScroll,{passive:true});
  initTimer=setTimeout(checkVisible,500);
  periodic=setInterval(checkVisible,3000);

  _progressCleanup=function(){
    destroyed=true;
    clearTimeout(saveTimer);clearTimeout(initTimer);clearTimeout(scrollTick);
    clearTimeout(dwellTimer);clearTimeout(retryTimer);clearInterval(periodic);
    window.removeEventListener('scroll',onScroll,{capture:true});
    view.removeEventListener('scroll',onScroll);
  };
}

// Re-initialize progress tracking in-place (called when goal is created or deleted while a surah is open)
function _restartProgressTracking(){
  if(!S.surah)return;
  if(S.mushafMode){
    var mv=$('mushafView');
    if(mv)updateMushafProgress(mv);
  } else {
    var list=document.querySelector('.ayah-list');
    var s=SURAHS[(S.surah||1)-1];
    if(list&&s)updateProgress(list,s.a);
  }
}

/* ===== SIDEBAR ===== */
App.openSidebar=function(){
  haptic([8]);
  S.sidebar=true;
  $('sidebarOverlay').classList.add('on');
  $('sidebar').classList.add('on');
  renderSidebarList();
};
App.closeSidebar=function(){
  haptic([8]);
  S.sidebar=false;
  $('sidebarOverlay').classList.remove('on');
  $('sidebar').classList.remove('on');
};

/* ===== READER QUICK SETTINGS ===== */
App.openReaderSettings=function(){
  if(S.mushafMode){App.openMushafSettings();return;}
  $('qsOverlay').classList.add('on');
  var qs=$('qsSheet');
  qs.style.display='';
  qs.classList.add('on');
  // Push sheet above audio bar if it's visible
  var _ab=$('audioBar');
  var _abH=(_ab&&_ab.classList.contains('on'))?_ab.offsetHeight:0;
  qs.style.paddingBottom=_abH>0?'calc(var(--safe-b) + '+(_abH+8)+'px)':'';
  renderReaderSettings();
};
App.closeReaderSettings=function(){
  $('qsOverlay').classList.remove('on');
  var qs=$('qsSheet');
  qs.classList.remove('on');
  qs.style.display='none';
};
function applyShowTafsir(){
  document.querySelectorAll('.ayah-tafsir').forEach(function(el){
    el.classList.toggle('hide',!S.showTafsir);
  });
}
function renderReaderSettings(){
  var body=$('qsBody');
  clear(body);

  /* ---- READING ---- */
  body.appendChild(el('div','qs-section-title',t('settings.reading')||'خوێندن'));

  // Show tafsir
  var tafRow=el('div','qs-row');
  tafRow.appendChild(el('div','qs-row-label',t('settings.show_tafsir')));
  var tafToggle=el('div','toggle'+(S.showTafsir?' on':''));
  tafToggle.appendChild(el('div','toggle-knob'));
  on(tafToggle,'click',function(){
    S.showTafsir=!S.showTafsir;
    localStorage.setItem('showTafsir',String(S.showTafsir));
    tafToggle.classList.toggle('on',S.showTafsir);
    applyShowTafsir();
  });
  tafRow.appendChild(tafToggle);
  body.appendChild(tafRow);

  // Keep screen awake
  var kaRow=el('div','qs-row');
  kaRow.appendChild(el('div','qs-row-label',t('qs.screen_lock')));
  var kaToggle=el('div','toggle'+(S.keepAwake?' on':''));
  kaToggle.appendChild(el('div','toggle-knob'));
  on(kaToggle,'click',function(){
    S.keepAwake=!S.keepAwake;
    localStorage.setItem('keepAwake',String(S.keepAwake));
    kaToggle.classList.toggle('on',S.keepAwake);
    applyKeepAwake();
  });
  kaRow.appendChild(kaToggle);
  body.appendChild(kaRow);

  /* ---- ARABIC FONT ---- */
  body.appendChild(el('div','qs-section-title',t('qs.quran_font_section')));
  var rfFonts=[
    {id:'hafs',  label:'KFGQPC Hafs', family:"'KFGQPC Hafs',serif"},
    {id:'amiri', label:'Amiri Quran', family:"'Amiri Quran',serif"}
  ];
  var rfBar=el('div','qs-font-cards');
  rfFonts.forEach(function(f){
    var card=el('div','qs-font-card'+(S.readerFont===f.id?' on':''));
    var sample=el('div','qs-font-card-sample');
    sample.textContent='بِسْمِ اللَّهِ';
    sample.style.fontFamily=f.family;
    var lbl=el('div','qs-font-card-label',f.label);
    card.appendChild(sample);
    card.appendChild(lbl);
    on(card,'click',function(){
      if(S.readerFont===f.id)return;
      S.readerFont=f.id;
      S.glyphVerses={};
      localStorage.setItem('readerFont',f.id);
      applySizes();
      haptic([6]);
      if(S.surah)renderAyahs(S.surah);
      renderReaderSettings();
    });
    rfBar.appendChild(card);
  });
  body.appendChild(rfBar);

  /* ---- TEXT SIZE ---- */
  body.appendChild(el('div','qs-section-title',t('qs.text_size')));

  // Live preview box — updates in real-time because applySizes() sets CSS vars
  var prev=el('div','qs-font-preview');
  var prevAr=el('div','qs-font-preview-ar');
  prevAr.textContent='بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ';
  var prevTf=el('div','qs-font-preview-tf');
  prevTf.textContent=t('settings.quran_reading_intention');
  prev.appendChild(prevAr);prev.appendChild(prevTf);
  body.appendChild(prev);

  // Arabic font size
  var arRow=el('div','qs-row');
  arRow.appendChild(el('div','qs-row-label',t('settings.arabic_size')));
  (function(){
    var cur=S.arSize,min=1.0,max=3.5,step=0.1;
    var ctrl=el('div','setting-stepper');
    var mBtn=el('button','stepper-btn','-');var vEl=el('span','stepper-val',cur.toFixed(1));var pBtn=el('button','stepper-btn','+');
    function upd(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;cur=v;vEl.textContent=v.toFixed(1);mBtn.disabled=(v<=min);pBtn.disabled=(v>=max);S.arSize=v;applySizes();localStorage.setItem('app_arSize',String(v));}
    on(mBtn,'click',function(){haptic([6]);upd(parseFloat((cur-step).toFixed(1)));});
    on(pBtn,'click',function(){haptic([6]);upd(parseFloat((cur+step).toFixed(1)));});
    mBtn.disabled=(cur<=min);pBtn.disabled=(cur>=max);
    ctrl.appendChild(mBtn);ctrl.appendChild(vEl);ctrl.appendChild(pBtn);arRow.appendChild(ctrl);
  })();
  body.appendChild(arRow);

  // Tafsir font size
  var tfRow=el('div','qs-row');
  tfRow.appendChild(el('div','qs-row-label',t('settings.tafsir_size')));
  (function(){
    var cur=S.tfSize,min=0.5,max=2.0,step=0.1;
    var ctrl=el('div','setting-stepper');
    var mBtn=el('button','stepper-btn','-');var vEl=el('span','stepper-val',cur.toFixed(1));var pBtn=el('button','stepper-btn','+');
    function upd(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;cur=v;vEl.textContent=v.toFixed(1);mBtn.disabled=(v<=min);pBtn.disabled=(v>=max);S.tfSize=v;applySizes();localStorage.setItem('app_tfSize',String(v));}
    on(mBtn,'click',function(){haptic([6]);upd(parseFloat((cur-step).toFixed(1)));});
    on(pBtn,'click',function(){haptic([6]);upd(parseFloat((cur+step).toFixed(1)));});
    mBtn.disabled=(cur<=min);pBtn.disabled=(cur>=max);
    ctrl.appendChild(mBtn);ctrl.appendChild(vEl);ctrl.appendChild(pBtn);tfRow.appendChild(ctrl);
  })();
  body.appendChild(tfRow);

  // Line spacing
  var lhRow=el('div','qs-row');
  lhRow.appendChild(el('div','qs-row-label',t('qs.line_spacing')));
  (function(){
    var cur=S.lineH,min=1.4,max=3.5,step=0.1;
    var ctrl=el('div','setting-stepper');
    var mBtn=el('button','stepper-btn','-');var vEl=el('span','stepper-val',cur.toFixed(1));var pBtn=el('button','stepper-btn','+');
    function upd(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;cur=v;vEl.textContent=v.toFixed(1);mBtn.disabled=(v<=min);pBtn.disabled=(v>=max);S.lineH=v;applySizes();localStorage.setItem('app_lineH',String(v));}
    on(mBtn,'click',function(){haptic([6]);upd(parseFloat((cur-step).toFixed(1)));});
    on(pBtn,'click',function(){haptic([6]);upd(parseFloat((cur+step).toFixed(1)));});
    mBtn.disabled=(cur<=min);pBtn.disabled=(cur>=max);
    ctrl.appendChild(mBtn);ctrl.appendChild(vEl);ctrl.appendChild(pBtn);lhRow.appendChild(ctrl);
  })();
  body.appendChild(lhRow);

  /* ---- RECITER ---- */
  body.appendChild(el('div','qs-section-title',t('audio.reciter')||'خوێنەر'));
  var recList=el('div','qs-reciter-list');
  RECITERS.forEach(function(r){
    var chip=el('div','qs-reciter-chip'+(RECITER===r.id?' on':''));
    chip.dataset.reciterId=r.id;
    // Avatar
    var chipAvatar=el('div','qs-reciter-chip-avatar');
    var photo=RECITER_PHOTOS[r.id];
    if(photo){var img=document.createElement('img');img.src=photo;img.alt='';chipAvatar.appendChild(img);}
    else{var initials=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');chipAvatar.appendChild(el('span','qs-reciter-chip-avatar-initials',initials));}
    chip.appendChild(chipAvatar);
    chip.appendChild(document.createTextNode(r.name));
    on(chip,'click',function(){
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      if(window.AudioCache)AudioCache.cancelBg();
      updateAudioBarAvatar();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      recList.querySelectorAll('.qs-reciter-chip').forEach(function(c){c.classList.remove('on');});
      chip.classList.add('on');
    });
    recList.appendChild(chip);
  });
  body.appendChild(recList);

  /* ---- ACTIONS ---- */
  body.appendChild(el('div','qs-section-title',t('qs.actions')));

  // Jump to ayah (only when surah open)
  if(S.surah){
    var s=SURAHS[S.surah-1];
    var jumpRow=el('div','qs-jump-row');
    jumpRow.appendChild(el('div','qs-row-label',t('qs.jump_to')));
    var jumpInput=document.createElement('input');
    jumpInput.type='number';jumpInput.className='qs-jump-input';
    jumpInput.min='1';jumpInput.max=s?String(s.a):'286';jumpInput.placeholder='١';
    var jumpBtn=el('button','qs-jump-btn',t('qs.go'));
    on(jumpBtn,'click',function(){
      var n=parseInt(jumpInput.value);
      if(n>=1&&(!s||n<=s.a)){App.closeReaderSettings();scrollToAyah(n);}
    });
    on(jumpInput,'keydown',function(e){if(e.key==='Enter')jumpBtn.click();});
    jumpRow.appendChild(jumpInput);jumpRow.appendChild(jumpBtn);
    body.appendChild(jumpRow);
  }

  // Scroll to playing ayah (only when audio playing in current surah)
  if(S.audio.playing&&S.audio.surah===S.surah){
    var scrollBtn=el('button','qs-action-btn');
    scrollBtn.appendChild(icon('fas fa-headphones'));
    scrollBtn.appendChild(document.createTextNode(' '+t('qs.jump_audio')));
    on(scrollBtn,'click',function(){App.closeReaderSettings();scrollToAyah(S.audio.ayah);});
    body.appendChild(scrollBtn);
  }
}
App.sidebarTab=function(mode){
  S.sidebarMode=mode;
  document.querySelectorAll('.sidebar-tab').forEach(function(t){
    t.classList.toggle('on',t.getAttribute('data-st')===mode);
  });
  renderSidebarList();
};

function renderSidebarList(){
  var list=$('sidebarList');
  var frag=document.createDocumentFragment();
  if(S.sidebarMode==='surah'){
    SURAHS.forEach(function(s){
      var item=el('div','sidebar-item'+(S.surah===s.n?' on':''));
      item.appendChild(el('div','sidebar-item-num',String(s.n)));
      item.appendChild(el('span','',s.en+' - '+s.ar));
      on(item,'click',function(){App.closeSidebar();App.openSurah(s.n)});
      frag.appendChild(item);
    });
  } else {
    Object.keys(JUZS).forEach(function(j){
      var item=el('div','sidebar-item');
      item.appendChild(el('div','sidebar-item-num',j));
      var sn=SURAHS[JUZS[j]-1];
      item.appendChild(el('span','',t('sidebar.juz_num',{num:j})+(sn?' - '+sn.en:'')));
      on(item,'click',function(){App.closeSidebar();App.openSurah(JUZS[j])});
      frag.appendChild(item);
    });
  }
  clear(list); list.appendChild(frag);
}

/* ===== MUSHAF PLAY BUTTON ===== */
function updateMushafPlayBtn(){
  var btn=$('mushafPlayBtn');
  if(!btn)return;
  var isPlaying=S.audio.playing&&S.audio.surah===S.surah;
  clear(btn);
  btn.appendChild(icon(isPlaying?'fas fa-pause':'fas fa-play'));
}
App.mushafPlayToggle=function(){
  haptic([8]);
  if(S.audio.playing&&S.audio.surah===S.surah){
    App.audioClose();
  } else {
    playAyah(S.surah,1);
  }
};

/* ===== QURAN AUDIO HIGHLIGHT STATE MACHINE ===== */
// Tracks current/next/read state for both reader and mushaf modes.
// Only updates the elements that change — no full DOM scan per ayah.
var _hl={currentKey:null,nextKey:null,currentEls:[],nextEls:[],readMap:{}};

function _hlKey(s,a){return String(s)+':'+String(a);}

function _hlEls(key,mode){
  if(mode==='mushaf')return window._mushafVerseElements[key]||[];
  var list=$('ayahList');if(!list)return[];
  var ayah=key.split(':')[1];
  var card=list.querySelector('.ayah-card[data-ayah="'+ayah+'"]');
  return card?[card]:[];
}

function _hlSet(els,cls,add){
  for(var i=0;i<els.length;i++){if(add)els[i].classList.add(cls);else els[i].classList.remove(cls);}
}

// Called every time the playing ayah changes — updates only the diff.
function updateHighlight(surah,ayah){
  if(!surah||!ayah){clearAllHighlights();return;}
  var mode=S.mushafMode?'mushaf':'reader';
  var CC=mode==='mushaf'?'mushaf-ayah-seg--current':'quran-ayah--current';
  var NC=mode==='mushaf'?'mushaf-ayah-seg--next':'quran-ayah--next';
  var RC=mode==='mushaf'?'mushaf-ayah-seg--read':'quran-ayah--read';
  var newKey=_hlKey(surah,ayah);

  // Demote previous current → read
  if(_hl.currentKey&&_hl.currentKey!==newKey){
    _hlSet(_hl.currentEls,CC,false);
    _hlSet(_hl.currentEls,RC,true);
    if(!_hl.readMap[_hl.currentKey])_hl.readMap[_hl.currentKey]=_hl.currentEls.slice();
    // Memory cap: during very long sessions readMap can accumulate thousands of entries
    // (each referencing DOM elements). Prune when it exceeds 300 to prevent memory growth.
    var _rmKeys=Object.keys(_hl.readMap);
    if(_rmKeys.length>300){
      _rmKeys.slice(0,150).forEach(function(k){delete _hl.readMap[k];});
    }
  }

  // Retire old next if it won't become current
  if(_hl.nextKey&&_hl.nextKey!==newKey){
    _hlSet(_hl.nextEls,NC,false);
    _hl.nextKey=null;_hl.nextEls=[];
  }

  // Apply current — re-trigger animation by removing then re-adding in next frame.
  // In performance mode (body.mushaf-audio-playing) the animation is suppressed by CSS
  // so this only costs a class toggle, not a full paint cycle.
  var _hlT0=Date.now();
  var newEls=_hlEls(newKey,mode);
  _hl.currentKey=newKey;_hl.currentEls=newEls;
  _hlSet(newEls,RC,false);_hlSet(newEls,NC,false);
  _hlSet(newEls,CC,false);
  requestAnimationFrame(function(){_hlSet(newEls,CC,true);});

  // Mark next ayah as up-next — mushaf mode only
  if(mode==='mushaf'){
    var nxt=_nextAyahPos(surah,ayah);
    if(nxt){
      var nxtKey=_hlKey(nxt.surah,nxt.ayah);
      if(nxtKey!==newKey){
        var nxtEls=_hlEls(nxtKey,mode);
        _hl.nextKey=nxtKey;_hl.nextEls=nxtEls;
        _hlSet(nxtEls,RC,false);_hlSet(nxtEls,CC,false);_hlSet(nxtEls,NC,true);
      }
    }
  }

  // Mushaf: scroll to current ayah + notify tafsir sheet
  if(mode==='mushaf'){
    var view=$('mushafView');
    if(view&&S.scrollFollowsAudio){
      if(newEls.length){
        // Find the first element actually inside the mushaf view
        var _scrollTarget=null;
        for(var i=0;i<newEls.length;i++){
          if(view.contains(newEls[i])){_scrollTarget=newEls[i];break;}
        }
        if(_scrollTarget){
          // Defer to next RAF so layout reads never block audio start.
          var _scrollEl=_scrollTarget,_isPlaying=S.audio.playing;
          requestAnimationFrame(function(){
            var vr=view.getBoundingClientRect();
            var er=_scrollEl.getBoundingClientRect();
            // Safe zone: middle 64% of view — only scroll when ayah drifts outside it
            var _margin=vr.height*0.18;
            var _inSafe=(er.top>=vr.top+_margin&&er.bottom<=vr.bottom-_margin);
            if(_inSafe){return;}
            // Position ayah at 38% from top — leaves space below for next-ayah preview
            var relTop=er.top-vr.top+view.scrollTop;
            var targetTop=relTop-vr.height*0.38+er.height/2;
            _mushafSmoothScrollTo(view,targetTop,_isPlaying?220:320);
          });
        }
      } else if(S.audio.playing) {
        // Target page not loaded yet — bootstrap-scroll to estimated position so
        // the IntersectionObserver fires, loads the page, then retry finds elements.
        _scrollMushafToAyah(surah,ayah);
      }
    }
    if(window._mushafTafsirSheetUpdate)window._mushafTafsirSheetUpdate(surah,ayah);
    var _hlMs=Date.now()-_hlT0;
    if(_hlMs>4)console.log('[MushafJank] highlightMs='+_hlMs+' elCount='+newEls.length+' key='+newKey);
  }
  // Always sync performance mode class — must run for both mushaf AND reader
  // so switching mushaf→reader while audio plays correctly removes the class.
  document.body.classList.toggle('mushaf-audio-playing',!!(S.mushafMode&&S.audio.playing));
}

// Re-apply all active highlight states to elements on a newly-rendered Mushaf page.
// _mushafVerseElements is always up-to-date at this point; _hl caches may lag.
function _hlRestoreMushafPage(pageEl){
  if(!pageEl||!_hl.currentKey||!S.mushafMode)return;
  var CC='mushaf-ayah-seg--current',NC='mushaf-ayah-seg--next',RC='mushaf-ayah-seg--read';
  (window._mushafVerseElements[_hl.currentKey]||[]).forEach(function(e){
    if(pageEl.contains(e)){e.classList.add(CC);if(_hl.currentEls.indexOf(e)<0)_hl.currentEls.push(e);}
  });
  if(_hl.nextKey){
    (window._mushafVerseElements[_hl.nextKey]||[]).forEach(function(e){
      if(pageEl.contains(e)){e.classList.add(NC);if(_hl.nextEls.indexOf(e)<0)_hl.nextEls.push(e);}
    });
  }
  Object.keys(_hl.readMap).forEach(function(k){
    (window._mushafVerseElements[k]||[]).forEach(function(e){
      if(pageEl.contains(e)){e.classList.add(RC);
        if(_hl.readMap[k].indexOf(e)<0)_hl.readMap[k].push(e);}
    });
  });
}

// Strip CSS classes from DOM elements and zero element-ref arrays.
// Preserves currentKey/nextKey/readMap keys so state can be restored after DOM rebuilds.
function _hlClearDom(){
  var ALL=['mushaf-ayah-seg--current','mushaf-ayah-seg--next','mushaf-ayah-seg--read',
           'quran-ayah--current','quran-ayah--next','quran-ayah--read'];
  // Clear only tracked elements — we maintain full ref arrays so querySelectorAll
  // fallback scans are unnecessary and expensive on long reading sessions.
  var seen=(_hl.currentEls||[]).concat(_hl.nextEls||[]);
  Object.keys(_hl.readMap).forEach(function(k){seen=seen.concat(_hl.readMap[k]||[]);});
  seen.forEach(function(e){if(e&&e.classList)ALL.forEach(function(c){e.classList.remove(c);});});
  _hl.currentEls=[];_hl.nextEls=[];
  Object.keys(_hl.readMap).forEach(function(k){_hl.readMap[k]=[];});
}

// Full reset — only call when playback actually ends (audioClose, surah change, etc.)
function clearAllHighlights(){
  _hlClearDom();
  _hl.currentKey=null;_hl.nextKey=null;_hl.readMap={};
}

// Re-apply saved highlight state to current DOM without touching _hl keys.
// Called after tab switch back to Quran, after renderAyahs, after mushaf page render.
function _hlRestoreAll(){
  if(!_hl.currentKey)return; // no active audio session — nothing to restore
  var mode=S.mushafMode?'mushaf':'reader';
  if(mode==='reader'){
    var playSurah=parseInt(_hl.currentKey.split(':')[0],10);
    if(playSurah!==S.surah)return;
  }
  var CC=mode==='mushaf'?'mushaf-ayah-seg--current':'quran-ayah--current';
  var NC=mode==='mushaf'?'mushaf-ayah-seg--next':'quran-ayah--next';
  var RC=mode==='mushaf'?'mushaf-ayah-seg--read':'quran-ayah--read';
  var curEls=_hlEls(_hl.currentKey,mode);
  _hl.currentEls=curEls;_hlSet(curEls,CC,true);
  if(mode==='mushaf'&&_hl.nextKey){
    var nxtEls=_hlEls(_hl.nextKey,mode);
    _hl.nextEls=nxtEls;_hlSet(nxtEls,NC,true);
  }
  Object.keys(_hl.readMap).forEach(function(k){
    var els=_hlEls(k,mode);_hl.readMap[k]=els;_hlSet(els,RC,true);
  });
}

// Tab-switch/mode-toggle: clear DOM only — preserve state so _hlRestoreAll() can replay it
function clearMushafHighlights(){_hlClearDom();}
// Legacy alias — updateMushafHighlight(0,0) called from audioClose
function updateMushafHighlight(s,a){updateHighlight(s,a);}

// Pre-buffer the first ayah of the current surah into the audio element so
// the mushaf play button starts instantly (browser has already downloaded enough).
function _preBufferMushafAyah(){
  if(S.audio.playing)return;
  var url=audioUrl(S.surah,1);
  var localUri=(window.AudioDownloads&&AudioDownloads.getLocalUri(RECITER,S.surah,1))
              ||(window.AudioCache&&AudioCache.getLocalUri(RECITER,S.surah,1))||null;
  var slot=_pfCache[url];
  if(localUri||(slot&&slot.blob))return; // instant source already available
  if(S.audio.el.src===url)return; // already pre-buffering
  S.audio.el.src=url;
  S.audio.el.preload='auto';
}

/* ===== AUDIO ===== */
function scrollToAyah(ayahNum){
  var list=$('ayahList');
  if(!list)return;
  var cards=list.querySelectorAll('.ayah-card');
  if(cards[ayahNum-1])cards[ayahNum-1].scrollIntoView({behavior:'smooth',block:'center'});
}

var _readerPlayBtn=null; // cached — avoids querySelectorAll on every ayah change
function updateReaderPlayState(surah,ayah,playing){
  // Clear previous play button directly — no DOM scan needed
  if(_readerPlayBtn){
    _readerPlayBtn.classList.remove('playing');
    var _pi=_readerPlayBtn.querySelector('i');if(_pi)_pi.className='fas fa-play';
    _readerPlayBtn=null;
  }
  if(!playing||!surah)return;
  var list=$('ayahList');
  if(!list)return;
  var card=list.querySelector('.ayah-card[data-ayah="'+ayah+'"]');
  if(!card)return;
  var btn=card.querySelector('[data-play]');
  if(!btn)return;
  btn.classList.add('playing');
  var i=btn.querySelector('i');if(i)i.className='fas fa-pause';
  _readerPlayBtn=btn;
}

function playAyah(surah,ayah){
  if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}
  _audioNextCalled=false;
  var _t0=Date.now();
  var url=audioUrl(surah,ayah);
  // Priority 1: user-downloaded offline copy (persistent Directory.Data — never evicted)
  // Priority 2: transparent LRU cache (Directory.Cache — may be evicted by OS)
  var localUri=(window.AudioDownloads&&AudioDownloads.getLocalUri(RECITER,surah,ayah))
              ||(window.AudioCache&&AudioCache.getLocalUri(RECITER,surah,ayah))||null;
  var src;var _srcType;
  var slot=_pfCache[url];
  if(localUri){
    src=localUri;_srcType='local';
    if(slot){
      if(slot.xhr){slot.xhr.abort();}
      if(slot.blob){URL.revokeObjectURL(slot.blob);}
      delete _pfCache[url];
    }
    AudioCache.touchAccess(RECITER,surah,ayah);
  } else if(_audioBufKey===url&&_audioBuf){
    // Pre-decoded secondary buffer is ready — swap it as the main element src
    src=_audioBuf.src;_srcType='prebuf';
    _audioBuf=null;_audioBufKey=null;
    // Defer revoke: slot.blob === src, must not revoke before audio element loads it
    if(_blobToRevoke)URL.revokeObjectURL(_blobToRevoke);
    _blobToRevoke=src;
    if(slot){
      if(slot.xhr){slot.xhr.abort();}
      // slot.blob already transferred to _blobToRevoke — do NOT revoke here
      delete _pfCache[url];
    }
  } else if(slot&&slot.blob){
    src=slot.blob;_srcType='blob';
    if(_blobToRevoke)URL.revokeObjectURL(_blobToRevoke);
    _blobToRevoke=src;
    delete _pfCache[url];
  } else {
    src=url;_srcType='stream';
    if(slot&&slot.xhr){slot.xhr.abort();delete _pfCache[url];}
    // Show buffering indicator for stream path — user has to wait for network
    setAudioIcon('loading');
  }
  _lastSrcType=_srcType;
  var _nxt=_nextAyahPos(surah,ayah);
  var _gapMs=_audioGapT?Date.now()-_audioGapT:0;
  _audioGapT=0;
  var _nxtUrl=_nxt?audioUrl(_nxt.surah,_nxt.ayah):null;
  var _nxtReady=_nxtUrl&&(
    (_audioBufKey===_nxtUrl&&!!_audioBuf)||
    (!!(_pfCache[_nxtUrl]&&_pfCache[_nxtUrl].blob))
  );
  console.log('[QuranAudioPerf] current='+surah+':'+ayah
    +(_nxt?' next='+_nxt.surah+':'+_nxt.ayah:'')
    +' src='+_srcType+' preloadReady='+!!_nxtReady+' gapMs='+_gapMs);
  S.audio.surah=surah;S.audio.ayah=ayah;
  var _isBlobOrLocal=src.startsWith('blob:')||src.indexOf('://')>-1&&!src.startsWith('http');
  if(!_isBlobOrLocal&&S.audio.el.src===src&&S.audio.el.readyState>=2){
    S.audio.el.currentTime=0;
  }else{
    S.audio.el.src=src;
  }
  S.audio.el.playbackRate=S.audio.speed;
  _playStartT=Date.now();
  S.audio.el.play().catch(function(){});
  S.audio.playing=true;
  updateReaderPlayState(surah,ayah,true);
  showAudioBar();
  if(S.surah===surah&&S.scrollFollowsAudio&&!S.mushafMode)scrollToAyah(ayah);
  updateHighlight(surah,ayah);
  updateMushafPlayBtn();
  // Defer prefetch when streaming — gives audio a 600ms head start on the network
  // before competing fetches begin. Blob/prebuf paths start immediately (already cached).
  if(_srcType==='stream'){
    setTimeout(function(){prefetchAyahBlob(surah,ayah);},600);
  }else{
    prefetchAyahBlob(surah,ayah);
  }
  // Prime secondary decode buffer for the immediate next ayah (if blob already cached)
  if(_nxt)_primeNextBuffer(_nxt.surah,_nxt.ayah);
  if(window.AudioCache)AudioCache.startSurahBg(surah,ayah,RECITER);
  var _transMs=Date.now()-_t0;
  console.log('[QuranAudioPerf] transitionMs='+_transMs+' src='+_srcType+' key='+surah+':'+ayah);
}

function getReciterName(){
  for(var i=0;i<RECITERS.length;i++){if(RECITERS[i].id===RECITER)return RECITERS[i].name}
  return t('audio.reciter');
}

var _lastAvatarReciter=null;
function updateAudioBarAvatar(){
  var avatarEl=$('audioBarAvatar');
  if(!avatarEl)return;
  // Skip rebuild when reciter is unchanged and image state is settled (success or known failure)
  if(RECITER===_lastAvatarReciter&&_imgLoaded[RECITER])return;
  _lastAvatarReciter=RECITER;
  while(avatarEl.firstChild)avatarEl.removeChild(avatarEl.firstChild);
  var photo=RECITER_PHOTOS[RECITER];
  if(photo&&_imgLoaded[RECITER]===true){
    // Decoded — show instantly from browser cache
    var img=document.createElement('img');img.src=photo;img.alt='';avatarEl.appendChild(img);
  } else {
    var rec=RECITERS.find(function(r){return r.id===RECITER;});
    var ini=rec?rec.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join(''):'';
    avatarEl.appendChild(el('span','audio-bar-avatar-initials',ini));
    if(photo&&_imgLoaded[RECITER]!=='err'){
      // URL known, not yet settled — queue upgrade when it loads; onerror silences retries
      var watchId=RECITER;var watchImg=new Image();
      watchImg.onload=function(){_imgLoaded[watchId]=true;if(RECITER===watchId){_lastAvatarReciter=null;updateAudioBarAvatar();}};
      watchImg.onerror=function(){_imgLoaded[watchId]='err';};
      watchImg.src=photo;
    }
  }
}

function _syncAudioBarH(){
  var bar=$('audioBar');
  var h=(bar&&bar.classList.contains('on'))?bar.offsetHeight:0;
  document.documentElement.style.setProperty('--audio-bar-h',h+'px');
}

function showAudioBar(){
  var bar=$('audioBar');
  bar.classList.add('on');
  var s=SURAHS[S.audio.surah-1];
  $('audioTitle').textContent=s?s.ar+' - '+t('reader.ayah')+' '+S.audio.ayah:'';
  $('audioSub').textContent=getReciterName();
  setAudioIcon(S.audio.playing?'pause':'play');
  updateAudioBarAvatar();
  if(typeof _fpOpen!=='undefined'&&_fpOpen)syncFullPlayer();
  requestAnimationFrame(_syncAudioBarH);
}

App.audioToggle=function(){
  haptic([8]);
  if(S.audio.playing){
    S.audio.el.pause();S.audio.playing=false;setAudioIcon('play');updateReaderPlayState(0,0,false);
    document.body.classList.remove('mushaf-audio-playing');
  }else{
    S.audio.el.play().catch(function(){});S.audio.playing=true;setAudioIcon('pause');updateReaderPlayState(S.audio.surah,S.audio.ayah,true);
    if(S.mushafMode)document.body.classList.add('mushaf-audio-playing');
  }
};

App.audioNext=function(){
  // Handle repeat
  if(S.audio.repeatMode==='ayah'){
    S.audio.currentRepeat++;
    if(S.audio.currentRepeat<S.audio.repeatCount){
      playAyah(S.audio.surah,S.audio.ayah);return;
    }
    S.audio.currentRepeat=0;
  }
  var s=SURAHS[S.audio.surah-1];
  if(!s)return;
  if(S.audio.repeatMode==='surah'&&S.audio.ayah>=s.a){
    S.audio.currentRepeat++;
    if(S.audio.currentRepeat<S.audio.repeatCount){
      playAyah(S.audio.surah,1);return;
    }
    S.audio.currentRepeat=0;
  }
  if(S.audio.ayah<s.a){playAyah(S.audio.surah,S.audio.ayah+1)}
  else if(S.audio.surah<114&&(S.mushafMode||S.autoAdvance)){
    var _advSurah=S.audio.surah+1;
    playAyah(_advSurah,1);
    if(S.mushafMode){
      // Mushaf shows full 604-page Quran — update state and scroll, no re-render
      S.surah=_advSurah;
      _scrollMushafToAyah(_advSurah,1,0);
      updateMushafPlayBtn();
    } else if(S.tab==='quran'){
      App.openSurah(_advSurah,1);
    }
  }
  else{App.audioClose()}
};

App.audioPrev=function(){
  haptic([8]);
  S.audio.currentRepeat=0;
  if(S.audio.ayah>1){playAyah(S.audio.surah,S.audio.ayah-1)}
  else if(S.audio.surah>1){var ps=SURAHS[S.audio.surah-2];playAyah(S.audio.surah-1,ps?ps.a:1)}
};

App.audioClose=function(){
  S.audio.el.pause();S.audio.el.src='';
  // Revoke any deferred blob that never reached the playing event
  if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
  document.body.classList.remove('mushaf-audio-playing');
  S.audio.playing=false;S.audio.surah=0;S.audio.ayah=0;
  S.audio.currentRepeat=0;
  clearPrefetch();
  if(window.AudioCache)AudioCache.cancelBg();
  $('audioBar').classList.remove('on');
  requestAnimationFrame(_syncAudioBarH);
  updateReaderPlayState(0,0,false);
  clearAllHighlights();
  if(window._mushafTafsirSheetUpdate)window._mushafTafsirSheetUpdate(0,0);
  updateMushafPlayBtn();
  // Close full player and reset progress
  if(typeof App.closeFP==='function')App.closeFP();
  var bp=$('audioBarProgress');if(bp)bp.style.transform='scaleX(0)';
  var fp=$('fpProgressFill');if(fp)fp.style.transform='scaleX(0)';
};

/* ===== MUSHAF SETTINGS SHEET ===== */
App.openMushafSettings=function(){
  var existing=$('mushafSettingsSheet');
  if(existing)existing.parentNode.removeChild(existing);
  var ov=el('div','mushaf-settings-ov');
  ov.id='mushafSettingsSheet';
  var pane=el('div','mushaf-settings-pane');

  function dismiss(){pane.classList.remove('on');setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);}

  var hdr=el('div','mushaf-settings-hdr');
  hdr.appendChild(el('span','mushaf-settings-title',t('qs.mushaf_settings_title')));
  var xBtn=el('button','mushaf-settings-close');xBtn.appendChild(icon('fas fa-times'));
  on(xBtn,'click',dismiss);hdr.appendChild(xBtn);
  pane.appendChild(hdr);

  var body=el('div','mushaf-settings-body');
  // If audio bar is visible, push sheet content above it
  var _abEl=$('audioBar');
  var _abH=(_abEl&&_abEl.classList.contains('on'))?_abEl.offsetHeight:0;
  if(_abH>0)body.style.paddingBottom='calc(var(--tab-h) + var(--safe-b) + '+(_abH+20)+'px)';

  var _isIpad=document.documentElement.classList.contains('is-ipad')||window.innerWidth>=768;
  var _fsMin=_isIpad?24:23, _fsMax=_isIpad?34:25;
  var _fsKey=_isIpad?'mushafFontSize_ipad_'+S.mushafFont:'mushafFontSize_'+S.mushafFont;
  var _lhKey=_isIpad?'mushafLineH_ipad':'mushafLineH';
  var _lhMax=_isIpad?2.4:2.3;
  // Sync S values and CSS vars from the correct key for this device type
  if(_isIpad){
    var _iFs=Math.min(_fsMax,Math.max(_fsMin,parseInt(localStorage.getItem(_fsKey))||28));
    var _iLh=Math.min(_lhMax,Math.max(1.8,parseFloat(localStorage.getItem(_lhKey))||2.0));
    S.mushafFontSize=_iFs; S.mushafLineH=_iLh;
    document.documentElement.style.setProperty('--mushaf-size',_iFs+'px');
    document.documentElement.style.setProperty('--mushaf-lh',String(_iLh));
  }

  // Font Size stepper
  body.appendChild(el('div','ms-section-label',t('qs.font_size_label')));
  var fsVal=el('span','stepper-val',S.mushafFontSize+'px');
  var fsMBtn,fsPBtn;
  function setFsSize(v){
    v=Math.max(_fsMin,Math.min(_fsMax,Math.round(v)));S.mushafFontSize=v;fsVal.textContent=v+'px';
    document.documentElement.style.setProperty('--mushaf-size',v+'px');
    localStorage.setItem(_fsKey,String(v));
    if(fsMBtn)fsMBtn.disabled=(v<=_fsMin);if(fsPBtn)fsPBtn.disabled=(v>=_fsMax);
    requestAnimationFrame(function(){
      var mv=$('mushafView');
      if(mv){var pgs=mv.querySelectorAll('.mushaf-text-page[data-loaded]');for(var _i=0;_i<pgs.length;_i++)_fitQCFLines(pgs[_i]);}
    });
  }
  var fsCtrl=el('div','setting-stepper');
  fsMBtn=el('button','stepper-btn','-');fsPBtn=el('button','stepper-btn','+');
  on(fsMBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize-1);});
  on(fsPBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize+1);});
  fsMBtn.disabled=(S.mushafFontSize<=_fsMin);fsPBtn.disabled=(S.mushafFontSize>=_fsMax);
  fsCtrl.appendChild(fsMBtn);fsCtrl.appendChild(fsVal);fsCtrl.appendChild(fsPBtn);
  body.appendChild(fsCtrl);

  // Line Height stepper
  body.appendChild(el('div','ms-section-label',t('qs.line_spacing_label')));
  var lhVal=el('span','stepper-val',S.mushafLineH.toFixed(1)+'×');
  var lhCtrl=el('div','setting-stepper');
  var lhMBtn=el('button','stepper-btn','-');var lhPBtn=el('button','stepper-btn','+');
  (function(){
    var min=1.8,max=_lhMax,step=0.1;
    function updLh(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;S.mushafLineH=v;lhVal.textContent=v.toFixed(1)+'×';document.documentElement.style.setProperty('--mushaf-lh',String(v));localStorage.setItem(_lhKey,String(v));lhMBtn.disabled=(v<=min);lhPBtn.disabled=(v>=max);}
    on(lhMBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH-step).toFixed(1)));});
    on(lhPBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH+step).toFixed(1)));});
    lhMBtn.disabled=(S.mushafLineH<=min);lhPBtn.disabled=(S.mushafLineH>=max);
  })();
  lhCtrl.appendChild(lhMBtn);lhCtrl.appendChild(lhVal);lhCtrl.appendChild(lhPBtn);
  body.appendChild(lhCtrl);


  pane.appendChild(body);ov.appendChild(pane);
  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== MUSHAF TAFSIR SHEET ===== */
App.showMushafVerseTafsir=function(vn,sn){
  var existing=$('mushafTafsirSheet');
  if(existing)existing.parentNode.removeChild(existing);
  window._mushafTafsirSheetUpdate=null;

  var txt=getAyahTafsirText(sn,vn);
  var ov=el('div','mushaf-tafsir-ov');
  ov.id='mushafTafsirSheet';
  var pane=el('div','mushaf-tafsir-pane');

  function dismiss(){
    window._mushafTafsirSheetUpdate=null;
    pane.classList.remove('on');
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);
  }

  var hdr=el('div','mushaf-tafsir-hdr');
  var s=SURAHS[(sn||S.surah||1)-1];
  var titleSpan=el('span','mushaf-tafsir-title');
  var gc='surah'+String(sn||S.surah||1).padStart(3,'0');
  var snGlyph=document.createElement('span');
  snGlyph.className='no-kurdish-convert mushaf-tafsir-surah-glyph';
  snGlyph.textContent=gc;
  if(window.QuranFontManager)window.QuranFontManager.onReady('SurahName',function(ok){if(ok)snGlyph.textContent=gc;});
  titleSpan.appendChild(snGlyph);
  titleSpan.appendChild(document.createTextNode(' — '+toArabicNum(vn)));
  hdr.appendChild(titleSpan);

  // Actions: play + close grouped on one side
  var actions=el('div','mushaf-tafsir-actions');

  var playBtn=el('button','mushaf-tafsir-play');
  function _setPlayIcon(playing){
    while(playBtn.firstChild)playBtn.removeChild(playBtn.firstChild);
    playBtn.appendChild(icon(playing?'fas fa-pause':'fas fa-play'));
  }
  _setPlayIcon(S.audio.playing&&S.audio.surah===sn&&S.audio.ayah===vn);
  on(playBtn,'click',function(){
    haptic([8]);
    if(S.audio.playing&&S.audio.surah===sn&&S.audio.ayah===vn){
      App.audioToggle();
      _setPlayIcon(false);
    }else{
      playAyah(sn,vn);
      _setPlayIcon(true);
    }
  });
  actions.appendChild(playBtn);

  var closeBtn=el('button','mushaf-tafsir-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',dismiss);
  actions.appendChild(closeBtn);
  hdr.appendChild(actions);
  pane.appendChild(hdr);

  var body=el('div','mushaf-tafsir-body');
  var txtDiv=el('div',txt?'mushaf-tafsir-txt':'mushaf-tafsir-empty');
  txtDiv.textContent=txt||t('reader.tafsir_empty');
  body.appendChild(txtDiv);
  pane.appendChild(body);
  ov.appendChild(pane);

  // Live hook: updates play icon when audio advances or stops
  window._mushafTafsirSheetUpdate=function(newSurah,newAyah){
    _setPlayIcon(S.audio.playing&&newSurah===sn&&newAyah===vn);
  };

  // Pre-fetch this ayah's audio so play starts instantly
  prefetchAyahBlob(sn,vn-1);

  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== MUSHAF LINE PICKER (multi-ayah shared line) ===== */
App.showMushafLinePicker=function(ayahs){
  var existing=$('mushafPickerSheet');
  if(existing)existing.parentNode.removeChild(existing);

  var ov=el('div','mushaf-tafsir-ov');
  ov.id='mushafPickerSheet';
  var pane=el('div','mushaf-tafsir-pane');

  function dismiss(){
    pane.classList.remove('on');
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);
  }

  var hdr=el('div','mushaf-tafsir-hdr');
  hdr.appendChild(el('span','mushaf-tafsir-title',t('reader.pick_ayah')));
  var closeBtn=el('button','mushaf-tafsir-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',dismiss);
  hdr.appendChild(closeBtn);
  pane.appendChild(hdr);

  var body=el('div','mushaf-tafsir-body');
  ayahs.forEach(function(a){
    var s=SURAHS[(a.sn||1)-1];
    var label=(s?s.n:'')+' — '+t('reader.ayah')+' '+toArabicNum(a.vn);
    var btn=el('button','mushaf-picker-btn');
    btn.textContent=label;
    on(btn,'click',function(){dismiss();setTimeout(function(){App.showMushafVerseTafsir(a.vn,a.sn);},270);});
    body.appendChild(btn);
  });
  pane.appendChild(body);
  ov.appendChild(pane);

  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== COPY MODAL ===== */
App.openCopyModal=function(surah,ayah){
  S.copy.surah=surah;S.copy.ayah=ayah;
  var s=SURAHS[surah-1];
  $('copyModalTitle').textContent=(s?s.en+' — ':'')+t('reader.ayah')+' '+ayah;
  $('copyMainOpts').style.display='';
  $('copyRangeOpts').style.display='none';
  var maxAyah=s?s.a:1;
  $('copyFrom').max=maxAyah;$('copyFrom').value=ayah;
  $('copyTo').max=maxAyah;$('copyTo').value=Math.min(ayah+2,maxAyah);
  $('copyModal').classList.add('on');
};
App.closeCopyModal=function(){$('copyModal').classList.remove('on')};
App.copyShowRange=function(){$('copyMainOpts').style.display='none';$('copyRangeOpts').style.display=''};
App.copyBackToMain=function(){$('copyMainOpts').style.display='';$('copyRangeOpts').style.display='none'};
App.copyFmtSelect=function(btn,fmt){
  S.copy.rangeFmt=fmt;
  document.querySelectorAll('.copy-fmt-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
};
function getAyahTafsirText(surah,ayahNum){
  if(!S.tafsirData)return'';
  var td=S.tafsirData[surah-1]||S.tafsirData[String(surah)];if(!td)return'';
  var tv=td.verses||td;if(!Array.isArray(tv))return'';
  var v=tv[ayahNum-1];return v?(v.text||v.tafsir||String(v)||''):'';
}
function buildCopyText(surah,ayahNum,mode){
  var arabic=getAyahArabicText(surah,ayahNum);
  var tafsir=getAyahTafsirText(surah,ayahNum);
  var lines=[];
  if((mode==='both'||mode==='quran')&&arabic)lines.push(String(ayahNum)+' ﴿ '+arabic+' ﴾');
  if((mode==='both'||mode==='tafsir')&&tafsir)lines.push(tafsir);
  return lines.join('\n');
}
var COPY_FOOTER='\n\nTafsirKurd\nhttps://tafsirkurd.com/links';
App.copyDo=function(mode){
  var text=buildCopyText(S.copy.surah,S.copy.ayah,mode);
  if(!text)return;
  navigator.clipboard&&navigator.clipboard.writeText(text+COPY_FOOTER).then(function(){
    toast(t('toast.copied'));App.closeCopyModal();
  });
};
App.copyRangeDo=function(){
  var s=SURAHS[S.copy.surah-1];if(!s)return;
  var from=Math.max(1,Math.min(parseInt($('copyFrom').value)||1,s.a));
  var to=Math.max(from,Math.min(parseInt($('copyTo').value)||from,s.a));
  var mode=S.copy.rangeFmt;
  var parts=[];
  for(var i=from;i<=to;i++){var txt=buildCopyText(S.copy.surah,i,mode);if(txt)parts.push(txt);}
  if(!parts.length)return;
  navigator.clipboard&&navigator.clipboard.writeText(parts.join('\n\n')+COPY_FOOTER).then(function(){
    toast(t('toast.copied'));App.closeCopyModal();
  });
};

App.openAudioSettings=function(){
  $('audioSettingsPanel').classList.add('on');
  renderAudioSettings();
};
App.closeAudioSettings=function(){
  $('audioSettingsPanel').classList.remove('on');
};

function renderAudioSettings(){
  var body=$('audioSettingsBody');
  clear(body);

  // ── Speed section (top) ──
  body.appendChild(el('div','audio-settings-title',t('audio.speed')));
  var speedSeg=el('div','speed-seg');
  [0.5,0.75,1,1.25,1.5,2].forEach(function(sp){
    var lbl=sp+'x';
    var btn=el('button','speed-seg-btn'+(S.audio.speed===sp?' on':''),lbl);
    on(btn,'click',function(){
      S.audio.speed=sp;
      S.audio.el.playbackRate=sp;
      localStorage.setItem('app_speed',String(sp));
      renderAudioSettings();
    });
    speedSeg.appendChild(btn);
  });
  body.appendChild(speedSeg);

  // ── Reciter section ──
  body.appendChild(el('div','audio-settings-title',t('audio.reciter')));
  var recGrid=el('div','reciter-grid');
  var styleLbls={murattal:t('audio.style_murattal')||'مورتل',mujawwad:t('audio.style_mujawwad')||'مجود',hadr:t('audio.style_hadr')||'حدر'};
  RECITERS.forEach(function(r){
    var isOn=r.id===RECITER;
    var card=el('div','reciter-card'+(isOn?' on':''));

    // Avatar circle — wrap so check badge isn't clipped by overflow:hidden
    var avatarWrap=el('div','reciter-avatar-wrap');
    var avatar=el('div','reciter-avatar');
    var photo=RECITER_PHOTOS[r.id];
    if(photo){
      avatar.classList.add('skel');
      var img=document.createElement('img');
      img.alt=r.name;img.className='reciter-avatar-img';img.loading='lazy';
      img.onload=function(){avatar.classList.remove('skel');};
      img.onerror=function(){
        avatar.classList.remove('skel');
        while(avatar.firstChild)avatar.removeChild(avatar.firstChild);
        var fb=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
        avatar.appendChild(el('span','reciter-avatar-initials',fb));
      };
      img.src=photo;
      avatar.appendChild(img);
    } else {
      var initials=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
      avatar.appendChild(el('span','reciter-avatar-initials',initials));
    }
    avatarWrap.appendChild(avatar);
    if(isOn){var ckDot=el('span','reciter-avatar-check');ckDot.appendChild(el('i','fas fa-check'));avatarWrap.appendChild(ckDot);}
    card.appendChild(avatarWrap);

    // Info
    var info=el('div','reciter-card-info');
    info.appendChild(el('div','reciter-card-name',r.name));
    var meta=el('div','reciter-card-meta');
    if(r.flag)meta.appendChild(el('span','reciter-card-flag',r.flag));
    if(r.style)meta.appendChild(el('span','reciter-card-style',styleLbls[r.style]||r.style));
    info.appendChild(meta);
    card.appendChild(info);

    // Download button (right side of card — stops propagation so it doesn't select reciter)
    if(window.AudioDownloads){
      var dlBtn=el('button','reciter-dl-btn');
      var _dlSt=AudioDownloads.dlState(r.id);
      var _isDling=AudioDownloads.isDownloading(r.id);
      if(_isDling){dlBtn.classList.add('downloading');dlBtn.appendChild(icon('fas fa-spinner fa-spin'));dlBtn.title=t('dl.tip_downloading');}
      else if(_dlSt==='full'){dlBtn.classList.add('has-dl');dlBtn.appendChild(icon('fas fa-check'));dlBtn.title=t('dl.tip_downloaded');}
      else if(_dlSt==='partial'){dlBtn.classList.add('partial');dlBtn.appendChild(icon('fas fa-arrow-down'));dlBtn.title=t('dl.tip_partial');}
      else if(_dlSt==='corrupt'){dlBtn.classList.add('corrupt');dlBtn.appendChild(icon('fas fa-triangle-exclamation'));dlBtn.title=t('dl.tip_corrupt');}
      else{dlBtn.appendChild(icon('fas fa-arrow-down'));dlBtn.title=t('dl.tip_offline');}
      on(dlBtn,'click',function(e){e.stopPropagation();openDlSheet(r.id);});
      card.appendChild(dlBtn);
    }

    on(card,'click',function(){
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      updateAudioBarAvatar();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      else if(S.surah)prefetchAyahBlob(S.surah,(S.audio.ayah||1)-1);
      else showAudioBar();
      toast(r.name);
      // Update active card in-place — no full re-render, user stays in scroll position
      recGrid.querySelectorAll('.reciter-card').forEach(function(c){
        c.classList.remove('on');
        var ck=c.querySelector('.reciter-avatar-check');
        if(ck)ck.parentNode.removeChild(ck);
      });
      card.classList.add('on');
      var ckDot2=el('span','reciter-avatar-check');ckDot2.appendChild(el('i','fas fa-check'));
      avatarWrap.appendChild(ckDot2);
    });
    recGrid.appendChild(card);
  });
  body.appendChild(recGrid);
}

/* ===== DOWNLOAD SHEET ===== */
var _dlSheetOpen=false;
var _dlSheetReciter=null;
var _dlScope='full'; // 'full' | 'surah' — reset each time sheet opens

function openDlSheet(reciterId){
  if(!window.AudioDownloads)return;
  _dlSheetReciter=reciterId;
  _dlScope='full'; // reset scope to full each time sheet opens
  var sheet=$('dlSheet'),overlay=$('dlOverlay');
  if(!sheet)return;
  var rData=RECITERS.filter(function(r){return r.id===reciterId;})[0]||{name:reciterId,flag:''};
  $('dlSheetName').textContent=(rData.flag?rData.flag+' ':'')+rData.name;
  on($('dlSheetClose'),'click',closeDlSheet);
  on(overlay,'click',closeDlSheet);
  renderDlSheetBody(reciterId);
  sheet.classList.add('open');
  overlay.classList.add('on');
  _dlSheetOpen=true;
  // Probe real file sizes from everyayah.com — re-render once we have real data
  AudioDownloads.probeReciterSize(reciterId,function(bytes){
    if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);
  });
}

function closeDlSheet(){
  var sheet=$('dlSheet'),overlay=$('dlOverlay');
  if(sheet)sheet.classList.remove('open');
  if(overlay)overlay.classList.remove('on');
  _dlSheetOpen=false;
  _dlSheetReciter=null;
}

/* ===== UNIFIED DOWNLOAD MANAGER ===== */
// Shows downloaded PDF books + audio reciters in one bottom sheet.
// Accessible from: Settings → Audio section, and Books header button.
var _dlMgrOpen=false;

function openDlManager(){
  var sheet=$('dlMgrSheet'),overlay=$('dlMgrOverlay');
  if(!sheet||!overlay)return;
  _dlMgrTab='books'; // always start on books tab
  _dlMgrOpen=true;
  overlay.onclick=closeDlManager;
  $('dlMgrClose').onclick=closeDlManager;
  _renderDlMgrBody();
  sheet.classList.add('open');
  overlay.classList.add('on');
}

function closeDlManager(){
  var sheet=$('dlMgrSheet'),overlay=$('dlMgrOverlay');
  if(sheet)sheet.classList.remove('open');
  if(overlay)overlay.classList.remove('on');
  _dlMgrOpen=false;
}

function _fmtDlBytes(b){
  if(!b||b<=0)return '—';
  if(window.PdfStore&&PdfStore.fmtSize)return PdfStore.fmtSize(b);
  if(b<1024*1024)return(b/1024).toFixed(0)+' KB';
  return(b/(1024*1024)).toFixed(1)+' MB';
}

function _dlMgrSec(label,icoClass){
  var s=el('div','');
  s.style.cssText='display:flex;align-items:center;gap:6px;padding:10px 0 6px;font-size:.7rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-top:6px';
  if(icoClass){var ic=icon(icoClass);ic.style.fontSize='.65rem';s.appendChild(ic);}
  s.appendChild(document.createTextNode(label));
  return s;
}

// opts: {circular:true} for reciter avatars
function _dlMgrItem(coverUrl,flag,title,size,sub,onTap,onDelete,opts){
  var circular=!!(opts&&opts.circular);
  var row=el('div','');
  row.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle,rgba(128,128,128,.07))';

  // Thumbnail / icon
  var thSize=circular?'44px':'40px';
  var thH=circular?'44px':'52px';
  var thRadius=circular?'50%':'6px';
  var th=el('div','');
  th.style.cssText='width:'+thSize+';height:'+thH+';border-radius:'+thRadius+';overflow:hidden;flex-shrink:0;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:1.25rem';
  if(coverUrl){
    var cImg=document.createElement('img');cImg.src=coverUrl;cImg.style.cssText='width:100%;height:100%;object-fit:cover';
    cImg.onerror=function(){this.parentNode.textContent=flag||'';};th.appendChild(cImg);
  }else if(flag){th.textContent=flag;th.style.fontSize='1.4rem';}
  else{var thIco=icon('fas fa-headphones');thIco.style.cssText='color:var(--text-tertiary);font-size:.9rem';th.appendChild(thIco);}
  row.appendChild(th);

  // Info
  var info=el('div','');info.style.cssText='flex:1;min-width:0;direction:rtl';
  var tEl=el('div','');tEl.style.cssText='font-size:.88rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)';tEl.textContent=title;
  var szEl=el('div','');szEl.style.cssText='font-size:.76rem;color:var(--accent);margin-top:3px;font-variant-numeric:tabular-nums';szEl.textContent=size;
  info.appendChild(tEl);info.appendChild(szEl);
  if(sub){var subEl=el('div','');subEl.style.cssText='font-size:.74rem;color:var(--text-tertiary);margin-top:1px';subEl.textContent=sub;info.appendChild(subEl);}
  row.appendChild(info);

  // Tap chevron (for items with a detail view)
  if(onTap){
    var chv=icon('fas fa-chevron-left');chv.style.cssText='color:var(--text-tertiary);font-size:.72rem;flex-shrink:0;margin-right:4px';
    row.appendChild(chv);
    on(row,'click',function(e){if(!e.target.closest('[data-dlmgr-del]'))onTap();});
    row.style.cursor='pointer';
  }

  // Delete button
  if(onDelete){
    var delBtn=el('button','');delBtn.setAttribute('data-dlmgr-del','1');
    delBtn.style.cssText='width:34px;height:34px;border-radius:50%;background:rgba(220,50,50,.1);display:flex;align-items:center;justify-content:center;color:var(--danger,#e05);flex-shrink:0;border:none;cursor:pointer;transition:background .15s';
    var delIco=icon('fas fa-trash-alt');delIco.style.fontSize='.8rem';delBtn.appendChild(delIco);
    on(delBtn,'click',function(e){e.stopPropagation();haptic([30]);onDelete();});
    row.appendChild(delBtn);
  }
  return row;
}

var _dlMgrTab='books'; // active tab: 'books' | 'audio'

function _renderDlMgrBody(){
  var body=$('dlMgrBody');
  if(!body)return;
  clear(body);

  var sp=el('div','');sp.style.cssText='text-align:center;padding:40px;color:var(--text-tertiary)';
  sp.appendChild(icon('fas fa-circle-notch fa-spin'));body.appendChild(sp);

  var pdfP=(window.PdfStore&&PdfStore.supported())?PdfStore.listAll():Promise.resolve([]);
  pdfP.then(function(pdfCached){
    if(!_dlMgrOpen)return;
    clear(body);

    var audioAll=(window.AudioDownloads&&AudioDownloads.getAllStats)
      ?AudioDownloads.getAllStats().filter(function(r){return r.bytes>0||r.surahs>0;})
      :[];

    if(!pdfCached.length&&!audioAll.length){
      var emp=el('div','');
      emp.style.cssText='display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;color:var(--text-tertiary)';
      var empIc=icon('fas fa-cloud-download-alt');empIc.style.cssText='font-size:2.4rem;opacity:.3';emp.appendChild(empIc);
      var empT=el('div','');empT.style.cssText='font-size:.92rem;font-weight:600';empT.textContent=t('dl.nothing_downloaded')||'چ دابەزاندن نینن';emp.appendChild(empT);
      var empS=el('div','');empS.style.cssText='font-size:.78rem;opacity:.5;text-align:center;line-height:1.7;direction:rtl;max-width:220px';
      empS.textContent=t('dl.nothing_hint')||'پەرتووک و دەنگان دابەزینە بۆ خواندنا بێ ئینتەرنێت';emp.appendChild(empS);
      body.appendChild(emp);
      return;
    }

    // Auto-select the tab that has content if current tab is empty
    if(_dlMgrTab==='books'&&!pdfCached.length&&audioAll.length) _dlMgrTab='audio';
    if(_dlMgrTab==='audio'&&!audioAll.length&&pdfCached.length) _dlMgrTab='books';

    // ── Tab bar (book-cat-row pattern) ─────────────────
    var tabRow=el('div','book-cat-row');
    tabRow.style.cssText='margin:0 0 0;padding:0 4px';

    function _makeTab(key,label,count){
      var btn=el('button','book-cat-btn'+(_dlMgrTab===key?' on':''));
      btn.textContent=label+(count?' ('+count+')':'');
      on(btn,'click',function(){
        _dlMgrTab=key;
        _renderDlMgrBody();
      });
      tabRow.appendChild(btn);
    }
    if(pdfCached.length||true) _makeTab('books',t('dl.books_section')||'پەرتوکەکان',pdfCached.length);
    if(audioAll.length||true)  _makeTab('audio',t('dl.audio_section')||'دەنگ',audioAll.length);
    body.appendChild(tabRow);

    // ── Storage line (compact, below tabs) ─────────────
    var totalB=pdfCached.reduce(function(s,c){return s+c.bytes;},0)+audioAll.reduce(function(s,r){return s+r.bytes;},0);
    if(totalB>0){
      var stBar=el('div','');
      stBar.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 16px 4px;font-size:.76rem;color:var(--text-tertiary)';
      var stIc=icon('fas fa-hdd');stIc.style.cssText='color:var(--accent);font-size:.7rem';stBar.appendChild(stIc);
      stBar.appendChild(document.createTextNode((t('dl.storage_used')||'جێی بەکارهاتوو')+': '+_fmtDlBytes(totalB)));
      body.appendChild(stBar);
    }

    // ── Tab content ─────────────────────────────────────
    var content=el('div','');content.style.cssText='padding:4px 16px 8px';

    if(_dlMgrTab==='books'){
      if(!pdfCached.length){
        var noB=el('div','');noB.style.cssText='padding:32px;text-align:center;color:var(--text-tertiary);font-size:.85rem;direction:rtl';
        noB.textContent=t('dl.no_books')||'هیچ پەرتوکێک نەهاتیە داونلۆد کرن';content.appendChild(noB);
      } else {
        pdfCached.forEach(function(entry){
          var book=(window.GencineUI&&GencineUI.getBook)?GencineUI.getBook(entry.pdfUrl):null;
          var title=book?(book.title_ku||book.title_ar||entry.pdfUrl.split('/').pop()):entry.pdfUrl.split('/').pop();
          content.appendChild(_dlMgrItem(
            book?book.cover_url:null, null, title, _fmtDlBytes(entry.bytes), null, null,
            function(){
              if(!window.PdfStore)return;
              PdfStore.remove(book||{pdf_url:entry.pdfUrl}).then(function(){
                if(window.GencineUI&&GencineUI._refreshBookDlBadges)GencineUI._refreshBookDlBadges();
                if(_dlMgrOpen)_renderDlMgrBody();
                toast(t('toast.dl_removed')||'سڕایەوە');
              });
            }
          ));
        });
      }
    } else {
      if(!audioAll.length){
        var noA=el('div','');noA.style.cssText='padding:32px;text-align:center;color:var(--text-tertiary);font-size:.85rem;direction:rtl';
        noA.textContent=t('dl.no_audio')||'هیچ دەنگێک نەهاتیە داونلۆد کرن';content.appendChild(noA);
      } else {
        audioAll.forEach(function(r){
          // Real name + photo from app.js module data — avoids showing raw IDs
          var rInfo=RECITERS.filter(function(x){return x.id===r.id;})[0]||null;
          var realName=rInfo?rInfo.name:r.name;
          var flag=rInfo?(rInfo.flag||''):(r.flag||'');
          var photo=RECITER_PHOTOS[r.id]||null;
          var sub=r.surahs+'/114 '+(t('audio.surahs')||'سورەت')+(r.corrupt?' ⚠️':'');
          content.appendChild(_dlMgrItem(
            photo, flag, realName, _fmtDlBytes(r.bytes), sub,
            function(){closeDlManager();openDlSheet(r.id);},
            function(){
              AudioDownloads.deleteReciter(r.id).then(function(){
                if(_dlMgrOpen)_renderDlMgrBody();
                renderAudioSettings();
                toast(t('toast.dl_removed')||'سڕایەوە');
              });
            },
            {circular:true}
          ));
        });
      }
    }
    body.appendChild(content);
  }).catch(function(){
    if(!_dlMgrOpen)return;
    clear(body);
    var errEl=el('div','');errEl.style.cssText='padding:32px;text-align:center;color:var(--text-tertiary);font-size:.85rem';
    errEl.textContent=t('common.error')||'هەڵە ڕوویدا';body.appendChild(errEl);
  });
}

function _fmtVerifyDate(ts){
  if(!ts)return'Never';
  var d=new Date(ts);
  return d.toLocaleDateString()+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}

function _dlCbs(reciterId){
  return {
    onProgress:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},
    onDone:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);renderAudioSettings();toast(t('toast.dl_complete'));},
    onError:function(msg){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);toast(t('toast.dl_stopped')+': '+msg);},
    onCancel:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);renderAudioSettings();}
  };
}

function renderDlSheetBody(reciterId){
  var body=$('dlSheetBody');
  if(!body||!window.AudioDownloads)return;
  clear(body);

  var AD=AudioDownloads;
  var stats=AD.getStats(reciterId);
  var isDling=AD.isDownloading(reciterId);
  var prog=AD.getProgress(reciterId);
  var allSurahs=[];for(var i=1;i<=114;i++)allSurahs.push(i);
  var scopeSurahs=(_dlScope==='surah'&&S.surah)?[S.surah]:allSurahs;
  var _probed=AD._probeCached(reciterId); // null=pending, false=failed, number=real bytes
  var estBytes=AD.estimateBytes(reciterId,scopeSurahs);
  var remBytes=AD.remainingBytes(reciterId,scopeSurahs);

  // ── Scope selector (only when a surah is active) ──
  if(S.surah&&!isDling){
    var surahName2=SURAHS&&SURAHS[S.surah-1]?SURAHS[S.surah-1].n:'';
    var scopeSeg=el('div','dl-scope-seg');
    ['full','surah'].forEach(function(sc){
      var lbl2=sc==='full'?t('dl.full_quran'):'Surah '+S.surah+(surahName2?' — '+surahName2:'');
      var btn=el('button','dl-scope-btn'+(_dlScope===sc?' on':''),lbl2);
      on(btn,'click',function(){if(_dlScope!==sc){_dlScope=sc;renderDlSheetBody(reciterId);}});
      scopeSeg.appendChild(btn);
    });
    body.appendChild(scopeSeg);
  }

  // ── Wi-Fi toggle ──
  if(!isDling){
    var wifiRow=el('div','dl-wifi-row');
    wifiRow.appendChild(el('span','dl-wifi-lbl',t('dl.wifi_only')));
    var toggle=el('div','toggle'+(AD.isWifiOnly()?' on':''));
    toggle.appendChild(el('div','toggle-knob'));
    on(toggle,'click',function(){
      var next=!AD.isWifiOnly();AD.setWifiOnly(next);
      toggle.classList.toggle('on',next);
    });
    wifiRow.appendChild(toggle);
    body.appendChild(wifiRow);
  }

  // ── Determine scope state ──
  var scopeState;
  if(_dlScope==='surah'&&S.surah){
    scopeState=AD.isSurahCorrupt(reciterId,S.surah)?'corrupt':
               AD.isSurahDownloaded(reciterId,S.surah)?'full':
               (remBytes>0&&remBytes<estBytes)?'partial':'none';
  } else {
    scopeState=AD.dlState(reciterId);
  }

  // ── Corrupt warning ──
  if(scopeState==='corrupt'&&!isDling){
    var nCorrupt=_dlScope==='surah'?1:stats.needsRepair.length;
    var cBadge=el('div','dl-corrupt-badge');
    cBadge.appendChild(icon('fas fa-triangle-exclamation'));
    cBadge.appendChild(el('span','',''+nCorrupt+' '+t('dl.surah_word')+(nCorrupt!==1?'s':'')+' '+t('dl.failed_check')));
    body.appendChild(cBadge);
  }

  // ── Status row ──
  var statusRow=el('div','dl-status-row');
  var statusLbl=el('div','dl-status-lbl');
  var statusVal=el('div','dl-status-val');
  var _sizeReady=(_probed!==undefined); // false while probe in flight
  if(isDling&&prog){
    statusLbl.textContent=t('dl.downloading');
    statusVal.textContent=prog.pct+'%';
  } else if(scopeState==='full'){
    statusLbl.textContent=_dlScope==='surah'?t('dl.surah_downloaded'):t('dl.fully_downloaded');
    statusVal.textContent=AD.fmtBytes(stats.bytes);
  } else if(scopeState==='partial'){
    statusLbl.textContent=_dlScope==='surah'?t('dl.partial'):(t('dl.partial')+' ('+stats.surahs+'/114 '+t('dl.surahs')+')');
    statusVal.textContent=(_sizeReady?'':'\u2248')+AD.fmtBytes(remBytes)+' '+t('dl.left');
  } else if(scopeState==='corrupt'){
    statusLbl.textContent=t('dl.partial_issues');
    statusVal.textContent=AD.fmtBytes(stats.bytes);
  } else {
    statusLbl.textContent=t('dl.not_downloaded');
    statusVal.textContent=_sizeReady?AD.fmtBytes(estBytes):t('dl.measuring');
  }
  statusRow.appendChild(statusLbl);
  statusRow.appendChild(statusVal);
  body.appendChild(statusRow);

  // ── Progress bar ──
  if(isDling&&prog){
    var pw=el('div','dl-progress-wrap');
    var pb=el('div','dl-progress-bar');
    var pf=el('div','dl-progress-fill');
    pf.style.width=prog.pct+'%';
    pb.appendChild(pf);pw.appendChild(pb);
    var surahName3=prog.surah&&SURAHS[prog.surah-1]?SURAHS[prog.surah-1].n:'';
    pw.appendChild(el('div','dl-progress-txt','Surah '+prog.surah+(surahName3?' — '+surahName3:'')+' · '+prog.done+'/'+prog.total+' ayahs'));
    body.appendChild(pw);
    setTimeout(function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},1000);
  }

  // ── Actions ──
  if(!isDling){
    // Repair button (when corrupt)
    if(scopeState==='corrupt'){
      var repairList=(_dlScope==='surah'&&S.surah)?[S.surah]:stats.needsRepair.map(Number);
      var repBtn=el('button','dl-action-btn primary');
      repBtn.appendChild(icon('fas fa-wrench'));
      repBtn.appendChild(document.createTextNode(' '+t('dl.repair')+' ('+repairList.length+' '+t('dl.surah_word')+(repairList.length!==1?'s':'')+')'));
      on(repBtn,'click',function(){repBtn.disabled=true;AD.downloadSurahs(reciterId,repairList,_dlCbs(reciterId));setTimeout(function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},400);});
      body.appendChild(repBtn);
    }

    // Download / Continue / Re-download
    var dlIcon=scopeState==='full'?'fas fa-rotate-right':'fas fa-arrow-down';
    var _szEst=_sizeReady?AD.fmtBytes(estBytes):'…';
    var _szRem=_sizeReady?AD.fmtBytes(remBytes)+' '+t('dl.left'):'…';
    var dlLabel=scopeState==='full'?t('dl.redownload_btn')+' ('+_szEst+')':
                scopeState==='partial'?t('dl.continue_btn')+' ('+_szRem+')':
                t('dl.download_btn')+' ('+_szEst+')';
    var dlClass='dl-action-btn'+(scopeState==='corrupt'?' cancel-btn':' primary');
    var dlBtn2=el('button',dlClass);
    if(scopeState==='corrupt')dlBtn2.style.marginTop='8px';
    dlBtn2.appendChild(icon(dlIcon));
    dlBtn2.appendChild(document.createTextNode(' '+dlLabel));
    on(dlBtn2,'click',function(){dlBtn2.disabled=true;AD.downloadSurahs(reciterId,scopeSurahs,_dlCbs(reciterId));setTimeout(function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},400);});
    body.appendChild(dlBtn2);

    // Verify integrity (shown when there's something downloaded)
    if(stats.bytes>0){
      var verifyRow=el('div','dl-verify-row');
      var verifyLbl=el('span','dl-verify-lbl',stats.verifiedAt?(t('dl.last_checked')+': '+_fmtVerifyDate(stats.verifiedAt)):t('dl.not_verified'));
      var isVer=AD.isVerifying();
      var verifyBtn=el('button','dl-verify-btn',isVer?t('dl.verifying'):t('dl.verify'));
      verifyBtn.disabled=isVer;
      on(verifyBtn,'click',function(){
        verifyBtn.disabled=true;verifyBtn.textContent=t('dl.verifying');
        AD.verifyReciter(reciterId,{
          onProgress:function(done,total){if(_dlSheetOpen&&_dlSheetReciter===reciterId)verifyBtn.textContent=t('dl.verifying')+' '+done+'/'+total+'...';},
          onDone:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);}
        });
      });
      verifyRow.appendChild(verifyLbl);
      verifyRow.appendChild(verifyBtn);
      body.appendChild(verifyRow);
    }

    // Delete
    if(stats.bytes>0){
      var delBtn=el('button','dl-action-btn danger');
      delBtn.appendChild(icon('fas fa-trash'));
      delBtn.appendChild(document.createTextNode(' '+t('dl.remove')+' ('+AD.fmtBytes(stats.bytes)+')'));
      on(delBtn,'click',function(){
        AD.deleteReciter(reciterId).then(function(){
          if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);
          renderAudioSettings();toast(t('toast.dl_removed'));
        });
      });
      body.appendChild(delBtn);
    }
  } else {
    // Cancel button while downloading
    var cancelBtn=el('button','dl-action-btn cancel-btn');
    cancelBtn.appendChild(icon('fas fa-stop'));
    cancelBtn.appendChild(document.createTextNode(' '+t('dl.cancel')));
    on(cancelBtn,'click',function(){AD.cancel(reciterId);renderAudioSettings();});
    body.appendChild(cancelBtn);
  }
}

/* ===== FULL PLAYER ===== */
var _fpOpen=false,_fpRafId=null,_fpLastTick=0,_fpProg=0,_fpTextTick=0,_fpLastSurah=0,_fpLastAyah=0,_fpAnimating=false,_fpGen=0;

function _fmtTime(s){
  if(!s||isNaN(s))return'0:00';
  s=Math.floor(s);return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);
}

function _renderFPSpeed(){
  var row=$('fpSpeedRow');if(!row)return;
  clear(row);
  [0.5,0.75,1,1.25,1.5,2].forEach(function(sp){
    var btn=el('button','fp-speed-btn'+(S.audio.speed===sp?' on':''),sp+'x');
    on(btn,'click',function(){
      S.audio.speed=sp;S.audio.el.playbackRate=sp;
      localStorage.setItem('app_speed',String(sp));
      haptic([8]);_renderFPSpeed();
    });
    row.appendChild(btn);
  });
}

function _fpGetAyahText(surah,ayah){
  if(!S.quranData||!surah||!ayah)return'';
  try{
    var sd=S.quranData[String(surah)];if(!sd)return'';
    var vv=sd.verses||sd;var v=vv[ayah-1];if(!v)return'';
    return String(v.text||v||'');
  }catch(e){return'';}
}

function _fpUpdateAyahs(surah,ayah,instant){
  if(!surah||!ayah)return;
  var area=$('fpAyahArea');if(!area)return;
  if(surah===_fpLastSurah&&ayah===_fpLastAyah)return;
  function _fill(){
    var s=SURAHS[surah-1],total=s?s.a:0;
    var p=$('fpAyahPrev'),c=$('fpAyahCurr'),n=$('fpAyahNext');
    if(p)p.textContent=ayah>1?_fpGetAyahText(surah,ayah-1):'';
    if(c){c.textContent=_fpGetAyahText(surah,ayah);c.scrollTop=0;}
    if(n)n.textContent=ayah<total?_fpGetAyahText(surah,ayah+1):'';
    _fpLastSurah=surah;_fpLastAyah=ayah;
  }
  if(instant||_fpAnimating){
    _fpGen++; // invalidate any pending delayed callback for a stale ayah
    _fill();return;
  }
  _fpAnimating=true;
  _fpGen++;var myGen=_fpGen;
  area.classList.add('fp-out');
  setTimeout(function(){
    // Skip fill only if instant-path ran after us (incremented _fpGen past myGen)
    if(_fpGen===myGen)_fill();
    area.classList.add('fp-in');
    area.classList.remove('fp-out');
    area.offsetHeight; // force reflow — browser registers fp-in state
    area.classList.remove('fp-in'); // CSS transition fires: opacity 0→1, translateY 8→0
    setTimeout(function(){_fpAnimating=false;},350);
  },260);
}

function syncFullPlayer(){
  if(!_fpOpen)return;
  var fpAv=$('fpAvatar');
  if(fpAv){
    clear(fpAv);
    var photo=RECITER_PHOTOS[RECITER];
    if(photo&&_imgLoaded[RECITER]===true){
      // Image already decoded — show instantly, no flash
      var img=document.createElement('img');
      img.alt='';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';
      img.src=photo;fpAv.appendChild(img);
    } else if(photo&&_imgLoaded[RECITER]!=='err'){
      // URL known, not yet settled — show initials immediately, crossfade to image when ready
      var rec=RECITERS.find(function(r){return r.id===RECITER;});
      var ini=rec?rec.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join(''):'';
      var initEl=el('span','fp-avatar-initials',ini);
      fpAv.appendChild(initEl);
      var fpPre=new Image();var fpId=RECITER;var fpUrl=photo;
      fpPre.onload=function(){
        _imgLoaded[fpId]=true;
        if(!_fpOpen||RECITER!==fpId)return;
        var realImg=document.createElement('img');realImg.alt='';
        realImg.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;opacity:0;transition:opacity .3s ease';
        realImg.src=fpUrl;fpAv.appendChild(realImg);
        requestAnimationFrame(function(){requestAnimationFrame(function(){realImg.style.opacity='1';});});
        setTimeout(function(){if(fpAv.contains(initEl))fpAv.removeChild(initEl);},350);
      };
      fpPre.onerror=function(){_imgLoaded[fpId]='err';};
      fpPre.src=photo;
    } else {
      // No URL or known-broken URL — initials only
      var rec2=RECITERS.find(function(r){return r.id===RECITER;});
      var ini2=rec2?rec2.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join(''):'';
      fpAv.appendChild(el('span','fp-avatar-initials',ini2));
    }
    fpAv.classList.toggle('playing',S.audio.playing);
  }
  var s=SURAHS[S.audio.surah-1];
  var se=$('fpSurah');
  if(se)se.textContent=s?(s.ar+' · '+(t('reader.ayah')||'ئایەت')+' '+S.audio.ayah):'';
  var re=$('fpReciter');if(re)re.textContent=getReciterName();
  var fi=$('fpPlayIcon');if(fi)fi.className=S.audio.playing?'fas fa-pause':'fas fa-play';
  _renderFPSpeed();
  _fpUpdateAyahs(S.audio.surah,S.audio.ayah);
}

function _fpTick(ts){
  if(!_fpOpen){_fpRafId=null;return;}
  // Skip expensive work when app is backgrounded — RAF pauses anyway but
  // when it resumes (tab focus) avoid a burst of stale-delta updates.
  if(document.hidden){_fpRafId=requestAnimationFrame(_fpTick);return;}
  var dt=ts-_fpLastTick;_fpLastTick=ts;
  var ae=S.audio.el;
  if(ae&&ae.duration>0&&!isNaN(ae.duration)){
    var target=ae.currentTime/ae.duration;
    // Time-based exponential lerp — smooth at any frame rate, ~100ms convergence
    _fpProg+=((target-_fpProg)*Math.min(1,(dt||16)*0.009));
    var fill=$('fpProgressFill');if(fill)fill.style.transform='scaleX('+_fpProg+')';
    var bp=$('audioBarProgress');if(bp)bp.style.transform='scaleX('+_fpProg+')';
    // Text labels update every ~1s (cheap writes, no layout thrash)
    if(ts-_fpTextTick>900){
      _fpTextTick=ts;
      var cur=$('fpCurrent');if(cur)cur.textContent=_fmtTime(ae.currentTime);
      var dur=$('fpDuration');if(dur)dur.textContent=_fmtTime(ae.duration);
    }
  }
  _fpRafId=requestAnimationFrame(_fpTick);
}

function _buildRecPicker(){
  var list=$('rpList');if(!list)return;
  clear(list);
  var styleLbls={murattal:t('audio.style_murattal')||'مورتل',mujawwad:t('audio.style_mujawwad')||'مجود',hadr:t('audio.style_hadr')||'حدر'};
  RECITERS.forEach(function(r){
    var isOn=r.id===RECITER;
    var item=el('div','rp-item'+(isOn?' on':''));
    // Avatar
    var av=el('div','rp-av');
    var photo=RECITER_PHOTOS[r.id];
    if(photo&&_imgLoaded[r.id]===true){
      // Decoded — show instantly from browser cache, no crossfade needed
      var avImg=document.createElement('img');avImg.alt='';avImg.src=photo;
      av.appendChild(avImg);
    } else if(photo&&_imgLoaded[r.id]!=='err'){
      // URL known, not yet settled — show initials + crossfade to image when loaded
      var rpIni=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
      var rpIniEl=el('span','rp-ini',rpIni);
      av.appendChild(rpIniEl);
      (function(av2,iniEl2,id2,url2){
        var rpPre=new Image();
        rpPre.onload=function(){
          _imgLoaded[id2]=true;
          var ri=document.createElement('img');ri.alt='';
          ri.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;opacity:0;transition:opacity .25s ease';
          ri.src=url2;av2.appendChild(ri);
          requestAnimationFrame(function(){requestAnimationFrame(function(){ri.style.opacity='1';});});
          setTimeout(function(){if(av2.contains(iniEl2))av2.removeChild(iniEl2);},300);
        };
        rpPre.onerror=function(){_imgLoaded[id2]='err';};
        rpPre.src=url2;
      })(av,rpIniEl,r.id,photo);
    } else {
      // No URL or known-broken URL — initials only, no retry
      var rpFallIni=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
      av.appendChild(el('span','rp-ini',rpFallIni));
    }
    item.appendChild(av);
    // Info
    var info=el('div','rp-info');
    info.appendChild(el('div','rp-name',r.name));
    var meta=el('div','rp-meta');
    if(r.flag)meta.appendChild(el('span','rp-flag',r.flag));
    if(r.style)meta.appendChild(el('span','rp-style',styleLbls[r.style]||r.style));
    info.appendChild(meta);
    item.appendChild(info);
    // Checkmark
    var chk=el('div','rp-check');chk.appendChild(el('i','fas fa-check'));
    item.appendChild(chk);
    // Download button
    if(window.AudioDownloads){
      var rpDlBtn=el('button','reciter-dl-btn');
      var rpDlSt=AudioDownloads.dlState(r.id);
      var rpDling=AudioDownloads.isDownloading(r.id);
      if(rpDling){rpDlBtn.classList.add('downloading');rpDlBtn.appendChild(icon('fas fa-spinner fa-spin'));rpDlBtn.title=t('dl.tip_downloading');}
      else if(rpDlSt==='full'){rpDlBtn.classList.add('has-dl');rpDlBtn.appendChild(icon('fas fa-check'));rpDlBtn.title=t('dl.tip_downloaded_s');}
      else if(rpDlSt==='partial'){rpDlBtn.classList.add('partial');rpDlBtn.appendChild(icon('fas fa-arrow-down'));rpDlBtn.title=t('dl.tip_partial_s');}
      else if(rpDlSt==='corrupt'){rpDlBtn.classList.add('corrupt');rpDlBtn.appendChild(icon('fas fa-triangle-exclamation'));rpDlBtn.title=t('dl.tip_corrupt_s');}
      else{rpDlBtn.appendChild(icon('fas fa-arrow-down'));rpDlBtn.title=t('dl.tip_offline');}
      on(rpDlBtn,'click',function(e){e.stopPropagation();App.closeRecPicker();openDlSheet(r.id);});
      item.appendChild(rpDlBtn);
    }
    // Click
    on(item,'click',function(){
      haptic([8]);
      App.closeRecPicker();
      if(RECITER===r.id)return;
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      _fpProg=0; // reset interpolated progress for new track
      updateAudioBarAvatar();
      syncFullPlayer();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      else if(S.surah)prefetchAyahBlob(S.surah,(S.audio.ayah||1)-1);
      else showAudioBar();
      toast(r.name);
    });
    list.appendChild(item);
  });
  // Center active reciter in list after sheet opens
  var onIdx=RECITERS.findIndex(function(r){return r.id===RECITER;});
  if(onIdx>1){
    setTimeout(function(){
      var items=list.querySelectorAll('.rp-item');
      var item=items[onIdx];if(!item)return;
      var listH=list.clientHeight,itemH=item.offsetHeight;
      list.scrollTop=Math.max(0,item.offsetTop-(listH-itemH)/2);
    },340);
  }
}

// Generic drag-to-close for bottom sheets.
// scrollEl: if provided, drag is suppressed when touch starts inside it with scrollTop>0
function _attachSheetDrag(sheet,overlay,closeFn,scrollEl){
  var startY=0,dragY=0,active=false,dragging=false,_hist=[];
  var SPRING='cubic-bezier(.22,1,.36,1)',EASE_IN='cubic-bezier(.55,0,1,1)';
  // Progressive resistance: linear up to 100px, then increasing drag beyond
  function _resist(dy){return dy<=100?dy*0.85:85+(dy-100)*0.35;}
  sheet.addEventListener('touchstart',function(e){
    if(!sheet.classList.contains('open'))return; // ignore touches when sheet is closed
    if(scrollEl&&scrollEl.contains(e.target)&&scrollEl.scrollTop>2)return;
    startY=e.touches[0].clientY;dragY=0;active=true;dragging=false;_hist=[];
  },{passive:true});
  sheet.addEventListener('touchmove',function(e){
    if(!active)return;
    var dy=e.touches[0].clientY-startY;
    if(dy<0)dy=0;
    if(!dragging&&dy>6){
      dragging=true;
      sheet.style.transition='none';
      if(overlay)overlay.style.transition='none';
    }
    if(!dragging)return;
    dragY=dy;
    // Track last 80ms of movement for velocity calculation
    var now=Date.now();
    _hist.push({y:e.touches[0].clientY,t:now});
    if(_hist.length>8)_hist.shift();
    var visual=_resist(dragY);
    sheet.style.transform='translateY('+visual+'px)';
    if(overlay)overlay.style.opacity=String(Math.max(0,1-visual/Math.max(sheet.offsetHeight,300)*1.4));
  },{passive:true});
  function _end(){
    if(!active)return;
    active=false;
    if(!dragging)return;
    dragging=false;
    // Velocity: px/ms over the last 80ms window
    var vel=0;
    if(_hist.length>=2){
      var now=Date.now(),old=null;
      for(var i=0;i<_hist.length;i++){if(now-_hist[i].t<=80){old=_hist[i];break;}}
      if(old){var last=_hist[_hist.length-1],dt=last.t-old.t;if(dt>0)vel=(last.y-old.y)/dt;}
    }
    var shouldClose=dragY>80||vel>0.5;
    if(shouldClose){
      sheet.style.transition='transform .24s '+EASE_IN;
      sheet.style.transform='translateY(200%)';
      if(overlay){overlay.style.transition='opacity .24s ease-out';overlay.style.opacity='0';}
      // Delay closeFn so the slide-out animation plays before display:none is applied
      setTimeout(function(){
        closeFn();
        sheet.style.transition='';sheet.style.transform='';
        if(overlay){overlay.style.transition='';overlay.style.opacity='';}
      },260);
    } else {
      sheet.style.transition='transform .3s '+SPRING;
      sheet.style.transform='translateY(0)';
      if(overlay){overlay.style.transition='';overlay.style.opacity='';}
      setTimeout(function(){sheet.style.transition='';sheet.style.transform='';},340);
    }
  }
  sheet.addEventListener('touchend',_end,{passive:true});
  sheet.addEventListener('touchcancel',function(){
    if(!active)return;active=false;dragging=false;
    sheet.style.transition='';sheet.style.transform='';
    if(overlay){overlay.style.transition='';overlay.style.opacity='';}
  },{passive:true});
}

var _rpDragInited=false;
App.openRecPicker=function(){
  // Only open when the full player is actually showing — blocks all rogue call paths
  var fp=$('fullPlayer');
  if(!fp||!fp.classList.contains('open'))return;
  _buildRecPicker();
  var ov=$('rpOverlay'),pk=$('recPicker');
  if(!ov||!pk)return;
  if(!_rpDragInited){_rpDragInited=true;_attachSheetDrag(pk,ov,App.closeRecPicker,$('rpList'));}
  haptic([5]);
  ov.style.display='';ov.classList.add('open');
  pk.style.display='';pk.classList.add('open');
};

App.closeRecPicker=function(){
  var ov=$('rpOverlay'),pk=$('recPicker');
  if(ov){ov.classList.remove('open');ov.style.display='none';}
  if(pk){pk.classList.remove('open');pk.style.display='none';}
};

var _fpDragInited=false;
App.openFP=function(){
  if(!S.audio.surah)return;
  var ov=$('fpOverlay'),pl=$('fullPlayer');
  if(!ov||!pl)return;
  if(!_fpDragInited){_fpDragInited=true;_attachSheetDrag(pl,ov,App.closeFP,$('fpAyahArea'));}
  // Seed interpolated progress to current position — prevents slide-from-zero on open
  var ae=S.audio.el;
  if(ae&&ae.duration>0&&!isNaN(ae.duration))_fpProg=ae.currentTime/ae.duration;
  _fpOpen=true;
  _fpUpdateAyahs(S.audio.surah,S.audio.ayah,true); // instant first — seeds _fpLastSurah/Ayah
  syncFullPlayer(); // _fpUpdateAyahs inside hits the guard and returns early — no animation
  ov.classList.add('open');
  pl.classList.add('open');
  if(!_fpRafId)_fpRafId=requestAnimationFrame(_fpTick);
};

App.closeFP=function(){
  _fpOpen=false;
  _fpProg=0;
  _fpLastSurah=0;_fpLastAyah=0;_fpAnimating=false;_fpGen=0;
  var ov=$('fpOverlay'),pl=$('fullPlayer');
  if(ov)ov.classList.remove('open');
  if(pl)pl.classList.remove('open');
  if(_fpRafId){cancelAnimationFrame(_fpRafId);_fpRafId=null;}
  // Rec-picker is a child of the full-player flow — close it when the player closes
  App.closeRecPicker();
};

/* ===== REPEAT MANAGER ===== */
App.openRepeat=function(){
  var modal=$('repeatModal');
  modal.classList.add('on');
  // Set single verse to current playing ayah
  if(S.audio.surah&&S.audio.ayah){
    $('rmSingleInput').value=S.audio.surah+':'+S.audio.ayah;
  }
  // Populate surah select
  var sel=$('rmSurahSelect');
  if(!sel.children.length){
    SURAHS.forEach(function(s){
      var opt=document.createElement('option');
      opt.value=s.n;
      opt.textContent=s.n+'. '+s.ar+' ('+s.en+')';
      sel.appendChild(opt);
    });
  }
  if(S.audio.surah)sel.value=S.audio.surah;
  // Reset counters display
  $('rmPlayCount').textContent=S.rm.playCount;
  $('rmVerseCount').textContent=S.rm.verseRepeat;
  $('rmDelayCount').textContent=S.rm.delay;
};

App.closeRepeat=function(){
  $('repeatModal').classList.remove('on');
};

App.repeatMode=function(mode){
  S.rm.mode=mode;
  document.querySelectorAll('.repeat-tab').forEach(function(t){
    t.classList.toggle('on',t.getAttribute('data-rmode')===mode);
  });
  $('rmSingle').classList.toggle('hide',mode!=='single');
  $('rmRange').classList.toggle('hide',mode!=='range');
  $('rmSurah').classList.toggle('hide',mode!=='surah');
};

App.rmCounter=function(type,dir){
  if(type==='play'){
    S.rm.playCount=Math.max(1,S.rm.playCount+dir);
    $('rmPlayCount').textContent=S.rm.playCount;
  }else if(type==='verse'){
    S.rm.verseRepeat=Math.max(1,S.rm.verseRepeat+dir);
    $('rmVerseCount').textContent=S.rm.verseRepeat;
  }else if(type==='delay'){
    S.rm.delay=Math.max(0,S.rm.delay+dir);
    $('rmDelayCount').textContent=S.rm.delay;
  }
};

App.startRepeat=function(){
  var verses=[];
  if(S.rm.mode==='single'){
    var val=$('rmSingleInput').value;
    var p=val.split(':');
    if(p.length===2)verses.push({surah:parseInt(p[0]),ayah:parseInt(p[1])});
  }else if(S.rm.mode==='range'){
    var sv=$('rmRangeStart').value,ev=$('rmRangeEnd').value;
    var sp=sv.split(':'),ep=ev.split(':');
    if(sp.length===2&&ep.length===2){
      var ss=parseInt(sp[0]),sa=parseInt(sp[1]),es=parseInt(ep[0]),ea=parseInt(ep[1]);
      if(ss===es){for(var i=sa;i<=ea;i++)verses.push({surah:ss,ayah:i})}
      else{
        // Cross-surah: rest of start surah + full middle surahs + start of end surah
        var si=SURAHS[ss-1];if(si)for(var i=sa;i<=si.a;i++)verses.push({surah:ss,ayah:i});
        for(var s=ss+1;s<es;s++){var si2=SURAHS[s-1];if(si2)for(var i=1;i<=si2.a;i++)verses.push({surah:s,ayah:i})}
        for(var i=1;i<=ea;i++)verses.push({surah:es,ayah:i});
      }
    }
  }else if(S.rm.mode==='surah'){
    var sn=parseInt($('rmSurahSelect').value);
    var si=SURAHS[sn-1];
    if(si)for(var i=1;i<=si.a;i++)verses.push({surah:sn,ayah:i});
  }
  if(!verses.length){toast(t('toast.no_verse'));return}
  App.closeRepeat();
  rmPlaySequence(verses);
};

var _rmActiveOnEnd=null; // track active ended listener to prevent duplication
function rmPlaySequence(verses){
  // Remove any lingering ended listener from a previous sequence
  if(_rmActiveOnEnd&&S.audio.el){S.audio.el.removeEventListener('ended',_rmActiveOnEnd);_rmActiveOnEnd=null;}
  S.rm.isPlaying=true;
  S.rm.currentPlay=0;
  $('repeatStatus').classList.add('on');
  rmUpdateStatus();

  function playRound(){
    if(!S.rm.isPlaying)return;
    if(S.rm.currentPlay>=S.rm.playCount){
      S.rm.isPlaying=false;
      $('repeatStatus').classList.remove('on');
      toast(t('toast.repeat_done'));
      return;
    }
    var vi=0;
    function playVerse(){
      if(!S.rm.isPlaying)return;
      if(vi>=verses.length){
        S.rm.currentPlay++;
        rmUpdateStatus();
        if(S.rm.currentPlay<S.rm.playCount){
          setTimeout(playRound,S.rm.delay*1000);
        }else{
          S.rm.isPlaying=false;
          $('repeatStatus').classList.remove('on');
          toast(t('toast.repeat_done'));
        }
        return;
      }
      var v=verses[vi];
      var vr=0;
      function repeatV(){
        if(!S.rm.isPlaying)return;
        if(vr>=S.rm.verseRepeat){
          vi++;
          setTimeout(playVerse,S.rm.delay*1000);
          return;
        }
        playAyah(v.surah,v.ayah);
        vr++;
        rmUpdateStatus();
        var aud=S.audio.el;
        // Remove any previous ended listener before adding a new one
        if(_rmActiveOnEnd){aud.removeEventListener('ended',_rmActiveOnEnd);_rmActiveOnEnd=null;}
        var onEnd=function(){
          _rmActiveOnEnd=null;
          aud.removeEventListener('ended',onEnd);
          if(vr<S.rm.verseRepeat){
            setTimeout(repeatV,S.rm.delay*1000);
          }else{
            vi++;
            setTimeout(playVerse,S.rm.delay*1000);
          }
        };
        _rmActiveOnEnd=onEnd;
        aud.addEventListener('ended',onEnd);
      }
      repeatV();
    }
    playVerse();
  }
  playRound();
}

function rmUpdateStatus(){
  $('repeatStatusText').textContent=t('repeat.status',{current:S.rm.currentPlay+1,total:S.rm.playCount});
}

App.stopRepeat=function(){
  S.rm.isPlaying=false;
  if(_rmActiveOnEnd&&S.audio.el){S.audio.el.removeEventListener('ended',_rmActiveOnEnd);_rmActiveOnEnd=null;}
  $('repeatStatus').classList.remove('on');
  toast(t('toast.repeat_stopped'));
};

/* ===== BOOKMARKS ===== */
/*
 * Architecture: in-memory map (_bmMap) is the authoritative runtime state.
 * Reads are O(1). Writes are coalesced — rapid taps produce one storage write.
 * UI updates surgically (one card, one button). No full re-render on toggle.
 */
var _bmMap={};          // "surah:ayah" → bookmark object
var _bmSaveTimer=null;  // coalesced-write timer

function _bmKey(s,a){return s+':'+a;}

function _loadBookmarks(){
  try{
    var arr=JSON.parse(localStorage.getItem('app_bookmarks')||'[]');
    _bmMap={};
    arr.forEach(function(b){if(b&&b.surah&&b.ayah)_bmMap[_bmKey(b.surah,b.ayah)]=b;});
  }catch(e){_bmMap={};}
}

function _bmToArray(){
  return Object.keys(_bmMap).map(function(k){return _bmMap[k];});
}

// O(1) bookmark check — used directly in card rendering
function isBookmarked(surah,ayah){return !!_bmMap[_bmKey(surah,ayah)];}

// Coalesced save: any number of taps within 300ms → exactly one write
function _scheduleBmSave(){
  clearTimeout(_bmSaveTimer);
  _bmSaveTimer=setTimeout(function(){
    try{localStorage.setItem('app_bookmarks',JSON.stringify(_bmToArray()));}catch(e){}
    debouncedSync();
  },300);
}

// Returns array for bookmarks tab / export (reads from in-memory map)
function getBookmarks(){return _bmToArray();}

// Direct write — used by note edits and deletions from bookmarks tab
function saveBookmarks(bms){
  _bmMap={};
  bms.forEach(function(b){if(b&&b.surah&&b.ayah)_bmMap[_bmKey(b.surah,b.ayah)]=b;});
  try{localStorage.setItem('app_bookmarks',JSON.stringify(bms));}catch(e){}
  debouncedSync();
}

// Toggle bookmark — returns true if added, false if removed
function toggleBookmark(surah,ayah){
  var key=_bmKey(surah,ayah);
  if(_bmMap[key]){
    delete _bmMap[key];
    _scheduleBmSave();
    haptic([8]);
    toast(t('toast.bookmark_removed'));
    return false;
  }else{
    _bmMap[key]={surah:surah,ayah:ayah,date:Date.now(),note:''};
    _scheduleBmSave();
    H.medium(); // clear confirmation: something meaningful was saved
    toast(t('toast.bookmark_added'));
    return true;
  }
}

function renderBookmarks(){
  var bms=getBookmarks();

  // ── Stats — build into fragment, then atomic replace ─────────────────────
  var statsFrag=document.createDocumentFragment();
  var row=el('div','stats-row');
  [{v:bms.length,l:t('bookmarks.total')},{v:new Set(bms.map(function(b){return b.surah})).size,l:t('bookmarks.surahs')},{v:bms.filter(function(b){return b.note}).length,l:t('bookmarks.notes')}].forEach(function(s){
    var card=el('div','stat-card');
    card.appendChild(el('div','stat-val',String(s.v)));
    card.appendChild(el('div','stat-lbl',s.l));
    row.appendChild(card);
  });
  statsFrag.appendChild(row);

  // ── Controls ─────────────────────────────────────────────────────────────
  var ctrlFrag=document.createDocumentFragment();
  if(bms.length){
    var ctrlDiv=el('div','bm-controls');
    var inp=el('input','');
    inp.type='text';inp.placeholder=t('search.bookmarks');
    on(inp,'input',function(){S.bmSearch=this.value.toLowerCase();renderBmList(bms)});
    ctrlDiv.appendChild(inp);
    var sel=document.createElement('select');
    sel.className='';
    [['newest',t('bookmarks.sort.newest')],['oldest',t('bookmarks.sort.oldest')],['surah',t('bookmarks.sort.surah')]].forEach(function(o){
      var opt=document.createElement('option');
      opt.value=o[0];opt.textContent=o[1];
      if(S.bmSort===o[0])opt.selected=true;
      sel.appendChild(opt);
    });
    on(sel,'change',function(){S.bmSort=this.value;renderBmList(bms)});
    ctrlDiv.appendChild(sel);
    ctrlFrag.appendChild(ctrlDiv);
  }

  // Atomic replace — old content stays visible until both sections are ready
  var stats=$('bmStats'); clear(stats); stats.appendChild(statsFrag);
  var ctrls=$('bmControls'); clear(ctrls); ctrls.appendChild(ctrlFrag);
  renderBmList(bms);
}

function getAyahArabicText(surah,ayah){
  if(!S.quranData)return'';
  var sd=S.quranData[String(surah)];if(!sd)return'';
  var vv=sd.verses||sd;if(!Array.isArray(vv))return'';
  var v=vv[ayah-1];return v?(v.text||v):'';
}

// ── In-app note editor ────────────────────────────────────────────────────────
// Replaces native prompt() for bookmark notes — proper mobile UX with safe-area support.
function _showNoteModal(currentNote,onSave){
  var ov=el('div','note-modal-ov');
  var card=el('div','note-modal-card');
  var titleEl=el('div','note-modal-title',t('bookmarks.note_prompt')||'تێبینی دەستکاری بکە');
  var inp=document.createElement('textarea');
  inp.className='note-modal-inp';
  inp.maxLength=280;
  inp.value=currentNote||'';
  inp.rows=3;
  inp.placeholder=t('bookmarks.note_placeholder')||'تێبینی...';
  var charCount=el('div','note-modal-chars','');
  function _updateCount(){charCount.textContent=(280-inp.value.length)+' '+t('bookmarks.chars_left')||'پیت ماوە';}
  _updateCount();
  inp.addEventListener('input',_updateCount);
  var actions=el('div','note-modal-actions');
  var cancelBtn=el('button','note-modal-btn note-modal-cancel',t('cancel')||'پاشگەزبوون');
  var saveBtn=el('button','note-modal-btn note-modal-save',t('bookmarks.note')||'پاشەکەوتکرن');
  function _close(){
    ov.classList.remove('on');
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);
  }
  cancelBtn.onclick=function(){haptic([8]);_close();};
  saveBtn.onclick=function(){haptic([8]);_close();onSave(inp.value.trim());};
  on(ov,'click',function(e){if(e.target===ov)_close();});
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  card.appendChild(titleEl);
  card.appendChild(inp);
  card.appendChild(charCount);
  card.appendChild(actions);
  ov.appendChild(card);
  document.body.appendChild(ov);
  requestAnimationFrame(function(){
    ov.classList.add('on');
    setTimeout(function(){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);},180);
  });
}

function renderBmList(bms){
  var list=$('bmList');
  var frag=document.createDocumentFragment();

  var filtered=bms;
  if(S.bmSearch){
    filtered=bms.filter(function(b){
      var s=SURAHS[b.surah-1];
      return s&&(s.en.toLowerCase().indexOf(S.bmSearch)!==-1||s.ar.indexOf(S.bmSearch)!==-1||(b.note||'').toLowerCase().indexOf(S.bmSearch)!==-1);
    });
  }

  if(S.bmSort==='newest')filtered.sort(function(a,b){return(b.date||0)-(a.date||0)});
  if(S.bmSort==='oldest')filtered.sort(function(a,b){return(a.date||0)-(b.date||0)});
  if(S.bmSort==='surah')filtered.sort(function(a,b){return a.surah-b.surah||a.ayah-b.ayah});

  if(!filtered.length){
    var empty=el('div','bm-empty');
    empty.appendChild(icon('fas fa-bookmark'));
    empty.appendChild(el('p','',t('bookmarks.empty')));
    frag.appendChild(empty);
    clear(list); list.appendChild(frag);
    return;
  }

  filtered.forEach(function(bm){
    var s=SURAHS[bm.surah-1];
    if(!s)return;
    var card=el('div','bm-card');

    var hdr=el('div','bm-card-hdr');
    hdr.appendChild(el('div','bm-card-title',s.en+' - '+s.ar));
    hdr.appendChild(el('div','bm-card-verse',t('reader.ayah')+' '+bm.ayah));
    card.appendChild(hdr);

    // Arabic ayah text
    var arabicText=getAyahArabicText(bm.surah,bm.ayah);
    if(arabicText){
      card.appendChild(el('div','bm-card-arabic',arabicText));
    }

    if(bm.note){
      card.appendChild(el('div','bm-card-note',bm.note));
    }

    var actions=el('div','bm-card-actions');

    var openBtn=el('button','bm-card-btn');
    openBtn.appendChild(icon('fas fa-book-open'));
    openBtn.appendChild(document.createTextNode(' '+t('bookmarks.open')));
    on(openBtn,'click',function(){App.tab('quran');setTimeout(function(){App.openSurah(bm.surah,bm.ayah)},100)});
    actions.appendChild(openBtn);

    var noteBtn=el('button','bm-card-btn');
    noteBtn.appendChild(icon('fas fa-pen'));
    noteBtn.appendChild(document.createTextNode(' '+t('bookmarks.note')));
    on(noteBtn,'click',function(){
      // Use in-app modal — never native prompt() on mobile
      _showNoteModal(bm.note,function(note){
        bm.note=note;
        saveBookmarks(getBookmarks().map(function(b){return b.surah===bm.surah&&b.ayah===bm.ayah?bm:b}));
        renderBookmarks();
      });
    });
    actions.appendChild(noteBtn);

    var delBtn=el('button','bm-card-btn danger');
    delBtn.appendChild(icon('fas fa-trash'));
    on(delBtn,'click',function(){
      saveBookmarks(getBookmarks().filter(function(b){return!(b.surah===bm.surah&&b.ayah===bm.ayah)}));
      renderBookmarks();
      toast(t('toast.bookmark_removed'));
    });
    actions.appendChild(delBtn);

    card.appendChild(actions);
    frag.appendChild(card);
  });
  clear(list); list.appendChild(frag);
}

/* ===== GOALS ===== */
// Clear only goal counters — preserves general Quran reading position (surah_progress_*, lastRead, bookmarks)
function _clearGoalCounters(){
  localStorage.removeItem('readLog');
  localStorage.removeItem('readAyahsToday');
  localStorage.removeItem('bestStreak');
  localStorage.removeItem('readSessions');
  localStorage.setItem('trackingResetAt',new Date().toISOString());
  S.todayVerses=new Set();
}
// Full tracking reset — also wipes ayah-level read marks from Quran pages
function _clearTrackingState(){
  // Cancel any pending scheduleSave timer so it can't re-write cleared keys
  if(_progressCleanup){_progressCleanup();_progressCleanup=null;}
  _clearGoalCounters();
  localStorage.removeItem('lastRead'); // remove continue-reading card source
  localStorage.setItem('fullResetAt',new Date().toISOString()); // tombstone: prevents cloud from restoring lastRead
  for(var i=1;i<=114;i++){
    localStorage.removeItem('surah_progress_'+i); // mushaf mode tracking
    localStorage.removeItem('surah_read_v3_'+i);  // list/ayah mode tracking
  }
}

function getGoal(){
  try{return JSON.parse(localStorage.getItem('readingGoal'))||null}catch(e){return null}
}
function saveGoal(g){localStorage.setItem('readingGoal',JSON.stringify(g));debouncedSync()}
function getReadLog(){
  try{return JSON.parse(localStorage.getItem('readLog'))||{}}catch(e){return{}}
}
function saveReadLog(l){
  // Prune entries older than 365 days — prevents unbounded readLog growth over years of use.
  var cutoff=dateKey(new Date(Date.now()-365*86400000));
  Object.keys(l).forEach(function(k){if(k<cutoff)delete l[k];});
  localStorage.setItem('readLog',JSON.stringify(l));
}

function initTodayVerses(){
  var today=dateKey(new Date());
  try{
    var saved=JSON.parse(localStorage.getItem('readAyahsToday')||'{}');
    if(saved.date===today&&Array.isArray(saved.ayahs)){
      S.todayVerses=new Set(saved.ayahs);
    } else {
      S.todayVerses=new Set();
      localStorage.setItem('readAyahsToday',JSON.stringify({date:today,ayahs:[]}));
    }
  }catch(e){S.todayVerses=new Set()}
}

function trackVerse(surah,ayah){
  if(!surah)return;
  if(!S.todayVerses)S.todayVerses=new Set();
  var key=surah+':'+ayah;
  if(S.todayVerses.has(key))return;
  S.todayVerses.add(key);
  // Count toward active session
  if(S._session)S._session.ayahs++;
  // Save today's verse set
  var today=dateKey(new Date());
  try{
    localStorage.setItem('readAyahsToday',JSON.stringify({date:today,ayahs:Array.from(S.todayVerses)}));
  }catch(e){}
  // Increment readLog
  var l=getReadLog();
  l[today]=(l[today]||0)+1;
  saveReadLog(l);
  // Haptic exactly once on daily goal completion — success pattern
  var g=getGoal();
  if(g&&l[today]===g.pages){H.success();}
  // Khatm celebration — fires each time total crosses a new multiple of 6236
  var totalAfter=calcTotalRead(l);
  var khatmAt=parseInt(localStorage.getItem('khatmCelebAt')||'0');
  var nextKhatm=(Math.floor(khatmAt/6236)+1)*6236;
  if(totalAfter>=nextKhatm){
    localStorage.setItem('khatmCelebAt',String(totalAfter));
    setTimeout(function(){_goalCelebrateKhatm(totalAfter,calcStreak(l),calcBestStreak(l));},900);
  }
  _updateGoalsBadge();
  // Keep goal widget current — lightweight, no network
  pushGoalDataToWidget();
}

function calcBestStreak(log){
  var keys=Object.keys(log).sort();
  if(!keys.length)return 0;
  var best=1,cur=1;
  for(var i=1;i<keys.length;i++){
    var prev=new Date(keys[i-1]);var curr=new Date(keys[i]);
    var diff=Math.round((curr-prev)/86400000);
    if(diff===1){cur++;if(cur>best)best=cur}
    else{cur=1}
  }
  var stored=parseInt(localStorage.getItem('bestStreak'))||0;
  if(best>stored){localStorage.setItem('bestStreak',String(best))}
  return Math.max(best,stored);
}
function calcTotalRead(log){
  var total=0;var keys=Object.keys(log);
  for(var i=0;i<keys.length;i++){total+=(log[keys[i]]||0)}
  return total;
}

/* ===== SESSION TRACKING ===== */
function _startSession(surahNum){
  _endSession();
  var s=SURAHS[(surahNum||1)-1];
  S._session={surah:surahNum,name:s?s.ar:'',startMs:Date.now(),ayahs:0};
}
function _endSession(){
  if(!S._session||S._session.ayahs<1){S._session=null;return;}
  var sess=S._session;S._session=null;
  var dur=Math.round((Date.now()-sess.startMs)/1000);
  if(dur<5)return;
  var rec={surah:sess.surah,name:sess.name,startMs:sess.startMs,dur:dur,ayahs:sess.ayahs};
  try{
    var all=JSON.parse(localStorage.getItem('readSessions')||'[]');
    all.push(rec);if(all.length>50)all=all.slice(-50);
    localStorage.setItem('readSessions',JSON.stringify(all));
  }catch(e){}
  // After a real reading session, check if we should show the smart rating prompt
  if(window.AppRating)AppRating.checkSmartPrompt();
}
function getRecentSessions(){
  try{return JSON.parse(localStorage.getItem('readSessions')||'[]');}catch(e){return[];}
}

function renderGoals(){
  var content=$('goalsContent');
  var frag=document.createDocumentFragment();
  var goal=getGoal();

  if(!goal){
    var ng=el('div','no-goal');
    ng.appendChild(icon('fas fa-seedling'));
    ng.appendChild(el('div','ng-title',t('goals.empty.title')));
    ng.appendChild(el('div','ng-sub',t('goals.empty.subtitle')));
    ng.appendChild(el('div','ng-motivate',t('goals.empty.motivate')));
    ng.appendChild(el('div','ng-verse','فَإِنَّ مَعَ الْعُسْرِ يُسْرًا'));
    ng.appendChild(el('div','ng-verse-ref','الشرح ٩٤:٥'));
    var btn=el('button','btn');
    btn.appendChild(icon('fas fa-plus'));
    btn.appendChild(document.createTextNode(' '+t('goals.empty.start')));
    on(btn,'click',function(){App.openWizard()});
    ng.appendChild(btn);
    frag.appendChild(ng);
    clear(content); content.appendChild(frag);
    return;
  }

  var log=getReadLog();
  var streak=calcStreak(log);
  var bestStreak=calcBestStreak(log);
  var totalRead=calcTotalRead(log);
  // Fire khatm celebration immediately when goals panel opens and journey is newly complete
  var _khatmAt=parseInt(localStorage.getItem('khatmCelebAt')||'0');
  var _nextKhatm=(Math.floor(_khatmAt/6236)+1)*6236;
  if(totalRead>=_nextKhatm){
    localStorage.setItem('khatmCelebAt',String(totalRead));
    setTimeout(function(){_goalCelebrateKhatm(totalRead,streak,bestStreak);},700);
  }
  var today=new Date();
  var todayKey=dateKey(today);
  var todayRead=log[todayKey]||0;
  var target=goal.pages||5;
  var pct=Math.min(100,Math.round(todayRead/target*100));

  // Streak hero with SVG ring
  var hero=el('div','streak-hero');
  var ring=el('div','streak-ring');
  if(streak===0)ring.classList.add('pulse');
  var svgNS='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 120 120');
  var circleBg=document.createElementNS(svgNS,'circle');
  circleBg.setAttribute('class','ring-bg');
  circleBg.setAttribute('cx','60');circleBg.setAttribute('cy','60');circleBg.setAttribute('r','52');
  svg.appendChild(circleBg);
  var circleFill=document.createElementNS(svgNS,'circle');
  circleFill.setAttribute('class','ring-fill');
  circleFill.setAttribute('cx','60');circleFill.setAttribute('cy','60');circleFill.setAttribute('r','52');
  var circumference=Math.round(2*Math.PI*52);
  circleFill.setAttribute('stroke-dasharray',String(circumference));
  circleFill.setAttribute('stroke-dashoffset',String(circumference));
  svg.appendChild(circleFill);
  ring.appendChild(svg);
  var numEl=el('div','streak-num','0');
  ring.appendChild(numEl);
  // Contextual streak label
  var streakLabel=t('goals.streak.continuous');
  if(streak===0)streakLabel=t('goals.streak.start_today');
  else if(streak>=100)streakLabel=t('goals.streak.on_track');
  else if(streak>=30)streakLabel=t('goals.streak.monthly');
  else if(streak>=7)streakLabel=t('goals.streak.weekly');
  hero.appendChild(ring);
  hero.appendChild(el('div','streak-lbl',streakLabel));
  // Milestone sub-message
  if(streak>=100){
    hero.appendChild(el('div','streak-milestone',t('goals.streak.100_days')));
  }else if(streak>=30){
    hero.appendChild(el('div','streak-milestone',t('goals.streak.month')));
  }else if(streak>=7){
    hero.appendChild(el('div','streak-milestone',t('goals.streak.week')));
  }
  // Animate streak number count-up and ring fill — only when panel is actually visible
  var ringOffset=circumference-Math.round(circumference*(Math.min(pct,100)/100));
  setTimeout(function(){
    circleFill.setAttribute('stroke-dashoffset',String(ringOffset));
    var duration=400;var startT=performance.now();var targetNum=streak;
    var panelOn=$('panelGoals')&&$('panelGoals').classList.contains('on');
    if(targetNum===0){numEl.textContent='0';return}
    if(!panelOn){numEl.textContent=String(targetNum);return} // pre-render: set final value, skip rAF loop
    function countUp(now){
      var elapsed=now-startT;var progress=Math.min(elapsed/duration,1);
      var eased=1-Math.pow(1-progress,3);
      numEl.textContent=String(Math.round(eased*targetNum));
      if(progress<1)requestAnimationFrame(countUp);
    }
    requestAnimationFrame(countUp);
  },80);

  // Week dots — fixed Kurdish week (شەمبی→ئەینی), RTL order
  var week=el('div','week-grid');
  week.setAttribute('dir','rtl');
  var dayNames=[t('goals.days.0'),t('goals.days.1'),t('goals.days.2'),t('goals.days.3'),t('goals.days.4'),t('goals.days.5'),t('goals.days.6')];
  // Kurdish week starts Saturday; (getDay()+1)%7 gives 0=Sat…6=Fri
  var todayWeekIdx=(today.getDay()+1)%7;
  var satStart=new Date(today);
  satStart.setDate(today.getDate()-todayWeekIdx);
  for(var d=0;d<7;d++){
    var dt=new Date(satStart);
    dt.setDate(satStart.getDate()+d);
    var dkey=dateKey(dt);
    var isToday=(d===todayWeekIdx);
    var day=el('div','week-day');
    day.style.animationDelay=(d*30)+'ms';
    var dot=el('div','week-dot');
    if(isToday){
      dot.classList.add('today');
      day.classList.add('today');
      if(pct>=100){
        dot.classList.add('done');
      }else if(pct>0){
        dot.style.background='conic-gradient(var(--accent) 0% '+pct+'%, transparent '+pct+'% 100%)';
        dot.style.borderColor='var(--accent)';
      }
    }else{
      if(log[dkey])dot.classList.add('done');
    }
    day.appendChild(dot);
    day.appendChild(el('div','week-day-label',dayNames[d]));
    week.appendChild(day);
  }
  hero.appendChild(week);
  // Best streak display
  if(bestStreak>0){
    var bestEl=el('div','best-streak');
    bestEl.appendChild(document.createTextNode(t('goals.streak.best')+' '));
    var bestVal=el('span','',t('goals.streak.days',{count:bestStreak}));
    bestEl.appendChild(bestVal);
    hero.appendChild(bestEl);
  }
  frag.appendChild(hero);

  // Today's progress card with encouragement
  var prgSec=el('div','progress-section');
  // Header: prominent "X/100 بۆ ختم" counter
  var prgHdr=el('div','progress-hdr');
  var prgLeft=el('div','progress-left');
  var prgCount=el('div','progress-count no-kurdish-convert',todayRead+'/'+target);
  var prgKhatmLbl=el('div','progress-khatm-lbl','ختمکرنا قورئانێ');
  prgLeft.appendChild(prgCount);prgLeft.appendChild(prgKhatmLbl);
  prgHdr.appendChild(prgLeft);
  prgHdr.appendChild(el('span','progress-pct',pct+'%'));
  prgSec.appendChild(prgHdr);
  var bar=el('div','progress-bar');
  var fill=el('div','progress-fill');
  if(pct>=100)fill.classList.add('complete');
  bar.appendChild(fill);
  prgSec.appendChild(bar);
  // Encouragement microcopy
  var msgEl=el('div','progress-msg');
  if(pct>=100){
    msgEl.appendChild(document.createTextNode(t('goals.progress.complete')+' '));
    var chk=el('span','complete-check','✓');
    msgEl.appendChild(chk);
  }else if(pct>=50){
    msgEl.textContent=t('goals.progress.almost');
  }else if(pct>0){
    msgEl.textContent=t('goals.progress.continue');
  }else{
    msgEl.textContent=t('goals.progress.start_today');
  }
  prgSec.appendChild(msgEl);
  // Journey progress: X/6236 overall
  var journeyPct=Math.min(100,Math.round(totalRead/6236*100));
  var journeyEl=el('div','progress-journey');
  var journeyBar=el('div','progress-journey-bar');
  var journeyFill=el('div','progress-journey-fill');
  journeyBar.appendChild(journeyFill);
  var jLabel=el('div','progress-journey-lbl no-kurdish-convert');
  jLabel.appendChild(document.createTextNode('ختمکرنا قورئانێ — '+totalRead+'/6236'));
  var jPct=el('span','progress-journey-pct no-kurdish-convert',journeyPct+'%');
  jLabel.appendChild(jPct);
  journeyEl.appendChild(jLabel);
  journeyEl.appendChild(journeyBar);
  prgSec.appendChild(journeyEl);
  setTimeout(function(){journeyFill.style.width=journeyPct+'%';},80);
  // Auto-track note (first 7 days only)
  var daysSinceCreated=goal.created?Math.floor((Date.now()-goal.created)/86400000):99;
  if(daysSinceCreated<=7){
    var autoNote=el('div','auto-note');
    autoNote.appendChild(icon('fas fa-wand-magic-sparkles'));
    autoNote.appendChild(document.createTextNode(t('goals.progress.auto_track')));
    prgSec.appendChild(autoNote);
  }
  frag.appendChild(prgSec);
  setTimeout(function(){fill.style.width=pct+'%'},50);

  // Stats card — total read, days to khatm, best streak
  var gc=el('div','goal-card');
  gc.appendChild(el('div','goal-card-name',goal.name||t('goals.card.name')));
  gc.appendChild(el('div','goal-card-desc',t('goals.card.daily',{count:target})));
  var details=el('div','goal-details');
  var daysToKhatm=totalRead>=6236?0:Math.ceil((6236-totalRead)/target);
  [{v:String(totalRead),l:t('goals.stats.total')},{v:daysToKhatm>0?daysToKhatm+' '+t('goals.stats.days'):t('goals.stats.complete'),l:t('goals.stats.to_khatm')},{v:String(bestStreak),l:t('goals.stats.best')}].forEach(function(dd2){
    var det=el('div','goal-detail');
    det.appendChild(el('div','goal-detail-val',dd2.v));
    det.appendChild(el('div','goal-detail-lbl',dd2.l));
    details.appendChild(det);
  });
  gc.appendChild(details);
  frag.appendChild(gc);

  // Last session card
  var sessions=getRecentSessions();
  if(sessions.length){
    var lastSess=sessions[sessions.length-1];
    var sessCard=el('div','goal-card session-card');
    var sessHdr=el('div','goal-card-name');
    sessHdr.appendChild(icon('fas fa-clock'));
    sessHdr.appendChild(document.createTextNode(' '+t('goals.last_session')));
    sessCard.appendChild(sessHdr);
    var _mins=Math.floor(lastSess.dur/60);var _secs=lastSess.dur%60;
    var _durStr=_mins>0?(_mins+'m '+(_secs>0?_secs+'s':'')):(lastSess.dur+'s');
    var sessDetails=el('div','goal-details');
    [{v:lastSess.name||'',l:t('goals.session.surah')},{v:String(lastSess.ayahs),l:t('goals.session.ayahs')},{v:_durStr,l:t('goals.session.time')}].forEach(function(sd){
      var det=el('div','goal-detail');det.appendChild(el('div','goal-detail-val',sd.v));det.appendChild(el('div','goal-detail-lbl',sd.l));
      sessDetails.appendChild(det);
    });
    sessCard.appendChild(sessDetails);
    frag.appendChild(sessCard);
  }

  // Month calendar section
  var calTitle=el('div','section-title');
  calTitle.appendChild(document.createTextNode(t('goals.heatmap.title')));
  frag.appendChild(calTitle);

  var calSec=el('div','month-cal-section');
  var monthNames=[t('goals.months.1'),t('goals.months.2'),t('goals.months.3'),t('goals.months.4'),t('goals.months.5'),t('goals.months.6'),t('goals.months.7'),t('goals.months.8'),t('goals.months.9'),t('goals.months.10'),t('goals.months.11'),t('goals.months.12')];
  var calYear=S.goalYear,calMo=S.goalMonth;

  // Month nav header
  var monthNav=el('div','year-nav');
  var prevMo=el('button','');prevMo.appendChild(icon('fas fa-chevron-right'));
  on(prevMo,'click',function(){
    S.goalMonth--;haptic([8]);
    if(S.goalMonth<0){S.goalMonth=11;S.goalYear--;}
    renderGoals();
  });
  monthNav.appendChild(prevMo);
  monthNav.appendChild(el('span','year-display',monthNames[calMo]+' '+calYear));
  var nextMo=el('button','');nextMo.appendChild(icon('fas fa-chevron-left'));
  on(nextMo,'click',function(){
    S.goalMonth++;haptic([8]);
    if(S.goalMonth>11){S.goalMonth=0;S.goalYear++;}
    renderGoals();
  });
  monthNav.appendChild(nextMo);
  calSec.appendChild(monthNav);

  // Day-of-week headers (Sun→Sat)
  var dayHdrs=['ئێکشەمبی','دووشەمبی','سێشەمبی','چارشەمبی','پێنجشەمبی','ئەینی','شەمبی'];
  var hdrsRow=el('div','month-cal-grid');
  for(var dh=0;dh<7;dh++){
    hdrsRow.appendChild(el('div','month-cal-dh',dayHdrs[dh]));
  }
  calSec.appendChild(hdrsRow);

  // Calendar grid
  var calGrid=el('div','month-cal-grid');
  var firstDay=new Date(calYear,calMo,1).getDay();
  var daysInMonth=new Date(calYear,calMo+1,0).getDate();

  // Blank cells before 1st
  for(var bb=0;bb<firstDay;bb++){calGrid.appendChild(el('div','month-cal-cell month-cal-empty',''))}

  for(var dd=1;dd<=daysInMonth;dd++){
    var dStr=calYear+'-'+String(calMo+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
    var reading=log[dStr]||0;
    var cellCls='month-cal-cell';
    if(reading>0){
      var rp=reading/target;
      if(rp>=1)cellCls+=' heat-4';
      else if(rp>=0.67)cellCls+=' heat-3';
      else if(rp>=0.34)cellCls+=' heat-2';
      else cellCls+=' heat-1';
    }
    if(dStr===todayKey)cellCls+=' is-today';
    var dc=el('div',cellCls,String(dd));
    calGrid.appendChild(dc);
  }
  calSec.appendChild(calGrid);

  // Legend
  var legend=el('div','heatmap-legend');
  legend.appendChild(document.createTextNode(t('goals.heatmap.less')+' '));
  var levels=[{c:''},{c:'heat-1'},{c:'heat-2'},{c:'heat-3'},{c:'heat-4'}];
  for(var ll=0;ll<levels.length;ll++){
    var lc=el('div','heatmap-legend-cell heatmap-cell'+(levels[ll].c?' '+levels[ll].c:''));
    legend.appendChild(lc);
  }
  legend.appendChild(document.createTextNode(' '+t('goals.heatmap.more')));
  calSec.appendChild(legend);
  frag.appendChild(calSec);

  // Delete goal with warning
  var delWrap=el('div','goal-delete-section');
  delWrap.appendChild(el('div','goal-delete-warn',t('goals.delete.warn')));
  var delGoal=el('button','btn-danger');
  delGoal.appendChild(icon('fas fa-trash'));
  delGoal.appendChild(document.createTextNode(' '+t('goals.delete.button')));
  on(delGoal,'click',function(){
    $('goalConfirmOverlay').classList.add('on');
    H.warning(); // destructive action confirmation
  });
  delWrap.appendChild(delGoal);
  frag.appendChild(delWrap);
  clear(content); content.appendChild(frag);
}

function calcStreak(log){
  var streak=0;
  var MIN=3; // minimum ayahs for a day to count toward streak
  var d=new Date();
  for(var i=0;i<365;i++){
    var k=dateKey(d);
    if((log[k]||0)>=MIN)streak++;
    else if(i>0)break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

/* ===== PRAYER TRACKER ===== */
var _TRACK_PRAYERS=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
// Kurdish day abbreviations (Sun–Sat)
var _KU_DAYS=['ئێکشەمبی','دووشەمبی','سێشەمبی','چارشەمبی','پێنجشەمبی','ئەینی','شەمبی'];
var _KU_DAYS_FULL=['ئێکشەمبی','دووشەمبی','سێشەمبی','چارشەمبی','پێنجشەمبی','ئەینی','شەمبی'];

function getPrayerLog(){try{return JSON.parse(localStorage.getItem('prayer_log'))||{};}catch(e){return {};}}
function savePrayerLog(log){
  var cutoff=dateKey(new Date(Date.now()-90*86400000));
  Object.keys(log).forEach(function(k){if(k<cutoff)delete log[k];});
  try{localStorage.setItem('prayer_log',JSON.stringify(log));}catch(e){}
  if(S.user)debouncedSync();
}
function togglePrayerDone(prayer){
  var log=getPrayerLog();var today=_getPrayerDay();
  if(!log[today])log[today]={};
  log[today][prayer]=!log[today][prayer];
  savePrayerLog(log);return log[today][prayer];
}

// ── Prayer tracking start date ───────────────────────────────────────────────
// Days before this date are locked — user can't check them.
// Set once on first panel open: uses earliest existing log entry, or today.
function _prayerTrackingStart(){return localStorage.getItem('prayerTrackingStart')||null;}
function _initPrayerTrackingStart(){
  if(localStorage.getItem('prayerTrackingStart'))return;
  var log=getPrayerLog();var keys=Object.keys(log).sort();
  var start=keys.length>0?keys[0]:_getPrayerDay();
  localStorage.setItem('prayerTrackingStart',start);
  if(window.S&&S.user)debouncedSync();
}

// ── Smart prayer engine ──────────────────────────────────────────────────────

// Timings for any date key (YYYY-MM-DD).
// Primary: window._prayerUITimings exposed by prayer.ui.js buildPanel() — reliable on iOS WKWebView
// where the localStorage prayer-kurd3: cache may not be populated yet.
// Fallback: localStorage cache populated by prayer.cache.js.
function _getTimingsForDate(dKey){
  if(window._prayerUITimings&&window._prayerUIDate===dKey){
    var lt=window._prayerUITimings;
    return{Fajr:lt.Fajr,Sunrise:lt.Sunrise,Dhuhr:lt.Dhuhr,Asr:lt.Asr,Maghrib:lt.Maghrib,Isha:lt.Isha};
  }
  try{
    var city=localStorage.getItem('prayerCity')||'Duhok';
    var pts=dKey.split('-').map(Number);
    var mkey='prayer-kurd3:'+city+':'+pts[0]+':'+pts[1];
    var raw=localStorage.getItem(mkey);
    if(!raw)return null;
    var monthly=JSON.parse(raw);
    if(!monthly||!monthly.days)return null;
    var d=monthly.days[pts[2]]||monthly.days[String(pts[2])];
    if(!d)return null;
    return{Fajr:d.Fajr,Sunrise:d.Sunrise,Dhuhr:d.Dhuhr,Asr:d.Asr,Maghrib:d.Maghrib,Isha:d.Isha};
  }catch(e){return null;}
}
function _getTodayTimings(){return _getTimingsForDate(dateKey(new Date()));}

// Islamic prayer day: before today's Fajr → still in yesterday's prayer day
function _getPrayerDay(){
  var now=new Date();var todayKey=dateKey(now);
  // Use live panel timings as fallback — covers the case where localStorage cache
  // hasn't populated yet (common on iOS WKWebView before prayer tab loads)
  var t=_getTimingsForDate(todayKey)||
    (window._prayerUITimings&&{Fajr:window._prayerUITimings.Fajr});
  if(t&&t.Fajr){
    var hm=t.Fajr.trim().split(' ')[0].split(':');
    var h=+hm[0],m=+hm[1];
    if(!isNaN(h)&&!isNaN(m)){
      // UTC+3 arithmetic — identical to _pppMsUntil — avoids device-timezone vs
      // Baghdad-timezone mismatch that caused wrong pre-Fajr detection
      var nowBgd=Date.now()+3*3600000;
      var dayStart=nowBgd-(nowBgd%86400000);
      var fajrMs=dayStart+h*3600000+m*60000;
      if(nowBgd<fajrMs){var y=new Date(now);y.setDate(y.getDate()-1);return dateKey(y);}
    }
  }
  return todayKey;
}

// Can a prayer be checked? Handles prayer-day concept + time windows.
// Past days: always (if >= tracking start). Future: never. Prayer day: only after prayer time starts.
function _isPrayerCheckable(prayer,dKey){
  var now=new Date();var todayKey=dateKey(now);var prayerDay=_getPrayerDay();
  var ts=_prayerTrackingStart();if(ts&&dKey<ts)return false;
  if(dKey<prayerDay)return true;
  // Past calendar days are always editable even in the pre-Fajr window where
  // prayerDay still equals yesterday (dKey===prayerDay), so the check above misses them.
  if(dKey<todayKey)return true;
  if(dKey>todayKey)return false;
  if(dKey===todayKey&&prayerDay!==todayKey)return false;
  // Primary: localStorage cache keyed by city+month. Fallback: live panel timings
  // (window._prayerUITimings) — covers the case where the date-key format differs
  // between PrayerLogic.todayBaghdad() (Asia/Baghdad locale) and dateKey(new Date())
  // (device local), causing _getTimingsForDate to miss the cache and return null.
  var timings=_getTimingsForDate(dKey);
  if(!timings&&window._prayerUITimings){
    timings={Fajr:window._prayerUITimings.Fajr,Dhuhr:window._prayerUITimings.Dhuhr,
      Asr:window._prayerUITimings.Asr,Maghrib:window._prayerUITimings.Maghrib,
      Isha:window._prayerUITimings.Isha};
  }
  if(!timings||!timings[prayer])return false;
  // Use UTC+3 arithmetic (same as _pppMsUntil / _msToPrayer) — consistent with
  // countdown display and avoids device-timezone vs Baghdad-timezone mismatch.
  return _pppMsUntil(timings[prayer])<=0;
}

function calcPrayerStreak(log){
  var streak=0;var pDay=_getPrayerDay();var pp=pDay.split('-');
  var d=new Date(+pp[0],+pp[1]-1,+pp[2]);var ts=_prayerTrackingStart();
  for(var i=0;i<365;i++){
    var k=dateKey(d);if(ts&&k<ts)break;
    var day=log[k]||{};
    var cnt=_TRACK_PRAYERS.filter(function(pr){return day[pr];}).length;
    if(cnt>=5)streak++;else if(i>0)break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

/* ===== PRAYER PROGRESS PAGE ===== */
var _pppMonthOffset=0;
var _pppTickId=null;
var _pppCdTickId=null;

// ms remaining until prayer timeStr (UTC+3 arithmetic, same as prayer.ui.js)
function _pppMsUntil(timeStr){
  var hm=timeStr.trim().split(' ')[0].split(':');
  var h=parseInt(hm[0],10);var m=parseInt(hm[1],10);
  if(isNaN(h)||isNaN(m))return -1;
  var nowBgd=Date.now()+3*3600000;
  var dayStart=nowBgd-(nowBgd%86400000);
  return dayStart+h*3600000+m*60000-nowBgd;
}
// Format ms → "٢س ٥خ" / "٤٧خ" / "٣٨چ"
function _pppFmtMs(ms){
  var s=Math.max(0,Math.floor(ms/1000));
  var h=Math.floor(s/3600);s-=h*3600;
  var m=Math.floor(s/60);s-=m*60;
  if(h>0)return h+'س'+(m>0?' '+m+'خ':'');
  if(m>0)return m+'خ'+(s>0?' '+s+'چ':'');
  return s+'چ';
}

function _startPppTick(){
  if(_pppTickId)return;
  _pppTickId=setInterval(function(){
    var panel=$('prayerProgressPanel');
    if(!panel||!panel.classList.contains('on')){_stopPppTick();return;}
    _pppSyncPanel(getPrayerLog(),dateKey(new Date()));
  },20000);
}
function _stopPppTick(){if(_pppTickId){clearInterval(_pppTickId);_pppTickId=null;}}

// Lightweight 1-second tick — only updates countdown text on locked buttons
function _startPppCdTick(){
  if(_pppCdTickId)return;
  _pppCdTickId=setInterval(function(){
    var panel=$('prayerProgressPanel');
    if(!panel||!panel.classList.contains('on')){_stopPppCdTick();return;}
    var pDay=dateKey(new Date()); // calendar date — matches panel display
    var timings=_getTimingsForDate(pDay)||
      (window._prayerUITimings&&{Fajr:window._prayerUITimings.Fajr,Dhuhr:window._prayerUITimings.Dhuhr,
        Asr:window._prayerUITimings.Asr,Maghrib:window._prayerUITimings.Maghrib,Isha:window._prayerUITimings.Isha});
    var needsSync=false;
    panel.querySelectorAll('.ppp-today-card .ppp-prayer-btn.not-yet .ppp-cd').forEach(function(cdSpan){
      var p=cdSpan.closest('.ppp-prayer-btn').dataset.prayer;
      if(!timings||!timings[p]){cdSpan.textContent='';return;}
      var rem=_pppMsUntil(timings[p]);
      if(rem<=0){
        needsSync=true; // prayer time just passed — unlock immediately on next sync
      }else{
        cdSpan.textContent=_pppFmtMs(rem);
      }
    });
    // Immediately sync panel when any countdown reaches zero — don't wait for the
    // 20-second tick. Prayer time passed = button should unlock right now.
    if(needsSync)_pppSyncPanel(getPrayerLog(),pDay);
  },1000);
}
function _stopPppCdTick(){if(_pppCdTickId){clearInterval(_pppCdTickId);_pppCdTickId=null;}}

function calcBestPrayerStreak(log){
  var keys=Object.keys(log).sort();var best=0,cur=0;
  for(var i=0;i<keys.length;i++){
    var cnt=_TRACK_PRAYERS.filter(function(p){return log[keys[i]][p];}).length;
    if(cnt>=5){cur++;if(cur>best)best=cur;}else cur=0;
  }
  return best;
}
function calcPrayerMonthStats(log,year,month){
  var now=new Date();var today=dateKey(now);var ts=_prayerTrackingStart();
  var full=0,done=0,total=0;
  var d=new Date(year,month,1);
  while(d.getMonth()===month){
    var k=dateKey(d);
    if(k<=today&&(!ts||k>=ts)){
      total++;var dl=log[k]||{};
      var cnt=_TRACK_PRAYERS.filter(function(p){return dl[p];}).length;
      done+=cnt;if(cnt>=5)full++;
    }
    d.setDate(d.getDate()+1);
  }
  return{full:full,done:done,total:total};
}
function calcPrayerWeekData(log){
  var now=new Date();var pDay=_getPrayerDay();var result=[];
  // Fixed Kurdish week: Saturday→Friday; (getDay()+1)%7 gives 0=Sat…6=Fri
  var weekOffset=(now.getDay()+1)%7;
  var satStart=new Date(now);satStart.setDate(now.getDate()-weekOffset);
  for(var i=0;i<7;i++){
    var d=new Date(satStart);d.setDate(satStart.getDate()+i);
    var k=dateKey(d);var dl=log[k]||{};
    var cnt=_TRACK_PRAYERS.filter(function(p){return dl[p];}).length;
    result.push({key:k,dow:d.getDay(),cnt:cnt,isToday:k===pDay});
  }
  return result;
}
function calcMostMissed(log){
  var now=new Date();var missed={};var hasSome=false;
  _TRACK_PRAYERS.forEach(function(p){missed[p]=0;});
  for(var i=0;i<30;i++){
    var d=new Date(now);d.setDate(d.getDate()-i);
    var k=dateKey(d);
    if(log[k]){hasSome=true;_TRACK_PRAYERS.forEach(function(p){if(!log[k][p])missed[p]++;});}
  }
  if(!hasSome)return null;
  var most=_TRACK_PRAYERS.reduce(function(a,b){return missed[a]>missed[b]?a:b;});
  return{prayer:most,count:missed[most]};
}

// Consistency score 0-100 over last N days (default 30)
function calcConsistencyScore(log,days){
  var n=days||30;var now=new Date();var done=0;
  for(var i=0;i<n;i++){
    var d=new Date(now);d.setDate(d.getDate()-i);
    var dl=log[dateKey(d)]||{};
    done+=_TRACK_PRAYERS.filter(function(p){return dl[p];}).length;
  }
  return Math.round((done/(n*5))*100);
}
// Weakest day of week over last 90 days: {dow, avg, name}
function calcWeakestDay(log){
  var totals=[0,0,0,0,0,0,0],counts=[0,0,0,0,0,0,0];
  var now=new Date();var dayNames=['ئێکشەمبی','دووشەمبی','سێشەمبی','چارشەمبی','پێنجشەمبی','ئەینی','شەمبی'];
  for(var i=1;i<=90;i++){
    var d=new Date(now);d.setDate(d.getDate()-i);
    var k=dateKey(d);var dow=d.getDay();
    if(log[k]){counts[dow]++;totals[dow]+=_TRACK_PRAYERS.filter(function(p){return log[k][p];}).length;}
  }
  var minAvg=6,minDow=-1;
  for(var j=0;j<7;j++){
    if(counts[j]>=2){var avg=totals[j]/counts[j];if(avg<minAvg){minAvg=avg;minDow=j;}}
  }
  return minDow>=0?{dow:minDow,avg:Math.round(minAvg*10)/10,name:dayNames[minDow]}:null;
}
// Month projection: estimated full-prayer-days by end of month at current rate
function calcMonthProjection(log){
  var now=new Date();var ms=calcPrayerMonthStats(log,now.getFullYear(),now.getMonth());
  if(ms.total<3)return null;
  var daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  var remaining=daysInMonth-now.getDate();
  var rate=ms.full/ms.total;
  return{current:ms.full,projected:Math.min(Math.round(ms.full+rate*remaining),daysInMonth),rate:Math.round(rate*100),daysLeft:remaining};
}
// Active streak: consecutive prayer-days with >= threshold prayers (default 4)
function calcActiveStreak(log,min){
  var threshold=min||4;var streak=0;var pDay=_getPrayerDay();
  var pp=pDay.split('-');var d=new Date(+pp[0],+pp[1]-1,+pp[2]);
  var ts=_prayerTrackingStart();
  for(var i=0;i<365;i++){
    var k=dateKey(d);if(ts&&k<ts)break;
    var day=log[k]||{};
    var cnt=_TRACK_PRAYERS.filter(function(pr){return day[pr];}).length;
    if(cnt>=threshold)streak++;else if(i>0)break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

App.openDlManager=openDlManager;
App.closeDlManager=closeDlManager;

App.openPrayerProgress=function(){
  _initPrayerTrackingStart();
  var panel=$('prayerProgressPanel');
  _pppMonthOffset=0;
  _buildPrayerProgressPanel(panel);
  panel.classList.add('on');
  _startPppTick();_startPppCdTick();
};
App.closePrayerProgress=function(){
  _stopPppTick();_stopPppCdTick();
  var p=$('prayerProgressPanel');if(p)p.classList.remove('on');
};
App.openPrayerDay=function(dKey){
  var log=getPrayerLog();var dayLog=log[dKey]||{};
  var sheet=$('pppDaySheet');clear(sheet);
  sheet.appendChild(el('div','ppp-day-pull'));
  var parts=dKey.split('-');
  var d=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
  var dayNames=['ئێکشەمبی','دووشەمبی','سێشەمبی','چارشەمبی','پێنجشەمبی','ئەینی','شەمبی'];
  sheet.appendChild(el('div','ppp-day-title',dayNames[d.getDay()]+' — '+parts[2]+'/'+parts[1]));
  var btns=el('div','ppp-day-prayers');
  _TRACK_PRAYERS.forEach(function(prayer){
    var isDone=!!(dayLog[prayer]);
    var passed=_isPrayerCheckable(prayer,dKey);
    var canInteract=isDone||passed; // always allow unchecking already-done prayers
    var btn=document.createElement('button');
    btn.className='ppp-prayer-btn'+(isDone?' on':'')+(canInteract?'':' not-yet');
    btn.dataset.prayer=prayer;
    var ic=document.createElement('i');
    ic.className=isDone?'fas fa-check-circle':(passed?'far fa-circle':'fas fa-clock');
    btn.appendChild(ic);btn.appendChild(el('span','ppp-prayer-name',t('prayer.'+prayer.toLowerCase())));
    if(!canInteract){btn.disabled=true;btns.appendChild(btn);return;}
    btn.onclick=function(){
      var fl=getPrayerLog();if(!fl[dKey])fl[dKey]={};
      var prevCnt=_TRACK_PRAYERS.filter(function(p){return fl[dKey][p];}).length;
      fl[dKey][prayer]=!fl[dKey][prayer];savePrayerLog(fl);isDone=fl[dKey][prayer];
      btn.classList.toggle('on',isDone);ic.className=isDone?'fas fa-check-circle':(passed?'far fa-circle':'fas fa-clock');haptic([8]);
      // Refresh calendar cell
      var cell=document.querySelector('[data-ppp-key="'+dKey+'"]');
      if(cell){
        var nl=getPrayerLog();var nc=_TRACK_PRAYERS.filter(function(p){return(nl[dKey]||{})[p];}).length;
        var cls='ppp-cal-cell'+(nc>=5?' full':nc>=4?' high':nc>=2?' mid':nc>=1?' low':'');
        if(dKey===dateKey(new Date()))cls+=' today-cell';
        cell.className=cls;
        if(isDone&&nc===5&&prevCnt<5)_pppCheckCelebrate(nl,dKey);
      }
      // Refresh week dot
      var wd=document.querySelector('.ppp-wday[data-ppp-wkey="'+dKey+'"] .ppp-wday-dot');
      if(wd){var nl2=getPrayerLog();var nc2=_TRACK_PRAYERS.filter(function(p){return(nl2[dKey]||{})[p];}).length;
        wd.className='ppp-wday-dot'+(nc2>=5?' full':nc2>=4?' high':nc2>=3?' mid':nc2>=1?' low':'');wd.textContent=nc2>0?nc2:'';}
      // Sync all panel stats + insights immediately
      _pppSyncPanel(getPrayerLog(),dKey);_updatePrayerBadge();
    };
    btns.appendChild(btn);
  });
  sheet.appendChild(btns);
  $('pppDayOverlay').classList.add('on');
};
App.closePrayerDay=function(){
  $('pppDayOverlay').classList.remove('on');
};

function _pppStreakVal(n){return n>0?'🔥 '+n:'0';}

// Live-update all panel stats + insights immediately after any prayer toggle
function _pppSyncPanel(log,changedDKey){
  var panel=$('prayerProgressPanel');if(!panel)return;
  var now=new Date();var pDay=dateKey(now); // calendar date — consistent with _buildPrayerProgressPanel
  var streak=calcPrayerStreak(log);var best=calcBestPrayerStreak(log);
  var mStats=calcPrayerMonthStats(log,now.getFullYear(),now.getMonth());
  var consistency=calcConsistencyScore(log,30);
  var sv=panel.querySelector('.ppp-stat-streak');if(sv)sv.textContent=_pppStreakVal(streak);
  var bv=panel.querySelector('.ppp-stat-best');if(bv)bv.textContent=best>0?'⭐ '+best:'0';
  var mv=panel.querySelector('.ppp-stat-month');if(mv)mv.textContent=mStats.full+'/'+mStats.total;
  var cv=panel.querySelector('.ppp-stat-consistency');if(cv)cv.textContent=consistency+'%';
  // Today card — update count, bar, motivate AND individual button states
  if(changedDKey===pDay){
    var nd=_TRACK_PRAYERS.filter(function(p){return(log[pDay]||{})[p];}).length;
    var tc=panel.querySelector('.ppp-today-count');if(tc)tc.textContent=nd+'/5';
    var pf=panel.querySelector('.ppp-progress-fill');if(pf)pf.style.width=((nd/5)*100)+'%';
    var mot=panel.querySelector('.ppp-motivate');if(mot)mot.textContent=_pppMsg(nd);
    // Sync individual prayer button states in today card — including unlocking when time arrives
    _TRACK_PRAYERS.forEach(function(p){
      var isDone2=!!(log[pDay]&&log[pDay][p]);
      var passed2=_isPrayerCheckable(p,pDay);
      var canCheck2=isDone2||passed2;
      var btn2=panel.querySelector('.ppp-today-card .ppp-prayer-btn[data-prayer="'+p+'"]');
      if(!btn2)return;
      btn2.classList.toggle('on',isDone2);
      btn2.classList.toggle('not-yet',!canCheck2);
      btn2.disabled=!canCheck2;
      // Remove countdown span when button unlocks
      if(canCheck2){var oldCd=btn2.querySelector('.ppp-cd');if(oldCd)oldCd.parentNode.removeChild(oldCd);}
      // Attach onclick the first time a button becomes checkable (was locked at build time)
      if(canCheck2&&!btn2._pppClickAttached){
        btn2._pppClickAttached=true;
        btn2.onclick=(function(pr){return function(){
          var pd=_getPrayerDay();
          var prev=_TRACK_PRAYERS.filter(function(q){return(getPrayerLog()[pd]||{})[q];}).length;
          var ns=togglePrayerDone(pr);haptic([8]);
          var nl=getPrayerLog();var nd=_TRACK_PRAYERS.filter(function(q){return(nl[pd]||{})[q];}).length;
          if(ns&&nd===5&&prev<5)_pppCheckCelebrate(nl,pd);
          _pppSyncPanel(nl,pd);
        };})(p);
      }
      var ic2=btn2.querySelector('i');
      if(ic2)ic2.className=isDone2?'fas fa-check-circle':(canCheck2?'far fa-circle':'fas fa-clock');
    });
  }
  // Day sheet — sync button states if the sheet is open for the same day
  var dayOverlay=$('pppDayOverlay');
  if(dayOverlay&&dayOverlay.classList.contains('on')){
    _TRACK_PRAYERS.forEach(function(p){
      var isDoneD=!!(log[changedDKey]&&log[changedDKey][p]);
      var passedD=_isPrayerCheckable(p,changedDKey);
      var btnD=document.querySelector('#pppDaySheet .ppp-prayer-btn[data-prayer="'+p+'"]');
      if(!btnD)return;
      btnD.classList.toggle('on',isDoneD);
      var icD=btnD.querySelector('i');
      if(icD)icD.className=isDoneD?'fas fa-check-circle':(passedD?'far fa-circle':'fas fa-clock');
    });
  }
  // Prayer grid card done-dot (prayer.ui.js panel) — keep in sync
  if(changedDKey===pDay){
    _TRACK_PRAYERS.forEach(function(p){
      var isDoneG=!!(log[pDay]&&log[pDay][p]);
      var gridCard=document.querySelector('.prayer-grid-card[data-prayer="'+p+'"]');
      if(!gridCard)return;
      var dot=gridCard.querySelector('.pcso-done-dot');
      if(isDoneG){if(!dot){dot=document.createElement('div');dot.className='pcso-done-dot';gridCard.appendChild(dot);}}
      else{if(dot)dot.parentNode.removeChild(dot);}
    });
  }
  // Calendar cell — live color update for the changed day
  var calCell=document.querySelector('.ppp-cal-cell[data-ppp-key="'+changedDKey+'"]');
  if(calCell){
    var cc=(log[changedDKey]||{});
    var nc=_TRACK_PRAYERS.filter(function(p){return cc[p];}).length;
    var trackStart=_prayerTrackingStart();
    var isBeforeStart=!!(trackStart&&changedDKey<trackStart);
    var ccls='ppp-cal-cell';
    if(isBeforeStart)ccls+=' before-start';
    else ccls+=nc>=5?' full':nc>=4?' high':nc>=2?' mid':nc>=1?' low':'';
    if(changedDKey===dateKey(new Date()))ccls+=' today-cell';
    calCell.className=ccls;
  }
  // Week dot — live color update for the changed day
  var wdotEl=document.querySelector('.ppp-wday[data-ppp-wkey="'+changedDKey+'"] .ppp-wday-dot');
  if(wdotEl){
    var wc=(log[changedDKey]||{});
    var wn=_TRACK_PRAYERS.filter(function(p){return wc[p];}).length;
    wdotEl.className='ppp-wday-dot'+(wn>=5?' full':wn>=4?' high':wn>=3?' mid':wn>=1?' low':'');
    wdotEl.textContent=wn>0?wn:'';
  }
  // Insights — rebuild in-place
  var oldIns=panel.querySelector('.ppp-insights');
  if(oldIns){
    var newIns=_buildPppInsights(log,mStats,calcPrayerWeekData(log),calcMostMissed(log));
    oldIns.parentNode.replaceChild(newIns,oldIns);
  }
}
function _pppMsg(n){
  if(n>=5)return'ماشاءالله‌! تە ئەڤڕۆ هەمی نڤێژێن خۆ تەمام کرن 🌟';
  if(n>=4)return'باشترینن — نڤێژا دوماهییێ تەمام بکە ⭐';
  if(n>=3)return'نێزیک بووی — بەردەوام بە 💚';
  if(n>=1)return'تە دەست پێ کر — ئەڤڕۆ زێدە بکە 🤲';
  return'ئەڤڕۆ هێشتا تە نڤێژ نەکریە — دەست پێ بکە 🌅';
}

function _buildPrayerProgressPanel(panel){
  clear(panel);
  var log=getPrayerLog();var now=new Date();
  // Always use the calendar date (midnight-based) for the today card.
  // Before Fajr: shows today's prayers as locked with countdown — user sees
  // today's fresh grid, not yesterday's completed state.
  var today=dateKey(now);
  var todayLog=log[today]||{};
  var doneToday=_TRACK_PRAYERS.filter(function(p){return todayLog[p];}).length;
  var streak=calcPrayerStreak(log);var best=calcBestPrayerStreak(log);
  var consistency=calcConsistencyScore(log,30);
  var mStats=calcPrayerMonthStats(log,now.getFullYear(),now.getMonth());
  var weekData=calcPrayerWeekData(log);var missed=calcMostMissed(log);

  // Header
  var hdr=el('div','ppp-hdr');
  var back=document.createElement('button');back.className='ppp-back';
  back.setAttribute('aria-label','داخستن');
  back.appendChild(icon('fas fa-chevron-right'));on(back,'click',App.closePrayerProgress);
  hdr.appendChild(back);hdr.appendChild(el('span','ppp-title','نڤێژکرن'));
  var sp=el('div');sp.style.width='36px';hdr.appendChild(sp);
  panel.appendChild(hdr);

  var body=el('div','ppp-body');

  // ─ Today card ─────────────────────────────────────────────
  var card=el('div','ppp-today-card');
  var topRow=el('div','ppp-today-hdr');
  var todayLabel='ئەڤڕۆ';
  topRow.appendChild(el('span','ppp-today-label',todayLabel));
  var countEl=el('span','ppp-today-count',doneToday+'/5');topRow.appendChild(countEl);
  card.appendChild(topRow);
  var bar=el('div','ppp-progress-bar');
  var fill=el('div','ppp-progress-fill');fill.style.width=((doneToday/5)*100)+'%';
  bar.appendChild(fill);card.appendChild(bar);
  var pBtns=el('div','ppp-prayers');
  _TRACK_PRAYERS.forEach(function(prayer){
    var isDone=!!(todayLog[prayer]);
    var passed=_isPrayerCheckable(prayer,today);
    var canInteract=isDone||passed; // always allow unchecking already-done prayers
    var btn=document.createElement('button');
    btn.className='ppp-prayer-btn'+(isDone?' on':'')+(canInteract?'':' not-yet');
    btn.dataset.prayer=prayer;
    var ic=document.createElement('i');
    ic.className=isDone?'fas fa-check-circle':(passed?'far fa-circle':'fas fa-clock');
    btn.appendChild(ic);btn.appendChild(el('span','ppp-prayer-name',t('prayer.'+prayer.toLowerCase())));
    if(!canInteract){
      btn.disabled=true;
      var cdSpan=el('span','ppp-cd','');
      // Seed initial countdown text so it shows immediately (tick fills in at t+1s)
      var initTimings=_getTimingsForDate(today);
      if(initTimings&&initTimings[prayer]){var initRem=_pppMsUntil(initTimings[prayer]);if(initRem>0)cdSpan.textContent=_pppFmtMs(initRem);}
      btn.appendChild(cdSpan);
    }else{
      btn._pppClickAttached=true; // prevents _pppSyncPanel from overwriting this handler
      btn.onclick=function(){
        var prevDone=_TRACK_PRAYERS.filter(function(p){return(getPrayerLog()[today]||{})[p];}).length;
        var ns=togglePrayerDone(prayer);
        btn.classList.toggle('on',ns);ic.className=ns?'fas fa-check-circle':(passed?'far fa-circle':'fas fa-clock');haptic([8]);
        var nl=getPrayerLog();var nd=_TRACK_PRAYERS.filter(function(p){return(nl[today]||{})[p];}).length;
        countEl.textContent=nd+'/5';fill.style.width=((nd/5)*100)+'%';
        var mv=card.querySelector('.ppp-motivate');if(mv)mv.textContent=_pppMsg(nd);
        var sv=body.querySelector('.ppp-stat-streak');if(sv)sv.textContent=_pppStreakVal(calcPrayerStreak(nl));
        var wdot=body.querySelector('.ppp-wday.today .ppp-wday-dot');
        if(wdot){wdot.className='ppp-wday-dot'+(nd>=5?' full':nd>=4?' high':nd>=3?' mid':nd>=1?' low':'');wdot.textContent=nd>0?nd:'';}
        if(ns&&nd===5&&prevDone<5)_pppCheckCelebrate(nl,today);
        _pppSyncPanel(nl,today);_updatePrayerBadge();
      };
    }
    pBtns.appendChild(btn);
  });
  card.appendChild(pBtns);card.appendChild(el('p','ppp-motivate',_pppMsg(doneToday)));
  body.appendChild(card);

  // ─ Stats ──────────────────────────────────────────────────
  var stats=el('div','ppp-stats');
  function mkStat(val,lbl,extraCls){
    var s=el('div','ppp-stat');
    s.appendChild(el('span','ppp-stat-val'+(extraCls?' '+extraCls:''),val));
    s.appendChild(el('span','ppp-stat-lbl',lbl));return s;
  }
  stats.appendChild(mkStat(_pppStreakVal(streak),'بەردەوامیا ڕۆژانە','ppp-stat-streak'));
  stats.appendChild(mkStat(best>0?'⭐ '+best:'0','باشترین بەردەوامی','ppp-stat-best'));
  stats.appendChild(mkStat(mStats.full+'/'+mStats.total,'ئەڤ هەیڤە تەمام بوو','ppp-stat-month'));
  stats.appendChild(mkStat(consistency+'%','پێگیری د ٣٠ ڕۆژان دا','ppp-stat-consistency'));
  body.appendChild(stats);

  // ─ This week ──────────────────────────────────────────────
  body.appendChild(el('div','ppp-section-title',t('ppp.section_week')||'حەفتیا دوماهییێ'));
  var week=el('div','ppp-week');
  week.setAttribute('dir','rtl');
  weekData.forEach(function(d){
    var div=el('div','ppp-wday'+(d.isToday?' today':''));
    div.setAttribute('data-ppp-wkey',d.key);
    div.appendChild(el('span','ppp-wday-name',_KU_DAYS_FULL[d.dow]));
    var dotCls='ppp-wday-dot'+(d.cnt>=5?' full':d.cnt>=4?' high':d.cnt>=3?' mid':d.cnt>=1?' low':'');
    div.appendChild(el('div',dotCls,d.cnt>0?String(d.cnt):''));
    on(div,'click',function(key){return function(){App.openPrayerDay(key);};}(d.key));
    week.appendChild(div);
  });
  body.appendChild(week);

  // ─ Monthly calendar ───────────────────────────────────────
  body.appendChild(el('div','ppp-section-title','هەیڤ'));
  body.appendChild(_buildPppCal(log));

  // ─ Insights ───────────────────────────────────────────────
  body.appendChild(el('div','ppp-section-title',t('ppp.section_insights')||'ئاگەهدار'));
  body.appendChild(_buildPppInsights(log,mStats,weekData,missed));

  // ─ New Start ──────────────────────────────────────────────
  var nsWrap=el('div','ppp-newstart-wrap');
  var nsBtn=document.createElement('button');nsBtn.className='ppp-newstart-btn';
  nsBtn.appendChild(icon('fas fa-redo-alt'));nsBtn.appendChild(document.createTextNode(' دەستپێکرنەکا نوی'));
  on(nsBtn,'click',function(){
    var ov=el('div','ppp-ns-overlay');
    var card=el('div','ppp-ns-card');
    var iconEl=el('div','ppp-ns-icon');iconEl.appendChild(icon('fas fa-redo-alt'));
    var title=el('div','ppp-ns-title','دەستپێکرنەکا نوی');
    var sub=el('div','ppp-ns-sub','هەمی تۆمارێن نڤێژان دێ هێنە ژێبرن و تو دێ ژ ئەڤڕۆ پێ ڤە دەست پێ کەی.');
    var btns=el('div','ppp-ns-btns');
    var yesBtn=document.createElement('button');yesBtn.className='ppp-ns-yes';yesBtn.textContent='بەلێ، ژێ ببە';
    var noBtn=document.createElement('button');noBtn.className='ppp-ns-no';noBtn.textContent='نەخێر';
    function closeOv(){document.body.removeChild(ov);}
    on(yesBtn,'click',function(){
      closeOv();
      savePrayerLog({});
      localStorage.setItem('prayerTrackingStart',_getPrayerDay());
      _pppMonthOffset=0;
      _buildPrayerProgressPanel(panel);
      _updatePrayerBadge();
    });
    on(noBtn,'click',closeOv);
    on(ov,'click',function(e){if(e.target===ov)closeOv();});
    btns.appendChild(noBtn);btns.appendChild(yesBtn);
    card.appendChild(iconEl);card.appendChild(title);card.appendChild(sub);card.appendChild(btns);
    ov.appendChild(card);document.body.appendChild(ov);
  });
  nsWrap.appendChild(nsBtn);
  body.appendChild(nsWrap);

  panel.appendChild(body);
}

function _buildPppCal(log){
  var now=new Date();
  var tgt=new Date(now.getFullYear(),now.getMonth()+_pppMonthOffset,1);
  var year=tgt.getFullYear();var month=tgt.getMonth();
  var today=dateKey(now);var isCur=(year===now.getFullYear()&&month===now.getMonth());
  var wrap=el('div','ppp-cal-wrap');wrap.id='pppCalWrap';
  // Nav
  var nav=el('div','ppp-cal-nav');
  var prevBtn=document.createElement('button');prevBtn.className='ppp-cal-btn';
  prevBtn.setAttribute('aria-label','ماوەی پێشوو');
  prevBtn.appendChild(icon('fas fa-chevron-right'));
  on(prevBtn,'click',function(){_pppMonthOffset--;var o=$('pppCalWrap');if(o){var n=_buildPppCal(getPrayerLog());o.parentNode.replaceChild(n,o);}});
  var nextBtn=document.createElement('button');nextBtn.className='ppp-cal-btn';
  nextBtn.setAttribute('aria-label','ماوەی دواتر');
  if(isCur){nextBtn.disabled=true;nextBtn.style.opacity='.3';}
  nextBtn.appendChild(icon('fas fa-chevron-left'));
  on(nextBtn,'click',function(){if(_pppMonthOffset>=0)return;_pppMonthOffset++;var o=$('pppCalWrap');if(o){var n=_buildPppCal(getPrayerLog());o.parentNode.replaceChild(n,o);}});
  nav.appendChild(nextBtn);
  nav.appendChild(el('span','ppp-cal-month',t('goals.months.'+(month+1))+' '+year));
  nav.appendChild(prevBtn);
  wrap.appendChild(nav);
  // Day headers
  var dhr=el('div','ppp-cal-grid');
  _KU_DAYS.forEach(function(d){dhr.appendChild(el('div','ppp-cal-dh',d));});
  wrap.appendChild(dhr);
  // Cells
  var firstDow=tgt.getDay();var daysInMonth=new Date(year,month+1,0).getDate();
  var trackStart=_prayerTrackingStart();
  var grid=el('div','ppp-cal-grid');
  for(var e=0;e<firstDow;e++)grid.appendChild(el('div','ppp-cal-cell empty',''));
  for(var d=1;d<=daysInMonth;d++){
    var cellDate=new Date(year,month,d);var ck=dateKey(cellDate);
    var cl=log[ck]||{};var cnt=_TRACK_PRAYERS.filter(function(p){return cl[p];}).length;
    var isFuture=ck>today;var isBeforeStart=!!(trackStart&&ck<trackStart);
    var isToday=ck===today;
    var cls='ppp-cal-cell';
    if(isBeforeStart)cls+=' before-start';
    else if(isFuture)cls+=' future';
    else if(cnt>=5)cls+=' full';else if(cnt>=4)cls+=' high';else if(cnt>=2)cls+=' mid';else if(cnt>=1)cls+=' low';
    if(isToday)cls+=' today-cell';
    var cell=el('div',cls,String(d));cell.setAttribute('data-ppp-key',ck);
    if(!isFuture&&!isBeforeStart)(function(key){on(cell,'click',function(){App.openPrayerDay(key);});})(ck);
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);return wrap;
}

function _buildPppInsights(log,mStats,weekData,missed){
  var wrap=el('div','ppp-insights');
  function insightRow(bgColor,iColor,iClass,label,value){
    var r=el('div','ppp-insight-row');
    var ic=el('div','ppp-insight-icon');ic.style.background=bgColor;
    var ii=icon(iClass);ii.style.color=iColor;ic.appendChild(ii);r.appendChild(ic);
    var tx=el('div','ppp-insight-text');
    tx.appendChild(el('div','ppp-insight-label',label));
    tx.appendChild(el('div','ppp-insight-value',value));
    r.appendChild(tx);wrap.appendChild(r);
  }

  // This week %
  var weekDone=weekData.reduce(function(s,d){return s+d.cnt;},0);
  var weekPct=Math.round((weekDone/35)*100);
  insightRow('rgba(34,197,94,.12)','var(--accent)','fas fa-calendar-week',t('ppp.this_week')||'ئەڤ حەفتیە',weekPct+'% — '+weekDone+'/35 نڤێژ');

  // All missed prayers (30 days) — show each prayer with its miss count
  (function(){
    var now=new Date();var hasSome=false;
    var counts={};
    _TRACK_PRAYERS.forEach(function(p){counts[p]=0;});
    for(var i=0;i<30;i++){
      var d=new Date(now);d.setDate(d.getDate()-i);
      var k=dateKey(d);
      if(log[k]){hasSome=true;_TRACK_PRAYERS.forEach(function(p){if(!log[k][p])counts[p]++;});}
    }
    if(!hasSome)return;
    var sorted=_TRACK_PRAYERS.slice().sort(function(a,b){return counts[b]-counts[a];});
    var r=el('div','ppp-insight-row');
    var ic=el('div','ppp-insight-icon');ic.style.background='rgba(220,60,40,.12)';
    var ii=icon('fas fa-exclamation-circle');ii.style.color='#dc3c28';ic.appendChild(ii);r.appendChild(ic);
    var tx=el('div','ppp-insight-text');
    tx.appendChild(el('div','ppp-insight-label',t('ppp.missed_label')||'نڤێژێن نەهاتینە زێدەکرن (٣٠ ڕۆژ)'));
    var grid=el('div','ppp-missed-grid');
    sorted.forEach(function(p){
      var cell=el('div','ppp-missed-cell');
      var nameEl=el('span','ppp-missed-name',t('prayer.'+p.toLowerCase())||p);
      var cntEl=el('span','ppp-missed-cnt'+(counts[p]===0?' zero':''),counts[p]+' ڕۆژ');
      cell.appendChild(nameEl);cell.appendChild(cntEl);
      grid.appendChild(cell);
    });
    tx.appendChild(grid);r.appendChild(tx);wrap.appendChild(r);
  })();

  // Weakest day of week
  var weak=calcWeakestDay(log);
  if(weak){
    var weakColor=weak.avg<2?'#dc3c28':weak.avg<4?'#f09000':'var(--accent)';
    insightRow('rgba(240,144,0,.12)',weakColor,'fas fa-calendar-day',t('ppp.weakest_day')||'کەیفخۆشترین ڕۆژ',weak.name+' — '+weak.avg+'/5 ناڤنجی');
  }

  // Monthly avg per day
  if(mStats.total>0){
    var avg=(mStats.done/mStats.total).toFixed(1);
    insightRow('rgba(240,144,0,.12)','#f09000','fas fa-chart-line',t('ppp.monthly_avg')||'تێکڕایێ ئەڤێ هەیڤێ بۆ هەر ڕۆژەکێ',avg+'/5 نڤێژ');
  }

  // Month projection
  var proj=calcMonthProjection(log);
  if(proj&&proj.daysLeft>0){
    var projIcon=proj.rate>=80?'fas fa-rocket':proj.rate>=50?'fas fa-chart-line':'fas fa-seedling';
    var projColor=proj.rate>=80?'var(--accent)':proj.rate>=50?'#f09000':'#dc3c28';
    insightRow('rgba(34,197,94,.08)',projColor,projIcon,'ئەڤ هەیڤە د ناڤ '+proj.daysLeft+' ڕۆژان دا','پێشبینی دهێتە کرن '+proj.projected+' ڕۆژ تەمام ببن');
  }

  // Complete days this month
  if(mStats.full>0){
    insightRow('rgba(34,197,94,.12)','var(--accent)','fas fa-check-double','ڕۆژێن تەمام د ڤێ هەیڤێ دا',mStats.full+' ڕۆژ ('+Math.round((mStats.full/mStats.total)*100)+'%)');
  }

  return wrap;
}

/* ── Prayer celebration ──────────────────────────────────────────────────── */
function _pppCheckCelebrate(log,dKey){
  var now=new Date();var d=new Date(dKey.replace(/-/g,'/'));
  if(d.getMonth()!==now.getMonth()||d.getFullYear()!==now.getFullYear())return;
  // Year celebration takes full priority — check first
  var streak=calcPrayerStreak(log);
  var yearNum=Math.floor(streak/365);
  var yearCelebAt=parseInt(localStorage.getItem('prayerYearCelebAt')||'0');
  if(yearNum>=1&&yearNum>yearCelebAt){
    localStorage.setItem('prayerYearCelebAt',String(yearNum));
    setTimeout(function(){_pppCelebrateYear(log,streak,yearNum);},350);
    return;
  }
  // Month celebration: last day of month with every tracked day perfect
  var ms=calcPrayerMonthStats(log,now.getFullYear(),now.getMonth());
  var daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  var isLastDay=now.getDate()===daysInMonth;
  if(isLastDay&&ms.full>0&&ms.full===ms.total){setTimeout(function(){_pppCelebrateMonth(log);},350);}
  else{_pppCelebrateDay();}
}
function _pppCelebrateYear(log,streak,yearNum){
  haptic([30,12,30,12,50,12,80,12,100]);
  var best=calcBestPrayerStreak(log);
  var ov=document.createElement('div');ov.className='ppp-celeb-overlay year-celeb-overlay';ov.id='yearCelebOverlay';
  // 250 confetti — gold/silver/white/teal/green palette with star + circle + square shapes
  var colors=['#fbbf24','#f59e0b','#fde68a','#d4af37','#ffffff','#e2e8f0','#22c55e','#2dd4bf','#a78bfa','#fb923c'];
  var frag=document.createDocumentFragment();
  for(var i=0;i<250;i++){
    var p=document.createElement('div');p.className='ppp-conf';
    var sz=3+Math.random()*10;
    var shape=Math.random();
    var br=shape>.7?'0':shape>.4?'50%':'3px';
    p.style.cssText='left:'+Math.random()*100+'%;top:'+(Math.random()*-20)+'px;width:'+sz+'px;height:'+sz+'px;background:'+colors[Math.floor(Math.random()*colors.length)]+';border-radius:'+br+';animation-delay:'+Math.random()*2+'s;animation-duration:'+(2.5+Math.random()*2.5)+'s';
    frag.appendChild(p);
  }
  ov.appendChild(frag);
  var card=el('div','year-celeb-card');
  // Shimmer ring behind trophy
  var ring=el('div','year-celeb-ring');
  var iconEl=el('div','year-celeb-icon','🏆');
  ring.appendChild(iconEl);card.appendChild(ring);
  // Year number badge
  var yBadge=el('div','year-celeb-ybadge',yearNum>1?'ساڵی ژمارە '+yearNum:'ساڵا ئێکێ');
  card.appendChild(yBadge);
  card.appendChild(el('div','year-celeb-title','سالەک تەمام بوو! 🌟'));
  // Arabic verse
  card.appendChild(el('div','year-celeb-ayah','﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا ﴾'));
  var totalPrayers=yearNum*1825;
  card.appendChild(el('div','year-celeb-sub',yearNum>1?'ساڵێ '+yearNum+'ەم تەمام کر!\nخودێ قەبیل بکەت 🤲':totalPrayers+' نڤێژ تەمام بوون!\nخودێ قەبیل بکەت 🤲'));
  // Stats badges
  var badges=el('div','year-celeb-badges');
  badges.appendChild(el('div','year-celeb-badge gold','🔥 '+streak+' ڕۆژ ل دیف ئێک'));
  if(best>0&&best!==streak)badges.appendChild(el('div','year-celeb-badge silver','⭐ باشترین: '+best+' ڕۆژ'));
  badges.appendChild(el('div','year-celeb-badge teal','🕌 '+totalPrayers+' نڤێژ'));
  card.appendChild(badges);
  var btn=document.createElement('button');btn.className='year-celeb-btn';btn.textContent='داخستن';
  on(btn,'click',function(){App.closeYearCelebration();});
  card.appendChild(btn);
  on(ov,'click',function(e){if(e.target===ov)App.closeYearCelebration();});
  ov.appendChild(card);document.body.appendChild(ov);
}
App.closeYearCelebration=function(){
  var ov=$('yearCelebOverlay');if(!ov)return;
  ov.classList.add('out');setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},360);
};
App.testYearCelebration=function(){
  var l=getPrayerLog();var str=calcPrayerStreak(l);
  _pppCelebrateYear(l,str||365,1);
};
function _pppCelebrateDay(){
  haptic([8,5,12]);
  var fill=document.querySelector('.ppp-progress-fill');
  if(fill){fill.classList.add('ppp-pulse');setTimeout(function(){fill.classList.remove('ppp-pulse');},700);}
  var body=document.querySelector('#prayerProgressPanel .ppp-body');if(!body)return;
  var old=body.querySelector('.ppp-day-toast');if(old&&old.parentNode)old.parentNode.removeChild(old);
  var toast=el('div','ppp-day-toast','ماشاءالله‌! تە ئەڤڕۆ تەمام کر 🌟');
  body.insertBefore(toast,body.firstChild);
  setTimeout(function(){toast.classList.add('show');},20);
  setTimeout(function(){toast.classList.remove('show');setTimeout(function(){if(toast.parentNode)toast.parentNode.removeChild(toast);},400);},2800);
}
function _pppCelebrateMonth(log){
  haptic([20,10,20,10,30]);
  var streak=calcPrayerStreak(log);
  var ov=document.createElement('div');ov.className='ppp-celeb-overlay';ov.id='pppCelebOverlay';
  // Confetti particles
  var colors=['#22c55e','#f0b000','#3b82f6','#ec4899','#a855f7','#fbbf24','#fff'];
  var frag=document.createDocumentFragment();
  for(var i=0;i<90;i++){
    var p=document.createElement('div');p.className='ppp-conf';
    var sz=4+Math.random()*7;
    p.style.cssText='left:'+Math.random()*100+'%;top:-12px;width:'+sz+'px;height:'+sz+'px;background:'+colors[Math.floor(Math.random()*colors.length)]+';border-radius:'+(Math.random()>.5?'50%':'2px')+';animation-delay:'+Math.random()*1.2+'s;animation-duration:'+(2.2+Math.random()*2)+'s';
    frag.appendChild(p);
  }
  ov.appendChild(frag);
  // Achievement card
  var card=el('div','ppp-celeb-card');
  card.appendChild(el('div','ppp-celeb-icon','🕌'));
  card.appendChild(el('div','ppp-celeb-title','ما شاء الله! 🌟'));
  card.appendChild(el('div','ppp-celeb-sub','تە هەمی نڤێژێن مەهێ تەمام کرن!\nخودێ قبوول بکەت 🤲'));
  if(streak>0)card.appendChild(el('div','ppp-celeb-streak','🔥 '+streak+' ڕۆژ ل سەر ئێک'));
  var btn=document.createElement('button');btn.className='ppp-celeb-btn';btn.textContent='داخستن';
  on(btn,'click',function(){App.closePrayerCelebration();});
  card.appendChild(btn);
  on(ov,'click',function(e){if(e.target===ov)App.closePrayerCelebration();});
  ov.appendChild(card);
  document.body.appendChild(ov);
}
App.closePrayerCelebration=function(){
  var ov=$('pppCelebOverlay');if(!ov)return;
  ov.classList.add('out');setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},360);
};
App.testCelebration=function(){
  if(!$('prayerProgressPanel')||!$('prayerProgressPanel').classList.contains('on'))App.openPrayerProgress();
  setTimeout(function(){_pppCelebrateMonth(getPrayerLog());},400);
};
App.testDayToast=function(){_pppCelebrateDay();};

/* ── Khatm / Quran Journey Celebration ─────────────────────────────────── */
function _goalCelebrateKhatm(totalRead,streak,bestStreak){
  haptic([15,8,15,8,30,8,50]);
  var khatmNum=Math.floor(totalRead/6236); // which khatm (1st, 2nd, ...)
  var ov=document.createElement('div');ov.className='ppp-celeb-overlay khatm-celeb-overlay';ov.id='khatmCelebOverlay';
  // Confetti — gold/green/white palette, more particles than prayer
  var colors=['#fbbf24','#f59e0b','#22c55e','#86efac','#ffffff','#fde68a','#6ee7b7','#fcd34d'];
  var frag=document.createDocumentFragment();
  for(var i=0;i<160;i++){
    var p=document.createElement('div');p.className='ppp-conf';
    var sz=3+Math.random()*9;
    var isStr=Math.random()>.65; // some star shapes via border-radius 0
    p.style.cssText='left:'+Math.random()*100+'%;top:-14px;width:'+sz+'px;height:'+sz+'px;background:'+colors[Math.floor(Math.random()*colors.length)]+';border-radius:'+(isStr?'0':'50%')+';animation-delay:'+Math.random()*1.6+'s;animation-duration:'+(2.4+Math.random()*2.4)+'s';
    frag.appendChild(p);
  }
  ov.appendChild(frag);
  // Card
  var card=el('div','khatm-celeb-card');
  // Icon with glow
  var iconWrap=el('div','khatm-celeb-icon','📖');
  card.appendChild(iconWrap);
  // Title
  card.appendChild(el('div','khatm-celeb-title','ختم قورئانێ! 🌟'));
  // Quran verse reference
  card.appendChild(el('div','khatm-celeb-ayah','﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾'));
  // Message
  var msg=khatmNum>1?('ختمێ ژمارە '+khatmNum+'!\nئەلحەمدولله ڕابوو 🤲'):'ڕێکاا قورئانێ تەمام کر!\nخوا قبوول بکا 🤲';
  card.appendChild(el('div','khatm-celeb-sub',msg));
  // Badges row
  var badges=el('div','khatm-celeb-badges');
  if(streak>0)badges.appendChild(el('div','khatm-celeb-badge gold','🔥 '+streak+' ڕۆژ ل سەر ئێک'));
  if(bestStreak>0)badges.appendChild(el('div','khatm-celeb-badge green','⭐ باشترین: '+bestStreak+' ڕۆژ'));
  if(khatmNum>1)badges.appendChild(el('div','khatm-celeb-badge gold','📖 ختم ×'+khatmNum));
  if(badges.children.length)card.appendChild(badges);
  // Button
  var btn=document.createElement('button');btn.className='khatm-celeb-btn';btn.textContent='داخستن';
  on(btn,'click',function(){App.closeGoalCelebration();});
  card.appendChild(btn);
  on(ov,'click',function(e){if(e.target===ov)App.closeGoalCelebration();});
  ov.appendChild(card);
  document.body.appendChild(ov);
}
App.closeGoalCelebration=function(){
  var ov=$('khatmCelebOverlay');if(!ov)return;
  ov.classList.add('out');setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},360);
};
App.testKhatmCelebration=function(){
  var l=getReadLog();var str=calcStreak(l);var best=calcBestStreak(l);
  _goalCelebrateKhatm(6236,str,best);
};

// Public bridge for prayer.ui.js — allows the grid-card sheet to read/toggle logs
App.prayerLog={
  get:function(){return getPrayerLog();},
  toggle:function(prayer,dKey){
    // toggle the specific prayer on a specific date key; returns new done state
    var log=getPrayerLog();
    var dayLog=log[dKey]||{};
    var ns=!dayLog[prayer];
    if(ns){dayLog[prayer]=true;}else{delete dayLog[prayer];}
    if(Object.keys(dayLog).length>0)log[dKey]=dayLog; else delete log[dKey];
    savePrayerLog(log);
    _pppSyncPanel(log,dKey);
    _updatePrayerBadge();
    return ns;
  },
  isCheckable:function(prayer,dKey){return _isPrayerCheckable(prayer,dKey);},
  prayerDay:function(){return _getPrayerDay();}
};

/* ── Header button badges ─────────────────────────────────────────────────── */
function _setBadge(id,cls){
  var b=$(id);if(!b)return;
  b.className='hdr-badge'+(cls?' show '+cls:'');
}
function _updateGoalsBadge(){
  var goal=getGoal();
  if(!goal){_setBadge('goalsBadge','');return;}
  var log=getReadLog();
  var todayRead=log[dateKey(new Date())]||0;
  var pct=Math.min(100,Math.round(todayRead/(goal.pages||5)*100));
  _setBadge('goalsBadge',pct>=100?'done':pct>0?'progress':'pending');
}
function _updatePrayerBadge(){
  var log=getPrayerLog();var pDay=_getPrayerDay();
  var done=_TRACK_PRAYERS.filter(function(p){return(log[pDay]||{})[p];}).length;
  _setBadge('prayerBadge',done>=5?'done':done>0?'progress':'pending');
}
function _updateMushafBadge(){
  _setBadge('mushafBadge',S.mushafMode?'done':'pending');
}
function _hdrPop(btnId){
  var btn=$(btnId);if(!btn)return;
  btn.classList.remove('hdr-pop');
  void btn.offsetWidth;
  btn.classList.add('hdr-pop');
  btn.addEventListener('animationend',function(){btn.classList.remove('hdr-pop');},{once:true,capture:true});
}
// Wire up pop on click and init badges after DOM is ready
setTimeout(function(){
  var gb=$('hdrGoalsBtn');
  if(gb)gb.addEventListener('click',function(){_hdrPop('hdrGoalsBtn');},true);
  var pb=$('hdrPrayerBtn');
  if(pb)pb.addEventListener('click',function(){_hdrPop('hdrPrayerBtn');},true);
  var mb=$('mushafToggleBtn');
  if(mb)mb.addEventListener('click',function(){_hdrPop('mushafToggleBtn');_updateMushafBadge();},true);
  _updateGoalsBadge();
  _updatePrayerBadge();
  _updateMushafBadge();
},500);

/* ===== WIDGET DATA PUSH ===== */

// Unified helper — same plugin name as prayer.ui.js (proven to work).
// @objc(SharedPrefsPlugin) → Capacitor exposes as "SharedPrefs" on iOS.
// ── Widget translation sync ──────────────────────────────────────────────
// Fetches widget.* keys from Supabase, resolves iOS override values,
// and writes a flat key→text JSON blob to SharedPrefs key 'widgetTranslations'.
// Writing 'widgetTranslations' now triggers WidgetCenter.shared.reloadAllTimelines()
// in SharedPrefsPlugin.swift so the widget extension picks up the new strings
// on the very next render — without waiting for its own timeline expiry.
//
// Called on init and every foreground resume. Throttled to once per 5 minutes.
function _doSyncWidgetTranslations(force){
  var CACHE_KEY='widgetTranslationsSyncTs';
  var lastTs=parseInt(localStorage.getItem(CACHE_KEY)||'0',10);
  var elapsed=Date.now()-lastTs;
  if(!force && elapsed<5*60*1000){
    console.log('[WidgetT9n] skipped — last sync '+Math.round(elapsed/1000)+'s ago (throttle 300s)');
    return;
  }
  console.log('[WidgetT9n] syncWidgetTranslations START force='+!!force);
  // S.supabase = initialized Supabase client (set in initSupabase).
  // window.supabase = the raw CDN library — do NOT use it here (has no .from()).
  var sb=S.supabase||window._appSupabase;
  if(!sb){console.warn('[WidgetT9n] no Supabase client — Supabase not yet initialized');return;}
  sb.from('kurdish_translations')
    .select('key_id,kurdish_text,ios_text,android_text')
    .like('key_id','widget.%')
    .then(function(res){
      if(res.error){console.error('[WidgetT9n] DB error:',res.error.message);return;}
      if(!res.data||!res.data.length){console.warn('[WidgetT9n] 0 rows returned — no widget.* keys in DB?');return;}
      console.log('[WidgetT9n] fetched '+res.data.length+' rows from kurdish_translations');
      var keys={};
      res.data.forEach(function(row){
        // iOS gets ios_text if set; otherwise shared kurdish_text
        var val=(row.ios_text&&row.ios_text.trim())?row.ios_text.trim():(row.kurdish_text||'');
        if(val)keys[row.key_id]=val;
      });
      console.log('[WidgetT9n] resolved '+Object.keys(keys).length+' keys');
      // Log a sample to verify correct value is being written
      var sampleKey=Object.keys(keys)[0];
      if(sampleKey)console.log('[WidgetT9n] sample: '+sampleKey+' = '+keys[sampleKey]);
      var payload=JSON.stringify({v:1,ts:new Date().toISOString(),keys:keys});
      console.log('[WidgetT9n] calling _sharedPrefsSet widgetTranslations len='+payload.length);
      _sharedPrefsSet('widgetTranslations',payload)
        .then(function(){
          localStorage.setItem(CACHE_KEY,String(Date.now()));
          console.log('[WidgetT9n] write SUCCESS — widgetTranslations written, WidgetKit reload triggered');
        })
        .catch(function(e){
          console.warn('[WidgetT9n] _sharedPrefsSet failed (non-iOS or bridge missing):',e&&e.message);
        });
    })
    .catch(function(e){console.warn('[WidgetT9n] fetch error:',e&&e.message);});
}

function syncWidgetTranslations(){ _doSyncWidgetTranslations(false); }

// Temporary debug helper — call from DevTools or console to force an immediate sync.
// Bypasses throttle. Proves whether the sync+write pipeline works end-to-end.
// Usage: window.forceWidgetTranslationSync()
window.forceWidgetTranslationSync=function(){ _doSyncWidgetTranslations(true); };

function _sharedPrefsSet(key,value){
  // iOS only — Capacitor SharedPrefs plugin writes to App Group UserDefaults
  // so the widget extension can read the data without hitting the network.
  // Android widgets were removed; this path is iOS-only.
  var sp=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.SharedPrefs;
  if(!sp){
    console.warn('[Widget] _sharedPrefsSet: SharedPrefs plugin not available (key='+key+')');
    return Promise.reject(new Error('no widget bridge'));
  }
  console.log('[Widget] _sharedPrefsSet key='+key+' valueLen='+value.length);
  return sp.set({key:key,value:value});
}

// Persist the active theme to native storage so cold-launch backgrounds match.
// iOS reads from App Group UserDefaults (set by _sharedPrefsSet above) before WebView starts.
// Android reads from CapacitorStorage SharedPreferences in MainActivity.onCreate.
// Called every time applyTheme() runs — keeps native storage in sync automatically.
function _nativeSyncTheme(theme){
  try{
    var plugins=window.Capacitor&&window.Capacitor.Plugins;
    if(!plugins)return;
    // Android + iOS: Capacitor Preferences (CapacitorStorage SharedPrefs / UserDefaults.standard)
    if(plugins.Preferences){
      plugins.Preferences.set({key:'appTheme',value:theme}).catch(function(){});
    }
    // iOS only: App Group UserDefaults — readable by AppDelegate before WebView starts
    _sharedPrefsSet('appTheme',theme);
    // iOS only: write accent hex so widgets can follow the app theme highlight color.
    // Only the accent/highlight changes — widget bg and text colors are fixed dark.
    // light theme uses #26bd69 (original green) since widget bg is always dark —
    // #000000 would be invisible on the dark widget background.
    var accentMap={dark:'#ffffff',light:'#26bd69',sakina:'#c9a84c',noor:'#6dbf82'};
    var accentHex=accentMap[theme]||'#26bd69';
    _sharedPrefsSet('widgetAccentColor',accentHex);
  }catch(e){}
}

// Push selected ayah + tafsir to iOS widget via shared App Group.
// Called when user taps the star (⭐) button on an ayah card.
function pushAyahToWidget(surahNum,ayahNum){
  console.log('[WidgetAyah] pushAyahToWidget called surah='+surahNum+' ayah='+ayahNum);
  var quranSurah=S.quranData&&S.quranData[String(surahNum)];
  if(!quranSurah||!quranSurah[ayahNum-1]){console.error('[WidgetAyah] quran data missing');toast(t('toast.widget_no_data'));return;}
  var ayah=quranSurah[ayahNum-1];
  var tafsirText='';
  if(S.tafsirData&&S.tafsirData[surahNum-1]){
    var td=S.tafsirData[surahNum-1];
    if(td.verses){
      var tv=td.verses.find(function(v){return(v.verse||v.ayah)===ayahNum;});
      if(tv&&tv.text)tafsirText=tv.text.substring(0,400);
    }
  }
  var surahInfo=SURAHS[surahNum-1]||{};
  var payload=JSON.stringify({
    chapter:surahNum,
    verse:ayahNum,
    arabic:ayah.text||'',
    tafsir:tafsirText,
    surahName:surahInfo.ar||('سورة '+surahNum),
    showTafsir:true,
    showReference:true
  });
  console.log('[WidgetAyah] writing payload len='+payload.length);
  _sharedPrefsSet('widgetAyahData',payload)
    .then(function(){
      console.log('[WidgetAyah] write SUCCESS ✓');
      toast(t('toast.widget_saved'));
    })
    .catch(function(e){
      console.error('[WidgetAyah] write FAILED:',e);
      toast(t('toast.widget_error'));
    });
}

// Push reading progress + streak to iOS goal widget.
// Called after every ayah is counted and on prayer tab init.
function pushGoalDataToWidget(){
  var l=getReadLog();
  var today=dateKey(new Date());
  var g=getGoal();
  var dailyGoal=g&&g.pages?g.pages:10;
  var todayCount=l[today]||0;
  var streak=calcStreak(l);
  var best=parseInt(localStorage.getItem('bestStreak')||'0',10);
  var weekly=[];
  for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);weekly.push(l[dateKey(d)]||0);}
  var payload=JSON.stringify({
    todayCount:todayCount,
    dailyGoal:dailyGoal,
    currentStreak:streak,
    bestStreak:best,
    weeklyData:weekly,
    todayDate:today
  });
  console.log('[WidgetGoal] pushGoalDataToWidget today='+today+' count='+todayCount+'/'+dailyGoal+' streak='+streak);
  _sharedPrefsSet('widgetGoalData',payload)
    .then(function(){console.log('[WidgetGoal] write SUCCESS ✓');})
    .catch(function(){/* non-iOS — silent */});
}


/* ===== GOAL WIZARD ===== */
var PRESETS=[
  {name:function(){return t('wizard.preset.easy')},pages:7,desc:function(){return t('wizard.preset.easy_desc')},icon:'fas fa-seedling'},
  {name:function(){return t('wizard.preset.medium')},pages:20,desc:function(){return t('wizard.preset.medium_desc')},icon:'fas fa-book'},
  {name:function(){return t('wizard.preset.hard')},pages:50,desc:function(){return t('wizard.preset.hard_desc')},icon:'fas fa-fire'},
  {name:function(){return t('wizard.preset.khatm')},pages:100,desc:function(){return t('wizard.preset.khatm_desc')},icon:'fas fa-star'}
];

App.openWizard=function(){
  S.wizardStep=0;
  S.wizardData={};
  $('wizard').classList.add('on');
  renderWizardStep();
};
App.closeWizard=function(){
  $('wizard').classList.remove('on');
};
App.openDeleteConfirm=function(){
  $('goalConfirmOverlay').classList.add('on');
  haptic([20]);
};
App.closeDeleteConfirm=function(){
  $('goalConfirmOverlay').classList.remove('on');
};
// Option A — delete goal + full reset (clears surah progress marks too)
App.confirmDeleteGoalFull=function(){
  localStorage.removeItem('readingGoal');
  _clearTrackingState();
  $('goalConfirmOverlay').classList.remove('on');
  debouncedSync();
  _restartProgressTracking();
  renderContinue(); // clear the continue-reading card immediately
  toast(t('toast.goal_deleted'));
  haptic([50]);
  renderGoals();
};
// Option B — delete goal only, keep Quran reading position (surah_progress survives)
App.confirmDeleteGoalKeep=function(){
  localStorage.removeItem('readingGoal');
  _clearGoalCounters();
  $('goalConfirmOverlay').classList.remove('on');
  debouncedSync();
  _restartProgressTracking();
  toast(t('toast.goal_deleted'));
  haptic([50]);
  renderGoals();
};
// Keep legacy name so any old call sites still work
App.confirmDeleteGoal=App.confirmDeleteGoalFull;

// ── Start-choice overlay (shown when creating a new goal while old data exists) ──
App.closeStartChoice=function(){
  $('goalStartChoiceOverlay').classList.remove('on');
};
function _finishGoalSave(goal,keepProgress){
  if(keepProgress){
    _clearGoalCounters(); // preserve surah_progress, wipe only counters
  }else{
    _clearTrackingState(); // full reset including ayah marks
  }
  saveGoal(goal);
  initTodayVerses();
  _restartProgressTracking();
  App.closeStartChoice();
  S.wizardStep=2;
  renderWizardStep();
  haptic([50]);
}
App.confirmStartFresh=function(){
  var g=S.wizardData._pendingGoal;
  if(!g)return;
  _finishGoalSave(g,false);
};
App.confirmStartKeep=function(){
  var g=S.wizardData._pendingGoal;
  if(!g)return;
  _finishGoalSave(g,true);
};
App.wizardBack=function(){
  if(S.wizardStep>0){S.wizardStep--;renderWizardStep();haptic([8]);}
};
App.wizardNext=function(){
  if(S.wizardStep===0){
    if(S.wizardData.preset==null&&!S.wizardData.custom)return;
    S.wizardStep++;
    renderWizardStep();
    haptic([8]);
  } else if(S.wizardStep===1){
    var preset=PRESETS[S.wizardData.preset];
    var goal;
    if(preset){
      goal={name:preset.name(),pages:preset.pages,created:Date.now()};
    } else {
      var v=parseInt(S.wizardData.customPages)||5;
      goal={name:t('wizard.custom_name'),pages:v,created:Date.now()};
    }
    // If old goal or tracking data exists, ask user what to preserve
    var hasOldData=!!getGoal()||Object.keys(getReadLog()).length>0;
    if(hasOldData){
      S.wizardData._pendingGoal=goal;
      $('goalStartChoiceOverlay').classList.add('on');
      haptic([8]);
      return; // wait for user choice
    }
    // No old data — save cleanly with no questions
    _finishGoalSave(goal,false);
  } else if(S.wizardStep===2){
    App.closeWizard();
    renderGoals();
  }
};

function renderWizardStep(){
  var body=$('wizardBody');
  clear(body);
  var label=$('wizardStepLabel');
  var progress=$('wizardProgress');
  var backBtn=$('wizardBack');
  var nextBtn=$('wizardNext');

  if(S.wizardStep===0){
    label.textContent=t('wizard.step',{current:1,total:3});
    progress.style.width='33%';
    backBtn.style.display='none';

    body.appendChild(el('div','wizard-title',t('wizard.select_title')));
    body.appendChild(el('div','wizard-desc',t('wizard.select_desc')));

    var opts=el('div','wizard-options');
    PRESETS.forEach(function(p,i){
      var opt=el('div','wizard-opt'+(S.wizardData.preset===i?' on':''));
      var optIcon=el('div','wizard-opt-icon');
      optIcon.appendChild(icon(p.icon));
      opt.appendChild(optIcon);
      var optText=el('div','wizard-opt-text');
      optText.appendChild(el('div','wizard-opt-title',p.name()));
      optText.appendChild(el('div','wizard-opt-desc',p.desc()));
      opt.appendChild(optText);
      var check=el('div','wizard-opt-check');
      if(S.wizardData.preset===i)check.appendChild(icon('fas fa-check'));
      opt.appendChild(check);
      on(opt,'click',function(){
        S.wizardData.preset=i;S.wizardData.custom=false;
        haptic([8]);
        renderWizardStep();
      });
      opts.appendChild(opt);
    });

    // Custom option
    var cOpt=el('div','wizard-opt'+(S.wizardData.custom?' on':''));
    var cIcon=el('div','wizard-opt-icon');
    cIcon.appendChild(icon('fas fa-sliders'));
    cOpt.appendChild(cIcon);
    var cText=el('div','wizard-opt-text');
    cText.appendChild(el('div','wizard-opt-title',t('wizard.custom')));
    cText.appendChild(el('div','wizard-opt-desc',t('wizard.custom_desc')));
    cOpt.appendChild(cText);
    var cCheck=el('div','wizard-opt-check');
    if(S.wizardData.custom)cCheck.appendChild(icon('fas fa-check'));
    cOpt.appendChild(cCheck);
    on(cOpt,'click',function(){
      S.wizardData.custom=true;S.wizardData.preset=null;
      haptic([8]);
      renderWizardStep();
    });
    opts.appendChild(cOpt);

    if(S.wizardData.custom){
      var cinp=el('input','wizard-input');
      cinp.type='number';cinp.placeholder=t('wizard.custom_placeholder');cinp.min='1';cinp.max='500';
      cinp.value=S.wizardData.customPages||'';
      on(cinp,'input',function(){S.wizardData.customPages=this.value});
      opts.appendChild(cinp);
    }

    body.appendChild(opts);

    // Update next button text
    clear(nextBtn);
    nextBtn.appendChild(document.createTextNode(t('wizard.btn_next')+' '));
    nextBtn.appendChild(icon('fas fa-arrow-left'));

  } else if(S.wizardStep===1){
    label.textContent=t('wizard.step',{current:2,total:3});
    progress.style.width='66%';
    backBtn.style.display='';

    var preset=PRESETS[S.wizardData.preset];
    var pages=preset?preset.pages:parseInt(S.wizardData.customPages)||5;
    var name=preset?preset.name():t('wizard.custom_name');

    body.appendChild(el('div','wizard-title',t('wizard.confirm_title')));
    body.appendChild(el('div','wizard-desc',t('wizard.confirm_desc')));

    var summary=el('div','goal-card');
    summary.appendChild(el('div','goal-card-name',name));
    summary.appendChild(el('div','goal-card-desc',t('goals.card.daily',{count:pages})));

    var dets=el('div','goal-details');
    dets.style.gridTemplateColumns='1fr 1fr';
    [{v:String(pages),l:t('wizard.detail.daily')},{v:String(pages*30),l:t('wizard.detail.monthly')},{v:Math.ceil(6236/pages)+' '+t('goals.stats.days'),l:t('wizard.detail.khatm')},{v:t('wizard.detail.start'),l:t('wizard.detail.begin')}].forEach(function(d){
      var det=el('div','goal-detail');
      det.appendChild(el('div','goal-detail-val',d.v));
      det.appendChild(el('div','goal-detail-lbl',d.l));
      dets.appendChild(det);
    });
    summary.appendChild(dets);
    body.appendChild(summary);

    clear(nextBtn);
    nextBtn.appendChild(icon('fas fa-check'));
    nextBtn.appendChild(document.createTextNode(' '+t('wizard.btn_save')));

  } else if(S.wizardStep===2){
    // Confirmation screen
    label.textContent=t('wizard.step',{current:3,total:3});
    progress.style.width='100%';
    backBtn.style.display='none';

    var confirm2=el('div','wizard-confirm');
    // SVG checkmark animation
    var ringDiv=el('div','wizard-confirm-ring');
    var svgNS='http://www.w3.org/2000/svg';
    var svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 80 80');
    var circle=document.createElementNS(svgNS,'circle');
    circle.setAttribute('class','confirm-circle');
    circle.setAttribute('cx','40');circle.setAttribute('cy','40');circle.setAttribute('r','36');
    svg.appendChild(circle);
    var polyline=document.createElementNS(svgNS,'polyline');
    polyline.setAttribute('class','confirm-check');
    polyline.setAttribute('points','24,42 34,52 56,30');
    svg.appendChild(polyline);
    ringDiv.appendChild(svg);
    confirm2.appendChild(ringDiv);

    confirm2.appendChild(el('div','wizard-confirm-title',t('wizard.done_title')));
    confirm2.appendChild(el('div','wizard-confirm-sub',t('wizard.done_subtitle')));

    var savedGoal=getGoal();
    var pp=savedGoal?savedGoal.pages:5;
    var khatmDays=Math.ceil(6236/pp);
    var summaryText=t('wizard.done_summary',{pages:pp,days:khatmDays});
    confirm2.appendChild(el('div','wizard-confirm-summary',summaryText));
    confirm2.appendChild(el('div','wizard-confirm-hint',t('wizard.done_hint')));

    body.appendChild(confirm2);

    clear(nextBtn);
    nextBtn.appendChild(document.createTextNode(t('wizard.btn_start')+' '));
    nextBtn.appendChild(icon('fas fa-arrow-left'));
  }
}

/* ===== SETTINGS ===== */
function mkToggleRow(labelText,isOn,onToggle,subText){
  var row=el('div','setting-row s-row');
  var left=el('div','setting-label-wrap');
  left.appendChild(el('div','setting-label',labelText));
  if(subText){left.appendChild(el('div','setting-sub',subText));}
  row.appendChild(left);
  var toggle=el('div','toggle'+(isOn?' on':''));
  toggle.appendChild(el('div','toggle-knob'));
  on(toggle,'click',function(){haptic([15]);onToggle();});
  row.appendChild(toggle);
  return row;
}
/* ===== SITE SETTINGS (shared source: images, social, about text) ===== */
var _ssCacheKey='siteSettings_v6';
var _ssCacheTTL=6*3600*1000;
var _ssMemory=null,_ssMemTs=0;

async function getSiteSettings(force){
  if(!force&&_ssMemory&&(Date.now()-_ssMemTs)<_ssCacheTTL)return _ssMemory;
  try{
    if(!force){var c=JSON.parse(localStorage.getItem(_ssCacheKey));
    if(c&&c.ts&&(Date.now()-c.ts)<_ssCacheTTL){_ssMemory=c.d;_ssMemTs=c.ts;return _ssMemory;}}
  }catch(e){}
  var sb=S.supabase;
  if(!sb){
    // Bare REST with cached config
    try{
      var cfg=JSON.parse(localStorage.getItem('supa_cfg'));
      if(cfg&&cfg.supabaseUrl&&cfg.supabaseKey){
        var r=await fetch(cfg.supabaseUrl+'/rest/v1/site_settings?select=key,value',{headers:{'apikey':cfg.supabaseKey,'Authorization':'Bearer '+cfg.supabaseKey}});
        var rows=await r.json();
        if(Array.isArray(rows)){
          var res={};rows.forEach(function(row){res[row.key]=row.value;});
          _ssMemory=res;_ssMemTs=Date.now();
          try{localStorage.setItem(_ssCacheKey,JSON.stringify({ts:_ssMemTs,d:res}));}catch(e){}
          return res;
        }
      }
    }catch(e){}
    try{var stale=JSON.parse(localStorage.getItem(_ssCacheKey));if(stale&&stale.d)return stale.d;}catch(e){}
    return {};
  }
  try{
    var qr=await sb.from('site_settings').select('key,value');
    if(qr.error||!qr.data)throw new Error('fetch');
    var res={};qr.data.forEach(function(row){res[row.key]=row.value;});
    _ssMemory=res;_ssMemTs=Date.now();
    try{localStorage.setItem(_ssCacheKey,JSON.stringify({ts:_ssMemTs,d:res}));}catch(e){}
    return res;
  }catch(e){
    try{var stale=JSON.parse(localStorage.getItem(_ssCacheKey));if(stale&&stale.d)return stale.d;}catch(e2){}
    return {};
  }
}

/* ===== ABOUT BOTTOM SHEETS ===== */
var _cfgOverlayEl=null,_cfgSheetEl=null;
var _aboutImgCache={};

function _warmAboutCache(){
  getSiteSettings().then(function(ss){
    [ss.founder_avatar_url,ss.about_avatar_url,ss.tafsir_book_image].forEach(function(url){
      if(!url||_aboutImgCache[url]!==undefined)return;
      _aboutImgCache[url]=false;
      var img=new Image();
      img.onload=function(){_aboutImgCache[url]=true;};
      img.src=url;
    });
  });
}

function _ensureCfgSheet(){
  if(_cfgSheetEl)return;
  _cfgOverlayEl=el('div','cfg-overlay');
  on(_cfgOverlayEl,'click',closeCfgSheet);
  document.body.appendChild(_cfgOverlayEl);
  _cfgSheetEl=el('div','cfg-sheet');
  document.body.appendChild(_cfgSheetEl);
}

function closeCfgSheet(){
  if(!_cfgSheetEl)return;
  _cfgSheetEl.classList.remove('open');
  _cfgSheetEl.style.display='none';
  _cfgOverlayEl.classList.remove('on');
}

function _appendParas(parent,cls,text){
  var paras=(text||'').split('\n\n').filter(Boolean);
  paras.forEach(function(p){var d=el('div',cls);d.textContent=p;parent.appendChild(d);});
}

function _openLink(url){
  if(!url)return;
  if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Browser){
    Capacitor.Plugins.Browser.open({url:url}).catch(function(){window.open(url,'_blank');});
  }else{window.open(url,'_blank');}
}

async function openAboutSheet(type){
  _ensureCfgSheet();
  haptic([8]);
  clear(_cfgSheetEl);

  var pull=el('div','cfg-sheet-pull');_cfgSheetEl.appendChild(pull);
  var hdr=el('div','cfg-sheet-hdr');
  var titleEl=el('div','cfg-sheet-title',type==='founder'?'سامان عبدالرحمن':'تەفسیر کورد');
  var closeBtn=el('button','cfg-sheet-close');
  closeBtn.appendChild(icon('fas fa-xmark'));
  on(closeBtn,'click',closeCfgSheet);
  hdr.appendChild(titleEl);hdr.appendChild(closeBtn);
  _cfgSheetEl.appendChild(hdr);
  var body=el('div','cfg-sheet-body');
  _cfgSheetEl.appendChild(body);

  var ss=_ssMemory;
  if(!ss){
    var _skEl=el('div','ab-skeleton');
    _skEl.appendChild(el('div','ab-sk-avatar'));
    _skEl.appendChild(el('div','ab-sk-line ab-sk-wide'));
    _skEl.appendChild(el('div','ab-sk-line ab-sk-med'));
    body.appendChild(_skEl);
    _cfgOverlayEl.classList.add('on');
    _cfgSheetEl.style.display='';
    _cfgSheetEl.classList.add('open');
    ss=await getSiteSettings();
    clear(body);
  }else{
    _cfgOverlayEl.classList.add('on');
    _cfgSheetEl.style.display='';
    _cfgSheetEl.classList.add('open');
  }

  function _addQuote(parent,ar,ref){
    if(!ar)return;
    var q=el('div','cfg-sheet-quote');
    var qa=el('div','cfg-sheet-quote-ar');qa.textContent=ar;q.appendChild(qa);
    if(ref)q.appendChild(el('div','cfg-sheet-quote-ref',ref));
    parent.appendChild(q);
  }
  function _addBlocks(parent,text){
    (text||'').split('\n\n').filter(Boolean).forEach(function(p){parent.appendChild(el('div','cfg-sheet-para',p));});
  }
  if(type==='founder'){
    var fname=_ft('founder_name',ss.founder_name)||'سامان عبدالرحمن عادل';
    titleEl.textContent=fname;

    // ── 1. Hero ──────────────────────────────────
    var hero=el('div','cfg-sheet-hero');
    var avDiv=el('div','cfg-sheet-avatar');
    var avUrl=ss.founder_avatar_url||'';
    if(avUrl){var avImg=document.createElement('img');avImg.alt='';avImg.style.opacity=_aboutImgCache[avUrl]?'1':'0';avImg.style.transition='opacity .25s';avImg.onload=function(){avImg.style.opacity='1';};avImg.src=avUrl;avDiv.appendChild(avImg);}
    else{avDiv.appendChild(icon('fas fa-user'));}
    hero.appendChild(avDiv);
    hero.appendChild(el('div','cfg-sheet-name',fname));
    hero.appendChild(el('div','cfg-sheet-role',_ft('founder_role',ss.founder_role)||'دامەزرێنەرێ تەفسیر کورد'));
    body.appendChild(hero);

    // ── 2. Story ─────────────────────────────────
    var cfoStory=el('div','cfo-section');
    cfoStory.appendChild(el('div','cab-sec-label',_ft('founder_story_label',ss.founder_story_label)||'چیرۆک'));
    cfoStory.appendChild(el('div','cfo-bio-name',fname));
    // Admin saves bio as 3 separate paragraphs: founder_story_desc1/2/3
    [_ft('founder_story_desc1',ss.founder_story_desc1),_ft('founder_story_desc2',ss.founder_story_desc2),_ft('founder_story_desc3',ss.founder_story_desc3)].filter(Boolean).forEach(function(p){cfoStory.appendChild(el('div','cfo-para',p));});
    body.appendChild(cfoStory);

    // ── 3. Quote 1 ───────────────────────────────
    var cfoQ1=el('div','cfo-ayah');
    cfoQ1.appendChild(el('div','cfo-ayah-ar',_ft('founder_quote1_arabic',ss.founder_quote_ar)||'إِنْ أُرِيدُ إِلَّا الْإِصْلَاحَ مَا اسْتَطَعْتُ ۚ وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ'));
    var _qku=_ft('founder_quote1_translation',ss.founder_quote_ku);
    if(_qku){var qku=el('div','cfo-ayah-ku');qku.textContent='"'+_qku+'"';cfoQ1.appendChild(qku);}
    cfoQ1.appendChild(el('div','cfo-ayah-ref',_ft('founder_quote1_ref',ss.founder_quote_ref)||'سوڕەتا هود — ٨٨'));
    body.appendChild(cfoQ1);

    // Journey section moved to app sheet

    // ── 5. Values ────────────────────────────────
    var cfoVals=el('div','cfo-section');
    cfoVals.appendChild(el('div','cab-sec-label',_ft('founder_values_label',ss.founder_values_label)||'پابەندبوون'));
    var VALUES=[
      {t:_ft('founder_value1_title',ss.founder_v1_title)||'ڕازەمەندییا خودای',d:_ft('founder_value1_desc',ss.founder_v1_desc)||'ئەڤ کارە بتنێ بۆ ڕازەمەندییا خودێ دهێتە ئەنجامدان. ئەم ل دویڤ چ دانپێدان و قازانجێن دونیاییدا ناگەڕین، هیڤییا مە بتنێ قەبویلبوونا ژلایێ خوداییە.'},
      {t:_ft('founder_value2_title',ss.founder_v2_title)||'خزمەتا قورئانێ',d:_ft('founder_value2_desc',ss.founder_v2_desc)||'خزمەتکرنا پەرتوکا خودای و گەهاندنا مانایێن قورئانێ بۆ هەمی کوردان ب شێوازەکێ ڕوون و سادە و بێ ئاڵۆزی.'},
      {t:_ft('founder_value3_title',ss.founder_v3_title)||'گەهاندن بۆ هەمییان',d:_ft('founder_value3_desc',ss.founder_v3_desc)||'دروستکرنا پلاتفۆرمەکا دیجیتاڵ کو بەردەستە بۆ هەمی کوردان ل هەر جهەکی، بێ سنوور و بێ جیاوازی.'},
      {t:_ft('founder_value4_title',ss.founder_v4_title)||'خۆگەشەکرن',d:_ft('founder_value4_desc',ss.founder_v4_desc)||'فێربوون و گەشەکرنا پێزانینێن ئایینی، و پارڤەکرنا وان دگەل گەلێ خۆ ب شێوازەکێ ڕەوان.'}
    ];
    var valList=el('div','cfo-values');
    VALUES.forEach(function(v){
      var vi=el('div','cfo-val-item');
      vi.appendChild(el('div','cfo-val-title',v.t));
      vi.appendChild(el('div','cfo-val-desc',v.d));
      valList.appendChild(vi);
    });
    cfoVals.appendChild(valList);body.appendChild(cfoVals);

    // ── 6. Dua ───────────────────────────────────
    var cfoDua=el('div','cfo-dua');
    cfoDua.appendChild(el('div','cfo-dua-label',_ft('founder_dua_label',ss.founder_dua_label)||'دوعا'));
    cfoDua.appendChild(el('div','cfo-dua-title',_ft('founder_dua_title',ss.founder_dua_title)||'دوعا بۆ بینەرێن مە'));
    cfoDua.appendChild(el('div','cfo-dua-text',_ft('founder_dua_desc',ss.founder_dua_text)||''));
    body.appendChild(cfoDua);

    // ── 7. Quote 2 ───────────────────────────────
    var cfoQ2=el('div','cfo-ayah');
    cfoQ2.appendChild(el('div','cfo-ayah-ar',_ft('founder_quote2_arabic',ss.founder_quote2_ar)||'رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ'));
    var _qku2=_ft('founder_quote2_translation',ss.founder_quote2_ku);
    if(_qku2){var qku2=el('div','cfo-ayah-ku');qku2.textContent='"'+_qku2+'"';cfoQ2.appendChild(qku2);}
    cfoQ2.appendChild(el('div','cfo-ayah-ref',_ft('founder_quote2_ref',ss.founder_quote2_ref)||'سوڕەتا البقرة — ١٢٧'));
    body.appendChild(cfoQ2);

    // ── 8. Closing ───────────────────────────────
    var _cloTitle=_ft('founder_closing_title',ss.founder_closing_title);
    var _cloDesc=_ft('founder_closing_desc',ss.founder_closing_desc||ss.founder_closing);
    if(_cloTitle||_cloDesc){
      var cfoClose=el('div','cfo-closing');
      if(_cloTitle)cfoClose.appendChild(el('div','cfo-closing-title',_cloTitle));
      if(_cloDesc)cfoClose.appendChild(el('div','cfo-closing-text',_cloDesc));
      body.appendChild(cfoClose);
    }
  }

  if(type==='app'){
    titleEl.textContent='تەفسیر کورد';

    // ── 1. Hero ──────────────────────────────────
    var cabHero=el('div','cfg-sheet-hero');
    var cabAv=el('div','cfg-sheet-avatar');
    var appAvUrl=ss.about_avatar_url||'';
    if(appAvUrl){var cabAvImg=document.createElement('img');cabAvImg.alt='';cabAvImg.style.opacity=_aboutImgCache[appAvUrl]?'1':'0';cabAvImg.style.transition='opacity .25s';cabAvImg.onload=function(){cabAvImg.style.opacity='1';};cabAvImg.src=appAvUrl;cabAv.appendChild(cabAvImg);}
    else{var cabLogo=document.createElement('img');cabLogo.src='/assets/images/logo.png';cabLogo.alt='';cabAv.appendChild(cabLogo);}
    cabHero.appendChild(cabAv);
    cabHero.appendChild(el('div','cfg-sheet-name','تەفسیر کورد'));
    cabHero.appendChild(el('div','cfg-sheet-role',_ft('about_hero_sub',ss.about_hero_sub)||'پلاتفۆرمەکا کوردی بۆ خواندنا قورئانا پیرۆز'));
    body.appendChild(cabHero);

    // ── 2. Services ───────────────────────────────
    var cabSvc=el('div','cab-section');
    cabSvc.appendChild(el('div','cab-sec-label',_ft('about_svc_label',ss.about_svc_label)||'خزمەتگوزاری'));
    cabSvc.appendChild(el('div','cab-sec-title',_ft('about_svc_title',ss.about_svc_title)||'ئەم چ پێشکێش دکەین'));
    var FEATS=[
      {num:_ft('about_feat1_num',ss.about_feat1_num)||'٠١',title:_ft('about_feat1_title',ss.about_feat1_title)||'خواندنا قورئانێ',desc:_ft('about_feat1_desc',ss.about_feat1_desc)||'خواندنا قورئانا پیرۆز ب دەقێ عەرەبی یێ ڕەسەن دگەل وەرگێڕانا کوردی و تەفسیرا ساناهی بۆ هەر ئایەتەکێ.'},
      {num:_ft('about_feat2_num',ss.about_feat2_num)||'٠٢',title:_ft('about_feat2_title',ss.about_feat2_title)||'دەنگێ ئیسلامێ',desc:_ft('about_feat2_desc',ss.about_feat2_desc)||'ڤیدیویێن ئیسلامی یێن ب زمانێ کوردی، زنجیرەیێن فێربوونێ و ناڤەڕۆکا هەوەدەر بۆ گەشەکرنا زانیارییا ئایینی.'},
      {num:_ft('about_feat3_num',ss.about_feat3_num)||'٠٣',title:_ft('about_feat3_title',ss.about_feat3_title)||'نیشانەکرن و پاشەکەفتن',desc:_ft('about_feat3_desc',ss.about_feat3_desc)||'شوێنکەفتنا خواندنا خۆ، نیشانەکرنا ئایەتان، و هەڤدەنگکرنا دانەیان ل هەمی ئامێران.'}
    ];
    FEATS.forEach(function(f){
      var card=el('div','cab-feat');
      card.appendChild(el('div','cab-feat-num',f.num));
      var fb=el('div','cab-feat-body');
      fb.appendChild(el('div','cab-feat-title',f.title));
      fb.appendChild(el('div','cab-feat-desc',f.desc));
      card.appendChild(fb);
      cabSvc.appendChild(card);
    });
    body.appendChild(cabSvc);

    // ── 3. Stats ──────────────────────────────────
    var cabStats=el('div','cab-stats');
    [[_ft('about_stat1_num',ss.about_stat1_num)||'٦٥ھ+',_ft('about_stat1_label',ss.about_stat1_label)||'فۆڵۆوەر'],[_ft('about_stat2_num',ss.about_stat2_num)||'٢٥م+',_ft('about_stat2_label',ss.about_stat2_label)||'بینەر']].forEach(function(s){
      var st=el('div','cab-stat');
      st.appendChild(el('span','cab-stat-num',s[0]));
      st.appendChild(el('span','cab-stat-label',s[1]));
      cabStats.appendChild(st);
    });
    body.appendChild(cabStats);

    // ── 4. Ayah ───────────────────────────────────
    var cabAyah=el('div','cab-ayah-wrap');
    cabAyah.appendChild(el('div','cab-ayah-ar',_ft('about_quote_ar',ss.about_quote_ar)||'وَمَنْ أَحْسَنُ قَوْلًا مِّمَّن دَعَا إِلَى اللَّهِ وَعَمِلَ صَالِحًا وَقَالَ إِنَّنِي مِنَ الْمُسْلِمِينَ'));
    var _abQku=_ft('about_quote_ku',ss.about_quote_ku);
    if(_abQku)cabAyah.appendChild(el('div','cab-ayah-ku','"'+_abQku+'"'));
    cabAyah.appendChild(el('div','cab-ayah-ref',_ft('about_quote_ref',ss.about_quote_ref)||'سوڕەتا فصلت — ٣٣'));
    body.appendChild(cabAyah);

    // ── 5. Declaration ────────────────────────────
    var cabDecl=el('div','cab-decl');
    cabDecl.appendChild(el('div','cab-decl-title',_ft('about_decl_title',ss.about_decl_title)||'نە سیاسی، نە حزبی'));
    (_ft('about_declaration_text',ss.about_declaration_text)||'').split('\n\n').filter(Boolean).forEach(function(p){
      cabDecl.appendChild(el('div','cab-decl-para',p));
    });
    body.appendChild(cabDecl);

    // ── 6. Journey ────────────────────────────────
    var cabJrn=el('div','cfo-section');
    cabJrn.appendChild(el('div','cab-sec-label',_ft('founder_journey_label',ss.founder_journey_label)||'گەشت'));
    cabJrn.appendChild(el('div','cab-sec-title',_ft('founder_journey_title',ss.founder_journey_title)||'ڕێکا تەفسیر کورد'));
    var _jIntro=_ft('founder_journey_desc',ss.founder_journey_intro);
    if(_jIntro)cabJrn.appendChild(el('div','cfo-para',_jIntro));
    var APP_JOURNEY=[
      {t:_ft('founder_timeline1_title',ss.founder_j1_title)||'دەستپێکا هزرێ',d:_ft('founder_timeline1_desc',ss.founder_j1_desc)||'ب تێبینیکرنا کێمییا ناڤەڕۆکا ئیسلامی ب زمانێ کوردی، هزرا دروستکرنا پلاتفۆرمەکێ بۆ من هات، کو ناڤەڕۆکا قورئانێ ب شێوازەکێ مۆدێرن پێشکێش بکەت.'},
      {t:_ft('founder_timeline2_title',ss.founder_j2_title)||'دروستکرنا ناڤەڕۆکا ڤیدیویی',d:_ft('founder_timeline2_desc',ss.founder_j2_desc)||'دەستپێکرنا دروستکرنا ڤیدیویێن ئیسلامی یێن کورت بۆ تۆڕێن جڤاکی وەک ئینستاگرام و تیکتۆک، ب شێوازەکێ بالکێش کو بگەهیتە نەوەیێ نوی یێ کوردان.'},
      {t:_ft('founder_timeline3_title',ss.founder_j3_title)||'دامەزراندنا پلاتفۆرمێ',d:_ft('founder_timeline3_desc',ss.founder_j3_desc)||'دروستکرنا مالپەڕەکا تەمام بۆ خواندنا قورئانا پیرۆز ب تەفسیرا ساناهی و وەرگێڕانا کوردی، ب تایبەتمەندیێن مۆدێرن وەک شوێنکەفتنا خواندنێ و نیشانەکرن.'},
      {t:_ft('founder_timeline4_title',ss.founder_j4_title)||'گەهشتن ب ملیۆنان بینەران',d:_ft('founder_timeline4_desc',ss.founder_j4_desc)||'ب ڕێکا ئینستاگرام، تیکتۆک و یوتوب گەهشتینە زێدەتر ژ ٢٥ ملیۆن بینەر و ٦٥ هزار فۆڵۆوەران. ئەڤ ژمارە نیشانا پێدڤییا کوردانە بۆ ناڤەڕۆکەکا ئیسلامی زمانێ وان بخو.'}
    ];
    var appJrnTl=el('div','cfo-timeline');
    APP_JOURNEY.forEach(function(j){
      var item=el('div','cfo-tl-item');
      item.appendChild(el('div','cfo-tl-dot'));
      var tb=document.createElement('div');
      tb.appendChild(el('div','cfo-tl-title',j.t));
      tb.appendChild(el('div','cfo-tl-desc',j.d));
      item.appendChild(tb);appJrnTl.appendChild(item);
    });
    cabJrn.appendChild(appJrnTl);body.appendChild(cabJrn);

    // ── 7. Tafsir source ──────────────────────────
    var _tafsirText=_ft('about_tafsir_text',ss.about_tafsir_text);
    if(_tafsirText){
      var cabTafsir=el('div','cab-section');
      cabTafsir.appendChild(el('div','cab-sec-label',_ft('about_tafsir_label',ss.about_tafsir_label)||'ژێدەرێ تەفسیرێ'));
      _tafsirText.split('\n\n').filter(Boolean).forEach(function(p){
        cabTafsir.appendChild(el('div','cab-decl-para',p));
      });
      body.appendChild(cabTafsir);
    }

    // ── 7. Book card + image ──────────────────────
    var bookImgUrl=ss.tafsir_book_image||'';
    var cabCard=el('div','cab-book-card');
    var cabCardText=el('div','cab-book-card-text');
    var _bookTitle=_ft('about_book_title',ss.about_book_title)||'تەفسیرا ساناهی';
    cabCardText.appendChild(el('div','cab-book-card-badge',_bookTitle));
    cabCardText.appendChild(el('div','cab-book-card-title',_bookTitle));
    cabCardText.appendChild(el('div','cab-book-card-author',_ft('about_tafsir_author',ss.about_tafsir_author)||'ماموستا تەحسین ئیبراهیم دۆسکی'));
    cabCardText.appendChild(el('div','cab-book-card-desc',_ft('about_tafsir_book_desc',ss.about_tafsir_book_desc)||'وەرگێڕان و تەفسیرا قورئانا پیرۆز ب زمانێ کوردی (کرمانجی) بۆ هەمی کورد زمانان ل سەرانسەری جیهانێ.'));
    cabCard.appendChild(cabCardText);
    body.appendChild(cabCard);
    if(bookImgUrl){var bookImg=document.createElement('img');bookImg.alt='';bookImg.className='cfg-sheet-img';bookImg.style.opacity=_aboutImgCache[bookImgUrl]?'1':'0';bookImg.style.transition='opacity .4s';bookImg.onload=function(){bookImg.style.opacity='1';};bookImg.src=bookImgUrl;body.appendChild(bookImg);}
  }

  if(type==='thanks'){
    titleEl.textContent='سوپاسنامە';

    // ── Hero ──────────────────────────────────────
    var thHero=el('div','cfg-sheet-hero');
    var thIcon=el('div','cfg-sheet-avatar');
    thIcon.style.cssText='background:linear-gradient(135deg,#e8445a,#ff7c95);font-size:1.8rem;width:96px;height:96px;box-shadow:0 8px 24px rgba(232,68,90,.35);';
    thIcon.appendChild(icon('fas fa-heart'));
    thHero.appendChild(thIcon);
    thHero.appendChild(el('div','cfg-sheet-name','سوپاسنامە'));
    thHero.appendChild(el('div','cfg-sheet-role',_ft('thanks_hero_role','بۆ هەموو دڵسۆزانیێن ڤی پرۆژەی')));
    body.appendChild(thHero);

    // ── Opening praise — accent-bordered quote ────
    var thQuote=el('div','cfg-sheet-quote');
    thQuote.style.cssText='border-right:3px solid var(--accent);border-radius:0 var(--r-l) var(--r-l) 0;margin:8px 20px 0;';
    var thQuoteText=document.createElement('div');
    thQuoteText.style.cssText='font-weight:600;color:var(--text);font-size:.93rem;line-height:2;direction:rtl;';
    thQuoteText.textContent=_ft('thanks_quote','ل دەستپێکێ و ل دوماهییێ، سوپاس و ستایش بۆ خودایێ مەزن کو هێز و دەرفەت دا مە دا کو ئەڤی پرۆژەی بگەهینینە سەرکەفتنێ.');
    thQuote.appendChild(thQuoteText);
    body.appendChild(thQuote);

    // ── Body paragraphs ───────────────────────────
    var thBody=el('div','cfo-section');
    thBody.style.cssText='padding:20px 20px 0;';
    [
      _ft('thanks_para1','ئەڤ ئەپلیكەیشنە بەرهەمێ کارەکێ ب کۆم و دڵسۆزانەیە. ژ ناخێ دڵێ خۆ سوپاسیا ئێک ب ئێکێ وان دۆست و دڵسۆزان دکەم کو قوناغ ب قوناغ هاریكاریا من د دروستکرن، دیزاینکرن و پێشڤەبرنا ڤی ئەپی دا کری. ئەو ده‌ستێن ڕه‌نگین یێن کار تێدا کری و ئەو هزرێن جوان یێن ڕێبەریا من کری، ئەگەرێ سەرەکی بوون کو ئەڤڕۆ ئەڤ پرۆژە ب سەرکەفتیانە بکەڤیتە د خزمەتا وە دا. ماندووبوونا هەوە ل دەڤ من یا قەدرگران و ب نرخە.'),
      _ft('thanks_para2','د هەمان دەم دا، سوپاسیا هەوە یێن ئەزیز و بکارهێنەرێن ئەپی دکەم کو ب متمانە و پشتەڤانیا خۆ، هێز دایە مە. هیڤیدارم ئەڤ کارە پڕ مفا بیت و ببیته‌ جهێ ڕازیبوون و دڵخۆشیا هەوە هەمیای.')
    ].filter(Boolean).forEach(function(p){
      var para=el('div','cfo-para',p);
      para.style.cssText='font-size:.9rem;line-height:2;margin-bottom:18px;';
      thBody.appendChild(para);
    });
    body.appendChild(thBody);

    // ── Closing prayer card ───────────────────────
    var thDua=el('div','cfo-dua');
    thDua.appendChild(el('div','cfo-dua-label',_ft('thanks_dua_label','دوعا')));
    var duaText=el('div','cfo-dua-text');
    duaText.style.cssText='font-size:.88rem;line-height:2.1;';
    duaText.textContent=_ft('thanks_dua_text','ژ خودایێ میهرەبان دخۆازم خێر و بەرەکەتێ بێخیتە د ژیان و کارێن وه‌ دا. خودێ دەرگەهێن ڕزقێ حەلال و سەرکەفتنێ ل بەردەم هەوە ڤەکەت، و هەوە ژ هەر نەخۆشی و تەنگاڤیەکێ بپارێزیت. ژ دل هیڤیخوازم کو دایم یێن ساخلەم، دلخۆش و سەرکەفتی بن و خودێ جزا و پاداشتێ ڤێ هاریكاری و چاکیا وە بدەتە مه‌زنتر لێ بکەت.');
    thDua.appendChild(duaText);
    body.appendChild(thDua);
  }
}

function mkBtnRow(labelText,btnLabel,btnIcon,onClick,danger,sub){
  var row=el('div','setting-row s-row');
  if(sub){
    var wrap=el('div','setting-label-wrap');
    wrap.appendChild(el('div','setting-label',labelText));
    wrap.appendChild(el('div','setting-sub',sub));
    row.appendChild(wrap);
  }else{
    row.appendChild(el('div','setting-label',labelText));
  }
  var btn=el('button','hdr-text-btn'+(danger?' danger-btn':''));
  if(btnIcon){btn.appendChild(icon(btnIcon));btn.appendChild(document.createTextNode(' '));}
  btn.appendChild(document.createTextNode(btnLabel));
  on(btn,'click',function(){haptic(danger?[50]:[8]);onClick();});
  row.appendChild(btn);
  return row;
}
function mkSliderRow(labelText,value,min,max,step,onInput,onChange){
  var cur=value;
  var row=el('div','setting-row s-row setting-row--stepper');
  row.appendChild(el('div','setting-label',labelText));
  var ctrl=el('div','setting-stepper');
  var minusBtn=el('button','stepper-btn stepper-minus','-');
  var valEl=el('span','stepper-val',cur.toFixed(1));
  var plusBtn=el('button','stepper-btn stepper-plus','+');
  function update(v){
    v=Math.round(v*100)/100;
    if(v<min)v=min;if(v>max)v=max;
    cur=v;valEl.textContent=v.toFixed(1);
    minusBtn.disabled=(v<=min);plusBtn.disabled=(v>=max);
    onInput(v);onChange(v);
  }
  on(minusBtn,'click',function(){haptic([6]);update(parseFloat((cur-step).toFixed(2)));});
  on(plusBtn,'click',function(){haptic([6]);update(parseFloat((cur+step).toFixed(2)));});
  minusBtn.disabled=(cur<=min);plusBtn.disabled=(cur>=max);
  ctrl.appendChild(minusBtn);ctrl.appendChild(valEl);ctrl.appendChild(plusBtn);
  row.appendChild(ctrl);
  return row;
}

function _showIgPicker(){
  haptic([8]);
  var existing=document.getElementById('_igPickerOverlay');
  if(existing){existing.remove();return;}
  var overlay=document.createElement('div');
  overlay.id='_igPickerOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;';
  overlay.style.opacity='0';overlay.style.transition='opacity .2s';
  var sheet=document.createElement('div');
  sheet.style.cssText='width:100%;max-width:480px;background:var(--bg2);border-radius:20px 20px 0 0;padding:12px 12px 32px;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,1,.23,1);border-top:1px solid var(--border);';
  var handle=document.createElement('div');
  handle.style.cssText='width:36px;height:4px;border-radius:2px;background:var(--border);margin:0 auto 16px;';
  sheet.appendChild(handle);
  var title=document.createElement('div');
  title.textContent='Instagram';
  title.style.cssText='text-align:center;font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:10px;letter-spacing:.5px;text-transform:uppercase;';
  sheet.appendChild(title);
  var OPTS=[
    {label:'TafsirKurd',sub:'@tafsirkurd',url:'https://www.instagram.com/tafsirkurd/'},
    {label:'TafsirKurd App',sub:'@tafsirkurd.app',url:'https://www.instagram.com/tafsirkurd.app/'}
  ];
  OPTS.forEach(function(opt,i){
    if(i>0){var sep=document.createElement('div');sep.style.cssText='height:1px;background:var(--border);margin:0 16px;';sheet.appendChild(sep);}
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:14px;padding:16px;border-radius:14px;cursor:pointer;transition:background .15s;';
    var ic=document.createElement('i');ic.className='fab fa-instagram';ic.style.cssText='font-size:24px;color:#E1306C;width:26px;text-align:center;flex-shrink:0;';
    var txt=document.createElement('div');txt.style.cssText='flex:1;min-width:0;';
    var lbl=document.createElement('div');lbl.textContent=opt.label;lbl.style.cssText='font-size:16px;font-weight:700;color:var(--text);';
    var sub=document.createElement('div');sub.textContent=opt.sub;sub.style.cssText='font-size:13px;color:var(--text-muted);margin-top:3px;';
    var chev=document.createElement('i');chev.className='fas fa-chevron-left';chev.style.cssText='font-size:12px;color:var(--text-muted);flex-shrink:0;';
    txt.appendChild(lbl);txt.appendChild(sub);
    row.appendChild(ic);row.appendChild(txt);row.appendChild(chev);
    on(row,'mouseover',function(){row.style.background='var(--bg3)';});
    on(row,'mouseout',function(){row.style.background='';});
    row.onclick=function(){close();_openLink(opt.url);haptic([8]);};
    sheet.appendChild(row);
  });
  overlay.appendChild(sheet);
  function close(){
    overlay.style.opacity='0';sheet.style.transform='translateY(100%)';
    setTimeout(function(){overlay.remove();},280);
  }
  overlay.onclick=function(e){if(e.target===overlay)close();};
  document.body.appendChild(overlay);
  requestAnimationFrame(function(){
    overlay.style.opacity='1';sheet.style.transform='translateY(0)';
  });
}

function renderSettings(){
  var content=$('settingsContent');
  var frag=document.createDocumentFragment();

  // ── Profile hero card ────────────────────────
  var profile=el('div','profile-card');
  if(S.user){
    // Avatar
    var avatarEl;
    if(S.user.avatar){
      avatarEl=document.createElement('img');
      avatarEl.className='profile-avatar-img';
      avatarEl.alt='';
      avatarEl.referrerPolicy='no-referrer';avatarEl.crossOrigin='anonymous';
      avatarEl.onerror=function(){
        var fb=el('div','profile-avatar');fb.appendChild(icon('fas fa-user'));
        if(this.parentNode)this.parentNode.replaceChild(fb,this);
      };
      avatarEl.src=S.user.avatar; // set src last so error handler is wired first
    }else{
      avatarEl=el('div','profile-avatar');
      avatarEl.appendChild(icon('fas fa-user'));
    }
    profile.appendChild(avatarEl);
    // Info block
    var pInfo=el('div','profile-info');
    pInfo.appendChild(el('div','profile-name',S.user.name||t('profile.guest')));
    pInfo.appendChild(el('div','profile-email',S.user.email||''));
    var syncBadge=el('div','profile-sync');
    syncBadge.appendChild(icon('fas fa-cloud-upload-alt'));
    syncBadge.appendChild(document.createTextNode(' '+t('profile.synced')));
    pInfo.appendChild(syncBadge);
    profile.appendChild(pInfo);
    // "View profile" hint row
    var chevRow=el('div','profile-chevron-row');
    chevRow.appendChild(document.createTextNode(t('profile.view_profile')||'پرۆفایلی ببینە'));
    chevRow.appendChild(icon('fas fa-chevron-left'));
    profile.appendChild(chevRow);
    on(profile,'click',function(){App.openProfile()});
  }else{
    // Guest
    var guestAv=el('div','profile-avatar');
    guestAv.appendChild(icon('fas fa-user'));
    profile.appendChild(guestAv);
    var pInfo2=el('div','profile-info');
    pInfo2.appendChild(el('div','profile-name',t('profile.guest')));
    pInfo2.appendChild(el('div','profile-email',t('profile.login_prompt')));
    profile.appendChild(pInfo2);
    var loginBtn=el('button','profile-login-btn',t('profile.login'));
    on(loginBtn,'click',function(){App.openLogin()});
    profile.appendChild(loginBtn);
    profile.style.cursor='default';
  }
  frag.appendChild(profile);

  // ── (1) Reading Stats Card ────────────────────
  var log=getReadLog();
  var bms=getBookmarks();
  var totalRead=calcTotalRead(log);
  var streak=calcStreak(log);
  var statsCard=el('div','stats-card');
  [[icon('fas fa-quran'),totalRead,t('settings.stats_ayahs')],
   [icon('fas fa-fire'),streak,t('settings.stats_streak')],
   [icon('fas fa-bookmark'),bms.length,t('settings.stats_bookmarks')]
  ].forEach(function(item){
    var col=el('div','stats-col');
    var ic=item[0];ic.className+=' stats-icon';
    col.appendChild(ic);
    col.appendChild(el('div','stats-num',String(item[1])));
    col.appendChild(el('div','stats-lbl',item[2]));
    statsCard.appendChild(col);
  });
  frag.appendChild(statsCard);

  // ── Appearance ───────────────────────────────
  var g1=el('div','settings-group');
  g1.appendChild(el('div','settings-group-title',t('settings.appearance')));
  var themes=[
    {id:'noor',  name:t('settings.theme_noor')||'نوور',       sub:'Parchment',bg:'#f4e8cc',surface:'#fdf4e3', accent:'#1a5c3a'},
    {id:'sakina',name:t('settings.theme_sakina')||'سکینە',   sub:'Emerald', bg:'#0c1c12', surface:'#112318', accent:'#c9a84c'},
    {id:'light', name:t('settings.theme_light')||'ڕووناک',    sub:'Light',   bg:'#fafafa', surface:'#ffffff', accent:'#000000'},
    {id:'dark',  name:t('settings.theme_dark')||'تاریکی',    sub:'Dark',    bg:'#0a0a0a', surface:'#161616', accent:'#ffffff'},
  ];
  var tGrid=el('div','theme-grid');
  themes.forEach(function(th){
    var card=el('div','theme-card'+(S.theme===th.id?' on':''));
    // Preview swatch
    var preview=el('div','theme-card-preview');
    var swatch=el('div','theme-swatch-main');
    swatch.style.background=th.bg;
    swatch.style.border='1px solid rgba(128,128,128,.2)';
    var dot=el('div','theme-swatch-dot');
    dot.style.background=th.accent;
    swatch.appendChild(dot);
    preview.appendChild(swatch);
    var lines=el('div','theme-swatch-lines');
    [th.surface,'rgba(128,128,128,.25)','rgba(128,128,128,.15)'].forEach(function(c,i){
      var ln=el('div','theme-swatch-line');
      ln.style.background=c;
      ln.style.width=i===0?'100%':i===1?'70%':'50%';
      ln.style.opacity=i===0?'1':'1';
      lines.appendChild(ln);
    });
    preview.appendChild(lines);
    card.appendChild(preview);
    card.appendChild(el('div','theme-card-name',th.name));
    card.appendChild(el('div','theme-card-sub',th.sub));
    var chk=el('div','theme-card-check');chk.appendChild(icon('fas fa-check'));card.appendChild(chk);
    on(card,'click',function(){S.theme=th.id;applyTheme();try{localStorage.setItem('themeUserChosen','1');}catch(e){}H.light();renderSettings();});
    tGrid.appendChild(card);
  });
  g1.appendChild(tGrid);
  frag.appendChild(g1);

  // ── Reading ──────────────────────────────────
  var g2=el('div','settings-group');
  g2.appendChild(el('div','settings-group-title',t('settings.reading')));
  g2.appendChild(mkToggleRow(t('settings.show_tafsir'),S.showTafsir,function(){
    S.showTafsir=!S.showTafsir;
    localStorage.setItem('showTafsir',String(S.showTafsir));
    applyShowTafsir();renderSettings();
  }));
  g2.appendChild(mkToggleRow(t('settings.auto_advance'),S.autoAdvance,function(){
    S.autoAdvance=!S.autoAdvance;
    localStorage.setItem('autoAdvance',String(S.autoAdvance));
    renderSettings();
  },t('settings.auto_advance_sub')));
  g2.appendChild(mkToggleRow(t('settings.scroll_follows'),S.scrollFollowsAudio,function(){
    S.scrollFollowsAudio=!S.scrollFollowsAudio;
    localStorage.setItem('scrollFollowsAudio',String(S.scrollFollowsAudio));
    renderSettings();
  },t('settings.scroll_follows_sub')));
  g2.appendChild(mkToggleRow(t('qs.screen_lock'),S.keepAwake,function(){
    S.keepAwake=!S.keepAwake;
    localStorage.setItem('keepAwake',String(S.keepAwake));
    applyKeepAwake();renderSettings();
  }));
  g2.appendChild(mkToggleRow(t('settings.bg_audio'),S.bgAudio,function(){
    S.bgAudio=!S.bgAudio;
    localStorage.setItem('bgAudio',String(S.bgAudio));
    renderSettings();
  }));
  var _hapticRow=mkToggleRow(t('settings.haptic'),S.hapticFeedback,function(){
    S.hapticFeedback=!S.hapticFeedback;
    localStorage.setItem('hapticFeedback',String(S.hapticFeedback));
    H.success();
    renderSettings();
  },t('settings.haptic_sub'));
  var _hapticSupported=!!(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics)||!!navigator.vibrate;
  if(!_hapticSupported){
    var _hapticNote=el('div','setting-sub');
    _hapticNote.style.cssText='color:var(--text-tertiary);font-size:.75rem;margin-top:2px;';
    _hapticNote.textContent=t('settings.haptic_native')||'تەنها لە ئاپی ڕەسمی کار دەکات';
    var _hapticLabelWrap=_hapticRow.querySelector('.setting-label-wrap');
    if(_hapticLabelWrap)_hapticLabelWrap.appendChild(_hapticNote);
    var _hapticToggle=_hapticRow.querySelector('.toggle');
    if(_hapticToggle){_hapticToggle.style.opacity='0.4';_hapticToggle.style.pointerEvents='none';}
  }
  g2.appendChild(_hapticRow);
  frag.appendChild(g2);

  // ── Data & Sync ──────────────────────────────
  var g4=el('div','settings-group');
  g4.appendChild(el('div','settings-group-title',t('settings.data')));
  // Downloads manager
  var _dlRow=el('div','setting-row s-row');_dlRow.style.cursor='pointer';
  var _dlRowL=el('div','setting-label-wrap');_dlRowL.appendChild(el('div','setting-label',t('dl.manage')||'دابەزاندن'));
  _dlRow.appendChild(_dlRowL);
  var _dlRowChev=icon('fas fa-chevron-left');_dlRowChev.style.cssText='color:var(--text-tertiary);font-size:.8rem;flex-shrink:0';
  _dlRow.appendChild(_dlRowChev);
  on(_dlRow,'click',function(){haptic([8]);openDlManager();});
  g4.appendChild(_dlRow);
  // (6) Sync status panel
  if(S.user){
    var syncCard=el('div','sync-card');

    // Top row: email + live status + action button
    var cardTop=el('div','sync-card-top');
    var cardInfo=el('div','sync-card-info');
    cardInfo.appendChild(el('div','sync-card-email',S.user.email||''));
    _syncPanelStatusEl=el('div','sync-status-line');
    cardInfo.appendChild(_syncPanelStatusEl);
    cardTop.appendChild(cardInfo);
    _syncPanelBtnEl=el('button','hdr-text-btn');
    on(_syncPanelBtnEl,'click',function(){syncToCloud();});
    cardTop.appendChild(_syncPanelBtnEl);
    syncCard.appendChild(cardTop);
    _updateSyncPanelStatus();

    // What syncs
    syncCard.appendChild(el('div','sync-divider'));
    syncCard.appendChild(el('div','sync-section-lbl',t('settings.sync_what_syncs')));
    var chips1=el('div','sync-chips');
    [
      ['fas fa-book-open',t('settings.sync_item_reading')],
      ['fas fa-bookmark', t('settings.sync_item_bookmarks')],
      ['fas fa-bullseye', t('settings.sync_item_goals')],
      ['fas fa-mosque',   t('settings.sync_item_prayer')],
      ['fas fa-heart',    t('settings.sync_item_saved')],
      ['fas fa-sliders',  t('settings.sync_item_settings')]
    ].forEach(function(d){
      var chip=el('span','sync-chip');
      chip.appendChild(icon(d[0]));
      chip.appendChild(document.createTextNode(' '+d[1]));
      chips1.appendChild(chip);
    });
    syncCard.appendChild(chips1);

    // Device-only
    syncCard.appendChild(el('div','sync-divider'));
    syncCard.appendChild(el('div','sync-section-lbl sync-section-lbl--device',t('settings.sync_device_only')));
    var chips2=el('div','sync-chips');
    [t('settings.sync_device_cache'),t('settings.sync_device_notif'),t('settings.sync_device_sched')].forEach(function(lbl){
      chips2.appendChild(el('span','sync-chip sync-chip--muted',lbl));
    });
    syncCard.appendChild(chips2);

    g4.appendChild(syncCard);
  }
  // (8) Export bookmarks
  g4.appendChild(mkBtnRow(t('settings.export_bookmarks'),t('settings.export_btn'),'fas fa-download',function(){
    var bms2=getBookmarks();
    if(!bms2.length){toast(t('toast.no_bookmarks'));return;}
    var json=JSON.stringify(bms2,null,2);
    var blob=new Blob([json],{type:'application/json'});
    var url2=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url2;a.download='tafsirkurd-bookmarks.json';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url2)},500);
  },false,t('settings.export_bookmarks_sub')||'ئەو ئایەتێن تە هەلبژارتین بهەلگری'));
  // Import bookmarks
  g4.appendChild(mkBtnRow(t('settings.import_bookmarks')||'بینینا ئایەتێن هەلگرتی',t('settings.import_btn')||'هەڵبژاردن','fas fa-upload',function(){
    var inp=document.createElement('input');
    inp.type='file';inp.accept='.json,application/json';
    inp.onchange=function(){
      var file=inp.files&&inp.files[0];
      if(!file)return;
      var reader=new FileReader();
      reader.onload=function(e){
        try{
          var imported=JSON.parse(e.target.result);
          if(!Array.isArray(imported))throw new Error('not array');
          var valid=imported.filter(function(b){return b&&typeof b.surah==='number'&&typeof b.ayah==='number';});
          if(!valid.length){toast(t('toast.import_invalid')||'فایل دروست نینە');return;}
          // Merge with existing — imported wins on conflict
          var existing=getBookmarks();
          var merged={};
          existing.forEach(function(b){merged[b.surah+':'+b.ayah]=b;});
          valid.forEach(function(b){merged[b.surah+':'+b.ayah]=b;});
          saveBookmarks(Object.values(merged));
          toast((t('toast.import_done')||'نیشانەکراو هاتن')+' ('+valid.length+')');
          renderSettings();
        }catch(err){toast(t('toast.import_invalid')||'فایل دروست نینە');}
      };
      reader.readAsText(file);
    };
    inp.click();
  },false,t('settings.import_bookmarks_sub')||'دووبارە بینینا ئەو ئایەتێن تە هەلگرتین'));
  // (7) Reset reading progress
  g4.appendChild(mkBtnRow(t('settings.reset_progress'),t('settings.reset_btn'),'fas fa-rotate-left',function(){
    if(!confirm(t('settings.reset_confirm')))return;
    _clearTrackingState();
    for(var i=1;i<=114;i++){localStorage.removeItem('surah_scroll_'+i);}
    debouncedSync(); // push reset to cloud
    toast(t('toast.progress_reset'));
    renderSettings();
  },true));
  // Clear cache
  g4.appendChild(mkBtnRow(t('settings.clear_cache'),t('settings.clear_btn'),'fas fa-trash',function(){
    if(confirm(t('settings.clear_confirm'))){
      S.quranData=null;S.tafsirData=null;
      _dataReady.quran=false;_dataReady.tafsir=false;
      loadQuranData();loadTafsirData();
      toast(t('toast.cache_cleared'));
    }
  }));
  // App notifications toggle (new video, new book — NOT prayer)
  var _appNotifOn=localStorage.getItem('appNotifEnabled')!=='false';
  g4.appendChild(mkToggleRow(
    t('settings.app_notif')||'ئاگەهدارکرنێن ئاپ (ڤیدیۆ، پەرتوک…)',
    _appNotifOn,
    function(){
      _appNotifOn=!_appNotifOn;
      localStorage.setItem('appNotifEnabled',String(_appNotifOn));
      renderSettings();
    },
    t('settings.app_notif_sub')||'ئاگەهدارکرنێن نمازê ji vir tê birêvebirin'
  ));
  // Reset settings to defaults
  g4.appendChild(mkBtnRow(t('settings.reset_defaults')||'ڕێکخستنێن xwerû','ڕێکخستن','fas fa-undo',function(){
    if(!confirm(t('settings.reset_defaults_confirm')||'ئایا ڕێکخستنان vegerînin xwerû?'))return;
    var _sk=['showTafsir','bgAudio','keepAwake','autoAdvance','scrollFollowsAudio','hapticFeedback','app_arSize','app_tfSize','app_lineH'];
    _sk.forEach(function(k){localStorage.removeItem(k);});
    S.showTafsir=true;S.bgAudio=false;S.keepAwake=false;S.autoAdvance=false;S.scrollFollowsAudio=true;S.hapticFeedback=true;
    S.arSize=2.0;S.tfSize=1.0;S.lineH=2.2;
    if(S.theme!=='noor'){S.theme='noor';applyTheme();}
    applySizes();
    toast(t('toast.settings_reset')||'ڕێکخستن گەرانەوە بۆ xwerû');
    renderSettings();
  },false));
  // Logout (only when logged in)
  if(S.user){
    g4.appendChild(mkBtnRow(t('profile.logout')||'دەرچوون',t('profile.logout')||'دەرچوون','fas fa-sign-out-alt',function(){
      App.logout();
    },true));
  }
  // Delete account (only when logged in)
  if(S.user){
    g4.appendChild(mkBtnRow(t('profile.delete_account')||'ژێبرنا هەژمارێ',t('profile.delete_account')||'ژێبرن','fas fa-user-slash',function(){
      App.openProfile();
    },true));
  }
  frag.appendChild(g4);

  // ── Advanced (collapsible) ───────────────────
  // Hidden from normal users by default. Contains performance override and future
  // ── App ──────────────────────────────────────
  var g5=el('div','settings-group');
  g5.appendChild(el('div','settings-group-title',t('settings.app_group')));
  // (4) Share app
  g5.appendChild(mkBtnRow(t('settings.share_app'),t('settings.share_btn'),'fas fa-share-nodes',function(){
    var url3='https://tafsirkurd.com';
    if(navigator.share){
      navigator.share({title:'Tafsir Kurd',text:t('settings.about_desc'),url:url3}).catch(function(){});
    }else{
      navigator.clipboard.writeText(url3).then(function(){toast(t('toast.link_copied'))}).catch(function(){toast(url3)});
    }
  }));
  // (5) Rate app — full-row tappable (both iOS and Android)
  var _rateRow=el('div','rate-app-row s-row');
  var _rateLeft=el('div','rate-app-left');
  var _rateIconBox=el('div','rate-app-icon');
  _rateIconBox.appendChild(icon('fas fa-star'));
  var _rateText=el('div','rate-app-text');
  _rateText.appendChild(el('div','rate-app-label',t('settings.rate_app')));
  var _ratePlat=window.Capacitor&&window.Capacitor.getPlatform?window.Capacitor.getPlatform():'web';
  var _rateSub=_ratePlat==='ios'?'لەسەر App Store هەڵسەنگاندن بکە':t('settings.rate_sub');
  _rateText.appendChild(el('div','rate-app-sub',_rateSub));
  _rateLeft.appendChild(_rateIconBox);_rateLeft.appendChild(_rateText);
  _rateRow.appendChild(_rateLeft);
  var _rateChev=el('span','about-nav-chevron');_rateChev.appendChild(icon('fas fa-chevron-left'));_rateRow.appendChild(_rateChev);
  on(_rateRow,'click',function(){
    haptic([8]);
    toast(t('toast.rating_opening'));
    localStorage.setItem('ratingPromptDone','true');
    var _plat=window.Capacitor&&window.Capacitor.getPlatform?window.Capacitor.getPlatform():'web';
    if(_plat==='ios'){
      window.open('itms-apps://itunes.apple.com/app/id6760433688?action=write-review','_system');
    }else{
      // market:// is intercepted by Android as an Intent — opens Play Store app directly
      window.location.href='market://details?id=com.tafsirkurd.app';
    }
  });
  g5.appendChild(_rateRow);

  // ── About Us ─────────────────────────────────
  var g6=el('div','settings-group');
  g6.appendChild(el('div','settings-group-title',t('settings.about')));

  function mkAboutNavRow(iconClassOrImg,label,sub,onClick){
    var row=el('div','about-nav-row s-row');
    var left=el('div','about-nav-left');
    var iconBox=el('div','about-nav-icon');
    if(iconClassOrImg&&iconClassOrImg.tagName==='IMG'){
      var _mod=iconClassOrImg._iconMod||'about-nav-icon--img';
      _mod.split(' ').forEach(function(c){if(c)iconBox.classList.add(c);});
      iconBox.appendChild(iconClassOrImg);
    }else{
      iconBox.appendChild(icon(iconClassOrImg));
    }
    left.appendChild(iconBox);
    var textWrap=el('div');
    textWrap.appendChild(el('div','about-nav-label',label));
    if(sub)textWrap.appendChild(el('div','about-nav-sub',sub));
    left.appendChild(textWrap);
    row.appendChild(left);
    var chev=el('span','about-nav-chevron');chev.appendChild(icon('fas fa-chevron-left'));row.appendChild(chev);
    on(row,'click',onClick);
    return row;
  }
  // App logo — accent circle with padding so PNG sits cleanly on all themes
  var _appLogoImg=document.createElement('img');_appLogoImg.src='/assets/images/logo.png';_appLogoImg.alt='';
  _appLogoImg._iconMod='about-nav-icon--img about-nav-icon--logo';
  // Founder avatar — check in-memory cache first, then fall back to localStorage cache
  var _founderImgSrc=(_ssMemory&&_ssMemory.founder_avatar_url)||'';
  if(!_founderImgSrc){try{var _ssDisk=JSON.parse(localStorage.getItem(_ssCacheKey)||'null');if(_ssDisk&&_ssDisk.d&&_ssDisk.d.founder_avatar_url)_founderImgSrc=_ssDisk.d.founder_avatar_url;}catch(e){}}
  var _founderEl;
  if(_founderImgSrc){_founderEl=document.createElement('img');_founderEl.src=_founderImgSrc;_founderEl.alt='';_founderEl._iconMod='about-nav-icon--img about-nav-icon--person';}
  else{_founderEl=icon('fas fa-user');}
  g6.appendChild(mkAboutNavRow(_appLogoImg,'تەفسیر کورد','دەربارەی پڕۆژەی',function(){openAboutSheet('app');}));
  g6.appendChild(mkAboutNavRow(_founderEl,'سامان عبدالرحمن','دامەزرێنەر',function(){openAboutSheet('founder');}));
  g6.appendChild(mkAboutNavRow('fas fa-heart','سوپاسنامە',_ft('thanks_nav_sub','بۆ هەر کەسێک یارمەتیدا'),function(){openAboutSheet('thanks');}));
  // ── Social Links (inside ئەپ group) ──
  var g7=g5;
  var socialCard=el('div','settings-social-card');
  var SOCIAL_DEFS=[
    {key:'social_instagram',icon:'fab fa-instagram',label:'Instagram'},
    {key:'social_youtube',icon:'fab fa-youtube',label:'YouTube'},
    {key:'social_tiktok',icon:'fab fa-tiktok',label:'TikTok'},
    {key:'social_telegram',icon:'fab fa-telegram',label:'Telegram'},
    {key:'social_pinterest',icon:'fab fa-pinterest',label:'Pinterest'},
    {key:'social_email',icon:'fas fa-envelope',label:'Email'},
    {key:'social_website',icon:'fas fa-globe',label:'Website'}
  ];
  var socialBar=el('div','settings-social');
  var socGroup=el('div','soc-group');
  var _socBtns={};
  SOCIAL_DEFS.forEach(function(def){
    var btn=el('button','soc-btn');
    btn.title=def.label;
    btn.appendChild(icon(def.icon));
    btn.style.display='none';
    on(btn,'click',function(){
      if(def.key==='social_instagram'){
        _showIgPicker();
      } else {
        _openLink(btn._url);haptic([8]);
      }
    });
    _socBtns[def.key]=btn;
    socGroup.appendChild(btn);
  });
  socialBar.appendChild(socGroup);
  socialCard.appendChild(socialBar);
  frag.appendChild(g6);
  g5.appendChild(socialCard);
  frag.appendChild(g5);
  getSiteSettings().then(function(ss){
    SOCIAL_DEFS.forEach(function(def){
      var url=ss[def.key]||def.fallback||'';
      var btn=_socBtns[def.key];
      if(url){btn._url=url;btn.style.display='';}
    });
  });

  // ── About ────────────────────────────────────
  var about=el('div','about-section');
  var aboutLogo=document.createElement('img');
  aboutLogo.src='/assets/images/logo.png';aboutLogo.alt='';
  about.appendChild(aboutLogo);
  about.appendChild(el('div','about-name','Tafsir Kurd'));
  var verEl=el('div','about-ver','v2.3.0');
  about.appendChild(verEl);
  if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App){
    Capacitor.Plugins.App.getInfo().then(function(info){
      if(info&&info.version)verEl.textContent='v'+info.version;
    }).catch(function(){});
  }
  about.appendChild(el('div','about-desc',t('settings.about_desc')));
  frag.appendChild(about);
  clear(content); content.appendChild(frag);
}

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
    S.supabase=window.supabase.createClient(cachedCfg.supabaseUrl,cachedCfg.supabaseKey,{auth:{storageKey:'sb-tafsirkurd-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
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
        S.supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{storageKey:'sb-tafsirkurd-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        window._appSupabase=S.supabase;
        _notifySupabaseReady();
        checkAuthSession();
        if(cb)cb();
      }else{
        // Silently replace client when URL changed (e.g. after proxy migration).
        // supa_cfg was just updated to the new URL; the cache-created client still
        // holds the old URL. storageKey 'sb-tafsirkurd-v1' is stable so the existing
        // session survives the swap — no logout occurs.
        var _nc=(cfg.supabaseUrl||'').replace(/\/$/,'');
        var _oc='';try{_oc=(S.supabase.supabaseUrl||'').replace(/\/$/,'');}catch(e){}
        if(_oc&&_nc&&_oc!==_nc){
          S.supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{storageKey:'sb-tafsirkurd-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
          window._appSupabase=S.supabase;
        }
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
  if(S.syncFailed)return{dot:'✕',txt:(t('settings.sync_status_failed')||'هەلگرتن سەرنەکەفت')+(S.syncErrorDetail?' ['+S.syncErrorDetail.slice(0,60)+']':''),col:'#e53935'};
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
  if(h<24)return h+' '+(t('profile.time_hour')||'دەمژمێر');
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
  // Stop previous instance first — removes both the interval AND the visibilitychange
  // listener. Without this, the old listener is orphaned when _sessionFgHandler ref
  // is overwritten below, causing duplicate touches on re-login.
  _stopSessionHeartbeat();
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
        toast(t('profile.session_revoked')||'هاتە دەرئێخستن ژ لایێ ئامیرەکێ دی ڤە');
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
  'tasbihDhikr','tasbihTarget',
  'prayerTrackingStart'
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

// prayer_log: additive union — per-day, per-prayer OR (done on either device = done)
function _mergePrayerLog(aStr,bStr){
  try{
    var a=JSON.parse(aStr||'{}');var b=JSON.parse(bStr||'{}');
    var result={};var allDays={};
    Object.keys(a).forEach(function(d){allDays[d]=true;});
    Object.keys(b).forEach(function(d){allDays[d]=true;});
    Object.keys(allDays).forEach(function(day){
      var da=a[day]||{};var db=b[day]||{};var merged={};
      ['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(function(p){if(da[p]||db[p])merged[p]=true;});
      if(Object.keys(merged).length>0)result[day]=merged;
    });
    return JSON.stringify(result);
  }catch(e){return aStr||bStr||'{}';}
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

  // prayer_log: additive union (pray on any device, all devices know)
  result.prayer_log=_mergePrayerLog(local.prayer_log,cloud.prayer_log);

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
  var pl=localStorage.getItem('prayer_log');if(pl!==null)data.prayer_log=pl;
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
  if(S.tab==='settings'){renderSettings();_renderHash.settings=_tabHash('settings');}
  if(S.tab==='bookmarks'){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');}
  if(S.tab==='goals'){renderGoals();_renderHash.goals=_tabHash('goals');}
  if(S.tab==='prayer'&&window.PrayerUI){PrayerUI.render();_renderHash.prayer=_tabHash('prayer');}
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
  var _syncTO=new Promise(function(_,rej){setTimeout(function(){rej(new Error('sync_timeout'));},_sn.ms(18000,30000));});
  Promise.race([
    S.supabase.from('user_data').upsert({
      user_id:S.user.id,
      app_data:payload,
      updated_at:new Date().toISOString()
    },{onConflict:'user_id',ignoreDuplicates:false}),
    _syncTO
  ]).then(function(resp){
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
  ['_lastSyncTime','readingGoal','readLog','readAyahsToday','bestStreak','readSessions','prayer_log'].forEach(function(k){localStorage.removeItem(k);});
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
  _updateOfflineBanner(false);
});

window.addEventListener('offline',function(){ _updateOfflineBanner(true); });

// Persistent offline banner — small non-dismissible chip at top of screen.
// Created once, toggled with .on class, never shown on Capacitor (native UI handles it).
(function(){
  var _b=null;
  function _mkBanner(){
    _b=document.createElement('div');
    _b.id='offlineBanner';
    _b.setAttribute('role','status');
    _b.setAttribute('aria-live','polite');
    _b.textContent=t('toast.offline_cached','بەبێ ئینتەرنێت — ناوەرۆکی کاشێ');
    document.body.appendChild(_b);
  }
  window._updateOfflineBanner=function(isOffline){
    if(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()!=='web')return;
    if(!_b)_mkBanner();
    _b.classList.toggle('on',isOffline);
  };
  // Check once at startup (after a tick so body exists)
  setTimeout(function(){ _updateOfflineBanner(!navigator.onLine); },0);
}());


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
      return t('auth.err_wrong_credentials')||'ئیمەیل یان ژمارا نهێنی یا خەلەتە';
    if(m.indexOf('email not confirmed')!==-1||m.indexOf('not confirmed')!==-1)
      return t('auth.err_email_not_confirmed')||'ئیمەیلا تە نەهاتییە پشتڕاستکرن، هیڤییە پشکنینا ئیمەیلێ خۆ بکە.';
    if(m.indexOf('too many requests')!==-1||m.indexOf('rate limit')!==-1||m.indexOf('over_email_send_rate_limit')!==-1)
      return t('auth.err_rate_limit')||'هەوڵدانێن زێدە چێبوون. پشتی چەند خۆلەکان دووبارە هەوڵ بدە.';
    if(m.indexOf('user already registered')!==-1||m.indexOf('already been registered')!==-1||m.indexOf('already exists')!==-1)
      return t('auth.err_already_registered')||'ئەڤ ئیمەیلە پێشتر هاتییە تۆمارکرن. چوونەژوور بۆ ناڤ ئەکاونتێ خۆ بکە.';
    if(m.indexOf('network')!==-1||m.indexOf('fetch')!==-1)
      return t('auth.err_network')||'ئاریشەک د تۆڕێ دا چێبوو. پشکنینێ بۆ هێلا ئینتەرنێتا خۆ بکە';
    if(m.indexOf('token')!==-1&&m.indexOf('expired')!==-1)
      return t('auth.err_token_expired')||'دەمێ کۆدی ب دوماهی هات. داخوازا کۆدەکێ نوی بکە';
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

    var resendBtn=el('button','auth-guest-btn',t('auth.resend_code')||'کودی دووبارە ب هنێرە');
    on(resendBtn,'click',function(){
      resendBtn.disabled=true;resendBtn.textContent='...';
      S.supabase.auth.resend({type:'signup',email:email}).then(function(){
        showMsg(t('auth.code_resent')||'Koda nû hat şandin.','info');
        setTimeout(function(){resendBtn.disabled=false;resendBtn.textContent=t('auth.resend_code')||'کودی دووبارە ب هنێرە';},30000);
      }).catch(function(e){
        console.warn('[Auth] resend error:',e);
        showMsg(_mapAuthError(e.message),'error');
        resendBtn.disabled=false;resendBtn.textContent=t('auth.resend_code')||'کودی دووبارە ب هنێرە';
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

    var _isNative=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
    // Use 'tafsirkurd://' — this scheme IS registered in Info.plist CFBundleURLSchemes.
    // 'com.tafsirkurd.app://' was NOT registered, so SFSafariViewController couldn't
    // intercept it and Safari showed "address is invalid".
    var redirectUrl=_isNative?'https://tafsirkurd.com/auth/callback':(window.location.origin+'/app/index.html');

    S.supabase.auth.signInWithOAuth({
      provider:'google',
      options:{
        redirectTo:redirectUrl,
        queryParams:{access_type:'offline',prompt:'consent'},
        // On native: skip auto-redirect so we can open the URL in the Capacitor browser.
        // On web: let Supabase handle the redirect directly — no manual navigation needed.
        skipBrowserRedirect:_isNative
      }
    }).then(function(resp){
      if(resp.error){
        console.warn('[Google] OAuth error:',resp.error.message);
        showMsg(_mapAuthError(resp.error.message),'error');
        _googleBusy=false;
        if(btn){btn.disabled=false;btn.style.opacity='';}
        return;
      }
      // On native, Supabase returned the URL without redirecting — open it in the native browser
      if(_isNative&&resp.data&&resp.data.url){
        if(window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser){
          window.Capacitor.Plugins.Browser.open({url:resp.data.url});
        }else{
          window.location.href=resp.data.url;
        }
      }
      // On web, Supabase already redirected the page — nothing to do here
      // Restore button after 3s so user can retry if something went wrong
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

/* ===== PROFILE PAGE ===== */
App.openProfile=function(){
  if(!S.user)return;
  var panel=$('profilePanel');
  clear(panel);
  renderProfile(panel);
  panel.classList.add('on');
};

App.closeProfile=function(){
  var panel=$('profilePanel');
  if(panel)panel.classList.remove('on');
};

function renderProfile(panel){
  var rawProv=S.user.provider||(S.user.avatar&&S.user.avatar.indexOf('google')!==-1?'google':'email');
  var providerLabel=rawProv==='google'?'Google':rawProv==='apple'?'Apple':'Email';
  var isOAuth=(rawProv==='google'||rawProv==='apple');
  var log=getReadLog();var bms=getBookmarks();
  // Field-level message helpers
  function sfm(el,text,type){el.textContent=text;el.className='pp-field-msg '+type;}
  function cfm(el){el.className='pp-field-msg';el.textContent='';}
  var totalRead=calcTotalRead(log);var streak=calcStreak(log);

  // ── Header ────────────────────────────────────
  var hdr=el('div','pp-hdr');
  var backBtn=el('button','hdr-btn');
  backBtn.appendChild(icon('fas fa-arrow-right'));
  on(backBtn,'click',function(){App.closeProfile()});
  hdr.appendChild(backBtn);
  hdr.appendChild(el('div','pp-title',t('profile.title')));
  panel.appendChild(hdr);

  var body=el('div','pp-body');

  // ── Hero section ──────────────────────────────
  var hero=el('div','pp-hero');
  var avatar=el('div','pp-avatar');
  if(S.user.avatar){
    var img=document.createElement('img');
    img.alt='';img.referrerPolicy='no-referrer';img.crossOrigin='anonymous';
    img.onerror=function(){
      // Auth avatar failed — degrade gracefully to initials
      this.style.display='none';
      avatar.textContent=(S.user.name||'?').charAt(0).toUpperCase();
    };
    img.src=S.user.avatar; // src last so error handler is wired first
    avatar.appendChild(img);
  }else{
    // Initials fallback
    avatar.textContent=(S.user.name||'?').charAt(0).toUpperCase();
  }
  hero.appendChild(avatar);
  hero.appendChild(el('div','pp-name-display',S.user.name||''));
  hero.appendChild(el('div','pp-email-display',S.user.email||''));
  var heroSync=el('div','pp-hero-sync');
  var _hsi=_syncStatusInfo();
  if(_hsi){heroSync.style.color=_hsi.col;heroSync.textContent=_hsi.dot+' '+_hsi.txt;}
  else{heroSync.appendChild(icon('fas fa-cloud-upload-alt'));heroSync.appendChild(document.createTextNode(' '+t('profile.synced')));}
  hero.appendChild(heroSync);
  // Stats row
  var statsRow=el('div','pp-stats');
  [[totalRead,t('settings.stats_ayahs'),'fas fa-quran'],
   [streak,t('settings.stats_streak'),'fas fa-fire'],
   [bms.length,t('settings.stats_bookmarks'),'fas fa-bookmark']
  ].forEach(function(s){
    var col=el('div','pp-stat');
    col.appendChild(el('div','pp-stat-num',String(s[0])));
    col.appendChild(el('div','pp-stat-lbl',s[1]));
    statsRow.appendChild(col);
  });
  hero.appendChild(statsRow);
  body.appendChild(hero);

  // Shared message area
  var msg=el('div','pp-msg');msg.id='ppMsg';
  body.appendChild(msg);
  function showPPMsg(text,type){msg.textContent=text;msg.className='pp-msg '+type;msg.scrollIntoView({block:'nearest'})}
  function clearPPMsg(){msg.className='pp-msg';msg.textContent=''}

  // ── Info card ─────────────────────────────────
  var infoSec=el('div','pp-section');
  infoSec.appendChild(el('div','pp-section-title',t('profile.info')));
  var infoCard=el('div','pp-card');
  var provRow=el('div','pp-row');
  provRow.appendChild(el('div','pp-row-label',t('profile.login_method')));
  provRow.appendChild(el('div','pp-row-value',providerLabel));
  infoCard.appendChild(provRow);
  // Member since (async)
  if(S.supabase){
    var sinceRow=el('div','pp-row');
    sinceRow.appendChild(el('div','pp-row-label',t('profile.member_since')));
    var sinceVal=el('div','pp-row-value','…');
    sinceRow.appendChild(sinceVal);
    infoCard.appendChild(sinceRow);
    S.supabase.auth.getUser().then(function(resp){
      if(resp.data&&resp.data.user&&resp.data.user.created_at){
        var d=new Date(resp.data.user.created_at);
        sinceVal.textContent=d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
      }else{sinceRow.remove();}
    });
  }
  infoSec.appendChild(infoCard);
  body.appendChild(infoSec);

  // ── Edit name ─────────────────────────────────
  var nameSec=el('div','pp-section');
  nameSec.appendChild(el('div','pp-section-title',t('profile.change_name')));
  var nameGroup=el('div','pp-edit-group');
  var nameInput=document.createElement('input');
  nameInput.type='text';nameInput.className='pp-edit-input';nameInput.value=S.user.name||'';nameInput.placeholder=t('profile.name_placeholder');
  nameGroup.appendChild(nameInput);
  var nameMsg=el('div','pp-field-msg');nameGroup.appendChild(nameMsg);
  var nameBtn=el('button','pp-save-btn',t('profile.save'));
  on(nameBtn,'click',function(){
    var v=nameInput.value.trim();
    if(!v){sfm(nameMsg,t('profile.name_placeholder'),'error');return}
    nameBtn.disabled=true;cfm(nameMsg);
    S.supabase.auth.updateUser({data:{full_name:v}}).then(function(resp){
      nameBtn.disabled=false;
      if(resp.error){sfm(nameMsg,resp.error.message,'error');return}
      S.user.name=v;
      S.supabase.from('profiles').update({full_name:v,display_name:v}).eq('id',S.user.id).then(function(){});
      var nd=panel.querySelector('.pp-name-display');if(nd)nd.textContent=v;
      sfm(nameMsg,t('profile.name_changed'),'success');
    }).catch(function(e){nameBtn.disabled=false;sfm(nameMsg,e.message||t('error.generic'),'error')});
  });
  nameGroup.appendChild(nameBtn);
  nameSec.appendChild(nameGroup);
  body.appendChild(nameSec);

  // ── Edit email (email-auth users only) ───────
  if(!isOAuth){
    var emailSec=el('div','pp-section');
    emailSec.appendChild(el('div','pp-section-title',t('profile.change_email')));
    var emailGroup=el('div','pp-edit-group');
    var emailInput=document.createElement('input');
    emailInput.type='email';emailInput.className='pp-edit-input';emailInput.value=S.user.email||'';emailInput.placeholder=t('profile.email_placeholder');
    emailGroup.appendChild(emailInput);
    var emailMsg=el('div','pp-field-msg');emailGroup.appendChild(emailMsg);
    var emailBtn=el('button','pp-save-btn',t('profile.change_email'));
    on(emailBtn,'click',function(){
      var v=emailInput.value.trim();
      if(!v){sfm(emailMsg,t('profile.email_placeholder'),'error');return}
      if(v===S.user.email){sfm(emailMsg,t('profile.new_email'),'error');return}
      emailBtn.disabled=true;cfm(emailMsg);
      S.supabase.auth.updateUser({email:v}).then(function(resp){
        emailBtn.disabled=false;
        if(resp.error){sfm(emailMsg,resp.error.message,'error');return}
        sfm(emailMsg,t('profile.email_sent'),'success');
      }).catch(function(e){emailBtn.disabled=false;sfm(emailMsg,e.message||t('error.generic'),'error')});
    });
    emailGroup.appendChild(emailBtn);
    emailSec.appendChild(emailGroup);
    body.appendChild(emailSec);
  }

  // ── Change password (email users only) ────────
  if(!isOAuth){
    var passSec=el('div','pp-section');
    passSec.appendChild(el('div','pp-section-title',t('profile.change_pass')));
    var passGroup=el('div','pp-edit-group');
    var passInput=document.createElement('input');
    passInput.type='password';passInput.className='pp-edit-input';passInput.placeholder=t('profile.new_pass');
    var passConfirm=document.createElement('input');
    passConfirm.type='password';passConfirm.className='pp-edit-input';passConfirm.placeholder=t('profile.confirm_pass');
    passGroup.appendChild(passInput);passGroup.appendChild(passConfirm);
    var passMsg=el('div','pp-field-msg');passGroup.appendChild(passMsg);
    var passBtn=el('button','pp-save-btn',t('profile.change_pass_btn'));
    on(passBtn,'click',function(){
      var p1=passInput.value,p2=passConfirm.value;
      if(!p1||p1.length<6){sfm(passMsg,t('profile.pass_min'),'error');return}
      if(p1!==p2){sfm(passMsg,t('profile.pass_mismatch'),'error');return}
      passBtn.disabled=true;cfm(passMsg);
      S.supabase.auth.updateUser({password:p1}).then(function(resp){
        passBtn.disabled=false;
        if(resp.error){sfm(passMsg,resp.error.message,'error');return}
        passInput.value='';passConfirm.value='';
        sfm(passMsg,t('profile.pass_changed'),'success');
      }).catch(function(e){passBtn.disabled=false;sfm(passMsg,e.message||t('error.generic'),'error')});
    });
    passGroup.appendChild(passBtn);
    passSec.appendChild(passGroup);
    body.appendChild(passSec);
  }

  // ── Your Devices ──────────────────────────────
  var devSec=el('div','pp-section');
  // Title row with refresh button
  var devTitleRow=el('div','pp-section-title-row');
  devTitleRow.appendChild(el('span',null,t('profile.devices_title')));
  var devRefreshBtn=el('button','pp-devices-refresh');
  devRefreshBtn.title=t('profile.devices_refresh')||'نوێکردنەوە';
  devRefreshBtn.appendChild(icon('fas fa-rotate-right'));
  devTitleRow.appendChild(devRefreshBtn);
  devSec.appendChild(devTitleRow);
  var devList=el('div','pp-devices-list');
  devSec.appendChild(devList);
  // "Log out all others" button lives below devList; keep a ref so loadDevices can update it
  var _devAllOutHolder=el('div',null);
  devSec.appendChild(_devAllOutHolder);
  // Note: devices only appear after they open this version of the app
  var devNote=el('div','pp-devices-note');
  devNote.appendChild(icon('fas fa-circle-info'));
  devNote.appendChild(document.createTextNode(' '+(t('profile.devices_note')||'ئامێرەکان دەکەونە لیستەکە کاتێک نوێترین وەشانی ئەپ کردنەوە')));
  devSec.appendChild(devNote);
  body.appendChild(devSec);

  var STALE_MS=14*24*60*60*1000; // 14 days
  var ONLINE_MS=10*60*1000;       // 10 min = "active now"

  function _loadDevices(){
    clear(devList);
    var devLoading=el('div','pp-devices-loading');
    devLoading.appendChild(icon('fas fa-circle-notch fa-spin'));
    devLoading.appendChild(document.createTextNode(' '+t('profile.devices_loading')));
    devList.appendChild(devLoading);
    devRefreshBtn.disabled=true;

    S.supabase.from('user_sessions')
      .select('id,device_id,platform,device_label,last_active_at,created_at')
      .eq('user_id',S.user.id)
      .order('last_active_at',{ascending:false})
      .then(function(resp){
        devRefreshBtn.disabled=false;
        clear(devList);
        clear(_devAllOutHolder);
        if(resp.error||!resp.data||!resp.data.length){
          devList.appendChild(el('div','pp-devices-empty',t('profile.devices_none')));
          return;
        }
        var myId=_getDeviceId();
        resp.data.forEach(function(sess){
          var isThis=sess.device_id===myId;
          var lastActive=new Date(sess.last_active_at);
          var age=Date.now()-lastActive.getTime();
          var isOnline=age<ONLINE_MS;
          var isStale=!isThis&&age>STALE_MS;
          var rowCls='pp-device-row'+(isThis?' pp-device-row--current':'')+(isStale?' pp-device-row--stale':'');
          var row=el('div',rowCls);
          var dLeft=el('div','pp-device-left');
          var dIco=el('div','pp-device-icon');
          dIco.appendChild(icon(
            sess.platform==='android'?'fas fa-mobile-screen-button':
            sess.platform==='ios'?'fab fa-apple':'fas fa-desktop'));
          dLeft.appendChild(dIco);
          var dInfo=el('div','pp-device-info');
          var dName=el('div','pp-device-name',sess.device_label||sess.platform||'Web');
          if(isThis){dName.appendChild(el('span','pp-device-badge',t('profile.this_device')));}
          else if(isOnline){dName.appendChild(el('span','pp-device-badge pp-device-badge--online',t('profile.device_online')||'چالاک'));}
          dInfo.appendChild(dName);
          // Time row: relative + absolute date for older entries
          var timeEl=el('div','pp-device-time');
          if(isThis){
            timeEl.textContent=t('profile.time_now')||'ئێستا';
          }else if(isOnline){
            var dot=el('span','pp-device-online-dot');
            timeEl.appendChild(dot);
            timeEl.appendChild(document.createTextNode(t('profile.device_active_now')||'ئێستا چالاکە'));
          }else{
            var rel=_timeAgo(lastActive);
            var abs=lastActive.toLocaleDateString()+' '+lastActive.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
            if(isStale){
              timeEl.textContent=rel+' — '+(t('profile.device_stale')||'(inactive)');
            }else{
              timeEl.textContent=rel+' · '+abs;
            }
          }
          dInfo.appendChild(timeEl);
          dLeft.appendChild(dInfo);
          row.appendChild(dLeft);
          if(!isThis){
            var rmBtn=el('button','pp-device-remove');
            rmBtn.title=t('profile.device_remove')||'دەرکردن';
            rmBtn.appendChild(icon('fas fa-right-from-bracket'));
            (function(sid,rowEl,btn){
              var confirmed=false,timer=null;
              function reset(){
                confirmed=false;clearTimeout(timer);
                btn.className='pp-device-remove';
                clear(btn);btn.appendChild(icon('fas fa-right-from-bracket'));
              }
              on(btn,'click',function(){
                if(!confirmed){
                  confirmed=true;
                  btn.className='pp-device-remove pp-device-remove--confirm';
                  clear(btn);btn.appendChild(icon('fas fa-check'));
                  timer=setTimeout(reset,3000);
                }else{
                  clearTimeout(timer);btn.disabled=true;
                  S.supabase.from('user_sessions').delete()
                    .eq('id',sid).eq('user_id',S.user.id)
                    .then(function(r){
                      if(r.error){btn.disabled=false;reset();return;}
                      rowEl.classList.add('pp-device-row--gone');
                      setTimeout(function(){if(rowEl.parentNode)rowEl.parentNode.removeChild(rowEl);},280);
                    });
                }
              });
            })(sess.id,row,rmBtn);
            row.appendChild(rmBtn);
          }
          devList.appendChild(row);
        });
        var otherCount=resp.data.filter(function(s){return s.device_id!==myId;}).length;
        if(otherCount>0){
          var allOutBtn=el('button','pp-device-all-out');
          allOutBtn.appendChild(icon('fas fa-circle-xmark'));
          allOutBtn.appendChild(document.createTextNode(' '+t('profile.logout_all_others')));
          (function(btn){
            var confirmed=false,timer=null;
            function reset(){
              confirmed=false;clearTimeout(timer);
              btn.className='pp-device-all-out';
              clear(btn);
              btn.appendChild(icon('fas fa-circle-xmark'));
              btn.appendChild(document.createTextNode(' '+t('profile.logout_all_others')));
            }
            on(btn,'click',function(){
              if(!confirmed){
                confirmed=true;
                btn.className='pp-device-all-out pp-device-all-out--confirm';
                clear(btn);
                btn.appendChild(icon('fas fa-check'));
                btn.appendChild(document.createTextNode(' '+t('profile.logout_all_confirm')));
                timer=setTimeout(reset,3000);
              }else{
                clearTimeout(timer);btn.disabled=true;
                S.supabase.from('user_sessions').delete()
                  .eq('user_id',S.user.id).neq('device_id',myId)
                  .then(function(r){
                    if(r.error){btn.disabled=false;reset();return;}
                    Array.from(devList.querySelectorAll('.pp-device-row:not(.pp-device-row--current)')).forEach(function(rw){
                      if(rw.parentNode)rw.parentNode.removeChild(rw);
                    });
                    btn.style.display='none';
                    toast(t('profile.logout_all_done'));
                  });
              }
            });
          })(allOutBtn);
          _devAllOutHolder.appendChild(allOutBtn);
        }
      }).catch(function(){
        devRefreshBtn.disabled=false;
        clear(devList);
        devList.appendChild(el('div','pp-devices-empty',t('profile.devices_error')));
      });
  }

  on(devRefreshBtn,'click',_loadDevices);
  _loadDevices();

  // ── Actions ───────────────────────────────────
  var actSec=el('div','pp-section');
  actSec.appendChild(el('div','pp-section-title',t('profile.actions')));
  var actWrap=el('div','pp-actions');

  var syncBtn=el('button','pp-action-btn');
  syncBtn.appendChild(icon('fas fa-sync'));
  syncBtn.appendChild(document.createTextNode(' '+t('profile.sync')));
  on(syncBtn,'click',function(){App.forceSync()});
  actWrap.appendChild(syncBtn);

  var logoutBtn=el('button','pp-action-btn pp-logout');
  logoutBtn.appendChild(icon('fas fa-sign-out-alt'));
  logoutBtn.appendChild(document.createTextNode(' '+t('profile.logout')));
  on(logoutBtn,'click',function(){App.logout();});
  actWrap.appendChild(logoutBtn);

  // Separator before destructive action
  actWrap.appendChild(el('div','pp-actions-sep'));

  // ── Delete account — custom inline confirm (iOS WKWebView blocks confirm()) ──
  var deleteWrap=el('div','pp-delete-wrap');

  var deleteBtn=el('button','pp-action-btn pp-delete');
  deleteBtn.addEventListener('click',function(){
    console.log('[deleteAccount] button clicked — showing confirm step 1');
    deleteBtn.style.display='none';
    confirmStep1.style.display='';
  });
  deleteBtn.appendChild(icon('fas fa-trash-alt'));
  deleteBtn.appendChild(document.createTextNode(' '+t('profile.delete_account')));

  // Step 1 — first confirmation
  var confirmStep1=el('div','pp-delete-confirm');
  confirmStep1.style.display='none';
  var step1Txt=el('p','pp-delete-confirm-txt',t('profile.confirm_delete1'));
  var step1Yes=el('button','pp-delete-confirm-yes',t('profile.confirm_delete1_yes')||t('profile.confirm_delete_yes')||'بەلێ، بەردەوام بە');
  var step1No =el('button','pp-delete-confirm-no', t('profile.confirm_no')||'نەخێر');
  step1Yes.addEventListener('click',function(){
    console.log('[deleteAccount] step 1 confirmed — showing step 2');
    confirmStep1.style.display='none';
    confirmStep2.style.display='';
  });
  step1No.addEventListener('click',function(){
    console.log('[deleteAccount] step 1 cancelled');
    confirmStep1.style.display='none';
    deleteBtn.style.display='';
  });
  confirmStep1.appendChild(step1Txt);
  confirmStep1.appendChild(step1Yes);
  confirmStep1.appendChild(step1No);

  // Step 2 — final confirmation before irreversible action
  var confirmStep2=el('div','pp-delete-confirm');
  confirmStep2.style.display='none';
  var step2Txt=el('p','pp-delete-confirm-txt',t('profile.confirm_delete2'));
  var step2Yes=el('button','pp-delete-confirm-yes pp-delete-confirm-final',t('profile.confirm_delete_yes')||'سڕینەوەی ئەکاونت');
  var step2No =el('button','pp-delete-confirm-no', t('profile.confirm_no')||'نەخێر');
  step2No.addEventListener('click',function(){
    console.log('[deleteAccount] step 2 cancelled');
    confirmStep2.style.display='none';
    deleteBtn.style.display='';
  });
  step2Yes.addEventListener('click',function(){
    console.log('[deleteAccount] step 2 confirmed — sending delete request');
    confirmStep2.style.display='none';
    step2Yes.disabled=true;
    msg.className='pp-msg';
    msg.textContent=t('profile.deleting')||'...';

    S.supabase.auth.getSession().then(function(resp){
      var accessToken=resp&&resp.data&&resp.data.session&&resp.data.session.access_token;
      if(!accessToken){
        console.error('[deleteAccount] no access token');
        deleteBtn.style.display='';
        msg.textContent=t('error.generic');msg.className='pp-msg error';
        return;
      }
      console.log('[deleteAccount] sending request to Edge Function');
      return fetch('https://db.tafsirkurd.com/functions/v1/delete-account',{
        method:'POST',
        headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'}
      }).then(function(r){
        console.log('[deleteAccount] response received, status:',r.status);
        if(!r.ok)return r.json().then(function(d){throw new Error(d.error||('HTTP '+r.status));});
        return r.json();
      }).then(function(result){
        if(!result.success)throw new Error(result.error||t('error.generic'));
        return S.supabase.auth.signOut().catch(function(){});
      }).then(function(){
        console.log('[deleteAccount] success — closing profile');
        S.user=null;stopCloudSync();App.closeProfile();
        toast(t('toast.account_deleted'));renderSettings();
      });
    }).catch(function(e){
      console.error('[deleteAccount] error:',e);
      deleteBtn.style.display='';
      msg.textContent=e.message||t('error.generic');msg.className='pp-msg error';
    });
  });
  confirmStep2.appendChild(step2Txt);
  confirmStep2.appendChild(step2Yes);
  confirmStep2.appendChild(step2No);

  deleteWrap.appendChild(deleteBtn);
  deleteWrap.appendChild(confirmStep1);
  deleteWrap.appendChild(confirmStep2);
  actWrap.appendChild(deleteWrap);
  actSec.appendChild(actWrap);
  body.appendChild(actSec);

  panel.appendChild(body);
}

/* ===== PULL TO REFRESH ===== */
// Shared spinner DOM element — only one can be on screen at a time.
var ptrSpinner;
var _ptrArc=null;
var _ptrGlobalRefreshing=false;

var _ptrResets=[];
document.addEventListener('visibilitychange',function(){
  if(!document.hidden)return;
  _ptrGlobalRefreshing=false;
  _ptrResets.forEach(function(fn){try{fn();}catch(e){}});
});

function ensurePtrSpinner(){
  if(ptrSpinner)return;
  ptrSpinner=el('div','ptr-spinner');
  _ptrArc=el('div','ptr-arc');
  ptrSpinner.appendChild(_ptrArc);
  document.body.appendChild(ptrSpinner);
}

// ── Horizontal container detection ───────────────────────────────────────────
// Runs only on touchstart — not in the move hot-path.
// perf-critical mode: skip getComputedStyle, class-name only.
function _ptrInHorizScroll(node){
  var skipCS=document.documentElement.classList.contains('perf-critical');
  var limit=0;
  while(node&&node!==document.body&&limit++<15){
    var cn=(typeof node.className==='string')?node.className:'';
    if(cn.indexOf('iv-hero')>=0||cn.indexOf('heatmap-scroll')>=0||
       cn.indexOf('qs-reciter-list')>=0||cn.indexOf('as2-city-scroll')>=0||
       cn.indexOf('as2-reciter-scroll')>=0||cn.indexOf('dua-tabs')>=0||
       cn.indexOf('book-cat-row')>=0||cn.indexOf('mushaf-view')>=0||
       cn.indexOf('perf-chips-row')>=0||cn.indexOf('theme-grid')>=0||
       cn.indexOf('sync-chips')>=0)return true;
    if(!skipCS){
      try{
        var ox=window.getComputedStyle(node).overflowX;
        if((ox==='auto'||ox==='scroll')&&node.scrollWidth>node.clientWidth+8)return true;
      }catch(e){}
    }
    node=node.parentElement;
  }
  return false;
}

// ── Active overlay / sheet detection — touchstart only ───────────────────────
function _ptrAnyOverlayOpen(){
  if(document.querySelector('.fu-overlay.on'))return true;
  if(document.querySelector('.dl-overlay.on'))return true;
  if(document.querySelector('.sidebar-overlay.on'))return true;
  var _gc=document.querySelector('.goal-confirm-overlay');
  if(_gc&&_gc.style.display!=='none'&&parseFloat(_gc.style.opacity||'0')>0)return true;
  var _ro=document.querySelector('.rating-overlay');
  if(_ro&&_ro.style.display!=='none'&&parseFloat(_ro.style.opacity||'0')>0)return true;
  var _qs=document.getElementById('quickSettings');
  if(_qs&&parseFloat(_qs.style.opacity||'0')>0&&_qs.style.pointerEvents!=='none')return true;
  return false;
}

// ── setupPullToRefresh ────────────────────────────────────────────────────────
// Design goals:
//   touchstart  — validate gates, cache everything, zero work in move path
//   touchmove   — calculate delta only, schedule rAF; no DOM reads, no layout
//   rAF         — apply transform + opacity only; single pending rAF at a time
//   touchend    — commit or snap; refresh runs async after animation settles
function setupPullToRefresh(panelId,refreshFn,checkFn){
  var panel=$(panelId);
  if(!panel)return;
  ensurePtrSpinner();

  // ── Tuning ─────────────────────────────────────────────────────────────────
  // DEAD_ZONE is minimal — just filters sensor jitter, not a UX pause.
  // Resistance (0.45) makes the panel feel light and native from the first pixel.
  // THRESHOLD is in visual px (after resistance), not raw finger travel.
  var DEAD_ZONE    = 8;     // px raw — jitter filter only
  var THRESHOLD    = 80;    // px visual to arm trigger (raw ≈ 185px at 0.45 resistance)
  var MAX_PULL     = 108;   // px visual ceiling
  var RESISTANCE   = 0.45;  // panel visual travel / raw finger travel
  var DIR_CHECK_PX = 6;     // Manhattan px before direction locks (no sqrt needed)
  var LOCK_BASE    = 700;
  var COOLDOWN_MS  = 2500;
  var RECENT_MS    = 30000;

  // ── Per-panel state ─────────────────────────────────────────────────────────
  var startY=0,startX=0;
  var armed=false,pulling=false,refreshing=false,_snapDone=false;
  var _ticked=false,_dirDecided=false;
  var _momentumLock=false,_momentumTimer=null;
  var _lastRefreshTime=0;
  // _spinnerY: fixed viewport Y for spinner, captured once on touchstart.
  // Constant during the gesture — no recalculation per frame.
  var _spinnerY=-60;
  // _panelScrolled: updated by scroll listener — avoids scrollTop DOM read in touchmove.
  var _panelScrolled=false;
  var _latestDy=0,_rafPending=false;
  var _vBuf=[],_VN=5;

  // ── Debug metrics (gated: window._ptrDebugMode = true to enable) ────────────
  var _dbg={moves:0,rafs:0,prevs:0,t0:0,dtSum:0,dtN:0,lastT:0};

  // ── Scroll tracker — replaces scrollTop read in touchmove ──────────────────
  // passive: true — never blocks scroll pipeline
  panel.addEventListener('scroll',function(){
    _panelScrolled=panel.scrollTop>2;
  },{passive:true});

  // ── Rubber band — resistance from pixel zero, steeper above threshold ───────
  // Below threshold: linear at RESISTANCE factor (light, native feel)
  // Above threshold: extra resistance so pull "stalls" near MAX_PULL
  function _rubberBand(raw){
    var v=raw*RESISTANCE;
    if(v<=THRESHOLD)return v;
    return Math.min(THRESHOLD+(v-THRESHOLD)*0.28,MAX_PULL);
  }

  function _endVelocity(){
    if(_vBuf.length<2)return 0;
    var a=_vBuf[0],b=_vBuf[_vBuf.length-1],dt=b.t-a.t;
    return dt>10?(b.y-a.y)/dt:0;
  }

  function _setMomentumLock(){
    var v=_endVelocity();
    var ms=v<-1.5?1400:v<-0.7?950:LOCK_BASE;
    _momentumLock=true;
    clearTimeout(_momentumTimer);
    _momentumTimer=setTimeout(function(){_momentumLock=false;},ms);
    _vBuf=[];
  }

  function _clearWillChange(){
    panel.style.willChange='';
    if(ptrSpinner)ptrSpinner.style.willChange='';
  }

  // Hard reset — visibilitychange / tab-switch / interrupted gesture
  function _forceReset(){
    if(ptrSpinner){
      ptrSpinner.style.transition='none';
      ptrSpinner.style.transform='translate(-50%,'+_spinnerY+'px) scale(0)';
      ptrSpinner.style.opacity='0';
      ptrSpinner.classList.remove('refreshing','ptr-snapping');
    }
    panel.style.transform='';
    _clearWillChange();
    panel.classList.remove('ptr-pulling','ptr-releasing');
    if(refreshing)_ptrGlobalRefreshing=false;
    armed=false;pulling=false;refreshing=false;_snapDone=true;
    _ticked=false;_dirDecided=false;_rafPending=false;_vBuf=[];
  }
  _ptrResets.push(_forceReset);

  // Smooth cancel — two-phase: remove ptr-pulling this frame, add transition in next rAF
  // so the browser captures the current translateY as the animation "from" value.
  function _cancelPull(){
    _rafPending=false;
    if(pulling){
      pulling=false;
      panel.classList.remove('ptr-pulling');
      requestAnimationFrame(function(){
        if(refreshing)return;
        _clearWillChange();
        panel.classList.add('ptr-releasing');
        panel.style.transform='';
        ptrSpinner.style.transition='transform .22s cubic-bezier(0,0,.2,1),opacity .18s';
        ptrSpinner.style.opacity='0';
        ptrSpinner.style.transform='translate(-50%,'+_spinnerY+'px) scale(0)';
        setTimeout(function(){
          panel.classList.remove('ptr-releasing');
          ptrSpinner.style.transition='';
        },240);
      });
    }
    armed=false;_ticked=false;_dirDecided=false;
  }

  // ── rAF visual update — ALL style writes live here ─────────────────────────
  // Called at most once per display frame. No DOM reads. Only transform + opacity.
  function _updateVisuals(){
    _rafPending=false;
    if(!pulling)return;
    if(window._ptrDebugMode)_dbg.rafs++;
    var pullRaw=_latestDy-DEAD_ZONE;
    if(pullRaw<0)return;
    var pull=_rubberBand(pullRaw);
    panel.style.transform='translateY('+pull+'px)';
    // Spinner: fixed position captured on touchstart — no recalculation per frame.
    // Opacity and scale grow independently for a smooth emerge effect.
    ptrSpinner.style.opacity=String(Math.min(pullRaw/50,1));
    ptrSpinner.style.transform='translate(-50%,'+_spinnerY+'px) scale('+Math.min(pullRaw/55,1)+')';
    // Arc rotates up to 360° at threshold — one full turn signals "ready to release"
    if(_ptrArc)_ptrArc.style.transform='rotate('+Math.min(pullRaw*2.0,360)+'deg)';
    if(!_ticked&&pull>=THRESHOLD){_ticked=true;H.selection();}
  }

  // ── touchstart ────────────────────────────────────────────────────────────
  // All expensive work (DOM queries, getBoundingClientRect) happens here only.
  // Nothing computed here is repeated in touchmove.
  on(panel,'touchstart',function(e){
    _vBuf=[];
    if(refreshing||_momentumLock||_ptrGlobalRefreshing)return;
    if(checkFn&&!checkFn())return;
    if(document.body.classList.contains('tk-tab-switching'))return;
    var ae=document.activeElement;
    if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable))return;
    if(panel.querySelector('.search-results.on')||panel.querySelector('.search-bar-wrap.open'))return;
    if(_ptrAnyOverlayOpen())return;
    if(e.target&&_ptrInHorizScroll(e.target))return;
    if(Date.now()-_lastRefreshTime<COOLDOWN_MS)return;
    if(panel.scrollTop>2)return; // only synchronous scrollTop read — on touchstart, not touchmove

    startY=e.touches[0].clientY;
    startX=e.touches[0].clientX;
    _panelScrolled=false; // scroll listener will flip this if panel scrolls mid-gesture
    // Spinner Y: fixed position just inside the gap that opens above the panel.
    // Captured once — no per-frame getBoundingClientRect.
    _spinnerY=Math.max((panel.getBoundingClientRect().top||0)+18,46);
    armed=true;_dirDecided=false;pulling=false;_snapDone=false;
    if(window._ptrDebugMode){_dbg.moves=0;_dbg.rafs=0;_dbg.prevs=0;_dbg.t0=Date.now();_dbg.dtSum=0;_dbg.dtN=0;_dbg.lastT=Date.now();}
  },{passive:true});

  // ── touchmove ─────────────────────────────────────────────────────────────
  // Hot path — must do almost no work:
  //   1. push velocity sample
  //   2. compute dy/dx (arithmetic only)
  //   3. direction lock once — no sqrt, Manhattan distance
  //   4. store dy, schedule one rAF
  // NO DOM reads (scrollTop replaced by _panelScrolled cache).
  // NO class or style writes (deferred to rAF and the pulling-start block).
  panel.addEventListener('touchmove',function(e){
    var _now=Date.now();
    _vBuf.push({y:e.touches[0].clientY,t:_now});
    if(_vBuf.length>_VN)_vBuf.shift();

    if(!armed||refreshing)return;

    if(window._ptrDebugMode){
      var _dt=_now-_dbg.lastT;_dbg.lastT=_now;
      _dbg.dtSum+=_dt;_dbg.dtN++;_dbg.moves++;
    }

    var dy=e.touches[0].clientY-startY;
    var dx=e.touches[0].clientX-startX;

    if(dy<=0){_cancelPull();return;}
    // Use cached flag — avoids forced synchronous layout from scrollTop read
    if(_panelScrolled){_cancelPull();return;}

    // Direction lock: Manhattan distance, no sqrt.
    // Cancel if |dx| > 55% of dy — gesture has significant horizontal component.
    if(!_dirDecided){
      var absDx=dx<0?-dx:dx;
      if(absDx+dy>=DIR_CHECK_PX){
        _dirDecided=true;
        if(absDx>dy*0.55){_cancelPull();return;}
      }
    }

    if(dy<DEAD_ZONE)return;

    // First frame past dead zone: promote layers, arm visuals, subtle haptic.
    // Only class + willChange writes here — actual style deferred to rAF.
    if(!pulling){
      pulling=true;
      panel.style.willChange='transform';
      ptrSpinner.style.willChange='transform,opacity';
      panel.classList.add('ptr-pulling');
      panel.classList.remove('ptr-releasing');
      ptrSpinner.classList.remove('ptr-snapping');
      ptrSpinner.style.transition='none';
      haptic([4]);
    }

    // preventDefault must be synchronous — cannot defer to rAF
    if(e.cancelable){
      e.preventDefault();
      if(window._ptrDebugMode)_dbg.prevs++;
    }

    _latestDy=dy;
    if(!_rafPending){_rafPending=true;requestAnimationFrame(_updateVisuals);}
  },{passive:false});

  // ── touchend ──────────────────────────────────────────────────────────────
  function _doTouchEnd(){
    _setMomentumLock();
    _ticked=false;_dirDecided=false;_rafPending=false;
    if(!pulling||refreshing){armed=false;return;}

    pulling=false;armed=false;
    panel.classList.remove('ptr-pulling');
    panel.classList.add('ptr-releasing');
    ptrSpinner.style.transition='transform .24s cubic-bezier(0,0,.2,1),opacity .2s';
    ptrSpinner.classList.add('ptr-snapping');

    var currentY=parseFloat((panel.style.transform.match(/translateY\(([^p]+)px\)/)||[,'0'])[1])||0;

    if(window._ptrDebugMode){
      var _elapsed=Date.now()-_dbg.t0;
      var _avgMs=_dbg.dtN>0?(_dbg.dtSum/_dbg.dtN).toFixed(1):'?';
      console.log('[PTR] moves='+_dbg.moves+' rafs='+_dbg.rafs+' prevs='+_dbg.prevs
        +' avg-interval='+_avgMs+'ms total='+_elapsed+'ms currentY='+currentY.toFixed(1)+'px');
      window._ptrLastDebug={moves:_dbg.moves,rafs:_dbg.rafs,prevs:_dbg.prevs,avgIntervalMs:+_avgMs,totalMs:_elapsed,currentY:currentY};
    }

    if(currentY>=THRESHOLD*0.75){
      // ── TRIGGERED ─────────────────────────────────────────────────────────
      refreshing=true;
      _ptrGlobalRefreshing=true;
      var _prevRefreshTime=_lastRefreshTime;
      _lastRefreshTime=Date.now();

      // Settle panel and spinner into held loading position
      var holdY=44;
      panel.style.transform='translateY('+holdY+'px)';
      ptrSpinner.style.transform='translate(-50%,'+_spinnerY+'px) scale(1)';
      ptrSpinner.style.opacity='1';
      ptrSpinner.classList.add('refreshing');
      haptic([30]);

      function _snapBack(){
        if(_snapDone)return;
        _snapDone=true;
        _clearWillChange();
        panel.style.transform='';
        ptrSpinner.style.transition='transform .24s cubic-bezier(0,0,.2,1),opacity .2s';
        ptrSpinner.style.transform='translate(-50%,'+_spinnerY+'px) scale(0)';
        ptrSpinner.style.opacity='0';
        ptrSpinner.classList.remove('refreshing');
        setTimeout(function(){
          panel.classList.remove('ptr-releasing');
          ptrSpinner.classList.remove('ptr-snapping');
          ptrSpinner.style.transition='';
          refreshing=false;
          _ptrGlobalRefreshing=false;
        },260);
      }
      _snapDone=false;
      var _minT=setTimeout(_snapBack,600);
      setTimeout(function(){clearTimeout(_minT);_snapBack();},2500);

      var _isRecent=_prevRefreshTime>0&&(Date.now()-_prevRefreshTime)<RECENT_MS;
      try{refreshFn(_isRecent);}catch(e){console.warn('[PTR] refreshFn error:',e);}

    }else{
      // ── BELOW THRESHOLD — snap back silently ──────────────────────────────
      _clearWillChange();
      panel.style.transform='';
      ptrSpinner.style.transform='translate(-50%,'+_spinnerY+'px) scale(0)';
      ptrSpinner.style.opacity='0';
      setTimeout(function(){
        panel.classList.remove('ptr-releasing');
        ptrSpinner.classList.remove('ptr-snapping');
        ptrSpinner.style.transition='';
      },260);
    }
  }

  on(panel,'touchend',_doTouchEnd);
  on(panel,'touchcancel',function(){_setMomentumLock();_cancelPull();});
}

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
      S.ivSupabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{storageKey:'sb-tafsirkurd-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
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
  var titleText=isOffline?(tSafe('iv.error.offline_title')||'ئینتەرنێت نینە'):(isTimeout?(tSafe('iv.error.timeout_title')||'وەخت تەواو بوو'):(tSafe('iv.error.title')||'کێشەیەک هەیە'));
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
  // On slow networks skip thumbnail preloading — let them load on-demand when the panel opens
  if(_sn.skip()){return;}
  sorted.slice(0,6).forEach(function(series){
    if(!series.thumbnail_url)return;
    var src=series.thumbnail_url.replace('maxresdefault.jpg','mqdefault.jpg');
    var img=new Image();
    img.onerror=function(){
      var idx=_preloadedIvImages.indexOf(img);
      if(idx!==-1)_preloadedIvImages.splice(idx,1);
    };
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
  if(force)_ivGridHash=null; // force pull-to-refresh always rebuilds grid
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
var _ivGridHash=null; // last-rendered content hash — skip rebuild when data unchanged
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
  var grid=$('ivGrid');
  grid.style.display='';

  // Content hash: series IDs + counts + active filters.
  // If identical to last render AND grid has content, skip full rebuild — prevents
  // the double-render flash when cached data is shown then fresh (identical) data arrives.
  var _h=(S.ivSeries||[]).map(function(s){
    return s.id+':'+((_ivEpsBySeriesId&&_ivEpsBySeriesId[s.id])||[]).length;
  }).join('|')+'|'+(S.ivSearchQuery||'')+'|'+(S.ivSpeakerFilter||'');
  if(_h===_ivGridHash&&grid.children.length>0){
    renderIvHero();
    return;
  }
  _ivGridHash=_h;
  renderIvHero();

  var frag=document.createDocumentFragment();

  if(!S.ivSeries||!S.ivSeries.length){
    var empty=el('div','iv-empty');
    empty.appendChild(icon('fas fa-video'));
    empty.appendChild(el('p','',t('iv.no_series')));
    var refreshBtn=el('button','iv-refresh');
    refreshBtn.appendChild(icon('fas fa-sync-alt'));
    refreshBtn.appendChild(document.createTextNode(' '+t('iv.refresh')));
    on(refreshBtn,'click',function(){loadIslamVoiceData(true)});
    empty.appendChild(refreshBtn);
    frag.appendChild(empty);
    clear(grid); grid.appendChild(frag);
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
    frag.appendChild(card);
    _ivCardIdx++;
  });

  // No results for search
  if(q&&!frag.children.length){
    var noRes=el('div','iv-empty');
    noRes.appendChild(icon('fas fa-search'));
    noRes.appendChild(el('p','',t('iv.no_results')+' "'+q+'"'));
    frag.appendChild(noRes);
  }

  // Atomic replace — old grid stays visible until all new cards are ready
  clear(grid); grid.appendChild(frag);
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
  var frag=document.createDocumentFragment();

  if(!S.ivEpisodes){clear(list);return;}

  var eps=S.ivEpisodes.filter(function(ep){return ep.series_id===seriesId});
  eps.sort(function(a,b){return(a.episode_number||0)-(b.episode_number||0)});

  if(!eps.length){
    var empty=el('div','iv-empty');
    empty.appendChild(icon('fas fa-film'));
    empty.appendChild(el('p','',t('iv.no_episodes')));
    frag.appendChild(empty);
    clear(list); list.appendChild(frag);
    return;
  }

  var progress={};
  try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e){}

  eps.forEach(function(ep,idx){
    var item=el('div','iv-ep-item');
    item.setAttribute('data-ep-id',ep.id);

    // Thumbnail — fade in after decode to avoid image pop
    var thumb=el('div','iv-ep-thumb');
    var thumbUrl=ep.thumbnail_url;
    if(!thumbUrl&&ep.video_url&&ep.video_type!=='s3'){
      thumbUrl='https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg';
    }
    if(thumbUrl){
      var tImg=document.createElement('img');
      tImg.alt='';
      tImg.loading=idx<3?'eager':'lazy'; // first 3 eager, rest lazy
      tImg.style.cssText='width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .2s';
      tImg.onload=function(){this.style.opacity='1';};
      tImg.onerror=function(){AndroidLog.img(this.src);this.style.display='none';};
      tImg.src=thumbUrl; // set src last so attributes are ready before decode starts
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
    frag.appendChild(item);
  });
  clear(list); list.appendChild(frag); // atomic replace — old list stays until all cards built
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
  var frag=document.createDocumentFragment();
  var saved=ivGetSaved();
  if(!saved.length){
    var emp=el('div','iv-overlay-empty');
    var eico=el('div','iv-overlay-empty-icon');eico.appendChild(icon('fas fa-bookmark'));emp.appendChild(eico);
    emp.appendChild(el('div','iv-overlay-empty-title',t('iv.no_saved_episodes')));
    emp.appendChild(el('div','iv-overlay-empty-sub',t('iv.bookmark_to_save')));
    frag.appendChild(emp);
  }else{
    saved.forEach(function(ep,idx){
      var item=el('div','iv-overlay-ep');
      var thumb=el('div','iv-overlay-ep-thumb');
      var thumbUrl=ep.thumbnail_url||(ep.video_url&&ep.video_type!=='s3'?'https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg':null);
      if(thumbUrl){
        var img=document.createElement('img');
        img.alt='';img.loading=idx<4?'eager':'lazy';
        img.style.cssText='width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .2s';
        img.onload=function(){this.style.opacity='1';};
        img.onerror=function(){this.style.display='none';};
        img.src=thumbUrl;
        thumb.appendChild(img);
      }
      item.appendChild(thumb);
      var info=el('div','iv-overlay-ep-info');
      if(ep.series_title)info.appendChild(el('div','iv-overlay-ep-series',ep.series_title));
      info.appendChild(el('div','iv-overlay-ep-title',ep.title||('ئەپیسۆد '+(ep.episode_number||''))));
      item.appendChild(info);
      var del=el('button','iv-overlay-ep-del');del.appendChild(icon('fas fa-xmark'));
      on(del,'click',function(e){e.stopPropagation();ivToggleSave(ep.id,ep);haptic([8]);ivRenderSavedList();
        document.querySelectorAll('.iv-ep-save').forEach(function(b){var row=b.closest('[data-ep-id]');if(row&&row.dataset.epId==ep.id)b.classList.toggle('saved',ivIsSaved(ep.id))});
      });
      item.appendChild(del);
      on(item,'click',function(){overlay.classList.remove('open');App.ivShowSeries(ep.series_id);App.ivPlay(ep.id)});
      frag.appendChild(item);
    });
  }
  clear(list); list.appendChild(frag);
}
App.ivShowSaved=function(){$('ivSavedOverlay').classList.add('open');ivRenderSavedList();haptic([8])};
App.ivCloseSaved=function(){$('ivSavedOverlay').classList.remove('open')};

function ivRenderHistoryList(){
  var overlay=$('ivHistoryOverlay');
  var list=$('ivHistoryList');
  var frag=document.createDocumentFragment();
  var progress={};try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e){}
  var keys=Object.keys(progress).filter(function(k){return progress[k]&&progress[k].percent>0});
  keys.sort(function(a,b){return(progress[b].ts||0)-(progress[a].ts||0)});
  if(!keys.length){
    var emp2=el('div','iv-overlay-empty');
    var eico2=el('div','iv-overlay-empty-icon');eico2.appendChild(icon('fas fa-clock-rotate-left'));emp2.appendChild(eico2);
    emp2.appendChild(el('div','iv-overlay-empty-title',t('iv.no_history')));
    emp2.appendChild(el('div','iv-overlay-empty-sub',t('iv.history_hint')));
    frag.appendChild(emp2);
  }else{
    keys.forEach(function(epId,idx){
      var wp=progress[epId];
      var ep=S.ivEpisodes?S.ivEpisodes.find(function(e){return String(e.id)===String(epId)}):null;
      if(!ep)return;
      var series=S.ivSeries?S.ivSeries.find(function(s){return s.id===ep.series_id}):null;
      var item=el('div','iv-overlay-ep');
      var thumb=el('div','iv-overlay-ep-thumb');
      var thumbUrl=ep.thumbnail_url||(ep.video_url&&ep.video_type!=='s3'?'https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg':null);
      if(thumbUrl){
        var img=document.createElement('img');
        img.alt='';img.loading=idx<4?'eager':'lazy';
        img.style.cssText='width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .2s';
        img.onload=function(){this.style.opacity='1';};
        img.onerror=function(){this.style.display='none';};
        img.src=thumbUrl;
        thumb.appendChild(img);
      }
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
      frag.appendChild(item);
    });
  }
  clear(list); list.appendChild(frag);
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


/* ===== START ===== */
function startApp(){
  // ── Warm resume detection ─────────────────────────────────────────────────
  // tk_last_bg is written by appStateChange + visibilitychange when app goes to background.
  // If it was < 3 h ago, WebView was killed under memory pressure — skip splash.
  // 3 h covers realistic backgrounding patterns (30 min was too short).
  var _bgTs = parseInt(localStorage.getItem('tk_last_bg') || '0');
  var _sinceBackground = _bgTs ? (Date.now() - _bgTs) : Infinity;
  if (_bgTs && _sinceBackground < 3 * 60 * 60 * 1000) {
    window._isWarmResume = true;
    console.log('[APP_LIFECYCLE] warm_resume — backgrounded', Math.round(_sinceBackground / 1000), 's ago');
  } else {
    window._isWarmResume = false;
    console.log('[APP_LIFECYCLE] cold_start');
  }
  console.log('[Startup] startApp()',Date.now()-_startupT0,'ms');
  // Hide native splash after TWO rAFs — double rAF guarantees the browser has
  // committed at least one paint of the HTML splash before the native overlay
  // disappears. Single rAF fires before paint on fast devices, leaving a 1-frame
  // gap where the raw WebView background is briefly visible.
  // fadeOutDuration:0 = instant hand-off (WebView and HTML splash both use the
  // same dark theme background, so the transition is seamless with no visible gap).
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      try{var _ns=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.SplashScreen;if(_ns)_ns.hide({fadeOutDuration:0});}catch(e){}
    });
  });
  // Apply persisted mushaf CSS vars immediately
  document.documentElement.style.setProperty('--mushaf-size',(S.mushafFontSize||30)+'px');
  document.documentElement.style.setProperty('--mushaf-lh',String(S.mushafLineH||1.8));
  // Force-update check: deferred 5s so it doesn't compete with startup fetches.
  // Interval bumped to 60s — 12s was excessive on slow networks / low-end devices.
  setTimeout(function(){ ForceUpdate.check(); }, 5000);
  // Clear any existing interval before creating — prevents duplicate polls if
  // startApp() is called more than once (hot reload, re-init paths).
  if(window._forceUpdateInterval)clearInterval(window._forceUpdateInterval);
  window._forceUpdateInterval=setInterval(function(){ if(!document.hidden) ForceUpdate.check(); }, 60000);

  // ── Runtime jank monitoring — auto-downgrade performance tier ─────────────
  // Starts 8s after launch so startup pre-renders don't trigger false positives.
  // Uses PerformanceObserver longtask (Chrome/Android only — silently skipped on iOS).
  // Stops after 20s — we only care about real-use jank, not background tasks.
  setTimeout(function(){
    if(!window.TKPerf)return;
    if(window.TKPerf.override){
      console.log('[PERFORMANCE] jank monitor skipped — user has manual override: '+window.TKPerf.override);
      return;
    }
    try{
      if(!window.PerformanceObserver)return;
      var _jt=0,_jStop=false;
      var _jObs=new PerformanceObserver(function(list){
        if(_jStop)return;
        list.getEntries().forEach(function(e){
          if(e.duration>100){
            _jt++;
            console.log('[PERFORMANCE] long task '+Math.round(e.duration)+'ms (count='+_jt+')');
          }
        });
        if(_jt>=3){
          _jStop=true;_jObs.disconnect();
          var _lvls=['high','medium','low','critical'];
          var _idx=_lvls.indexOf(window.TKPerf.level);
          if(_idx>=0&&_idx<_lvls.length-1){
            var _nl=_lvls[_idx+1];
            console.log('[PERFORMANCE] downgraded due to jank: '+window.TKPerf.level+' → '+_nl);
            window.TKPerf.detected=_nl;
            try{localStorage.setItem('tk_perf_detected',_nl);}catch(e){}
            window.TKPerf.applyLevel(_nl);
          }
        }
      });
      _jObs.observe({entryTypes:['longtask']});
      // Stop after 20s — sufficient window to catch real-use jank
      setTimeout(function(){
        if(!_jStop){
          _jStop=true;
          try{_jObs.disconnect();}catch(e){}
          console.log('[PERFORMANCE] jank check done: '+_jt+' long tasks in 20s');
        }
      },20000);
    }catch(e){}
  },8000);

  if(window.i18n){
    /* 3-second timeout — if i18n fetch hangs (slow connection), start app anyway */
    var _i18nDone = false;
    function _afterI18n(){
      if(_i18nDone){ console.log('[APP_LIFECYCLE] duplicate_init_prevented'); return; }
      _i18nDone=true;

      // Safe render guard: if bundled didn't load, UI must not show raw keys.
      // Layer 1 (kmr-bundled.js) is synchronous — if it's missing, log the critical error
      // and let initLang's health report surface it in the admin dashboard.
      if(window.i18n && !window.i18n.isHealthy()){
        console.error('[i18n] UNHEALTHY: bundled translations not loaded or key count too low.',
          window.i18n.getStatus());
        // Still proceed — app is usable with whatever keys loaded; health report will fire.
      }

      init();
      i18n.applyTranslations();
      if(window._splashReadyI18n){window._splashReadyI18n();window._splashReadyI18n=null;}
    }
    setTimeout(_afterI18n, 1500); /* fallback — never wait more than 1.5s */
    i18n.initLang().then(function(){
      console.log('[Startup] i18n ready',Date.now()-_startupT0,'ms',
        window.i18n.getStatus ? window.i18n.getStatus() : '');
      _afterI18n();
    }).catch(_afterI18n);
  } else {
    init();
    if(window._splashReadyI18n){window._splashReadyI18n();window._splashReadyI18n=null;}
  }
  // i18n:updated already handled at top of file (line ~558) — no duplicate here
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',startApp)}else{startApp()}

})();
