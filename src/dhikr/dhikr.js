/* Gencine (Religious Treasure) Tab — GencineUI */
(function(){
'use strict';

var SECTIONS = [
  { name:'hadith', label:'حەدیس',  sub:'فەرمودێن پێغەمبەرێ ئیسلامێ',      icon:'fas fa-scroll'        },
  { name:'dua',    label:'دوعا',    sub:'دعاهای بەیانی، ئێوار و زیاتر',    icon:'fa-solid fa-person-praying' },
  { name:'tasbih', label:'تەسبیح', sub:'ژمارتنا دیکرێن ئیسلامی',           icon:'fas fa-rotate'        }
];

/* Persistent image-loaded tracker — survives every home re-render */
var IMG_LOADED = {};

/* Preload and mark loaded immediately */
(function(){
  SECTIONS.forEach(function(s){
    if(IMG_LOADED[s.name]) return;
    var img = new Image();
    img.onload = function(){ IMG_LOADED[s.name] = true; };
    img.src = '/assets/icons/genc-' + s.name + '-bg.webp';
  });
})();

var DHIKR_LIST = [
  {ar:'سُبْحَانَ اللَّهِ',                    ku:'سبحان الله'},
  {ar:'الْحَمْدُ لِلَّهِ',                    ku:'الحمد لله'},
  {ar:'اللَّهُ أَكْبَرُ',                     ku:'الله أكبر'},
  {ar:'لَا إِلَهَ إِلَّا اللَّهُ',            ku:'لا اله الا الله'},
  {ar:'أَسْتَغْفِرُ اللَّهَ',                 ku:'استغفر الله'},
  {ar:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',       ku:'سبحان الله وبحمده'},
  {ar:'سُبْحَانَ اللَّهِ الْعَظِيمِ',         ku:'سبحان الله العظیم'},
  {ar:'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',     ku:'صلات بەسەر پێغەمبەر'},
  {ar:'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', ku:'لا حوله ولا قوه'},
  {ar:'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', ku:'بسم الله الرحمن الرحیم'}
];

/* Fallback hardcoded categories — used when Supabase not available */
var FALLBACK_CAT_KEYS   = ['morning','evening','travel','eating','sleep','general'];
var FALLBACK_CAT_LABELS = {
  morning:'بەیانیکردن', evening:'ئێواربوون', travel:'گەشت',
  eating:'خواردن',      sleep:'خەو',         general:'گشتی'
};

var TARGET_PRESETS = [33, 66, 99, 100, 500, 1000];
var RING_R    = 91;
var RING_CIRC = 2 * Math.PI * RING_R;

/* ── Supabase data cache ── */
var _dbCats    = null;   /* [{key, label_ku, ...}] */
var _dbDuas    = null;   /* [{category_key, ar, ku, source, repeat}] */
var _dbHadiths = null;   /* [{ar, ku, source}] */
var _loadingDb = false;
var _dbLoaded  = false;

var CACHE_TTL_MS = 6 * 60 * 60 * 1000; /* 6 hours */

function _readCache(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return parsed.data;
  } catch(e) { return null; }
}
function _writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ts: Date.now(), data: data})); } catch(e) {}
}

function _getSupabase() {
  /* app.js exposes supabase via window.S.supabase (initialized with anon key) */
  return (window.S && window.S.supabase) ? window.S.supabase : null;
}

/* Load from cache instantly, then re-fetch in background */
function _initDbData(onDone) {
  var cachedCats    = _readCache('gencine_cats_v1');
  var cachedDuas    = _readCache('gencine_duas_v1');
  var cachedHadiths = _readCache('gencine_hadiths_v1');

  if (cachedCats && cachedDuas && cachedHadiths) {
    _dbCats    = cachedCats;
    _dbDuas    = cachedDuas;
    _dbHadiths = cachedHadiths;
    _dbLoaded  = true;
    if (onDone) onDone();
    /* background refresh */
    _fetchDbData(null);
  } else {
    _fetchDbData(onDone);
  }
}

