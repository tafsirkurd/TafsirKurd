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
  function getMethod()  { return (window.S ? S.prayerMethod   : null) || parseInt(localStorage.getItem('prayerMethod') || '3'); }
  function getAthan()   { return window.S ? S.prayerAthanEnabled : localStorage.getItem('prayerAthanEnabled') === 'true'; }
  function getToggles() {
    if (window.S && S.prayerToggles) return S.prayerToggles;
    try { return JSON.parse(localStorage.getItem('prayerToggles') || '{}'); } catch(e) { return {}; }
  }

  function setCity(v)    { if (window.S) S.prayerCity = v;           localStorage.setItem('prayerCity', v); }
  function setMethod(v)  { if (window.S) S.prayerMethod = v;         localStorage.setItem('prayerMethod', String(v)); }
  function setAthan(v)   { if (window.S) S.prayerAthanEnabled = v;   localStorage.setItem('prayerAthanEnabled', String(v)); }
  function setToggles(v) { if (window.S) S.prayerToggles = v;        localStorage.setItem('prayerToggles', JSON.stringify(v)); }

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
    var method  = getMethod();
    var pl      = window.PrayerLogic;
    var dateISO = pl.tomorrowBaghdad();
    var ckey    = window.PrayerCache.key(city, method, dateISO);
    var cached  = window.PrayerCache.read(ckey);
    if (cached) {
      _tomorrowTimings = cached.timings;
      _tomorrowDateISO = dateISO;
      return;
    }
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, dateISO, method);
      window.PrayerCache.write(ckey, data);
      _tomorrowTimings = data.timings;
      _tomorrowDateISO = dateISO;
    } catch(e) {}
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  async function render() {
    var container = document.getElementById('prayerContent');
    if (!container) return;

    var city   = getCity();
    var method = getMethod();
    var pl     = window.PrayerLogic;
    var today  = pl.todayBaghdad();
    var ckey   = window.PrayerCache.key(city, method, today);
    var cached = window.PrayerCache.read(ckey);

    if (cached) {
      _currentTimings = cached.timings;
      _currentDateISO = today;
      buildPanel(container, cached, city, method, today);
      startCountdown();
      fetchAndUpdate(container, city, method, today, ckey);
    } else {
      buildLoading(container);
      try {
        var data = await window.PrayerAPI.fetchPrayerTimes(city, today, method);
        window.PrayerCache.write(ckey, data);
        _currentTimings = data.timings;
        _currentDateISO = today;
        buildPanel(container, data, city, method, today);
        startCountdown();
      } catch(e) {
        buildError(container);
      }
    }
  }

  async function fetchAndUpdate(container, city, method, today, ckey) {
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today, method);
      window.PrayerCache.write(ckey, data);
      _currentTimings = data.timings;
      buildPanel(container, data, city, method, today);
      startCountdown();
    } catch(e) {}
  }

  async function refresh() {
    var container = document.getElementById('prayerContent');
    if (!container) return;
    var city   = getCity();
    var method = getMethod();
    var today  = window.PrayerLogic.todayBaghdad();
    var ckey   = window.PrayerCache.key(city, method, today);
    buildLoading(container);
    stopCountdown();
    _currentTimings  = null;
    _tomorrowTimings = null;
    try {
      var data = await window.PrayerAPI.fetchPrayerTimes(city, today, method);
      window.PrayerCache.write(ckey, data);
      _currentTimings = data.timings;
      _currentDateISO = today;
      buildPanel(container, data, city, method, today);
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

  function buildPanel(container, data, city, method, today) {
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

    // ── Method selector ──
    var methodSel = cel('select', 'prayer-method-sel');
    var opt3 = document.createElement('option');
    opt3.value = '3';
    opt3.textContent = tStr('prayer.method_mwl');
    if (method === 3) opt3.selected = true;
    var opt4 = document.createElement('option');
    opt4.value = '4';
    opt4.textContent = tStr('prayer.method_uaq');
    if (method === 4) opt4.selected = true;
    methodSel.appendChild(opt3);
    methodSel.appendChild(opt4);
    methodSel.onchange = function() { onMethodChange(parseInt(this.value, 10)); };
    selWrap.appendChild(methodSel);
    container.appendChild(selWrap);

    // ── Dates row ──
    var datesRow = cel('div', 'prayer-dates');
    var greg = cel('div', 'prayer-date-greg');
    if (dateInfo && dateInfo.gregorian) {
      greg.textContent = dateInfo.gregorian.weekday.en + ', ' +
                         dateInfo.gregorian.day + ' ' +
                         dateInfo.gregorian.month.en + ' ' +
                         dateInfo.gregorian.year;
    } else {
      greg.textContent = today;
    }
    var hijri = cel('div', 'prayer-date-hijri');
    if (dateInfo && dateInfo.hijri) {
      hijri.textContent = dateInfo.hijri.day + ' ' +
                          dateInfo.hijri.month.en + ' ' +
                          dateInfo.hijri.year + ' هـ';
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
    pl.PRAYER_ORDER.forEach(function(name) {
      var raw         = timings[name] || '';
      var timeDisplay = raw.split(' ')[0];
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

    var city   = getCity();
    var method = getMethod();
    var ckey   = window.PrayerCache.key(city, method, today);
    var data   = window.PrayerCache.read(ckey);

    if (!data) {
      try {
        data = await window.PrayerAPI.fetchPrayerTimes(city, today, method);
        window.PrayerCache.write(ckey, data);
      } catch(e) { return; }
    }

    await window.PrayerNotifications.scheduleAthanNotifications(
      data.timings, city, getToggles(), today, true
    );
  }

  // ─── Export ──────────────────────────────────────────────────────────────────

  window.PrayerUI = {
    render: render,
    refresh: refresh,
    initScheduleOnStart: initScheduleOnStart
  };

})();
