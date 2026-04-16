/**
 * Qibla Compass — modal overlay, opened via PrayerQibla.open()
 *
 * Two-stage smoothing:
 *  1. Circular-mean buffer over last BUF_SIZE sensor readings (stable input)
 *  2. Per-frame display lerp (_displayH → _smoothH) for butter-smooth canvas rotation
 */
(function() {
  'use strict';

  var MECCA    = { lat: 21.422487, lon: 39.826206 };
  var BUF_SIZE = 24;   // larger buffer = more stable
  var THROTTLE = 50;   // ms between samples (~20 Hz)
  var LERP_K   = 0.1;  // display lerp factor per frame (60fps → ~95% in 0.5s)

  var _canvas      = null;
  var _ctx         = null;
  var _size        = 0;   // logical canvas size (CSS pixels)
  var _qibla       = 0;
  var _qiblaSet    = false; // true once location is resolved
  var _smoothH     = 0;
  var _displayH    = 0;   // interpolated heading used for rendering only
  var _headingBuf  = [];
  var _lastSample  = 0;
  var _hasAbsolute = false;
  var _raf         = null;
  var _onOrient    = null;
  var _isOpen      = false;
  var _statusEl    = null; // alignment status bar
  var _calibEl     = null; // Android calibration hint
  var _canvasWrap  = null; // canvas wrapper for pulse animation
  var _debugEl     = null; // temporary on-screen debug readout (remove after validation)
  var _lastRaw     = 0;    // most recent raw heading (for debug display)
  var _lastAlignSt     = '';     // last state string — avoids DOM churn
  var _compassReceived = false;  // true once first heading arrives
  var _noDataTimer     = null;   // fires if compass stays silent after open
  var _permDenied      = false;  // iOS motion permission was refused

  function toRad(d) { return d * Math.PI / 180; }

  function calcQibla(lat, lon) {
    var f1 = toRad(lat), f2 = toRad(MECCA.lat);
    var dl = toRad(MECCA.lon - lon);
    var y  = Math.sin(dl) * Math.cos(f2);
    var x  = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  function calcDist(lat, lon) {
    var R = 6371, f1 = toRad(lat), f2 = toRad(MECCA.lat);
    var df = toRad(MECCA.lat - lat), dl = toRad(MECCA.lon - lon);
    var a  = Math.sin(df/2)*Math.sin(df/2) +
             Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)*Math.sin(dl/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // Circular mean for stable heading from buffer
  function addHeading(raw) {
    _lastRaw = raw;
    if (!_compassReceived) {
      _compassReceived = true;
      if (_noDataTimer) { clearTimeout(_noDataTimer); _noDataTimer = null; }
    }
    _headingBuf.push(raw);
    if (_headingBuf.length > BUF_SIZE) _headingBuf.shift();
    var sinSum = 0, cosSum = 0;
    _headingBuf.forEach(function(h) {
      sinSum += Math.sin(toRad(h));
      cosSum += Math.cos(toRad(h));
    });
    _smoothH = ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;

    // Debug: log every 20th sample to console (throttled to avoid spam)
    if (_headingBuf.length % 20 === 0) {
      var drawAngle = ((_qibla - _smoothH) + 360) % 360;
      console.log('[Qibla DEBUG]' +
        ' rawHeading=' + raw.toFixed(1) +
        ' smoothed=' + _smoothH.toFixed(1) +
        ' qiblaBearing=' + _qibla.toFixed(1) +
        ' drawAngle=' + drawAngle.toFixed(1) +
        ' ringRotation=' + (360 - _smoothH).toFixed(1) +
        ' src=webkitCompassHeading(no-offset)');
    }
  }

  // Shortest-arc lerp between two compass angles
  function circularLerp(from, to, k) {
    var diff = ((to - from + 540) % 360) - 180;
    return (from + diff * k + 360) % 360;
  }

  // Smallest angle between two bearings [0, 180]
  function angleDiff(a, b) {
    return Math.abs(((a - b + 540) % 360) - 180);
  }

  // True if heading buffer has low circular variance (R̄ > 0.65)
  function headingStable() {
    if (_headingBuf.length < 8) return true;
    var ss = 0, cs = 0, n = _headingBuf.length;
    _headingBuf.forEach(function(h) { ss += Math.sin(toRad(h)); cs += Math.cos(toRad(h)); });
    return Math.sqrt(ss * ss + cs * cs) / n > 0.65;
  }

  // Update alignment status bar — only writes DOM when state changes
  function updateStatus(diff, stable) {
    if (!_statusEl) return;
    var state = _permDenied        ? 'denied'   :
                !_compassReceived  ? 'nodata'   :
                !stable            ? 'unstable' :
                diff < 5           ? 'aligned'  :
                diff < 22          ? 'near'     : 'far';
    if (state === _lastAlignSt) return;
    var prev = _lastAlignSt;
    _lastAlignSt = state;

    // Haptic pulse on entering aligned
    if (state === 'aligned' && prev !== 'aligned' && window.haptic) window.haptic([15, 10, 15]);

    // Pulse ring on canvas wrap
    if (_canvasWrap) {
      if (state === 'aligned') _canvasWrap.classList.add('qibla-pulse');
      else _canvasWrap.classList.remove('qibla-pulse');
    }

    var t = window.t;
    // Signed diff: positive = Qibla is clockwise = turn right
    var signed = (((_qibla - _displayH) + 540) % 360) - 180;
    var turnRight = signed > 0;

    _statusEl.className = 'qibla-status ' + state;
    if (state === 'aligned') {
      _statusEl.textContent = t ? t('prayer.qibla_aligned')  : '✓ رووی بە قیبلەیێ';
    } else if (state === 'unstable') {
      _statusEl.textContent = t ? t('prayer.qibla_unstable') : '⚠ تەلەفون ب شێوەی ٨ بجووڵێنە';
    } else if (state === 'nodata') {
      _statusEl.textContent = t ? t('prayer.qibla_nodata')   : '↻ تەلەفون ب شێوەی ٨ بجووڵێنە';
    } else if (state === 'denied') {
      _statusEl.textContent = t ? t('prayer.qibla_denied')   : '⚙ Settings › Privacy › Motion';
    } else {
      // direction arrow — universal, no language needed
      _statusEl.textContent = turnRight ? '→' : '←';
    }
  }

  // ── Canvas drawing ───────────────────────────────────────────────────────

  function draw() {
    if (!_canvas || !_ctx || !_isOpen) return;

    var heading = _displayH;
    var qibla   = _qibla;
    var W = _size, H = _size;
    var cx = W / 2, cy = H / 2;
    var R  = W / 2 - 8;
    var ctx = _ctx;
    var aligned = _qiblaSet && angleDiff(heading, qibla) < 5;

    ctx.clearRect(0, 0, W, H);

    // ── Subtle radial bg ──
    var bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bgGrad.addColorStop(0, 'rgba(20,50,32,0.38)');
    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad; ctx.fill();

    // ── Outer glow halo ──
    var haloGrad = ctx.createRadialGradient(cx, cy, R - 4, cx, cy, R + 14);
    haloGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
    haloGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad; ctx.fill();

    // ── Compass ring (rotates with device) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(-heading));

    // Single thin ring
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5; ctx.stroke();

    // N marker — red dot with "N"
    var markerDist = R * 0.84;
    var dotR       = R * 0.075;
    ctx.beginPath(); ctx.arc(0, -markerDist, dotR, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; ctx.fill();
    ctx.font = 'bold ' + Math.round(R * 0.10) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('N', 0, -markerDist);

    // E / S / W — tiny dim dots only
    [90, 180, 270].forEach(function(deg) {
      var a = toRad(deg);
      ctx.beginPath();
      ctx.arc(Math.sin(a) * markerDist, -Math.cos(a) * markerDist, R * 0.028, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
    });

    ctx.restore();

    // ── Qibla beam — fixed direction (doesn't rotate with compass) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(qibla - heading));

    // Wide soft glow wedge
    ctx.beginPath();
    ctx.moveTo(0, R * 0.12);
    ctx.lineTo(-R * 0.13, -R * 0.55);
    ctx.lineTo(0, -R * 0.98);
    ctx.lineTo( R * 0.13, -R * 0.55);
    ctx.closePath();
    ctx.fillStyle = 'rgba(74,222,128,' + (aligned ? 0.22 : 0.08) + ')';
    ctx.fill();

    // Bright inner line
    ctx.beginPath();
    ctx.moveTo(0, R * 0.06);
    ctx.lineTo(0, -R * 0.91);
    ctx.strokeStyle = aligned ? 'rgba(134,239,172,0.80)' : 'rgba(74,222,128,0.38)';
    ctx.lineWidth   = aligned ? 2.5 : 1.5;
    ctx.lineCap = 'round'; ctx.stroke();

    ctx.restore();

    // ── Qibla needle — kite/diamond shape ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(qibla - heading));

    var nLen  = R * 0.58;  // tip
    var nWide = R * 0.24;  // widest point (dist from center)
    var nBase = R * 0.10;  // base (slightly above center)
    var nW    = R * 0.058; // half-width at nWide

    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur  = aligned ? 28 : 14;

    var needleGrad = ctx.createLinearGradient(0, -nLen, 0, -nBase);
    needleGrad.addColorStop(0, aligned ? '#d9f99d' : '#86efac');
    needleGrad.addColorStop(1, '#22c55e');

    ctx.beginPath();
    ctx.moveTo(0, -nLen);
    ctx.lineTo( nW, -nWide);
    ctx.lineTo(0, -nBase);
    ctx.lineTo(-nW, -nWide);
    ctx.closePath();
    ctx.fillStyle = needleGrad; ctx.fill();

    ctx.shadowBlur = 0;

    // Kaaba emoji at tip
    ctx.font = Math.round(R * 0.16) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
    ctx.fillText('\uD83D\uDD4C', 0, -nLen - 2);
    ctx.shadowBlur = 0;

    ctx.restore();

    // ── Center pivot ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.052, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.026, 0, Math.PI * 2);
    ctx.fillStyle = '#052e16'; ctx.fill();
    ctx.restore();
  }

  function startDraw() {
    if (_raf) return;
    (function frame() {
      if (!_isOpen) { _raf = null; return; }
      _displayH = circularLerp(_displayH, _smoothH, LERP_K);
      // Always drive status when qibla is set — includes 'denied'/'nodata' states
      // so the user sees feedback even before compass data arrives.
      if (_qiblaSet) updateStatus(angleDiff(_displayH, _qibla), headingStable());
      else if (_permDenied || !_compassReceived) updateStatus(180, false);
      draw();

      // Update on-screen debug readout (temporary — remove after validation)
      if (_debugEl && _compassReceived) {
        var drawAngle = ((_qibla - _displayH) + 360) % 360;
        _debugEl.textContent =
          'rawHeading:       ' + _lastRaw.toFixed(1) + '°\n' +
          'correctedHeading: ' + _lastRaw.toFixed(1) + '° (no offset)\n' +
          'smoothed:         ' + _smoothH.toFixed(1) + '°\n' +
          'displayHeading:   ' + _displayH.toFixed(1) + '°\n' +
          'qiblaBearing:     ' + _qibla.toFixed(1) + '°\n' +
          'drawAngle:        ' + drawAngle.toFixed(1) + '° (needle)\n' +
          'ringRotation:     ' + ((360 - _displayH) % 360).toFixed(1) + '°\n' +
          'iosSource:        webkitCompassHeading';
      } else if (_debugEl && !_compassReceived && !_permDenied) {
        _debugEl.textContent = 'waiting for compass...';
      } else if (_debugEl && _permDenied) {
        _debugEl.textContent = 'permission denied';
      }

      _raf = requestAnimationFrame(frame);
    })();
  }

  function stopDraw() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  }

  // ── Device orientation ───────────────────────────────────────────────────

  function startOrientation() {
    if (_onOrient) return;

    // Detect iOS once — Capacitor exposes getPlatform(); UA covers Safari testing
    var plat  = window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web';
    var isIos = plat === 'ios' || /iPhone|iPad|iPod/.test(navigator.userAgent);

    _onOrient = function(e) {
      var now = Date.now();
      if (now - _lastSample < THROTTLE) return;

      var raw;
      if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
        // webkitCompassHeading: bearing of the device Y-axis (TOP of phone in portrait),
        // measured clockwise from magnetic north. Range 0–360.
        //   0   = top of phone points North
        //   90  = top of phone points East
        //   180 = top of phone points South
        //   270 = top of phone points West
        //
        // The draw code uses rotate(-heading) for the ring and rotate(qibla-heading)
        // for the needle — both expect exactly this value with NO offset.
        //
        // HISTORY: +90 was added, removed, and re-added multiple times. The audit
        // (Apr 2026) confirms it is WRONG:
        //   - With +90: phone pointing at Qibla → needle shows 270° (hard left)
        //   - Without +90: phone pointing at Qibla → needle shows 0° (straight up) ✓
        // The "+90 made it look right" observation came from testing where the phone
        // was held 90° rotated, not from a valid calibration.
        raw = e.webkitCompassHeading; // correct: no offset
      } else if (isIos) {
        // iOS but this event lacks webkitCompassHeading — skip entirely.
        // NEVER fall back to e.alpha on iOS: iOS alpha is measured from the
        // device's arbitrary startup orientation (not from North) and produces
        // a wrong, slowly-drifting heading when fed into (360 - alpha) % 360.
        return;
      } else {
        // Android: absolute alpha is True North-relative (0 = North, clockwise
        // when mapped via (360 - alpha) % 360).
        // Prefer absolute events; discard relative ones once absolute is seen.
        if (e.alpha === null || e.alpha === undefined) return;
        if (e.absolute) { _hasAbsolute = true; }
        else if (_hasAbsolute) { return; }
        raw = (360 - e.alpha) % 360;
      }

      _lastSample = now;
      addHeading(raw);
    };

    if (isIos) {
      // iOS: ONLY register 'deviceorientation' — it carries webkitCompassHeading.
      //
      // Root-cause fix: on iOS 17+ 'deviceorientationabsolute' fires FIRST (~5 ms
      // ahead of 'deviceorientation') and its payload lacks webkitCompassHeading.
      // Without this split, the 50 ms throttle (_lastSample) lets the wrong alpha
      // event win every tick and the correct iOS event gets dropped every time.
      window.addEventListener('deviceorientation', _onOrient, true);
    } else {
      // Android: prefer absolute (True North); also register relative as fallback
      // for devices that never fire the absolute variant.
      window.addEventListener('deviceorientationabsolute', _onOrient, true);
      window.addEventListener('deviceorientation',         _onOrient, true);
    }
  }

  function stopOrientation() {
    if (_onOrient) {
      window.removeEventListener('deviceorientationabsolute', _onOrient, true);
      window.removeEventListener('deviceorientation',         _onOrient, true);
      _onOrient = null;
    }
  }

  // ── Info row ─────────────────────────────────────────────────────────────

  function buildInfo(infoEl, qibla, dist, approxStr) {
    while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);
    var t = window.t;
    var row = document.createElement('div'); row.className = 'qibla-info-row';
    [[t ? t('prayer.qibla_direction') : 'Direction', Math.round(qibla) + '\u00B0'],
     [t ? t('prayer.qibla_distance')  : 'Distance',  dist.toLocaleString() + ' km']
    ].forEach(function(pair) {
      var item = document.createElement('div'); item.className = 'qibla-info-item';
      var val  = document.createElement('div'); val.className  = 'qibla-info-val';  val.textContent = pair[1];
      var lbl  = document.createElement('div'); lbl.className  = 'qibla-info-lbl';  lbl.textContent = pair[0];
      item.appendChild(val); item.appendChild(lbl);
      row.appendChild(item);
    });
    infoEl.appendChild(row);
    if (approxStr) {
      var badge = document.createElement('div');
      badge.className = 'qibla-approx-badge';
      badge.textContent = approxStr;
      infoEl.appendChild(badge);
    }
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  function buildModal() {
    if (document.getElementById('qiblaModal')) return;
    var overlay = document.createElement('div');
    overlay.id = 'qiblaModal'; overlay.className = 'qibla-modal';
    overlay.onclick = function(e) { if (e.target === overlay) close(); };

    var card = document.createElement('div'); card.className = 'qibla-modal-card';

    var hdr = document.createElement('div'); hdr.className = 'qibla-modal-hdr';
    var titleEl = document.createElement('span');
    titleEl.className = 'qibla-modal-title'; titleEl.id = 'qiblaModalTitle';
    titleEl.textContent = window.t ? window.t('prayer.qibla_title') : 'Qibla';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'qibla-modal-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = close;
    hdr.appendChild(titleEl); hdr.appendChild(closeBtn);
    card.appendChild(hdr);

    var dpr  = window.devicePixelRatio || 1;
    var size = Math.min(Math.round(window.innerWidth * 0.86), 340);
    var canvas = document.createElement('canvas');
    canvas.width  = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    _size   = size;
    _canvas = canvas;
    _ctx    = canvas.getContext('2d');
    _ctx.scale(dpr, dpr);
    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'qibla-canvas-wrap';
    canvasWrap.appendChild(canvas);
    _canvasWrap = canvasWrap;
    card.appendChild(canvasWrap);

    _statusEl = document.createElement('div');
    _statusEl.className = 'qibla-status';
    _statusEl.id = 'qiblaStatus';
    card.appendChild(_statusEl);

    var infoEl = document.createElement('div');
    infoEl.className = 'qibla-info'; infoEl.id = 'qiblaInfo';
    var loadEl = document.createElement('span');
    loadEl.className = 'qibla-loading';
    loadEl.textContent = window.t ? window.t('prayer.qibla_locating') : '...';
    infoEl.appendChild(loadEl);
    card.appendChild(infoEl);

    // Temporary debug readout — visible on-device, remove after validation
    var debugEl = document.createElement('div');
    debugEl.id = 'qiblaDebug';
    debugEl.style.cssText = 'font:11px/1.5 monospace;color:#4ade80;background:rgba(0,0,0,.72);' +
      'border-radius:8px;padding:8px 10px;margin:0 0 6px;text-align:left;direction:ltr;' +
      'white-space:pre;letter-spacing:.01em;';
    debugEl.textContent = 'waiting for compass...';
    card.appendChild(debugEl);
    _debugEl = debugEl;

    // Android calibration hint (shown once per session, dismissed on tap or after 10s)
    var _t = window.t;
    _calibEl = document.createElement('div');
    _calibEl.className = 'qibla-calib'; _calibEl.id = 'qiblaCalib';
    var calibTitle = document.createElement('div'); calibTitle.className = 'qibla-calib-title';
    calibTitle.textContent = _t ? _t('prayer.qibla_calib_title') : 'بۆ تەشخیسا باشتر:';
    _calibEl.appendChild(calibTitle);
    [
      _t ? _t('prayer.qibla_calib_1') : '• فۆنت ب ئاستی ئاو بگرە',
      _t ? _t('prayer.qibla_calib_2') : '• ل مادەی ئاسنی و ئامێرا کارەبایی دوور بخرە',
      _t ? _t('prayer.qibla_calib_3') : '• ئەگەر لەراست نینە، فۆنت بە شێوەی ٨ بجووڵێنە'
    ].forEach(function(txt) {
      var d = document.createElement('div'); d.className = 'qibla-calib-item'; d.textContent = txt;
      _calibEl.appendChild(d);
    });
    var calibClose = document.createElement('button'); calibClose.className = 'qibla-calib-close';
    calibClose.textContent = '×';
    calibClose.onclick = function() {
      _calibEl.classList.remove('on');
      try { sessionStorage.setItem('qiblaCalibDismissed', '1'); } catch(e) {}
    };
    _calibEl.appendChild(calibClose);
    card.appendChild(_calibEl);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function _startAfterPermission(cityCoords) {
    _isOpen          = true;
    _headingBuf      = [];
    _lastSample      = 0;
    _hasAbsolute     = false;
    _displayH        = _smoothH;
    _qiblaSet        = false;
    _lastAlignSt     = '';
    _compassReceived = false;

    // After 5 s without any heading data, surface a hint rather than staying
    // silent. For 'denied', this is the first the user learns permission is off.
    if (_noDataTimer) clearTimeout(_noDataTimer);
    _noDataTimer = setTimeout(function() {
      _noDataTimer = null;
      if (!_isOpen || _compassReceived) return;
      _lastAlignSt = '';          // force status re-render
      updateStatus(180, false);   // diff=180 → not aligned; _permDenied / !_compassReceived state takes priority
      // Show figure-8 calibration card if it's a data issue (not a permission issue)
      if (!_permDenied && _calibEl) {
        try {
          if (!sessionStorage.getItem('qiblaCalibDismissed')) _calibEl.classList.add('on');
        } catch(e) {}
      }
    }, 5000);

    // Re-grab elements (nulled on close, DOM persists across reopens)
    _statusEl   = document.getElementById('qiblaStatus');
    _calibEl    = document.getElementById('qiblaCalib');
    _debugEl    = document.getElementById('qiblaDebug');
    _canvasWrap = document.querySelector('#qiblaModal .qibla-canvas-wrap');

    // Show calibration hint on Android once per session
    var _plat = window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web';
    if (_plat === 'android' && _calibEl) {
      try {
        if (!sessionStorage.getItem('qiblaCalibDismissed')) {
          _calibEl.classList.add('on');
          setTimeout(function() {
            if (_calibEl) { _calibEl.classList.remove('on'); }
            try { sessionStorage.setItem('qiblaCalibDismissed', '1'); } catch(e) {}
          }, 10000);
        }
      } catch(e) {}
    }

    // Re-attach canvas ctx (nulled on close) and reapply DPR scale
    var canvasEl = document.querySelector('#qiblaModal canvas');
    if (canvasEl) {
      _canvas = canvasEl;
      _ctx    = canvasEl.getContext('2d');
      var dpr2 = window.devicePixelRatio || 1;
      _ctx.setTransform(dpr2, 0, 0, dpr2, 0, 0);
    }

    var modal = document.getElementById('qiblaModal');
    if (modal) modal.classList.add('open');

    startOrientation();
    startDraw();

    var infoEl = document.getElementById('qiblaInfo');
    if (!infoEl) return;

    function onLocation(lat, lon, approx) {
      _qibla    = calcQibla(lat, lon);
      _qiblaSet = true;
      buildInfo(infoEl, _qibla, calcDist(lat, lon),
                approx ? (window.t ? window.t('prayer.qibla_approx') : '~') : null);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(pos) { onLocation(pos.coords.latitude, pos.coords.longitude, false); },
        function() {
          if (cityCoords) onLocation(cityCoords.lat, cityCoords.lon, true);
          else {
            while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);
            var e = document.createElement('span');
            e.className = 'qibla-no-loc';
            e.textContent = window.t ? window.t('prayer.qibla_no_loc') : 'Location unavailable';
            infoEl.appendChild(e);
            if (cityCoords) _qibla = calcQibla(cityCoords.lat, cityCoords.lon);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else if (cityCoords) {
      onLocation(cityCoords.lat, cityCoords.lon, true);
    }
  }

  function open(cityCoords) {
    buildModal();
    var t = window.t;
    var titleEl = document.getElementById('qiblaModalTitle');
    if (titleEl) titleEl.textContent = t ? t('prayer.qibla_title') : 'Qibla';

    // iOS 13+ requires explicit permission before DeviceOrientationEvent fires.
    // Must be called inside a user-gesture handler (tap) — which open() always is.
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function(state) {
        _permDenied = (state !== 'granted');
        _startAfterPermission(cityCoords);
      }).catch(function() {
        // Thrown if called outside a gesture, or if permanently denied
        _permDenied = true;
        _startAfterPermission(cityCoords);
      });
    } else {
      _permDenied = false;
      _startAfterPermission(cityCoords);
    }
  }

  function close() {
    _isOpen = false;
    stopDraw();
    stopOrientation();
    if (_noDataTimer) { clearTimeout(_noDataTimer); _noDataTimer = null; }
    _compassReceived = false;
    _permDenied      = false;
    var modal = document.getElementById('qiblaModal');
    if (modal) modal.classList.remove('open');
    _canvas = null; _ctx = null;
    _statusEl = null; _calibEl = null; _debugEl = null; _lastAlignSt = '';
    if (_canvasWrap) { _canvasWrap.classList.remove('qibla-pulse'); }
    _canvasWrap = null;
  }

  window.PrayerQibla = { open: open, close: close };

})();
