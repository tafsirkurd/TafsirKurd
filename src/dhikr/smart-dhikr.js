/**
 * Smart Daily Companion  v30
 * Always exactly 4 cards:
 *   1. Zikr of current time   (time-aware, always present via fallback)
 *   2. Ayah of the day        (Baghdad-seeded, salt 1)
 *   3. Hadith of the day      (Baghdad-seeded, salt 2)
 *   4. Book of the day        (Baghdad-seeded, salt 4)
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
    {
      id: 'morning', categoryKey: 'morning', icon: 'fas fa-sun',
      labelKey: 'adhkar.morning', labelFallback: 'زکرێن بەیانیکردن',
      subtitleKey: 'gencine.smart.morning_hint', subtitleFallback: 'ڕۆژا خوه ب زکرێ دەستپێکە',
      timeTag: 'بەیانیکردن',
      timeWindow: { start: 'Fajr', end: 'Dhuhr', fs: 5*60, fe: 11*60+30, wraps: false }
    },
    {
      id: 'waking', categoryKey: 'waking', icon: 'fas fa-cloud-sun',
      labelKey: 'adhkar.waking', labelFallback: 'دوای هاتنا خوو',
      subtitleKey: 'gencine.smart.waking_hint', subtitleFallback: 'دوای هاتنا خووێ بخوێنە',
      timeTag: 'بەیانیکردن',
      timeWindow: { start: 'Fajr', end: 'Sunrise', fs: 5*60, fe: 8*60, wraps: false }
    },
    {
      id: 'evening', categoryKey: 'evening', icon: 'fas fa-moon',
      labelKey: 'adhkar.evening', labelFallback: 'زکرێن ئێواربوون',
      subtitleKey: 'gencine.smart.evening_hint', subtitleFallback: 'ئێوارا خوە ب زکرێ بکە',
      timeTag: 'ئێواربوون',
      timeWindow: { start: 'Asr', end: 'Isha', fs: 15*60+30, fe: 21*60, wraps: false }
    },
    {
      id: 'sleep', categoryKey: 'sleep', icon: 'fas fa-bed',
      labelKey: 'adhkar.sleep', labelFallback: 'دوای خەوکردن',
      subtitleKey: 'gencine.smart.sleep_hint', subtitleFallback: 'پێش خەوکردنێ بخوێنە',
      timeTag: 'شەو',
      timeWindow: { start: 'Isha', end: 'Fajr', fs: 21*60, fe: 5*60, wraps: true }
    },
    {
      id: 'friday', categoryKey: 'friday', icon: 'fas fa-calendar-day',
      labelKey: 'adhkar.friday', labelFallback: 'ڕۆژا ئینانێ',
      subtitleKey: 'gencine.smart.friday_hint', subtitleFallback: 'ڕۆژا ئینانێ ئەمڕۆ یە',
      timeTag: 'ئینانی',
      dayBoostDays: [5]
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'سەلاوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'سەلاواتێ بکە سەر پێغەمبەر \uFDFA',
      timeTag: null,
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
      timeTag: 'ئیفتار', basePriority: 80,
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

    /* ── Rain (Duhok area) ── */
    {
      id: 'rain', categoryKey: 'rain', icon: 'fas fa-cloud-rain',
      labelKey: 'adhkar.rain', labelFallback: 'کاتی باران',
      subtitleKey: 'gencine.smart.rain_hint', subtitleFallback: 'باران دکەت — دوعا بکە',
      timeTag: 'باران', basePriority: 55,
      rainCond: true
    }
  ];

  /* Fallback pool used when no time window is active.
     Picked by daily seed so it stays fixed all day.    */
  var FALLBACK_ZIKR = [
    {
      id: 'after_prayer', categoryKey: 'after_prayer', icon: 'fas fa-hands-praying',
      labelKey: 'adhkar.after_prayer', labelFallback: 'دوای نوێژ',
      subtitleKey: 'gencine.smart.after_prayer_hint', subtitleFallback: 'زکرێن دوای نوێژکردن',
      timeTag: null
    },
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
     RAIN DETECTION  (Duhok area, cached 1 h)
     Open-Meteo — no API key required.
  ───────────────────────────────────────────── */
  var _RAIN_KEY = 'sd_rain_v1';
  var _RAIN_TTL = 60 * 60 * 1000;

  function _isRaining() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return !!c.raining;
    } catch(e) {}
    return false;
  }

  function _fetchRain() {
    try {
      var c = JSON.parse(localStorage.getItem(_RAIN_KEY));
      if (c && (Date.now() - c.ts) < _RAIN_TTL) return; /* cache fresh */
    } catch(e) {}
    fetch('https://api.open-meteo.com/v1/forecast?latitude=36.87&longitude=42.95&current=precipitation,weather_code&timezone=Asia%2FBaghdad')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var cur  = data.current || {};
        var prec = cur.precipitation || 0;
        var code = cur.weather_code  || 0;
        /* weather codes: 51-67 drizzle/rain, 80-82 showers, 95-99 thunderstorm */
        var raining = prec > 0 || (code >= 51 && code <= 99);
        try { localStorage.setItem(_RAIN_KEY, JSON.stringify({ts: Date.now(), raining: raining})); } catch(e2) {}
      }).catch(function() {});
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

    /* Time window found — use highest-priority active item */
    if (active.length) return active[0].item;

    /* No time window active — use daily-seeded fallback (salt 3) */
    return FALLBACK_ZIKR[_seededIdx(FALLBACK_ZIKR.length, 3)];
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
     getItemsNow — ALWAYS exactly 4 items, fixed order
  ───────────────────────────────────────────── */
  function getItemsNow() {
    return [
      { _type: 'adhkar', _adhkarItem: _getZikrItem() },   /* card 1: zikr    */
      _buildAyahItem(),                                    /* card 2: ayah    */
      _buildHadithItem(),                                  /* card 3: hadith  */
      _buildBookItem()                                     /* card 4: book    */
    ];
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
    var T      = window.t || function(k, d) { return d || k; };
    var state  = _getState();
    var done   = state.completed.indexOf(item.id) >= 0;
    var streak = _getStreak(item.id);
    var isFriday = item.id === 'friday' || item.id === 'salawat';

    /* Load actual adhkar from cache so we can show a real preview */
    var adhkarList  = _getAdhkarFromCache(item.categoryKey);
    /* Pick one dhikr for the day using a separate salt (5) — same all day, changes daily */
    var featured    = adhkarList.length ? adhkarList[_seededIdx(adhkarList.length, 5)] : null;
    var totalCount  = adhkarList.length;

    /* Card root — same flex-row layout as other cards */
    var cls = 'sd-card sd-card-zikr' + (done ? ' sd-card-done' : '') + (isFriday ? ' sd-card-friday' : '');
    var card = _mk('div', cls);

    /* icon */
    var iWrap = _mk('div', 'sd-icon');
    iWrap.appendChild(_mk('i', item.icon));
    card.appendChild(iWrap);

    /* body — same as sd-content on other cards */
    var body = _mk('div', 'sd-zikr-body');

    /* tag row: time tag + count badge */
    var tagRow = _mk('div', '');
    if (item.timeTag) tagRow.appendChild(_mk('span', 'sd-tag', item.timeTag));
    if (totalCount > 0) tagRow.appendChild(_mk('span', 'sd-zikr-count', totalCount + ' ' + T('gencine.smart.zikr_count_label', 'زکر')));
    body.appendChild(tagRow);

    /* Arabic text preview (hidden when done) */
    if (featured && featured.ar && !done) {
      var arEl  = _mk('div', 'sd-zikr-ar');
      var arTxt = featured.ar.replace(/\s+/g, ' ').trim();
      if (arTxt.length > 110) arTxt = arTxt.slice(0, 110) + '…';
      arEl.textContent = arTxt;
      body.appendChild(arEl);
    } else if (done) {
      body.appendChild(_mk('div', 'sd-title', T(item.labelKey, item.labelFallback)));
    }

    /* footer: Kurdish label + badge + source */
    var footer = _mk('div', 'sd-zikr-footer');
    footer.appendChild(_mk('span', 'sd-zikr-title', T(item.labelKey, item.labelFallback)));

    var badge;
    if (done) {
      badge = _mk('span', 'sd-zikr-badge sd-zikr-badge-done', T('gencine.smart.done_today', 'ئەمڕۆ ✓'));
    } else if (streak.count >= 2) {
      badge = _mk('span', 'sd-zikr-badge sd-zikr-badge-streak', streak.count + ' ' + T('gencine.smart.days_row', 'ڕۆژ 🔥'));
    } else if (featured && (featured.repeat || 1) > 1) {
      badge = _mk('span', 'sd-zikr-badge sd-zikr-badge-repeat', '× ' + featured.repeat);
    }
    if (badge) footer.appendChild(badge);
    if (featured && featured.source && !done) footer.appendChild(_mk('span', 'sd-zikr-source', featured.source));
    body.appendChild(footer);

    card.appendChild(body);

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
    }, { passive: true });

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
    }, { passive: true });

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
    track.addEventListener('touchend',    _onEnd, { passive: true });
    track.addEventListener('touchcancel', _onEnd, { passive: true });

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
