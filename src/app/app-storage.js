/* Tafsir Kurd - Mobile App v2.0 */
/* Pure DOM methods only - no innerHTML for security */

/* ── localStorage quota guard ──────────────────────────────────────────────────
   Monkey-patches localStorage.setItem so every call throughout the app
   automatically evicts stale data and retries on QuotaExceededError.
   Must run before any other code. */
(function(){
  var _origSet = Storage.prototype.setItem;

  /* Eviction tiers — called in order until write succeeds */
  var _TIERS = [
    /* Tier 1: old-prefix prayer keys (always safe to drop) */
    function() {
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && /^prayer3:|^prayer-kurd[12]:/.test(k)) drop.push(k);
      }
      drop.forEach(function(k){ localStorage.removeItem(k); });
      return drop.length;
    },
    /* Tier 2: out-of-window prayer-kurd3 months (keep ±2 from today) */
    function() {
      var now = new Date(), keep = {};
      for (var d = -1; d <= 2; d++) {
        var m = new Date(now.getFullYear(), now.getMonth() + d, 1);
        keep[m.getFullYear() + ':' + (m.getMonth() + 1)] = true;
      }
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('prayer-kurd3:') !== 0) continue;
        var p = k.split(':');
        if (!keep[p[2] + ':' + p[3]]) drop.push(k);
      }
      drop.forEach(function(k){ localStorage.removeItem(k); });
      return drop.length;
    },
    /* Tier 3: large caches that can be rebuilt (IV data, photo cache, debug logs) */
    function() {
      var cacheable = ['iv_series_cache','iv_episodes_cache','reciter_photos_cache','push_debug','_ssCacheKey'];
      var removed = 0;
      cacheable.forEach(function(k){ if(localStorage.getItem(k)!==null){localStorage.removeItem(k);removed++;} });
      return removed;
    },
    /* Tier 4: ALL remaining prayer-kurd3 keys (nuclear option) */
    function() {
      var drop = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('prayer-kurd3:') === 0) drop.push(k);
      }
      drop.forEach(function(k){ localStorage.removeItem(k); });
      return drop.length;
    },
  ];

  function _freeSpace() {
    for (var t = 0; t < _TIERS.length; t++) {
      if (_TIERS[t]() > 0) return;
    }
  }

  Storage.prototype.setItem = function(key, val) {
    try { _origSet.call(this, key, val); }
    catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
        _freeSpace();
        try { _origSet.call(this, key, val); } catch (e2) { /* truly full — skip silently */ }
      } else { throw e; }
    }
  };
})();
