'use strict';

/* ===== TAP GUARD ===== */
// Returns true if the call should be IGNORED (too soon after last call)
var _tapGuardLast={};
function tapGuard(key,ms){
  ms=ms||350;
  var now=Date.now();
  if(_tapGuardLast[key]&&now-_tapGuardLast[key]<ms)return true; // ignored
  _tapGuardLast[key]=now;
  return false; // allowed
}

/* ===== TOAST ===== */
var _toastTimer=null;
var _toastMsg=null;
function toast(msg){
  var el=$('toast');
  clearTimeout(_toastTimer);
  // Same message still visible → silently extend, no re-animation (prevents spam)
  if(msg===_toastMsg&&el.classList.contains('on')){
    _toastTimer=setTimeout(function(){el.classList.remove('on');_toastTimer=null;_toastMsg=null;},2500);
    return;
  }
  _toastMsg=msg;
  el.textContent=msg;
  el.classList.add('on');
  _toastTimer=setTimeout(function(){el.classList.remove('on');_toastTimer=null;_toastMsg=null;},2500);
}

/* ===== HAPTIC ===== */
function haptic(pattern){
  if(!S.hapticFeedback)return;
  try{
    var H=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;
    if(H){
      // impact() is the correct Capacitor API for UI tap feedback.
      // vibrate() with very short durations (<20ms) is silently ignored by Android.
      var dur=pattern&&pattern[0]||30;
      if(dur<=30){H.impact({style:'LIGHT'});}
      else{H.notification({type:'SUCCESS'});}
    }else{navigator.vibrate(pattern||[30]);}
  }catch(e){}
}

/* ===== DAILY REMINDER ===== */
/* Create the 'reminder' channel on Android (capacitor.config channels[] is iOS-only) */
function _ensureReminderChannel(LN){
  return LN.createChannel({
    id:'reminder',
    name:'Daily Reminder',
    description:'Daily Quran reading and verse reminders',
    importance:4,
    vibration:true,
    lights:true
  }).catch(function(){});
}

/* Rotating motivational messages — keys live in kmr.json / admin-translations */
var REMINDER_MSGS_COUNT=14;
function _getReminderMsg(dayOfYear){
  var idx=dayOfYear%REMINDER_MSGS_COUNT;
  return t('notif.reminder_msg_'+idx)||t('notif.reminder_body')||'قورئانێ بخوێنە 📖';
}

function scheduleReminder(enabled){
  if(!window.Capacitor||!window.Capacitor.Plugins||!window.Capacitor.Plugins.LocalNotifications)return;
  var LN=window.Capacitor.Plugins.LocalNotifications;
  // Cancel old single-slot (ID:1) and 7-day slots (IDs 10-16)
  LN.cancel({notifications:[1,10,11,12,13,14,15,16].map(function(id){return{id:id};})}).catch(function(){});
  if(!enabled)return;
  var now=new Date();
  var notifications=[];
  // iOS 64-notification cap: keep to 3 days to leave room for athan+prayer-reminder slots
  var _isIOS=window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios';
  var _remDays=_isIOS?3:7;
  for(var d=0;d<_remDays;d++){
    var dayBase=new Date(now.getFullYear(),now.getMonth(),now.getDate()+d);
    var seed=_getDayOfYear(dayBase)*31+7;
    var h=7+(seed%13);var m=(seed*17)%60;
    var schedDate=new Date(dayBase.getFullYear(),dayBase.getMonth(),dayBase.getDate(),h,m,0,0);
    if(d===0&&schedDate<=now){schedDate.setDate(schedDate.getDate()+1);}
    if(d===0&&schedDate<=now)continue;
    var msg=_getReminderMsg(_getDayOfYear(schedDate));
    notifications.push({
      id:10+d,
      title:'TafsirKurd',
      body:msg,
      schedule:{at:schedDate,allowWhileIdle:true},
      smallIcon:'ic_notification',
      channelId:'reminder'
    });
  }
  LN.requestPermissions().then(function(){
    _ensureReminderChannel(LN).then(function(){
      LN.schedule({notifications:notifications}).catch(function(e){console.error('scheduleReminder error:',e);});
    });
  }).catch(function(){});
}

