'use strict';

/* ===== BOOKMARKS ===== */
/*
 * Architecture: in-memory map (_bmMap) is the authoritative runtime state.
 * Reads are O(1). Writes are coalesced — rapid taps produce one storage write.
 * UI updates surgically (one card, one button). No full re-render on toggle.
 */
var _bmMap={};          // "surah:ayah" → bookmark object
var _bmSaveTimer=null;  // coalesced-write timer

function _bmKey(s,a){return s+':'+a;}

function _loadBookmarks(){
  try{
    var arr=JSON.parse(localStorage.getItem('app_bookmarks')||'[]');
    _bmMap={};
    arr.forEach(function(b){if(b&&b.surah&&b.ayah)_bmMap[_bmKey(b.surah,b.ayah)]=b;});
  }catch(e){_bmMap={};}
}

function _bmToArray(){
  return Object.keys(_bmMap).map(function(k){return _bmMap[k];});
}

// O(1) bookmark check — used directly in card rendering
function isBookmarked(surah,ayah){return !!_bmMap[_bmKey(surah,ayah)];}

// Coalesced save: any number of taps within 300ms → exactly one write
function _scheduleBmSave(){
  clearTimeout(_bmSaveTimer);
  _bmSaveTimer=setTimeout(function(){
    try{localStorage.setItem('app_bookmarks',JSON.stringify(_bmToArray()));}catch(e){}
    debouncedSync();
  },300);
}

// Returns array for bookmarks tab / export (reads from in-memory map)
function getBookmarks(){return _bmToArray();}

// Direct write — used by note edits and deletions from bookmarks tab
function saveBookmarks(bms){
  _bmMap={};
  bms.forEach(function(b){if(b&&b.surah&&b.ayah)_bmMap[_bmKey(b.surah,b.ayah)]=b;});
  try{localStorage.setItem('app_bookmarks',JSON.stringify(bms));}catch(e){}
  debouncedSync();
}

// Toggle bookmark — returns true if added, false if removed
function toggleBookmark(surah,ayah){
  var key=_bmKey(surah,ayah);
  if(_bmMap[key]){
    delete _bmMap[key];
    _scheduleBmSave();
    haptic([8]);
    toast(t('toast.bookmark_removed'));
    return false;
  }else{
    _bmMap[key]={surah:surah,ayah:ayah,date:Date.now(),note:''};
    _scheduleBmSave();
    haptic([20]);
    toast(t('toast.bookmark_added'));
    return true;
  }
}

function renderBookmarks(){
  var bms=getBookmarks();

  // Stats
  var stats=$('bmStats');
  clear(stats);
  var row=el('div','stats-row');
  [{v:bms.length,l:t('bookmarks.total')},{v:new Set(bms.map(function(b){return b.surah})).size,l:t('bookmarks.surahs')},{v:bms.filter(function(b){return b.note}).length,l:t('bookmarks.notes')}].forEach(function(s){
    var card=el('div','stat-card');
    card.appendChild(el('div','stat-val',String(s.v)));
    card.appendChild(el('div','stat-lbl',s.l));
    row.appendChild(card);
  });
  stats.appendChild(row);

  // Controls
  var ctrls=$('bmControls');
  clear(ctrls);
  if(bms.length){
    var ctrlDiv=el('div','bm-controls');
    var inp=el('input','');
    inp.type='text';inp.placeholder=t('search.bookmarks');
    on(inp,'input',function(){S.bmSearch=this.value.toLowerCase();renderBmList(bms)});
    ctrlDiv.appendChild(inp);
    var sel=document.createElement('select');
    sel.className='';
    [['newest',t('bookmarks.sort.newest')],['oldest',t('bookmarks.sort.oldest')],['surah',t('bookmarks.sort.surah')]].forEach(function(o){
      var opt=document.createElement('option');
      opt.value=o[0];opt.textContent=o[1];
      if(S.bmSort===o[0])opt.selected=true;
      sel.appendChild(opt);
    });
    on(sel,'change',function(){S.bmSort=this.value;renderBmList(bms)});
    ctrlDiv.appendChild(sel);
    ctrls.appendChild(ctrlDiv);
  }

  renderBmList(bms);
}

function getAyahArabicText(surah,ayah){
  if(!S.quranData)return'';
  var sd=S.quranData[String(surah)];if(!sd)return'';
  var vv=sd.verses||sd;if(!Array.isArray(vv))return'';
  var v=vv[ayah-1];return v?(v.text||v):'';
}

