/* Qibla Compass — clean rebuild
 *
 * Heading sources:
 *   iOS  → webkitCompassHeading (true-north bearing, 0=N CW, no offset needed)
 *   Android → deviceorientationabsolute alpha (0=N, CCW) → CW heading = (360-alpha)%360
 *
 * Rotation model:
 *   The WORLD element rotates by -heading each frame.
 *   The Kaaba arm is a child of the world, pre-rotated by qiblaBearing (set once).
 *   Net arm position = qiblaBearing - heading.
 *   When heading === qiblaBearing → arm at 0° = top = behind fixed needle. ✓
 *
 * Smoothing:
 *   _headingSmooth accumulates continuously (unbounded int) — no 0/360 wrap glitch.
 *   Each frame: _headingSmooth += shortestDelta(normSmooth, rawHeading) × 0.12
 *   Lerp factor 0.12 ≈ 60% of the way in 8 frames @ 60fps → ~133ms settle.
 *
 * iOS permission flow:
 *   1. open() called (must be from onclick — user gesture)
 *   2. If permission needed → show "tap to enable" button (stays in gesture context)
 *   3. Button click → requestPermission() → granted → attach sensor
 *   4. If denied → show Settings guidance
 *   5. No-data timer: if sensor attached but no readings after 4s → show calibration hint
 */