function _fetchDbData(onDone) {
  if (_loadingDb) { if (onDone) onDone(); return; }
  var sb = _getSupabase();
  if (!sb) { _dbLoaded = true; if (onDone) onDone(); return; }

  _loadingDb = true;

  var catsPromise = sb.from('gencine_categories').select('*').eq('active', true).order('sort_order');
  var duasPromise = sb.from('gencine_duas').select('*').eq('active', true).order('category_key').order('sort_order');
  var hadithsPromise = sb.from('gencine_hadiths').select('*').eq('active', true).order('sort_order');

  Promise.all([catsPromise, duasPromise, hadithsPromise]).then(function(results) {
    _loadingDb = false;
    var catRes = results[0], duaRes = results[1], hadithRes = results[2];
    if (!catRes.error && catRes.data) {
      _dbCats = catRes.data;
      _writeCache('gencine_cats_v1', _dbCats);
    }
    if (!duaRes.error && duaRes.data) {
      _dbDuas = duaRes.data;
      _writeCache('gencine_duas_v1', _dbDuas);
    }
    if (!hadithRes.error && hadithRes.data) {
      _dbHadiths = hadithRes.data;
      _writeCache('gencine_hadiths_v1', _dbHadiths);
    }
    _dbLoaded = true;
    if (onDone) onDone();
  }).catch(function() {
    _loadingDb = false;
    _dbLoaded  = true;
    if (onDone) onDone();
  });
}

/* Return category keys+labels from DB or fallback */
function _getCatKeys() {
  if (_dbCats && _dbCats.length) return _dbCats.map(function(c){ return c.key; });
  return FALLBACK_CAT_KEYS;
}
function _getCatLabel(key) {
  if (_dbCats && _dbCats.length) {
    var found = _dbCats.find(function(c){ return c.key === key; });
    return found ? found.label_ku : key;
  }
  return FALLBACK_CAT_LABELS[key] || key;
}
/* Return duas for a category from DB or window.DUA_DATA fallback */
function _getDuas(catKey) {
  if (_dbDuas && _dbDuas.length) {
    return _dbDuas.filter(function(d){ return d.category_key === catKey; });
  }
  return (window.DUA_DATA && window.DUA_DATA[catKey]) ? window.DUA_DATA[catKey] : [];
}
/* Return hadiths from DB */
function _getHadiths() {
  return (_dbHadiths && _dbHadiths.length) ? _dbHadiths : [];
}

var APP_LINK = 'https://tafsirkurd.com';

function _mkCopyBtn(text) {
  var btn = document.createElement('button');
  btn.className = 'dua-copy-btn';
  var ico = document.createElement('i');
  ico.className = 'fas fa-copy';
  btn.appendChild(ico);
  btn.onclick = function(e) {
    e.stopPropagation();
    var full = text + '\n\n──────────\nTafsirKurd\n' + APP_LINK;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).catch(function(){});
    } else {
      /* Fallback for older WebViews */
      var ta = document.createElement('textarea');
      ta.value = full;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch(ex){}
      document.body.removeChild(ta);
    }
    haptic(12);
    ico.className = 'fas fa-check';
    btn.classList.add('copied');
    setTimeout(function(){
      ico.className = 'fas fa-copy';
      btn.classList.remove('copied');
    }, 1500);
  };
  return btn;
}

function haptic(ms){
  try{
    if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Haptics)
      Capacitor.Plugins.Haptics.vibrate({duration:ms||8});
  }catch(e){}
}
function $(id){return document.getElementById(id)}

