/**
 * Prayer Times API
 * Source: Aladhan API — https://api.aladhan.com
 *
 * IMPORTANT: timingsByCity endpoint returns wrong coordinates for Kurdistan cities
 * (geocoder returns dummy 8.888, 7.777 values). Using /v1/timings with hardcoded
 * accurate coordinates for all 4 cities instead.
 *
 * method=3: Muslim World League (default)
 * method=4: Umm Al-Qura
 */
(function() {
  'use strict';

  // Accurate coordinates for Kurdistan cities (Iraq)
  var CITY_COORDS = {
    'Duhok':        { lat: 36.8686, lon: 42.9450 },
    'Erbil':        { lat: 36.1914, lon: 44.0091 },
    'Sulaymaniyah': { lat: 35.5580, lon: 45.4350 },
    'Zakho':        { lat: 37.1397, lon: 42.6844 }
  };

  /**
   * Fetch prayer times for a city on a specific date (or today if dateISO is null).
   * Uses /v1/timings with lat/lon for reliable accuracy.
   *
   * @param {string}      city    — "Duhok" | "Erbil" | "Sulaymaniyah" | "Zakho"
   * @param {string|null} dateISO — "YYYY-MM-DD" (Baghdad date) or null for today
   * @param {number}      method  — 3 (MWL) or 4 (UAQ)
   * @returns {Promise<{timings, date}>}
   */
  async function fetchPrayerTimes(city, dateISO, method) {
    method = method || 3;
    var coords = CITY_COORDS[city];
    if (!coords) throw new Error('Unknown city: ' + city);

    var params = 'latitude=' + coords.lat +
                 '&longitude=' + coords.lon +
                 '&method=' + method;

    var url;
    if (dateISO) {
      // Use noon Baghdad time (09:00 UTC) as the timestamp anchor for the date.
      // This avoids midnight-boundary ambiguity and is well within the prayer day.
      var ts = Math.floor(new Date(dateISO + 'T09:00:00Z').getTime() / 1000);
      url = 'https://api.aladhan.com/v1/timings/' + ts + '?' + params;
    } else {
      url = 'https://api.aladhan.com/v1/timings?' + params;
    }

    var res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var json = await res.json();
    if (!json || json.code !== 200) {
      throw new Error('API error: ' + (json && json.status ? json.status : 'unknown'));
    }
    return json.data; // { timings:{Fajr,Sunrise,...}, date:{gregorian,hijri} }
  }

  window.PrayerAPI = {
    fetchPrayerTimes: fetchPrayerTimes,
    CITY_COORDS: CITY_COORDS
  };

})();
