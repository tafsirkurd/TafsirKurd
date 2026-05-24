'use strict';

/* ===== SURAH GRID ===== */
var _surahGridReady=false;
var _surahBadgeObs=null; // IntersectionObserver for backdrop-filter-on-visible-badges
function renderSurahGrid(){
  var grid=$('surahGrid');
  var ayahLbl=t('surah.card.ayah_count');
  var frag=document.createDocumentFragment();
  for(var i=0;i<SURAHS.length;i++){
    var s=SURAHS[i];
    var card=document.createElement('div');
    card.className='surah-card';
    card.dataset.n=s.n;
    var imgPanel=document.createElement('div');
    imgPanel.className='surah-img-panel '+(s.t==='Meccan'?'meccan':'maddinah');
    var badge=document.createElement('div');
    badge.className='surah-num-badge';
    badge.textContent=s.n;
    var info=document.createElement('div');
    info.className='surah-info';
    var deco=document.createElement('div');
    deco.className='surah-name-ar no-kurdish-convert';
    var _gc='surah'+String(s.n).padStart(3,'0');
    deco.dataset.glyph=_gc;
    deco.textContent=_surahNameFontReady?_gc:s.ar;
    var nameEn=document.createElement('div');
    nameEn.className='surah-name-en';
    nameEn.textContent=s.en;
    var ayahsEl=document.createElement('div');
    ayahsEl.className='surah-ayahs';
    ayahsEl.textContent=s.a+' '+ayahLbl;
    info.appendChild(deco);info.appendChild(nameEn);info.appendChild(ayahsEl);
    card.appendChild(imgPanel);card.appendChild(badge);card.appendChild(info);
    frag.appendChild(card);
  }
  grid.textContent='';
  grid.appendChild(frag);
  if(!_surahGridReady){
    _surahGridReady=true;
    grid.addEventListener('click',function(e){
      var card=e.target.closest('.surah-card');
      if(card)App.openSurah(+card.dataset.n);
    });
  }
  // Recreate observer when null (happens after leaving Quran tab) then connect to current cards
  if(!_surahBadgeObs){
    _surahBadgeObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var badge=entry.target._badge||(entry.target._badge=entry.target.querySelector('.surah-num-badge'));
        if(!badge)return;
        var bf=entry.isIntersecting?'blur(6px) saturate(140%)':'none';
        badge.style.backdropFilter=bf;
        badge.style.webkitBackdropFilter=bf;
      });
    },{rootMargin:'0px'});
  }
  _surahBadgeObs.disconnect();
  grid.querySelectorAll('.surah-card').forEach(function(card){_surahBadgeObs.observe(card);});
}

/* ===== CONTINUE READING ===== */
function renderContinue(){
  var c=$('continueReading');
  clear(c);
  var last=null;
  try{last=JSON.parse(localStorage.getItem('lastRead'))}catch(e){}
  if(!last)return;
  var s=SURAHS[last.surah-1];
  if(!s)return;
  var card=el('div','continue-card');
  card.style.backgroundImage="url('/assets/icons/"+(s.t==='Meccan'?'Makkah':'Maddinah')+".webp')";
  var _cdec=document.createElement('div');
  _cdec.className='continue-surah-deco no-kurdish-convert';
  var _cglyph='surah'+String(s.n).padStart(3,'0');
  _cdec.dataset.glyph=_cglyph;
  _cdec.textContent=_surahNameFontReady?_cglyph:s.ar;
  var deco=_cdec;
  card.appendChild(deco);
  var info=el('div','continue-info');
  info.appendChild(el('div','continue-label',t('reader.continue')));
  info.appendChild(el('div','continue-title',s.en+' - '+s.ar));
  info.appendChild(el('div','continue-sub',t('reader.ayah')+' '+last.ayah));
  card.appendChild(info);
  on(card,'click',function(){App.openSurah(last.surah,last.ayah)});
  c.appendChild(card);
}

/* ===== OPEN SURAH ===== */
App.openSurah=function(num,scrollTo){
  if(S.surah===num&&$('quranReader').classList.contains('on'))return; // already open
  if(tapGuard('openSurah',300))return; // prevent double-tap race
  var s=SURAHS[num-1]; // bounds-check before any state mutation
  if(!s){console.warn('[openSurah] invalid surah num:',num);return;}
  haptic([8]);
  var _isT=window.innerWidth>=768||document.documentElement.classList.contains('is-ipad');
  // Auto-enable mushaf mode on iPad when no preference saved yet
  if(_isT&&!S.mushafMode&&localStorage.getItem('mushafMode')===null){
    S.mushafMode=true;
    localStorage.setItem('mushafMode','true');
    var _tmb=$('mushafToggleBtn');if(_tmb)_tmb.classList.add('on');
  }
  var _pq=$('panelQuran');
  if(_pq)S._quranListScroll=_isT?($('quranHome')||{scrollTop:0}).scrollTop:_pq.scrollTop;
  _startSession(num);
  S.surah=num;
  $('readerName').textContent=s.en+' - '+s.ar;
  if(!_isT){$('quranHome').style.display='none';}
  $('quranReader').classList.add('on');
  renderAyahs(num,scrollTo);
  try{localStorage.setItem('lastRead',JSON.stringify({surah:num,ayah:scrollTo||1}))}catch(e){}
  prefetchAyahBlob(num,(scrollTo||1)-1);
  var pb=$('mushafPlayBtn');if(pb){pb.style.display='';updateMushafPlayBtn();}
  if(S.mushafMode){
    var btn=$('mushafToggleBtn');if(btn)btn.classList.add('on');
    var al=$('ayahList');if(al)al.style.display='none';
    var mv=$('mushafView');if(mv){mv.style.display='';renderMushafView();}
    if(scrollTo&&scrollTo>1)_scrollMushafToAyah(num,scrollTo,0);
    _preBufferMushafAyah();
  }
};

App.backToList=function(){
  haptic([8]);
  if(S.surah){
    try{localStorage.setItem('surah_scroll_'+S.surah,String($('ayahList').scrollTop))}catch(e){}
  }
  // Clean up mushaf DOM + observer — keep mode preference so next surah reopens in mushaf
  if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
  clearMushafHighlights();
  var mv=$('mushafView');if(mv){mv.style.display='none';clear(mv);}
  var al=$('ayahList');if(al)al.style.display='';
  var pb=$('mushafPlayBtn');if(pb)pb.style.display='none';
  if(_progressCleanup){_progressCleanup();_progressCleanup=null;}
  _endSession();
  S.surah=null;
  $('quranReader').classList.remove('on');
  var _isT2=window.innerWidth>=768||document.documentElement.classList.contains('is-ipad');
  if(!_isT2){$('quranHome').style.display='';}
  if(al)al.scrollTop=0;
  if(S._quranListScroll!=null){
    var _scrollEl=_isT2?$('quranHome'):$('panelQuran');
    if(_scrollEl)setTimeout(function(){_scrollEl.scrollTop=S._quranListScroll;S._quranListScroll=null;},0);
  }
  renderContinue();
};

/* ===== MUSHAF MODE ===== */
var _qcfFontInjected={};
var _qcfV2FontInjected={};
var _qcfV4FontInjected={};
// pageNum → Promise<boolean> — deduplicates concurrent font-load waits
var _qcfV4FontLoadP={};

// Detect iOS Capacitor once — strip script removes local woff2, so skip local src on iOS
var _isIOSCap=(function(){try{return window.Capacitor&&Capacitor.getPlatform()==='ios';}catch(e){return false;}}());

/* SurahName font readiness — delegates to QuranFontManager (quran-font-manager.js).
   Local flags mirror manager state so render-time isReady checks stay O(1). */
var _surahNameFontReady=false;
var _surahNameV2FontReady=false;
(function(){
  var QFM=window.QuranFontManager;
  if(!QFM)return;
  QFM.onReady('SurahName',function(ok){
    _surahNameFontReady=ok;
    if(ok)QFM.upgradeGlyphElements('.surah-name-ar');
    if(ok)QFM.upgradeGlyphElements('.continue-surah-deco');
  });
  QFM.onReady('SurahNameV2',function(ok){
    _surahNameV2FontReady=ok;
    if(ok)QFM.upgradeGlyphElements('.surah-reader-name');
  });
})();

function toArabicNum(n){return String(n).replace(/\d/g,function(d){return'٠١٢٣٤٥٦٧٨٩'[+d];});}

function injectQCFFont(pageNum){
  if(_qcfFontInjected[pageNum])return;
  _qcfFontInjected[pageNum]=true;
  var pad=String(pageNum).padStart(3,'0');
  var s=document.createElement('style');
  s.textContent="@font-face{font-family:'QCFv1p"+pageNum+"';src:url('https://raw.githubusercontent.com/alquran-foundation/qpc-fonts/master/mushaf-woff2/QCF_P"+pad+".woff2') format('woff2');font-display:block}";
  document.head.appendChild(s);
}
function injectQCFV2Font(pageNum){
  if(_qcfV2FontInjected[pageNum])return;
  _qcfV2FontInjected[pageNum]=true;
  var pad=String(pageNum).padStart(3,'0');
  var s=document.createElement('style');
  s.textContent="@font-face{font-family:'QCFv2p"+pageNum+"';src:url('https://raw.githubusercontent.com/alquran-foundation/qpc-fonts/master/mushaf-v2/QCF2"+pad+".ttf') format('truetype');font-display:block}";
  document.head.appendChild(s);
}
function injectQCFV4Font(pageNum){
  if(_qcfV4FontInjected[pageNum])return;
  _qcfV4FontInjected[pageNum]=true;
  var s=document.createElement('style');
  // iOS: woff2 stripped by strip-ios-fonts.js (ITMS-90853); use bundled TTF in qcf4ttf/
  // Android/web: use bundled woff2 in qcf4/ (local first, Cloudflare Worker fallback)
  var localSrc=_isIOSCap
    ?"url('/assets/fonts/qcf4ttf/p"+pageNum+".ttf') format('truetype'),"
    :"url('/assets/fonts/qcf4/p"+pageNum+".woff2') format('woff2'),";
  // font-display:block prevents WebKit from resolving document.fonts.load() with a
  // swap-fallback font, which would make fontOk=true when the real font never loaded.
  s.textContent="@font-face{font-family:'QCFv4p"+pageNum+"';src:"+localSrc+"url('https://qpc-v4-fonts.tefsirkurd.workers.dev/p"+pageNum+".woff2') format('woff2');font-display:block}";
  document.head.appendChild(s);
}

// Inject + wait for QCF4 font — returns Promise<boolean>.
// Deduplicates: calling for the same pageNum returns the same Promise.
function ensureQCFV4Font(pageNum){
  if(_qcfV4FontLoadP[pageNum])return _qcfV4FontLoadP[pageNum];
  injectQCFV4Font(pageNum);
  var fontName='QCFv4p'+pageNum;
  // Canvas sentinel: after document.fonts.load() says the font is ready, verify that
  // PUA glyphs (U+E001–U+E00A) render with a DIFFERENT width than the monospace fallback.
  // This catches WebKit/Android cases where fonts.load() resolves but the real file was
  // never applied (e.g. swap-fallback, wrong face, cached-then-evicted).
  function _sentinelOk(){
    try{
      var cv=document.createElement('canvas');
      var cx=cv.getContext('2d');
      if(!cx)return false;
      var s='';
      cx.font='48px monospace';
      var wRef=cx.measureText(s).width;
      cx.font='48px "'+fontName+'",monospace';
      var wQCF=cx.measureText(s).width;
      return wQCF>0&&Math.abs(wQCF-wRef)>2;
    }catch(e){return false;}
  }
  if(!document.fonts||!document.fonts.load){
    _qcfV4FontLoadP[pageNum]=Promise.resolve(false);
    return _qcfV4FontLoadP[pageNum];
  }
  var loadP=document.fonts.load('1em "'+fontName+'"').then(function(faces){
    if(!faces||!faces.length)return false;
    return _sentinelOk();
  }).catch(function(){return false;});
  var timeoutP=new Promise(function(res){setTimeout(function(){res(false);},5000);});
  _qcfV4FontLoadP[pageNum]=Promise.race([loadP,timeoutP]);
  return _qcfV4FontLoadP[pageNum];
}

// Prefetch QCF4 font + page data for a page number — fire and forget.
function _prefetchMushafPage(pageNum){
  if(pageNum<1||pageNum>604)return;
  var pf=_getPageFields();
  if(S.mushafFont==='qcf4'){
    ensureQCFV4Font(pageNum);
  } else if(S.mushafFont==='qcf2'){
    injectQCFV2Font(pageNum);
  } else {
    injectQCFFont(pageNum);
  }
  getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId).catch(function(){});
}

// Medina Mushaf (QPC Hafs, mushaf=19) — surah page ranges bundled for offline use.
// Index = surah number - 1.  Each entry = [firstPage, lastPage].
// Source: api.quran.com/api/v4/chapters (retrieved 2026-05-15).
var _MUSHAF_PAGE_RANGES=[[1,1],[2,49],[50,76],[77,106],[106,127],[128,150],[151,176],[177,186],[187,207],[208,221],[221,235],[235,248],[249,255],[255,261],[262,267],[267,281],[282,293],[293,304],[305,312],[312,321],[322,331],[332,341],[342,349],[350,359],[359,366],[367,376],[377,385],[385,396],[396,404],[404,410],[411,414],[415,417],[418,427],[428,434],[434,440],[440,445],[446,452],[453,458],[458,467],[467,476],[477,482],[483,489],[489,495],[496,498],[499,502],[502,506],[507,510],[511,515],[515,517],[518,520],[520,523],[523,525],[526,528],[528,531],[531,534],[534,537],[537,541],[542,545],[545,548],[549,551],[551,552],[553,554],[554,555],[556,557],[558,559],[560,561],[562,564],[564,566],[566,568],[568,570],[570,571],[572,573],[574,575],[575,577],[577,578],[578,580],[580,581],[582,583],[583,584],[585,585],[586,586],[587,587],[587,589],[589,589],[590,590],[591,591],[591,592],[592,592],[593,594],[594,594],[595,595],[595,596],[596,596],[596,596],[597,597],[597,597],[598,598],[598,599],[599,599],[599,600],[600,600],[600,600],[601,601],[601,601],[601,601],[602,602],[602,602],[602,602],[603,603],[603,603],[603,603],[604,604],[604,604],[604,604]];

