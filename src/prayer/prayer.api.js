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
        window.PrayerCache.write(mkey, monthly);
      } catch(e) {
        // Fall through to Aladhan
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
    return fetchFromAladhan(city, today, 13);
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

  window.PrayerAPI = {
    fetchPrayerTimes: fetchPrayerTimes,
    CITY_COORDS: CITY_COORDS
  };

})();
