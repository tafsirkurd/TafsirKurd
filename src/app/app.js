/* Tafsir Kurd - Mobile App v2.0 */
/* Pure DOM methods only - no innerHTML for security */

(function(){
'use strict';

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
  var UPDATE_NOTIF_KEY   = 'updateNotifVer';     // last minVersion we scheduled a notification for
  var UPDATE_NOTIF_ID    = 50;                   // LocalNotification ID — free slot (1=reminder,10-16,20-26,30-32,100-134=athan,200=test)
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
      _cancelUpdateNotification();
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

  // ── Update reminder notification ──────────────────────────────────────────
  //
  // When soft mode is detected and the user's version is outdated, we schedule
  // one local notification to fire 24 hours later. This nudges users who
  // dismissed the in-app banner but haven't yet updated.
  //
  // Rules:
  //   - Only scheduled ONCE per minVersion string (tracked in UPDATE_NOTIF_KEY)
  //   - Fires 24h after first detection — users who update quickly never see it
  //   - Automatically cancelled when check() finds the version is no longer outdated
  //   - Uses notification ID 50 (unique, won't clash with any other notification)
  //   - No new permissions required — reuses existing 'reminder' channel

  function _getLN() {
    return window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications || null;
  }

  function _scheduleUpdateNotification(minVersion) {
    var LN = _getLN();
    if (!LN) return; // not on a device or plugin missing

    // Already scheduled a notification for this version — don't duplicate
    if (localStorage.getItem(UPDATE_NOTIF_KEY) === String(minVersion)) return;

    var at = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours from now
    var title = tSafe('update.notice_notification_title') || tSafe('update.title') || 'هەواڵی نوێ بەردەستە.';
    var body  = tSafe('update.notice_notification_body') || 'وەشانی نوێ هەیە — تکایە ئاپدێت بکە.';

    // Cancel any leftover notification from a previous version first
    LN.cancel({ notifications: [{ id: UPDATE_NOTIF_ID }] }).catch(function() {});

    LN.schedule({ notifications: [{
      id:          UPDATE_NOTIF_ID,
      title:       title,
      body:        body,
      schedule:    { at: at, allowWhileIdle: true },
      channelId:   'reminder',
      smallIcon:   'ic_notification',
      extra:       { type: 'update' }
    }] }).then(function() {
      localStorage.setItem(UPDATE_NOTIF_KEY, String(minVersion));
      console.log('[Update] reminder notification scheduled for', at.toISOString(), '(ver', minVersion, ')');
    }).catch(function(e) {
      console.warn('[Update] could not schedule reminder notification:', e && e.message);
    });
  }

  function _cancelUpdateNotification() {
    var LN = _getLN();
    if (LN) LN.cancel({ notifications: [{ id: UPDATE_NOTIF_ID }] }).catch(function() {});
    localStorage.removeItem(UPDATE_NOTIF_KEY);
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
      if (!cfg) { console.log('[Update] No config — skipping'); _cancelUpdateNotification(); return; }

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
        _cancelUpdateNotification();
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
        // Store safety check — fall back to soft if URL missing or store unreachable.
        // Skip the check if no store URL configured (avoid hanging fetch).
        var reachable;
        if (!_storeUrl) {
          reachable = false;
        } else {
          reachable = await Promise.race([
            isStoreReachable(_storeUrl),
            new Promise(function(r){ setTimeout(function(){ r(true); }, 2000); }) // assume reachable after 2s
          ]);
        }
        if (!reachable) {
          console.log('[Update] HARD requested but store URL missing — falling back to SOFT');
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
        _scheduleUpdateNotification(minVersion); // once per version, 24h later
      }
    } catch(e) {
      console.warn('[Update] check error:', e);
    }
  }

  return { check: check, openStore: openStore };
})();

/* ===== i18n ===== */
function t(k,v){return window.t?window.t(k,v):k}

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
var _PF_AHEAD=3; // how many ayahs to fetch ahead

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
  dailyReminder:localStorage.getItem('dailyReminder')==='true',
  reminderTime:localStorage.getItem('reminderTime')||'08:00',
  dailyVerse:localStorage.getItem('dailyVerse')==='true',
  dailyVerseTime:localStorage.getItem('dailyVerseTime')||'08:00',
  prayerCity:localStorage.getItem('prayerCity')||'Duhok',
  prayerMethod:parseInt(localStorage.getItem('prayerMethod')||'13'),
  prayerAthanEnabled:localStorage.getItem('prayerAthanEnabled')===null?(!(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')):localStorage.getItem('prayerAthanEnabled')==='true',
  prayerToggles:(function(){try{return JSON.parse(localStorage.getItem('prayerToggles')||'{}')}catch(e){return {}}}()),
  theme:localStorage.getItem('theme')||(JSON.parse(localStorage.getItem('userPreferences')||'{}').darkMode?'dark':'light'),
  arSize:parseFloat(localStorage.getItem('app_arSize'))||2.0,
  tfSize:parseFloat(localStorage.getItem('app_tfSize'))||1.0,
  lineH:parseFloat(localStorage.getItem('app_lineH'))||2.2,
  ivSupabase:null,ivSeries:null,ivEpisodes:null,ivCurrentSeries:null,ivLoading:false,ivInited:false,ivSearchQuery:'',ivSpeakerFilter:null,
  rm:{mode:'single',playCount:2,verseRepeat:1,delay:0,isPlaying:false,currentPlay:0},
  readSession:null,
  todayVerses:null,
  supabase:null,user:null,syncInterval:null,isSyncing:false,syncFailed:false,lastSyncTime:0,realtimeChannel:null,
  readerFont:localStorage.getItem('readerFont')||'hafs',
  glyphVerses:{},
  mushafFont:localStorage.getItem('mushafFont')||'qcf4',
  mushafFontSize:(function(){var f=localStorage.getItem('mushafFont')||'qcf4';return parseInt(localStorage.getItem('mushafFontSize_'+f))||(f==='qcf1'?22:20);}()),
  mushafLineH:parseFloat(localStorage.getItem('mushafLineH'))||1.8,
  copy:{surah:0,ayah:0,rangeFmt:'both'}
};

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
    on(S.audio.el,'ended',function(){App.audioNext()});
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
    on(S.audio.el,'waiting',function(){if(S.audio.playing)setAudioIcon('loading')});
    on(S.audio.el,'playing',function(){
      setAudioIcon('pause');
      if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
    });
    on(S.audio.el,'pause',function(){if(!S.audio.playing)setAudioIcon('play')});

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
    setupPullToRefresh('panelBookmarks',function(){_renderHash.bm=null;renderBookmarks();});
    setupPullToRefresh('panelGoals',function(){_renderHash.goals=null;renderGoals();});
    setupPullToRefresh('panelIslamvoice',function(){_renderHash.iv=null;if(typeof App.ivRefresh==='function')App.ivRefresh();});
    setupPullToRefresh('panelSettings',function(){_renderHash.settings=null;renderSettings();});
    setupPullToRefresh('panelPrayer',function(){if(window.PrayerUI)PrayerUI.refresh()});
    setupPullToRefresh('panelGencine',function(){if(window.GencineUI)GencineUI.refresh();});

    // Load data
    loadQuranData();
    loadTafsirData();

    // Init shared Supabase client and check auth
    initSupabase(function(){ loadReciterPhotos(); });

    // Pause audio and sky animations when app goes to background
    document.addEventListener('visibilitychange',function(){
      if(document.hidden){
        if(!S.bgAudio&&S.audio.playing){
          S.audio.el.pause();S.audio.playing=false;
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
        }
      }
    });
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('appStateChange',function(state){
          if(!state.isActive){
            if(!S.bgAudio&&S.audio.playing){
              S.audio.el.pause();S.audio.playing=false;
              var ic=$('audioPlayIcon');
              if(ic)ic.className='fas fa-play';
            }
            // Sync data when app goes to background
            if(S.user)syncToCloud();
          } else {
            // App came to foreground — check for forced update first
            ForceUpdate.check();
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
            // Rebuild prayer panel if active — handles overnight stale date
            // (tickCountdown uses _currentDateISO; if date changed the countdown is wrong
            // until render() detects the key mismatch and rebuilds with today's timings)
            if(window.PrayerUI&&S.tab==='prayer')requestAnimationFrame(function(){PrayerUI.render();});
            // Push fresh widget data if date or city changed since last push
            if(window.PrayerUI)PrayerUI.pushWidgetIfStale();
            pushGoalDataToWidget();
            syncWidgetTranslations();
            initDailyVerse();
            scheduleStreakReminder();
            checkNewVideoNotif();
            checkNewBookNotif();
            // Re-run prefetch in case any city cache is missing (e.g. first open was offline)
            if(window.PrayerUI&&PrayerUI.prefetchAllCities)PrayerUI.prefetchAllCities();
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

    // Android back button
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('backButton',function(){
          if($('fuOverlay')&&$('fuOverlay').classList.contains('on')){return} // hard block — back does nothing
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
          if(event.url&&event.url.indexOf('com.tafsirkurd.app://auth')===0){
            // Close browser if open
            try{if(window.Capacitor.Plugins.Browser)window.Capacitor.Plugins.Browser.close()}catch(e2){}
            // Extract tokens from URL hash/query
            var url=event.url;
            var hashPart=url.split('#')[1]||'';
            if(hashPart&&S.supabase){
              var params=new URLSearchParams(hashPart);
              var accessToken=params.get('access_token');
              var refreshToken=params.get('refresh_token');
              if(accessToken&&refreshToken){
                S.supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken}).then(function(resp){
                  if(resp.error){console.error('OAuth session error:',resp.error);return}
                  if(resp.data&&resp.data.session){
                    setUserFromSession(resp.data.session);
                    // Create profile if needed
                    var u=resp.data.session.user;
                    var meta=u.user_metadata||{};
                    S.supabase.from('profiles').upsert({
                      id:u.id,email:u.email,
                      full_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
                      display_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
                      avatar_url:meta.avatar_url||null,
                      registration_source:'google',
                      has_completed_signup:true,
                      first_login_at:new Date().toISOString()
                    },{onConflict:'id'}).then(function(){});
                    startCloudSync();
                    App.closeLogin();
                    toast(t('toast.logged_in'));
                    if(S.tab==='settings')renderSettings();
                  }
                }).catch(function(e3){console.error('OAuth set session error:',e3)});
              }
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
      scheduleReminder(S.dailyReminder, S.reminderTime);
    }catch(e){}
  }

  // Critical: schedule athan + daily verse immediately (notification timing matters)
  if(window.PrayerUI)PrayerUI.initScheduleOnStart();
  // Push widget data from cache if date/city changed (runs without network)
  if(window.PrayerUI)PrayerUI.pushWidgetIfStale();
  pushGoalDataToWidget();
  // Sync widget translations from Supabase (once per day, requires network)
  setTimeout(function(){syncWidgetTranslations();},3000);
  initDailyVerse();
  // Stagger non-critical background work to avoid network + CPU spike right after entry
  setTimeout(function(){scheduleStreakReminder();},800);
  setTimeout(function(){checkNewVideoNotif();},1500);
  setTimeout(function(){_warmAboutCache();},2000);
  setTimeout(function(){checkNewBookNotif();},2500);
  _initPushTapListener(); // register tap listener immediately — never miss cold-start events
  setTimeout(function(){initPushToken();},3000);
  // Preload Gencine scripts in background so first tab open is instant (scripts are 190KB)
  setTimeout(function(){_loadGencineScripts(function(){
    // Pre-render only if user hasn't already opened the tab
    if(window.GencineUI&&S.tab!=='gencine'){
      var _gh=_tabHash('gencine');
      if(_gh!==_renderHash.gencine){GencineUI.render();_renderHash.gencine=_gh;}
    }
  });},3000);
  // Heavy: fetches prayer data for all 20 cities — delay until app is fully settled
  setTimeout(function(){if(window.PrayerUI)PrayerUI.prefetchAllCities();},4000);
  // Athan voice decode is CPU-intensive — delay until after first 3s of interaction
  setTimeout(function(){if(window.PrayerUI)PrayerUI.preloadAthanVoices();},3500);
  // Audio cache warmup — verify manifest entries still exist on disk, populate _uriMap
  setTimeout(function(){if(window.AudioCache)AudioCache.warmup();},3000);

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

  // Pre-fetch mushaf page data — delayed to 4.5s so font injection doesn't compete with entry
  setTimeout(function(){
    var pf=_getPageFields();
    getMushafPageRange(S.surah||1).then(function(pages){
      // Inject fonts and fetch data for all pages of this surah
      for(var pn=pages.start;pn<=pages.end;pn++){
        (function(n){
          if(S.mushafFont==='qcf1')injectQCFFont(n);
          else if(S.mushafFont==='qcf2')injectQCFV2Font(n);
          else if(S.mushafFont==='qcf4')injectQCFV4Font(n);
          getMushafPageData(n,pf.fields,pf.cache,pf.mushafId).catch(function(){});
        })(pn);
      }
    }).catch(function(){});
  },4500);

  // Early data prefetch — warm all API/DB caches before user taps any tab.
  // No DOM work here — just fires network requests so cache is hot when tab opens.
  setTimeout(function(){
    if(window.GencineUI&&GencineUI.prefetch)GencineUI.prefetch();
  },200);

  // Pre-render fallback — fires at 1500ms if _checkDataReady() hasn't triggered it yet.
  // Normal case: _checkDataReady() triggers _startTabPrerender() ~100ms after start.
  setTimeout(function(){_startTabPrerender();},1500);

  // Smart splash — 2 gates: quran data loaded + all tabs pre-rendered.
  // Hybrid timing: first launch / new version → 3s minimum (full animation).
  //                repeat same-version launches → immediate exit when data ready.
  var _splashStart = Date.now();
  var _splashReady = {quran:false,tabs:false};
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

  // 3s minimum — only active for first launch / new version.
  // Writes the "seen" flag so next launch is instant.
  setTimeout(function(){
    if(_splashMinPassed)return; // already cleared (repeat launch)
    try {
      if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App)
        Capacitor.Plugins.App.getInfo().then(function(i){localStorage.setItem(_splashSeenKey,i.version||'');}).catch(function(){});
    }catch(e){}
    _splashMinPassed=true;
    _checkSplashReady();
  },3000);

  function _doSplashTransition(){
    if(_splashDismissed)return;
    _splashDismissed=true;
    var sp=$('splash');
    var app=$('app');
    if(app)app.style.display='flex';
    // Double rAF: first triggers layout, second ensures browser has painted app content
    // before splash starts fading — prevents white blank frame.
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        console.log('[Startup] Transitioning into app at',Date.now()-_splashStart,'ms');
        if(sp)sp.classList.add('hide');
        if(app)app.classList.add('visible');
        // Execute any pending push deep link now that app is fully visible
        if(_pendingPushDeepLink){
          var _pl=_pendingPushDeepLink;_pendingPushDeepLink=null;
          setTimeout(function(){_handlePushDeepLink(_pl.type,_pl.id);},300);
        }
        setTimeout(function(){if(sp&&sp.parentNode)sp.parentNode.removeChild(sp);},400);
        console.log('[Startup] App visible at',Date.now()-_splashStart,'ms');
      });
    });
  }

  function _checkSplashReady(){
    if(_splashDismissed)return;
    if(!_splashReady.quran||!_splashReady.tabs)return;
    if(!_splashReady.video)return; // wait for video to finish playing
    if(!_splashMinPassed)return; // first launch / new version: wait for 3s minimum
    console.log('[Startup] All gates passed — exiting splash. Elapsed:',Date.now()-_splashStart,'ms');
    // Pre-warm app layout one frame before transition starts — gives browser a head start
    // painting the app before the splash fade begins (3 rAFs total on normal path).
    var app=$('app');
    if(app)app.style.display='flex';
    requestAnimationFrame(function(){_doSplashTransition();});
  }

  // Video plays once — app exits splash only after video finishes AND data is ready
  var _splashVid=document.getElementById('splashVideo');
  if(_splashVid){
    _splashVid.addEventListener('ended',function(){
      if(_splashReady.video)return;
      _splashReady.video=true;
      _checkSplashReady();
    });
    _splashVid.play().catch(function(){
      // Autoplay blocked — mark video gate as passed so app can still load
      _splashReady.video=true;
      _checkSplashReady();
    });
  } else {
    // No video element — don't block on it
    _splashReady.video=true;
  }

  window._splashReadyQuran      =function(){if(_splashReady.quran)return;_splashReady.quran=true;_checkSplashReady();};
  window._splashReadyI18n       =function(){}; // not a gate — always fires before tabs anyway
  window._splashReadyGencine    =function(){}; // not a gate — Supabase-dependent, loads async
  window._splashReadyIslamvoice =function(){}; // not a gate — Supabase-dependent, loads async
  window._splashReadyTabs       =function(){if(_splashReady.tabs)return;_splashReady.tabs=true;_checkSplashReady();};
  // Overall failsafe — force app visible after 12s no matter what
  setTimeout(function(){_doSplashTransition();},12000);
  // Data always loads async now (no localStorage cache) — splash waits for both files
}

