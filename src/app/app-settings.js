'use strict';

/* ===== SETTINGS ===== */
function mkToggleRow(labelText,isOn,onToggle,subText){
  var row=el('div','setting-row s-row');
  var left=el('div','setting-label-wrap');
  left.appendChild(el('div','setting-label',labelText));
  if(subText){left.appendChild(el('div','setting-sub',subText));}
  row.appendChild(left);
  var toggle=el('div','toggle'+(isOn?' on':''));
  toggle.appendChild(el('div','toggle-knob'));
  on(toggle,'click',function(){haptic([15]);onToggle();});
  row.appendChild(toggle);
  return row;
}
/* ===== SITE SETTINGS (shared source: images, social, about text) ===== */
var _ssCacheKey='siteSettings_v6';
var _ssCacheTTL=6*3600*1000;
var _ssMemory=null,_ssMemTs=0;

async function getSiteSettings(force){
  if(!force&&_ssMemory&&(Date.now()-_ssMemTs)<_ssCacheTTL)return _ssMemory;
  try{
    if(!force){var c=JSON.parse(localStorage.getItem(_ssCacheKey));
    if(c&&c.ts&&(Date.now()-c.ts)<_ssCacheTTL){_ssMemory=c.d;_ssMemTs=c.ts;return _ssMemory;}}
  }catch(e){}
  var sb=S.supabase;
  if(!sb){
    // Bare REST with cached config
    try{
      var cfg=JSON.parse(localStorage.getItem('supa_cfg'));
      if(cfg&&cfg.supabaseUrl&&cfg.supabaseKey){
        var r=await fetch(cfg.supabaseUrl+'/rest/v1/site_settings?select=key,value',{headers:{'apikey':cfg.supabaseKey,'Authorization':'Bearer '+cfg.supabaseKey}});
        var rows=await r.json();
        if(Array.isArray(rows)){
          var res={};rows.forEach(function(row){res[row.key]=row.value;});
          _ssMemory=res;_ssMemTs=Date.now();
          try{localStorage.setItem(_ssCacheKey,JSON.stringify({ts:_ssMemTs,d:res}));}catch(e){}
          return res;
        }
      }
    }catch(e){}
    try{var stale=JSON.parse(localStorage.getItem(_ssCacheKey));if(stale&&stale.d)return stale.d;}catch(e){}
    return {};
  }
  try{
    var qr=await sb.from('site_settings').select('key,value');
    if(qr.error||!qr.data)throw new Error('fetch');
    var res={};qr.data.forEach(function(row){res[row.key]=row.value;});
    _ssMemory=res;_ssMemTs=Date.now();
    try{localStorage.setItem(_ssCacheKey,JSON.stringify({ts:_ssMemTs,d:res}));}catch(e){}
    return res;
  }catch(e){
    try{var stale=JSON.parse(localStorage.getItem(_ssCacheKey));if(stale&&stale.d)return stale.d;}catch(e2){}
    return {};
  }
}

/* ===== ABOUT BOTTOM SHEETS ===== */
var _cfgOverlayEl=null,_cfgSheetEl=null;
var _aboutImgCache={};

function _warmAboutCache(){
  getSiteSettings().then(function(ss){
    [ss.founder_avatar_url,ss.about_avatar_url,ss.tafsir_book_image].forEach(function(url){
      if(!url||_aboutImgCache[url]!==undefined)return;
      _aboutImgCache[url]=false;
      var img=new Image();
      img.onload=function(){_aboutImgCache[url]=true;};
      img.src=url;
    });
  });
}

function _ensureCfgSheet(){
  if(_cfgSheetEl)return;
  _cfgOverlayEl=el('div','cfg-overlay');
  on(_cfgOverlayEl,'click',closeCfgSheet);
  document.body.appendChild(_cfgOverlayEl);
  _cfgSheetEl=el('div','cfg-sheet');
  document.body.appendChild(_cfgSheetEl);
  if(typeof _attachSheetDrag==='function')_attachSheetDrag(_cfgSheetEl,_cfgOverlayEl,closeCfgSheet,null);
}

function closeCfgSheet(){
  if(!_cfgSheetEl)return;
  _cfgSheetEl.classList.remove('open');
  _cfgSheetEl.style.display='none';
  _cfgOverlayEl.classList.remove('on');
}

function _appendParas(parent,cls,text){
  var paras=(text||'').split('\n\n').filter(Boolean);
  paras.forEach(function(p){var d=el('div',cls);d.textContent=p;parent.appendChild(d);});
}

function _openLink(url){
  if(!url)return;
  if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Browser){
    Capacitor.Plugins.Browser.open({url:url}).catch(function(){window.open(url,'_blank');});
  }else{window.open(url,'_blank');}
}

