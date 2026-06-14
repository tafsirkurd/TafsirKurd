/**
 * ImgCache — background image caching via Capacitor Filesystem.
 *
 * Mirrors AudioCache pattern for cover images and other lightweight assets.
 * Capacitor-native only — no-ops when Filesystem plugin is unavailable.
 *
 * API:
 *   ImgCache.warmup()          — call once at ~5 s after app start
 *   ImgCache.queue(urls)       — queue URLs for background caching
 *   ImgCache.local(url)        — sync O(1): returns local WebView URI or null
 *   ImgCache.cleanup(activeUrls) — remove orphaned entries after data refresh
 */
(function () {
  'use strict';

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
  function _toWebUri(nativeUri) {
    try {
      if (window.Capacitor && typeof Capacitor.convertFileSrc === 'function') {
        return Capacitor.convertFileSrc(nativeUri);
      }
    } catch (e) {}
    return nativeUri;
  }

  // Deterministic path from URL — avoids filesystem reserved chars.
  // Hash collisions are negligible at the scale of ~100 images.
  function _urlToPath(url) {
    var h = 0;
    for (var i = 0; i < url.length; i++) {
      h = (Math.imul ? Math.imul(31, h) + url.charCodeAt(i) | 0
                     : ((h << 5) - h) + url.charCodeAt(i));
      h = h & h;
    }
    var m = url.match(/\.(jpe?g|png|webp|gif|svg)(\?|$)/i);
    return 'img_cache/img_' + (h >>> 0).toString(16) + '.' + (m ? m[1].toLowerCase() : 'jpg');
  }

  // ── In-memory URI map ──────────────────────────────────────────────────────
  // Populated at warmup() and on every successful write.
  // Synchronous O(1) lookup — no async in hot render paths.
  var _uriMap = {}; // url → "capacitor://localhost/_capacitor_file_/..." URI

  // ── Manifest ───────────────────────────────────────────────────────────────

  var MANIFEST_KEY = 'img_cache_manifest_v1';
  var SIZE_CAP     = 30 * 1024 * 1024; // 30 MB

  function _loadManifest() {
    try { return JSON.parse(localStorage.getItem(MANIFEST_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function _saveManifest(m) {
    try { localStorage.setItem(MANIFEST_KEY, JSON.stringify(m)); } catch (e) {}
  }

  function _manifestSize(m) {
    var t = 0;
    for (var i = 0; i < m.length; i++) t += (m[i].size || 0);
    return t;
  }

  function _manifestTouch(m, url, path, size) {
    var now = Date.now();
    for (var i = 0; i < m.length; i++) {
      if (m[i].url === url) { m[i].ts = now; if (size) m[i].size = size; return m; }
    }
    m.push({ url: url, path: path, size: size || 0, ts: now });
    return m;
  }

  // Sort by LRU, evict oldest until under cap. Returns evicted paths.
  function _manifestEvict(m) {
    if (_manifestSize(m) <= SIZE_CAP) return [];
    m.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    var evicted = [];
    while (_manifestSize(m) > SIZE_CAP && m.length > 0) {
      var v = m.shift();
      evicted.push(v.path);
      delete _uriMap[v.url];
    }
    return evicted;
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  var _writing = {}; // in-flight guard

  function _writeBlob(url, blob) {
    var path = _urlToPath(url);
    if (!FS || _writing[url] || _uriMap[url]) return;
    _writing[url] = true;

    var reader = new FileReader();
    reader.onload = function () {
      var result = reader.result;
      var comma  = result.indexOf(',');
      var b64    = comma >= 0 ? result.slice(comma + 1) : null;
      if (!b64) { delete _writing[url]; return; }

      FS.writeFile({ path: path, data: b64, directory: DIR, recursive: true })
        .then(function () { return FS.getUri({ path: path, directory: DIR }); })
        .then(function (res) {
          _uriMap[url] = _toWebUri(res.uri);

          var m       = _loadManifest();
          m           = _manifestTouch(m, url, path, blob.size || 0);
          var evicted = _manifestEvict(m);
          _saveManifest(m);
          evicted.forEach(function (p) {
            FS.deleteFile({ path: p, directory: DIR }).catch(function () {});
          });
        })
        .catch(function () {})
        .then(function () { delete _writing[url]; });
    };
    reader.onerror = function () { delete _writing[url]; };
    reader.readAsDataURL(blob);
  }

  // ── Background queue ───────────────────────────────────────────────────────

  var _queue           = [];
  var _active          = false;
  var _startupDone     = false;
  var _startupScheduled = false;
  var BATCH_DELAY      = 500; // ms between fetches — avoids network burst

  function _next() {
    if (!_queue.length) { _active = false; return; }
    var url = _queue.shift();

    if (_uriMap[url] || _writing[url]) {
      // Already cached or in-flight — skip immediately without delay
      setTimeout(_next, 0);
      return;
    }

    fetch(url, { mode: 'cors', credentials: 'omit' })
      .then(function (res) { if (res.ok) return res.blob(); })
      .then(function (blob) { if (blob) _writeBlob(url, blob); })
      .catch(function () {}) // silent — retry next session
      .then(function () { setTimeout(_next, BATCH_DELAY); });
  }

  function _startQueue() {
    if (_active || !_queue.length || !FS) return;
    _active = true;
    _next();
  }

  // ── Warmup ─────────────────────────────────────────────────────────────────
  // Call once at startup (~5 s after load, after AudioCache.warmup).
  // Verifies each manifest entry still exists on disk; populates _uriMap.

  function warmup() {
    if (!FS) return;
    var m = _loadManifest();
    if (!m.length) return;

    var total   = m.length;
    var valid   = [];
    var checked = 0;

    m.forEach(function (entry) {
      FS.stat({ path: entry.path, directory: DIR })
        .then(function () { return FS.getUri({ path: entry.path, directory: DIR }); })
        .then(function (res) {
          _uriMap[entry.url] = _toWebUri(res.uri);
          valid.push(entry);
        })
        .catch(function () { /* file evicted by OS — drop silently */ })
        .then(function () {
          if (++checked === total) _saveManifest(valid);
        });
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Synchronous O(1) lookup. Returns WebView URI if image is cached locally, null otherwise.
   * Usage: img.src = ImgCache.local(url) || url;
   */
  function local(url) {
    return (url && _uriMap[url]) || null;
  }

  /**
   * Queue one or more URLs for background caching.
   * No-ops for audio/video/PDF/font URLs and URLs already cached.
   * Processing is deferred until 7 s after first call to avoid startup impact.
   */
  function queue(urls) {
    if (!FS) return;
    if (!Array.isArray(urls)) urls = [urls];

    // Build set of already-manifested URLs for fast dedup
    var m = _loadManifest();
    var inManifest = {};
    m.forEach(function (e) { inManifest[e.url] = true; });

    urls.forEach(function (url) {
      if (!url || typeof url !== 'string') return;
      if (!/^https?:\/\//.test(url)) return;          // only remote URLs
      // Never cache heavy assets — those have dedicated caches
      if (/\.(mp3|mp4|m4a|ogg|pdf|woff2?|ttf|eot)(\?|$)/i.test(url)) return;
      if (inManifest[url] || _uriMap[url]) return;    // already cached
      if (_queue.indexOf(url) >= 0) return;            // already queued
      _queue.push(url);
    });

    if (!_queue.length) return;

    if (!_startupDone) {
      if (!_startupScheduled) {
        _startupScheduled = true;
        // Defer first batch until after startup heavy tasks (AudioCache warmup etc.)
        setTimeout(function () { _startupDone = true; _startQueue(); }, 7000);
      }
    } else {
      _startQueue();
    }
  }

  /**
   * Remove manifest entries whose URLs are no longer in the active set.
   * Call after data refresh with the current list of image URLs still in use.
   */
  function cleanup(activeUrls) {
    if (!FS) return;
    var active = {};
    (activeUrls || []).forEach(function (u) { if (u) active[u] = true; });

    var m       = _loadManifest();
    var valid   = [];
    var orphans = [];

    m.forEach(function (entry) {
      if (active[entry.url]) {
        valid.push(entry);
      } else {
        orphans.push(entry.path);
        delete _uriMap[entry.url];
      }
    });

    if (!orphans.length) return;
    orphans.forEach(function (p) {
      FS.deleteFile({ path: p, directory: DIR }).catch(function () {});
    });
    _saveManifest(valid);
  }

  _init();
  window.ImgCache = { warmup: warmup, queue: queue, local: local, cleanup: cleanup };
})();
