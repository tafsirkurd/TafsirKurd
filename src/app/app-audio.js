'use strict';

/* ===== AUDIO ===== */
function scrollToAyah(ayahNum){
  var list=$('ayahList');
  if(!list)return;
  var cards=list.querySelectorAll('.ayah-card');
  if(cards[ayahNum-1])cards[ayahNum-1].scrollIntoView({behavior:'smooth',block:'center'});
}

var _readerPlayBtn=null; // cached — avoids querySelectorAll on every ayah change
function updateReaderPlayState(surah,ayah,playing){
  // Clear previous play button directly — no DOM scan needed
  if(_readerPlayBtn){
    _readerPlayBtn.classList.remove('playing');
    var _pi=_readerPlayBtn.querySelector('i');if(_pi)_pi.className='fas fa-play';
    _readerPlayBtn=null;
  }
  if(!playing||!surah)return;
  var list=$('ayahList');
  if(!list)return;
  var card=list.querySelector('.ayah-card[data-ayah="'+ayah+'"]');
  if(!card)return;
  var btn=card.querySelector('[data-play]');
  if(!btn)return;
  btn.classList.add('playing');
  var i=btn.querySelector('i');if(i)i.className='fas fa-pause';
  _readerPlayBtn=btn;
}

function playAyah(surah,ayah){
  if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}
  _audioNextCalled=false;
  var _t0=Date.now();
  var url=audioUrl(surah,ayah);
  // Priority 1: user-downloaded offline copy (persistent Directory.Data — never evicted)
  // Priority 2: transparent LRU cache (Directory.Cache — may be evicted by OS)
  var localUri=(window.AudioDownloads&&AudioDownloads.getLocalUri(RECITER,surah,ayah))
              ||(window.AudioCache&&AudioCache.getLocalUri(RECITER,surah,ayah))||null;
  var src;var _srcType;
  var slot=_pfCache[url];
  if(localUri){
    src=localUri;_srcType='local';
    if(slot){
      if(slot.xhr){slot.xhr.abort();}
      if(slot.blob){URL.revokeObjectURL(slot.blob);}
      delete _pfCache[url];
    }
    AudioCache.touchAccess(RECITER,surah,ayah);
  } else if(_audioBufKey===url&&_audioBuf){
    // Pre-decoded secondary buffer is ready — swap it as the main element src
    src=_audioBuf.src;_srcType='prebuf';
    _audioBuf=null;_audioBufKey=null;
    // Defer revoke: slot.blob === src, must not revoke before audio element loads it
    if(_blobToRevoke)URL.revokeObjectURL(_blobToRevoke);
    _blobToRevoke=src;
    if(slot){
      if(slot.xhr){slot.xhr.abort();}
      // slot.blob already transferred to _blobToRevoke — do NOT revoke here
      delete _pfCache[url];
    }
  } else if(slot&&slot.blob){
    src=slot.blob;_srcType='blob';
    if(_blobToRevoke)URL.revokeObjectURL(_blobToRevoke);
    _blobToRevoke=src;
    delete _pfCache[url];
  } else {
    src=url;_srcType='stream';
    if(slot&&slot.xhr){slot.xhr.abort();delete _pfCache[url];}
    // Show buffering indicator for stream path — user has to wait for network
    setAudioIcon('loading');
  }
  _lastSrcType=_srcType;
  var _nxt=_nextAyahPos(surah,ayah);
  var _gapMs=_audioGapT?Date.now()-_audioGapT:0;
  _audioGapT=0;
  var _nxtUrl=_nxt?audioUrl(_nxt.surah,_nxt.ayah):null;
  var _nxtReady=_nxtUrl&&(
    (_audioBufKey===_nxtUrl&&!!_audioBuf)||
    (!!(_pfCache[_nxtUrl]&&_pfCache[_nxtUrl].blob))
  );
  console.log('[QuranAudioPerf] current='+surah+':'+ayah
    +(_nxt?' next='+_nxt.surah+':'+_nxt.ayah:'')
    +' src='+_srcType+' preloadReady='+!!_nxtReady+' gapMs='+_gapMs);
  S.audio.surah=surah;S.audio.ayah=ayah;
  var _isBlobOrLocal=src.startsWith('blob:')||src.indexOf('://')>-1&&!src.startsWith('http');
  if(!_isBlobOrLocal&&S.audio.el.src===src&&S.audio.el.readyState>=2){
    S.audio.el.currentTime=0;
  }else{
    S.audio.el.src=src;
  }
  S.audio.el.playbackRate=S.audio.speed;
  _playStartT=Date.now();
  S.audio.el.play().catch(function(){});
  S.audio.playing=true;
  updateReaderPlayState(surah,ayah,true);
  showAudioBar();
  if(S.surah===surah&&S.scrollFollowsAudio&&!S.mushafMode)scrollToAyah(ayah);
  updateHighlight(surah,ayah);
  updateMushafPlayBtn();
  // Defer prefetch when streaming — gives audio a 600ms head start on the network
  // before competing fetches begin. Blob/prebuf paths start immediately (already cached).
  if(_srcType==='stream'){
    setTimeout(function(){prefetchAyahBlob(surah,ayah);},600);
  }else{
    prefetchAyahBlob(surah,ayah);
  }
  // Prime secondary decode buffer for the immediate next ayah (if blob already cached)
  if(_nxt)_primeNextBuffer(_nxt.surah,_nxt.ayah);
  if(window.AudioCache)AudioCache.startSurahBg(surah,ayah,RECITER);
  var _transMs=Date.now()-_t0;
  console.log('[QuranAudioPerf] transitionMs='+_transMs+' src='+_srcType+' key='+surah+':'+ayah);
}

function getReciterName(){
  for(var i=0;i<RECITERS.length;i++){if(RECITERS[i].id===RECITER)return RECITERS[i].name}
  return t('audio.reciter');
}

var _lastAvatarReciter=null;
function updateAudioBarAvatar(){
  var avatarEl=$('audioBarAvatar');
  if(!avatarEl)return;
  // Skip rebuild when reciter is unchanged and image state is settled (success or known failure)
  if(RECITER===_lastAvatarReciter&&_imgLoaded[RECITER])return;
  _lastAvatarReciter=RECITER;
  while(avatarEl.firstChild)avatarEl.removeChild(avatarEl.firstChild);
  var photo=RECITER_PHOTOS[RECITER];
  if(photo&&_imgLoaded[RECITER]===true){
    // Decoded — show instantly from browser cache
    var img=document.createElement('img');img.src=photo;img.alt='';avatarEl.appendChild(img);
  } else {
    var rec=RECITERS.find(function(r){return r.id===RECITER;});
    var ini=rec?rec.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join(''):'';
    avatarEl.appendChild(el('span','audio-bar-avatar-initials',ini));
    if(photo&&_imgLoaded[RECITER]!=='err'){
      // URL known, not yet settled — queue upgrade when it loads; onerror silences retries
      var watchId=RECITER;var watchImg=new Image();
      watchImg.onload=function(){_imgLoaded[watchId]=true;if(RECITER===watchId){_lastAvatarReciter=null;updateAudioBarAvatar();}};
      watchImg.onerror=function(){_imgLoaded[watchId]='err';};
      watchImg.src=photo;
    }
  }
}

function _syncAudioBarH(){
  var bar=$('audioBar');
  var h=(bar&&bar.classList.contains('on'))?bar.offsetHeight:0;
  document.documentElement.style.setProperty('--audio-bar-h',h+'px');
}

function showAudioBar(){
  var bar=$('audioBar');
  bar.classList.add('on');
  var s=SURAHS[S.audio.surah-1];
  $('audioTitle').textContent=s?s.ar+' - '+t('reader.ayah')+' '+S.audio.ayah:'';
  $('audioSub').textContent=getReciterName();
  setAudioIcon(S.audio.playing?'pause':'play');
  updateAudioBarAvatar();
  if(typeof _fpOpen!=='undefined'&&_fpOpen)syncFullPlayer();
  requestAnimationFrame(_syncAudioBarH);
}