function renderBmList(bms){
  var list=$('bmList');
  clear(list);

  var filtered=bms;
  if(S.bmSearch){
    filtered=bms.filter(function(b){
      var s=SURAHS[b.surah-1];
      return s&&(s.en.toLowerCase().indexOf(S.bmSearch)!==-1||s.ar.indexOf(S.bmSearch)!==-1||(b.note||'').toLowerCase().indexOf(S.bmSearch)!==-1);
    });
  }

  if(S.bmSort==='newest')filtered.sort(function(a,b){return(b.date||0)-(a.date||0)});
  if(S.bmSort==='oldest')filtered.sort(function(a,b){return(a.date||0)-(b.date||0)});
  if(S.bmSort==='surah')filtered.sort(function(a,b){return a.surah-b.surah||a.ayah-b.ayah});

  if(!filtered.length){
    var empty=el('div','bm-empty');
    empty.appendChild(icon('fas fa-bookmark'));
    empty.appendChild(el('p','',t('bookmarks.empty')));
    list.appendChild(empty);
    return;
  }

  filtered.forEach(function(bm){
    var s=SURAHS[bm.surah-1];
    if(!s)return;
    var card=el('div','bm-card');

    var hdr=el('div','bm-card-hdr');
    hdr.appendChild(el('div','bm-card-title',s.en+' - '+s.ar));
    hdr.appendChild(el('div','bm-card-verse',t('reader.ayah')+' '+bm.ayah));
    card.appendChild(hdr);

    // Arabic ayah text
    var arabicText=getAyahArabicText(bm.surah,bm.ayah);
    if(arabicText){
      card.appendChild(el('div','bm-card-arabic',arabicText));
    }

    if(bm.note){
      card.appendChild(el('div','bm-card-note',bm.note));
    }

    var actions=el('div','bm-card-actions');

    var openBtn=el('button','bm-card-btn');
    openBtn.appendChild(icon('fas fa-book-open'));
    openBtn.appendChild(document.createTextNode(' '+t('bookmarks.open')));
    on(openBtn,'click',function(){App.tab('quran');setTimeout(function(){App.openSurah(bm.surah,bm.ayah)},100)});
    actions.appendChild(openBtn);

    var noteBtn=el('button','bm-card-btn');
    noteBtn.appendChild(icon('fas fa-pen'));
    noteBtn.appendChild(document.createTextNode(' '+t('bookmarks.note')));
    on(noteBtn,'click',function(){
      var note=prompt(t('bookmarks.note_prompt'),bm.note||'');
      if(note!==null){bm.note=note;saveBookmarks(getBookmarks().map(function(b){return b.surah===bm.surah&&b.ayah===bm.ayah?bm:b}));renderBookmarks()}
    });
    actions.appendChild(noteBtn);

    var delBtn=el('button','bm-card-btn danger');
    delBtn.appendChild(icon('fas fa-trash'));
    on(delBtn,'click',function(){
      saveBookmarks(getBookmarks().filter(function(b){return!(b.surah===bm.surah&&b.ayah===bm.ayah)}));
      renderBookmarks();
      toast(t('toast.bookmark_removed'));
    });
    actions.appendChild(delBtn);

    card.appendChild(actions);
    list.appendChild(card);
  });
}

/* ===== GOALS ===== */
// Clear only goal counters — preserves general Quran reading position (surah_progress_*, lastRead, bookmarks)
function _clearGoalCounters(){
  localStorage.removeItem('readLog');
  localStorage.removeItem('readAyahsToday');
  localStorage.removeItem('bestStreak');
  localStorage.removeItem('readSessions');
  localStorage.setItem('trackingResetAt',new Date().toISOString());
  S.todayVerses=new Set();
}
// Full tracking reset — also wipes ayah-level read marks from Quran pages
function _clearTrackingState(){
  // Cancel any pending scheduleSave timer so it can't re-write cleared keys
  if(_progressCleanup){_progressCleanup();_progressCleanup=null;}
  _clearGoalCounters();
  localStorage.removeItem('lastRead'); // remove continue-reading card source
  localStorage.setItem('fullResetAt',new Date().toISOString()); // tombstone: prevents cloud from restoring lastRead
  for(var i=1;i<=114;i++){
    localStorage.removeItem('surah_progress_'+i); // mushaf mode tracking
    localStorage.removeItem('surah_read_v3_'+i);  // list/ayah mode tracking
  }
}

function getGoal(){
  try{return JSON.parse(localStorage.getItem('readingGoal'))||null}catch(e){return null}
}
function saveGoal(g){localStorage.setItem('readingGoal',JSON.stringify(g));debouncedSync()}
function getReadLog(){
  try{return JSON.parse(localStorage.getItem('readLog'))||{}}catch(e){return{}}
}
function saveReadLog(l){localStorage.setItem('readLog',JSON.stringify(l))}

function initTodayVerses(){
  var today=dateKey(new Date());
  try{
    var saved=JSON.parse(localStorage.getItem('readAyahsToday')||'{}');
    if(saved.date===today&&Array.isArray(saved.ayahs)){
      S.todayVerses=new Set(saved.ayahs);
    } else {
      S.todayVerses=new Set();
      localStorage.setItem('readAyahsToday',JSON.stringify({date:today,ayahs:[]}));
    }
  }catch(e){S.todayVerses=new Set()}
}

function trackVerse(surah,ayah){
  if(!surah)return;
  if(!S.todayVerses)S.todayVerses=new Set();
  var key=surah+':'+ayah;
  if(S.todayVerses.has(key))return;
  S.todayVerses.add(key);
  // Count toward active session
  if(S._session)S._session.ayahs++;
  // Save today's verse set
  var today=dateKey(new Date());
  try{
    localStorage.setItem('readAyahsToday',JSON.stringify({date:today,ayahs:Array.from(S.todayVerses)}));
  }catch(e){}
  // Increment readLog
  var l=getReadLog();
  l[today]=(l[today]||0)+1;
  saveReadLog(l);
  // Haptic exactly once on goal completion
  var g=getGoal();
  if(g&&l[today]===g.pages){haptic([50]);}
  // Keep goal widget current — lightweight, no network
  pushGoalDataToWidget();
}

function calcBestStreak(log){
  var keys=Object.keys(log).sort();
  if(!keys.length)return 0;
  var best=1,cur=1;
  for(var i=1;i<keys.length;i++){
    var prev=new Date(keys[i-1]);var curr=new Date(keys[i]);
    var diff=Math.round((curr-prev)/86400000);
    if(diff===1){cur++;if(cur>best)best=cur}
    else{cur=1}
  }
  var stored=parseInt(localStorage.getItem('bestStreak'))||0;
  if(best>stored){localStorage.setItem('bestStreak',String(best))}
  return Math.max(best,stored);
}
function calcTotalRead(log){
  var total=0;var keys=Object.keys(log);
  for(var i=0;i<keys.length;i++){total+=(log[keys[i]]||0)}
  return total;
}

