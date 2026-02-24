/**
 * Prayer Times UI
 * Renders the prayer times panel, handles city/method selection,
 * countdown timer, and athan notification settings.
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

  var CITIES = ['Duhok', 'Erbil', 'Sulaymaniyah', 'Zakho'];

  function tStr(key, replacements) {
    return window.t ? window.t(key, replacements) : key;
  }

  var PRAYER_I18N = {
    Fajr:    'prayer.fajr',
    Sunrise: 'prayer.sunrise',
    Dhuhr:   'prayer.dhuhr',
    Asr:     'prayer.asr',
    Maghrib: 'prayer.maghrib',
    Isha:    'prayer.isha'
  };

  function getCity()    { return (window.S && S.prayerCity)   || localStorage.getItem('prayerCity')   || 'Duhok'; }
  function getMethod()  { return (window.S ? S.prayerMethod   : null) || parseInt(localStorage.getItem('prayerMethod') || '13'); }
  function getAthan()   { return window.S ? S.prayerAthanEnabled : localStorage.getItem('prayerAthanEnabled') === 'true'; }
  function getToggles() {
    if (window.S && S.prayerToggles) return S.prayerToggles;
    try { return JSON.parse(localStorage.getItem('prayerToggles') || '{}'); } catch(e) { return {}; }
  }
  function getFormat()  { return localStorage.getItem('prayerTimeFormat') || '24'; }

  function setCity(v)    { if (window.S) S.prayerCity = v;           localStorage.setItem('prayerCity', v); }
  function setMethod(v)  { if (window.S) S.prayerMethod = v;         localStorage.setItem('prayerMethod', String(v)); }
  function setAthan(v)   { if (window.S) S.prayerAthanEnabled = v;   localStorage.setItem('prayerAthanEnabled', String(v)); }
  function setToggles(v) { if (window.S) S.prayerToggles = v;        localStorage.setItem('prayerToggles', JSON.stringify(v)); }
  function setFormat(v)  { localStorage.setItem('prayerTimeFormat', v); }

  function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function cel(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  // ─── Countdown ──────────────────────────────────────────────────────────────

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
      cdEl.textContent  = pl.formatCountdown(next.time - now);
      nameEl.textContent = tStr(PRAYER_I18N[next.name] || next.name);
      document.querySelectorAll('.prayer-item[data-prayer]').forEach(function(el) {
        el.classList.toggle('prayer-item--next', el.dataset.prayer === next.name);
      });
    } else {
      if (_tomorrowTimings && _tomorrowDateISO) {
        var fajrAt = pl.parseAsDate(_tomorrowTimings.Fajr, _tomorrowDateISO);
        cdEl.textContent  = pl.formatCountdown(fajrAt - now);
        nameEl.textContent = tStr('prayer.fajr') + ' — ' + tStr('prayer.tomorrow');
      } else {
        cdEl.textContent  = '--:--:--';
        nameEl.textContent = tStr('prayer.fajr');
        fetchTomorrow();
      }
      document.querySelectorAll('.prayer-item[data-prayer]').forEach(function(el) {
        el.classList.remove('prayer-item--next');
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  async function render() {
    var container = document.getElementById('prayerContent');
    if (!container) return;

    var city  = getCity();
    var today = window.PrayerLogic.todayBaghdad();

    // Show instantly if monthly cache already has today's data
    var parts   = today.split('-').map(Number);
    var mkey    = window.PrayerCache.monthKey(city, parts[0], parts[1]);
    var monthly = window.PrayerCache.read(mkey);
    var hasDay  = monthly && monthly.days &&
                  (monthly.days[parts[2]] || monthly.days[String(parts[2])]);

    if (!hasDay) buildLoading(container);

    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today);
      _currentTimings = data.timings;
      _currentDateISO = today;
      _currentData    = data;
      buildPanel(container, data, city, today);
      startCountdown();
    } catch(e) {
      if (!hasDay) buildError(container);
    }
  }

  async function refresh() {
    var container = document.getElementById('prayerContent');
    if (!container) return;
    var city  = getCity();
    var today = window.PrayerLogic.todayBaghdad();

    // Clear monthly cache so fresh data is fetched
    var parts = today.split('-').map(Number);
    window.PrayerCache.clear(window.PrayerCache.monthKey(city, parts[0], parts[1]));

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

  // ─── DOM builders ────────────────────────────────────────────────────────────

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
    var br1 = document.createElement('br');
    var br2 = document.createElement('br');
    var btn = cel('button', 'prayer-retry-btn');
    btn.textContent = tStr('prayer.retry');
    btn.onclick = refresh;
    d.appendChild(br1);
    d.appendChild(br2);
    d.appendChild(btn);
    container.appendChild(d);
  }

  function buildPanel(container, data, city, today) {
    clearEl(container);
    var timings  = data.timings;
    var dateInfo = data.date;

    // ── City selector ──
    var selWrap = cel('div', 'prayer-selectors');
    var seg = cel('div', 'prayer-city-seg');
    CITIES.forEach(function(c) {
      var btn = cel('button', 'prayer-city-btn' + (c === city ? ' on' : ''));
      btn.textContent = c;
      btn.onclick = function() { onCityChange(c); };
      seg.appendChild(btn);
    });
    selWrap.appendChild(seg);

    // ── 12h / 24h format toggle ──
    var fmt = getFormat();
    var fmtRow = cel('div', 'prayer-fmt-row');
    var fmtSeg = cel('div', 'prayer-city-seg prayer-fmt-seg');
    ['24', '12'].forEach(function(f) {
      var btn = cel('button', 'prayer-city-btn' + (f === fmt ? ' on' : ''));
      btn.textContent = f === '24' ? '24h' : '12h';
      btn.onclick = function() { onFormatChange(f); };
      fmtSeg.appendChild(btn);
    });
    fmtRow.appendChild(fmtSeg);
    selWrap.appendChild(fmtRow);

    container.appendChild(selWrap);

    // ── Dates row ──
    var datesRow = cel('div', 'prayer-dates');
    var greg = cel('div', 'prayer-date-greg');
    if (dateInfo && dateInfo.gregorian) {
      // Aladhan fallback: full gregorian object
      greg.textContent = dateInfo.gregorian.weekday.en + ', ' +
                         dateInfo.gregorian.day + ' ' +
                         dateInfo.gregorian.month.en + ' ' +
                         dateInfo.gregorian.year;
    } else {
      // amozhgary source: derive from dateISO
      var gregDate = new Date(today + 'T12:00:00+03:00');
      greg.textContent = gregDate.toLocaleDateString('en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'Asia/Baghdad'
      });
    }
    var hijri = cel('div', 'prayer-date-hijri');
    if (dateInfo && dateInfo.hijri) {
      // Aladhan fallback format
      hijri.textContent = dateInfo.hijri.day + ' ' +
                          dateInfo.hijri.month.en + ' ' +
                          dateInfo.hijri.year + ' هـ';
    } else if (dateInfo && dateInfo.hijriStr) {
      // amozhgary format: raw Kurdish string e.g. "25ی شعبان 1447"
      hijri.textContent = dateInfo.hijriStr;
    }
    datesRow.appendChild(greg);
    datesRow.appendChild(hijri);
    container.appendChild(datesRow);

    // ── Next prayer countdown card ──
    var pl   = window.PrayerLogic;
    var next = pl.getNextPrayer(timings, today);
    var nextCard = cel('div', 'prayer-next-card');
    var nextNameEl = cel('div', 'prayer-next-name');
    nextNameEl.id = 'prayerNextName';
    nextNameEl.textContent = next ? tStr(PRAYER_I18N[next.name] || next.name) : tStr('prayer.fajr');
    var nextCd = cel('div', 'prayer-next-countdown');
    nextCd.id = 'prayerCountdown';
    nextCd.textContent = next ? pl.formatCountdown(next.time - new Date()) : '--:--:--';
    nextCard.appendChild(nextNameEl);
    nextCard.appendChild(nextCd);
    container.appendChild(nextCard);

    // ── Prayer list ──
    var list = cel('div', 'prayer-list');
    var use12h = getFormat() === '12';
    pl.PRAYER_ORDER.forEach(function(name) {
      var raw         = timings[name] || '';
      var timeDisplay = pl.formatTime(raw, use12h);
      var isNext      = next && next.name === name;

      var row = cel('div', 'prayer-item' + (isNext ? ' prayer-item--next' : ''));
      row.dataset.prayer = name;

      var nameSpan = cel('span', 'prayer-item-name');
      nameSpan.textContent = tStr(PRAYER_I18N[name] || name);

      var timeSpan = cel('span', 'prayer-item-time');
      timeSpan.textContent = timeDisplay;

      row.appendChild(nameSpan);
      row.appendChild(timeSpan);
      list.appendChild(row);
    });
    container.appendChild(list);

    // ── Athan notifications section ──
    var notifSec = cel('div', 'prayer-notif-section');

    var notifTitle = cel('div', 'prayer-notif-title');
    notifTitle.textContent = tStr('prayer.athan_section');
    notifSec.appendChild(notifTitle);

    buildToggleRow(notifSec, tStr('prayer.enable_athan'), getAthan(), function(val) {
      onAthanMasterToggle(val, timings, city, today);
    }, 'prayer-master-toggle');

    var togglesWrap = cel('div', 'prayer-per-toggles' + (getAthan() ? '' : ' prayer-per-toggles--dim'));
    togglesWrap.id = 'prayerTogglesWrap';
    var toggles = getToggles();
    pl.NOTIF_PRAYERS.forEach(function(name) {
      var isOn = toggles[name] !== false;
      buildToggleRow(togglesWrap, tStr(PRAYER_I18N[name] || name), isOn, function(val) {
        onPrayerToggle(name, val, timings, city, today);
      });
    });
    notifSec.appendChild(togglesWrap);
    container.appendChild(notifSec);
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

  // ─── Event handlers ──────────────────────────────────────────────────────────

  function onFormatChange(fmt) {
    setFormat(fmt);
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
    if (getAthan()) await window.PrayerNotifications.cancelAllAthanNotifications();
    await render();
    if (getAthan() && _currentTimings) {
      await window.PrayerNotifications.scheduleAthanNotifications(
        _currentTimings, city, getToggles(), _currentDateISO, true
      );
    }
  }

  async function onMethodChange(method) {
    setMethod(method);
    if (getAthan()) await window.PrayerNotifications.cancelAllAthanNotifications();
    await render();
    if (getAthan() && _currentTimings) {
      await window.PrayerNotifications.scheduleAthanNotifications(
        _currentTimings, getCity(), getToggles(), _currentDateISO, true
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
      var result = await LN.requestPermissions().catch(function() { return { granted: 'denied' }; });
      granted = result.granted === 'granted';
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

  // ─── Auto-schedule on start/foreground ───────────────────────────────────────

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

  // ─── Export ──────────────────────────────────────────────────────────────────

  window.PrayerUI = {
    render: render,
    refresh: refresh,
    initScheduleOnStart: initScheduleOnStart
  };

})();