/* ===== LIVE TRANSLATION UPDATE ===== */
// When the admin saves a translation, i18n.js detects the change (polling every 8s),
// fires i18n:updated, and we immediately re-render whichever tab is currently visible.
document.addEventListener('i18n:updated', function(){
  // Invalidate all pre-rendered caches — next tab visit rebuilds with fresh strings
  _renderHash={};
  if(window.PrayerUI) PrayerUI.invalidate();

  // Re-render the currently visible tab right now so the user sees the change immediately
  var tab=S.tab;
  if(tab==='bookmarks'){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');}
  else if(tab==='goals'){renderGoals();_renderHash.goals=_tabHash('goals');}
  else if(tab==='settings'){renderSettings();_renderHash.settings=_tabHash('settings');}
  else if(tab==='islamvoice'){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');}
  else if(tab==='prayer'&&window.PrayerUI){PrayerUI.redraw();}
  else if(tab==='gencine'&&window.GencineUI){GencineUI._homeEl=null;GencineUI._draw();}
  // quran tab uses data-i18n attributes — applyTranslations() already handled it above
});

/* ===== DATA LOADING ===== */
var _dataReady={quran:false,tafsir:false};
var _tabsPrerendering=false; // guard: pre-render runs only once
var _startupT0=Date.now();   // module load time for debug logs

function _checkDataReady(){
  if(!_dataReady.quran||!_dataReady.tafsir)return;
  console.log('[Startup] quran+tafsir ready',Date.now()-_startupT0,'ms');
  if(window._splashReadyQuran){window._splashReadyQuran();window._splashReadyQuran=null;}
  if(S.surah)renderAyahs(S.surah);
  if(window.QuranSearch)QuranSearch.init(S.quranData,S.tafsirData);
  // Data is ready — start pre-rendering tabs NOW instead of waiting for 900ms timer
  setTimeout(_startTabPrerender,50);
}

// Pre-render all 6 tabs so they're built before user ever taps them.
// Called from _checkDataReady (early, data-driven) with 1500ms fallback in init().
function _startTabPrerender(){
  if(_tabsPrerendering)return;
  _tabsPrerendering=true;
  console.log('[Startup] Tab pre-render start',Date.now()-_startupT0,'ms');
  var jobs=[
    function(){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');},
    function(){renderGoals();_renderHash.goals=_tabHash('goals');},
    function(){renderSettings();_renderHash.settings=_tabHash('settings');},
    function(){if(window.PrayerUI){PrayerUI.render();// Pause sky animations — pre-rendered but not the active tab
      requestAnimationFrame(function(){var _s=document.getElementById('prayerSkyScene');if(_s&&S.tab!=='prayer')_s.classList.add('sky-paused');});}},
    function(){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');},
    function(){if(window.GencineUI)GencineUI.render();}
  ];
  var _ji=0;
  function _nextJob(){
    if(_ji>=jobs.length){
      console.log('[Startup] Tab pre-render done',Date.now()-_startupT0,'ms');
      if(window._splashReadyTabs)window._splashReadyTabs();
      return;
    }
    jobs[_ji++]();
    setTimeout(_nextJob,60);
  }
  _nextJob();
}
function loadQuranData(){
  fetch('/data/quran.json').then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(d){
    S.quranData=d;
    _dataReady.quran=true;
    _checkDataReady();
  }).catch(function(e){
    console.error('Quran load error:',e);
    toast(t('error.data_load'));
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

function loadTafsirData(){
  fetch('/data/kurdish_tafsir.json').then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(d){
    S.tafsirData=groupTafsirBySurah(d);
    _dataReady.tafsir=true;
    _checkDataReady();
  }).catch(function(e){
    console.error('Tafsir load error:',e);
    toast(t('error.tafsir_load'));
    // Retry once after 3 seconds — flag prevents concurrent retry fetches
    var _tafsirRetrying=false;
    setTimeout(function(){
      if(S.tafsirData||_tafsirRetrying)return;
      _tafsirRetrying=true;
      fetch('/data/kurdish_tafsir.json').then(function(r){return r.json()}).then(function(d){
        S.tafsirData=groupTafsirBySurah(d);
        _dataReady.tafsir=true;
        _checkDataReady();
        toast(t('toast.tafsir_loaded'));
      }).catch(function(){}).then(function(){_tafsirRetrying=false;});
    },3000);
  });
}

/* ===== THEME & SIZES ===== */
function applyTheme(){
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
    return (S.user?S.user.email:'')+':'+S.theme+':'+S.hapticFeedback+':'+S.arSize+':'+S.tfSize+':'+S.keepAwake+':'+S.dailyReminder+':'+S.reminderTime;
  }
  if(name==='islamvoice'){
    return (S.ivSeries?S.ivSeries.length:0)+':'+(S.ivSearchQuery||'')+(S.ivSpeakerFilter||'');
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
  var prevPanel=$('panel'+_prevTab.charAt(0).toUpperCase()+_prevTab.slice(1));
  if(prevPanel)prevPanel.classList.remove('on');
  var panel=$('panel'+name.charAt(0).toUpperCase()+name.slice(1));
  if(panel)panel.classList.add('on');

  // ── Tab bar icon ──
  var prevBtnName=(_prevTab==='goals'||_prevTab==='bookmarks')?'quran':_prevTab;
  var prevBtn=_getCachedTabBtn(prevBtnName);
  if(prevBtn)prevBtn.classList.remove('on');
  var tabBtnName=(name==='goals'||name==='bookmarks')?'quran':name;
  var tabBtn=_getCachedTabBtn(tabBtnName);
  if(tabBtn)tabBtn.classList.add('on');

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

    // Cleanup from previous tab
    if(_prevTab==='prayer'&&name!=='prayer'&&window.PrayerUI){
      PrayerUI.stopCountdown();
      var _skyEl2=document.getElementById('prayerSkyScene');
      if(_skyEl2)_skyEl2.classList.add('sky-paused');
    }
    if(_prevTab==='quran'&&name!=='quran'){
      var _sb=document.getElementById('searchBar');if(_sb)_sb.classList.remove('on');App.clearSearch();
      if(_surahBadgeObs){_surahBadgeObs.disconnect();}
    }
    if(_prevTab==='gencine'&&name!=='gencine'&&window.GencineUI){GencineUI.closeSheet();}
    if(_prevTab==='islamvoice'&&name!=='islamvoice'){if(_ivHeroTimer){clearInterval(_ivHeroTimer);_ivHeroTimer=null;}}
    if(name==='islamvoice'&&_ivHeroSlides.length){_ivHeroResetTimer();}
    if(S.surah&&name!=='quran'){_endSession();}
    App.closeRecPicker();
    if(typeof closeCfgSheet==='function')closeCfgSheet();
    App.closeReaderSettings();

    // Renders for new tab
    if(name==='bookmarks'){var _hbm=_tabHash('bookmarks');if(_hbm!==_renderHash.bm){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');}}
    if(name==='goals'){var _hg=_tabHash('goals');if(_hg!==_renderHash.goals){renderGoals();_renderHash.goals=_tabHash('goals');}}
    if(name==='islamvoice'){var _hiv=_tabHash('islamvoice');if(_hiv!==_renderHash.iv){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');}}
    if(name==='settings'){var _hs=_tabHash('settings');if(_hs!==_renderHash.settings){renderSettings();_renderHash.settings=_tabHash('settings');}_warmAboutCache();}
    if(name==='prayer'&&window.PrayerUI){PrayerUI.render();if(PrayerUI.ensureCountdown)PrayerUI.ensureCountdown();}
    if(name==='gencine'){_loadGencineScripts(function(){var _gh=_tabHash('gencine');if(_gh!==_renderHash.gencine&&S.tab==='gencine'){GencineUI.render();_renderHash.gencine=_gh;}});}
  });
};

/* ===== GENCINE LAZY LOADER ===== */
// dua-data.js + dhikr.js are not loaded at startup — they're pulled in on first Gencine tab visit.
// All callers in App.tab guard with window.GencineUI so they're safe until this resolves.
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
  function _check() { if (_p1 && _p2) _ls('/dhikr/dhikr.js?v=20260416', _done); }
  _ls('/dhikr/dua-data.js?v=20260326b',  function() { _p1 = true; _check(); });
  _ls('/dhikr/smart-dhikr.js?v=31',      function() { _p2 = true; _check(); });
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

/* ===== HAPTIC ===== */
function haptic(pattern){
  if(!S.hapticFeedback)return;
  try{
    var H=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
    if(H){
      // impact() is the correct Capacitor API for UI tap feedback.
      // vibrate() with very short durations (<20ms) is silently ignored by Android.
      var dur=pattern&&pattern[0]||30;
      if(dur<=30){H.impact({style:'LIGHT'});}
      else{H.notification({type:'SUCCESS'});}
    }else{navigator.vibrate(pattern||[30]);}
  }catch(e){}
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

function scheduleReminder(enabled,time){
  if(!window.Capacitor||!window.Capacitor.Plugins||!window.Capacitor.Plugins.LocalNotifications)return;
  var LN=window.Capacitor.Plugins.LocalNotifications;
  // Cancel old single-slot (ID:1) and 7-day slots (IDs 10-16)
  LN.cancel({notifications:[1,10,11,12,13,14,15,16].map(function(id){return{id:id};})}).catch(function(){});
  if(!enabled)return;
  var parts=(time||'08:00').split(':');
  var h=parseInt(parts[0])||8;
  var m=parseInt(parts[1])||0;
  var now=new Date();
  var first=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0,0);
  if(first<=now)first.setDate(first.getDate()+1);
  var notifications=[];
  for(var d=0;d<7;d++){
    var schedDate=new Date(first.getFullYear(),first.getMonth(),first.getDate()+d,h,m,0,0);
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

function scheduleDailyVerse(enabled,time){
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  var LN=Capacitor.Plugins.LocalNotifications;
  /* Cancel IDs 20-26 */
  LN.cancel({notifications:[20,21,22,23,24,25,26].map(function(id){return {id:id};})}).catch(function(){});
  if(!enabled)return;

  /* Wait until Quran + tafsir data is loaded */
  if(!S.quranData||!S.tafsirData){
    setTimeout(function(){scheduleDailyVerse(S.dailyVerse,S.dailyVerseTime);},1200);
    return;
  }

  var parts=(time||'08:00').split(':');
  var h=parseInt(parts[0])||8;
  var m=parseInt(parts[1])||0;
  var now=new Date();
  /* First slot: today if not yet passed, else tomorrow */
  var first=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0,0);
  if(first<=now)first.setDate(first.getDate()+1);

  var notifications=[];
  for(var d=0;d<7;d++){
    var schedDate=new Date(first.getFullYear(),first.getMonth(),first.getDate()+d,h,m,0,0);
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
  card.appendChild(title);card.appendChild(msg);card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
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
  card.appendChild(icon);card.appendChild(title);card.appendChild(msg);
  card.appendChild(btn);card.appendChild(dismissBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
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
  card.appendChild(icon);card.appendChild(title);card.appendChild(msg);
  card.appendChild(btn);card.appendChild(dismissBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
};

function initDailyVerse(){
  if(!S.dailyVerse)return;
  var last=localStorage.getItem('dailyVerseScheduledDate');
  if(last===new Date().toDateString())return; /* already scheduled today */
  scheduleDailyVerse(true,S.dailyVerseTime);
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

    // Receive APNs/FCM token and store in DB via server endpoint (bypasses RLS)
    PP.addListener('registration',function(tokenData){
      var platform=window.Capacitor.getPlatform()||'unknown';
      var token=tokenData.value||'';
      _pushLog('registration event fired platform='+platform+' tokenLen='+token.length);
      localStorage.setItem('push_token_preview',token.slice(0,20)+'…');
      localStorage.setItem('push_token_platform',platform);
      if(!token){_pushLog('ERROR: empty token');return;}
      fetch('https://tafsirkurd.com/register-push-token',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token:token,platform:platform})
      }).then(function(r){return r.json();}).then(function(res){
        if(res.error){
          _pushLog('register FAILED: '+res.error);
          localStorage.setItem('push_reg_api_error',res.error);
        } else {
          _pushLog('token stored in DB OK via server');
          localStorage.removeItem('push_reg_api_error');
        }
      }).catch(function(e){
        _pushLog('register EXCEPTION: '+(e&&e.message));
      });
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

/* ===== NEW VIDEO NOTIFICATION ===== */
/* Check on app open if new IslamVoice video was added since last check. ID 31 */
function checkNewVideoNotif(){
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

App.toggleSearch=function(){
  var bar=$('searchBar');
  bar.classList.toggle('on');
  if(bar.classList.contains('on'))$('searchInput').focus();
  else App.clearSearch();
};

App.clearSearch=function(){
  clearTimeout(_searchTimer);_searchTimer=null;
  $('searchInput').value='';S.search='';
  $('searchResults').classList.remove('on');
  clear($('searchResults'));
};

/* Debounced entry point — called on every keystroke */
App.onSearch=function(v){
  clearTimeout(_searchTimer);
  _searchTimer=setTimeout(function(){App._execSearch(v);},150);
};

/* Actual search execution after debounce */
App._execSearch=function(v){
  var q=v.trim();
  S.search=q;
  var res=$('searchResults');
  clear(res);
  if(!q){res.classList.remove('on');return;}

  var results=window.QuranSearch&&QuranSearch.isReady()
    ? QuranSearch.query(q,SURAHS,30)
    : App._basicSearch(q); // fast fallback while index builds (~1s after load)

  if(!results.length){res.classList.remove('on');return;}
  res.classList.add('on');

  var frag=document.createDocumentFragment();
  var prevType=null;
  for(var i=0;i<results.length;i++){
    var r=results[i];
    // Section dividers on type transition
    if(r.type!==prevType){
      if(r.type==='surah'&&prevType)
        frag.appendChild(el('div','search-divider',t('search.divider_surah')));
      else if(r.type==='verse')
        frag.appendChild(el('div','search-divider',t('search.divider_ayah')));
      prevType=r.type;
    }
    frag.appendChild(App._mkSearchItem(r));
  }
  res.appendChild(frag);
};

/* Build a single result card */
App._mkSearchItem=function(r){
  var item=el('div','search-result search-result--'+r.type);

  if(r.type==='ref'){
    /* ── Direct-jump card ─────────────────────────────────── */
    var badge=document.createElement('div');
    badge.className='search-ref-badge';
    badge.appendChild(el('span','search-ref-surah',r.surahAr||r.surahEn));
    badge.appendChild(el('span','search-ref-num',r.sn+':'+r.an));
    item.appendChild(badge);
    if(r.arO){
      var arTxt=r.arO.length>90?r.arO.substring(0,90)+'…':r.arO;
      item.appendChild(el('div','search-result-verse-ar',arTxt));
    }
    if(r.kuO){
      item.appendChild(el('div','search-result-ku',r.kuO.substring(0,72)+'…'));
    }
    on(item,'click',(function(sn,an){return function(){
      App.tab('quran');App.clearSearch();$('searchBar').classList.remove('on');
      setTimeout(function(){App.openSurah(sn,an);},100);
    };})(r.sn,r.an));

  } else if(r.type==='surah'){
    /* ── Surah name card ──────────────────────────────────── */
    var row=document.createElement('div');
    row.className='search-surah-row';
    row.appendChild(el('div','search-surah-num',String(r.sn)));
    var info=document.createElement('div');
    info.className='search-surah-info';
    info.appendChild(el('div','search-result-title',r.surahEn));
    info.appendChild(el('div','search-result-sub',r.surahAr+' \u2022 '+r.ayahCount+' '+t('reader.ayah')));
    row.appendChild(info);
    item.appendChild(row);
    on(item,'click',(function(sn){return function(){
      App.openSurah(sn);App.clearSearch();$('searchBar').classList.remove('on');
    };})(r.sn));

  } else {
    /* ── Verse card ───────────────────────────────────────── */
    var arSnip=r.arO?r.arO.substring(0,88)+(r.arO.length>88?'…':''):'';
    item.appendChild(el('div','search-result-verse-ar',arSnip));
    var sub=el('div','search-result-sub');
    sub.textContent=(r.surahAr||r.surahEn)+' \u2022 '+t('reader.ayah')+' '+r.an;
    item.appendChild(sub);
    if(r.kuO){
      item.appendChild(el('div','search-result-ku',r.kuO.substring(0,65)+'…'));
    }
    on(item,'click',(function(sn,an){return function(){
      App.tab('quran');App.clearSearch();$('searchBar').classList.remove('on');
      setTimeout(function(){App.openSurah(sn,an);},100);
    };})(r.sn,r.an));
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
    deco.textContent='surah'+String(s.n).padStart(3,'0');
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
  var deco=el('div','continue-surah-deco no-kurdish-convert','surah'+String(s.n).padStart(3,'0'));
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
  }
};

App.backToList=function(){
  haptic([8]);
  if(S.surah){
    try{localStorage.setItem('surah_scroll_'+S.surah,String($('ayahList').scrollTop))}catch(e){}
  }
  // Clean up mushaf DOM + observer — keep mode preference so next surah reopens in mushaf
  if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
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
  // Local bundled font is primary; remote Cloudflare Worker is fallback only
  s.textContent="@font-face{font-family:'QCFv4p"+pageNum+"';src:url('/assets/fonts/qcf4/p"+pageNum+".woff2') format('woff2'),url('https://qpc-v4-fonts.tefsirkurd.workers.dev/p"+pageNum+".woff2') format('woff2');font-display:block}";
  document.head.appendChild(s);
}

function getMushafPageRange(surahNum){
  var key='qcfRange_'+surahNum;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.start)return Promise.resolve(c);}catch(e){}
  return fetch('https://api.quran.com/api/v4/chapters/'+surahNum)
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){
      var ch=json.chapter;
      var pages={start:ch.pages[0],end:ch.pages[1]};
      try{localStorage.setItem(key,JSON.stringify(pages));}catch(e){}
      return pages;
    });
}

function getMushafPageData(pageNum,fields,cachePrefix,mushafId){
  fields=fields||'code_v1';cachePrefix=cachePrefix||'qcfV1p_';
  var key=cachePrefix+pageNum;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.verses)return Promise.resolve(c);}catch(e){}
  var url='https://api.quran.com/api/v4/verses/by_page/'+pageNum+'?words=true&word_fields='+fields+'&per_page=50';
  if(mushafId)url+='&mushaf='+mushafId;
  return fetch(url)
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){
      try{localStorage.setItem(key,JSON.stringify(json));}catch(e){}
      return json;
    });
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
  container.scrollTop+=elRect.top-cRect.top-(container.clientHeight-el.offsetHeight)/2;
}

function _scrollMushafToAyah(surah,ayah,attempts){
  if(!surah||!ayah)return;
  attempts=attempts||0;
  if(attempts>20)return;
  var key=String(surah)+':'+String(ayah);
  var view=$('mushafView');
  var els=window._mushafVerseElements&&window._mushafVerseElements[key];
  if(els&&els.length&&view&&view.contains(els[0])){
    _scrollElToCenter(view,els[0]);
    return;
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
    // After mushaf renders, scroll to where user was
    _scrollMushafToAyah(S.surah,fromAyah,0);
  }else{
    // Capture position before hiding mushaf
    var fromAyahM=_visibleAyahInMushaf()||1;
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

function renderMushafView(){
  var view=$('mushafView');
  if(!view||!S.surah)return;
  // Disconnect previous lazy-load observer to prevent accumulation
  if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
  window._mushafVerseElements={};
  clear(view);
  view.scrollTop=0;
  var spinner=el('div','mushaf-loading');
  spinner.appendChild(icon('fas fa-spinner fa-spin'));
  view.appendChild(spinner);

  var _renderSurah=S.surah; // capture at render time — abort if surah changes during async
  getMushafPageRange(S.surah).then(function(pages){
    if(!S.mushafMode||S.surah!==_renderSurah)return;
    clear(view);
    view.scrollTop=0;

    // Pre-inject QCF fonts for first 3 pages so they're downloading in parallel
    for(var pi=pages.start;pi<=Math.min(pages.end,pages.start+2);pi++){
      if(S.mushafFont==='qcf1')injectQCFFont(pi);
      else if(S.mushafFont==='qcf2')injectQCFV2Font(pi);
      else if(S.mushafFont==='qcf4')injectQCFV4Font(pi);
    }

    for(var p=pages.start;p<=pages.end;p++){
      (function(pn){
        var pageEl=el('div','mushaf-text-page');
        pageEl.dataset.page=String(pn);
        var ph=el('div','mushaf-page-ph');
        ph.appendChild(icon('fas fa-spinner fa-spin'));
        pageEl.appendChild(ph);
        view.appendChild(pageEl);
      })(p);
    }

    // Load first page immediately — no waiting for intersection
    var firstPage=view.querySelector('.mushaf-text-page');
    var targetSurah=S.surah;
    // Trim a page so it only contains content belonging to targetSurah
    function trimPageToSurah(pageEl){
      if(!pageEl)return;
      var kids=Array.prototype.slice.call(pageEl.childNodes);
      var keepFrom=0,keepTo=kids.length,foundTarget=false;
      for(var i=0;i<kids.length;i++){
        var k=kids[i];
        if(k.classList&&k.classList.contains('mushaf-surah-banner')){
          var bn=parseInt(k.dataset.surah);
          if(bn===targetSurah){keepFrom=i;foundTarget=true;}
          else if(foundTarget){keepTo=i;break;} // only cut at the surah AFTER the target
        }
      }
      // Remove trailing other-surah content (from end down to keepTo)
      for(var j=kids.length-1;j>=keepTo;j--){if(kids[j].parentNode===pageEl)pageEl.removeChild(kids[j]);}
      // Remove leading other-surah content (only when this page starts mid-surah)
      if(keepFrom>0){for(var m=keepFrom-1;m>=0;m--){if(kids[m].parentNode===pageEl)pageEl.removeChild(kids[m]);}}
    }
    function trimToTargetSurah(){
      // First page: trim leading previous-surah content, then reset scroll
      var banner=view.querySelector('.mushaf-surah-banner[data-surah="'+targetSurah+'"]');
      if(!banner)return false;
      var pageEl=banner.closest?banner.closest('.mushaf-text-page'):banner.parentNode;
      trimPageToSurah(pageEl);
      view.scrollTop=0;
      var panelEl=document.getElementById('panelQuran');
      if(panelEl)panelEl.scrollTop=0;
      return true;
    }
    function _mushafPageErr(pageEl){
      clear(pageEl);
      var ph=el('div','mushaf-page-ph mushaf-page-err','—');
      pageEl.appendChild(ph);
    }
    if(firstPage){
      firstPage.dataset.loaded='1';
      loadMushafPageQCF(firstPage,pages.start).then(function(){
        setTimeout(function(){
          if(trimToTargetSurah())return;
          // Banner not on first page — load next page and try again
          var p2=view.querySelector('.mushaf-text-page[data-page="'+(pages.start+1)+'"]');
          if(p2&&!p2.dataset.loaded){
            p2.dataset.loaded='1';
            loadMushafPageQCF(p2,pages.start+1).then(function(){
              setTimeout(trimToTargetSurah,100);
            }).catch(function(){_mushafPageErr(p2);});
          }
        },150);
      }).catch(function(){_mushafPageErr(firstPage);});
    }

    // Lazy-load the rest with a large preload margin
    var capturedSurah=targetSurah;
    _mushafLazyObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var pageEl=entry.target;
        if(pageEl.dataset.loaded)return;
        pageEl.dataset.loaded='1';
        _mushafLazyObs&&_mushafLazyObs.unobserve(pageEl);
        (function(pe){
          if(S.surah!==capturedSurah)return; // surah changed, discard
          loadMushafPageQCF(pe,parseInt(pe.dataset.page)).then(function(){
            if(S.surah!==capturedSurah)return;
            trimPageToSurah(pe);
          }).catch(function(){_mushafPageErr(pe);});
        })(pageEl);
      });
    },{root:view,rootMargin:'1200px 0px'});
    view.querySelectorAll('.mushaf-text-page:not([data-loaded])').forEach(function(p){_mushafLazyObs.observe(p);});
    updateMushafProgress(view);

    // Prev / Next surah nav at end of mushaf pages
    if(S.surah>1||S.surah<114){
      var mushafNav=el('div','mushaf-surah-nav');
      function mushafGoSurah(num){
        S.surah=num;
        var ns=SURAHS[num-1];
        if(ns)$('readerName').textContent=ns.en+' - '+ns.ar;
        try{localStorage.setItem('lastRead',JSON.stringify({surah:num,ayah:1}));}catch(e){}
        var mv=$('mushafView');if(mv){clear(mv);renderMushafView();}
      }
      if(S.surah>1){
        var prevBtn=el('button','mushaf-surah-nav-btn');
        prevBtn.appendChild(icon('fas fa-arrow-right'));
        prevBtn.appendChild(document.createTextNode('  '+(SURAHS[S.surah-2]||{}).n||''));
        on(prevBtn,'click',function(){mushafGoSurah(S.surah-1);});
        mushafNav.appendChild(prevBtn);
      }
      if(S.surah<114){
        var nextBtn2=el('button','mushaf-surah-nav-btn');
        nextBtn2.appendChild(document.createTextNode((SURAHS[S.surah]||{}).n+'  '));
        nextBtn2.appendChild(icon('fas fa-arrow-left'));
        on(nextBtn2,'click',function(){mushafGoSurah(S.surah+1);});
        mushafNav.appendChild(nextBtn2);
      }
      view.appendChild(mushafNav);
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

function loadMushafPageQCF(pageEl,pageNum){
  var font=S.mushafFont||'qcf1';
  if(font==='qcf1')injectQCFFont(pageNum);
  else if(font==='qcf2')injectQCFV2Font(pageNum);
  else if(font==='qcf4')injectQCFV4Font(pageNum);
  var pf=_getPageFields();

  return getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId).then(function(json){
    var verses=json.verses||[];
    if(!verses.length){clear(pageEl);pageEl.appendChild(el('div','mushaf-page-ph','—'));return;}

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
      banner.textContent=s?s.n:('سورة '+sn);
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
      var lineWords={};var lineVerse={};var lineOrder=[];var lineStartsSurah={};var lineAllVerses={};

      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        var isFirst=(vn===1);var markedLine=false;
        (verse.words||[]).forEach(function(w){
          if(!w[codeField])return;
          var ln=w.line_number||0;
          if(!lineWords[ln]){lineWords[ln]=[];lineOrder.push(ln);}
          if(!lineVerse[ln])lineVerse[ln]={vn:vn,sn:sn};
          // Track every verse that has words on this line (for precise highlight)
          if(!lineAllVerses[ln])lineAllVerses[ln]=[];
          var lav=lineAllVerses[ln];
          if(!lav.length||lav[lav.length-1].vn!==vn)lav.push({vn:vn,sn:sn});
          if(isFirst&&!markedLine&&!lineStartsSurah[ln]){markedLine=true;lineStartsSurah[ln]={surahNum:sn};}
          lineWords[ln].push(w[codeField]);
        });
      });

      lineOrder.sort(function(a,b){return a-b;});
      lineOrder.forEach(function(ln){
        var sc=lineStartsSurah[ln];
        if(sc)addSurahHeader(sc.surahNum);
        var lineEl=el('div','mushaf-qcf-line');
        lineEl.style.fontFamily=fontFam;
        lineEl.textContent=lineWords[ln].join('');
        (function(lv,le,avns){
          if(!lv)return;
          le.dataset.verse=String(lv.vn);
          le.dataset.surah=String(lv.sn);
          le.dataset.verses=avns.join(',');
          // Register every verse on this line in the JS highlight map
          avns.forEach(function(vn){
            var k=String(lv.sn)+':'+String(vn);
            if(!window._mushafVerseElements[k])window._mushafVerseElements[k]=[];
            window._mushafVerseElements[k].push(le);
          });
          // Tap → show tafsir
          on(le,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(lv.vn,lv.sn);});
        })(lineVerse[ln],lineEl,(lineAllVerses[ln]||[{vn:(lineVerse[ln]||{}).vn}]).map(function(v){return v.vn;}));
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
    var svn=verses.filter(function(v){
      var sn=Number(v.surah_number)||parseInt((v.verse_key||'0:0').split(':')[0]);
      return sn===S.surah;
    }).map(function(v){return Number(v.verse_number);});
    pageEl.dataset.verses=JSON.stringify(svn);

    // Prefetch adjacent pages for zero-delay scroll
    var pf2=_getPageFields();
    var maxP=parseInt(pageEl.parentNode&&pageEl.parentNode.lastElementChild&&pageEl.parentNode.lastElementChild.dataset.page)||pageNum+5;
    if(pageNum+1<=maxP){
      if(font==='qcf1')injectQCFFont(pageNum+1);
      else if(font==='qcf2')injectQCFV2Font(pageNum+1);
      else if(font==='qcf4')injectQCFV4Font(pageNum+1);
      getMushafPageData(pageNum+1,pf2.fields,pf2.cache,pf2.mushafId).catch(function(){});
    }
    if(pageNum+2<=maxP){
      if(font==='qcf1')injectQCFFont(pageNum+2);
      else if(font==='qcf2')injectQCFV2Font(pageNum+2);
      else if(font==='qcf4')injectQCFV4Font(pageNum+2);
      getMushafPageData(pageNum+2,pf2.fields,pf2.cache,pf2.mushafId).catch(function(){});
    }

    // Wait for QCF font to finish downloading before revealing content.
    // Spinner stays visible until font is ready — prevents garbled-glyph flash.
    var showContent=function(){
      clear(pageEl);
      pageEl.appendChild(frag);
      // If audio is playing for this surah, restore highlight on newly-loaded page
      if(S.mushafMode&&S.audio.playing&&S.audio.surah===S.surah){
        var _hk=String(S.audio.surah)+':'+String(S.audio.ayah);
        (window._mushafVerseElements[_hk]||[]).forEach(function(l){
          if(pageEl.contains(l))l.classList.add('mushaf-line--playing');
        });
      }
    };
    var fontFamName=(font==='qcf1')?('QCFv1p'+pageNum):(font==='qcf2'?'QCFv2p'+pageNum:(font==='qcf4'?'QCFv4p'+pageNum:''));
    if(fontFamName&&document.fonts&&document.fonts.load){
      return document.fonts.load('1em "'+fontFamName+'"').catch(function(){return[];}).then(function(faces){
        if(!faces||!faces.length){
          clear(pageEl);
          var fe=el('div','mushaf-font-offline');
          fe.appendChild(el('div','mushaf-font-offline-msg',t('mushaf.font_offline')||'Page font not available offline.'));
          var fb=el('button','mushaf-offline-switch-btn',t('mushaf.switch_to_reading')||'Switch to reading mode');
          on(fb,'click',function(){App.toggleMushafMode();});
          fe.appendChild(fb);
          pageEl.appendChild(fe);
          return;
        }
        showContent();
      });
    }
    showContent();
  }).catch(function(){
    clear(pageEl);
    pageEl.appendChild(el('div','mushaf-page-ph','✕'));
  });
}

/* ===== RENDER AYAHS ===== */
function renderAyahs(surahNum,scrollTo){
  var list=$('ayahList');
  clear(list);
  list.scrollTop=0; // always reset — prevents stale offset from prior view
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
      var sp=el('div','prayer-status');sp.textContent=t('prayer.loading')||'چاوبیرکرن...';
      list.appendChild(sp);
      fetch('https://api.quran.com/api/v4/verses/by_chapter/'+surahNum+'?words=true&word_fields=code_v2,page_number,char_type_name&per_page=300'+(_isV4?'&mushaf=19':''))
        .then(function(r){return r.json();})
        .then(function(d){
          var vs=d.verses||[];
          S.glyphVerses[surahNum]=vs;
          try{localStorage.setItem(_gkey,JSON.stringify(vs));}catch(e){}
          if(S.surah!==surahNum)return; // user navigated away while fetching — discard
          renderAyahs(surahNum,scrollTo);
        })
        .catch(function(){
          clear(list);
          var e2=el('div','prayer-status prayer-error');e2.textContent=t('prayer.error')||'هەلە — دووباره هەوڵبدە';list.appendChild(e2);
        });
      return;
    }
  }

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
  hdr.appendChild(el('div','surah-reader-name no-kurdish-convert','surah'+String(surahNum).padStart(3,'0')));
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
  var surahId=S.surah;
  var s=SURAHS[(surahId||1)-1];
  var total=s?s.a:0;
  var progressEl=document.querySelector('.sticky-progress');
  var saveTimer=null;var destroyed=false;
  // No goal — hide bar but still track scroll position for resume
  if(!getGoal()){
    if(progressEl)progressEl.style.display='none';
    var _lrTimer=null;
    var onMushafScrollNoGoal=function(){
      if(destroyed)return;
      clearTimeout(_lrTimer);
      _lrTimer=setTimeout(function(){
        if(destroyed||S.surah!==surahId)return;
        var pages=view.querySelectorAll('.mushaf-text-page');
        var vh=window.innerHeight;
        for(var i=0;i<pages.length;i++){
          var r=pages[i].getBoundingClientRect();
          if(r.bottom>0&&r.top<vh){
            var vns=[];try{vns=JSON.parse(pages[i].dataset.verses||'[]');}catch(e){}
            if(vns.length){try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:vns[0]}));}catch(e){}}
            break;
          }
        }
      },500);
    };
    window.addEventListener('scroll',onMushafScrollNoGoal,{passive:true,capture:true});
    view.addEventListener('scroll',onMushafScrollNoGoal,{passive:true});
    _progressCleanup=function(){
      destroyed=true;clearTimeout(_lrTimer);
      window.removeEventListener('scroll',onMushafScrollNoGoal,{capture:true});
      view.removeEventListener('scroll',onMushafScrollNoGoal);
    };
    return;
  }

  if(!total){_progressCleanup=function(){destroyed=true;};return;}
  if(progressEl)progressEl.style.display='';

  var seenAyahs=new Set();
  var markedPages=new Set(); // pages already dwelt — separate from ayah set to avoid inflating count
  try{JSON.parse(localStorage.getItem('surah_progress_'+surahId)||'[]')
    .forEach(function(n){if(typeof n==='number'&&n>=1&&n<=total)seenAyahs.add(n);});}catch(e){}

  function updateHeader(){
    if(destroyed||S.surah!==surahId)return;
    var count=Math.min(seenAyahs.size,total);
    var max=0;seenAyahs.forEach(function(n){if(n>max)max=n;});
    if(max>0){try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:max}));}catch(e){}}
    var pct=Math.min(100,Math.round(count/total*100));
    $('readerProgressFill').style.width=pct+'%';
    $('readerAyahLabel').textContent=count+'/'+total+' '+t('reader.ayah');
    $('readerPct').textContent=pct+'%';
  }
  function markSeen(idx){
    idx=Number(idx);
    if(!idx||isNaN(idx)||seenAyahs.has(idx))return false;
    seenAyahs.add(idx);
    trackVerse(surahId,idx);
    return true;
  }
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      if(destroyed||S.surah!==surahId)return;
      var valid=[];seenAyahs.forEach(function(n){if(n>=1&&n<=total)valid.push(n);});
      try{localStorage.setItem('surah_progress_'+surahId,JSON.stringify(valid));}catch(e){}
      debouncedSync();
    },400);
  }
  function markPage(pageEl){
    try{
      var vns=JSON.parse(pageEl.dataset.verses||'[]');
      var changed=false;
      vns.forEach(function(vn){if(markSeen(vn))changed=true;});
      if(changed){updateHeader();scheduleSave();}
    }catch(e){}
  }

  if(seenAyahs.size>0)updateHeader();

  // Dwell tracking: watch the most-visible page; mark it after user has been on it 2.5s
  var dwellTimer=null;var dwellPage=null;var retryTimer=null;

  function visibleRatio(pageEl){
    var pr=pageEl.getBoundingClientRect();
    var top=Math.max(pr.top,0);
    var bot=Math.min(pr.bottom,window.innerHeight);
    return Math.max(0,bot-top)/Math.max(1,window.innerHeight);
  }

  function checkVisible(){
    if(destroyed||S.surah!==surahId)return;
    var pages=view.querySelectorAll('.mushaf-text-page');
    var bestRatio=0;var bestPage=null;
    pages.forEach(function(pageEl){
      var r=visibleRatio(pageEl);
      if(r>bestRatio){bestRatio=r;bestPage=pageEl;}
    });
    var bestPn=bestPage?bestPage.dataset.page||'0':null;
    // Cancel current dwell if the dominant page changed or dropped below threshold
    if(dwellPage&&(dwellPage!==bestPage||bestRatio<0.3)){
      clearTimeout(dwellTimer);dwellTimer=null;dwellPage=null;
    }
    // Start a new dwell only when: a clear page dominates (≥35%), no dwell running, not already marked
    if(bestPage&&bestRatio>=0.35&&!dwellTimer&&!markedPages.has(bestPn)){
      dwellPage=bestPage;
      dwellTimer=setTimeout(function(){
        dwellTimer=null;dwellPage=null;
        if(destroyed||S.surah!==surahId)return;
        markedPages.add(bestPn); // lock out re-dwell for this page
        if(bestPage.dataset.verses){
          markPage(bestPage);
        } else {
          // Verses still loading — retry once in 2s (retryTimer tracked for cleanup)
          retryTimer=setTimeout(function(){
            retryTimer=null;
            if(!destroyed&&S.surah===surahId&&bestPage.dataset.verses)markPage(bestPage);
          },2000);
        }
      },2500);
    }
  }

  var scrollTick=null;
  var onScroll=function(){
    if(scrollTick)return;
    scrollTick=setTimeout(function(){scrollTick=null;checkVisible();},150);
  };
  window.addEventListener('scroll',onScroll,{passive:true,capture:true});
  view.addEventListener('scroll',onScroll,{passive:true});

  var initTimer=setTimeout(checkVisible,500);
  var periodic=setInterval(checkVisible,3000);

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
      renderReaderSettings();
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
  clear(list);
  if(S.sidebarMode==='surah'){
    SURAHS.forEach(function(s){
      var item=el('div','sidebar-item'+(S.surah===s.n?' on':''));
      item.appendChild(el('div','sidebar-item-num',String(s.n)));
      var txt=el('span','',s.en+' - '+s.ar);
      item.appendChild(txt);
      on(item,'click',function(){App.closeSidebar();App.openSurah(s.n)});
      list.appendChild(item);
    });
  } else {
    Object.keys(JUZS).forEach(function(j){
      var item=el('div','sidebar-item');
      item.appendChild(el('div','sidebar-item-num',j));
      var sn=SURAHS[JUZS[j]-1];
      item.appendChild(el('span','',t('sidebar.juz_num',{num:j})+(sn?' - '+sn.en:'')));
      on(item,'click',function(){App.closeSidebar();App.openSurah(JUZS[j])});
      list.appendChild(item);
    });
  }
}

