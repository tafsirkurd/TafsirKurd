'use strict';

/* ===== SEARCH ===== */
var _searchTimer=null;
/* ─── Search result cache ──────────────────────────────────────── */
var _searchCache=new Map();
var _SEARCH_CACHE_MAX=50;
function _cachePut(k,v){if(_searchCache.size>=_SEARCH_CACHE_MAX){_searchCache.delete(_searchCache.keys().next().value);}_searchCache.set(k,v);}
function _cacheInvalidate(){_searchCache.clear();}

/* ─── Search history ───────────────────────────────────────────── */
var _SEARCH_HIST_KEY='qs_history';
var _SEARCH_HIST_MAX=8;
function _shGet(){try{return JSON.parse(localStorage.getItem(_SEARCH_HIST_KEY)||'[]');}catch(e){return[];}}
function _shAdd(q){
  if(!q||q.length<2)return;
  var h=_shGet().filter(function(x){return x!==q;});
  h.unshift(q);
  try{localStorage.setItem(_SEARCH_HIST_KEY,JSON.stringify(h.slice(0,_SEARCH_HIST_MAX)));}catch(e){}
}
function _shClear(){try{localStorage.removeItem(_SEARCH_HIST_KEY);}catch(e){}}
/* --- Search query context (set in _execSearch, used in _mkSearchItem) --- */
var _lastSearchQ={arN:'',arTokens:[],lo:'',loTokens:[]};

/* Extract a context window of ~radius chars centred on normPos */
function _ctxSnippet(text,normPos,radius){
  if(!text)return'';
  radius=radius||70;
  var len=text.length;
  if(len<=radius*2+20)return text;
  var origPos=normPos>=0?Math.min(Math.round(normPos*1.35),len-1):0;
  var start=Math.max(0,origPos-radius);
  var end=Math.min(len,origPos+radius+20);
  while(start>0&&text[start]!==' ')start--;
  while(end<len&&text[end]!==' ')end++;
  return(start>2?'\u2026':'')+text.slice(start,end).trim()+(end<len-2?'\u2026':'');
}

/* Build DOM nodes with highlighted matched tokens.
 * First token in `tokens` is treated as the full phrase (qArN) and gets
 * search-hl--phrase class for a continuous background; subsequent tokens
 * get the lighter search-hl class. */
function _hlNodes(text,tokens,isAr){
  if(!text)return[document.createTextNode('')];
  var REMOVE_AR=/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/;
  var AR_SUBS={'\u0622':'\u0627','\u0623':'\u0627','\u0625':'\u0627','\u0671':'\u0627',
               '\u0649':'\u064A','\u0624':'\u0648','\u0626':'\u064A','\u0629':'\u0647'};
  var norm='',toOrig=[];
  if(isAr){
    for(var i=0;i<text.length;i++){
      var c=text[i];
      if(REMOVE_AR.test(c))continue;
      norm+=(AR_SUBS[c]||c);toOrig.push(i);
    }
  }else{
    for(var i2=0;i2<text.length;i2++){norm+=text[i2].toLowerCase();toOrig.push(i2);}
  }
  var valid=tokens?tokens.filter(function(t){return t&&t.length>=2;}):[];
  if(!valid.length)return[document.createTextNode(text)];
  // ranges: [origStart, origEnd, isPhrase(0|1)]
  var ranges=[];
  for(var t=0;t<valid.length;t++){
    var tok=valid[t],pos=0;
    var isPhraseTok=(t===0&&tok.length>=5); // first token = full normalized phrase
    while(pos<norm.length){
      var idx=norm.indexOf(tok,pos);
      if(idx===-1)break;
      var nEnd=Math.min(idx+tok.length-1,toOrig.length-1);
      if(toOrig[idx]!==undefined&&toOrig[nEnd]!==undefined){
        var oS=toOrig[idx],oE=toOrig[nEnd]+1;
        if(isAr){
          while(oE<text.length&&REMOVE_AR.test(text[oE]))oE++;
          // expand to full word so Arabic letter-joining is never broken at element boundaries
          while(oS>0&&text[oS-1]!==' '&&text[oS-1]!=='\n'&&text[oS-1]!=='،'&&text[oS-1]!=='۔')oS--;
          while(oE<text.length&&text[oE]!==' '&&text[oE]!=='\n'&&text[oE]!=='،'&&text[oE]!=='۔')oE++;
        }
        if(oS<oE)ranges.push([oS,oE,isPhraseTok?1:0]);
      }
      pos=idx+1;
    }
  }
  if(!ranges.length)return[document.createTextNode(text)];
  ranges.sort(function(a,b){return a[0]-b[0];});
  // Merge overlapping ranges; propagate phrase flag through merge
  var merged=[[ranges[0][0],ranges[0][1],ranges[0][2]]];
  for(var r=1;r<ranges.length;r++){
    var last=merged[merged.length-1];
    if(ranges[r][0]<last[1]){
      if(ranges[r][1]>last[1])last[1]=ranges[r][1];
      if(ranges[r][2])last[2]=1; // phrase flag wins
    }else{
      merged.push([ranges[r][0],ranges[r][1],ranges[r][2]]);
    }
  }
  var nodes=[],prev=0;
  for(var m=0;m<merged.length;m++){
    var ms=merged[m][0],me=merged[m][1],ph=merged[m][2];
    if(ms>prev)nodes.push(document.createTextNode(text.slice(prev,ms)));
    var mark=document.createElement('mark');
    mark.className=ph?'search-hl search-hl--phrase':'search-hl';
    mark.textContent=text.slice(ms,me);
    nodes.push(mark);
    prev=me;
  }
  if(prev<text.length)nodes.push(document.createTextNode(text.slice(prev)));
  return nodes;
}

