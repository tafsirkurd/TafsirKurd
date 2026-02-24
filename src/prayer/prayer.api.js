/**
 * Prayer Times API
 * Source: Aladhan API — https://api.aladhan.com
 * method=3: Muslim World League (default)
 * method=4: Umm Al-Qura
 *
 * Returns: { timings:{Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha,...}, date:{gregorian,hijri} }
 */
(function() {
  'use strict';

  var BASE = 'https://api.aladhan.com/v1/timingsByCity';

  window.PrayerAPI = {
    /**
     * Fetch prayer times for a city on a specific date (or today if dateISO is null).
     * @param {string} city   — "Duhok" | "Erbil" | "Sulaymaniyah" | "Zakho"
     * @param {string|null} dateISO — "YYYY-MM-DD" or null for today
     * @param {number} method — 3 (MWL) or 4 (UAQ)
     * @returns {Promise<{timings, date}>}
     */
    fetchPrayerTimes: async function(city, dateISO, method) {
      method = method || 3;
      var url;
      if (dateISO) {
        // Aladhan date-specific endpoint: /timingsByCity/DD-MM-YYYY
        var parts = dateISO.split('-');
        var ddmmyyyy = parts[2] + '-' + parts[1] + '-' + parts[0];
        url = BASE + '/' + ddmmyyyy + '?city=' + encodeURIComponent(city) + '&country=Iraq&method=' + method;
      } else {
        url = BASE + '?city=' + encodeURIComponent(city) + '&country=Iraq&method=' + method;
      }

      var res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();
      if (!json || json.code !== 200) {
        throw new Error('API error: ' + (json && json.status ? json.status : 'unknown'));
      }
      return json.data; // { timings:{Fajr,Sunrise,...}, date:{gregorian,hijri} }
    }
  };

})();