/* ===== MUSHAF PLAY BUTTON ===== */
function updateMushafPlayBtn(){
  var btn=$('mushafPlayBtn');
  if(!btn)return;
  var isPlaying=S.audio.playing&&S.audio.surah===S.surah;
  btn.innerHTML='';
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

/* ===== MUSHAF AUDIO HIGHLIGHT ===== */
var _mushafPlayingEls=[]; // cached — avoids querySelectorAll on every ayah change
function updateMushafHighlight(surah,ayah){
  var view=$('mushafView');
  if(!view)return;
  // Clear previous playing lines directly — no DOM scan needed
  _mushafPlayingEls.forEach(function(e){e.classList.remove('mushaf-line--playing');});
  _mushafPlayingEls=[];
  if(!surah||!ayah)return;
  var key=String(surah)+':'+String(ayah);
  var els=window._mushafVerseElements[key]||[];
  var first=null;
  els.forEach(function(l){
    if(view.contains(l)){l.classList.add('mushaf-line--playing');_mushafPlayingEls.push(l);if(!first)first=l;}
  });
  if(first)first.scrollIntoView({behavior:'smooth',block:'center'});
}

/* ===== AUDIO ===== */
function scrollToAyah(ayahNum){
  var list=$('ayahList');
  if(!list)return;
  var cards=list.querySelectorAll('.ayah-card');
  if(cards[ayahNum-1]){
    cards[ayahNum-1].scrollIntoView({behavior:'smooth',block:'center'});
    // Highlight
    cards.forEach(function(c){c.classList.remove('playing')});
    cards[ayahNum-1].classList.add('playing');
  }
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
  var url=audioUrl(surah,ayah);
  // Priority 1: user-downloaded offline copy (persistent Directory.Data — never evicted)
  // Priority 2: transparent LRU cache (Directory.Cache — may be evicted by OS)
  var localUri=(window.AudioDownloads&&AudioDownloads.getLocalUri(RECITER,surah,ayah))
              ||(window.AudioCache&&AudioCache.getLocalUri(RECITER,surah,ayah))||null;
  // Priority 2: prefetched blob (zero-gap in-memory)
  var src;
  var slot=_pfCache[url];
  if(localUri){
    // Serve from local file — WebView-accessible capacitor:// URI
    src=localUri;
    // Consume any in-flight prefetch slot to avoid wasted bandwidth
    if(slot){
      if(slot.xhr){slot.xhr.abort();}
      if(slot.blob){URL.revokeObjectURL(slot.blob);}
      delete _pfCache[url];
    }
    AudioCache.touchAccess(RECITER,surah,ayah);
    console.log('[Audio] local-cache hit — reciter:'+RECITER+' surah:'+surah+' ayah:'+ayah);
  } else if(slot&&slot.blob){
    // Serve from in-memory prefetch blob
    src=slot.blob;
    if(_blobToRevoke)URL.revokeObjectURL(_blobToRevoke);
    _blobToRevoke=src;
    delete _pfCache[url]; // blob now owned by audio element
    console.log('[Audio] prefetch-blob hit — reciter:'+RECITER+' surah:'+surah+' ayah:'+ayah);
  } else {
    // Fall through to remote streaming
    src=url;
    // Cancel any in-flight XHR for this url since we'll stream directly
    if(slot&&slot.xhr){slot.xhr.abort();delete _pfCache[url];}
    // NOTE: Do NOT fire a parallel fetch here — it would compete with the audio stream
    // and cause MEDIA_ERR_NETWORK (code 2) on constrained mobile connections.
    // The prefetchAyahBlob system will cache upcoming ayahs; this one will be cached
    // the next time it enters the prefetch lookahead window.
    console.log('[Audio] remote stream — reciter:'+RECITER+' surah:'+surah+' ayah:'+ayah+' url:'+url);
  }
  S.audio.surah=surah;S.audio.ayah=ayah;
  S.audio.el.src=src;
  S.audio.el.playbackRate=S.audio.speed;
  S.audio.el.play().catch(function(){});
  S.audio.playing=true;
  updateReaderPlayState(surah,ayah,true);
  showAudioBar();
  // Auto-scroll if same surah is open and scroll-follows-audio is on
  if(S.surah===surah&&S.scrollFollowsAudio)scrollToAyah(ayah);
  // Highlight current line in mushaf mode
  if(S.mushafMode&&S.surah===surah)updateMushafHighlight(surah,ayah);
  // Update mushaf play button icon
  updateMushafPlayBtn();
  // Start prefetching next ayah in background
  prefetchAyahBlob(surah,ayah);
  // Start persistent background caching for the rest of this surah
  if(window.AudioCache)AudioCache.startSurahBg(surah,ayah,RECITER);
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

function showAudioBar(){
  var bar=$('audioBar');
  bar.classList.add('on');
  var s=SURAHS[S.audio.surah-1];
  $('audioTitle').textContent=s?s.ar+' - '+t('reader.ayah')+' '+S.audio.ayah:'';
  $('audioSub').textContent=getReciterName();
  setAudioIcon(S.audio.playing?'pause':'play');
  updateAudioBarAvatar();
  if(typeof _fpOpen!=='undefined'&&_fpOpen)syncFullPlayer();
}

App.audioToggle=function(){
  haptic([8]);
  if(S.audio.playing){S.audio.el.pause();S.audio.playing=false;setAudioIcon('play');updateReaderPlayState(0,0,false);}
  else{S.audio.el.play().catch(function(){});S.audio.playing=true;setAudioIcon('pause');updateReaderPlayState(S.audio.surah,S.audio.ayah,true);}
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
  else if(S.autoAdvance&&S.audio.surah<114){playAyah(S.audio.surah+1,1)}
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
  S.audio.playing=false;S.audio.surah=0;S.audio.ayah=0;
  S.audio.currentRepeat=0;
  clearPrefetch();
  if(window.AudioCache)AudioCache.cancelBg();
  $('audioBar').classList.remove('on');
  updateReaderPlayState(0,0,false);
  var cards=document.querySelectorAll('.ayah-card.playing');
  cards.forEach(function(c){c.classList.remove('playing')});
  updateMushafHighlight(0,0);
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

  // Font Size stepper
  body.appendChild(el('div','ms-section-label',t('qs.font_size_label')));
  var fsVal=el('span','stepper-val',S.mushafFontSize+'px');
  var fsMBtn,fsPBtn;
  function setFsSize(v){v=Math.max(14,Math.min(50,Math.round(v)));S.mushafFontSize=v;fsVal.textContent=v+'px';document.documentElement.style.setProperty('--mushaf-size',v+'px');localStorage.setItem('mushafFontSize_'+S.mushafFont,String(v));if(fsMBtn)fsMBtn.disabled=(v<=14);if(fsPBtn)fsPBtn.disabled=(v>=50);}
  var fsCtrl=el('div','setting-stepper');
  fsMBtn=el('button','stepper-btn','-');fsPBtn=el('button','stepper-btn','+');
  on(fsMBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize-1);});
  on(fsPBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize+1);});
  fsMBtn.disabled=(S.mushafFontSize<=14);fsPBtn.disabled=(S.mushafFontSize>=50);
  fsCtrl.appendChild(fsMBtn);fsCtrl.appendChild(fsVal);fsCtrl.appendChild(fsPBtn);
  body.appendChild(fsCtrl);

  // Line Height stepper
  body.appendChild(el('div','ms-section-label',t('qs.line_spacing_label')));
  var lhVal=el('span','stepper-val',S.mushafLineH.toFixed(1)+'×');
  var lhCtrl=el('div','setting-stepper');
  var lhMBtn=el('button','stepper-btn','-');var lhPBtn=el('button','stepper-btn','+');
  (function(){
    var min=1.8,max=3.5,step=0.1;
    function updLh(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;S.mushafLineH=v;lhVal.textContent=v.toFixed(1)+'×';document.documentElement.style.setProperty('--mushaf-lh',String(v));localStorage.setItem('mushafLineH',String(v));lhMBtn.disabled=(v<=min);lhPBtn.disabled=(v>=max);}
    on(lhMBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH-step).toFixed(1)));});
    on(lhPBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH+step).toFixed(1)));});
    lhMBtn.disabled=(S.mushafLineH<=min);lhPBtn.disabled=(S.mushafLineH>=max);
  })();
  lhCtrl.appendChild(lhMBtn);lhCtrl.appendChild(lhVal);lhCtrl.appendChild(lhPBtn);
  body.appendChild(lhCtrl);

  // Font Style segmented
  body.appendChild(el('div','ms-section-label',t('settings.font_style')||'ستایلی فونت'));
  var fonts=[{id:'qcf4',label:t('settings.font_tajwidi')||'تاجویدی V4'},{id:'qcf1',label:t('settings.font_madani_classic')||'مەدینی کلاسیک'},{id:'qcf2',label:t('settings.font_madani_new')||'مەدینی نوێ'}];
  var seg=el('div','ms-seg');
  fonts.forEach(function(f){
    var btn=el('button','ms-seg-btn'+(S.mushafFont===f.id?' on':''),f.label);
    on(btn,'click',function(){
      if(S.mushafFont===f.id)return;
      localStorage.setItem('mushafFontSize_'+S.mushafFont,String(S.mushafFontSize));
      S.mushafFont=f.id;
      localStorage.setItem('mushafFont',f.id);
      var newSize=parseInt(localStorage.getItem('mushafFontSize_'+f.id))||(f.id==='qcf1'?22:20);// qcf2/qcf4 default 20
      S.mushafFontSize=newSize;
      document.documentElement.style.setProperty('--mushaf-size',newSize+'px');
      setFsSize(newSize);
      seg.querySelectorAll('.ms-seg-btn').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');
      dismiss();
      setTimeout(function(){
        var mv=$('mushafView');if(mv)clear(mv);
        renderMushafView();
      },280);
    });
    seg.appendChild(btn);
  });
  body.appendChild(seg);

  pane.appendChild(body);ov.appendChild(pane);
  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== MUSHAF TAFSIR SHEET ===== */
