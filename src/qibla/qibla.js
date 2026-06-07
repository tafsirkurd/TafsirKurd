/* Qibla Compass — bulletproof rebuild
 *
 * Sensor strategy (iOS Capacitor):
 *   1. Start native CompassPlugin (CLLocationManager heading)
 *   2. Listen for 'headingUpdate' events (push from native)
 *   3. ALSO poll getHeading() every 100ms as backup (in case events don't fire)
 *   4. If neither works after 4s → try web DeviceOrientationEvent
 *   5. If nothing works after 8s → show calibration hint
 *
 * Android:
 *   Uses deviceorientationabsolute event directly.
 *
 * Rotation model:
 *   The WORLD element rotates by -heading each frame.
 *   The Kaaba arm is a child of the world, pre-rotated by qiblaBearing.
 *   When heading === qiblaBearing → arm at top = behind fixed needle. ✓
 */
(function () {
  'use strict';

  var KAABA_LAT = 21.4225;
  var KAABA_LON = 39.8262;
  var IS_IOS = (window.Capacitor && window.Capacitor.getPlatform
                  ? window.Capacitor.getPlatform() === 'ios'
                  : /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream);

  /* ── build compass dial — 12 minimal marks (luxury watch style) ────────── */
  function _buildDial(svgEl) {
    var ns = 'http://www.w3.org/2000/svg';
    var cx = 100, cy = 100, r0 = 94;
    for (var i = 0; i < 12; i++) {
      var deg = i * 30;
      if (deg === 0) continue; // north handled by triangle in HTML
      var rad = deg * Math.PI / 180;
      var isCardinal = deg % 90 === 0;
      var r1  = isCardinal ? 83 : 87;
      var sw  = isCardinal ? 1.6 : 1.0;
      var cls = isCardinal ? 'tick-cardinal' : 'tick-inter';
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
  var _bearing       = null;
  var _headingRaw    = null;
  var _headingSmooth = 0;
  var _aligned       = false;
  var _hapticLock    = false;
  var _animId        = null;
  var _sensorFn      = null;
  var _fallbackTimer = null;
  var _noDataTimer   = null;
  var _compassListener = null;
  var _orientationFn   = null;
  var _pollInterval    = null;   // polling interval for getHeading()
  /* settle physics */
  var _settleOffset  = 0;
  var _settleActive  = false;
  var _prevDiff      = 180;
  var _alignTimer    = null;

  /* ── DOM refs ── */
  var _world, _arm, _glow, _compass, _loading, _kaabaIcon;
  var _prevProx = 0;
  var _glowRgb  = '212,175,55';

  /* ═══════════════════════════════════════════════════
     BEARING
  ═══════════════════════════════════════════════════ */
  function _calcBearing(lat1, lon1) {
    var R  = Math.PI / 180;
    var p1 = lat1 * R, p2 = KAABA_LAT * R;
    var dl = (KAABA_LON - lon1) * R;
    var x  = Math.sin(dl) * Math.cos(p2);
    var y  = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
  }

  /* ═══════════════════════════════════════════════════
     ANGLE MATH
  ═══════════════════════════════════════════════════ */
  function _delta(a, b) {
    var d = b - a;
    while (d >  180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  /* ═══════════════════════════════════════════════════
     SENSOR — screen rotation correction
  ═══════════════════════════════════════════════════ */
  function _screenAngle() {
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
      return window.screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return (window.orientation + 360) % 360;
    }
    return 0;
  }

  function _setHeading(raw) {
    _headingRaw = (raw - _screenAngle() + 360) % 360;
    /* First reading — hide loading, show compass */
    if (_loading && _loading.style.display !== 'none') {
      _showCompass();
    }
  }

  /* ═══════════════════════════════════════════════════
     SENSOR — native Capacitor plugin (iOS)
  ═══════════════════════════════════════════════════ */
  function _getCompassPlugin() {
    if (!IS_IOS) return null;
    if (!window.Capacitor) return null;
    if (!window.Capacitor.Plugins) return null;
    return window.Capacitor.Plugins.Compass || null;
  }

  function _startNativeCompass() {
    var CP = _getCompassPlugin();
    if (!CP) {
      console.log('[Qibla] No native Compass plugin — skipping');
      return;
    }

    console.log('[Qibla] Starting native Compass plugin...');

    // Method 1: Event listener (push)
    try {
      CP.addListener('headingUpdate', function(data) {
        if (!_started) return;
        if (data && data.heading != null && data.heading >= 0) {
          _setHeading(data.heading);
        }
      }).then(function(handle) {
        _compassListener = handle;
        console.log('[Qibla] headingUpdate listener attached');
      }).catch(function(e) {
        console.log('[Qibla] addListener failed:', e);
      });
    } catch(e) {
      console.log('[Qibla] addListener exception:', e);
    }

    // Call start() to begin heading updates
    CP.start().then(function(res) {
      console.log('[Qibla] Compass.start() result:', JSON.stringify(res));
      if (!_started) return;

      if (res && res.status === 'granted') {
        // Method 2: Poll getHeading() every 100ms as backup
        // This guarantees we get data even if notifyListeners is broken
        _startPolling(CP);
      } else if (res && res.status === 'denied') {
        console.log('[Qibla] Compass denied — trying web fallback');
        _tryWebFallback();
      } else if (res && res.status === 'unavailable') {
        console.log('[Qibla] Compass unavailable — trying web fallback');
        _tryWebFallback();
      }
    }).catch(function(e) {
      console.log('[Qibla] Compass.start() failed:', e, '— trying web fallback');
      _tryWebFallback();
    });

    // Safety net: if no data after 4s from native, also try web
    _noDataTimer = setTimeout(function() {
      if (_started && _headingRaw === null) {
        console.log('[Qibla] No native data after 4s — trying web fallback too');
        _tryWebFallback();
      }
    }, 4000);
  }

  function _startPolling(CP) {
    if (_pollInterval) return; // already polling
    if (!CP || !CP.getHeading) {
      console.log('[Qibla] getHeading not available — relying on events only');
      return;
    }
    console.log('[Qibla] Starting getHeading() polling as backup');
    _pollInterval = setInterval(function() {
      if (!_started) { _stopPolling(); return; }
      CP.getHeading().then(function(data) {
        if (!_started) return;
        if (data && data.heading != null && data.heading >= 0) {
          _setHeading(data.heading);
        }
      }).catch(function() {});
    }, 100);
  }

  function _stopPolling() {
    if (_pollInterval) {
      clearInterval(_pollInterval);
      _pollInterval = null;
    }
  }

  /* ═══════════════════════════════════════════════════
     SENSOR — web DeviceOrientation fallback
  ═══════════════════════════════════════════════════ */
  function _onOrientation(e) {
    var raw;
    if (IS_IOS) {
      if (e.webkitCompassHeading == null) return;
      raw = e.webkitCompassHeading;
    } else {
      if (e.alpha == null) return;
      raw = (360 - e.alpha + 360) % 360;
    }
    _setHeading(raw);
  }

  function _attachWebSensor() {
    if (_sensorFn) return; // already attached
    console.log('[Qibla] Attaching web DeviceOrientation sensor');
    _sensorFn = _onOrientation;
    var useAbs = !IS_IOS && ('ondeviceorientationabsolute' in window);
    window.addEventListener(
      useAbs ? 'deviceorientationabsolute' : 'deviceorientation',
      _sensorFn, true
    );
  }

  function _detachSensor() {
    // Stop native
    var CP = _getCompassPlugin();
    if (CP) {
      try { if (CP.removeAllListeners) CP.removeAllListeners().catch(function(){}); } catch(e) {}
      try { CP.stop().catch(function(){}); } catch(e) {}
    }
    _compassListener = null;
    _stopPolling();
    // Stop web
    if (_sensorFn) {
      window.removeEventListener('deviceorientationabsolute', _sensorFn, true);
      window.removeEventListener('deviceorientation',         _sensorFn, true);
      _sensorFn = null;
    }
  }

  function _tryWebFallback() {
    if (_sensorFn) return; // already attached
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ — needs user gesture. Show button.
      _showIosPermissionPrompt();
    } else {
      _attachWebSensor();
    }
  }

  /* ═══════════════════════════════════════════════════
     SENSOR — main entry
  ═══════════════════════════════════════════════════ */
  function _requestSensor() {
    if (IS_IOS) {
      _startNativeCompass();
    } else {
      // Android — attach web sensor directly
      _attachWebSensor();
    }

    // Absolute last resort: if nothing works after 8s, show hint
    setTimeout(function() {
      if (_started && _headingRaw === null) {
        _showNoDataHint();
      }
    }, 8000);
  }

  /* ── iOS web permission prompt ─────────────────────────────────────────── */
  function _showIosPermissionPrompt() {
    if (_headingRaw !== null) return;
    var loading = document.getElementById('qiblaLoading');
    if (!loading) { _doRequestPermission(); return; }

    while (loading.firstChild) loading.removeChild(loading.firstChild);
    loading.style.display = 'flex';

    var btn = document.createElement('button');
    btn.className = 'qibla-perm-btn';
    btn.innerHTML = '<i class="fas fa-compass"></i>';
    btn.onclick = function(e) {
      e.stopPropagation();
      _doRequestPermission();
    };
    loading.appendChild(btn);
  }

  function _doRequestPermission() {
    DeviceOrientationEvent.requestPermission()
      .then(function(r) {
        if (r === 'granted') {
          var loading = document.getElementById('qiblaLoading');
          if (loading) {
            while (loading.firstChild) loading.removeChild(loading.firstChild);
            var pr = document.createElement('div');
            pr.className = 'qibla-pulse-ring';
            loading.appendChild(pr);
            loading.style.display = 'flex';
          }
          _attachWebSensor();
        } else {
          _showPermissionDenied();
        }
      })
      .catch(function() { _showPermissionDenied(); });
  }

  function _showPermissionDenied() {
    if (_headingRaw !== null) return;
    var loading = document.getElementById('qiblaLoading');
    if (!loading) return;
    while (loading.firstChild) loading.removeChild(loading.firstChild);
    loading.style.display = 'flex';

    var icon = document.createElement('div');
    icon.className = 'qibla-error-icon';
    icon.innerHTML = '<i class="fas fa-lock"></i>';
    loading.appendChild(icon);
  }

  function _showNoDataHint() {
    if (_headingRaw !== null) return;
    var loading = document.getElementById('qiblaLoading');
    if (!loading) return;
    while (loading.firstChild) loading.removeChild(loading.firstChild);
    loading.style.display = 'flex';

    var icon = document.createElement('div');
    icon.className = 'qibla-error-icon';
    icon.innerHTML = '<i class="fas fa-sync-alt"></i>';
    loading.appendChild(icon);
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

    var lerpFactor = rawDiff > 20 ? 0.16
                   : rawDiff > 10 ? 0.12 + (rawDiff - 10) / 10 * 0.04
                   : rawDiff > 5  ? 0.05 + (rawDiff - 5) / 5 * 0.07
                   : 0.05;

    var prevSmooth = _headingSmooth;
    _headingSmooth += _delta(normSmooth, _headingRaw) * lerpFactor;
    var dHeading   = _headingSmooth - prevSmooth;

    if (!_settleActive && rawDiff < 3 && _prevDiff >= 3) {
      _settleOffset = dHeading * -40;
      _settleOffset = Math.max(-1.8, Math.min(1.8, _settleOffset));
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

    var normH = ((_headingSmooth % 360) + 360) % 360;
    var diff  = Math.abs(_delta(normH, _bearing));
    var prox  = diff < 10 ? 1 - diff / 10 : 0;

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
            // Medium impact on Qibla lock — clear, satisfying confirmation
            if(window.H){ window.H.medium(); }
            else if(window.haptic){ window.haptic([35]); }
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
    if (window.PrayerUI && PrayerUI._pauseSkyForQibla) PrayerUI._pauseSkyForQibla();

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
    _initDom();

    setTimeout(function() {
      _glowRgb = (getComputedStyle(document.documentElement)
                    .getPropertyValue('--qibla-glow-rgb') || '212,175,55').trim();
    }, 0);

    if (_loading) { _loading.style.display = 'flex'; }
    if (_compass) { _compass.style.transition = 'none'; _compass.style.opacity = '0'; }
    if (_glow)    { _glow.classList.remove('qibla-glow--on'); }

    _requestSensor();

    if (!_orientationFn) {
      _orientationFn = function() {
        if (!_started) return;
        _headingRaw = null;
        _headingSmooth = 0;
      };
      window.addEventListener('orientationchange', _orientationFn);
    }

    _getLocation(function (lat, lon) {
      if (!_started) return;
      _bearing = _calcBearing(lat, lon);
      if (_arm) _arm.style.transform = 'rotateZ(' + _bearing + 'deg)';
      // Only show compass if we also have heading data, or after fallback timer
    });

    _fallbackTimer = setTimeout(function () {
      if (_started && _compass && _compass.style.opacity !== '1') _showCompass();
    }, 1500);

    _loop();
  }

  function close() {
    var overlay = document.getElementById('qiblaOverlay');
    if (overlay) overlay.classList.remove('qibla-open');

    _started = false;
    _detachSensor();
    if (_animId)        { cancelAnimationFrame(_animId);  _animId        = null; }
    if (_fallbackTimer) { clearTimeout(_fallbackTimer);   _fallbackTimer = null; }
    if (_alignTimer)    { clearTimeout(_alignTimer);      _alignTimer    = null; }
    if (_noDataTimer)   { clearTimeout(_noDataTimer);     _noDataTimer   = null; }
    if (_orientationFn) { window.removeEventListener('orientationchange', _orientationFn); _orientationFn = null; }
    var loading = document.getElementById('qiblaLoading');
    if (loading) {
      while (loading.firstChild) loading.removeChild(loading.firstChild);
      var pr = document.createElement('div');
      pr.className = 'qibla-pulse-ring';
      loading.appendChild(pr);
    }
    _headingRaw   = null;
    _aligned      = false;
    _settleOffset = 0;
    _settleActive = false;
    _prevDiff     = 180;
    if (_glow)      _glow.classList.remove('qibla-glow--on');
    if (_kaabaIcon) _kaabaIcon.classList.remove('qibla-aligned');
    if (window.PrayerUI && PrayerUI._resumeSkyForQibla) PrayerUI._resumeSkyForQibla();
  }

  window.QiblaUI = { open: open, close: close };
})();