function getMushafPageRange(surahNum){
  // Bundled static data — works fully offline
  var r=_MUSHAF_PAGE_RANGES[surahNum-1];
  if(r)return Promise.resolve({start:r[0],end:r[1]});
  // localStorage cache (populated from previous API calls)
  var key='qcfRange_'+surahNum;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.start)return Promise.resolve(c);}catch(e){}
  // Network fallback
  return fetch('https://api.quran.com/api/v4/chapters/'+surahNum)
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){
      var ch=json.chapter;
      var pages={start:ch.pages[0],end:ch.pages[1]};
      try{localStorage.setItem(key,JSON.stringify(pages));}catch(e){}
      return pages;
    });
}

// Singleton Promise for loading mushaf-v4-pages.json.
// Shared across all getMushafPageData calls so the 3 MB file is fetched once only.
var _mushafV4DataP=null;
function _loadMushafBundledData(){
  if(window._mushafV4Pages)return Promise.resolve(window._mushafV4Pages);
  if(_mushafV4DataP)return _mushafV4DataP;
  _mushafV4DataP=fetch('/data/mushaf-v4-pages.json')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(data){
      if(data&&Array.isArray(data))window._mushafV4Pages=data;
      return window._mushafV4Pages||null;
    })
    .catch(function(){return null;});
  return _mushafV4DataP;
}

function getMushafPageData(pageNum,fields,cachePrefix,mushafId){
  fields=fields||'code_v1';cachePrefix=cachePrefix||'qcfV1p_';
  var key=cachePrefix+pageNum;
  // 1. localStorage (fastest — populated from prior visits or bundle seed)
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.verses)return Promise.resolve(c);}catch(e){}
  // 2. For QCF4: wait for bundled data to finish loading, THEN check it.
  //    This resolves the race where getMushafPageData was called before the
  //    3 MB JSON fetch completed, causing the bundle check to be skipped.
  if(fields==='code_v2'&&mushafId===19){
    return _loadMushafBundledData().then(function(){
      if(window._mushafV4Pages){
        var bd=window._mushafV4Pages[pageNum-1];
        if(bd&&bd.verses&&bd.verses.length){
          try{localStorage.setItem(key,JSON.stringify(bd));}catch(e){}
          return bd;
        }
      }
      // 3. Network fallback — never reject; offline returns noData sentinel so caller
      //    can show Hafs fallback instead of an × error card.
      return fetch('https://api.quran.com/api/v4/verses/by_page/'+pageNum+'?words=true&word_fields=code_v2&per_page=300&mushaf=19')
        .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
        .then(function(json){try{localStorage.setItem(key,JSON.stringify(json));}catch(e){}return json;})
        .catch(function(){return{verses:[],_noData:true};});
    }).catch(function(){return{verses:[],_noData:true};});
  }
  // Other font modes: direct network
  var url='https://api.quran.com/api/v4/verses/by_page/'+pageNum+'?words=true&word_fields='+fields+'&per_page=300';
  if(mushafId)url+='&mushaf='+mushafId;
  var _mc=new AbortController();var _mt=setTimeout(function(){_mc.abort();},10000);
  return fetch(url,{signal:_mc.signal})
    .then(function(r){clearTimeout(_mt);if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){try{localStorage.setItem(key,JSON.stringify(json));}catch(e){}return json;})
    .catch(function(e){clearTimeout(_mt);throw e;});
}
function _getPageFields(){
  if(S.mushafFont==='qcf2')return{fields:'code_v2',cache:'qcfV2p_'};
  if(S.mushafFont==='qcf4')return{fields:'code_v2',cache:'qcfV4p_',mushafId:19};
  return{fields:'code_v1',cache:'qcfV1p_'};
}


// Returns the first ayah number currently visible in the normal ayah list
function _visibleAyahInList(){
  var list=$('ayahList');
  if(!list)return null;
  var listRect=list.getBoundingClientRect();
  var cards=list.querySelectorAll('.ayah-card[data-ayah]');
  for(var i=0;i<cards.length;i++){
    var r=cards[i].getBoundingClientRect();
    if(r.bottom>listRect.top+8&&r.top<listRect.bottom-8)return parseInt(cards[i].dataset.ayah)||null;
  }
  return null;
}

// Returns the topmost ayah number currently visible in mushaf view
function _visibleAyahInMushaf(){
  var view=$('mushafView');
  if(!view||!S.surah)return null;
  var vRect=view.getBoundingClientRect();
  var best=null,bestTop=Infinity;
  var vels=window._mushafVerseElements||{};
  Object.keys(vels).forEach(function(k){
    var parts=k.split(':');
    if(parseInt(parts[0])!==S.surah)return;
    (vels[k]||[]).forEach(function(e){
      if(!view.contains(e))return;
      var r=e.getBoundingClientRect();
      if(r.bottom>vRect.top&&r.top<vRect.bottom&&r.top<bestTop){bestTop=r.top;best=parseInt(parts[1]);}
    });
  });
  return best;
}

// Polls until mushaf has rendered the target ayah then scrolls to it (max ~2s)
// Scroll a container to center an element — explicit scrollTop, safe on iOS
function _scrollElToCenter(container,el){
  if(!container||!el)return;
  var elRect=el.getBoundingClientRect();
  var cRect=container.getBoundingClientRect();
  container.scrollTop+=elRect.top-cRect.top-(container.clientHeight-elRect.height)/2;
}

function _scrollMushafToAyah(surah,ayah,attempts){
  if(!surah||!ayah)return;
  attempts=attempts||0;
  if(attempts>20)return;
  var key=String(surah)+':'+String(ayah);
  var view=$('mushafView');
  var els=window._mushafVerseElements&&window._mushafVerseElements[key];
  if(els&&els.length&&view&&view.contains(els[0])){
    // Landscape iPad horizontal mode: scroll view to the spread, then page vertically
    var spread=els[0].closest&&els[0].closest('.mushaf-spread');
    if(spread){
      var spreadIdx=Array.prototype.indexOf.call(view.children,spread);
      view.scrollLeft=spreadIdx*view.clientWidth;
      // Scroll within the page
      var page=els[0].closest('.mushaf-text-page');
      if(page){
        var elRect=els[0].getBoundingClientRect();
        var pRect=page.getBoundingClientRect();
        page.scrollTop+=elRect.top-pRect.top-(page.clientHeight-elRect.height)/2;
      }
    }else{
      var _er=els[0].getBoundingClientRect();
      var _vr=view.getBoundingClientRect();
      var _relTop=_er.top-_vr.top+view.scrollTop;
      _mushafSmoothScrollTo(view,_relTop-_vr.height*0.38+_er.height/2,300);
    }
    return;
  }
  // On first attempt, if the target page isn't loaded yet, estimate its scroll
  // position from the cached page range so the IntersectionObserver fires and
  // triggers the page load. Subsequent retries then find the real elements.
  if(attempts===0&&view){
    try{
      var _rc=JSON.parse(localStorage.getItem('qcfRange_'+surah)||'null');
      if(_rc&&_rc.start){
        var _sa=SURAHS[surah-1];
        var _ta=_sa?_sa.a:1;
        var _estPg=_rc.start+Math.floor((ayah-1)/_ta*(_rc.end-_rc.start+1));
        _estPg=Math.max(_rc.start,Math.min(_rc.end,_estPg));
        view.scrollTop=(_estPg-1)*560;
      }
    }catch(e){}
  }
  setTimeout(function(){_scrollMushafToAyah(surah,ayah,attempts+1);},100);
}

App.toggleMushafMode=function(){
  S.mushafMode=!S.mushafMode;
  localStorage.setItem('mushafMode',String(S.mushafMode));
  var btn=$('mushafToggleBtn');
  if(btn)btn.classList.toggle('on',S.mushafMode);
  var playBtn=$('mushafPlayBtn');
  var ayahList=$('ayahList');
  var mushafView=$('mushafView');
  if(playBtn){updateMushafPlayBtn();}
  if(S.mushafMode){
    // Capture position before hiding normal list
    var fromAyah=_visibleAyahInList()||1;
    if(ayahList)ayahList.style.display='none';
    if(mushafView){mushafView.style.display='';renderMushafView();}
    _preBufferMushafAyah();
    // After mushaf renders, scroll to where user was
    _scrollMushafToAyah(S.surah,fromAyah,0);
  }else{
    // Capture position before hiding mushaf
    var fromAyahM=_visibleAyahInMushaf()||1;
    clearMushafHighlights();
    if(mushafView){mushafView.style.display='none';clear(mushafView);}
    if(ayahList)ayahList.style.display='';
    var s2=SURAHS[(S.surah||1)-1];
    updateProgress(ayahList,s2?s2.a:0);
    // Scroll normal list to where user was in mushaf — explicit scrollTop, safe on iOS
    requestAnimationFrame(function(){
      var card=ayahList&&ayahList.querySelector('.ayah-card[data-ayah="'+fromAyahM+'"]');
      _scrollElToCenter(ayahList,card);
    });
  }
};


// Standard Medina Mushaf (604-page Hafs/Uthmani) — juz start pages
var JUZ_PAGES=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
function juzForPage(p){for(var j=JUZ_PAGES.length-1;j>=0;j--){if(p>=JUZ_PAGES[j])return j+1;}return 1;}

function _mushafSkeleton(){
  var sk=el('div','mushaf-skeleton');

  // Surah header — title + basmala
  var hdr=el('div','mushaf-skel-hdr');
  var nm=el('div','mushaf-skel-name'); hdr.appendChild(nm);
  var bsm=el('div','mushaf-skel-basml'); bsm.style.animationDelay='.12s'; hdr.appendChild(bsm);
  sk.appendChild(hdr);

  // Text rows — widths + marker positions mimic a real Quran page
  // marker:true = verse ends on this line (shows circle at the left/end in RTL)
  var rows=[
    {w:'100',m:false},{w:'100',m:false},{w:'82',m:true},
    {w:'100',m:false},{w:'100',m:false},{w:'100',m:false},{w:'90',m:true},
    {w:'100',m:false},{w:'100',m:false},{w:'75',m:true},
    {w:'100',m:false},{w:'100',m:false},{w:'88',m:true},
    {w:'100',m:false},{w:'58',m:true}
  ];
  rows.forEach(function(r,i){
    var row=el('div','mushaf-skel-row');
    var delay=(i*0.045).toFixed(2)+'s';
    var ln=el('div','mushaf-skel-line');
    ln.style.width=r.w+'%';
    ln.style.animationDelay=delay;
    row.appendChild(ln); // first child = rightmost in RTL (text start)
    if(r.m){
      var num=el('div','mushaf-skel-num');
      num.style.animationDelay=delay;
      row.appendChild(num); // last child = leftmost in RTL (verse end marker)
    }
    sk.appendChild(row);
  });
  return sk;
}

// ── Mushaf integrity validation ──────────────────────────────────────────────
// pageData = the raw API json; pageEl = rendered DOM element
var _mushafRenderMetrics={};  // pageNum → {fontMs,dataMs,renderMs,total,height,ok}

function validateMushafPage(pageNum,pageData,pageEl){
  var verses=pageData.verses||[];
  var expectedKeys=[];
  verses.forEach(function(v){
    var k=String(v.surah_number||parseInt((v.verse_key||'0:0').split(':')[0]))+':'+String(v.verse_number);
    if(expectedKeys.indexOf(k)<0)expectedKeys.push(k);
  });
  var rendered=window._mushafVerseElements||{};
  var presentKeys=expectedKeys.filter(function(k){return !!(rendered[k]&&rendered[k].length);});
  var missingKeys=expectedKeys.filter(function(k){return !(rendered[k]&&rendered[k].length);});
  var lineCount=pageEl.querySelectorAll('.mushaf-qcf-line,.mushaf-flow-verse').length;
  var height=pageEl.offsetHeight;
  var ok=missingKeys.length===0;
  if(!ok){
    console.warn('[MushafIntegrity] FAIL page='+pageNum+' missing='+missingKeys.join(','));
  }
  return{pageNum:pageNum,expected:expectedKeys,present:presentKeys,missing:missingKeys,lineCount:lineCount,height:height,ok:ok};
}

