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
  function getFormat()  { return localStorage.getItem('prayerTimeFormat') || '24'; }

  function setCity(v)    { if (window.S) S.prayerCity = v;         localStorage.setItem('prayerCity', v); }
  function setAthan(v)   { if (window.S) S.prayerAthanEnabled = v; localStorage.setItem('prayerAthanEnabled', String(v)); }
  function setToggles(v) { if (window.S) S.prayerToggles = v;      localStorage.setItem('prayerToggles', JSON.stringify(v)); }
  function setFormat(v)  { localStorage.setItem('prayerTimeFormat', v); }

  function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function cel(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // ─── Countdown ─────────────────────────────────────────────────────────────

  function stopCountdown() {
    if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
  }

  function startCountdown() {
    stopCountdown();
    _countdownInterval = setInterval(tickCountdown, 1000);
    tickCountdown();
  }

  function tickCountdown() {
    var cdEl   = document.getElementById('prayerCountdown');
    var nameEl = document.getElementById('prayerNextName');
    if (!cdEl || !nameEl || !_currentTimings || !_currentDateISO) return;

    var now  = new Date();
    var pl   = window.PrayerLogic;
    var next = pl.getNextPrayer(_currentTimings, _currentDateISO, now);

    if (next) {
      cdEl.textContent   = pl.formatCountdown(next.time - now);
      nameEl.textContent = tStr(PRAYER_I18N[next.name] || next.name);
      document.querySelectorAll('.prayer-grid-card[data-prayer]').forEach(function(el) {
        el.classList.toggle('prayer-grid-card--next', el.dataset.prayer === next.name);
      });
    } else {
      if (_tomorrowTimings && _tomorrowDateISO) {
        var fajrAt = pl.parseAsDate(_tomorrowTimings.Fajr, _tomorrowDateISO);
        cdEl.textContent   = pl.formatCountdown(fajrAt - now);
        nameEl.textContent = tStr('prayer.fajr') + ' — ' + tStr('prayer.tomorrow');
      } else {
        cdEl.textContent   = '--:--:--';
        nameEl.textContent = tStr('prayer.fajr');
        fetchTomorrow();
      }
      document.querySelectorAll('.prayer-grid-card[data-prayer]').forEach(function(el) {
        el.classList.remove('prayer-grid-card--next');
      });
    }
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
      return;
    }

    // ── Slow path: no cache yet — show spinner and fetch ──
    _renderedKey = null;
    buildLoading(container);
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today);
      _currentTimings = data.timings;
      _currentDateISO = today;
      _currentData    = data;
      buildPanel(container, data, city, today);
      startCountdown();
    } catch(e) {
      buildError(container);
    }
  }

  async function refresh() {
    var container = document.getElementById('prayerContent');
    if (!container) return;
    var city  = getCity();
    var today = window.PrayerLogic.todayBaghdad();

    var parts = today.split('-').map(Number);
    window.PrayerCache.clear(window.PrayerCache.monthKey(city, parts[0], parts[1]));

    _renderedKey     = null;
    buildLoading(container);
    stopCountdown();
    _currentTimings  = null;
    _tomorrowTimings = null;

    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today);
      _currentTimings = data.timings;
      _currentDateISO = today;
      _currentData    = data;
      buildPanel(container, data, city, today);
      startCountdown();
    } catch(e) {
      buildError(container);
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

  function buildPanel(container, data, city, today) {
    _renderedKey = city + ':' + today + ':' + getFormat();
    clearEl(container);
    var timings  = data.timings;
    var dateInfo = data.date;
    var pl       = window.PrayerLogic;

    // ── Dark header card ──
    var hdr = cel('div', 'prayer-hdr-card');

    var cityEl = cel('div', 'prayer-hdr-city');
    cityEl.textContent = CITY_LABEL[city] || city;
    hdr.appendChild(cityEl);

    var gregEl = cel('div', 'prayer-hdr-date-greg');
    if (dateInfo && dateInfo.gregorian) {
      gregEl.textContent = dateInfo.gregorian.weekday.en + ', ' +
                           dateInfo.gregorian.day + ' ' +
                           dateInfo.gregorian.month.en + ' ' +
                           dateInfo.gregorian.year;
    } else {
      var gregDate = new Date(today + 'T12:00:00+03:00');
      gregEl.textContent = gregDate.toLocaleDateString('en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'Asia/Baghdad'
      });
    }
    hdr.appendChild(gregEl);

    if (dateInfo) {
      var hijriEl = cel('div', 'prayer-hdr-date-hijri');
      if (dateInfo.hijri) {
        hijriEl.textContent = dateInfo.hijri.day + ' ' + dateInfo.hijri.month.en + ' ' + dateInfo.hijri.year + ' هـ';
      } else if (dateInfo.hijriStr) {
        hijriEl.textContent = dateInfo.hijriStr;
      }
      if (hijriEl.textContent) hdr.appendChild(hijriEl);
    }

    // Next prayer countdown inside header
    var next = pl.getNextPrayer(timings, today);
    var cdWrap = cel('div', 'prayer-hdr-countdown');
    var cdLabel = cel('div', 'prayer-hdr-cd-label');
    cdLabel.id = 'prayerNextName';
    cdLabel.textContent = next ? tStr(PRAYER_I18N[next.name] || next.name) : tStr('prayer.fajr');
    var cdVal = cel('div', 'prayer-hdr-cd-val');
    cdVal.id = 'prayerCountdown';
    cdVal.textContent = next ? pl.formatCountdown(next.time - new Date()) : '--:--:--';
    cdWrap.appendChild(cdLabel);
    cdWrap.appendChild(cdVal);
    hdr.appendChild(cdWrap);

    container.appendChild(hdr);

    // ── 2-column prayer grid ──
    var use12h = getFormat() === '12';
    var grid = cel('div', 'prayer-grid');
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
  }

  // ─── Settings sheet ────────────────────────────────────────────────────────

  function buildSettingsOverlay() {
    var overlay = cel('div', 'prayer-settings-overlay');
    overlay.id = 'prayerSettingsOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) closeSettings(); };

    var sheet = cel('div', 'prayer-settings-sheet');
    sheet.id = 'prayerSettingsSheet';

    // Header
    var sheetHdr = cel('div', 'prayer-settings-hdr');
    var sheetTitle = cel('span', 'prayer-settings-title');
    sheetTitle.textContent = tStr('prayer.settings_title');
    var closeBtn = cel('button', 'prayer-settings-close');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = closeSettings;
    sheetHdr.appendChild(sheetTitle);
    sheetHdr.appendChild(closeBtn);
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
    var fmtSeg = cel('div', 'prayer-fmt-seg');
    var fmt = getFormat();
    ['24', '12'].forEach(function(f) {
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

  function updateAthanSettings(timings, city, dateISO) {
    var container = document.getElementById('prayerAthanSettings');
    if (!container) return;
    clearEl(container);

    buildToggleRow(container, tStr('prayer.enable_athan'), getAthan(), function(val) {
      onAthanMasterToggle(val, timings, city, dateISO);
    }, 'prayer-master-toggle');

    var togglesWrap = cel('div', 'prayer-per-toggles' + (getAthan() ? '' : ' prayer-per-toggles--dim'));
    togglesWrap.id = 'prayerTogglesWrap';
    var toggles = getToggles();
    window.PrayerLogic.NOTIF_PRAYERS.forEach(function(name) {
      var isOn = toggles[name] !== false;
      buildToggleRow(togglesWrap, tStr(PRAYER_I18N[name] || name), isOn, function(val) {
        onPrayerToggle(name, val, timings, city, dateISO);
      });
    });
    container.appendChild(togglesWrap);
  }

  function openSettings() {
    var overlay = document.getElementById('prayerSettingsOverlay');
    if (overlay) overlay.classList.add('open');
  }

  function closeSettings() {
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
    if (getAthan() && _currentTimings) {
      await window.PrayerNotifications.scheduleAthanNotifications(
        _currentTimings, city, getToggles(), _currentDateISO, true
      );
    }
  }

  async function onAthanMasterToggle(val, timings, city, dateISO) {
    setAthan(val);
    var wrap = document.getElementById('prayerTogglesWrap');
    if (wrap) wrap.classList.toggle('prayer-per-toggles--dim', !val);

    if (!val) {
      await window.PrayerNotifications.cancelAllAthanNotifications();
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
        return;
      }
    }

    await window.PrayerNotifications.scheduleAthanNotifications(
      timings, city, getToggles(), dateISO, granted
    );
  }

  async function onPrayerToggle(name, val, timings, city, dateISO) {
    var toggles = getToggles();
    toggles[name] = val;
    setToggles(toggles);
    if (getAthan()) {
      await window.PrayerNotifications.scheduleAthanNotifications(
        timings, city, toggles, dateISO, true
      );
    }
  }

  // ─── Auto-schedule on start/foreground ────────────────────────────────────

  async function initScheduleOnStart() {
    if (!getAthan()) return;
    var today = window.PrayerLogic.todayBaghdad();
    if (localStorage.getItem('prayerLastScheduleDate') === today) return;
    var city = getCity();
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today);
      await window.PrayerNotifications.scheduleAthanNotifications(
        data.timings, city, getToggles(), today, true
      );
    } catch(e) {}
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

  window.PrayerUI = {
    render: render,
    refresh: refresh,
    redraw: redraw,
    invalidate: function(){ _renderedKey = null; },
    openSettings: openSettings,
    openQibla: openQibla,
    initScheduleOnStart: initScheduleOnStart
  };

})();