App.audioToggle=function(){
  haptic([8]);
  if(S.audio.playing){
    S.audio.el.pause();S.audio.playing=false;setAudioIcon('play');updateReaderPlayState(0,0,false);
    document.body.classList.remove('mushaf-audio-playing');
  }else{
    S.audio.el.play().catch(function(){});S.audio.playing=true;setAudioIcon('pause');updateReaderPlayState(S.audio.surah,S.audio.ayah,true);
    if(S.mushafMode)document.body.classList.add('mushaf-audio-playing');
  }
};

App.audioNext=function(){
  // Handle repeat
  if(S.audio.repeatMode==='ayah'){
    S.audio.currentRepeat++;
    if(S.audio.currentRepeat<S.audio.repeatCount){
      playAyah(S.audio.surah,S.audio.ayah);return;
    }
    S.audio.currentRepeat=0;
  }
  var s=SURAHS[S.audio.surah-1];
  if(!s)return;
  if(S.audio.repeatMode==='surah'&&S.audio.ayah>=s.a){
    S.audio.currentRepeat++;
    if(S.audio.currentRepeat<S.audio.repeatCount){
      playAyah(S.audio.surah,1);return;
    }
    S.audio.currentRepeat=0;
  }
  if(S.audio.ayah<s.a){playAyah(S.audio.surah,S.audio.ayah+1)}
  else if(S.audio.surah<114&&(S.mushafMode||S.autoAdvance)){
    var _advSurah=S.audio.surah+1;
    playAyah(_advSurah,1);
    if(S.mushafMode){
      // Mushaf shows full 604-page Quran — update state and scroll, no re-render
      S.surah=_advSurah;
      _scrollMushafToAyah(_advSurah,1,0);
      updateMushafPlayBtn();
    } else if(S.tab==='quran'){
      App.openSurah(_advSurah,1);
    }
  }
  else{App.audioClose()}
};

App.audioPrev=function(){
  haptic([8]);
  S.audio.currentRepeat=0;
  if(S.audio.ayah>1){playAyah(S.audio.surah,S.audio.ayah-1)}
  else if(S.audio.surah>1){var ps=SURAHS[S.audio.surah-2];playAyah(S.audio.surah-1,ps?ps.a:1)}
};

App.audioClose=function(){
  S.audio.el.pause();S.audio.el.src='';
  // Revoke any deferred blob that never reached the playing event
  if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
  document.body.classList.remove('mushaf-audio-playing');
  S.audio.playing=false;S.audio.surah=0;S.audio.ayah=0;
  S.audio.currentRepeat=0;
  clearPrefetch();
  if(window.AudioCache)AudioCache.cancelBg();
  $('audioBar').classList.remove('on');
  requestAnimationFrame(_syncAudioBarH);
  updateReaderPlayState(0,0,false);
  clearAllHighlights();
  if(window._mushafTafsirSheetUpdate)window._mushafTafsirSheetUpdate(0,0);
  updateMushafPlayBtn();
  // Close full player and reset progress
  if(typeof App.closeFP==='function')App.closeFP();
  var bp=$('audioBarProgress');if(bp)bp.style.transform='scaleX(0)';
  var fp=$('fpProgressFill');if(fp)fp.style.transform='scaleX(0)';
};

/* ===== MUSHAF SETTINGS SHEET ===== */
App.openMushafSettings=function(){
  var existing=$('mushafSettingsSheet');
  if(existing)existing.parentNode.removeChild(existing);
  var ov=el('div','mushaf-settings-ov');
  ov.id='mushafSettingsSheet';
  var pane=el('div','mushaf-settings-pane');

  function dismiss(){pane.classList.remove('on');setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);}

  var hdr=el('div','mushaf-settings-hdr');
  hdr.appendChild(el('span','mushaf-settings-title',t('qs.mushaf_settings_title')));
  var xBtn=el('button','mushaf-settings-close');xBtn.appendChild(icon('fas fa-times'));
  on(xBtn,'click',dismiss);hdr.appendChild(xBtn);
  pane.appendChild(hdr);

  var body=el('div','mushaf-settings-body');
  // If audio bar is visible, push sheet content above it
  var _abEl=$('audioBar');
  var _abH=(_abEl&&_abEl.classList.contains('on'))?_abEl.offsetHeight:0;
  if(_abH>0)body.style.paddingBottom='calc(var(--tab-h) + var(--safe-b) + '+(_abH+20)+'px)';

  var _isIpad=document.documentElement.classList.contains('is-ipad')||window.innerWidth>=768;
  var _fsMin=_isIpad?24:23, _fsMax=_isIpad?34:25;
  var _fsKey=_isIpad?'mushafFontSize_ipad_'+S.mushafFont:'mushafFontSize_'+S.mushafFont;
  var _lhKey=_isIpad?'mushafLineH_ipad':'mushafLineH';
  var _lhMax=_isIpad?2.4:2.3;
  // Sync S values and CSS vars from the correct key for this device type
  if(_isIpad){
    var _iFs=Math.min(_fsMax,Math.max(_fsMin,parseInt(localStorage.getItem(_fsKey))||28));
    var _iLh=Math.min(_lhMax,Math.max(1.8,parseFloat(localStorage.getItem(_lhKey))||2.0));
    S.mushafFontSize=_iFs; S.mushafLineH=_iLh;
    document.documentElement.style.setProperty('--mushaf-size',_iFs+'px');
    document.documentElement.style.setProperty('--mushaf-lh',String(_iLh));
  }

  // Font Size stepper
  body.appendChild(el('div','ms-section-label',t('qs.font_size_label')));
  var fsVal=el('span','stepper-val',S.mushafFontSize+'px');
  var fsMBtn,fsPBtn;
  function setFsSize(v){
    v=Math.max(_fsMin,Math.min(_fsMax,Math.round(v)));S.mushafFontSize=v;fsVal.textContent=v+'px';
    document.documentElement.style.setProperty('--mushaf-size',v+'px');
    localStorage.setItem(_fsKey,String(v));
    if(fsMBtn)fsMBtn.disabled=(v<=_fsMin);if(fsPBtn)fsPBtn.disabled=(v>=_fsMax);
    requestAnimationFrame(function(){
      var mv=$('mushafView');
      if(mv){var pgs=mv.querySelectorAll('.mushaf-text-page[data-loaded]');for(var _i=0;_i<pgs.length;_i++)_fitQCFLines(pgs[_i]);}
    });
  }
  var fsCtrl=el('div','setting-stepper');
  fsMBtn=el('button','stepper-btn','-');fsPBtn=el('button','stepper-btn','+');
  on(fsMBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize-1);});
  on(fsPBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize+1);});
  fsMBtn.disabled=(S.mushafFontSize<=_fsMin);fsPBtn.disabled=(S.mushafFontSize>=_fsMax);
  fsCtrl.appendChild(fsMBtn);fsCtrl.appendChild(fsVal);fsCtrl.appendChild(fsPBtn);
  body.appendChild(fsCtrl);

  // Line Height stepper
  body.appendChild(el('div','ms-section-label',t('qs.line_spacing_label')));
  var lhVal=el('span','stepper-val',S.mushafLineH.toFixed(1)+'×');
  var lhCtrl=el('div','setting-stepper');
  var lhMBtn=el('button','stepper-btn','-');var lhPBtn=el('button','stepper-btn','+');
  (function(){
    var min=1.8,max=_lhMax,step=0.1;
    function updLh(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;S.mushafLineH=v;lhVal.textContent=v.toFixed(1)+'×';document.documentElement.style.setProperty('--mushaf-lh',String(v));localStorage.setItem(_lhKey,String(v));lhMBtn.disabled=(v<=min);lhPBtn.disabled=(v>=max);}
    on(lhMBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH-step).toFixed(1)));});
    on(lhPBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH+step).toFixed(1)));});
    lhMBtn.disabled=(S.mushafLineH<=min);lhPBtn.disabled=(S.mushafLineH>=max);
  })();
  lhCtrl.appendChild(lhMBtn);lhCtrl.appendChild(lhVal);lhCtrl.appendChild(lhPBtn);
  body.appendChild(lhCtrl);


  pane.appendChild(body);ov.appendChild(pane);
  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== MUSHAF TAFSIR SHEET ===== */
