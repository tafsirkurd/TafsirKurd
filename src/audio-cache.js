/**
 * AudioCache — persistent local cache for Quran audio files.
 *
 * Files are stored in Capacitor Filesystem (Directory.Cache).
 * Path format: audio/{reciter}/{surah3d}{ayah3d}.mp3
 *
 * Design principles:
 * - Zero added delay to playback — all cache lookups are synchronous O(1)
 * - First play of any ayah always falls through to remote (same as today)
 * - Subsequent plays of cached ayahs use a local WebView-accessible URI (offline-capable)
 * - Background surah caching fetches remaining ayahs quietly, 1 at a time
 * - LRU manifest in localStorage tracks size; evicts oldest on cap exceeded
 * - All Filesystem errors are silently swallowed — never interrupts playback
 *
 * IMPORTANT: Filesystem.getUri() returns native file:// paths which the Capacitor
 * WebView (origin capacitor://localhost) cannot load directly. We always pass through
 * Capacitor.convertFileSrc() to get a capacitor://localhost/_capacitor_file_/... URL.
 */
(function () {
  'use strict';

  // ── Init ────────────────────────────────────────────────────────────────────

  var FS  = null;
  var DIR = 'CACHE'; // Capacitor Directory.Cache

  function _init() {
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Filesystem) {
        FS = Capacitor.Plugins.Filesystem;
      }
    } catch (e) {}
  }

  // Convert native file:// URI → WebView-accessible capacitor://localhost/... URI.
  // Falls back to the raw URI if convertFileSrc is unavailable (browser/dev mode).
  function _toWebUri(nativeUri) {
    try {
      if (window.Capacitor && typeof Capacitor.convertFileSrc === 'function') {
        return Capacitor.convertFileSrc(nativeUri);
      }
    } catch (e) {}
    return nativeUri;
  }

  // ── Key / Path ──────────────────────────────────────────────────────────────

  // Stable cache key: "Alafasy_128kbps/002255"
  function _key(reciter, surah, ayah) {
    return reciter + '/' +
      String(surah).padStart(3, '0') +
      String(ayah).padStart(3, '0');
  }

  // Filesystem path relative to cache directory root
  function _path(key) {
    return 'audio/' + key + '.mp3';
  }

  // ── In-memory URI map ────────────────────────────────────────────────────────
  // Populated at warmup() and whenever a file is successfully written.
  // Values are WebView-accessible capacitor://localhost/... URIs (NOT file://).
  // Synchronous O(1) lookup — no async in the hot playback path.

  var _uriMap = {}; // key → "capacitor://localhost/_capacitor_file_/..." URI

  // ── LRU Manifest ─────────────────────────────────────────────────────────────

  var MANIFEST_KEY = 'audio_cache_manifest_v1';
  var SIZE_CAP     = 300 * 1024 * 1024; // 300 MB

  function _loadManifest() {
    try { return JSON.parse(localStorage.getItem(MANIFEST_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function _saveManifest(m) {
    try { localStorage.setItem(MANIFEST_KEY, JSON.stringify(m)); } catch (e) {}
  }

  function _totalSize(m) {
    var t = 0;
    for (var i = 0; i < m.length; i++) t += (m[i].size || 0);
    return t;
  }

  // Upsert an entry; always updates lastAccessed.
  function _touch(m, key, size) {
    var now = Date.now();
    for (var i = 0; i < m.length; i++) {
      if (m[i].key === key) {
        m[i].lastAccessed = now;
        if (size) m[i].size = size;
        return m;
      }
    }
    m.push({ key: key, size: size || 0, lastAccessed: now });
    return m;
  }

  // Sort by lastAccessed asc, pop oldest until under cap.
  // Returns array of keys to delete from Filesystem.
  function _evict(m) {
    if (_totalSize(m) <= SIZE_CAP) return [];
    m.sort(function (a, b) { return (a.lastAccessed || 0) - (b.lastAccessed || 0); });
    var toDelete = [];
    while (_totalSize(m) > SIZE_CAP && m.length > 0) {
      var victim = m.shift();
      toDelete.push(victim.key);
      delete _uriMap[victim.key];
    }
    return toDelete;
  }

  // ── Write ────────────────────────────────────────────────────────────────────

  var _writing = {}; // in-flight write guard: key → true

  // Persist a Blob to Filesystem and add it to _uriMap.
  // Silently no-ops if already cached, already writing, or FS unavailable.
  function _writeBlob(key, blob) {
    if (!FS || _writing[key] || _uriMap[key]) return;
    _writing[key] = true;

    var reader = new FileReader();
    reader.onload = function () {
      var result = reader.result;
      // result = "data:audio/mpeg;base64,XXXX" — strip the data URL prefix
      var comma = result.indexOf(',');
      var b64   = comma >= 0 ? result.slice(comma + 1) : null;
      if (!b64) { delete _writing[key]; return; }

      var path = _path(key);
      FS.writeFile({ path: path, data: b64, directory: DIR, recursive: true })
        .then(function () {
          return FS.getUri({ path: path, directory: DIR });
        })
        .then(function (res) {
          // Always convert to WebView URI — bare file:// cannot be loaded by the WebView
          _uriMap[key] = _toWebUri(res.uri);

          var m = _loadManifest();
          m = _touch(m, key, blob.size || 0);
          var toDelete = _evict(m);
          _saveManifest(m);

          // Evict files without blocking
          for (var i = 0; i < toDelete.length; i++) {
            (function (k) {
              FS.deleteFile({ path: _path(k), directory: DIR }).catch(function () {});
            })(toDelete[i]);
          }
        })
        .catch(function () {})
        .then(function () { delete _writing[key]; });
    };
    reader.onerror = function () { delete _writing[key]; };
    reader.readAsDataURL(blob);
  }

  // ── Warmup ───────────────────────────────────────────────────────────────────
  // Called once at startup (delayed ~3 s so it doesn't compete with boot).
  // Reads manifest, stats each file to confirm it still exists,
  // populates _uriMap with WebView URIs, removes stale entries.

  function warmup() {
    if (!FS) return;
    var m = _loadManifest();
    if (!m.length) return;

    var total   = m.length;
    var valid   = [];
    var checked = 0;

    m.forEach(function (entry) {
      var path = _path(entry.key);
      FS.stat({ path: path, directory: DIR })
        .then(function () {
          return FS.getUri({ path: path, directory: DIR });
        })
        .then(function (res) {
          _uriMap[entry.key] = _toWebUri(res.uri);
          valid.push(entry);
        })
        .catch(function () {
          // File gone (OS evicted) — drop from manifest silently
        })
        .then(function () {
          checked++;
          if (checked === total) _saveManifest(valid);
        });
    });
  }

  // ── Background surah caching ─────────────────────────────────────────────────
  // After playback starts, quietly fetch and cache the remaining ayahs
  // in the current surah. One request at a time, _BG_DELAY ms apart.
  // Automatically stops if the user leaves the surah.

  var _bgSurah = 0;
  var _bgTimer = null;
  var _BG_DELAY = 800; // ms between background fetches

  function _cancelBg() {
    _bgSurah = 0;
    if (_bgTimer) { clearTimeout(_bgTimer); _bgTimer = null; }
  }

  function _bgStep(surah, ayah, reciter) {
    if (_bgSurah !== surah) return; // surah changed — stop

    var key = _key(reciter, surah, ayah);

    if (_uriMap[key] || _writing[key]) {
      // Already cached or being written — skip immediately to next
      _bgNext(surah, ayah, reciter);
      return;
    }

    var url = 'https://everyayah.com/data/' + reciter + '/' +
              String(surah).padStart(3, '0') +
              String(ayah).padStart(3, '0') + '.mp3';

    fetch(url)
      .then(function (r) { return (r.ok && _bgSurah === surah) ? r.blob() : null; })
      .then(function (blob) { if (blob) _writeBlob(key, blob); })
      .catch(function () {})
      .then(function () { _bgNext(surah, ayah, reciter); });
  }

  function _bgNext(surah, ayah, reciter) {
    if (_bgSurah !== surah) return;
    var sData = SURAHS[surah - 1]; // SURAHS is a module-level var in app.js, always available
    if (!sData || ayah >= sData.a) return; // end of surah
    _bgTimer = setTimeout(function () {
      _bgStep(surah, ayah + 1, reciter);
    }, _BG_DELAY);
  }

  /**
   * Begin background caching of the current surah from (fromAyah + 1) onward.
   * Delayed 2 s after call to avoid competing with playback startup network traffic.
   * Safe to call repeatedly — cancels the previous run automatically.
   *
   * @param {number} surah
   * @param {number} fromAyah  — already playing; caching starts from next ayah
   * @param {string} reciter
   */
  function startSurahBg(surah, fromAyah, reciter) {
    if (!FS) return;
    _cancelBg();
    var sData = SURAHS[surah - 1];
    if (!sData || fromAyah >= sData.a) return; // nothing after current ayah
    _bgSurah = surah;
    _bgTimer = setTimeout(function () {
      _bgStep(surah, fromAyah + 1, reciter);
    }, 2000); // 2 s grace period before first background fetch
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Synchronous. Returns a WebView-accessible URI if this ayah is in the local
   * cache, or null if not. Safe to call in the hot playback path.
   */
  function getLocalUri(reciter, surah, ayah) {
    if (!FS) return null;
    return _uriMap[_key(reciter, surah, ayah)] || null;
  }

  /**
   * Remove an entry from the in-memory URI map (and optionally delete from disk).
   * Called by the audio error handler when a cached file fails to load, before
   * retrying with the remote URL.
   */
  function clearLocalUri(reciter, surah, ayah) {
    var key = _key(reciter, surah, ayah);
    delete _uriMap[key];
    // Remove from manifest and delete file from disk
    if (FS) {
      FS.deleteFile({ path: _path(key), directory: DIR }).catch(function () {});
      var m = _loadManifest().filter(function (e) { return e.key !== key; });
      _saveManifest(m);
    }
  }

  /**
   * Persist a Blob to the local cache. Fire-and-forget.
   * Call this from _pfCache's XHR onload after the blob is received.
   */
  function saveBlob(reciter, surah, ayah, blob) {
    if (!FS || !blob) return;
    _writeBlob(_key(reciter, surah, ayah), blob);
  }

  /**
   * Update lastAccessed for an entry that was served from cache.
   * Keeps frequently-accessed ayahs safe from LRU eviction.
   */
  function touchAccess(reciter, surah, ayah) {
    if (!FS) return;
    var key = _key(reciter, surah, ayah);
    if (!_uriMap[key]) return;
    var m = _loadManifest();
    _saveManifest(_touch(m, key, 0));
  }

  _init();

  window.AudioCache = {
    warmup:        warmup,
    getLocalUri:   getLocalUri,
    clearLocalUri: clearLocalUri,
    saveBlob:      saveBlob,
    touchAccess:   touchAccess,
    startSurahBg:  startSurahBg,
    cancelBg:      _cancelBg
  };

})();