/* ===== DAILY VERSE NOTIFICATION ===== */
/* Curated list of powerful ayahs */
var DAILY_VERSE_LIST=[
  /* Al-Fatiha */
  {s:1,a:1},{s:1,a:2},{s:1,a:5},{s:1,a:6},{s:1,a:7},
  /* Al-Baqarah — famous & short */
  {s:2,a:45},{s:2,a:152},{s:2,a:153},{s:2,a:155},{s:2,a:177},{s:2,a:186},
  {s:2,a:255},{s:2,a:256},{s:2,a:257},{s:2,a:261},{s:2,a:269},{s:2,a:285},{s:2,a:286},
  /* Al-Imran */
  {s:3,a:8},{s:3,a:18},{s:3,a:26},{s:3,a:31},{s:3,a:103},{s:3,a:133},{s:3,a:139},{s:3,a:160},{s:3,a:173},{s:3,a:200},
  /* An-Nisa */
  {s:4,a:36},{s:4,a:103},{s:4,a:147},
  /* Al-Anam */
  {s:6,a:54},{s:6,a:162},
  /* Al-Araf */
  {s:7,a:23},{s:7,a:55},{s:7,a:56},{s:7,a:180},
  /* Al-Anfal */
  {s:8,a:2},{s:8,a:45},
  /* At-Tawbah */
  {s:9,a:40},{s:9,a:51},{s:9,a:128},{s:9,a:129},
  /* Yunus */
  {s:10,a:62},{s:10,a:107},
  /* Hud */
  {s:11,a:88},{s:11,a:123},
  /* Yusuf */
  {s:12,a:53},{s:12,a:64},{s:12,a:87},
  /* Ar-Rad */
  {s:13,a:28},
  /* Ibrahim */
  {s:14,a:7},{s:14,a:40},{s:14,a:41},
  /* Al-Hijr */
  {s:15,a:9},
  /* An-Nahl */
  {s:16,a:97},{s:16,a:98},{s:16,a:128},
  /* Al-Isra */
  {s:17,a:23},{s:17,a:44},{s:17,a:80},
  /* Al-Kahf */
  {s:18,a:10},{s:18,a:28},{s:18,a:30},{s:18,a:46},
  /* Ta-Ha */
  {s:20,a:8},{s:20,a:25},{s:20,a:114},{s:20,a:132},
  /* Al-Anbiya */
  {s:21,a:87},{s:21,a:107},
  /* Al-Hajj */
  {s:22,a:77},
  /* Al-Muminun */
  {s:23,a:1},{s:23,a:97},{s:23,a:115},{s:23,a:118},
  /* An-Nur */
  {s:24,a:35},
  /* Al-Furqan */
  {s:25,a:63},{s:25,a:70},
  /* An-Naml */
  {s:27,a:19},{s:27,a:62},
  /* Al-Qasas */
  {s:28,a:24},{s:28,a:88},
  /* Al-Ankabut */
  {s:29,a:45},{s:29,a:69},
  /* Ar-Rum */
  {s:30,a:21},
  /* Luqman */
  {s:31,a:17},{s:31,a:22},
  /* As-Sajdah */
  {s:32,a:15},
  /* Al-Ahzab */
  {s:33,a:41},{s:33,a:56},{s:33,a:70},
  /* Fatir */
  {s:35,a:29},
  /* Ya-Sin */
  {s:36,a:36},{s:36,a:58},{s:36,a:82},{s:36,a:83},
  /* Az-Zumar */
  {s:39,a:10},{s:39,a:53},
  /* Ghafir */
  {s:40,a:44},{s:40,a:60},
  /* Ash-Shura */
  {s:42,a:10},{s:42,a:19},
  /* Al-Jathiyah */
  {s:45,a:36},
  /* Muhammad */
  {s:47,a:19},
  /* Al-Fath */
  {s:48,a:29},
  /* Al-Hujurat */
  {s:49,a:13},
  /* Adh-Dhariyat */
  {s:51,a:56},
  /* At-Tur */
  {s:52,a:48},
  /* Ar-Rahman */
  {s:55,a:1},{s:55,a:2},{s:55,a:3},{s:55,a:13},{s:55,a:26},{s:55,a:27},
  /* Al-Waqiah */
  {s:56,a:95},{s:56,a:96},
  /* Al-Hadid */
  {s:57,a:3},{s:57,a:4},
  /* Al-Hashr */
  {s:59,a:22},{s:59,a:23},{s:59,a:24},
  /* As-Saff */
  {s:61,a:13},
  /* Al-Jumuah */
  {s:62,a:10},
  /* At-Taghabun */
  {s:64,a:13},
  /* At-Talaq */
  {s:65,a:2},{s:65,a:3},
  /* At-Tahrim */
  {s:66,a:8},
  /* Al-Mulk */
  {s:67,a:1},{s:67,a:2},{s:67,a:15},
  /* Nuh */
  {s:71,a:10},
  /* Al-Muzzammil */
  {s:73,a:8},
  /* Al-Insan */
  {s:76,a:9},
  /* An-Naba */
  {s:78,a:38},
  /* Al-Buruj */
  {s:85,a:11},{s:85,a:12},
  /* At-Tariq */
  {s:86,a:15},{s:86,a:16},{s:86,a:17},
  /* Al-Ala */
  {s:87,a:14},{s:87,a:15},{s:87,a:16},{s:87,a:17},
  /* Al-Fajr */
  {s:89,a:27},{s:89,a:28},{s:89,a:29},{s:89,a:30},
  /* Ash-Shams */
  {s:91,a:9},{s:91,a:10},
  /* Al-Layl */
  {s:92,a:20},{s:92,a:21},
  /* Ad-Duha */
  {s:93,a:1},{s:93,a:5},{s:93,a:8},{s:93,a:11},
  /* Ash-Sharh */
  {s:94,a:1},{s:94,a:5},{s:94,a:6},{s:94,a:7},{s:94,a:8},
  /* At-Tin */
  {s:95,a:4},{s:95,a:5},{s:95,a:8},
  /* Al-Alaq */
  {s:96,a:1},{s:96,a:2},{s:96,a:3},
  /* Al-Qadr */
  {s:97,a:1},{s:97,a:3},{s:97,a:4},{s:97,a:5},
  /* Az-Zalzalah */
  {s:99,a:7},{s:99,a:8},
  /* Al-Adiyat */
  {s:100,a:6},{s:100,a:7},{s:100,a:8},
  /* At-Takathur */
  {s:102,a:1},{s:102,a:2},
  /* Al-Asr */
  {s:103,a:1},{s:103,a:2},{s:103,a:3},
  /* Al-Humazah */
  {s:104,a:1},{s:104,a:2},
  /* Quraysh */
  {s:106,a:1},{s:106,a:2},{s:106,a:3},{s:106,a:4},
  /* Al-Maun */
  {s:107,a:1},{s:107,a:2},
  /* Al-Kawthar */
  {s:108,a:1},{s:108,a:2},{s:108,a:3},
  /* Al-Kafirun */
  {s:109,a:1},{s:109,a:6},
  /* An-Nasr */
  {s:110,a:1},{s:110,a:2},{s:110,a:3},
  /* Al-Ikhlas */
  {s:112,a:1},{s:112,a:2},{s:112,a:3},{s:112,a:4},
  /* Al-Falaq */
  {s:113,a:1},{s:113,a:2},
  /* An-Nas */
  {s:114,a:1},{s:114,a:2},{s:114,a:3}
];

