/**
 * Prayer Times Cache
 *
 * Key pattern: prayer-kurd3:{CITY}:{YYYY}:{M}
 *
 * v3 key prefix: bumped from v2 to force a fresh fetch on every device.
 * Old prayer-kurd2: keys are silently ignored (different prefix) and purged.
 *
 * Staleness rule:
 *   A monthly cache is stale if it was fetched on a DIFFERENT Baghdad calendar day
 *   or if it is older than maxAgeMs (default: 6 hours).
 *   This means every new Baghdad day forces at least one fresh fetch.
 */
(function() {
  'use strict';

  var KEY_PREFIX = 'prayer-kurd3:';

  window.PrayerCache = {
    KEY_PREFIX: KEY_PREFIX,

    // Legacy per-day key — no longer written, kept for reference only
    key: function(city, method, dateISO) {
      return 'prayer3:' + city + ':' + method + ':' + dateISO;
    },

    // Monthly cache key — covers all days in the month for a given city
    monthKey: function(city, year, month) {
      return KEY_PREFIX + city + ':' + year + ':' + month;
    },

    read: function(key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
    },

    write: function(key, data) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    },

    // Write monthly data with metadata envelope.
    // meta: { fetchedAt, source, city, year, month }
    writeWithMeta: function(key, data, meta) {
      try {
        var stored = {};
        for (var k in data) {
          if (Object.prototype.hasOwnProperty.call(data, k)) stored[k] = data[k];
        }
        stored._meta = meta;
        localStorage.setItem(key, JSON.stringify(stored));
      } catch(e) {}
    },

    readMeta: function(key) {
      var stored = this.read(key);
      return (stored && stored._meta) || null;
    },

    clear: function(key) {
      try { localStorage.removeItem(key); } catch(e) {}
    },

    /**
     * Returns true if the cache at `key` should be re-fetched.
     *
     * Stale when:
     *  - No meta or no fetchedAt timestamp
     *  - fetchedAt was on a DIFFERENT Baghdad calendar day (midnight rollover)
     *  - fetchedAt is older than maxAgeMs (optional, default: no age limit)
     *
     * @param {string} key       — monthKey to check
     * @param {number} [maxAgeMs] — optional max age in ms (e.g. 6 * 3600000)
     * @returns {boolean}
     */
    isStale: function(key, maxAgeMs) {
      var meta = this.readMeta(key);
      if (!meta || !meta.fetchedAt) return true;

      // Day-boundary check: was it fetched on today's Baghdad calendar date?
      var fetchDay = new Date(meta.fetchedAt)
        .toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
      var todayDay = new Date()
        .toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
      if (fetchDay !== todayDay) return true;

      // Age check (if caller provides a limit)
      if (maxAgeMs !== undefined && (Date.now() - meta.fetchedAt) > maxAgeMs) return true;

      return false;
    },

    /**
     * Remove all OLD prayer cache keys (prayer-kurd2:*, prayer3:*, etc.)
     * that belong to previous cache versions.
     * Safe to call on every app start.
     */
    purgeOldKeys: function() {
      try {
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith('prayer-kurd2:') ||
              k.startsWith('prayer-kurd:')  ||
              k.startsWith('prayer2:')      ||
              k.startsWith('prayer3:')) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(function(k) { localStorage.removeItem(k); });
        if (toRemove.length) {
          console.log('[PrayerCache] purged', toRemove.length, 'old-version cache keys');
        }
      } catch(e) {}
    },

    /**
     * Remove ALL current prayer-kurd3: keys.
     * Called when the admin bumps the remote prayer_cache_version.
     */
    purgeAllCaches: function() {
      try {
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith(KEY_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(function(k) { localStorage.removeItem(k); });
        console.log('[PrayerCache] admin-forced purge —', toRemove.length, 'keys removed');
      } catch(e) {}
    }
  };

})();