/* ===== SESSION TRACKING ===== */
function _startSession(surahNum){
  _endSession();
  var s=SURAHS[(surahNum||1)-1];
  S._session={surah:surahNum,name:s?s.ar:'',startMs:Date.now(),ayahs:0};
}
function _endSession(){
  if(!S._session||S._session.ayahs<1){S._session=null;return;}
  var sess=S._session;S._session=null;
  var dur=Math.round((Date.now()-sess.startMs)/1000);
  if(dur<5)return;
  var rec={surah:sess.surah,name:sess.name,startMs:sess.startMs,dur:dur,ayahs:sess.ayahs};
  try{
    var all=JSON.parse(localStorage.getItem('readSessions')||'[]');
    all.push(rec);if(all.length>50)all=all.slice(-50);
    localStorage.setItem('readSessions',JSON.stringify(all));
  }catch(e){}
  // After a real reading session, check if we should show the smart rating prompt
  if(window.AppRating)AppRating.checkSmartPrompt();
}
function getRecentSessions(){
  try{return JSON.parse(localStorage.getItem('readSessions')||'[]');}catch(e){return[];}
}

function renderGoals(){
  var content=$('goalsContent');
  clear(content);
  var goal=getGoal();

  if(!goal){
    var ng=el('div','no-goal');
    ng.appendChild(icon('fas fa-seedling'));
    ng.appendChild(el('div','ng-title',t('goals.empty.title')));
    ng.appendChild(el('div','ng-sub',t('goals.empty.subtitle')));
    ng.appendChild(el('div','ng-motivate',t('goals.empty.motivate')));
    ng.appendChild(el('div','ng-verse','فَإِنَّ مَعَ الْعُسْرِ يُسْرًا'));
    ng.appendChild(el('div','ng-verse-ref','الشرح ٩٤:٥'));
    var btn=el('button','btn');
    btn.appendChild(icon('fas fa-plus'));
    btn.appendChild(document.createTextNode(' '+t('goals.empty.start')));
    on(btn,'click',function(){App.openWizard()});
    ng.appendChild(btn);
    content.appendChild(ng);
    return;
  }

  var log=getReadLog();
  var streak=calcStreak(log);
  var bestStreak=calcBestStreak(log);
  var totalRead=calcTotalRead(log);
  var today=new Date();
  var todayKey=dateKey(today);
  var todayRead=log[todayKey]||0;
  var target=goal.pages||5;
  var pct=Math.min(100,Math.round(todayRead/target*100));

  // Streak hero with SVG ring
  var hero=el('div','streak-hero');
  var ring=el('div','streak-ring');
  if(streak===0)ring.classList.add('pulse');
  var svgNS='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 120 120');
  var circleBg=document.createElementNS(svgNS,'circle');
  circleBg.setAttribute('class','ring-bg');
  circleBg.setAttribute('cx','60');circleBg.setAttribute('cy','60');circleBg.setAttribute('r','52');
  svg.appendChild(circleBg);
  var circleFill=document.createElementNS(svgNS,'circle');
  circleFill.setAttribute('class','ring-fill');
  circleFill.setAttribute('cx','60');circleFill.setAttribute('cy','60');circleFill.setAttribute('r','52');
  var circumference=Math.round(2*Math.PI*52);
  circleFill.setAttribute('stroke-dasharray',String(circumference));
  circleFill.setAttribute('stroke-dashoffset',String(circumference));
  svg.appendChild(circleFill);
  ring.appendChild(svg);
  var numEl=el('div','streak-num','0');
  ring.appendChild(numEl);
  // Contextual streak label
  var streakLabel=t('goals.streak.continuous');
  if(streak===0)streakLabel=t('goals.streak.start_today');
  else if(streak>=100)streakLabel=t('goals.streak.on_track');
  else if(streak>=30)streakLabel=t('goals.streak.monthly');
  else if(streak>=7)streakLabel=t('goals.streak.weekly');
  hero.appendChild(ring);
  hero.appendChild(el('div','streak-lbl',streakLabel));
  // Milestone sub-message
  if(streak>=100){
    hero.appendChild(el('div','streak-milestone',t('goals.streak.100_days')));
  }else if(streak>=30){
    hero.appendChild(el('div','streak-milestone',t('goals.streak.month')));
  }else if(streak>=7){
    hero.appendChild(el('div','streak-milestone',t('goals.streak.week')));
  }
  // Animate streak number count-up and ring fill — only when panel is actually visible
  var ringOffset=circumference-Math.round(circumference*(Math.min(pct,100)/100));
  setTimeout(function(){
    circleFill.setAttribute('stroke-dashoffset',String(ringOffset));
    var duration=400;var startT=performance.now();var targetNum=streak;
    var panelOn=$('panelGoals')&&$('panelGoals').classList.contains('on');
    if(targetNum===0){numEl.textContent='0';return}
    if(!panelOn){numEl.textContent=String(targetNum);return} // pre-render: set final value, skip rAF loop
    function countUp(now){
      var elapsed=now-startT;var progress=Math.min(elapsed/duration,1);
      var eased=1-Math.pow(1-progress,3);
      numEl.textContent=String(Math.round(eased*targetNum));
      if(progress<1)requestAnimationFrame(countUp);
    }
    requestAnimationFrame(countUp);
  },80);

  // Week dots with today's live progress
  var week=el('div','week-grid');
  var dayNames=[t('goals.days.0'),t('goals.days.1'),t('goals.days.2'),t('goals.days.3'),t('goals.days.4'),t('goals.days.5'),t('goals.days.6')];
  for(var d=0;d<7;d++){
    var dt=new Date(today);
    dt.setDate(today.getDate()-(6-d));
    var dkey=dateKey(dt);
    var day=el('div','week-day');
    day.style.animationDelay=(d*30)+'ms';
    var dot=el('div','week-dot');
    if(d===6){
      dot.classList.add('today');
      day.classList.add('today');
      if(pct>=100){
        dot.classList.add('done');
      }else if(pct>0){
        dot.style.background='conic-gradient(var(--accent) 0% '+pct+'%, transparent '+pct+'% 100%)';
        dot.style.borderColor='var(--accent)';
      }
    }else{
      if(log[dkey])dot.classList.add('done');
    }
    day.appendChild(dot);
    day.appendChild(el('div','week-day-label',dayNames[(dt.getDay()+1)%7]));
    week.appendChild(day);
  }
  hero.appendChild(week);
  // Best streak display
  if(bestStreak>0){
    var bestEl=el('div','best-streak');
    bestEl.appendChild(document.createTextNode(t('goals.streak.best')+' '));
    var bestVal=el('span','',t('goals.streak.days',{count:bestStreak}));
    bestEl.appendChild(bestVal);
    hero.appendChild(bestEl);
  }
  content.appendChild(hero);

  // Today's progress card with encouragement
  var prgSec=el('div','progress-section');
  var prgHdr=el('div','progress-hdr');
  prgHdr.appendChild(el('span','',t('reader.ayah_count',{count:todayRead,total:target})));
  prgHdr.appendChild(el('span','progress-pct',pct+'%'));
  prgSec.appendChild(prgHdr);
  var bar=el('div','progress-bar');
  var fill=el('div','progress-fill');
  if(pct>=100)fill.classList.add('complete');
  bar.appendChild(fill);
  prgSec.appendChild(bar);
  // Encouragement microcopy
  var msgEl=el('div','progress-msg');
  if(pct>=100){
    msgEl.appendChild(document.createTextNode(t('goals.progress.complete')+' '));
    var chk=el('span','complete-check','✓');
    msgEl.appendChild(chk);
  }else if(pct>=50){
    msgEl.textContent=t('goals.progress.almost');
  }else if(pct>0){
    msgEl.textContent=t('goals.progress.continue');
  }else{
    msgEl.textContent=t('goals.progress.start_today');
  }
  prgSec.appendChild(msgEl);
  // Auto-track note (first 7 days only)
  var daysSinceCreated=goal.created?Math.floor((Date.now()-goal.created)/86400000):99;
  if(daysSinceCreated<=7){
    var autoNote=el('div','auto-note');
    autoNote.appendChild(icon('fas fa-wand-magic-sparkles'));
    autoNote.appendChild(document.createTextNode(t('goals.progress.auto_track')));
    prgSec.appendChild(autoNote);
  }
  content.appendChild(prgSec);
  setTimeout(function(){fill.style.width=pct+'%'},50);

  // Stats card — total read, days to khatm, best streak
  var gc=el('div','goal-card');
  gc.appendChild(el('div','goal-card-name',goal.name||t('goals.card.name')));
  gc.appendChild(el('div','goal-card-desc',t('goals.card.daily',{count:target})));
  var details=el('div','goal-details');
  var daysToKhatm=totalRead>=6236?0:Math.ceil((6236-totalRead)/target);
  [{v:String(totalRead),l:t('goals.stats.total')},{v:daysToKhatm>0?daysToKhatm+' '+t('goals.stats.days'):t('goals.stats.complete'),l:t('goals.stats.to_khatm')},{v:String(bestStreak),l:t('goals.stats.best')}].forEach(function(dd2){
    var det=el('div','goal-detail');
    det.appendChild(el('div','goal-detail-val',dd2.v));
    det.appendChild(el('div','goal-detail-lbl',dd2.l));
    details.appendChild(det);
  });
  gc.appendChild(details);
  content.appendChild(gc);

  // Last session card
  var sessions=getRecentSessions();
  if(sessions.length){
    var lastSess=sessions[sessions.length-1];
    var sessCard=el('div','goal-card session-card');
    var sessHdr=el('div','goal-card-name');
    sessHdr.appendChild(icon('fas fa-clock'));
    sessHdr.appendChild(document.createTextNode(' '+t('goals.last_session')));
    sessCard.appendChild(sessHdr);
    var _mins=Math.floor(lastSess.dur/60);var _secs=lastSess.dur%60;
    var _durStr=_mins>0?(_mins+'m '+(_secs>0?_secs+'s':'')):(lastSess.dur+'s');
    var sessDetails=el('div','goal-details');
    [{v:lastSess.name||'',l:t('goals.session.surah')},{v:String(lastSess.ayahs),l:t('goals.session.ayahs')},{v:_durStr,l:t('goals.session.time')}].forEach(function(sd){
      var det=el('div','goal-detail');det.appendChild(el('div','goal-detail-val',sd.v));det.appendChild(el('div','goal-detail-lbl',sd.l));
      sessDetails.appendChild(det);
    });
    sessCard.appendChild(sessDetails);
    content.appendChild(sessCard);
  }

  // Month calendar section
  var calTitle=el('div','section-title');
  calTitle.appendChild(document.createTextNode(t('goals.heatmap.title')));
  content.appendChild(calTitle);

  var calSec=el('div','month-cal-section');
  var monthNames=[t('goals.months.1'),t('goals.months.2'),t('goals.months.3'),t('goals.months.4'),t('goals.months.5'),t('goals.months.6'),t('goals.months.7'),t('goals.months.8'),t('goals.months.9'),t('goals.months.10'),t('goals.months.11'),t('goals.months.12')];
  var calYear=S.goalYear,calMo=S.goalMonth;

  // Month nav header
  var monthNav=el('div','year-nav');
  var prevMo=el('button','');prevMo.appendChild(icon('fas fa-chevron-right'));
  on(prevMo,'click',function(){
    S.goalMonth--;haptic([8]);
    if(S.goalMonth<0){S.goalMonth=11;S.goalYear--;}
    renderGoals();
  });
  monthNav.appendChild(prevMo);
  monthNav.appendChild(el('span','year-display',monthNames[calMo]+' '+calYear));
  var nextMo=el('button','');nextMo.appendChild(icon('fas fa-chevron-left'));
  on(nextMo,'click',function(){
    S.goalMonth++;haptic([8]);
    if(S.goalMonth>11){S.goalMonth=0;S.goalYear++;}
    renderGoals();
  });
  monthNav.appendChild(nextMo);
  calSec.appendChild(monthNav);

  // Day-of-week headers (Sun→Sat)
  var dayHdrs=['ی','د','س','چ','پ','ئ','ش'];
  var hdrsRow=el('div','month-cal-grid');
  for(var dh=0;dh<7;dh++){
    hdrsRow.appendChild(el('div','month-cal-dh',dayHdrs[dh]));
  }
  calSec.appendChild(hdrsRow);

  // Calendar grid
  var calGrid=el('div','month-cal-grid');
  var firstDay=new Date(calYear,calMo,1).getDay();
  var daysInMonth=new Date(calYear,calMo+1,0).getDate();

  // Blank cells before 1st
  for(var bb=0;bb<firstDay;bb++){calGrid.appendChild(el('div','month-cal-cell month-cal-empty',''))}

  for(var dd=1;dd<=daysInMonth;dd++){
    var dStr=calYear+'-'+String(calMo+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
    var reading=log[dStr]||0;
    var cellCls='month-cal-cell';
    if(reading>0){
      var rp=reading/target;
      if(rp>=1)cellCls+=' heat-4';
      else if(rp>=0.67)cellCls+=' heat-3';
      else if(rp>=0.34)cellCls+=' heat-2';
      else cellCls+=' heat-1';
    }
    if(dStr===todayKey)cellCls+=' is-today';
    var dc=el('div',cellCls,String(dd));
    calGrid.appendChild(dc);
  }
  calSec.appendChild(calGrid);

  // Legend
  var legend=el('div','heatmap-legend');
  legend.appendChild(document.createTextNode(t('goals.heatmap.less')+' '));
  var levels=[{c:''},{c:'heat-1'},{c:'heat-2'},{c:'heat-3'},{c:'heat-4'}];
  for(var ll=0;ll<levels.length;ll++){
    var lc=el('div','heatmap-legend-cell heatmap-cell'+(levels[ll].c?' '+levels[ll].c:''));
    legend.appendChild(lc);
  }
  legend.appendChild(document.createTextNode(' '+t('goals.heatmap.more')));
  calSec.appendChild(legend);
  content.appendChild(calSec);

  // Delete goal with warning
  var delWrap=el('div','goal-delete-section');
  delWrap.appendChild(el('div','goal-delete-warn',t('goals.delete.warn')));
  var delGoal=el('button','btn-danger');
  delGoal.appendChild(icon('fas fa-trash'));
  delGoal.appendChild(document.createTextNode(' '+t('goals.delete.button')));
  on(delGoal,'click',function(){
    $('goalConfirmOverlay').classList.add('on');
    haptic([20]);
  });
  delWrap.appendChild(delGoal);
  content.appendChild(delWrap);
}