App.showMushafVerseTafsir=function(vn,sn){
  var existing=$('mushafTafsirSheet');
  if(existing)existing.parentNode.removeChild(existing);

  // Get tafsir text — read from canonical tafsirData (works across surah boundaries in mushaf)
  var txt=getAyahTafsirText(sn,vn);

  var ov=el('div','mushaf-tafsir-ov');
  ov.id='mushafTafsirSheet';
  var pane=el('div','mushaf-tafsir-pane');

  function dismiss(){
    pane.classList.remove('on');
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);
  }

  // Header: surah name + verse number + play + close
  var hdr=el('div','mushaf-tafsir-hdr');
  var s=SURAHS[(sn||S.surah||1)-1];
  var titleParts=(s?s.n:'')+' — '+toArabicNum(vn);
  hdr.appendChild(el('span','mushaf-tafsir-title',titleParts));
  var closeBtn=el('button','mushaf-tafsir-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',dismiss);
  hdr.appendChild(closeBtn);
  pane.appendChild(hdr);

  // Body: tafsir text
  var body=el('div','mushaf-tafsir-body');
  var txtDiv=el('div',txt?'mushaf-tafsir-txt':'mushaf-tafsir-empty');
  txtDiv.textContent=txt||t('reader.tafsir_empty');
  body.appendChild(txtDiv);
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
      renderAudioSettings();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      else if(S.surah)prefetchAyahBlob(S.surah,(S.audio.ayah||1)-1);
      else showAudioBar();
      toast(r.name);
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
    haptic([20]);
    toast(t('toast.bookmark_added'));
    return true;
  }
}