window.GencineUI = {
  _view:          'home',   /* 'home' | 'dua' | 'tasbih' | 'hadith' */
  _duaCat:        'morning',
  _tasbihCount:   0,
  _tasbihTarget:  33,
  _tasbihDhikrIdx:0,

  /* ── state persistence ── */
  _loadState: function(){
    var c = parseInt(localStorage.getItem('tasbihCount'))  || 0;
    var t = parseInt(localStorage.getItem('tasbihTarget')) || 33;
    var d = parseInt(localStorage.getItem('tasbihDhikr'))  || 0;
    this._tasbihCount     = (c < 0 || isNaN(c)) ? 0 : c;
    this._tasbihTarget    = TARGET_PRESETS.indexOf(t) !== -1 ? t : 33;
    this._tasbihDhikrIdx  = (d < 0 || d >= DHIKR_LIST.length || isNaN(d)) ? 0 : d;
  },
  _saveState: function(){
    localStorage.setItem('tasbihCount',  this._tasbihCount);
    localStorage.setItem('tasbihTarget', this._tasbihTarget);
    localStorage.setItem('tasbihDhikr',  this._tasbihDhikrIdx);
  },

  /* ── called by App.tab('gencine') ── */
  render: function(){
    var self = this;
    this._loadState();
    this._view = 'home';

    /* If DB data not loaded yet, kick off load then redraw */
    if (!_dbLoaded) {
      this._draw();
      _initDbData(function(){ self._draw(); });
    } else {
      this._draw();
      /* Background refresh once per session */
      _fetchDbData(null);
    }
  },

  /* ── called by section nav buttons ── */
  section: function(name){
    this._view = name;
    this._draw();
  },

  /* ── main dispatcher ── */
  _draw: function(){
    var el = $('gencineContent');
    if(!el) return;
    while(el.firstChild) el.removeChild(el.firstChild);
    if(this._view === 'home')        this._renderHome(el);
    else if(this._view === 'dua')    this._renderDua(el);
    else if(this._view === 'tasbih') this._renderTasbih(el);
    else                             this._renderHadith(el);
  },

  /* ═══════════════════ HOME ═══════════════════ */
  _renderHome: function(container){
    var self = this;
    var home = document.createElement('div');
    home.className = 'genc-home';

    SECTIONS.forEach(function(sec){
      var btn = document.createElement('button');
      btn.className = 'genc-card-btn';
      btn.dataset.sec = sec.name;
      btn.onclick = function(){ self.section(sec.name); };

      /* CSS background-image — no <img> element, no flash on re-render */
      var url = '/assets/icons/genc-' + sec.name + '-bg.webp';
      if(IMG_LOADED[sec.name]){
        btn.style.backgroundImage = 'url(' + url + ')';
        btn.classList.add('has-image');
      } else {
        var loader = new Image();
        loader.onload = function(){
          IMG_LOADED[sec.name] = true;
          btn.style.backgroundImage = 'url(' + url + ')';
          btn.classList.add('has-image');
        };
        loader.src = url;
      }

      /* Overlay */
      var overlay = document.createElement('div');
      overlay.className = 'genc-card-overlay';
      btn.appendChild(overlay);

      /* Glowing top bar */
      var topbar = document.createElement('div');
      topbar.className = 'genc-card-topbar';
      btn.appendChild(topbar);

      /* Card body */
      var body = document.createElement('div');
      body.className = 'genc-card-body';

      /* Frosted glass icon circle */
      var iconCircle = document.createElement('div');
      iconCircle.className = 'genc-card-icon';
      var ico = document.createElement('i');
      ico.className = sec.icon;
      iconCircle.appendChild(ico);
      body.appendChild(iconCircle);

      /* Text (title + subtitle) */
      var texts = document.createElement('div');
      texts.className = 'genc-card-texts';
      var title = document.createElement('div');
      title.className = 'genc-card-title';
      title.textContent = sec.label;
      texts.appendChild(title);
      var sub = document.createElement('div');
      sub.className = 'genc-card-sub';
      sub.textContent = sec.sub;
      texts.appendChild(sub);
      body.appendChild(texts);

      /* Chevron */
      var arrow = document.createElement('div');
      arrow.className = 'genc-card-arrow';
      var chevron = document.createElement('i');
      chevron.className = 'fas fa-chevron-left';
      arrow.appendChild(chevron);
      body.appendChild(arrow);

      btn.appendChild(body);
      home.appendChild(btn);
    });

    container.appendChild(home);
  },

  /* ── back row shared by all sections ── */
  _backRow: function(label){
    var self = this;
    var row = document.createElement('div');
    row.className = 'genc-back-row';
    var btn = document.createElement('button');
    btn.className = 'genc-back-btn';
    var i = document.createElement('i');
    i.className = 'fas fa-arrow-right';
    btn.appendChild(i);
    btn.onclick = function(){ self.render(); };
    row.appendChild(btn);
    if(label){
      var t = document.createElement('span');
      t.className = 'genc-back-label';
      t.textContent = label;
      row.appendChild(t);
    }
    return row;
  },

  /* ═══════════════════ DUA ═══════════════════ */
  _renderDua: function(container){
    var self = this;
    container.appendChild(this._backRow('دوعا'));

    var catKeys = _getCatKeys();

    /* Validate active category exists */
    if (catKeys.indexOf(this._duaCat) === -1 && catKeys.length) {
      this._duaCat = catKeys[0];
    }

    /* category tab bar */
    var tabBar = document.createElement('div');
    tabBar.className = 'dua-tabs';
    var tabBtns = [];

    /* dua list — declared early so onclick closure can reference it */
    var list = document.createElement('div');
    list.className = 'dua-list';

    function fillDuaList(){
      while(list.firstChild) list.removeChild(list.firstChild);
      _getDuas(self._duaCat).forEach(function(dua){
        var card = document.createElement('div');
        card.className = 'dua-card';

        var ar = document.createElement('div');
        ar.className = 'dua-card-ar';
        ar.textContent = dua.ar;
        card.appendChild(ar);

        var ku = document.createElement('div');
        ku.className = 'dua-card-ku';
        ku.textContent = dua.ku;
        card.appendChild(ku);

        var footer = document.createElement('div');
        footer.className = 'dua-card-footer';
        var src = document.createElement('span');
        src.className = 'dua-card-src';
        src.textContent = dua.source || '';
        footer.appendChild(src);
        var repeatCount = dua.repeat || 1;
        if(repeatCount > 1){
          var rep = document.createElement('span');
          rep.className = 'dua-card-repeat';
          rep.textContent = '\u00D7 ' + repeatCount;
          footer.appendChild(rep);
        }
        var copyText = (dua.ar || '') + (dua.ku ? '\n\n' + dua.ku : '') + (dua.source ? '\n\n' + dua.source : '');
        footer.appendChild(_mkCopyBtn(copyText));
        card.appendChild(footer);
        list.appendChild(card);
      });
    }

    catKeys.forEach(function(key){
      var btn = document.createElement('button');
      btn.className = 'dua-tab-btn' + (key === self._duaCat ? ' on' : '');
      btn.textContent = _getCatLabel(key);
      btn.onclick = function(){
        self._duaCat = key;
        /* update active state in-place — no scroll reset */
        tabBtns.forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        btn.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
        fillDuaList();
      };
      tabBtns.push(btn);
      tabBar.appendChild(btn);
    });
    container.appendChild(tabBar);

    fillDuaList();
    container.appendChild(list);
  },

  /* ═══════════════════ TASBIH ═══════════════════ */
  _renderTasbih: function(container){
    var self = this;
    container.appendChild(this._backRow('تەسبیح'));

    var wrap = document.createElement('div');
    wrap.className = 'tasbih-wrap';

    /* horizontal dhikr scroll */
    var scrollWrap = document.createElement('div');
    scrollWrap.className = 'tasbih-dhikr-scroll';
    var dhikrCards = [];
    DHIKR_LIST.forEach(function(d, i){
      var card = document.createElement('button');
      card.className = 'tasbih-dhikr-card' + (i === self._tasbihDhikrIdx ? ' on' : '');
      var arEl = document.createElement('div');
      arEl.className = 'tasbih-dhikr-card-ar';
      arEl.textContent = d.ku;
      card.appendChild(arEl);
      card.onclick = function(){
        self._tasbihDhikrIdx = i;
        self._tasbihCount = 0;
        self._saveState();
        /* update active state in-place — no scroll reset */
        dhikrCards.forEach(function(c){ c.classList.remove('on'); });
        card.classList.add('on');
        card.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
        var display = $('tasbihDhikrDisplay');
        if(display) display.textContent = DHIKR_LIST[i].ar;
        self._updateRing();
      };
      dhikrCards.push(card);
      scrollWrap.appendChild(card);
    });
    wrap.appendChild(scrollWrap);

    /* selected dhikr display */
    var dhikrDisplay = document.createElement('div');
    dhikrDisplay.className = 'tasbih-dhikr-display';
    dhikrDisplay.id = 'tasbihDhikrDisplay';
    dhikrDisplay.textContent = DHIKR_LIST[self._tasbihDhikrIdx].ar;
    wrap.appendChild(dhikrDisplay);

    /* target buttons */
    var targetRow = document.createElement('div');
    targetRow.className = 'tasbih-target-row';
    var targetBtns = [];
    TARGET_PRESETS.forEach(function(n){
      var btn = document.createElement('button');
      btn.className = 'tasbih-target-btn' + (n === self._tasbihTarget ? ' on' : '');
      btn.textContent = n;
      btn.onclick = function(){
        self._tasbihTarget = n;
        self._tasbihCount = 0;
        self._saveState();
        /* update active state in-place — no scroll reset */
        targetBtns.forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        self._updateRing();
      };
      targetBtns.push(btn);
      targetRow.appendChild(btn);
    });
    wrap.appendChild(targetRow);

    /* SVG ring */
    var ringWrap = document.createElement('div');
    ringWrap.className = 'tasbih-ring';

    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 220 220');
    svg.setAttribute('width','220');
    svg.setAttribute('height','220');

    var track = document.createElementNS('http://www.w3.org/2000/svg','circle');
    track.setAttribute('class','tasbih-ring-track');
    track.setAttribute('cx','110'); track.setAttribute('cy','110'); track.setAttribute('r', RING_R);
    svg.appendChild(track);

    var fill = document.createElementNS('http://www.w3.org/2000/svg','circle');
    fill.setAttribute('class','tasbih-ring-fill');
    fill.setAttribute('cx','110'); fill.setAttribute('cy','110'); fill.setAttribute('r', RING_R);
    fill.setAttribute('stroke-dasharray', RING_CIRC);
    var pct = Math.min(self._tasbihCount / Math.max(self._tasbihTarget, 1), 1);
    fill.setAttribute('stroke-dashoffset', RING_CIRC * (1 - pct));
    fill.id = 'tasbihRingFill';
    svg.appendChild(fill);
    ringWrap.appendChild(svg);

    /* tap button */
    var tapBtn = document.createElement('button');
    tapBtn.className = 'tasbih-tap-btn';
    var countNum = document.createElement('div');
    countNum.className = 'tasbih-count-num';
    countNum.id = 'tasbihCountNum';
    countNum.textContent = self._tasbihCount;
    tapBtn.appendChild(countNum);
    var countOf = document.createElement('div');
    countOf.className = 'tasbih-count-of';
    countOf.id = 'tasbihCountOf';
    countOf.textContent = '/ ' + self._tasbihTarget;
    tapBtn.appendChild(countOf);
    tapBtn.onclick = function(){ self._tasbihTap(); };
    ringWrap.appendChild(tapBtn);
    wrap.appendChild(ringWrap);

    /* reset button */
    var resetBtn = document.createElement('button');
    resetBtn.className = 'tasbih-reset-btn';
    resetBtn.textContent = 'سفر';
    resetBtn.onclick = function(){ self._tasbihReset(); };
    wrap.appendChild(resetBtn);

    container.appendChild(wrap);
  },

  /* ═══════════════════ HADITH ═══════════════════ */
  _renderHadith: function(container){
    var self = this;
    container.appendChild(this._backRow('حەدیس'));

    var hadiths = _getHadiths();

    if (!hadiths.length) {
      /* Coming soon screen */
      var wrap = document.createElement('div');
      wrap.className = 'genc-coming';
      var iconEl = document.createElement('div');
      iconEl.className = 'genc-coming-icon';
      var i = document.createElement('i');
      i.className = 'fas fa-book-open';
      iconEl.appendChild(i);
      wrap.appendChild(iconEl);
      var title = document.createElement('div');
      title.className = 'genc-coming-title';
      title.textContent = 'بەمزوانە دێت';
      wrap.appendChild(title);
      var sub = document.createElement('div');
      sub.className = 'genc-coming-sub';
      sub.textContent = 'ئەم بەشە هەنووکا ئامادەدەبێت.\nبەمزوانە زیاد دەبێت!';
      wrap.appendChild(sub);
      container.appendChild(wrap);
      return;
    }

    /* Render hadith cards */
    var list = document.createElement('div');
    list.className = 'dua-list';

    hadiths.forEach(function(h){
      var card = document.createElement('div');
      card.className = 'dua-card';

      var ar = document.createElement('div');
      ar.className = 'dua-card-ar';
      ar.textContent = h.ar;
      card.appendChild(ar);

      var ku = document.createElement('div');
      ku.className = 'dua-card-ku';
      ku.textContent = h.ku;
      card.appendChild(ku);

      var hFooter = document.createElement('div');
      hFooter.className = 'dua-card-footer';
      var hSrc = document.createElement('span');
      hSrc.className = 'dua-card-src';
      hSrc.textContent = h.source || '';
      hFooter.appendChild(hSrc);
      var hCopyText = (h.ar || '') + (h.ku ? '\n\n' + h.ku : '') + (h.source ? '\n\n' + h.source : '');
      hFooter.appendChild(_mkCopyBtn(hCopyText));
      card.appendChild(hFooter);

      list.appendChild(card);
    });

    container.appendChild(list);
  },

  /* ═══════════════════ TASBIH ACTIONS ═══════════════════ */
  _tasbihTap: function(){
    this._tasbihCount++;
    haptic(8);
    if(this._tasbihCount >= this._tasbihTarget){ haptic(40); }
    this._saveState();
    this._updateRing();
  },

  _tasbihReset: function(){
    this._tasbihCount = 0;
    this._saveState();
    this._updateRing();
  },

  _updateRing: function(){
    var fill = $('tasbihRingFill');
    var num  = $('tasbihCountNum');
    var of   = $('tasbihCountOf');
    if(num)  num.textContent = this._tasbihCount;
    if(of)   of.textContent  = '/ ' + this._tasbihTarget;
    if(fill){
      var pct = Math.min(this._tasbihCount / Math.max(this._tasbihTarget, 1), 1);
      fill.setAttribute('stroke-dashoffset', RING_CIRC * (1 - pct));
    }
  }
};

})();
