/**
 * Smart Daily Companion  v31
 * Always exactly 5 cards:
 *   1. Zikr of current time   (time-aware, always present via fallback)
 *   2. Ayah of the day        (Baghdad-seeded, salt 1)
 *   3. Hadith of the day      (Baghdad-seeded, salt 2)
 *   4. Book of the day        (Baghdad-seeded, salt 4)
 *   5. Weather dhikr          (rain when raining, thunder/wind otherwise)
 *
 * Daily cards (2-4) use Asia/Baghdad date as seed (UTC+3, no DST).
 * All users see the same daily cards; refresh at 00:00 Baghdad time.
 */
(function(window) {
  'use strict';

  /* ─────────────────────────────────────────────
     TIME ITEMS  (card 1 — time-aware zikr)
  ───────────────────────────────────────────── */
  var TIME_ITEMS = [
    /* ── Prayer windows (highest priority — override morning/evening) ── */
    {
      id: 'masjid_enter', categoryKey: 'masjid_enter', icon: 'fas fa-mosque',
      labelKey: 'adhkar.masjid_enter', labelFallback: 'چوونا مزگەوتێ',
      subtitleKey: 'gencine.smart.masjid_hint', subtitleFallback: 'کاتا چوونا مزگەوتێ',
      timeTag: 'مزگەوت', basePriority: 90,
      prayerOffset: 0   /* 0–20 min after each athan */
    },
    {
      id: 'after_prayer', categoryKey: 'after_prayer', icon: 'fas fa-hands-praying',
      labelKey: 'adhkar.after_prayer', labelFallback: 'دوای نوێژ',
      subtitleKey: 'gencine.smart.after_prayer_hint', subtitleFallback: 'زکرێن دوای نوێژکردن',
      timeTag: 'دوای نوێژ', basePriority: 85,
      prayerOffset: 20  /* 20–40 min after each athan */
    },

    {
      id: 'morning', categoryKey: 'morning', icon: 'fas fa-sun',
      labelKey: 'adhkar.morning', labelFallback: 'زکرێن بەیانیکردن',
      subtitleKey: 'gencine.smart.morning_hint', subtitleFallback: 'ڕۆژا خوه ب زکرێ دەستپێکە',
      timeTag: 'بەیانیکردن', basePriority: 50,
      timeWindow: { start: 'Fajr', end: 'Dhuhr', fs: 5*60, fe: 11*60+30, wraps: false }
    },
    {
      id: 'waking', categoryKey: 'waking', icon: 'fas fa-cloud-sun',
      labelKey: 'adhkar.waking', labelFallback: 'دوای هاتنا خوو',
      subtitleKey: 'gencine.smart.waking_hint', subtitleFallback: 'دوای هاتنا خووێ بخوێنە',
      timeTag: 'بەیانیکردن', basePriority: 58, /* beats morning when both active (Fajr→Sunrise) */
      timeWindow: { start: 'Fajr', end: 'Sunrise', fs: 5*60, fe: 8*60, wraps: false }
    },
    {
      id: 'evening', categoryKey: 'evening', icon: 'fas fa-moon',
      labelKey: 'adhkar.evening', labelFallback: 'زکرێن ئێواربوون',
      subtitleKey: 'gencine.smart.evening_hint', subtitleFallback: 'ئێوارا خوە ب زکرێ بکە',
      timeTag: 'ئێواربوون', basePriority: 50,
      timeWindow: { start: 'Asr', end: 'Isha', fs: 15*60+30, fe: 21*60, wraps: false }
    },
    {
      id: 'sleep', categoryKey: 'sleep', icon: 'fas fa-bed',
      labelKey: 'adhkar.sleep', labelFallback: 'دوای خەوکردن',
      subtitleKey: 'gencine.smart.sleep_hint', subtitleFallback: 'پێش خەوکردنێ بخوێنە',
      timeTag: 'شەو', basePriority: 50,
      timeWindow: { start: 'Isha', end: 'Fajr', fs: 21*60, fe: 5*60, wraps: true }
    },
    {
      id: 'friday', categoryKey: 'friday', icon: 'fas fa-calendar-day',
      labelKey: 'adhkar.friday', labelFallback: 'ڕۆژا ئینانێ',
      subtitleKey: 'gencine.smart.friday_hint', subtitleFallback: 'ڕۆژا ئینانێ ئەمڕۆ یە',
      timeTag: 'ئینانی', basePriority: 65, /* intentionally beats morning/evening on Friday */
      dayBoostDays: [5]
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'سەلاوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'سەلاواتێ بکە سەر پێغەمبەر \uFDFA',
      timeTag: null, basePriority: 60, /* beats morning/evening but loses to friday */
      dayBoostDays: [5],
      thursdayNightBoost: true
    },

    /* ── Ramadan ── */
    {
      id: 'fasting', categoryKey: 'fasting', icon: 'fas fa-moon',
      labelKey: 'adhkar.fasting', labelFallback: 'ڕوژی',
      subtitleKey: 'gencine.smart.fasting_hint', subtitleFallback: 'ڕوژیدارییەکت خوا قبوڵ بکات',
      timeTag: 'ڕەمەزان', basePriority: 60,
      hijriCond: function(h, nowMin, fajrMin, maghribMin) {
        return h.month === 9 && nowMin >= fajrMin && nowMin < maghribMin;
      }
    },
    {
      id: 'breaking_fast', categoryKey: 'breaking_fast', icon: 'fas fa-utensils',
      labelKey: 'adhkar.breaking_fast', labelFallback: 'کردنەوەی ڕوژی',
      subtitleKey: 'gencine.smart.breaking_fast_hint', subtitleFallback: 'ئیفتارا خوش',
      timeTag: 'ئیفتار', basePriority: 95, /* highest — iftar beats even prayer windows */
      hijriCond: function(h, nowMin, fajrMin, maghribMin) {
        return h.month === 9 && nowMin >= maghribMin && nowMin < maghribMin + 45;
      }
    },
    {
      id: 'lailat_qadr', categoryKey: 'lailat_qadr', icon: 'fas fa-star',
      labelKey: 'adhkar.lailat_qadr', labelFallback: 'شەوا قەدرێ',
      subtitleKey: 'gencine.smart.lailat_qadr_hint', subtitleFallback: 'شەوا هەزار مانگ',
      timeTag: 'لێلەتول قەدر', basePriority: 80,
      hijriCond: function(h, nowMin, fajrMin, maghribMin) {
        if (h.month !== 9) return false;
        /* nights 21-29: show after Maghrib of day 20-28, or before Fajr on days 21-29 */
        var isNight = nowMin >= maghribMin || nowMin < fajrMin;
        if (h.day >= 21 && h.day <= 29 && isNight) return true;
        if (h.day === 20 && nowMin >= maghribMin)   return true; /* night 21 starts */
        return false;
      }
    },

    /* ── Dhul Hijjah ── */
    {
      id: 'dhul_hijjah', categoryKey: 'dhul_hijjah', icon: 'fas fa-kaaba',
      labelKey: 'adhkar.dhul_hijjah', labelFallback: 'ذوالحیجە',
      subtitleKey: 'gencine.smart.dhul_hijjah_hint', subtitleFallback: 'دهە ڕۆژێن گەورە',
      timeTag: 'ذوالحیجە', basePriority: 70,
      hijriCond: function(h) { return h.month === 12 && h.day >= 1 && h.day <= 8; }
    },
    {
      id: 'arafat', categoryKey: 'arafat', icon: 'fas fa-kaaba',
      labelKey: 'adhkar.arafat', labelFallback: 'ڕۆژا عەرەفە',
      subtitleKey: 'gencine.smart.arafat_hint', subtitleFallback: 'باشترین ڕۆژی ساڵ',
      timeTag: 'عەرەفە', basePriority: 85,
      hijriCond: function(h) { return h.month === 12 && h.day === 9; }
    },

  ];

  /* ─────────────────────────────────────────────
     WEATHER ITEMS  (card 5 — dedicated weather slide)
     Rain when raining, otherwise thunder or wind as fallback.
  ───────────────────────────────────────────── */
  var WEATHER_ITEMS = [
    {
      id: 'rain', categoryKey: 'rain', icon: 'fas fa-cloud-rain',
      labelKey: 'adhkar.rain', labelFallback: 'کاتی باران',
      subtitleKey: 'gencine.smart.rain_hint', subtitleFallback: 'باران دکەت — دوعا بکە',
      timeTag: 'باران'
    },
    {
      id: 'thunder', categoryKey: 'thunder', icon: 'fas fa-bolt',
      labelKey: 'adhkar.thunder', labelFallback: 'دەمی هەورووبرووسکە',
      subtitleKey: 'gencine.smart.thunder_hint', subtitleFallback: 'زکرێن هەورووبرووسکە',
      timeTag: 'هەوا'
    },
    {
      id: 'wind', categoryKey: 'wind', icon: 'fas fa-wind',
      labelKey: 'adhkar.wind', labelFallback: 'دەمی باد',
      subtitleKey: 'gencine.smart.wind_hint', subtitleFallback: 'زکرێن کاتی باد',
      timeTag: 'هەوا'
    }
  ];

  /* Fallback pool — used when no time window is active (e.g. midday weekday).
     Picked by daily seed → same all day, changes tomorrow.
     8 items = 8-day cycle. after_prayer removed (covered by prayer window). */
  var FALLBACK_ZIKR = [
    {
      id: 'forgiveness', categoryKey: 'forgiveness', icon: 'fas fa-dove',
      labelKey: 'adhkar.forgiveness', labelFallback: 'داواکاری لێبوردن',
      subtitleKey: 'gencine.smart.forgiveness_hint', subtitleFallback: 'ئیستیخفارەکە زیادە بکە',
      timeTag: null
    },
    {
      id: 'protection', categoryKey: 'protection', icon: 'fas fa-shield-halved',
      labelKey: 'adhkar.protection', labelFallback: 'پاراستن',
      subtitleKey: 'gencine.smart.protection_hint', subtitleFallback: 'زکرێن پاراستن و حەمایەتێ',
      timeTag: null
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'سەلاوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'سەلاواتێ بکە سەر پێغەمبەر \uFDFA',
      timeTag: null
    },
    {
      id: 'gratitude', categoryKey: 'gratitude', icon: 'fas fa-star',
      labelKey: 'adhkar.gratitude', labelFallback: 'سوپاسگوزاری',
      subtitleKey: 'gencine.smart.gratitude_hint', subtitleFallback: 'سوپاسا خواێ بکە',
      timeTag: null
    },
    {
      id: 'before_quran', categoryKey: 'before_quran', icon: 'fas fa-book-open-reader',
      labelKey: 'adhkar.before_quran', labelFallback: 'پێش خوێندنا قورئانێ',
      subtitleKey: 'gencine.smart.before_quran_hint', subtitleFallback: 'پێش دەستپێکردنا قورئانێ',
      timeTag: null
    },
    {
      id: 'distress', categoryKey: 'distress', icon: 'fas fa-hand-holding-heart',
      labelKey: 'adhkar.distress', labelFallback: 'کاتی زەحمەت',
      subtitleKey: 'gencine.smart.distress_hint', subtitleFallback: 'دوعا لە کاتی زەحمەت',
      timeTag: null
    },
    {
      id: 'istikhara', categoryKey: 'istikhara', icon: 'fas fa-compass',
      labelKey: 'adhkar.istikhara', labelFallback: 'ئیستیخارە',
      subtitleKey: 'gencine.smart.istikhara_hint', subtitleFallback: 'داواکاری ڕێنمایی',
      timeTag: null
    },
    {
      id: 'adhan', categoryKey: 'adhan', icon: 'fas fa-bullhorn',
      labelKey: 'adhkar.adhan', labelFallback: 'دوعای ئەزان',
      subtitleKey: 'gencine.smart.adhan_hint', subtitleFallback: 'دوعای دوای ئەزان',
      timeTag: null
    }
  ];

  /* ─────────────────────────────────────────────
     SURAH DATA
  ───────────────────────────────────────────── */
  var SURAH_NAMES = [
    'فاتحە','بەقەرە','ئالی عیمران','نیسا','مائیدە','ئەنعام','ئەعراف','ئەنفال',
    'توبە','یونس','هود','یوسف','ڕەعد','ئیبراهیم','حیجر','نەحل','ئیسرا','کەهف',
    'مەریەم','تاها','ئەنبیا','حەج','مومینون','نور','فورقان','شوعەرا','نەمل',
    'قەسەس','عەنکەبوت','ڕوم','لوقمان','سەجدە','ئەحزاب','سەبا','فاتیر','یاسین',
    'سافات','ساد','زومەر','غافیر','فوسیلەت','شورا','زوخروف','دوخان','جاسیە',
    'ئەحقاف','موحەممەد','فەتح','حوجورات','قاف','زاریات','تور','نەجم','قەمەر',
    'ڕەحمان','واقیعە','حەدید','موجادیلە','حەشر','مومتەحینە','سەف','جومعە',
    'موناقیقون','تەغابون','تەلاق','تەحریم','مولک','قەلەم','هاققە','مەعاریج',
    'نوح','جین','موزەممیل','موددەسیر','قیامەت','ئینسان','موڕسەلات','نەبا',
    'نازیعات','عەبەسە','تەکویر','ئینفیتار','موتەففیفین','ئینشیقاق','بوروج',
    'تارق','ئەعلا','غاشیە','فەجر','بەلەد','شەمس','لێل','دوحا','شەرح','تین',
    'عەلەق','قەدر','بەیینە','زەلزەلە','عادیات','قارعە','تەکاسور','عەسر',
    'هومەزە','فیل','قورێش','ماعون','کەوسەر','کافیرون','نەسر','مەسەد','ئیخلاس',
    'فەلەق','ناس'
  ];
  var SURAH_NAMES_AR = [
    'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال',
    'التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف',
    'مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل',
    'القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس',
    'الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية',
    'الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر',
    'الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة',
    'المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج',
    'نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ',
    'النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج',
    'الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين',
    'العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر',
    'الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص',
    'الفلق','الناس'
  ];
  var SURAH_SIZES = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
    59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,
    52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,
    11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
  ];

  /* ─────────────────────────────────────────────
     HIJRI CALENDAR  (tabular / civil algorithm)
     Pass _baghdadDate() so day changes at Baghdad midnight.
  ───────────────────────────────────────────── */
  function _toHijri(date) {
    var y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a, mm = m + 12 * a - 3;
    var jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
              Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    var l = jdn - 1948440 + 10632;
    var n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
            Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
        Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    return {
      year:  30 * n + j - 30,
      month: Math.floor((24 * l) / 709),
      day:   l - Math.floor((709 * Math.floor((24 * l) / 709)) / 24)
    };
  }

  /* ─────────────────────────────────────────────
     WEATHER DETECTION  (Duhok: 36.87°N 42.95°E)
     3 independent sources fetched in parallel.
     Majority vote wins; if 2+ agree → use that.
     If all fail → keep last cached result.
     Cache TTL: 30 min (fresh enough, not spammy).

     Condition values:
       'rain'      — precipitation / drizzle / showers
       'thunder'   — thunderstorm
       'wind'      — high wind (≥ 40 km/h), no rain
       'clear'     — nothing notable
  ───────────────────────────────────────────── */
  var _RAIN_KEY = 'sd_rain_v2';
  var _RAIN_TTL = 30 * 60 * 1000;

  /* Weather-code → condition classifier */
  function _classifyCode(code, prec, windspeed) {
    code = code || 0; prec = prec || 0; windspeed = windspeed || 0;
    if (code >= 95) return 'thunder';                         /* 95-99 thunderstorm        */
    if (prec > 0 || (code >= 51 && code <= 82)) return 'rain'; /* drizzle/rain/showers     */
    if (windspeed >= 40) return 'wind';                       /* strong wind, no precip    */
    return 'clear';
  }

  function _isRaining() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return c.condition !== 'clear';
    } catch(e) {}
    return false;
  }

  /* Returns cached condition or 'clear' if cache is fresh */
  function _getWeatherCondition() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return c.condition || 'clear';
    } catch(e) {}
    return 'clear';
  }

  /* Shared Open-Meteo parser — same WMO weather_code scale for all models */
  function _omFetch(url) {
    return fetch(url).then(function(r){return r.json();}).then(function(d){
      var c = d.current || {};
      return _classifyCode(c.weather_code, c.precipitation, c.wind_speed_10m);
    }).catch(function(){return null;});
  }

  /* wttr.in parser (JSON v1) — works for both city-name and coord URLs */
  function _wttrFetch(url) {
    return fetch(url).then(function(r){return r.json();}).then(function(d){
      var cur = (d.current_condition && d.current_condition[0]) || {};
      var code = parseInt(cur.weatherCode || '0', 10);
      var prec = parseFloat(cur.precipMM || '0');
      var wind = parseFloat(cur.windspeedKmph || '0');
      if (code >= 200 && code < 300) return 'thunder';
      if (prec > 0 || (code >= 300 && code < 600)) return 'rain';
      if (wind >= 40) return 'wind';
      return 'clear';
    }).catch(function(){return null;});
  }

  var _OM = 'https://api.open-meteo.com/v1/forecast?latitude=36.87&longitude=42.95&current=precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBaghdad&forecast_days=1';

  var _fetchRainInProgress = false;
  function _fetchRain() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return; /* cache fresh */
    } catch(e) {}
    if (_fetchRainInProgress) return;
    _fetchRainInProgress = true;

    /* 10 independent sources — 6 meteorological models via Open-Meteo,
       wttr.in ×2, Norwegian Met Office, and 7timer.info                */

    /* Sources 1-6 — Open-Meteo serving 6 different agency models */
    var s1 = _omFetch(_OM);                                                   /* best-match (auto) */
    var s2 = _omFetch(_OM + '&models=ecmwf_ifs025');                          /* ECMWF IFS 0.25° */
    var s3 = _omFetch(_OM + '&models=gfs_seamless');                          /* US NOAA GFS */
    var s4 = _omFetch(_OM + '&models=icon_seamless');                         /* German DWD ICON */
    var s5 = _omFetch(_OM + '&models=gem_seamless');                          /* Canadian CMC GEM */
    var s6 = _omFetch(_OM + '&models=meteofrance_seamless');                  /* Météo-France */

    /* Source 7 — wttr.in by city name */
    var s7 = _wttrFetch('https://wttr.in/Duhok?format=j1');

    /* Source 8 — wttr.in by exact Duhok coordinates */
    var s8 = _wttrFetch('https://wttr.in/36.87,42.95?format=j1');

    /* Source 9 — Norwegian Met Office (fully independent provider) */
    var s9 = fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=36.87&lon=42.95',
        { headers: { 'User-Agent': 'TafsirKurdApp/1.0 tefsirkurd@gmail.com' } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var ts   = (d.properties && d.properties.timeseries && d.properties.timeseries[0]) || {};
        var inst = (ts.data && ts.data.instant && ts.data.instant.details) || {};
        var n1h  = (ts.data && ts.data.next_1_hours) || {};
        var sym  = (n1h.summary && n1h.summary.symbol_code) || '';
        var prec = (n1h.details && n1h.details.precipitation_amount) || 0;
        var wind = inst.wind_speed || 0; /* m/s */
        if (sym.indexOf('thunder') !== -1) return 'thunder';
        if (sym.indexOf('rain') !== -1 || sym.indexOf('sleet') !== -1 || sym.indexOf('shower') !== -1 || prec > 0) return 'rain';
        if (wind >= 11) return 'wind'; /* 11 m/s ≈ 40 km/h */
        return 'clear';
      }).catch(function() { return null; });

    /* Source 10 — 7timer.info CIVIL product (independent forecast provider) */
    var s10 = fetch('https://www.7timer.info/bin/api.pl?lon=42.95&lat=36.87&product=civil&output=json')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var ds   = (d.dataseries && d.dataseries[0]) || {};
        var prec = ds.prec_type || 'none';
        var wspd = (ds.wind10m && ds.wind10m.speed) || 1; /* 1-8 scale; 7≥50 km/h */
        if (prec === 'rain' || prec === 'frzr' || prec === 'icepellets' || prec === 'snow') return 'rain';
        if (wspd >= 7) return 'wind';
        return 'clear';
      }).catch(function() { return null; });

    Promise.all([s1, s2, s3, s4, s5, s6, s7, s8, s9, s10]).then(function(results) {
      _fetchRainInProgress = false;
      /* Filter out nulls (failed sources) */
      var valid = results.filter(function(r) { return r !== null; });
      if (!valid.length) return; /* all failed — keep stale cache */

      /* Majority vote: count each condition */
      var counts = {};
      valid.forEach(function(cond) { counts[cond] = (counts[cond] || 0) + 1; });

      /* Pick condition with highest count; tie-break: prefer more severe */
      var severity = { thunder: 3, rain: 2, wind: 1, clear: 0 };
      var winner = valid[0];
      var winnerScore = counts[winner] * 10 + (severity[winner] || 0);
      Object.keys(counts).forEach(function(cond) {
        var score = counts[cond] * 10 + (severity[cond] || 0);
        if (score > winnerScore) { winner = cond; winnerScore = score; }
      });

      try {
        localStorage.setItem(_RAIN_KEY, JSON.stringify({
          ts: Date.now(),
          condition: winner,
          sources: results  /* debug: what each source returned */
        }));
      } catch(e2) {}
    }).catch(function() { _fetchRainInProgress = false; });
  }

  /* ─────────────────────────────────────────────
     TIME HELPERS
  ───────────────────────────────────────────── */
  function _toMin(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return -1;
    var p = hhmm.split(':');
    return p.length < 2 ? -1 : parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function _todayISO() {
    var d = new Date();
    return d.getFullYear()
      + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
  }

  function _inRange(cur, s, e, wraps) {
    if (s < 0 || e < 0) return false;
    return wraps ? (cur >= s || cur < e) : (cur >= s && cur < e);
  }

  /* Baghdad date (Asia/Baghdad = UTC+3, no DST).
     Shift now by +3 h then read the UTC fields — equivalent to
     reading local date in Baghdad.  Same result for every user
     on the same Baghdad calendar day; changes at 00:00 Baghdad. */
  var _BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;   /* UTC+3, fixed */

  function _baghdadDate() {
    return new Date(Date.now() + _BAGHDAD_OFFSET_MS);
  }

  function _daySeed() {
    var d = _baghdadDate();
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }

  /* Deterministic daily index — same result all day, changes next day */
  function _seededIdx(length, salt) {
    if (!length) return 0;
    return Math.abs(_daySeed() * 31 + salt * 7919) % length;
  }

  /* ─────────────────────────────────────────────
     PRAYER TIMES
  ───────────────────────────────────────────── */
  function _getPrayerTimings() {
    try {
      var city   = localStorage.getItem('prayerCity')   || 'Duhok';
      var method = parseInt(localStorage.getItem('prayerMethod') || '13', 10);
      var today  = new Date();
      var dayNum = String(today.getDate());
      var mk = 'prayer-kurd2:' + city + ':' + today.getFullYear() + ':' + (today.getMonth() + 1);
      var monthly = JSON.parse(localStorage.getItem(mk));
      if (monthly && monthly.days && monthly.days[dayNum] && monthly.days[dayNum].Fajr)
        return monthly.days[dayNum];
      var dk = 'prayer3:' + city + ':' + method + ':' + _todayISO();
      var daily = JSON.parse(localStorage.getItem(dk));
      if (daily && daily.timings && daily.timings.Fajr) return daily.timings;
    } catch(e) {}
    return null;
  }

  /* ─────────────────────────────────────────────
     STATE / STREAKS
  ───────────────────────────────────────────── */
  var _STATE_KEY = 'sd_daily_v1';

  function _getState() {
    try {
      var raw = JSON.parse(localStorage.getItem(_STATE_KEY));
      if (raw && raw.date === _todayISO()) return raw;
    } catch(e) {}
    return { date: _todayISO(), opened: [], completed: [] };
  }

  function _saveState(s) {
    try { localStorage.setItem(_STATE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  function _markOpened(id) {
    var s = _getState();
    if (s.opened.indexOf(id) < 0) s.opened.push(id);
    _saveState(s);
  }

  function _markCompleted(id) {
    var s = _getState();
    if (s.completed.indexOf(id) < 0) s.completed.push(id);
    if (s.opened.indexOf(id)    < 0) s.opened.push(id);
    _saveState(s);
    _updateStreak(id);
  }

  function _getStreak(id) {
    try { return JSON.parse(localStorage.getItem('sd_streak_' + id)) || { count: 0, lastDate: null }; }
    catch(e) { return { count: 0, lastDate: null }; }
  }

  function _updateStreak(id) {
    var streak = _getStreak(id);
    var today  = _todayISO();
    if (streak.lastDate === today) return streak;
    var prev = new Date(Date.now() - 86400000);
    var yest  = prev.getFullYear() + '-'
      + String(prev.getMonth() + 1).padStart(2, '0') + '-'
      + String(prev.getDate()).padStart(2, '0');
    streak.count    = (streak.lastDate === yest) ? streak.count + 1 : 1;
    streak.lastDate = today;
    try { localStorage.setItem('sd_streak_' + id, JSON.stringify(streak)); } catch(e) {}
    return streak;
  }

  /* ─────────────────────────────────────────────
     CATEGORY DATA CHECK
  ───────────────────────────────────────────── */
  function _catHasData(catKey) {
    try {
      var cached = JSON.parse(localStorage.getItem('gencine_adhkar_v1'));
      if (!cached || !Array.isArray(cached)) return true;
      return cached.some(function(a) { return a.category_key === catKey && a.active !== false; });
    } catch(e) { return true; }
  }

  /* ─────────────────────────────────────────────
     TIME-ACTIVE CHECK
  ───────────────────────────────────────────── */
  function _isTimeActive(item, nowMin, dow, prayers, maghribMin, fajrMin) {
    if (item.timeWindow) {
      var tw = item.timeWindow;
      var ts = (prayers && _toMin(prayers[tw.start]) >= 0) ? _toMin(prayers[tw.start]) : tw.fs;
      var te = (prayers && _toMin(prayers[tw.end])   >= 0) ? _toMin(prayers[tw.end])   : tw.fe;
      return _inRange(nowMin, ts, te, tw.wraps);
    }
    /* prayerOffset: active for 20 min starting `offset` minutes after each of the 5 prayers */
    if (item.prayerOffset !== undefined) {
      var PRAYERS = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
      for (var pi = 0; pi < PRAYERS.length; pi++) {
        var base = prayers ? _toMin(prayers[PRAYERS[pi]]) : -1;
        if (base < 0) continue;
        var ws = (base + item.prayerOffset) % (24 * 60);
        var we = (ws + 20) % (24 * 60);
        var wraps = we < ws;
        if (_inRange(nowMin, ws, we, wraps)) return true;
      }
      return false;
    }
    if (item.dayBoostDays && item.dayBoostDays.indexOf(dow) >= 0) return true;
    if (item.thursdayNightBoost && dow === 4 && nowMin >= maghribMin) return true;
    if (item.hijriCond) {
      var h = _toHijri(_baghdadDate());
      return item.hijriCond(h, nowMin, fajrMin, maghribMin);
    }
    if (item.rainCond) return _isRaining();
    return false;
  }

  function _scoreItem(item, state) {
    var s = item.basePriority || 50;
    if (state.completed.indexOf(item.id) >= 0) s -= 60;
    if (state.opened.indexOf(item.id)    >= 0) s -= 15;
    return s;
  }

  /* ─────────────────────────────────────────────
     CARD 1 — ZIKR OF CURRENT TIME
     Always returns exactly one item.
     Priority: time-active window > daily-seeded fallback.
  ───────────────────────────────────────────── */
  function _getZikrItem() {
    _fetchRain(); /* background refresh — never blocks rendering */

    var now        = new Date();
    var nowMin     = now.getHours() * 60 + now.getMinutes();
    var dow        = now.getDay();
    var prayers    = _getPrayerTimings();
    var maghribMin = (prayers && _toMin(prayers.Maghrib) >= 0) ? _toMin(prayers.Maghrib) : 18 * 60;
    var fajrMin    = (prayers && _toMin(prayers.Fajr)    >= 0) ? _toMin(prayers.Fajr)    :  5 * 60;
    var state      = _getState();

    var active = TIME_ITEMS
      .filter(function(item) {
        return _catHasData(item.categoryKey) && _isTimeActive(item, nowMin, dow, prayers, maghribMin, fajrMin);
      })
      .map(function(item) { return { item: item, score: _scoreItem(item, state) }; })
      .sort(function(a, b) { return b.score - a.score; });

    var fallback = FALLBACK_ZIKR[_seededIdx(FALLBACK_ZIKR.length, 3)];

    /* If the top winner is a prayer-offset item already completed today,
       yield to fallback — user already read it, no point repeating it
       just because they opened the app again within the same window.      */
    var winner = active.length ? active[0].item : null;
    var winnerExhausted = winner
      && winner.prayerOffset !== undefined
      && state.completed.indexOf(winner.id) >= 0;

    /* ── Debug log ── */
    try {
      var dbgT = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
      if (active.length) {
        console.log('[SmartZikr] ' + dbgT + ' — candidates:');
        active.forEach(function(c) {
          var mark = (!winnerExhausted && c === active[0]) ? '✓' : ' ';
          console.log('  ' + mark + ' ' + c.item.id + ' score=' + c.score);
        });
        if (winnerExhausted) {
          console.log('[SmartZikr] winner ' + winner.id + ' already completed → fallback: ' + fallback.id);
        } else {
          console.log('[SmartZikr] winner → ' + winner.id);
        }
      } else {
        console.log('[SmartZikr] ' + dbgT + ' — no active window → fallback: ' + fallback.id);
      }
    } catch(e) {}

    if (!active.length || winnerExhausted) return fallback;
    return winner;
  }

  /* ─────────────────────────────────────────────
     CARD 5 — WEATHER DHIKR
     Condition from multi-source vote:
       thunder → thunder dhikr
       rain    → rain dhikr
       wind    → wind dhikr
       clear   → rotate thunder/wind by daily seed
     Slide hidden only if the chosen category has no adhkar data at all.
  ───────────────────────────────────────────── */
  function _getWeatherItem() {
    _fetchRain(); /* background refresh — never blocks rendering */
    var condition = _getWeatherCondition();

    /* Map condition → preferred WEATHER_ITEMS index */
    var preferred;
    if (condition === 'thunder') preferred = WEATHER_ITEMS[1];  /* thunder */
    else if (condition === 'rain') preferred = WEATHER_ITEMS[0]; /* rain    */
    else if (condition === 'wind') preferred = WEATHER_ITEMS[2]; /* wind    */
    else {
      /* clear sky — rotate thunder/wind by daily seed (salt 6) */
      var fallbacks = [WEATHER_ITEMS[1], WEATHER_ITEMS[2]];
      var start = _seededIdx(fallbacks.length, 6);
      preferred = fallbacks[start];
    }

    /* Use preferred if it has data */
    if (_catHasData(preferred.categoryKey)) return preferred;

    /* Preferred has no data — try other weather items */
    for (var i = 0; i < WEATHER_ITEMS.length; i++) {
      if (WEATHER_ITEMS[i] !== preferred && _catHasData(WEATHER_ITEMS[i].categoryKey)) {
        return WEATHER_ITEMS[i];
      }
    }
    /* No weather adhkar in cache at all — hide the slide */
    return null;
  }

  /* ─────────────────────────────────────────────
     CARD 2 — AYAH OF THE DAY  (salt 1)
     Always available — no network needed.
  ───────────────────────────────────────────── */
  function _buildAyahItem() {
    var flat = _seededIdx(6236, 1);
    var rem  = flat, surah = 1, ayah = 1;
    for (var i = 0; i < SURAH_SIZES.length; i++) {
      if (rem < SURAH_SIZES[i]) { surah = i + 1; ayah = rem + 1; break; }
      rem -= SURAH_SIZES[i];
    }
    var surahName = SURAH_NAMES_AR[surah - 1] || SURAH_NAMES[surah - 1] || ('سورة ' + surah);
    var s = surah, a = ayah;
    return {
      _type: 'daily', id: 'ayah_day',
      icon: 'fas fa-book-quran', tag: 'ئایەتا ڕۆژێ',
      title: surahName, subtitle: 'ئایەت ' + ayah,
      nav: function() {
        if (window.App && App.tab && App.openSurah) {
          App.tab('quran');
          setTimeout(function() { App.openSurah(s, a); }, 300);
        }
      }
    };
  }

  /* ─────────────────────────────────────────────
     CARD 3 — HADITH OF THE DAY  (salt 2)
     Opens the exact seeded hadith in detail view.
     If data not yet cached: card is shown but opens
     hadith list — refreshes to exact on next _draw.
  ───────────────────────────────────────────── */
  function _buildHadithItem() {
    var hadiths = (function() {
      try {
        var raw = JSON.parse(localStorage.getItem('gencine_hadiths_v2'));
        return (raw && Array.isArray(raw.data)) ? raw.data : raw; /* unwrap {ts,data} envelope */
      } catch(e) { return null; }
    }());

    if (hadiths && hadiths.length) {
      var idx     = _seededIdx(hadiths.length, 2);
      var h       = hadiths[idx];
      var preview = (h.ku || h.ar || '').trim();
      if (preview.length > 55) preview = preview.slice(0, 55) + '\u2026';
      return {
        _type: 'daily', id: 'hadith_day',
        icon: 'fas fa-scroll', tag: 'حەدیسا ڕۆژێ',
        title:    h.title || preview,
        subtitle: h.source || 'پێغەمبەرێ ئیسلامێ \uFDFA',
        nav: function(ui) {
          if (!ui) return;
          ui._view = 'hadith'; ui._hadithSearch = ''; ui._hadithDetailIdx = idx; ui._draw();
        }
      };
    }

    /* Cache empty — placeholder, navigates to hadith list until data loads */
    return {
      _type: 'daily', id: 'hadith_day',
      icon: 'fas fa-scroll', tag: 'حەدیسا ڕۆژێ',
      title:    'حەدیسا ڕۆژێ',
      subtitle: 'دابەزێنا داتا...',
      nav: function(ui) {
        if (!ui) return;
        ui._view = 'hadith'; ui._hadithSearch = ''; ui._hadithDetailIdx = null; ui._draw();
      }
    };
  }

  /* ─────────────────────────────────────────────
     CARD 4 — BOOK OF THE DAY  (salt 4)
     Opens the exact seeded book directly.
     If data not yet cached: placeholder until data loads.
  ───────────────────────────────────────────── */
  function _buildBookItem() {
    var books = (function() {
      try {
        var raw = JSON.parse(localStorage.getItem('gencine_books_v3'));
        return (raw && Array.isArray(raw.data)) ? raw.data : raw; /* unwrap {ts,data} envelope */
      } catch(e) { return null; }
    }());

    if (books && books.length) {
      var b      = books[_seededIdx(books.length, 4)] || books[0];
      var bookId = b.id;
      return {
        _type: 'daily', id: 'book_day',
        icon: 'fas fa-book-open', tag: 'کتێبا ڕۆژێ',
        title:    b.title_ku || b.title_ar || 'کتێب',
        subtitle: b.author_ku || 'بخوێنە',
        nav: function(ui) { if (ui) ui.openBook(bookId); }
      };
    }

    /* Cache empty — placeholder until data loads */
    return {
      _type: 'daily', id: 'book_day',
      icon: 'fas fa-book-open', tag: 'کتێبا ڕۆژێ',
      title:    'کتێبا ڕۆژێ',
      subtitle: 'دابەزێنا داتا...',
      nav: function(ui) { if (ui) { ui._view = 'books'; ui._draw(); } }
    };
  }

  /* ─────────────────────────────────────────────
     getItemsNow — 4 or 5 items depending on weather data
  ───────────────────────────────────────────── */
  function getItemsNow() {
    var items = [
      { _type: 'adhkar', _adhkarItem: _getZikrItem() }    /* card 1: zikr    */
    ];
    /* card 2: weather dhikr — only added when data exists */
    var weatherItem = _getWeatherItem();
    if (weatherItem) {
      items.push({ _type: 'adhkar', _adhkarItem: weatherItem });
    }
    items.push(_buildAyahItem());                          /* card 3: ayah    */
    items.push(_buildHadithItem());                        /* card 4: hadith  */
    items.push(_buildBookItem());                          /* card 5: book    */
    return items;
  }

  /* ─────────────────────────────────────────────
     CARD BUILDERS
  ───────────────────────────────────────────── */
  function _mk(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls)  el.className   = cls;
    if (text) el.textContent = text;
    return el;
  }

  /* Read adhkar for a category from the localStorage cache */
  function _getAdhkarFromCache(catKey) {
    try {
      var raw = JSON.parse(localStorage.getItem('gencine_adhkar_v1'));
      var list = (raw && Array.isArray(raw.data)) ? raw.data : (Array.isArray(raw) ? raw : []);
      return list.filter(function(a) { return a.category_key === catKey && a.active !== false; });
    } catch(e) { return []; }
  }

  function _buildAdhkarCard(item, gencineUI) {
    var T = function(k, d) { var r = window.t ? window.t(k) : k; return (r && r !== k) ? r : (d || k); };
    var state  = _getState();
    var done   = state.completed.indexOf(item.id) >= 0;
    var streak = _getStreak(item.id);
    var isFriday = item.id === 'friday' || item.id === 'salawat';

    /* Load actual adhkar from cache so we can show a real preview */
    var adhkarList  = _getAdhkarFromCache(item.categoryKey);
    /* Pick one dhikr for the day using a separate salt (5) — same all day, changes daily */
    var featured    = adhkarList.length ? adhkarList[_seededIdx(adhkarList.length, 5)] : null;
    var totalCount  = adhkarList.length;

    /* Card — identical structure to _buildDailyCard so height is exactly the same */
    var cls = 'sd-card' + (done ? ' sd-card-done' : '') + (isFriday ? ' sd-card-friday' : '');
    var card = _mk('div', cls);

    /* icon */
    var iWrap = _mk('div', 'sd-icon');
    iWrap.appendChild(_mk('i', item.icon));
    card.appendChild(iWrap);

    /* content — same class as other cards */
    var content = _mk('div', 'sd-content');

    /* tag row: time tag + count badge inline */
    var tagWrap = document.createElement('div');
    if (item.timeTag) tagWrap.appendChild(_mk('span', 'sd-tag', item.timeTag));
    if (totalCount > 0) tagWrap.appendChild(_mk('span', 'sd-zikr-count', totalCount + ' ' + T('gencine.smart.zikr_count_label', 'زکر')));
    content.appendChild(tagWrap);

    /* title zone — same min-height as other cards */
    var titleZone = _mk('div', 'sd-title-zone');
    if (featured && featured.ar && !done) {
      var arEl  = _mk('div', 'sd-zikr-ar');
      var arTxt = featured.ar.replace(/\s+/g, ' ').trim();
      if (arTxt.length > 100) arTxt = arTxt.slice(0, 100) + '…';
      arEl.textContent = arTxt;
      titleZone.appendChild(arEl);
    } else {
      titleZone.appendChild(_mk('div', 'sd-title', T(item.labelKey, item.labelFallback)));
    }
    content.appendChild(titleZone);

    /* sub line — Kurdish label + badge + source, same as sd-sub on other cards */
    var subEl = _mk('div', 'sd-sub' + (done ? ' sd-sub-done' : ''));
    if (done) {
      subEl.textContent = T('gencine.smart.done_today', 'ئەمڕۆ تەواو بوو');
    } else if (streak.count >= 2) {
      subEl.textContent = streak.count + ' ' + T('gencine.smart.days_row', 'ڕۆژ پەی هەم 🔥');
    } else {
      var subParts = [T(item.labelKey, item.labelFallback)];
      if (featured && (featured.repeat || 1) > 1) subParts.push('× ' + featured.repeat);
      if (featured && featured.source)             subParts.push(featured.source);
      subEl.textContent = subParts.join('  ·  ');
    }
    content.appendChild(subEl);

    card.appendChild(content);

    card.addEventListener('click', function() {
      _markOpened(item.id);
      if (gencineUI) {
        gencineUI._adhkarCat  = item.categoryKey;
        gencineUI._adhkarView = 'list';
        gencineUI._view       = 'adhkar';
        gencineUI._draw();
      }
    });
    return card;
  }

  function _buildDailyCard(item, gencineUI) {
    var card    = _mk('div', 'sd-card');
    var iWrap   = _mk('div', 'sd-icon');
    iWrap.appendChild(_mk('i', item.icon));
    card.appendChild(iWrap);

    var content = _mk('div', 'sd-content');
    content.appendChild(_mk('span', 'sd-tag', item.tag));
    var titleZone = _mk('div', 'sd-title-zone');
    titleZone.appendChild(_mk('div', 'sd-title', item.title));
    content.appendChild(titleZone);
    content.appendChild(_mk('div', 'sd-sub', item.subtitle));
    card.appendChild(content);

    var arrow = _mk('div', 'sd-arrow');
    arrow.appendChild(_mk('i', 'fas fa-chevron-left'));
    card.appendChild(arrow);

    card.addEventListener('click', function() {
      _markOpened(item.id);
      item.nav(gencineUI);
    });
    return card;
  }

  function _buildCard(hybridItem, gencineUI) {
    if (hybridItem._type === 'adhkar')
      return _buildAdhkarCard(hybridItem._adhkarItem, gencineUI);
    return _buildDailyCard(hybridItem, gencineUI);
  }

  /* ─────────────────────────────────────────────
     SLIDER  v17

     DOM layout (after render() builds it):
       .sd-wrapper  (overflow:hidden, rectangular — NO border-radius for GPU perf)
         .sd-track  (display:flex ltr)
           [cs0]  clone of real first slide — at DOM pos 0
           [sN-1] real last slide
           [sN-2]
           ...
           [s0]   real first slide — at DOM pos N
           [csN-1] clone of real last slide — at DOM pos N+1
         .sd-progress  (position:absolute bottom:0 — sits flush at card base)
           .sd-bar
       .sd-dots

     RTL infinite loop:
       Slides are in REVERSED DOM order so that "forward" = translateX increases
       (track moves RIGHT), which feels natural in RTL (new card from left).
       Real first slide s0 sits at DOM pos N; translateX = -(N-current)*W.

       When advancing past last slide:
         animate to cs0 (pos 0, translateX=0) → transitionend → jump to s0 (translateX=-N*W)
       When going before first:
         animate to csN-1 (pos N+1, translateX=-(N+1)*W) → jump to sN-1 (translateX=-W)
       User never sees a jump — both clone and original are visually identical.

     Swipe — RTL semantics:
       Finger RIGHT (dx>0) → track follows right → reveals lower DOM index = next
       logical slide (current+1). Natural for RTL reading direction.
       Finger LEFT  (dx<0) → prev (current-1).

     Progress bar:
       position:absolute bottom:0 inside wrapper — rides the bottom edge of the card.
  ───────────────────────────────────────────── */
  function _initSlider(wrapper, track, dotsEl, count) {
    if (count <= 1) { dotsEl.style.display = 'none'; return; }

    var DURATION = 10000;
    var SNAP_MS  = 320;
    var SNAP_FN  = 'cubic-bezier(0.22,1,0.36,1)';
    var current  = 0;   /* logical index 0..count-1 */

    /* ── progress bar — inside sd-card-outer, clipped by its border-radius ── */
    var prog = _mk('div', 'sd-progress');
    var bar  = _mk('div', 'sd-bar');
    prog.appendChild(bar);
    wrapper.parentNode.appendChild(prog);   /* wrapper.parentNode = sd-card-outer */

    /* ── dots: RTL order (count-1 → 0) so dot[0] ends up rightmost ── */
    var dots = [];
    for (var i = count - 1; i >= 0; i--) {
      (function(idx) {
        var dot = _mk('span', 'sd-dot' + (idx === 0 ? ' sd-dot-active' : ''));
        dot.addEventListener('click', function() { _goTo(idx, true); });
        dotsEl.appendChild(dot);
        dots[idx] = dot;
      }(i));
    }

    function _alive() { return !!(document.body && document.body.contains(track)); }
    function _W()     { var w = wrapper.clientWidth || wrapper.offsetWidth; return w > 0 ? w : window.innerWidth - 32; }

    /* translateX for logical slide `cur`:
       s0 is at DOM pos `count` (after prepended clone).
       formula: -(count - cur) * W                          */
    function _posX(cur) { return -(count - cur) * _W(); }

    function _applyX(px, anim) {
      track.style.transition = anim ? 'transform ' + SNAP_MS + 'ms ' + SNAP_FN : 'none';
      track.style.transform  = 'translate3d(' + px + 'px,0,0)';
    }

    function _syncDots() {
      for (var j = 0; j < count; j++) dots[j].classList.remove('sd-dot-active');
      dots[current].classList.add('sd-dot-active');
    }

    /* Pending transitionend handler for silent teleport after infinite wrap */
    var _teleportFn = null;
    function _cancelTeleport() {
      if (_teleportFn) {
        track.removeEventListener('transitionend', _teleportFn);
        _teleportFn = null;
      }
    }

    function _goTo(idx, anim) {
      _cancelTeleport();
      var dest, teleportX, isWrap = false;

      if (idx >= count) {
        /* forward wrap: animate to clone-of-first (DOM pos 0, translateX=0) */
        dest      = 0;
        teleportX = _posX(0);   /* = -count*W, real s0 */
        current   = 0;
        isWrap    = true;
      } else if (idx < 0) {
        /* backward wrap: animate to clone-of-last (DOM pos count+1) */
        dest      = -(count + 1) * _W();
        teleportX = _posX(count - 1);   /* = -W, real sN-1 */
        current   = count - 1;
        isWrap    = true;
      } else {
        current = idx;
        dest    = _posX(current);
      }

      _syncDots();
      _applyX(dest, anim !== false);

      /* After animation reaches clone, instantly jump to the real slide.
         transitionend fires once per property — guard with _cancelTeleport. */
      if (isWrap && anim !== false) {
        var tX = teleportX;
        _teleportFn = function() {
          _cancelTeleport();
          _applyX(tX, false);
        };
        track.addEventListener('transitionend', _teleportFn);
      }

      _resetProg();
    }

    /* ── RAF progress ── */
    var _raf = null, _tStart = 0, _accum = 0, _paused = false;

    function _resetProg() {
      _accum = 0; _paused = false;
      bar.style.transition = 'none';
      bar.style.transform  = 'scaleX(0)';
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
      _tStart = performance.now();
      _raf = requestAnimationFrame(_tick);
    }

    function _pauseProg() {
      if (_paused) return;
      _paused = true;
      _accum += performance.now() - _tStart;
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    }

    function _resumeProg() {
      if (!_paused) return;
      _paused = false;
      _tStart = performance.now();
      _raf = requestAnimationFrame(_tick);
    }

    function _tick() {
      if (_paused || !_alive()) return;
      var pct = Math.min((_accum + performance.now() - _tStart) / DURATION, 1);
      bar.style.transform = 'scaleX(' + pct + ')';
      if (pct >= 1) { _goTo(current + 1, true); return; }
      _raf = requestAnimationFrame(_tick);
    }

    /* Read the ACTUAL visual X of the track mid-animation (for touch-interrupt) */
    function _readX() {
      var t = window.getComputedStyle(track).transform;
      if (!t || t === 'none') return _posX(0);
      var m = t.match(/matrix.*\((.+)\)/);
      return m ? (parseFloat(m[1].split(',')[4]) || _posX(0)) : _posX(0);
    }

    /* ── swipe ── */
    var _drag = false, _sx = 0, _sy = 0, _baseX = 0;
    var _decided = false, _horiz = false;
    var INTENT = 5;
    var _vx = 0, _vtLast = 0, _xLast = 0;

    /* ── swipe — non-passive so we can preventDefault vertical scroll ── */
    track.addEventListener('touchstart', function(e) {
      _cancelTeleport();
      var actualX = _readX();
      _drag = true; _decided = false; _horiz = false;
      _sx = e.touches[0].clientX; _sy = e.touches[0].clientY;
      _baseX = actualX;
      _vx = 0; _vtLast = performance.now(); _xLast = _sx;
      track.style.transition = 'none';
      track.style.transform  = 'translate3d(' + actualX + 'px,0,0)';
      _pauseProg();
    }, { passive: false });

    track.addEventListener('touchmove', function(e) {
      if (!_drag) return;
      var cx = e.touches[0].clientX, cy = e.touches[0].clientY;
      var dx = cx - _sx, dy = cy - _sy;
      if (!_decided) {
        if (Math.abs(dx) < INTENT && Math.abs(dy) < INTENT) return;
        _decided = true;
        _horiz   = Math.abs(dx) >= Math.abs(dy);
        if (!_horiz) { _drag = false; _resumeProg(); return; }
      }
      if (!_horiz) return;
      /* Block page scroll while dragging horizontally */
      e.preventDefault();
      var now = performance.now(), dt = now - _vtLast;
      if (dt > 0) { _vx = (cx - _xLast) / dt; }
      _vtLast = now; _xLast = cx;
      /* Clamp: clone-of-first at right (translateX=0), clone-of-last at left */
      var W = _W(), raw = _baseX + dx;
      var min = -(count + 1) * W, max = 0;
      var clamped = raw > max ? max + (raw - max) * 0.25
                  : raw < min ? min + (raw - min) * 0.25
                  : raw;
      track.style.transform = 'translate3d(' + clamped + 'px,0,0)';
    }, { passive: false });

    function _onEnd(e) {
      if (!_drag) return; _drag = false;
      var endX    = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : _sx;
      var delta   = endX - _sx;
      var W       = _W();
      var vxFresh = (performance.now() - _vtLast) < 80 ? _vx : 0;
      var flick   = Math.abs(vxFresh) > 0.3;
      if (flick || Math.abs(delta) > W * 0.18) {
        /* RTL: swipe right (delta>0 / vx>0) = next (+1), swipe left = prev (-1) */
        var dir = (vxFresh !== 0) ? (vxFresh > 0 ? 1 : -1) : (delta > 0 ? 1 : -1);
        _goTo(current + dir, true);
      } else {
        _goTo(current, true);
      }
    }
    track.addEventListener('touchend',    _onEnd, { passive: false });
    track.addEventListener('touchcancel', _onEnd, { passive: false });

    function _onVis() {
      if (!_alive()) { document.removeEventListener('visibilitychange', _onVis); return; }
      document.hidden ? _pauseProg() : _resumeProg();
    }
    document.addEventListener('visibilitychange', _onVis);

    /* ── start at real first slide (DOM pos count, translateX = -count*W) ── */
    _applyX(_posX(0), false);
    _syncDots();
    _resetProg();
  }

  /* ─────────────────────────────────────────────
     DAILY REFRESH COUNTDOWN
     Pure HH:MM:SS timer above the card.
     No label, no icon — just the time remaining
     until Baghdad midnight, updated every second.
  ───────────────────────────────────────────── */
  function _buildCountdown() {
    var chip    = _mk('span', 'sd-chip');
    var lbl     = _mk('span', 'sd-chip-lbl', 'تا نوێکردنەوە:');
    var timeEl  = _mk('span', 'sd-chip-time');
    chip.appendChild(lbl);
    chip.appendChild(timeEl);

    function _msUntilBaghdadMidnight() {
      var d = _baghdadDate();
      var nextMidnightUTC =
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
        - _BAGHDAD_OFFSET_MS;
      return nextMidnightUTC - Date.now();
    }

    function _fmt(ms) {
      var total = Math.max(0, Math.floor(ms / 1000));
      var h = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      return String(h).padStart(2, '0') + ':'
           + String(m).padStart(2, '0') + ':'
           + String(s).padStart(2, '0');
    }

    function _update() {
      timeEl.textContent = _fmt(_msUntilBaghdadMidnight());
    }

    _update();
    var _tid = setInterval(_update, 1000);

    return chip;
  }

  /* ─────────────────────────────────────────────
     SKELETON  — shown while section is loading.
     Mirrors real card geometry so the transition
     from skeleton → real is seamless.
  ───────────────────────────────────────────── */
  function _buildSkelSection() {
    var section = _mk('div', 'sd-section');

    /* header row skeleton */
    var hdr = _mk('div', 'sd-hdr');
    hdr.appendChild(_mk('span', 'sd-hdr-label', '\u200b')); /* zero-width to hold height */
    section.appendChild(hdr);

    /* one skeleton card (matches slider height) */
    var wrapper = _mk('div', 'sd-wrapper');
    var card    = _mk('div', 'sd-skel-card');
    card.appendChild(_mk('div', 'sd-skel-icon skel-block'));
    var body = _mk('div', 'sd-skel-body');
    body.appendChild(_mk('div', 'sd-skel-tag skel-block'));
    body.appendChild(_mk('div', 'sd-skel-title skel-block'));
    body.appendChild(_mk('div', 'sd-skel-sub skel-block'));
    card.appendChild(body);
    wrapper.appendChild(card);
    var outer = _mk('div', 'sd-card-outer');
    outer.appendChild(wrapper);
    section.appendChild(outer);

    /* dots skeleton */
    var dotsEl = _mk('div', 'sd-dots');
    for (var i = 0; i < 4; i++) dotsEl.appendChild(_mk('span', 'sd-dot' + (i === 0 ? ' sd-dot-active' : '')));
    section.appendChild(dotsEl);

    return section;
  }

  /* ─────────────────────────────────────────────
     SECTION CACHE
     One section element per Baghdad day.
     Returning the same DOM node on pull-to-refresh
     preserves slider position + timer — no visual reset.
  ───────────────────────────────────────────── */
  var _sectionCache = { el: null, seed: null, hasData: false };

  /* ─────────────────────────────────────────────
     RENDER
     Returns section element.
     Same Baghdad day → returns cached element so
     pull-to-refresh does not reset the slider.
     New day or first call → builds fresh.
  ───────────────────────────────────────────── */
  function render(gencineUI) {
    var seed    = _daySeed();
    var hasData = !!(localStorage.getItem('gencine_hadiths_v2') &&
                     localStorage.getItem('gencine_books_v3'));
    /* Cache hit: same day AND (data was already full OR still no data).
       Only rebuild mid-day if cache was built with placeholders but real
       data has now loaded — this is what makes hadith/book show real content. */
    if (_sectionCache.el && _sectionCache.seed === seed) {
      if (_sectionCache.hasData || !hasData) return _sectionCache.el;
      /* fall through: cache had placeholders, data just arrived → rebuild */
    }

    var items = getItemsNow();  /* always 4 */
    try {
      console.log('[SmartDhikr]', items.length, 'cards →',
        items.map(function(i) {
          return i._type === 'adhkar' ? 'zikr' : (i.id || i._type);
        }).join(', '));
    } catch(e) {}

    var T       = window.t || function(k, d) { return d || k; };
    var section = _mk('div', 'sd-section sd-enter');

    /* header row — RTL flex: title on right, countdown chip on left */
    var hdr = _mk('div', 'sd-hdr');
    hdr.appendChild(_mk('span', 'sd-hdr-label', T('gencine.smart.section_title', 'یادکرینا ڕۆژانە')));
    hdr.appendChild(_buildCountdown());
    section.appendChild(hdr);

    /* wrapper + track */
    var wrapper = _mk('div', 'sd-wrapper');
    var track   = _mk('div', 'sd-track');

    items.forEach(function(item) {
      var slide = _mk('div', 'sd-slide');
      slide.appendChild(_buildCard(item, gencineUI));
      track.appendChild(slide);
    });

    /* ── Reverse slide order for RTL (forward = track moves RIGHT) ──
       DOM before: [s0][s1][s2][s3]
       DOM after:  [s3][s2][s1][s0]
       Appending an existing node moves it to the end — no innerHTML needed. */
    var slides = Array.prototype.slice.call(track.children);
    slides.reverse();
    slides.forEach(function(s) { track.appendChild(s); });

    /* ── Clone first + last for infinite loop ──────────────────────
       Prepend clone of s0 (shown when wrapping forward past last slide).
       Append  clone of sN-1 (shown when wrapping backward past first).
       Result: [cs0][sN-1]...[s1][s0][csN-1]
       cloneNode(true) copies DOM structure; event listeners are NOT copied
       (fine — clones are visible for only ~320ms during the wrap anim).   */
    var cs0  = track.lastChild.cloneNode(true);   /* clone of s0  */
    var csLast = track.firstChild.cloneNode(true); /* clone of sN-1 */
    track.insertBefore(cs0, track.firstChild);
    track.appendChild(csLast);

    wrapper.appendChild(track);
    /* sd-card-outer clips progress bar to card radius — progress appended here by _initSlider */
    var outer = _mk('div', 'sd-card-outer');
    outer.appendChild(wrapper);
    section.appendChild(outer);

    /* dots — outside card shell so they sit below it */
    var dotsEl = _mk('div', 'sd-dots');
    section.appendChild(dotsEl);

    /* double-RAF: guarantees wrapper is in DOM + layout committed */
    var _done = false;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (_done) return; _done = true;
        _initSlider(wrapper, track, dotsEl, items.length);
      });
    });

    _sectionCache.el      = section;
    _sectionCache.seed    = seed;
    _sectionCache.hasData = hasData;
    return section;
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  window.SmartDhikr = {
    getItemsNow:      getItemsNow,
    markOpened:       _markOpened,
    markCompleted:    _markCompleted,
    getStreak:        _getStreak,
    render:           render,
    buildSkelSection: _buildSkelSection
  };

}(window));