async function openAboutSheet(type){
  _ensureCfgSheet();
  haptic([8]);
  clear(_cfgSheetEl);

  var pull=el('div','cfg-sheet-pull');_cfgSheetEl.appendChild(pull);
  var hdr=el('div','cfg-sheet-hdr');
  var titleEl=el('div','cfg-sheet-title',type==='founder'?'سامان عبدالرحمن':'تەفسیر کورد');
  var closeBtn=el('button','cfg-sheet-close');
  closeBtn.appendChild(icon('fas fa-xmark'));
  on(closeBtn,'click',closeCfgSheet);
  hdr.appendChild(titleEl);hdr.appendChild(closeBtn);
  _cfgSheetEl.appendChild(hdr);
  var body=el('div','cfg-sheet-body');
  _cfgSheetEl.appendChild(body);

  var ss=_ssMemory;
  if(!ss){
    var _skEl=el('div','ab-skeleton');
    _skEl.appendChild(el('div','ab-sk-avatar'));
    _skEl.appendChild(el('div','ab-sk-line ab-sk-wide'));
    _skEl.appendChild(el('div','ab-sk-line ab-sk-med'));
    body.appendChild(_skEl);
    _cfgOverlayEl.classList.add('on');
    _cfgSheetEl.style.display='';
    _cfgSheetEl.classList.add('open');
    ss=await getSiteSettings();
    clear(body);
  }else{
    _cfgOverlayEl.classList.add('on');
    _cfgSheetEl.style.display='';
    _cfgSheetEl.classList.add('open');
  }

  function _addQuote(parent,ar,ref){
    if(!ar)return;
    var q=el('div','cfg-sheet-quote');
    var qa=el('div','cfg-sheet-quote-ar');qa.textContent=ar;q.appendChild(qa);
    if(ref)q.appendChild(el('div','cfg-sheet-quote-ref',ref));
    parent.appendChild(q);
  }
  function _addBlocks(parent,text){
    (text||'').split('\n\n').filter(Boolean).forEach(function(p){parent.appendChild(el('div','cfg-sheet-para',p));});
  }
  if(type==='founder'){
    var fname=_ft('founder_name',ss.founder_name)||'سامان عبدالرحمن عادل';
    titleEl.textContent=fname;

    // ── 1. Hero ──────────────────────────────────
    var hero=el('div','cfg-sheet-hero');
    var avDiv=el('div','cfg-sheet-avatar');
    var avUrl=ss.founder_avatar_url||'';
    if(avUrl){var avImg=document.createElement('img');avImg.alt='';avImg.style.opacity=_aboutImgCache[avUrl]?'1':'0';avImg.style.transition='opacity .25s';avImg.onload=function(){avImg.style.opacity='1';};avImg.src=avUrl;avDiv.appendChild(avImg);}
    else{avDiv.appendChild(icon('fas fa-user'));}
    hero.appendChild(avDiv);
    hero.appendChild(el('div','cfg-sheet-name',fname));
    hero.appendChild(el('div','cfg-sheet-role',_ft('founder_role',ss.founder_role)||'دامەزرێنەرێ تەفسیر کورد'));
    body.appendChild(hero);

    // ── 2. Story ─────────────────────────────────
    var cfoStory=el('div','cfo-section');
    cfoStory.appendChild(el('div','cab-sec-label',_ft('founder_story_label',ss.founder_story_label)||'چیرۆک'));
    cfoStory.appendChild(el('div','cfo-bio-name',fname));
    // Admin saves bio as 3 separate paragraphs: founder_story_desc1/2/3
    [_ft('founder_story_desc1',ss.founder_story_desc1),_ft('founder_story_desc2',ss.founder_story_desc2),_ft('founder_story_desc3',ss.founder_story_desc3)].filter(Boolean).forEach(function(p){cfoStory.appendChild(el('div','cfo-para',p));});
    body.appendChild(cfoStory);

    // ── 3. Quote 1 ───────────────────────────────
    var cfoQ1=el('div','cfo-ayah');
    cfoQ1.appendChild(el('div','cfo-ayah-ar',_ft('founder_quote1_arabic',ss.founder_quote_ar)||'إِنْ أُرِيدُ إِلَّا الْإِصْلَاحَ مَا اسْتَطَعْتُ ۚ وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ'));
    var _qku=_ft('founder_quote1_translation',ss.founder_quote_ku);
    if(_qku){var qku=el('div','cfo-ayah-ku');qku.textContent='"'+_qku+'"';cfoQ1.appendChild(qku);}
    cfoQ1.appendChild(el('div','cfo-ayah-ref',_ft('founder_quote1_ref',ss.founder_quote_ref)||'سوڕەتا هود — ٨٨'));
    body.appendChild(cfoQ1);

    // Journey section moved to app sheet

    // ── 5. Values ────────────────────────────────
    var cfoVals=el('div','cfo-section');
    cfoVals.appendChild(el('div','cab-sec-label',_ft('founder_values_label',ss.founder_values_label)||'پابەندبوون'));
    var VALUES=[
      {t:_ft('founder_value1_title',ss.founder_v1_title)||'ڕازەمەندییا خودای',d:_ft('founder_value1_desc',ss.founder_v1_desc)||'ئەڤ کارە بتنێ بۆ ڕازەمەندییا خودێ دهێتە ئەنجامدان. ئەم ل دویڤ چ دانپێدان و قازانجێن دونیاییدا ناگەڕین، هیڤییا مە بتنێ قەبویلبوونا ژلایێ خوداییە.'},
      {t:_ft('founder_value2_title',ss.founder_v2_title)||'خزمەتا قورئانێ',d:_ft('founder_value2_desc',ss.founder_v2_desc)||'خزمەتکرنا پەرتوکا خودای و گەهاندنا مانایێن قورئانێ بۆ هەمی کوردان ب شێوازەکێ ڕوون و سادە و بێ ئاڵۆزی.'},
      {t:_ft('founder_value3_title',ss.founder_v3_title)||'گەهاندن بۆ هەمییان',d:_ft('founder_value3_desc',ss.founder_v3_desc)||'دروستکرنا پلاتفۆرمەکا دیجیتاڵ کو بەردەستە بۆ هەمی کوردان ل هەر جهەکی، بێ سنوور و بێ جیاوازی.'},
      {t:_ft('founder_value4_title',ss.founder_v4_title)||'خۆگەشەکرن',d:_ft('founder_value4_desc',ss.founder_v4_desc)||'فێربوون و گەشەکرنا پێزانینێن ئایینی، و پارڤەکرنا وان دگەل گەلێ خۆ ب شێوازەکێ ڕەوان.'}
    ];
    var valList=el('div','cfo-values');
    VALUES.forEach(function(v){
      var vi=el('div','cfo-val-item');
      vi.appendChild(el('div','cfo-val-title',v.t));
      vi.appendChild(el('div','cfo-val-desc',v.d));
      valList.appendChild(vi);
    });
    cfoVals.appendChild(valList);body.appendChild(cfoVals);

    // ── 6. Dua ───────────────────────────────────
    var cfoDua=el('div','cfo-dua');
    cfoDua.appendChild(el('div','cfo-dua-label',_ft('founder_dua_label',ss.founder_dua_label)||'دوعا'));
    cfoDua.appendChild(el('div','cfo-dua-title',_ft('founder_dua_title',ss.founder_dua_title)||'دوعا بۆ بینەرێن مە'));
    cfoDua.appendChild(el('div','cfo-dua-text',_ft('founder_dua_desc',ss.founder_dua_text)||''));
    body.appendChild(cfoDua);

    // ── 7. Quote 2 ───────────────────────────────
    var cfoQ2=el('div','cfo-ayah');
    cfoQ2.appendChild(el('div','cfo-ayah-ar',_ft('founder_quote2_arabic',ss.founder_quote2_ar)||'رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ'));
    var _qku2=_ft('founder_quote2_translation',ss.founder_quote2_ku);
    if(_qku2){var qku2=el('div','cfo-ayah-ku');qku2.textContent='"'+_qku2+'"';cfoQ2.appendChild(qku2);}
    cfoQ2.appendChild(el('div','cfo-ayah-ref',_ft('founder_quote2_ref',ss.founder_quote2_ref)||'سوڕەتا البقرة — ١٢٧'));
    body.appendChild(cfoQ2);

    // ── 8. Closing ───────────────────────────────
    var _cloTitle=_ft('founder_closing_title',ss.founder_closing_title);
    var _cloDesc=_ft('founder_closing_desc',ss.founder_closing_desc||ss.founder_closing);
    if(_cloTitle||_cloDesc){
      var cfoClose=el('div','cfo-closing');
      if(_cloTitle)cfoClose.appendChild(el('div','cfo-closing-title',_cloTitle));
      if(_cloDesc)cfoClose.appendChild(el('div','cfo-closing-text',_cloDesc));
      body.appendChild(cfoClose);
    }
  }

  if(type==='app'){
    titleEl.textContent='تەفسیر کورد';

    // ── 1. Hero ──────────────────────────────────
    var cabHero=el('div','cfg-sheet-hero');
    var cabAv=el('div','cfg-sheet-avatar');
    var appAvUrl=ss.about_avatar_url||'';
    if(appAvUrl){var cabAvImg=document.createElement('img');cabAvImg.alt='';cabAvImg.style.opacity=_aboutImgCache[appAvUrl]?'1':'0';cabAvImg.style.transition='opacity .25s';cabAvImg.onload=function(){cabAvImg.style.opacity='1';};cabAvImg.src=appAvUrl;cabAv.appendChild(cabAvImg);}
    else{var cabLogo=document.createElement('img');cabLogo.src='/assets/images/logo.png';cabLogo.alt='';cabAv.appendChild(cabLogo);}
    cabHero.appendChild(cabAv);
    cabHero.appendChild(el('div','cfg-sheet-name','تەفسیر کورد'));
    cabHero.appendChild(el('div','cfg-sheet-role',_ft('about_hero_sub',ss.about_hero_sub)||'پلاتفۆرمەکا کوردی بۆ خواندنا قورئانا پیرۆز'));
    body.appendChild(cabHero);

    // ── 2. Services ───────────────────────────────
    var cabSvc=el('div','cab-section');
    cabSvc.appendChild(el('div','cab-sec-label',_ft('about_svc_label',ss.about_svc_label)||'خزمەتگوزاری'));
    cabSvc.appendChild(el('div','cab-sec-title',_ft('about_svc_title',ss.about_svc_title)||'ئەم چ پێشکێش دکەین'));
    var FEATS=[
      {num:_ft('about_feat1_num',ss.about_feat1_num)||'٠١',title:_ft('about_feat1_title',ss.about_feat1_title)||'خواندنا قورئانێ',desc:_ft('about_feat1_desc',ss.about_feat1_desc)||'خواندنا قورئانا پیرۆز ب دەقێ عەرەبی یێ ڕەسەن دگەل وەرگێڕانا کوردی و تەفسیرا ساناهی بۆ هەر ئایەتەکێ.'},
      {num:_ft('about_feat2_num',ss.about_feat2_num)||'٠٢',title:_ft('about_feat2_title',ss.about_feat2_title)||'دەنگێ ئیسلامێ',desc:_ft('about_feat2_desc',ss.about_feat2_desc)||'ڤیدیویێن ئیسلامی یێن ب زمانێ کوردی، زنجیرەیێن فێربوونێ و ناڤەڕۆکا هەوەدەر بۆ گەشەکرنا زانیارییا ئایینی.'},
      {num:_ft('about_feat3_num',ss.about_feat3_num)||'٠٣',title:_ft('about_feat3_title',ss.about_feat3_title)||'نیشانەکرن و پاشەکەفتن',desc:_ft('about_feat3_desc',ss.about_feat3_desc)||'شوێنکەفتنا خواندنا خۆ، نیشانەکرنا ئایەتان، و هەڤدەنگکرنا دانەیان ل هەمی ئامێران.'}
    ];
    FEATS.forEach(function(f){
      var card=el('div','cab-feat');
      card.appendChild(el('div','cab-feat-num',f.num));
      var fb=el('div','cab-feat-body');
      fb.appendChild(el('div','cab-feat-title',f.title));
      fb.appendChild(el('div','cab-feat-desc',f.desc));
      card.appendChild(fb);
      cabSvc.appendChild(card);
    });
    body.appendChild(cabSvc);

    // ── 3. Stats ──────────────────────────────────
    var cabStats=el('div','cab-stats');
    [[_ft('about_stat1_num',ss.about_stat1_num)||'٦٥ھ+',_ft('about_stat1_label',ss.about_stat1_label)||'فۆڵۆوەر'],[_ft('about_stat2_num',ss.about_stat2_num)||'٢٥م+',_ft('about_stat2_label',ss.about_stat2_label)||'بینەر']].forEach(function(s){
      var st=el('div','cab-stat');
      st.appendChild(el('span','cab-stat-num',s[0]));
      st.appendChild(el('span','cab-stat-label',s[1]));
      cabStats.appendChild(st);
    });
    body.appendChild(cabStats);

    // ── 4. Ayah ───────────────────────────────────
    var cabAyah=el('div','cab-ayah-wrap');
    cabAyah.appendChild(el('div','cab-ayah-ar',_ft('about_quote_ar',ss.about_quote_ar)||'وَمَنْ أَحْسَنُ قَوْلًا مِّمَّن دَعَا إِلَى اللَّهِ وَعَمِلَ صَالِحًا وَقَالَ إِنَّنِي مِنَ الْمُسْلِمِينَ'));
    var _abQku=_ft('about_quote_ku',ss.about_quote_ku);
    if(_abQku)cabAyah.appendChild(el('div','cab-ayah-ku','"'+_abQku+'"'));
    cabAyah.appendChild(el('div','cab-ayah-ref',_ft('about_quote_ref',ss.about_quote_ref)||'سوڕەتا فصلت — ٣٣'));
    body.appendChild(cabAyah);

    // ── 5. Declaration ────────────────────────────
    var cabDecl=el('div','cab-decl');
    cabDecl.appendChild(el('div','cab-decl-title',_ft('about_decl_title',ss.about_decl_title)||'نە سیاسی، نە حزبی'));
    (_ft('about_declaration_text',ss.about_declaration_text)||'').split('\n\n').filter(Boolean).forEach(function(p){
      cabDecl.appendChild(el('div','cab-decl-para',p));
    });
    body.appendChild(cabDecl);

    // ── 6. Journey ────────────────────────────────
    var cabJrn=el('div','cfo-section');
    cabJrn.appendChild(el('div','cab-sec-label',_ft('founder_journey_label',ss.founder_journey_label)||'گەشت'));
    cabJrn.appendChild(el('div','cab-sec-title',_ft('founder_journey_title',ss.founder_journey_title)||'ڕێکا تەفسیر کورد'));
    var _jIntro=_ft('founder_journey_desc',ss.founder_journey_intro);
    if(_jIntro)cabJrn.appendChild(el('div','cfo-para',_jIntro));
    var APP_JOURNEY=[
      {t:_ft('founder_timeline1_title',ss.founder_j1_title)||'دەستپێکا هزرێ',d:_ft('founder_timeline1_desc',ss.founder_j1_desc)||'ب تێبینیکرنا کێمییا ناڤەڕۆکا ئیسلامی ب زمانێ کوردی، هزرا دروستکرنا پلاتفۆرمەکێ بۆ من هات، کو ناڤەڕۆکا قورئانێ ب شێوازەکێ مۆدێرن پێشکێش بکەت.'},
      {t:_ft('founder_timeline2_title',ss.founder_j2_title)||'دروستکرنا ناڤەڕۆکا ڤیدیویی',d:_ft('founder_timeline2_desc',ss.founder_j2_desc)||'دەستپێکرنا دروستکرنا ڤیدیویێن ئیسلامی یێن کورت بۆ تۆڕێن جڤاکی وەک ئینستاگرام و تیکتۆک، ب شێوازەکێ بالکێش کو بگەهیتە نەوەیێ نوی یێ کوردان.'},
      {t:_ft('founder_timeline3_title',ss.founder_j3_title)||'دامەزراندنا پلاتفۆرمێ',d:_ft('founder_timeline3_desc',ss.founder_j3_desc)||'دروستکرنا مالپەڕەکا تەمام بۆ خواندنا قورئانا پیرۆز ب تەفسیرا ساناهی و وەرگێڕانا کوردی، ب تایبەتمەندیێن مۆدێرن وەک شوێنکەفتنا خواندنێ و نیشانەکرن.'},
      {t:_ft('founder_timeline4_title',ss.founder_j4_title)||'گەهشتن ب ملیۆنان بینەران',d:_ft('founder_timeline4_desc',ss.founder_j4_desc)||'ب ڕێکا ئینستاگرام، تیکتۆک و یوتوب گەهشتینە زێدەتر ژ ٢٥ ملیۆن بینەر و ٦٥ هزار فۆڵۆوەران. ئەڤ ژمارە نیشانا پێدڤییا کوردانە بۆ ناڤەڕۆکەکا ئیسلامی زمانێ وان بخو.'}
    ];
    var appJrnTl=el('div','cfo-timeline');
    APP_JOURNEY.forEach(function(j){
      var item=el('div','cfo-tl-item');
      item.appendChild(el('div','cfo-tl-dot'));
      var tb=document.createElement('div');
      tb.appendChild(el('div','cfo-tl-title',j.t));
      tb.appendChild(el('div','cfo-tl-desc',j.d));
      item.appendChild(tb);appJrnTl.appendChild(item);
    });
    cabJrn.appendChild(appJrnTl);body.appendChild(cabJrn);

    // ── 7. Tafsir source ──────────────────────────
    var _tafsirText=_ft('about_tafsir_text',ss.about_tafsir_text);
    if(_tafsirText){
      var cabTafsir=el('div','cab-section');
      cabTafsir.appendChild(el('div','cab-sec-label',_ft('about_tafsir_label',ss.about_tafsir_label)||'ژێدەرێ تەفسیرێ'));
      _tafsirText.split('\n\n').filter(Boolean).forEach(function(p){
        cabTafsir.appendChild(el('div','cab-decl-para',p));
      });
      body.appendChild(cabTafsir);
    }

    // ── 7. Book card + image ──────────────────────
    var bookImgUrl=ss.tafsir_book_image||'';
    var cabCard=el('div','cab-book-card');
    var cabCardText=el('div','cab-book-card-text');
    var _bookTitle=_ft('about_book_title',ss.about_book_title)||'تەفسیرا ساناهی';
    cabCardText.appendChild(el('div','cab-book-card-badge',_bookTitle));
    cabCardText.appendChild(el('div','cab-book-card-title',_bookTitle));
    cabCardText.appendChild(el('div','cab-book-card-author',_ft('about_tafsir_author',ss.about_tafsir_author)||'ماموستا تەحسین ئیبراهیم دۆسکی'));
    cabCardText.appendChild(el('div','cab-book-card-desc',_ft('about_tafsir_book_desc',ss.about_tafsir_book_desc)||'وەرگێڕان و تەفسیرا قورئانا پیرۆز ب زمانێ کوردی (کرمانجی) بۆ هەمی کورد زمانان ل سەرانسەری جیهانێ.'));
    cabCard.appendChild(cabCardText);
    body.appendChild(cabCard);
    if(bookImgUrl){var bookImg=document.createElement('img');bookImg.alt='';bookImg.className='cfg-sheet-img';bookImg.style.opacity=_aboutImgCache[bookImgUrl]?'1':'0';bookImg.style.transition='opacity .4s';bookImg.onload=function(){bookImg.style.opacity='1';};bookImg.src=bookImgUrl;body.appendChild(bookImg);}
  }

  if(type==='thanks'){
    titleEl.textContent='سوپاسنامە';

    // ── Hero ──────────────────────────────────────
    var thHero=el('div','cfg-sheet-hero');
    var thIcon=el('div','cfg-sheet-avatar');
    thIcon.style.cssText='background:linear-gradient(135deg,#e8445a,#ff7c95);font-size:1.8rem;width:96px;height:96px;box-shadow:0 8px 24px rgba(232,68,90,.35);';
    thIcon.appendChild(icon('fas fa-heart'));
    thHero.appendChild(thIcon);
    thHero.appendChild(el('div','cfg-sheet-name','سوپاسنامە'));
    thHero.appendChild(el('div','cfg-sheet-role',_ft('thanks_hero_role','بۆ هەموو دڵسۆزانیێن ڤی پرۆژەی')));
    body.appendChild(thHero);

    // ── Opening praise — accent-bordered quote ────
    var thQuote=el('div','cfg-sheet-quote');
    thQuote.style.cssText='border-right:3px solid var(--accent);border-radius:0 var(--r-l) var(--r-l) 0;margin:8px 20px 0;';
    var thQuoteText=document.createElement('div');
    thQuoteText.style.cssText='font-weight:600;color:var(--text);font-size:.93rem;line-height:2;direction:rtl;';
    thQuoteText.textContent=_ft('thanks_quote','ل دەستپێکێ و ل دوماهییێ، سوپاس و ستایش بۆ خودایێ مەزن کو هێز و دەرفەت دا مە دا کو ئەڤی پرۆژەی بگەهینینە سەرکەفتنێ.');
    thQuote.appendChild(thQuoteText);
    body.appendChild(thQuote);

    // ── Body paragraphs ───────────────────────────
    var thBody=el('div','cfo-section');
    thBody.style.cssText='padding:20px 20px 0;';
    [
      _ft('thanks_para1','ئەڤ ئەپلیكەیشنە بەرهەمێ کارەکێ ب کۆم و دڵسۆزانەیە. ژ ناخێ دڵێ خۆ سوپاسیا ئێک ب ئێکێ وان دۆست و دڵسۆزان دکەم کو قوناغ ب قوناغ هاریكاریا من د دروستکرن، دیزاینکرن و پێشڤەبرنا ڤی ئەپی دا کری. ئەو ده‌ستێن ڕه‌نگین یێن کار تێدا کری و ئەو هزرێن جوان یێن ڕێبەریا من کری، ئەگەرێ سەرەکی بوون کو ئەڤڕۆ ئەڤ پرۆژە ب سەرکەفتیانە بکەڤیتە د خزمەتا وە دا. ماندووبوونا هەوە ل دەڤ من یا قەدرگران و ب نرخە.'),
      _ft('thanks_para2','د هەمان دەم دا، سوپاسیا هەوە یێن ئەزیز و بکارهێنەرێن ئەپی دکەم کو ب متمانە و پشتەڤانیا خۆ، هێز دایە مە. هیڤیدارم ئەڤ کارە پڕ مفا بیت و ببیته‌ جهێ ڕازیبوون و دڵخۆشیا هەوە هەمیای.')
    ].filter(Boolean).forEach(function(p){
      var para=el('div','cfo-para',p);
      para.style.cssText='font-size:.9rem;line-height:2;margin-bottom:18px;';
      thBody.appendChild(para);
    });
    body.appendChild(thBody);

    // ── Closing prayer card ───────────────────────
    var thDua=el('div','cfo-dua');
    thDua.appendChild(el('div','cfo-dua-label',_ft('thanks_dua_label','دوعا')));
    var duaText=el('div','cfo-dua-text');
    duaText.style.cssText='font-size:.88rem;line-height:2.1;';
    duaText.textContent=_ft('thanks_dua_text','ژ خودایێ میهرەبان دخۆازم خێر و بەرەکەتێ بێخیتە د ژیان و کارێن وه‌ دا. خودێ دەرگەهێن ڕزقێ حەلال و سەرکەفتنێ ل بەردەم هەوە ڤەکەت، و هەوە ژ هەر نەخۆشی و تەنگاڤیەکێ بپارێزیت. ژ دل هیڤیخوازم کو دایم یێن ساخلەم، دلخۆش و سەرکەفتی بن و خودێ جزا و پاداشتێ ڤێ هاریكاری و چاکیا وە بدەتە مه‌زنتر لێ بکەت.');
    thDua.appendChild(duaText);
    body.appendChild(thDua);
  }
}

