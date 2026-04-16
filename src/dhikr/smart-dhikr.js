/**
 * Smart Daily Companion  v17
 * Always exactly 4 cards:
 *   1. Zikr of current time   (time-aware, always present via fallback)
 *   2. Ayah of the day        (UTC-seeded, salt 1)
 *   3. Hadith of the day      (UTC-seeded, salt 2)
 *   4. Book of the day        (UTC-seeded, salt 4)
 *
 * Daily cards (2-4) use UTC date as seed so ALL users worldwide
 * see the same ayah/hadith/book on the same calendar day.
 * Cards change at UTC midnight (00:00 UTC).
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
  var SURAH_SIZES = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
    59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,
    52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,
    11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
  ];

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

  /* UTC date — same number for every user on the same calendar day,
     regardless of timezone.  Changes at 00:00 UTC.               */
  function _daySeed() {
    var d = new Date();
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
  function _isTimeActive(item, nowMin, dow, prayers, maghribMin) {
    if (item.timeWindow) {
      var tw = item.timeWindow;
      var ts = (prayers && _toMin(prayers[tw.start]) >= 0) ? _toMin(prayers[tw.start]) : tw.fs;
      var te = (prayers && _toMin(prayers[tw.end])   >= 0) ? _toMin(prayers[tw.end])   : tw.fe;
      return _inRange(nowMin, ts, te, tw.wraps);
    }
    if (item.dayBoostDays && item.dayBoostDays.indexOf(dow) >= 0) return true;
    if (item.thursdayNightBoost && dow === 4 && nowMin >= maghribMin) return true;
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
    var now        = new Date();
    var nowMin     = now.getHours() * 60 + now.getMinutes();
    var dow        = now.getDay();
    var prayers    = _getPrayerTimings();
    var maghribMin = (prayers && _toMin(prayers.Maghrib) >= 0) ? _toMin(prayers.Maghrib) : 18 * 60;
    var state      = _getState();

    var active = TIME_ITEMS
      .filter(function(item) {
        return _catHasData(item.categoryKey) && _isTimeActive(item, nowMin, dow, prayers, maghribMin);
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
    var surahName = SURAH_NAMES[surah - 1] || ('سورە ' + surah);
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
      try { return JSON.parse(localStorage.getItem('gencine_hadiths_v2')); } catch(e) { return null; }
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
      try { return JSON.parse(localStorage.getItem('gencine_books_v3')); } catch(e) { return null; }
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

  function _buildAdhkarCard(item, gencineUI) {
    var T      = window.t || function(k, d) { return d || k; };
    var state  = _getState();
    var done   = state.completed.indexOf(item.id) >= 0;
    var streak = _getStreak(item.id);

    var card    = _mk('div', 'sd-card' + (done ? ' sd-card-done' : ''));
    var iWrap   = _mk('div', 'sd-icon');
    iWrap.appendChild(_mk('i', item.icon));
    card.appendChild(iWrap);

    var content = _mk('div', 'sd-content');
    if (item.timeTag) content.appendChild(_mk('span', 'sd-tag', item.timeTag));
    content.appendChild(_mk('div', 'sd-title', T(item.labelKey, item.labelFallback)));

    var subText = done
      ? T('gencine.smart.done_today', 'ئەمڕۆ تەواو بوو')
      : streak.count >= 2
        ? streak.count + ' ' + T('gencine.smart.days_row', 'ڕۆژ پەی هەم')
        : T(item.subtitleKey, item.subtitleFallback);
    content.appendChild(_mk('div', 'sd-sub' + (done ? ' sd-sub-done' : ''), subText));
    card.appendChild(content);

    var arrow = _mk('div', 'sd-arrow');
    arrow.appendChild(_mk('i', 'fas fa-chevron-left'));
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
    var card    = _mk('div', 'sd-card');
    var iWrap   = _mk('div', 'sd-icon');
    iWrap.appendChild(_mk('i', item.icon));
    card.appendChild(iWrap);

    var content = _mk('div', 'sd-content');
    content.appendChild(_mk('span', 'sd-tag',   item.tag));
    content.appendChild(_mk('div',  'sd-title', item.title));
    content.appendChild(_mk('div',  'sd-sub',   item.subtitle));
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
     SLIDER  v16

     DOM layout:
       .sd-wrapper  (overflow:hidden, border-radius, position:relative)
         .sd-track  (display:flex, will-change:transform)
           .sd-slide × 4
         .sd-progress  (position:absolute bottom:0, created here)
           .sd-bar     (scaleX 0→1, transform-origin:right → fills RTL)
       .sd-dots  (outside wrapper, flex row)
         .sd-dot × 4  (DOM order reversed: dot[0] rightmost = RTL card 1)

     Init:
       Double requestAnimationFrame after section is appended to DOM.
       Uses track.children.length (real DOM count) as authoritative count.

     RTL dots:
       Appended count-1 → 0 so dot[0] is last appended = rightmost in flex.
       Active class moves right → left as slides advance.

     Progress bar:
       transform-origin: right center
       scaleX(0 → 1) fills bar right → left over 10 s.
       Pauses on touchstart, resumes + resets on touchend.
  ───────────────────────────────────────────── */
  function _initSlider(wrapper, track, dotsEl, count) {
    var realCount = track.children.length;

    if (realCount <= 1) {
      dotsEl.style.display = 'none';
      return;
    }
    count = realCount;

    var current  = 0;
    var DURATION = 10000;  /* 10 s per card */
    var SNAP_MS  = 320;
    var SNAP_FN  = 'cubic-bezier(0.25,0.46,0.45,0.94)';

    /* ── progress bar ── */
    var prog = _mk('div', 'sd-progress');
    var bar  = _mk('div', 'sd-bar');
    prog.appendChild(bar);
    wrapper.appendChild(prog);

    /* ── dots (reversed DOM order → dot[0] rightmost = RTL card 1) ── */
    var dots = new Array(count);
    for (var i = count - 1; i >= 0; i--) {
      var dot = _mk('span', 'sd-dot' + (i === 0 ? ' sd-dot-active' : ''));
      (function(idx) {
        dot.addEventListener('click', function() { _goTo(idx, true); });
      }(i));
      dotsEl.appendChild(dot);
      dots[i] = dot;
    }

    /* ── helpers ── */
    function _alive() { return !!(document.body && document.body.contains(track)); }
    function _W()     { var w = wrapper.clientWidth || wrapper.offsetWidth; return w > 0 ? w : window.innerWidth - 32; }

    function _applyX(px, anim) {
      track.style.transition = anim ? 'transform ' + SNAP_MS + 'ms ' + SNAP_FN : 'none';
      track.style.transform  = 'translateX(' + px + 'px)';
    }

    function _syncDots() {
      for (var j = 0; j < count; j++)
        dots[j].classList.toggle('sd-dot-active', j === current);
    }

    function _goTo(idx, anim) {
      current = ((idx % count) + count) % count;
      _applyX(-current * _W(), anim !== false);
      _syncDots();
      _resetProg();
    }

    /* ── RAF progress (right → left) ── */
    var _raf    = null;
    var _tStart = 0;
    var _accum  = 0;
    var _paused = false;

    function _resetProg() {
      _accum  = 0;
      _paused = false;
      bar.style.transition = 'none';
      bar.style.transform  = 'scaleX(0)';
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
      _tStart = performance.now();
      _raf = requestAnimationFrame(_tick);
    }

    function _pauseProg() {
      if (_paused) return;
      _paused  = true;
      _accum  += performance.now() - _tStart;
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

    /* ── swipe ── */
    var _drag    = false;
    var _sx = 0, _sy = 0, _baseX = 0;
    var _decided = false, _horiz = false;
    var INTENT   = 6;

    track.addEventListener('touchstart', function(e) {
      _drag = true; _decided = false; _horiz = false;
      _sx = e.touches[0].clientX; _sy = e.touches[0].clientY;
      _baseX = -current * _W();
      track.style.transition = 'none';
      _pauseProg();
    }, { passive: true });

    track.addEventListener('touchmove', function(e) {
      if (!_drag) return;
      var dx = e.touches[0].clientX - _sx;
      var dy = e.touches[0].clientY - _sy;

      if (!_decided) {
        if (Math.abs(dx) < INTENT && Math.abs(dy) < INTENT) return;
        _decided = true;
        _horiz   = Math.abs(dx) >= Math.abs(dy);
        if (!_horiz) { _drag = false; _resumeProg(); return; }
      }
      if (!_horiz) return;
      e.preventDefault();

      var W = _W(), raw = _baseX + dx;
      var min = -(count - 1) * W, max = 0;
      var clamped = raw > max ? max + (raw - max) * 0.25
                  : raw < min ? min + (raw - min) * 0.25
                  : raw;
      track.style.transform = 'translateX(' + clamped + 'px)';
    }, { passive: false });

    function _onEnd(e) {
      if (!_drag) return; _drag = false;
      var endX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : _sx;
      Math.abs(endX - _sx) > _W() * 0.18
        ? _goTo(endX < _sx ? current + 1 : current - 1, true)
        : _goTo(current, true);
    }
    track.addEventListener('touchend',    _onEnd, { passive: true });
    track.addEventListener('touchcancel', _onEnd, { passive: true });

    /* ── visibility ── */
    function _onVis() {
      if (!_alive()) { document.removeEventListener('visibilitychange', _onVis); return; }
      document.hidden ? _pauseProg() : _resumeProg();
    }
    document.addEventListener('visibilitychange', _onVis);

    /* ── start ── */
    _applyX(0, false);
    _syncDots();
    _resetProg();
  }

  /* ─────────────────────────────────────────────
     DAILY REFRESH COUNTDOWN
     Shows time remaining until next UTC midnight —
     the exact moment the daily seed flips.
     Updates every minute; self-cleans when removed.
  ───────────────────────────────────────────── */
  function _buildCountdown() {
    var el = _mk('div', 'sd-refresh');

    function _msUntilUtcMidnight() {
      var now = Date.now();
      var d   = new Date();
      var next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
      return next - now;
    }

    function _fmt(ms) {
      var total = Math.max(0, Math.floor(ms / 1000));
      var h = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      return h + 'h ' + String(m).padStart(2, '0') + 'm';
    }

    function _update() {
      if (!document.body || !document.body.contains(el)) {
        clearInterval(_tid);
        return;
      }
      el.textContent = 'نوێکرنەوەی ڕۆژانە لە: ' + _fmt(_msUntilUtcMidnight());
    }

    _update();
    var _tid = setInterval(_update, 60000);

    return el;
  }

  /* ─────────────────────────────────────────────
     RENDER
     Returns section element.
     Slider initialised via double-RAF after caller
     appends element to the live DOM.
  ───────────────────────────────────────────── */
  function render(gencineUI) {
    var items = getItemsNow();  /* always 4 */
    var T       = window.t || function(k, d) { return d || k; };
    var section = _mk('div', 'sd-section');

    /* header */
    var hdr = _mk('div', 'sd-hdr');
    hdr.appendChild(_mk('span', 'sd-hdr-label', T('gencine.smart.section_title', 'یادکرینا ڕۆژانە')));
    section.appendChild(hdr);

    /* wrapper + track */
    var wrapper = _mk('div', 'sd-wrapper');
    var track   = _mk('div', 'sd-track');

    items.forEach(function(item) {
      var slide = _mk('div', 'sd-slide');
      slide.appendChild(_buildCard(item, gencineUI));
      track.appendChild(slide);
    });

    wrapper.appendChild(track);
    /* sd-progress is created inside _initSlider after DOM insertion */
    section.appendChild(wrapper);

    /* dots — outside wrapper so overflow:hidden doesn't clip them */
    var dotsEl = _mk('div', 'sd-dots');
    section.appendChild(dotsEl);

    /* daily refresh countdown — below dots, separate from the 10s bar */
    section.appendChild(_buildCountdown());

    /* double-RAF: guarantees wrapper is in DOM + layout committed */
    var _done = false;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (_done) return; _done = true;
        _initSlider(wrapper, track, dotsEl, items.length);
      });
    });

    return section;
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  window.SmartDhikr = {
    getItemsNow:   getItemsNow,
    markOpened:    _markOpened,
    markCompleted: _markCompleted,
    getStreak:     _getStreak,
    render:        render
  };

}(window));
