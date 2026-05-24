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
// i18n.js sets window.t before app-core.js runs. Capture it now so our global `t`
// doesn't call itself (removing the IIFE means t === window.t at global scope).
var t = window.t || function(k){return k};
// Read from kurdish_translations first (admin-editable), fall back to site_settings or hardcoded
function _ft(key,fb){var v=window.t&&window.t(key);return(v&&v!==key)?v:(fb||'');}

/* ===== HELPERS ===== */
function $(id){return document.getElementById(id)}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e}
function icon(name){var i=document.createElement('i');i.className=name;return i}
function on(e,ev,fn){if(e)e.addEventListener(ev,fn)}
function clear(e){if(e)while(e.firstChild)e.removeChild(e.firstChild)}

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
  theme:localStorage.getItem('theme')||(JSON.parse(localStorage.getItem('userPreferences')||'{}').darkMode?'dark':'noor'),
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