function calcStreak(log){
  var streak=0;
  var MIN=3; // minimum ayahs for a day to count toward streak
  var d=new Date();
  for(var i=0;i<365;i++){
    var k=dateKey(d);
    if((log[k]||0)>=MIN)streak++;
    else if(i>0)break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

/* ===== WIDGET DATA PUSH ===== */

// Unified helper — same plugin name as prayer.ui.js (proven to work).
// @objc(SharedPrefsPlugin) → Capacitor exposes as "SharedPrefs" on iOS.
// ── Widget translation sync ──────────────────────────────────────────────
// Fetches widget.* keys from Supabase, resolves iOS override values,
// and writes a flat key→text JSON blob to SharedPrefs key 'widgetTranslations'.
// Writing 'widgetTranslations' now triggers WidgetCenter.shared.reloadAllTimelines()
// in SharedPrefsPlugin.swift so the widget extension picks up the new strings
// on the very next render — without waiting for its own timeline expiry.
//
// Called on init and every foreground resume. Throttled to once per 5 minutes.
function _doSyncWidgetTranslations(force){
  var CACHE_KEY='widgetTranslationsSyncTs';
  var lastTs=parseInt(localStorage.getItem(CACHE_KEY)||'0',10);
  var elapsed=Date.now()-lastTs;
  if(!force && elapsed<5*60*1000){
    console.log('[WidgetT9n] skipped — last sync '+Math.round(elapsed/1000)+'s ago (throttle 300s)');
    return;
  }
  console.log('[WidgetT9n] syncWidgetTranslations START force='+!!force);
  // S.supabase = initialized Supabase client (set in initSupabase).
  // window.supabase = the raw CDN library — do NOT use it here (has no .from()).
  var sb=S.supabase||window._appSupabase;
  if(!sb){console.warn('[WidgetT9n] no Supabase client — Supabase not yet initialized');return;}
  sb.from('kurdish_translations')
    .select('key_id,kurdish_text,ios_text,android_text')
    .like('key_id','widget.%')
    .then(function(res){
      if(res.error){console.error('[WidgetT9n] DB error:',res.error.message);return;}
      if(!res.data||!res.data.length){console.warn('[WidgetT9n] 0 rows returned — no widget.* keys in DB?');return;}
      console.log('[WidgetT9n] fetched '+res.data.length+' rows from kurdish_translations');
      var keys={};
      res.data.forEach(function(row){
        // iOS gets ios_text if set; otherwise shared kurdish_text
        var val=(row.ios_text&&row.ios_text.trim())?row.ios_text.trim():(row.kurdish_text||'');
        if(val)keys[row.key_id]=val;
      });
      console.log('[WidgetT9n] resolved '+Object.keys(keys).length+' keys');
      // Log a sample to verify correct value is being written
      var sampleKey=Object.keys(keys)[0];
      if(sampleKey)console.log('[WidgetT9n] sample: '+sampleKey+' = '+keys[sampleKey]);
      var payload=JSON.stringify({v:1,ts:new Date().toISOString(),keys:keys});
      console.log('[WidgetT9n] calling _sharedPrefsSet widgetTranslations len='+payload.length);
      _sharedPrefsSet('widgetTranslations',payload)
        .then(function(){
          localStorage.setItem(CACHE_KEY,String(Date.now()));
          console.log('[WidgetT9n] write SUCCESS — widgetTranslations written, WidgetKit reload triggered');
        })
        .catch(function(e){
          console.warn('[WidgetT9n] _sharedPrefsSet failed (non-iOS or bridge missing):',e&&e.message);
        });
    })
    .catch(function(e){console.warn('[WidgetT9n] fetch error:',e&&e.message);});
}

function syncWidgetTranslations(){ _doSyncWidgetTranslations(false); }

// Temporary debug helper — call from DevTools or console to force an immediate sync.
// Bypasses throttle. Proves whether the sync+write pipeline works end-to-end.
// Usage: window.forceWidgetTranslationSync()
window.forceWidgetTranslationSync=function(){ _doSyncWidgetTranslations(true); };

function _sharedPrefsSet(key,value){
  // iOS only — Capacitor SharedPrefs plugin writes to App Group UserDefaults
  // so the widget extension can read the data without hitting the network.
  // Android widgets were removed; this path is iOS-only.
  var sp=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.SharedPrefs;
  if(!sp){
    console.warn('[Widget] _sharedPrefsSet: SharedPrefs plugin not available (key='+key+')');
    return Promise.reject(new Error('no widget bridge'));
  }
  console.log('[Widget] _sharedPrefsSet key='+key+' valueLen='+value.length);
  return sp.set({key:key,value:value});
}

// Persist the active theme to native storage so cold-launch backgrounds match.
// iOS reads from App Group UserDefaults (set by _sharedPrefsSet above) before WebView starts.
// Android reads from CapacitorStorage SharedPreferences in MainActivity.onCreate.
// Called every time applyTheme() runs — keeps native storage in sync automatically.
function _nativeSyncTheme(theme){
  try{
    var plugins=window.Capacitor&&window.Capacitor.Plugins;
    if(!plugins)return;
    // Android + iOS: Capacitor Preferences (CapacitorStorage SharedPrefs / UserDefaults.standard)
    if(plugins.Preferences){
      plugins.Preferences.set({key:'appTheme',value:theme}).catch(function(){});
    }
    // iOS only: App Group UserDefaults — readable by AppDelegate before WebView starts
    _sharedPrefsSet('appTheme',theme);
    // iOS only: write accent hex so widgets can follow the app theme highlight color.
    // Only the accent/highlight changes — widget bg and text colors are fixed dark.
    // light theme uses #26bd69 (original green) since widget bg is always dark —
    // #000000 would be invisible on the dark widget background.
    var accentMap={dark:'#ffffff',light:'#26bd69',sakina:'#c9a84c',noor:'#6dbf82'};
    var accentHex=accentMap[theme]||'#26bd69';
    _sharedPrefsSet('widgetAccentColor',accentHex);
  }catch(e){}
}

// Push selected ayah + tafsir to iOS widget via shared App Group.
// Called when user taps the star (⭐) button on an ayah card.
function pushAyahToWidget(surahNum,ayahNum){
  console.log('[WidgetAyah] pushAyahToWidget called surah='+surahNum+' ayah='+ayahNum);
  var quranSurah=S.quranData&&S.quranData[String(surahNum)];
  if(!quranSurah||!quranSurah[ayahNum-1]){console.error('[WidgetAyah] quran data missing');toast(t('toast.widget_no_data'));return;}
  var ayah=quranSurah[ayahNum-1];
  var tafsirText='';
  if(S.tafsirData&&S.tafsirData[surahNum-1]){
    var td=S.tafsirData[surahNum-1];
    if(td.verses){
      var tv=td.verses.find(function(v){return(v.verse||v.ayah)===ayahNum;});
      if(tv&&tv.text)tafsirText=tv.text.substring(0,400);
    }
  }
  var surahInfo=SURAHS[surahNum-1]||{};
  var payload=JSON.stringify({
    chapter:surahNum,
    verse:ayahNum,
    arabic:ayah.text||'',
    tafsir:tafsirText,
    surahName:surahInfo.ar||('سورة '+surahNum),
    showTafsir:true,
    showReference:true
  });
  console.log('[WidgetAyah] writing payload len='+payload.length);
  _sharedPrefsSet('widgetAyahData',payload)
    .then(function(){
      console.log('[WidgetAyah] write SUCCESS ✓');
      toast(t('toast.widget_saved'));
    })
    .catch(function(e){
      console.error('[WidgetAyah] write FAILED:',e);
      toast(t('toast.widget_error'));
    });
}

// Push reading progress + streak to iOS goal widget.
// Called after every ayah is counted and on prayer tab init.
function pushGoalDataToWidget(){
  var l=getReadLog();
  var today=dateKey(new Date());
  var g=getGoal();
  var dailyGoal=g&&g.pages?g.pages:10;
  var todayCount=l[today]||0;
  var streak=calcStreak(l);
  var best=parseInt(localStorage.getItem('bestStreak')||'0',10);
  var weekly=[];
  for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);weekly.push(l[dateKey(d)]||0);}
  var payload=JSON.stringify({
    todayCount:todayCount,
    dailyGoal:dailyGoal,
    currentStreak:streak,
    bestStreak:best,
    weeklyData:weekly,
    todayDate:today
  });
  console.log('[WidgetGoal] pushGoalDataToWidget today='+today+' count='+todayCount+'/'+dailyGoal+' streak='+streak);
  _sharedPrefsSet('widgetGoalData',payload)
    .then(function(){console.log('[WidgetGoal] write SUCCESS ✓');})
    .catch(function(){/* non-iOS — silent */});
}