window.MushafDebug={
  pageMetrics:function(pageNum){
    var m=_mushafRenderMetrics[pageNum];
    if(!m){console.log('[MushafDebug] no metrics for page '+pageNum);return null;}
    console.log('[MushafDebug] page='+pageNum,JSON.stringify(m,null,2));
    return m;
  },
  allMetrics:function(){
    Object.keys(_mushafRenderMetrics).sort(function(a,b){return+a-+b;}).forEach(function(p){
      var m=_mushafRenderMetrics[p];
      console.log('[MushafDebug] page='+p+' ok='+m.ok+' missing='+(m.missing||[]).join(',')
        +' dataMs='+m.dataMs+' fontMs='+m.fontMs+' total='+m.total+' height='+m.height+'px');
    });
    return _mushafRenderMetrics;
  },
  validate:function(pageNum){
    var view=$('mushafView');
    if(!view)return;
    var pageEl=view.querySelector('.mushaf-text-page[data-page="'+pageNum+'"]');
    if(!pageEl){console.warn('[MushafDebug] page el not found: '+pageNum);return;}
    var pf=_getPageFields();
    getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId).then(function(json){
      var r=validateMushafPage(pageNum,json,pageEl);
      console.log('[MushafDebug] validate page='+pageNum,r);
    });
  },
  visibleSurah:function(){
    var view=$('mushafView');
    if(!view)return null;
    var banners=view.querySelectorAll('.mushaf-surah-banner[data-surah]');
    var viewRect=view.getBoundingClientRect();
    var best=null,bestTop=Infinity;
    for(var b=0;b<banners.length;b++){
      var br=banners[b].getBoundingClientRect();
      var dist=Math.abs(br.top-viewRect.top);
      if(br.bottom>viewRect.top&&br.top<viewRect.bottom&&dist<bestTop){bestTop=dist;best=banners[b];}
    }
    if(!best){console.log('[MushafDebug] no banner visible');return null;}
    var sn=parseInt(best.dataset.surah);
    var s=SURAHS[sn-1];
    console.log('[MushafDebug] visibleSurah='+sn+(s?' ('+s.en+')':''));
    return sn;
  },
  renderedAyahs:function(pageNum){
    var view=$('mushafView');
    if(!view)return [];
    var pageEl=pageNum?view.querySelector('.mushaf-text-page[data-page="'+pageNum+'"]'):null;
    var container=pageEl||view;
    var segs=container.querySelectorAll('.mushaf-ayah-seg[data-surah][data-ayah]');
    var keys=[];
    for(var i=0;i<segs.length;i++){
      var k=segs[i].getAttribute('data-surah')+':'+segs[i].getAttribute('data-ayah');
      if(keys.indexOf(k)<0)keys.push(k);
    }
    console.log('[MushafDebug] renderedAyahs page='+pageNum+' count='+keys.length,keys);
    return keys;
  },
  missingAyahs:function(pageNum){
    var self=this;
    var pf=_getPageFields();
    return getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId).then(function(json){
      var verses=json.verses||[];
      var expected=[];
      verses.forEach(function(v){
        var k=String(v.surah_number||parseInt((v.verse_key||'0:0').split(':')[0]))+':'+String(v.verse_number);
        if(expected.indexOf(k)<0)expected.push(k);
      });
      var rendered=self.renderedAyahs(pageNum);
      var missing=expected.filter(function(k){return rendered.indexOf(k)<0;});
      if(missing.length){
        console.warn('[MushafDebug] missingAyahs page='+pageNum+' MISSING='+missing.join(','));
      } else {
        console.log('[MushafDebug] missingAyahs page='+pageNum+' ALL PRESENT ('+expected.length+' ayahs)');
      }
      return missing;
    });
  }
};

// Wrap mushaf pages into horizontal snap spreads for iPad
// Landscape (≥1024px): 2 pages per spread. Portrait (<1024px): 1 page per spread.
function _mushafWrapSpreads(view){
  var isLandscape=window.innerWidth>=1024;
  var step=isLandscape?2:1;
  var pages=Array.prototype.slice.call(view.querySelectorAll(':scope>.mushaf-text-page'));
  var nav=view.querySelector(':scope>.mushaf-surah-nav');
  pages.forEach(function(p){view.removeChild(p);});
  if(nav)view.removeChild(nav);
  for(var i=0;i<pages.length;i+=step){
    var spread=document.createElement('div');
    spread.className='mushaf-spread';
    spread.appendChild(pages[i]);
    if(isLandscape&&pages[i+1])spread.appendChild(pages[i+1]);
    else if(isLandscape)spread.classList.add('spread-single');
    view.appendChild(spread);
  }
  if(nav)view.appendChild(nav);
  // Re-setup lazy observer with horizontal rootMargin
  if(_mushafLazyObs){
    _mushafLazyObs.disconnect();
    _mushafLazyObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var pageEl=entry.target;
        if(pageEl.dataset.loaded)return;
        pageEl.dataset.loaded='1';
        _mushafLazyObs&&_mushafLazyObs.unobserve(pageEl);
        loadMushafPageQCF(pageEl,parseInt(pageEl.dataset.page)).catch(function(){});
      });
    },{root:view,rootMargin:'0px 1200px'});
    view.querySelectorAll('.mushaf-text-page:not([data-loaded])').forEach(function(p){_mushafLazyObs.observe(p);});
  }
  view.scrollLeft=0;
}

function renderMushafView(){
  var view=$('mushafView');
  if(!view||!S.surah)return;
  // Start the 3 MB bundle fetch immediately so it's ready before the first page loads
  if(S.mushafFont==='qcf4')_loadMushafBundledData();
  clearMushafHighlights();
  // Disconnect previous lazy-load observer to prevent accumulation
  if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
  window._mushafVerseElements={};
  clear(view);
  view.scrollTop=0;view.scrollLeft=0;
  view.appendChild(_mushafSkeleton());

  var _renderSurah=S.surah; // capture at render time — abort if surah changes during async
  getMushafPageRange(S.surah).then(function(pages){
    if(!S.mushafMode||S.surah!==_renderSurah)return;
    clear(view);
    view.scrollTop=0;view.scrollLeft=0;

    // Pre-inject QCF fonts for first 3 pages so they're downloading in parallel
    for(var pi=pages.start;pi<=Math.min(pages.end,pages.start+2);pi++){
      if(S.mushafFont==='qcf1')injectQCFFont(pi);
      else if(S.mushafFont==='qcf2')injectQCFV2Font(pi);
      else if(S.mushafFont==='qcf4')injectQCFV4Font(pi);
    }

    // Full Quran: page 1→604. Always start from page 1 so scrolling back to
    // Al-Fatiha from any surah works like a real Mushaf.
    // Pre-scroll to near the target surah before the observer fires so the
    // initial intersection check loads pages around the right position.
    var _estPx=(pages.start-1)*560; // ~560px per skeleton page
    // Build all 604 page containers in a DocumentFragment (single DOM insertion)
    // with no children — CSS min-height keeps scroll range intact. Skeletons are
    // added by the IO callback just before data loads, cutting initial DOM nodes
    // from ~9,000 (604×15 lines) down to 604 bare divs.
    var _frag=document.createDocumentFragment();
    for(var p=1;p<=604;p++){
      var pageEl=el('div','mushaf-text-page');
      pageEl.dataset.page=String(p);
      _frag.appendChild(pageEl);
    }
    view.appendChild(_frag);
    view.scrollTop=_estPx;

    var targetSurah=S.surah;
    var capturedSurah=targetSurah;
    var targetPageEl=view.querySelector('.mushaf-text-page[data-page="'+pages.start+'"]');

    function _mushafPageErr(pageEl){
      clear(pageEl);
      var ph=el('div','mushaf-page-ph mushaf-page-err','—');
      pageEl.appendChild(ph);
    }

    // Scroll to surah banner — retry loop corrects for layout shifts as nearby
    // pages render (their height grows from min-height CSS, pushing the banner down).
    function _scrollToSurah(){
      var b=view.querySelector('.mushaf-surah-banner[data-surah="'+targetSurah+'"]');
      if(!b)return;
      view.scrollTop=b.offsetTop;
      var _a=0;
      (function _fix(){
        if(_a++>=8)return;
        setTimeout(function(){
          var b2=view.querySelector('.mushaf-surah-banner[data-surah="'+targetSurah+'"]');
          if(!b2)return;
          var delta=b2.getBoundingClientRect().top-view.getBoundingClientRect().top;
          if(Math.abs(delta)>6){view.scrollTop+=delta;_fix();}
        },200);
      })();
    }

    // Lazy-load: 3000px lookahead in BOTH directions so scrolling up (back to
    // Al-Fatiha) also pre-loads pages ahead of the scroll position.
    if(_mushafLazyObs){_mushafLazyObs.disconnect();_mushafLazyObs=null;}
    _mushafLazyObs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var pe=entry.target;
        if(pe.dataset.loaded)return;
        pe.dataset.loaded='1';
        _mushafLazyObs&&_mushafLazyObs.unobserve(pe);
        if(S.surah!==capturedSurah)return;
        // Add skeleton shimmer now so the page isn't blank while data loads
        if(!pe.firstChild)pe.appendChild(_mushafSkeleton());
        loadMushafPageQCF(pe,parseInt(pe.dataset.page)).catch(function(){_mushafPageErr(pe);});
      });
    },{root:view,rootMargin:'3000px 0px 3000px 0px'});
    view.querySelectorAll('.mushaf-text-page:not([data-loaded])').forEach(function(pe){
      _mushafLazyObs.observe(pe);
    });

    // Eagerly load the target surah's first page for immediate display, then
    // scroll precisely to the surah banner once the page content is rendered.
    if(targetPageEl){
      targetPageEl.dataset.loaded='1';
      _mushafLazyObs&&_mushafLazyObs.unobserve(targetPageEl);
      targetPageEl.appendChild(_mushafSkeleton());
      loadMushafPageQCF(targetPageEl,pages.start).then(function(){
        setTimeout(function(){_scrollToSurah();},0);
      }).catch(function(){_mushafPageErr(targetPageEl);});
    }
    updateMushafProgress(view);

    // Header: update as user scrolls through pages — reflect topmost visible surah
    (function(){
      var _hdrTimer=null;
      function _updateHeaderFromScroll(){
        clearTimeout(_hdrTimer);
        _hdrTimer=setTimeout(function(){
          if(S.surah!==capturedSurah)return;
          var banners=view.querySelectorAll('.mushaf-surah-banner[data-surah]');
          var viewRect=view.getBoundingClientRect();
          var best=null,bestTop=Infinity;
          for(var b=0;b<banners.length;b++){
            var br=banners[b].getBoundingClientRect();
            var dist=Math.abs(br.top-viewRect.top);
            if(br.bottom>viewRect.top&&br.top<viewRect.bottom&&dist<bestTop){
              bestTop=dist;best=banners[b];
            }
          }
          if(!best)return;
          var sn=parseInt(best.dataset.surah);
          var ns=SURAHS[sn-1];
          if(ns&&$('readerName'))$('readerName').textContent=ns.en+' - '+ns.ar;
        },200);
      }
      view.addEventListener('scroll',_updateHeaderFromScroll,{passive:true});
    })();

    // Cancel any in-flight smooth scroll when the user touches the mushaf
    view.addEventListener('touchstart',function(){
      if(_mushafScrollAnim){_mushafScrollAnim.cancelled=true;_mushafScrollAnim=null;}
    },{passive:true});

    // iPad (any orientation ≥768px): page-by-page horizontal navigation
    if(document.documentElement.classList.contains('is-ipad')&&window.innerWidth>=768){
      _mushafWrapSpreads(view);
    }
  }).catch(function(){
    clear(view);
    var errWrap=el('div','mushaf-offline-err');
    var msg=el('div','mushaf-offline-err-msg',t('mushaf.offline_msg')||'Mushaf mode needs internet on first load.');
    var switchBtn=el('button','mushaf-offline-switch-btn',t('mushaf.switch_to_reading')||'Switch to reading mode');
    on(switchBtn,'click',function(){App.toggleMushafMode();});
    errWrap.appendChild(msg);
    errWrap.appendChild(switchBtn);
    view.appendChild(errWrap);
  });
}

// Shrink QCF lines that overflow their container so no characters are clipped.
// Separates DOM reads from writes to avoid layout thrashing.
function _fitQCFLines(pageEl){
  var lines=pageEl.querySelectorAll('.mushaf-qcf-line');
  var n=lines.length;
  if(!n)return;
  // batch-reset transforms first so measurements reflect natural width
  for(var i=0;i<n;i++)lines[i].style.transform='';
  var scales=new Array(n);
  // batch-read
  for(var i=0;i<n;i++){
    var sw=lines[i].scrollWidth,cw=lines[i].clientWidth;
    scales[i]=(sw>cw&&cw>0)?cw/sw:1;
  }
  // batch-write
  for(var i=0;i<n;i++){
    if(scales[i]<1){
      lines[i].style.transform='scaleX('+scales[i].toFixed(4)+')';
      lines[i].style.transformOrigin='center';
    }
  }
}

// Returns a DocumentFragment rendering Quran text with KFGQPC Hafs font.
// verses: array from getMushafPageData — may be empty when page data unavailable.
// pageNum: used to look up which surahs fall on this page when verses is empty.
function _buildHafsFallbackFrag(verses,pageNum){
  var frag=document.createDocumentFragment();
  var prevSn=-1;
  function _hafsHeader(sn){
    if(sn===prevSn)return;prevSn=sn;
    var bn=el('div','mushaf-surah-banner');bn.dataset.surah=String(sn);
    var nt=document.createElement('div');nt.className='surah-name-ar no-kurdish-convert';
    var gc='surah'+String(sn).padStart(3,'0');nt.dataset.glyph=gc;
    var fr=(window.QuranFontManager&&window.QuranFontManager.isReady('SurahName'))||window._surahNameFontReady;
    var ss=SURAHS[sn-1];nt.textContent=fr?gc:(ss?ss.ar:('سورة '+sn));
    bn.appendChild(nt);frag.appendChild(bn);
    if(sn!==1&&sn!==9){var bm=el('div','mushaf-bismillah');bm.textContent='بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';frag.appendChild(bm);}
  }
  function _hafsVerse(sn,vn){
    var sd=S.quranData&&S.quranData[String(sn)];
    var ao=sd&&sd[vn-1];
    var txt=(ao&&ao.text)||('('+sn+':'+vn+')');
    var ve=el('div','mushaf-flow-verse');
    ve.style.fontFamily="'KFGQPC Hafs','Amiri Quran',serif";
    ve.textContent=txt+' ﴿'+toArabicNum(vn)+'﴾';
    (function(v,s){on(ve,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(v,s);});})(vn,sn);
    frag.appendChild(ve);
  }
  if(verses&&verses.length){
    verses.forEach(function(v){
      var sn=v.surah_number||parseInt((v.verse_key||'1:1').split(':')[0]);
      var vn=v.verse_number;
      _hafsHeader(sn);_hafsVerse(sn,vn);
    });
  } else {
    // No verse data available — approximate from quranData for surahs on this page
    for(var i=0;i<_MUSHAF_PAGE_RANGES.length;i++){
      var r=_MUSHAF_PAGE_RANGES[i];
      if(r[0]>pageNum||r[1]<pageNum)continue;
      var psn=i+1;
      var psd=S.quranData&&S.quranData[String(psn)];
      if(!psd)continue;
      _hafsHeader(psn);
      for(var vi=0;vi<psd.length;vi++){
        _hafsVerse(psn,psd[vi].verse||(vi+1));
      }
    }
  }
  return frag;
}

