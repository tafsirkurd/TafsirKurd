/**
 * Prayer Times API
 *
 * Source priority:
 *   1. localStorage cache  — instant, checked first every time
 *   2. Static annual JSON  — /prayer-data/{year}/{city}.json (CDN, no scraping)
 *                            Generated once a year via scripts/fetch-prayer-year.js.
 *                            Corrections: re-run the script for the affected city/month,
 *                            push → deploy → propagates within 1 hour via backgroundRefresh.
 *   3. CF Worker           — /prayer-kurd (scrapes amozhgary.tv on demand, fallback)
 *   4. Aladhan API         — /v1/timings method=13 (Diyanet, last resort)
 *
 * method param in fetchPrayerTimes() is kept for API compatibility but ignored.
 */
(function() {
  'use strict';

  var KURD_BASE = 'https://tafsirkurd.com';

  // Coordinates for all 20 supported cities (used as Aladhan fallback + Qibla compass)
  var CITY_COORDS = {
    'Sulaymaniyah': { lat: 35.5580, lon: 45.4350 },
    'Erbil':        { lat: 36.1914, lon: 44.0091 },
    'Duhok':        { lat: 36.8686, lon: 42.9450 },
    'Kirkuk':       { lat: 35.4681, lon: 44.3922 },
    'Halabja':      { lat: 35.1787, lon: 45.9862 },
    'Kfry':         { lat: 35.6464, lon: 44.6329 },
    'Rania':        { lat: 36.2563, lon: 44.8780 },
    'Koya':         { lat: 36.0869, lon: 44.6210 },
    'Qaladze':      { lat: 36.1804, lon: 45.1237 },
    'Zakho':        { lat: 37.1397, lon: 42.6844 },
    'Bardarash':    { lat: 36.5012, lon: 43.6564 },
    'Mosul':        { lat: 36.3350, lon: 43.1189 },
    'Darbandikhan': { lat: 35.1098, lon: 45.6943 },
    'Kalar':        { lat: 34.6235, lon: 45.3221 },
    'Akre':         { lat: 36.7490, lon: 43.8863 },
    'Daquq':        { lat: 35.2380, lon: 44.3600 },
    'Makhmur':      { lat: 35.7763, lon: 43.5923 },
    'Mandali':      { lat: 33.7455, lon: 45.5574 },
    'Qarahanjir':   { lat: 34.1786, lon: 45.3850 },
    'DuzKhormatou': { lat: 34.8453, lon: 44.9580 }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  var REQUIRED_PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  function _isValidHHMM(s) {
    if (typeof s !== 'string') return false;
    var m = s.trim().split(' ')[0].match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return false;
    var h = parseInt(m[1], 10), min = parseInt(m[2], 10);
    return h >= 0 && h <= 23 && min >= 0 && min <= 59;
  }

  /**
   * Validate a monthly data object from amozhgary.tv.
   * Requires: data.days exists, and at least 80% of days in the month have
   * all six required prayer fields as valid HH:MM strings.
   */
  function _validateMonthly(data, year, month) {
    if (!data || typeof data !== 'object' || !data.days) return false;
    var days = data.days;
    var daysInMonth = new Date(year, month, 0).getDate();
    var validCount = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var day = days[d] || days[String(d)];
      if (!day) continue;
      var allValid = true;
      for (var pi = 0; pi < REQUIRED_PRAYERS.length; pi++) {
        if (!_isValidHHMM(day[REQUIRED_PRAYERS[pi]])) { allValid = false; break; }
      }
      if (allValid) validCount++;
    }
    return validCount >= Math.floor(daysInMonth * 0.8);
  }

  // ── Debug info ──────────────────────────────────────────────────────────────

  function _storeDebugInfo(source, mkey) {
    try {
      localStorage.setItem('lastPrayerFetchAt', String(Date.now()));
      localStorage.setItem('lastPrayerSource',   source);
      localStorage.setItem('lastPrayerMonthKey', mkey);
    } catch(e) {}
  }

  // ── Next-month prefetch ─────────────────────────────────────────────────────

  function _prefetchNextMonthIfNearEnd(city, year, month, day) {
    var daysInMonth = new Date(year, month, 0).getDate();
    if (daysInMonth - day > 6) return; // not near end — skip
    var ny = month === 12 ? year + 1 : year;
    var nm = month === 12 ? 1 : month + 1;
    var nextKey = window.PrayerCache.monthKey(city, ny, nm);
    if (window.PrayerCache.read(nextKey)) return; // already cached

    // Try static CDN first (fast, no scraping), fall back to CF Worker
    _fetchFromStatic(city, ny, nm, nextKey)
      .then(function() {
        console.log('[PrayerAPI] prefetched next month (static):', city, ny + '-' + nm);
      })
      .catch(function() {
        // Static missing (e.g. next year not yet pre-fetched) → try Worker
        return _fetchFromWorker(city, ny, nm, nextKey)
          .then(function() {
            console.log('[PrayerAPI] prefetched next month (worker):', city, ny + '-' + nm);
          });
      })
      .catch(function() {}); // prefetch is best-effort — swallow all errors
  }

  // ── Static annual JSON ──────────────────────────────────────────────────────

  /**
   * Fetch a month's data from the static annual JSON file on the CDN.
   * Files live at /prayer-data/{year}/{city}.json and are generated once a year
   * by scripts/fetch-prayer-year.js.
   * Returns the monthly object { city, year, month, days } or throws.
   */
  async function _fetchFromStatic(city, year, month, mkey) {
    var url = '/prayer-data/' + year + '/' + city + '.json';
    var _ctrl = new AbortController();
    var _tid  = setTimeout(function(){ _ctrl.abort(); }, 5000);
    var res;
    try { res = await fetch(url, { signal: _ctrl.signal }); }
    finally { clearTimeout(_tid); }
    if (!res.ok) throw new Error('static-' + res.status);
    var annual = await res.json();
    var monthDays = annual.months && (annual.months[month] || annual.months[String(month)]);
    if (!monthDays || typeof monthDays !== 'object') throw new Error('static-month-missing');
    var monthly = { city: city, year: year, month: month, days: monthDays };
    if (!_validateMonthly(monthly, year, month)) throw new Error('static-validation-failed');
    window.PrayerCache.writeWithMeta(mkey, monthly, {
      fetchedAt:   Date.now(),
      source:      'static',
      city:        city,
      year:        year,
      month:       month,
      generatedAt: annual.generatedAt || 0  // used by backgroundRefresh to detect corrections
    });
    _storeDebugInfo('static', mkey);
    return monthly;
  }

  /**
   * Fetch a month's data from the CF Worker (scrapes amozhgary.tv on demand).
   * Used as fallback when static file is missing, and as correction source in
   * backgroundRefresh when the static file's generatedAt is newer than cached.
   */
  async function _fetchFromWorker(city, year, month, mkey) {
    var url = KURD_BASE + '/prayer-kurd?city=' + encodeURIComponent(city) +
              '&year=' + year + '&month=' + month;
    var _ctrl = new AbortController();
    var _tid  = setTimeout(function(){ _ctrl.abort(); }, 10000);
    var res;
    try { res = await fetch(url, { signal: _ctrl.signal }); }
    finally { clearTimeout(_tid); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var monthly = await res.json();
    if (monthly.error) throw new Error(monthly.error);
    if (!_validateMonthly(monthly, year, month)) throw new Error('validation-failed');
    window.PrayerCache.writeWithMeta(mkey, monthly, {
      fetchedAt: Date.now(), source: 'kurd', city: city, year: year, month: month
    });
    _storeDebugInfo('kurd', mkey);
    return monthly;
  }

  // ── Main fetch ──────────────────────────────────────────────────────────────

  /**
   * Fetch prayer times for a city on a specific date.
   *
   * Source order:
   *   1. localStorage cache (instant)
   *   2. Static annual JSON on CDN (/prayer-data/{year}/{city}.json)
   *   3. CF Worker (/prayer-kurd — scrapes amozhgary.tv)
   *   4. Aladhan API method=13 (last resort)
   *
   * @param {string}      city    — "Duhok" | "Erbil" | "Sulaymaniyah" | etc.
   * @param {string|null} dateISO — "YYYY-MM-DD" (Baghdad date) or null for today
   * @param {number}      method  — ignored (kept for backwards compat)
   * @returns {Promise<{timings, date}>}
   */
  async function fetchPrayerTimes(city, dateISO, method) {
    var today = dateISO ||
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
    var parts = today.split('-').map(Number);
    var year  = parts[0];
    var month = parts[1];
    var day   = parts[2];

    var mkey    = window.PrayerCache.monthKey(city, year, month);
    var monthly = window.PrayerCache.read(mkey);   // ── 1. localStorage ──

    if (!monthly) {
      // ── 2. Static annual JSON ──
      try {
        monthly = await _fetchFromStatic(city, year, month, mkey);
        _prefetchNextMonthIfNearEnd(city, year, month, day);
        console.log('[PrayerAPI] source=static city=' + city + ' ' + year + '-' + month);
      } catch(e) {
        console.warn('[PrayerAPI] static failed:', e && e.message);
        monthly = null;
      }
    }

    if (!monthly) {
      // ── 3. CF Worker ──
      try {
        monthly = await _fetchFromWorker(city, year, month, mkey);
        _prefetchNextMonthIfNearEnd(city, year, month, day);
        console.log('[PrayerAPI] source=worker city=' + city + ' ' + year + '-' + month);
      } catch(e) {
        console.warn('[PrayerAPI] worker failed:', e && e.message, '— trying Aladhan');
        monthly = null;
      }
    }

    if (monthly && monthly.days) {
      var dayData = monthly.days[day] || monthly.days[String(day)];
      if (dayData) {
        return {
          timings: {
            Fajr: dayData.Fajr, Sunrise: dayData.Sunrise, Dhuhr: dayData.Dhuhr,
            Asr:  dayData.Asr,  Maghrib: dayData.Maghrib, Isha:  dayData.Isha
          },
          date: { hijriStr: dayData.hijri || null }
        };
      }
    }

    // ── 4. Aladhan fallback ──
    var fallbackResult = await fetchFromAladhan(city, today, 13);
    _storeDebugInfo('aladhan', mkey);
    return fallbackResult;
  }

  /**
   * Try the bundled static annual JSON only — no network-only fallbacks.
   * Used in the offline path so Worker/Aladhan fetches (which fail offline)
   * are never attempted. In Capacitor the static fetch hits the local bundle,
   * so this works even with no internet connection.
   * Also writes the month to localStorage so subsequent calls hit readCacheNow.
   */
  async function fetchFromBundled(city, dateISO) {
    var parts = dateISO.split('-').map(Number);
    var year  = parts[0], month = parts[1], day = parts[2];
    var mkey  = window.PrayerCache.monthKey(city, year, month);
    var monthly = await _fetchFromStatic(city, year, month, mkey);
    var d = monthly.days[day] || monthly.days[String(day)];
    if (!d || !d.Fajr) throw new Error('bundled-day-missing');
    return {
      timings: { Fajr: d.Fajr, Sunrise: d.Sunrise, Dhuhr: d.Dhuhr,
                 Asr: d.Asr, Maghrib: d.Maghrib, Isha: d.Isha },
      date: { hijriStr: d.hijri || null },
      _fromCache: true
    };
  }

  async function fetchFromAladhan(city, dateISO, aladhanMethod) {
    var coords = CITY_COORDS[city];
    if (!coords) throw new Error('Unknown city: ' + city);
    var params = 'latitude=' + coords.lat + '&longitude=' + coords.lon +
                 '&method=' + aladhanMethod;
    var url;
    if (dateISO) {
      var ts = Math.floor(new Date(dateISO + 'T09:00:00Z').getTime() / 1000);
      url = 'https://api.aladhan.com/v1/timings/' + ts + '?' + params;
    } else {
      url = 'https://api.aladhan.com/v1/timings?' + params;
    }
    var res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var json = await res.json();
    if (!json || json.code !== 200) {
      throw new Error('Aladhan error: ' + (json && json.status ? json.status : 'unknown'));
    }
    return json.data; // { timings:{...}, date:{gregorian,hijri} }
  }

  // ── Background refresh ──────────────────────────────────────────────────────

  // 4-hour age limit within the same Baghdad day.
  // backgroundRefresh ALSO fires on every new Baghdad calendar day regardless of age.
  // Effect: prayer times are re-fetched from amozhgary.tv at least once per day,
  // and again after 4h if the user stays in the app — never more than 4h stale.
  var STALE_MS = 4 * 60 * 60 * 1000;
  // In-flight guard keyed by mkey — prevents duplicate concurrent fetches when
  // render() is called multiple times rapidly while cache is stale (e.g. tab
  // switch away and back before the first fetch resolves).
  var _bgInFlight = {};

  /**
   * Silently re-fetch prayer data in the background when the cache is stale.
   * Also detects deployed corrections: if the static annual JSON has a newer
   * generatedAt than what's stored in localStorage, it updates immediately
   * even if the cache isn't otherwise stale.
   *
   * Source order: static annual JSON → CF Worker → give up (non-fatal).
   * Never blocks the caller. At most one fetch per mkey in flight at a time.
   *
   * @param {string}   city        — city name
   * @param {string}   dateISO     — "YYYY-MM-DD"
   * @param {Function} onFreshData — called with {timings, date} only if today's data changed
   */
  function backgroundRefresh(city, dateISO, onFreshData) {
    var parts = dateISO.split('-').map(Number);
    var year = parts[0], month = parts[1], day = parts[2];
    var mkey = window.PrayerCache.monthKey(city, year, month);

    var _meta    = window.PrayerCache.readMeta(mkey);
    var _isStale = window.PrayerCache.isStale(mkey, STALE_MS);

    if (!_isStale) {
      var _age = _meta ? Math.round((Date.now() - _meta.fetchedAt) / 3600000) : '?';
      console.log('[PrayerCache] status=valid_cache city=' + city + ' date=' + dateISO + ' age=' + _age + 'h source=' + (_meta && _meta.source || 'unknown'));
    }
    // Even if cache is not stale, still check for corrections (generatedAt mismatch).
    // We'll fire the static fetch below in all cases; it exits early if nothing changed.

    if (_bgInFlight[mkey]) return;
    _bgInFlight[mkey] = true;

    if (_isStale) {
      var _staleAge    = _meta ? Math.round((Date.now() - _meta.fetchedAt) / 3600000) : 'n/a';
      var _staleReason = !_meta ? 'no_cache' :
        (new Date(_meta.fetchedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' }) !==
         new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' }) ? 'new_baghdad_day' : 'age_' + _staleAge + 'h');
      console.log('[PrayerCache] status=stale reason=' + _staleReason + ' city=' + city + ' date=' + dateISO + ' — refreshing');
    }

    // Snapshot today's old data before any overwrite
    var _oldMonthly = window.PrayerCache.read(mkey);
    var _oldDay     = _oldMonthly && _oldMonthly.days
      ? (_oldMonthly.days[day] || _oldMonthly.days[String(day)]) : null;

    function _notifyIfChanged(freshDay, source) {
      if (!freshDay) return;
      if (_oldDay && JSON.stringify(_oldDay) === JSON.stringify(freshDay)) {
        console.log('[PrayerCache] status=refresh_no_change source=' + source + ' city=' + city + ' date=' + dateISO);
        return;
      }
      var _oldFajr = _oldDay ? _oldDay.Fajr : 'none';
      console.log('[PrayerTimes] changed source=' + source + ' old_fajr=' + _oldFajr + ' new_fajr=' + freshDay.Fajr + ' city=' + city + ' date=' + dateISO);
      onFreshData({
        timings: {
          Fajr: freshDay.Fajr, Sunrise: freshDay.Sunrise, Dhuhr: freshDay.Dhuhr,
          Asr:  freshDay.Asr,  Maghrib: freshDay.Maghrib, Isha:  freshDay.Isha
        },
        date: { hijriStr: freshDay.hijri || null }
      });
    }

    // ── Step 1: try static annual JSON ──────────────────────────────────────
    var _staticUrl  = '/prayer-data/' + year + '/' + city + '.json';
    var _staticCtrl = new AbortController();
    var _staticTid  = setTimeout(function(){ _staticCtrl.abort(); }, 5000);

    fetch(_staticUrl, { signal: _staticCtrl.signal })
      .then(function(r) { clearTimeout(_staticTid); return r.ok ? r.json() : Promise.reject('static-' + r.status); })
      .catch(function(e) { clearTimeout(_staticTid); return Promise.reject(e); })
      .then(function(annual) {
        var monthDays = annual.months && (annual.months[month] || annual.months[String(month)]);
        if (!monthDays) throw new Error('static-month-missing');

        var staticGeneratedAt = annual.generatedAt || 0;
        var cachedGeneratedAt = _meta && _meta.generatedAt ? _meta.generatedAt : 0;

        // If static file is same version and cache is not stale → nothing to do
        if (!_isStale && staticGeneratedAt <= cachedGeneratedAt) {
          console.log('[PrayerCache] status=static_same_version city=' + city + ' date=' + dateISO);
          return;
        }

        var monthly = { city: city, year: year, month: month, days: monthDays };
        if (!_validateMonthly(monthly, year, month)) throw new Error('static-validation-failed');

        window.PrayerCache.writeWithMeta(mkey, monthly, {
          fetchedAt:   Date.now(),
          source:      'static-bg',
          city:        city,
          year:        year,
          month:       month,
          generatedAt: staticGeneratedAt
        });
        _storeDebugInfo('static-bg', mkey);
        _prefetchNextMonthIfNearEnd(city, year, month, day);

        var freshDay = monthDays[day] || monthDays[String(day)];
        _notifyIfChanged(freshDay, 'static-bg');
      })
      .catch(function(staticErr) {
        // ── Step 2: static unavailable → try Worker ──────────────────────────
        if (!_isStale) return; // static failed but cache is fresh — don't bother Worker
        console.log('[PrayerAPI] static-bg failed (' + (staticErr && (staticErr.message || staticErr)) + ') — trying worker');

        var _wUrl  = KURD_BASE + '/prayer-kurd?city=' + encodeURIComponent(city) + '&year=' + year + '&month=' + month;
        var _wCtrl = new AbortController();
        var _wTid  = setTimeout(function(){ _wCtrl.abort(); }, 10000);
        return fetch(_wUrl, { signal: _wCtrl.signal })
          .then(function(r) { clearTimeout(_wTid); return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
          .catch(function(e) { clearTimeout(_wTid); return Promise.reject(e); })
          .then(function(fresh) {
            if (!fresh || fresh.error) throw new Error(fresh && fresh.error ? fresh.error : 'empty');
            if (!_validateMonthly(fresh, year, month)) throw new Error('validation-failed');
            window.PrayerCache.writeWithMeta(mkey, fresh, {
              fetchedAt: Date.now(), source: 'kurd-bg', city: city, year: year, month: month
            });
            _storeDebugInfo('kurd-bg', mkey);
            _prefetchNextMonthIfNearEnd(city, year, month, day);
            var freshDay = fresh.days[day] || fresh.days[String(day)];
            _notifyIfChanged(freshDay, 'kurd-bg');
          });
      })
      .catch(function(e) {
        console.log('[PrayerAPI] backgroundRefresh failed (non-fatal):', e && (e.message || e));
      })
      .then(function() {
        // Always release the in-flight lock whether fetch succeeded or failed
        delete _bgInFlight[mkey];
      });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  window.PrayerAPI = {
    fetchPrayerTimes:  fetchPrayerTimes,
    backgroundRefresh: backgroundRefresh,
    fetchFromBundled:  fetchFromBundled,
    CITY_COORDS:       CITY_COORDS
  };

})();