function mkBtnRow(labelText,btnLabel,btnIcon,onClick,danger){
  var row=el('div','setting-row s-row');
  row.appendChild(el('div','setting-label',labelText));
  var btn=el('button','hdr-text-btn'+(danger?' danger-btn':''));
  if(btnIcon){btn.appendChild(icon(btnIcon));btn.appendChild(document.createTextNode(' '));}
  btn.appendChild(document.createTextNode(btnLabel));
  on(btn,'click',function(){haptic(danger?[50]:[8]);onClick();});
  row.appendChild(btn);
  return row;
}
function mkSliderRow(labelText,value,min,max,step,onInput,onChange){
  var cur=value;
  var row=el('div','setting-row s-row setting-row--stepper');
  row.appendChild(el('div','setting-label',labelText));
  var ctrl=el('div','setting-stepper');
  var minusBtn=el('button','stepper-btn stepper-minus','-');
  var valEl=el('span','stepper-val',cur.toFixed(1));
  var plusBtn=el('button','stepper-btn stepper-plus','+');
  function update(v){
    v=Math.round(v*100)/100;
    if(v<min)v=min;if(v>max)v=max;
    cur=v;valEl.textContent=v.toFixed(1);
    minusBtn.disabled=(v<=min);plusBtn.disabled=(v>=max);
    onInput(v);onChange(v);
  }
  on(minusBtn,'click',function(){haptic([6]);update(parseFloat((cur-step).toFixed(2)));});
  on(plusBtn,'click',function(){haptic([6]);update(parseFloat((cur+step).toFixed(2)));});
  minusBtn.disabled=(cur<=min);plusBtn.disabled=(cur>=max);
  ctrl.appendChild(minusBtn);ctrl.appendChild(valEl);ctrl.appendChild(plusBtn);
  row.appendChild(ctrl);
  return row;
}