function loadMushafPageQCF(pageEl,pageNum){
  var font=S.mushafFont||'qcf1';
  var pf=_getPageFields();
  var _t0=Date.now();

  // Start font and data fetches in parallel
  var fontP;
  if(font==='qcf4'){
    fontP=ensureQCFV4Font(pageNum);
  } else {
    if(font==='qcf1')injectQCFFont(pageNum);
    else if(font==='qcf2')injectQCFV2Font(pageNum);
    fontP=Promise.resolve(true);
  }
  var _dataT=Date.now();
  var dataP=getMushafPageData(pageNum,pf.fields,pf.cache,pf.mushafId);

  return dataP.then(function(json){
    var _dataMs=Date.now()-_dataT;
    var verses=json.verses||[];
    if(!verses.length){
      // No page data — render Hafs Arabic text as fallback (never show ×)
      if(font==='qcf4'){
        var _nd=_buildHafsFallbackFrag([],pageNum);
        clear(pageEl);pageEl.classList.add('mushaf-page-hafs-fallback');pageEl.appendChild(_nd);
      } else {clear(pageEl);pageEl.appendChild(el('div','mushaf-page-ph','—'));}
      return;
    }

    // Render into a fragment — spinner stays visible until font is ready
    var frag=document.createDocumentFragment();
    // Juz banner — show only at the START of a new juz
    var juzIdx=JUZ_PAGES.indexOf(pageNum);
    if(juzIdx>=0){
      var juzBanner=el('div','mushaf-juz-banner',t('reader.juz_label')+' '+toArabicNum(juzIdx+1));
      frag.appendChild(juzBanner);
    }

    // Helper: surah banner + bismillah
    function addSurahHeader(sn){
      var s=SURAHS[sn-1];
      var banner=el('div','mushaf-surah-banner');
      banner.dataset.surah=String(sn);
      var gc='surah'+String(sn).padStart(3,'0');
      var titleEl=document.createElement('div');
      titleEl.className='surah-name-ar no-kurdish-convert';
      titleEl.dataset.glyph=gc;
      var fontReady=(window.QuranFontManager&&window.QuranFontManager.isReady('SurahName'))||window._surahNameFontReady;
      titleEl.textContent=fontReady?gc:(s?s.ar:('سورة '+sn));
      banner.appendChild(titleEl);
      frag.appendChild(banner);
      if(sn!==1&&sn!==9){
        var bism=el('div','mushaf-bismillah');
        bism.textContent='بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
        frag.appendChild(bism);
      }
    }

    if(font==='qcf1'||font==='qcf2'||font==='qcf4'){
      // ── QCF line-by-line rendering (V1, V2, or V4 tajweed) ──
      var fontFam=(font==='qcf2')?"'QCFv2p"+pageNum+"'":(font==='qcf4')?"'QCFv4p"+pageNum+"'":"'QCFv1p"+pageNum+"'";
      var codeField=(font==='qcf2'||font==='qcf4')?'code_v2':'code_v1';
      var lineOrder=[];var lineOrderSeen={};var lineStartsSurah={};var lineAyahGroups={};

      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        var isFirst=(vn===1);var markedLine=false;
        (verse.words||[]).forEach(function(w){
          if(!w[codeField])return;
          var ln=w.line_number||0;
          if(!lineOrderSeen[ln]){lineOrderSeen[ln]=true;lineOrder.push(ln);}
          if(!lineAyahGroups[ln])lineAyahGroups[ln]=[];
          var grps=lineAyahGroups[ln];
          var last=grps[grps.length-1];
          if(last&&last.vn===vn&&last.sn===sn){last.words.push(w[codeField]);}
          else{grps.push({sn:sn,vn:vn,words:[w[codeField]]});}
          if(isFirst&&!markedLine&&!lineStartsSurah[ln]){markedLine=true;lineStartsSurah[ln]={surahNum:sn};}
        });
      });

      lineOrder.sort(function(a,b){return a-b;});
      lineOrder.forEach(function(ln){
        var sc=lineStartsSurah[ln];
        if(sc)addSurahHeader(sc.surahNum);
        var lineEl=el('div','mushaf-qcf-line');
        lineEl.style.fontFamily=fontFam;
        var grps=lineAyahGroups[ln]||[];
        // Always wrap every ayah segment in a span — never register the full line div
        grps.forEach(function(g){
          var seg=document.createElement('span');
          seg.className='mushaf-ayah-seg';
          seg.setAttribute('data-surah',String(g.sn));
          seg.setAttribute('data-ayah',String(g.vn));
          seg.textContent=g.words.join('');
          var k=String(g.sn)+':'+String(g.vn);
          if(!window._mushafVerseElements[k])window._mushafVerseElements[k]=[];
          window._mushafVerseElements[k].push(seg);
          (function(v,s,segKey){
            // Highlight ALL segments of this ayah on press (handles multi-line ayahs)
            on(seg,'pointerdown',function(){
              var all=window._mushafVerseElements[segKey]||[];
              all.forEach(function(el){el.classList.add('mushaf-seg-sel');});
            });
            // Clean up if gesture cancelled (scroll, interrupt)
            on(seg,'pointercancel',function(){
              var all=window._mushafVerseElements[segKey]||[];
              all.forEach(function(el){el.classList.remove('mushaf-seg-sel');});
            });
            on(seg,'click',function(e){
              e.stopPropagation();
              var all=window._mushafVerseElements[segKey]||[];
              setTimeout(function(){all.forEach(function(el){el.classList.remove('mushaf-seg-sel');});},220);
              App.showMushafVerseTafsir(v,s);
            });
          })(g.vn,g.sn,k);
          lineEl.appendChild(seg);
        });
        // Line-level fallback: only for single-ayah lines (gaps between glyphs still clickable)
        // Multi-ayah lines: use segment spans directly — no ambiguous line-level handler
        if(grps.length===1){
          (function(v,s){on(lineEl,'click',function(){App.showMushafVerseTafsir(v,s);});})(grps[0].vn,grps[0].sn);
        }
        frag.appendChild(lineEl);
      });

    } else if(font==='tajweed'){
      // ── Tajweed: flowing text with safe DOM colored spans ──
      var stripTags=function(s){
        var out='',i=0;
        while(i<s.length){
          if(s[i]==='<'){var e=s.indexOf('>',i);i=(e===-1)?s.length:e+1;}
          else{out+=s[i++];}
        }
        return out;
      };
      var appendTjWord=function(raw,container){
        var chunks=raw.split('</rule>');
        for(var ci=0;ci<chunks.length;ci++){
          var chunk=chunks[ci];
          if(!chunk)continue;
          var tagIdx=chunk.indexOf('<rule class=');
          if(tagIdx===-1){container.appendChild(document.createTextNode(chunk));}
          else{
            if(tagIdx>0)container.appendChild(document.createTextNode(chunk.substring(0,tagIdx)));
            var inner=chunk.substring(tagIdx+12);
            var gtIdx=inner.indexOf('>');
            if(gtIdx>0){
              var txt=stripTags(inner.substring(gtIdx+1));
              if(txt){
                var sp=document.createElement('span');
                sp.className='tj-'+inner.substring(0,gtIdx);
                sp.textContent=txt;
                container.appendChild(sp);
              }
            }
          }
        }
      };
      var prevSurahT=-1;
      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        if(sn!==prevSurahT){prevSurahT=sn;addSurahHeader(sn);}
        var words=(verse.words||[]).filter(function(w){return w.char_type_name!=='end';});
        if(!words.length)return;
        var vEl=el('div','mushaf-flow-verse');
        vEl.style.fontFamily="'KFGQPC Hafs',serif";
        words.forEach(function(w,wi){
          appendTjWord(w.text_uthmani_tajweed||w.text||'',vEl);
          if(wi<words.length-1)vEl.appendChild(document.createTextNode(' '));
        });
        var endSp=document.createElement('span');endSp.className='tj-end';
        endSp.textContent=' \uFD3F'+toArabicNum(vn)+'\uFD3E';
        vEl.appendChild(endSp);
        (function(v,s){on(vEl,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(v,s);});})(vn,sn);
        frag.appendChild(vEl);
      });

    } else {
      // ── Fallback: flowing plain text ──
      var prevSurahF=-1;
      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        if(sn!==prevSurahF){prevSurahF=sn;addSurahHeader(sn);}
        var words=(verse.words||[]).map(function(w){return w.text||'';}).filter(Boolean);
        if(!words.length)return;
        var vEl=el('div','mushaf-flow-verse');
        vEl.style.fontFamily="'KFGQPC Hafs',serif";
        vEl.textContent=words.join(' ')+' \uFD3F'+toArabicNum(vn)+'\uFD3E';
        (function(v,s){on(vEl,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(v,s);});})(vn,sn);
        frag.appendChild(vEl);
      });
    }

    var foot=el('div','mushaf-page-foot');
    foot.appendChild(el('span','mushaf-page-num',toArabicNum(pageNum)));
    frag.appendChild(foot);

    // Metadata — set on pageEl immediately (progress tracking reads dataset)
    // dataset.verses  : verse numbers for S.surah only (legacy, used by scroll-resume)
    // dataset.verseKeys: all "surah:ayah" pairs on this page (multi-surah progress tracking)
    var svn=[],vks=[];
    verses.forEach(function(v){
      var sn=Number(v.surah_number)||parseInt((v.verse_key||'0:0').split(':')[0]);
      var vn=Number(v.verse_number);
      if(sn===S.surah)svn.push(vn);
      vks.push(sn+':'+vn);
    });
    pageEl.dataset.verses=JSON.stringify(svn);
    pageEl.dataset.verseKeys=JSON.stringify(vks);

    // Prefetch adjacent pages: next 2 and previous 1 for instant scroll in any direction
    _prefetchMushafPage(pageNum+1);
    _prefetchMushafPage(pageNum+2);
    _prefetchMushafPage(pageNum-1);

    var showContent=function(fontMs){
      var _rT=Date.now();
      clear(pageEl);
      pageEl.appendChild(frag);
      // Restore all active highlight states on the newly-rendered page
      if(S.audio.playing&&S.audio.surah===S.surah)_hlRestoreMushafPage(pageEl);
      var _renderMs=Date.now()-_rT;
      var _total=Date.now()-_t0;
      // Re-fit once QCF1/QCF2 font actually downloads (fontP resolved instantly so
      // the first RAF below measures with the fallback font — this corrects it)
      if(font==='qcf1'||font==='qcf2'){
        var _qcfFam=(font==='qcf2')?"1em 'QCFv2p"+pageNum+"'":"1em 'QCFv1p"+pageNum+"'";
        if(document.fonts&&document.fonts.load){
          document.fonts.load(_qcfFam).then(function(){
            requestAnimationFrame(function(){_fitQCFLines(pageEl);});
          });
        }
      }
      // Integrity validation + line auto-fit — runs after DOM commit
      requestAnimationFrame(function(){
        _fitQCFLines(pageEl);
        var result=validateMushafPage(pageNum,json,pageEl);
        _mushafRenderMetrics[pageNum]={
          fontMs:fontMs||0,dataMs:_dataMs,renderMs:_renderMs,total:_total,
          height:pageEl.offsetHeight,ok:result.ok,
          expected:result.expected,missing:result.missing
        };
        console.log('[MushafPerf] page='+pageNum+' dataMs='+_dataMs+' fontMs='+(fontMs||0)+' renderMs='+_renderMs+' total='+_total+' ok='+result.ok+(result.missing.length?' MISSING='+result.missing.join(','):''));
      });
    };

    // For QCF4 font already resolved by ensureQCFV4Font; for other modes font is always ready
    return fontP.then(function(fontOk){
      var QFM=window.QuranFontManager;
      var _fontMs=Date.now()-_t0-_dataMs;
      if(font==='qcf4'&&!fontOk){
        // QCF4 font unavailable — sentinel test failed or font timed out.
        // Render readable Hafs Arabic text; never show broken PUA glyph codes.
        if(QFM)QFM.qcfPageFailed(pageNum,'font-unavailable');
        clear(pageEl);
        pageEl.classList.add('mushaf-page-hafs-fallback');
        pageEl.appendChild(_buildHafsFallbackFrag(verses,pageNum));
        _mushafRenderMetrics[pageNum]={fontMs:_fontMs,dataMs:_dataMs,total:Date.now()-_t0,ok:false,missing:['qcf4-font']};
        console.log('[MushafPerf] page='+pageNum+' status=hafs-fallback total='+(Date.now()-_t0));
        return;
      }
      if(font==='qcf4'&&QFM)QFM.qcfPageLoaded(pageNum,Date.now()-_t0);
      showContent(_fontMs);
    });
  }).catch(function(err){
    console.warn('[Mushaf] page='+pageNum+' render error:',err&&err.message||err);
    clear(pageEl);
    // Never show ×: attempt Hafs fallback using quranData for surahs on this page
    try{
      var _ef=_buildHafsFallbackFrag([],pageNum);
      pageEl.classList.add('mushaf-page-hafs-fallback');
      pageEl.appendChild(_ef);
    }catch(e2){pageEl.appendChild(el('div','mushaf-page-ph','—'));}
  });
}

/* ===== AYAH SKELETON ===== */
function _ayahSkeleton(count){
  var frag=document.createDocumentFragment();
  for(var i=0;i<(count||4);i++){
    var card=el('div','ayah-skel');
    var head=el('div','ayah-skel-head');
    head.appendChild(el('div','ayah-skel-badge'));
    var acts=el('div','ayah-skel-actions');
    acts.appendChild(el('div','ayah-skel-act'));
    acts.appendChild(el('div','ayah-skel-act'));
    head.appendChild(acts);
    card.appendChild(head);
    // Arabic text lines
    card.appendChild(el('div','ayah-skel-ar'));
    card.appendChild(el('div','ayah-skel-ar'));
    // Tafsir lines
    card.appendChild(el('div','ayah-skel-ku'));
    card.appendChild(el('div','ayah-skel-ku'));
    card.appendChild(el('div','ayah-skel-ku short'));
    frag.appendChild(card);
  }
  return frag;
}

