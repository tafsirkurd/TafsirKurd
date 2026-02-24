/**
 * Prayer Times Logic
 * - Time parsing using Asia/Baghdad timezone (UTC+3, no DST)
 * - Next prayer detection
 * - Countdown formatting
 */
(function() {
  'use strict';

  // All 6 displayable prayers (in order)
  var PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  // Prayers eligible for athan notifications (Sunrise excluded)
  var NOTIF_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  /**
   * Get today's date string in YYYY-MM-DD format using Asia/Baghdad timezone.
   */
  function todayBaghdad() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
  }

  /**
   * Get tomorrow's date string in YYYY-MM-DD using Asia/Baghdad timezone.
   */
  function tomorrowBaghdad() {
    var today = todayBaghdad();
    var parts = today.split('-').map(Number);
    // Add one day using UTC to avoid local-midnight DST issues
    var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
    return d.toISOString().split('T')[0];
  }

  /**
   * Parse a prayer time string from the API into a JS Date.
   * API returns times in Baghdad local time (UTC+3), e.g. "05:23" or "05:23 (PKT)".
   * @param {string} timeStr  — API time string
   * @param {string} dateISO  — "YYYY-MM-DD" date to anchor the time
   * @returns {Date}
   */
  function parseAsDate(timeStr, dateISO) {
    // Take only "HH:MM" (ignore any trailing timezone label)
    var hm = timeStr.trim().split(' ')[0].split(':');
    var h = parseInt(hm[0], 10);
    var m = parseInt(hm[1], 10);
    var hStr = (h < 10 ? '0' : '') + h;
    var mStr = (m < 10 ? '0' : '') + m;
    // "+03:00" = Baghdad timezone
    return new Date(dateISO + 'T' + hStr + ':' + mStr + ':00+03:00');
  }

  /**
   * Find the next upcoming prayer from NOTIF_PRAYERS.
   * @param {Object} timings  — {Fajr:"05:23", Dhuhr:"12:30", ...}
   * @param {string} dateISO  — "YYYY-MM-DD"
   * @param {Date}   [now]    — defaults to new Date()
   * @returns {{name:string, time:Date}|null}  null means after Isha
   */
  function getNextPrayer(timings, dateISO, now) {
    now = now || new Date();
    for (var i = 0; i < NOTIF_PRAYERS.length; i++) {
      var name = NOTIF_PRAYERS[i];
      var t = parseAsDate(timings[name], dateISO);
      if (t > now) return { name: name, time: t };
    }
    return null; // after Isha
  }

  /**
   * Format milliseconds remaining as HH:MM:SS.
   */
  function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    return (h < 10 ? '0' : '') + h + ':' +
           (m < 10 ? '0' : '') + m + ':' +
           (sec < 10 ? '0' : '') + sec;
  }

  window.PrayerLogic = {
    PRAYER_ORDER: PRAYER_ORDER,
    NOTIF_PRAYERS: NOTIF_PRAYERS,
    todayBaghdad: todayBaghdad,
    tomorrowBaghdad: tomorrowBaghdad,
    parseAsDate: parseAsDate,
    getNextPrayer: getNextPrayer,
    formatCountdown: formatCountdown
  };

})();
