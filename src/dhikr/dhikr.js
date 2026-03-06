/* Gencine (Religious Treasure) Tab — GencineUI */
(function(){
'use strict';

function _sections(){
  var T = window.t || function(k,d){ return d||k; };
  var all = [
    { name:'hadith', label:T('gencine.hadith','حەدیس'),     sub:T('gencine.hadith_sub','فەرمودێن پێغەمبەرێ ئیسلامێ'),           icon:'fas fa-scroll'             },
    { name:'dua',    label:T('gencine.dua','دوعا'),          sub:T('gencine.dua_sub','دعاهای بەیانی، ئێوار و زیاتر'),           icon:'fa-solid fa-person-praying' },
    { name:'tasbih', label:T('gencine.tasbih','تەسبیح'),    sub:T('gencine.tasbih_sub','ژمارتنا دیکرێن ئیسلامی'),              icon:'fas fa-rotate'             },
    { name:'asma',   label:T('gencine.asma','ناوێن خوا'),   sub:T('gencine.asma_sub','٩٩ ناوێن گەورەیێ خوایێ بەزەیی کار'),   icon:'fas fa-star-and-crescent' }
  ];
  if (!_dbSections || !_dbSections.length) return all;
  var activeMap = {};
  _dbSections.forEach(function(s){ activeMap[s.key] = s.active; });
  return all.filter(function(sec){ return activeMap[sec.name] !== false; });
}

/* ── 99 Names of Allah ── */
var ASMA_DATA = [
  {n:1,  ar:'الرَّحْمَنُ',            tr:'Ar-Rahmaan',          ku:'ئەو زۆر بەزەیی کار'},
  {n:2,  ar:'الرَّحِيمُ',             tr:'Ar-Raheem',            ku:'ئەو هەمیشە بەزەیی کار'},
  {n:3,  ar:'الْمَلِكُ',              tr:'Al-Malik',             ku:'پاشا'},
  {n:4,  ar:'الْقُدُّوسُ',            tr:'Al-Quddoos',           ku:'پیرۆز'},
  {n:5,  ar:'السَّلَامُ',             tr:'As-Salaam',            ku:'ئاشتی بەخش'},
  {n:6,  ar:'الْمُؤْمِنُ',            tr:"Al-Mu'min",            ku:'باوەڕداری دەر'},
  {n:7,  ar:'الْمُهَيْمِنُ',          tr:'Al-Muhaimin',          ku:'پاراستووار'},
  {n:8,  ar:'الْعَزِيزُ',             tr:'Al-Azeez',             ku:'بەهێز'},
  {n:9,  ar:'الْجَبَّارُ',            tr:'Al-Jabbaar',           ku:'سەروەر'},
  {n:10, ar:'الْمُتَكَبِّرُ',         tr:'Al-Mutakabbir',        ku:'گەورەیی خاوەن'},
  {n:11, ar:'الْخَالِقُ',             tr:'Al-Khaaliq',           ku:'دروستکار'},
  {n:12, ar:'الْبَارِئُ',             tr:"Al-Baari'",            ku:'بوونی دەر هێنەر'},
  {n:13, ar:'الْمُصَوِّرُ',           tr:'Al-Musawwir',          ku:'شێوەدەر'},
  {n:14, ar:'الْغَفَّارُ',            tr:'Al-Ghaffaar',          ku:'زۆر بەخشینکار'},
  {n:15, ar:'الْقَهَّارُ',            tr:'Al-Qahhaar',           ku:'زەبردەست'},
  {n:16, ar:'الْوَهَّابُ',            tr:'Al-Wahhaab',           ku:'بەخشینکارێ گەورە'},
  {n:17, ar:'الرَّزَّاقُ',            tr:'Ar-Razzaaq',           ku:'رزگاری دەر'},
  {n:18, ar:'الْفَتَّاحُ',            tr:'Al-Fattaah',           ku:'کردنەوەر'},
  {n:19, ar:'الْعَلِيمُ',             tr:"Al-'Aleem",            ku:'زاناس'},
  {n:20, ar:'الْقَابِضُ',             tr:'Al-Qaabid',            ku:'گرتنکار'},
  {n:21, ar:'الْبَاسِطُ',             tr:'Al-Baasit',            ku:'فراخکار'},
  {n:22, ar:'الْخَافِضُ',             tr:'Al-Khaafid',           ku:'دەخوازینەر'},
  {n:23, ar:'الرَّافِعُ',             tr:"Ar-Raafi'",            ku:'برزکار'},
  {n:24, ar:'الْمُعِزُّ',             tr:"Al-Mu'izz",            ku:'بریزدارکار'},
  {n:25, ar:'الْمُذِلُّ',             tr:'Al-Mudhill',           ku:'بێبریزی دەر'},
  {n:26, ar:'السَّمِيعُ',             tr:"As-Samee'",            ku:'بیستکار'},
  {n:27, ar:'الْبَصِيرُ',             tr:'Al-Baseer',            ku:'بینەر'},
  {n:28, ar:'الْحَكَمُ',              tr:'Al-Hakam',             ku:'دادوەر'},
  {n:29, ar:'الْعَدْلُ',              tr:"Al-'Adl",              ku:'دادپەروەر'},
  {n:30, ar:'اللَّطِيفُ',             tr:'Al-Lateef',            ku:'نەرمدڵ'},
  {n:31, ar:'الْخَبِيرُ',             tr:'Al-Khabeer',           ku:'ئاگادار'},
  {n:32, ar:'الْحَلِيمُ',             tr:'Al-Haleem',            ku:'بردبار'},
  {n:33, ar:'الْعَظِيمُ',             tr:"Al-'Azeem",            ku:'گەورە'},
  {n:34, ar:'الْغَفُورُ',             tr:'Al-Ghafoor',           ku:'بەخشینکار'},
  {n:35, ar:'الشَّكُورُ',             tr:'Ash-Shakoor',          ku:'سوپاسگوزار'},
  {n:36, ar:'الْعَلِيُّ',             tr:"Al-'Aliyy",            ku:'برز'},
  {n:37, ar:'الْكَبِيرُ',             tr:'Al-Kabeer',            ku:'گەورە'},
  {n:38, ar:'الْحَفِيظُ',             tr:'Al-Hafeez',            ku:'پاراستووار'},
  {n:39, ar:'الْمُقِيتُ',             tr:'Al-Muqeet',            ku:'خواردن دەر'},
  {n:40, ar:'الْحَسِيبُ',             tr:'Al-Haseeb',            ku:'ژمارەکار'},
  {n:41, ar:'الْجَلِيلُ',             tr:'Al-Jaleel',            ku:'شکوهمەند'},
  {n:42, ar:'الْكَرِيمُ',             tr:'Al-Kareem',            ku:'کەریم'},
  {n:43, ar:'الرَّقِيبُ',             tr:'Ar-Raqeeb',            ku:'چاودێر'},
  {n:44, ar:'الْمُجِيبُ',             tr:'Al-Mujeeb',            ku:'وەڵامدەر'},
  {n:45, ar:'الْوَاسِعُ',             tr:"Al-Waasi'",            ku:'فراخ'},
  {n:46, ar:'الْحَكِيمُ',             tr:'Al-Hakeem',            ku:'شارەزا'},
  {n:47, ar:'الْوَدُودُ',             tr:'Al-Wadood',            ku:'خۆشەویست'},
  {n:48, ar:'الْمَجِيدُ',             tr:'Al-Majeed',            ku:'شانازیدار'},
  {n:49, ar:'الْبَاعِثُ',             tr:"Al-Baa'ith",           ku:'هەستینەر'},
  {n:50, ar:'الشَّهِيدُ',             tr:'Ash-Shaheed',          ku:'شایەت'},
  {n:51, ar:'الْحَقُّ',               tr:'Al-Haqq',              ku:'ڕاست'},
  {n:52, ar:'الْوَكِيلُ',             tr:'Al-Wakeel',            ku:'پشتی'},
  {n:53, ar:'الْقَوِيُّ',             tr:'Al-Qawiyy',            ku:'بەهێز'},
  {n:54, ar:'الْمَتِينُ',             tr:'Al-Mateen',            ku:'مەحکەم'},
  {n:55, ar:'الْوَلِيُّ',             tr:'Al-Waliyy',            ku:'دۆست'},
  {n:56, ar:'الْحَمِيدُ',             tr:'Al-Hameed',            ku:'ستایشدار'},
  {n:57, ar:'الْمُحْصِي',             tr:'Al-Muhsee',            ku:'ژمارەکارێ هەمەیان'},
  {n:58, ar:'الْمُبْدِئُ',            tr:"Al-Mubdi'",            ku:'دەستپێکار'},
  {n:59, ar:'الْمُعِيدُ',             tr:"Al-Mu'eed",            ku:'گەڕاندنەوەر'},
  {n:60, ar:'الْمُحْيِي',             tr:'Al-Muhyee',            ku:'ژیانی دەر'},
  {n:61, ar:'الْمُمِيتُ',             tr:'Al-Mumeet',            ku:'مردنی دەر'},
  {n:62, ar:'الْحَيُّ',               tr:'Al-Hayy',              ku:'ژیاو'},
  {n:63, ar:'الْقَيُّومُ',            tr:'Al-Qayyoom',           ku:'ئایەندەپار'},
  {n:64, ar:'الْوَاجِدُ',             tr:'Al-Waajid',            ku:'دۆزەرەوە'},
  {n:65, ar:'الْمَاجِدُ',             tr:'Al-Maajid',            ku:'شانازیدار'},
  {n:66, ar:'الْوَاحِدُ',             tr:'Al-Waahid',            ku:'یەک'},
  {n:67, ar:'الْأَحَدُ',              tr:'Al-Ahad',              ku:'تاک'},
  {n:68, ar:'الصَّمَدُ',              tr:'As-Samad',             ku:'بێ نیاز'},
  {n:69, ar:'الْقَادِرُ',             tr:'Al-Qaadir',            ku:'توانا'},
  {n:70, ar:'الْمُقْتَدِرُ',          tr:'Al-Muqtadir',          ku:'توانادار'},
  {n:71, ar:'الْمُقَدِّمُ',           tr:'Al-Muqaddim',          ku:'پێشخەر'},
  {n:72, ar:'الْمُؤَخِّرُ',           tr:"Al-Mu'akhkhir",        ku:'دواخەر'},
  {n:73, ar:'الْأَوَّلُ',             tr:'Al-Awwal',             ku:'یەکەم'},
  {n:74, ar:'الْآخِرُ',               tr:'Al-Aakhir',            ku:'کۆتایی'},
  {n:75, ar:'الظَّاهِرُ',             tr:'Az-Zaahir',            ku:'ئاشکرا'},
  {n:76, ar:'الْبَاطِنُ',             tr:'Al-Baatin',            ku:'نهێنی'},
  {n:77, ar:'الْوَالِي',              tr:'Al-Waali',             ku:'سەروەر'},
  {n:78, ar:'الْمُتَعَالِي',          tr:"Al-Muta'aali",         ku:'برزتر'},
  {n:79, ar:'الْبَرُّ',               tr:'Al-Barr',              ku:'باش'},
  {n:80, ar:'التَّوَّابُ',            tr:'At-Tawwaab',           ku:'توبە پەذیر'},
  {n:81, ar:'الْمُنْتَقِمُ',          tr:'Al-Muntaqim',          ku:'توانجەگر'},
  {n:82, ar:'الْعَفُوُّ',             tr:"Al-'Afuww",            ku:'بوخشایینکار'},
  {n:83, ar:'الرَّءُوفُ',             tr:"Ar-Ra'oof",            ku:'نەرمدڵ'},
  {n:84, ar:'مَالِكُ الْمُلْكِ',      tr:'Maalik-ul-Mulk',       ku:'پاشایێ پاشایان'},
  {n:85, ar:'ذُو الْجَلَالِ وَالْإِكْرَامِ', tr:'Dhul-Jalaali wal-Ikraam', ku:'خاوەنێ شکوه و کەرامەت'},
  {n:86, ar:'الْمُقْسِطُ',            tr:'Al-Muqsit',            ku:'دادپەروەر'},
  {n:87, ar:'الْجَامِعُ',             tr:'Al-Jaami',             ku:'کۆکار'},
  {n:88, ar:'الْغَنِيُّ',             tr:'Al-Ghaniyy',           ku:'بێ نیاز'},
  {n:89, ar:'الْمُغْنِي',             tr:'Al-Mughnee',           ku:'دەوڵەمەند کار'},
  {n:90, ar:'الْمَانِعُ',             tr:'Al-Maani',             ku:'پاراستووار'},
  {n:91, ar:'الضَّارُّ',              tr:'Ad-Daarr',             ku:'زیانی دەر'},
  {n:92, ar:'النَّافِعُ',             tr:"An-Naafi'",            ku:'سوودی دەر'},
  {n:93, ar:'النُّورُ',               tr:'An-Noor',              ku:'ڕووناکی'},
  {n:94, ar:'الْهَادِي',              tr:'Al-Haadee',            ku:'ڕێنیشاندەر'},
  {n:95, ar:'الْبَدِيعُ',             tr:"Al-Badee'",            ku:'دروستکارێ نوێ'},
  {n:96, ar:'الْبَاقِي',              tr:'Al-Baaqee',            ku:'هەمیشە مایەوە'},
  {n:97, ar:'الْوَارِثُ',             tr:'Al-Waarith',           ku:'وارس'},
  {n:98, ar:'الرَّشِيدُ',             tr:'Ar-Rasheed',           ku:'ڕێنیشاندەر'},
  {n:99, ar:'الصَّبُورُ',             tr:'As-Saboor',            ku:'بردبار'}
];

/* Persistent image-loaded tracker — survives every home re-render */
var IMG_LOADED = {};

/* Preload and mark loaded immediately */
(function(){
  ['hadith','dua','tasbih','asma'].forEach(function(name){
    var s = {name:name};
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
var _dbCats     = null;   /* [{key, label_ku, ...}] */
var _dbDuas     = null;   /* [{category_key, ar, ku, source, repeat}] */
var _dbHadiths  = null;   /* [{title, ar, ku, source}] */
var _dbSections = null;   /* [{key, active, sort_order}] */
var _dbTasbih   = null;   /* [{ar, ku, sort_order}] */
var _dbAsma99   = null;   /* [{n, ku}] overrides */
var _loadingDb  = false;
var _dbLoaded   = false;

var CACHE_TTL_MS = 6 * 60 * 60 * 1000; /* 6 hours */

function _readCache(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    // Never expire cache when offline — keep data usable forever without internet
    if (navigator.onLine && Date.now() - parsed.ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
    return parsed.data;
  } catch(e) { return null; }
}
function _writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ts: Date.now(), data: data})); } catch(e) {}
}

function _getSupabase() {
  /* app.js exposes supabase via window._appSupabase once initialized */
  return window._appSupabase || null;
}

/* Load from cache instantly, then re-fetch in background */
function _initDbData(onDone) {
  var cachedCats     = _readCache('gencine_cats_v1');
  var cachedDuas     = _readCache('gencine_duas_v1');
  var cachedHadiths  = _readCache('gencine_hadiths_v2');
  var cachedSections = _readCache('gencine_sections_v1');
  var cachedTasbih   = _readCache('gencine_tasbih_v1');
  var cachedAsma99   = _readCache('gencine_asma99_v1');

  if (cachedSections) _dbSections = cachedSections;

  if (cachedCats && cachedDuas && cachedHadiths) {
    _dbCats    = cachedCats;
    _dbDuas    = cachedDuas;
    _dbHadiths = cachedHadiths;
    _dbLoaded  = true;
    if (onDone) onDone();
    /* background refresh — re-render hadith list if new data arrives */
    _fetchDbData(function() {
      var ui = window.GencineUI;
      if (ui && ui._view === 'hadith' && ui._hadithDetailIdx === null) ui._draw();
    });
  } else {
    _fetchDbData(onDone);
  }
}

var _sbRetries = 0;

function _fetchDbData(onDone) {
  if (_loadingDb) { if (onDone) onDone(); return; }
  var sb = _getSupabase();
  if (!sb) {
    /* Supabase not initialised yet — retry every 700ms, give up after 8s */
    if (_sbRetries < 12) {
      _sbRetries++;
      setTimeout(function() { _fetchDbData(onDone); }, 700);
    } else {
      _sbRetries = 0;
      _dbLoaded = true;
      if (onDone) onDone();
    }
    return;
  }
  _sbRetries = 0;

  _loadingDb = true;

  var catsPromise     = sb.from('gencine_categories').select('*').eq('active', true).order('sort_order');
  var duasPromise     = sb.from('gencine_duas').select('*').eq('active', true).order('category_key').order('sort_order');
  var hadithsPromise  = sb.from('gencine_hadiths').select('*').eq('active', true).order('sort_order');
  var sectionsPromise = sb.from('gencine_sections').select('*').order('sort_order');
  var tasbihPromise   = sb.from('gencine_tasbih').select('*').eq('active', true).order('sort_order');
  var asma99Promise   = sb.from('gencine_asma99').select('n,ku');

  Promise.all([catsPromise, duasPromise, hadithsPromise, sectionsPromise]).then(function(results) {
    _loadingDb = false;
    var catRes = results[0], duaRes = results[1], hadithRes = results[2], secRes = results[3];
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
      _writeCache('gencine_hadiths_v2', _dbHadiths);
    }
    if (!secRes.error && secRes.data) {
      _dbSections = secRes.data;
      _writeCache('gencine_sections_v1', _dbSections);
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
function _getTasbih() {
  return (_dbTasbih && _dbTasbih.length) ? _dbTasbih : DHIKR_LIST;
}
function _getAsmaKuOverride(n) {
  if (!_dbAsma99 || !_dbAsma99.length) return null;
  var row = _dbAsma99.find(function(r){ return r.n === n; });
  return row ? row.ku : null;
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
  _view:            'home',   /* 'home' | 'dua' | 'tasbih' | 'hadith' */
  _duaCat:          'morning',
  _tasbihCount:     0,
  _tasbihTarget:    33,
  _tasbihDhikrIdx:  0,
  _hadithDetailIdx: null,   /* null = list view; number = detail view */
  _hadithSearch:    '',     /* current search query */

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
    this._hadithDetailIdx = null;

    /* If DB data not loaded yet, kick off load then redraw */
    if (!_dbLoaded) {
      this._draw();
      _initDbData(function(){ self._draw(); });
    } else {
      this._draw();
      /* Background refresh — re-render hadith list if new data arrives */
      _fetchDbData(function() {
        if (self._view === 'hadith' && self._hadithDetailIdx === null) self._draw();
      });
    }
  },

  /* ── pull-to-refresh: clear cache + re-fetch + re-render ── */
  refresh: function(){
    var self = this;
    localStorage.removeItem('gencine_cats_v1');
    localStorage.removeItem('gencine_duas_v1');
    localStorage.removeItem('gencine_hadiths_v2');
    _dbLoaded  = false;
    _loadingDb = false;
    _fetchDbData(function(){ self._draw(); });
  },

  /* ── called by section nav buttons ── */
  section: function(name){
    this._view = name;
    if (name === 'hadith') { this._hadithDetailIdx = null; this._hadithSearch = ''; }
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
    else if(this._view === 'asma')   this._renderAsma(el);
    else                             this._renderHadith(el);
  },

  /* ═══════════════════ HOME ═══════════════════ */
  _renderHome: function(container){
    var self = this;
    var home = document.createElement('div');
    home.className = 'genc-home';

    _sections().forEach(function(sec){
      var btn = document.createElement('button');
      btn.className = 'genc-card-btn';
      btn.dataset.sec = sec.name;
      btn.onclick = function(){ self.section(sec.name); };

      /* <img> element — fades in via opacity when loaded, no background-size warp */
      var url = '/assets/icons/genc-' + sec.name + '-bg.webp';
      var cardImg = document.createElement('img');
      cardImg.className = 'genc-card-img';
      cardImg.alt = '';
      if(IMG_LOADED[sec.name]){
        cardImg.src = url;
        btn.classList.add('has-image');
      } else {
        (function(b, img, name){
          img.onload = function(){
            IMG_LOADED[name] = true;
            b.classList.add('has-image');
          };
          img.src = url;
        })(btn, cardImg, sec.name);
      }
      btn.appendChild(cardImg);

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
    var T = window.t || function(k,d){ return d||k; };
    container.appendChild(this._backRow(T('gencine.dua','دوعا')));

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
    var T = window.t || function(k,d){ return d||k; };
    container.appendChild(this._backRow(T('gencine.tasbih','تەسبیح')));

    var wrap = document.createElement('div');
    wrap.className = 'tasbih-wrap';

    /* horizontal dhikr scroll */
    var scrollWrap = document.createElement('div');
    scrollWrap.className = 'tasbih-dhikr-scroll';
    var dhikrCards = [];
    _getTasbih().forEach(function(d, i){
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
    resetBtn.textContent = T('gencine.reset','سفر');
    resetBtn.onclick = function(){ self._tasbihReset(); };
    wrap.appendChild(resetBtn);

    container.appendChild(wrap);
  },

  /* ═══════════════════ HADITH ═══════════════════ */

  /* Relevance score for a hadith against query q (0 = no match) */
  _scoreHadith: function(h, q) {
    if (!q) return 1;
    function stripD(s) { return s.replace(/[\u064B-\u065F\u0670]/g, ''); }
    var qN = stripD(q).toLowerCase();
    if (!qN) return 1;
    var title = stripD(h.title || '').toLowerCase();
    var ar    = stripD(h.ar   || '').toLowerCase();
    var ku    = (h.ku     || '').toLowerCase();

    var score = 0;

    if (title === qN) return 10000;
    if (title.startsWith(qN))  score = Math.max(score, 5000);
    if (title.includes(qN))    score = Math.max(score, 3000);
    if (ar.includes(qN))       score = Math.max(score, 2000);
    if (ku.includes(qN))       score = Math.max(score, 1500);

    /* Per-word bonus */
    qN.split(/\s+/).filter(function(w){ return w.length >= 2; }).forEach(function(w){
      if (title.includes(w)) score += 500;
      if (ar.includes(w))    score += 300;
      if (ku.includes(w))    score += 200;
    });
    return score;
  },

  _renderHadith: function(container){
    var self = this;
    var T = window.t || function(k,d){ return d||k; };
    var hadiths = _getHadiths();

    /* ── Detail view ── */
    if (this._hadithDetailIdx !== null) {
      var h = hadiths[this._hadithDetailIdx];
      if (!h) { this._hadithDetailIdx = null; this._renderHadith(container); return; }

      var backRow = document.createElement('div');
      backRow.className = 'genc-back-row';
      var backBtn = document.createElement('button');
      backBtn.className = 'genc-back-btn';
      var backIco = document.createElement('i');
      backIco.className = 'fas fa-arrow-right';
      backBtn.appendChild(backIco);
      backBtn.onclick = function(){
        var savedScroll = self._hadithListScroll || 0;
        self._hadithDetailIdx = null;
        self._draw();
        var p = document.getElementById('panelGencine');
        if (p) p.scrollTop = savedScroll;
      };
      backRow.appendChild(backBtn);
      var backLbl = document.createElement('span');
      backLbl.className = 'genc-back-label';
      backLbl.textContent = T('gencine.hadith','حەدیس');
      backRow.appendChild(backLbl);
      container.appendChild(backRow);

      var detail = document.createElement('div');
      detail.className = 'hadith-detail-card';

      var numRow = document.createElement('div');
      numRow.className = 'hadith-num-badge';
      numRow.textContent = '#' + (this._hadithDetailIdx + 1);
      detail.appendChild(numRow);

      if (h.title) {
        var titleEl = document.createElement('div');
        titleEl.className = 'hadith-detail-title';
        titleEl.textContent = h.title;
        detail.appendChild(titleEl);
      }
      if (h.ar) {
        var arEl = document.createElement('div');
        arEl.className = 'dua-card-ar';
        arEl.textContent = h.ar;
        detail.appendChild(arEl);
      }
      if (h.ku) {
        var kuEl = document.createElement('div');
        kuEl.className = 'dua-card-ku';
        kuEl.textContent = h.ku;
        detail.appendChild(kuEl);
      }

      var detailFooter = document.createElement('div');
      detailFooter.className = 'dua-card-footer';
      if (h.source) {
        h.source.split('\n').filter(Boolean).forEach(function(s) {
          var srcEl = document.createElement('span');
          srcEl.className = 'dua-card-src';
          srcEl.textContent = s;
          detailFooter.appendChild(srcEl);
        });
      }
      var copyText = (h.title ? h.title + '\n\n' : '') + (h.ar || '') + (h.ku ? '\n\n' + h.ku : '') + (h.source ? '\n\n' + h.source : '');
      detailFooter.appendChild(_mkCopyBtn(copyText));
      if (navigator.share) {
        var shareBtn = document.createElement('button');
        shareBtn.className = 'dua-copy-btn';
        var shareIco = document.createElement('i');
        shareIco.className = 'fas fa-share-alt';
        shareBtn.appendChild(shareIco);
        (function(shareText){
          shareBtn.onclick = function(e) {
            e.stopPropagation();
            navigator.share({title: h.title||'Hadith', text: shareText}).catch(function(){});
            haptic(12);
          };
        })(copyText);
        detailFooter.appendChild(shareBtn);
      }
      detail.appendChild(detailFooter);
      container.appendChild(detail);

      /* Prev / Next */
      var nav = document.createElement('div');
      nav.className = 'hadith-nav';

      var prevBtn = document.createElement('button');
      prevBtn.className = 'hadith-nav-btn' + (this._hadithDetailIdx === 0 ? ' disabled' : '');
      prevBtn.disabled = this._hadithDetailIdx === 0;
      var prevIco = document.createElement('i');
      prevIco.className = 'fas fa-arrow-right';
      prevBtn.appendChild(prevIco);
      var prevLbl = document.createElement('span');
      prevLbl.textContent = T('gencine.hadith_prev','پێشوو');
      prevBtn.appendChild(prevLbl);
      prevBtn.onclick = function(){ self._hadithDetailIdx--; self._draw(); var p=document.getElementById('panelGencine');if(p)p.scrollTop=0; };
      nav.appendChild(prevBtn);

      var navCount = document.createElement('span');
      navCount.className = 'hadith-nav-count';
      navCount.textContent = (this._hadithDetailIdx + 1) + ' / ' + hadiths.length;
      nav.appendChild(navCount);

      var nextBtn = document.createElement('button');
      nextBtn.className = 'hadith-nav-btn' + (this._hadithDetailIdx === hadiths.length - 1 ? ' disabled' : '');
      nextBtn.disabled = this._hadithDetailIdx === hadiths.length - 1;
      var nextLbl = document.createElement('span');
      nextLbl.textContent = T('gencine.hadith_next','دواتر');
      nextBtn.appendChild(nextLbl);
      var nextIco = document.createElement('i');
      nextIco.className = 'fas fa-arrow-left';
      nextBtn.appendChild(nextIco);
      nextBtn.onclick = function(){ self._hadithDetailIdx++; self._draw(); var p=document.getElementById('panelGencine');if(p)p.scrollTop=0; };
      nav.appendChild(nextBtn);

      container.appendChild(nav);
      return;
    }

    /* ── List view ── */
    container.appendChild(this._backRow(T('gencine.hadith','حەدیس')));

    if (!hadiths.length) {
      _fetchDbData(function() {
        if (_getHadiths().length && self._view === 'hadith' && self._hadithDetailIdx === null) self._draw();
      });
      var wrap = document.createElement('div');
      wrap.className = 'genc-coming';
      var iconEl = document.createElement('div');
      iconEl.className = 'genc-coming-icon';
      var loadIco = document.createElement('i');
      loadIco.className = 'fas fa-book-open';
      iconEl.appendChild(loadIco);
      wrap.appendChild(iconEl);
      var comingTitle = document.createElement('div');
      comingTitle.className = 'genc-coming-title';
      comingTitle.textContent = T('gencine.loading','بارکرن...');
      wrap.appendChild(comingTitle);
      container.appendChild(wrap);
      return;
    }

    /* Search bar */
    var searchWrap = document.createElement('div');
    searchWrap.className = 'hadith-search-wrap';
    var searchIco = document.createElement('i');
    searchIco.className = 'fas fa-search hadith-search-ico';
    searchWrap.appendChild(searchIco);
    var searchInput = document.createElement('input');
    searchInput.className = 'hadith-search';
    searchInput.type = 'search';
    searchInput.placeholder = T('gencine.hadith_search_ph','گەڕان بە ناو یا دەق...');
    searchInput.value = this._hadithSearch;
    searchWrap.appendChild(searchInput);
    container.appendChild(searchWrap);

    /* Count label */
    var countEl = document.createElement('div');
    countEl.className = 'hadith-count';
    container.appendChild(countEl);

    /* List container — rebuilt in-place on each keystroke */
    var list = document.createElement('div');
    list.className = 'hadith-list';
    container.appendChild(list);

    function buildList(q) {
      while (list.firstChild) list.removeChild(list.firstChild);

      var scored;
      if (!q || !q.trim()) {
        scored = hadiths.map(function(h, i){ return {h: h, origIdx: i}; });
        countEl.textContent = hadiths.length + ' ' + T('gencine.hadith_count','فەرمودە');
      } else {
        scored = hadiths.map(function(h, i){
          return {h: h, origIdx: i, score: self._scoreHadith(h, q.trim())};
        }).filter(function(x){ return x.score > 0; });
        scored.sort(function(a, b){ return b.score - a.score; });
        countEl.textContent = scored.length + ' / ' + hadiths.length + ' ' + T('gencine.hadith_count','فەرمودە');
      }

      if (!scored.length) {
        var empty = document.createElement('div');
        empty.className = 'hadith-empty';
        empty.textContent = T('gencine.hadith_empty','هیچ فەرمودەیەک نەدۆزراوەتەوە');
        list.appendChild(empty);
        return;
      }

      scored.forEach(function(item){
        var h = item.h;
        var origIdx = item.origIdx;

        var row = document.createElement('button');
        row.className = 'hadith-title-item';

        var numEl = document.createElement('div');
        numEl.className = 'hadith-num';
        numEl.textContent = origIdx + 1;
        row.appendChild(numEl);

        var textCol = document.createElement('div');
        textCol.className = 'hadith-title-col';

        var titleText = document.createElement('div');
        titleText.className = 'hadith-title-text';
        titleText.textContent = h.title || (h.ar ? h.ar.substring(0, 55) + '…' : '');
        textCol.appendChild(titleText);

        if (h.ar && h.title) {
          var arPrev = document.createElement('div');
          arPrev.className = 'hadith-title-ar';
          arPrev.textContent = h.ar.length > 65 ? h.ar.substring(0,65)+'…' : h.ar;
          textCol.appendChild(arPrev);
        }

        if (h.source) {
          var srcEl = document.createElement('div');
          srcEl.className = 'hadith-title-src';
          srcEl.textContent = h.source.split('\n').filter(Boolean).join(' • ');
          textCol.appendChild(srcEl);
        }
        row.appendChild(textCol);

        var arrow = document.createElement('i');
        arrow.className = 'fas fa-chevron-left';
        row.appendChild(arrow);

        row.onclick = function(){
          var p = document.getElementById('panelGencine');
          self._hadithListScroll = p ? p.scrollTop : 0;
          self._hadithDetailIdx = origIdx;
          self._draw();
          if (p) p.scrollTop = 0;
        };
        list.appendChild(row);
      });
    }

    buildList(this._hadithSearch);

    searchInput.addEventListener('input', function(){
      self._hadithSearch = this.value;
      buildList(this.value);
    });

    /* Restore focus if user was mid-search */
    if (this._hadithSearch) {
      setTimeout(function(){
        searchInput.focus();
        var len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
      }, 50);
    }
  },

  /* ═══════════════════ 99 NAMES ═══════════════════ */
  _renderAsma: function(container){
    var T = window.t || function(k,d){ return d||k; };
    container.appendChild(this._backRow(T('gencine.asma','ناوێن خوا')));

    /* sticky search bar */
    var searchWrap = document.createElement('div');
    searchWrap.className = 'asma-search-wrap';
    var input = document.createElement('input');
    input.className = 'asma-search';
    input.type = 'search';
    input.placeholder = T('gencine.asma_search_ph','گەڕان...');
    searchWrap.appendChild(input);
    container.appendChild(searchWrap);

    /* count label */
    var countEl = document.createElement('div');
    countEl.className = 'asma-count';
    countEl.textContent = T('gencine.asma_count','٩٩ ناوێن خوا');
    container.appendChild(countEl);

    /* grid */
    var grid = document.createElement('div');
    grid.className = 'asma-grid';

    function buildCards(filter){
      while(grid.firstChild) grid.removeChild(grid.firstChild);
      var list = filter
        ? ASMA_DATA.filter(function(a){
            var q = filter.toLowerCase();
            return a.ar.includes(filter) || a.tr.toLowerCase().includes(q) || a.ku.includes(filter);
          })
        : ASMA_DATA;

      countEl.textContent = filter ? (list.length + ' / ٩٩') : T('gencine.asma_count','٩٩ ناوێن خوا');

      list.forEach(function(a){
        var card = document.createElement('div');
        card.className = 'asma-card';

        var num = document.createElement('div');
        num.className = 'asma-num';
        num.textContent = a.n;
        card.appendChild(num);

        var ar = document.createElement('div');
        ar.className = 'asma-ar';
        ar.textContent = a.ar;
        card.appendChild(ar);

        var tr = document.createElement('div');
        tr.className = 'asma-trans';
        tr.textContent = a.tr;
        card.appendChild(tr);

        var ku = document.createElement('div');
        ku.className = 'asma-ku';
        var _kuOvr=_getAsmaKuOverride(a.n); ku.textContent = _kuOvr!==null?_kuOvr:a.ku;
        card.appendChild(ku);

        var footer = document.createElement('div');
        footer.className = 'asma-card-footer';
        var copyText = a.ar + '\n' + a.tr + '\n' + a.ku;
        footer.appendChild(_mkCopyBtn(copyText));
        card.appendChild(footer);

        grid.appendChild(card);
      });
    }

    buildCards('');
    container.appendChild(grid);

    input.addEventListener('input', function(){
      buildCards(this.value.trim());
    });
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