function renderBookmarks(){
  var bms=getBookmarks();

  // Stats
  var stats=$('bmStats');
  clear(stats);
  var row=el('div','stats-row');
  [{v:bms.length,l:t('bookmarks.total')},{v:new Set(bms.map(function(b){return b.surah})).size,l:t('bookmarks.surahs')},{v:bms.filter(function(b){return b.note}).length,l:t('bookmarks.notes')}].forEach(function(s){
    var card=el('div','stat-card');
    card.appendChild(el('div','stat-val',String(s.v)));
    card.appendChild(el('div','stat-lbl',s.l));
    row.appendChild(card);
  });
  stats.appendChild(row);

  // Controls
  var ctrls=$('bmControls');
  clear(ctrls);
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
    ctrls.appendChild(ctrlDiv);
  }

  renderBmList(bms);
}

function getAyahArabicText(surah,ayah){
  if(!S.quranData)return'';
  var sd=S.quranData[String(surah)];if(!sd)return'';
  var vv=sd.verses||sd;if(!Array.isArray(vv))return'';
  var v=vv[ayah-1];return v?(v.text||v):'';
}

function renderBmList(bms){
  var list=$('bmList');
  clear(list);

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
    list.appendChild(empty);
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
      var note=prompt(t('bookmarks.note_prompt'),bm.note||'');
      if(note!==null){bm.note=note;saveBookmarks(getBookmarks().map(function(b){return b.surah===bm.surah&&b.ayah===bm.ayah?bm:b}));renderBookmarks()}
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
    list.appendChild(card);
  });
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
function saveReadLog(l){localStorage.setItem('readLog',JSON.stringify(l))}

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
  // Haptic exactly once on goal completion
  var g=getGoal();
  if(g&&l[today]===g.pages){haptic([50]);}
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
  clear(content);
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
    content.appendChild(ng);
    return;
  }

  var log=getReadLog();
  var streak=calcStreak(log);
  var bestStreak=calcBestStreak(log);
  var totalRead=calcTotalRead(log);
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

  // Week dots with today's live progress
  var week=el('div','week-grid');
  var dayNames=[t('goals.days.0'),t('goals.days.1'),t('goals.days.2'),t('goals.days.3'),t('goals.days.4'),t('goals.days.5'),t('goals.days.6')];
  for(var d=0;d<7;d++){
    var dt=new Date(today);
    dt.setDate(today.getDate()-(6-d));
    var dkey=dateKey(dt);
    var day=el('div','week-day');
    day.style.animationDelay=(d*30)+'ms';
    var dot=el('div','week-dot');
    if(d===6){
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
    day.appendChild(el('div','week-day-label',dayNames[(dt.getDay()+1)%7]));
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
  content.appendChild(hero);

  // Today's progress card with encouragement
  var prgSec=el('div','progress-section');
  var prgHdr=el('div','progress-hdr');
  prgHdr.appendChild(el('span','',t('reader.ayah_count',{count:todayRead,total:target})));
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
  // Auto-track note (first 7 days only)
  var daysSinceCreated=goal.created?Math.floor((Date.now()-goal.created)/86400000):99;
  if(daysSinceCreated<=7){
    var autoNote=el('div','auto-note');
    autoNote.appendChild(icon('fas fa-wand-magic-sparkles'));
    autoNote.appendChild(document.createTextNode(t('goals.progress.auto_track')));
    prgSec.appendChild(autoNote);
  }
  content.appendChild(prgSec);
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
  content.appendChild(gc);

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
    content.appendChild(sessCard);
  }

  // Month calendar section
  var calTitle=el('div','section-title');
  calTitle.appendChild(document.createTextNode(t('goals.heatmap.title')));
  content.appendChild(calTitle);

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
  var dayHdrs=['ی','د','س','چ','پ','ئ','ش'];
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
  content.appendChild(calSec);

  // Delete goal with warning
  var delWrap=el('div','goal-delete-section');
  delWrap.appendChild(el('div','goal-delete-warn',t('goals.delete.warn')));
  var delGoal=el('button','btn-danger');
  delGoal.appendChild(icon('fas fa-trash'));
  delGoal.appendChild(document.createTextNode(' '+t('goals.delete.button')));
  on(delGoal,'click',function(){
    $('goalConfirmOverlay').classList.add('on');
    haptic([20]);
  });
  delWrap.appendChild(delGoal);
  content.appendChild(delWrap);
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

// ── Debug helpers (temporary) ──────────────────────────────────────────
window.testAyahWidgetPush=function(){
  console.log('[WidgetAyah] testAyahWidgetPush: writing known-good payload');
  var payload=JSON.stringify({
    chapter:1,verse:1,
    arabic:'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
    tafsir:'بسمەلە — سوورەتا فاتیحەیێ',
    surahName:'الفاتحة',
    showTafsir:true,showReference:true
  });
  _sharedPrefsSet('widgetAyahData',payload)
    .then(function(){console.log('[WidgetAyah] testAyahWidgetPush: SUCCESS ✓');alert('Ayah widget write OK');})
    .catch(function(e){console.error('[WidgetAyah] testAyahWidgetPush: FAILED',e);alert('Ayah widget write FAILED: '+e);});
};
window.testGoalWidgetPush=function(){
  console.log('[WidgetGoal] testGoalWidgetPush: writing known-good payload');
  var payload=JSON.stringify({
    todayCount:5,dailyGoal:10,currentStreak:3,bestStreak:7,
    weeklyData:[2,4,10,8,5,10,5],todayDate:dateKey(new Date())
  });
  _sharedPrefsSet('widgetGoalData',payload)
    .then(function(){console.log('[WidgetGoal] testGoalWidgetPush: SUCCESS ✓');alert('Goal widget write OK');})
    .catch(function(e){console.error('[WidgetGoal] testGoalWidgetPush: FAILED',e);alert('Goal widget write FAILED: '+e);});
};

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
  // Read from kurdish_translations first (where admin saves), fall back to site_settings
  function _ft(key,fb){var v=window.t&&window.t(key);return(v&&v!==key)?v:(fb||'');}

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

    // ── 4. Journey ───────────────────────────────
    var cfoJrn=el('div','cfo-section');
    cfoJrn.appendChild(el('div','cab-sec-label',_ft('founder_journey_label',ss.founder_journey_label)||'گەشت'));
    cfoJrn.appendChild(el('div','cab-sec-title',_ft('founder_journey_title',ss.founder_journey_title)||'ڕێکا تەفسیر کورد'));
    var _jIntro=_ft('founder_journey_desc',ss.founder_journey_intro);
    if(_jIntro)cfoJrn.appendChild(el('div','cfo-para',_jIntro));
    var JOURNEY=[
      {t:_ft('founder_timeline1_title',ss.founder_j1_title)||'دەستپێکا هزرێ',d:_ft('founder_timeline1_desc',ss.founder_j1_desc)||'ب تێبینیکرنا کێمییا ناڤەڕۆکا ئیسلامی ب زمانێ کوردی، هزرا دروستکرنا پلاتفۆرمەکێ بۆ من هات، کو ناڤەڕۆکا قورئانێ ب شێوازەکێ مۆدێرن پێشکێش بکەت.'},
      {t:_ft('founder_timeline2_title',ss.founder_j2_title)||'دروستکرنا ناڤەڕۆکا ڤیدیویی',d:_ft('founder_timeline2_desc',ss.founder_j2_desc)||'دەستپێکرنا دروستکرنا ڤیدیویێن ئیسلامی یێن کورت بۆ تۆڕێن جڤاکی وەک ئینستاگرام و تیکتۆک، ب شێوازەکێ بالکێش کو بگەهیتە نەوەیێ نوی یێ کوردان.'},
      {t:_ft('founder_timeline3_title',ss.founder_j3_title)||'دامەزراندنا پلاتفۆرمێ',d:_ft('founder_timeline3_desc',ss.founder_j3_desc)||'دروستکرنا مالپەڕەکا تەمام بۆ خواندنا قورئانا پیرۆز ب تەفسیرا ساناهی و وەرگێڕانا کوردی، ب تایبەتمەندیێن مۆدێرن وەک شوێنکەفتنا خواندنێ و نیشانەکرن.'},
      {t:_ft('founder_timeline4_title',ss.founder_j4_title)||'گەهشتن ب ملیۆنان بینەران',d:_ft('founder_timeline4_desc',ss.founder_j4_desc)||'ب ڕێکا ئینستاگرام، تیکتۆک و یوتوب گەهشتینە زێدەتر ژ ٢٥ ملیۆن بینەر و ٦٥ هزار فۆڵۆوەران. ئەڤ ژمارە نیشانا پێدڤییا کوردانە بۆ ناڤەڕۆکەکا ئیسلامی زمانێ وان بخو.'}
    ];
    var tl=el('div','cfo-timeline');
    JOURNEY.forEach(function(j){
      var item=el('div','cfo-tl-item');
      item.appendChild(el('div','cfo-tl-dot'));
      var tb=document.createElement('div');
      tb.appendChild(el('div','cfo-tl-title',j.t));
      tb.appendChild(el('div','cfo-tl-desc',j.d));
      item.appendChild(tb);tl.appendChild(item);
    });
    cfoJrn.appendChild(tl);body.appendChild(cfoJrn);

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
  }else{
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

    // ── 6. Tafsir source ──────────────────────────
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
}

