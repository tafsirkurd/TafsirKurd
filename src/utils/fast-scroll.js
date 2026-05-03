/* FastScrollController — premium fast-scroll pill for TafsirKurd */
window.FastScrollController = (function(){
'use strict';

var SHOW_AFTER  = 160;  // px scrolled before pill appears
var HIDE_AFTER  = 2200; // ms inactivity before auto-hide
var LONG_PRESS  = 430;  // ms to open jump panel
var MIN_EXTRA   = 350;  // extra scrollable content required (avoids short lists)

function FSC(opts){
  this._el      = opts.scrollEl;
  this._labelFn = opts.labelResolver || null;
  this._thresh  = opts.minScrollToShow != null ? opts.minScrollToShow : SHOW_AFTER;

  this._vis    = false;
  this._drag   = false;
  this._mouse  = false;
  this._jopen  = false;
  this._moved  = false;
  this._raf    = null;
  this._htimer = null;
  this._lptmr  = null;
  this._ty0    = 0;
  this._dead   = false;

  this._mk();
  this._bind();
}

FSC.prototype._mk = function(){
  function ce(tag, cls){ var e = document.createElement(tag); e.className = cls||''; return e; }

  // Pill
  var pill = ce('div','fsc-pill');
  var icoWrap = ce('div','fsc-ico');
  var ico = document.createElement('i');
  ico.className = 'fas fa-chevron-up';
  icoWrap.appendChild(ico);
  pill.appendChild(icoWrap);

  // Thin progress strip on the right edge of the pill
  var strip = ce('div','fsc-strip');
  var fill  = ce('div','fsc-strip-fill');
  strip.appendChild(fill);
  pill.appendChild(strip);

  // Label bubble (appears to the right during drag)
  var lbl = ce('div','fsc-lbl');

  // Jump panel (3 buttons, appears above pill on long-press)
  var jump = ce('div','fsc-jump');
  [{pos:'top',ic:'fa-arrow-up'},{pos:'mid',ic:'fa-grip-lines'},{pos:'bot',ic:'fa-arrow-down'}].forEach(function(b){
    var btn = ce('button','fsc-jbtn');
    btn.dataset.pos = b.pos;
    var i = document.createElement('i');
    i.className = 'fas ' + b.ic;
    btn.appendChild(i);
    jump.appendChild(btn);
  });

  this._pill = pill;
  this._ico  = ico;
  this._fill = fill;
  this._lbl  = lbl;
  this._jump = jump;

  document.body.appendChild(jump);
  document.body.appendChild(pill);
  document.body.appendChild(lbl);
};

FSC.prototype._bind = function(){
  var self = this;

  // Passive scroll → throttled via rAF
  this._sH = function(){
    if(self._dead) return;
    if(!self._raf) self._raf = requestAnimationFrame(function(){ self._raf=null; self._tick(); });
  };
  this._el.addEventListener('scroll', this._sH, {passive:true});

  // Touch on pill (passive:false so we can preventDefault on drag)
  this._pill.addEventListener('touchstart',  function(e){ self._tst(e); }, {passive:false});
  this._pill.addEventListener('touchmove',   function(e){ self._tmv(e); }, {passive:false});
  this._pill.addEventListener('touchend',    function(){ self._tnd();    });
  this._pill.addEventListener('touchcancel', function(){ self._tnd();    });

  // Mouse fallback (desktop / dev)
  this._pill.addEventListener('mousedown', function(e){ self._mdn(e); });
  this._mMv = function(e){ self._mmv(e); };
  this._mUp = function(){  self._mup();  };
  document.addEventListener('mousemove', this._mMv);
  document.addEventListener('mouseup',   this._mUp);

  // Jump panel
  this._jump.addEventListener('click', function(e){
    var btn = e.target.closest('[data-pos]');
    if(btn) self._jumpTo(btn.dataset.pos);
  });

  // Close jump on tap outside
  document.addEventListener('touchstart', function(e){
    if(self._jopen && !self._jump.contains(e.target) && !self._pill.contains(e.target)){
      self._closeJump();
    }
  }, {passive:true});

  // Resize → recheck visibility
  if(window.ResizeObserver){
    this._ro = new ResizeObserver(function(){ if(!self._dead) self._tick(); });
    this._ro.observe(this._el);
  }
};

/* ─── Core tick (called from rAF) ─────────────────────────── */
FSC.prototype._tick = function(){
  var el  = this._el;
  var st  = el.scrollTop;
  var max = el.scrollHeight - el.clientHeight;
  var ok  = st > this._thresh && max > this._thresh + MIN_EXTRA;

  if(ok  && !this._vis) this._show();
  if(!ok && this._vis && !this._drag) this._hide();

  if(this._vis && !this._drag){
    var pct = max > 0 ? st / max : 0;
    this._fill.style.height = (pct * 100).toFixed(1) + '%';
    this._sched();
  }
};

FSC.prototype._show = function(){
  this._vis = true;
  this._pill.classList.add('fsc-on');
  this._sched();
};

FSC.prototype._hide = function(){
  if(this._drag || this._jopen) return;
  this._vis = false;
  this._pill.classList.remove('fsc-on','fsc-drag');
  this._lbl.classList.remove('fsc-lbl-on');
  clearTimeout(this._htimer);
};

FSC.prototype._sched = function(){
  var self = this;
  clearTimeout(this._htimer);
  this._htimer = setTimeout(function(){
    if(!self._drag && !self._jopen) self._hide();
  }, HIDE_AFTER);
};

/* ─── Drag rail bounds (viewport coords) ──────────────────── */
FSC.prototype._bounds = function(){
  var cs   = getComputedStyle(document.documentElement);
  var hdrH = parseFloat(cs.getPropertyValue('--hdr-h')) || 52;
  var tabH = parseFloat(cs.getPropertyValue('--tab-h')) || 60;
  return { top: hdrH + 12, bot: window.innerHeight - tabH - 66 };
};

/* ─── Touch ────────────────────────────────────────────────── */
FSC.prototype._tst = function(e){
  if(e.touches.length !== 1) return;
  this._ty0   = e.touches[0].clientY;
  this._tx0   = e.touches[0].clientX;
  this._moved = false;
  this._drag  = false;
  var self = this;
  clearTimeout(this._lptmr);
  this._lptmr = setTimeout(function(){
    if(!self._moved) self._openJump();
  }, LONG_PRESS);
  clearTimeout(this._htimer);
};

FSC.prototype._tmv = function(e){
  if(e.touches.length !== 1) return;
  var dy = e.touches[0].clientY - this._ty0;
  var dx = e.touches[0].clientX - this._tx0;
  if(!this._drag && (Math.abs(dy) > 6 || Math.abs(dx) > 6)){
    this._moved = true;
    clearTimeout(this._lptmr);
    if(Math.abs(dy) >= Math.abs(dx)){
      this._drag = true;
      this._pill.classList.add('fsc-drag');
      this._lbl.classList.add('fsc-lbl-on');
    }
  }
  if(this._drag){ e.preventDefault(); this._applyDrag(e.touches[0].clientY); }
};

FSC.prototype._tnd = function(){
  clearTimeout(this._lptmr);
  if(!this._moved && !this._drag) this._el.scrollTo({top:0, behavior:'smooth'});
  this._endDrag();
};

/* ─── Mouse ────────────────────────────────────────────────── */
FSC.prototype._mdn = function(e){
  this._mouse = true;
  this._ty0   = e.clientY;
  this._moved = false;
  this._drag  = false;
  clearTimeout(this._htimer);
};
FSC.prototype._mmv = function(e){
  if(!this._mouse) return;
  var dy = e.clientY - this._ty0;
  if(!this._drag && Math.abs(dy) > 5){
    this._moved = true;
    this._drag  = true;
    this._pill.classList.add('fsc-drag');
    this._lbl.classList.add('fsc-lbl-on');
  }
  if(this._drag) this._applyDrag(e.clientY);
};
FSC.prototype._mup = function(){
  if(!this._mouse) return;
  this._mouse = false;
  if(!this._moved) this._el.scrollTo({top:0, behavior:'smooth'});
  this._endDrag();
};

FSC.prototype._endDrag = function(){
  this._drag  = false;
  this._mouse = false;
  this._moved = false;
  this._pill.classList.remove('fsc-drag');
  this._lbl.classList.remove('fsc-lbl-on');
  this._sched();
};

/* ─── Map drag Y → scroll + label ─────────────────────────── */
FSC.prototype._applyDrag = function(clientY){
  var b   = this._bounds();
  var rat = Math.max(0, Math.min(1, (clientY - b.top) / (b.bot - b.top)));
  var max = this._el.scrollHeight - this._el.clientHeight;
  this._el.scrollTop = rat * max;

  // Label text
  var text = (this._labelFn && this._labelFn(rat)) || (Math.round(rat * 100) + '%');
  this._lbl.textContent = text;

  // Position label vertically near thumb
  var pr = this._pill.getBoundingClientRect();
  this._lbl.style.top = Math.max(8, pr.top - 2) + 'px';

  // Sync progress strip during drag too
  this._fill.style.height = (rat * 100).toFixed(1) + '%';
};

/* ─── Jump panel ───────────────────────────────────────────── */
FSC.prototype._openJump = function(){
  if(this._jopen) return;
  this._jopen = true;
  this._pill.classList.add('fsc-drag');
  this._jump.classList.add('fsc-jump-on');
  if(window.haptic) haptic([8]);
  clearTimeout(this._htimer);
};

FSC.prototype._closeJump = function(){
  this._jopen = false;
  this._jump.classList.remove('fsc-jump-on');
  this._pill.classList.remove('fsc-drag');
  this._sched();
};

FSC.prototype._jumpTo = function(pos){
  var max = this._el.scrollHeight - this._el.clientHeight;
  var t   = pos === 'top' ? 0 : pos === 'bot' ? max : max / 2;
  this._el.scrollTo({top: t, behavior: 'smooth'});
  this._closeJump();
};

/* ─── Public API ───────────────────────────────────────────── */
FSC.prototype.refresh = function(){
  if(!this._dead) this._tick();
};

FSC.prototype.destroy = function(){
  this._dead = true;
  clearTimeout(this._htimer);
  clearTimeout(this._lptmr);
  if(this._raf) cancelAnimationFrame(this._raf);
  this._el.removeEventListener('scroll', this._sH);
  document.removeEventListener('mousemove', this._mMv);
  document.removeEventListener('mouseup',   this._mUp);
  if(this._ro) this._ro.disconnect();
  [this._pill, this._lbl, this._jump].forEach(function(el){
    if(el && el.parentNode) el.parentNode.removeChild(el);
  });
};

return {
  create: function(opts){ return new FSC(opts); }
};
})();