function _getDayOfYear(d){
  return Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);
}

function scheduleDailyVerse(enabled){
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  var LN=Capacitor.Plugins.LocalNotifications;
  /* Cancel IDs 20-26 */
  LN.cancel({notifications:[20,21,22,23,24,25,26].map(function(id){return {id:id};})}).catch(function(){});
  if(!enabled)return;

  /* Wait until Quran + tafsir data is loaded */
  if(!S.quranData||!S.tafsirData){
    setTimeout(function(){scheduleDailyVerse(S.dailyVerse);},1200);
    return;
  }

  var now=new Date();
  var notifications=[];
  var _isIOSv=window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios';
  var _verseDays=_isIOSv?3:7;
  for(var d=0;d<_verseDays;d++){
    var dayBase=new Date(now.getFullYear(),now.getMonth(),now.getDate()+d);
    var seed=_getDayOfYear(dayBase)*31+43;
    var h=8+(seed%12);var m=(seed*19)%60;
    var schedDate=new Date(dayBase.getFullYear(),dayBase.getMonth(),dayBase.getDate(),h,m,0,0);
    if(d===0&&schedDate<=now){schedDate.setDate(schedDate.getDate()+1);}
    if(d===0&&schedDate<=now)continue;
    // Find a short powerful ayah for this day (skip long ones)
    var baseIdx=_getDayOfYear(schedDate)%DAILY_VERSE_LIST.length;
    var v=null;
    for(var tryI=0;tryI<DAILY_VERSE_LIST.length;tryI++){
      var candidate=DAILY_VERSE_LIST[(baseIdx+tryI)%DAILY_VERSE_LIST.length];
      try{
        var csd=S.quranData[String(candidate.s)];
        var cvv=csd.verses||csd;
        var cvObj=cvv[candidate.a-1];
        var cAr=String(cvObj.text||cvObj||'');
        if(cAr.length<=150){v=candidate;break;}
      }catch(e){}
    }
    if(!v)v=DAILY_VERSE_LIST[baseIdx];
    var arText='',kuText='';
    try{
      var sd=S.quranData[String(v.s)];
      var vv=sd.verses||sd;
      var vObj=vv[v.a-1];
      arText=String(vObj.text||vObj||'');
      var td=S.tafsirData[v.s-1];
      if(td&&td.verses&&td.verses[v.a-1])
        kuText=String(td.verses[v.a-1].text||td.verses[v.a-1].tafsir||'').substring(0,140);
    }catch(e){}
    var sName=SURAHS[v.s-1];
    var notifTitle=(sName?sName.ar:'')+' \u200f('+v.s+':'+v.a+')';
    var notifBody=kuText?kuText:(arText.substring(0,200));
    notifications.push({
      id:20+d,
      title:notifTitle,
      body:notifBody,
      extra:{type:'verse',s:v.s,a:v.a},
      schedule:{at:schedDate,allowWhileIdle:true},
      smallIcon:'ic_notification',
      channelId:'reminder'
    });
  }

  LN.requestPermissions().then(function(){
    _ensureReminderChannel(LN).then(function(){
      LN.schedule({notifications:notifications}).catch(function(e){console.error('dailyVerse schedule error:',e);});
      localStorage.setItem('dailyVerseScheduledDate',new Date().toDateString());
    });
  }).catch(function(){});
}