App.showMushafVerseTafsir=function(vn,sn){
  var existing=$('mushafTafsirSheet');
  if(existing)existing.parentNode.removeChild(existing);
  window._mushafTafsirSheetUpdate=null;

  var txt=getAyahTafsirText(sn,vn);
  var ov=el('div','mushaf-tafsir-ov');
  ov.id='mushafTafsirSheet';
  var pane=el('div','mushaf-tafsir-pane');

  function dismiss(){
    window._mushafTafsirSheetUpdate=null;
    pane.classList.remove('on');
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);
  }

  var hdr=el('div','mushaf-tafsir-hdr');
  var s=SURAHS[(sn||S.surah||1)-1];
  var titleSpan=el('span','mushaf-tafsir-title');
  var gc='surah'+String(sn||S.surah||1).padStart(3,'0');
  var snGlyph=document.createElement('span');
  snGlyph.className='no-kurdish-convert mushaf-tafsir-surah-glyph';
  snGlyph.textContent=gc;
  if(window.QuranFontManager)window.QuranFontManager.onReady('SurahName',function(ok){if(ok)snGlyph.textContent=gc;});
  titleSpan.appendChild(snGlyph);
  titleSpan.appendChild(document.createTextNode(' — '+toArabicNum(vn)));
  hdr.appendChild(titleSpan);

  // Actions: play + close grouped on one side
  var actions=el('div','mushaf-tafsir-actions');

  var playBtn=el('button','mushaf-tafsir-play');
  function _setPlayIcon(playing){
    while(playBtn.firstChild)playBtn.removeChild(playBtn.firstChild);
    playBtn.appendChild(icon(playing?'fas fa-pause':'fas fa-play'));
  }
  _setPlayIcon(S.audio.playing&&S.audio.surah===sn&&S.audio.ayah===vn);
  on(playBtn,'click',function(){
    haptic([8]);
    if(S.audio.playing&&S.audio.surah===sn&&S.audio.ayah===vn){
      App.audioToggle();
      _setPlayIcon(false);
    }else{
      playAyah(sn,vn);
      _setPlayIcon(true);
    }
  });
  actions.appendChild(playBtn);

  var closeBtn=el('button','mushaf-tafsir-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',dismiss);
  actions.appendChild(closeBtn);
  hdr.appendChild(actions);
  pane.appendChild(hdr);

  var body=el('div','mushaf-tafsir-body');
  var txtDiv=el('div',txt?'mushaf-tafsir-txt':'mushaf-tafsir-empty');
  txtDiv.textContent=txt||t('reader.tafsir_empty');
  body.appendChild(txtDiv);
  pane.appendChild(body);
  ov.appendChild(pane);

  // Live hook: updates play icon when audio advances or stops
  window._mushafTafsirSheetUpdate=function(newSurah,newAyah){
    _setPlayIcon(S.audio.playing&&newSurah===sn&&newAyah===vn);
  };

  // Pre-fetch this ayah's audio so play starts instantly
  prefetchAyahBlob(sn,vn-1);

  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== MUSHAF LINE PICKER (multi-ayah shared line) ===== */
App.showMushafLinePicker=function(ayahs){
  var existing=$('mushafPickerSheet');
  if(existing)existing.parentNode.removeChild(existing);

  var ov=el('div','mushaf-tafsir-ov');
  ov.id='mushafPickerSheet';
  var pane=el('div','mushaf-tafsir-pane');

  function dismiss(){
    pane.classList.remove('on');
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);
  }

  var hdr=el('div','mushaf-tafsir-hdr');
  hdr.appendChild(el('span','mushaf-tafsir-title',t('reader.pick_ayah')));
  var closeBtn=el('button','mushaf-tafsir-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',dismiss);
  hdr.appendChild(closeBtn);
  pane.appendChild(hdr);

  var body=el('div','mushaf-tafsir-body');
  ayahs.forEach(function(a){
    var s=SURAHS[(a.sn||1)-1];
    var label=(s?s.n:'')+' — '+t('reader.ayah')+' '+toArabicNum(a.vn);
    var btn=el('button','mushaf-picker-btn');
    btn.textContent=label;
    on(btn,'click',function(){dismiss();setTimeout(function(){App.showMushafVerseTafsir(a.vn,a.sn);},270);});
    body.appendChild(btn);
  });
  pane.appendChild(body);
  ov.appendChild(pane);

  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== COPY MODAL ===== */
