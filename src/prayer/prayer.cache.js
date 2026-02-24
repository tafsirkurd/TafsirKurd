/**
 * Prayer Times Cache
 * Key pattern: prayer:{CITY}:{METHOD}:{YYYY-MM-DD}
 */
(function() {
  'use strict';

  window.PrayerCache = {
    key: function(city, method, dateISO) {
      return 'prayer:' + city + ':' + method + ':' + dateISO;
    },
    read: function(key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
    },
    write: function(key, data) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    }
  };

})();