(function () {
  'use strict';

  var KAABA_LAT = 21.4225;
  var KAABA_LON = 39.8262;
  /* Use Capacitor platform when available — more reliable than UA parsing */
  var IS_IOS = (window.Capacitor && window.Capacitor.getPlatform
                  ? window.Capacitor.getPlatform() === 'ios'
                  : /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream);

  /* ── build compass dial tick marks ──────────────────────────────────────── */
  function _buildDial(svgEl) {
    var ns = 'http://www.w3.org/2000/svg';
    var cx = 100, cy = 100, r0 = 95;
    for (var i = 0; i < 72; i++) {          // every 5°
      var deg = i * 5;
      var rad = deg * Math.PI / 180;
      var isMaj = deg % 90 === 0;           // N/E/S/W
      var isMed = !isMaj && deg % 45 === 0; // diagonals
      var is10  = !isMaj && !isMed && deg % 10 === 0;
      var r1    = isMaj ? 82 : isMed ? 86 : is10 ? 89 : 92;
      var sw    = isMaj ? 1.8  : isMed ? 1.4  : 0.9;
      /* Class drives color per theme via CSS — no hardcoded stroke */
      var cls   = deg === 0 ? 'tick-north' : isMaj ? 'tick-maj' : isMed ? 'tick-med' : is10 ? 'tick-10' : 'tick-5';
      var x1 = cx + r0 * Math.sin(rad), y1 = cy - r0 * Math.cos(rad);
      var x2 = cx + r1 * Math.sin(rad), y2 = cy - r1 * Math.cos(rad);
      var ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', x1.toFixed(2)); ln.setAttribute('y1', y1.toFixed(2));
      ln.setAttribute('x2', x2.toFixed(2)); ln.setAttribute('y2', y2.toFixed(2));
      ln.setAttribute('class', cls);
      ln.setAttribute('stroke-width', String(sw));
      ln.setAttribute('stroke-linecap', 'round');
      svgEl.appendChild(ln);
    }
  }

  /* ── state ── */
  var _started       = false;
  var _bearing       = null;   // Qibla bearing (0–360°)
  var _headingRaw    = null;   // latest sensor value (0–360°)
  var _headingSmooth = 0;      // continuous accumulator (no modulo — avoids wrap glitch)
  var _aligned       = false;
  var _hapticLock    = false;
  var _animId        = null;
  var _sensorFn      = null;
  var _fallbackTimer = null;
  var _noDataTimer   = null;   // fires if sensor attached but no readings after 4s
  var _compassListener = null; // native Compass plugin listener (iOS)
  /* settle physics */
  var _settleOffset  = 0;
  var _settleActive  = false;
  var _prevDiff      = 180;
  var _alignTimer    = null;

  /* ── DOM refs ── */
  var _world, _arm, _glow, _compass, _loading, _kaabaIcon;
  var _prevProx = 0; // previous proximity value — avoids redundant style updates
  var _glowRgb  = '212,175,55'; // set from CSS var --qibla-glow-rgb on open()

  /* ═══════════════════════════════════════════════════
     BEARING  (forward azimuth to Kaaba)
  ═══════════════════════════════════════════════════ */
  function _calcBearing(lat1, lon1) {
    var R  = Math.PI / 180;
    var φ1 = lat1 * R, φ2 = KAABA_LAT * R;
    var Δλ = (KAABA_LON - lon1) * R;
    var x  = Math.sin(Δλ) * Math.cos(φ2);
    var y  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
  }

  /* ═══════════════════════════════════════════════════
     ANGLE MATH
  ═══════════════════════════════════════════════════ */
  // Shortest signed delta from `a` to `b` (-180…+180)
  function _delta(a, b) {
    var d = b - a;
    while (d >  180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  /* ═══════════════════════════════════════════════════
     SENSOR
  ═══════════════════════════════════════════════════ */
  /* Returns the current screen rotation angle (0=portrait, 90=landscape-left,
     270=landscape-right). Used to correct webkitCompassHeading which is always
     relative to the physical device top, not the screen top. */
  function _screenAngle() {
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
      return window.screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return (window.orientation + 360) % 360;
    }
    return 0;
  }

  function _onOrientation(e) {
    var raw;
    if (IS_IOS) {
      /* webkitCompassHeading: 0=North clockwise, measured from physical device top.
         Subtract screen angle so heading is relative to screen top instead. */
      if (e.webkitCompassHeading == null) return;
      raw = (e.webkitCompassHeading - _screenAngle() + 360) % 360;
    } else {
      /* DeviceOrientationAbsolute: alpha=0→North, increases counter-clockwise.
         Convert to CW compass heading: (360 - alpha) % 360 */
      if (e.alpha == null) return;
      raw = (360 - e.alpha + 360) % 360;
    }
    _headingRaw = raw;
    /* Cancel no-data hint timer — we're getting readings */
    if (_noDataTimer) { clearTimeout(_noDataTimer); _noDataTimer = null; }
    /* If loading spinner is still visible (first reading), hide it */
    var loading = document.getElementById('qiblaLoading');
    if (loading && loading.style.display !== 'none') {
      _showCompass();
    }
  }

  function _attachSensor() {
    _sensorFn = _onOrientation;
    var useAbs = !IS_IOS && ('ondeviceorientationabsolute' in window);
    window.addEventListener(
      useAbs ? 'deviceorientationabsolute' : 'deviceorientation',
      _sensorFn, true
    );
  }

  function _detachSensor() {
    /* Native iOS compass — removeAllListeners clears every registered headingUpdate
       listener so stale handles from prior sessions don't pile up in the bridge */
    var CP = IS_IOS && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Compass;
    if (CP) {
      if (CP.removeAllListeners) CP.removeAllListeners().catch(function(){});
      CP.stop().catch(function(){});
    }
    _compassListener = null;
    /* Web DeviceOrientation */
    if (_sensorFn) {
      window.removeEventListener('deviceorientationabsolute', _sensorFn, true);
      window.removeEventListener('deviceorientation',         _sensorFn, true);
      _sensorFn = null;
    }
  }

  function _requestSensor() {
    /* On iOS in Capacitor: use native CLLocationManager heading — more reliable
       than webkitCompassHeading which is often null/wrong in WKWebView. */
    var CP = IS_IOS && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Compass;
    if (CP) {
      CP.start().then(function(res) {
        if (!_started) return;
        if (res && res.status === 'granted') {
          /* addListener returns Promise<handle> in Capacitor 4 — store handle via .then() */
          CP.addListener('headingUpdate', function(data) {
            if (!_started) return;
            var heading = data.heading;
            if (heading == null || heading < 0) return;
            _headingRaw = heading;
            if (_noDataTimer) { clearTimeout(_noDataTimer); _noDataTimer = null; }
            var loading = document.getElementById('qiblaLoading');
            if (loading && loading.style.display !== 'none') _showCompass();
          }).then(function(handle) {
            _compassListener = handle;
          }).catch(function(){});
          /* Show calibration hint if no readings arrive within 4s */
          _noDataTimer = setTimeout(function() {
            if (_started && _headingRaw === null) _showNoDataHint();
          }, 4000);
        } else if (res && res.status === 'denied') {
          _showPermissionDenied();
        } else {
          /* plugin unavailable — fall back to DeviceOrientationEvent */
          _requestSensorWeb();
        }
      }).catch(function() {
        _requestSensorWeb();
      });
    } else if (IS_IOS) {
      _requestSensorWeb();
    } else {
      /* Android — attach directly */
      _attachSensor();
    }
  }

  function _requestSensorWeb() {
    /* Web fallback: DeviceOrientationEvent (requires user gesture on iOS 13+) */
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      _showIosPermissionPrompt();
    } else {
      _attachSensor();
    }
  }

  /* ── iOS permission prompt ───────────────────────────────────────────── */
  function _showIosPermissionPrompt() {
    var loading = document.getElementById('qiblaLoading');
    if (!loading) { _doRequestPermission(); return; }

    /* Replace spinner with a tap-to-enable button */
    while (loading.firstChild) loading.removeChild(loading.firstChild);
    loading.style.display = 'flex';
    loading.style.flexDirection = 'column';
    loading.style.gap = '10px';

    var btn = document.createElement('button');
    btn.style.cssText = 'background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.3);'
      + 'color:#fff;border-radius:12px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;';
    btn.textContent = 'چالاک کردنی پێلاو';  /* Enable Compass */

    var hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:rgba(255,255,255,.55);text-align:center;max-width:160px;';
    hint.textContent = 'Enable motion access for iOS';

    btn.onclick = function(e) {
      e.stopPropagation();
      _doRequestPermission();
    };

    loading.appendChild(btn);
    loading.appendChild(hint);
  }

  function _doRequestPermission() {
    DeviceOrientationEvent.requestPermission()
      .then(function(r) {
        if (r === 'granted') {
          /* Restore spinner while we wait for first reading */
          var loading = document.getElementById('qiblaLoading');
          if (loading) {
            while (loading.firstChild) loading.removeChild(loading.firstChild);
            loading.style.flexDirection = '';
            loading.style.gap = '';
            var sp = document.createElement('div');
            sp.className = 'qibla-spinner';
            loading.appendChild(sp);
            loading.style.display = 'flex';
          }
          _attachSensor();
          /* No-data safety: if sensor is attached but webkitCompassHeading stays
             null for 4 s (device not calibrated / flat on table), show a hint. */
          _noDataTimer = setTimeout(function() {
            if (_started && _headingRaw === null) _showNoDataHint();
          }, 4000);
        } else {
          _showPermissionDenied();
        }
      })
      .catch(function() { _showPermissionDenied(); });
  }

  function _showPermissionDenied() {
    var loading = document.getElementById('qiblaLoading');
    if (!loading) return;
    while (loading.firstChild) loading.removeChild(loading.firstChild);
    loading.style.display = 'flex';
    loading.style.flexDirection = 'column';
    loading.style.gap = '8px';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:22px;';
    icon.textContent = '⚠️';

    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:12px;color:rgba(255,255,255,.75);text-align:center;max-width:170px;line-height:1.5;';
    msg.textContent = 'Motion access denied. Go to iOS Settings → Privacy → Motion & Fitness → enable for this app.';

    loading.appendChild(icon);
    loading.appendChild(msg);
  }

  function _showNoDataHint() {
    var loading = document.getElementById('qiblaLoading');
    if (!loading) return;
    while (loading.firstChild) loading.removeChild(loading.firstChild);
    loading.style.display = 'flex';
    loading.style.flexDirection = 'column';
    loading.style.gap = '8px';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:22px;';
    icon.textContent = '🧭';

    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:12px;color:rgba(255,255,255,.75);text-align:center;max-width:170px;line-height:1.5;';
    msg.textContent = 'Hold the phone upright and move it in a figure-8 to calibrate the compass.';

    loading.appendChild(icon);
    loading.appendChild(msg);
  }

  /* ═══════════════════════════════════════════════════
     LOCATION
  ═══════════════════════════════════════════════════ */
  function _getLocation(cb) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (p) { cb(p.coords.latitude, p.coords.longitude); },
        function ()  { _cityFallback(cb); },
        { timeout: 2000, maximumAge: 600000, enableHighAccuracy: false }
      );
    } else {
      _cityFallback(cb);
    }
  }

  function _cityFallback(cb) {
    var city = localStorage.getItem('prayerCity') || 'Sulaymaniyah';
    var cc   = window.PrayerLogic && window.PrayerLogic.CITY_COORDS;
    var c    = cc ? cc[city] : null;
    cb(c ? c.lat : 35.5580, c ? c.lon : 45.4350);
  }

  /* ═══════════════════════════════════════════════════
     ANIMATION LOOP
  ═══════════════════════════════════════════════════ */
  function _loop() {
    if (!_started) return;
    _animId = requestAnimationFrame(_loop);

    if (_headingRaw === null || _bearing === null || !_world) return;

    var normSmooth = ((_headingSmooth % 360) + 360) % 360;
    var rawDiff    = Math.abs(_delta(normSmooth, _headingRaw));

    /* ── Lerp curve: faster far away, magnetically slow near Qibla ───────
       >20°  → 0.16 (quick sweep)
       10–20° → 0.12–0.16 (eases in)
       5–10° → 0.05–0.12 (magnetic pull-down)
       <5°   → 0.05 (crawl to lock)  */
    var lerpFactor = rawDiff > 20 ? 0.16
                   : rawDiff > 10 ? 0.12 + (rawDiff - 10) / 10 * 0.04
                   : rawDiff > 5  ? 0.05 + (rawDiff - 5) / 5 * 0.07
                   : 0.05;

    var prevSmooth = _headingSmooth;
    _headingSmooth += _delta(normSmooth, _headingRaw) * lerpFactor;
    var dHeading   = _headingSmooth - prevSmooth;  // velocity this frame

    /* ── Settle physics: overshoot + spring-back when crossing 3° ────────
       Triggered once per alignment entry. Offset decays at 0.80/frame
       (~250–300ms to settle). Applied additively to the world rotation.  */
    if (!_settleActive && rawDiff < 3 && _prevDiff >= 3) {
      _settleOffset = dHeading * -40;                    // amplify velocity
      _settleOffset = Math.max(-1.8, Math.min(1.8, _settleOffset));
      /* Guarantee minimum feel even when lerp has nearly stalled */
      if (Math.abs(_settleOffset) < 0.4) {
        _settleOffset = dHeading >= 0 ? -0.4 : 0.4;
      }
      _settleActive = true;
    }
    if (_settleActive) {
      if (Math.abs(_settleOffset) > 0.01) {
        _settleOffset *= 0.80;
      } else {
        _settleOffset = 0;
        _settleActive = false;
      }
    }
    _prevDiff = rawDiff;

    _world.style.transform = 'rotateZ(' + (-_headingSmooth + _settleOffset) + 'deg)';

    /* ── Proximity-driven glow (0 at 10°, 1 at 0°) ───────────────────── */
    var normH = ((_headingSmooth % 360) + 360) % 360;
    var diff  = Math.abs(_delta(normH, _bearing));
    var prox  = diff < 10 ? 1 - diff / 10 : 0;

    /* Only update DOM when prox changes by >1% — avoids redundant paints */
    if (Math.abs(prox - _prevProx) > 0.01) {
      _prevProx = prox;
      if (_glow) {
        if (prox > 0.02) {
          var sz  = (30 + 26 * prox).toFixed(0);
          _glow.style.borderColor = 'rgba(' + _glowRgb + ',' + (0.45 * prox).toFixed(3) + ')';
          _glow.style.boxShadow   =
            '0 0 ' + sz + 'px rgba(' + _glowRgb + ',' + (0.18 * prox).toFixed(3) + '),' +
            'inset 0 0 ' + sz + 'px rgba(' + _glowRgb + ',' + (0.06 * prox).toFixed(3) + ')';
        } else {
          _glow.style.borderColor = 'transparent';
          _glow.style.boxShadow   = 'none';
        }
      }
    }

    /* ── Alignment with hysteresis + 120ms anticipation delay ───────────
       Enter at <3°, exit at >3.5° — prevents flickering at the boundary.
       The 120ms timer confirms the user held alignment before triggering
       the visual/haptic feedback.                                         */
    var nowOn = _aligned ? diff < 3.5 : diff < 3;

    if (nowOn && !_aligned && !_alignTimer) {
      _alignTimer = setTimeout(function () {
        _alignTimer = null;
        if (!_started) return;
        var curNorm = ((_headingSmooth % 360) + 360) % 360;
        var curDiff = Math.abs(_delta(curNorm, _bearing));
        if (curDiff < 3.5) {
          _aligned = true;
          if (_kaabaIcon) _kaabaIcon.classList.add('qibla-aligned');
          if (_compass) {
            _compass.classList.remove('qibla-compass--pulse');
            void _compass.offsetWidth;
            _compass.classList.add('qibla-compass--pulse');
          }
          if (!_hapticLock) {
            _hapticLock = true;
            setTimeout(function () { _hapticLock = false; }, 2500);
            if (window.haptic) haptic([12]);
          }
        }
      }, 120);
    }

    if (!nowOn && _aligned) {
      _aligned = false;
      if (_alignTimer) { clearTimeout(_alignTimer); _alignTimer = null; }
      if (_kaabaIcon) _kaabaIcon.classList.remove('qibla-aligned');
      if (_compass)   _compass.classList.remove('qibla-compass--pulse');
    }

    /* Cancel pending alignment if user drifted back out before 120ms */
    if (!nowOn && _alignTimer) {
      clearTimeout(_alignTimer);
      _alignTimer = null;
    }
  }

  /* ═══════════════════════════════════════════════════
     DOM
  ═══════════════════════════════════════════════════ */
  function _initDom() {
    _world     = document.getElementById('qiblaWorld');
    _arm       = document.getElementById('qiblaKaabaArm');
    _glow      = document.getElementById('qiblaGlow');
    _compass   = document.getElementById('qiblaCompass');
    _loading   = document.getElementById('qiblaLoading');
    _kaabaIcon = document.getElementById('qiblaKaabaIcon');
    /* Build tick marks once */
    var dial = document.getElementById('qiblaDial');
    if (dial && !dial.dataset.built) { _buildDial(dial); dial.dataset.built = '1'; }
  }

  function _showCompass() {
    if (_loading) _loading.style.display = 'none';
    if (_compass) {
      _compass.style.transition = 'opacity .5s ease';
      _compass.style.opacity    = '1';
    }
  }

  /* ═══════════════════════════════════════════════════
     PUBLIC API
  ═══════════════════════════════════════════════════ */
  function open() {
    var overlay = document.getElementById('qiblaOverlay');
    if (overlay) overlay.classList.add('qibla-open');

    if (_started) return;
    _started       = true;
    _headingRaw    = null;
    _headingSmooth = 0;
    _aligned       = false;
    _bearing       = null;
    _prevProx      = 0;
    _settleOffset  = 0;
    _settleActive  = false;
    _prevDiff      = 180;
    if (_alignTimer) { clearTimeout(_alignTimer); _alignTimer = null; }
    _glowRgb = (getComputedStyle(document.documentElement)
                  .getPropertyValue('--qibla-glow-rgb') || '212,175,55').trim();

    _initDom();

    if (_loading) { _loading.style.display = 'flex'; }
    if (_compass) { _compass.style.transition = 'none'; _compass.style.opacity = '0'; }
    if (_glow)    { _glow.classList.remove('qibla-glow--on'); }

    /* Request sensor within this user-gesture call stack (iOS permission) */
    _requestSensor();

    /* On orientation change reset heading smooth so compass doesn't jump */
    window.addEventListener('orientationchange', function _oc() {
      if (!_started) { window.removeEventListener('orientationchange', _oc); return; }
      _headingRaw = null;
      _headingSmooth = 0;
    });

    /* Get location → set bearing → show compass */
    _getLocation(function (lat, lon) {
      if (!_started) return;
      _bearing = _calcBearing(lat, lon);
      if (_arm) _arm.style.transform = 'rotateZ(' + _bearing + 'deg)';
      _showCompass();
    });

    /* Fallback: show compass after 3 s even if geolocation hangs */
    _fallbackTimer = setTimeout(function () {
      if (_started && _compass && _compass.style.opacity !== '1') _showCompass();
    }, 3000);

    _loop();
  }

  function close() {
    var overlay = document.getElementById('qiblaOverlay');
    if (overlay) overlay.classList.remove('qibla-open');

    _started = false;
    _detachSensor();
    if (_animId)       { cancelAnimationFrame(_animId);  _animId       = null; }
    if (_fallbackTimer){ clearTimeout(_fallbackTimer);   _fallbackTimer = null; }
    if (_alignTimer)   { clearTimeout(_alignTimer);      _alignTimer   = null; }
    if (_noDataTimer)  { clearTimeout(_noDataTimer);     _noDataTimer  = null; }
    /* Reset loading element to plain spinner for next open */
    var loading = document.getElementById('qiblaLoading');
    if (loading) {
      while (loading.firstChild) loading.removeChild(loading.firstChild);
      loading.style.flexDirection = '';
      loading.style.gap = '';
      var sp = document.createElement('div');
      sp.className = 'qibla-spinner';
      loading.appendChild(sp);
    }
    _headingRaw   = null;
    _aligned      = false;
    _settleOffset = 0;
    _settleActive = false;
    _prevDiff     = 180;
    if (_glow)      _glow.classList.remove('qibla-glow--on');
    if (_kaabaIcon) _kaabaIcon.classList.remove('qibla-aligned');
  }

  window.QiblaUI = { open: open, close: close };
})();