App.openCopyModal=function(surah,ayah){
  S.copy.surah=surah;S.copy.ayah=ayah;
  var s=SURAHS[surah-1];
  $('copyModalTitle').textContent=(s?s.en+' — ':'')+t('reader.ayah')+' '+ayah;
  $('copyMainOpts').style.display='';
  $('copyRangeOpts').style.display='none';
  var maxAyah=s?s.a:1;
  $('copyFrom').max=maxAyah;$('copyFrom').value=ayah;
  $('copyTo').max=maxAyah;$('copyTo').value=Math.min(ayah+2,maxAyah);
  $('copyModal').classList.add('on');
};
App.closeCopyModal=function(){$('copyModal').classList.remove('on')};
App.copyShowRange=function(){$('copyMainOpts').style.display='none';$('copyRangeOpts').style.display=''};
App.copyBackToMain=function(){$('copyMainOpts').style.display='';$('copyRangeOpts').style.display='none'};
App.copyFmtSelect=function(btn,fmt){
  S.copy.rangeFmt=fmt;
  document.querySelectorAll('.copy-fmt-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
};
function getAyahTafsirText(surah,ayahNum){
  if(!S.tafsirData)return'';
  var td=S.tafsirData[surah-1]||S.tafsirData[String(surah)];if(!td)return'';
  var tv=td.verses||td;if(!Array.isArray(tv))return'';
  var v=tv[ayahNum-1];return v?(v.text||v.tafsir||String(v)||''):'';
}
function buildCopyText(surah,ayahNum,mode){
  var arabic=getAyahArabicText(surah,ayahNum);
  var tafsir=getAyahTafsirText(surah,ayahNum);
  var lines=[];
  if((mode==='both'||mode==='quran')&&arabic)lines.push(String(ayahNum)+' ﴿ '+arabic+' ﴾');
  if((mode==='both'||mode==='tafsir')&&tafsir)lines.push(tafsir);
  return lines.join('\n');
}
var COPY_FOOTER='\n\nTafsirKurd\nhttps://tafsirkurd.com/links';
App.copyDo=function(mode){
  var text=buildCopyText(S.copy.surah,S.copy.ayah,mode);
  if(!text)return;
  navigator.clipboard&&navigator.clipboard.writeText(text+COPY_FOOTER).then(function(){
    toast(t('toast.copied'));App.closeCopyModal();
  });
};
App.copyRangeDo=function(){
  var s=SURAHS[S.copy.surah-1];if(!s)return;
  var from=Math.max(1,Math.min(parseInt($('copyFrom').value)||1,s.a));
  var to=Math.max(from,Math.min(parseInt($('copyTo').value)||from,s.a));
  var mode=S.copy.rangeFmt;
  var parts=[];
  for(var i=from;i<=to;i++){var txt=buildCopyText(S.copy.surah,i,mode);if(txt)parts.push(txt);}
  if(!parts.length)return;
  navigator.clipboard&&navigator.clipboard.writeText(parts.join('\n\n')+COPY_FOOTER).then(function(){
    toast(t('toast.copied'));App.closeCopyModal();
  });
};

App.openAudioSettings=function(){
  $('audioSettingsPanel').classList.add('on');
  renderAudioSettings();
};
App.closeAudioSettings=function(){
  $('audioSettingsPanel').classList.remove('on');
};

function renderAudioSettings(){
  var body=$('audioSettingsBody');
  clear(body);

  // ── Speed section (top) ──
  body.appendChild(el('div','audio-settings-title',t('audio.speed')));
  var speedSeg=el('div','speed-seg');
  [0.5,0.75,1,1.25,1.5,2].forEach(function(sp){
    var lbl=sp+'x';
    var btn=el('button','speed-seg-btn'+(S.audio.speed===sp?' on':''),lbl);
    on(btn,'click',function(){
      S.audio.speed=sp;
      S.audio.el.playbackRate=sp;
      localStorage.setItem('app_speed',String(sp));
      renderAudioSettings();
    });
    speedSeg.appendChild(btn);
  });
  body.appendChild(speedSeg);

  // ── Reciter section ──
  body.appendChild(el('div','audio-settings-title',t('audio.reciter')));
  var recGrid=el('div','reciter-grid');
  var styleLbls={murattal:t('audio.style_murattal')||'مورتل',mujawwad:t('audio.style_mujawwad')||'مجود',hadr:t('audio.style_hadr')||'حدر'};
  RECITERS.forEach(function(r){
    var isOn=r.id===RECITER;
    var card=el('div','reciter-card'+(isOn?' on':''));

    // Avatar circle — wrap so check badge isn't clipped by overflow:hidden
    var avatarWrap=el('div','reciter-avatar-wrap');
    var avatar=el('div','reciter-avatar');
    var photo=RECITER_PHOTOS[r.id];
    if(photo){
      avatar.classList.add('skel');
      var img=document.createElement('img');
      img.alt=r.name;img.className='reciter-avatar-img';img.loading='lazy';
      img.onload=function(){avatar.classList.remove('skel');};
      img.onerror=function(){
        avatar.classList.remove('skel');
        while(avatar.firstChild)avatar.removeChild(avatar.firstChild);
        var fb=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
        avatar.appendChild(el('span','reciter-avatar-initials',fb));
      };
      img.src=photo;
      avatar.appendChild(img);
    } else {
      var initials=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
      avatar.appendChild(el('span','reciter-avatar-initials',initials));
    }
    avatarWrap.appendChild(avatar);
    if(isOn){var ckDot=el('span','reciter-avatar-check');ckDot.appendChild(el('i','fas fa-check'));avatarWrap.appendChild(ckDot);}
    card.appendChild(avatarWrap);

    // Info
    var info=el('div','reciter-card-info');
    info.appendChild(el('div','reciter-card-name',r.name));
    var meta=el('div','reciter-card-meta');
    if(r.flag)meta.appendChild(el('span','reciter-card-flag',r.flag));
    if(r.style)meta.appendChild(el('span','reciter-card-style',styleLbls[r.style]||r.style));
    info.appendChild(meta);
    card.appendChild(info);

    // Download button (right side of card — stops propagation so it doesn't select reciter)
    if(window.AudioDownloads){
      var dlBtn=el('button','reciter-dl-btn');
      var _dlSt=AudioDownloads.dlState(r.id);
      var _isDling=AudioDownloads.isDownloading(r.id);
      if(_isDling){dlBtn.classList.add('downloading');dlBtn.appendChild(icon('fas fa-spinner fa-spin'));dlBtn.title=t('dl.tip_downloading');}
      else if(_dlSt==='full'){dlBtn.classList.add('has-dl');dlBtn.appendChild(icon('fas fa-check'));dlBtn.title=t('dl.tip_downloaded');}
      else if(_dlSt==='partial'){dlBtn.classList.add('partial');dlBtn.appendChild(icon('fas fa-arrow-down'));dlBtn.title=t('dl.tip_partial');}
      else if(_dlSt==='corrupt'){dlBtn.classList.add('corrupt');dlBtn.appendChild(icon('fas fa-triangle-exclamation'));dlBtn.title=t('dl.tip_corrupt');}
      else{dlBtn.appendChild(icon('fas fa-arrow-down'));dlBtn.title=t('dl.tip_offline');}
      on(dlBtn,'click',function(e){e.stopPropagation();openDlSheet(r.id);});
      card.appendChild(dlBtn);
    }

    on(card,'click',function(){
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      updateAudioBarAvatar();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      else if(S.surah)prefetchAyahBlob(S.surah,(S.audio.ayah||1)-1);
      else showAudioBar();
      toast(r.name);
      // Update active card in-place — no full re-render, user stays in scroll position
      recGrid.querySelectorAll('.reciter-card').forEach(function(c){
        c.classList.remove('on');
        var ck=c.querySelector('.reciter-avatar-check');
        if(ck)ck.parentNode.removeChild(ck);
      });
      card.classList.add('on');
      var ckDot2=el('span','reciter-avatar-check');ckDot2.appendChild(el('i','fas fa-check'));
      avatarWrap.appendChild(ckDot2);
    });
    recGrid.appendChild(card);
  });
  body.appendChild(recGrid);
}

/* ===== DOWNLOAD SHEET ===== */
var _dlSheetOpen=false;
var _dlSheetReciter=null;
var _dlScope='full'; // 'full' | 'surah' — reset each time sheet opens

function openDlSheet(reciterId){
  if(!window.AudioDownloads)return;
  _dlSheetReciter=reciterId;
  _dlScope='full'; // reset scope to full each time sheet opens
  var sheet=$('dlSheet'),overlay=$('dlOverlay');
  if(!sheet)return;
  var rData=RECITERS.filter(function(r){return r.id===reciterId;})[0]||{name:reciterId,flag:''};
  $('dlSheetName').textContent=(rData.flag?rData.flag+' ':'')+rData.name;
  on($('dlSheetClose'),'click',closeDlSheet);
  on(overlay,'click',closeDlSheet);
  renderDlSheetBody(reciterId);
  sheet.classList.add('open');
  overlay.classList.add('on');
  _dlSheetOpen=true;
  // Probe real file sizes from everyayah.com — re-render once we have real data
  AudioDownloads.probeReciterSize(reciterId,function(bytes){
    if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);
  });
}

function closeDlSheet(){
  var sheet=$('dlSheet'),overlay=$('dlOverlay');
  if(sheet)sheet.classList.remove('open');
  if(overlay)overlay.classList.remove('on');
  _dlSheetOpen=false;
  _dlSheetReciter=null;
}

function _fmtVerifyDate(ts){
  if(!ts)return'Never';
  var d=new Date(ts);
  return d.toLocaleDateString()+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}

function _dlCbs(reciterId){
  return {
    onProgress:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},
    onDone:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);renderAudioSettings();toast(t('toast.dl_complete'));},
    onError:function(msg){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);toast(t('toast.dl_stopped')+': '+msg);},
    onCancel:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);renderAudioSettings();}
  };
}

