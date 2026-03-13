/* Gencine (Religious Treasure) Tab — GencineUI */
(function(){
'use strict';

function _sections(){
  var T = window.t || function(k,d){ return d||k; };
  var all = [
    { name:'hadith', label:T('gencine.hadith','حەدیس'),     sub:T('gencine.hadith_sub','فەرمودێن پێغەمبەرێ ئیسلامێ'),           icon:'fas fa-scroll'             },
    { name:'dua',    label:T('gencine.dua','دوعا'),          sub:T('gencine.dua_sub','دعاهای بەیانی، ئێوار و زیاتر'),           icon:'fa-solid fa-person-praying' },
    { name:'tasbih', label:T('gencine.tasbih','تەسبیح'),    sub:T('gencine.tasbih_sub','ژمارتنا دیکرێن ئیسلامی'),              icon:'fas fa-rotate'             },
    { name:'asma',   label:T('gencine.asma','ناوێن خوا'),   sub:T('gencine.asma_sub','٩٩ ناوێن گەورەیێ خوایێ بەزەیی کار'),   icon:'fas fa-star-and-crescent' },
    { name:'books',  label:T('gencine.books','کتێب'),        sub:T('gencine.books_sub','کتێبێن ئیسلامی'),                       icon:'fas fa-book-open' }
  ];
  if (!_dbSections || !_dbSections.length) return all;
  var activeMap = {}, orderMap = {};
  _dbSections.forEach(function(s){ activeMap[s.key] = s.active; if (s.sort_order != null) orderMap[s.key] = s.sort_order; });
  return all
    .filter(function(sec){ return activeMap[sec.name] !== false; })
    .sort(function(a, b){
      var oa = orderMap[a.name] != null ? orderMap[a.name] : 999;
      var ob = orderMap[b.name] != null ? orderMap[b.name] : 999;
      return oa - ob;
    });
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
  {ar:'سُبْحَانَ اللَّهِ',                         ku:'سبحان الله',                key:'سبحان'},
  {ar:'الْحَمْدُ لِلَّهِ',                         ku:'الحمد لله',                 key:'الحمد'},
  {ar:'اللَّهُ أَكْبَرُ',                          ku:'الله أكبر',                  key:'اكبر'},
  {ar:'لَا إِلَهَ إِلَّا اللَّهُ',                ku:'لا اله الا الله',           key:'الا'},
  {ar:'أَسْتَغْفِرُ اللَّهَ',                      ku:'استغفر الله',                key:'استغفر'},
  {ar:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',       ku:'سبحان الله وبحمده',         key:'وبحمده'},
  {ar:'سُبْحَانَ اللَّهِ الْعَظِيمِ',              ku:'سبحان الله العظيم',         key:'العظيم'},
  {ar:'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',          ku:'صلات بەسەر پێغەمبەر',       key:'محمد'},
  {ar:'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', ku:'لا حوله ولا قوه',          key:'حوله'},
  {ar:'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',     ku:'بسم الله الرحمن الرحيم',   key:'الرحمن'}
];

/* Fallback hardcoded categories — used when Supabase not available */
var FALLBACK_CAT_KEYS   = ['morning','evening','travel','eating','sleep','general'];
var FALLBACK_CAT_LABELS = {
  morning:'بەیانیکردن', evening:'ئێواربوون', travel:'گەشت',
  eating:'خواردن',      sleep:'خەو',         general:'گشتی'
};

var TARGET_PRESETS = [33, 66, 99, 100, 500, 1000];
var RING_R    = 110;
var RING_CIRC = 2 * Math.PI * RING_R;

/* ── Supabase data cache ── */
var _dbCats     = null;   /* [{key, label_ku, ...}] */
var _dbDuas     = null;   /* [{category_key, ar, ku, source, repeat}] */
var _dbHadiths  = null;   /* [{title, ar, ku, source}] */
var _dbSections = null;   /* [{key, active, sort_order}] */
var _dbTasbih   = null;   /* [{ar, ku, sort_order}] */
var _dbAsma99   = null;   /* [{n, ku}] overrides */
var _dbBooks    = [];
var _loadingDb  = false;
var _dbLoaded   = false;

function _readCache(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    /* Cache never expires — background refresh keeps it fresh silently.
       User can pull-to-refresh to force a reload. */
    return parsed.data || parsed; /* support both {ts,data} and raw formats */
  } catch(e) { return null; }
}
function _writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ts: Date.now(), data: data})); } catch(e) {}
}

function _getSupabase() {
  /* app.js exposes supabase via window._appSupabase once initialized */
  return window._appSupabase || null;
}

var _bgRefreshDone = false; /* only refresh once per app session */