function _showIgPicker(){
  haptic([8]);
  var existing=document.getElementById('_igPickerOverlay');
  if(existing){existing.remove();return;}
  var overlay=document.createElement('div');
  overlay.id='_igPickerOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;';
  overlay.style.opacity='0';overlay.style.transition='opacity .2s';
  var sheet=document.createElement('div');
  sheet.style.cssText='width:100%;max-width:480px;background:var(--bg2);border-radius:20px 20px 0 0;padding:12px 12px 32px;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,1,.23,1);border-top:1px solid var(--border);';
  var handle=document.createElement('div');
  handle.style.cssText='width:36px;height:4px;border-radius:2px;background:var(--border);margin:0 auto 16px;';
  sheet.appendChild(handle);
  var title=document.createElement('div');
  title.textContent='Instagram';
  title.style.cssText='text-align:center;font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:10px;letter-spacing:.5px;text-transform:uppercase;';
  sheet.appendChild(title);
  var OPTS=[
    {label:'TafsirKurd',sub:'@tafsirkurd',url:'https://www.instagram.com/tafsirkurd/'},
    {label:'TafsirKurd App',sub:'@tafsirkurd.app',url:'https://www.instagram.com/tafsirkurd.app/'}
  ];
  OPTS.forEach(function(opt,i){
    if(i>0){var sep=document.createElement('div');sep.style.cssText='height:1px;background:var(--border);margin:0 16px;';sheet.appendChild(sep);}
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:14px;padding:16px;border-radius:14px;cursor:pointer;transition:background .15s;';
    var ic=document.createElement('i');ic.className='fab fa-instagram';ic.style.cssText='font-size:24px;color:#E1306C;width:26px;text-align:center;flex-shrink:0;';
    var txt=document.createElement('div');txt.style.cssText='flex:1;min-width:0;';
    var lbl=document.createElement('div');lbl.textContent=opt.label;lbl.style.cssText='font-size:16px;font-weight:700;color:var(--text);';
    var sub=document.createElement('div');sub.textContent=opt.sub;sub.style.cssText='font-size:13px;color:var(--text-muted);margin-top:3px;';
    var chev=document.createElement('i');chev.className='fas fa-chevron-left';chev.style.cssText='font-size:12px;color:var(--text-muted);flex-shrink:0;';
    txt.appendChild(lbl);txt.appendChild(sub);
    row.appendChild(ic);row.appendChild(txt);row.appendChild(chev);
    on(row,'mouseover',function(){row.style.background='var(--bg3)';});
    on(row,'mouseout',function(){row.style.background='';});
    row.onclick=function(){close();_openLink(opt.url);haptic([8]);};
    sheet.appendChild(row);
  });
  overlay.appendChild(sheet);
  function close(){
    overlay.style.opacity='0';sheet.style.transform='translateY(100%)';
    setTimeout(function(){overlay.remove();},280);
  }
  overlay.onclick=function(e){if(e.target===overlay)close();};
  document.body.appendChild(overlay);
  requestAnimationFrame(function(){
    overlay.style.opacity='1';sheet.style.transform='translateY(0)';
  });
}