function mkBtnRow(labelText,btnLabel,btnIcon,onClick,danger){
  var row=el('div','setting-row s-row');
  row.appendChild(el('div','setting-label',labelText));
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

function renderSettings(){
  var content=$('settingsContent');
  clear(content);

  // ── Profile hero card ────────────────────────
  var profile=el('div','profile-card');
  if(S.user){
    // Avatar
    var avatarEl;
    if(S.user.avatar){
      avatarEl=document.createElement('img');
      avatarEl.className='profile-avatar-img';
      avatarEl.src=S.user.avatar;avatarEl.alt='';
      avatarEl.referrerPolicy='no-referrer';avatarEl.crossOrigin='anonymous';
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
    chevRow.appendChild(document.createTextNode(t('profile.view_profile')||'پرۆفایل ببینە'));
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
  content.appendChild(profile);

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
  content.appendChild(statsCard);

  // ── Appearance ───────────────────────────────
  var g1=el('div','settings-group');
  g1.appendChild(el('div','settings-group-title',t('settings.appearance')));
  var themes=[
    {id:'light', name:t('settings.theme_light')||'ڕووناک',    sub:'Light',   bg:'#fafafa', surface:'#ffffff', accent:'#000000'},
    {id:'dark',  name:t('settings.theme_dark')||'تاریکی',    sub:'Dark',    bg:'#0a0a0a', surface:'#161616', accent:'#ffffff'},
    {id:'sakina',name:t('settings.theme_sakina')||'سکینە',   sub:'Emerald', bg:'#0c1c12', surface:'#112318', accent:'#c9a84c'},
    {id:'noor',  name:t('settings.theme_noor')||'نوور',       sub:'Parchment',bg:'#f4e8cc',surface:'#fdf4e3', accent:'#1a5c3a'}
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
    on(card,'click',function(){S.theme=th.id;applyTheme();haptic([10]);renderSettings()});
    tGrid.appendChild(card);
  });
  g1.appendChild(tGrid);
  g1.appendChild(mkToggleRow(t('qs.screen_lock'),S.keepAwake,function(){
    S.keepAwake=!S.keepAwake;
    localStorage.setItem('keepAwake',String(S.keepAwake));
    applyKeepAwake();renderSettings();
  }));
  content.appendChild(g1);

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
  g2.appendChild(mkSliderRow(t('settings.arabic_size'),S.arSize,1.0,3.5,0.1,
    function(v){S.arSize=v;applySizes();},
    function(v){localStorage.setItem('app_arSize',String(v));}
  ));
  g2.appendChild(mkSliderRow(t('settings.tafsir_size'),S.tfSize,0.5,2.0,0.1,
    function(v){S.tfSize=v;applySizes();},
    function(v){localStorage.setItem('app_tfSize',String(v));}
  ));
  g2.appendChild(mkSliderRow(t('qs.line_spacing'),S.lineH,1.4,3.5,0.1,
    function(v){S.lineH=v;applySizes();},
    function(v){localStorage.setItem('app_lineH',String(v));}
  ));
  content.appendChild(g2);

  // ── Audio ────────────────────────────────────
  var gAudio=el('div','settings-group');
  gAudio.appendChild(el('div','settings-group-title',t('audio.reciter')));
  // Reciter chips row
  var recRow=el('div','setting-row s-row setting-row--reciter');
  var recList=el('div','qs-reciter-list');
  recList.style.cssText='padding:4px 0 0;margin:0;';
  RECITERS.forEach(function(r){
    var chip=el('div','qs-reciter-chip'+(RECITER===r.id?' on':''));
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
      updateAudioBarAvatar();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      renderSettings();
    });
    recList.appendChild(chip);
  });
  recRow.appendChild(recList);
  gAudio.appendChild(recRow);
  gAudio.appendChild(mkToggleRow(t('settings.bg_audio'),S.bgAudio,function(){
    S.bgAudio=!S.bgAudio;
    localStorage.setItem('bgAudio',String(S.bgAudio));
    renderSettings();
  }));
  content.appendChild(gAudio);

  // ── Notifications & Haptics ──────────────────
  var g3=el('div','settings-group');
  g3.appendChild(el('div','settings-group-title',t('settings.notif_group')));
  // (10) Haptic feedback
  g3.appendChild(mkToggleRow(t('settings.haptic'),S.hapticFeedback,function(){
    S.hapticFeedback=!S.hapticFeedback;
    localStorage.setItem('hapticFeedback',String(S.hapticFeedback));
    haptic([20,30,20]);
    renderSettings();
  },t('settings.haptic_sub')));
  // (9) Daily reminder
  var remRow=el('div','setting-row s-row');
  var remLeft=el('div','setting-label-wrap');
  remLeft.appendChild(el('div','setting-label',t('settings.reminder')));
  remLeft.appendChild(el('div','setting-sub',t('settings.reminder_sub')));
  remRow.appendChild(remLeft);
  var remRight=el('div','reminder-right');
  if(S.dailyReminder){
    var timeInp=document.createElement('input');
    timeInp.type='time';timeInp.className='reminder-time-input';
    timeInp.value=S.reminderTime;
    on(timeInp,'change',function(){
      S.reminderTime=timeInp.value;
      localStorage.setItem('reminderTime',S.reminderTime);
      scheduleReminder(true,S.reminderTime);
    });
    remRight.appendChild(timeInp);
  }
  var remToggle=el('div','toggle'+(S.dailyReminder?' on':''));
  remToggle.appendChild(el('div','toggle-knob'));
  on(remToggle,'click',function(){
    S.dailyReminder=!S.dailyReminder;
    localStorage.setItem('dailyReminder',String(S.dailyReminder));
    scheduleReminder(S.dailyReminder,S.reminderTime);
    if(S.dailyReminder)window._showNotifSetupHint();
    renderSettings();
  });
  remRight.appendChild(remToggle);
  remRow.appendChild(remRight);
  g3.appendChild(remRow);

  // (10) Daily verse notification
  var dvRow=el('div','setting-row s-row');
  var dvLeft=el('div','setting-label-wrap');
  dvLeft.appendChild(el('div','setting-label',t('settings.daily_verse')));
  dvLeft.appendChild(el('div','setting-sub',t('settings.daily_verse_sub')));
  dvRow.appendChild(dvLeft);
  var dvRight=el('div','reminder-right');
  if(S.dailyVerse){
    var dvInp=document.createElement('input');
    dvInp.type='time';dvInp.className='reminder-time-input';
    dvInp.value=S.dailyVerseTime;
    on(dvInp,'change',function(){
      S.dailyVerseTime=dvInp.value;
      localStorage.setItem('dailyVerseTime',S.dailyVerseTime);
      scheduleDailyVerse(true,S.dailyVerseTime);
    });
    dvRight.appendChild(dvInp);
  }
  var dvToggle=el('div','toggle'+(S.dailyVerse?' on':''));
  dvToggle.appendChild(el('div','toggle-knob'));
  on(dvToggle,'click',function(){
    S.dailyVerse=!S.dailyVerse;
    localStorage.setItem('dailyVerse',String(S.dailyVerse));
    scheduleDailyVerse(S.dailyVerse,S.dailyVerseTime);
    if(S.dailyVerse)window._showNotifSetupHint();
    renderSettings();
  });
  dvRight.appendChild(dvToggle);
  dvRow.appendChild(dvRight);
  g3.appendChild(dvRow);

  content.appendChild(g3);

  // ── Data & Sync ──────────────────────────────
  var g4=el('div','settings-group');
  g4.appendChild(el('div','settings-group-title',t('settings.data')));
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
  }));
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
  content.appendChild(g4);

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
  content.appendChild(g5);

  // ── About Us ─────────────────────────────────
  var g6=el('div','settings-group');
  g6.appendChild(el('div','settings-group-title',t('settings.about')));

  function mkAboutNavRow(iconClass,label,sub,onClick){
    var row=el('div','about-nav-row s-row');
    var left=el('div','about-nav-left');
    var iconBox=el('div','about-nav-icon');iconBox.appendChild(icon(iconClass));
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
  g6.appendChild(mkAboutNavRow('fas fa-book-quran','تەفسیر کورد','دەربارەی پڕۆژە',function(){openAboutSheet('app');}));
  g6.appendChild(mkAboutNavRow('fas fa-user','سامان عبدالرحمن','دامەزرێنەر',function(){openAboutSheet('founder');}));
  content.appendChild(g6);

  // ── Social Links ─────────────────────────────
  var g7=el('div','settings-group');
  g7.appendChild(el('div','settings-group-title',t('settings.social')));
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
  var _socBtns={};
  SOCIAL_DEFS.forEach(function(def){
    var btn=el('button','soc-btn');
    btn.title=def.label;
    btn.appendChild(icon(def.icon));
    btn.style.display='none'; // hidden until URL loaded
    on(btn,'click',function(){_openLink(btn._url);haptic([8]);});
    _socBtns[def.key]=btn;
    socialBar.appendChild(btn);
  });
  g7.appendChild(socialBar);
  content.appendChild(g7);
  // Async: load social URLs
  getSiteSettings().then(function(ss){
    SOCIAL_DEFS.forEach(function(def){
      var url=ss[def.key]||'';
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
  var verEl=el('div','about-ver','v2.0.0');
  about.appendChild(verEl);
  if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App){
    Capacitor.Plugins.App.getInfo().then(function(info){
      if(info&&info.version)verEl.textContent='v'+info.version;
    }).catch(function(){});
  }
  about.appendChild(el('div','about-desc',t('settings.about_desc')));
  content.appendChild(about);
}

/* ===== SUPABASE AUTH & CLOUD SYNC ===== */
var SUPA_CONFIG_URL='https://tafsirkurd.com/config';

function initSupabase(cb){
  if(S.supabase){if(cb)cb();return}
  if(!window.supabase){console.warn('Supabase JS library not loaded');if(cb)cb();return}

  // Use cached config immediately (enables offline auth session recovery)
  var cachedCfg=null;
  try{cachedCfg=JSON.parse(localStorage.getItem('supa_cfg'))}catch(e){}
  if(cachedCfg&&cachedCfg.supabaseUrl&&cachedCfg.supabaseKey){
    S.supabase=window.supabase.createClient(cachedCfg.supabaseUrl,cachedCfg.supabaseKey);
    window._appSupabase=S.supabase;
    checkAuthSession();
    if(cb)cb();
  }

  // Update config from network in background
  fetch(SUPA_CONFIG_URL).then(function(r){
    if(!r.ok)throw new Error('Config HTTP '+r.status);
    return r.json();
  }).then(function(cfg){
    if(cfg.supabaseUrl&&cfg.supabaseKey){
      try{localStorage.setItem('supa_cfg',JSON.stringify(cfg))}catch(e){}
      if(!S.supabase){
        S.supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
        window._appSupabase=S.supabase;
        checkAuthSession();
        if(cb)cb();
      }
    }
  }).catch(function(e){
    console.warn('Supabase config fetch failed (offline?)');
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
  if(S.syncFailed)return{dot:'✕',txt:t('settings.sync_status_failed'),col:'#e53935'};
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
  'dailyReminder','reminderTime','dailyVerse','dailyVerseTime',
  'bestStreak',
  'mushafMode','readerFont','mushafFont','mushafLineH',
  'mushafFontSize_qcf1','mushafFontSize_qcf2','mushafFontSize_qcf4',
  'book_saved',
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
  // _syncTime set by caller so reads never pollute the timestamp
  return data;
}

function applySyncData(data){
  if(!data)return;
  Object.keys(data).forEach(function(k){
    if(k==='_syncTime')return;
    localStorage.setItem(k,data[k]);
  });
  S.theme=localStorage.getItem('theme')||'light';
  S.arSize=parseFloat(localStorage.getItem('app_arSize'))||2.0;
  S.tfSize=parseFloat(localStorage.getItem('app_tfSize'))||1.0;
  S.lineH=parseFloat(localStorage.getItem('app_lineH'))||2.2;
  S.showTafsir=localStorage.getItem('showTafsir')!=='false';
  S.bgAudio=localStorage.getItem('bgAudio')==='true';
  S.keepAwake=localStorage.getItem('keepAwake')==='true';
  S.autoAdvance=localStorage.getItem('autoAdvance')==='true';
  S.scrollFollowsAudio=localStorage.getItem('scrollFollowsAudio')!=='false';
  S.hapticFeedback=localStorage.getItem('hapticFeedback')!=='false';
  S.dailyReminder=localStorage.getItem('dailyReminder')==='true';
  S.reminderTime=localStorage.getItem('reminderTime')||'08:00';
  S.dailyVerse=localStorage.getItem('dailyVerse')==='true';
  S.dailyVerseTime=localStorage.getItem('dailyVerseTime')||'08:00';
  S.mushafMode=localStorage.getItem('mushafMode')==='true';
  S.readerFont=localStorage.getItem('readerFont')||'hafs';
  S.mushafFont=localStorage.getItem('mushafFont')||'qcf4';
  S.mushafFontSize=parseInt(localStorage.getItem('mushafFontSize_'+S.mushafFont))||(S.mushafFont==='qcf1'?22:20);
  S.mushafLineH=parseFloat(localStorage.getItem('mushafLineH'))||1.8;
  S.prayerCity=localStorage.getItem('prayerCity')||'Duhok';
  S.prayerMethod=parseInt(localStorage.getItem('prayerMethod')||'13');
  S.prayerAthanEnabled=localStorage.getItem('prayerAthanEnabled')===null?(!(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')):localStorage.getItem('prayerAthanEnabled')==='true';
  S.prayerToggles=(function(){try{return JSON.parse(localStorage.getItem('prayerToggles')||'{}')}catch(e){return{}}})();
  scheduleReminder(S.dailyReminder, S.reminderTime);
  scheduleDailyVerse(S.dailyVerse, S.dailyVerseTime);
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
      S.syncFailed=true;
      _schedSyncRetry();
    }else{
      S.lastSyncTime=Date.now();
      S.syncFailed=false;
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
      }else{console.error('Load cloud error:',resp.error)}
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
  }).catch(function(e){console.error('Load cloud failed:',e);if(cb)cb()});
}

// ── Realtime (instant cross-device push) ─────────────────────────────────────

var _lastLiveToastAt=0;
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
      // Throttle: show live-sync toast at most once every 6 seconds
      var now=Date.now();
      if(now-_lastLiveToastAt>6000){
        toast(t('toast.synced_live'));
        _lastLiveToastAt=now;
      }
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
  /* Cancel all old user's scheduled notifications */
  scheduleReminder(false);      // cancels daily Quran reminder IDs 10-16
  scheduleDailyVerse(false);    // cancels daily verse IDs 20-26
  scheduleStreakReminder();     // cancels streak ID 30 (streak=0 after log clear → no reschedule)
  localStorage.removeItem('dailyVerse');
  localStorage.removeItem('dailyVerseTime');
  localStorage.removeItem('dailyVerseScheduledDate');
  /* Reset in-memory state to defaults */
  S.arSize=2.0;S.tfSize=1.0;S.lineH=2.2;S.showTafsir=true;S.bgAudio=false;
  S.keepAwake=false;S.autoAdvance=false;S.scrollFollowsAudio=true;
  S.hapticFeedback=true;S.dailyReminder=false;S.reminderTime='08:00';
  S.dailyVerse=false;S.dailyVerseTime='08:00';
  if(S.theme!=='light'){S.theme='light';applyTheme();}
  applySizes();
  /* Reset in-memory caches that mirror now-cleared localStorage keys */
  initTodayVerses();  // clears S.todayVerses so new user doesn't inherit old counts
  _loadBookmarks();   // clears _bmMap so new user doesn't inherit old bookmarks
}

function startCloudSync(){
  stopCloudSync();
  /* Data isolation: wipe previous user's local data when a new user logs in */
  var prevUserId=localStorage.getItem('_lastUserId');
  if(prevUserId&&prevUserId!==S.user.id){
    _clearUserLocalData();
  }
  localStorage.setItem('_lastUserId',S.user.id);
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
    startCloudSync();
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
  if(!confirm(t('profile.confirm_logout')))return;
  _removeCurrentDeviceSession(); // clean up before sign-out
  S.supabase.auth.signOut().then(function(){
    S.user=null;
    stopCloudSync();
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
    img.src=S.user.avatar;img.alt='';img.referrerPolicy='no-referrer';img.crossOrigin='anonymous';
    avatar.appendChild(img);
  }else{
    // Initials fallback
    var initials=(S.user.name||'?').charAt(0).toUpperCase();
    avatar.textContent=initials;
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
  on(logoutBtn,'click',function(){App.logout();App.closeProfile();});
  actWrap.appendChild(logoutBtn);

  // ── Downloads / Storage ─────────────────────────────────
  if(window.AudioDownloads){
    var dlStats=AudioDownloads.getAllStats();
    var dlSec=el('div','pp-section');
    dlSec.appendChild(el('div','pp-section-title',t('dl.section')));
    var dlCard=el('div','pp-card');
    if(!dlStats.length){
      var emptyRow=el('div','pp-row');
      emptyRow.appendChild(el('div','pp-row-label',t('dl.no_reciters')));
      dlCard.appendChild(emptyRow);
    } else {
      var totalBytes=dlStats.reduce(function(s,r){return s+r.bytes;},0);
      var totalRow=el('div','pp-row');
      totalRow.appendChild(el('div','pp-row-label',t('dl.storage_used')));
      totalRow.appendChild(el('div','pp-row-value',AudioDownloads.fmtBytes(totalBytes)));
      dlCard.appendChild(totalRow);
      dlStats.forEach(function(r){
        var row=el('div','pp-dl-row');
        var info=el('div','pp-dl-info');
        info.appendChild(el('div','pp-dl-name',(r.flag?r.flag+' ':'')+r.name));
        info.appendChild(el('div','pp-dl-size',AudioDownloads.fmtBytes(r.bytes)+(r.full?' · '+t('dl.full_quran'):' · '+r.surahs+' '+t('dl.surahs'))));
        row.appendChild(info);
        var ppDlMgr=el('button','pp-dl-mgr');
        ppDlMgr.appendChild(icon('fas fa-sliders'));
        ppDlMgr.title=t('dl.manage');
        (function(rid){on(ppDlMgr,'click',function(){App.closeProfile();openDlSheet(rid);});})(r.id);
        row.appendChild(ppDlMgr);
        var delBtn=el('button','pp-dl-del');
        delBtn.appendChild(icon('fas fa-trash'));
        delBtn.title=t('dl.remove');
        (function(rid){
          on(delBtn,'click',function(){
            AudioDownloads.deleteReciter(rid).then(function(){
              renderProfile(panel);
              toast(t('toast.dl_removed'));
            });
          });
        })(r.id);
        row.appendChild(delBtn);
        dlCard.appendChild(row);
      });
    }
    dlSec.appendChild(dlCard);
    body.appendChild(dlSec);
  }

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
      return fetch('https://gijupzejtbpifjzwadee.supabase.co/functions/v1/delete-account',{
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
var ptrSpinner;
function ensurePtrSpinner(){
  if(ptrSpinner)return;
  ptrSpinner=el('div','ptr-spinner');
  ptrSpinner.appendChild(el('div','ptr-arc'));
  document.body.appendChild(ptrSpinner);
}

function ptrMove(y){
  ptrSpinner.style.transform='translate(-50%,'+y+'px)';
}

function setupPullToRefresh(panelId,refreshFn,checkFn){
  var panel=$(panelId);
  if(!panel)return;
  ensurePtrSpinner();

  // DEAD_ZONE: raw finger distance before any visual or pull state engages.
  // This prevents accidental triggers from normal scroll, bounce, or a tiny
  // downward nudge at the top of the page.
  var DEAD_ZONE=44;
  // DIR_RATIO: minimum fraction of dy/distance required to confirm vertical intent.
  // Diagonal and horizontal gestures below this threshold are ignored.
  var DIR_RATIO=0.72;
  // MOMENTUM_LOCK_MS: after any touchend/cancel, block new PTR arm for this long.
  // Prevents "scrolled fast to top → touch screen → accidental PTR".
  var MOMENTUM_LOCK_MS=300;

  var startY=0,startX=0,armed=false,pulling=false,refreshing=false;
  var threshold=130,maxPull=200,panelOrigTop=0;
  var _momentumLock=false,_momentumTimer=null;

  function _setMomentumLock(){
    _momentumLock=true;
    clearTimeout(_momentumTimer);
    _momentumTimer=setTimeout(function(){ _momentumLock=false; },MOMENTUM_LOCK_MS);
  }

  function _cancelPull(){
    if(pulling){
      pulling=false;
      panel.style.transform='';
      ptrSpinner.style.opacity='0';
      ptrSpinner.style.transform='translate(-50%,-60px) scale(0)';
      panel.classList.remove('ptr-pulling');
    }
    armed=false;
  }

  on(panel,'touchstart',function(e){
    if(refreshing||_momentumLock)return;
    if(checkFn&&!checkFn())return;
    // Only arm when panel is truly at the top (strict 0, not ≤2).
    // ≤2 was letting iOS bounce-back scrollTop briefly read as "top".
    if(panel.scrollTop===0){
      startY=e.touches[0].clientY;
      startX=e.touches[0].clientX;
      panelOrigTop=panel.getBoundingClientRect().top;
      armed=true;
      // pulling stays false — we don't engage until dead zone is crossed in touchmove
    }
  });

  // Must be {passive:false} so e.preventDefault() actually cancels native scroll.
  panel.addEventListener('touchmove',function(e){
    if(!armed||refreshing)return;
    var dy=e.touches[0].clientY-startY;
    var dx=e.touches[0].clientX-startX;

    // Any upward movement cancels immediately.
    if(dy<=0){ _cancelPull(); return; }

    // Direction confidence check (only before pulling is engaged).
    // If the gesture is more horizontal than vertical, treat as a scroll not a pull.
    if(!pulling){
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>16&&dy/dist<DIR_RATIO){ _cancelPull(); return; }
    }

    // If panel scrolled during the gesture, cancel (e.g. content rendered mid-gesture).
    if(panel.scrollTop>0){ _cancelPull(); return; }

    // Dead zone: consume movement silently until DEAD_ZONE px are crossed.
    if(dy<DEAD_ZONE) return;

    // Dead zone crossed — now engage pull visual.
    if(!pulling){
      pulling=true;
      panel.classList.add('ptr-pulling');
      panel.classList.remove('ptr-releasing');
      ptrSpinner.classList.remove('ptr-snapping');
      ptrSpinner.style.transition='none';
    }

    e.preventDefault();
    // Subtract dead zone so pull=0 at the exact moment pulling engages.
    var pullRaw=dy-DEAD_ZONE;
    var pull=pullRaw<threshold?pullRaw:threshold+((pullRaw-threshold)*0.3);
    pull=Math.min(pull,maxPull);
    panel.style.transform='translateY('+pull+'px)';
    var gapCenter=panelOrigTop+(pull/2)-19;
    // Slower visual engagement: opacity and scale ramp up over a longer distance.
    ptrSpinner.style.opacity=Math.min(pull/90,1);
    var sc=Math.min(pull/110,1);
    ptrSpinner.style.transform='translate(-50%,'+gapCenter+'px) scale('+sc+')';
    var arc=ptrSpinner.querySelector('.ptr-arc');
    if(arc)arc.style.transform='rotate('+Math.min(pullRaw*3,720)+'deg)';
  },{passive:false});

  on(panel,'touchend',function(){
    _setMomentumLock();
    if(!pulling||refreshing){ armed=false; return; }
    pulling=false;
    armed=false;
    panel.classList.remove('ptr-pulling');
    panel.classList.add('ptr-releasing');
    ptrSpinner.style.transition='';
    ptrSpinner.classList.add('ptr-snapping');
    var currentY=parseFloat(panel.style.transform.replace('translateY(','').replace('px)',''))||0;

    if(currentY>=threshold*0.75){
      refreshing=true;
      panel.style.transform='translateY(55px)';
      var holdCenter=panelOrigTop+(55/2)-19;
      ptrSpinner.style.transform='translate(-50%,'+holdCenter+'px) scale(1)';
      ptrSpinner.style.opacity='1';
      ptrSpinner.classList.add('refreshing');
      haptic([50]);
      refreshFn();
      setTimeout(function(){
        panel.style.transform='';
        ptrSpinner.style.transform='translate(-50%,-60px) scale(0)';
        ptrSpinner.style.opacity='0';
        ptrSpinner.classList.remove('refreshing');
        setTimeout(function(){
          panel.classList.remove('ptr-releasing');
          ptrSpinner.classList.remove('ptr-snapping');
          refreshing=false;
        },300);
      },800);
    }else{
      panel.style.transform='';
      ptrSpinner.style.transform='translate(-50%,-60px) scale(0)';
      ptrSpinner.style.opacity='0';
      setTimeout(function(){
        panel.classList.remove('ptr-releasing');
        ptrSpinner.classList.remove('ptr-snapping');
      },300);
    }
  });

  on(panel,'touchcancel',function(){
    _setMomentumLock();
    _cancelPull();
  });
}

/* ===== ISLAMVOICE ===== */
var IV_CONFIG_URL='https://tafsirkurd.com/config';

function initIslamVoice(cb){
  if(S.ivSupabase){if(cb)cb();return}
  if(S.ivInited){
    var checkInterval=setInterval(function(){
      if(S.ivSupabase){clearInterval(checkInterval);if(cb)cb()}
    },200);
    setTimeout(function(){clearInterval(checkInterval)},10000);
    return;
  }
  S.ivInited=true;

  // Reuse shared Supabase client if available
  if(S.supabase){
    S.ivSupabase=S.supabase;
    console.log('IslamVoice using shared Supabase client');
    if(cb)cb();
    return;
  }

  if(!window.supabase){
    console.error('Supabase JS library not loaded');
    S.ivInited=false;
    renderIvError(t('iv.error.supabase'));
    return;
  }

  fetch(IV_CONFIG_URL).then(function(r){
    if(!r.ok)throw new Error('Config HTTP '+r.status);
    return r.json();
  }).then(function(cfg){
    if(cfg.supabaseUrl&&cfg.supabaseKey){
      S.ivSupabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
      if(!S.supabase)S.supabase=S.ivSupabase;
      if(cb)cb();
    }else{
      throw new Error('Missing supabaseUrl or supabaseKey in config');
    }
  }).catch(function(e){
    console.error('IslamVoice init error:',e);
    S.ivInited=false;
    // Use cached data if available instead of showing error
    try{
      var cs=localStorage.getItem('iv_series_cache');
      var ce=localStorage.getItem('iv_episodes_cache');
      if(cs&&ce){S.ivSeries=JSON.parse(cs);S.ivEpisodes=JSON.parse(ce);renderIvGrid();return;}
    }catch(err){}
    renderIvError(t('iv.error.server'));
  });
}

function renderIvError(msg){
  $('ivLoading').classList.remove('on');
  var grid=$('ivGrid');
  clear(grid);
  grid.style.display='';
  var err=el('div','iv-empty');
  err.appendChild(icon('fas fa-exclamation-triangle'));
  err.appendChild(el('p','',msg||t('error.occurred')));
  var retryBtn=el('button','iv-refresh');
  retryBtn.appendChild(icon('fas fa-sync-alt'));
  retryBtn.appendChild(document.createTextNode(' '+t('iv.retry')));
  on(retryBtn,'click',function(){
    S.ivInited=false;S.ivSupabase=null;
    loadIslamVoiceData(true);
  });
  err.appendChild(retryBtn);
  grid.appendChild(err);
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
  // Only show loading spinner when we have no data at all.
  if(!S.ivSeries){
    renderIvLoading();
  }

  // Load from cache first for instant display
  if(!force){
    try{
      var cs=localStorage.getItem('iv_series_cache');
      var ce=localStorage.getItem('iv_episodes_cache');
      if(cs&&ce){
        S.ivSeries=JSON.parse(cs);
        S.ivEpisodes=JSON.parse(ce);
        _buildIvEpsCache();
        renderIvGrid();
        preloadIvThumbnails(); // kick off thumbnail fetches before panel is visible
        if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
      }
    }catch(e){}
  }

  // If offline and we already have something to show, stop here
  if(!navigator.onLine&&S.ivSeries){
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

  Promise.all([
    S.ivSupabase.from('islamvoice_series').select('*').order('display_order',{ascending:true}),
    S.ivSupabase.from('islamvoice_episodes').select('*').or('is_published.eq.true,is_published.is.null').order('episode_number',{ascending:true})
  ]).then(function(results){
    var seriesRes=results[0];
    var epRes=results[1];
    S.ivLoading=false;

    if(seriesRes.error||epRes.error){
      console.error('IV load error:',seriesRes.error||epRes.error);
      if(!S.ivSeries||!S.ivSeries.length){
        renderIvError(t('iv.error.load'));
      }
      if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
      return;
    }

    S.ivSeries=seriesRes.data||[];
    S.ivEpisodes=epRes.data||[];
    _buildIvEpsCache();
    _ivHeroInvalidate(); // fresh data → pick new random slides next render

    // Cache
    try{
      localStorage.setItem('iv_series_cache',JSON.stringify(S.ivSeries));
      localStorage.setItem('iv_episodes_cache',JSON.stringify(S.ivEpisodes));
    }catch(e){console.warn('IV cache save failed')}

    renderIvGrid();
    preloadIvThumbnails(); // refresh preload cache with latest data
    if(S.ivCurrentSeries)renderIvEpisodes(S.ivCurrentSeries);
    if(window._splashReadyIslamvoice)window._splashReadyIslamvoice();
  }).catch(function(e){
    S.ivLoading=false;
    console.error('IV fetch error:',e);
    if(!S.ivSeries||!S.ivSeries.length){
      renderIvError(t('iv.error.load_retry'));
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
var _ivHeroBuilt=false; // guard: only build once per data load
var _ivHeroTrackEl=null;
var _ivHeroDotsEls=null;
var _ivHeroTouchListened=false; // touch listeners attached once only
var _ivHeroTrackX=0; // JS-tracked translateX — avoids getComputedStyle
var _ivHeroDragActive=false,_ivHeroDragDecided=false,_ivHeroDragHoriz=false;
var _ivHeroDragSX=0,_ivHeroDragSY=0,_ivHeroDragBaseX=0;
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
    // Pick the most recent episode per series that has a thumbnail
    var bestEpMap={};
    S.ivEpisodes.forEach(function(ep){
      var ser=seriesMap[ep.series_id];
      if(!ser||!ser.thumbnail_url)return;
      var prev=bestEpMap[ep.series_id];
      if(!prev||(ep.created_at&&ep.created_at>prev.created_at))bestEpMap[ep.series_id]=ep;
    });
    Object.keys(bestEpMap).forEach(function(sid){
      all.push({ep:bestEpMap[sid],series:seriesMap[sid]});
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
    pi.src=_ivThumb(item.series.thumbnail_url);
  });

  hero.style.display='';
  clear(track);
  clear(dotsEl);
  _ivHeroDotsEls=null;

  _ivHeroSlides.forEach(function(item,idx){
    var ser=item.series;
    var ep=item.ep;
    var thumb=_ivThumb(ser.thumbnail_url);

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

  // Build dots in RTL order (count-1 → 0) so dot[0] is rightmost — matches SmartDhikr
  _ivHeroDotsEls=new Array(_ivHeroSlides.length);
  for(var di=_ivHeroSlides.length-1;di>=0;di--){
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
      _ivHeroDragBaseX=_ivHeroTrackX;
      _ivHeroVx=0;_ivHeroVtLast=performance.now();_ivHeroXLast=_ivHeroDragSX;
      if(_ivHeroTrackEl){_ivHeroTrackEl.style.transition='none';}
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
      e.preventDefault();
      var now=performance.now(),dt=now-_ivHeroVtLast;
      if(dt>0)_ivHeroVx=(cx-_ivHeroXLast)/dt;
      _ivHeroVtLast=now;_ivHeroXLast=cx;
      var W=_ivHeroW(),raw=_ivHeroDragBaseX+dx;
      var minX=-((_ivHeroSlides.length-1)*W),maxX=0;
      var clamped=raw>maxX?maxX+(raw-maxX)*0.25:raw<minX?minX+(raw-minX)*0.25:raw;
      if(_ivHeroTrackEl)_ivHeroTrackEl.style.transform='translate3d('+clamped+'px,0,0)';
    },{passive:false});
    hero.addEventListener('touchend',function(e){
      if(!_ivHeroDragActive)return;
      _ivHeroDragActive=false;
      if(!_ivHeroDragDecided||!_ivHeroDragHoriz||!_ivHeroSlides.length){_ivHeroResetTimer();return;}
      var endX=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientX:_ivHeroDragSX;
      var delta=endX-_ivHeroDragSX;
      var W=_ivHeroW();
      var vxFresh=(performance.now()-_ivHeroVtLast)<80?_ivHeroVx:0;
      var flick=Math.abs(vxFresh)>0.3;
      if(flick||Math.abs(delta)>W*0.18){
        /* RTL: swipe right (delta>0 / vx>0) = next (+1), swipe left = prev (-1) */
        var dir=vxFresh!==0?(vxFresh>0?1:-1):(delta>0?1:-1);
        _ivHeroGoTo(_ivHeroIdx+dir,true);
      }else{
        _ivHeroGoTo(_ivHeroIdx,true);
      }
      _ivHeroResetTimer();
    },{passive:false});
    hero.addEventListener('touchcancel',function(){
      _ivHeroDragActive=false;
      if(_ivHeroSlides.length){_ivHeroGoTo(_ivHeroIdx,true);_ivHeroResetTimer();}
    },{passive:false});
  }

  _ivHeroBuilt=true;
  _ivHeroGoTo(0,false);
  _ivHeroResetTimer();
}

// Call this when data reloads so hero picks fresh random slides next time
function _ivHeroInvalidate(){_ivHeroBuilt=false;_ivHeroSlides=[];if(_ivHeroTimer){clearInterval(_ivHeroTimer);_ivHeroTimer=null;}}

function _ivHeroW(){var h=$('ivHero');return h&&h.offsetWidth>0?h.offsetWidth:window.innerWidth;}

function _ivHeroGoTo(idx,animate){
  if(!_ivHeroSlides.length)return;
  var wrap=idx<0||idx>=_ivHeroSlides.length;
  _ivHeroIdx=(idx+_ivHeroSlides.length)%_ivHeroSlides.length;
  _ivHeroTrackX=-_ivHeroIdx*_ivHeroW();
  if(_ivHeroTrackEl){
    var doAnim=!wrap&&animate!==false;
    _ivHeroTrackEl.style.transition=doAnim?'transform .4s cubic-bezier(0.22,1,0.36,1)':'none';
    _ivHeroTrackEl.style.transform='translate3d('+_ivHeroTrackX+'px,0,0)';
  }
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

    // Thumbnail
    var imgWrap=el('div','iv-card-img');
    if(series.thumbnail_url){
      var img=document.createElement('img');
      // Use smaller YouTube thumbnail (mqdefault 320×180) instead of maxresdefault (1280×720)
      img.src=series.thumbnail_url.replace('maxresdefault.jpg','mqdefault.jpg');
      img.alt='';
      // First 4 cards: eager — browser fetches even in hidden panels (plus new Image() preload above)
      img.loading=_ivCardIdx<4?'eager':'lazy';
      img.onload=function(){this.parentNode.style.animation='none';this.parentNode.style.background='none'};
      img.onerror=function(){this.style.display='none'};
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
      tImg.onerror=function(){this.style.display='none'};
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
          p[episodeId]={currentTime:video.currentTime,duration:video.duration,percent:pct};
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
    it.classList.toggle('playing',it.getAttribute('data-ep-id')===episodeId);
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
      var del=el('button','iv-overlay-ep-del');del.appendChild(icon('fas fa-bookmark-slash'));
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
  S.ivSupabase.rpc('increment_episode_view',{episode_id:episodeId}).catch(function(){});
}


/* ===== START ===== */
function startApp(){
  console.log('[Startup] startApp()',Date.now()-_startupT0,'ms');
  // Hide native splash after one rAF — custom splash is painted by then and takes over.
  // fadeOutDuration:0 = instant swap (both backgrounds are white — no visible gap).
  requestAnimationFrame(function(){
    try{var _ns=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.SplashScreen;if(_ns)_ns.hide({fadeOutDuration:0});}catch(e){}
  });
  // Apply persisted mushaf CSS vars immediately
  document.documentElement.style.setProperty('--mushaf-size',(S.mushafFontSize||22)+'px');
  document.documentElement.style.setProperty('--mushaf-lh',String(S.mushafLineH||1.8));
  // Force-update check runs early — parallel with i18n, non-blocking
  ForceUpdate.check();
  // Re-check every 12s so admin changes appear within ~12s of saving
  setInterval(function(){ ForceUpdate.check(); }, 12000);

  if(window.i18n){
    i18n.initLang().then(function(){
      console.log('[Startup] i18n ready (all layers)',Date.now()-_startupT0,'ms');
      init();
      i18n.applyTranslations();
      if(window._splashReadyI18n){ window._splashReadyI18n(); window._splashReadyI18n=null; }
    });
  } else {
    init();
    if(window._splashReadyI18n){ window._splashReadyI18n(); window._splashReadyI18n=null; }
  }
  // i18n:updated already handled at top of file (line ~558) — no duplicate here
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',startApp)}else{startApp()}

})();
