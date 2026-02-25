/**
 * Qibla Compass
 *
 * Draws a live canvas compass that points toward the Kaaba (Mecca).
 * - Uses GPS for precise location; falls back to prayer city coordinates.
 * - Uses DeviceOrientationEvent (absolute) to rotate with the phone,
 *   so the green needle always points toward Mecca no matter how
 *   you turn the device.
 *
 * Usage:
 *   PrayerQibla.init(container, cityCoords, tFn)
 *   PrayerQibla.stop()
 */
(function() {
  'use strict';

  var MECCA = { lat: 21.4225, lon: 39.8262 };

  var _canvas   = null;
  var _ctx      = null;
  var _qibla    = 0;       // bearing from user to Mecca (0-360, clockwise from N)
  var _heading  = 0;       // device compass heading (0-360, clockwise from N)
  var _raf      = null;    // requestAnimationFrame handle
  var _onOrient = null;    // orientation event listener

  function toRad(d) { return d * Math.PI / 180; }

  // Great-circle bearing from (lat,lon) to Mecca
  function calcQibla(lat, lon) {
    var f1 = toRad(lat),   f2 = toRad(MECCA.lat);
    var dl = toRad(MECCA.lon - lon);
    var y  = Math.sin(dl) * Math.cos(f2);
    var x  = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  // Haversine distance to Mecca in km
  function calcDist(lat, lon) {
    var R  = 6371;
    var f1 = toRad(lat), f2 = toRad(MECCA.lat);
    var df = toRad(MECCA.lat - lat);
    var dl = toRad(MECCA.lon - lon);
    var a  = Math.sin(df/2)*Math.sin(df/2) +
             Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)*Math.sin(dl/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // ─── Canvas drawing ────────────────────────────────────────────────────────

  function draw(qibla, heading) {
    if (!_canvas || !_ctx) return;

    // Self-stop if prayer panel is no longer visible
    var panel = document.getElementById('panelPrayer');
    if (panel && !panel.classList.contains('on')) { stopDraw(); return; }

    var W  = _canvas.width, H = _canvas.height;
    var cx = W / 2, cy = H / 2;
    var R  = Math.min(W, H) / 2 - 6;
    var ctx = _ctx;

    ctx.clearRect(0, 0, W, H);

    // ── Compass ring (rotates with device so N always faces true North) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(-heading));

    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tick marks (72 ticks = every 5°)
    for (var i = 0; i < 72; i++) {
      var ang     = toRad(i * 5);
      var isMajor = i % 18 === 0;
      var isMed   = i % 9 === 0;
      var inner   = R * (isMajor ? 0.72 : isMed ? 0.80 : 0.86);
      ctx.beginPath();
      ctx.moveTo(Math.sin(ang) * inner, -Math.cos(ang) * inner);
      ctx.lineTo(Math.sin(ang) * R,     -Math.cos(ang) * R);
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.7)' :
                        isMed   ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
    }

    // Cardinal labels: N (red), E / S / W (gray)
    var cardinals = [
      { label: 'N', angle: 0,   color: '#e55' },
      { label: 'E', angle: 90,  color: '#aaa' },
      { label: 'S', angle: 180, color: '#aaa' },
      { label: 'W', angle: 270, color: '#aaa' }
    ];
    var labelR = R * 0.62;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold ' + Math.round(R * 0.14) + 'px sans-serif';
    cardinals.forEach(function(c) {
      ctx.fillStyle = c.color;
      var a = toRad(c.angle);
      ctx.fillText(c.label, Math.sin(a) * labelR, -Math.cos(a) * labelR);
    });

    ctx.restore();

    // ── Qibla needle (screen-fixed; rotated to point toward Mecca) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(qibla - heading));

    var nLen  = R * 0.66;
    var nBase = R * 0.24;
    var nW    = R * 0.055;

    // Green glow
    ctx.shadowColor = '#4caf50';
    ctx.shadowBlur  = 14;

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(0,    -nLen);
    ctx.lineTo( nW,  -nBase);
    ctx.lineTo(-nW,  -nBase);
    ctx.closePath();
    ctx.fillStyle = '#4caf50';
    ctx.fill();

    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo( nW * 0.55, -nBase);
    ctx.lineTo(-nW * 0.55, -nBase);
    ctx.lineTo(-nW * 0.35,  nBase);
    ctx.lineTo( nW * 0.35,  nBase);
    ctx.closePath();
    ctx.fillStyle = '#388e3c';
    ctx.fill();

    ctx.shadowBlur = 0;

    // Center pivot: green outer, dark inner
    ctx.beginPath(); ctx.arc(0, 0, R * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#4caf50'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = '#111'; ctx.fill();

    // Kaaba symbol above needle tip (uses Unicode, not emoji image)
    ctx.font         = 'bold ' + Math.round(R * 0.13) + 'px sans-serif';
    ctx.fillStyle    = '#fff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 8;
    ctx.fillText('\u{1F54B}', 0, -nLen - 4); // 🕋
    ctx.shadowBlur   = 0;

    ctx.restore();
  }

  function startDraw() {
    if (_raf) return;
    (function frame() {
      draw(_qibla, _heading);
      _raf = requestAnimationFrame(frame);
    })();
  }

  function stopDraw() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  }

  // ─── Device orientation ────────────────────────────────────────────────────

  function startOrientation() {
    if (_onOrient) return;
    _onOrient = function(e) {
      if (e.alpha === null || e.alpha === undefined) return;
      if (e.webkitCompassHeading !== undefined) {
        // iOS: webkitCompassHeading is already clockwise from North
        _heading = e.webkitCompassHeading;
      } else {
        // Android: alpha=0 when device top faces North (absolute=true)
        // Convert to clockwise-from-North heading
        _heading = (360 - e.alpha) % 360;
      }
    };
    window.addEventListener('deviceorientationabsolute', _onOrient, true);
    window.addEventListener('deviceorientation',         _onOrient, true);
  }

  function stopOrientation() {
    if (_onOrient) {
      window.removeEventListener('deviceorientationabsolute', _onOrient, true);
      window.removeEventListener('deviceorientation',         _onOrient, true);
      _onOrient = null;
    }
  }

  // ─── Info element builder (DOM-safe, no innerHTML) ────────────────────────

  function buildInfoEl(infoEl, qibla, dist, approxLabel) {
    while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);

    var t = window.t;
    var degStr  = String(Math.round(qibla)) + '\u00B0';   // e.g. "287°"
    var distStr = dist.toLocaleString() + ' km';

    // Degree chip
    var chip1 = document.createElement('span');
    chip1.className = 'qibla-chip';
    var chip1Lbl = document.createElement('span');
    chip1Lbl.className = 'qibla-chip-label';
    chip1Lbl.textContent = t ? t('prayer.qibla_direction') : 'Direction';
    var chip1Val = document.createElement('strong');
    chip1Val.textContent = degStr;
    chip1.appendChild(chip1Lbl);
    chip1.appendChild(chip1Val);
    infoEl.appendChild(chip1);

    // Distance chip
    var chip2 = document.createElement('span');
    chip2.className = 'qibla-chip';
    var chip2Lbl = document.createElement('span');
    chip2Lbl.className = 'qibla-chip-label';
    chip2Lbl.textContent = t ? t('prayer.qibla_distance') : 'Distance';
    var chip2Val = document.createElement('strong');
    chip2Val.textContent = distStr;
    chip2.appendChild(chip2Lbl);
    chip2.appendChild(chip2Val);
    infoEl.appendChild(chip2);

    // Optional "approx" badge
    if (approxLabel) {
      var badge = document.createElement('span');
      badge.className = 'qibla-approx-badge';
      badge.textContent = approxLabel;
      infoEl.appendChild(badge);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * init(container, cityCoords, tFn)
   *   container  — DOM element to render the compass card into
   *   cityCoords — fallback {lat, lon} if GPS is denied
   *   tFn        — window.t translation function (or null)
   */
  function init(container, cityCoords, tFn) {
    stop();
    while (container.firstChild) container.removeChild(container.firstChild);

    function t(k) { return tFn ? tFn(k) : k; }

    // ── Card ──
    var card = document.createElement('div');
    card.className = 'qibla-card';

    // Title
    var titleEl = document.createElement('div');
    titleEl.className = 'qibla-title';
    titleEl.textContent = t('prayer.qibla_title');
    card.appendChild(titleEl);

    // Canvas
    var size = Math.min(Math.round(window.innerWidth * 0.62), 264);
    var canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    _canvas = canvas;
    _ctx    = canvas.getContext('2d');

    var wrap = document.createElement('div');
    wrap.className = 'qibla-canvas-wrap';
    wrap.appendChild(canvas);
    card.appendChild(wrap);

    // Info row
    var infoEl = document.createElement('div');
    infoEl.className = 'qibla-info';
    var loadingEl = document.createElement('span');
    loadingEl.className = 'qibla-loading';
    loadingEl.textContent = t('prayer.qibla_locating');
    infoEl.appendChild(loadingEl);
    card.appendChild(infoEl);

    container.appendChild(card);

    // Start live compass
    startOrientation();
    startDraw();

    // ── Get location ──
    function onLocation(lat, lon, approx) {
      _qibla = calcQibla(lat, lon);
      buildInfoEl(infoEl, _qibla, calcDist(lat, lon),
                  approx ? t('prayer.qibla_approx') : null);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(pos) { onLocation(pos.coords.latitude, pos.coords.longitude, false); },
        function()    {
          if (cityCoords) { onLocation(cityCoords.lat, cityCoords.lon, true); }
          else {
            while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);
            var errEl = document.createElement('span');
            errEl.className = 'qibla-no-loc';
            errEl.textContent = t('prayer.qibla_no_loc');
            infoEl.appendChild(errEl);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else if (cityCoords) {
      onLocation(cityCoords.lat, cityCoords.lon, true);
    }
  }

  function stop() {
    stopDraw();
    stopOrientation();
    _canvas = null;
    _ctx    = null;
  }

  window.PrayerQibla = { init: init, stop: stop };

})();