/* ===== GOAL WIZARD ===== */
var PRESETS=[
  {name:function(){return t('wizard.preset.easy')},pages:7,desc:function(){return t('wizard.preset.easy_desc')},icon:'fas fa-seedling'},
  {name:function(){return t('wizard.preset.medium')},pages:20,desc:function(){return t('wizard.preset.medium_desc')},icon:'fas fa-book'},
  {name:function(){return t('wizard.preset.hard')},pages:50,desc:function(){return t('wizard.preset.hard_desc')},icon:'fas fa-fire'},
  {name:function(){return t('wizard.preset.khatm')},pages:100,desc:function(){return t('wizard.preset.khatm_desc')},icon:'fas fa-star'}
];

App.openWizard=function(){
  S.wizardStep=0;
  S.wizardData={};
  $('wizard').classList.add('on');
  renderWizardStep();
};
App.closeWizard=function(){
  $('wizard').classList.remove('on');
};
App.openDeleteConfirm=function(){
  $('goalConfirmOverlay').classList.add('on');
  haptic([20]);
};
App.closeDeleteConfirm=function(){
  $('goalConfirmOverlay').classList.remove('on');
};
// Option A — delete goal + full reset (clears surah progress marks too)
App.confirmDeleteGoalFull=function(){
  localStorage.removeItem('readingGoal');
  _clearTrackingState();
  $('goalConfirmOverlay').classList.remove('on');
  debouncedSync();
  _restartProgressTracking();
  renderContinue(); // clear the continue-reading card immediately
  toast(t('toast.goal_deleted'));
  haptic([50]);
  renderGoals();
};
// Option B — delete goal only, keep Quran reading position (surah_progress survives)
App.confirmDeleteGoalKeep=function(){
  localStorage.removeItem('readingGoal');
  _clearGoalCounters();
  $('goalConfirmOverlay').classList.remove('on');
  debouncedSync();
  _restartProgressTracking();
  toast(t('toast.goal_deleted'));
  haptic([50]);
  renderGoals();
};
// Keep legacy name so any old call sites still work
App.confirmDeleteGoal=App.confirmDeleteGoalFull;