/* Load from cache instantly, then re-fetch once in background per session */
function _initDbData(onDone) {
  var cachedCats     = _readCache('gencine_cats_v5');
  var cachedDuas     = _readCache('gencine_duas_v2');
  var cachedHadiths  = _readCache('gencine_hadiths_v2');
  var cachedSections = _readCache('gencine_sections_v1');
  var cachedBooks    = _readCache('gencine_books_v3');
  var cachedTasbih   = _readCache('gencine_tasbih_v1');
  var cachedAsma99   = _readCache('gencine_asma99_v1');

  if (cachedSections) _dbSections = cachedSections;
  if (cachedBooks)    _dbBooks    = cachedBooks;
  if (cachedTasbih)   _dbTasbih   = cachedTasbih;
  if (cachedAsma99)   _dbAsma99   = cachedAsma99;

  if (cachedCats && cachedDuas && cachedHadiths) {
    _dbCats    = cachedCats;
    _dbDuas    = cachedDuas;
    _dbHadiths = cachedHadiths;
    _dbLoaded  = true;
    if (onDone) onDone();
    if (window._splashReadyGencine) window._splashReadyGencine();
    /* One silent background refresh per session to pick up admin changes */
    if (!_bgRefreshDone && navigator.onLine) {
      _bgRefreshDone = true;
      _fetchDbData(function() {
        var ui = window.GencineUI;
        if (!ui) return;
        ui._homeEl = null;
        if (ui._view === 'home') ui._draw();
        else if (ui._view === 'hadith' && ui._hadithDetailIdx === null) ui._draw();
        else if (ui._view === 'books') ui._draw();
      });
    }
  } else {
    _fetchDbData(onDone);
  }
}

var _sbRetries = 0;
var _fetchQueue = []; /* callbacks waiting for _fetchDbData to complete */

function _fetchDbData(onDone) {
  if (_loadingDb) {
    /* Already in-flight — queue callback, don't call it prematurely */
    if (onDone) _fetchQueue.push(onDone);
    return;
  }
  var sb = _getSupabase();
  if (!sb) {
    /* Supabase not initialised yet — retry every 700ms, give up after 8s */
    if (_sbRetries < 12) {
      _sbRetries++;
      if (onDone) _fetchQueue.push(onDone);
      setTimeout(function() {
        var cbs = _fetchQueue.splice(0);
        _fetchDbData(function(){
          _dbLoaded = true;
          cbs.forEach(function(cb){ try{cb();}catch(e){} });
        });
      }, 700);
    } else {
      _sbRetries = 0;
      _dbLoaded = true;
      if (onDone) onDone();
    }
    return;
  }
  _sbRetries = 0;
  if (onDone) _fetchQueue.push(onDone);

  _loadingDb = true;

  var catsPromise     = sb.from('gencine_categories').select('*').eq('active', true).eq('is_hidden', false).order('sort_order', { ascending: true });
  var duasPromise     = sb.from('gencine_duas').select('*').eq('active', true).order('category_key').order('sort_order');
  var hadithsPromise  = sb.from('gencine_hadiths').select('*').eq('active', true).order('sort_order');
  var sectionsPromise = sb.from('gencine_sections').select('*').order('sort_order');
  var tasbihPromise   = sb.from('gencine_tasbih').select('*').eq('active', true).order('sort_order');
  var asma99Promise   = sb.from('gencine_asma99').select('n,ku');
  var booksPromise    = sb.from('gencine_books').select('*').eq('active', true).order('sort_order', { ascending: false }).order('created_at', { ascending: false });
  Promise.all([catsPromise, duasPromise, hadithsPromise, sectionsPromise, booksPromise, tasbihPromise, asma99Promise]).then(function(results) {
    _loadingDb = false;
    var catRes = results[0], duaRes = results[1], hadithRes = results[2], secRes = results[3], bookRes = results[4], tasbihRes = results[5], asma99Res = results[6];
    if (!catRes.error && catRes.data) {
      _dbCats = catRes.data;
      _writeCache('gencine_cats_v5', _dbCats);
    }
    if (!duaRes.error && duaRes.data) {
      _dbDuas = duaRes.data;
      _writeCache('gencine_duas_v2', _dbDuas);
    }
    if (!hadithRes.error && hadithRes.data) {
      _dbHadiths = hadithRes.data;
      _writeCache('gencine_hadiths_v2', _dbHadiths);
    }
    if (!secRes.error && secRes.data) {
      _dbSections = secRes.data;
      _writeCache('gencine_sections_v1', _dbSections);
    }
    if (!bookRes.error && bookRes.data) {
      _dbBooks = bookRes.data;
      _writeCache('gencine_books_v3', _dbBooks);
      /* Pre-cache all book cover images in the HTTP cache */
      _dbBooks.forEach(function(b){ if(b.cover_url){ var img=new Image(); img.src=b.cover_url; } });
    }
    if (tasbihRes && !tasbihRes.error && tasbihRes.data) { _dbTasbih = tasbihRes.data; _writeCache('gencine_tasbih_v1', _dbTasbih); }
    if (asma99Res && !asma99Res.error && asma99Res.data) { _dbAsma99 = asma99Res.data; _writeCache('gencine_asma99_v1', _dbAsma99); }
    _dbLoaded = true;
    if (window._splashReadyGencine) window._splashReadyGencine();
    var cbs = _fetchQueue.splice(0);
    cbs.forEach(function(cb){ try{cb();}catch(e){} });
  }).catch(function() {
    _loadingDb = false;
    _dbLoaded  = true;
    if (window._splashReadyGencine) window._splashReadyGencine();
    var cbs = _fetchQueue.splice(0);
    cbs.forEach(function(cb){ try{cb();}catch(e){} });
  });
}

