/* FastScrollController — right-side scroll grabber */
window.FastScrollController = (function(){
'use strict';

var HIDE_AFTER = 2000; // ms inactivity before auto-hide
var MIN_EXTRA  = 350;  // min extra scrollable height to show at all
var THUMB_H    = 44;   // thumb height px

function FSC(opts){
  this._el      = opts.scrollEl;
  this._labelFn = opts.labelResolver || null;

  this._vis    = false;
  this._drag   = false;
  this._mouse  = false;
  this._raf    = null;
  this._htimer = null;
  this._dead   = false;

  this._mk();
  this._bind();
}

FSC.prototype._mk = function(){
  function ce(tag, cls){ var e = document.createElement(tag); e.className = cls||''; return e; }

  var track = ce('div','fsc-track');
  var thumb = ce('div','fsc-thumb');
  track.appendChild(thumb);

  var lbl = ce('div','fsc-lbl');

  this._track = track;
  this._thumb = thumb;
  this._lbl   = lbl;

  document.body.appendChild(track);
  document.body.appendChild(lbl);
};

FSC.prototype._bind = function(){
  var self = this;

  this._sH = function(){
    if(self._dead) return;
    if(!self._raf) self._raf = requestAnimationFrame(function(){ self._raf=null; self._tick(); });
  };
  this._el.addEventListener('scroll', this._sH, {passive:true});

  this._track.addEventListener('touchstart',  function(e){ self._tst(e); }, {passive:false});
  this._track.addEventListener('touchmove',   function(e){ self._tmv(e); }, {passive:false});
  this._track.addEventListener('touchend',    function(){ self._tnd(); });
  this._track.addEventListener('touchcancel', function(){ self._tnd(); });

  this._track.addEventListener('mousedown', function(e){ self._mdn(e); });
  this._mMv = function(e){ self._mmv(e); };
  this._mUp = function(){  self._mup();  };
  document.addEventListener('mousemove', this._mMv);
  document.addEventListener('mouseup',   this._mUp);

  if(window.ResizeObserver){
    this._ro = new ResizeObserver(function(){ if(!self._dead) self._tick(); });
    this._ro.observe(this._el);
  }
};

/* ─── Core tick ────────────────────────────────────────────── */
FSC.prototype._tick = function(){
  var el  = this._el;
  var st  = el.scrollTop;
  var max = el.scrollHeight - el.clientHeight;
  var ok  = st > 80 && max > MIN_EXTRA;

  if(ok  && !this._vis) this._show();
  if(!ok && this._vis && !this._drag) this._hide();

  if(this._vis && !this._drag){
    var rat = max > 0 ? st / max : 0;
    this._posThumb(rat);
    this._sched();
  }
};

FSC.prototype._posThumb = function(rat){
  var trackH = this._track.offsetHeight;
  this._thumb.style.top = (rat * Math.max(0, trackH - THUMB_H)).toFixed(1) + 'px';
};

FSC.prototype._show = function(){
  this._vis = true;
  this._track.classList.add('fsc-on');
  this._sched();
};

FSC.prototype._hide = function(){
  if(this._drag) return;
  this._vis = false;
  this._track.classList.remove('fsc-on','fsc-drag');
  this._lbl.classList.remove('fsc-lbl-on');
  clearTimeout(this._htimer);
};

FSC.prototype._sched = function(){
  var self = this;
  clearTimeout(this._htimer);
  this._htimer = setTimeout(function(){
    if(!self._drag) self._hide();
  }, HIDE_AFTER);
};

/* ─── Touch ────────────────────────────────────────────────── */
FSC.prototype._tst = function(e){
  if(e.touches.length !== 1) return;
  e.preventDefault();
  this._drag = true;
  this._track.classList.add('fsc-drag');
  this._lbl.classList.add('fsc-lbl-on');
  this._applyDrag(e.touches[0].clientY);
  clearTimeout(this._htimer);
};

FSC.prototype._tmv = function(e){
  if(e.touches.length !== 1 || !this._drag) return;
  e.preventDefault();
  this._applyDrag(e.touches[0].clientY);
};

FSC.prototype._tnd = function(){
  this._endDrag();
};

/* ─── Mouse ────────────────────────────────────────────────── */
FSC.prototype._mdn = function(e){
  this._mouse = true;
  this._drag  = true;
  this._track.classList.add('fsc-drag');
  this._lbl.classList.add('fsc-lbl-on');
  this._applyDrag(e.clientY);
  clearTimeout(this._htimer);
};
FSC.prototype._mmv = function(e){
  if(!this._mouse || !this._drag) return;
  this._applyDrag(e.clientY);
};
FSC.prototype._mup = function(){
  if(!this._mouse) return;
  this._mouse = false;
  this._endDrag();
};

FSC.prototype._endDrag = function(){
  this._drag  = false;
  this._mouse = false;
  this._track.classList.remove('fsc-drag');
  this._lbl.classList.remove('fsc-lbl-on');
  this._sched();
};

/* ─── Map Y → scroll position + move thumb ────────────────── */
FSC.prototype._applyDrag = function(clientY){
  var b   = this._track.getBoundingClientRect();
  var rat = Math.max(0, Math.min(1, (clientY - b.top - THUMB_H / 2) / (b.height - THUMB_H)));
  var max = this._el.scrollHeight - this._el.clientHeight;
  this._el.scrollTop = rat * max;
  this._posThumb(rat);

  var text = (this._labelFn && this._labelFn(rat)) || (Math.round(rat * 100) + '%');
  this._lbl.textContent = text;
  var thumbTopPx = b.top + rat * Math.max(0, b.height - THUMB_H);
  this._lbl.style.top = Math.max(8, thumbTopPx + THUMB_H / 2 - 13) + 'px';
};

/* ─── Public API ───────────────────────────────────────────── */
FSC.prototype.refresh = function(){
  if(!this._dead) this._tick();
};

FSC.prototype.destroy = function(){
  this._dead = true;
  clearTimeout(this._htimer);
  if(this._raf) cancelAnimationFrame(this._raf);
  this._el.removeEventListener('scroll', this._sH);
  document.removeEventListener('mousemove', this._mMv);
  document.removeEventListener('mouseup',   this._mUp);
  if(this._ro) this._ro.disconnect();
  [this._track, this._lbl].forEach(function(el){
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
        var idx = Math.min(cards.length - 1, Math.floor(ratio * cards.length));
        var n   = parseInt(cards[idx].dataset.n);
        var s   = window.SURAHS && window.SURAHS[n - 1];
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
          var idx = Math.min(rows.length - 1, Math.floor(ratio * rows.length));
          var num = rows[idx].querySelector('.hadith-num');
          return num ? num.textContent + ' - فەرمودە' : null;
        }

        if(view === 'books'){
          var cards = gcEl.querySelectorAll('.book-card');
          if(!cards.length) return null;
          var idx = Math.min(cards.length - 1, Math.floor(ratio * cards.length));
          var ttl = cards[idx].querySelector('.book-title');
          return ttl ? ttl.textContent.trim().substring(0, 28) : null;
        }

        if(view === 'adhkar'){
          var secs = gcEl.querySelectorAll('.adhkar-list-section');
          if(secs.length){
            var idx = Math.min(secs.length - 1, Math.floor(ratio * secs.length));
            var hdr = secs[idx].querySelector('.adhkar-list-hdr');
            return hdr ? hdr.textContent.trim().substring(0, 28) : null;
          }
          var rows = gcEl.querySelectorAll('.adhkar-list-row');
          if(!rows.length) return null;
          var idx = Math.min(rows.length - 1, Math.floor(ratio * rows.length));
          var lbl = rows[idx].querySelector('.adhkar-list-label');
          return lbl ? lbl.textContent.trim().substring(0, 28) : null;
        }

        if(view === 'dua'){
          var cards = gcEl.querySelectorAll('.dua-card');
          if(!cards.length) return null;
          var idx = Math.min(cards.length - 1, Math.floor(ratio * cards.length));
          var src = cards[idx].querySelector('.dua-card-src');
          return src ? src.textContent.trim().substring(0, 28) : null;
        }

        return null;
      }
    });
  }

  if(window.GencineUI){
    _initGencine();
  } else {
    var _gcPoll = setInterval(function(){
      if(window.GencineUI){
        clearInterval(_gcPoll);
        _initGencine();
      }
    }, 500);
    setTimeout(function(){ clearInterval(_gcPoll); }, 60000);
  }
};