function renderDlSheetBody(reciterId){
  var body=$('dlSheetBody');
  if(!body||!window.AudioDownloads)return;
  clear(body);

  var AD=AudioDownloads;
  var stats=AD.getStats(reciterId);
  var isDling=AD.isDownloading(reciterId);
  var prog=AD.getProgress(reciterId);
  var allSurahs=[];for(var i=1;i<=114;i++)allSurahs.push(i);
  var scopeSurahs=(_dlScope==='surah'&&S.surah)?[S.surah]:allSurahs;
  var _probed=AD._probeCached(reciterId); // null=pending, false=failed, number=real bytes
  var estBytes=AD.estimateBytes(reciterId,scopeSurahs);
  var remBytes=AD.remainingBytes(reciterId,scopeSurahs);

  // ── Scope selector (only when a surah is active) ──
  if(S.surah&&!isDling){
    var surahName2=SURAHS&&SURAHS[S.surah-1]?SURAHS[S.surah-1].n:'';
    var scopeSeg=el('div','dl-scope-seg');
    ['full','surah'].forEach(function(sc){
      var lbl2=sc==='full'?t('dl.full_quran'):'Surah '+S.surah+(surahName2?' — '+surahName2:'');
      var btn=el('button','dl-scope-btn'+(_dlScope===sc?' on':''),lbl2);
      on(btn,'click',function(){if(_dlScope!==sc){_dlScope=sc;renderDlSheetBody(reciterId);}});
      scopeSeg.appendChild(btn);
    });
    body.appendChild(scopeSeg);
  }

  // ── Wi-Fi toggle ──
  if(!isDling){
    var wifiRow=el('div','dl-wifi-row');
    wifiRow.appendChild(el('span','dl-wifi-lbl',t('dl.wifi_only')));
    var toggle=el('div','toggle'+(AD.isWifiOnly()?' on':''));
    toggle.appendChild(el('div','toggle-knob'));
    on(toggle,'click',function(){
      var next=!AD.isWifiOnly();AD.setWifiOnly(next);
      toggle.classList.toggle('on',next);
    });
    wifiRow.appendChild(toggle);
    body.appendChild(wifiRow);
  }

  // ── Determine scope state ──
  var scopeState;
  if(_dlScope==='surah'&&S.surah){
    scopeState=AD.isSurahCorrupt(reciterId,S.surah)?'corrupt':
               AD.isSurahDownloaded(reciterId,S.surah)?'full':
               (remBytes>0&&remBytes<estBytes)?'partial':'none';
  } else {
    scopeState=AD.dlState(reciterId);
  }

  // ── Corrupt warning ──
  if(scopeState==='corrupt'&&!isDling){
    var nCorrupt=_dlScope==='surah'?1:stats.needsRepair.length;
    var cBadge=el('div','dl-corrupt-badge');
    cBadge.appendChild(icon('fas fa-triangle-exclamation'));
    cBadge.appendChild(el('span','',''+nCorrupt+' '+t('dl.surah_word')+(nCorrupt!==1?'s':'')+' '+t('dl.failed_check')));
    body.appendChild(cBadge);
  }

  // ── Status row ──
  var statusRow=el('div','dl-status-row');
  var statusLbl=el('div','dl-status-lbl');
  var statusVal=el('div','dl-status-val');
  var _sizeReady=(_probed!==undefined); // false while probe in flight
  if(isDling&&prog){
    statusLbl.textContent=t('dl.downloading');
    statusVal.textContent=prog.pct+'%';
  } else if(scopeState==='full'){
    statusLbl.textContent=_dlScope==='surah'?t('dl.surah_downloaded'):t('dl.fully_downloaded');
    statusVal.textContent=AD.fmtBytes(stats.bytes);
  } else if(scopeState==='partial'){
    statusLbl.textContent=_dlScope==='surah'?t('dl.partial'):(t('dl.partial')+' ('+stats.surahs+'/114 '+t('dl.surahs')+')');
    statusVal.textContent=(_sizeReady?'':'\u2248')+AD.fmtBytes(remBytes)+' '+t('dl.left');
  } else if(scopeState==='corrupt'){
    statusLbl.textContent=t('dl.partial_issues');
    statusVal.textContent=AD.fmtBytes(stats.bytes);
  } else {
    statusLbl.textContent=t('dl.not_downloaded');
    statusVal.textContent=_sizeReady?AD.fmtBytes(estBytes):t('dl.measuring');
  }
  statusRow.appendChild(statusLbl);
  statusRow.appendChild(statusVal);
  body.appendChild(statusRow);

  // ── Progress bar ──
  if(isDling&&prog){
    var pw=el('div','dl-progress-wrap');
    var pb=el('div','dl-progress-bar');
    var pf=el('div','dl-progress-fill');
    pf.style.width=prog.pct+'%';
    pb.appendChild(pf);pw.appendChild(pb);
    var surahName3=prog.surah&&SURAHS[prog.surah-1]?SURAHS[prog.surah-1].n:'';
    pw.appendChild(el('div','dl-progress-txt','Surah '+prog.surah+(surahName3?' — '+surahName3:'')+' · '+prog.done+'/'+prog.total+' ayahs'));
    body.appendChild(pw);
    setTimeout(function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},1000);
  }

  // ── Actions ──
  if(!isDling){
    // Repair button (when corrupt)
    if(scopeState==='corrupt'){
      var repairList=(_dlScope==='surah'&&S.surah)?[S.surah]:stats.needsRepair.map(Number);
      var repBtn=el('button','dl-action-btn primary');
      repBtn.appendChild(icon('fas fa-wrench'));
      repBtn.appendChild(document.createTextNode(' '+t('dl.repair')+' ('+repairList.length+' '+t('dl.surah_word')+(repairList.length!==1?'s':'')+')'));
      on(repBtn,'click',function(){repBtn.disabled=true;AD.downloadSurahs(reciterId,repairList,_dlCbs(reciterId));setTimeout(function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},400);});
      body.appendChild(repBtn);
    }

    // Download / Continue / Re-download
    var dlIcon=scopeState==='full'?'fas fa-rotate-right':'fas fa-arrow-down';
    var _szEst=_sizeReady?AD.fmtBytes(estBytes):'…';
    var _szRem=_sizeReady?AD.fmtBytes(remBytes)+' '+t('dl.left'):'…';
    var dlLabel=scopeState==='full'?t('dl.redownload_btn')+' ('+_szEst+')':
                scopeState==='partial'?t('dl.continue_btn')+' ('+_szRem+')':
                t('dl.download_btn')+' ('+_szEst+')';
    var dlClass='dl-action-btn'+(scopeState==='corrupt'?' cancel-btn':' primary');
    var dlBtn2=el('button',dlClass);
    if(scopeState==='corrupt')dlBtn2.style.marginTop='8px';
    dlBtn2.appendChild(icon(dlIcon));
    dlBtn2.appendChild(document.createTextNode(' '+dlLabel));
    on(dlBtn2,'click',function(){dlBtn2.disabled=true;AD.downloadSurahs(reciterId,scopeSurahs,_dlCbs(reciterId));setTimeout(function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);},400);});
    body.appendChild(dlBtn2);

    // Verify integrity (shown when there's something downloaded)
    if(stats.bytes>0){
      var verifyRow=el('div','dl-verify-row');
      var verifyLbl=el('span','dl-verify-lbl',stats.verifiedAt?(t('dl.last_checked')+': '+_fmtVerifyDate(stats.verifiedAt)):t('dl.not_verified'));
      var isVer=AD.isVerifying();
      var verifyBtn=el('button','dl-verify-btn',isVer?t('dl.verifying'):t('dl.verify'));
      verifyBtn.disabled=isVer;
      on(verifyBtn,'click',function(){
        verifyBtn.disabled=true;verifyBtn.textContent=t('dl.verifying');
        AD.verifyReciter(reciterId,{
          onProgress:function(done,total){if(_dlSheetOpen&&_dlSheetReciter===reciterId)verifyBtn.textContent=t('dl.verifying')+' '+done+'/'+total+'...';},
          onDone:function(){if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);}
        });
      });
      verifyRow.appendChild(verifyLbl);
      verifyRow.appendChild(verifyBtn);
      body.appendChild(verifyRow);
    }

    // Delete
    if(stats.bytes>0){
      var delBtn=el('button','dl-action-btn danger');
      delBtn.appendChild(icon('fas fa-trash'));
      delBtn.appendChild(document.createTextNode(' '+t('dl.remove')+' ('+AD.fmtBytes(stats.bytes)+')'));
      on(delBtn,'click',function(){
        AD.deleteReciter(reciterId).then(function(){
          if(_dlSheetOpen&&_dlSheetReciter===reciterId)renderDlSheetBody(reciterId);
          renderAudioSettings();toast(t('toast.dl_removed'));
        });
      });
      body.appendChild(delBtn);
    }
  } else {
    // Cancel button while downloading
    var cancelBtn=el('button','dl-action-btn cancel-btn');
    cancelBtn.appendChild(icon('fas fa-stop'));
    cancelBtn.appendChild(document.createTextNode(' '+t('dl.cancel')));
    on(cancelBtn,'click',function(){AD.cancel(reciterId);renderAudioSettings();});
    body.appendChild(cancelBtn);
  }
}