/* ── Book save/favourite helpers ── */
function _bookGetSaved(){ try{ return JSON.parse(localStorage.getItem('book_saved')||'[]'); }catch(e){ return []; } }
function _bookIsSaved(id){ return _bookGetSaved().some(function(b){ return String(b.id)===String(id); }); }
function _bookToggleSave(id, book){
  var saved = _bookGetSaved();
  var idx = saved.findIndex(function(b){ return String(b.id)===String(id); });
  if (idx >= 0) { saved.splice(idx, 1); }
  else { saved.unshift({ id: book.id, title_ku: book.title_ku, title_ar: book.title_ar, author_ku: book.author_ku, cover_url: book.cover_url }); }
  localStorage.setItem('book_saved', JSON.stringify(saved));
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
  _homeEl:          null,     /* cached home grid — built once, reused */
  _duaCat:          'quran',
  _tasbihCount:     0,
  _tasbihTarget:    33,
  _tasbihDhikrIdx:  0,
  _hadithDetailIdx: null,   /* null = list view; number = detail view */
  _hadithSearch:    '',     /* current search query */
  _voiceActive:     false,
  _recognition:     null,
  _voiceListener:   null,
  _bookCat:         'all',
  _bookSearch:      '',
  _bookAuthor:      '',
  _currentBook:     null,
  _pdfDoc:          null,
  _pdfPage:         1,
  _pdfRendering:    false,

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

    /* Skip redraw only if home is already rendered with DB-sourced content */
    var el = $('gencineContent');
    if (_dbLoaded && this._view === 'home' && el && el.firstChild && this._homeEl) {
      return;
    }

    this._view = 'home';
    this._hadithDetailIdx = null;
    /* Hide books header buttons when returning to home */
    var _hb = document.getElementById('booksHdrBtns');
    if (_hb) _hb.style.display = 'none';

    if (!_dbLoaded) {
      this._draw();
      _initDbData(function(){
        self._homeEl = null; // rebuild with DB sort order
        self._draw();
      });
    } else {
      /* Already loaded — just redraw, no background re-fetch */
      this._draw();
    }
  },

  /* ── background data prefetch — warms cache with no DOM work ── */
  prefetch: function(){
    if(_dbLoaded||_loadingDb)return;
    _initDbData(null);
  },

  /* ── pull-to-refresh: clear cache + re-fetch + re-render ── */
  refresh: function(){
    var self = this;
    localStorage.removeItem('gencine_cats_v2');
    localStorage.removeItem('gencine_duas_v2');
    localStorage.removeItem('gencine_hadiths_v2');
    localStorage.removeItem('gencine_sections_v1');
    _dbLoaded  = false;
    _loadingDb = false;
    this._homeEl = null;
    _fetchDbData(function(){ self._draw(); });
  },

  /* ── called by section nav buttons ── */
  section: function(name){
    this._view = name;
    if (name === 'hadith') { this._hadithDetailIdx = null; this._hadithSearch = ''; }
    this._draw();
  },

  goHome: function(){
    if (this._view === 'book-reader') { this._view = 'books'; }
    else if (this._view === 'hadith' && this._hadithDetailIdx !== null) { this._hadithDetailIdx = null; }
    else { this._view = 'home'; }
    this._draw();
  },

  _updateHeader: function(){
    var backBtn = document.getElementById('gencineBackBtn');
    var title   = document.getElementById('gencineHdrTitle');
    var isHome  = (this._view === 'home');
    if(backBtn) backBtn.style.display    = isHome ? 'none' : 'flex';
    if(title)   title.style.visibility  = isHome ? '' : 'hidden';
  },

  /* ── main dispatcher ── */
  _draw: function(){
    var el = $('gencineContent');
    if(!el) return;
    if(this._view !== 'tasbih' && this._voiceActive) this._stopVoice();
    while(el.firstChild) el.removeChild(el.firstChild);
    var panel = document.getElementById('panelGencine');
    if(panel) panel.scrollTop = 0;
    this._updateHeader();
    if(this._view === 'home')        this._renderHome(el);
    else if(this._view === 'dua')    this._renderDua(el);
    else if(this._view === 'tasbih') this._renderTasbih(el);
    else if(this._view === 'asma')       this._renderAsma(el);
    else if(this._view === 'books')       this._renderBooks(el);
    else if(this._view === 'book-reader') this._renderBookReader(el);
    else                                  this._renderHadith(el);
  },

  /* ═══════════════════ HOME ═══════════════════ */
  _renderHome: function(container){
    if (this._homeEl) { container.appendChild(this._homeEl); return; }
    /* Show spinner until DB sections arrive — never show hardcoded sort */
    if (!_dbSections) {
      var ld = document.createElement('div');
      ld.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:80px 0;color:var(--text3)';
      ld.appendChild(Object.assign(document.createElement('i'), {className:'fas fa-spinner fa-spin'}));
      container.appendChild(ld);
      return;
    }
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
      /* Always apply has-image immediately — overlay + text colours render
         correctly at once. Image opacity-fades in via CSS when it loads. */
      cardImg.src = url;
      btn.classList.add('has-image');
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

    this._homeEl = home;
    container.appendChild(home);
  },

  /* ── back row shared by all sections ── */
  _backRow: function(label, onBack){
    var self = this;
    var row = document.createElement('div');
    row.className = 'genc-back-row';
    var btn = document.createElement('button');
    btn.className = 'genc-back-btn';
    var i = document.createElement('i');
    i.className = 'fas fa-arrow-right';
    btn.appendChild(i);
    btn.onclick = onBack ? onBack : function(){ self.render(); };
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
        var arText = dua.ar || '';
        var ayahs = arText.split('۝');
        if (ayahs.length > 1) {
          var ARABIC_NUMS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
          function toArabicNum(n) {
            return String(n).split('').map(function(d){ return ARABIC_NUMS[+d] || d; }).join('');
          }
          ayahs.forEach(function(ayah, idx) {
            ayah = ayah.trim();
            if (!ayah) return;
            ar.appendChild(document.createTextNode(ayah + ' '));
            var numEl = document.createElement('span');
            numEl.className = 'dua-ayah-num';
            numEl.textContent = toArabicNum(idx + 1);
            ar.appendChild(numEl);
            ar.appendChild(document.createTextNode(' '));
          });
        } else {
          ar.textContent = arText;
        }
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

  /* ═════════════════════ TASBIH ═════════════════════ */
  _renderTasbih: function(container){
    var self = this;
    var T = window.t || function(k,d){ return d||k; };
    

    var wrap = document.createElement('div');
    wrap.className = 'tasbih-wrap';

    /* ── dhikr selector grid ── */
    var grid = document.createElement('div');
    grid.className = 'tasbih-dhikr-grid';
    var dhikrCards = [];
    _getTasbih().forEach(function(d, i){
      var card = document.createElement('button');
      card.className = 'tasbih-dhikr-pill' + (i === self._tasbihDhikrIdx ? ' on' : '');
      card.textContent = d.ku;
      card.onclick = function(){
        self._tasbihDhikrIdx = i;
        self._tasbihCount = 0;
        self._saveState();
        dhikrCards.forEach(function(c){ c.classList.remove('on'); });
        card.classList.add('on');
        card.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
        var display = $('tasbihDhikrDisplay');
        if(display) display.textContent = (_getTasbih()[i]||{}).ar || '';
        self._updateRing();
      };
      dhikrCards.push(card);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    /* ── dhikr Arabic display ── */
    var dhikrDisplay = document.createElement('div');
    dhikrDisplay.className = 'tasbih-dhikr-display';
    dhikrDisplay.id = 'tasbihDhikrDisplay';
    dhikrDisplay.textContent = ((_getTasbih()[self._tasbihDhikrIdx])||{}).ar || '';
    wrap.appendChild(dhikrDisplay);

    /* ── SVG ring (bigger: 260px) ── */
    var ringWrap = document.createElement('div');
    ringWrap.className = 'tasbih-ring';

    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 260 260');
    svg.setAttribute('width','260');
    svg.setAttribute('height','260');

    var track = document.createElementNS('http://www.w3.org/2000/svg','circle');
    track.setAttribute('class','tasbih-ring-track');
    track.setAttribute('cx','130'); track.setAttribute('cy','130'); track.setAttribute('r', RING_R);
    svg.appendChild(track);

    var fillEl = document.createElementNS('http://www.w3.org/2000/svg','circle');
    fillEl.setAttribute('class','tasbih-ring-fill');
    fillEl.setAttribute('cx','130'); fillEl.setAttribute('cy','130'); fillEl.setAttribute('r', RING_R);
    fillEl.setAttribute('stroke-dasharray', RING_CIRC);
    var pct = Math.min(self._tasbihCount / Math.max(self._tasbihTarget, 1), 1);
    fillEl.setAttribute('stroke-dashoffset', RING_CIRC * (1 - pct));
    fillEl.id = 'tasbihRingFill';
    svg.appendChild(fillEl);
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
    countOf.textContent = 'من ' + self._tasbihTarget;
    tapBtn.appendChild(countOf);
    var tapHint = document.createElement('div');
    tapHint.className = 'tasbih-tap-hint';
    tapHint.textContent = T('gencine.tap_hint','بتاپینێ');
    tapBtn.appendChild(tapHint);
    tapBtn.onclick = function(){ self._tasbihTap(); };
    ringWrap.appendChild(tapBtn);
    wrap.appendChild(ringWrap);

    /* ── target presets ── */
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
        targetBtns.forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        self._updateRing();
      };
      targetBtns.push(btn);
      targetRow.appendChild(btn);
    });
    wrap.appendChild(targetRow);

    /* ── action row: reset + voice ── */
    var actionRow = document.createElement('div');
    actionRow.className = 'tasbih-action-row';

    var resetBtn = document.createElement('button');
    resetBtn.className = 'tasbih-reset-btn';
    var resetI = document.createElement('i');
    resetI.className = 'fas fa-rotate-left';
    resetBtn.appendChild(resetI);
    var resetLbl = document.createElement('span');
    resetLbl.textContent = T('gencine.reset','سفر');
    resetBtn.appendChild(resetLbl);
    resetBtn.onclick = function(){ self._tasbihReset(); };
    actionRow.appendChild(resetBtn);

    var voiceBtn = document.createElement('button');
    voiceBtn.id = 'tasbihVoiceBtn';
    voiceBtn.className = 'tasbih-voice-btn' + (self._voiceActive ? ' on' : '');
    var micI = document.createElement('i');
    micI.className = 'fas fa-microphone mic-icon';
    voiceBtn.appendChild(micI);
    var voiceLbl = document.createElement('span');
    voiceLbl.id = 'tasbihVoiceLbl';
    voiceLbl.textContent = self._voiceActive ? T('gencine.voice_listening','...دابیستم') : T('gencine.voice_start','دانگ');
    voiceBtn.appendChild(voiceLbl);
    var bars = document.createElement('div');
    bars.id = 'tasbihVoiceBars';
    bars.className = 'tasbih-voice-bars ' + (self._voiceActive ? 'active' : 'idle');
    for(var b = 0; b < 5; b++){
      var bar = document.createElement('div');
      bar.className = 'tasbih-voice-bar';
      bars.appendChild(bar);
    }
    voiceBtn.appendChild(bars);
    voiceBtn.onclick = function(){ self._toggleVoice(); };
    actionRow.appendChild(voiceBtn);
    wrap.appendChild(actionRow);

    /* transcript */
    var tscript = document.createElement('div');
    tscript.id = 'tasbihVoiceTranscript';
    tscript.className = 'tasbih-voice-transcript';
    wrap.appendChild(tscript);

    container.appendChild(wrap);
  },

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
  },
  /* =========== VOICE TASBIH =========== */
  _toggleVoice: function(){
    if(this._voiceActive){ this._stopVoice(); } else { this._startVoice(); }
  },

  _normalizeAr: function(s){
    return s
      .replace(/[\u064B-\u065F\u0670\u0671\u0651\u0652]/g,'')
      .replace(/[آأإٱٲٳ]/g,'ا')
      .replace(/ة/g,'ه').replace(/ى/g,'ي')
      .replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ء/g,'')
      .trim().replace(/\s+/g,' ');
  },

  _countMatches: function(transcript){
    var self = this;
    var t = self._normalizeAr(transcript);
    var tNoSpace = t.replace(/\s/g,'');
    var list = _getTasbih();
    var dhikr = list[self._tasbihDhikrIdx];
    if(!dhikr) return 0;
    function countIn(h,n){ if(!n)return 0; var x=0,p=0; while((p=h.indexOf(n,p))!==-1){x++;p+=n.length;} return x; }
    var COMMON = {'الله':1,'اله':1,'لا':1,'في':1,'من':1,'على':1,'و':1,'ب':1,'ل':1};
    var best = 0;
    /* S0: hardcoded key — single most distinctive word, bypasses generic filtering */
    if(dhikr.key){
      var c0 = countIn(t, dhikr.key);
      if(c0 > best) best = c0;
    }
    var sources = [self._normalizeAr(dhikr.ku), self._normalizeAr(dhikr.ar)];
    for(var k=0;k<sources.length;k++){
      var tgt=sources[k]; if(!tgt) continue;
      /* S1: full phrase */
      var c1=countIn(t,tgt); if(c1>best)best=c1;
      /* S2: no-space (handles merged transcripts) */
      var c2=countIn(tNoSpace,tgt.replace(/\s/g,'')); if(c2>best)best=c2;
      var words=tgt.split(' ');
      var kws=words.filter(function(w){return w.length>=3&&!COMMON[w];});
      if(!kws.length)kws=words.filter(function(w){return w.length>=2&&!COMMON[w];});
      if(!kws.length)kws=words.filter(function(w){return w.length>=2;});
      if(!kws.length)kws=words;
      /* S3: min-count across ALL keywords = complete repetitions only */
      if(kws.length>=2){
        var minC=Infinity;
        for(var wi=0;wi<kws.length;wi++){ var wc=countIn(t,kws[wi]); if(wc<minC)minC=wc; }
        if(minC>0&&minC<Infinity&&minC>best)best=minC;
      }
      /* S4: longest single keyword count */
      kws.sort(function(a,b){return b.length-a.length;});
      var c3=countIn(t,kws[0]); if(c3>best)best=c3;
      /* S5: any keyword present = at least 1 */
      if(!best)for(var w=0;w<kws.length;w++){if(t.includes(kws[w])){best=1;break;}}
    }
    return best;
  },

  _startVoice: function(){
    var self = this;
    var SR = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
    if(!SR){
      var T = window.t || function(k,d){ return d||k; };
      alert(T('gencine.voice_unsupported','Voice recognition not supported.'));
      return;
    }
    SR.requestPermissions().then(function(){
      self._voiceActive = true;
      self._updateVoiceBtn();
      self._voiceLoop();
    }).catch(function(){
      var T = window.t || function(k,d){ return d||k; };
      alert(T('gencine.voice_unsupported','Microphone permission denied.'));
    });
  },

  _voiceLoop: function(){
    var self = this;
    if(!self._voiceActive) return;
    var SR = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
    if(!SR) return;
    SR.start({
      language: 'ar-SA',
      maxResults: 10,
      popup: false
    }).then(function(result){
      if(!self._voiceActive) return;
      var matches = result && result.matches ? result.matches : [];
      var best = 0; var bestText = '';
      for(var i=0;i<matches.length;i++){
        var n=self._countMatches(matches[i]);
        if(n>best){best=n;bestText=matches[i];}
      }
      if(best>0){
        self._showTranscript(bestText, best);
        for(var j=0;j<best;j++) self._tasbihTap();
      }
      self._voiceLoop();
    }).catch(function(){
      if(self._voiceActive) self._voiceLoop();
    });
  },

  _stopVoice: function(){
    var self = this;
    self._voiceActive = false;
    var SR = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
    if(SR){ SR.stop().catch(function(){}); }
    self._showTranscript('', 0);
    self._updateVoiceBtn();
  },

  _showTranscript: function(text, count){
    var self = this;
    var el = document.getElementById('tasbihVoiceTranscript');
    if(!el) return;
    if(!text){ el.textContent=''; el.classList.remove('visible'); return; }
    el.textContent = text + (count>1 ? ' ×'+count : '');
    el.classList.add('visible');
    clearTimeout(self._transcriptTimer);
    self._transcriptTimer = setTimeout(function(){
      el.classList.remove('visible');
    }, 2500);
  },

  /* =========== BOOKS =========== */
  _renderBooks: function(container){
    var self = this;
    var T = window.t || function(k,d){ return d||k; };

    var books = _dbBooks.filter(function(b){ return b.active !== false; });


    /* ── Show header buttons in the panel hdr ── */
    var sheikhBtn = document.getElementById('bookSheikhBtn');
    var savedBtn  = document.getElementById('bookSavedBtn');
    var searchTogBtn = document.getElementById('bookSearchBtn');
    var hdrBtnsWrap = document.getElementById('booksHdrBtns');
    if (hdrBtnsWrap) hdrBtnsWrap.style.display = 'flex';
    if (sheikhBtn) sheikhBtn.classList.toggle('on', !!self._bookAuthor);
    if (savedBtn)  savedBtn.classList.toggle('on', self._bookCat === 'saved');

    /* ── Collapsible search bar ── */
    var searchBar = document.createElement('div');
    searchBar.className = 'book-search-bar' + (self._bookSearch ? ' open' : '');
    var searchWrapInner = document.createElement('div'); searchWrapInner.className = 'book-search-wrap-inner';
    var searchIcoEl = document.createElement('i'); searchIcoEl.className = 'fas fa-search book-search-ico';
    var searchInp = document.createElement('input');
    searchInp.type = 'text'; searchInp.className = 'book-search-inp';
    searchInp.placeholder = T('gencine.search_books','گەڕان...');
    searchInp.value = self._bookSearch || '';
    var searchClear = document.createElement('button'); searchClear.className = 'book-search-clear' + (self._bookSearch ? ' visible' : '');
    var scx = document.createElement('i'); scx.className = 'fas fa-times'; searchClear.appendChild(scx);
    searchInp.oninput = function(){
      self._bookSearch = searchInp.value;
      searchClear.classList.toggle('visible', !!searchInp.value);
      renderGrid();
    };
    searchClear.onclick = function(){ self._bookSearch = ''; searchInp.value = ''; searchClear.classList.remove('visible'); renderGrid(); searchInp.focus(); };
    searchWrapInner.appendChild(searchIcoEl); searchWrapInner.appendChild(searchInp); searchWrapInner.appendChild(searchClear);
    searchBar.appendChild(searchWrapInner);
    container.appendChild(searchBar);

    /* ── Sheikh filter overlay ── */
    var sheikhOverlay = document.createElement('div'); sheikhOverlay.className = 'book-overlay';
    var sheikhPanel = document.createElement('div'); sheikhPanel.className = 'book-overlay-panel';
    /* Pill handle */
    var pill = document.createElement('div'); pill.className = 'book-overlay-pill'; sheikhPanel.appendChild(pill);
    var sheikhHdr = document.createElement('div'); sheikhHdr.className = 'book-overlay-hdr';
    var sheikhTitle = document.createElement('span'); sheikhTitle.textContent = T('gencine.sheikh_filter','ماموستا');
    var sheikhClose = document.createElement('button'); sheikhClose.className = 'book-hdr-btn';
    var scIco = document.createElement('i'); scIco.className = 'fas fa-times'; sheikhClose.appendChild(scIco);
    sheikhClose.onclick = function(){ sheikhOverlay.classList.remove('open'); };
    sheikhHdr.appendChild(sheikhClose); sheikhHdr.appendChild(sheikhTitle);
    sheikhPanel.appendChild(sheikhHdr);

    /* Build author → book count map */
    var authorCount = {};
    books.forEach(function(b){ var a = b.author_ku || b.author_ar; if(a){ authorCount[a] = (authorCount[a]||0)+1; } });
    var authors = Object.keys(authorCount);

    var sheikhList = document.createElement('div'); sheikhList.className = 'book-overlay-list';
    var allAuthorCards = []; /* keep refs to update .on state */

    function updateCardStates() {
      allAuthorCards.forEach(function(c){
        var isAll = c._isAll;
        c.classList.toggle('on', isAll ? !self._bookAuthor : self._bookAuthor === c._authorName);
      });
    }

    function makeAuthorCard(name, count, isAll) {
      var card = document.createElement('button');
      card._isAll = isAll; card._authorName = name;
      card.className = 'book-author-card' + ((isAll ? !self._bookAuthor : self._bookAuthor === name) ? ' on' : '');
      var avatar = document.createElement('div'); avatar.className = 'book-author-avatar';
      var avIco = document.createElement('i'); avIco.className = isAll ? 'fas fa-layer-group' : 'fas fa-user-tie';
      avatar.appendChild(avIco); card.appendChild(avatar);
      var nameEl = document.createElement('span'); nameEl.className = 'book-author-name';
      nameEl.textContent = name; nameEl.dir = 'rtl'; card.appendChild(nameEl);
      var countEl = document.createElement('span'); countEl.className = 'book-author-count';
      countEl.textContent = count + ' کتێب'; card.appendChild(countEl);
      card.onclick = function(){
        if (isAll) { self._bookAuthor = ''; if(sheikhBtn)sheikhBtn.classList.remove('on'); }
        else        { self._bookAuthor = name; if(sheikhBtn)sheikhBtn.classList.add('on'); }
        updateCardStates();
        sheikhOverlay.classList.remove('open'); renderGrid();
      };
      allAuthorCards.push(card);
      return card;
    }

    sheikhList.appendChild(makeAuthorCard(T('gencine.cat_all','هەمێ'), books.length, true));
    authors.forEach(function(name){ sheikhList.appendChild(makeAuthorCard(name, authorCount[name], false)); });


    sheikhPanel.appendChild(sheikhList);
    sheikhOverlay.appendChild(sheikhPanel);
    sheikhOverlay.onclick = function(e){ if(e.target===sheikhOverlay) sheikhOverlay.classList.remove('open'); };
    container.appendChild(sheikhOverlay);

    /* ── Wire header buttons ── */
    if (sheikhBtn) sheikhBtn.onclick = function(){ updateCardStates(); sheikhOverlay.classList.add('open'); };
    if (savedBtn) savedBtn.onclick = function(){
      self._bookCat = self._bookCat === 'saved' ? 'all' : 'saved';
      savedBtn.classList.toggle('on', self._bookCat === 'saved');
      renderGrid();
    };
    if (searchTogBtn) searchTogBtn.onclick = function(){
      var isOpen = searchBar.classList.toggle('open');
      searchTogBtn.classList.toggle('on', isOpen);
      if (isOpen) { setTimeout(function(){ searchInp.focus(); }, 50); }
      else { self._bookSearch = ''; searchInp.value = ''; renderGrid(); }
    };

    /* ── Category filter chips ── */
    var catMap = {};
    books.forEach(function(b){
      if (!b.category) return;
      if (catMap[b.category] === undefined || b.sort_order < catMap[b.category]) catMap[b.category] = b.sort_order;
    });
    var cats = ['all'].concat(Object.keys(catMap).sort(function(a,b){ return catMap[a] - catMap[b]; }));
    if (cats.length > 1) {
      var catRow = document.createElement('div'); catRow.className = 'book-cat-row';
      cats.forEach(function(cat){
        var btn = document.createElement('button');
        btn.className = 'book-cat-btn' + (cat === self._bookCat ? ' on' : '');
        btn.textContent = cat === 'all' ? T('gencine.cat_all','هەمێ') : cat;
        btn.onclick = function(){ self._bookCat = cat; catRow.querySelectorAll('.book-cat-btn').forEach(function(b){ b.classList.toggle('on', b === btn); }); renderGrid(); };
        catRow.appendChild(btn);
      });
      container.appendChild(catRow);
    }

    /* ── Grid + empty state ── */
    var grid = document.createElement('div'); grid.className = 'book-grid';
    var emptyState = document.createElement('div'); emptyState.className = 'genc-coming'; emptyState.style.display = 'none';
    var ei = document.createElement('i'); ei.className = 'fas fa-book-open genc-coming-icon';
    var et = document.createElement('div'); et.className = 'genc-coming-title';
    emptyState.appendChild(ei); emptyState.appendChild(et);
    container.appendChild(grid);
    container.appendChild(emptyState);

    function renderGrid() {
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      emptyState.style.display = 'none';
      var q = (self._bookSearch || '').trim().toLowerCase();
      var pool = self._bookCat === 'saved'
        ? books.filter(function(b){ return _bookIsSaved(b.id); })
        : self._bookCat === 'all' ? books
        : books.filter(function(b){ return b.category === self._bookCat; });
      if (self._bookAuthor) pool = pool.filter(function(b){ return (b.author_ku||b.author_ar) === self._bookAuthor; });
      /* Smart search: every word in query must appear somewhere in the book */
      var filtered = q ? (function(){
        var words = q.split(/\s+/).filter(Boolean);
        return pool.filter(function(b){
          var haystack = [b.title_ku, b.title_ar, b.author_ku, b.author_ar, b.category]
            .map(function(s){ return (s||'').toLowerCase(); }).join(' ');
          return words.every(function(w){ return haystack.indexOf(w) !== -1; });
        });
      })() : pool;

      if (!filtered.length) {
        et.textContent = T('gencine.books_empty','کتێبەکە نیە');
        emptyState.style.display = 'flex'; return;
      }

      filtered.forEach(function(book){
        var card = document.createElement('div'); card.className = 'book-card';

        var coverWrap = document.createElement('div'); coverWrap.className = 'book-cover-wrap';
        if (book.cover_url) {
          var img = document.createElement('img');
          img.className = 'book-cover'; img.alt = book.title_ku || '';
          img.onload = function(){ img.classList.add('loaded'); };
          img.onerror = function(){ img.classList.add('loaded'); };
          img.src = book.cover_url;
          if (img.complete) img.classList.add('loaded');
          coverWrap.appendChild(img);
        } else {
          var ph = document.createElement('div'); ph.className = 'book-cover-placeholder';
          var pi = document.createElement('i'); pi.className = 'fas fa-book'; ph.appendChild(pi); coverWrap.appendChild(ph);
        }
        card.appendChild(coverWrap);

        /* NEW badge */
        if (book.created_at && (Date.now() - new Date(book.created_at).getTime()) < 86400000) {
          var nb = document.createElement('div'); nb.className = 'new-badge'; nb.textContent = 'نوی'; card.appendChild(nb);
        }

        /* Bookmark — bottom-right of info area */
        var saveBtn = document.createElement('button');
        saveBtn.className = 'book-save-btn' + (_bookIsSaved(book.id) ? ' saved' : '');
        var sIco = document.createElement('i'); sIco.className = 'fas fa-bookmark'; saveBtn.appendChild(sIco);
        saveBtn.onclick = function(e){
          e.stopPropagation(); _bookToggleSave(book.id, book);
          saveBtn.classList.toggle('saved', _bookIsSaved(book.id));
          if (window.Capacitor && window.Capacitor.Plugins.Haptics) window.Capacitor.Plugins.Haptics.impact({style:'LIGHT'});
        };

        var info = document.createElement('div'); info.className = 'book-info';
        var titleEl = document.createElement('div'); titleEl.className = 'book-title';
        titleEl.textContent = book.title_ku || book.title_ar || ''; info.appendChild(titleEl);
        if (book.author_ku || book.author_ar) {
          var auth = document.createElement('div'); auth.className = 'book-author';
          auth.textContent = book.author_ku || book.author_ar; info.appendChild(auth);
        }
        var infoFoot = document.createElement('div'); infoFoot.className = 'book-info-foot';
        if (book.pages) {
          var pg = document.createElement('div'); pg.className = 'book-pages';
          pg.textContent = book.pages + ' ڕۆپەل'; infoFoot.appendChild(pg);
        }
        infoFoot.appendChild(saveBtn);
        info.appendChild(infoFoot);
        card.appendChild(info);

        card.onclick = function(e){
          if (e.target.closest('.book-save-btn')) return;
          self._currentBook = book; self._pdfDoc = null; self._pdfPage = 1;
          self._view = 'book-reader'; self._draw();
        };
        grid.appendChild(card);
      });
    }

    renderGrid();
  },

  _renderBookReader: function(container){
    var self = this;
    var book = self._currentBook;
    if (!book) { self._view = 'books'; self._draw(); return; }
    var T = window.t || function(k,d){ return d||k; };


    var loadingEl = document.createElement('div');
    loadingEl.className = 'book-reader-loading';
    var spinner = document.createElement('i'); spinner.className = 'fas fa-spinner fa-spin';
    loadingEl.appendChild(spinner);
    loadingEl.appendChild(document.createTextNode(' ' + T('gencine.books_loading', 'باركردن...')));
    container.appendChild(loadingEl);

    var pagesWrap = document.createElement('div');
    pagesWrap.style.cssText = 'padding:4px 2px 80px;display:flex;flex-direction:column;gap:3px;';
    container.appendChild(pagesWrap);

    var renderPage = function(pageNum, slot, pdf) {
      if (slot._rendered || slot._rendering) return;
      slot._rendering = true;
      pdf.getPage(pageNum).then(function(page) {
        var dpr = window.devicePixelRatio || 1;
        var w = (pagesWrap.offsetWidth || window.innerWidth) - 4;
        var uv = page.getViewport({ scale: 1 });
        var vp = page.getViewport({ scale: (w / uv.width) * dpr });
        var cv = document.createElement('canvas');
        cv.width = vp.width; cv.height = vp.height;
        cv.style.cssText = 'display:block;width:' + w + 'px;height:' + Math.floor(vp.height / dpr) + 'px;';
        page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function() {
          slot.style.minHeight = '';
          while (slot.firstChild) slot.removeChild(slot.firstChild);
          slot.appendChild(cv);
          slot._rendered = true; slot._rendering = false;
        });
      });
    };

    var doLoad = function(pdf) {
      self._pdfDoc = pdf;
      loadingEl.style.display = 'none';
      var slots = [];
      for (var i = 1; i <= pdf.numPages; i++) {
        var slot = document.createElement('div');
        slot.setAttribute('data-page', i);
        slot.style.cssText = 'width:100%;background:#fff;min-height:300px;';
        pagesWrap.appendChild(slot);
        slots.push(slot);
      }
      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          if (!e.isIntersecting) return;
          var n = parseInt(e.target.getAttribute('data-page'));
          renderPage(n, e.target, pdf);
          if (n > 1 && slots[n - 2]) renderPage(n - 1, slots[n - 2], pdf);
          if (n < pdf.numPages && slots[n]) renderPage(n + 1, slots[n], pdf);
        });
      }, { rootMargin: '400px 0px', threshold: 0 });
      slots.forEach(function(s) { obs.observe(s); });
      renderPage(1, slots[0], pdf);
      if (slots[1]) renderPage(2, slots[1], pdf);
    };

    if (self._pdfDoc) { doLoad(self._pdfDoc); return; }

    var pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (!pdfjsLib) { loadingEl.textContent = 'PDF.js not loaded'; return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var pdfSrc = 'https://tafsirkurd.com/pdf-proxy?url=' + encodeURIComponent(book.pdf_url);
    pdfjsLib.getDocument({
      url: pdfSrc,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
      disableFontFace: true
    }).promise.then(doLoad).catch(function(e) {
      loadingEl.textContent = T('gencine.books_error', 'هەلەیەک هەیە');
      console.error('PDF load error:', e);
    });
  },

  _updateVoiceBtn: function(){
    var btn = document.getElementById('tasbihVoiceBtn');
    var lbl = document.getElementById('tasbihVoiceLbl');
    var bars = document.getElementById('tasbihVoiceBars');
    var T = window.t || function(k,d){ return d||k; };
    if(!btn) return;
    if(this._voiceActive){
      btn.classList.add('on');
      if(lbl) lbl.textContent = T('gencine.voice_listening','...دابیستم');
      if(bars){ bars.classList.remove('idle'); bars.classList.add('active'); }
    } else {
      btn.classList.remove('on');
      if(lbl) lbl.textContent = T('gencine.voice_start','دانگ');
      if(bars){ bars.classList.remove('active'); bars.classList.add('idle'); }
    }
  }
};

})();