/* ===== RENDER AYAHS ===== */
function renderAyahs(surahNum,scrollTo){
  var list=$('ayahList');
  clear(list);
  list.scrollTop=0; // always reset — prevents stale offset from prior view
  var s=SURAHS[surahNum-1];
  if(!s)return;

  // Lazy-load surah + tafsir data on demand (~8KB + ~14KB per surah)
  var _needQ=!S.quranData||!S.quranData[String(surahNum)];
  var _needT=!S.tafsirData||!S.tafsirData[surahNum-1];
  if(_needQ||_needT){
    list.appendChild(_ayahSkeleton(5));
    var _fetches=[];
    if(_needQ)_fetches.push(_loadSurahData(surahNum));
    if(_needT)_fetches.push(_loadTafsirData(surahNum));
    Promise.all(_fetches).then(function(){
      if(S.surah!==surahNum)return;
      renderAyahs(surahNum,scrollTo);
    }).catch(function(){
      if(S.surah!==surahNum)return;
      clear(list);
      var _nowQ=S.quranData&&S.quranData[String(surahNum)];
      var _nowT=S.tafsirData&&S.tafsirData[surahNum-1];
      if(_nowQ&&_nowT){renderAyahs(surahNum,scrollTo);}
      else{var _e=el('div','prayer-status prayer-error');_e.textContent=t('prayer.error')||'هەلە — دووباره هەوڵبدە';list.appendChild(_e);}
    });
    return;
  }

  // Glyph font mode: fetch per-page word codes from API
  var glyphMode=(S.readerFont==='qpcv2'||S.readerFont==='v4tajweed');
  if(glyphMode&&!S.glyphVerses[surahNum]){
    var _isV4=S.readerFont==='v4tajweed';
    var _gkey='rfGlyph_'+(_isV4?'v4':'v2')+'_'+surahNum;
    var _gc=null;try{_gc=JSON.parse(localStorage.getItem(_gkey));}catch(e){}
    if(_gc){S.glyphVerses[surahNum]=_gc;}
    else{
      list.appendChild(_ayahSkeleton(5));
      fetch('https://api.quran.com/api/v4/verses/by_chapter/'+surahNum+'?words=true&word_fields=code_v2,page_number,char_type_name&per_page=300'+(_isV4?'&mushaf=19':''))
        .then(function(r){return r.json();})
        .then(function(d){
          var vs=d.verses||[];
          S.glyphVerses[surahNum]=vs;
          try{localStorage.setItem(_gkey,JSON.stringify(vs));}catch(e){}
          if(S.surah!==surahNum)return; // user navigated away while fetching — discard
          renderAyahs(surahNum,scrollTo);
        })
        .catch(function(){
          clear(list);
          var e2=el('div','prayer-status prayer-error');e2.textContent=t('prayer.error')||'هەلە — دووباره هەوڵبدە';list.appendChild(e2);
        });
      return;
    }
  }

  // Inject per-page fonts upfront when in glyph mode
  if(glyphMode&&S.glyphVerses[surahNum]){
    var _pages={};
    S.glyphVerses[surahNum].forEach(function(v){(v.words||[]).forEach(function(w){if(w.page_number)_pages[w.page_number]=true;});});
    Object.keys(_pages).forEach(function(pn){
      if(S.readerFont==='v4tajweed')injectQCFV4Font(+pn);else injectQCFV2Font(+pn);
    });
  }

  var ayahs=[];
  if(S.quranData){
    // quran.json format: object with string keys {"1":[...],"2":[...]}
    var surahData=S.quranData[String(surahNum)];
    if(surahData){
      var verses=surahData.verses||surahData;
      if(Array.isArray(verses)){
        ayahs=verses;
      }
    }
  }

  var tafsirs={};
  if(S.tafsirData){
    var td=S.tafsirData[surahNum-1]||S.tafsirData[String(surahNum)];
    if(td){
      var tv=td.verses||td;
      if(Array.isArray(tv)){
        tv.forEach(function(v,i){
          var vNum=v.verse||v.ayah||(i+1);
          tafsirs[vNum]=v.text||v.tafsir||v;
        });
      } else if(typeof tv==='object'){
        Object.keys(tv).forEach(function(k){tafsirs[k]=tv[k].text||tv[k].tafsir||tv[k]});
      }
    }
  }


  // bmSet removed — buildCard calls isBookmarked() directly (O(1), no storage read)

  // Read active position mark for this surah (used in buildCard + to restore timer)
  var _markState=null;
  try{var _mk=JSON.parse(localStorage.getItem('ayahMark'));if(_mk&&_mk.surah===surahNum&&_mk.expiresAt>Date.now())_markState=_mk;}catch(e){}

  var total=ayahs.length||s.a;

  // Surah header
  var hdr=el('div','surah-reader-header');
  // Giant faded number as background watermark
  hdr.appendChild(el('div','surah-reader-num-bg no-kurdish-convert',toArabicNum(surahNum)));
  // Calligraphy name
  var _rn=document.createElement('div');
  _rn.className='surah-reader-name no-kurdish-convert';
  var _rnglyph='surah'+String(surahNum).padStart(3,'0');
  _rn.dataset.glyph=_rnglyph;
  _rn.textContent=_surahNameV2FontReady?_rnglyph:(s.ar||'');
  hdr.appendChild(_rn);
  // Bismillah
  if(surahNum!==1&&surahNum!==9){
    hdr.appendChild(el('div','surah-reader-bismillah','بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'));
  }
  list.appendChild(hdr);

  // Single delegated click handler — added once ever (list is a persistent element)
  if(!list._clickSetup){
    list._clickSetup=true;
    list.addEventListener('click',function(e){
      var plBtn=e.target.closest('[data-play]');
      var bmBtn=e.target.closest('[data-bm]');
      var cpBtn=e.target.closest('[data-cp]');
      var wgtBtn=e.target.closest('[data-wgt]');
      if(plBtn){
        var an=+plBtn.dataset.play;
        haptic([8]);
        if(S.audio.playing&&S.audio.surah===S.surah&&S.audio.ayah===an){App.audioToggle();}
        else{playAyah(S.surah,an);}
      }
      if(bmBtn){
        var an2=+bmBtn.dataset.bm;
        var added=toggleBookmark(S.surah,an2);
        // Surgical update — toggle classes on this card only, no re-render
        var bCard=bmBtn.closest('.ayah-card');
        if(bCard)bCard.classList.toggle('bookmarked',added);
        bmBtn.classList.toggle('active',added);
      }
      if(cpBtn){App.openCopyModal(S.surah,+cpBtn.dataset.cp);}
      if(wgtBtn){pushAyahToWidget(S.surah,+wgtBtn.dataset.wgt);}
    });
  }

  // Hold detection via 400ms timer in touchstart (fires before touchend/touchcancel).
  // This is reliable on Android WebView where long-press triggers touchcancel, not touchend.
  if(!list._markSetup){
    list._markSetup=true;
    var _lpTimer=null,_lpCard=null,_lpX=0,_lpY=0;
    list.addEventListener('touchstart',function(e){
      var mc=e.target.closest('.ayah-card');
      if(!mc||e.target.closest('[data-play],[data-bm],[data-cp],[data-wgt]'))return;
      _lpCard=mc;_lpX=e.touches[0].clientX;_lpY=e.touches[0].clientY;
      _tapStartMs=Date.now();_tapMoved=false;
      mc.classList.add('ayah-card--pressing');
      clearTimeout(_lpTimer);
      _lpTimer=setTimeout(function(){
        if(!_lpCard)return;
        var c=_lpCard;_lpCard=null;
        c.classList.remove('ayah-card--pressing');
        _ayahMarkLpAt=Date.now();
        _setAyahMark(S.surah,+c.dataset.ayah);
      },1000);
    },{passive:true});
    list.addEventListener('touchmove',function(e){
      if(!_lpCard)return;
      var dx=e.touches[0].clientX-_lpX,dy=e.touches[0].clientY-_lpY;
      var dist2=dx*dx+dy*dy;
      if(dist2>36)_tapMoved=true; // ≥6px movement — will block tap highlight in onclick
      if(dist2>80){clearTimeout(_lpTimer);_lpTimer=null;_lpCard.classList.remove('ayah-card--pressing');_lpCard=null;}
    },{passive:true});
    list.addEventListener('touchend',function(){
      clearTimeout(_lpTimer);_lpTimer=null;
      if(_lpCard){_lpCard.classList.remove('ayah-card--pressing');_lpCard=null;}
    },{passive:true});
    list.addEventListener('touchcancel',function(){
      clearTimeout(_lpTimer);_lpTimer=null;
      if(_lpCard){_lpCard.classList.remove('ayah-card--pressing');_lpCard=null;}
    },{passive:true});
    list.addEventListener('contextmenu',function(e){if(e.target.closest('.ayah-card'))e.preventDefault();});
  }

  // Nav buttons (always at bottom — batches insert before them)
  var nav=el('div','surah-nav');
  var prevBtn=el('button','surah-nav-btn');
  prevBtn.appendChild(icon('fas fa-arrow-right'));
  prevBtn.appendChild(document.createTextNode(' '+t('reader.prev_surah')));
  if(surahNum<=1)prevBtn.disabled=true;
  on(prevBtn,'click',function(){App.openSurah(surahNum-1)});
  nav.appendChild(prevBtn);
  var nextBtn=el('button','surah-nav-btn');
  nextBtn.appendChild(document.createTextNode(t('reader.next_surah')+' '));
  nextBtn.appendChild(icon('fas fa-arrow-left'));
  if(surahNum>=114)nextBtn.disabled=true;
  on(nextBtn,'click',function(){App.openSurah(surahNum+1)});
  nav.appendChild(nextBtn);
  list.appendChild(nav);

  // Batch rendering — keeps DOM small for smooth scroll
  var BATCH=25;
  var _renderedTo=0;
  var _sentinel=null;
  var _sentinelObs=null;

  function buildCard(ayahNum){
    var card=el('div','ayah-card');
    if(isBookmarked(surahNum,ayahNum))card.classList.add('bookmarked');
    if(_markState&&_markState.ayah===ayahNum)card.classList.add('ayah-card--marked');
    card.dataset.ayah=String(ayahNum);
    var head=el('div','ayah-head');
    head.appendChild(el('div','ayah-badge',String(ayahNum)));
    var actions=el('div','ayah-actions');
    var isPlayingThis=S.audio.playing&&S.audio.surah===surahNum&&S.audio.ayah===ayahNum;
    var playBtn=el('button','ayah-act'+(isPlayingThis?' playing':''));
    playBtn.dataset.play=String(ayahNum);
    playBtn.appendChild(icon(isPlayingThis?'fas fa-pause':'fas fa-play'));
    actions.appendChild(playBtn);
    var bmBtn=el('button','ayah-act'+(isBookmarked(surahNum,ayahNum)?' active':''));
    bmBtn.dataset.bm=String(ayahNum);
    bmBtn.appendChild(icon('fas fa-bookmark'));
    actions.appendChild(bmBtn);
    var copyBtn=el('button','ayah-act');
    copyBtn.dataset.cp=String(ayahNum);
    copyBtn.appendChild(icon('fas fa-copy'));
    actions.appendChild(copyBtn);
    // Widget button — iOS only (Android has no widget support)
    var _isIOS=window.Capacitor&&typeof Capacitor.getPlatform==='function'&&Capacitor.getPlatform()==='ios';
    if(_isIOS){
      var wgtBtn=el('button','ayah-act');
      wgtBtn.dataset.wgt=String(ayahNum);
      wgtBtn.appendChild(icon('fas fa-star'));
      actions.appendChild(wgtBtn);
    }
    head.appendChild(actions);
    card.appendChild(head);
    var arabic=el('div','ayah-arabic');
    if(glyphMode&&S.glyphVerses[surahNum]&&S.glyphVerses[surahNum][ayahNum-1]){
      var _isV4g=S.readerFont==='v4tajweed';
      var _vd=S.glyphVerses[surahNum][ayahNum-1];
      // Show normal Hafs text immediately — no blank box while glyph font loads
      arabic.textContent=ayahs[ayahNum-1]?(ayahs[ayahNum-1].text||ayahs[ayahNum-1]):'';
      // Build glyph spans in detached container
      var _glyphDiv=document.createElement('div');
      _glyphDiv.style.wordSpacing='normal';
      var _pageNums=[],_curPg=null,_curCodes=[];
      var _flush=function(pg,codes){
        if(!codes.length)return;
        if(_pageNums.indexOf(pg)<0)_pageNums.push(pg);
        var sp=document.createElement('span');
        sp.style.fontFamily=_isV4g?"'QCFv4p"+pg+"',serif":"'QCFv2p"+pg+"',serif";
        sp.textContent=codes.join('\u200c');
        _glyphDiv.appendChild(sp);
      };
      (_vd.words||[]).forEach(function(w){
        if(!w.code_v2||w.char_type_name==='end')return;
        if(w.page_number!==_curPg){if(_curPg!==null)_flush(_curPg,_curCodes);_curPg=w.page_number;_curCodes=[w.code_v2];}
        else{_curCodes.push(w.code_v2);}
      });
      if(_curPg!==null)_flush(_curPg,_curCodes);
      // Swap to glyphs once all page fonts are loaded
      if(_pageNums.length&&document.fonts){
        var _fp=_isV4g?'QCFv4p':'QCFv2p';
        Promise.all(_pageNums.map(function(pg){return document.fonts.load("1em '"+_fp+pg+"'");}))
          .then(function(){
            arabic.textContent='';
            arabic.style.wordSpacing='normal';
            while(_glyphDiv.firstChild)arabic.appendChild(_glyphDiv.firstChild);
          }).catch(function(){});
      }else{
        arabic.textContent='';
        arabic.style.wordSpacing='normal';
        while(_glyphDiv.firstChild)arabic.appendChild(_glyphDiv.firstChild);
      }
    }else{
      arabic.textContent=ayahs[ayahNum-1]?(ayahs[ayahNum-1].text||ayahs[ayahNum-1]):'';
    }
    card.appendChild(arabic);
    if(tafsirs[ayahNum]&&S.showTafsir){
      var taf=el('div','ayah-tafsir');
      taf.textContent=typeof tafsirs[ayahNum]==='string'?tafsirs[ayahNum]:'';
      card.appendChild(taf);
    }
    // Tap to mark: per-card onclick avoids stacking across renderAyahs calls.
    // Guards: skip action buttons; skip if long-press just fired; skip if touch
    // was too quick (<120ms) or moved ≥6px (likely a scroll or accidental graze).
    card.onclick=function(e){
      if(e.target.closest('[data-play],[data-bm],[data-cp],[data-wgt]'))return;
      if(Date.now()-_ayahMarkLpAt<700)return;  // suppress post-long-press click
      if(_tapMoved)return;                      // touch moved — was a scroll
      if(Date.now()-_tapStartMs<120)return;     // too quick — accidental graze
      _setAyahMark(surahNum,ayahNum);
    };
    return card;
  }

  function setupSentinel(){
    if(_renderedTo>=total)return;
    _sentinel=document.createElement('div');
    _sentinel.className='ayah-load-sentinel';
    list.insertBefore(_sentinel,nav);
    _sentinelObs=new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting){
        _sentinelObs.disconnect();_sentinelObs=null;
        if(_sentinel&&_sentinel.parentNode)_sentinel.parentNode.removeChild(_sentinel);_sentinel=null;
        appendBatch(_renderedTo+1,_renderedTo+BATCH,false);
      }
    },{root:$('ayahList'),rootMargin:'500px'});
    _sentinelObs.observe(_sentinel);
  }

  function appendBatch(from,to,sync,onTarget,targetAyah){
    var end=Math.min(to,total);
    if(sync===false){
      // rAF staggered: 12 cards per frame for subsequent batches
      var SUB=12,cur=from;
      (function renderFrame(){
        if(S.surah!==surahNum||!nav.parentNode)return; // surah changed while rendering — bail
        var frameEnd=Math.min(cur+SUB-1,end);
        var frag=document.createDocumentFragment();
        for(var i=cur;i<=frameEnd;i++){var c=buildCard(i);if(window._onNewAyahCard)window._onNewAyahCard(c);frag.appendChild(c);}
        list.insertBefore(frag,nav);
        // Fire scroll callback the frame the target card lands in DOM
        if(onTarget&&targetAyah&&frameEnd>=targetAyah){var cb=onTarget;onTarget=null;cb();}
        cur=frameEnd+1;
        if(cur<=end&&!document.hidden)requestAnimationFrame(renderFrame);
        else if(cur<=end){setTimeout(function(){if(!document.hidden)requestAnimationFrame(renderFrame);},200);}
        else{_renderedTo=end;setupSentinel();if(onTarget){onTarget=null;}}
      })();
    }else{
      // Synchronous for first batch — fast initial render
      var frag=document.createDocumentFragment();
      for(var i=from;i<=end;i++){var c=buildCard(i);if(window._onNewAyahCard)window._onNewAyahCard(c);frag.appendChild(c);}
      _renderedTo=end;
      list.insertBefore(frag,nav);
      setupSentinel();
    }
  }

  // Always sync-render only the first BATCH — never block main thread on large surahs
  appendBatch(1,BATCH,true);
  // Restore any active playback highlight state onto the freshly-rendered cards
  requestAnimationFrame(_hlRestoreAll);

  // Progress
  updateProgress(list,total);

  // Restore position mark timer if there's an active mark for this surah
  if(_markState){
    clearTimeout(_ayahMarkTimer);
    var _remaining=_markState.expiresAt-Date.now();
    _ayahMarkTimer=setTimeout(function(){
      var c=document.querySelector('.ayah-card--marked');
      if(c)c.classList.remove('ayah-card--marked');
      localStorage.removeItem('ayahMark');
    },_remaining);
  }

  // Jump to target ayah — instant scroll, no smooth animation
  if(scrollTo&&scrollTo>1){
    var _jumpDone=false;
    function _jumpScroll(){
      if(_jumpDone)return;_jumpDone=true;
      var card=list.querySelector('[data-ayah="'+scrollTo+'"]');
      if(!card)return;
      var lRect=list.getBoundingClientRect();
      var cRect=card.getBoundingClientRect();
      list.scrollTop+=cRect.top-lRect.top-Math.max(0,(list.clientHeight-cRect.height)/2);
    }
    if(scrollTo<=BATCH){
      // Card already in DOM — scroll next frame
      requestAnimationFrame(_jumpScroll);
    }else{
      // Render cards up to target async (rAF-batched), scroll the moment target lands
      appendBatch(BATCH+1,scrollTo+3,false,_jumpScroll,scrollTo);
    }
  }
}