/* ===== FULL PLAYER ===== */
var _fpOpen=false,_fpRafId=null,_fpLastTick=0,_fpProg=0,_fpTextTick=0,_fpLastSurah=0,_fpLastAyah=0,_fpAnimating=false,_fpGen=0;

function _fmtTime(s){
  if(!s||isNaN(s))return'0:00';
  s=Math.floor(s);return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);
}

function _renderFPSpeed(){
  var row=$('fpSpeedRow');if(!row)return;
  clear(row);
  [0.5,0.75,1,1.25,1.5,2].forEach(function(sp){
    var btn=el('button','fp-speed-btn'+(S.audio.speed===sp?' on':''),sp+'x');
    on(btn,'click',function(){
      S.audio.speed=sp;S.audio.el.playbackRate=sp;
      localStorage.setItem('app_speed',String(sp));
      haptic([8]);_renderFPSpeed();
    });
    row.appendChild(btn);
  });
}

function _fpGetAyahText(surah,ayah){
  if(!S.quranData||!surah||!ayah)return'';
  try{
    var sd=S.quranData[String(surah)];if(!sd)return'';
    var vv=sd.verses||sd;var v=vv[ayah-1];if(!v)return'';
    return String(v.text||v||'');
  }catch(e){return'';}
}

function _fpUpdateAyahs(surah,ayah,instant){
  if(!surah||!ayah)return;
  var area=$('fpAyahArea');if(!area)return;
  if(surah===_fpLastSurah&&ayah===_fpLastAyah)return;
  function _fill(){
    var s=SURAHS[surah-1],total=s?s.a:0;
    var p=$('fpAyahPrev'),c=$('fpAyahCurr'),n=$('fpAyahNext');
    if(p)p.textContent=ayah>1?_fpGetAyahText(surah,ayah-1):'';
    if(c){c.textContent=_fpGetAyahText(surah,ayah);c.scrollTop=0;}
    if(n)n.textContent=ayah<total?_fpGetAyahText(surah,ayah+1):'';
    _fpLastSurah=surah;_fpLastAyah=ayah;
  }
  if(instant||_fpAnimating){
    _fpGen++; // invalidate any pending delayed callback for a stale ayah
    _fill();return;
  }
  _fpAnimating=true;
  _fpGen++;var myGen=_fpGen;
  area.classList.add('fp-out');
  setTimeout(function(){
    // Skip fill only if instant-path ran after us (incremented _fpGen past myGen)
    if(_fpGen===myGen)_fill();
    area.classList.add('fp-in');
    area.classList.remove('fp-out');
    area.offsetHeight; // force reflow — browser registers fp-in state
    area.classList.remove('fp-in'); // CSS transition fires: opacity 0→1, translateY 8→0
    setTimeout(function(){_fpAnimating=false;},350);
  },260);
}

function syncFullPlayer(){
  if(!_fpOpen)return;
  var fpAv=$('fpAvatar');
  if(fpAv){
    clear(fpAv);
    var photo=RECITER_PHOTOS[RECITER];
    if(photo&&_imgLoaded[RECITER]===true){
      // Image already decoded — show instantly, no flash
      var img=document.createElement('img');
      img.alt='';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';
      img.src=photo;fpAv.appendChild(img);
    } else if(photo&&_imgLoaded[RECITER]!=='err'){
      // URL known, not yet settled — show initials immediately, crossfade to image when ready
      var rec=RECITERS.find(function(r){return r.id===RECITER;});
      var ini=rec?rec.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join(''):'';
      var initEl=el('span','fp-avatar-initials',ini);
      fpAv.appendChild(initEl);
      var fpPre=new Image();var fpId=RECITER;var fpUrl=photo;
      fpPre.onload=function(){
        _imgLoaded[fpId]=true;
        if(!_fpOpen||RECITER!==fpId)return;
        var realImg=document.createElement('img');realImg.alt='';
        realImg.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;opacity:0;transition:opacity .3s ease';
        realImg.src=fpUrl;fpAv.appendChild(realImg);
        requestAnimationFrame(function(){requestAnimationFrame(function(){realImg.style.opacity='1';});});
        setTimeout(function(){if(fpAv.contains(initEl))fpAv.removeChild(initEl);},350);
      };
      fpPre.onerror=function(){_imgLoaded[fpId]='err';};
      fpPre.src=photo;
    } else {
      // No URL or known-broken URL — initials only
      var rec2=RECITERS.find(function(r){return r.id===RECITER;});
      var ini2=rec2?rec2.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join(''):'';
      fpAv.appendChild(el('span','fp-avatar-initials',ini2));
    }
    fpAv.classList.toggle('playing',S.audio.playing);
  }
  var s=SURAHS[S.audio.surah-1];
  var se=$('fpSurah');
  if(se)se.textContent=s?(s.ar+' · '+(t('reader.ayah')||'ئایەت')+' '+S.audio.ayah):'';
  var re=$('fpReciter');if(re)re.textContent=getReciterName();
  var fi=$('fpPlayIcon');if(fi)fi.className=S.audio.playing?'fas fa-pause':'fas fa-play';
  _renderFPSpeed();
  _fpUpdateAyahs(S.audio.surah,S.audio.ayah);
}

function _fpTick(ts){
  if(!_fpOpen){_fpRafId=null;return;}
  var dt=ts-_fpLastTick;_fpLastTick=ts;
  var ae=S.audio.el;
  if(ae&&ae.duration>0&&!isNaN(ae.duration)){
    var target=ae.currentTime/ae.duration;
    // Time-based exponential lerp — smooth at any frame rate, ~100ms convergence
    _fpProg+=((target-_fpProg)*Math.min(1,(dt||16)*0.009));
    var fill=$('fpProgressFill');if(fill)fill.style.transform='scaleX('+_fpProg+')';
    var bp=$('audioBarProgress');if(bp)bp.style.transform='scaleX('+_fpProg+')';
    // Text labels update every ~1s (cheap writes, no layout thrash)
    if(ts-_fpTextTick>900){
      _fpTextTick=ts;
      var cur=$('fpCurrent');if(cur)cur.textContent=_fmtTime(ae.currentTime);
      var dur=$('fpDuration');if(dur)dur.textContent=_fmtTime(ae.duration);
    }
  }
  _fpRafId=requestAnimationFrame(_fpTick);
}

