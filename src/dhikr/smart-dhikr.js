/**
 * Smart Daily Dhikr System — TafsirKurd
 * Selects the right adhkar based on time, day, and daily state.
 * Renders a premium slider at the top of the Gencine home screen.
 */
(function(window) {
  'use strict';

  /* ═══════════════════════════════════════════
     ITEM DEFINITIONS
     Each item maps to an adhkar category.
     basePriority = baseline relevance (0–100).
     Time/day boosts are added on top.
  ═══════════════════════════════════════════ */
  var ITEMS = [
    {
      id: 'morning',
      categoryKey: 'morning',
      icon: 'fas fa-sun',
      labelKey: 'adhkar.morning',
      labelFallback: 'زکرێن بەیانیکردن',
      subtitleKey: 'gencine.smart.morning_hint',
      subtitleFallback: 'ڕۆژا خوه ب زکرێ دەستپێکە',
      timeTag: 'بەیانیکردن',
      basePriority: 80,
      /* Active: Fajr → Dhuhr  (fallback 05:00–11:30) */
      timeWindow: { start: 'Fajr', end: 'Dhuhr', fs: 5*60, fe: 11*60+30, wraps: false }
    },
    {
      id: 'waking',
      categoryKey: 'waking',
      icon: 'fas fa-cloud-sun',
      labelKey: 'adhkar.waking',
      labelFallback: 'دوای هاتنا خوو',
      subtitleKey: 'gencine.smart.waking_hint',
      subtitleFallback: 'دوای هاتنا خووێ بخوێنە',
      timeTag: 'بەیانیکردن',
      basePriority: 55,
      /* Active: Fajr → Sunrise+1h  (fallback 05:00–08:00) */
      timeWindow: { start: 'Fajr', end: 'Sunrise', fs: 5*60, fe: 8*60, wraps: false }
    },
    {
      id: 'evening',
      categoryKey: 'evening',
      icon: 'fas fa-moon',
      labelKey: 'adhkar.evening',
      labelFallback: 'زکرێن ئێواربوون',
      subtitleKey: 'gencine.smart.evening_hint',
      subtitleFallback: 'ئێvarê xwe bi zikirê xwe bike',
      timeTag: 'ئێواربوون',
      basePriority: 80,
      /* Active: Asr → Isha  (fallback 15:30–21:00) */
      timeWindow: { start: 'Asr', end: 'Isha', fs: 15*60+30, fe: 21*60, wraps: false }
    },
    {
      id: 'sleep',
      categoryKey: 'sleep',
      icon: 'fas fa-bed',
      labelKey: 'adhkar.sleep',
      labelFallback: 'دوای خەوکردن',
      subtitleKey: 'gencine.smart.sleep_hint',
      subtitleFallback: 'پێش خەوکردنێ بخوێنە',
      timeTag: 'شەو',
      basePriority: 75,
      /* Active: Isha → Fajr  (fallback 21:00–05:00, wraps midnight) */
      timeWindow: { start: 'Isha', end: 'Fajr', fs: 21*60, fe: 5*60, wraps: true }
    },
    {
      id: 'friday',
      categoryKey: 'friday',
      icon: 'fas fa-calendar-day',
      labelKey: 'adhkar.friday',
      labelFallback: 'ڕۆژا ئینانێ',
      subtitleKey: 'gencine.smart.friday_hint',
      subtitleFallback: 'ڕۆژا ئینانێ ئەمڕۆ یە',
      timeTag: 'ئینانی',
      basePriority: 10,
      dayBoostDays: [5],       /* 0=Sun … 5=Fri … 6=Sat */
      dayBoostAmount: 90
    },
    {
      id: 'salawat',
      categoryKey: 'salawat',
      icon: 'fas fa-star-and-crescent',
      labelKey: 'adhkar.salawat',
      labelFallback: 'سەلاوات',
      subtitleKey: 'gencine.smart.salawat_hint',
      subtitleFallback: 'سەلاواتێ بکە سەر پێغەمبەر ﷺ',
      timeTag: null,
      basePriority: 45,
      dayBoostDays: [5],       /* Friday */
      dayBoostAmount: 60,
      thursdayNightBoost: 50   /* Thursday after Maghrib */
    },
    {
      id: 'after_prayer',
      categoryKey: 'after_prayer',
      icon: 'fas fa-hands-praying',
      labelKey: 'adhkar.after_prayer',
      labelFallback: 'دوای نوێژ',
      subtitleKey: 'gencine.smart.after_prayer_hint',
      subtitleFallback: 'زکرێن دوای نوێژکردن',
      timeTag: null,
      basePriority: 42
    },
    {
      id: 'forgiveness',
      categoryKey: 'forgiveness',
      icon: 'fas fa-dove',
      labelKey: 'adhkar.forgiveness',
      labelFallback: 'داواکاری لێبوردن',
      subtitleKey: 'gencine.smart.forgiveness_hint',
      subtitleFallback: 'ئیستیخفارەکە زیادە بکە',
      timeTag: null,
      basePriority: 40
    },
    {
      id: 'protection',
      categoryKey: 'protection',
      icon: 'fas fa-shield-halved',
      labelKey: 'adhkar.protection',
      labelFallback: 'پاراستن',
      subtitleKey: 'gencine.smart.protection_hint',
      subtitleFallback: 'زکرێن پاراستن و حەمایەتێ',
      timeTag: null,
      basePriority: 38
    }
  ];

  /* ═══════════════════════════════════════════
     TIME HELPERS
  ═══════════════════════════════════════════ */

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
     wraps=true: window crosses midnight (e.g. 22:00 → 05:00) */
  function _inRange(cur, s, e, wraps) {
    if (s < 0 || e < 0) return false;
    return wraps ? (cur >= s || cur < e) : (cur >= s && cur < e);
  }

  /* ═══════════════════════════════════════════
     PRAYER TIMES
     Reads cached data that the prayer tab already fetched.
  ═══════════════════════════════════════════ */
  function _getPrayerTimings() {
    try {
      var city   = localStorage.getItem('prayerCity')   || 'Duhok';
      var method = parseInt(localStorage.getItem('prayerMethod') || '13', 10);
      var today  = new Date();
      var dayNum = String(today.getDate());

      /* Monthly cache (amozhgary.tv) */
      var mk = 'prayer-kurd2:' + city + ':' + today.getFullYear() + ':' + (today.getMonth() + 1);
      var monthly = JSON.parse(localStorage.getItem(mk));
      if (monthly && monthly.days && monthly.days[dayNum] && monthly.days[dayNum].Fajr) {
        return monthly.days[dayNum];
      }
      /* Per-day cache */
      var dk = 'prayer3:' + city + ':' + method + ':' + _todayISO();
      var daily = JSON.parse(localStorage.getItem(dk));
      if (daily && daily.timings && daily.timings.Fajr) return daily.timings;
    } catch(e) {}
    return null;
  }

  /* ═══════════════════════════════════════════
     SCORING
  ═══════════════════════════════════════════ */
  function _score(item, nowMin, dow, prayerTimes, maghribMin, state) {
    var s = item.basePriority;

    /* Time-window boost (+100 when active) */
    if (item.timeWindow) {
      var tw = item.timeWindow;
      var tStart = (prayerTimes && _toMinutes(prayerTimes[tw.start]) >= 0)
                    ? _toMinutes(prayerTimes[tw.start]) : tw.fs;
      var tEnd   = (prayerTimes && _toMinutes(prayerTimes[tw.end]) >= 0)
                    ? _toMinutes(prayerTimes[tw.end])   : tw.fe;
      if (_inRange(nowMin, tStart, tEnd, tw.wraps)) s += 100;
    }

    /* Day-of-week boost (e.g. Friday) */
    if (item.dayBoostDays && item.dayBoostDays.indexOf(dow) >= 0) {
      s += (item.dayBoostAmount || 0);
    }

    /* Thursday-night salawat boost */
    if (item.thursdayNightBoost && dow === 4 && nowMin >= maghribMin) {
      s += item.thursdayNightBoost;
    }

    /* Daily-completion penalty — already done, push it down */
    if (state.completed.indexOf(item.id) >= 0) s -= 60;

    /* Opened-today penalty — mild, let other items surface */
    if (state.opened.indexOf(item.id) >= 0) s -= 15;

    return s;
  }

  /* ═══════════════════════════════════════════
     STATE  (today's opens + completions)
     Keyed by date so it auto-resets every day.
  ═══════════════════════════════════════════ */
  var _STATE_KEY = 'sd_daily_v1';

  function _getState() {
    try {
      var raw = JSON.parse(localStorage.getItem(_STATE_KEY));
      if (raw && raw.date === _todayISO()) return raw;
    } catch(e) {}
    return { date: _todayISO(), opened: [], completed: [] };
  }

  function _saveState(state) {
    try { localStorage.setItem(_STATE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function _markOpened(id) {
    var s = _getState();
    if (s.opened.indexOf(id) < 0) s.opened.push(id);
    _saveState(s);
  }

  function _markCompleted(id) {
    var s = _getState();
    if (s.completed.indexOf(id) < 0) s.completed.push(id);
    if (s.opened.indexOf(id) < 0) s.opened.push(id);
    _saveState(s);
    _updateStreak(id);
  }

  /* ═══════════════════════════════════════════
     STREAKS  (days-in-a-row completed)
  ═══════════════════════════════════════════ */
  function _getStreak(id) {
    try {
      return JSON.parse(localStorage.getItem('sd_streak_' + id)) || { count: 0, lastDate: null };
    } catch(e) {
      return { count: 0, lastDate: null };
    }
  }

  function _updateStreak(id) {
    var streak = _getStreak(id);
    var today  = _todayISO();
    if (streak.lastDate === today) return streak;
    var prev   = new Date(Date.now() - 86400000);
    var yest   = prev.getFullYear()
               + '-' + String(prev.getMonth() + 1).padStart(2, '0')
               + '-' + String(prev.getDate()).padStart(2, '0');
    streak.count = (streak.lastDate === yest) ? streak.count + 1 : 1;
    streak.lastDate = today;
    try { localStorage.setItem('sd_streak_' + id, JSON.stringify(streak)); } catch(e) {}
    return streak;
  }

  /* ═══════════════════════════════════════════
     CATEGORY DATA CHECK
     Only show a card if the category actually
     has adhkar entries in the DB cache.
  ═══════════════════════════════════════════ */
  function _catHasData(catKey) {
    try {
      var cached = JSON.parse(localStorage.getItem('gencine_adhkar_v1'));
      /* Cache not loaded yet — assume yes so we don't hide things on first open */
      if (!cached || !Array.isArray(cached)) return true;
      return cached.some(function(a) { return a.category_key === catKey && a.active !== false; });
    } catch(e) { return true; }
  }

  /* ═══════════════════════════════════════════
     MAIN RANKING — getItemsNow()
     Returns top 1–3 items for the current moment.
  ═══════════════════════════════════════════ */
  function getItemsNow() {
    var now        = new Date();
    var nowMin     = now.getHours() * 60 + now.getMinutes();
    var dow        = now.getDay();  /* 0=Sun, 1=Mon … 5=Fri, 6=Sat */
    var prayers    = _getPrayerTimings();
    var maghribMin = (prayers && _toMinutes(prayers.Maghrib) >= 0)
                      ? _toMinutes(prayers.Maghrib) : 18 * 60;
    var state      = _getState();

    var scored = ITEMS
      .filter(function(item) { return _catHasData(item.categoryKey); })
      .map(function(item) {
        return { item: item, score: _score(item, nowMin, dow, prayers, maghribMin, state) };
      });
    scored.sort(function(a, b) { return b.score - a.score; });

    return scored
      .filter(function(x) { return x.score > 0; })
      .slice(0, 3)
      .map(function(x) { return x.item; });
  }

  /* ═══════════════════════════════════════════
     UI — CARD BUILDER
  ═══════════════════════════════════════════ */
  function _buildCard(item, gencineUI) {
    var T     = window.t || function(k, d) { return d || k; };
    var state = _getState();
    var done  = state.completed.indexOf(item.id) >= 0;
    var streak = _getStreak(item.id);

    var card = document.createElement('div');
    card.className = 'sd-card' + (done ? ' sd-card-done' : '');

    /* Icon */
    var iconWrap = document.createElement('div');
    iconWrap.className = 'sd-icon';
    var ico = document.createElement('i');
    ico.className = item.icon;
    iconWrap.appendChild(ico);
    card.appendChild(iconWrap);

    /* Content */
    var content = document.createElement('div');
    content.className = 'sd-content';

    /* Time-tag / day-tag pill */
    if (item.timeTag) {
      var tag = document.createElement('span');
      tag.className = 'sd-tag';
      tag.textContent = item.timeTag;
      content.appendChild(tag);
    }

    /* Title */
    var title = document.createElement('div');
    title.className = 'sd-title';
    title.textContent = T(item.labelKey, item.labelFallback);
    content.appendChild(title);

    /* Subtitle */
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

    /* Chevron */
    var arrow = document.createElement('div');
    arrow.className = 'sd-arrow';
    var chev = document.createElement('i');
    chev.className = 'fas fa-chevron-left';
    arrow.appendChild(chev);
    card.appendChild(arrow);

    /* Tap → open adhkar category */
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

  /* ═══════════════════════════════════════════
     UI — SLIDER CONTROLLER
  ═══════════════════════════════════════════ */
  function _initSlider(track, dotsEl, count) {
    if (count <= 1) {
      if (dotsEl) dotsEl.style.display = 'none';
      return;
    }

    var current    = 0;
    var autoTimer  = null;
    var INTERVAL   = 9000;
    var touching   = false;
    var touchStartX = 0;

    /* Build dot indicators */
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
      dots.forEach(function(d, i) {
        d.classList.toggle('sd-dot-active', i === current);
      });
    }

    function resetAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(function() { goTo(current + 1); }, INTERVAL);
    }

    /* Touch — pause on touch, advance/retreat on swipe */
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

    /* Pause when Gencine tab becomes invisible */
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      } else if (!touching) {
        resetAuto();
      }
    });
  }

  /* ═══════════════════════════════════════════
     RENDER — returns the full section DOM node
     Pass the GencineUI instance for tap navigation.
  ═══════════════════════════════════════════ */
  function render(gencineUI) {
    var items = getItemsNow();
    if (!items.length) return null;

    var T       = window.t || function(k, d) { return d || k; };
    var section = document.createElement('div');
    section.className = 'sd-section';

    /* ── Section header ── */
    var hdr = document.createElement('div');
    hdr.className = 'sd-hdr';
    var hdrText = document.createElement('span');
    hdrText.className = 'sd-hdr-label';
    hdrText.textContent = T('gencine.smart.section_title', 'یادکرینا ڕۆژانە');
    hdr.appendChild(hdrText);
    section.appendChild(hdr);

    /* ── Slider ── */
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

    /* ── Dot indicators ── */
    var dots = document.createElement('div');
    dots.className = 'sd-dots';
    section.appendChild(dots);

    /* Init after paint so layout is settled */
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

  /* ═══════════════════════════════════════════
     PUBLIC API
     SmartDhikr is also usable by the notification
     system later — getItemsNow() returns the same
     ranked list that drives the UI.
  ═══════════════════════════════════════════ */
  window.SmartDhikr = {
    getItemsNow:   getItemsNow,
    markOpened:    _markOpened,
    markCompleted: _markCompleted,
    getStreak:     _getStreak,
    render:        render,
    /* For testing / notifications */
    _getPrayerTimings: _getPrayerTimings,
    _todayISO:         _todayISO,
    _getState:         _getState
  };

})(window);
