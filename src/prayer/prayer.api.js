/**
 * Prayer Times API
 *
 * Primary source: amozhgary.tv (official Kurdistan timetable) via
 *   TafsirKurd CF function at /prayer-kurd
 *   — fetches a full month at once, cached in localStorage per month.
 *
 * Fallback: Aladhan API /v1/timings with method=13 (Diyanet / Turkey).
 *
 * method param in fetchPrayerTimes() is kept for API compatibility but ignored
 * — the source is now always amozhgary.tv (or Aladhan as fallback).
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
    var url = KURD_BASE + '/prayer-kurd?city=' + encodeURIComponent(city) +
              '&year=' + ny + '&month=' + nm;
    fetch(url)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d || d.error || !_validateMonthly(d, ny, nm)) return;
        window.PrayerCache.writeWithMeta(nextKey, d, {
          fetchedAt: Date.now(), source: 'kurd', city: city, year: ny, month: nm
        });
        console.log('[PrayerAPI] prefetched next month:', city, ny + '-' + nm);
      })
      .catch(function() {});
  }

  // ── Main fetch ──────────────────────────────────────────────────────────────

  /**
   * Fetch prayer times for a city on a specific date.
   * Tries amozhgary.tv monthly data first, falls back to Aladhan method=13.
   *
   * @param {string}      city    — "Duhok" | "Erbil" | "Sulaymaniyah" | "Zakho"
   * @param {string|null} dateISO — "YYYY-MM-DD" (Baghdad date) or null for today
   * @param {number}      method  — ignored (kept for backwards compat)
   * @returns {Promise<{timings, date}>}
   *   timings: { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha } in HH:MM 24h Baghdad time
   *   date:    { hijriStr? } or full Aladhan date object on fallback
   */
  async function fetchPrayerTimes(city, dateISO, method) {
    var today = dateISO ||
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
    var parts = today.split('-').map(Number);
    var year  = parts[0];
    var month = parts[1];
    var day   = parts[2];

    // ── Primary: amozhgary.tv via CF function (monthly cache) ──
    var mkey    = window.PrayerCache.monthKey(city, year, month);
    var monthly = window.PrayerCache.read(mkey);

    if (!monthly) {
      try {
        var url = KURD_BASE + '/prayer-kurd?city=' + encodeURIComponent(city) +
                  '&year=' + year + '&month=' + month;
        var res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        monthly = await res.json();
        if (monthly.error) throw new Error(monthly.error);
        if (!_validateMonthly(monthly, year, month)) throw new Error('validation-failed');
        window.PrayerCache.writeWithMeta(mkey, monthly, {
          fetchedAt: Date.now(), source: 'kurd', city: city, year: year, month: month
        });
        _storeDebugInfo('kurd', mkey);
        _prefetchNextMonthIfNearEnd(city, year, month, day);
      } catch(e) {
        console.warn('[PrayerAPI] primary fetch failed:', e && e.message, '— falling back to Aladhan');
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

    // ── Fallback: Aladhan method=13 (Diyanet) ──
    var fallbackResult = await fetchFromAladhan(city, today, 13);
    _storeDebugInfo('aladhan', mkey);
    return fallbackResult;
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
   * Silently re-fetch the monthly cache in the background if it's older than
   * STALE_MS. If today's timings changed, calls onFreshData(newData).
   * Never blocks the caller — always fires and forgets.
   * At most one fetch per mkey is in flight at any time.
   *
   * @param {string}   city      — city name
   * @param {string}   dateISO   — "YYYY-MM-DD"
   * @param {Function} onFreshData — called with {timings, date} only if today's data changed
   */
  function backgroundRefresh(city, dateISO, onFreshData) {
    var parts = dateISO.split('-').map(Number);
    var year = parts[0], month = parts[1], day = parts[2];
    var mkey = window.PrayerCache.monthKey(city, year, month);

    // isStale: true if fetched on a different Baghdad calendar day OR >6h same day
    if (!window.PrayerCache.isStale(mkey, STALE_MS)) {
      var _meta = window.PrayerCache.readMeta(mkey);
      var _age  = _meta ? Math.round((Date.now() - _meta.fetchedAt) / 3600000) : '?';
      console.log('[PrayerCache] status=valid_cache city=' + city + ' date=' + dateISO + ' age=' + _age + 'h source=' + (_meta && _meta.source || 'unknown'));
      return;
    }

    // Only one fetch per month key in flight at a time
    if (_bgInFlight[mkey]) return;
    _bgInFlight[mkey] = true;

    var _staleMeta = window.PrayerCache.readMeta(mkey);
    var _staleAge  = _staleMeta ? Math.round((Date.now() - _staleMeta.fetchedAt) / 3600000) : 'n/a';
    var _staleReason = !_staleMeta ? 'no_cache' :
      (new Date(_staleMeta.fetchedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' }) !==
       new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' }) ? 'new_baghdad_day' : 'age_' + _staleAge + 'h');
    console.log('[PrayerCache] status=stale reason=' + _staleReason + ' city=' + city + ' date=' + dateISO + ' — refreshing');

    var url = KURD_BASE + '/prayer-kurd?city=' + encodeURIComponent(city) +
              '&year=' + year + '&month=' + month;

    fetch(url)
      .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
      .then(function(fresh) {
        if (!fresh || fresh.error) throw new Error(fresh && fresh.error ? fresh.error : 'empty');
        if (!_validateMonthly(fresh, year, month)) throw new Error('validation-failed');

        // Snapshot today's old timings before overwriting
        var oldMonthly = window.PrayerCache.read(mkey);
        var oldDay = oldMonthly && oldMonthly.days
          ? (oldMonthly.days[day] || oldMonthly.days[String(day)]) : null;

        // Always write fresh data with updated fetchedAt
        window.PrayerCache.writeWithMeta(mkey, fresh, {
          fetchedAt: Date.now(), source: 'kurd-bg', city: city, year: year, month: month
        });
        _storeDebugInfo('kurd-bg', mkey);
        _prefetchNextMonthIfNearEnd(city, year, month, day);

        // Only notify caller if today's prayer times actually changed
        var freshDay = fresh.days[day] || fresh.days[String(day)];
        if (!freshDay) return;
        if (oldDay && JSON.stringify(oldDay) === JSON.stringify(freshDay)) {
          console.log('[PrayerCache] status=stale_refresh_no_change city=' + city + ' date=' + dateISO);
          return;
        }
        var _oldFajr = oldDay ? oldDay.Fajr : 'none';
        console.log('[PrayerTimes] changed old_fajr=' + _oldFajr + ' new_fajr=' + freshDay.Fajr + ' city=' + city + ' date=' + dateISO);
        onFreshData({
          timings: {
            Fajr: freshDay.Fajr, Sunrise: freshDay.Sunrise, Dhuhr: freshDay.Dhuhr,
            Asr:  freshDay.Asr,  Maghrib: freshDay.Maghrib, Isha:  freshDay.Isha
          },
          date: { hijriStr: freshDay.hijri || null }
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
    CITY_COORDS:       CITY_COORDS
  };

})();