function _buildRecPicker(){
  var list=$('rpList');if(!list)return;
  clear(list);
  var styleLbls={murattal:t('audio.style_murattal')||'مورتل',mujawwad:t('audio.style_mujawwad')||'مجود',hadr:t('audio.style_hadr')||'حدر'};
  RECITERS.forEach(function(r){
    var isOn=r.id===RECITER;
    var item=el('div','rp-item'+(isOn?' on':''));
    // Avatar
    var av=el('div','rp-av');
    var photo=RECITER_PHOTOS[r.id];
    if(photo&&_imgLoaded[r.id]===true){
      // Decoded — show instantly from browser cache, no crossfade needed
      var avImg=document.createElement('img');avImg.alt='';avImg.src=photo;
      av.appendChild(avImg);
    } else if(photo&&_imgLoaded[r.id]!=='err'){
      // URL known, not yet settled — show initials + crossfade to image when loaded
      var rpIni=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
      var rpIniEl=el('span','rp-ini',rpIni);
      av.appendChild(rpIniEl);
      (function(av2,iniEl2,id2,url2){
        var rpPre=new Image();
        rpPre.onload=function(){
          _imgLoaded[id2]=true;
          var ri=document.createElement('img');ri.alt='';
          ri.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;opacity:0;transition:opacity .25s ease';
          ri.src=url2;av2.appendChild(ri);
          requestAnimationFrame(function(){requestAnimationFrame(function(){ri.style.opacity='1';});});
          setTimeout(function(){if(av2.contains(iniEl2))av2.removeChild(iniEl2);},300);
        };
        rpPre.onerror=function(){_imgLoaded[id2]='err';};
        rpPre.src=url2;
      })(av,rpIniEl,r.id,photo);
    } else {
      // No URL or known-broken URL — initials only, no retry
      var rpFallIni=r.name.trim().split(/\s+/).slice(0,2).map(function(w){return w.charAt(0);}).join('');
      av.appendChild(el('span','rp-ini',rpFallIni));
    }
    item.appendChild(av);
    // Info
    var info=el('div','rp-info');
    info.appendChild(el('div','rp-name',r.name));
    var meta=el('div','rp-meta');
    if(r.flag)meta.appendChild(el('span','rp-flag',r.flag));
    if(r.style)meta.appendChild(el('span','rp-style',styleLbls[r.style]||r.style));
    info.appendChild(meta);
    item.appendChild(info);
    // Checkmark
    var chk=el('div','rp-check');chk.appendChild(el('i','fas fa-check'));
    item.appendChild(chk);
    // Download button
    if(window.AudioDownloads){
      var rpDlBtn=el('button','reciter-dl-btn');
      var rpDlSt=AudioDownloads.dlState(r.id);
      var rpDling=AudioDownloads.isDownloading(r.id);
      if(rpDling){rpDlBtn.classList.add('downloading');rpDlBtn.appendChild(icon('fas fa-spinner fa-spin'));rpDlBtn.title=t('dl.tip_downloading');}
      else if(rpDlSt==='full'){rpDlBtn.classList.add('has-dl');rpDlBtn.appendChild(icon('fas fa-check'));rpDlBtn.title=t('dl.tip_downloaded_s');}
      else if(rpDlSt==='partial'){rpDlBtn.classList.add('partial');rpDlBtn.appendChild(icon('fas fa-arrow-down'));rpDlBtn.title=t('dl.tip_partial_s');}
      else if(rpDlSt==='corrupt'){rpDlBtn.classList.add('corrupt');rpDlBtn.appendChild(icon('fas fa-triangle-exclamation'));rpDlBtn.title=t('dl.tip_corrupt_s');}
      else{rpDlBtn.appendChild(icon('fas fa-arrow-down'));rpDlBtn.title=t('dl.tip_offline');}
      on(rpDlBtn,'click',function(e){e.stopPropagation();App.closeRecPicker();openDlSheet(r.id);});
      item.appendChild(rpDlBtn);
    }
    // Click
    on(item,'click',function(){
      haptic([8]);
      App.closeRecPicker();
      if(RECITER===r.id)return;
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      _fpProg=0; // reset interpolated progress for new track
      updateAudioBarAvatar();
      syncFullPlayer();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      else if(S.surah)prefetchAyahBlob(S.surah,(S.audio.ayah||1)-1);
      else showAudioBar();
      toast(r.name);
    });
    list.appendChild(item);
  });
  // Center active reciter in list after sheet opens
  var onIdx=RECITERS.findIndex(function(r){return r.id===RECITER;});
  if(onIdx>1){
    setTimeout(function(){
      var items=list.querySelectorAll('.rp-item');
      var item=items[onIdx];if(!item)return;
      var listH=list.clientHeight,itemH=item.offsetHeight;
      list.scrollTop=Math.max(0,item.offsetTop-(listH-itemH)/2);
    },340);
  }
}

// Generic drag-to-close for bottom sheets.
// scrollEl: if provided, drag is suppressed when touch starts inside it with scrollTop>0
function _attachSheetDrag(sheet,overlay,closeFn,scrollEl,openClass){
  var _openClass=openClass||'open';
  var startY=0,dragY=0,active=false,dragging=false,_hist=[];
  var SPRING='cubic-bezier(.22,1,.36,1)',EASE_IN='cubic-bezier(.55,0,1,1)';
  // Progressive resistance: linear up to 100px, then increasing drag beyond
  function _resist(dy){return dy<=100?dy*0.85:85+(dy-100)*0.35;}
  sheet.addEventListener('touchstart',function(e){
    if(!sheet.classList.contains(_openClass))return; // ignore touches when sheet is closed
    if(scrollEl&&scrollEl.contains(e.target)&&scrollEl.scrollTop>2)return;
    startY=e.touches[0].clientY;dragY=0;active=true;dragging=false;_hist=[];
  },{passive:true});
  sheet.addEventListener('touchmove',function(e){
    if(!active)return;
    var dy=e.touches[0].clientY-startY;
    if(dy<0)dy=0;
    if(!dragging&&dy>6){
      dragging=true;
      sheet.style.transition='none';
      if(overlay)overlay.style.transition='none';
    }
    if(!dragging)return;
    dragY=dy;
    // Track last 80ms of movement for velocity calculation
    var now=Date.now();
    _hist.push({y:e.touches[0].clientY,t:now});
    if(_hist.length>8)_hist.shift();
    var visual=_resist(dragY);
    sheet.style.transform='translateY('+visual+'px)';
    if(overlay)overlay.style.opacity=String(Math.max(0,1-visual/Math.max(sheet.offsetHeight,300)*1.4));
  },{passive:true});
  function _end(){
    if(!active)return;
    active=false;
    if(!dragging)return;
    dragging=false;
    // Velocity: px/ms over the last 80ms window
    var vel=0;
    if(_hist.length>=2){
      var now=Date.now(),old=null;
      for(var i=0;i<_hist.length;i++){if(now-_hist[i].t<=80){old=_hist[i];break;}}
      if(old){var last=_hist[_hist.length-1],dt=last.t-old.t;if(dt>0)vel=(last.y-old.y)/dt;}
    }
    var shouldClose=dragY>80||vel>0.5;
    if(shouldClose){
      sheet.style.transition='transform .24s '+EASE_IN;
      sheet.style.transform='translateY(200%)';
      if(overlay){overlay.style.transition='opacity .24s ease-out';overlay.style.opacity='0';}
      // Delay closeFn so the slide-out animation plays before display:none is applied
      setTimeout(function(){
        closeFn();
        sheet.style.transition='';sheet.style.transform='';
        if(overlay){overlay.style.transition='';overlay.style.opacity='';}
      },260);
    } else {
      sheet.style.transition='transform .3s '+SPRING;
      sheet.style.transform='translateY(0)';
      if(overlay){overlay.style.transition='';overlay.style.opacity='';}
      setTimeout(function(){sheet.style.transition='';sheet.style.transform='';},340);
    }
  }
  sheet.addEventListener('touchend',_end,{passive:true});
  sheet.addEventListener('touchcancel',function(){
    if(!active)return;active=false;dragging=false;
    sheet.style.transition='';sheet.style.transform='';
    if(overlay){overlay.style.transition='';overlay.style.opacity='';}
  },{passive:true});
}

var _rpDragInited=false;
App.openRecPicker=function(){
  // Only open when the full player is actually showing — blocks all rogue call paths
  var fp=$('fullPlayer');
  if(!fp||!fp.classList.contains('open'))return;
  _buildRecPicker();
  var ov=$('rpOverlay'),pk=$('recPicker');
  if(!ov||!pk)return;
  if(!_rpDragInited){_rpDragInited=true;_attachSheetDrag(pk,ov,App.closeRecPicker,$('rpList'));}
  haptic([5]);
  ov.style.display='';ov.classList.add('open');
  pk.style.display='';pk.classList.add('open');
};

App.closeRecPicker=function(){
  var ov=$('rpOverlay'),pk=$('recPicker');
  if(ov){ov.classList.remove('open');ov.style.display='none';}
  if(pk){pk.classList.remove('open');pk.style.display='none';}
};

