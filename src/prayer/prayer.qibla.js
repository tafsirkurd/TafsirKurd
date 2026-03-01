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
  var _smoothH     = 0;
  var _displayH    = 0;   // interpolated heading used for rendering only
  var _headingBuf  = [];
  var _lastSample  = 0;
  var _hasAbsolute = false;
  var _raf         = null;
  var _onOrient    = null;
  var _isOpen      = false;

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
    _headingBuf.push(raw);
    if (_headingBuf.length > BUF_SIZE) _headingBuf.shift();
    var sinSum = 0, cosSum = 0;
    _headingBuf.forEach(function(h) {
      sinSum += Math.sin(toRad(h));
      cosSum += Math.cos(toRad(h));
    });
    _smoothH = ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;
  }

  // Shortest-arc lerp between two compass angles
  function circularLerp(from, to, k) {
    var diff = ((to - from + 540) % 360) - 180;
    return (from + diff * k + 360) % 360;
  }

  // ── Canvas drawing ───────────────────────────────────────────────────────

  function draw() {
    if (!_canvas || !_ctx || !_isOpen) return;

    var heading = _displayH;
    var qibla   = _qibla;
    var W = _size, H = _size;
    var cx = W / 2, cy = H / 2;
    var R  = W / 2 - 10;
    var ctx = _ctx;

    ctx.clearRect(0, 0, _size, _size);

    // ── Subtle outer glow ring ──
    var glowGrad = ctx.createRadialGradient(cx, cy, R - 4, cx, cy, R + 12);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
    glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // ── Compass ring (rotates with device) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(-heading));

    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Degree ticks
    for (var i = 0; i < 72; i++) {
      var ang     = toRad(i * 5);
      var isMajor = i % 18 === 0;
      var isMed   = i % 9  === 0;
      var inner   = R * (isMajor ? 0.74 : isMed ? 0.82 : 0.88);
      ctx.beginPath();
      ctx.moveTo(Math.sin(ang) * inner, -Math.cos(ang) * inner);
      ctx.lineTo(Math.sin(ang) * R,     -Math.cos(ang) * R);
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,.8)'
                      : isMed   ? 'rgba(255,255,255,.3)'
                                : 'rgba(255,255,255,.1)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
    }

    // Cardinals — small background circles + letter
    var cards = [
      { l: 'N', a: 0,   accent: true  },
      { l: 'E', a: 90,  accent: false },
      { l: 'S', a: 180, accent: false },
      { l: 'W', a: 270, accent: false }
    ];
    var fSize = Math.round(R * 0.14);
    ctx.font = 'bold ' + fSize + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var cr = R * 0.615;
    cards.forEach(function(c) {
      var a = toRad(c.a);
      var x = Math.sin(a) * cr, y = -Math.cos(a) * cr;
      // circle bg
      ctx.beginPath(); ctx.arc(x, y, R * 0.115, 0, Math.PI * 2);
      ctx.fillStyle = c.accent ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.fillStyle = c.accent ? '#ef4444' : 'rgba(255,255,255,.7)';
      ctx.fillText(c.l, x, y);
    });

    ctx.restore();

    // ── Qibla glow arc (fixed, behind needle) ──
    ctx.save();
    ctx.translate(cx, cy);
    var qaRad = toRad(qibla - heading);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.95, qaRad - 0.18, qaRad + 0.18);
    ctx.strokeStyle = 'rgba(74,222,128,0.35)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // ── Qibla needle ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(qibla - heading));

    var nLen  = R * 0.65;
    var nBase = R * 0.20;
    var nW    = R * 0.052;

    // Needle glow
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur  = 20;

    // Arrow head — gradient green
    var grad = ctx.createLinearGradient(0, -nLen, 0, -nBase);
    grad.addColorStop(0, '#86efac');
    grad.addColorStop(1, '#22c55e');
    ctx.beginPath();
    ctx.moveTo(0, -nLen);
    ctx.lineTo( nW, -nBase);
    ctx.lineTo(-nW, -nBase);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Arrow shaft
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo( nW * .5,  -nBase);
    ctx.lineTo(-nW * .5,  -nBase);
    ctx.lineTo(-nW * .32,  nBase);
    ctx.lineTo( nW * .32,  nBase);
    ctx.closePath();
    ctx.fillStyle = '#166534';
    ctx.fill();

    // Kaaba emoji at tip
    ctx.font = Math.round(R * 0.17) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6;
    ctx.fillText('\uD83D\uDDD5', 0, -nLen - 2);
    ctx.shadowBlur = 0;

    ctx.restore();

    // ── Center pivot ──
    ctx.save();
    ctx.translate(cx, cy);
    // Outer ring
    ctx.beginPath(); ctx.arc(0, 0, R * .092, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; ctx.fill();
    // Inner dot
    ctx.beginPath(); ctx.arc(0, 0, R * .046, 0, Math.PI * 2);
    ctx.fillStyle = '#052e16'; ctx.fill();
    ctx.restore();
  }

  function startDraw() {
    if (_raf) return;
    (function frame() {
      if (!_isOpen) { _raf = null; return; }
      _displayH = circularLerp(_displayH, _smoothH, LERP_K);
      draw();
      _raf = requestAnimationFrame(frame);
    })();
  }

  function stopDraw() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  }

  // ── Device orientation ───────────────────────────────────────────────────

  function startOrientation() {
    if (_onOrient) return;
    _onOrient = function(e) {
      if (e.alpha === null || e.alpha === undefined) return;
      if (e.absolute) { _hasAbsolute = true; }
      else if (_hasAbsolute) { return; }

      var now = Date.now();
      if (now - _lastSample < THROTTLE) return;
      _lastSample = now;

      var raw;
      if (typeof e.webkitCompassHeading !== 'undefined') {
        raw = e.webkitCompassHeading;
      } else {
        raw = (360 - e.alpha) % 360;
      }
      addHeading(raw);
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

  // ── Info chips ─────────────────────────────────────────────────────────

  function buildChips(infoEl, qibla, dist, approxStr) {
    while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);
    var t = window.t;
    [[t ? t('prayer.qibla_direction') : 'Direction', Math.round(qibla) + '\u00B0'],
     [t ? t('prayer.qibla_distance')  : 'Distance',  dist.toLocaleString() + ' km']
    ].forEach(function(pair) {
      var chip = document.createElement('div'); chip.className = 'qibla-chip';
      var lbl  = document.createElement('div'); lbl.className  = 'qibla-chip-label'; lbl.textContent = pair[0];
      var val  = document.createElement('div'); val.className  = 'qibla-chip-val';   val.textContent = pair[1];
      chip.appendChild(lbl); chip.appendChild(val);
      infoEl.appendChild(chip);
    });
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
    var size = Math.min(Math.round(window.innerWidth * 0.82), 320);
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
    card.appendChild(canvasWrap);

    var infoEl = document.createElement('div');
    infoEl.className = 'qibla-info'; infoEl.id = 'qiblaInfo';
    var loadEl = document.createElement('span');
    loadEl.className = 'qibla-loading';
    loadEl.textContent = window.t ? window.t('prayer.qibla_locating') : '...';
    infoEl.appendChild(loadEl);
    card.appendChild(infoEl);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function open(cityCoords) {
    buildModal();
    var t = window.t;
    var titleEl = document.getElementById('qiblaModalTitle');
    if (titleEl) titleEl.textContent = t ? t('prayer.qibla_title') : 'Qibla';

    _isOpen      = true;
    _headingBuf  = [];
    _lastSample  = 0;
    _hasAbsolute = false;
    _displayH    = _smoothH;

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
      _qibla = calcQibla(lat, lon);
      buildChips(infoEl, _qibla, calcDist(lat, lon),
                 approx ? (t ? t('prayer.qibla_approx') : '~') : null);
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
            e.textContent = t ? t('prayer.qibla_no_loc') : 'Location unavailable';
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

  function close() {
    _isOpen = false;
    stopDraw();
    stopOrientation();
    var modal = document.getElementById('qiblaModal');
    if (modal) modal.classList.remove('open');
    _canvas = null; _ctx = null;
  }

  window.PrayerQibla = { open: open, close: close };

})();
