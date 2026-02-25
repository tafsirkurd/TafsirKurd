/**
 * Qibla Compass — modal overlay, opened via PrayerQibla.open()
 *
 * Smoothing: circular mean over a rolling buffer of the last BUF_SIZE
 * readings (sampled at max 15 Hz). This is the mathematically correct
 * way to average angles (handles 0/360 wrap) and keeps the needle
 * visually still when the phone is resting on a surface.
 */
(function() {
  'use strict';

  var MECCA    = { lat: 21.4225, lon: 39.8262 };
  var BUF_SIZE = 12;   // rolling window (~0.8 s at 15 Hz)
  var THROTTLE = 66;   // ms between orientation samples (~15 Hz)

  var _canvas      = null;
  var _ctx         = null;
  var _qibla       = 0;
  var _smoothH     = 0;
  var _headingBuf  = [];   // rolling buffer of raw headings
  var _lastSample  = 0;
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

  // ── Circular mean of buffered headings ──────────────────────────────────
  // Correct angle averaging: convert to unit vectors, average, convert back.

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

  // ── Canvas drawing ───────────────────────────────────────────────────────

  function draw() {
    if (!_canvas || !_ctx || !_isOpen) return;
    // heading is updated by orientation events, not here — no smoothing in draw loop

    var heading = _smoothH;
    var qibla   = _qibla;
    var W = _canvas.width, H = _canvas.height;
    var cx = W / 2, cy = H / 2;
    var R  = Math.min(W, H) / 2 - 8;
    var ctx = _ctx;

    ctx.clearRect(0, 0, W, H);

    // ── Compass ring (rotates with device) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(-heading));

    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Degree ticks
    for (var i = 0; i < 72; i++) {
      var ang     = toRad(i * 5);
      var isMajor = i % 18 === 0;
      var isMed   = i % 9  === 0;
      var inner   = R * (isMajor ? 0.73 : isMed ? 0.81 : 0.87);
      ctx.beginPath();
      ctx.moveTo(Math.sin(ang) * inner, -Math.cos(ang) * inner);
      ctx.lineTo(Math.sin(ang) * R,     -Math.cos(ang) * R);
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,.75)'
                      : isMed   ? 'rgba(255,255,255,.3)'
                                : 'rgba(255,255,255,.1)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
    }

    // Cardinals
    var cards = [
      { l: 'N', a: 0,   c: '#e55' },
      { l: 'E', a: 90,  c: '#999' },
      { l: 'S', a: 180, c: '#999' },
      { l: 'W', a: 270, c: '#999' }
    ];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(R * 0.14) + 'px sans-serif';
    cards.forEach(function(c) {
      ctx.fillStyle = c.c;
      var a = toRad(c.a);
      ctx.fillText(c.l, Math.sin(a) * R * 0.62, -Math.cos(a) * R * 0.62);
    });

    ctx.restore();

    // ── Qibla needle (fixed on screen; angle = qibla − heading) ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(toRad(qibla - heading));

    var nLen = R * 0.67, nBase = R * 0.22, nW = R * 0.057;

    ctx.shadowColor = '#4caf50'; ctx.shadowBlur = 16;

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(0, -nLen); ctx.lineTo(nW, -nBase); ctx.lineTo(-nW, -nBase);
    ctx.closePath(); ctx.fillStyle = '#4caf50'; ctx.fill();

    // Arrow shaft
    ctx.beginPath();
    ctx.moveTo( nW * .55, -nBase); ctx.lineTo(-nW * .55, -nBase);
    ctx.lineTo(-nW * .35,  nBase); ctx.lineTo( nW * .35,  nBase);
    ctx.closePath(); ctx.fillStyle = '#2e7d32'; ctx.fill();

    ctx.shadowBlur = 0;

    // Pivot
    ctx.beginPath(); ctx.arc(0, 0, R * .09, 0, Math.PI*2);
    ctx.fillStyle = '#4caf50'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * .045, 0, Math.PI*2);
    ctx.fillStyle = '#111'; ctx.fill();

    // 🕋 at tip
    ctx.font = Math.round(R * 0.18) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 8;
    ctx.fillText('\uD83D\uDDD5', 0, -nLen - 4);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function startDraw() {
    if (_raf) return;
    (function frame() {
      if (!_isOpen) { _raf = null; return; }
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
      var now = Date.now();
      if (now - _lastSample < THROTTLE) return;   // cap at ~15 Hz
      _lastSample = now;

      var raw;
      if (typeof e.webkitCompassHeading !== 'undefined') {
        raw = e.webkitCompassHeading;             // iOS: already CW from N
      } else {
        raw = (360 - e.alpha) % 360;              // Android
      }
      addHeading(raw);                            // update circular mean
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

  // ── Info chips (DOM-safe) ─────────────────────────────────────────────────

  function buildChips(infoEl, qibla, dist, approxStr) {
    while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);

    var t = window.t;
    [[t ? t('prayer.qibla_direction') : 'Direction',
      Math.round(qibla) + '\u00B0'],
     [t ? t('prayer.qibla_distance')  : 'Distance',
      dist.toLocaleString() + ' km']
    ].forEach(function(pair) {
      var chip = document.createElement('div');
      chip.className = 'qibla-chip';
      var lbl = document.createElement('div');
      lbl.className = 'qibla-chip-label';
      lbl.textContent = pair[0];
      var val = document.createElement('div');
      val.className = 'qibla-chip-val';
      val.textContent = pair[1];
      chip.appendChild(lbl);
      chip.appendChild(val);
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
    overlay.id        = 'qiblaModal';
    overlay.className = 'qibla-modal';
    overlay.onclick   = function(e) { if (e.target === overlay) close(); };

    var card = document.createElement('div');
    card.className = 'qibla-modal-card';

    // Header row
    var hdr = document.createElement('div');
    hdr.className = 'qibla-modal-hdr';
    var titleEl = document.createElement('span');
    titleEl.className = 'qibla-modal-title';
    titleEl.id = 'qiblaModalTitle';
    var t = window.t;
    titleEl.textContent = t ? t('prayer.qibla_title') : 'Qibla';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'qibla-modal-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = close;
    hdr.appendChild(titleEl);
    hdr.appendChild(closeBtn);
    card.appendChild(hdr);

    // Canvas
    var size = Math.min(Math.round(window.innerWidth * 0.78), 300);
    var canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    _canvas = canvas;
    _ctx    = canvas.getContext('2d');

    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'qibla-canvas-wrap';
    canvasWrap.appendChild(canvas);
    card.appendChild(canvasWrap);

    // Info row
    var infoEl = document.createElement('div');
    infoEl.className = 'qibla-info';
    infoEl.id = 'qiblaInfo';
    var loadEl = document.createElement('span');
    loadEl.className = 'qibla-loading';
    loadEl.textContent = t ? t('prayer.qibla_locating') : '...';
    infoEl.appendChild(loadEl);
    card.appendChild(infoEl);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * open(cityCoords)
   *   cityCoords — fallback {lat, lon} when GPS is denied
   */
  function open(cityCoords) {
    buildModal();
    var t = window.t;
    var titleEl = document.getElementById('qiblaModalTitle');
    if (titleEl) titleEl.textContent = t ? t('prayer.qibla_title') : 'Qibla';

    _isOpen     = true;
    _headingBuf = [];            // clear old readings
    _lastSample = 0;

    var modal = document.getElementById('qiblaModal');
    if (modal) modal.classList.add('open');

    startOrientation();
    startDraw();

    // Resolve location
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
        function()    {
          if (cityCoords) onLocation(cityCoords.lat, cityCoords.lon, true);
          else {
            while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);
            var e = document.createElement('span');
            e.className = 'qibla-no-loc';
            e.textContent = t ? t('prayer.qibla_no_loc') : 'Location unavailable';
            infoEl.appendChild(e);
            // Still show compass for city fallback if available
            if (cityCoords) { _qibla = calcQibla(cityCoords.lat, cityCoords.lon); }
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
    _canvas = null;
    _ctx    = null;
  }

  window.PrayerQibla = { open: open, close: close };

})();