/* ═══════════════════════════════════════════════════════════════
   Per-screen initialization — runs after DOM + app are ready
   ═══════════════════════════════════════════════════════════════ */
window._initFastScroll = function(){
  if(!window.FastScrollController) return;

  var isIpad = document.documentElement.classList.contains('is-ipad');

  /* ── 1. Quran — surah list ─────────────────────────────────── */
  var quranEl = isIpad
    ? document.getElementById('quranHome')
    : document.getElementById('panelQuran');

  if(quranEl){
    FastScrollController.create({
      scrollEl: quranEl,
      labelResolver: function(ratio){
        var cards = quranEl.querySelectorAll('.surah-card');
        if(!cards.length) return null;
        var idx   = Math.min(cards.length - 1, Math.floor(ratio * cards.length));
        var n     = parseInt(cards[idx].dataset.n);
        var s     = window.SURAHS && window.SURAHS[n - 1];
        if(!s) return null;
        return s.n + ' · ' + s.en;
      }
    });
  }

  /* ── 2. IslamVoice — series grid ───────────────────────────── */
  var ivEl = document.getElementById('panelIslamvoice');
  if(ivEl){
    FastScrollController.create({
      scrollEl: ivEl,
      labelResolver: function(ratio){
        var cards = ivEl.querySelectorAll('#ivGrid .iv-card');
        if(!cards.length) return null;
        var idx   = Math.min(cards.length - 1, Math.floor(ratio * cards.length));
        var title = cards[idx].querySelector('.iv-card-title');
        return title ? title.textContent.trim().substring(0, 28) : null;
      }
    });
  }

  /* ── 3. Gencine — deferred until scripts are loaded ────────── */
  function _initGencine(){
    var gcEl = document.getElementById('panelGencine');
    if(!gcEl || !window.GencineUI) return;
    FastScrollController.create({
      scrollEl: gcEl,
      labelResolver: function(ratio){
        var ui = window.GencineUI;
        if(!ui) return null;
        var view = ui._view;

        if(view === 'hadith'){
          var rows = gcEl.querySelectorAll('.hadith-title-item');
          if(!rows.length) return null;
          var idx  = Math.min(rows.length - 1, Math.floor(ratio * rows.length));
          var num  = rows[idx].querySelector('.hadith-num');
          return num ? num.textContent + ' - حەدیس' : null;
        }

        if(view === 'books'){
          var cards = gcEl.querySelectorAll('.book-card');
          if(!cards.length) return null;
          var idx  = Math.min(cards.length - 1, Math.floor(ratio * cards.length));
          var ttl  = cards[idx].querySelector('.book-title');
          return ttl ? ttl.textContent.trim().substring(0, 28) : null;
        }

        if(view === 'adhkar'){
          var secs = gcEl.querySelectorAll('.adhkar-list-section');
          if(!secs.length){
            var rows = gcEl.querySelectorAll('.adhkar-list-row');
            if(!rows.length) return null;
            var idx = Math.min(rows.length - 1, Math.floor(ratio * rows.length));
            var lbl = rows[idx].querySelector('.adhkar-list-label');
            return lbl ? lbl.textContent.trim().substring(0, 28) : null;
          }
          var idx  = Math.min(secs.length - 1, Math.floor(ratio * secs.length));
          var hdr  = secs[idx].querySelector('.adhkar-list-hdr');
          return hdr ? hdr.textContent.trim().substring(0, 28) : null;
        }

        if(view === 'dua'){
          var cards = gcEl.querySelectorAll('.dua-card');
          if(!cards.length) return null;
          var idx  = Math.min(cards.length - 1, Math.floor(ratio * cards.length));
          var src  = cards[idx].querySelector('.dua-card-src');
          return src ? src.textContent.trim().substring(0, 28) : null;
        }

        return null;
      }
    });
  }

  // GencineUI loads lazily — hook in after scripts load
  var _origLoadGS = window._gencineScriptsLoaded;
  if(window._gencineScriptsLoaded){
    _initGencine();
  } else {
    // Poll for GencineUI ready (scripts are loaded on first Gencine tab open)
    var _gcPoll = setInterval(function(){
      if(window.GencineUI){
        clearInterval(_gcPoll);
        _initGencine();
      }
    }, 500);
    // Give up after 60s
    setTimeout(function(){ clearInterval(_gcPoll); }, 60000);
  }
};
