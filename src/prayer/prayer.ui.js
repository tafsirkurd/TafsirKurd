/**
 * Prayer Times UI
 * Modern design: dark header card + 2-column prayer grid + settings sheet.
 *
 * Depends on: prayer.cache.js, prayer.api.js, prayer.logic.js,
 *             prayer.notifications.android.js
 */
(function() {
  'use strict';

  var _countdownInterval = null;
  var _currentTimings   = null;
  var _currentDateISO   = null;
  var _currentData      = null;
  var _tomorrowTimings  = null;
  var _tomorrowDateISO  = null;
  var _renderedKey      = null; // city:date:format — skip rebuild if unchanged

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

  var CITIES = [
    'Sulaymaniyah', 'Erbil', 'Duhok', 'Kirkuk',
    'Halabja', 'Kfry', 'Rania', 'Koya',
    'Qaladze', 'Zakho', 'Bardarash', 'Mosul',
    'Darbandikhan', 'Kalar', 'Akre', 'Daquq',
    'Makhmur', 'Mandali', 'Qarahanjir', 'DuzKhormatou'
  ];

  var CITY_LABEL = {
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

  var PRAYER_I18N = {
    Fajr:    'prayer.fajr',
    Sunrise: 'prayer.sunrise',
    Dhuhr:   'prayer.dhuhr',
    Asr:     'prayer.asr',
    Maghrib: 'prayer.maghrib',
    Isha:    'prayer.isha'
  };

  function tStr(key, replacements) {
    return window.t ? window.t(key, replacements) : key;
  }

  function getCity()    { return (window.S && S.prayerCity) || localStorage.getItem('prayerCity') || 'Duhok'; }
  function getAthan()   { return window.S ? S.prayerAthanEnabled : localStorage.getItem('prayerAthanEnabled') === 'true'; }
  function getToggles() {
    if (window.S && S.prayerToggles) return S.prayerToggles;
    try { return JSON.parse(localStorage.getItem('prayerToggles') || '{}'); } catch(e) { return {}; }
  }
  function getFormat()  { return localStorage.getItem('prayerTimeFormat') || '12'; }

  function setCity(v)    { if (window.S) S.prayerCity = v;         localStorage.setItem('prayerCity', v); }
  function setAthan(v)   { if (window.S) S.prayerAthanEnabled = v; localStorage.setItem('prayerAthanEnabled', String(v)); }
  function setToggles(v) { if (window.S) S.prayerToggles = v;      localStorage.setItem('prayerToggles', JSON.stringify(v)); }
  function getAthanVoice()    { return localStorage.getItem('prayerAthanVoice') || 'mishary'; }
  function setAthanVoice(v)   { localStorage.setItem('prayerAthanVoice', v); }
  function getAthanDuration() { var v = parseInt(localStorage.getItem('prayerAthanDuration')); return (isNaN(v) || v <= 0) ? 0 : v; }
  function setAthanDuration(v){ localStorage.setItem('prayerAthanDuration', String(v)); }
  function setFormat(v)       { localStorage.setItem('prayerTimeFormat', v); }

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
    el.style.cssText = 'top:' + startY + '%;left:-4%';
    scene.appendChild(el);
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        _aircraftRaf = null;
        return;
      }
      el.style.left = (-4 + p * 110) + '%';
      el.style.top  = (startY + (endY - startY) * p) + '%';
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
    el.style.cssText = 'position:absolute;width:2px;height:2px;background:rgba(255,255,255,0.92);border-radius:50%;top:' + startY + '%;left:-1%;z-index:6;pointer-events:none;box-shadow:0 0 3px rgba(255,255,255,0.75)';
    scene.appendChild(el);
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        _satelliteRaf = null;
        return;
      }
      el.style.left = (-1 + p * 102) + '%';
      el.style.top  = (startY + (endY - startY) * p) + '%';
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
      if (ph === 'dusk' || ph === 'sunset' || ph === 'isha') _triggerLightning();
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
    var count = 3 + Math.floor(Math.random() * 5);
    for (var i = 0; i < count; i++) {
      (function(d) { setTimeout(_triggerShootingStar, d); })(i * (500 + Math.random() * 900));
    }
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
    el.style.cssText = 'position:absolute;top:' + startY + '%;left:106%;z-index:5;pointer-events:none';
    scene.appendChild(el);
    var start = Date.now();
    function tick() {
      var p = (Date.now() - start) / dur;
      if (p >= 1) {
        if (el.parentNode) el.parentNode.removeChild(el);
        _balloonRaf = null;
        return;
      }
      el.style.left = (106 - p * 120) + '%';
      el.style.top  = (startY - Math.sin(p * Math.PI) * 9 + Math.sin(p * 22) * 1.4) + '%';
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
    if (!scene) return;
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
      if (p >= 1) { if (el.parentNode) el.parentNode.removeChild(el); return; }
      el.style.left    = (sx + p * 38) + '%';
      el.style.top     = (sy + p * 18) + '%';
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
    if (!scene || _issRaf) return;
    var startY = 8 + Math.random() * 26;
    var endY   = startY - 3 - Math.random() * 9;
    var dur    = 9000 + Math.random() * 7000; // 9–16 s
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:' + startY + '%;left:-2%;z-index:6;pointer-events:none;filter:drop-shadow(0 0 3px rgba(255,255,200,0.88))';
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
        return;
      }
      el.style.left = (-2 + p * 104) + '%';
      el.style.top  = (startY + (endY - startY) * p) + '%';
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
    el.style.cssText = 'position:absolute;bottom:2.6%;z-index:9;pointer-events:none;' +
      (goRight ? 'left:-3%' : 'right:-3%');
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
      if (goRight) el.style.left  = (-3 + p * 106) + '%';
      else         el.style.right = (-3 + p * 106) + '%';
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
      '<svg class="sky-horizon" viewBox="0 0 400 78" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
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
      horizSVG +
      '<div class="sky-top-row">' +
        '<div class="sky-city">' + (CITY_LABEL[city] || city) + '</div>' +
        '<button class="sky-bell" id="skyBell" onclick="(function(){window.PrayerUI&&document.getElementById(\'prayerSettingsOverlay\')&&document.getElementById(\'prayerSettingsOverlay\').classList.add(\'open\')})()"><i class="fas fa-bell"></i></button>' +
      '</div>' +
      '<div class="sky-bottom-row">' +
        '<div class="sky-next-name" id="skyNextName"></div>' +
        '<div class="sky-countdown" id="skyCountdown"></div>' +
        '<div class="sky-dates" id="skyDates"></div>' +
        '<div class="sky-sync" id="skySyncTime"></div>' +
      '</div>';

    container.appendChild(scene);

    // Oversize stars & horizon so parallax never reveals empty edges.
    // Stars at 0.15x gyro (max ~±1.4px) get 8px buffer (2% of 400px) — huge margin.
    // Horizon at 0.62x gyro (max ~±5.6px) gets 14px buffer (3.5% of 400px).
    var starsEl = scene.querySelector('.sky-stars');
    if (starsEl) { starsEl.style.left = '-2%'; starsEl.style.width = '104%'; }
    var horizEl = scene.querySelector('.sky-horizon');
    if (horizEl) { horizEl.style.left = '-3.5%'; horizEl.style.width = '107%'; }

    // Populate dates
    var dateInfo = data.date;
    var dateLines = [];
    if (dateInfo && dateInfo.gregorian) {
      var _wd = dateInfo.gregorian.weekday && dateInfo.gregorian.weekday.en ? dateInfo.gregorian.weekday.en + ' ' : '';
      dateLines.push(_wd + dateInfo.gregorian.day + ' ' + (dateInfo.gregorian.month && dateInfo.gregorian.month.en || '') + ' ' + dateInfo.gregorian.year);
    } else {
      var gd = new Date(today + 'T12:00:00+03:00');
      dateLines.push(gd.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Baghdad' }));
    }
    if (dateInfo && dateInfo.hijri) {
      dateLines.push(dateInfo.hijri.day + ' ' + dateInfo.hijri.month.en + ' ' + dateInfo.hijri.year + ' هـ');
    } else if (dateInfo && dateInfo.hijriStr) {
      dateLines.push(dateInfo.hijriStr);
    }
    var datesEl = document.getElementById('skyDates');
    if (datesEl) datesEl.innerHTML = dateLines.map(function(l) { return '<span>' + l + '</span>'; }).join('');

    _skyPhaseId  = null;
    _skyLastTick = 0;
    _doUpdateSky();
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

    // God rays / crepuscular rays (sunrise / fajr / sunset / asr)
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

    // Rainbow arc (sunrise → morning)
    var rainbow = document.getElementById('skyRainbow');
    if (rainbow) {
      var rbOp = pid === 'sunrise' ? 0.85 : pid === 'morning' ? 0.55 : 0;
      rainbow.style.opacity = String(rbOp);
    }

    // Cirrus clouds (high-altitude, daytime only)
    var cirrus = document.getElementById('skyCloudD');
    if (cirrus) {
      var cirOp = pid === 'morning' || pid === 'noon' || pid === 'afternoon' ? 0.50
                : pid === 'asr' || pid === 'sunrise' ? 0.32 : 0;
      cirrus.style.opacity = String(cirOp);
      cirrus.style.color = cloudColor;
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
  }

  function tickSky() {
    var now = Date.now();
    if (now - _skyLastTick < 30000) return; // update every 30s max
    _skyLastTick = now;
    _doUpdateSky();
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
      if (cl) cl.style.marginTop = (y * 0.08).toFixed(2) + 'px';
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
    stopGyro();
  }

  function startCountdown() {
    stopCountdown();
    _countdownInterval = setInterval(tickCountdown, 1000);
    tickCountdown();
    startGyro();
  }

  function tickCountdown() {
    if (!_currentTimings || !_currentDateISO) return;

    var now  = new Date();
    var pl   = window.PrayerLogic;
    var next = pl.getNextPrayer(_currentTimings, _currentDateISO, now);

    // Sky overlay countdown (new)
    var skyCd   = document.getElementById('skyCountdown');
    var skyName = document.getElementById('skyNextName');

    // Legacy header elements (kept for any remaining references)
    var cdEl   = document.getElementById('prayerCountdown');
    var nameEl = document.getElementById('prayerNextName');

    if (next) {
      var cd   = pl.formatCountdown(next.time - now);
      var name = tStr(PRAYER_I18N[next.name] || next.name);
      if (skyCd)   skyCd.textContent   = cd;
      if (skyName) skyName.textContent = name;
      if (cdEl)    cdEl.textContent    = cd;
      if (nameEl)  nameEl.textContent  = name;
      document.querySelectorAll('.prayer-grid-card[data-prayer]').forEach(function(el) {
        el.classList.toggle('prayer-grid-card--next', el.dataset.prayer === next.name);
      });
    } else {
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
      document.querySelectorAll('.prayer-grid-card[data-prayer]').forEach(function(el) {
        el.classList.remove('prayer-grid-card--next');
      });
    }

    // Update sky visuals every 30s
    tickSky();
  }

  async function fetchTomorrow() {
    if (_tomorrowTimings) return;
    var city    = getCity();
    var dateISO = window.PrayerLogic.tomorrowBaghdad();
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, dateISO);
      _tomorrowTimings = data.timings;
      _tomorrowDateISO = dateISO;
    } catch(e) {}
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

  // Push prayer data to Android widget via JS bridge
  function pushWidgetData(data, city, dateISO) {
    try {
      if (!window.TafsirAndroid) return;
      var t = data.timings;
      var hijriStr = '';
      if (data.date && data.date.hijri) {
        var _hm = data.date.hijri.month && (data.date.hijri.month.en || data.date.hijri.month) || '';
        hijriStr = data.date.hijri.day + ' ' + _hm + ' ' + data.date.hijri.year + ' هـ';
      } else if (data.date && data.date.hijriStr) {
        hijriStr = data.date.hijriStr;
      }
      var payload = JSON.stringify({
        city:    city,
        date:    dateISO,
        hijri:   hijriStr,
        timings: {
          Fajr:    (t.Fajr    || '').split(' ')[0],
          Sunrise: (t.Sunrise || '').split(' ')[0],
          Dhuhr:   (t.Dhuhr   || '').split(' ')[0],
          Asr:     (t.Asr     || '').split(' ')[0],
          Maghrib: (t.Maghrib || '').split(' ')[0],
          Isha:    (t.Isha    || '').split(' ')[0]
        }
      });
      window.TafsirAndroid.saveString('widget_prayer', payload);
    } catch(e) {}
  }

  async function render() {
    var container = document.getElementById('prayerContent');
    if (!container) return;

    var city   = getCity();
    var today  = window.PrayerLogic.todayBaghdad();
    var key    = city + ':' + today + ':' + getFormat();

    // ── Already rendered with same data — just ensure countdown is alive ──
    if (_renderedKey === key && _currentTimings) {
      if (!_countdownInterval) startCountdown();
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
      return;
    }

    // ── Slow path: no cache yet ──
    _renderedKey = null;

    // If offline, use any cached data before showing spinner/error
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
      buildOfflineError(container);
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
      buildPanel(container, data, city, today);
      startCountdown();
      pushWidgetData(data, city, today);
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
      } else {
        buildError(container);
      }
    }
  }

  async function refresh() {
    var container = document.getElementById('prayerContent');
    if (!container) return;
    var city  = getCity();
    var today = window.PrayerLogic.todayBaghdad();

    // If offline, just re-render from whatever we have — never wipe content
    if (!navigator.onLine) {
      var offlineData = _currentData || readAnyCacheNow(city);
      if (offlineData) {
        if (!_currentTimings) {
          _currentTimings = offlineData.timings;
          _currentDateISO = today;
          _currentData    = offlineData;
          buildPanel(container, offlineData, city, today);
          startCountdown();
        }
        _showCachedBadge(container);
      } else {
        buildOfflineError(container);
      }
      return;
    }

    // Online: clear cache so we fetch fresh data
    var parts = today.split('-').map(Number);
    window.PrayerCache.clear(window.PrayerCache.monthKey(city, parts[0], parts[1]));

    _renderedKey     = null;
    var hadData      = !!_currentTimings;
    stopCountdown();
    _currentTimings  = null;
    _tomorrowTimings = null;
    if (!hadData) buildLoading(container);

    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today);
      _currentTimings = data.timings;
      _currentDateISO = today;
      _currentData    = data;
      buildPanel(container, data, city, today);
      startCountdown();
      pushWidgetData(data, city, today);
      if (getAthan()) {
        var daysData = await fetchDaysData(city, today, 7);
        if (daysData.length) {
          await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true);
        }
      }
    } catch(e) {
      // Fetch failed — show cached data if available
      var fallback = readAnyCacheNow(city);
      if (fallback) {
        _currentTimings = fallback.timings;
        _currentDateISO = today;
        _currentData    = fallback;
        buildPanel(container, fallback, city, today);
        startCountdown();
        _showCachedBadge(container);
      } else {
        buildError(container);
      }
    }
  }

  // ─── DOM builders ──────────────────────────────────────────────────────────

  function buildLoading(container) {
    stopCountdown();
    clearEl(container);
    var d = cel('div', 'prayer-status');
    d.textContent = tStr('prayer.loading');
    container.appendChild(d);
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
    _renderedKey = city + ':' + today + ':' + getFormat();
    clearEl(container);
    var timings  = data.timings;
    var pl       = window.PrayerLogic;

    // Record last-synced time (only when data came from network, not cache)
    if (!data._fromCache) {
      try { localStorage.setItem('prayerLastSynced', Date.now().toString()); } catch(e) {}
    }

    // ── Sky scene (replaces old dark header card) ──
    buildSkyScene(container, data, city, today);

    // Populate last-synced indicator (subtle, only for cached data)
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

    // ── 2-column prayer grid ──
    var next  = pl.getNextPrayer(timings, today);
    var use12h = getFormat() === '12';
    var grid  = cel('div', 'prayer-grid');
    pl.PRAYER_ORDER.forEach(function(name) {
      var raw         = timings[name] || '';
      var timeDisplay = pl.formatTime(raw, use12h);
      var isNext      = next && next.name === name;

      var card = cel('div', 'prayer-grid-card' + (isNext ? ' prayer-grid-card--next' : ''));
      card.dataset.prayer = name;

      var nameEl = cel('div', 'prayer-grid-name');
      nameEl.textContent = tStr(PRAYER_I18N[name] || name);
      card.appendChild(nameEl);

      var timeEl = cel('div', 'prayer-grid-time');
      timeEl.textContent = timeDisplay;
      card.appendChild(timeEl);

      grid.appendChild(card);
    });
    container.appendChild(grid);

    // ── Ensure settings overlay exists ──
    if (!document.getElementById('prayerSettingsOverlay')) {
      buildSettingsOverlay();
    }
    updateAthanSettings(timings, city, today);

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

  // ─── Settings sheet ────────────────────────────────────────────────────────

  function buildSettingsOverlay() {
    var overlay = cel('div', 'prayer-settings-overlay');
    overlay.id = 'prayerSettingsOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeSettings(); };

    var sheet = cel('div', 'prayer-settings-sheet');
    sheet.id = 'prayerSettingsSheet';

    // Drag handle
    var handle = cel('div', 'prayer-sheet-handle');
    sheet.appendChild(handle);

    // Header
    var sheetHdr = cel('div', 'prayer-settings-hdr');
    var hdrIcon = cel('div', 'prayer-settings-hdr-icon');
    var hdrIconI = document.createElement('i');
    hdrIconI.className = 'fas fa-mosque';
    hdrIcon.appendChild(hdrIconI);
    var sheetTitle = cel('span', 'prayer-settings-title');
    sheetTitle.textContent = tStr('prayer.settings_title');
    var closeBtn = cel('button', 'prayer-settings-close');
    var closeBtnI = document.createElement('i');
    closeBtnI.className = 'fas fa-times';
    closeBtn.appendChild(closeBtnI);
    closeBtn.onclick = closeSettings;
    sheetHdr.appendChild(closeBtn);
    sheetHdr.appendChild(sheetTitle);
    sheetHdr.appendChild(hdrIcon);
    sheet.appendChild(sheetHdr);

    // City section
    var cityLabel = cel('div', 'prayer-settings-section-label');
    cityLabel.textContent = tStr('prayer.city_label');
    sheet.appendChild(cityLabel);

    var cityGrid = cel('div', 'prayer-city-grid');
    cityGrid.id = 'prayerCityGrid';
    var currentCity = getCity();
    CITIES.forEach(function(c) {
      var btn = cel('button', 'prayer-city-grid-btn' + (c === currentCity ? ' on' : ''));
      btn.dataset.city = c;
      btn.textContent = CITY_LABEL[c] || c;
      btn.onclick = function() { onCityChange(c); };
      cityGrid.appendChild(btn);
    });
    sheet.appendChild(cityGrid);

    // Format section
    var fmtLabel = cel('div', 'prayer-settings-section-label');
    fmtLabel.textContent = tStr('prayer.format_label');
    sheet.appendChild(fmtLabel);

    var fmtWrap = cel('div', 'prayer-fmt-wrap');
    var fmtSeg = cel('div', 'prayer-fmt-card');
    var fmt = getFormat();
    ['12', '24'].forEach(function(f) {
      var btn = cel('button', 'prayer-fmt-btn' + (f === fmt ? ' on' : ''));
      btn.dataset.fmt = f;
      btn.textContent = f === '24' ? '24h' : '12h';
      btn.onclick = function() { onFormatChange(f); };
      fmtSeg.appendChild(btn);
    });
    fmtWrap.appendChild(fmtSeg);
    sheet.appendChild(fmtWrap);

    // Athan section
    var athanLabel = cel('div', 'prayer-settings-section-label');
    athanLabel.textContent = tStr('prayer.athan_section');
    sheet.appendChild(athanLabel);

    var athanContainer = cel('div', 'prayer-settings-athan');
    athanContainer.id = 'prayerAthanSettings';
    sheet.appendChild(athanContainer);

    // Spacer for safe area
    var spacer = cel('div', 'prayer-settings-spacer');
    sheet.appendChild(spacer);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  var PRAYER_EMOJI = { Fajr: '🌙', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌆', Isha: '🌃' };

  function updateAthanSettings(timings, city, dateISO) {
    var container = document.getElementById('prayerAthanSettings');
    if (!container) return;
    clearEl(container);

    var isOn = getAthan();

    // ── Master toggle banner ──
    var banner = cel('div', 'prayer-master-banner prayer-master-banner--' + (isOn ? 'on' : 'off'));
    banner.id = 'prayerMasterBanner';

    var bannerIcon = cel('div', 'prayer-master-banner-icon');
    var bannerIconI = document.createElement('i');
    bannerIconI.className = isOn ? 'fas fa-bell' : 'fas fa-bell-slash';
    bannerIcon.appendChild(bannerIconI);

    var bannerText = cel('div', 'prayer-master-banner-text');
    var bannerTitle = cel('div', 'prayer-master-banner-title');
    bannerTitle.textContent = tStr('prayer.enable_athan');
    var bannerSub = cel('div', 'prayer-master-banner-sub');
    bannerSub.textContent = tStr('prayer.athan_section');
    bannerText.appendChild(bannerTitle);
    bannerText.appendChild(bannerSub);

    var tog = cel('div', 'toggle' + (isOn ? ' on' : ''));
    var knob = cel('div', 'toggle-knob');
    tog.appendChild(knob);
    tog.addEventListener('click', function(e) {
      e.stopPropagation();
      var newVal = !tog.classList.contains('on');
      tog.classList.toggle('on', newVal);
      banner.className = 'prayer-master-banner prayer-master-banner--' + (newVal ? 'on' : 'off');
      bannerIconI.className = newVal ? 'fas fa-bell' : 'fas fa-bell-slash';
      var grid = document.getElementById('prayerPrayersGrid');
      var testCard = document.getElementById('prayerTestCard');
      if (grid)     grid.classList.toggle('prayer-prayers-grid--dim', !newVal);
      if (testCard) testCard.classList.toggle('prayer-test-card--dim', !newVal);
      onAthanMasterToggle(newVal, timings, city, dateISO);
    });

    banner.appendChild(bannerIcon);
    banner.appendChild(bannerText);
    banner.appendChild(tog);
    container.appendChild(banner);

    // ── Per-prayer grid ──
    var grid = cel('div', 'prayer-prayers-grid' + (isOn ? '' : ' prayer-prayers-grid--dim'));
    grid.id = 'prayerPrayersGrid';
    var toggles = getToggles();
    window.PrayerLogic.NOTIF_PRAYERS.forEach(function(name) {
      var cardOn = toggles[name] !== false;
      var card = cel('div', 'prayer-prayer-card' + (cardOn ? ' on' : ''));
      card.dataset.prayer = name;

      var top = cel('div', 'prayer-prayer-card-top');
      var emoji = cel('span', 'prayer-prayer-card-icon');
      emoji.textContent = PRAYER_EMOJI[name] || '🕌';
      var check = cel('div', 'prayer-prayer-card-check');
      var checkI = document.createElement('i');
      checkI.className = 'fas fa-check';
      check.appendChild(checkI);
      top.appendChild(emoji);
      top.appendChild(check);

      var nameEl = cel('div', 'prayer-prayer-card-name');
      nameEl.textContent = tStr(PRAYER_I18N[name] || name);

      card.appendChild(top);
      card.appendChild(nameEl);

      card.addEventListener('click', function() {
        var nowOn = !card.classList.contains('on');
        card.classList.toggle('on', nowOn);
        onPrayerToggle(name, nowOn, timings, city, dateISO);
      });

      grid.appendChild(card);
    });
    container.appendChild(grid);

    // ── Voice section label ──
    var voiceLabel = cel('div', 'prayer-settings-section-label');
    voiceLabel.textContent = tStr('prayer.voice_label');
    container.appendChild(voiceLabel);

    // ── Voice picker ──
    var voiceListWrap = cel('div', 'prayer-voice-list');
    buildVoicePicker(voiceListWrap, city);
    container.appendChild(voiceListWrap);

    // ── Duration label ──
    var durLabel = cel('div', 'prayer-settings-section-label');
    durLabel.textContent = tStr('prayer.duration_label');
    container.appendChild(durLabel);

    // ── Duration picker ──
    buildDurationPicker(container);

    // ── Test notification card ──
    var testCard = cel('div', 'prayer-test-card' + (isOn ? '' : ' prayer-test-card--dim'));
    testCard.id = 'prayerTestCard';

    // Notification preview mockup
    var preview = cel('div', 'prayer-test-preview');
    var prevIcon = cel('div', 'prayer-test-preview-icon');
    var prevIconI = document.createElement('i');
    prevIconI.className = 'fas fa-mosque';
    prevIcon.appendChild(prevIconI);
    var prevText = cel('div', 'prayer-test-preview-text');
    var prevTitle = cel('div', 'prayer-test-preview-title');
    prevTitle.textContent = tStr('prayer.notif_title');
    var prevSub = cel('div', 'prayer-test-preview-sub');
    prevSub.textContent = tStr('prayer.test_notif_body');
    prevText.appendChild(prevTitle);
    prevText.appendChild(prevSub);
    preview.appendChild(prevIcon);
    preview.appendChild(prevText);
    testCard.appendChild(preview);

    var btnRow = cel('div', 'prayer-test-btn-row');

    var testBtn = cel('button', 'prayer-test-btn');
    var testBtnI = document.createElement('i');
    testBtnI.className = 'fas fa-bell';
    testBtn.appendChild(testBtnI);
    testBtn.appendChild(document.createTextNode(' ' + tStr('prayer.test_btn')));
    testBtn.onclick = function() {
      testBtn.disabled = true;
      testBtn.style.opacity = '0.5';
      window.PrayerNotifications.scheduleTestNotification(10).then(function(res) {
        testBtn.disabled = false;
        testBtn.style.opacity = '';
        if (res && res.ok) {
          if (window.toast) toast(tStr('prayer.test_sent'));
        } else if (res && res.denied) {
          if (window.toast) toast(tStr('prayer.perm_denied'));
        } else {
          if (window.toast) toast(tStr('prayer.test_failed'));
        }
      });
    };
    btnRow.appendChild(testBtn);

    var reschedBtn = cel('button', 'prayer-resched-btn');
    var reschedI = document.createElement('i');
    reschedI.className = 'fas fa-redo-alt';
    reschedBtn.appendChild(reschedI);
    reschedBtn.appendChild(document.createTextNode(' ' + tStr('prayer.resched_btn')));
    reschedBtn.onclick = function() {
      reschedBtn.disabled = true;
      reschedBtn.style.opacity = '0.5';
      localStorage.removeItem('prayerLastScheduleTs');
      var today2 = window.PrayerLogic.todayBaghdad();
      fetchDaysData(city, today2, 7).then(function(daysData) {
        if (!daysData.length) {
          reschedBtn.disabled = false;
          reschedBtn.style.opacity = '';
          if (window.toast) toast(tStr('prayer.no_data'));
          return;
        }
        window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true).then(function(res) {
          reschedBtn.disabled = false;
          reschedBtn.style.opacity = '';
          var count = res && res.count != null ? res.count : 0;
          if (count > 0) {
            localStorage.setItem('prayerLastScheduleTs', String(Date.now()));
            if (window.toast) toast(tStr('prayer.scheduled_ok', { count: count }));
          } else {
            if (window.toast) toast(tStr('prayer.scheduled_zero'));
          }
        });
      });
    };
    btnRow.appendChild(reschedBtn);

    testCard.appendChild(btnRow);
    container.appendChild(testCard);
  }

  /**
   * Preview a voice by firing a real notification in 2 seconds.
   * Requests permission first, creates channels, then schedules.
   */
  // Audio preview — shared context + preloaded buffers for zero-delay playback
  var _previewAudio = null;
  var _previewAbort = null;
  var _audioCtx     = null;
  var _voiceBuffers = {}; // voiceId → decoded AudioBuffer
  var _previewToken  = 0;  // incremented on every stop — stale onended callbacks check this
  var _durationTimer = null; // setTimeout handle for auto-stop after chosen duration

  function getAudioCtx() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') { _audioCtx.resume(); }
    return _audioCtx;
  }

  // Fetch + decode all voices in background so first tap is instant
  function preloadVoiceBuffers() {
    var voices = window.PrayerNotifications && window.PrayerNotifications.ATHAN_VOICES;
    if (!voices) return;
    var ctx = getAudioCtx();
    voices.forEach(function(voice) {
      if (_voiceBuffers[voice.id]) return;
      fetch(voice.previewUrl || ('/audio/athan_' + voice.id + '.ogg'))
        .then(function(r) { return r.arrayBuffer(); })
        .then(function(buf) { return ctx.decodeAudioData(buf); })
        .then(function(decoded) { _voiceBuffers[voice.id] = decoded; })
        .catch(function() {});
    });
  }

  function setPreviewBtnIcon(btn, iconClass) {
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    var i = document.createElement('i');
    i.className = iconClass;
    btn.appendChild(i);
  }

  function clearPlayingState() {
    var allBtns = document.querySelectorAll('.prayer-voice-preview-btn');
    for (var k = 0; k < allBtns.length; k++) {
      setPreviewBtnIcon(allBtns[k], 'fas fa-play');
      allBtns[k]._playingVoiceId = null;
    }
    var allRows = document.querySelectorAll('.prayer-voice-row');
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

    var durSec = getAthanDuration();

    // Buffer already decoded — play instantly with zero delay
    if (_voiceBuffers[voice.id]) {
      playDecodedBuffer(_voiceBuffers[voice.id], durSec);
      return;
    }

    // Not yet preloaded — fetch, cache, then play
    var abort = new AbortController();
    _previewAbort = abort;
    var ctx = getAudioCtx();
    fetch(voice.previewUrl || ('/audio/athan_' + voice.id + '.ogg'), { signal: abort.signal })
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) { return ctx.decodeAudioData(buf); })
      .then(function(decoded) {
        if (abort.signal.aborted) return;
        _previewAbort = null;
        _voiceBuffers[voice.id] = decoded;
        playDecodedBuffer(decoded, durSec);
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

    voices.forEach(function(voice) {
      var isSelected = voice.id === selected;
      var row = cel('div', 'prayer-voice-row' + (isSelected ? ' on' : ''));
      row.dataset.voiceId = voice.id;

      // Radio dot
      var radio = cel('div', 'prayer-voice-radio' + (isSelected ? ' on' : ''));
      row.appendChild(radio);

      // Name block (Arabic only)
      var nameWrap = cel('div', 'prayer-voice-names');
      var nameAr   = cel('span', 'prayer-voice-name-ar');
      nameAr.textContent = voice.nameAr;
      nameWrap.appendChild(nameAr);
      row.appendChild(nameWrap);

      // Preview button — plays athan audio directly
      var prevBtn = cel('button', 'prayer-voice-preview-btn');
      setPreviewBtnIcon(prevBtn, 'fas fa-play');
      prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        previewVoice(voice, prevBtn, row);
      });
      row.appendChild(prevBtn);

      // Select voice on row tap
      row.addEventListener('click', function() {
        if (voice.id === getAthanVoice()) return;
        setAthanVoice(voice.id);

        // Update radio UI
        parent.querySelectorAll('.prayer-voice-row').forEach(function(r) {
          var on = r.dataset.voiceId === voice.id;
          r.classList.toggle('on', on);
          var rd = r.querySelector('.prayer-voice-radio');
          if (rd) rd.classList.toggle('on', on);
        });

        // Reschedule notifications with new voice
        if (getAthan()) {
          var today = window.PrayerLogic.todayBaghdad();
          fetchDaysData(city, today, 7).then(function(daysData) {
            if (daysData.length) {
              window.PrayerNotifications.scheduleAthanMultiDay(
                daysData, city, getToggles(), true, voice.id
              );
            }
          });
        }
      });

      parent.appendChild(row);
    });
  }

  var DURATIONS = [
    { sec: 10,  key: 'prayer.dur_10s' },
    { sec: 20,  key: 'prayer.dur_20s' },
    { sec: 30,  key: 'prayer.dur_30s' },
    { sec: 60,  key: 'prayer.dur_60s' },
    { sec: 0,   key: 'prayer.dur_full' }
  ];

  function buildDurationPicker(parent) {
    var current = getAthanDuration();
    var wrap = cel('div', 'prayer-duration-wrap');
    DURATIONS.forEach(function(d) {
      var btn = cel('button', 'prayer-duration-btn' + (d.sec === current ? ' on' : ''));
      btn.dataset.sec = String(d.sec);
      btn.textContent = tStr(d.key);
      btn.onclick = function() {
        setAthanDuration(d.sec);
        parent.querySelectorAll('.prayer-duration-btn').forEach(function(b) {
          b.classList.toggle('on', b.dataset.sec === String(d.sec));
        });
      };
      wrap.appendChild(btn);
    });
    parent.appendChild(wrap);
  }

  function openSettings() {
    var overlay = document.getElementById('prayerSettingsOverlay');
    if (overlay) overlay.classList.add('open');
    preloadVoiceBuffers(); // decode all voices in background for instant playback
  }

  function closeSettings() {
    stopPreview();
    var overlay = document.getElementById('prayerSettingsOverlay');
    if (overlay) overlay.classList.remove('open');
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
    document.querySelectorAll('.prayer-city-grid-btn').forEach(function(btn) {
      btn.classList.toggle('on', btn.dataset.city === city);
    });
    closeSettings();
    if (getAthan()) await window.PrayerNotifications.cancelAllAthanNotifications();
    await render();
    if (getAthan()) {
      var today = window.PrayerLogic.todayBaghdad();
      var daysData = await fetchDaysData(city, today, 7);
      if (daysData.length) {
        await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true);
      }
    }
  }

  function updateAthanBanner(val) {
    var bell = document.getElementById('prayerHdrBell');
    if (!bell) return;
    bell.className = 'prayer-hdr-bell' + (val ? ' prayer-hdr-bell--on' : '');
    var icon = bell.querySelector('i');
    if (icon) icon.className = val ? 'fas fa-bell' : 'fas fa-bell-slash';
  }

  async function onAthanMasterToggle(val, timings, city, dateISO) {
    setAthan(val);
    updateAthanBanner(val);
    var wrap = document.getElementById('prayerTogglesWrap');
    if (wrap) wrap.classList.toggle('prayer-per-toggles--dim', !val);

    if (!val) {
      await window.PrayerNotifications.cancelAllAthanNotifications();
      if (window.toast) toast(tStr('prayer.athan_off'));
      return;
    }

    var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    var granted = false;
    if (LN) {
      var result = await LN.requestPermissions().catch(function() { return { display: 'denied' }; });
      granted = result.display === 'granted';
      if (!granted) {
        setAthan(false);
        var masterTog = document.querySelector('.prayer-master-toggle .toggle');
        if (masterTog) masterTog.classList.remove('on');
        if (window.toast) toast(tStr('prayer.perm_denied'));
        return;
      }
    }

    // Clear rate limit so startup reschedule runs fresh
    localStorage.removeItem('prayerLastScheduleTs');

    // Schedule 7 days ahead so athan works without opening the app
    var today = window.PrayerLogic.todayBaghdad();
    var daysData = await fetchDaysData(city, today, 7);
    if (daysData.length) {
      var res = await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), granted);
      var count = res && res.count != null ? res.count : 0;
      if (count > 0) {
        localStorage.setItem('prayerLastScheduleTs', String(Date.now()));
        if (window.toast) toast(tStr('prayer.scheduled_ok', { count: count }));
        if (window._showNotifSetupHint) window._showNotifSetupHint();
      } else {
        if (window.toast) toast(tStr('prayer.scheduled_zero'));
      }
    } else {
      if (window.toast) toast(tStr('prayer.no_data'));
    }
  }

  async function onPrayerToggle(name, val, timings, city, dateISO) {
    var toggles = getToggles();
    toggles[name] = val;
    setToggles(toggles);
    if (getAthan()) {
      var today = window.PrayerLogic.todayBaghdad();
      var daysData = await fetchDaysData(city, today, 7);
      if (daysData.length) {
        await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, toggles, true);
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
        if (Cache.read(mkey)) continue; // already cached — skip
        try {
          var url = 'https://tafsirkurd.com/prayer-kurd?city=' +
                    encodeURIComponent(city) + '&year=' + ym.year + '&month=' + ym.month;
          var res = await fetch(url);
          if (!res.ok) continue;
          var data = await res.json();
          if (data && !data.error && data.days && Object.keys(data.days).length > 0) {
            Cache.write(mkey, data);
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
    if (!getAthan()) return;
    // Rate-limit: reschedule at most once per 15 min (Samsung can kill alarms; keep short)
    var now = Date.now();
    var lastTs = parseInt(localStorage.getItem('prayerLastScheduleTs') || '0');
    if (now - lastTs < 15 * 60 * 1000) return;
    var today = window.PrayerLogic.todayBaghdad();
    var city = getCity();
    try {
      var daysData = await fetchDaysData(city, today, 7);
      if (!daysData.length) return;
      var res = await window.PrayerNotifications.scheduleAthanMultiDay(daysData, city, getToggles(), true);
      // Only update timestamp if notifications were actually scheduled
      if (res && res.count > 0) {
        localStorage.setItem('prayerLastScheduleTs', String(now));
      }
    } catch(e) { console.error('[Athan] initScheduleOnStart error:', e); }
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

  function openQibla() {
    if (!window.PrayerQibla) return;
    var city   = getCity();
    var coords = window.PrayerAPI && window.PrayerAPI.CITY_COORDS
                 ? window.PrayerAPI.CITY_COORDS[city] : null;
    window.PrayerQibla.open(coords);
  }

  async function testNotifNow(delaySeconds) {
    var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!LN) return;
    delaySeconds = delaySeconds || 10;
    var voice = window.PrayerNotifications.getSelectedVoice();
    await window.PrayerNotifications.ensureAllChannels();
    var at = new Date(Date.now() + delaySeconds * 1000);
    await LN.cancel({ notifications: [{ id: 999 }] }).catch(function() {});
    await LN.schedule({ notifications: [{
      id: 999,
      title: tStr('prayer.test_notif_title'),
      body: tStr('prayer.test_notif_body'),
      schedule: { at: at, allowWhileIdle: true },
      channelId: 'athan_' + voice,
      sound: 'athan_' + voice,
      smallIcon: 'ic_notification'
    }]});
  }

  window.PrayerUI = {
    render: render,
    refresh: refresh,
    redraw: redraw,
    stopCountdown: stopCountdown,
    invalidate: function(){ _renderedKey = null; },
    openSettings: openSettings,
    openQibla: openQibla,
    initScheduleOnStart: initScheduleOnStart,
    prefetchAllCities: prefetchAllCities,
    preloadAthanVoices: preloadVoiceBuffers,
    testNotifNow: testNotifNow
  };

})();
