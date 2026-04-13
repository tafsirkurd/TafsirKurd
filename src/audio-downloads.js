/**
 * AudioDownloads — user-controlled offline reciter download manager.
 *
 * Files stored in Capacitor Directory.Data (persistent — OS never evicts).
 * Path: audio_offline/{reciterId}/{surah3d}{ayah3d}.mp3
 *
 * Index (localStorage od_idx_v1):
 *   {
 *     "Alafasy_128kbps": {
 *       "done":        { "1": 7, "2": 286 },   // done[sn] = sequential ayahs written 1..N
 *       "bytes":       50000000,                // running total of written bytes
 *       "verifiedAt":  1710000000000,           // timestamp of last integrity check (null = never)
 *       "needsRepair": ["2", "5"]               // surah keys where verify found gaps
 *     }
 *   }
 *
 * State rules:
 *   - A surah is COMPLETE  when done[sn] >= SURAHS[sn-1].a
 *   - A surah is PARTIAL   when done[sn] > 0 and done[sn] < total
 *   - A surah is CORRUPT   when it appears in needsRepair[]
 *   - needsRepair is cleared when a repair download for that surah completes
 *
 * Playback: getLocalUri() is synchronous O(1), safe in the hot audio path.
 */
(function () {
  'use strict';

  var FS   = null;
  var DFMT = 'DATA';       // Capacitor Directory.Data — persistent
  var BASE = 'audio_offline';
  var IDX  = 'od_idx_v1';  // localStorage key

  // WebView base URI resolved once at init (avoids async FS calls per ayah)
  var _base = null;

  // In-memory mirror of localStorage index
  var _idx = {};

  // Active download/verify state (one at a time)
  var _act    = null;
  var _verify = null;

  // ── Init ────────────────────────────────────────────────────────────────────

  function _init() {
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Filesystem) {
        FS = Capacitor.Plugins.Filesystem;
      }
    } catch (e) {}

    _loadIdx();
    if (!FS) return;

    FS.mkdir({ path: BASE, directory: DFMT, recursive: true })
      .catch(function () {})
      .then(function () { return FS.getUri({ path: BASE, directory: DFMT }); })
      .then(function (res) {
        var native = res.uri.replace(/\/audio_offline\/?$/, '');
        _base = _cvt(native);
        if (_base && !_base.endsWith('/')) _base += '/';
      })
      .catch(function () {});
  }

  function _cvt(native) {
    try {
      if (window.Capacitor && typeof Capacitor.convertFileSrc === 'function')
        return Capacitor.convertFileSrc(native);
    } catch (e) {}
    return native;
  }

  // ── Index ────────────────────────────────────────────────────────────────────

  function _loadIdx() {
    try { _idx = JSON.parse(localStorage.getItem(IDX) || '{}'); }
    catch (e) { _idx = {}; }
  }

  function _saveIdx() {
    try { localStorage.setItem(IDX, JSON.stringify(_idx)); } catch (e) {}
  }

  function _rec(id) {
    if (!_idx[id]) _idx[id] = { done: {}, bytes: 0, verifiedAt: null, needsRepair: [] };
    if (!_idx[id].needsRepair) _idx[id].needsRepair = [];
    return _idx[id];
  }

  // ── Paths ────────────────────────────────────────────────────────────────────

  function _pad(s, a) { return String(s).padStart(3,'0') + String(a).padStart(3,'0'); }

  function _path(reciterId, surah, ayah) {
    return BASE + '/' + reciterId + '/' + _pad(surah, ayah) + '.mp3';
  }

  function _uri(reciterId, surah, ayah) {
    if (!_base) return null;
    return _base + BASE + '/' + reciterId + '/' + _pad(surah, ayah) + '.mp3';
  }

  // ── Playback (synchronous) ────────────────────────────────────────────────────

  function getLocalUri(reciterId, surah, ayah) {
    if (!FS || !_base) return null;
    var rec = _idx[reciterId];
    if (!rec) return null;
    // Do not serve from a surah flagged as corrupt — fall through to remote
    if (rec.needsRepair && rec.needsRepair.indexOf(String(surah)) !== -1) return null;
    var done = rec.done[String(surah)] || 0;
    if (done >= ayah) return _uri(reciterId, surah, ayah);
    return null;
  }

  // ── Wi-Fi detection ──────────────────────────────────────────────────────────

  function isWifiOnly() {
    return localStorage.getItem('dlWifiOnly') === '1';
  }

  function setWifiOnly(on) {
    localStorage.setItem('dlWifiOnly', on ? '1' : '0');
  }

  function _onWifi() {
    try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return true; // API unavailable — don't block
      return c.type === 'wifi' || c.effectiveType === '4g'; // treat 4g as acceptable
    } catch (e) { return true; }
  }

  function canDownload() {
    if (!isWifiOnly()) return { ok: true };
    if (_onWifi()) return { ok: true };
    return { ok: false, reason: (window.t&&window.t('dl.wifi_blocked'))||'Wi-Fi only mode is on. Connect to Wi-Fi or disable the setting.' };
  }

  // ── Size measurement ─────────────────────────────────────────────────────────
  //
  // probeReciterSize fetches Content-Length from a spread of real ayah files
  // and extrapolates the total. Results cached in memory for the session.
  // Falls back to formula-based estimate if offline or probe fails.

  var _sizeCache = {}; // reciterId → bytes (real) | null (failed)

  // Spread of 12 ayahs across short/medium/long surahs for representative avg
  var _PROBE_AYAHS = [
    {s:1,a:1},{s:1,a:7},
    {s:2,a:1},{s:2,a:100},{s:2,a:286},
    {s:18,a:1},{s:18,a:55},{s:18,a:110},
    {s:36,a:1},{s:36,a:40},{s:36,a:83},
    {s:112,a:4}
  ];

  // Returns: undefined = not yet probed, null = probe failed, number = real bytes
  function _probeCached(reciterId) {
    return _sizeCache.hasOwnProperty(reciterId) ? _sizeCache[reciterId] : undefined;
  }

  function probeReciterSize(reciterId, cb) {
    if (_sizeCache.hasOwnProperty(reciterId)) { cb(_sizeCache[reciterId]); return; }
    var base = 'https://everyayah.com/data/' + reciterId + '/';
    var sizes = [], pending = _PROBE_AYAHS.length;
    _PROBE_AYAHS.forEach(function (p) {
      var url = base + String(p.s).padStart(3,'0') + String(p.a).padStart(3,'0') + '.mp3';
      fetch(url)
        .then(function (r) {
          var cl = parseInt(r.headers.get('content-length') || '0', 10);
          if (r.body && r.body.cancel) r.body.cancel().catch(function(){});
          if (cl > 0) sizes.push(cl);
        })
        .catch(function () {})
        .then(function () {
          pending--;
          if (pending > 0) return;
          if (!sizes.length) { _sizeCache[reciterId] = null; cb(null); return; }
          var avg = sizes.reduce(function (s, v) { return s + v; }, 0) / sizes.length;
          var total = Math.round(avg * 6236);
          _sizeCache[reciterId] = total;
          cb(total);
        });
    });
  }

  function _fallbackBytes(reciterId) {
    // Formula fallback when offline: kbps × 7s avg (more accurate than 5.5s)
    var kbps = parseInt((reciterId.match(/(\d+)kbps/i) || [0, 128])[1], 10) || 128;
    return Math.round(6236 * kbps * 125 * 7);
  }

  function estimateBytes(reciterId, surahNums) {
    // Use probed size if available, scaled to the requested surah subset
    var allAyahs = 6236;
    var subsetAyahs = surahNums.reduce(function (s, sn) {
      return s + ((window.SURAHS && SURAHS[sn-1] && SURAHS[sn-1].a) || 0);
    }, 0);
    var ratio = allAyahs > 0 ? subsetAyahs / allAyahs : 1;
    var cached = _sizeCache[reciterId];
    if (cached) return Math.round(cached * ratio);
    return Math.round(_fallbackBytes(reciterId) * ratio);
  }

  // Remaining bytes for already-partial download
  function remainingBytes(reciterId, surahNums) {
    var rec = _idx[reciterId];
    var allAyahs = 6236;
    var totalSubset = surahNums.reduce(function (s, sn) {
      return s + ((window.SURAHS && SURAHS[sn-1] && SURAHS[sn-1].a) || 0);
    }, 0);
    var doneAyahs = surahNums.reduce(function (s, sn) {
      return s + Math.min((rec && rec.done[String(sn)]) || 0, (window.SURAHS && SURAHS[sn-1] && SURAHS[sn-1].a) || 0);
    }, 0);
    var remainAyahs = Math.max(0, totalSubset - doneAyahs);
    var cached = _sizeCache[reciterId];
    var bytesPerAyah = cached ? cached / allAyahs : _fallbackBytes(reciterId) / allAyahs;
    return Math.round(remainAyahs * bytesPerAyah);
  }

  function fmtBytes(b) {
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576)    return Math.round(b / 1048576) + ' MB';
    if (b >= 1024)       return Math.round(b / 1024) + ' KB';
    return b + ' B';
  }

  // ── Download ─────────────────────────────────────────────────────────────────

  var DELAY = 120; // ms between ayah fetches

  /**
   * Download selected surahs. Resumes from last good ayah automatically.
   * Clears needsRepair for any surah that completes successfully.
   *
   * @param {string}   reciterId
   * @param {number[]} surahNums   — e.g. [S.surah] for current, allSurahs for full
   * @param {object}   cbs         — { onProgress(info), onDone(), onError(msg), onCancel() }
   */
  function downloadSurahs(reciterId, surahNums, cbs) {
    if (!FS) { if (cbs.onError) cbs.onError('Storage not available'); return; }

    var check = canDownload();
    if (!check.ok) { if (cbs.onError) cbs.onError(check.reason); return; }

    if (_act) cancel(_act.reciterId);

    var work = [];
    surahNums.forEach(function (sn) {
      var total = (window.SURAHS && SURAHS[sn-1] && SURAHS[sn-1].a) || 0;
      if (!total) return;
      var done  = (_idx[reciterId] && _idx[reciterId].done[String(sn)]) || 0;
      if (done >= total) return;
      work.push({ sn: sn, from: done + 1, total: total });
    });

    if (!work.length) { if (cbs.onDone) cbs.onDone(); return; }

    var totalAyahs = work.reduce(function (s, w) { return s + (w.total - w.from + 1); }, 0);

    _act = { reciterId: reciterId, work: work, wi: 0, ai: 0, total: totalAyahs, done: 0, cbs: cbs, cancelled: false, timer: null };
    _step();
  }

  function _step() {
    if (!_act || _act.cancelled) return;
    var a = _act;

    while (a.wi < a.work.length) {
      var w = a.work[a.wi];
      if (w.from + a.ai <= w.total) break;
      a.wi++; a.ai = 0;
    }

    if (a.wi >= a.work.length) {
      _act = null;
      if (a.cbs.onDone) a.cbs.onDone();
      return;
    }

    var w2   = a.work[a.wi];
    var ayah = w2.from + a.ai;

    fetch('https://everyayah.com/data/' + a.reciterId + '/' +
          String(w2.sn).padStart(3,'0') + String(ayah).padStart(3,'0') + '.mp3')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.blob();
      })
      .then(function (blob) {
        if (a.cancelled) return;
        return _write(a.reciterId, w2.sn, ayah, blob).then(function () {
          a.done++; a.ai++;
          var rec = _rec(a.reciterId);
          rec.done[String(w2.sn)] = ayah;
          rec.bytes = (rec.bytes || 0) + (blob.size || 0);
          // Clear needsRepair for this surah when it completes
          if (ayah >= w2.total) {
            rec.needsRepair = (rec.needsRepair || []).filter(function (s) { return s !== String(w2.sn); });
          }
          _saveIdx();
          if (a.cbs.onProgress) a.cbs.onProgress({ reciterId: a.reciterId, surah: w2.sn, ayah: ayah, surahTotal: w2.total, done: a.done, total: a.total, pct: Math.round(a.done / a.total * 100), bytes: rec.bytes });
        });
      })
      .catch(function (err) {
        if (a.cancelled) return;
        _act = null;
        if (a.cbs.onError) a.cbs.onError(err && err.message || 'Download failed');
        return;
      })
      .then(function () {
        if (!_act || _act.cancelled || _act !== a) return;
        a.timer = setTimeout(_step, DELAY);
      });
  }

  function _write(reciterId, surah, ayah, blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var r = reader.result, comma = r.indexOf(',');
        var b64 = comma >= 0 ? r.slice(comma + 1) : null;
        if (!b64) { reject(new Error('encode failed')); return; }
        FS.writeFile({ path: _path(reciterId, surah, ayah), data: b64, directory: DFMT, recursive: true })
          .then(resolve).catch(reject);
      };
      reader.onerror = function () { reject(new Error('read error')); };
      reader.readAsDataURL(blob);
    });
  }

  function cancel(reciterId) {
    if (!_act || _act.reciterId !== reciterId) return;
    _act.cancelled = true;
    if (_act.timer) clearTimeout(_act.timer);
    if (_act.cbs && _act.cbs.onCancel) _act.cbs.onCancel();
    _act = null;
  }

  // ── Integrity verification ────────────────────────────────────────────────────
  //
  // Strategy: spot-check 3 positions per surah (first, middle, last).
  // Fast (~3 × surahs stat calls), catches the most common failures.
  // If any spot fails → mark surah needsRepair → repair path = re-download that surah.

  function verifyReciter(reciterId, cbs) {
    // cbs: { onProgress(surahsDone, surahsTotal), onDone({ checked, repaired }) }
    if (_verify) { if (cbs.onDone) cbs.onDone({ checked: 0, repaired: 0 }); return; }

    var rec = _idx[reciterId];
    if (!rec || !FS) { if (cbs.onDone) cbs.onDone({ checked: 0, repaired: 0 }); return; }

    var snKeys = Object.keys(rec.done).filter(function (k) { return rec.done[k] > 0; });
    if (!snKeys.length) { if (cbs.onDone) cbs.onDone({ checked: 0, repaired: 0 }); return; }

    var result = { checked: 0, repaired: 0 };
    var si = 0;
    _verify = { reciterId: reciterId, cancelled: false };

    function checkNext() {
      if (_verify.cancelled || si >= snKeys.length) {
        rec.verifiedAt = Date.now();
        _saveIdx();
        _verify = null;
        if (cbs.onDone) cbs.onDone(result);
        return;
      }

      var sn   = parseInt(snKeys[si], 10);
      var done = rec.done[String(sn)];
      si++;

      // Pick 3 representative positions to spot-check
      var positions = Array.from ? Array.from(new Set([1, Math.ceil(done / 2), done])) :
                      [1, Math.ceil(done / 2), done].filter(function (v, i, a) { return a.indexOf(v) === i; });

      var pi = 0;
      var failed = false;

      function checkPos() {
        if (failed || pi >= positions.length) {
          result.checked++;
          if (failed) {
            result.repaired++;
            if (!rec.needsRepair) rec.needsRepair = [];
            if (rec.needsRepair.indexOf(String(sn)) === -1) rec.needsRepair.push(String(sn));
          }
          if (cbs.onProgress) cbs.onProgress(si, snKeys.length);
          setTimeout(checkNext, 0);
          return;
        }
        var ayah = positions[pi++];
        FS.stat({ path: _path(reciterId, sn, ayah), directory: DFMT })
          .then(checkPos)
          .catch(function () { failed = true; checkPos(); });
      }
      checkPos();
    }

    checkNext();
  }

  function cancelVerify() {
    if (_verify) { _verify.cancelled = true; _verify = null; }
  }

  function isVerifying() { return !!_verify; }

  // ── Delete ───────────────────────────────────────────────────────────────────

  function deleteReciter(reciterId) {
    cancel(reciterId); cancelVerify();
    var rec = _idx[reciterId];
    delete _idx[reciterId];
    _saveIdx();
    if (!FS || !rec) return Promise.resolve();

    var ps = [];
    Object.keys(rec.done).forEach(function (snStr) {
      var sn = parseInt(snStr, 10), done = rec.done[snStr];
      for (var a = 1; a <= done; a++)
        ps.push(FS.deleteFile({ path: _path(reciterId, sn, a), directory: DFMT }).catch(function () {}));
    });
    return Promise.all(ps);
  }

  function deleteSurah(reciterId, surahNum) {
    cancel(reciterId);
    var rec = _idx[reciterId];
    if (!rec) return Promise.resolve();
    var done = rec.done[String(surahNum)] || 0;
    var kbps = parseInt((reciterId.match(/(\d+)kbps/i) || [0, 128])[1], 10) || 128;
    rec.bytes = Math.max(0, (rec.bytes || 0) - Math.round(done * (kbps * 1000 / 8) * 5.5));
    delete rec.done[String(surahNum)];
    rec.needsRepair = (rec.needsRepair || []).filter(function (s) { return s !== String(surahNum); });
    if (!Object.keys(rec.done).length) delete _idx[reciterId];
    _saveIdx();

    if (!FS || !done) return Promise.resolve();
    var ps = [];
    for (var a = 1; a <= done; a++)
      ps.push(FS.deleteFile({ path: _path(reciterId, surahNum, a), directory: DFMT }).catch(function () {}));
    return Promise.all(ps);
  }

  // ── Query ────────────────────────────────────────────────────────────────────

  function isSurahDownloaded(reciterId, surahNum) {
    var rec = _idx[reciterId];
    if (!rec) return false;
    var done  = rec.done[String(surahNum)] || 0;
    var total = (window.SURAHS && SURAHS[surahNum-1] && SURAHS[surahNum-1].a) || 0;
    return total > 0 && done >= total;
  }

  function isSurahCorrupt(reciterId, surahNum) {
    var rec = _idx[reciterId];
    return !!(rec && rec.needsRepair && rec.needsRepair.indexOf(String(surahNum)) !== -1);
  }

  function isReciterDownloaded(reciterId) {
    if (!_idx[reciterId]) return false;
    for (var sn = 1; sn <= 114; sn++) if (!isSurahDownloaded(reciterId, sn)) return false;
    return true;
  }

  function hasAnyDownload(reciterId) {
    var rec = _idx[reciterId];
    return !!(rec && (rec.bytes > 0 || Object.keys(rec.done).length > 0));
  }

  // Download state for a reciter: 'none' | 'partial' | 'full' | 'corrupt'
  function dlState(reciterId) {
    var rec = _idx[reciterId];
    if (!rec || !Object.keys(rec.done).length) return 'none';
    var corrupt = rec.needsRepair && rec.needsRepair.length > 0;
    if (corrupt) return 'corrupt';
    if (isReciterDownloaded(reciterId)) return 'full';
    return 'partial';
  }

  function getStats(reciterId) {
    var rec = _idx[reciterId];
    if (!rec) return { surahs: 0, bytes: 0, full: false, corrupt: false, verifiedAt: null, needsRepair: [] };
    var complete = Object.keys(rec.done).filter(function (sn) {
      return isSurahDownloaded(reciterId, parseInt(sn, 10));
    }).length;
    return {
      surahs:      complete,
      bytes:       rec.bytes || 0,
      full:        isReciterDownloaded(reciterId),
      corrupt:     !!(rec.needsRepair && rec.needsRepair.length),
      verifiedAt:  rec.verifiedAt || null,
      needsRepair: rec.needsRepair || []
    };
  }

  function getAllStats() {
    return Object.keys(_idx).map(function (id) {
      var s = getStats(id);
      if (!s.bytes && !s.surahs) return null;
      var rData = (window.RECITERS || []).filter(function (r) { return r.id === id; })[0] || null;
      return { id: id, name: rData ? rData.name : id, flag: rData ? (rData.flag || '') : '', bytes: s.bytes, surahs: s.surahs, full: s.full, corrupt: s.corrupt };
    }).filter(Boolean);
  }

  function isDownloading(reciterId) {
    return !!(reciterId ? (_act && _act.reciterId === reciterId && !_act.cancelled) : (_act && !_act.cancelled));
  }

  function getProgress(reciterId) {
    if (!_act || _act.reciterId !== reciterId) return null;
    return { done: _act.done, total: _act.total, pct: Math.round(_act.done / _act.total * 100), surah: _act.work[_act.wi] && _act.work[_act.wi].sn };
  }

  _init();

  window.AudioDownloads = {
    // Playback
    getLocalUri:         getLocalUri,
    // Download control
    downloadSurahs:      downloadSurahs,
    cancel:              cancel,
    canDownload:         canDownload,
    // Wi-Fi setting
    isWifiOnly:          isWifiOnly,
    setWifiOnly:         setWifiOnly,
    // Integrity
    verifyReciter:       verifyReciter,
    cancelVerify:        cancelVerify,
    isVerifying:         isVerifying,
    // Delete
    deleteReciter:       deleteReciter,
    deleteSurah:         deleteSurah,
    // Query
    isSurahDownloaded:   isSurahDownloaded,
    isSurahCorrupt:      isSurahCorrupt,
    isReciterDownloaded: isReciterDownloaded,
    hasAnyDownload:      hasAnyDownload,
    dlState:             dlState,
    getStats:            getStats,
    getAllStats:          getAllStats,
    isDownloading:       isDownloading,
    getProgress:         getProgress,
    // Size
    _probeCached:        _probeCached,
    probeReciterSize:    probeReciterSize,
    estimateBytes:       estimateBytes,
    remainingBytes:      remainingBytes,
    fmtBytes:            fmtBytes
  };

})();