// Track active progress listener so we can clean up on surah switch
var _progressCleanup=null;
// Track mushaf lazy-load observer so we can disconnect on re-render
var _mushafLazyObs=null;

// RAF-based smooth scroll for mushaf — ease-out-cubic, self-cancelling.
// Avoids browser smooth-scroll which jank on iOS WebView (300-800ms lag).
var _mushafScrollAnim=null;
function _mushafSmoothScrollTo(view,targetTop,duration){
  if(_mushafScrollAnim){_mushafScrollAnim.cancelled=true;}
  targetTop=Math.max(0,Math.round(targetTop));
  var startTop=view.scrollTop;
  var delta=targetTop-startTop;
  if(Math.abs(delta)<2){return;}
  var anim={cancelled:false};
  _mushafScrollAnim=anim;
  var t0=null;
  function step(ts){
    if(anim.cancelled)return;
    if(!t0)t0=ts;
    var prog=Math.min((ts-t0)/duration,1);
    var ease=1-Math.pow(1-prog,3); // ease-out-cubic — fast start, gentle landing
    view.scrollTop=startTop+delta*ease;
    if(prog<1)requestAnimationFrame(step);
    else _mushafScrollAnim=null;
  }
  requestAnimationFrame(step);
}
// Ayah position marker — 2-minute highlight so user knows where they are
var _ayahMarkTimer=null;
var _ayahMarkLpAt=0;  // timestamp of last long-press mark, to suppress following click event
var _tapStartMs=0;    // touchstart timestamp — used to require minimum hold duration for tap highlight
var _tapMoved=false;  // true if touch moved ≥6px — prevents scroll from triggering highlight
function _setAyahMark(surahNum,ayahNum){
  clearTimeout(_ayahMarkTimer);
  // Remove existing highlight
  var prev=document.querySelector('.ayah-card--marked');
  if(prev)prev.classList.remove('ayah-card--marked');
  // Toggle off if tapping the same already-marked ayah
  var cur=null;
  try{cur=JSON.parse(localStorage.getItem('ayahMark'));}catch(e){}
  if(cur&&cur.surah===surahNum&&cur.ayah===ayahNum&&cur.expiresAt>Date.now()){
    localStorage.removeItem('ayahMark');
    return;
  }
  // Set new mark
  var expiresAt=Date.now()+2*60*1000;
  try{localStorage.setItem('ayahMark',JSON.stringify({surah:surahNum,ayah:ayahNum,expiresAt:expiresAt}));}catch(e){}
  var card=document.querySelector('.ayah-card[data-ayah="'+ayahNum+'"]');
  if(card)card.classList.add('ayah-card--marked');
  haptic([8]);
  _ayahMarkTimer=setTimeout(function(){
    var c=document.querySelector('.ayah-card--marked');
    if(c)c.classList.remove('ayah-card--marked');
    localStorage.removeItem('ayahMark');
  },expiresAt-Date.now());
}

function updateProgress(list,total){
  window._onNewAyahCard=null; // clear immediately so old hook can't fire on new surah's cards
  if(_progressCleanup){_progressCleanup();_progressCleanup=null}

  var progressEl=document.querySelector('.sticky-progress');
  var surahId=S.surah;
  var scrollEl=$('ayahList');
  var saveTimer=null;
  var destroyed=false;

  // Always show progress bar
  if(progressEl)progressEl.style.display='';

  // One-time migration: clear all old incorrectly-saved progress data
  if(localStorage.getItem('surah_progress_ver')!=='10'){
    var _pk=[];for(var _pi=0;_pi<localStorage.length;_pi++){var _k=localStorage.key(_pi);if(_k)_pk.push(_k);}
    _pk.forEach(function(k){if(k.indexOf('surah_progress_')===0||k.indexOf('surah_read_')===0)localStorage.removeItem(k);});
    localStorage.setItem('surah_progress_ver','10');
  }

  // Progress = highest ayah number that's been visible on screen.
  // Scroll to ayah 1 → 1/total. Scroll further → count increases naturally.
  var maxSeen=0;
  try{
    var saved=parseInt(localStorage.getItem('surah_read_v3_'+surahId))||0;
    if(saved>=1&&saved<=total)maxSeen=saved;
  }catch(e){}

  var _rafPending=false;
  function updateHeader(){
    if(destroyed||S.surah!==surahId)return;
    if(_rafPending)return;
    _rafPending=true;
    requestAnimationFrame(function(){
      _rafPending=false;
      if(destroyed||S.surah!==surahId)return;
      if(maxSeen>0){try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:maxSeen}))}catch(e){}}
      var pct=Math.min(100,Math.round(maxSeen/total*100));
      $('readerProgressFill').style.width=pct+'%';
      $('readerAyahLabel').textContent=maxSeen+'/'+total+' '+t('reader.ayah');
      $('readerPct').textContent=pct+'%';
    });
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      if(destroyed||S.surah!==surahId)return;
      try{localStorage.setItem('surah_read_v3_'+surahId,String(maxSeen))}catch(e){}
      try{localStorage.setItem('surah_scroll_'+surahId,String(scrollEl.scrollTop))}catch(e){}
      debouncedSync();
    },300);
  }

  // Show saved progress on open
  if(maxSeen>0)updateHeader();

  // IntersectionObserver: browser tracks visibility natively — zero reflow, zero polling
  var _ioProgress=new IntersectionObserver(function(entries){
    if(destroyed||S.surah!==surahId)return;
    var highest=maxSeen;
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      var idx=parseInt(entry.target.dataset.ayah)||0;
      if(idx&&idx<=total&&idx>highest)highest=idx;
    });
    if(highest>maxSeen){
      var prevMax=maxSeen;
      maxSeen=highest;
      for(var _av=prevMax+1;_av<=maxSeen;_av++){trackVerse(surahId,_av);}
      updateHeader();
      scheduleSave();
    }
  },{root:scrollEl,threshold:0.1});

  // Observe cards already in DOM
  list.querySelectorAll('.ayah-card').forEach(function(c){_ioProgress.observe(c);});

  // New cards appended during progressive loading get observed automatically
  window._onNewAyahCard=function(c){_ioProgress.observe(c);};

  _progressCleanup=function(){
    destroyed=true;
    _ioProgress.disconnect();
    clearTimeout(saveTimer);
    window._onNewAyahCard=null;
  };
}

