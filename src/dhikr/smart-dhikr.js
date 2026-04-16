/**
 * Smart Daily Companion — TafsirKurd  v15
 * Clean rebuild. Real horizontal slider, RTL, dots + progress bar, swipe.
 *
 * Slides (up to 4):
 *   1. Time-based adhkar  (only when a genuine time window is active)
 *   2. Ayah of the day
 *   3. Hadith of the day
 *   4. Book of the day
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
      dayBoostDays: [5]
    },
    {
      id: 'salawat', categoryKey: 'salawat', icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat', labelFallback: 'سەلاوات',
      subtitleKey: 'gencine.smart.salawat_hint', subtitleFallback: 'سەلاواتێ بکە سەر پێغەمبەر \uFDFA',
      timeTag: null, basePriority: 75,
      dayBoostDays: [5],
      thursdayNightBoost: true
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
     PRAYER TIMES
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
     STATE
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
  ══════════════════════════════════════════════ */
  function _isTimeActive(item, nowMin, dow, prayers, maghribMin) {
    if (item.timeWindow) {
      var tw = item.timeWindow;
      var ts = (prayers && _toMinutes(prayers[tw.start]) >= 0) ? _toMinutes(prayers[tw.start]) : tw.fs;
      var te = (prayers && _toMinutes(prayers[tw.end])   >= 0) ? _toMinutes(prayers[tw.end])   : tw.fe;
      return _inRange(nowMin, ts, te, tw.wraps);
    }
    if (item.dayBoostDays && item.dayBoostDays.indexOf(dow) >= 0) return true;
    if (item.thursdayNightBoost && dow === 4 && nowMin >= maghribMin) return true;
    return false;
  }

  function _scoreTimeItem(item, state) {
    var s = item.basePriority;
    if (state.completed.indexOf(item.id) >= 0) s -= 60;
    if (state.opened.indexOf(item.id)    >= 0) s -= 15;
    return s;
  }

  function _getTimeItems() {
    var now        = new Date();
    var nowMin     = now.getHours() * 60 + now.getMinutes();
    var dow        = now.getDay();
    var prayers    = _getPrayerTimings();
    var maghribMin = (prayers && _toMinutes(prayers.Maghrib) >= 0) ? _toMinutes(prayers.Maghrib) : 18 * 60;
    var state      = _getState();
    return TIME_ITEMS
      .filter(function(item) {
        return _catHasData(item.categoryKey) && _isTimeActive(item, nowMin, dow, prayers, maghribMin);
      })
      .map(function(item) { return { item: item, score: _scoreTimeItem(item, state) }; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, 1)
      .map(function(x) { return x.item; });
  }

  /* ══════════════════════════════════════════════
     DAILY ITEMS
  ══════════════════════════════════════════════ */
  function _readCache(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
  }

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
      title: surahName, subtitle: 'ئایەت ' + ayah,
      nav: function() {
        if (window.App && App.tab && App.openSurah) {
          App.tab('quran');
          setTimeout(function() { App.openSurah(s, a); }, 300);
        }
      }
    };
  }

  function _buildHadithItem() {
    var hadiths = _readCache('gencine_hadiths_v2');
    if (!hadiths || !hadiths.length) return null;
    var idx     = _seededIdx(hadiths.length, 2);
    var h       = hadiths[idx];
    var preview = (h.ku || h.ar || '').trim();
    if (preview.length > 55) preview = preview.slice(0, 55) + '\u2026';
    return {
      _type:'daily', id:'hadith_day', icon:'fas fa-scroll', tag:'حەدیسا ڕۆژێ',
      title: h.title || preview, subtitle: h.source || 'پێغەمبەرێ ئیسلامێ \uFDFA',
      nav: function(gencineUI) {
        if (!gencineUI) return;
        gencineUI._view            = 'hadith';
        gencineUI._hadithSearch    = '';
        gencineUI._hadithDetailIdx = idx;
        gencineUI._draw();
      }
    };
  }

  function _buildBookItem() {
    var books = _readCache('gencine_books_v3');
    if (!books || !books.length) return null;
    var b = books[_seededIdx(books.length, 4)];
    if (!b) b = books[0];
    var bookId = b.id;
    return {
      _type:'daily', id:'book_day', icon:'fas fa-book-open', tag:'کتێبا ڕۆژێ',
      title: b.title_ku || b.title_ar || 'کتێب', subtitle: b.author_ku || 'بخوێنە',
      nav: function(gencineUI) {
        if (!gencineUI) return;
        gencineUI.openBook(bookId);
      }
    };
  }

  function getItemsNow() {
    var result = [];
    var timeItems = _getTimeItems();
    if (timeItems.length) result.push({ _type: 'adhkar', _adhkarItem: timeItems[0] });
    try { var ay = _buildAyahItem();   if (ay) result.push(ay); } catch(e) {}
    try { var h  = _buildHadithItem(); if (h)  result.push(h);  } catch(e) {}
    try { var b  = _buildBookItem();   if (b)  result.push(b);  } catch(e) {}
    return result;
  }

  /* ══════════════════════════════════════════════
     CARD BUILDERS
  ══════════════════════════════════════════════ */
  function _buildAdhkarCard(item, gencineUI) {
    var T     = window.t || function(k, d) { return d || k; };
    var state = _getState();
    var done  = state.completed.indexOf(item.id) >= 0;
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
    arrow.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-chevron-left' }));
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
    iconWrap.appendChild(Object.assign(document.createElement('i'), { className: item.icon }));
    card.appendChild(iconWrap);

    var content = document.createElement('div');
    content.className = 'sd-content';
    content.appendChild(Object.assign(document.createElement('span'), { className: 'sd-tag',   textContent: item.tag      }));
    content.appendChild(Object.assign(document.createElement('div'),  { className: 'sd-title', textContent: item.title    }));
    content.appendChild(Object.assign(document.createElement('div'),  { className: 'sd-sub',   textContent: item.subtitle }));
    card.appendChild(content);

    var arrow = document.createElement('div');
    arrow.className = 'sd-arrow';
    arrow.appendChild(Object.assign(document.createElement('i'), { className: 'fas fa-chevron-left' }));
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
     SLIDER CONTROLLER  v15  (clean rebuild)

     DOM structure enforced:
       .sd-wrapper           overflow:hidden, position:relative, border-radius
         .sd-track           display:flex, will-change:transform
           .sd-slide × N     min-width:100%, flex-shrink:0
         .sd-progress        position:absolute, bottom:0, left:0, right:0, h:3px
           .sd-bar           fills right→left via scaleX + transform-origin:right
       .sd-dots              OUTSIDE wrapper (flex row, below card)

     Init:
       Called with double-RAF after section is appended to DOM.
       Uses track.children.length (actual DOM count) not items.length.

     RTL dots:
       Rendered count-1 → 0 so dot[0] is rightmost (slide 1 in RTL).

     Swipe:
       - 6px axis intent window
       - horizontal confirmed → preventDefault() blocks scroll + PTR
       - vertical → immediate release, page scrolls freely
       - 18% width threshold to commit
       - rubber-band at edges (25% of excess)

     Progress:
       - RAF-based, 12s per slide
       - pauses on touchstart, resumes on touchend
       - scaleX(0→1), transform-origin:right center (fills right→left)
  ══════════════════════════════════════════════ */
  function _initSlider(wrapper, track, dotsEl, count) {
    /* count is passed as a hint but we verify against real DOM */
    var realCount = track.children.length;
    console.log('[SD v15] _initSlider count:', count, 'realCount:', realCount, 'wW:', wrapper.clientWidth);

    if (realCount <= 1) {
      if (dotsEl) dotsEl.style.display = 'none';
      return;
    }

    count = realCount;  /* use actual DOM count */

    var current      = 0;
    var DURATION     = 12000;
    var SNAP_MS      = 320;
    var SNAP_EASE    = 'cubic-bezier(0.25,0.46,0.45,0.94)';

    /* ── progress bar (created here, appended inside wrapper) ── */
    var progressEl = document.createElement('div');
    progressEl.className = 'sd-progress';
    var bar = document.createElement('div');
    bar.className = 'sd-bar';
    progressEl.appendChild(bar);
    wrapper.appendChild(progressEl);

    /* ── dots (rendered right→left: last dot appended first = leftmost visually) ── */
    var dots = new Array(count);
    for (var i = count - 1; i >= 0; i--) {
      var dot = document.createElement('span');
      dot.className = 'sd-dot' + (i === 0 ? ' sd-dot-active' : '');
      /* closure to capture i */
      (function(idx) {
        dot.addEventListener('click', function() { _goTo(idx, true); });
      })(i);
      dotsEl.appendChild(dot);
      dots[i] = dot;
    }

    /* ── helpers ── */
    function _alive()  { return document.body && document.body.contains(track); }
    function _width()  {
      var w = wrapper.clientWidth || wrapper.offsetWidth;
      return w > 0 ? w : (window.innerWidth - 32);
    }

    function _snap(px, animated) {
      track.style.transition = animated
        ? 'transform ' + SNAP_MS + 'ms ' + SNAP_EASE
        : 'none';
      track.style.transform = 'translateX(' + px + 'px)';
    }

    function _updateDots() {
      for (var j = 0; j < count; j++) {
        dots[j].classList.toggle('sd-dot-active', j === current);
      }
    }

    /* ── goto slide ── */
    function _goTo(idx, animated) {
      current = ((idx % count) + count) % count;
      _snap(-current * _width(), animated !== false);
      _updateDots();
      _resetProg();
    }

    /* ── RAF-based progress ── */
    var _raf       = null;
    var _progStart = 0;
    var _progAccum = 0;
    var _paused    = false;

    function _resetProg() {
      _progAccum = 0;
      _paused    = false;
      bar.style.transition = 'none';
      bar.style.transform  = 'scaleX(0)';
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
      _progStart = performance.now();
      _raf = requestAnimationFrame(_tick);
    }

    function _pauseProg() {
      if (_paused) return;
      _paused     = true;
      _progAccum += performance.now() - _progStart;
      if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    }

    function _resumeProg() {
      if (!_paused) return;
      _paused    = false;
      _progStart = performance.now();
      _raf = requestAnimationFrame(_tick);
    }

    function _tick() {
      if (_paused || !_alive()) return;
      var elapsed = _progAccum + (performance.now() - _progStart);
      var pct     = Math.min(elapsed / DURATION, 1);
      bar.style.transform = 'scaleX(' + pct + ')';
      if (pct >= 1) { _goTo(current + 1, true); return; }
      _raf = requestAnimationFrame(_tick);
    }

    /* ── swipe / drag ── */
    var _drag    = false;
    var _sx      = 0;
    var _sy      = 0;
    var _baseX   = 0;
    var _decided = false;
    var _horiz   = false;
    var INTENT   = 6;

    track.addEventListener('touchstart', function(e) {
      _drag    = true;
      _sx      = e.touches[0].clientX;
      _sy      = e.touches[0].clientY;
      _baseX   = -current * _width();
      _decided = false;
      _horiz   = false;
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
        if (!_horiz) {
          /* vertical — release drag, let page scroll */
          _drag = false;
          _resumeProg();
          return;
        }
      }

      if (!_horiz) return;
      e.preventDefault();  /* block scroll + pull-to-refresh */

      var W   = _width();
      var raw = _baseX + dx;
      var min = -(count - 1) * W;
      var max = 0;
      var clamped = raw > max ? max + (raw - max) * 0.25
                  : raw < min ? min + (raw - min) * 0.25
                  : raw;
      track.style.transform = 'translateX(' + clamped + 'px)';
    }, { passive: false });

    function _onEnd(e) {
      if (!_drag) return;
      _drag = false;
      var endX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : _sx;
      var dx   = endX - _sx;
      var W    = _width();
      if (Math.abs(dx) > W * 0.18) {
        _goTo(dx < 0 ? current + 1 : current - 1, true);
      } else {
        _goTo(current, true);
      }
    }

    track.addEventListener('touchend',    _onEnd, { passive: true });
    track.addEventListener('touchcancel', _onEnd, { passive: true });

    /* ── visibility: pause when tab hidden ── */
    function _onVis() {
      if (!_alive()) { document.removeEventListener('visibilitychange', _onVis); return; }
      if (document.hidden) { _pauseProg(); } else { _resumeProg(); }
    }
    document.addEventListener('visibilitychange', _onVis);

    /* ── init: snap to slide 0, start progress ── */
    _snap(-0, false);
    _updateDots();
    _resetProg();

    console.log('[SD v15] slider ready — count:', count, 'width:', _width());
  }

  /* ══════════════════════════════════════════════
     RENDER
     Returns the section element.
     Slider is initialised via double-RAF AFTER the
     caller appends the element to the live DOM.
  ══════════════════════════════════════════════ */
  function render(gencineUI) {
    var items = getItemsNow();
    console.log('[SD v15] render — items:', items.length, items.map(function(x) { return x.id || (x._adhkarItem && x._adhkarItem.id); }));
    if (!items.length) return null;

    /* ── section wrapper ── */
    var section = document.createElement('div');
    section.className = 'sd-section';

    /* ── header ── */
    var T = window.t || function(k, d) { return d || k; };
    var hdr = document.createElement('div');
    hdr.className = 'sd-hdr';
    hdr.appendChild(Object.assign(document.createElement('span'), {
      className: 'sd-hdr-label',
      textContent: T('gencine.smart.section_title', 'یادکرینا ڕۆژانە')
    }));
    section.appendChild(hdr);

    /* ── slider wrapper (clips the track) ── */
    var wrapper = document.createElement('div');
    wrapper.className = 'sd-wrapper';

    /* ── track (all slides in one horizontal flex row) ── */
    var track = document.createElement('div');
    track.className = 'sd-track';

    items.forEach(function(item) {
      var slide = document.createElement('div');
      slide.className = 'sd-slide';
      slide.appendChild(_buildCard(item, gencineUI));
      track.appendChild(slide);
    });

    wrapper.appendChild(track);
    /* note: sd-progress is created and appended by _initSlider after DOM insertion */
    section.appendChild(wrapper);

    /* ── dots (outside wrapper so overflow:hidden does not clip them) ── */
    var dotsEl = document.createElement('div');
    dotsEl.className = 'sd-dots';
    section.appendChild(dotsEl);

    /* ── init after double-RAF (guarantees wrapper is in DOM and has been laid out) ── */
    var _inited = false;
    function _tryInit() {
      if (_inited) return;
      _inited = true;
      console.log('[SD v15] tryInit — inDOM:', !!(document.body && document.body.contains(wrapper)), 'wW:', wrapper.clientWidth);
      _initSlider(wrapper, track, dotsEl, items.length);
    }

    /* Double RAF: first fires before paint, second fires after layout is committed */
    requestAnimationFrame(function() {
      requestAnimationFrame(_tryInit);
    });

    return section;
  }

  /* ══════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════ */
  window.SmartDhikr = {
    getItemsNow:    getItemsNow,
    markOpened:     _markOpened,
    markCompleted:  _markCompleted,
    getStreak:      _getStreak,
    render:         render
  };

}(window));