/* Append match-source pills to a result card */
function _appendSrcPills(item,srcs){
  if(!srcs||!srcs.length)return;
  var LABELS={arabic:'Arabic',translation:'\u0648\u06d5\u0631\u06af\u06ce\u0695\u0627\u0646',tafsir:'\u062a\u06d5\u0641\u0633\u06cc\u0631',semantic:'\u0645\u0627\u0646\u0627',surah:'\u0633\u0648\u0648\u0631\u06d5',ref:'\u0626\u0627\u06cc\u06d5\u062a'};
  var pills=document.createElement('div');
  pills.className='search-src-pills';
  srcs.forEach(function(src){
    if(!LABELS[src])return;
    var pill=document.createElement('span');
    pill.className='search-src-pill search-src-pill--'+src;
    pill.textContent=LABELS[src];
    pills.appendChild(pill);
  });
  item.appendChild(pills);
}



App.toggleSearch=function(){
  var bar=$('searchBar');
  bar.classList.toggle('on');
  if(bar.classList.contains('on')){
    var inp=$('searchInput');
    inp.focus();
    // Restore last session query if input is empty
    var lastQ='';try{lastQ=sessionStorage.getItem('qs_last')||'';}catch(e){}
    if(lastQ&&!inp.value){
      inp.value=lastQ;
      App.onSearch(lastQ);
    } else {
      App._renderSearchEmpty();
    }
    // Close when tapping outside the search bar
    setTimeout(function(){
      function _outsideClose(e){
        if(!bar.contains(e.target)){
          document.removeEventListener('pointerdown',_outsideClose,true);
          if(bar.classList.contains('on'))App.toggleSearch();
        }
      }
      document.addEventListener('pointerdown',_outsideClose,true);
    },0);
  } else {
    App.clearSearch();
  }
};

App.clearSearch=function(){
  clearTimeout(_searchTimer);_searchTimer=null;
  $('searchInput').value='';S.search='';
  $('searchResults').classList.remove('on');
  clear($('searchResults'));
};

App._renderSearchEmpty=function(){
  var res=$('searchResults');
  clear(res);
  var wrap=document.createElement('div');
  wrap.className='search-empty';
  var ic=document.createElement('i');
  ic.className='fas fa-magnifying-glass';
  ic.setAttribute('aria-hidden','true');
  wrap.appendChild(ic);
  wrap.appendChild(el('div','search-empty-hint',t('search.placeholder')));
  res.appendChild(wrap);
  res.classList.add('on');
};

/* Suggestions disabled — search only */
App._renderSuggestions=function(){
  var old=$('searchResults').querySelector('.search-suggestions');
  if(old)old.remove();
};

/* Debounced entry point — called on every keystroke */
App.onSearch=function(v){
  clearTimeout(_searchTimer);
  if(!v.trim()){App._renderSearchEmpty();return;}
  // Show live phrase suggestions immediately (no debounce)
  App._renderSuggestions(v);
  // Instant render for cached queries (no debounce needed)
  if(_searchCache.has(v.trim())){App._execSearch(v);return;}
  _searchTimer=setTimeout(function(){App._execSearch(v);},90);
};

