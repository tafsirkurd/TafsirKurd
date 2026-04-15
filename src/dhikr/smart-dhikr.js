/**
 * Smart Daily Companion — TafsirKurd
 * Always 4 cards in fixed order:
 *   1. Ayah of the day (Quran verse — opens tafsir)
 *   2. Hadith of the day
 *   3. Zceer — time-smart adhkar (right adhkar for the current time)
 *   4. Book of the day
 *
 * Daily content (dua/hadith/book) is seeded by date — same all day, fresh tomorrow.
 * Zceer slot is time-aware: morning/evening/sleep/friday/salawat or random fallback.
 */
(function(window) {
  'use strict';

  /* ══════════════════════════════════════════════
     ADHKAR TIME ITEMS
  ══════════════════════════════════════════════ */
  var TIME_ITEMS = [
    {
      id: 'morning', categoryKey: 'morning', icon: 'fas fa-sun',
      labelKey: 'adhkar.morning', labelFallback: 'زکرێن بەیانیکردن',
      subtitleKey: 'gencine.smart.morning_hint', subtitleFallback: 'ڕۆژا خوه ب زکرێ دەستپێکە',
      timeTag: 'بەیانیکردن', basePriority: 80,
      timeWindow: { start:'Fajr',  end:'Dhuhr',   fs:5*60,      fe:11*60+30, wraps:false }
    },
    {
      id: 'waking', categoryKey: 'waking', icon: 'fas fa-cloud-sun',
      labelKey: 'adhkar.waking', labelFallback: 'دوای هاتنا خوو',
      subtitleKey: 'gencine.smart.waking_hint', subtitleFallback: 'دوای هاتنا خووێ بخوێنە',
      timeTag: 'بەیانیکردن', basePriority: 55,
      timeWindow: { start:'Fajr',  end:'Sunrise',  fs:5*60,      fe:8*60,     wraps:false }
    },
    {
      id: 'evening', categoryKey: 'evening', icon: 'fas fa-moon',
      labelKey: 'adhkar.evening', labelFallback: 'زکرێن ئێواربوون',
      subtitleKey: 'gencine.smart.evening_hint', subtitleFallback: 'ئێوارا خوە ب زکرێ بکە',
      timeTag: 'ئێواربوون', basePriority: 80,
      timeWindow: { start:'Asr',   end:'Isha',    fs:15*60+30,  fe:21*60,    wraps:false }
    },
    {
      id: 'sleep', categoryKey: 'sleep', icon: 'fas fa-bed',
      labelKey: 'adhkar.sleep', labelFallback: 'دوای خەوکردن',
      subtitleKey: 'gencine.smart.sleep_hint', subtitleFallback: 'پێش خەوکردنێ بخوێنە',
      timeTag: 'شەو', basePriority: 75,
      timeWindow: { start:'Isha',  end:'Fajr',    fs:21*60,     fe:5*60,     wraps:true  }
    },
    {
      id: 'friday', categoryKey: 'friday', icon: 'fas fa-calendar-day',
      labelKey: 'adhkar.friday', labelFallback: 'ڕۆژا ئینانێ',
      subtitleKey: 'gencine.smart.friday_hint', subtitleFallback: 'ڕۆژا ئینانێ ئەمڕۆ یە',
      timeTag: 'ئینانی', basePriority: 80,
      dayBoostDays: [5]                          /* only on Friday */
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'سەلاوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'سەلاواتێ بکە سەر پێغەمبەر ﷺ',
      timeTag: null, basePriority: 75,
      dayBoostDays: [5],                         /* Friday */
      thursdayNightBoost: true                   /* Thursday after Maghrib */
    }
  ];

  /* ══════════════════════════════════════════════
     SURAH REFERENCE DATA
  ══════════════════════════════════════════════ */
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
  var SURAH_SIZES = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
    59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,
    52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,
    11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
  ];

  /* ══════════════════════════════════════════════
     TIME HELPERS
  ══════════════════════════════════════════════ */
  function _toMinutes(hhmm) {
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

  /* Is `cur` (minutes since midnight) in [s, e)?
     wraps=true handles windows that cross midnight (e.g. 21:00–05:00) */
  function _inRange(cur, s, e, wraps) {
    if (s < 0 || e < 0) return false;
    return wraps ? (cur >= s || cur < e) : (cur >= s && cur < e);
  }

  function _daySeed() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function _seededIdx(length, salt) {
    if (!length) return 0;
    return Math.abs(_daySeed() * 31 + salt * 7919) % length;
  }

  /* ══════════════════════════════════════════════
     PRAYER TIMES  (reads the cache the prayer tab fills)
  ══════════════════════════════════════════════ */
  function _getPrayerTimings() {
    try {
      var city   = localStorage.getItem('prayerCity')   || 'Duhok';
      var method = parseInt(localStorage.getItem('prayerMethod') || '13', 10);
      var today  = new Date();
      var dayNum = String(today.getDate());
      var mk = 'prayer-kurd2:' + city + ':' + today.getFullYear() + ':' + (today.getMonth() + 1);
      var monthly = JSON.parse(localStorage.getItem(mk));
      if (monthly && monthly.days && monthly.days[dayNum] && monthly.days[dayNum].Fajr) return monthly.days[dayNum];
      var dk = 'prayer3:' + city + ':' + method + ':' + _todayISO();
      var daily = JSON.parse(localStorage.getItem(dk));
      if (daily && daily.timings && daily.timings.Fajr) return daily.timings;
    } catch(e) {}
    return null;
  }

  /* ══════════════════════════════════════════════
     STATE  (today's opens + completions)
  ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     STREAKS
  ══════════════════════════════════════════════ */
  function _getStreak(id) {
    try { return JSON.parse(localStorage.getItem('sd_streak_' + id)) || { count:0, lastDate:null }; }
    catch(e) { return { count:0, lastDate:null }; }
  }

  function _updateStreak(id) {
    var streak = _getStreak(id);
    var today  = _todayISO();
    if (streak.lastDate === today) return streak;
    var prev = new Date(Date.now() - 86400000);
    var yest = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0') + '-' + String(prev.getDate()).padStart(2, '0');
    streak.count    = (streak.lastDate === yest) ? streak.count + 1 : 1;
    streak.lastDate = today;
    try { localStorage.setItem('sd_streak_' + id, JSON.stringify(streak)); } catch(e) {}
    return streak;
  }

  /* ══════════════════════════════════════════════
     CATEGORY DATA CHECK
  ══════════════════════════════════════════════ */
  function _catHasData(catKey) {
    try {
      var cached = JSON.parse(localStorage.getItem('gencine_adhkar_v1'));
      if (!cached || !Array.isArray(cached)) return true;
      return cached.some(function(a) { return a.category_key === catKey && a.active !== false; });
    } catch(e) { return true; }
  }

  /* ══════════════════════════════════════════════
     TIME ITEM SELECTION
     An item is "active" only if it is genuinely
     inside its time window or day condition right now.
     Generic items (after_prayer etc.) are excluded —
     they are not time-specific so they never appear here.
  ══════════════════════════════════════════════ */
  function _isTimeActive(item, nowMin, dow, prayers, maghribMin) {
    /* Time-window items */
    if (item.timeWindow) {
      var tw = item.timeWindow;
      var ts = (prayers && _toMinutes(prayers[tw.start]) >= 0) ? _toMinutes(prayers[tw.start]) : tw.fs;
      var te = (prayers && _toMinutes(prayers[tw.end])   >= 0) ? _toMinutes(prayers[tw.end])   : tw.fe;
      return _inRange(nowMin, ts, te, tw.wraps);
    }
    /* Friday items */
    if (item.dayBoostDays && item.dayBoostDays.indexOf(dow) >= 0) return true;
    /* Thursday night salawat */
    if (item.thursdayNightBoost && dow === 4 && nowMin >= maghribMin) return true;
    return false;
  }

  function _scoreTimeItem(item, state) {
    var s = item.basePriority;
    if (state.completed.indexOf(item.id) >= 0) s -= 60;
    if (state.opened.indexOf(item.id)    >= 0) s -= 15;
    return s;
  }

  /* Non-time-specific adhkar shown as a daily-seeded fallback
     when no time window is currently active.                    */
  var FALLBACK_ITEMS = [
    {
      id: 'after_prayer', categoryKey: 'after_prayer', icon: 'fas fa-hands-praying',
      labelKey: 'adhkar.after_prayer', labelFallback: 'دوای نوێژ',
      subtitleKey: 'gencine.smart.after_prayer_hint', subtitleFallback: 'زکرێن دوای نوێژکردن',
      timeTag: null, basePriority: 42
    },
    {
      id: 'forgiveness', categoryKey: 'forgiveness', icon: 'fas fa-dove',
      labelKey: 'adhkar.forgiveness', labelFallback: 'داواکاری لێبوردن',
      subtitleKey: 'gencine.smart.forgiveness_hint', subtitleFallback: 'ئیستیخفارەکە زیادە بکە',
      timeTag: null, basePriority: 40
    },
    {
      id: 'protection', categoryKey: 'protection', icon: 'fas fa-shield-halved',
      labelKey: 'adhkar.protection', labelFallback: 'پاراستن',
      subtitleKey: 'gencine.smart.protection_hint', subtitleFallback: 'زکرێن پاراستن و حەمایەتێ',
      timeTag: null, basePriority: 38
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'سەلاوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'سەلاواتێ بکە سەر پێغەمبەر ﷺ',
      timeTag: null, basePriority: 45
    }
  ];

  /* Returns up to 2 currently time-active adhkar (highest priority first).
     Falls back to 1 seeded-random adhkar when nothing is time-active.     */
  function _getTimeItems() {
    var now        = new Date();
    var nowMin     = now.getHours() * 60 + now.getMinutes();
    var dow        = now.getDay();
    var prayers    = _getPrayerTimings();
    var maghribMin = (prayers && _toMinutes(prayers.Maghrib) >= 0) ? _toMinutes(prayers.Maghrib) : 18 * 60;
    var state      = _getState();

    var active = TIME_ITEMS
      .filter(function(item) {
        return _catHasData(item.categoryKey) && _isTimeActive(item, nowMin, dow, prayers, maghribMin);
      })
      .map(function(item) {
        return { item: item, score: _scoreTimeItem(item, state) };
      })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, 2)
      .map(function(x) { return x.item; });

    /* No active time window → pick 1 random adhkar seeded by today */
    if (!active.length) {
      var pool = FALLBACK_ITEMS.filter(function(item) { return _catHasData(item.categoryKey); });
      if (pool.length) active = [ pool[_seededIdx(pool.length, 9)] ];
    }

    return active;
  }

  /* ══════════════════════════════════════════════
     DAILY ITEMS SYSTEM
     Each type is seeded independently — same pick all
     day, different pick tomorrow.
  ══════════════════════════════════════════════ */
  function _readCache(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
  }

  /* ── Slot 1: Ayah of the day ── */
  function _buildAyahItem() {
    var flat = _seededIdx(6236, 1);
    var rem  = flat, surah = 1, ayah = 1;
    for (var i = 0; i < SURAH_SIZES.length; i++) {
      if (rem < SURAH_SIZES[i]) { surah = i + 1; ayah = rem + 1; break; }
      rem -= SURAH_SIZES[i];
    }
    var surahName = SURAH_NAMES[surah - 1] || ('سورە ' + surah);
    var s = surah, a = ayah;
    return {
      _type:'daily', id:'ayah_day', icon:'fas fa-book-quran', tag:'ئایەتا ڕۆژێ',
      title:    surahName,
      subtitle: 'ئایەت ' + ayah,
      nav: function() {
        if (window.App && App.tab && App.openSurah) {
          App.tab('quran');
          setTimeout(function() { App.openSurah(s, a); }, 300);
        }
      }
    };
  }

  /* ── Slot 2: Hadith of the day ── */
  function _buildHadithItem() {
    var hadiths = _readCache('gencine_hadiths_v2');
    /* Fallback when cache not yet loaded */
    if (!hadiths || !hadiths.length) {
      return {
        _type:'daily', id:'hadith_day', icon:'fas fa-scroll', tag:'حەدیسا ڕۆژێ',
        title: 'حەدیسێن پێغەمبەرێ \uFDFA',
        subtitle: 'بخوێنە',
        nav: function(gencineUI) {
          if (!gencineUI) return;
          gencineUI._view = 'hadith';
          gencineUI._hadithSearch = '';
          gencineUI._hadithDetailIdx = null;
          gencineUI._draw();
        }
      };
    }
    var idx = _seededIdx(hadiths.length, 2);
    var h   = hadiths[idx];
    var preview = (h.ku || h.ar || '').trim();
    if (preview.length > 55) preview = preview.slice(0, 55) + '\u2026';
    return {
      _type:'daily', id:'hadith_day', icon:'fas fa-scroll', tag:'حەدیسا ڕۆژێ',
      title:    h.title || preview,
      subtitle: h.source || 'پێغەمبەرێ ئیسلامێ \uFDFA',
      nav: function(gencineUI) {
        if (!gencineUI) return;
        gencineUI._view            = 'hadith';
        gencineUI._hadithSearch    = '';
        gencineUI._hadithDetailIdx = idx;
        gencineUI._draw();
      }
    };
  }

  /* ── Slot 4: Book of the day ── */
  function _buildBookItem() {
    var books = _readCache('gencine_books_v3');
    /* Fallback when cache not yet loaded */
    if (!books || !books.length) {
      return {
        _type:'daily', id:'book_day', icon:'fas fa-book-open', tag:'کتێبا ڕۆژێ',
        title: 'کتێبێن ئیسلامی',
        subtitle: 'بخوێنە',
        nav: function(gencineUI) {
          if (!gencineUI) return;
          gencineUI._view = 'books';
          gencineUI._draw();
        }
      };
    }
    var b = books[_seededIdx(books.length, 4)];
    if (!b) b = books[0];
    return {
      _type:'daily', id:'book_day', icon:'fas fa-book-open', tag:'کتێبا ڕۆژێ',
      title:    b.title_ku || b.title_ar || 'کتێب',
      subtitle: b.author_ku || 'بخوێنە',
      nav: function(gencineUI) {
        if (!gencineUI) return;
        gencineUI._view = 'books';
        gencineUI._draw();
      }
    };
  }

  /* ══════════════════════════════════════════════
     FIXED SLOT ORDER — always 4 cards:
       1. Ayah of the day
       2. Hadith of the day
       3. Zceer (time-smart adhkar)
       4. Book of the day
  ══════════════════════════════════════════════ */
  function getItemsNow() {
    var result = [];

    /* Slot 1 — Ayah of the day */
    try { var ay = _buildAyahItem(); if (ay) result.push(ay); } catch(e) {}

    /* Slot 2 — Hadith */
    try { var h = _buildHadithItem(); if (h) result.push(h);    } catch(e) {}

    /* Slot 3 — Zceer (time-aware, always guaranteed) */
    var timeItems = _getTimeItems();
    var zceerItem = timeItems.length ? timeItems[0] : FALLBACK_ITEMS[3]; /* salawat as absolute last resort */
    result.push({ _type:'adhkar', _adhkarItem: zceerItem });

    /* Slot 4 — Book */
    try { var b = _buildBookItem();   if (b) result.push(b);    } catch(e) {}

    return result;
  }

  /* ══════════════════════════════════════════════
     UI — CARD BUILDERS
  ══════════════════════════════════════════════ */
  function _buildAdhkarCard(item, gencineUI) {
    var T      = window.t || function(k, d) { return d || k; };
    var state  = _getState();
    var done   = state.completed.indexOf(item.id) >= 0;
    var streak = _getStreak(item.id);

    var card = document.createElement('div');
    card.className = 'sd-card' + (done ? ' sd-card-done' : '');

    var iconWrap = document.createElement('div');
    iconWrap.className = 'sd-icon';
    var ico = document.createElement('i');
    ico.className = item.icon;
    iconWrap.appendChild(ico);
    card.appendChild(iconWrap);

    var content = document.createElement('div');
    content.className = 'sd-content';

    if (item.timeTag) {
      var tag = document.createElement('span');
      tag.className = 'sd-tag';
      tag.textContent = item.timeTag;
      content.appendChild(tag);
    }

    var title = document.createElement('div');
    title.className = 'sd-title';
    title.textContent = T(item.labelKey, item.labelFallback);
    content.appendChild(title);

    var sub = document.createElement('div');
    sub.className = 'sd-sub' + (done ? ' sd-sub-done' : '');
    if (done) {
      sub.textContent = T('gencine.smart.done_today', 'ئەمڕۆ تەواو بوو');
    } else if (streak.count >= 2) {
      sub.textContent = streak.count + ' ' + T('gencine.smart.days_row', 'ڕۆژ پەی هەم');
    } else {
      sub.textContent = T(item.subtitleKey, item.subtitleFallback);
    }
    content.appendChild(sub);
    card.appendChild(content);

    var arrow = document.createElement('div');
    arrow.className = 'sd-arrow';
    var chev = document.createElement('i');
    chev.className = 'fas fa-chevron-left';
    arrow.appendChild(chev);
    card.appendChild(arrow);

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
    var card = document.createElement('div');
    card.className = 'sd-card';

    var iconWrap = document.createElement('div');
    iconWrap.className = 'sd-icon';
    var ico = document.createElement('i');
    ico.className = item.icon;
    iconWrap.appendChild(ico);
    card.appendChild(iconWrap);

    var content = document.createElement('div');
    content.className = 'sd-content';

    var tag = document.createElement('span');
    tag.className = 'sd-tag';
    tag.textContent = item.tag;
    content.appendChild(tag);

    var title = document.createElement('div');
    title.className = 'sd-title';
    title.textContent = item.title;
    content.appendChild(title);

    var sub = document.createElement('div');
    sub.className = 'sd-sub';
    sub.textContent = item.subtitle;
    content.appendChild(sub);

    card.appendChild(content);

    var arrow = document.createElement('div');
    arrow.className = 'sd-arrow';
    var chev = document.createElement('i');
    chev.className = 'fas fa-chevron-left';
    arrow.appendChild(chev);
    card.appendChild(arrow);

    card.addEventListener('click', function() {
      _markOpened(item.id);
      item.nav(gencineUI);
    });
    return card;
  }

  function _buildCard(hybridItem, gencineUI) {
    if (hybridItem._type === 'adhkar') return _buildAdhkarCard(hybridItem._adhkarItem, gencineUI);
    return _buildDailyCard(hybridItem, gencineUI);
  }

  /* ══════════════════════════════════════════════
     UI — SLIDER CONTROLLER
  ══════════════════════════════════════════════ */
  function _initSlider(track, dotsEl, count) {
    if (count <= 1) { if (dotsEl) dotsEl.style.display = 'none'; return; }

    var current     = 0;
    var autoTimer   = null;
    var INTERVAL    = 9000;
    var touching    = false;
    var touchStartX = 0;

    var dots = [];
    for (var i = 0; i < count; i++) {
      var dot = document.createElement('span');
      dot.className = 'sd-dot' + (i === 0 ? ' sd-dot-active' : '');
      (function(idx) {
        dot.addEventListener('click', function() { goTo(idx); resetAuto(); });
      })(i);
      dotsEl.appendChild(dot);
      dots.push(dot);
    }

    function goTo(idx) {
      current = ((idx % count) + count) % count;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      dots.forEach(function(d, i) { d.classList.toggle('sd-dot-active', i === current); });
    }

    function isAlive() { return document.body && document.body.contains(track); }

    function resetAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(function() {
        if (!isAlive()) { clearInterval(autoTimer); autoTimer = null; return; }
        goTo(current + 1);
      }, INTERVAL);
    }

    track.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      touching = true;
      if (autoTimer) clearInterval(autoTimer);
    }, { passive: true });

    track.addEventListener('touchend', function(e) {
      if (!touching) return;
      touching = false;
      var dx = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 45) goTo(dx > 0 ? current + 1 : current - 1);
      resetAuto();
    }, { passive: true });

    resetAuto();

    function _onVisibility() {
      if (!isAlive()) { document.removeEventListener('visibilitychange', _onVisibility); return; }
      if (document.hidden) {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      } else if (!touching) {
        resetAuto();
      }
    }
    document.addEventListener('visibilitychange', _onVisibility);
  }

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  function render(gencineUI) {
    var items = getItemsNow();
    if (!items.length) return null;

    var T       = window.t || function(k, d) { return d || k; };
    var section = document.createElement('div');
    section.className = 'sd-section';

    var hdr = document.createElement('div');
    hdr.className = 'sd-hdr';
    var hdrText = document.createElement('span');
    hdrText.className = 'sd-hdr-label';
    hdrText.textContent = T('gencine.smart.section_title', 'یادکرینا ڕۆژانە');
    hdr.appendChild(hdrText);
    section.appendChild(hdr);

    var wrapper = document.createElement('div');
    wrapper.className = 'sd-wrapper';
    var track = document.createElement('div');
    track.className = 'sd-track';

    items.forEach(function(item) {
      var slide = document.createElement('div');
      slide.className = 'sd-slide';
      slide.appendChild(_buildCard(item, gencineUI));
      track.appendChild(slide);
    });

    wrapper.appendChild(track);
    section.appendChild(wrapper);

    var dots = document.createElement('div');
    dots.className = 'sd-dots';
    section.appendChild(dots);

    var initOnce = false;
    function tryInit() {
      if (initOnce) return;
      initOnce = true;
      _initSlider(track, dots, items.length);
    }
    if (document.readyState !== 'loading') {
      setTimeout(tryInit, 0);
    } else {
      document.addEventListener('DOMContentLoaded', tryInit);
    }

    return section;
  }

  /* ══════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════ */
  window.SmartDhikr = {
    getItemsNow:       getItemsNow,
    markOpened:        _markOpened,
    markCompleted:     _markCompleted,
    getStreak:         _getStreak,
    render:            render,
    _getPrayerTimings: _getPrayerTimings,
    _todayISO:         _todayISO,
    _getState:         _getState
  };

})(window);