// ── Start-choice overlay (shown when creating a new goal while old data exists) ──
App.closeStartChoice=function(){
  $('goalStartChoiceOverlay').classList.remove('on');
};
function _finishGoalSave(goal,keepProgress){
  if(keepProgress){
    _clearGoalCounters(); // preserve surah_progress, wipe only counters
  }else{
    _clearTrackingState(); // full reset including ayah marks
  }
  saveGoal(goal);
  initTodayVerses();
  _restartProgressTracking();
  App.closeStartChoice();
  S.wizardStep=2;
  renderWizardStep();
  haptic([50]);
}
App.confirmStartFresh=function(){
  var g=S.wizardData._pendingGoal;
  if(!g)return;
  _finishGoalSave(g,false);
};
App.confirmStartKeep=function(){
  var g=S.wizardData._pendingGoal;
  if(!g)return;
  _finishGoalSave(g,true);
};
App.wizardBack=function(){
  if(S.wizardStep>0){S.wizardStep--;renderWizardStep();haptic([8]);}
};
App.wizardNext=function(){
  if(S.wizardStep===0){
    if(S.wizardData.preset==null&&!S.wizardData.custom)return;
    S.wizardStep++;
    renderWizardStep();
    haptic([8]);
  } else if(S.wizardStep===1){
    var preset=PRESETS[S.wizardData.preset];
    var goal;
    if(preset){
      goal={name:preset.name(),pages:preset.pages,created:Date.now()};
    } else {
      var v=parseInt(S.wizardData.customPages)||5;
      goal={name:t('wizard.custom_name'),pages:v,created:Date.now()};
    }
    // If old goal or tracking data exists, ask user what to preserve
    var hasOldData=!!getGoal()||Object.keys(getReadLog()).length>0;
    if(hasOldData){
      S.wizardData._pendingGoal=goal;
      $('goalStartChoiceOverlay').classList.add('on');
      haptic([8]);
      return; // wait for user choice
    }
    // No old data — save cleanly with no questions
    _finishGoalSave(goal,false);
  } else if(S.wizardStep===2){
    App.closeWizard();
    renderGoals();
  }
};