/* Actual search execution after debounce */
App._execSearch=function(v){
  var q=v.trim();
  // Strip quote wrappers for display-side normalization (search.js handles them too)
  var isExactMode=(q.length>2&&((q[0]==='"'&&q[q.length-1]==='"')||(q[0]==='«'&&q[q.length-1]==='»')));
  S.search=q;
  var res=$('searchResults');
  if(!q){App._renderSearchEmpty();return;}

  // Build normalized query tokens for context highlighting
  var _qArN=q.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g,'')
             .replace(/[\u0622\u0623\u0625\u0671]/g,'\u0627')
             .replace(/\u0649/g,'\u064A').replace(/\u0624/g,'\u0648')
             .replace(/\u0626/g,'\u064A').replace(/\u0629/g,'\u0647')
             .replace(/\u0648\u0627(\s|$)/g,'\u0648$1').replace(/\u0647\u0627(\s|$)/g,'\u0647$1') // typo fix
             .replace(/\s+/g,' ').trim();
  var _qLo=q.toLowerCase().trim();
  _lastSearchQ={
    arN:_qArN,
    arTokens:_qArN.split(/\s+/).filter(function(t){return t.length>=2;}),
    lo:_qLo,
    loTokens:_qLo.split(/\s+/).filter(function(t){return t.length>=2;})
  };

  // Serve from cache if available (instant, no recompute)
  var cached=_searchCache.get(q);
  if(cached){
    App._renderSearchResults(q,cached,isExactMode);
    return;
  }

  // Persist last successful query for session continuity
  try{sessionStorage.setItem('qs_last',q);}catch(e){}

  if(window.QuranSearch&&QuranSearch.isReady()){
    // queryAsync: cb fires immediately with keyword results, then again with
    // semantic-merged results when the CF Worker responds (or not at all on timeout)
    var _semActiveQ=q; // detect if user typed something new before semantic returns
    QuranSearch.queryAsync(q,SURAHS,30,function(results,isFinal){
      // Discard stale callbacks if the user has moved on
      if(S.search!==_semActiveQ) return;
      _cachePut(q,results);
      App._renderSearchResults(q,results,isExactMode);
    });
  } else {
    var results=App._basicSearch(q);
    _cachePut(q,results);
    App._renderSearchResults(q,results,isExactMode);
  }
};

App._renderSearchResults=function(q,results,isExactMode){
  var res=$('searchResults');
  clear(res);
  if(!results||!results.length){App._renderSearchNoResults(q);return;}
  res.classList.add('on');

  var frag=document.createDocumentFragment();
  // Exact-mode banner
  if(isExactMode){
    var exactBanner=el('div','search-exact-banner',t('search.exact_mode'));
    frag.appendChild(exactBanner);
  }
  // Ayah-first: when query has 2+ tokens, verses always lead; surah cards follow (max 1)
  var _av=results.filter(function(r){return r.type!=='surah';});
  var _as=results.filter(function(r){return r.type==='surah';});
  var _aq=_lastSearchQ.arTokens.filter(function(t){return t.length>=2;}).length>=2;
  var _ord=(_aq&&_av.length>0)?_av.concat(_as.slice(0,1)):results;
  for(var i=0;i<_ord.length;i++){
    var r=_ord[i];
    frag.appendChild(App._mkSearchItem(r,i===0&&r.type==='verse'));
  }
  res.appendChild(frag);
};

/* No-results state — clean message only */
App._renderSearchNoResults=function(q){
  var res=$('searchResults');
  var wrap=document.createElement('div');
  wrap.className='search-noresult';
  wrap.appendChild(el('div','search-noresult-icon','◌'));
  wrap.appendChild(el('div','search-noresult-msg',t('search.no_results')));
  wrap.appendChild(el('div','search-noresult-sub',t('search.no_results_sub')));
  clear(res);
  res.appendChild(wrap);
  res.classList.add('on');
};