function renderSettings(){
  var content=$('settingsContent');
  clear(content);

  // ── Profile hero card ────────────────────────
  var profile=el('div','profile-card');
  if(S.user){
    // Avatar
    var avatarEl;
    if(S.user.avatar){
      avatarEl=document.createElement('img');
      avatarEl.className='profile-avatar-img';
      avatarEl.src=S.user.avatar;avatarEl.alt='';
      avatarEl.referrerPolicy='no-referrer';avatarEl.crossOrigin='anonymous';
    }else{
      avatarEl=el('div','profile-avatar');
      avatarEl.appendChild(icon('fas fa-user'));
    }
    profile.appendChild(avatarEl);
    // Info block
    var pInfo=el('div','profile-info');
    pInfo.appendChild(el('div','profile-name',S.user.name||t('profile.guest')));
    pInfo.appendChild(el('div','profile-email',S.user.email||''));
    var syncBadge=el('div','profile-sync');
    syncBadge.appendChild(icon('fas fa-cloud-upload-alt'));
    syncBadge.appendChild(document.createTextNode(' '+t('profile.synced')));
    pInfo.appendChild(syncBadge);
    profile.appendChild(pInfo);
    // "View profile" hint row
    var chevRow=el('div','profile-chevron-row');
    chevRow.appendChild(document.createTextNode(t('profile.view_profile')||'پرۆفایل ببینە'));
    chevRow.appendChild(icon('fas fa-chevron-left'));
    profile.appendChild(chevRow);
    on(profile,'click',function(){App.openProfile()});
  }else{
    // Guest
    var guestAv=el('div','profile-avatar');
    guestAv.appendChild(icon('fas fa-user'));
    profile.appendChild(guestAv);
    var pInfo2=el('div','profile-info');
    pInfo2.appendChild(el('div','profile-name',t('profile.guest')));
    pInfo2.appendChild(el('div','profile-email',t('profile.login_prompt')));
    profile.appendChild(pInfo2);
    var loginBtn=el('button','profile-login-btn',t('profile.login'));
    on(loginBtn,'click',function(){App.openLogin()});
    profile.appendChild(loginBtn);
    profile.style.cursor='default';
  }
  content.appendChild(profile);

  // ── (1) Reading Stats Card ────────────────────
  var log=getReadLog();
  var bms=getBookmarks();
  var totalRead=calcTotalRead(log);
  var streak=calcStreak(log);
  var statsCard=el('div','stats-card');
  [[icon('fas fa-quran'),totalRead,t('settings.stats_ayahs')],
   [icon('fas fa-fire'),streak,t('settings.stats_streak')],
   [icon('fas fa-bookmark'),bms.length,t('settings.stats_bookmarks')]
  ].forEach(function(item){
    var col=el('div','stats-col');
    var ic=item[0];ic.className+=' stats-icon';
    col.appendChild(ic);
    col.appendChild(el('div','stats-num',String(item[1])));
    col.appendChild(el('div','stats-lbl',item[2]));
    statsCard.appendChild(col);
  });
  content.appendChild(statsCard);

  // ── Appearance ───────────────────────────────
  var g1=el('div','settings-group');
  g1.appendChild(el('div','settings-group-title',t('settings.appearance')));
  var themes=[
    {id:'noor',  name:t('settings.theme_noor')||'نوور',       sub:'Parchment',bg:'#f4e8cc',surface:'#fdf4e3', accent:'#1a5c3a'},
    {id:'sakina',name:t('settings.theme_sakina')||'سکینە',   sub:'Emerald', bg:'#0c1c12', surface:'#112318', accent:'#c9a84c'},
    {id:'light', name:t('settings.theme_light')||'ڕووناک',    sub:'Light',   bg:'#fafafa', surface:'#ffffff', accent:'#000000'},
    {id:'dark',  name:t('settings.theme_dark')||'تاریکی',    sub:'Dark',    bg:'#0a0a0a', surface:'#161616', accent:'#ffffff'},
  ];
  var tGrid=el('div','theme-grid');
  themes.forEach(function(th){
    var card=el('div','theme-card'+(S.theme===th.id?' on':''));
    // Preview swatch
    var preview=el('div','theme-card-preview');
    var swatch=el('div','theme-swatch-main');
    swatch.style.background=th.bg;
    swatch.style.border='1px solid rgba(128,128,128,.2)';
    var dot=el('div','theme-swatch-dot');
    dot.style.background=th.accent;
    swatch.appendChild(dot);
    preview.appendChild(swatch);
    var lines=el('div','theme-swatch-lines');
    [th.surface,'rgba(128,128,128,.25)','rgba(128,128,128,.15)'].forEach(function(c,i){
      var ln=el('div','theme-swatch-line');
      ln.style.background=c;
      ln.style.width=i===0?'100%':i===1?'70%':'50%';
      ln.style.opacity=i===0?'1':'1';
      lines.appendChild(ln);
    });
    preview.appendChild(lines);
    card.appendChild(preview);
    card.appendChild(el('div','theme-card-name',th.name));
    card.appendChild(el('div','theme-card-sub',th.sub));
    var chk=el('div','theme-card-check');chk.appendChild(icon('fas fa-check'));card.appendChild(chk);
    on(card,'click',function(){S.theme=th.id;applyTheme();try{localStorage.setItem('themeUserChosen','1');}catch(e){}haptic([10]);renderSettings()});
    tGrid.appendChild(card);
  });
  g1.appendChild(tGrid);
  g1.appendChild(mkToggleRow(t('qs.screen_lock'),S.keepAwake,function(){
    S.keepAwake=!S.keepAwake;
    localStorage.setItem('keepAwake',String(S.keepAwake));
    applyKeepAwake();renderSettings();
  }));
  content.appendChild(g1);

  // ── Reading ──────────────────────────────────
  var g2=el('div','settings-group');
  g2.appendChild(el('div','settings-group-title',t('settings.reading')));
  g2.appendChild(mkToggleRow(t('settings.show_tafsir'),S.showTafsir,function(){
    S.showTafsir=!S.showTafsir;
    localStorage.setItem('showTafsir',String(S.showTafsir));
    applyShowTafsir();renderSettings();
  }));
  g2.appendChild(mkToggleRow(t('settings.auto_advance'),S.autoAdvance,function(){
    S.autoAdvance=!S.autoAdvance;
    localStorage.setItem('autoAdvance',String(S.autoAdvance));
    renderSettings();
  },t('settings.auto_advance_sub')));
  g2.appendChild(mkToggleRow(t('settings.scroll_follows'),S.scrollFollowsAudio,function(){
    S.scrollFollowsAudio=!S.scrollFollowsAudio;
    localStorage.setItem('scrollFollowsAudio',String(S.scrollFollowsAudio));
    renderSettings();
  },t('settings.scroll_follows_sub')));
  g2.appendChild(mkSliderRow(t('settings.arabic_size'),S.arSize,1.0,3.5,0.1,
    function(v){S.arSize=v;applySizes();},
    function(v){localStorage.setItem('app_arSize',String(v));}
  ));
  g2.appendChild(mkSliderRow(t('settings.tafsir_size'),S.tfSize,0.5,2.0,0.1,
    function(v){S.tfSize=v;applySizes();},
    function(v){localStorage.setItem('app_tfSize',String(v));}
  ));
  g2.appendChild(mkSliderRow(t('qs.line_spacing'),S.lineH,1.4,3.5,0.1,
    function(v){S.lineH=v;applySizes();},
    function(v){localStorage.setItem('app_lineH',String(v));}
  ));
  content.appendChild(g2);

  // ── Audio ────────────────────────────────────
  var gAudio=el('div','settings-group');
  gAudio.appendChild(el('div','settings-group-title',t('audio.reciter')));
  // Reciter chips row
  var recRow=el('div','setting-row s-row setting-row--reciter');
  var recList=el('div','qs-reciter-list');
  recList.style.cssText='padding:4px 0 0;margin:0;';
  RECITERS.forEach(function(r){
    var chip=el('div','qs-reciter-chip'+(RECITER===r.id?' on':''));
    chip.dataset.reciterId=r.id;
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
      updateAudioBarAvatar();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      // Update active chip in-place — no full re-render, user stays in position
      recList.querySelectorAll('.qs-reciter-chip').forEach(function(c){c.classList.remove('on');});
      chip.classList.add('on');
    });
    recList.appendChild(chip);
  });
  recRow.appendChild(recList);
  gAudio.appendChild(recRow);
  gAudio.appendChild(mkToggleRow(t('settings.bg_audio'),S.bgAudio,function(){
    S.bgAudio=!S.bgAudio;
    localStorage.setItem('bgAudio',String(S.bgAudio));
    renderSettings();
  }));
  content.appendChild(gAudio);

  // ── Notifications & Haptics ──────────────────
  var g3=el('div','settings-group');
  g3.appendChild(el('div','settings-group-title',t('settings.notif_group')));
  // (10) Haptic feedback
  g3.appendChild(mkToggleRow(t('settings.haptic'),S.hapticFeedback,function(){
    S.hapticFeedback=!S.hapticFeedback;
    localStorage.setItem('hapticFeedback',String(S.hapticFeedback));
    haptic([20,30,20]);
    renderSettings();
  },t('settings.haptic_sub')));
  content.appendChild(g3);

  // ── Data & Sync ──────────────────────────────
  var g4=el('div','settings-group');
  g4.appendChild(el('div','settings-group-title',t('settings.data')));
  // (6) Sync status panel
  if(S.user){
    var syncCard=el('div','sync-card');

    // Top row: email + live status + action button
    var cardTop=el('div','sync-card-top');
    var cardInfo=el('div','sync-card-info');
    cardInfo.appendChild(el('div','sync-card-email',S.user.email||''));
    _syncPanelStatusEl=el('div','sync-status-line');
    cardInfo.appendChild(_syncPanelStatusEl);
    cardTop.appendChild(cardInfo);
    _syncPanelBtnEl=el('button','hdr-text-btn');
    on(_syncPanelBtnEl,'click',function(){syncToCloud();});
    cardTop.appendChild(_syncPanelBtnEl);
    syncCard.appendChild(cardTop);
    _updateSyncPanelStatus();

    // What syncs
    syncCard.appendChild(el('div','sync-divider'));
    syncCard.appendChild(el('div','sync-section-lbl',t('settings.sync_what_syncs')));
    var chips1=el('div','sync-chips');
    [
      ['fas fa-book-open',t('settings.sync_item_reading')],
      ['fas fa-bookmark', t('settings.sync_item_bookmarks')],
      ['fas fa-bullseye', t('settings.sync_item_goals')],
      ['fas fa-mosque',   t('settings.sync_item_prayer')],
      ['fas fa-heart',    t('settings.sync_item_saved')],
      ['fas fa-sliders',  t('settings.sync_item_settings')]
    ].forEach(function(d){
      var chip=el('span','sync-chip');
      chip.appendChild(icon(d[0]));
      chip.appendChild(document.createTextNode(' '+d[1]));
      chips1.appendChild(chip);
    });
    syncCard.appendChild(chips1);

    // Device-only
    syncCard.appendChild(el('div','sync-divider'));
    syncCard.appendChild(el('div','sync-section-lbl sync-section-lbl--device',t('settings.sync_device_only')));
    var chips2=el('div','sync-chips');
    [t('settings.sync_device_cache'),t('settings.sync_device_notif'),t('settings.sync_device_sched')].forEach(function(lbl){
      chips2.appendChild(el('span','sync-chip sync-chip--muted',lbl));
    });
    syncCard.appendChild(chips2);

    g4.appendChild(syncCard);
  }
  // (8) Export bookmarks
  g4.appendChild(mkBtnRow(t('settings.export_bookmarks'),t('settings.export_btn'),'fas fa-download',function(){
    var bms2=getBookmarks();
    if(!bms2.length){toast(t('toast.no_bookmarks'));return;}
    var json=JSON.stringify(bms2,null,2);
    var blob=new Blob([json],{type:'application/json'});
    var url2=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url2;a.download='tafsirkurd-bookmarks.json';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url2)},500);
  }));
  // (7) Reset reading progress
  g4.appendChild(mkBtnRow(t('settings.reset_progress'),t('settings.reset_btn'),'fas fa-rotate-left',function(){
    if(!confirm(t('settings.reset_confirm')))return;
    _clearTrackingState();
    for(var i=1;i<=114;i++){localStorage.removeItem('surah_scroll_'+i);}
    debouncedSync(); // push reset to cloud
    toast(t('toast.progress_reset'));
    renderSettings();
  },true));
  // Clear cache
  g4.appendChild(mkBtnRow(t('settings.clear_cache'),t('settings.clear_btn'),'fas fa-trash',function(){
    if(confirm(t('settings.clear_confirm'))){
      S.quranData=null;S.tafsirData=null;
      _dataReady.quran=false;_dataReady.tafsir=false;
      loadQuranData();loadTafsirData();
      toast(t('toast.cache_cleared'));
    }
  }));
  content.appendChild(g4);

  // ── App ──────────────────────────────────────
  var g5=el('div','settings-group');
  g5.appendChild(el('div','settings-group-title',t('settings.app_group')));
  // (4) Share app
  g5.appendChild(mkBtnRow(t('settings.share_app'),t('settings.share_btn'),'fas fa-share-nodes',function(){
    var url3='https://tafsirkurd.com';
    if(navigator.share){
      navigator.share({title:'Tafsir Kurd',text:t('settings.about_desc'),url:url3}).catch(function(){});
    }else{
      navigator.clipboard.writeText(url3).then(function(){toast(t('toast.link_copied'))}).catch(function(){toast(url3)});
    }
  }));
  // (5) Rate app — full-row tappable (both iOS and Android)
  var _rateRow=el('div','rate-app-row s-row');
  var _rateLeft=el('div','rate-app-left');
  var _rateIconBox=el('div','rate-app-icon');
  _rateIconBox.appendChild(icon('fas fa-star'));
  var _rateText=el('div','rate-app-text');
  _rateText.appendChild(el('div','rate-app-label',t('settings.rate_app')));
  var _ratePlat=window.Capacitor&&window.Capacitor.getPlatform?window.Capacitor.getPlatform():'web';
  var _rateSub=_ratePlat==='ios'?'لەسەر App Store هەڵسەنگاندن بکە':t('settings.rate_sub');
  _rateText.appendChild(el('div','rate-app-sub',_rateSub));
  _rateLeft.appendChild(_rateIconBox);_rateLeft.appendChild(_rateText);
  _rateRow.appendChild(_rateLeft);
  var _rateChev=el('span','about-nav-chevron');_rateChev.appendChild(icon('fas fa-chevron-left'));_rateRow.appendChild(_rateChev);
  on(_rateRow,'click',function(){
    haptic([8]);
    toast(t('toast.rating_opening'));
    localStorage.setItem('ratingPromptDone','true');
    var _plat=window.Capacitor&&window.Capacitor.getPlatform?window.Capacitor.getPlatform():'web';
    if(_plat==='ios'){
      window.open('itms-apps://itunes.apple.com/app/id6760433688?action=write-review','_system');
    }else{
      // market:// is intercepted by Android as an Intent — opens Play Store app directly
      window.location.href='market://details?id=com.tafsirkurd.app';
    }
  });
  g5.appendChild(_rateRow);
  content.appendChild(g5);

  // ── About Us ─────────────────────────────────
  var g6=el('div','settings-group');
  g6.appendChild(el('div','settings-group-title',t('settings.about')));

  function mkAboutNavRow(iconClassOrImg,label,sub,onClick){
    var row=el('div','about-nav-row s-row');
    var left=el('div','about-nav-left');
    var iconBox=el('div','about-nav-icon');
    if(iconClassOrImg&&iconClassOrImg.tagName==='IMG'){
      var _mod=iconClassOrImg._iconMod||'about-nav-icon--img';
      _mod.split(' ').forEach(function(c){if(c)iconBox.classList.add(c);});
      iconBox.appendChild(iconClassOrImg);
    }else{
      iconBox.appendChild(icon(iconClassOrImg));
    }
    left.appendChild(iconBox);
    var textWrap=el('div');
    textWrap.appendChild(el('div','about-nav-label',label));
    if(sub)textWrap.appendChild(el('div','about-nav-sub',sub));
    left.appendChild(textWrap);
    row.appendChild(left);
    var chev=el('span','about-nav-chevron');chev.appendChild(icon('fas fa-chevron-left'));row.appendChild(chev);
    on(row,'click',onClick);
    return row;
  }
  // App logo — accent circle with padding so PNG sits cleanly on all themes
  var _appLogoImg=document.createElement('img');_appLogoImg.src='/assets/images/logo.png';_appLogoImg.alt='';
  _appLogoImg._iconMod='about-nav-icon--img about-nav-icon--logo';
  // Founder avatar — check in-memory cache first, then fall back to localStorage cache
  var _founderImgSrc=(_ssMemory&&_ssMemory.founder_avatar_url)||'';
  if(!_founderImgSrc){try{var _ssDisk=JSON.parse(localStorage.getItem(_ssCacheKey)||'null');if(_ssDisk&&_ssDisk.d&&_ssDisk.d.founder_avatar_url)_founderImgSrc=_ssDisk.d.founder_avatar_url;}catch(e){}}
  var _founderEl;
  if(_founderImgSrc){_founderEl=document.createElement('img');_founderEl.src=_founderImgSrc;_founderEl.alt='';_founderEl._iconMod='about-nav-icon--img about-nav-icon--person';}
  else{_founderEl=icon('fas fa-user');}
  g6.appendChild(mkAboutNavRow(_appLogoImg,'تەفسیر کورد','دەربارەی پڕۆژە',function(){openAboutSheet('app');}));
  g6.appendChild(mkAboutNavRow(_founderEl,'سامان عبدالرحمن','دامەزرێنەر',function(){openAboutSheet('founder');}));
  g6.appendChild(mkAboutNavRow('fas fa-heart','سوپاسنامە',_ft('thanks_nav_sub','بۆ هەر کەسێک یارمەتیدا'),function(){openAboutSheet('thanks');}));
  content.appendChild(g6);

  // ── Social Links ─────────────────────────────
  var g7=el('div','settings-group');
  g7.appendChild(el('div','settings-group-title',t('settings.social')));
  var SOCIAL_DEFS=[
    {key:'social_instagram',icon:'fab fa-instagram',label:'Instagram'},
    {key:'social_youtube',icon:'fab fa-youtube',label:'YouTube'},
    {key:'social_tiktok',icon:'fab fa-tiktok',label:'TikTok'},
    {key:'social_telegram',icon:'fab fa-telegram',label:'Telegram'},
    {key:'social_pinterest',icon:'fab fa-pinterest',label:'Pinterest'},
    {key:'social_email',icon:'fas fa-envelope',label:'Email'},
    {key:'social_website',icon:'fas fa-globe',label:'Website'}
  ];
  var socialBar=el('div','settings-social');
  var _socBtns={};
  SOCIAL_DEFS.forEach(function(def){
    var btn=el('button','soc-btn');
    btn.title=def.label;
    btn.appendChild(icon(def.icon));
    btn.style.display='none';
    on(btn,'click',function(){
      if(def.key==='social_instagram'){
        _showIgPicker();
      } else {
        _openLink(btn._url);haptic([8]);
      }
    });
    _socBtns[def.key]=btn;
    socialBar.appendChild(btn);
  });
  g7.appendChild(socialBar);
  content.appendChild(g7);
  getSiteSettings().then(function(ss){
    SOCIAL_DEFS.forEach(function(def){
      var url=ss[def.key]||def.fallback||'';
      var btn=_socBtns[def.key];
      if(url){btn._url=url;btn.style.display='';}
    });
  });

  // ── About ────────────────────────────────────
  var about=el('div','about-section');
  var aboutLogo=document.createElement('img');
  aboutLogo.src='/assets/images/logo.png';aboutLogo.alt='';
  about.appendChild(aboutLogo);
  about.appendChild(el('div','about-name','Tafsir Kurd'));
  var verEl=el('div','about-ver','v2.3.0');
  about.appendChild(verEl);
  if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App){
    Capacitor.Plugins.App.getInfo().then(function(info){
      if(info&&info.version)verEl.textContent='v'+info.version;
    }).catch(function(){});
  }
  about.appendChild(el('div','about-desc',t('settings.about_desc')));
  content.appendChild(about);
}

