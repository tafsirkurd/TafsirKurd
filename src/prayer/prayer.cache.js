/**
 * Prayer Times Cache
 * Key pattern: prayer2:{CITY}:{METHOD}:{YYYY-MM-DD}
 * (v2 suffix forces a fresh fetch after the tune-parameter update)
 */
(function() {
  'use strict';

  window.PrayerCache = {
    // Legacy per-day key (kept for backwards compat)
    key: function(city, method, dateISO) {
      return 'prayer3:' + city + ':' + method + ':' + dateISO;
    },
    // Monthly key for amozhgary.tv data — one fetch covers the whole month
    monthKey: function(city, year, month) {
      return 'prayer-kurd2:' + city + ':' + year + ':' + month;
    },
    read: function(key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
    },
    write: function(key, data) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    },
    // Write monthly data with metadata envelope (fetchedAt, source, city, year, month).
    // Stored as: { days:{...}, ...serverFields, _meta:{...} }
    // Backwards-compatible — callers still read .days as before.
    writeWithMeta: function(key, data, meta) {
      try {
        var stored = {};
        for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) stored[k] = data[k]; }
        stored._meta = meta; // always overwrite, even if data already had one
        localStorage.setItem(key, JSON.stringify(stored));
      } catch(e) {}
    },
    // Returns the _meta object if present, otherwise null.
    readMeta: function(key) {
      var stored = this.read(key);
      return (stored && stored._meta) || null;
    },
    clear: function(key) {
      try { localStorage.removeItem(key); } catch(e) {}
    }
  };

})();