/* Build a single result card — clean minimal layout */
App._mkSearchItem=function(r,isPrimary){
  var cls='search-result search-result--'+r.type+(isPrimary?' search-result--primary':'');
  var item=el('div',cls);
  var qArN=_lastSearchQ.arN,arToks=_lastSearchQ.arTokens;
  var qLo=_lastSearchQ.lo,loToks=_lastSearchQ.loTokens;
  var allAr=qArN?[qArN].concat(arToks).filter(function(t){return t&&t.length>=2;}):arToks;
  var allLo=qLo?[qLo].concat(loToks).filter(function(t){return t&&t.length>=2;}):loToks;

  if(r.type==='ref'){
    var badge=document.createElement('div');
    badge.className='search-ref-badge';
    badge.appendChild(el('span','search-ref-surah',r.surahAr||r.surahEn));
    badge.appendChild(el('span','search-ref-num',r.sn+':'+r.an));
    item.appendChild(badge);
    if(r.arO){
      var arDiv=document.createElement('div');
      arDiv.className='search-result-verse-ar';
      _hlNodes(_ctxSnippet(r.arO,r.posAr,90),allAr,true).forEach(function(n){arDiv.appendChild(n);});
      item.appendChild(arDiv);
    }
    if(r.kuO){
      var kuDiv=document.createElement('div');
      kuDiv.className='search-result-ku';
      _hlNodes(_ctxSnippet(r.kuO,r.posKu,110),allLo,false).forEach(function(n){kuDiv.appendChild(n);});
      item.appendChild(kuDiv);
    }
    on(item,'click',(function(sn,an,q){return function(){
      if(navigator.vibrate)navigator.vibrate(8);
      if(window.QuranSearch&&QuranSearch.trackTap)QuranSearch.trackTap(sn,an);
      _shAdd(q);
      App.tab('quran');App.clearSearch();$('searchBar').classList.remove('on');
      setTimeout(function(){App.openSurah(sn,an);},100);
    };})(r.sn,r.an,S.search));

  }else if(r.type==='surah'){
    var row=document.createElement('div');
    row.className='search-surah-row';
    row.appendChild(el('div','search-surah-num',String(r.sn)));
    var info=document.createElement('div');
    info.className='search-surah-info';
    info.appendChild(el('div','search-result-title',r.surahEn));
    info.appendChild(el('div','search-result-sub',r.surahAr+' • '+r.ayahCount+' '+t('reader.ayah')));
    row.appendChild(info);
    item.appendChild(row);
    on(item,'click',(function(sn,q){return function(){
      _shAdd(q);
      App.openSurah(sn);App.clearSearch();$('searchBar').classList.remove('on');
    };})(r.sn,S.search));

  }else{
    var arDiv2=document.createElement('div');
    arDiv2.className='search-result-verse-ar';
    _hlNodes(_ctxSnippet(r.arO,r.posAr,90),allAr,true).forEach(function(n){arDiv2.appendChild(n);});
    item.appendChild(arDiv2);
    var metaRow=el('div','search-result-sub');
    metaRow.textContent=(r.surahAr||r.surahEn)+' • '+t('reader.ayah')+' '+r.an;
    item.appendChild(metaRow);
    if(r.kuO){
      var kuDiv2=document.createElement('div');
      kuDiv2.className='search-result-ku';
      _hlNodes(_ctxSnippet(r.kuO,r.posKu,110),allLo,false).forEach(function(n){kuDiv2.appendChild(n);});
      item.appendChild(kuDiv2);
    }
    on(item,'click',(function(sn,an,q){return function(){
      if(navigator.vibrate)navigator.vibrate(8);
      if(window.QuranSearch&&QuranSearch.trackTap)QuranSearch.trackTap(sn,an);
      _shAdd(q);
      App.tab('quran');App.clearSearch();$('searchBar').classList.remove('on');
      setTimeout(function(){App.openSurah(sn,an);},100);
    };})(r.sn,r.an,S.search));
  }

  return item;
};

/* Lightweight fallback used while QuranSearch index is still building */
App._basicSearch=function(v){
  var q=v.trim().toLowerCase();
  var qD=q.replace(/[\u064B-\u065F\u0670]/g,'');
  var out=[];
  SURAHS.filter(function(s){
    return s.en.toLowerCase().indexOf(q)!==-1||s.ar.indexOf(q)!==-1||String(s.n)===q;
  }).slice(0,4).forEach(function(s){
    out.push({type:'surah',sn:s.n,surahAr:s.ar,surahEn:s.en,ayahCount:s.a,score:800});
  });
  if(q.length>=2&&S.quranData){
    var cnt=0;
    outer:for(var sn=1;sn<=114;sn++){
      var sd=S.quranData[String(sn)];if(!sd)continue;
      var vv=sd.verses||sd;
      var kd=S.tafsirData?(S.tafsirData[sn-1]||{verses:[]}):{verses:[]};
      for(var vi=0;vi<vv.length;vi++){
        var vObj=vv[vi];
        var ar=String(vObj.text||vObj||'').replace(/[\u064B-\u065F\u0670]/g,'');
        var ku=kd.verses&&kd.verses[vi]?String(kd.verses[vi].text||kd.verses[vi].tafsir||''):'';
        if(ar.indexOf(qD)!==-1||ku.toLowerCase().indexOf(q)!==-1){
          var sv=SURAHS[sn-1]||{};
          out.push({type:'verse',sn:sn,an:vi+1,arO:vObj.text||String(vObj),kuO:ku,surahAr:sv.ar||'',surahEn:sv.en||'',score:400});
          if(++cnt>=15)break outer;
        }
      }
    }
  }
  return out;
};