function updateMushafProgress(view){
  if(_progressCleanup){_progressCleanup();_progressCleanup=null;}

  var sessionSurah=S.surah; // surah that opened this mushaf session
  var destroyed=false;
  var saveTimer=null;
  var dwellTimer=null;var dwellPage=null;var retryTimer=null;
  var scrollTick=null;var initTimer=null;var periodic=null;
  var markedPages=new Set();

  // Always show the progress bar in mushaf mode
  var progressEl=document.querySelector('.sticky-progress');
  if(progressEl)progressEl.style.display='';

  // ── All-Quran totals ──────────────────────────────────────────────────────
  var _totalQ=0;SURAHS.forEach(function(s){_totalQ+=s.a;});

  // ── Per-surah seen sets, loaded lazily from localStorage ─────────────────
  var _surahSeen={}; // surahNum (int) → Set<ayahNum>
  function _getSeen(sn){
    sn=parseInt(sn);
    if(!_surahSeen[sn]){
      var s=SURAHS[sn-1];
      var set=new Set();
      if(s){try{JSON.parse(localStorage.getItem('surah_progress_'+sn)||'[]')
        .forEach(function(n){if(n>=1&&n<=s.a)set.add(n);});}catch(e){}}
      _surahSeen[sn]=set;
    }
    return _surahSeen[sn];
  }
  // ── Dirty-save tracker — saves all modified surahs in one debounced flush ─
  var _dirty=new Set();
  function scheduleSave(sn){
    _dirty.add(parseInt(sn));
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      if(destroyed)return;
      _dirty.forEach(function(dirtyS){
        var set=_getSeen(dirtyS);
        var s2=SURAHS[dirtyS-1];if(!s2)return;
        var valid=[];set.forEach(function(n){if(n>=1&&n<=s2.a)valid.push(n);});
        try{localStorage.setItem('surah_progress_'+dirtyS,JSON.stringify(valid));}catch(e){}
      });
      _dirty.clear();
      debouncedSync();
    },400);
  }

  // ── Current visible surah (updates on scroll) ─────────────────────────────
  var _currentSurah=sessionSurah;
  function _detectSurah(){
    // Find the last surah banner whose top is at/above the current scroll position
    var banners=view.querySelectorAll('.mushaf-surah-banner[data-surah]');
    if(!banners.length)return _currentSurah;
    var scrollTop=view.scrollTop;
    var best=null;var bestTop=-1;
    for(var b=0;b<banners.length;b++){
      var bTop=banners[b].offsetTop;
      if(bTop<=scrollTop+80&&bTop>bestTop){bestTop=bTop;best=banners[b];}
    }
    if(!best)best=banners[0]; // all banners below fold — show first surah
    return parseInt(best.dataset.surah)||_currentSurah;
  }

  // ── Update visible label + all-Quran bar ─────────────────────────────────
  function updateHeader(){
    if(destroyed)return;
    var dispS=_currentSurah||sessionSurah;
    var sData=SURAHS[(dispS||1)-1];
    var total=sData?sData.a:0;
    var seen=_getSeen(dispS);
    var count=Math.min(seen.size,total);

    // Ayah label = per-surah progress
    var lbl=$('readerAyahLabel');
    if(lbl)lbl.textContent=count+'/'+total+' '+t('reader.ayah');

    // Bar + % = positional all-Quran progress (cumulative ayahs up to current surah)
    var cumul=0;
    for(var ci=1;ci<=dispS;ci++){var cs=SURAHS[ci-1];if(cs)cumul+=cs.a;}
    var allPct=_totalQ>0?Math.min(100,Math.round(cumul/_totalQ*100)):0;
    var fill=$('readerProgressFill');if(fill)fill.style.width=allPct+'%';
    var pctEl=$('readerPct');if(pctEl)pctEl.textContent=allPct+'%';

    // Update lastRead
    var max=0;seen.forEach(function(n){if(n>max)max=n;});
    if(max>0){try{localStorage.setItem('lastRead',JSON.stringify({surah:dispS,ayah:max}));}catch(e){}}
  }

  // ── Mark a single ayah seen ───────────────────────────────────────────────
  function markAyahSeen(sn,vn){
    sn=parseInt(sn);vn=parseInt(vn);
    var s2=SURAHS[sn-1];if(!s2||vn<1||vn>s2.a)return false;
    var set=_getSeen(sn);
    if(set.has(vn))return false;
    set.add(vn);
    trackVerse(sn,vn);
    return true;
  }

  // ── Mark a whole page seen (uses verseKeys for multi-surah pages) ─────────
  function markPage(pageEl){
    var changed=false;var changedSurahs={};
    var vks=[];
    try{vks=JSON.parse(pageEl.dataset.verseKeys||'[]');}catch(e){}
    if(vks.length){
      vks.forEach(function(vk){
        var p=vk.split(':');
        if(markAyahSeen(p[0],p[1])){changed=true;changedSurahs[parseInt(p[0])]=true;}
      });
    } else {
      // Fallback: verseKeys not yet set (page loaded before this session started)
      var vns=[];try{vns=JSON.parse(pageEl.dataset.verses||'[]');}catch(e){}
      vns.forEach(function(vn){if(markAyahSeen(sessionSurah,vn)){changed=true;changedSurahs[sessionSurah]=true;}});
    }
    if(changed){
      updateHeader();
      Object.keys(changedSurahs).forEach(function(sn){scheduleSave(sn);});
    }
  }

  // Show saved progress immediately on open
  updateHeader();

  // ── Dwell tracking: mark page after 2.5s of dominance ───────────────────
  function visibleRatio(pageEl){
    var pr=pageEl.getBoundingClientRect();
    if(pr.right<=0||pr.left>=window.innerWidth)return 0;
    var top=Math.max(pr.top,0);
    var bot=Math.min(pr.bottom,window.innerHeight);
    return Math.max(0,bot-top)/Math.max(1,window.innerHeight);
  }

  function checkVisible(){
    if(destroyed)return;
    // Update which surah label to show
    var newSurah=_detectSurah();
    if(newSurah!==_currentSurah){_currentSurah=newSurah;updateHeader();}

    var pages=view.querySelectorAll('.mushaf-text-page');
    var bestRatio=0;var bestPage=null;
    pages.forEach(function(pageEl){
      var r=visibleRatio(pageEl);
      if(r>bestRatio){bestRatio=r;bestPage=pageEl;}
    });
    var bestPn=bestPage?bestPage.dataset.page||'0':null;
    if(dwellPage&&(dwellPage!==bestPage||bestRatio<0.3)){
      clearTimeout(dwellTimer);dwellTimer=null;dwellPage=null;
    }
    if(bestPage&&bestRatio>=0.35&&!dwellTimer&&!markedPages.has(bestPn)){
      dwellPage=bestPage;
      dwellTimer=setTimeout(function(){
        dwellTimer=null;dwellPage=null;
        if(destroyed)return;
        markedPages.add(bestPn);
        if(bestPage.dataset.verseKeys||bestPage.dataset.verses){
          markPage(bestPage);
        } else {
          retryTimer=setTimeout(function(){
            retryTimer=null;
            if(!destroyed&&(bestPage.dataset.verseKeys||bestPage.dataset.verses))markPage(bestPage);
          },2000);
        }
      },2500);
    }
  }

  var onScroll=function(){
    if(scrollTick)return;
    scrollTick=setTimeout(function(){scrollTick=null;checkVisible();},150);
  };
  window.addEventListener('scroll',onScroll,{passive:true,capture:true});
  view.addEventListener('scroll',onScroll,{passive:true});
  initTimer=setTimeout(checkVisible,500);
  periodic=setInterval(checkVisible,3000);

  _progressCleanup=function(){
    destroyed=true;
    clearTimeout(saveTimer);clearTimeout(initTimer);clearTimeout(scrollTick);
    clearTimeout(dwellTimer);clearTimeout(retryTimer);clearInterval(periodic);
    window.removeEventListener('scroll',onScroll,{capture:true});
    view.removeEventListener('scroll',onScroll);
  };
}

// Re-initialize progress tracking in-place (called when goal is created or deleted while a surah is open)
function _restartProgressTracking(){
  if(!S.surah)return;
  if(S.mushafMode){
    var mv=$('mushafView');
    if(mv)updateMushafProgress(mv);
  } else {
    var list=document.querySelector('.ayah-list');
    var s=SURAHS[(S.surah||1)-1];
    if(list&&s)updateProgress(list,s.a);
  }
}

/* ===== SIDEBAR ===== */
App.openSidebar=function(){
  haptic([8]);
  S.sidebar=true;
  $('sidebarOverlay').classList.add('on');
  $('sidebar').classList.add('on');
  renderSidebarList();
};
App.closeSidebar=function(){
  haptic([8]);
  S.sidebar=false;
  $('sidebarOverlay').classList.remove('on');
  $('sidebar').classList.remove('on');
};