function renderWizardStep(){
  var body=$('wizardBody');
  clear(body);
  var label=$('wizardStepLabel');
  var progress=$('wizardProgress');
  var backBtn=$('wizardBack');
  var nextBtn=$('wizardNext');

  if(S.wizardStep===0){
    label.textContent=t('wizard.step',{current:1,total:3});
    progress.style.width='33%';
    backBtn.style.display='none';

    body.appendChild(el('div','wizard-title',t('wizard.select_title')));
    body.appendChild(el('div','wizard-desc',t('wizard.select_desc')));

    var opts=el('div','wizard-options');
    PRESETS.forEach(function(p,i){
      var opt=el('div','wizard-opt'+(S.wizardData.preset===i?' on':''));
      var optIcon=el('div','wizard-opt-icon');
      optIcon.appendChild(icon(p.icon));
      opt.appendChild(optIcon);
      var optText=el('div','wizard-opt-text');
      optText.appendChild(el('div','wizard-opt-title',p.name()));
      optText.appendChild(el('div','wizard-opt-desc',p.desc()));
      opt.appendChild(optText);
      var check=el('div','wizard-opt-check');
      if(S.wizardData.preset===i)check.appendChild(icon('fas fa-check'));
      opt.appendChild(check);
      on(opt,'click',function(){
        S.wizardData.preset=i;S.wizardData.custom=false;
        haptic([8]);
        renderWizardStep();
      });
      opts.appendChild(opt);
    });

    // Custom option
    var cOpt=el('div','wizard-opt'+(S.wizardData.custom?' on':''));
    var cIcon=el('div','wizard-opt-icon');
    cIcon.appendChild(icon('fas fa-sliders'));
    cOpt.appendChild(cIcon);
    var cText=el('div','wizard-opt-text');
    cText.appendChild(el('div','wizard-opt-title',t('wizard.custom')));
    cText.appendChild(el('div','wizard-opt-desc',t('wizard.custom_desc')));
    cOpt.appendChild(cText);
    var cCheck=el('div','wizard-opt-check');
    if(S.wizardData.custom)cCheck.appendChild(icon('fas fa-check'));
    cOpt.appendChild(cCheck);
    on(cOpt,'click',function(){
      S.wizardData.custom=true;S.wizardData.preset=null;
      haptic([8]);
      renderWizardStep();
    });
    opts.appendChild(cOpt);

    if(S.wizardData.custom){
      var cinp=el('input','wizard-input');
      cinp.type='number';cinp.placeholder=t('wizard.custom_placeholder');cinp.min='1';cinp.max='500';
      cinp.value=S.wizardData.customPages||'';
      on(cinp,'input',function(){S.wizardData.customPages=this.value});
      opts.appendChild(cinp);
    }

    body.appendChild(opts);

    // Update next button text
    clear(nextBtn);
    nextBtn.appendChild(document.createTextNode(t('wizard.btn_next')+' '));
    nextBtn.appendChild(icon('fas fa-arrow-left'));

  } else if(S.wizardStep===1){
    label.textContent=t('wizard.step',{current:2,total:3});
    progress.style.width='66%';
    backBtn.style.display='';

    var preset=PRESETS[S.wizardData.preset];
    var pages=preset?preset.pages:parseInt(S.wizardData.customPages)||5;
    var name=preset?preset.name():t('wizard.custom_name');

    body.appendChild(el('div','wizard-title',t('wizard.confirm_title')));
    body.appendChild(el('div','wizard-desc',t('wizard.confirm_desc')));

    var summary=el('div','goal-card');
    summary.appendChild(el('div','goal-card-name',name));
    summary.appendChild(el('div','goal-card-desc',t('goals.card.daily',{count:pages})));

    var dets=el('div','goal-details');
    dets.style.gridTemplateColumns='1fr 1fr';
    [{v:String(pages),l:t('wizard.detail.daily')},{v:String(pages*30),l:t('wizard.detail.monthly')},{v:Math.ceil(6236/pages)+' '+t('goals.stats.days'),l:t('wizard.detail.khatm')},{v:t('wizard.detail.start'),l:t('wizard.detail.begin')}].forEach(function(d){
      var det=el('div','goal-detail');
      det.appendChild(el('div','goal-detail-val',d.v));
      det.appendChild(el('div','goal-detail-lbl',d.l));
      dets.appendChild(det);
    });
    summary.appendChild(dets);
    body.appendChild(summary);

    clear(nextBtn);
    nextBtn.appendChild(icon('fas fa-check'));
    nextBtn.appendChild(document.createTextNode(' '+t('wizard.btn_save')));

  } else if(S.wizardStep===2){
    // Confirmation screen
    label.textContent=t('wizard.step',{current:3,total:3});
    progress.style.width='100%';
    backBtn.style.display='none';

    var confirm2=el('div','wizard-confirm');
    // SVG checkmark animation
    var ringDiv=el('div','wizard-confirm-ring');
    var svgNS='http://www.w3.org/2000/svg';
    var svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 80 80');
    var circle=document.createElementNS(svgNS,'circle');
    circle.setAttribute('class','confirm-circle');
    circle.setAttribute('cx','40');circle.setAttribute('cy','40');circle.setAttribute('r','36');
    svg.appendChild(circle);
    var polyline=document.createElementNS(svgNS,'polyline');
    polyline.setAttribute('class','confirm-check');
    polyline.setAttribute('points','24,42 34,52 56,30');
    svg.appendChild(polyline);
    ringDiv.appendChild(svg);
    confirm2.appendChild(ringDiv);

    confirm2.appendChild(el('div','wizard-confirm-title',t('wizard.done_title')));
    confirm2.appendChild(el('div','wizard-confirm-sub',t('wizard.done_subtitle')));

    var savedGoal=getGoal();
    var pp=savedGoal?savedGoal.pages:5;
    var khatmDays=Math.ceil(6236/pp);
    var summaryText=t('wizard.done_summary',{pages:pp,days:khatmDays});
    confirm2.appendChild(el('div','wizard-confirm-summary',summaryText));
    confirm2.appendChild(el('div','wizard-confirm-hint',t('wizard.done_hint')));

    body.appendChild(confirm2);

    clear(nextBtn);
    nextBtn.appendChild(document.createTextNode(t('wizard.btn_start')+' '));
    nextBtn.appendChild(icon('fas fa-arrow-left'));
  }
}

