/**
 * Prayer Times UI
 * Modern design: dark header card + 2-column prayer grid + settings sheet.
 *
 * Depends on: prayer.cache.js, prayer.api.js, prayer.logic.js,
 *             prayer.notifications.android.js
 */
(function() {
  'use strict';

  var _countdownInterval    = null;
  var _cardSheetCountdownId = null;
  var _i18nBound = false; // prevents duplicate i18n:updated listener from multiple initScheduleOnStart() calls
  var _currentTimings   = null;
  var _currentDateISO   = null;
  var _currentData      = null;
  var _tomorrowTimings  = null;
  var _tomorrowDateISO  = null;
  var _fetchingTomorrow = false; // in-flight guard — prevents duplicate fetchTomorrow() requests
  var _renderedKey      = null; // city:date:format — skip rebuild if unchanged
  var _athanSettingsKey = null; // athan settings key — skip rebuild if unchanged
  // Cached DOM refs for tickCountdown (invalidated on buildPanel)
  var _cdEls = null; // {skyCd, skyName, cdEl, nameEl}
  var _gridCards = null; // NodeList of .prayer-grid-card[data-prayer]

  // Gyro parallax state
  var _gyroX = 0, _gyroY = 0;         // current lerped values
  var _gyroTX = 0, _gyroTY = 0;       // target values
  var _gyroBaseG = null, _gyroBaseB = null;  // calibration baseline
  var _gyroHandler = null;
  var _gyroRaf = null;
  var _shootTimeout    = null;
  var _aircraftTimeout = null;
  var _aircraftRaf     = null;
  var _lightningTimeout = null;
  var _balloonTimeout   = null;
  var _balloonRaf       = null;
  var _lanternTimeout   = null;
  var _satelliteTimeout = null;
  var _satelliteRaf     = null;
  var _meteorTimeout    = null;
  var _fireflyTimeout   = null;
  var _cometTimeout     = null;
  var _issTimeout       = null;
  var _issRaf           = null;
  var _carTimeout       = null;

  // ── Prayer moment / urgency / sky-tint state ─────────────────────────────────
  var _urgencyLevel      = -1;   // 0=>2h calm, 1=30min-2h, 2=<30min, 3=<10min
  var _prayerMomentUntil = 0;    // ms: full calm (stage 1) active until
  var _prayerSoftUntil   = 0;    // ms: soft phase (stage 2) active until (3–15 min)
  var _majorEventActive  = false; // prevents concurrent meteor/ISS/comet
  var _lastMinuteMark    = '';   // last minute floor — drives countdown pulse
  var _lastNextName      = '';   // previous next-prayer name — drives moment + name fade

  var CITIES = [
    'Sulaymaniyah', 'Erbil', 'Duhok', 'Kirkuk',
    'Halabja', 'Kfry', 'Rania', 'Koya',
    'Qaladze', 'Zakho', 'Bardarash', 'Mosul',
    'Darbandikhan', 'Kalar', 'Akre', 'Daquq',
    'Makhmur', 'Mandali', 'Qarahanjir', 'DuzKhormatou'
  ];

  var CITY_LABEL_FB = {
    Sulaymaniyah: 'سلێمانی',
    Erbil:        'هەولێر',
    Duhok:        'دهۆک',
    Kirkuk:       'کەرکووک',
    Halabja:      'هەڵەبجە',
    Kfry:         'کفری',
    Rania:        'ڕانیە',
    Koya:         'کۆیە',
    Qaladze:      'قەڵادزێ',
    Zakho:        'زاخۆ',
    Bardarash:    'بەردەڕەش',
    Mosul:        'موسل',
    Darbandikhan: 'دەربەندیخان',
    Kalar:        'کەلار',
    Akre:         'ئاکرێ',
    Daquq:        'داقووق',
    Makhmur:      'مەخموور',
    Mandali:      'مەندەلی',
    Qarahanjir:   'قەرەهەنجیر',
    DuzKhormatou: 'دوز خورماتوو'
  };
  function getCityLabel(c) {
    var key = 'prayer.city_' + c.toLowerCase();
    var v = window.t && window.t(key);
    return (v && v !== key) ? v : (CITY_LABEL_FB[c] || c);
  }
  var CITY_LABEL = CITY_LABEL_FB;

  var PRAYER_I18N = {
    Fajr:    'prayer.fajr',
    Sunrise: 'prayer.sunrise',
    Dhuhr:   'prayer.dhuhr',
    Asr:     'prayer.asr',
    Maghrib: 'prayer.maghrib',
    Isha:    'prayer.isha'
  };

  function tStr(key, replacements) {
    if (!window.t) return '';
    var v = window.t(key, replacements);
    // t() returns the key itself when not found — return '' so || fallbacks fire correctly
    return v === key ? '' : v;
  }

  function getCity()    { return (window.S && S.prayerCity) || localStorage.getItem('prayerCity') || 'Duhok'; }

  // Bad-city tracking — cities that returned no data are hidden from the picker
  var _BAD_KEY = 'prayer_bad_cities';
  function getBadCities() { try { return JSON.parse(localStorage.getItem(_BAD_KEY) || '[]'); } catch(e) { return []; } }
  function markCityBad(c) { var b = getBadCities(); if (b.indexOf(c) === -1) { b.push(c); try { localStorage.setItem(_BAD_KEY, JSON.stringify(b)); } catch(e) {} } }
  function markCityGood(c) { var b = getBadCities().filter(function(x){ return x !== c; }); try { localStorage.setItem(_BAD_KEY, JSON.stringify(b)); } catch(e) {} }

  function getAthan()   { if (window.S) return S.prayerAthanEnabled; var v = localStorage.getItem('prayerAthanEnabled'); return v === null ? !(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'mac') : v === 'true'; }
  function getToggles() {
    if (window.S && S.prayerToggles) return S.prayerToggles;
    try { return JSON.parse(localStorage.getItem('prayerToggles') || '{}'); } catch(e) { return {}; }
  }
  function getFormat()  { return localStorage.getItem('prayerTimeFormat') || '12'; }

  function setCity(v)    { if (window.S) S.prayerCity = v;         localStorage.setItem('prayerCity', v); }
  function setAthan(v)   { if (window.S) S.prayerAthanEnabled = v; localStorage.setItem('prayerAthanEnabled', String(v)); }
  function setToggles(v) { if (window.S) S.prayerToggles = v;      localStorage.setItem('prayerToggles', JSON.stringify(v)); }
  function getAthanVoice()    { return localStorage.getItem('prayerAthanVoice') || 'nasser'; }
  function setAthanVoice(v)   { localStorage.setItem('prayerAthanVoice', v); }
  function setFormat(v)       { localStorage.setItem('prayerTimeFormat', v); }

  // ── Prayer Reminder settings ──────────────────────────────────────────────
  function getReminderEnabled() { var v = localStorage.getItem('prayerReminderEnabled'); if (v === null) return false; return v !== 'false'; }
  function setReminderEnabled(v) { localStorage.setItem('prayerReminderEnabled', v ? 'true' : 'false'); }
  function getReminderOffset()  { return parseInt(localStorage.getItem('prayerReminderOffset') || '20') || 20; }
  function setReminderOffset(v) { localStorage.setItem('prayerReminderOffset', String(v)); }

  function fetchReminderConfig() {
    if (!window.t) return;
    var prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    var config = {};
    var hasAny = false;
    prayers.forEach(function(p) {
      var titleKey = 'prayer_reminder.' + p + '.title';
      var bodyKey  = 'prayer_reminder.' + p + '.body';
      var title = window.t(titleKey);
      var body  = window.t(bodyKey);
      config[p] = {};
      if (title !== titleKey) { config[p].title = title; hasAny = true; }
      if (body  !== bodyKey)  { config[p].body  = body;  hasAny = true; }
    });
    if (hasAny) localStorage.setItem('prayerReminderConfig', JSON.stringify(config));
  }

  async function rescheduleReminders(city) {
    var PN = window.PrayerNotifications;
    if (!PN || !PN.scheduleReminderMultiDay) return;
    try {
      var today    = window.PrayerLogic.todayBaghdad();
      var daysData = await fetchDaysData(city, today, 28);
      if (daysData.length) {
        await PN.scheduleReminderMultiDay(daysData, getToggles(), getReminderOffset());
      }
    } catch(e) { console.warn('[Reminder] reschedule error:', e); }
  }

  function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function cel(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // ─── Sky Scene ──────────────────────────────────────────────────────────────

  // Sky phases: top, bottom, horizon glow, celestial color, glow, star opacity,
  //             aurora opacity (au), cloud opacity (cl), birds opacity (br), particles opacity (pa)
  var SKY = {
    night:     { t:'#020815', b:'#0b1130', h:null,      c:'#dce8ff', co:'rgba(180,200,255,0.18)', s:1.0,  au:0.75, cl:0.08, br:0,   pa:0   },
    prefajr:   { t:'#080726', b:'#220d3a', h:'#3a0d42', c:'#ffd898', co:'rgba(255,190,90,0.12)',  s:0.7,  au:0.45, cl:0.25, br:0,   pa:0.3 },
    fajr:      { t:'#180730', b:'#c83e22', h:'#e85610', c:'#ffab58', co:'rgba(255,140,40,0.35)',  s:0.15, au:0,    cl:0.55, br:0,   pa:0.8 },
    sunrise:   { t:'#d05e18', b:'#ffc840', h:'#ff7c08', c:'#fff8b0', co:'rgba(255,230,80,0.65)',  s:0.0,  au:0,    cl:0.70, br:0.5, pa:1.0 },
    morning:   { t:'#1868b5', b:'#72bde0', h:null,      c:'#fffce0', co:'rgba(255,250,190,0.40)', s:0.0,  au:0,    cl:0.90, br:1.0, pa:0   },
    noon:      { t:'#0d4e9f', b:'#4a9fd8', h:null,      c:'#ffffff', co:'rgba(255,255,255,0.55)', s:0.0,  au:0,    cl:0.85, br:0.9, pa:0   },
    afternoon: { t:'#135eb0', b:'#68b0e0', h:null,      c:'#ffeea0', co:'rgba(255,230,110,0.38)', s:0.0,  au:0,    cl:0.85, br:0.9, pa:0   },
    asr:       { t:'#b05e10', b:'#f5b838', h:null,      c:'#ffcc40', co:'rgba(255,188,28,0.50)',  s:0.0,  au:0,    cl:0.75, br:0.6, pa:0.5 },
    sunset:    { t:'#7a1035', b:'#e03210', h:'#ff5606', c:'#ff8030', co:'rgba(255,100,18,0.78)',  s:0.03, au:0,    cl:0.60, br:0.2, pa:1.0 },
    dusk:      { t:'#260838', b:'#782050', h:'#b02c2c', c:'#ffd0a0', co:'rgba(255,175,95,0.20)',  s:0.5,  au:0.22, cl:0.35, br:0,   pa:0.4 },
    isha:      { t:'#050416', b:'#170c2e', h:null,      c:'#c8ccff', co:'rgba(170,185,255,0.15)', s:0.95, au:0.62, cl:0.06, br:0,   pa:0   }
  };

  // Cloud fill color per phase (drives fill="currentColor" on cloud SVGs)
  var CLOUD_COLOR = {
    night:     'rgba(100,110,140,0.12)',
    prefajr:   'rgba(150,120,180,0.32)',
    fajr:      'rgba(220,140,120,0.62)',
    sunrise:   'rgba(255,190,110,0.78)',
    morning:   'rgba(255,255,255,0.92)',
    noon:      'rgba(255,255,255,0.96)',
    afternoon: 'rgba(255,245,215,0.92)',
    asr:       'rgba(255,210,140,0.82)',
    sunset:    'rgba(255,155,90,0.78)',
    dusk:      'rgba(215,155,205,0.48)',
    isha:      'rgba(80,90,120,0.10)'
  };

  // Deterministic star layout — 60 stars, tw: 0=static, 1=t0(2.2s), 2=t1(3.6s), 3=t2(1.7s)
  var STARS = (function() {
    var raw = [
      // Top zone
      [8,5,0.7,1],[25,8,1.0,3],[42,4,0.8,2],[60,10,1.1,1],[78,5,0.7,3],
      [95,8,0.9,2],[112,3,1.0,1],[130,9,0.7,3],[148,5,1.2,2],[165,7,0.8,1],
      [182,4,0.9,3],[200,10,0.7,2],[218,5,1.1,1],[235,8,0.8,3],[252,3,1.0,2],
      [268,9,0.7,1],[285,5,1.2,3],[302,8,0.9,2],[320,4,0.8,1],[338,10,1.0,3],
      [355,6,0.7,2],[372,4,1.1,1],[388,8,0.8,3],
      // Upper-middle zone
      [15,20,0.9,2],[35,22,0.7,1],[55,18,1.0,3],[75,24,0.8,2],[92,20,1.1,1],
      [110,16,0.7,3],[128,22,0.9,2],[148,18,0.8,1],[168,24,1.0,3],[188,19,0.7,2],
      [208,22,0.9,1],[228,17,1.1,3],[248,22,0.8,2],[268,19,0.7,1],[288,23,1.0,3],
      [308,17,0.9,2],[328,22,0.8,1],[348,18,1.1,3],[368,24,0.7,2],[387,20,0.9,1],
      // Lower zone
      [22,38,0.8,3],[50,35,0.7,2],[80,40,1.0,1],[110,36,0.9,3],[140,38,0.8,2],
      [170,34,1.1,1],[200,40,0.7,3],[230,36,0.9,2],[260,38,0.8,1],[290,34,1.0,3],
      [318,38,0.7,2],[346,34,0.9,1],[374,38,0.8,3],[395,36,1.0,2],
      // Scattered extras
      [380,52,0.6,1],[362,50,0.7,2],[10,52,0.6,3],[55,50,0.8,1],[100,54,0.7,2],[145,52,0.6,3]
    ];
    return raw.map(function(r) { return { x:r[0], y:r[1], rx:r[2], tw:r[3] }; });
  })();

  // Colored star tints — index into STARS array → fill color
  // Blue-white (hot stars), yellow (sun-like), orange (cooler K-type)
  var STAR_TINTS = {
    0:'#cce4ff', 4:'#d0e8ff', 12:'#cce4ff', 19:'#d4eaff', 24:'#cce4ff', 35:'#cce4ff', 41:'#d0e8ff',
    2:'#fff8a0', 8:'#fffab0', 16:'#fff8a0', 28:'#fffab0', 37:'#fff8a0', 48:'#fff8a0',
    6:'#ffd8a0', 13:'#ffd8a0', 31:'#ffd8a0', 44:'#ffd8a0', 53:'#ffd8a0'
  };

  var _skyPhaseId  = null;
  var _skyLastTick = 0;

  /* ── Duhok weather (10-source majority vote, shared sd_rain_v2 cache) ── */
  var _WEATHER_KEY = 'sd_rain_v4';
  var _WEATHER_TTL = 2 * 60 * 60 * 1000; // 2 hours — sky animation doesn't need finer freshness
  var _weatherFetchInProgress = false;

  function _classifyWeatherCode(code, prec, wind) {
    code = code || 0; prec = prec || 0; wind = wind || 0;
    if (code >= 95) return 'thunder';
    if (code === 71 || code === 73 || code === 75 || code === 77 ||
        code === 85 || code === 86 || code === 56 || code === 57 ||
        code === 66 || code === 67) return 'snow';
    if (prec >= 0.5 || (code >= 51 && code <= 82)) return 'rain';
    if (wind >= 40) return 'wind';
    return 'clear';
  }
  var _PW_SNOW = {179:1,227:1,230:1,323:1,326:1,329:1,332:1,335:1,338:1,350:1,362:1,365:1,368:1,371:1,374:1,377:1};
  function _omFetchPW(url) {
    return fetch(url).then(function(r){return r.json();}).then(function(d){
      var c=d.current||{};return _classifyWeatherCode(c.weather_code,c.precipitation,c.wind_speed_10m);
    }).catch(function(){return null;});
  }
  function _wttrFetchPW(url) {
    return fetch(url).then(function(r){return r.json();}).then(function(d){
      var cur=(d.current_condition&&d.current_condition[0])||{};
      var code=parseInt(cur.weatherCode||'0',10),prec=parseFloat(cur.precipMM||'0'),wind=parseFloat(cur.windspeedKmph||'0');
      if(code===392||code===395)return 'thunder';
      if(code>=200&&code<300)return 'thunder';
      if(_PW_SNOW[code])return 'snow';
      if(prec>=0.5||(code>=300&&code<600))return 'rain';
      if(wind>=40)return 'wind';
      return 'clear';
    }).catch(function(){return null;});
  }

  function _fetchPrayerWeather() {
    try {
      var _wc = JSON.parse(localStorage.getItem(_WEATHER_KEY));
      if (_wc && (Date.now() - _wc.ts) < _WEATHER_TTL) return;
    } catch(e) {}
    if (_weatherFetchInProgress) return;
    _weatherFetchInProgress = true;

    // Single Open-Meteo request (default best-match model) + met.no fallback.
    // Previously used 6 OM model variants simultaneously — caused 429 rate limiting.
    var _OMB = 'https://api.open-meteo.com/v1/forecast?latitude=36.87&longitude=42.95&current=precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBaghdad&forecast_days=1';
    var s1 = _omFetchPW(_OMB);
    var s2 = fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=36.87&lon=42.95',
        {headers:{'User-Agent':'TafsirKurdApp/1.0 tefsirkurd@gmail.com'}})
      .then(function(r){return r.json();}).then(function(d){
        var ts=(d.properties&&d.properties.timeseries&&d.properties.timeseries[0])||{};
        var inst=(ts.data&&ts.data.instant&&ts.data.instant.details)||{};
        var n1h=(ts.data&&ts.data.next_1_hours)||{};
        var sym=(n1h.summary&&n1h.summary.symbol_code)||'';
        var prec=(n1h.details&&n1h.details.precipitation_amount)||0;
        var wind=inst.wind_speed||0;
        if(sym.indexOf('thunder')!==-1)return 'thunder';
        if(sym.indexOf('snow')!==-1||sym.indexOf('sleet')!==-1)return 'snow';
        if(sym.indexOf('rain')!==-1||sym.indexOf('shower')!==-1||prec>=0.5)return 'rain';
        if(wind>=11)return 'wind';
        return 'clear';
      }).catch(function(){return null;});

    Promise.all([s1,s2]).then(function(results){
      _weatherFetchInProgress = false;
      var valid = results.filter(function(r){return r!==null;});
      if (!valid.length) return;
      // Primary (OM) wins outright; fallback (met.no) only used if primary fails
      var winner = valid[0];
      try { localStorage.setItem(_WEATHER_KEY, JSON.stringify({ts:Date.now(),condition:winner})); } catch(e){}
      // Refresh sky if prayer tab is active
      _doUpdateSky();
    }).catch(function(){_weatherFetchInProgress=false;});
  }

  function _skyPhaseName(timings, dateISO, now) {
    var pl  = window.PrayerLogic;
    var fj  = pl.parseAsDate(timings.Fajr,    dateISO).getTime();
    var sr  = pl.parseAsDate(timings.Sunrise, dateISO).getTime();
    var dh  = pl.parseAsDate(timings.Dhuhr,   dateISO).getTime();
    var as  = pl.parseAsDate(timings.Asr,     dateISO).getTime();
    var mg  = pl.parseAsDate(timings.Maghrib, dateISO).getTime();
    var is  = pl.parseAsDate(timings.Isha,    dateISO).getTime();
    var n   = now.getTime();
    if (n < fj - 3600000)           return 'night';
    if (n < fj)                     return 'prefajr';
    if (n < sr)                     return 'fajr';
    if (n < sr + 1200000)           return 'sunrise';
    if (n < dh - 1800000)           return 'morning';
    if (n < dh + 2400000)           return 'noon';
    if (n < as - 1800000)           return 'afternoon';
    if (n < mg - 2400000)           return 'asr';
    if (n < mg + 1800000)           return 'sunset';
    if (n < is)                     return 'dusk';
    return 'isha';
  }

  // Returns {x:%, y:%, isSun:bool} for the celestial body position (sun or moon)
  function _celestialPos(timings, dateISO, now) {
    var pl  = window.PrayerLogic;
    var sr  = pl.parseAsDate(timings.Sunrise, dateISO).getTime();
    var mg  = pl.parseAsDate(timings.Maghrib, dateISO).getTime();
    var fj  = pl.parseAsDate(timings.Fajr,    dateISO).getTime();
    var n   = now.getTime();
    var p, isSun;
    if (n >= sr && n <= mg) {
      // Daytime: sun travels left→right across sky
      isSun = true;
      p = (n - sr) / (mg - sr);
    } else if (n > mg) {
      // After sunset: moon rises
      isSun = false;
      p = (n - mg) / ((fj + 86400000) - mg);
    } else {
      // Before sunrise: moon still up from last night
      isSun = false;
      p = (n - (mg - 86400000)) / (fj - (mg - 86400000));
    }
    p = Math.max(0, Math.min(1, p));
    // Arc: x goes left (5%) to right (95%), y = sinusoidal peak at center
    var x = 5 + p * 90;
    var y = 82 - Math.sin(p * Math.PI) * 68;
    return { x: x, y: y, isSun: isSun };
  }

  function _triggerAircraft() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene || _aircraftRaf) return;
    var startY = 8 + Math.random() * 18;   // 8–26% from top
    var endY   = startY - 2 - Math.random() * 5; // slight climb
    var dur    = 30000 + Math.random() * 20000;   // 30–50 s crossing time
    var el = document.createElement('div');
    el.className = 'sky-aircraft';
    el.innerHTML = '<div class="sky-ac-trail"></div><div class="sky-ac-body">' +
      '<div class="sky-ac-r"></div><div class="sky-ac-w"></div></div>';
    el.style.cssText = 'position:absolute;top:0;left:0;will-change:transform';
    scene.appendChild(el);
    var sceneW = scene.offsetWidth || 400;
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        _aircraftRaf = null;
        return;
      }
      var tx = (-4 + p * 110) / 100 * sceneW;
      var ty = (startY + (endY - startY) * p) / 100 * sceneW;
      el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
      _aircraftRaf = requestAnimationFrame(tick);
    }
    _aircraftRaf = requestAnimationFrame(tick);
  }

  function _scheduleNextAircraft() {
    if (_aircraftTimeout) clearTimeout(_aircraftTimeout);
    // Every 90–240 seconds — realistic commercial flight frequency
    var delay = 90000 + Math.random() * 150000;
    _aircraftTimeout = setTimeout(function() {
      _triggerAircraft();
      _scheduleNextAircraft();
    }, delay);
  }

  // ── Satellite (slow-moving dot, night only) ─────────────────────────────────
  function _triggerSatellite() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene || _satelliteRaf) return;
    var startY = 5 + Math.random() * 22;
    var endY   = startY + Math.random() * 6 - 3;
    var dur    = 22000 + Math.random() * 14000; // 22–36 s, slower than aircraft
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;width:2px;height:2px;background:rgba(255,255,255,0.92);border-radius:50%;top:0;left:0;z-index:6;pointer-events:none;will-change:transform';
    scene.appendChild(el);
    var sceneW = scene.offsetWidth || 400;
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        _satelliteRaf = null;
        return;
      }
      var tx = (-1 + p * 102) / 100 * sceneW;
      var ty = (startY + (endY - startY) * p) / 100 * sceneW;
      el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
      _satelliteRaf = requestAnimationFrame(tick);
    }
    _satelliteRaf = requestAnimationFrame(tick);
  }

  function _scheduleNextSatellite() {
    if (_satelliteTimeout) clearTimeout(_satelliteTimeout);
    var delay = 140000 + Math.random() * 180000; // 2.3–5 min
    _satelliteTimeout = setTimeout(function() {
      var ph = _skyPhaseId;
      if (ph === 'night' || ph === 'isha' || ph === 'prefajr') _triggerSatellite();
      _scheduleNextSatellite();
    }, delay);
  }

  // ── Lightning flash (dusk / sunset / isha) ──────────────────────────────────
  function _triggerLightning() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene) return;
    var fl = document.createElement('div');
    fl.style.cssText = 'position:absolute;inset:0;background:rgba(200,215,255,0.28);z-index:16;pointer-events:none;border-radius:inherit;opacity:0;transition:opacity 0.04s';
    scene.appendChild(fl);
    setTimeout(function() { fl.style.opacity = '1'; }, 10);
    setTimeout(function() { fl.style.opacity = '0'; }, 65);
    setTimeout(function() { fl.style.opacity = '0.50'; }, 145);
    setTimeout(function() { fl.style.opacity = '0'; }, 230);
    setTimeout(function() { if (fl.parentNode) fl.parentNode.removeChild(fl); }, 380);
  }

  function _scheduleNextLightning() {
    if (_lightningTimeout) clearTimeout(_lightningTimeout);
    var delay = 28000 + Math.random() * 90000;
    _lightningTimeout = setTimeout(function() {
      var ph = _skyPhaseId;
      if ((ph === 'dusk' || ph === 'sunset' || ph === 'isha') && Date.now() >= _prayerSoftUntil) _triggerLightning();
      _scheduleNextLightning();
    }, delay);
  }

  // ── Floating lanterns (night / dusk / isha) ─────────────────────────────────
  function _spawnLantern() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene) return;
    var ph = _skyPhaseId;
    if (ph !== 'night' && ph !== 'isha' && ph !== 'dusk') return;
    var el = document.createElement('div');
    el.className = 'sky-lantern';
    el.style.left   = (8 + Math.random() * 84) + '%';
    el.style.bottom = (14 + Math.random() * 14) + '%';
    scene.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 9500);
  }

  function _scheduleNextLantern() {
    if (_lanternTimeout) clearTimeout(_lanternTimeout);
    var delay = 12000 + Math.random() * 18000;
    _lanternTimeout = setTimeout(function() {
      _spawnLantern();
      _scheduleNextLantern();
    }, delay);
  }

  // ── Meteor shower (burst of shooting stars, night only) ─────────────────────
  function _triggerMeteorShower() {
    if (_majorEventActive || Date.now() < _prayerSoftUntil) return;
    _majorEventActive = true;
    var count = 3 + Math.floor(Math.random() * 5);
    for (var i = 0; i < count; i++) {
      (function(d) { setTimeout(_triggerShootingStar, d); })(i * (500 + Math.random() * 900));
    }
    // Release after all stars finish (~count×1400ms + 1s buffer)
    setTimeout(function() { _majorEventActive = false; }, count * 1400 + 1000);
  }

  function _scheduleMeteorShower() {
    if (_meteorTimeout) clearTimeout(_meteorTimeout);
    var delay = 260000 + Math.random() * 520000; // 4–13 min
    _meteorTimeout = setTimeout(function() {
      var ph = _skyPhaseId;
      if (ph === 'night' || ph === 'isha' || ph === 'prefajr') _triggerMeteorShower();
      _scheduleMeteorShower();
    }, delay);
  }

  // ── Hot air balloon (daytime only, very rare) ────────────────────────────────
  function _triggerBalloon() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene || _balloonRaf) return;
    var el = document.createElement('div');
    el.className = 'sky-balloon';
    el.innerHTML =
      '<svg width="28" height="38" viewBox="0 0 28 38">' +
      '<ellipse cx="14" cy="15" rx="12" ry="13" fill="rgba(220,55,55,0.92)"/>' +
      '<path d="M2,15 Q5,5 14,3 Q23,5 26,15" fill="rgba(255,215,0,0.92)"/>' +
      '<path d="M2,15 Q1,22 4,26 Q14,30 24,26 Q27,22 26,15" fill="rgba(55,110,220,0.92)"/>' +
      '<line x1="10" y1="28" x2="6" y2="33" stroke="rgba(120,90,40,0.7)" stroke-width="0.8"/>' +
      '<line x1="18" y1="28" x2="22" y2="33" stroke="rgba(120,90,40,0.7)" stroke-width="0.8"/>' +
      '<rect x="8" y="33" width="12" height="5" rx="1.5" fill="rgba(160,110,50,0.92)"/>' +
      '</svg>';
    var startY = 20 + Math.random() * 20;
    var dur = 80000 + Math.random() * 40000; // 80–120 s
    el.style.cssText = 'position:absolute;top:0;left:0;z-index:5;pointer-events:none;will-change:transform';
    scene.appendChild(el);
    var sceneW = scene.offsetWidth || 400; var sceneH = scene.offsetHeight || 268;
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        _balloonRaf = null;
        return;
      }
      var tx = (106 - p * 120) / 100 * sceneW;
      var ty = (startY - Math.sin(p * Math.PI) * 9 + Math.sin(p * 22) * 1.4) / 100 * sceneH;
      el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
      _balloonRaf = requestAnimationFrame(tick);
    }
    _balloonRaf = requestAnimationFrame(tick);
  }

  function _scheduleNextBalloon() {
    if (_balloonTimeout) clearTimeout(_balloonTimeout);
    var delay = 210000 + Math.random() * 300000; // 3.5–8.5 min
    _balloonTimeout = setTimeout(function() {
      var ph = _skyPhaseId;
      if (ph === 'morning' || ph === 'noon' || ph === 'afternoon' || ph === 'sunrise') _triggerBalloon();
      _scheduleNextBalloon();
    }, delay);
  }

  // ── Fireflies (blinking green-yellow dots, dusk / night / isha) ──────────────
  function _spawnFirefly() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene) return;
    var ph = _skyPhaseId;
    if (ph !== 'night' && ph !== 'isha' && ph !== 'dusk') return;
    var el = document.createElement('div');
    el.className = 'sky-firefly';
    var dur = (1.4 + Math.random() * 2).toFixed(1);
    var del = (Math.random() * 0.8).toFixed(2);
    el.style.setProperty('--ffd', dur + 's');
    el.style.setProperty('--ffdl', del + 's');
    el.style.left   = (5 + Math.random() * 90) + '%';
    el.style.bottom = (16 + Math.random() * 26) + '%';
    scene.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 10000);
  }

  function _scheduleNextFirefly() {
    if (_fireflyTimeout) clearTimeout(_fireflyTimeout);
    var delay = 2200 + Math.random() * 4800;
    _fireflyTimeout = setTimeout(function() {
      _spawnFirefly();
      _scheduleNextFirefly();
    }, delay);
  }

  // ── Comet (glowing head + fading tail, diagonal fall) ────────────────────────
  function _triggerComet() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene || _majorEventActive || Date.now() < _prayerSoftUntil) return;
    _majorEventActive = true;
    var sx  = 5 + Math.random() * 40;
    var sy  = 4 + Math.random() * 22;
    var dur = 3000 + Math.random() * 2500;
    var el  = document.createElement('div');
    el.style.cssText = 'position:absolute;pointer-events:none;z-index:7;top:' + sy + '%;left:' + sx + '%;opacity:0;transform:rotate(28deg)';
    el.innerHTML =
      '<svg width="92" height="22" viewBox="0 0 92 22">' +
      '<defs>' +
      '<linearGradient id="cmt" x1="0%" y1="50%" x2="100%" y2="50%">' +
      '<stop offset="0%" stop-color="rgba(150,185,255,0)"/>' +
      '<stop offset="55%" stop-color="rgba(200,220,255,0.38)"/>' +
      '<stop offset="88%" stop-color="rgba(245,248,255,0.78)"/>' +
      '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>' +
      '</linearGradient>' +
      '<radialGradient id="cmh" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="rgba(255,255,250,1)"/>' +
      '<stop offset="55%" stop-color="rgba(210,228,255,0.72)"/>' +
      '<stop offset="100%" stop-color="rgba(160,195,255,0)"/>' +
      '</radialGradient>' +
      '</defs>' +
      '<path d="M0,11 Q50,4 84,11 Q50,18 0,11" fill="url(#cmt)"/>' +
      '<circle cx="85" cy="11" r="5.5" fill="url(#cmh)"/>' +
      '</svg>';
    scene.appendChild(el);
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) { if (el.parentNode) el.parentNode.removeChild(el); _majorEventActive = false; return; }
      var _csw = scene.offsetWidth||400; var _csh = scene.offsetHeight||268;
      el.style.transform = 'translate(' + ((sx+p*38)/100*_csw).toFixed(1) + 'px,' + ((sy+p*18)/100*_csh).toFixed(1) + 'px)';
      el.style.opacity = String(p < 0.14 ? p / 0.14 : p > 0.78 ? (1 - p) / 0.22 : 1);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function _scheduleCometShower() {
    if (_cometTimeout) clearTimeout(_cometTimeout);
    var delay = 190000 + Math.random() * 380000; // 3–10 min
    _cometTimeout = setTimeout(function() {
      var ph = _skyPhaseId;
      if (ph === 'night' || ph === 'isha' || ph === 'prefajr') _triggerComet();
      _scheduleCometShower();
    }, delay);
  }

  // ── ISS pass (cross shape, faster than satellite) ─────────────────────────────
  function _triggerISS() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene || _issRaf || _majorEventActive || Date.now() < _prayerSoftUntil) return;
    _majorEventActive = true;
    var startY = 8 + Math.random() * 26;
    var endY   = startY - 3 - Math.random() * 9;
    var dur    = 9000 + Math.random() * 7000; // 9–16 s
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:0;left:0;z-index:6;pointer-events:none;will-change:transform';
    el.innerHTML =
      '<svg width="10" height="6" viewBox="0 0 10 6">' +
      '<rect x="0" y="2" width="10" height="2" fill="rgba(255,255,195,0.94)" rx="1"/>' +
      '<rect x="4" y="0" width="2" height="6" fill="rgba(210,232,255,0.90)" rx="0.5"/>' +
      '</svg>';
    scene.appendChild(el);
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        _issRaf = null;
        _majorEventActive = false;
        return;
      }
      var _sw = scene.offsetWidth || 400; var _sh = scene.offsetHeight || 268;
      el.style.transform = 'translate(' + ((-2 + p * 104)/100*_sw).toFixed(1) + 'px,' + ((startY + (endY-startY)*p)/100*_sh).toFixed(1) + 'px)';
      _issRaf = requestAnimationFrame(tick);
    }
    _issRaf = requestAnimationFrame(tick);
  }

  function _scheduleNextISS() {
    if (_issTimeout) clearTimeout(_issTimeout);
    var delay = 280000 + Math.random() * 420000; // 4.7–11.7 min
    _issTimeout = setTimeout(function() {
      var ph = _skyPhaseId;
      if (ph === 'night' || ph === 'isha' || ph === 'prefajr') _triggerISS();
      _scheduleNextISS();
    }, delay);
  }

  function _triggerShootingStar() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene) return;
    var x = 10 + Math.random() * 60;
    var y = 4 + Math.random() * 28;
    var el = document.createElement('div');
    el.className = 'sky-shoot';
    el.style.cssText = 'left:' + x + '%;top:' + y + '%;';
    scene.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  }

  // ── City traffic — tiny car lights moving along city base at night ───────────
  function _spawnCar() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene) return;
    var ph = _skyPhaseId;
    if (ph !== 'night' && ph !== 'isha' && ph !== 'dusk' && ph !== 'prefajr') return;
    var goRight = Math.random() > 0.5;
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;bottom:2.6%;left:0;z-index:9;pointer-events:none;will-change:transform';
    var clr = goRight ? 'rgba(255,238,170,0.90)' : 'rgba(255,50,50,0.90)';
    el.innerHTML = '<div style="display:flex;gap:3px">' +
      '<div style="width:2px;height:1.5px;background:' + clr + ';box-shadow:0 0 3px ' + clr + ';border-radius:1px"></div>' +
      '<div style="width:2px;height:1.5px;background:' + clr + ';box-shadow:0 0 3px ' + clr + ';border-radius:1px"></div>' +
      '</div>';
    scene.appendChild(el);
    var dur = 6000 + Math.random() * 10000;
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) { if (el.parentNode) el.parentNode.removeChild(el); return; }
      var _cw = scene.offsetWidth || 400;
      var _cx = goRight ? (-3 + p * 106) / 100 * _cw : (_cw - (-3 + p * 106) / 100 * _cw);
      el.style.transform = 'translateX(' + _cx.toFixed(1) + 'px)';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function _scheduleNextCar() {
    if (_carTimeout) clearTimeout(_carTimeout);
    var delay = 3200 + Math.random() * 7500;
    _carTimeout = setTimeout(function() {
      _spawnCar();
      _scheduleNextCar();
    }, delay);
  }

  function _scheduleNextShoot() {
    if (_shootTimeout) clearTimeout(_shootTimeout);
    var delay = 7000 + Math.random() * 18000;
    _shootTimeout = setTimeout(function() {
      var ph = _skyPhaseId;
      if (ph === 'night' || ph === 'isha' || ph === 'prefajr' || ph === 'dusk') {
        _triggerShootingStar();
      }
      _scheduleNextShoot();
    }, delay);
  }

  function buildSkyScene(container, data, city, today) {
    var scene = cel('div', 'sky-scene');
    scene.id = 'prayerSkyScene';
    scene.dataset.city = city;

    // Stars SVG — 60 stars with twinkling, color tints, and constellation lines
    var starSVG = '<svg class="sky-stars" viewBox="0 0 400 75" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">';
    // Constellation lines — 3 simple patterns, very faint
    var constPairs = [
      [0,1],[1,2],[2,4],      // top-left gentle arc
      [12,13],[13,14],        // upper-right trio (Orion-belt-ish)
      [30,31],[31,32]         // mid zone pair
    ];
    constPairs.forEach(function(pair) {
      var a = STARS[pair[0]], b = STARS[pair[1]];
      if (a && b) starSVG += '<line class="sky-const" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>';
    });
    STARS.forEach(function(s, idx) {
      var cls  = 'sky-star' + (s.tw > 0 ? ' sky-star-t' + (s.tw - 1) : '');
      var fill = STAR_TINTS[idx] || 'white';
      starSVG += '<circle class="' + cls + '" cx="' + s.x + '" cy="' + s.y + '" r="' + s.rx + '" fill="' + fill + '"/>';
    });
    starSVG += '</svg>';

    // Cloud SVGs — more organic multi-bump shapes (fill="currentColor" for phase tinting)
    var cloudSVGa = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 48" width="165" height="48"><path d="M5,40 Q5,28 18,26 Q15,12 30,10 Q44,8 50,18 Q56,10 68,12 Q80,8 86,20 Q96,18 102,26 Q114,24 116,34 Q90,38 5,40 Z" fill="currentColor"/></svg>';
    var cloudSVGb = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 36" width="120" height="36"><path d="M4,30 Q4,20 14,18 Q12,8 22,7 Q32,6 36,14 Q42,8 52,10 Q62,8 66,18 Q76,18 78,26 Q56,29 4,30 Z" fill="currentColor"/></svg>';
    var cloudSVGc = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185 52" width="185" height="52"><path d="M6,44 Q6,30 20,28 Q16,14 34,12 Q48,10 56,22 Q62,12 78,14 Q92,10 100,24 Q110,18 124,22 Q136,22 138,34 Q106,40 6,44 Z" fill="currentColor"/></svg>';

    // Sun rays — 8 rotating beams at varied widths
    var rayW = [125,95,115,80,130,90,110,75];
    var rayA = [0,45,90,135,180,225,270,315];
    var raysHTML = '<div class="sky-sun-rays" id="skySunRays"><div class="sky-sun-rays-inner">';
    for (var ri = 0; ri < 8; ri++) {
      raysHTML += '<div class="sky-sun-ray" style="width:' + rayW[ri] + 'px;transform:rotate(' + rayA[ri] + 'deg)"></div>';
    }
    raysHTML += '</div></div>';

    // Cirrus (wispy high-altitude) clouds — 4th layer, daytime only
    var cloudSVGd =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 18" width="280" height="18">' +
      '<path d="M0,14 Q28,7 55,11 Q85,4 115,8 Q148,2 178,6 Q208,2 238,5 Q260,8 280,4" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.65"/>' +
      '<path d="M18,11 Q48,5 72,9 Q100,3 126,7 Q155,2 175,6 Q196,3 215,5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.44"/>' +
      '</svg>';

    // Bird silhouette SVG — two separate wing paths for CSS d-animation flap
    var birdSVG =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 9" width="22" height="9">' +
      '<path class="sky-bwl" d="M11,5 Q5.5,0 0,5" stroke="rgba(0,0,0,0.68)" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path class="sky-bwr" d="M11,5 Q16.5,0 22,5" stroke="rgba(0,0,0,0.68)" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '</svg>';

    // Islamic city / mosque skyline — city lights, palms, crescent finial
    var horizSVG =
      '<svg class="sky-horizon" viewBox="0 0 400 78" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">' +
      '<path d="M0,78 L0,58 Q25,50 50,55 Q80,46 110,52 Q140,44 170,50 Q200,42 230,48 Q260,40 290,47 Q320,40 350,46 Q375,38 400,44 L400,78 Z" fill="rgba(0,0,0,0.20)"/>' +
      '<path d="M0,78 L0,65 L22,65 L22,56 L24,53 L26,56 L26,65 L42,65 L42,56 L44,52 Q46,45 48,52 L48,56 L48,65 L65,65 L65,58 L67,55 L69,58 L69,65 L88,65 L88,52 L90,48 L92,52 L92,65 L108,65 L108,60 L110,58 L112,60 L112,65 L130,65 L130,56 L132,53 L134,56 L134,65 L148,65 L148,58 L150,56 L152,58 L152,68 Z" fill="rgba(0,0,0,0.70)"/>' +
      '<path d="M141,68 Q140,58 138,50" stroke="rgba(0,0,0,0.80)" stroke-width="2" fill="none"/>' +
      '<path d="M138,50 Q128,44 122,46 M138,50 Q130,47 130,53 M138,50 Q136,42 143,44 M138,50 Q144,44 150,47" stroke="rgba(0,0,0,0.68)" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<rect x="158" y="48" width="84" height="20" fill="rgba(0,0,0,0.82)"/>' +
      '<path d="M177,48 Q175,34 188,26 Q200,20 212,26 Q225,34 223,48 Z" fill="rgba(0,0,0,0.82)"/>' +
      '<rect x="199.5" y="11" width="1.5" height="10" fill="rgba(195,165,45,0.88)"/>' +
      '<path d="M197,9 A 5,5 0 0 1 197,19 A 3.4,3.4 0 0 0 197,9 Z" fill="rgba(210,178,48,0.88)"/>' +
      '<path d="M152,68 L152,18 L155,13 L157,9 L159,13 L162,18 L162,68 Z" fill="rgba(0,0,0,0.82)"/>' +
      '<rect x="149" y="30" width="16" height="4" rx="1" fill="rgba(0,0,0,0.82)"/>' +
      '<path d="M238,68 L238,18 L241,13 L243,9 L245,13 L248,18 L248,68 Z" fill="rgba(0,0,0,0.82)"/>' +
      '<rect x="235" y="30" width="16" height="4" rx="1" fill="rgba(0,0,0,0.82)"/>' +
      '<path d="M259,68 Q260,58 262,50" stroke="rgba(0,0,0,0.80)" stroke-width="2" fill="none"/>' +
      '<path d="M262,50 Q272,44 278,46 M262,50 Q270,47 270,53 M262,50 Q264,42 257,44 M262,50 Q256,44 250,47" stroke="rgba(0,0,0,0.68)" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<path d="M242,68 L242,58 L244,56 L246,58 L246,65 L262,65 L262,56 L264,53 L266,56 L266,65 L284,65 L284,52 L286,48 L288,52 L288,65 L305,65 L305,60 L307,58 L309,60 L309,65 L326,65 L326,55 Q330,46 334,55 L334,65 L352,65 L352,58 L354,55 L356,58 L356,65 L374,65 L374,56 L376,53 L378,56 L378,65 L400,65 L400,78 Z" fill="rgba(0,0,0,0.70)"/>' +
      '<rect x="0" y="72" width="400" height="6" fill="rgba(0,0,0,0.62)"/>' +
      '<g id="skyLights" opacity="0">' +
        '<circle cx="24" cy="61" r="1.2" fill="rgba(255,200,80,.92)"/>' +
        '<circle cx="46" cy="59" r="1.1" fill="rgba(255,185,70,.88)"/>' +
        '<circle cx="46" cy="63" r="1.1" fill="rgba(255,195,75,.82)"/>' +
        '<circle cx="67" cy="62" r="1.2" fill="rgba(255,200,80,.90)"/>' +
        '<circle cx="90" cy="57" r="1.1" fill="rgba(255,190,72,.88)"/>' +
        '<circle cx="90" cy="62" r="1.1" fill="rgba(255,200,80,.85)"/>' +
        '<circle cx="110" cy="64" r="1.2" fill="rgba(255,195,75,.90)"/>' +
        '<circle cx="131" cy="61" r="1.1" fill="rgba(255,185,70,.88)"/>' +
        '<circle cx="133" cy="65" r="1.1" fill="rgba(255,200,80,.82)"/>' +
        '<circle cx="150" cy="64" r="1.2" fill="rgba(255,195,75,.88)"/>' +
        '<circle cx="157" cy="24" r="0.9" fill="rgba(255,220,100,.82)"/>' +
        '<circle cx="157" cy="35" r="0.9" fill="rgba(255,220,100,.80)"/>' +
        '<circle cx="157" cy="47" r="0.9" fill="rgba(255,220,100,.78)"/>' +
        '<circle cx="157" cy="58" r="0.9" fill="rgba(255,220,100,.82)"/>' +
        '<circle cx="243" cy="24" r="0.9" fill="rgba(255,220,100,.82)"/>' +
        '<circle cx="243" cy="35" r="0.9" fill="rgba(255,220,100,.80)"/>' +
        '<circle cx="243" cy="47" r="0.9" fill="rgba(255,220,100,.78)"/>' +
        '<circle cx="243" cy="58" r="0.9" fill="rgba(255,220,100,.82)"/>' +
        '<circle cx="244" cy="62" r="1.2" fill="rgba(255,200,80,.90)"/>' +
        '<circle cx="265" cy="61" r="1.1" fill="rgba(255,190,72,.88)"/>' +
        '<circle cx="265" cy="65" r="1.1" fill="rgba(255,200,80,.85)"/>' +
        '<circle cx="286" cy="57" r="1.2" fill="rgba(255,195,75,.90)"/>' +
        '<circle cx="286" cy="63" r="1.1" fill="rgba(255,185,70,.88)"/>' +
        '<circle cx="307" cy="64" r="1.2" fill="rgba(255,200,80,.88)"/>' +
        '<circle cx="329" cy="61" r="1.1" fill="rgba(255,195,75,.85)"/>' +
        '<circle cx="331" cy="65" r="1.1" fill="rgba(255,200,80,.82)"/>' +
        '<circle cx="354" cy="62" r="1.2" fill="rgba(255,190,72,.90)"/>' +
        '<circle cx="376" cy="61" r="1.1" fill="rgba(255,195,75,.88)"/>' +
        '<circle cx="377" cy="65" r="1.1" fill="rgba(255,185,70,.82)"/>' +
      '</g>' +
      '</svg>';

    // Floating particles (sunrise/sunset embers — 6 dots)
    var ptColors = ['rgba(255,160,60,0.9)','rgba(255,200,80,0.8)','rgba(255,130,50,0.85)',
                    'rgba(255,180,100,0.75)','rgba(255,150,70,0.9)','rgba(255,210,90,0.7)'];
    var ptPos  = [[12,68],[28,72],[45,65],[62,70],[78,73],[92,67]];
    var ptDur  = [4.2,5.8,3.6,6.2,4.8,5.2];
    var ptDel  = [0,1.5,2.8,0.7,3.5,1.2];
    var ptHTML = '';
    for (var pi = 0; pi < 6; pi++) {
      ptHTML += '<div id="skyPt' + pi + '" class="sky-pt" style="left:' + ptPos[pi][0] + '%;bottom:' + ptPos[pi][1] + 'px;background:' + ptColors[pi] + ';animation-duration:' + ptDur[pi] + 's;animation-delay:-' + ptDel[pi] + 's"></div>';
    }

    scene.innerHTML =
      '<div class="sky-bg" id="skyBg"></div>' +
      '<div class="sky-weather-dim" id="skyWeatherDim"></div>' +
      '<div class="sky-hz" id="skyHz"></div>' +
      '<div class="sky-nebula" id="skyNebula"></div>' +
      '<div class="sky-milkyway" id="skyMilkyway"></div>' +
      '<div class="sky-aurora" id="skyAurora">' +
        '<div class="sky-au1"></div><div class="sky-au2"></div><div class="sky-au3"></div>' +
      '</div>' +
      starSVG +
      '<div class="sky-cloud sky-cloud-a" id="skyCloudA">' + cloudSVGa + '</div>' +
      '<div class="sky-cloud sky-cloud-b" id="skyCloudB">' + cloudSVGb + '</div>' +
      '<div class="sky-cloud sky-cloud-c" id="skyCloudC">' + cloudSVGc + '</div>' +
      '<div class="sky-cloud sky-cloud-d" id="skyCloudD">' + cloudSVGd + '</div>' +
      '<div class="sky-venus" id="skyVenus"></div>' +
      '<div class="sky-cel-wrap" id="skyCelWrap">' +
        raysHTML +
        '<div class="sky-cel-glow" id="skyCelGlow"></div>' +
        '<div class="sky-cel" id="skyCel"></div>' +
      '</div>' +
      '<div class="sky-birds" id="skyBirds" style="position:absolute;inset:0">' +
        '<div class="sky-bird-1">' + birdSVG + '</div>' +
        '<div class="sky-bird-2">' + birdSVG + '</div>' +
        '<div class="sky-bird-3">' + birdSVG + '</div>' +
      '</div>' +
      ptHTML +
      '<div class="sky-godrays" id="skyGodRays"></div>' +
      '<div class="sky-fog" id="skyFog"></div>' +
      '<div class="sky-rainbow" id="skyRainbow"></div>' +
      '<div class="sky-rain" id="skyRain"></div>' +
      '<div class="sky-snow" id="skySnow"></div>' +
      '<div class="sky-wind" id="skyWind"></div>' +
      '<div class="sky-lightning" id="skyLightning"></div>' +
      '<div class="sky-thunder-flash" id="skyThunderFlash"></div>' +
      horizSVG +
      '<div class="sky-top-row">' +
        '<div class="sky-city">' + (getCityLabel(city)) + '</div>' +
        '<button class="sky-bell' + (getAthan() ? ' sky-bell--on' : '') + '" id="skyBell" onclick="(function(){window.PrayerUI&&document.getElementById(\'prayerSettingsOverlay\')&&document.getElementById(\'prayerSettingsOverlay\').classList.add(\'open\')})()"><i class="fas fa-' + (getAthan() ? 'bell' : 'bell-slash') + '"></i></button>' +
      '</div>' +
      '<div class="sky-bottom-row">' +
        '<div class="sky-next-name" id="skyNextName"></div>' +
        '<div class="sky-countdown" id="skyCountdown"></div>' +
        '<div class="sky-dates" id="skyDates"></div>' +
        '<div class="sky-sync" id="skySyncTime"></div>' +
      '</div>';

    container.appendChild(scene);

    // Populate rain drops (80 randomised streaks) — createElement avoids innerHTML XSS
    var _rainEl = document.getElementById('skyRain');
    if (_rainEl) {
      for (var _ri = 0; _ri < 80; _ri++) {
        var _drop = document.createElement('div');
        _drop.className = 'sky-drop';
        var _rh = (18 + Math.random() * 26).toFixed(0);
        var _rd = (0.45 + Math.random() * 0.75).toFixed(2);
        var _rde = (Math.random() * parseFloat(_rd)).toFixed(2);
        _drop.style.cssText = 'left:' + (Math.random()*102).toFixed(1) + '%;top:' + (Math.random()*100).toFixed(1) + '%;height:' + _rh + 'px;animation:sky-drop-fall ' + _rd + 's linear -' + _rde + 's infinite';
        _rainEl.appendChild(_drop);
      }
    }

    // Populate wind streaks (25 randomised lines) — createElement avoids innerHTML XSS
    var _windEl = document.getElementById('skyWind');
    if (_windEl) {
      for (var _wi = 0; _wi < 25; _wi++) {
        var _streak = document.createElement('div');
        _streak.className = 'sky-wind-streak';
        var _wdur = (1.0 + Math.random() * 2.0).toFixed(2);
        var _wdel = (Math.random() * parseFloat(_wdur)).toFixed(2);
        _streak.style.cssText = 'top:' + (8+Math.random()*76).toFixed(1) + '%;width:' + (55+Math.random()*110).toFixed(0) + 'px;height:' + (1+Math.random()*2).toFixed(1) + 'px;animation:sky-wind-streak ' + _wdur + 's linear -' + _wdel + 's infinite';
        _windEl.appendChild(_streak);
      }
    }

    // Populate snowflakes (60 particles, slow sway)
    var _snowEl = document.getElementById('skySnow');
    if (_snowEl) {
      for (var _si = 0; _si < 60; _si++) {
        var _flake = document.createElement('div');
        _flake.className = 'sky-flake';
        var _fs = (3 + Math.random() * 5).toFixed(1);
        var _fdur = (4.5 + Math.random() * 5).toFixed(2);
        var _fdel = (Math.random() * parseFloat(_fdur)).toFixed(2);
        _flake.style.cssText = 'left:' + (Math.random()*103).toFixed(1) + '%;top:' + (Math.random()*100).toFixed(1) + '%;width:' + _fs + 'px;height:' + _fs + 'px;animation:sky-flake-fall ' + _fdur + 's ease-in -' + _fdel + 's infinite';
        _snowEl.appendChild(_flake);
      }
    }

    // Populate lightning bolts (5 bolts at varied x positions)
    var _lgEl = document.getElementById('skyLightning');
    if (_lgEl) {
      var _boltXY = [[11,7],[29,14],[49,6],[68,17],[84,9]];
      _boltXY.forEach(function(pos) {
        var _bolt = document.createElement('div');
        _bolt.className = 'sky-bolt';
        var _bdur = (4.5 + Math.random() * 6).toFixed(1);
        var _bdel = (Math.random() * 7).toFixed(2);
        _bolt.style.cssText = 'left:' + pos[0] + '%;top:' + pos[1] + '%;animation:sky-bolt-strike ' + _bdur + 's ease -' + _bdel + 's infinite';
        var _svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        _svg.setAttribute('viewBox','0 0 28 90'); _svg.setAttribute('width','28'); _svg.setAttribute('height','90');
        var _poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        _poly.setAttribute('points','18,0 7,40 17,40 5,90');
        _poly.setAttribute('stroke','rgba(255,240,70,0.95)'); _poly.setAttribute('stroke-width','2.5');
        _poly.setAttribute('fill','none'); _poly.setAttribute('stroke-linecap','round'); _poly.setAttribute('stroke-linejoin','round');
        _svg.appendChild(_poly); _bolt.appendChild(_svg); _lgEl.appendChild(_bolt);
      });
    }

    // Kick off background weather fetch when Duhok is selected
    if (city === 'Duhok') _fetchPrayerWeather();

    // Oversize stars & horizon so parallax never reveals empty edges.
    // Stars at 0.15x gyro (max ~±1.4px) get 8px buffer (2% of 400px) — huge margin.
    // Horizon at 0.62x gyro (max ~±5.6px) gets 14px buffer (3.5% of 400px).
    var starsEl = scene.querySelector('.sky-stars');
    if (starsEl) { starsEl.style.left = '-2%'; starsEl.style.width = '104%'; }
    var horizEl = scene.querySelector('.sky-horizon');
    if (horizEl) { horizEl.style.left = '-3.5%'; horizEl.style.width = '107%'; }

    // Populate dates — Hijri only, with Intl fallback if API has no hijri field
    var dateInfo = data.date;
    var dateLines = [];
    if (dateInfo && dateInfo.hijri) {
      var _hMonth = (dateInfo.hijri.month && (dateInfo.hijri.month.ar || dateInfo.hijri.month.en)) || '';
      dateLines.push(dateInfo.hijri.day + ' ' + _hMonth + ' ' + dateInfo.hijri.year + ' هـ');
    } else if (dateInfo && dateInfo.hijriStr) {
      dateLines.push(dateInfo.hijriStr);
    } else {
      try {
        var _hd = new Intl.DateTimeFormat('ar-u-ca-islamic', { day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Baghdad' }).format(new Date(today + 'T12:00:00+03:00'));
        dateLines.push(_hd);
      } catch(_e) {}
    }
    var datesEl = document.getElementById('skyDates');
    if (datesEl) datesEl.innerHTML = dateLines.map(function(l) { return '<span>' + l + '</span>'; }).join('');

    // Settle animation: mark scene as "settling" so CSS transitions fire on first
    // _doUpdateSky() call, creating a soft 500ms ease-in when the tab opens.
    // We defer _doUpdateSky one frame so the browser registers the settle class first.
    var _settleScene = document.getElementById('prayerSkyScene');
    if (_settleScene) _settleScene.classList.add('sky-settle');
    _skyPhaseId  = null;
    _skyLastTick = 0;
    requestAnimationFrame(function() {
      _doUpdateSky();
      setTimeout(function() {
        var s = document.getElementById('prayerSkyScene');
        if (s) s.classList.remove('sky-settle');
      }, 700);
    });
  }

  function _doUpdateSky() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene || !_currentTimings || !_currentDateISO) return;
    var now  = new Date();
    var pid  = _skyPhaseName(_currentTimings, _currentDateISO, now);
    var ph   = SKY[pid];
    var pos  = _celestialPos(_currentTimings, _currentDateISO, now);

    // Gradient sky background
    var bg = document.getElementById('skyBg');
    if (bg) bg.style.background = 'linear-gradient(to bottom,' + ph.t + ',' + ph.b + ')';

    // Horizon glow
    var hz = document.getElementById('skyHz');
    if (hz) {
      hz.style.opacity = ph.h ? '1' : '0';
      if (ph.h) hz.style.background = 'radial-gradient(ellipse 100% 45% at 50% 100%,' + ph.h + ',transparent)';
    }

    // Stars
    var stars = scene.querySelector('.sky-stars');
    if (stars) stars.style.opacity = String(ph.s);

    // Milky Way (deep night only)
    var milkyway = document.getElementById('skyMilkyway');
    if (milkyway) milkyway.style.opacity = String(ph.s > 0.6 ? (ph.s - 0.6) * 2.2 : 0);

    // Nebula glow (deep night)
    var nebula = document.getElementById('skyNebula');
    if (nebula) nebula.style.opacity = String(ph.s > 0.8 ? (ph.s - 0.8) * 4 : 0);

    // Aurora (night/near-night only)
    var aurora = document.getElementById('skyAurora');
    if (aurora) aurora.style.opacity = String(ph.au);

    // Clouds — opacity + color (color CSS prop drives fill="currentColor" on SVG paths)
    var cloudColor = CLOUD_COLOR[pid] || 'rgba(255,255,255,0.5)';
    ['skyCloudA','skyCloudB','skyCloudC','skyCloudD'].forEach(function(id) {
      var cl = document.getElementById(id);
      if (cl) { cl.style.opacity = String(ph.cl); cl.style.color = cloudColor; }
    });

    // Celestial body position + appearance
    var celWrap = document.getElementById('skyCelWrap');
    var celEl   = document.getElementById('skyCel');
    var glowEl  = document.getElementById('skyCelGlow');
    if (celWrap) { celWrap.style.left = pos.x + '%'; celWrap.style.top = pos.y + '%'; }
    if (celEl) {
      celEl.style.background = ph.c;
      celEl.className = 'sky-cel ' + (pos.isSun ? 'sky-cel-sun' : 'sky-cel-moon');
    }
    if (glowEl) glowEl.style.background = 'radial-gradient(circle,' + ph.co + ' 0%,transparent 65%)';

    // Moon crescent — CSS var on scene sets the "bite" background to match sky top color
    scene.style.setProperty('--sky-crescent', ph.t);

    // Sun rays — visible only during daytime
    var sunRays = document.getElementById('skySunRays');
    if (sunRays) sunRays.style.opacity = pos.isSun ? '1' : '0';

    // Birds — opacity driven by phase
    var birds = document.getElementById('skyBirds');
    if (birds) birds.style.opacity = String(ph.br);

    // Particles — opacity driven by phase (sunrise/sunset embers)
    for (var pi = 0; pi < 6; pi++) {
      var pt = document.getElementById('skyPt' + pi);
      if (pt) pt.style.opacity = String(ph.pa);
    }

    // Bell icon state
    var bell = document.getElementById('skyBell');
    if (bell) {
      var on = getAthan();
      bell.innerHTML = '<i class="fas fa-' + (on ? 'bell' : 'bell-slash') + '"></i>';
      bell.classList.toggle('sky-bell--on', on);
    }

    // City lights — visible at night, dusk, isha; hidden daytime
    var lights = document.getElementById('skyLights');
    if (lights) {
      var lightsOp = pid === 'night' || pid === 'isha' ? 0.92
                   : pid === 'dusk'  ? 0.55
                   : pid === 'prefajr' ? 0.30
                   : 0;
      lights.style.opacity = String(lightsOp);
    }

    // God rays / crepuscular rays (sunrise / fajr / sunset / asr) — hidden during storms
    // NOTE: godrays CSS animation uses transform:scaleX (not opacity) so JS opacity works
    var godrays = document.getElementById('skyGodRays');
    if (godrays) {
      var grOp = pid === 'sunrise' ? 0.92 : pid === 'fajr' ? 0.60 : pid === 'sunset' ? 0.88 : pid === 'asr' ? 0.42 : 0;
      godrays.style.opacity = String(grOp);
    }

    // Fog / mist layer (early morning — prefajr / fajr)
    var fog = document.getElementById('skyFog');
    if (fog) {
      var fogOp = pid === 'prefajr' ? 0.75 : pid === 'fajr' ? 0.55 : pid === 'morning' ? 0.18 : 0;
      fog.style.opacity = String(fogOp);
    }

    // Rainbow arc (sunrise → morning) — hidden during heavy weather
    var rainbow = document.getElementById('skyRainbow');
    if (rainbow) {
      var rbOp = pid === 'sunrise' ? 0.85 : pid === 'morning' ? 0.55 : 0;
      rainbow.style.opacity = String(rbOp);
    }

    // Weather overlay — rain / snow / thunder / wind (Duhok only)
    var _weatherCond = 'clear';
    if (getCity() === 'Duhok') {
      try {
        var _wdata = JSON.parse(localStorage.getItem(_WEATHER_KEY));
        if (_wdata && (Date.now() - _wdata.ts) < 30 * 60 * 1000) _weatherCond = _wdata.condition || 'clear';
      } catch(e) {}
    }
    var _wRain    = _weatherCond === 'rain'    || _weatherCond === 'thunder';
    var _wSnow    = _weatherCond === 'snow';
    var _wWind    = _weatherCond === 'wind';
    var _wThunder = _weatherCond === 'thunder';

    // Sky dimming overlay — makes sky look overcast/stormy
    var _dimEl = document.getElementById('skyWeatherDim');
    if (_dimEl) {
      var _dimBg = _wThunder ? 'rgba(18,18,28,.54)'
                 : _wRain    ? 'rgba(28,32,42,.30)'
                 : _wSnow    ? 'rgba(195,210,228,.16)'
                 : _wWind    ? 'rgba(195,215,235,.07)'
                 : 'rgba(0,0,0,0)';
      _dimEl.style.background = _dimBg;
      _dimEl.style.opacity = (_wThunder || _wRain || _wSnow || _wWind) ? '1' : '0';
    }

    var _skyRainEl  = document.getElementById('skyRain');
    var _skySnowEl  = document.getElementById('skySnow');
    var _skyWindEl  = document.getElementById('skyWind');
    var _skyLgEl    = document.getElementById('skyLightning');
    var _skyFlash   = document.getElementById('skyThunderFlash');

    if (_skyRainEl)  _skyRainEl.classList.toggle('active', _wRain);
    if (_skySnowEl)  _skySnowEl.classList.toggle('active', _wSnow);
    if (_skyWindEl)  _skyWindEl.classList.toggle('active', _wWind);
    if (_skyLgEl)    _skyLgEl.classList.toggle('active', _wThunder);

    // Thunder: sky-wide flash strobe
    if (_skyFlash) {
      if (_wThunder) {
        if (!_skyFlash.style.animation) {
          _skyFlash.style.animation = 'sky-flash ' + (5 + Math.random() * 7).toFixed(1) + 's ease infinite';
        }
      } else {
        _skyFlash.style.animation = '';
      }
    }

    // Cloud colour: override to match weather (dark gray storm, pale blue snow)
    var _weatherCloudColor = _wThunder ? 'rgba(42,42,52,.96)'
                           : _wRain    ? 'rgba(88,98,112,.92)'
                           : _wSnow    ? 'rgba(210,220,232,.88)'
                           : _wWind    ? 'rgba(155,165,180,.80)'
                           : cloudColor;
    // Cloud opacity boost per condition; clear resets to phase value
    var _cloudBoost = _wThunder ? 0.55 : _wRain ? 0.38 : _wSnow ? 0.22 : _wWind ? 0.14 : 0;
    var _useCloudColor = (_wThunder || _wRain || _wSnow || _wWind);
    ['skyCloudA','skyCloudB','skyCloudC'].forEach(function(cid) {
      var cl = document.getElementById(cid);
      if (!cl) return;
      cl.style.color   = _useCloudColor ? _weatherCloudColor : cloudColor;
      cl.style.opacity = _cloudBoost > 0 ? String(Math.min(1, (ph.cl || 0) + _cloudBoost)) : String(ph.cl || 0);
    });

    // During rain/thunder suppress stars, god rays, birds (overcast sky, birds shelter)
    if (stars) stars.style.opacity = (_wRain || _wThunder) ? '0' : String(ph.s);
    if (godrays) godrays.style.opacity = (_wRain || _wThunder || _wSnow) ? '0' : godrays.style.opacity;
    if (birds)   birds.style.opacity   = (_wRain || _wThunder)            ? '0' : String(ph.br);
    // Dim sun/moon during overcast — cloud cover hides direct celestial light
    if (glowEl) glowEl.style.opacity = (_wRain || _wThunder) ? '0.18' : '1';
    if (sunRays) sunRays.style.opacity = (_wRain || _wThunder || _wSnow) ? '0' : (pos.isSun ? '1' : '0');
    // Rainbow and fog don't appear during active weather (overridden below phase-set value)
    if (rainbow && (_wRain || _wThunder || _wSnow || _wWind)) rainbow.style.opacity = '0';
    if (fog    && (_wRain || _wThunder || _wSnow))            fog.style.opacity     = '0';

    // Cirrus clouds (high-altitude, daytime only) — hidden during rain/thunder (thick overcast)
    var cirrus = document.getElementById('skyCloudD');
    if (cirrus) {
      var cirOp = (_wRain || _wThunder) ? 0
                : pid === 'morning' || pid === 'noon' || pid === 'afternoon' ? 0.50
                : pid === 'asr' || pid === 'sunrise' ? 0.32 : 0;
      // During snow/wind: cirrus stays but takes weather cloud color
      cirrus.style.opacity = _cloudBoost > 0 ? String(Math.min(1, cirOp + _cloudBoost * 0.5)) : String(cirOp);
      cirrus.style.color   = _useCloudColor ? _weatherCloudColor : cloudColor;
    }

    // Venus — evening star (dusk/isha) or morning star (prefajr/fajr)
    var venus = document.getElementById('skyVenus');
    if (venus) {
      var venOp = 0, venX = 80, venY = 64;
      if      (pid === 'dusk')    { venOp = 0.92; venX = 80; venY = 62; }
      else if (pid === 'isha')    { venOp = 0.55; venX = 84; venY = 68; }
      else if (pid === 'prefajr') { venOp = 0.88; venX = 20; venY = 62; }
      else if (pid === 'fajr')    { venOp = 0.48; venX = 16; venY = 68; }
      venus.style.opacity = String(venOp);
      venus.style.left    = venX + '%';
      venus.style.top     = venY + '%';
    }

    _skyPhaseId = pid;

    // Sky tint → CSS var on #prayerContent (drives subtle grid card tint)
    var SKY_TINT_RGB = {
      night:'15,20,40',   prefajr:'28,12,48',  fajr:'58,25,15',
      sunrise:'160,90,25',morning:'30,85,145',  noon:'15,70,145',
      afternoon:'25,80,150', asr:'130,70,15',   sunset:'110,25,15',
      dusk:'44,16,62',    isha:'10,10,32'
    };
    var prayerContent = document.getElementById('prayerContent');
    if (prayerContent) prayerContent.style.setProperty('--sky-tint-rgb', SKY_TINT_RGB[pid] || '15,20,40');
  }

  function tickSky() {
    if (document.hidden) return; // tab backgrounded — skip sky updates
    var now = Date.now();
    if (now - _skyLastTick < 30000) return; // update every 30s max
    _skyLastTick = now;
    _doUpdateSky();
    if (getCity() === 'Duhok') _fetchPrayerWeather(); // re-fetch when cache expires (30 min TTL)
    if (!_shootTimeout)    _scheduleNextShoot();
    if (!_aircraftTimeout) _scheduleNextAircraft();
    if (!_satelliteTimeout) _scheduleNextSatellite();
    if (!_lightningTimeout) _scheduleNextLightning();
    if (!_meteorTimeout)   _scheduleMeteorShower();
    if (!_balloonTimeout)  _scheduleNextBalloon();
    if (!_lanternTimeout)  _scheduleNextLantern();
    if (!_fireflyTimeout)  _scheduleNextFirefly();
    if (!_cometTimeout)    _scheduleCometShower();
    if (!_issTimeout)      _scheduleNextISS();
    if (!_carTimeout)      _scheduleNextCar();
  }

  // ─── Gyro Parallax ─────────────────────────────────────────────────────────

  function _applyParallax() {
    var scene = document.getElementById('prayerSkyScene');
    if (!scene) { stopGyro(); return; }

    var x = _gyroX, y = _gyroY;

    // Layer 1 — Stars (most distant, smallest shift, ~±1.4px max)
    var stars = scene.querySelector('.sky-stars');
    if (stars) stars.style.transform =
      'translate(' + (x * 0.15).toFixed(2) + 'px,' + (y * 0.08).toFixed(2) + 'px)';

    // Layer 2 — Aurora (very subtle depth hint)
    var aurora = document.getElementById('skyAurora');
    if (aurora) aurora.style.transform =
      'translateX(' + (x * 0.10).toFixed(2) + 'px)';

    // Layer 3 — Horizon glow
    var hz = document.getElementById('skyHz');
    if (hz) hz.style.transform =
      'translateX(' + (x * 0.12).toFixed(2) + 'px)';

    // Layer 4 — Clouds (vertical only — horizontal fights CSS drift animation)
    ['skyCloudA','skyCloudB','skyCloudC','skyCloudD'].forEach(function(id) {
      var cl = document.getElementById(id);
      if (cl) cl.style.transform = cl.style.transform.replace(/\s*translateY\([^)]*\)/,'') + ' translateY(' + (y * 0.08).toFixed(2) + 'px)';
    });

    // Layer 5 — Sun/moon (mid-depth)
    var celWrap = document.getElementById('skyCelWrap');
    if (celWrap) celWrap.style.transform =
      'translate(calc(-50% + ' + (x * 0.40).toFixed(2) + 'px), calc(-50% + ' + (y * 0.22).toFixed(2) + 'px))';

    // Layer 6 — Birds (slightly closer than sun)
    var birds = document.getElementById('skyBirds');
    if (birds) birds.style.transform =
      'translate(' + (x * 0.28).toFixed(2) + 'px,' + (y * 0.14).toFixed(2) + 'px)';

    // Layer 7 — City skyline (closest, strongest shift, ~±5.6px max — within safe margin)
    var horizon = scene.querySelector('.sky-horizon');
    if (horizon) horizon.style.transform =
      'translateX(' + (x * 0.62).toFixed(2) + 'px)';
  }

  function _gyroLoop() {
    _gyroRaf = requestAnimationFrame(_gyroLoop);
    // Smooth lerp — 4% per frame for buttery-smooth tracking (~60fps)
    _gyroX += (_gyroTX - _gyroX) * 0.04;
    _gyroY += (_gyroTY - _gyroY) * 0.04;
    _applyParallax();
  }

  function startGyro() {
    if (_gyroHandler || !window.DeviceOrientationEvent) return;
    _gyroBaseG = null; _gyroBaseB = null;
    _gyroHandler = function(e) {
      var g = e.gamma || 0;   // left-right tilt (-90 to 90)
      var b = e.beta  || 0;   // front-back tilt (-180 to 180)
      // Calibrate on first event so current hold position = center
      if (_gyroBaseG === null) { _gyroBaseG = g; _gyroBaseB = b; return; }
      // Clamp to ±14° range, map to pixel targets (tighter = more polished)
      var dx = Math.max(-14, Math.min(14, g - _gyroBaseG));
      var dy = Math.max(-10, Math.min(10, b - _gyroBaseB));
      _gyroTX = dx * 0.65;  // ~±9px max
      _gyroTY = dy * 0.50;  // ~±5px max
    };
    window.addEventListener('deviceorientation', _gyroHandler, true);
    if (!_gyroRaf) _gyroLoop();
  }

  function stopGyro() {
    if (_gyroHandler) {
      window.removeEventListener('deviceorientation', _gyroHandler, true);
      _gyroHandler = null;
    }
    if (_gyroRaf) { cancelAnimationFrame(_gyroRaf); _gyroRaf = null; }
    _gyroX = 0; _gyroY = 0; _gyroTX = 0; _gyroTY = 0;
    _gyroBaseG = null; _gyroBaseB = null;
  }

  // ─── Countdown ─────────────────────────────────────────────────────────────

  function stopCountdown() {
    if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
    if (_shootTimeout) { clearTimeout(_shootTimeout); _shootTimeout = null; }
    if (_aircraftTimeout)  { clearTimeout(_aircraftTimeout);  _aircraftTimeout = null; }
    if (_aircraftRaf)      { cancelAnimationFrame(_aircraftRaf); _aircraftRaf = null; }
    if (_lightningTimeout) { clearTimeout(_lightningTimeout); _lightningTimeout = null; }
    if (_balloonTimeout)   { clearTimeout(_balloonTimeout);   _balloonTimeout = null; }
    if (_balloonRaf)       { cancelAnimationFrame(_balloonRaf); _balloonRaf = null; }
    if (_lanternTimeout)   { clearTimeout(_lanternTimeout);   _lanternTimeout = null; }
    if (_satelliteTimeout) { clearTimeout(_satelliteTimeout); _satelliteTimeout = null; }
    if (_satelliteRaf)     { cancelAnimationFrame(_satelliteRaf); _satelliteRaf = null; }
    if (_meteorTimeout)    { clearTimeout(_meteorTimeout);    _meteorTimeout = null; }
    if (_fireflyTimeout)   { clearTimeout(_fireflyTimeout);   _fireflyTimeout = null; }
    if (_cometTimeout)     { clearTimeout(_cometTimeout);     _cometTimeout = null; }
    if (_issTimeout)       { clearTimeout(_issTimeout);       _issTimeout = null; }
    if (_issRaf)           { cancelAnimationFrame(_issRaf);   _issRaf = null; }
    if (_carTimeout)       { clearTimeout(_carTimeout);       _carTimeout = null; }
    // Remove any mid-flight JS-animated elements so they don't freeze in scene on re-entry
    var _scene = document.getElementById('prayerSkyScene');
    if (_scene) {
      ['sky-aircraft','sky-balloon','sky-satellite','sky-iss','sky-car'].forEach(function(cls){
        _scene.querySelectorAll('.'+cls).forEach(function(e){ if(e.parentNode) e.parentNode.removeChild(e); });
      });
    }
    _majorEventActive  = false;
    _urgencyLevel      = -1;
    _lastMinuteMark    = '';
    _lastNextName      = '';
    _prayerSoftUntil   = 0;
    stopGyro();
  }

  function startCountdown() {
    stopCountdown();
    _skyLastTick = 0; // reset so sky animations reschedule immediately
    _countdownInterval = setInterval(tickCountdown, 1000);
    tickCountdown();
    startGyro();
  }

  function tickCountdown() {
    if (document.hidden) return; // backgrounded — skip, saves battery
    if (!_currentTimings || !_currentDateISO) return;

    // ── Midnight rollover: Baghdad calendar day changed while the app was open ──
    // Handles long sessions where the user never closes the app overnight.
    // tickCountdown() is the only code that runs continuously while the panel is
    // visible, so this is the right place to detect the day boundary.
    var _todayCheck = window.PrayerLogic.todayBaghdad();
    if (_currentDateISO !== _todayCheck) {
      console.log('[PrayerUI] midnight rollover detected: ' + _currentDateISO + ' → ' + _todayCheck + ' — refreshing panel');
      _currentTimings  = null;
      _currentDateISO  = null;
      _currentData     = null;
      _tomorrowTimings = null;
      _tomorrowDateISO = null;
      _fetchingTomorrow = false;
      _renderedKey     = null;
      render();
      return;
    }

    var now  = new Date();
    var pl   = window.PrayerLogic;
    var next = pl.getNextPrayer(_currentTimings, _currentDateISO, now);

    // Cache element lookups — only query DOM once after each buildPanel()
    if (!_cdEls) {
      _cdEls = {
        skyCd:   document.getElementById('skyCountdown'),
        skyName: document.getElementById('skyNextName'),
        cdEl:    document.getElementById('prayerCountdown'),
        nameEl:  document.getElementById('prayerNextName')
      };
    }
    if (!_gridCards) {
      _gridCards = document.querySelectorAll('.prayer-grid-card[data-prayer]');
    }
    var skyCd   = _cdEls.skyCd;
    var skyName = _cdEls.skyName;
    var cdEl    = _cdEls.cdEl;
    var nameEl  = _cdEls.nameEl;

    var nowMs = now.getTime();

    if (next) {
      var cd   = pl.formatCountdown(next.time - now);
      var name = tStr(PRAYER_I18N[next.name] || next.name);

      // ── Urgency level ────────────────────────────────────────────────────────
      var msLeft = next.time - nowMs;
      var newUrgency = msLeft > 7200000 ? 0   // >2h: calm
                     : msLeft > 1800000 ? 1   // 30min–2h: warming
                     : msLeft > 600000  ? 2   // 10–30min: close
                     :                    3;  // <10min: imminent
      if (newUrgency !== _urgencyLevel) {
        _urgencyLevel = newUrgency;
        var skScene = document.getElementById('prayerSkyScene');
        if (skScene) {
          skScene.classList.remove('urgency-0','urgency-1','urgency-2','urgency-3');
          skScene.classList.add('urgency-' + _urgencyLevel);
        }
      }

      // ── Prayer moment: 3-min calm + 12-min soft phase after prayer starts ──────
      if (_lastNextName && _lastNextName !== next.name) {
        _prayerMomentUntil = nowMs + 180000;  // stage 1: full calm 3 min
        _prayerSoftUntil   = nowMs + 900000;  // stage 2: soft restriction 15 min total
      }

      // ── Name transition animation ─────────────────────────────────────────────
      if (_lastNextName !== next.name && _lastNextName !== '') {
        if (skyName) { skyName.classList.remove('sky-name-in'); void skyName.offsetWidth; skyName.classList.add('sky-name-in'); }
      }
      _lastNextName = next.name;

      // ── Minute pulse ─────────────────────────────────────────────────────────
      var minuteMark = String(Math.floor(msLeft / 60000));
      if (minuteMark !== _lastMinuteMark) {
        _lastMinuteMark = minuteMark;
        if (skyCd) { skyCd.classList.remove('sky-cd-pulse'); void skyCd.offsetWidth; skyCd.classList.add('sky-cd-pulse'); }
      }

      if (skyCd)   skyCd.textContent   = cd;
      if (skyName) skyName.textContent = name;
      if (cdEl)    cdEl.textContent    = cd;
      if (nameEl)  nameEl.textContent  = name;
      var _appPLtick = window.App && window.App.prayerLog;
      var _tickLog   = _appPLtick ? _appPLtick.get() : {};
      var _tickDay   = _appPLtick ? _appPLtick.prayerDay() : '';
      _gridCards.forEach(function(el) {
        var pName = el.dataset.prayer;
        var isNext2 = pName === next.name;
        // Only show done dot when prayer day matches grid date — prevents yesterday's
        // done state bleeding onto today's grid in the pre-Fajr window (00:00–Fajr)
        // where prayerDay() still returns yesterday but the grid shows today's times.
        var isDone2 = pName === 'Sunrise' || (
          _tickDay === _currentDateISO &&
          !!(_tickLog[_tickDay] && _tickLog[_tickDay][pName])
        );
        el.classList.toggle('prayer-grid-card--next', isNext2);
        el.classList.toggle('prayer-grid-card--done', isDone2);
        if (_currentTimings && _currentDateISO) {
          var raw3 = _currentTimings[pName] || '';
          if (raw3) {
            var pTime = pl.parseAsDate(raw3, _currentDateISO);
            el.classList.toggle('prayer-grid-card--passed', pTime < now && !isNext2);
          }
        }
      });
    } else {
      // All prayers passed — urgency off, no moment
      if (_urgencyLevel !== 0) {
        _urgencyLevel = 0;
        var skScene2 = document.getElementById('prayerSkyScene');
        if (skScene2) { skScene2.classList.remove('urgency-0','urgency-1','urgency-2','urgency-3'); }
      }

      var cd2, name2;
      if (_tomorrowTimings && _tomorrowDateISO) {
        var fajrAt = pl.parseAsDate(_tomorrowTimings.Fajr, _tomorrowDateISO);
        cd2   = pl.formatCountdown(fajrAt - now);
        name2 = tStr('prayer.fajr') + ' — ' + tStr('prayer.tomorrow');
      } else {
        cd2   = '--:--:--';
        name2 = tStr('prayer.fajr');
        fetchTomorrow();
      }
      if (skyCd)   skyCd.textContent   = cd2;
      if (skyName) skyName.textContent = name2;
      if (cdEl)    cdEl.textContent    = cd2;
      if (nameEl)  nameEl.textContent  = name2;
      var _appPLtick2 = window.App && window.App.prayerLog;
      var _tickLog2   = _appPLtick2 ? _appPLtick2.get() : {};
      var _tickDay2   = _appPLtick2 ? _appPLtick2.prayerDay() : '';
      _gridCards.forEach(function(el) {
        var pName2 = el.dataset.prayer;
        // Same guard as active-prayer branch — no cross-day done bleed
        var isDone2b = pName2 === 'Sunrise' || (
          _tickDay2 === _currentDateISO &&
          !!(_tickLog2[_tickDay2] && _tickLog2[_tickDay2][pName2])
        );
        el.classList.remove('prayer-grid-card--next');
        el.classList.add('prayer-grid-card--passed');
        el.classList.toggle('prayer-grid-card--done', isDone2b);
      });
    }

    // ── Prayer-moment calm state on sky scene ─────────────────────────────────
    var inMoment = nowMs < _prayerMomentUntil;
    var inSoft   = !inMoment && nowMs < _prayerSoftUntil;
    var skSceneMoment = document.getElementById('prayerSkyScene');
    if (skSceneMoment) {
      skSceneMoment.classList.toggle('prayer-moment', inMoment);
      skSceneMoment.classList.toggle('prayer-soft', inSoft);
    }

    // Update sky visuals every 30s — only enter tickSky if 30s have elapsed (avoids function call overhead)
    if (Date.now() - _skyLastTick >= 30000) tickSky();
  }

  async function fetchTomorrow() {
    if (_tomorrowTimings || _fetchingTomorrow) return;
    _fetchingTomorrow = true;
    var city    = getCity();
    var dateISO = window.PrayerLogic.tomorrowBaghdad();
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, dateISO);
      _tomorrowTimings = data.timings;
      _tomorrowDateISO = dateISO;
    } catch(e) {}
    _fetchingTomorrow = false;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  // Read today's data directly from localStorage cache — no Promise, no await.
  // Returns a data object ready for buildPanel(), or null if not cached yet.
  function readCacheNow(city, today) {
    var parts   = today.split('-').map(Number);
    var mkey    = window.PrayerCache.monthKey(city, parts[0], parts[1]);
    var monthly = window.PrayerCache.read(mkey);
    if (!monthly || !monthly.days) return null;
    var d = monthly.days[parts[2]] || monthly.days[String(parts[2])];
    if (!d) return null;
    return {
      timings: { Fajr: d.Fajr, Sunrise: d.Sunrise, Dhuhr: d.Dhuhr,
                 Asr:  d.Asr,  Maghrib: d.Maghrib,  Isha:  d.Isha },
      date: { hijriStr: d.hijri || null }
    };
  }

  // Find ANY cached day across current + previous month — used as offline fallback
  function readAnyCacheNow(city) {
    var today = window.PrayerLogic.todayBaghdad();
    var parts = today.split('-').map(Number);
    for (var mo = 0; mo >= -1; mo--) {
      var d = new Date(parts[0], parts[1] - 1 + mo, 1);
      var mkey = window.PrayerCache.monthKey(city, d.getFullYear(), d.getMonth() + 1);
      var monthly = window.PrayerCache.read(mkey);
      if (monthly && monthly.days) {
        var days = Object.keys(monthly.days).map(Number).sort(function(a, b) { return b - a; });
        for (var i = 0; i < days.length; i++) {
          var day = monthly.days[days[i]] || monthly.days[String(days[i])];
          if (day && day.Fajr) {
            return {
              timings: { Fajr: day.Fajr, Sunrise: day.Sunrise, Dhuhr: day.Dhuhr,
                         Asr: day.Asr, Maghrib: day.Maghrib, Isha: day.Isha },
              date: { hijriStr: day.hijri || null },
              _fromCache: true
            };
          }
        }
      }
    }
    return null;
  }

  // Read tomorrow's prayer data from the monthly cache (no network).
  // Returns { timings, dateISO } or null.
  function readTomorrowCacheNow(city, todayISO) {
    if (!window.PrayerCache) return null;
    try {
      var parts = todayISO.split('-').map(Number);
      var tom = new Date(parts[0], parts[1] - 1, parts[2] + 1);
      var ty = tom.getFullYear(), tm = tom.getMonth() + 1, td = tom.getDate();
      var tISO = ty + '-' + String(tm).padStart(2,'0') + '-' + String(td).padStart(2,'0');
      var mkey = window.PrayerCache.monthKey(city, ty, tm);
      var monthly = window.PrayerCache.read(mkey);
      if (!monthly || !monthly.days) return null;
      var d = monthly.days[td] || monthly.days[String(td)];
      if (!d || !d.Fajr) return null;
      return {
        dateISO: tISO,
        timings: { Fajr: d.Fajr, Sunrise: d.Sunrise, Dhuhr: d.Dhuhr,
                   Asr:  d.Asr,  Maghrib: d.Maghrib,  Isha:  d.Isha }
      };
    } catch(e) { return null; }
  }

  // Push prayer data to Android and iOS widgets.
  // source: why this push was triggered (prayerChange, cityChange, foreground, forceRefresh, etc.)
  // Helpers for enriched snapshot fields ──────────────────────────────────────

  // Baghdad is UTC+3 (no DST). Baghdad midnight of dateStr = UTC midnight - 3 h.
  function _baghdadMidnightMs(dateStr) {
    var p = dateStr.split('-').map(Number);
    if (p.length < 3) return 0;
    return Date.UTC(p[0], p[1]-1, p[2]) - 3 * 3600 * 1000;
  }

  // Parse "HH:MM" on dateStr (Baghdad) → Unix ms.
  function _parsePrayerMs(hm, dateStr) {
    var hmP = (hm || '').split(':').map(Number);
    if (hmP.length < 2) return 0;
    return _baghdadMidnightMs(dateStr) + (hmP[0] * 60 + hmP[1]) * 60000;
  }

  // Compute {currentPrayer, nextPrayer} from today's and tomorrow's timings.
  function _computePrayerState(timings, dateISO, tom, tomDateISO) {
    var ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    var now = Date.now();
    var currentPrayer = null, nextPrayer = null, lastMs = -Infinity;
    ORDER.forEach(function(name) {
      var ms = _parsePrayerMs((timings[name] || '').split(' ')[0], dateISO);
      if (!ms) return;
      if (ms <= now && ms > lastMs) { currentPrayer = name; lastMs = ms; }
      if (ms > now && !nextPrayer)  { nextPrayer = {name: name, timeMs: ms}; }
    });
    if (!nextPrayer && tom && tomDateISO) {
      ORDER.forEach(function(name) {
        if (nextPrayer) return;
        var ms = _parsePrayerMs((tom[name] || '').split(' ')[0], tomDateISO);
        if (ms && ms > now) nextPrayer = {name: name, timeMs: ms};
      });
    }
    return {currentPrayer: currentPrayer, nextPrayer: nextPrayer};
  }

  // JS-side prayer boundary timers — fire while app is in foreground.
  // Calls pushWidgetIfStale at each prayer start so the widget reloads immediately.
  var _boundaryTimers = [];
  function _clearBoundaryTimers() {
    _boundaryTimers.forEach(function(id) { clearTimeout(id); });
    _boundaryTimers = [];
  }
  function _schedulePrayerBoundaryTimers(timings, dateISO, tom, tomDateISO) {
    _clearBoundaryTimers();
    var ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    var now = Date.now();
    function schedule(ms, label) {
      var delay = ms - now;
      if (delay < 500 || delay > 26 * 3600 * 1000) return; // ignore past or far-future
      var id = setTimeout(function() {
        console.log('[PrayerBoundary] timer fired label=' + label + ' at=' + new Date(ms).toISOString());
        if (window.PrayerUI && window.PrayerUI.pushWidgetIfStale) {
          // Clear stale guard so push fires unconditionally at boundary
          localStorage.removeItem('widgetLastPushedDate');
          window.PrayerUI.pushWidgetIfStale();
        }
      }, delay);
      _boundaryTimers.push(id);
      console.log('[PrayerSync] boundary scheduled ' + label + ' in ' + Math.round(delay/1000) + 's');
    }
    ORDER.forEach(function(name) {
      var ms = _parsePrayerMs((timings[name] || '').split(' ')[0], dateISO);
      if (ms) schedule(ms + 1000, name);
    });
    if (tom && tomDateISO) {
      ORDER.forEach(function(name) {
        var ms = _parsePrayerMs((tom[name] || '').split(' ')[0], tomDateISO);
        if (ms) schedule(ms + 1000, name + '_tomorrow');
      });
    }
    // Midnight rollover: Baghdad midnight tomorrow + 5 s
    var midnightMs = _baghdadMidnightMs(tomDateISO || dateISO) + (tomDateISO ? 0 : 86400000);
    schedule(midnightMs + 5000, 'midnight');
  }

  function pushWidgetData(data, city, dateISO, source) {
    try {
      var _src = source || 'prayerChange';
      var t = data.timings;
      var hijriStr = '';
      if (data.date && data.date.hijri) {
        var _hm = data.date.hijri.month && (data.date.hijri.month.en || data.date.hijri.month) || '';
        hijriStr = data.date.hijri.day + ' ' + _hm + ' ' + data.date.hijri.year + ' هـ';
      } else if (data.date && data.date.hijriStr) {
        hijriStr = data.date.hijriStr;
      }
      // Include tomorrow's timings so the widget has a full 48-h timeline
      // without requiring the user to open the app at midnight.
      var tom = readTomorrowCacheNow(city, dateISO);
      var now = Date.now();

      // ── Enriched snapshot fields ──────────────────────────────────────────
      // validUntil = Baghdad midnight tomorrow + 5 min (when the `date` field becomes stale).
      var tomDateISO = tom && tom.dateISO || null;
      var validUntilMs = tomDateISO
        ? _baghdadMidnightMs(tomDateISO) + 5 * 60 * 1000
        : _baghdadMidnightMs(dateISO) + 86400000 + 5 * 60 * 1000; // derive if no tomorrow
      var tomTimings = tom ? {
        Fajr:    (tom.timings.Fajr    || '').split(' ')[0],
        Sunrise: (tom.timings.Sunrise || '').split(' ')[0],
        Dhuhr:   (tom.timings.Dhuhr   || '').split(' ')[0],
        Asr:     (tom.timings.Asr     || '').split(' ')[0],
        Maghrib: (tom.timings.Maghrib || '').split(' ')[0],
        Isha:    (tom.timings.Isha    || '').split(' ')[0]
      } : null;
      var todayTimings = {
        Fajr:    (t.Fajr    || '').split(' ')[0],
        Sunrise: (t.Sunrise || '').split(' ')[0],
        Dhuhr:   (t.Dhuhr   || '').split(' ')[0],
        Asr:     (t.Asr     || '').split(' ')[0],
        Maghrib: (t.Maghrib || '').split(' ')[0],
        Isha:    (t.Isha    || '').split(' ')[0]
      };
      var state = _computePrayerState(todayTimings, dateISO, tomTimings, tomDateISO);

      var payload = JSON.stringify({
        city:          city,
        date:          dateISO,
        hijri:         hijriStr,
        lastUpdated:   now,
        generatedAt:   now,
        validUntil:    validUntilMs,
        currentPrayer: state.currentPrayer,
        nextPrayer:    state.nextPrayer,
        timings:       todayTimings,
        tomorrow:      tomTimings,
        tomorrowDate:  tomDateISO
      });
      console.log('[PrayerSync] pushWidgetData source=' + _src + ' city=' + city + ' date=' + dateISO +
                  ' currentPrayer=' + (state.currentPrayer || 'none') +
                  ' nextPrayer=' + (state.nextPrayer && state.nextPrayer.name || 'none') +
                  ' validUntil=' + new Date(validUntilMs).toISOString() +
                  ' hasTomorrow=' + !!tom + ' len=' + payload.length);

      // Android widget
      if (window.TafsirAndroid) {
        window.TafsirAndroid.saveString('widget_prayer', payload);
      }

      // iOS widget — write to App Group UserDefaults via SharedPrefs plugin.
      // Widget reload is triggered automatically by SharedPrefsPlugin.swift after synchronize().
      var sp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SharedPrefs;
      if (sp) {
        sp.set({ key: 'widgetPrayerData', value: payload })
          .then(function() {
            console.log('[PrayerSync] App Group write OK source=' + _src + ' city=' + city);
            localStorage.setItem('widgetLastPushedDate',        dateISO);
            localStorage.setItem('widgetLastPushedCity',        city);
            localStorage.setItem('widgetLastPushedHadTomorrow', tom ? '1' : '0');
            localStorage.setItem('widgetLastPushedTs',          String(now));
            localStorage.setItem('widgetLastPushedSource',      _src);
            _writeWidgetHealthStamp(city, _src, payload.length, 'ok');
            // Cache key snapshot fields for health reporting
            try { localStorage.setItem('_widgetLastPayloadMeta', JSON.stringify({
              city: city, date: dateISO,
              currentPrayer: state.currentPrayer, nextPrayer: state.nextPrayer,
              validUntil: validUntilMs, generatedAt: now
            })); } catch(e) {}
            // Schedule JS timers to push at each prayer boundary while app is foreground
            _schedulePrayerBoundaryTimers(todayTimings, dateISO, tomTimings, tomDateISO);
          })
          .catch(function(e) {
            console.log('[PrayerSync] App Group write FAIL source=' + _src + ':', e && e.message || e);
            _writeWidgetHealthStamp(city, _src, payload.length, 'fail');
          });
      } else {
        // Non-iOS: stamp for consistency
        localStorage.setItem('widgetLastPushedDate', dateISO);
        localStorage.setItem('widgetLastPushedCity', city);
        localStorage.setItem('widgetLastPushedTs',   String(now));
        _schedulePrayerBoundaryTimers(todayTimings, dateISO, tomTimings, tomDateISO);
      }
    } catch(e) { console.log('[WidgetSync] pushWidgetData error:', e); }
  }

  // Stamp localStorage with last widget health state for admin dashboard reads.
  function _writeWidgetHealthStamp(city, source, payloadLen, writeStatus) {
    try {
      var stamp = JSON.stringify({
        ts: Date.now(), city: city, source: source,
        payloadLen: payloadLen, writeStatus: writeStatus
      });
      localStorage.setItem('widgetHealthStamp', stamp);
    } catch(e) {}
  }

  // Force-push all widget data regardless of stale guards.
  // Increments the refresh nonce in App Group to invalidate the widget's extended cache.
  function forceWidgetRefresh(source) {
    var _src = source || 'manualRefresh';
    console.log('[WidgetRefresh] forceWidgetRefresh source=' + _src);
    var sp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SharedPrefs;
    // 1. Write new nonce — SharedPrefsPlugin clears ext cache and reloads all widgets
    if (sp) {
      var nonce   = String(Date.now());
      var nonceTs = String(Math.floor(Date.now() / 1000));
      sp.set({ key: 'widgetRefreshNonce', value: nonce })
        .then(function() {
          return sp.set({ key: 'widgetRefreshNonceTs', value: nonceTs });
        })
        .then(function() {
          console.log('[WidgetRefresh] nonce written nonce=' + nonce + ' ts=' + nonceTs);
          localStorage.setItem('widgetRefreshNonceLocal', nonce);
        })
        .catch(function(e) { console.log('[WidgetRefresh] nonce write FAIL:', e && e.message || e); });
    }
    // 2. Re-push all widget data from current cache
    if (window.PrayerLogic && window.PrayerCache) {
      var city  = getCity();
      var today = window.PrayerLogic.todayBaghdad();
      var data  = readCacheNow(city, today);
      if (data) {
        // Clear stale guard so push always fires
        localStorage.removeItem('widgetLastPushedDate');
        localStorage.removeItem('widgetExtCacheLastPush');
        pushWidgetData(data, city, today, _src);
        pushExtendedPrayerCache(city);
      } else {
        console.log('[WidgetRefresh] no cache for ' + city + '/' + today + ' — will push on next prayer load');
      }
    }
    console.log('[WidgetRefresh] forceWidgetRefresh complete source=' + _src);
  }

  // Build a health status object from localStorage + diagnostics for the admin dashboard.
  function getWidgetHealthStatus() {
    try {
      var stamp     = JSON.parse(localStorage.getItem('widgetHealthStamp') || 'null');
      var lastPushedTs = parseInt(localStorage.getItem('widgetLastPushedTs') || '0', 10);
      var lastCity  = localStorage.getItem('widgetLastPushedCity') || '';
      var lastDate  = localStorage.getItem('widgetLastPushedDate') || '';
      var lastSrc   = localStorage.getItem('widgetLastPushedSource') || '';
      var extTs     = parseInt(localStorage.getItem('widgetExtCacheLastPush') || '0', 10);
      var extCity   = localStorage.getItem('widgetExtCacheLastCity') || '';
      var now       = Date.now();
      var ageMin    = lastPushedTs ? Math.round((now - lastPushedTs) / 60000) : null;
      var extAgeH   = extTs        ? Math.round((now - extTs) / 3600000 * 10) / 10 : null;
      var today     = window.PrayerLogic ? window.PrayerLogic.todayBaghdad() : '';
      var curCity   = getCity();
      var status    = 'unknown';
      if (!lastPushedTs)                                    status = 'missingTimeline';
      else if (ageMin > 1440)                               status = 'stale';       // >24 h
      else if (lastDate === today && lastCity === curCity)  status = 'healthy';     // data is current for today
      else if (ageMin > 60)                                 status = 'delayed';     // >1 h, different date/city
      else                                                  status = 'healthy';
      return {
        status:      status,
        lastPushedTs: lastPushedTs,
        ageMin:       ageMin,
        city:         lastCity,
        source:       lastSrc,
        extAgeH:      extAgeH,
        extCity:      extCity,
        writeStatus:  stamp && stamp.writeStatus || 'unknown'
      };
    } catch(e) { return { status: 'unknown', error: String(e) }; }
  }

  // Report widget health to backend (Supabase via CF Worker endpoint).
  // Fire-and-forget, throttled to 1 report per 10 min per session.
  var _widgetHealthReportedAt = 0;
  function reportWidgetHealth(opts) {
    try {
      var now = Date.now();
      if (now - _widgetHealthReportedAt < 60 * 60 * 1000) return; // throttle: once per hour
      _widgetHealthReportedAt = now;
      var health = getWidgetHealthStatus();
      var platform = 'web';
      try { if (window.Capacitor && window.Capacitor.getPlatform) platform = window.Capacitor.getPlatform() || 'web'; } catch(e) {}
      var city = health.city || getCity() || 'unknown';
      var today = window.PrayerLogic ? window.PrayerLogic.todayBaghdad() : '';
      var snapshot = null;
      try { snapshot = JSON.parse(localStorage.getItem('_widgetLastPayloadMeta') || 'null'); } catch(e) {}
      var payload = {
        platform:            platform,
        city:                city,
        status:              opts && opts.status || health.status,
        last_pushed_ts:      health.lastPushedTs || 0,
        payload_age_min:     health.ageMin,
        last_refresh_source: health.source || 'unknown',
        ext_cache_age_h:     health.extAgeH,
        write_status:        health.writeStatus,
        error_msg:           opts && opts.error || null,
        tz:                  Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
        current_prayer:      snapshot && snapshot.currentPrayer || null,
        next_prayer:         snapshot && snapshot.nextPrayer && snapshot.nextPrayer.name || null,
        valid_until:         snapshot && snapshot.validUntil || null,
        snapshot_date:       snapshot && snapshot.date || null,
        today_baghdad:       today,
        snapshot_stale:      snapshot ? (Date.now() > (snapshot.validUntil || Infinity)) : null
      };
      console.log('[WidgetHealth] reporting status=' + payload.status + ' city=' + payload.city);
      var _whrUrl = (platform === 'web') ? '/widget-health-report' : 'https://tafsirkurd.com/widget-health-report';
      fetch(_whrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {});
    } catch(e) {}
  }

  // Stale-data protection: call on app start and every foreground resume.
  // Pushes to widget if: different date/city, OR same date but tomorrow data
  // is now available and was absent in the last push (e.g. first open of day
  // before background prefetch completed).
  function pushWidgetIfStale() {
    if (!window.PrayerLogic || !window.PrayerCache) return;
    var city     = getCity();
    var today    = window.PrayerLogic.todayBaghdad();
    var lastDate = localStorage.getItem('widgetLastPushedDate') || '';
    var lastCity = localStorage.getItem('widgetLastPushedCity') || '';
    var hadTom   = localStorage.getItem('widgetLastPushedHadTomorrow') === '1';
    var sameDayCity = (lastDate === today && lastCity === city);
    if (sameDayCity && hadTom) {
      // Main widget data is fresh — check extended cache independently
      if (shouldPushExtendedCache(city)) pushExtendedPrayerCache(city);
      return;
    }
    if (sameDayCity && !hadTom) {
      // Same day/city but last push had no tomorrow — only repush if we have it now
      if (!readTomorrowCacheNow(city, today)) {
        if (shouldPushExtendedCache(city)) pushExtendedPrayerCache(city);
        return;
      }
      console.log('[Widget] repush: tomorrow data now available for ' + today);
    } else {
      console.log('[Widget] stale — lastDate=' + lastDate + ' today=' + today +
                  ' lastCity=' + lastCity + ' city=' + city + ' — refreshing from cache');
    }
    var data = readCacheNow(city, today);
    if (data) {
      pushWidgetData(data, city, today);
      pushExtendedPrayerCache(city);
    }
    // If no cache: next render() will push when user opens prayer tab
  }

  // Returns true if the extended multi-day cache should be re-pushed: city changed or >24 h old.
  function shouldPushExtendedCache(city) {
    var lastCity = localStorage.getItem('widgetExtCacheLastCity') || '';
    var lastTs   = parseInt(localStorage.getItem('widgetExtCacheLastPush') || '0', 10);
    if (lastCity !== city) return true;
    return (Date.now() - lastTs) > 24 * 3600 * 1000;
  }

  // Collect all locally-cached prayer months into a compact multi-day payload and write it
  // to the App Group (iOS only) so the widget can autonomously build a 90-day timeline
  // without the app being open.  Format: { v:1, city, gen (Unix ms), days: { "YYYY-MM-DD":
  // [fajr, sunrise, dhuhr, asr, maghrib, isha] } }
  function pushExtendedPrayerCache(city) {
    if (!window.PrayerCache || !window.PrayerLogic) return;
    var sp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SharedPrefs;
    if (!sp) return; // iOS-only bridge
    try {
      var today = window.PrayerLogic.todayBaghdad();
      var parts = today.split('-').map(Number);
      var baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
      var days = {}, collected = 0;
      for (var d = -3; d <= 90; d++) {
        var target = new Date(baseDate.getTime());
        target.setDate(baseDate.getDate() + d);
        var ty = target.getFullYear(), tm = target.getMonth() + 1, td = target.getDate();
        var dateStr = ty + '-' + String(tm).padStart(2, '0') + '-' + String(td).padStart(2, '0');
        var mkey = window.PrayerCache.monthKey(city, ty, tm);
        var monthly = window.PrayerCache.read(mkey);
        if (!monthly || !monthly.days) continue;
        var day = monthly.days[td] || monthly.days[String(td)];
        if (!day || !day.Fajr) continue;
        days[dateStr] = [
          (day.Fajr    || '').split(' ')[0],
          (day.Sunrise || '').split(' ')[0],
          (day.Dhuhr   || '').split(' ')[0],
          (day.Asr     || '').split(' ')[0],
          (day.Maghrib || '').split(' ')[0],
          (day.Isha    || '').split(' ')[0]
        ];
        collected++;
      }
      if (collected < 3) {
        console.log('[WidgetExt] too few days in local cache (' + collected + ') — skipping push');
        return;
      }
      var payload = JSON.stringify({ v: 1, city: city, gen: Date.now(), days: days });
      console.log('[WidgetExt] pushing: city=' + city + ' days=' + collected + ' len=' + payload.length);
      sp.set({ key: 'widgetExtendedCache', value: payload })
        .then(function() {
          localStorage.setItem('widgetExtCacheLastPush', String(Date.now()));
          localStorage.setItem('widgetExtCacheLastCity', city);
          console.log('[WidgetExt] write OK days=' + collected);
        })
        .catch(function(e) { console.log('[WidgetExt] write FAIL:', e && e.message || e); });
    } catch(e) { console.log('[WidgetExt] error:', e); }
  }

  async function render() {
    var container = document.getElementById('prayerContent');
    if (!container) return;

    var city   = getCity();
    var today  = window.PrayerLogic.todayBaghdad();
    var key    = city + ':' + today + ':' + getFormat();

    // ── Panel already rendered for this city/date/format — just resume countdown ──
    // Still trigger backgroundRefresh in case cache is now stale (e.g. user had the
    // prayer tab open for hours, or it is the next Baghdad calendar day).
    if (_renderedKey === key && _currentTimings) {
      if (!_countdownInterval) startCountdown();
      else tickCountdown();
      window.PrayerAPI.backgroundRefresh(city, today, function(freshData) {
        _currentTimings = freshData.timings;
        _currentData    = freshData;
        _renderedKey    = null;
        buildPanel(container, freshData, city, today);
        startCountdown();
        pushWidgetData(freshData, city, today);
        _reportPrayerHealth({ city: city, date: today, status: 'stale_then_refresh',
          timings: freshData.timings, notifRescheduled: false });
        if (getAthan()) {
          fetchDaysData(city, today, 28).then(function(daysData) {
            if (!daysData.length) return;
            window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true);
            window.PrayerNotifications.scheduleReminderMultiDay &&
              window.PrayerNotifications.scheduleReminderMultiDay(daysData, getToggles(), getReminderOffset());
            console.log('[PrayerNotify] rescheduled after stale bg-refresh city=' + city);
          });
        }
      });
      return;
    }

    // ── Data already in memory for same city+date (e.g. after i18n invalidate or
    //    mid-refresh) — silently rebuild panel without any network call or spinner ──
    if (_currentData && _currentTimings && _currentDateISO === today && getCity() === city) {
      buildPanel(container, _currentData, city, today);
      startCountdown();
      return;
    }

    // ── Fast path: render immediately from cache, no network call ──
    var cached = readCacheNow(city, today);
    if (cached) {
      _currentTimings = cached.timings;
      _currentDateISO = today;
      _currentData    = cached;
      buildPanel(container, cached, city, today);
      startCountdown();
      pushWidgetData(cached, city, today);
      _reportPrayerHealth({ city: city, date: today, status: 'valid_cache', timings: cached.timings });
      // Silent background refresh — if cache is stale (different Baghdad day or >6h),
      // re-fetch and update UI + reschedule notifications.
      window.PrayerAPI.backgroundRefresh(city, today, function(freshData) {
        var oldFajr = _currentTimings && _currentTimings.Fajr;
        _currentTimings = freshData.timings;
        _currentData    = freshData;
        _renderedKey    = null;
        buildPanel(container, freshData, city, today);
        startCountdown();
        pushWidgetData(freshData, city, today);
        console.log('[PrayerTimes] UI refreshed after stale cache city=' + city + ' date=' + today);
        _reportPrayerHealth({ city: city, date: today, status: 'stale_then_refresh',
          timings: freshData.timings, notifRescheduled: false,
          changedFrom: oldFajr !== freshData.timings.Fajr ? ('fajr:' + oldFajr + '→' + freshData.timings.Fajr) : null });
        if (getAthan()) {
          fetchDaysData(city, today, 28).then(function(daysData) {
            if (!daysData.length) return;
            window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true);
            window.PrayerNotifications.scheduleReminderMultiDay &&
              window.PrayerNotifications.scheduleReminderMultiDay(daysData, getToggles(), getReminderOffset());
            console.log('[PrayerNotify] rescheduled after stale-cache refresh city=' + city);
          });
        }
      });
      return;
    }

    // ── Slow path: no cache yet ──
    _renderedKey     = null;
    // Date/city/format changed — invalidate tomorrow's data so fetchTomorrow() re-fetches
    // the correct next day. Without this, stale _tomorrowTimings (yesterday's "tomorrow")
    // blocks fetchTomorrow() via its guard and shows 00:00:00 after Isha on the new day.
    _tomorrowTimings = null;
    _tomorrowDateISO = null;

    // If offline: localStorage → bundled static JSON → error
    if (!navigator.onLine) {
      var anyCache = readAnyCacheNow(city);
      if (anyCache) {
        _currentTimings = anyCache.timings;
        _currentDateISO = today;
        _currentData    = anyCache;
        buildPanel(container, anyCache, city, today);
        startCountdown();
        _showCachedBadge(container);
        return;
      }
      // No localStorage — try bundled static JSON (always available in Capacitor)
      buildLoading(container);
      try {
        var bundled = await window.PrayerAPI.fetchFromBundled(city, today);
        _currentTimings = bundled.timings;
        _currentDateISO = today;
        _currentData    = bundled;
        buildPanel(container, bundled, city, today);
        startCountdown();
        _showCachedBadge(container);
      } catch(e) {
        buildOfflineError(container);
      }
      return;
    }

    buildLoading(container);
    /* Poll for cache every 600ms (prefetchAllCities may be in-flight) */
    var _pollStart = Date.now();
    var _pollTimer = setInterval(function(){
      var fresh = readCacheNow(city, today);
      if (fresh || Date.now() - _pollStart > 12000) {
        clearInterval(_pollTimer);
        if (fresh) { _currentTimings = fresh.timings; _currentDateISO = today; _currentData = fresh; buildPanel(container, fresh, city, today); startCountdown(); }
      }
    }, 600);
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today);
      clearInterval(_pollTimer);
      _currentTimings = data.timings;
      _currentDateISO = today;
      _currentData    = data;
      markCityGood(city);
      buildPanel(container, data, city, today);
      startCountdown();
      pushWidgetData(data, city, today);
      console.log('[PrayerCache] status=fresh_fetch city=' + city + ' date=' + today + ' fajr=' + (data.timings && data.timings.Fajr));
      _reportPrayerHealth({ city: city, date: today, status: 'fresh_fetch', timings: data.timings });
    } catch(e) {
      clearInterval(_pollTimer);
      // Network error — try any cached data as fallback
      var fallback = readAnyCacheNow(city);
      if (fallback) {
        _currentTimings = fallback.timings;
        _currentDateISO = today;
        _currentData    = fallback;
        buildPanel(container, fallback, city, today);
        startCountdown();
        _showCachedBadge(container);
        _reportPrayerHealth({ city: city, date: today, status: 'fetch_failed_using_cache',
          timings: fallback.timings, error: e && e.message });
      } else {
        markCityBad(city);
        buildError(container);
        _reportPrayerHealth({ city: city, date: today, status: 'fetch_failed_no_cache',
          error: e && e.message });
      }
    }
  }

  async function refresh() {
    var container = document.getElementById('prayerContent');
    if (!container) return;
    var city  = getCity();
    var today = window.PrayerLogic.todayBaghdad();

    // Offline: never wipe content, just show cached badge
    if (!navigator.onLine) {
      var offlineData = _currentData || readAnyCacheNow(city);
      if (offlineData) {
        if (!_currentTimings) {
          _currentTimings = offlineData.timings;
          _currentDateISO = today;
          _currentData    = offlineData;
          buildPanel(container, offlineData, city, today);
        }
        if (!_countdownInterval) startCountdown();
        _showCachedBadge(container);
      } else {
        buildOfflineError(container);
      }
      return;
    }

    // Online: stale-while-revalidate — keep current content + countdown alive
    // while fetching fresh data in background. Never blank the screen.
    var hadData = !!_currentData;

    // Show spinning indicator in sky sync area (subtle, non-disruptive)
    var syncEl = document.getElementById('skySyncTime');
    if (syncEl) syncEl.textContent = '🔄';

    // Keep countdown ticking during the background fetch
    if (_currentTimings && !_countdownInterval) startCountdown();

    // Clear monthly cache so the API re-fetches fresh data
    var parts = today.split('-').map(Number);
    window.PrayerCache.clear(window.PrayerCache.monthKey(city, parts[0], parts[1]));
    _renderedKey     = null;
    _tomorrowTimings = null;

    // Only show loading spinner if there is truly nothing to display yet
    if (!hadData) {
      stopCountdown();
      buildLoading(container);
    }

    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today);
      _currentTimings = data.timings;
      _currentDateISO = today;
      _currentData    = data;
      buildPanel(container, data, city, today);
      startCountdown();
      pushWidgetData(data, city, today);
      // NOTE: do NOT reschedule athan here. refresh() is triggered frequently
      // (pull-to-refresh, city change). Rescheduling on every refresh causes a
      // cancel+schedule race. initScheduleOnStart() owns all auto-scheduling.
    } catch(e) {
      if (hadData) {
        // Network failed but we have existing data — keep panel visible
        // Ensure countdown is running
        if (_currentTimings && !_countdownInterval) startCountdown();
        var se = document.getElementById('skySyncTime');
        if (se) se.textContent = '📡';
      } else {
        // No data at all — show error with retry
        buildError(container);
      }
    }
  }

  // ─── DOM builders ──────────────────────────────────────────────────────────

  function buildLoading(container) {
    stopCountdown();
    clearEl(container);
    var wrap = cel('div', 'prayer-skel');
    var sk = function(cls) { var e = cel('div', cls + ' skel-block'); return e; };
    wrap.appendChild(sk('prayer-skel-countdown'));
    for (var i = 0; i < 5; i++) wrap.appendChild(sk('prayer-skel-row'));
    container.appendChild(wrap);
  }

  function buildError(container) {
    stopCountdown();
    clearEl(container);
    var d = cel('div', 'prayer-status prayer-error');
    d.textContent = tStr('prayer.error');
    var btn = cel('button', 'prayer-retry-btn');
    btn.textContent = tStr('prayer.retry');
    btn.onclick = refresh;
    d.appendChild(document.createElement('br'));
    d.appendChild(document.createElement('br'));
    d.appendChild(btn);
    container.appendChild(d);
  }

  function buildOfflineError(container) {
    stopCountdown();
    clearEl(container);
    var d = cel('div', 'prayer-status');
    var icon = cel('div', 'prayer-offline-icon');
    icon.textContent = '📡';
    var msg = cel('div', '');
    msg.textContent = tStr('prayer.offline_no_cache') || 'بێ ئینتەرنێت — داتایەک نەدیتووە';
    var btn = cel('button', 'prayer-retry-btn');
    btn.textContent = tStr('prayer.retry');
    btn.onclick = refresh;
    d.appendChild(icon);
    d.appendChild(msg);
    d.appendChild(document.createElement('br'));
    d.appendChild(btn);
    container.appendChild(d);
  }

  function _showCachedBadge(container) {
    // Silently use cached data — no badge shown
  }

  function buildPanel(container, data, city, today) {
    _cdEls = null;
    _gridCards = null;
    _renderedKey = city + ':' + today + ':' + getFormat();
    var timings  = data.timings;
    var pl       = window.PrayerLogic;

    // Expose live timings to app.js — iOS WKWebView may not have localStorage cache populated,
    // so app.js reads these globals as the primary source for _isPrayerCheckable.
    window._prayerUITimings = timings;
    window._prayerUIDate    = today;

    // Record last-synced time (only when data came from network, not cache)
    if (!data._fromCache) {
      try { localStorage.setItem('prayerLastSynced', Date.now().toString()); } catch(e) {}
    }

    // ── Sky scene: preserve across refreshes to avoid visual glitch ──
    // Only do a full rebuild if the scene doesn't exist or the city changed.
    var existingScene = document.getElementById('prayerSkyScene');
    if (!existingScene || existingScene.dataset.city !== city) {
      clearEl(container);
      buildSkyScene(container, data, city, today);
    } else {
      // City unchanged — update only the date/sync indicator inside existing scene
      if (data._fromCache) {
        var syncEl2 = document.getElementById('skySyncTime');
        if (syncEl2) {
          var lastSync2 = localStorage.getItem('prayerLastSynced');
          if (lastSync2) {
            var diffMs2 = Date.now() - parseInt(lastSync2, 10);
            var diffH2  = Math.floor(diffMs2 / 3600000);
            var diffM2  = Math.floor(diffMs2 / 60000);
            syncEl2.textContent = diffH2 >= 1 ? ('📡 ' + diffH2 + 'h') : (diffM2 >= 1 ? ('📡 ' + diffM2 + 'm') : '📡');
          } else {
            syncEl2.textContent = '📡';
          }
        }
      } else {
        var syncEl3 = document.getElementById('skySyncTime');
        if (syncEl3) syncEl3.textContent = '';
      }
      // Remove old prayer grid so it gets rebuilt below
      var oldGrid = container.querySelector('.prayer-grid');
      if (oldGrid) oldGrid.remove();
    }

    // Populate last-synced indicator (first build path)
    if (!existingScene || existingScene.dataset.city !== city) {
      if (data._fromCache) {
        var syncEl = document.getElementById('skySyncTime');
        if (syncEl) {
          var lastSync = localStorage.getItem('prayerLastSynced');
          if (lastSync) {
            var diffMs = Date.now() - parseInt(lastSync, 10);
            var diffH  = Math.floor(diffMs / 3600000);
            var diffM  = Math.floor(diffMs / 60000);
            syncEl.textContent = diffH >= 1 ? ('📡 ' + diffH + 'h') : (diffM >= 1 ? ('📡 ' + diffM + 'm') : '📡');
          } else {
            syncEl.textContent = '📡';
          }
        }
      }
    }

    // ── 2-column prayer grid ──
    var now2  = new Date();
    var next  = pl.getNextPrayer(timings, today);
    var use12h = getFormat() === '12';
    var grid  = cel('div', 'prayer-grid');
    pl.PRAYER_ORDER.forEach(function(name) {
      var raw         = timings[name] || '';
      var timeDisplay = pl.formatTime(raw, use12h);
      var isNext      = next && next.name === name;
      var isPassed    = false;
      if (raw) {
        var pTime2 = pl.parseAsDate(raw, today);
        isPassed = pTime2 < now2 && !isNext;
      }

      var card = cel('div', 'prayer-grid-card' + (isNext ? ' prayer-grid-card--next' : '') + (isPassed ? ' prayer-grid-card--passed' : '') + (name === 'Sunrise' ? ' prayer-grid-card--done' : ''));
      card.dataset.prayer = name;

      // Content wrapper — receives the dim opacity when card is --passed.
      // Done dot lives outside this wrapper so it stays fully opaque.
      var pgcContent = cel('div', 'pgc-content');

      var nameEl = cel('div', 'prayer-grid-name');
      nameEl.textContent = tStr(PRAYER_I18N[name] || name);
      pgcContent.appendChild(nameEl);

      var timeEl = cel('div', 'prayer-grid-time');
      timeEl.textContent = timeDisplay;
      pgcContent.appendChild(timeEl);
      card.appendChild(pgcContent);

      // Tap feedback — scale-down on press, release on lift/cancel
      card.addEventListener('touchstart', function() { card.classList.add('prayer-grid-card--tap'); }, { passive: true });
      card.addEventListener('touchend',    function() { card.classList.remove('prayer-grid-card--tap'); });
      card.addEventListener('touchcancel', function() { card.classList.remove('prayer-grid-card--tap'); });

      var tapHint = cel('div', 'pgc-tap-hint');
      var tapHintI = document.createElement('i');
      tapHintI.className = 'fas fa-angle-left';
      tapHint.appendChild(tapHintI);
      card.appendChild(tapHint);

      // Tap → open mini prayer card sheet (skip Sunrise — not a trackable prayer)
      if (name !== 'Sunrise') {
        card.addEventListener('click', (function(n, t) {
          return function() { openPrayerCardSheet(n, t); };
        })(name, timings));
        card.style.cursor = 'pointer';
        card.classList.add('prayer-grid-card--interactive');

        // Show done dot only if the prayer day matches the grid's calendar date.
        // Before Fajr, prayerDay() returns yesterday — don't bleed yesterday's done
        // state onto today's fresh grid.
        // Dot is appended to card (not pgcContent) so it stays fully opaque on dimmed cards.
        var appPL2 = window.App && window.App.prayerLog;
        if (appPL2) {
          var pDay2 = appPL2.prayerDay();
          var log2  = appPL2.get();
          if (pDay2 && pDay2 === today && log2[pDay2] && log2[pDay2][name]) {
            var dot2 = cel('div', 'pcso-done-dot');
            card.appendChild(dot2);
            card.classList.add('prayer-grid-card--done');
          }
        }
      }

      grid.appendChild(card);
    });
    container.appendChild(grid);

    // ── Ensure settings overlay exists ──
    if (!document.getElementById('prayerSettingsOverlay')) {
      buildSettingsOverlay();
    }
    // Don't rebuild settings content while the sheet is open — user is
    // actively interacting with it. It will be refreshed on next open.
    var _overlay = document.getElementById('prayerSettingsOverlay');
    if (!_overlay || !_overlay.classList.contains('open')) {
      updateAthanSettings(timings, city, today);
    }

    // Pre-fetch next month silently near end of current month
    if (navigator.onLine) _prefetchNextMonth(city, today);
  }

  // Pre-fetch next month's prayer data in the last week of the month
  function _prefetchNextMonth(city, today) {
    var parts = today.split('-').map(Number);
    if (parts[2] < 24) return; // only last 7 days of month
    var y = parts[0], m = parts[1];
    var nextY = m === 12 ? y + 1 : y;
    var nextM = m === 12 ? 1 : m + 1;
    var mkey  = window.PrayerCache.monthKey(city, nextY, nextM);
    if (window.PrayerCache.read(mkey)) return; // already cached
    var url = 'https://tafsirkurd.com/prayer-kurd?city=' + encodeURIComponent(city) +
              '&year=' + nextY + '&month=' + nextM;
    fetch(url).then(function(res) {
      return res.ok ? res.json() : null;
    }).then(function(data) {
      if (data && data.days) window.PrayerCache.write(mkey, data);
    }).catch(function() {});
  }

  // ─── Prayer card tap sheet ─────────────────────────────────────────────────

  var PRAYER_RAKAAT = { Fajr: 2, Dhuhr: 4, Asr: 4, Maghrib: 3, Isha: 4 };

  function closePrayerCardSheet() {
    var ov = document.getElementById('prayerCardSheetOverlay');
    if (ov) ov.classList.remove('open');
  }

  // Returns ms until prayer time (negative = already passed).
  // Uses raw UTC+3 arithmetic — no browser timezone parsing, works on all WebViews.
  function _msToPrayer(timeStr) {
    if (!timeStr) return null;
    var hm = timeStr.trim().split(' ')[0].split(':');
    var h = parseInt(hm[0], 10); var m = parseInt(hm[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    var nowBaghdad = Date.now() + 3 * 3600000; // shift to Baghdad (UTC+3)
    var dayStart   = nowBaghdad - (nowBaghdad % 86400000); // midnight Baghdad
    var prayerMs   = dayStart + h * 3600000 + m * 60000;
    return prayerMs - nowBaghdad; // positive = future, negative = past
  }

  function _fmtCountdownDiff(diff) {
    if (diff <= 0) return null; // already passed
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return h + ' دەمژمێر ' + m + ' خولەک';
    if (m > 0) return m + ' خولەک' + (s > 0 ? ' و ' + s + ' چرکە' : '');
    return s + ' چرکە';
  }

  function openPrayerCardSheet(name, timings) {
    var pl = window.PrayerLogic;
    var use12h = getFormat() === '12';
    var dateISO = _currentDateISO;
    var raw = timings ? (timings[name] || '') : '';
    var timeDisplay = raw ? pl.formatTime(raw, use12h) : '--:--';
    var rakaat = PRAYER_RAKAAT[name];

    // ── Overlay ──
    var existing = document.getElementById('prayerCardSheetOverlay');
    if (existing) existing.parentNode.removeChild(existing);
    if (_cardSheetCountdownId) { clearInterval(_cardSheetCountdownId); _cardSheetCountdownId = null; }

    var overlay = cel('div', 'pcso');
    overlay.id = 'prayerCardSheetOverlay';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closePrayerCardSheet(); });

    var sheet = cel('div', 'pcso-sheet');

    // Handle
    sheet.appendChild(cel('div', 'pcso-handle'));

    // ── Prayer name + time ──
    var top = cel('div', 'pcso-top');
    var nameEl2 = cel('div', 'pcso-name');
    nameEl2.textContent = tStr(PRAYER_I18N[name] || name);
    var timeEl2 = cel('div', 'pcso-time');
    timeEl2.textContent = timeDisplay;
    top.appendChild(nameEl2);
    top.appendChild(timeEl2);
    sheet.appendChild(top);

    // ── Mark done button ──
    var appPL = window.App && window.App.prayerLog;
    // Before Fajr: prayerDay() returns yesterday but the grid is already showing
    // today's timings (midnight rollover). Use the later of the two dates so
    // pre-Fajr prayers are stored under the new calendar date, not yesterday.
    var _pDay = appPL ? appPL.prayerDay() : dateISO;
    var todayKey = (_pDay < dateISO) ? dateISO : _pDay;
    var log = appPL ? appPL.get() : {};
    var isDone = !!(log[todayKey] && log[todayKey][name]);

    // ms until this prayer — pure UTC+3 arithmetic, no browser timezone parsing
    var rawTime = timings ? (timings[name] || '') : '';
    var msUntil = rawTime ? _msToPrayer(rawTime) : null;

    // Checkable if: already done, prayer time passed, or app bridge confirms
    var canCheck = isDone
      || (msUntil !== null && msUntil <= 0)
      || (appPL ? appPL.isCheckable(name, todayKey) : false);

    var notYetWithTime = !canCheck && msUntil !== null && msUntil > 0;

    var checkBtn = cel('button', 'pcso-check-btn' + (isDone ? ' done' : '') + (canCheck ? '' : ' locked'));
    var checkIc = document.createElement('i');
    checkIc.className = isDone ? 'fas fa-check-circle' : (canCheck ? 'far fa-circle' : 'fas fa-clock');
    var checkLbl = document.createElement('span');

    function _checkLblText() {
      if (isDone) return tStr('prayer.marked_done') || 'تەمام بوو ✓';
      if (canCheck) return tStr('prayer.mark_done') || 'وەک تەمام نیشانە بکە';
      if (notYetWithTime) {
        var rem = rawTime ? _msToPrayer(rawTime) : 0;
        if (rem <= 0) return tStr('prayer.countdown_now') || 'ئێستا';
        var txt = _fmtCountdownDiff(rem);
        return txt ? txt + ' ماینە' : (tStr('prayer.countdown_now') || 'ئێستا');
      }
      return tStr('prayer.not_yet') || 'کاتی هێشتا نەهاتووە';
    }

    checkLbl.textContent = _checkLblText();
    checkBtn.appendChild(checkIc);
    checkBtn.appendChild(checkLbl);

    function _attachClickHandler() {
      checkBtn.addEventListener('click', function() {
        var ns = appPL.toggle(name, todayKey);
        isDone = ns;
        canCheck = true;
        checkBtn.classList.toggle('done', ns);
        checkBtn.classList.remove('locked');
        checkIc.className = ns ? 'fas fa-check-circle' : 'far fa-circle';
        checkLbl.textContent = ns
          ? (tStr('prayer.marked_done') || 'تەمام بوو ✓')
          : (tStr('prayer.mark_done') || 'وەک تەمام نیشانە بکە');
        var gridCard = document.querySelector('.prayer-grid-card[data-prayer="' + name + '"]');
        if (gridCard) {
          var dot = gridCard.querySelector('.pcso-done-dot');
          if (ns) {
            if (!dot) { dot = cel('div', 'pcso-done-dot'); gridCard.appendChild(dot); }
            gridCard.classList.add('prayer-grid-card--done');
          } else {
            if (dot) dot.parentNode.removeChild(dot);
            gridCard.classList.remove('prayer-grid-card--done');
          }
        }
      }, { once: true });
    }

    if (canCheck) {
      checkBtn.disabled = false;
      _attachClickHandler();
    } else {
      checkBtn.disabled = true;

      // Live countdown in button + auto-unlock when time arrives
      if (notYetWithTime) {
        _cardSheetCountdownId = setInterval(function() {
          var _co = document.getElementById('prayerCardSheetOverlay');
          if (!_co || !_co.classList.contains('open')) {
            clearInterval(_cardSheetCountdownId); _cardSheetCountdownId = null; return;
          }
          var rem = rawTime ? _msToPrayer(rawTime) : 0;
          if (rem <= 5000) {
            // Time has arrived — unlock the button
            clearInterval(_cardSheetCountdownId); _cardSheetCountdownId = null;
            canCheck = true;
            notYetWithTime = false;
            checkBtn.disabled = false;
            checkBtn.classList.remove('locked');
            checkIc.className = 'far fa-circle';
            checkLbl.textContent = tStr('prayer.mark_done') || 'وەک تەمام نیشانە بکە';
            _attachClickHandler();
          } else {
            checkLbl.textContent = _checkLblText();
          }
        }, 1000);
      }
    }
    sheet.appendChild(checkBtn);

    // ── Rakaat info row ──
    if (rakaat) {
      var rakaatRow = cel('div', 'pcso-info-row');
      var rakaatIc = document.createElement('i');
      rakaatIc.className = 'fas fa-pray';
      rakaatRow.appendChild(rakaatIc);
      rakaatRow.appendChild(document.createTextNode(' ' + rakaat + ' ' + (tStr('prayer.rakaat') || 'ركعەت')));
      sheet.appendChild(rakaatRow);
    }

    // ── Per-prayer athan toggle ──
    var toggles = getToggles();
    var athanOn = getAthan();
    var prayerOn = toggles[name] !== false;
    var athanRow = cel('div', 'pcso-info-row pcso-athan-row');
    var athanIcEl = document.createElement('i');
    athanIcEl.className = 'fas fa-' + (athanOn && prayerOn ? 'bell' : 'bell-slash');
    athanRow.appendChild(athanIcEl);
    var athanLbl2 = document.createElement('span');
    athanLbl2.textContent = tStr('prayer.athan_for') || 'دەنگێ بانگی';
    athanRow.appendChild(athanLbl2);
    var athanTog = cel('div', 'toggle pcso-toggle' + (athanOn && prayerOn ? ' on' : ''));
    athanTog.appendChild(cel('div', 'toggle-knob'));
    athanTog.addEventListener('click', function() {
      if (!athanOn) return; // master off — ignore
      var newVal = !athanTog.classList.contains('on');
      athanTog.classList.toggle('on', newVal);
      athanIcEl.className = 'fas fa-' + (newVal ? 'bell' : 'bell-slash');
      var t2 = getToggles();
      t2[name] = newVal;
      setToggles(t2);
      // Mirror into athan settings if sheet is open
      var perCard = document.querySelector('#prayerPrayersGrid .as2-prayer-card[data-prayer="' + name + '"] .toggle');
      if (perCard) { perCard.classList.toggle('on', newVal); }
    });
    athanRow.appendChild(athanTog);
    sheet.appendChild(athanRow);

    // Close button
    var closeBtn2 = cel('button', 'pcso-close');
    var ci2 = document.createElement('i');
    ci2.className = 'fas fa-times';
    closeBtn2.appendChild(ci2);
    closeBtn2.addEventListener('click', closePrayerCardSheet);
    sheet.appendChild(closeBtn2);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    // Add done dot to grid card if already done (use corrected todayKey, not raw prayerDay)
    var gridCard2 = document.querySelector('.prayer-grid-card[data-prayer="' + name + '"]');
    if (gridCard2 && !gridCard2.querySelector('.pcso-done-dot')) {
      var logNow = appPL ? appPL.get() : {};
      if (logNow[todayKey] && logNow[todayKey][name]) {
        var d2 = cel('div', 'pcso-done-dot');
        gridCard2.appendChild(d2);
        gridCard2.classList.add('prayer-grid-card--done');
      }
    }

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { overlay.classList.add('open'); });
    });
  }

  // ─── Settings sheet ────────────────────────────────────────────────────────

  // ── Small helper: section label with icon ──────────────────────────────────
  function mkSecLabel(iconCls, text) {
    var lbl = cel('div', 'ps-sec-label');
    var ic = document.createElement('i');
    ic.className = iconCls;
    lbl.appendChild(ic);
    lbl.appendChild(document.createTextNode(text));
    return lbl;
  }

  function buildSettingsOverlay() {
    var overlay = cel('div', 'prayer-settings-overlay');
    overlay.id = 'prayerSettingsOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeSettings(); };

    var sheet = cel('div', 'prayer-settings-sheet as2-sheet');
    sheet.id = 'prayerSettingsSheet';

    // ── Handle ───────────────────────────────────────
    sheet.appendChild(cel('div', 'as2-handle'));

    // ── Header ───────────────────────────────────────
    var hdr = cel('div', 'as2-hdr');
    var closeBtn = cel('button', 'as2-close');
    var cI = document.createElement('i');
    cI.className = 'fas fa-times';
    closeBtn.appendChild(cI);
    closeBtn.onclick = closeSettings;
    var hdrInner = cel('div', 'as2-hdr-inner');
    var hdrTitle = cel('div', 'as2-hdr-title');
    hdrTitle.textContent = tStr('prayer.settings_title');
    var hdrSub = cel('div', 'as2-hdr-sub');
    hdrSub.textContent = getCityLabel(getCity());
    hdrSub.id = 'as2HdrCitySub';
    hdrInner.appendChild(hdrTitle);
    hdrInner.appendChild(hdrSub);
    hdr.appendChild(closeBtn);
    hdr.appendChild(hdrInner);
    sheet.appendChild(hdr);
    sheet.appendChild(cel('div', 'as2-divider'));

    // ── Scrollable body ───────────────────────────────
    var body = cel('div', 'as2-body');

    // City
    var cityLabel = cel('div', 'as2-sec-title');
    cityLabel.textContent = tStr('prayer.city_label');
    body.appendChild(cityLabel);
    var cityScroll = cel('div', 'as2-city-scroll');
    cityScroll.id = 'prayerCityGrid';
    var currentCity = getCity();
    var badCities = getBadCities();
    CITIES.forEach(function(c) {
      if (badCities.indexOf(c) !== -1 && c !== currentCity) return; // hide broken cities
      var pill = cel('button', 'as2-city-pill' + (c === currentCity ? ' on' : ''));
      pill.dataset.city = c;
      pill.textContent = getCityLabel(c);
      pill.onclick = function() { onCityChange(c); };
      cityScroll.appendChild(pill);
    });
    body.appendChild(cityScroll);

    // Format
    var fmtLabel = cel('div', 'as2-sec-title');
    fmtLabel.textContent = tStr('prayer.format_label');
    body.appendChild(fmtLabel);
    var seg = cel('div', 'as2-seg');
    var fmt = getFormat();
    ['12', '24'].forEach(function(f) {
      var btn = cel('button', 'as2-seg-btn' + (f === fmt ? ' on' : ''));
      btn.dataset.fmt = f;
      btn.textContent = f === '24' ? tStr('prayer.format_24h','24h') : tStr('prayer.format_12h','12h');
      btn.onclick = function() { onFormatChange(f); };
      seg.appendChild(btn);
    });
    body.appendChild(seg);

    // Athan (dynamic content filled by updateAthanSettings)
    var athanContainer = cel('div');
    athanContainer.id = 'prayerAthanSettings';
    body.appendChild(athanContainer);
    body.appendChild(cel('div', 'prayer-settings-spacer'));
    sheet.appendChild(body);

    // ── Bottom actions ────────────────────────────────
    var actions = cel('div', 'as2-actions');
    var saveBtn = cel('button', 'as2-save-btn');
    saveBtn.textContent = tStr('prayer.save_settings') || 'پاراستنی ڕێکخستنەکان';
    saveBtn.onclick = function() {
      var today2 = window.PrayerLogic.todayBaghdad();
      fetchDaysData(getCity(), today2, 28).then(function(daysData) {
        if (!daysData.length) return;
        if (getAthan()) {
          window.PrayerNotifications.scheduleAthanMultiDay(daysData, getCity(), getToggles(), true);
        }
        // Always reschedule reminders (independent of athan)
        if (window.PrayerNotifications.scheduleReminderMultiDay) {
          window.PrayerNotifications.scheduleReminderMultiDay(daysData, getToggles(), getReminderOffset());
        }
      });
      closeSettings();
      if (window.App && window.App.toast) window.App.toast(tStr('prayer.settings_saved') || 'ڕێکخستنەکان پارایستران');
    };
    actions.appendChild(saveBtn);
    var resetBtn = cel('button', 'as2-reset-btn');
    resetBtn.textContent = tStr('prayer.reset_settings') || 'گەڕانەوە بۆ پێشووەکەی';
    resetBtn.onclick = function() {
      var allOn = {};
      window.PrayerLogic.NOTIF_PRAYERS.forEach(function(n) { allOn[n] = true; });
      setToggles(allOn);
      setAthanVoice('nasser');
      if (_currentTimings && _currentDateISO) {
        _athanSettingsKey = null; // force rebuild after reset
        updateAthanSettings(_currentTimings, getCity(), _currentDateISO);
      }
      if (window.App && window.App.toast) window.App.toast(tStr('prayer.settings_reset') || 'ڕێکخستنەکان ڕێکخرانەوە');
    };
    actions.appendChild(resetBtn);
    sheet.appendChild(actions);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  var PRAYER_EMOJI = { Fajr: '🌙', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌆', Isha: '🌃' };

  var PRAYER_COLORS = {
    Fajr:    '#6366f1',
    Dhuhr:   '#f59e0b',
    Asr:     '#f97316',
    Maghrib: '#ef4444',
    Isha:    '#8b5cf6'
  };

  var QARI_COLORS = {
    mishary: '#10b981',
    ahmed:   '#6366f1',
    nasser:  '#f59e0b',
    majed:   '#ef4444',
    mokhtar: '#8b5cf6'
  };

  var QARI_GRADIENTS = {
    mishary: 'linear-gradient(135deg,#10b981,#059669)',
    ahmed:   'linear-gradient(135deg,#6366f1,#4f46e5)',
    nasser:  'linear-gradient(135deg,#f59e0b,#d97706)',
    majed:   'linear-gradient(135deg,#ef4444,#dc2626)',
    mokhtar: 'linear-gradient(135deg,#8b5cf6,#7c3aed)'
  };

  function updateAthanSettings(timings, city, dateISO, force) {
    var container = document.getElementById('prayerAthanSettings');
    if (!container) return;

    var isOn   = getAthan();
    var pl     = window.PrayerLogic;
    var use12h = getFormat() === '12';
    var next   = timings ? pl.getNextPrayer(timings, dateISO) : null;

    // Skip full DOM rebuild if nothing relevant changed.
    // Intentionally excludes next.name — which prayer is "next" changes every few
    // hours and must NOT trigger a full clearEl() rebuild while the sheet is open.
    // The timings availability flag ('0'/'1') handles the null→real data transition.
    var newKey = city + ':' + dateISO + ':' + use12h + ':' + isOn + ':' + (timings ? '1' : '0') + ':' + getAthanVoice() + ':' + JSON.stringify(getToggles());
    if (!force && newKey === _athanSettingsKey && container.firstChild) {
      // Just update the header subtitle — content is already correct
      var hdrSubFast = document.getElementById('as2HdrCitySub');
      if (hdrSubFast) hdrSubFast.textContent = getCityLabel(city);
      return;
    }
    _athanSettingsKey = newKey;
    clearEl(container);

    // Keep header subtitle current
    var hdrSub = document.getElementById('as2HdrCitySub');
    if (hdrSub) hdrSub.textContent = getCityLabel(city);

    function setDim(on) {
      container.querySelectorAll('.as2-dimable').forEach(function(el) {
        el.classList.toggle('as2-dim', !on);
      });
    }

    // ── Section label helper ──────────────────────────────────────
    function secTitle(text, extra) {
      var el = cel('div', 'as2-sec-title' + (extra || ''));
      el.textContent = text;
      return el;
    }

    // ── Master notification card ──────────────────────────────────
    container.appendChild(secTitle(tStr('prayer.athan_section')));

    var masterCard = cel('div', 'as2-master-card' + (isOn ? ' as2-master-card--on' : ''));
    masterCard.id = 'prayerMasterCard';

    var masterLeft = cel('div', 'as2-master-left');
    var masterTitle = cel('div', 'as2-master-title');
    masterTitle.textContent = tStr('prayer.enable_athan');
    var masterDesc = cel('div', 'as2-master-desc');
    masterDesc.textContent = isOn ? tStr('prayer.athan_on_hint') : tStr('prayer.athan_section');
    masterLeft.appendChild(masterTitle);
    masterLeft.appendChild(masterDesc);

    var masterTog = cel('div', 'toggle' + (isOn ? ' on' : ''));
    masterTog.appendChild(cel('div', 'toggle-knob'));
    masterTog.addEventListener('click', function(e) {
      e.stopPropagation();
      var newVal = !masterTog.classList.contains('on');
      masterTog.classList.toggle('on', newVal);
      masterCard.classList.toggle('as2-master-card--on', newVal);
      masterDesc.textContent = newVal ? tStr('prayer.athan_on_hint') : tStr('prayer.athan_section');
      setDim(newVal);
      onAthanMasterToggle(newVal, timings, city, dateISO);
    });
    masterCard.appendChild(masterLeft);
    masterCard.appendChild(masterTog);
    container.appendChild(masterCard);

    // ── Prayer list ───────────────────────────────────────────────
    container.appendChild(secTitle(tStr('prayer.prayers_label') || 'نمازەکان', ' as2-dimable' + (isOn ? '' : ' as2-dim')));

    var prayerWrap = cel('div', 'as2-prayer-wrap as2-dimable' + (isOn ? '' : ' as2-dim'));
    prayerWrap.id = 'prayerPrayersGrid';
    var toggles = getToggles();
    pl.NOTIF_PRAYERS.forEach(function(name) {
      var cardOn = toggles[name] !== false;
      var isNext = next && next.name === name;
      var raw = timings ? (timings[name] || '') : '';
      var timeDisplay = raw ? pl.formatTime(raw, use12h) : '';
      var color = PRAYER_COLORS[name] || '#1f5f4a';

      var card = cel('div', 'as2-prayer-card' + (isNext ? ' as2-prayer-card--next' : ''));

      var info = cel('div', 'as2-prayer-info');
      var nameEl = cel('div', 'as2-prayer-name');
      nameEl.textContent = tStr(PRAYER_I18N[name] || name);
      var timeEl = cel('div', 'as2-prayer-time');
      timeEl.textContent = timeDisplay;
      info.appendChild(nameEl);
      if (isNext) {
        var nextBadge = cel('span', 'as2-next-badge');
        nextBadge.textContent = tStr('prayer.next') || 'داهاتوو';
        info.appendChild(nextBadge);
      }
      info.appendChild(timeEl);

      var dot = cel('div', 'as2-prayer-dot');
      dot.style.background = color;
      if (isNext) dot.style.boxShadow = '0 0 7px ' + color;

      var tog = cel('div', 'toggle toggle--sm' + (cardOn ? ' on' : ''));
      tog.appendChild(cel('div', 'toggle-knob'));
      (function(nm) {
        tog.addEventListener('click', function() {
          var nowOn = !tog.classList.contains('on');
          tog.classList.toggle('on', nowOn);
          onPrayerToggle(nm, nowOn, timings, city, dateISO);
        });
      })(name);

      card.appendChild(info);
      card.appendChild(dot);
      card.appendChild(tog);
      prayerWrap.appendChild(card);
    });
    container.appendChild(prayerWrap);

    // ── Prayer Reminder ───────────────────────────────────────────
    var remEnabled = getReminderEnabled();
    var remOffset  = getReminderOffset();
    container.appendChild(secTitle(tStr('prayer.reminder_label') || 'بیرخستنەوە', ' as2-dimable' + (isOn ? '' : ' as2-dim')));

    var remCard = cel('div', 'as2-reminder-card as2-dimable' + (isOn ? '' : ' as2-dim'));

    var remTop  = cel('div', 'as2-reminder-top');
    var remLeft = cel('div', 'as2-reminder-left');
    var remTitle = cel('div', 'as2-reminder-title');
    remTitle.textContent = tStr('prayer.reminder_title') || 'پێش نوێژ بیرت بخاتەوە';
    remLeft.appendChild(remTitle);
    var remTog = cel('div', 'toggle toggle--sm' + (remEnabled ? ' on' : ''));
    remTog.appendChild(cel('div', 'toggle-knob'));
    remTop.appendChild(remLeft);
    remTop.appendChild(remTog);
    remCard.appendChild(remTop);

    var offsetRow = cel('div', 'as2-reminder-offset' + (remEnabled ? '' : ' as2-hidden'));
    var offsetLabel = cel('div', 'as2-reminder-offset-label');
    offsetLabel.textContent = tStr('prayer.reminder_offset_label') || 'خولەک پێش نوێژ';
    var offsetChips = cel('div', 'as2-offset-chips');
    [5, 10, 15, 20, 30, 45, 60].forEach(function(min) {
      var chip = cel('button', 'as2-offset-chip' + (remOffset === min ? ' active' : ''));
      chip.type = 'button';
      chip.textContent = String(min);
      chip.addEventListener('click', function() {
        offsetChips.querySelectorAll('.as2-offset-chip').forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        setReminderOffset(min);
        rescheduleReminders(city);
      });
      offsetChips.appendChild(chip);
    });
    offsetRow.appendChild(offsetLabel);
    offsetRow.appendChild(offsetChips);
    remCard.appendChild(offsetRow);

    remTog.addEventListener('click', function() {
      var nowOn = !remTog.classList.contains('on');
      remTog.classList.toggle('on', nowOn);
      setReminderEnabled(nowOn);
      offsetRow.classList.toggle('as2-hidden', !nowOn);
      rescheduleReminders(city);
    });

    container.appendChild(remCard);

    // ── Reciter ───────────────────────────────────────────────────
    container.appendChild(secTitle(tStr('prayer.voice_label'), ' as2-dimable' + (isOn ? '' : ' as2-dim')));
    var reciterWrap = cel('div', 'as2-dimable' + (isOn ? '' : ' as2-dim'));
    buildVoicePicker(reciterWrap, city);
    container.appendChild(reciterWrap);

  }

  /**
   * Preview a voice by firing a real notification in 2 seconds.
   * Requests permission first, creates channels, then schedules.
   */
  // Audio preview — shared context + preloaded buffers for zero-delay playback
  var _previewAudio  = null;
  var _previewAbort  = null;
  var _audioCtx      = null;
  var _voiceBuffers  = {}; // voiceId → decoded AudioBuffer (ready to play)
  var _rawBuffers    = {}; // voiceId → ArrayBuffer (fetched, awaiting decode)
  var _previewToken  = 0;  // incremented on every stop — stale onended callbacks check this
  var _durationTimer = null; // setTimeout handle for auto-stop after chosen duration

  function getAudioCtx() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') { _audioCtx.resume(); }
    // Decode any ArrayBuffers that were fetched before a user gesture was available
    var ctx = _audioCtx;
    Object.keys(_rawBuffers).forEach(function(id) {
      if (_voiceBuffers[id]) { delete _rawBuffers[id]; return; }
      var buf = _rawBuffers[id];
      delete _rawBuffers[id];
      ctx.decodeAudioData(buf, function(decoded) { _voiceBuffers[id] = decoded; }, function() {});
    });
    return _audioCtx;
  }

  // Pre-FETCH athan audio files during background quiet time.
  // AudioContext is NOT created here — browser blocks it before user gesture.
  // Actual decode (decodeAudioData) is deferred to the first getAudioCtx() call
  // triggered by user interaction, so the first preview tap is still near-instant.
  function preloadVoiceBuffers() {
    var voices = window.PrayerNotifications && window.PrayerNotifications.ATHAN_VOICES;
    if (!voices) return;
    var queue = voices.filter(function(v) { return !_voiceBuffers[v.id] && !_rawBuffers[v.id]; });
    function fetchNext() {
      if (!queue.length) return;
      var voice = queue.shift();
      fetch(voice.previewUrl || ('/audio/athan_' + voice.id + '.mp3'))
        .then(function(r) { return r.arrayBuffer(); })
        .then(function(buf) {
          if (!_voiceBuffers[voice.id]) _rawBuffers[voice.id] = buf;
          // 400ms gap between fetches — keeps CPU/network free for UI work
          setTimeout(fetchNext, 400);
        })
        .catch(function() { setTimeout(fetchNext, 400); });
    }
    fetchNext();
  }

  function setPreviewBtnIcon(btn, iconClass) {
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    var i = document.createElement('i');
    i.className = iconClass;
    btn.appendChild(i);
  }

  function clearPlayingState() {
    var allBtns = document.querySelectorAll('.prayer-voice-preview-btn, .as2-reciter-play');
    for (var k = 0; k < allBtns.length; k++) {
      setPreviewBtnIcon(allBtns[k], 'fas fa-play');
      allBtns[k]._playingVoiceId = null;
    }
    var allRows = document.querySelectorAll('.prayer-voice-row, .as2-reciter-card');
    for (var j = 0; j < allRows.length; j++) {
      allRows[j].classList.remove('playing');
    }
  }

  function stopPreview() {
    ++_previewToken; // invalidate any pending onended from the previous source
    if (_durationTimer) { clearTimeout(_durationTimer); _durationTimer = null; }
    if (_previewAudio) { _previewAudio.stop(); _previewAudio = null; }
    if (_previewAbort) { _previewAbort.abort(); _previewAbort = null; }
    clearPlayingState();
  }

  function playDecodedBuffer(decoded, durationSec) {
    var ctx = getAudioCtx();
    var src = ctx.createBufferSource();
    src.buffer = decoded;
    src.connect(ctx.destination);
    src.start(0);
    var myToken = ++_previewToken; // capture token for this specific playback
    _previewAudio = { stop: function() { try { src.stop(); } catch(e){} } };

    // Auto-stop after chosen duration (0 = play full)
    if (durationSec > 0 && durationSec < decoded.duration) {
      _durationTimer = setTimeout(function() {
        if (_previewToken === myToken) stopPreview();
      }, durationSec * 1000);
    }

    src.onended = function() {
      if (_previewToken !== myToken) return; // another voice started — ignore
      if (_durationTimer) { clearTimeout(_durationTimer); _durationTimer = null; }
      _previewAudio = null;
      clearPlayingState();
    };
  }

  function previewVoice(voice, btn, row) {
    var wasSameVoice = btn._playingVoiceId === voice.id;
    stopPreview();
    if (wasSameVoice) return;

    setPreviewBtnIcon(btn, 'fas fa-stop');
    btn._playingVoiceId = voice.id;
    if (row) row.classList.add('playing');

    // Buffer already decoded — play instantly with zero delay
    if (_voiceBuffers[voice.id]) {
      playDecodedBuffer(_voiceBuffers[voice.id], 0);
      return;
    }

    // Not yet preloaded — fetch, cache, then play
    var abort = new AbortController();
    _previewAbort = abort;
    var ctx = getAudioCtx();
    fetch(voice.previewUrl || ('/audio/athan_' + voice.id + '.mp3'), { signal: abort.signal })
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) { return ctx.decodeAudioData(buf); })
      .then(function(decoded) {
        if (abort.signal.aborted) return;
        _previewAbort = null;
        _voiceBuffers[voice.id] = decoded;
        playDecodedBuffer(decoded, 0);
      })
      .catch(function(err) {
        if (!abort.signal.aborted) {
          console.log('[Preview] failed:', err && err.message);
          clearPlayingState();
        }
        _previewAbort = null;
        _previewAudio = null;
      });
  }

  function buildVoicePicker(parent, city) {
    var voices   = window.PrayerNotifications.ATHAN_VOICES;
    var selected = getAthanVoice();
    var scroll   = cel('div', 'as2-reciter-scroll');

    voices.forEach(function(voice) {
      var isSelected = voice.id === selected;
      var isSimple   = voice.id === 'simple';

      var card = cel('div', 'as2-reciter-card' + (isSelected ? ' on' : '') + (isSimple ? ' as2-reciter-simple' : ''));
      card.dataset.voiceId = voice.id;

      if (isSimple) {
        // Bell icon instead of wave bars
        var bellWrap = cel('div', 'as2-reciter-wave as2-reciter-bell-wrap');
        var bellI = document.createElement('i');
        bellI.className = 'fas fa-bell';
        bellWrap.appendChild(bellI);
        card.appendChild(bellWrap);
      } else {
        var wave = cel('div', 'as2-reciter-wave');
        for (var bi = 0; bi < 5; bi++) {
          wave.appendChild(cel('div', 'as2-wave-bar'));
        }
        var checkBadge = cel('div', 'as2-reciter-check');
        var checkI = document.createElement('i');
        checkI.className = 'fas fa-check';
        checkBadge.appendChild(checkI);
        wave.appendChild(checkBadge);
        card.appendChild(wave);
      }

      var nameEl = cel('div', 'as2-reciter-name');
      nameEl.textContent = (voice.nameKey && tStr(voice.nameKey)) || (voice.nameAr || '').split(' ')[0];
      card.appendChild(nameEl);

      if (!isSimple) {
        var playBtn = cel('button', 'as2-reciter-play');
        setPreviewBtnIcon(playBtn, 'fas fa-play');
        playBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          previewVoice(voice, playBtn, card);
        });
        card.appendChild(playBtn);
      }

      card.addEventListener('click', function() {
        if (voice.id === getAthanVoice()) return;
        setAthanVoice(voice.id);
        scroll.querySelectorAll('.as2-reciter-card').forEach(function(c) {
          c.classList.toggle('on', c.dataset.voiceId === voice.id);
        });
        if (getAthan()) {
          var today = window.PrayerLogic.todayBaghdad();
          fetchDaysData(city, today, 28).then(function(daysData) {
            if (daysData.length) {
              window.PrayerNotifications.scheduleAthanMultiDay(
                daysData, city, getToggles(), true, voice.id
              );
            }
          });
        }
      });

      scroll.appendChild(card);
    });

    parent.appendChild(scroll);
  }

  // Pause all sky RAF loops while the sheet is open so they don't compete
  // with the sheet animation and scroll for the 16ms frame budget.
  function _pauseSkyAnimations() {
    if (_gyroRaf)      { cancelAnimationFrame(_gyroRaf);      _gyroRaf      = null; }
    if (_aircraftRaf)  { cancelAnimationFrame(_aircraftRaf);  _aircraftRaf  = null; }
    if (_balloonRaf)   { cancelAnimationFrame(_balloonRaf);   _balloonRaf   = null; }
    if (_satelliteRaf) { cancelAnimationFrame(_satelliteRaf); _satelliteRaf = null; }
    if (_issRaf)       { cancelAnimationFrame(_issRaf);       _issRaf       = null; }
    // Remove in-flight elements so they don't sit frozen at wrong positions
    var scene = document.getElementById('prayerSkyScene');
    if (scene) {
      ['skyAircraft','skyBalloon','skySatellite','skyISS'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    }
  }

  function _resumeSkyAnimations() {
    // Gyro loop: restart if device orientation was active
    if (_gyroHandler && !_gyroRaf) {
      _gyroRaf = requestAnimationFrame(_gyroLoop);
    }
    // Aircraft/balloon/satellite/ISS are event-driven (scheduled by timeouts) —
    // they will naturally fire again from their existing setTimeout schedulers.
  }

  function openSettings() {
    // Show overlay FIRST — sheet slide starts immediately on this frame
    var overlay = document.getElementById('prayerSettingsOverlay');
    if (overlay) overlay.classList.add('open');
    // Pause sky in next frame — compositor already has the sheet transition queued,
    // so pausing 30+ CSS animations now won't affect the slide smoothness
    if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
    requestAnimationFrame(function() {
      _pauseSkyAnimations();
      var scene = document.getElementById('prayerSkyScene');
      if (scene) scene.classList.add('sky-paused'); // stop all 30+ CSS animations too
    });
  }

  function closeSettings() {
    stopPreview();
    var overlay = document.getElementById('prayerSettingsOverlay');
    if (overlay) overlay.classList.remove('open');
    // Resume sky CSS animations + RAF loops after close transition (280ms)
    setTimeout(function() {
      var scene = document.getElementById('prayerSkyScene');
      if (scene) scene.classList.remove('sky-paused');
      _resumeSkyAnimations();
      if (!_countdownInterval && _currentTimings) startCountdown();
    }, 300);
  }

  function buildToggleRow(parent, label, isOn, onChange, extraClass) {
    var row = cel('div', 'prayer-toggle-row' + (extraClass ? ' ' + extraClass : ''));
    var lbl = cel('span', 'prayer-toggle-label');
    lbl.textContent = label;
    var tog = cel('div', 'toggle' + (isOn ? ' on' : ''));
    var knob = cel('div', 'toggle-knob');
    tog.appendChild(knob);
    tog.addEventListener('click', function() {
      var newVal = !tog.classList.contains('on');
      tog.classList.toggle('on', newVal);
      onChange(newVal);
    });
    row.appendChild(lbl);
    row.appendChild(tog);
    parent.appendChild(row);
  }

  // ─── Event handlers ────────────────────────────────────────────────────────

  function onFormatChange(fmt) {
    setFormat(fmt);
    document.querySelectorAll('[data-fmt]').forEach(function(btn) {
      btn.classList.toggle('on', btn.dataset.fmt === fmt);
    });
    if (_currentData && _currentDateISO) {
      var container = document.getElementById('prayerContent');
      if (container) {
        buildPanel(container, _currentData, getCity(), _currentDateISO);
        startCountdown();
      }
    }
  }

  async function onCityChange(city) {
    setCity(city);

    // ── 1. Instant UI feedback — no teardown, no loading state ──────────────
    // Update city pills and header subtitle immediately
    document.querySelectorAll('[data-city]').forEach(function(btn) {
      btn.classList.toggle('on', btn.dataset.city === city);
    });
    var hdrSub = document.getElementById('as2HdrCitySub');
    if (hdrSub) hdrSub.textContent = getCityLabel(city);

    // Update sky city label instantly (no sky scene rebuild)
    var skyCity = document.querySelector('.sky-city');
    if (skyCity) skyCity.textContent = getCityLabel(city);

    // Put grid card times into shimmer while we load
    document.querySelectorAll('.prayer-grid-card').forEach(function(card) {
      var timeEl = card.querySelector('.prayer-grid-time');
      if (timeEl) { timeEl.dataset.prevTime = timeEl.textContent; timeEl.textContent = '—'; }
      card.classList.add('prayer-grid-card--loading');
    });

    // ── 2. Fetch new city data (static CDN → Worker → Aladhan) ──────────────
    _clearBoundaryTimers();
    var today = window.PrayerLogic.todayBaghdad();

    var fresh;
    try {
      fresh = await window.PrayerAPI.fetchPrayerTimes(city, today, 13);
    } catch(e) {
      fresh = null;
    }

    if (fresh && fresh.timings) {
      // ── 3. Surgical update — only numbers, no DOM teardown ──────────────
      var pl      = window.PrayerLogic;
      var timings = fresh.timings;
      var use12h  = getFormat() === '12';
      var now3    = new Date();
      var next    = pl.getNextPrayer(timings, today);

      var _appPLcc = window.App && window.App.prayerLog;
      var _ccLog   = _appPLcc ? _appPLcc.get() : {};
      var _ccDay   = _appPLcc ? _appPLcc.prayerDay() : '';
      document.querySelectorAll('.prayer-grid-card[data-prayer]').forEach(function(card) {
        var name    = card.dataset.prayer;
        var raw     = timings[name] || '';
        var timeEl  = card.querySelector('.prayer-grid-time');
        if (timeEl) timeEl.textContent = pl.formatTime(raw, use12h);
        card.classList.remove('prayer-grid-card--loading');
        var isNext   = next && next.name === name;
        var isPassed = raw ? (pl.parseAsDate(raw, today) < now3 && !isNext) : false;
        var isDoneCC = name === 'Sunrise' || !!(_ccLog[_ccDay] && _ccLog[_ccDay][name]);
        card.classList.toggle('prayer-grid-card--next',   isNext);
        card.classList.toggle('prayer-grid-card--passed', isPassed);
        card.classList.toggle('prayer-grid-card--done',   isDoneCC);
      });

      // Update countdown display for new city
      _currentTimings  = timings;
      _currentDateISO  = today;
      _currentData     = fresh;
      _renderedKey     = city + ':' + today + ':' + getFormat();

      // Update sky scene city data & sky phase (no rebuild)
      if (document.getElementById('prayerSkyScene')) {
        document.getElementById('prayerSkyScene').dataset.city = city;
        _doUpdateSky();
      }

      // Update date display in sky
      var datesEl = document.getElementById('skyDates');
      if (datesEl && fresh.date) {
        var dateInfo = fresh.date;
        var dateLines2 = [];
        if (dateInfo.hijri) { var _hm2=(dateInfo.hijri.month&&(dateInfo.hijri.month.ar||dateInfo.hijri.month.en))||''; dateLines2.push(dateInfo.hijri.day+' '+_hm2+' '+dateInfo.hijri.year+' هـ'); }
        else if (dateInfo.hijriStr) dateLines2.push(dateInfo.hijriStr);
        else { try { var _hd2 = new Intl.DateTimeFormat('ar-u-ca-islamic',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Baghdad'}).format(new Date(today+'T12:00:00+03:00')); dateLines2.push(_hd2); } catch(_e2){} }
        datesEl.innerHTML = dateLines2.map(function(l) { return '<span>' + l + '</span>'; }).join('');
      }

      // Update athan settings sheet if not open
      var _overlay2 = document.getElementById('prayerSettingsOverlay');
      if (!_overlay2 || !_overlay2.classList.contains('open')) {
        updateAthanSettings(timings, city, today);
      }

      // Restart countdown for new city times
      if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
      startCountdown();

    } else {
      // Fetch failed — restore previous times, remove shimmer
      document.querySelectorAll('.prayer-grid-card').forEach(function(card) {
        var timeEl = card.querySelector('.prayer-grid-time');
        if (timeEl && timeEl.dataset.prevTime) timeEl.textContent = timeEl.dataset.prevTime;
        card.classList.remove('prayer-grid-card--loading');
      });
      // Fall back to full render so the user doesn't see stale data silently
      _renderedKey = null;
      _currentTimings = null;
      _currentData = null;
      _currentDateISO = null;
      await render();
    }

    closeSettings();

    // ── 4. Reschedule notifications for new city (background) ───────────────
    if (getAthan()) {
      var today2 = window.PrayerLogic.todayBaghdad();
      var daysData = await fetchDaysData(city, today2, 28);
      if (daysData.length) {
        var res = await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true);
        if (res && res.count > 0) {
          localStorage.setItem('prayerLastScheduleTs', String(Date.now()));
          console.log('[Athan] city changed → rescheduled', res.count, 'notifications for', city);
        }
        window.PrayerNotifications.scheduleReminderMultiDay &&
          window.PrayerNotifications.scheduleReminderMultiDay(daysData, getToggles(), getReminderOffset());
      }
    }
  }

  function updateAthanBanner(val) {
    var bell = document.getElementById('prayerHdrBell');
    if (bell) {
      bell.className = 'prayer-hdr-bell' + (val ? ' prayer-hdr-bell--on' : '');
      var icon = bell.querySelector('i');
      if (icon) icon.className = val ? 'fas fa-bell' : 'fas fa-bell-slash';
    }
    var skyBell = document.getElementById('skyBell');
    if (skyBell) {
      skyBell.classList.toggle('sky-bell--on', val);
      var skyIcon = skyBell.querySelector('i');
      if (skyIcon) skyIcon.className = val ? 'fas fa-bell' : 'fas fa-bell-slash';
    }
  }

  async function onAthanMasterToggle(val, timings, city, dateISO) {
    setAthan(val);
    updateAthanBanner(val);
    var wrap = document.getElementById('prayerTogglesWrap');
    if (wrap) wrap.classList.toggle('prayer-per-toggles--dim', !val);

    if (!val) {
      await window.PrayerNotifications.cancelAllAthanNotifications();
      window.PrayerNotifications.cancelAllReminderNotifications &&
        window.PrayerNotifications.cancelAllReminderNotifications();
      if (window.App && window.App.toast) window.App.toast(tStr('prayer.athan_off'));
      return;
    }

    var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    var granted = false;
    if (LN) {
      var result = await LN.requestPermissions().catch(function() { return { display: 'denied' }; });
      granted = result.display === 'granted' || result.receive === 'granted';
      if (!granted) {
        setAthan(false);
        var masterTog = document.querySelector('.prayer-master-toggle .toggle');
        if (masterTog) masterTog.classList.remove('on');
        if (window.App && window.App.toast) window.App.toast(tStr('prayer.perm_denied'));
        return;
      }
    }

    // Clear rate limit so startup reschedule runs fresh
    localStorage.removeItem('prayerLastScheduleTs');

    // Schedule 7 days ahead so athan works without opening the app
    var today = window.PrayerLogic.todayBaghdad();
    var daysData = await fetchDaysData(city, today, 28);
    if (daysData.length) {
      var res = await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), granted);
      window.PrayerNotifications.scheduleReminderMultiDay &&
        window.PrayerNotifications.scheduleReminderMultiDay(daysData, getToggles(), getReminderOffset());
      var count = res && res.count != null ? res.count : 0;
      if (count > 0) {
        localStorage.setItem('prayerLastScheduleTs', String(Date.now()));
        if (window.App && window.App.toast) window.App.toast(tStr('prayer.scheduled_ok', { count: count }));
        if (window._showNotifSetupHint) window._showNotifSetupHint();
        // Check battery optimization — most common cause of delayed athan on Samsung
        var _AA = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AthanAlarm;
        if (_AA && _AA.isIgnoringBatteryOpts) {
          _AA.isIgnoringBatteryOpts().then(function(r) {
            if (r && r.ignoring === false && window._showBatteryOptWarning) {
              window._showBatteryOptWarning();
            }
          }).catch(function() {});
        }
      } else {
        if (window.App && window.App.toast) window.App.toast(tStr('prayer.scheduled_zero'));
      }
    } else {
      if (window.App && window.App.toast) window.App.toast(tStr('prayer.no_data'));
    }
  }

  async function onPrayerToggle(name, val, timings, city, dateISO) {
    var toggles = getToggles();
    toggles[name] = val;
    setToggles(toggles);
    if (getAthan()) {
      var today = window.PrayerLogic.todayBaghdad();
      var daysData = await fetchDaysData(city, today, 28);
      if (daysData.length) {
        await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, toggles, true);
        window.PrayerNotifications.scheduleReminderMultiDay &&
          window.PrayerNotifications.scheduleReminderMultiDay(daysData, toggles, getReminderOffset());
      }
    }
  }

  // ─── Multi-day data helper ─────────────────────────────────────────────────

  /**
   * Build daysData array for N days starting from startDateISO.
   * Reads from monthly cache (at most 1-2 network calls for month boundaries).
   * Returns only days where timings were successfully retrieved.
   */
  async function fetchDaysData(city, startDateISO, numDays) {
    var daysData = [];
    var parts = startDateISO.split('-').map(Number);
    for (var i = 0; i < numDays; i++) {
      // Add days using UTC to avoid DST issues
      var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + i));
      var dateISO = d.toISOString().split('T')[0];
      daysData.push({ dateISO: dateISO, timings: null });
    }
    // Fetch all days — monthly cache means at most 2 network calls (current + next month)
    for (var j = 0; j < daysData.length; j++) {
      try {
        var data = await window.PrayerAPI.fetchPrayerTimes(city, daysData[j].dateISO);
        daysData[j].timings = data.timings;
      } catch(e) { /* leave timings null — skipped by scheduleAthanMultiDay */ }
    }
    return daysData.filter(function(d) { return d.timings != null; });
  }

  // ─── Full-month prefetch for all cities ───────────────────────────────────

  /**
   * Called once per month at app start.
   * Fetches & caches prayer times for ALL 20 cities for the current month.
   * Also pre-fetches next month in the last 7 days of current month.
   * Skips any city-month that is already cached.
   * Skips cities already cached for the month — safe to call on every app open.
   */
  async function prefetchAllCities() {
    var API   = window.PrayerAPI;
    var Cache = window.PrayerCache;
    if (!API || !Cache) return;

    var today  = window.PrayerLogic.todayBaghdad();
    var parts  = today.split('-').map(Number);
    var year   = parts[0], month = parts[1], day = parts[2];

    // Which months to cover: always current, plus next if last 7 days of month
    var months = [{ year: year, month: month }];
    var daysInMonth = new Date(year, month, 0).getDate();
    if (daysInMonth - day <= 6) {
      var ny = month === 12 ? year + 1 : year;
      var nm = month === 12 ? 1 : month + 1;
      months.push({ year: ny, month: nm });
    }

    /* Put current city first so it's cached before user taps the tab */
    var currentCity = getCity();
    var allCities = Object.keys(API.CITY_COORDS || {});
    var cities = [currentCity].concat(allCities.filter(function(c){ return c !== currentCity; }));

    for (var mi = 0; mi < months.length; mi++) {
      var ym = months[mi];
      for (var ci = 0; ci < cities.length; ci++) {
        var city = cities[ci];
        var mkey = Cache.monthKey(city, ym.year, ym.month);
        // Skip only if cache is FRESH (fetched today and not older than 12h).
        // Stale caches (different Baghdad day or >12h old) are re-fetched so
        // mid-month schedule updates from amozhgary.tv are picked up automatically.
        if (Cache.read(mkey) && !Cache.isStale(mkey, 12 * 3600000)) continue;
        try {
          var url = 'https://tafsirkurd.com/prayer-kurd?city=' +
                    encodeURIComponent(city) + '&year=' + ym.year + '&month=' + ym.month;
          var res = await fetch(url);
          if (!res.ok) continue;
          var data = await res.json();
          if (data && !data.error && data.days && Object.keys(data.days).length > 0) {
            Cache.writeWithMeta(mkey, data, {
              fetchedAt: Date.now(), source: 'kurd-prefetch', city: city,
              year: ym.year, month: ym.month
            });
          }
        } catch(e) { /* network error — will retry next foreground */ }
      }
    }

  }

  // ─── Auto-schedule on start/foreground ────────────────────────────────────

  /**
   * Called on app start and every foreground resume.
   * Schedules 7 days of athan notifications so they work without opening the app.
   * Only runs once per day (tracks prayerLastScheduleDate).
   */
  async function initScheduleOnStart() {
    fetchReminderConfig();
    if (!_i18nBound) { _i18nBound = true; document.addEventListener('i18n:updated', fetchReminderConfig); }
    if (!getAthan()) {
      // Still reschedule reminders even if athan is off (reminders are independent)
      var _today2 = window.PrayerLogic.todayBaghdad();
      var _daysData2 = await fetchDaysData(getCity(), _today2, 28).catch(function() { return []; });
      if (_daysData2.length && window.PrayerNotifications && window.PrayerNotifications.scheduleReminderMultiDay) {
        window.PrayerNotifications.scheduleReminderMultiDay(_daysData2, getToggles(), getReminderOffset());
      }
      return;
    }
    // Rate-limit: reschedule at most once per 15 min.
    // This prevents the cancel+schedule race when app opens + immediately resumes.
    // On a new calendar day, lastTs will be from yesterday (> 15 min) → always runs.
    var now = Date.now();
    var lastTs = parseInt(localStorage.getItem('prayerLastScheduleTs') || '0');
    if (now - lastTs < 15 * 60 * 1000) {
      console.log('[Athan] initScheduleOnStart: skipped (< 15 min since last schedule)');
      return;
    }
    var today = window.PrayerLogic.todayBaghdad();
    var city  = getCity();
    console.log('[Athan] initScheduleOnStart: scheduling for city=' + city + ' date=' + today);
    try {
      var daysData = await fetchDaysData(city, today, 28);
      if (!daysData.length) {
        console.warn('[Athan] initScheduleOnStart: no prayer data available — will retry on next foreground');
        return;
      }
      var res = await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true);
      // Also schedule reminders (independent of athan — uses its own enabled/offset settings)
      window.PrayerNotifications.scheduleReminderMultiDay &&
        window.PrayerNotifications.scheduleReminderMultiDay(daysData, getToggles(), getReminderOffset());
      // Update timestamp only on actual success (count > 0 and no error).
      // On error or permission denied: leave timestamp unset so we retry in 15 min.
      // On count=0 (all prayers already passed today but future days have no data):
      //   this shouldn't happen since daysData covers 7 days, but handle defensively.
      if (res && res.count > 0 && !res.error) {
        localStorage.setItem('prayerLastScheduleTs', String(now));
        console.log('[Athan] initScheduleOnStart: done —', res.count, 'notifications scheduled');
      } else if (res && res.denied) {
        console.warn('[Athan] initScheduleOnStart: permission denied — user must grant notification permission');
      } else {
        console.warn('[Athan] initScheduleOnStart: scheduling returned count=' + (res && res.count) +
                     ' error=' + (res && res.error) + ' — will retry on next foreground');
      }
    } catch(e) {
      console.error('[Athan] initScheduleOnStart error:', e);
    }
  }

  // ─── Redraw with existing data (translation update, no network call) ───────

  function redraw() {
    if (!_currentData || !_currentDateISO) return;
    var container = document.getElementById('prayerContent');
    if (!container) return;
    _renderedKey = null; // force rebuild
    buildPanel(container, _currentData, getCity(), _currentDateISO);
    startCountdown();
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  // Called by App.tab('prayer') after the panel becomes visible.
  // Belt-and-suspenders: ensures countdown is always ticking when user sees the tab.
  function ensureCountdown() {
    if (!_currentTimings || !_currentDateISO) return;
    if (!_countdownInterval) startCountdown();
    else tickCountdown();
  }

  // ─── Prayer Cache Health Reporting ───────────────────────────────────────────

  // Per-session report tracker — one report per status-type per Baghdad day,
  // max 4 total reports per session so we never spam the backend.
  var _healthReported = {};  // key: 'city:date:status' → timestamp
  var _healthCount    = 0;
  var MAX_HEALTH_REPORTS = 4;

  var _sessionId = (function() {
    try {
      var id = sessionStorage.getItem('prayer_session_id');
      if (!id) {
        id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        sessionStorage.setItem('prayer_session_id', id);
      }
      return id;
    } catch(e) { return 'unknown'; }
  })();

  /**
   * Send a lightweight prayer cache health report to the backend.
   * Fire-and-forget. Throttled to max MAX_HEALTH_REPORTS per session.
   *
   * @param {Object} opts
   *   city, date (YYYY-MM-DD), status, timings, notifRescheduled, changedFrom, error
   */
  function _reportPrayerHealth(opts) {
    try {
      if (_healthCount >= MAX_HEALTH_REPORTS) return;
      var dedupeKey = opts.city + ':' + opts.date + ':' + opts.status;
      if (_healthReported[dedupeKey]) return;
      _healthReported[dedupeKey] = Date.now();
      _healthCount++;

      var platform = 'web';
      try {
        if (window.Capacitor && window.Capacitor.getPlatform) {
          platform = window.Capacitor.getPlatform() || 'web';
        }
      } catch(e) {}

      var mkey = window.PrayerCache && window.PrayerCache.monthKey
        ? window.PrayerCache.monthKey(opts.city,
            parseInt((opts.date||'').split('-')[0]),
            parseInt((opts.date||'').split('-')[1]))
        : null;
      var meta = mkey ? window.PrayerCache.readMeta(mkey) : null;
      var cacheAgeHours = meta && meta.fetchedAt
        ? Math.round((Date.now() - meta.fetchedAt) / 360000) / 10  // 1 decimal
        : null;

      var payload = {
        session_id:   _sessionId,
        platform:     platform,
        city:         opts.city || 'unknown',
        baghdad_date: opts.date || window.PrayerLogic.todayBaghdad(),
        cache_status: opts.status || 'unknown',
        stale_reason: opts.reason || null,
        cache_age_hours: cacheAgeHours,
        cache_version: '3',
        fajr_shown:   opts.timings && opts.timings.Fajr   || null,
        dhuhr_shown:  opts.timings && opts.timings.Dhuhr  || null,
        maghrib_shown:opts.timings && opts.timings.Maghrib|| null,
        isha_shown:   opts.timings && opts.timings.Isha   || null,
        notifications_rescheduled: opts.notifRescheduled || false,
        changed_from: opts.changedFrom || null,
        error_msg:    opts.error || null
      };

      var _phrUrl = (platform === 'web') ? '/prayer-health-report' : 'https://tafsirkurd.com/prayer-health-report';
      fetch(_phrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {}); // fire and forget — never block UI
    } catch(e) {}
  }

  // Purge old-version prayer cache keys on module init (runs once per page load)
  if (window.PrayerCache && window.PrayerCache.purgeOldKeys) {
    window.PrayerCache.purgeOldKeys();
  }

  // Re-push widget data when the app returns to foreground so the widget is always
  // accurate immediately after the user opens the app (not just when prayer tab opens).
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      console.log('[PrayerSync] app foregrounded — checking widget staleness');
      setTimeout(function() { pushWidgetIfStale(); reportWidgetHealth(); }, 800);
    }
  });

  // Send one widget health report on startup (all platforms — throttled to once/10 min)
  setTimeout(function() { reportWidgetHealth(); }, 3000);

  window.PrayerUI = {
    render: render,
    refresh: refresh,
    redraw: redraw,
    stopCountdown: stopCountdown,
    ensureCountdown: ensureCountdown,
    invalidate: function(){ _renderedKey = null; },
    openSettings: openSettings,
    _pauseSkyForQibla: function() {
      if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
      requestAnimationFrame(function() {
        _pauseSkyAnimations();
        var scene = document.getElementById('prayerSkyScene');
        if (scene) scene.classList.add('sky-paused');
      });
    },
    _resumeSkyForQibla: function() {
      setTimeout(function() {
        var scene = document.getElementById('prayerSkyScene');
        if (scene) scene.classList.remove('sky-paused');
        _resumeSkyAnimations();
        if (!_countdownInterval && _currentTimings) startCountdown();
      }, 300);
    },
    initScheduleOnStart: initScheduleOnStart,
    pushWidgetIfStale: pushWidgetIfStale,
    pushExtendedPrayerCache: pushExtendedPrayerCache,
    forceWidgetRefresh: forceWidgetRefresh,
    getWidgetHealthStatus: getWidgetHealthStatus,
    reportWidgetHealth: reportWidgetHealth,
    prefetchAllCities: prefetchAllCities,
    preloadAthanVoices: preloadVoiceBuffers,
    // Debug helpers — call from browser devtools or adb logcat
    debugWidgetDiagnostics: async function() {
      // Reads the diagnostics JSON written by the widget extension after each getTimeline.
      // Call: await PrayerUI.debugWidgetDiagnostics()
      var sp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SharedPrefs;
      if (!sp) { console.log('[WidgetDiag] SharedPrefs not available (not iOS or plugin not loaded)'); return null; }
      try {
        var res  = await sp.get({ key: 'widgetDiagnostics' });
        var raw  = res && res.value;
        if (!raw) { console.log('[WidgetDiag] no diagnostics written yet'); return null; }
        var d    = JSON.parse(raw);
        var ts   = d.ts ? new Date(d.ts).toLocaleString('en-GB', { timeZone: 'Asia/Baghdad', hour12: true }) : '?';
        console.log('[WidgetDiag] last refresh: ' + ts +
                    ' | source=' + (d.source || '?') +
                    ' | city='   + (d.city   || '?') +
                    ' | extDays='+ (d.extDays != null ? d.extDays : '?') +
                    ' | entries='+ (d.entries || '?'));
        return d;
      } catch(e) { console.log('[WidgetDiag] error:', e); return null; }
    },
    debugNotifs: function() {
      if (window.PrayerNotifications && window.PrayerNotifications.debugPendingNotifications) {
        return window.PrayerNotifications.debugPendingNotifications();
      }
      console.log('[Athan] PrayerNotifications not loaded');
    },
    forceReschedule: async function() {
      // Force a full reschedule regardless of rate-limit timestamp.
      // Use from devtools: await PrayerUI.forceReschedule()
      localStorage.removeItem('prayerLastScheduleTs');
      await initScheduleOnStart();
      if (window.PrayerNotifications) {
        await window.PrayerNotifications.debugPendingNotifications();
      }
    }
  };

})();