/* ===== READER QUICK SETTINGS ===== */
App.openReaderSettings=function(){
  if(S.mushafMode){App.openMushafSettings();return;}
  $('qsOverlay').classList.add('on');
  var qs=$('qsSheet');
  qs.style.display='';
  qs.classList.add('on');
  // Push sheet above audio bar if it's visible
  var _ab=$('audioBar');
  var _abH=(_ab&&_ab.classList.contains('on'))?_ab.offsetHeight:0;
  qs.style.paddingBottom=_abH>0?'calc(var(--safe-b) + '+(_abH+8)+'px)':'';
  renderReaderSettings();
};
App.closeReaderSettings=function(){
  $('qsOverlay').classList.remove('on');
  var qs=$('qsSheet');
  qs.classList.remove('on');
  qs.style.display='none';
};
function applyShowTafsir(){
  document.querySelectorAll('.ayah-tafsir').forEach(function(el){
    el.classList.toggle('hide',!S.showTafsir);
  });
}
function renderReaderSettings(){
  var body=$('qsBody');
  clear(body);

  /* ---- READING ---- */
  body.appendChild(el('div','qs-section-title',t('settings.reading')||'خوێندن'));

  // Show tafsir
  var tafRow=el('div','qs-row');
  tafRow.appendChild(el('div','qs-row-label',t('settings.show_tafsir')));
  var tafToggle=el('div','toggle'+(S.showTafsir?' on':''));
  tafToggle.appendChild(el('div','toggle-knob'));
  on(tafToggle,'click',function(){
    S.showTafsir=!S.showTafsir;
    localStorage.setItem('showTafsir',String(S.showTafsir));
    tafToggle.classList.toggle('on',S.showTafsir);
    applyShowTafsir();
  });
  tafRow.appendChild(tafToggle);
  body.appendChild(tafRow);

  // Keep screen awake
  var kaRow=el('div','qs-row');
  kaRow.appendChild(el('div','qs-row-label',t('qs.screen_lock')));
  var kaToggle=el('div','toggle'+(S.keepAwake?' on':''));
  kaToggle.appendChild(el('div','toggle-knob'));
  on(kaToggle,'click',function(){
    S.keepAwake=!S.keepAwake;
    localStorage.setItem('keepAwake',String(S.keepAwake));
    kaToggle.classList.toggle('on',S.keepAwake);
    applyKeepAwake();
  });
  kaRow.appendChild(kaToggle);
  body.appendChild(kaRow);

  /* ---- ARABIC FONT ---- */
  body.appendChild(el('div','qs-section-title',t('qs.quran_font_section')));
  var rfFonts=[
    {id:'hafs',  label:'KFGQPC Hafs', family:"'KFGQPC Hafs',serif"},
    {id:'amiri', label:'Amiri Quran', family:"'Amiri Quran',serif"}
  ];
  var rfBar=el('div','qs-font-cards');
  rfFonts.forEach(function(f){
    var card=el('div','qs-font-card'+(S.readerFont===f.id?' on':''));
    var sample=el('div','qs-font-card-sample');
    sample.textContent='بِسْمِ اللَّهِ';
    sample.style.fontFamily=f.family;
    var lbl=el('div','qs-font-card-label',f.label);
    card.appendChild(sample);
    card.appendChild(lbl);
    on(card,'click',function(){
      if(S.readerFont===f.id)return;
      S.readerFont=f.id;
      S.glyphVerses={};
      localStorage.setItem('readerFont',f.id);
      applySizes();
      haptic([6]);
      if(S.surah)renderAyahs(S.surah);
      renderReaderSettings();
    });
    rfBar.appendChild(card);
  });
  body.appendChild(rfBar);

  /* ---- TEXT SIZE ---- */
  body.appendChild(el('div','qs-section-title',t('qs.text_size')));

  // Live preview box — updates in real-time because applySizes() sets CSS vars
  var prev=el('div','qs-font-preview');
  var prevAr=el('div','qs-font-preview-ar');
  prevAr.textContent='بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ';
  var prevTf=el('div','qs-font-preview-tf');
  prevTf.textContent=t('settings.quran_reading_intention');
  prev.appendChild(prevAr);prev.appendChild(prevTf);
  body.appendChild(prev);

  // Arabic font size
  var arRow=el('div','qs-row');
  arRow.appendChild(el('div','qs-row-label',t('settings.arabic_size')));
  (function(){
    var cur=S.arSize,min=1.0,max=3.5,step=0.1;
    var ctrl=el('div','setting-stepper');
    var mBtn=el('button','stepper-btn','-');var vEl=el('span','stepper-val',cur.toFixed(1));var pBtn=el('button','stepper-btn','+');
    function upd(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;cur=v;vEl.textContent=v.toFixed(1);mBtn.disabled=(v<=min);pBtn.disabled=(v>=max);S.arSize=v;applySizes();localStorage.setItem('app_arSize',String(v));}
    on(mBtn,'click',function(){haptic([6]);upd(parseFloat((cur-step).toFixed(1)));});
    on(pBtn,'click',function(){haptic([6]);upd(parseFloat((cur+step).toFixed(1)));});
    mBtn.disabled=(cur<=min);pBtn.disabled=(cur>=max);
    ctrl.appendChild(mBtn);ctrl.appendChild(vEl);ctrl.appendChild(pBtn);arRow.appendChild(ctrl);
  })();
  body.appendChild(arRow);

  // Tafsir font size
  var tfRow=el('div','qs-row');
  tfRow.appendChild(el('div','qs-row-label',t('settings.tafsir_size')));
  (function(){
    var cur=S.tfSize,min=0.5,max=2.0,step=0.1;
    var ctrl=el('div','setting-stepper');
    var mBtn=el('button','stepper-btn','-');var vEl=el('span','stepper-val',cur.toFixed(1));var pBtn=el('button','stepper-btn','+');
    function upd(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;cur=v;vEl.textContent=v.toFixed(1);mBtn.disabled=(v<=min);pBtn.disabled=(v>=max);S.tfSize=v;applySizes();localStorage.setItem('app_tfSize',String(v));}
    on(mBtn,'click',function(){haptic([6]);upd(parseFloat((cur-step).toFixed(1)));});
    on(pBtn,'click',function(){haptic([6]);upd(parseFloat((cur+step).toFixed(1)));});
    mBtn.disabled=(cur<=min);pBtn.disabled=(cur>=max);
    ctrl.appendChild(mBtn);ctrl.appendChild(vEl);ctrl.appendChild(pBtn);tfRow.appendChild(ctrl);
  })();
  body.appendChild(tfRow);

  // Line spacing
  var lhRow=el('div','qs-row');
  lhRow.appendChild(el('div','qs-row-label',t('qs.line_spacing')));
  (function(){
    var cur=S.lineH,min=1.4,max=3.5,step=0.1;
    var ctrl=el('div','setting-stepper');
    var mBtn=el('button','stepper-btn','-');var vEl=el('span','stepper-val',cur.toFixed(1));var pBtn=el('button','stepper-btn','+');
    function upd(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;cur=v;vEl.textContent=v.toFixed(1);mBtn.disabled=(v<=min);pBtn.disabled=(v>=max);S.lineH=v;applySizes();localStorage.setItem('app_lineH',String(v));}
    on(mBtn,'click',function(){haptic([6]);upd(parseFloat((cur-step).toFixed(1)));});
    on(pBtn,'click',function(){haptic([6]);upd(parseFloat((cur+step).toFixed(1)));});
    mBtn.disabled=(cur<=min);pBtn.disabled=(cur>=max);
    ctrl.appendChild(mBtn);ctrl.appendChild(vEl);ctrl.appendChild(pBtn);lhRow.appendChild(ctrl);
  })();
  body.appendChild(lhRow);

  /* ---- RECITER ---- */
  body.appendChild(el('div','qs-section-title',t('audio.reciter')||'خوێنەر'));
  var recList=el('div','qs-reciter-list');
  RECITERS.forEach(function(r){
    var chip=el('div','qs-reciter-chip'+(RECITER===r.id?' on':''));
    chip.dataset.reciterId=r.id;
    // Avatar
    var chipAvatar=el('div','qs-reciter-chip-avatar');
    var photo=RECITER_PHOTOS[r.id];
    if(photo){var img=document.createElement('img');img.src=photo;img.alt='';chipAvatar.appendChild(img);}
    else{var initials=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');chipAvatar.appendChild(el('span','qs-reciter-chip-avatar-initials',initials));}
    chip.appendChild(chipAvatar);
    chip.appendChild(document.createTextNode(r.name));
    on(chip,'click',function(){
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      if(window.AudioCache)AudioCache.cancelBg();
      updateAudioBarAvatar();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      recList.querySelectorAll('.qs-reciter-chip').forEach(function(c){c.classList.remove('on');});
      chip.classList.add('on');
    });
    recList.appendChild(chip);
  });
  body.appendChild(recList);

  /* ---- ACTIONS ---- */
  body.appendChild(el('div','qs-section-title',t('qs.actions')));

  // Jump to ayah (only when surah open)
  if(S.surah){
    var s=SURAHS[S.surah-1];
    var jumpRow=el('div','qs-jump-row');
    jumpRow.appendChild(el('div','qs-row-label',t('qs.jump_to')));
    var jumpInput=document.createElement('input');
    jumpInput.type='number';jumpInput.className='qs-jump-input';
    jumpInput.min='1';jumpInput.max=s?String(s.a):'286';jumpInput.placeholder='١';
    var jumpBtn=el('button','qs-jump-btn',t('qs.go'));
    on(jumpBtn,'click',function(){
      var n=parseInt(jumpInput.value);
      if(n>=1&&(!s||n<=s.a)){App.closeReaderSettings();scrollToAyah(n);}
    });
    on(jumpInput,'keydown',function(e){if(e.key==='Enter')jumpBtn.click();});
    jumpRow.appendChild(jumpInput);jumpRow.appendChild(jumpBtn);
    body.appendChild(jumpRow);
  }

  // Scroll to playing ayah (only when audio playing in current surah)
  if(S.audio.playing&&S.audio.surah===S.surah){
    var scrollBtn=el('button','qs-action-btn');
    scrollBtn.appendChild(icon('fas fa-headphones'));
    scrollBtn.appendChild(document.createTextNode(' '+t('qs.jump_audio')));
    on(scrollBtn,'click',function(){App.closeReaderSettings();scrollToAyah(S.audio.ayah);});
    body.appendChild(scrollBtn);
  }
}
App.sidebarTab=function(mode){
  S.sidebarMode=mode;
  document.querySelectorAll('.sidebar-tab').forEach(function(t){
    t.classList.toggle('on',t.getAttribute('data-st')===mode);
  });
  renderSidebarList();
};

function renderSidebarList(){
  var list=$('sidebarList');
  clear(list);
  if(S.sidebarMode==='surah'){
    SURAHS.forEach(function(s){
      var item=el('div','sidebar-item'+(S.surah===s.n?' on':''));
      item.appendChild(el('div','sidebar-item-num',String(s.n)));
      var txt=el('span','',s.en+' - '+s.ar);
      item.appendChild(txt);
      on(item,'click',function(){App.closeSidebar();App.openSurah(s.n)});
      list.appendChild(item);
    });
  } else {
    Object.keys(JUZS).forEach(function(j){
      var item=el('div','sidebar-item');
      item.appendChild(el('div','sidebar-item-num',j));
      var sn=SURAHS[JUZS[j]-1];
      item.appendChild(el('span','',t('sidebar.juz_num',{num:j})+(sn?' - '+sn.en:'')));
      on(item,'click',function(){App.closeSidebar();App.openSurah(JUZS[j])});
      list.appendChild(item);
    });
  }
}

/* ===== MUSHAF PLAY BUTTON ===== */
function updateMushafPlayBtn(){
  var btn=$('mushafPlayBtn');
  if(!btn)return;
  var isPlaying=S.audio.playing&&S.audio.surah===S.surah;
  btn.innerHTML='';
  btn.appendChild(icon(isPlaying?'fas fa-pause':'fas fa-play'));
}
App.mushafPlayToggle=function(){
  haptic([8]);
  if(S.audio.playing&&S.audio.surah===S.surah){
    App.audioClose();
  } else {
    playAyah(S.surah,1);
  }
};

/* ===== QURAN AUDIO HIGHLIGHT STATE MACHINE ===== */
// Tracks current/next/read state for both reader and mushaf modes.
// Only updates the elements that change — no full DOM scan per ayah.
var _hl={currentKey:null,nextKey:null,currentEls:[],nextEls:[],readMap:{}};

function _hlKey(s,a){return String(s)+':'+String(a);}

function _hlEls(key,mode){
  if(mode==='mushaf')return window._mushafVerseElements[key]||[];
  var list=$('ayahList');if(!list)return[];
  var ayah=key.split(':')[1];
  var card=list.querySelector('.ayah-card[data-ayah="'+ayah+'"]');
  return card?[card]:[];
}

function _hlSet(els,cls,add){
  for(var i=0;i<els.length;i++){if(add)els[i].classList.add(cls);else els[i].classList.remove(cls);}
}

// Called every time the playing ayah changes — updates only the diff.
function updateHighlight(surah,ayah){
  if(!surah||!ayah){clearAllHighlights();return;}
  var mode=S.mushafMode?'mushaf':'reader';
  var CC=mode==='mushaf'?'mushaf-ayah-seg--current':'quran-ayah--current';
  var NC=mode==='mushaf'?'mushaf-ayah-seg--next':'quran-ayah--next';
  var RC=mode==='mushaf'?'mushaf-ayah-seg--read':'quran-ayah--read';
  var newKey=_hlKey(surah,ayah);

  // Demote previous current → read
  if(_hl.currentKey&&_hl.currentKey!==newKey){
    _hlSet(_hl.currentEls,CC,false);
    _hlSet(_hl.currentEls,RC,true);
    if(!_hl.readMap[_hl.currentKey])_hl.readMap[_hl.currentKey]=_hl.currentEls.slice();
  }

  // Retire old next if it won't become current
  if(_hl.nextKey&&_hl.nextKey!==newKey){
    _hlSet(_hl.nextEls,NC,false);
    _hl.nextKey=null;_hl.nextEls=[];
  }

  // Apply current — re-trigger animation by removing then re-adding in next frame.
  // In performance mode (body.mushaf-audio-playing) the animation is suppressed by CSS
  // so this only costs a class toggle, not a full paint cycle.
  var _hlT0=Date.now();
  var newEls=_hlEls(newKey,mode);
  _hl.currentKey=newKey;_hl.currentEls=newEls;
  _hlSet(newEls,RC,false);_hlSet(newEls,NC,false);
  _hlSet(newEls,CC,false);
  requestAnimationFrame(function(){_hlSet(newEls,CC,true);});

  // Mark next ayah as up-next — mushaf mode only
  if(mode==='mushaf'){
    var nxt=_nextAyahPos(surah,ayah);
    if(nxt){
      var nxtKey=_hlKey(nxt.surah,nxt.ayah);
      if(nxtKey!==newKey){
        var nxtEls=_hlEls(nxtKey,mode);
        _hl.nextKey=nxtKey;_hl.nextEls=nxtEls;
        _hlSet(nxtEls,RC,false);_hlSet(nxtEls,CC,false);_hlSet(nxtEls,NC,true);
      }
    }
  }

  // Mushaf: scroll to current ayah + notify tafsir sheet
  if(mode==='mushaf'){
    var view=$('mushafView');
    if(view&&S.scrollFollowsAudio){
      if(newEls.length){
        // Find the first element actually inside the mushaf view
        var _scrollTarget=null;
        for(var i=0;i<newEls.length;i++){
          if(view.contains(newEls[i])){_scrollTarget=newEls[i];break;}
        }
        if(_scrollTarget){
          // Defer to next RAF so layout reads never block audio start.
          var _scrollEl=_scrollTarget,_isPlaying=S.audio.playing;
          requestAnimationFrame(function(){
            var vr=view.getBoundingClientRect();
            var er=_scrollEl.getBoundingClientRect();
            // Safe zone: middle 64% of view — only scroll when ayah drifts outside it
            var _margin=vr.height*0.18;
            var _inSafe=(er.top>=vr.top+_margin&&er.bottom<=vr.bottom-_margin);
            if(_inSafe){return;}
            // Position ayah at 38% from top — leaves space below for next-ayah preview
            var relTop=er.top-vr.top+view.scrollTop;
            var targetTop=relTop-vr.height*0.38+er.height/2;
            _mushafSmoothScrollTo(view,targetTop,_isPlaying?220:320);
          });
        }
      } else if(S.audio.playing) {
        // Target page not loaded yet — bootstrap-scroll to estimated position so
        // the IntersectionObserver fires, loads the page, then retry finds elements.
        _scrollMushafToAyah(surah,ayah);
      }
    }
    if(window._mushafTafsirSheetUpdate)window._mushafTafsirSheetUpdate(surah,ayah);
    var _hlMs=Date.now()-_hlT0;
    if(_hlMs>4)console.log('[MushafJank] highlightMs='+_hlMs+' elCount='+newEls.length+' key='+newKey);
  }
  // Always sync performance mode class — must run for both mushaf AND reader
  // so switching mushaf→reader while audio plays correctly removes the class.
  document.body.classList.toggle('mushaf-audio-playing',!!(S.mushafMode&&S.audio.playing));
}

// Re-apply all active highlight states to elements on a newly-rendered Mushaf page.
// _mushafVerseElements is always up-to-date at this point; _hl caches may lag.
function _hlRestoreMushafPage(pageEl){
  if(!pageEl||!_hl.currentKey||!S.mushafMode)return;
  var CC='mushaf-ayah-seg--current',NC='mushaf-ayah-seg--next',RC='mushaf-ayah-seg--read';
  (window._mushafVerseElements[_hl.currentKey]||[]).forEach(function(e){
    if(pageEl.contains(e)){e.classList.add(CC);if(_hl.currentEls.indexOf(e)<0)_hl.currentEls.push(e);}
  });
  if(_hl.nextKey){
    (window._mushafVerseElements[_hl.nextKey]||[]).forEach(function(e){
      if(pageEl.contains(e)){e.classList.add(NC);if(_hl.nextEls.indexOf(e)<0)_hl.nextEls.push(e);}
    });
  }
  Object.keys(_hl.readMap).forEach(function(k){
    (window._mushafVerseElements[k]||[]).forEach(function(e){
      if(pageEl.contains(e)){e.classList.add(RC);
        if(_hl.readMap[k].indexOf(e)<0)_hl.readMap[k].push(e);}
    });
  });
}

// Strip CSS classes from DOM elements and zero element-ref arrays.
// Preserves currentKey/nextKey/readMap keys so state can be restored after DOM rebuilds.
function _hlClearDom(){
  var ALL=['mushaf-ayah-seg--current','mushaf-ayah-seg--next','mushaf-ayah-seg--read',
           'quran-ayah--current','quran-ayah--next','quran-ayah--read'];
  var seen=(_hl.currentEls||[]).concat(_hl.nextEls||[]);
  Object.keys(_hl.readMap).forEach(function(k){seen=seen.concat(_hl.readMap[k]||[]);});
  seen.forEach(function(e){ALL.forEach(function(c){e.classList.remove(c);});});
  var view=$('mushafView');
  if(view)ALL.forEach(function(c){view.querySelectorAll('.'+c).forEach(function(e){e.classList.remove(c);});});
  var list=$('ayahList');
  if(list)ALL.forEach(function(c){list.querySelectorAll('.'+c).forEach(function(e){e.classList.remove(c);});});
  _hl.currentEls=[];_hl.nextEls=[];
  Object.keys(_hl.readMap).forEach(function(k){_hl.readMap[k]=[];});
}

// Full reset — only call when playback actually ends (audioClose, surah change, etc.)
function clearAllHighlights(){
  _hlClearDom();
  _hl.currentKey=null;_hl.nextKey=null;_hl.readMap={};
}

// Re-apply saved highlight state to current DOM without touching _hl keys.
// Called after tab switch back to Quran, after renderAyahs, after mushaf page render.
function _hlRestoreAll(){
  if(!_hl.currentKey)return; // no active audio session — nothing to restore
  var mode=S.mushafMode?'mushaf':'reader';
  if(mode==='reader'){
    var playSurah=parseInt(_hl.currentKey.split(':')[0],10);
    if(playSurah!==S.surah)return;
  }
  var CC=mode==='mushaf'?'mushaf-ayah-seg--current':'quran-ayah--current';
  var NC=mode==='mushaf'?'mushaf-ayah-seg--next':'quran-ayah--next';
  var RC=mode==='mushaf'?'mushaf-ayah-seg--read':'quran-ayah--read';
  var curEls=_hlEls(_hl.currentKey,mode);
  _hl.currentEls=curEls;_hlSet(curEls,CC,true);
  if(mode==='mushaf'&&_hl.nextKey){
    var nxtEls=_hlEls(_hl.nextKey,mode);
    _hl.nextEls=nxtEls;_hlSet(nxtEls,NC,true);
  }
  Object.keys(_hl.readMap).forEach(function(k){
    var els=_hlEls(k,mode);_hl.readMap[k]=els;_hlSet(els,RC,true);
  });
}

// Tab-switch/mode-toggle: clear DOM only — preserve state so _hlRestoreAll() can replay it
function clearMushafHighlights(){_hlClearDom();}
// Legacy alias — updateMushafHighlight(0,0) called from audioClose
function updateMushafHighlight(s,a){updateHighlight(s,a);}

// Pre-buffer the first ayah of the current surah into the audio element so
// the mushaf play button starts instantly (browser has already downloaded enough).
function _preBufferMushafAyah(){
  if(S.audio.playing)return;
  var url=audioUrl(S.surah,1);
  var localUri=(window.AudioDownloads&&AudioDownloads.getLocalUri(RECITER,S.surah,1))
              ||(window.AudioCache&&AudioCache.getLocalUri(RECITER,S.surah,1))||null;
  var slot=_pfCache[url];
  if(localUri||(slot&&slot.blob))return; // instant source already available
  if(S.audio.el.src===url)return; // already pre-buffering
  S.audio.el.src=url;
  S.audio.el.preload='auto';
}