var _fpDragInited=false;
App.openFP=function(){
  if(!S.audio.surah)return;
  var ov=$('fpOverlay'),pl=$('fullPlayer');
  if(!ov||!pl)return;
  if(!_fpDragInited){_fpDragInited=true;_attachSheetDrag(pl,ov,App.closeFP,$('fpAyahArea'));}
  // Seed interpolated progress to current position — prevents slide-from-zero on open
  var ae=S.audio.el;
  if(ae&&ae.duration>0&&!isNaN(ae.duration))_fpProg=ae.currentTime/ae.duration;
  _fpOpen=true;
  _fpUpdateAyahs(S.audio.surah,S.audio.ayah,true); // instant first — seeds _fpLastSurah/Ayah
  syncFullPlayer(); // _fpUpdateAyahs inside hits the guard and returns early — no animation
  ov.classList.add('open');
  pl.classList.add('open');
  if(!_fpRafId)_fpRafId=requestAnimationFrame(_fpTick);
};

App.closeFP=function(){
  _fpOpen=false;
  _fpProg=0;
  _fpLastSurah=0;_fpLastAyah=0;_fpAnimating=false;_fpGen=0;
  var ov=$('fpOverlay'),pl=$('fullPlayer');
  if(ov)ov.classList.remove('open');
  if(pl)pl.classList.remove('open');
  if(_fpRafId){cancelAnimationFrame(_fpRafId);_fpRafId=null;}
  // Rec-picker is a child of the full-player flow — close it when the player closes
  App.closeRecPicker();
};

/* ===== REPEAT MANAGER ===== */
App.openRepeat=function(){
  var modal=$('repeatModal');
  modal.classList.add('on');
  // Set single verse to current playing ayah
  if(S.audio.surah&&S.audio.ayah){
    $('rmSingleInput').value=S.audio.surah+':'+S.audio.ayah;
  }
  // Populate surah select
  var sel=$('rmSurahSelect');
  if(!sel.children.length){
    SURAHS.forEach(function(s){
      var opt=document.createElement('option');
      opt.value=s.n;
      opt.textContent=s.n+'. '+s.ar+' ('+s.en+')';
      sel.appendChild(opt);
    });
  }
  if(S.audio.surah)sel.value=S.audio.surah;
  // Reset counters display
  $('rmPlayCount').textContent=S.rm.playCount;
  $('rmVerseCount').textContent=S.rm.verseRepeat;
  $('rmDelayCount').textContent=S.rm.delay;
};

App.closeRepeat=function(){
  $('repeatModal').classList.remove('on');
};

App.repeatMode=function(mode){
  S.rm.mode=mode;
  document.querySelectorAll('.repeat-tab').forEach(function(t){
    t.classList.toggle('on',t.getAttribute('data-rmode')===mode);
  });
  $('rmSingle').classList.toggle('hide',mode!=='single');
  $('rmRange').classList.toggle('hide',mode!=='range');
  $('rmSurah').classList.toggle('hide',mode!=='surah');
};

App.rmCounter=function(type,dir){
  if(type==='play'){
    S.rm.playCount=Math.max(1,S.rm.playCount+dir);
    $('rmPlayCount').textContent=S.rm.playCount;
  }else if(type==='verse'){
    S.rm.verseRepeat=Math.max(1,S.rm.verseRepeat+dir);
    $('rmVerseCount').textContent=S.rm.verseRepeat;
  }else if(type==='delay'){
    S.rm.delay=Math.max(0,S.rm.delay+dir);
    $('rmDelayCount').textContent=S.rm.delay;
  }
};

App.startRepeat=function(){
  var verses=[];
  if(S.rm.mode==='single'){
    var val=$('rmSingleInput').value;
    var p=val.split(':');
    if(p.length===2)verses.push({surah:parseInt(p[0]),ayah:parseInt(p[1])});
  }else if(S.rm.mode==='range'){
    var sv=$('rmRangeStart').value,ev=$('rmRangeEnd').value;
    var sp=sv.split(':'),ep=ev.split(':');
    if(sp.length===2&&ep.length===2){
      var ss=parseInt(sp[0]),sa=parseInt(sp[1]),es=parseInt(ep[0]),ea=parseInt(ep[1]);
      if(ss===es){for(var i=sa;i<=ea;i++)verses.push({surah:ss,ayah:i})}
      else{
        // Cross-surah: rest of start surah + full middle surahs + start of end surah
        var si=SURAHS[ss-1];if(si)for(var i=sa;i<=si.a;i++)verses.push({surah:ss,ayah:i});
        for(var s=ss+1;s<es;s++){var si2=SURAHS[s-1];if(si2)for(var i=1;i<=si2.a;i++)verses.push({surah:s,ayah:i})}
        for(var i=1;i<=ea;i++)verses.push({surah:es,ayah:i});
      }
    }
  }else if(S.rm.mode==='surah'){
    var sn=parseInt($('rmSurahSelect').value);
    var si=SURAHS[sn-1];
    if(si)for(var i=1;i<=si.a;i++)verses.push({surah:sn,ayah:i});
  }
  if(!verses.length){toast(t('toast.no_verse'));return}
  App.closeRepeat();
  rmPlaySequence(verses);
};

var _rmActiveOnEnd=null; // track active ended listener to prevent duplication
function rmPlaySequence(verses){
  // Remove any lingering ended listener from a previous sequence
  if(_rmActiveOnEnd&&S.audio.el){S.audio.el.removeEventListener('ended',_rmActiveOnEnd);_rmActiveOnEnd=null;}
  S.rm.isPlaying=true;
  S.rm.currentPlay=0;
  $('repeatStatus').classList.add('on');
  rmUpdateStatus();

  function playRound(){
    if(!S.rm.isPlaying)return;
    if(S.rm.currentPlay>=S.rm.playCount){
      S.rm.isPlaying=false;
      $('repeatStatus').classList.remove('on');
      toast(t('toast.repeat_done'));
      return;
    }
    var vi=0;
    function playVerse(){
      if(!S.rm.isPlaying)return;
      if(vi>=verses.length){
        S.rm.currentPlay++;
        rmUpdateStatus();
        if(S.rm.currentPlay<S.rm.playCount){
          setTimeout(playRound,S.rm.delay*1000);
        }else{
          S.rm.isPlaying=false;
          $('repeatStatus').classList.remove('on');
          toast(t('toast.repeat_done'));
        }
        return;
      }
      var v=verses[vi];
      var vr=0;
      function repeatV(){
        if(!S.rm.isPlaying)return;
        if(vr>=S.rm.verseRepeat){
          vi++;
          setTimeout(playVerse,S.rm.delay*1000);
          return;
        }
        playAyah(v.surah,v.ayah);
        vr++;
        rmUpdateStatus();
        var aud=S.audio.el;
        // Remove any previous ended listener before adding a new one
        if(_rmActiveOnEnd){aud.removeEventListener('ended',_rmActiveOnEnd);_rmActiveOnEnd=null;}
        var onEnd=function(){
          _rmActiveOnEnd=null;
          aud.removeEventListener('ended',onEnd);
          if(vr<S.rm.verseRepeat){
            setTimeout(repeatV,S.rm.delay*1000);
          }else{
            vi++;
            setTimeout(playVerse,S.rm.delay*1000);
          }
        };
        _rmActiveOnEnd=onEnd;
        aud.addEventListener('ended',onEnd);
      }
      repeatV();
    }
    playVerse();
  }
  playRound();
}

function rmUpdateStatus(){
  $('repeatStatusText').textContent=t('repeat.status',{current:S.rm.currentPlay+1,total:S.rm.playCount});
}

App.stopRepeat=function(){
  S.rm.isPlaying=false;
  if(_rmActiveOnEnd&&S.audio.el){S.audio.el.removeEventListener('ended',_rmActiveOnEnd);_rmActiveOnEnd=null;}
  $('repeatStatus').classList.remove('on');
  toast(t('toast.repeat_stopped'));
};