/* Show a one-time battery-optimization guidance dialog on Android */
window._showNotifSetupHint=function _showNotifSetupHint(force){
  if(!window.Capacitor)return;
  if(window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')return;
  if(!force&&localStorage.getItem('notifHintShown'))return;
  localStorage.setItem('notifHintShown','1');
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:0 0 var(--safe-b,20px)';
  var card=document.createElement('div');
  card.style.cssText='width:100%;max-width:480px;background:var(--surface,#fff);border-radius:20px 20px 0 0;padding:24px 20px 20px;text-align:center';
  var title=document.createElement('div');
  title.style.cssText='font-size:1.05rem;font-weight:700;margin-bottom:10px;color:var(--text,#000)';
  title.textContent=t('notif.setup_title')||'ئاگادارکرنەکان ڕێکبخە ✓';
  var msg=document.createElement('div');
  msg.style.cssText='font-size:.87rem;color:var(--text2,#666);line-height:1.9;direction:rtl;margin-bottom:18px;white-space:pre-line;text-align:right';
  msg.textContent=t('notif.setup_body')||
    'بۆ ئەوەی بانگ لە کاتا خۆیدا بێت، ئەم دووان پشتراست بکە:\n\n'+
    '① بیتاقورا: ڕێکخستن ← مەرج ← بیتاقورا ← بێ ئێشکالە\n'+
    '   (Unrestricted Battery Usage)\n\n'+
    '② ئالارم و بیرهاتن: ڕێکخستن ← مەرجا تایبەت ← ئالارم\n'+
    '   (Alarms & Reminders ← فەرمانی ئەپێ بدە)';
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:13px;background:var(--accent,#1f5f4a);color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer';
  btn.textContent=t('notif.setup_ok')||'تێگەیشتم';
  btn.onclick=function(){overlay.remove();};
  card.appendChild(title);card.appendChild(msg);card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
};

/* Show battery-optimization guidance — triggered when isIgnoringBatteryOpts() returns false */
window._showBatteryOptWarning=function(){
  if(!window.Capacitor)return;
  if(window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')return;
  var _warnedAt=parseInt(localStorage.getItem('batteryOptWarnedAt')||'0');
  if(Date.now()-_warnedAt<7*24*60*60*1000)return; // shown within last 7 days
  localStorage.setItem('batteryOptWarnedAt',String(Date.now()));
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9002;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:0 0 var(--safe-b,20px)';
  var card=document.createElement('div');
  card.style.cssText='width:100%;max-width:480px;background:var(--surface,#fff);border-radius:20px 20px 0 0;padding:24px 20px 20px;text-align:center';
  var icon=document.createElement('div');
  icon.style.cssText='font-size:2rem;margin-bottom:8px';
  icon.textContent='🔋';
  var title=document.createElement('div');
  title.style.cssText='font-size:1.05rem;font-weight:700;margin-bottom:10px;color:var(--text,#000)';
  title.textContent='بانگ ڕاستەوخۆ بێت';
  var msg=document.createElement('div');
  msg.style.cssText='font-size:.87rem;color:var(--text2,#666);line-height:1.9;direction:rtl;margin-bottom:18px;white-space:pre-line;text-align:right';
  msg.textContent=
    'بۆ ئەوەی بانگ لە کاتا دروستدا بێت، ئەپ دەبێت لە کۆنترولی بیتاقورادا بێ ئێشکالە بێت.\n\n'+
    'دوگمەی خوارەوە بکە و "بێ ئێشکالە" (Unrestricted) هەڵبژێرە.';
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:13px;background:var(--accent,#1f5f4a);color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer';
  btn.textContent='کردنەوەی ڕێکخستن';
  btn.onclick=function(){
    overlay.remove();
    var _AA=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.AthanAlarm;
    if(_AA&&_AA.openBatteryOptSettings)_AA.openBatteryOptSettings().catch(function(){});
  };
  var dismissBtn=document.createElement('button');
  dismissBtn.style.cssText='width:100%;padding:10px;background:none;border:none;color:var(--text3,#999);font-size:.85rem;cursor:pointer;margin-top:6px';
  dismissBtn.textContent='دواتر';
  dismissBtn.onclick=function(){overlay.remove();};
  card.appendChild(icon);card.appendChild(title);card.appendChild(msg);
  card.appendChild(btn);card.appendChild(dismissBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
};

/* Show exact-alarm-revoked warning — triggered when OS verification finds 0 pending after schedule */
window._showAthanAlarmPermWarning=function(){
  if(!window.Capacitor)return;
  if(window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios')return;
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9001;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:0 0 var(--safe-b,20px)';
  var card=document.createElement('div');
  card.style.cssText='width:100%;max-width:480px;background:var(--surface,#fff);border-radius:20px 20px 0 0;padding:24px 20px 20px;text-align:center';
  // Warning icon row
  var icon=document.createElement('div');
  icon.style.cssText='font-size:2rem;margin-bottom:8px';
  icon.textContent='⚠️';
  var title=document.createElement('div');
  title.style.cssText='font-size:1.05rem;font-weight:700;margin-bottom:10px;color:#b45309';
  title.textContent='بانگ نادێت — مەرج هەیە';
  var msg=document.createElement('div');
  msg.style.cssText='font-size:.87rem;color:var(--text2,#666);line-height:1.9;direction:rtl;margin-bottom:18px;white-space:pre-line;text-align:right';
  msg.textContent=
    'مەرجا "ئالارم و بیرهاتن" هاتیە لەناوبردن.\n\n'+
    'بۆ چارەسەرکرنێ:\n'+
    'ڕێکخستن ← مەرجا تایبەت ← ئالارم و بیرهاتن\n'+
    '(Alarms & Reminders) ← ئەپێ TafsirKurd فەرمان بکە';
  var btn=document.createElement('button');
  btn.style.cssText='width:100%;padding:13px;background:#b45309;color:#fff;border:none;border-radius:12px;font-size:.95rem;font-weight:700;cursor:pointer';
  btn.textContent='هەرە ڕێکخستن';
  btn.onclick=function(){
    overlay.remove();
    // Open exact-alarm settings screen directly via native bridge
    if(window._openExactAlarmSettings){
      window._openExactAlarmSettings();
    }
  };
  var dismissBtn=document.createElement('button');
  dismissBtn.style.cssText='width:100%;padding:10px;background:none;border:none;color:var(--text3,#999);font-size:.85rem;cursor:pointer;margin-top:6px';
  dismissBtn.textContent='دواتر';
  dismissBtn.onclick=function(){overlay.remove();};
  card.appendChild(icon);card.appendChild(title);card.appendChild(msg);
  card.appendChild(btn);card.appendChild(dismissBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
};

function initDailyVerse(){
  if(!S.dailyVerse)return;
  var last=localStorage.getItem('dailyVerseScheduledDate');
  if(last===new Date().toDateString())return; /* already scheduled today */
  scheduleDailyVerse(true);
}

/* ===== STREAK REMINDER NOTIFICATION ===== */
/* ID 30 — fires at 9pm if user has a streak but hasn't read today */
function scheduleStreakReminder(){
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  var LN=Capacitor.Plugins.LocalNotifications;
  LN.cancel({notifications:[{id:30}]}).catch(function(){});
  var log=getReadLog();
  var today=new Date();
  var todayK=dateKey(today);
  var streak=calcStreak(log);
  // Only schedule if user has a streak and hasn't read today
  if(streak<1||log[todayK])return;
  // Schedule for 9pm today (if still in future), else skip
  var at=new Date(today.getFullYear(),today.getMonth(),today.getDate(),21,0,0,0);
  if(at<=today)return;
  LN.requestPermissions().then(function(){
    _ensureReminderChannel(LN).then(function(){
      LN.schedule({notifications:[{
        id:30,
        title:t('notif.streak_title')||'ڕیزا ڕۆژانت لێ دەچێت! 🔥',
        body:t('notif.streak_body',{days:String(streak)})||('ئەڤرۆ '+streak+' ڕۆژ ل ڕێکێدایت. مەبەست بکە!'),
        schedule:{at:at,allowWhileIdle:true},
        smallIcon:'ic_notification',
        channelId:'reminder',
        extra:{type:'streak'}
      }]}).catch(function(){});
    });
  }).catch(function(){});
}

/* ===== PUSH TAP LISTENER — registered immediately on startup ===== */
/* Must not wait 3s — cold-start buffered events are delivered to the
   first listener registered, so we register it right away. */
var _pendingPushDeepLink=null; // set by tap listener, consumed after splash

function _initPushTapListener(){
  var PP=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PushNotifications;
  if(!PP){return;}
  PP.addListener('pushNotificationActionPerformed',function(action){
    var data=(action.notification&&action.notification.data)||{};
    var type=data.type||'';
    var id=data.id||'';
    console.log('[Push] tap type='+type+' id='+id);
    // Store pending link — execute after splash so app is fully visible
    _pendingPushDeepLink={type:type,id:id};
    // Also try immediately in case app is already past splash (background state)
    _handlePushDeepLink(type,id);
  });
}

/* ===== PUSH NOTIFICATION DEEP LINK HANDLER ===== */
/* Polls until the app is fully ready, then navigates.
   Handles cold starts (app killed) where data isn't loaded yet. */
function _handlePushDeepLink(type,id){
  var tries=0;
  var MAX=60; // 60 × 200ms = 12 seconds max wait

  function ready(){
    // App core must exist and tabs must be rendered
    if(typeof App==='undefined'||typeof App.tab!=='function'||typeof App.openSurah!=='function')return false;
    // For islamvoice: episode list must exist
    if(type==='islamvoice_episodes'||type==='video')return !!(S.ivEpisodes&&S.ivEpisodes.length);
    // For gencine: GencineUI must exist
    if(type==='gencine_books'||type==='gencine')return !!(window.GencineUI);
    // verse, prayer, update, default — just need App to exist
    return true;
  }

  function attempt(){
    if(!ready()&&tries++<MAX){setTimeout(attempt,200);return;}
    console.log('[Push] navigating type='+type+' id='+id+' tries='+tries);

    if(type==='verse'&&id){
      var parts=id.split(':');
      var s=+parts[0],a=+parts[1];
      App.tab('quran');
      setTimeout(function(){App.openSurah(s,a);},300);

    }else if(type==='islamvoice_episodes'||type==='video'){
      App.tab('islamvoice');
      if(id){
        var _ivT=0;
        var _ivOpen=function(){
          if(S.ivEpisodes&&S.ivEpisodes.length){
            var ep=S.ivEpisodes.find(function(e){return String(e.id)===String(id);});
            if(ep){App.ivShowSeries(ep.series_id);setTimeout(function(){App.ivPlay(ep.id);},200);}
          }else if(_ivT++<20)setTimeout(_ivOpen,300);
        };
        setTimeout(_ivOpen,300);
      }

    }else if(type==='gencine_books'||type==='gencine'){
      App.tab('gencine');
      if(id){
        var _bkT=0;
        var _bkOpen=function(){
          if(window.GencineUI&&GencineUI.openBook(id))return;
          if(_bkT++<20)setTimeout(_bkOpen,300);
        };
        setTimeout(_bkOpen,300);
      }

    }else if(type==='prayer'){
      App.tab('prayer');

    }else if(type==='update'){
      if(window.ForceUpdate)window.ForceUpdate.openStore();

    }else{
      App.tab('quran');
    }
  }

  // Small initial delay so the event doesn't fire before any tab exists
  setTimeout(attempt,300);
}

/* ===== REMOTE PUSH TOKEN REGISTRATION ===== */
/* Registers device with FCM (Android) or APNs via Firebase (iOS).
   Token is stored in Supabase push_tokens table.
   Requires:
     - @capacitor/push-notifications installed (package.json)
     - google-services.json at android/app/google-services.json
     - GoogleService-Info.plist at ios/App/App/GoogleService-Info.plist
     - Push Notifications capability enabled in Xcode for the App target
*/
function _pushLog(msg){
  try{
    var logs=JSON.parse(localStorage.getItem('push_debug')||'[]');
    logs.push(new Date().toISOString().slice(11,19)+' '+msg);
    if(logs.length>30)logs=logs.slice(-30);
    localStorage.setItem('push_debug',JSON.stringify(logs));
  }catch(e){}
  console.log('[Push] '+msg);
}

function _reportAppVersion(){
  try {
    if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.App)return;
    var platform=Capacitor.getPlatform?Capacitor.getPlatform():'web';
    if(platform==='web')return;
    Capacitor.Plugins.App.getInfo().then(function(info){
      if(!info||!info.build)return;
      var lsKey='ark_'+platform+'_'+info.build;
      if(localStorage.getItem(lsKey))return;
      fetch('https://tafsirkurd.com/app-version-report',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({platform:platform,build_number:String(info.build),app_version:info.version||null}),
        keepalive:true,
      }).then(function(r){if(r.ok)localStorage.setItem(lsKey,'1');}).catch(function(){});
    }).catch(function(){});
  }catch(e){}
}

function initPushToken(){
  var PP=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PushNotifications;
  if(!PP){_pushLog('plugin not available');return;}

  PP.requestPermissions().then(function(perm){
    _pushLog('requestPermissions result: '+perm.receive);
    if(perm.receive!=='granted'){return;}

    // Handle incoming push while app is in foreground
    PP.addListener('pushNotificationReceived',function(notif){
      console.log('[Push] received foreground notif: '+notif.title);
      var LN=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications;
      if(LN){
        LN.schedule({notifications:[{
          id:Math.floor(Math.random()*100000)+1000,
          title:notif.title||'',
          body:notif.body||'',
          schedule:{at:new Date(Date.now()+200),allowWhileIdle:true},
          smallIcon:'ic_notification',
          channelId:'reminder',
          extra:notif.data||{}
        }]}).catch(function(){});
      }
    });

    // Receive APNs/FCM token and store in DB via server endpoint (bypasses RLS)
    PP.addListener('registration',function(tokenData){
      var platform=window.Capacitor.getPlatform()||'unknown';
      var token=tokenData.value||'';
      _pushLog('registration event fired platform='+platform+' tokenLen='+token.length);
      localStorage.setItem('push_token_preview',token.slice(0,20)+'…');
      localStorage.setItem('push_token_platform',platform);
      if(!token){_pushLog('ERROR: empty token');return;}
      fetch('https://tafsirkurd.com/register-push-token',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token:token,platform:platform,user_id:(S.user&&S.user.id)||null})
      }).then(function(r){return r.json();}).then(function(res){
        if(res.error){
          _pushLog('register FAILED: '+res.error);
          localStorage.setItem('push_reg_api_error',res.error);
        } else {
          _pushLog('token stored in DB OK via server');
          localStorage.removeItem('push_reg_api_error');
        }
      }).catch(function(e){
        _pushLog('register EXCEPTION: '+(e&&e.message));
      });
    });

    PP.addListener('registrationError',function(err){
      _pushLog('registrationError: '+(err&&err.error));
      localStorage.setItem('push_reg_error',err&&err.error);
    });

    _pushLog('calling PP.register()');
    PP.register();
  }).catch(function(e){
    _pushLog('requestPermissions EXCEPTION: '+(e&&e.message));
  });
}

/* ===== NEW VIDEO NOTIFICATION ===== */
/* Check on app open if new IslamVoice video was added since last check. ID 31 */
function checkNewVideoNotif(){
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  if(!S.supabase)return;
  var now=new Date().toISOString();
  // First-ever launch: seed with now and skip so we never notify for pre-existing episodes
  if(!localStorage.getItem('lastVideoNotifCheck')){
    localStorage.setItem('lastVideoNotifCheck',now);
    return;
  }
  var lastCheck=localStorage.getItem('lastVideoNotifCheck');
  S.supabase.from('islamvoice_episodes').select('id,title,title_ku,created_at').eq('is_published',true).gt('created_at',lastCheck).order('created_at',{ascending:false}).limit(1)
    .then(function(res){
      localStorage.setItem('lastVideoNotifCheck',now);
      if(!res||!res.data||!res.data.length)return;
      var ep=res.data[0];
      var LN=Capacitor.Plugins.LocalNotifications;
      LN.requestPermissions().then(function(perm){
        if(perm.display!=='granted'&&perm.receive!=='granted')return;
        _ensureReminderChannel(LN).then(function(){
          LN.cancel({notifications:[{id:31}]}).catch(function(){});
          LN.schedule({notifications:[{
            id:31,
            title:tSafe('notif.new_video_title')||'ڤیدیۆیەکا نوی 🎬',
            body:(ep.title_ku||ep.title)||tSafe('notif.new_video_body')||'ڤیدیۆیەکا نوی زێدەبوو',
            schedule:{at:new Date(Date.now()+3000),allowWhileIdle:true},
            smallIcon:'ic_notification',
            channelId:'reminder',
            extra:{type:'video',id:ep.id}
          }]}).catch(function(){});
        });
      }).catch(function(){});
    }).catch(function(){});
}

/* ===== NEW BOOK NOTIFICATION ===== */
/* Check on app open if new book added since last check. ID 32 */
function checkNewBookNotif(){
  if(!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.LocalNotifications)return;
  if(!S.supabase)return;
  var now=new Date().toISOString();
  // First-ever launch: no lastCheck saved → seed with now and skip notification
  // so we never fire for books that existed before the user installed the app.
  if(!localStorage.getItem('lastBookNotifCheck')){
    localStorage.setItem('lastBookNotifCheck',now);
    return;
  }
  var lastCheck=localStorage.getItem('lastBookNotifCheck');
  S.supabase.from('gencine_books').select('id,title_ku,title_ar,created_at').eq('active',true).gt('created_at',lastCheck).order('created_at',{ascending:false}).limit(1)
    .then(function(res){
      localStorage.setItem('lastBookNotifCheck',now);
      if(!res||!res.data||!res.data.length)return;
      var book=res.data[0];
      var LN=Capacitor.Plugins.LocalNotifications;
      LN.requestPermissions().then(function(perm){
        if(perm.display!=='granted'&&perm.receive!=='granted')return;
        _ensureReminderChannel(LN).then(function(){
          LN.cancel({notifications:[{id:32}]}).catch(function(){});
          LN.schedule({notifications:[{
            id:32,
            title:tSafe('notif.new_book_title')||'پەرتوکەکا نوی 📖',
            body:(book.title_ku||book.title_ar)||tSafe('notif.new_book_body')||'پەرتوکەکا نوی زێدەبوو',
            schedule:{at:new Date(Date.now()+4000),allowWhileIdle:true},
            smallIcon:'ic_notification',
            channelId:'reminder',
            extra:{type:'book',id:book.id}
          }]}).catch(function(){});
        });
      }).catch(function(){});
    }).catch(function(){});
}

/* ===== OFFLINE BANNER ===== */
function _updateOfflineBanner(){
  var b=document.getElementById('offlineBanner');
  if(!b)return;
  b.classList.toggle('on',!navigator.onLine);
}
window.addEventListener('offline',_updateOfflineBanner);
window.addEventListener('online',_updateOfflineBanner);
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',_updateOfflineBanner);
}else{_updateOfflineBanner();}
