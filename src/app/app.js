/* Tafsir Kurd - Mobile App v2.0 */
/* Pure DOM methods only - no innerHTML for security */

(function(){
'use strict';

/* ===== i18n ===== */
function t(k,v){return window.t?window.t(k,v):k}

/* ===== HELPERS ===== */
function $(id){return document.getElementById(id)}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e}
function icon(name){var i=document.createElement('i');i.className=name;return i}
function on(e,ev,fn){if(e)e.addEventListener(ev,fn)}
function clear(e){if(e)while(e.firstChild)e.removeChild(e.firstChild)}

/* ===== SURAH DATA ===== */
var SURAHS=[
{n:1,en:'Al-Fatiha',ar:'الفاتحة',a:7,t:'Meccan'},{n:2,en:'Al-Baqarah',ar:'البقرة',a:286,t:'Medinan'},{n:3,en:'Ali Imran',ar:'آل عمران',a:200,t:'Medinan'},
{n:4,en:'An-Nisa',ar:'النساء',a:176,t:'Medinan'},{n:5,en:'Al-Ma\'idah',ar:'المائدة',a:120,t:'Medinan'},{n:6,en:'Al-An\'am',ar:'الأنعام',a:165,t:'Meccan'},
{n:7,en:'Al-A\'raf',ar:'الأعراف',a:206,t:'Meccan'},{n:8,en:'Al-Anfal',ar:'الأنفال',a:75,t:'Medinan'},{n:9,en:'At-Tawbah',ar:'التوبة',a:129,t:'Medinan'},
{n:10,en:'Yunus',ar:'يونس',a:109,t:'Meccan'},{n:11,en:'Hud',ar:'هود',a:123,t:'Meccan'},{n:12,en:'Yusuf',ar:'يوسف',a:111,t:'Meccan'},
{n:13,en:'Ar-Ra\'d',ar:'الرعد',a:43,t:'Medinan'},{n:14,en:'Ibrahim',ar:'إبراهيم',a:52,t:'Meccan'},{n:15,en:'Al-Hijr',ar:'الحجر',a:99,t:'Meccan'},
{n:16,en:'An-Nahl',ar:'النحل',a:128,t:'Meccan'},{n:17,en:'Al-Isra',ar:'الإسراء',a:111,t:'Meccan'},{n:18,en:'Al-Kahf',ar:'الكهف',a:110,t:'Meccan'},
{n:19,en:'Maryam',ar:'مريم',a:98,t:'Meccan'},{n:20,en:'Taha',ar:'طه',a:135,t:'Meccan'},{n:21,en:'Al-Anbiya',ar:'الأنبياء',a:112,t:'Meccan'},
{n:22,en:'Al-Hajj',ar:'الحج',a:78,t:'Medinan'},{n:23,en:'Al-Mu\'minun',ar:'المؤمنون',a:118,t:'Meccan'},{n:24,en:'An-Nur',ar:'النور',a:64,t:'Medinan'},
{n:25,en:'Al-Furqan',ar:'الفرقان',a:77,t:'Meccan'},{n:26,en:'Ash-Shu\'ara',ar:'الشعراء',a:227,t:'Meccan'},{n:27,en:'An-Naml',ar:'النمل',a:93,t:'Meccan'},
{n:28,en:'Al-Qasas',ar:'القصص',a:88,t:'Meccan'},{n:29,en:'Al-Ankabut',ar:'العنكبوت',a:69,t:'Meccan'},{n:30,en:'Ar-Rum',ar:'الروم',a:60,t:'Meccan'},
{n:31,en:'Luqman',ar:'لقمان',a:34,t:'Meccan'},{n:32,en:'As-Sajdah',ar:'السجدة',a:30,t:'Meccan'},{n:33,en:'Al-Ahzab',ar:'الأحزاب',a:73,t:'Medinan'},
{n:34,en:'Saba',ar:'سبأ',a:54,t:'Meccan'},{n:35,en:'Fatir',ar:'فاطر',a:45,t:'Meccan'},{n:36,en:'Ya-Sin',ar:'يس',a:83,t:'Meccan'},
{n:37,en:'As-Saffat',ar:'الصافات',a:182,t:'Meccan'},{n:38,en:'Sad',ar:'ص',a:88,t:'Meccan'},{n:39,en:'Az-Zumar',ar:'الزمر',a:75,t:'Meccan'},
{n:40,en:'Ghafir',ar:'غافر',a:85,t:'Meccan'},{n:41,en:'Fussilat',ar:'فصلت',a:54,t:'Meccan'},{n:42,en:'Ash-Shura',ar:'الشورى',a:53,t:'Meccan'},
{n:43,en:'Az-Zukhruf',ar:'الزخرف',a:89,t:'Meccan'},{n:44,en:'Ad-Dukhan',ar:'الدخان',a:59,t:'Meccan'},{n:45,en:'Al-Jathiyah',ar:'الجاثية',a:37,t:'Meccan'},
{n:46,en:'Al-Ahqaf',ar:'الأحقاف',a:35,t:'Meccan'},{n:47,en:'Muhammad',ar:'محمد',a:38,t:'Medinan'},{n:48,en:'Al-Fath',ar:'الفتح',a:29,t:'Medinan'},
{n:49,en:'Al-Hujurat',ar:'الحجرات',a:18,t:'Medinan'},{n:50,en:'Qaf',ar:'ق',a:45,t:'Meccan'},{n:51,en:'Adh-Dhariyat',ar:'الذاريات',a:60,t:'Meccan'},
{n:52,en:'At-Tur',ar:'الطور',a:49,t:'Meccan'},{n:53,en:'An-Najm',ar:'النجم',a:62,t:'Meccan'},{n:54,en:'Al-Qamar',ar:'القمر',a:55,t:'Meccan'},
{n:55,en:'Ar-Rahman',ar:'الرحمن',a:78,t:'Medinan'},{n:56,en:'Al-Waqi\'ah',ar:'الواقعة',a:96,t:'Meccan'},{n:57,en:'Al-Hadid',ar:'الحديد',a:29,t:'Medinan'},
{n:58,en:'Al-Mujadilah',ar:'المجادلة',a:22,t:'Medinan'},{n:59,en:'Al-Hashr',ar:'الحشر',a:24,t:'Medinan'},{n:60,en:'Al-Mumtahanah',ar:'الممتحنة',a:13,t:'Medinan'},
{n:61,en:'As-Saff',ar:'الصف',a:14,t:'Medinan'},{n:62,en:'Al-Jumu\'ah',ar:'الجمعة',a:11,t:'Medinan'},{n:63,en:'Al-Munafiqun',ar:'المنافقون',a:11,t:'Medinan'},
{n:64,en:'At-Taghabun',ar:'التغابن',a:18,t:'Medinan'},{n:65,en:'At-Talaq',ar:'الطلاق',a:12,t:'Medinan'},{n:66,en:'At-Tahrim',ar:'التحريم',a:12,t:'Medinan'},
{n:67,en:'Al-Mulk',ar:'الملك',a:30,t:'Meccan'},{n:68,en:'Al-Qalam',ar:'القلم',a:52,t:'Meccan'},{n:69,en:'Al-Haqqah',ar:'الحاقة',a:52,t:'Meccan'},
{n:70,en:'Al-Ma\'arij',ar:'المعارج',a:44,t:'Meccan'},{n:71,en:'Nuh',ar:'نوح',a:28,t:'Meccan'},{n:72,en:'Al-Jinn',ar:'الجن',a:28,t:'Meccan'},
{n:73,en:'Al-Muzzammil',ar:'المزمل',a:20,t:'Meccan'},{n:74,en:'Al-Muddaththir',ar:'المدثر',a:56,t:'Meccan'},{n:75,en:'Al-Qiyamah',ar:'القيامة',a:40,t:'Meccan'},
{n:76,en:'Al-Insan',ar:'الإنسان',a:31,t:'Medinan'},{n:77,en:'Al-Mursalat',ar:'المرسلات',a:50,t:'Meccan'},{n:78,en:'An-Naba',ar:'النبأ',a:40,t:'Meccan'},
{n:79,en:'An-Nazi\'at',ar:'النازعات',a:46,t:'Meccan'},{n:80,en:'Abasa',ar:'عبس',a:42,t:'Meccan'},{n:81,en:'At-Takwir',ar:'التكوير',a:29,t:'Meccan'},
{n:82,en:'Al-Infitar',ar:'الانفطار',a:19,t:'Meccan'},{n:83,en:'Al-Mutaffifin',ar:'المطففين',a:36,t:'Meccan'},{n:84,en:'Al-Inshiqaq',ar:'الانشقاق',a:25,t:'Meccan'},
{n:85,en:'Al-Buruj',ar:'البروج',a:22,t:'Meccan'},{n:86,en:'At-Tariq',ar:'الطارق',a:17,t:'Meccan'},{n:87,en:'Al-A\'la',ar:'الأعلى',a:19,t:'Meccan'},
{n:88,en:'Al-Ghashiyah',ar:'الغاشية',a:26,t:'Meccan'},{n:89,en:'Al-Fajr',ar:'الفجر',a:30,t:'Meccan'},{n:90,en:'Al-Balad',ar:'البلد',a:20,t:'Meccan'},
{n:91,en:'Ash-Shams',ar:'الشمس',a:15,t:'Meccan'},{n:92,en:'Al-Layl',ar:'الليل',a:21,t:'Meccan'},{n:93,en:'Ad-Duha',ar:'الضحى',a:11,t:'Meccan'},
{n:94,en:'Ash-Sharh',ar:'الشرح',a:8,t:'Meccan'},{n:95,en:'At-Tin',ar:'التين',a:8,t:'Meccan'},{n:96,en:'Al-Alaq',ar:'العلق',a:19,t:'Meccan'},
{n:97,en:'Al-Qadr',ar:'القدر',a:5,t:'Meccan'},{n:98,en:'Al-Bayyinah',ar:'البينة',a:8,t:'Medinan'},{n:99,en:'Az-Zalzalah',ar:'الزلزلة',a:8,t:'Medinan'},
{n:100,en:'Al-Adiyat',ar:'العاديات',a:11,t:'Meccan'},{n:101,en:'Al-Qari\'ah',ar:'القارعة',a:11,t:'Meccan'},{n:102,en:'At-Takathur',ar:'التكاثر',a:8,t:'Meccan'},
{n:103,en:'Al-Asr',ar:'العصر',a:3,t:'Meccan'},{n:104,en:'Al-Humazah',ar:'الهمزة',a:9,t:'Meccan'},{n:105,en:'Al-Fil',ar:'الفيل',a:5,t:'Meccan'},
{n:106,en:'Quraysh',ar:'قريش',a:4,t:'Meccan'},{n:107,en:'Al-Ma\'un',ar:'الماعون',a:7,t:'Meccan'},{n:108,en:'Al-Kawthar',ar:'الكوثر',a:3,t:'Meccan'},
{n:109,en:'Al-Kafirun',ar:'الكافرون',a:6,t:'Meccan'},{n:110,en:'An-Nasr',ar:'النصر',a:3,t:'Medinan'},{n:111,en:'Al-Masad',ar:'المسد',a:5,t:'Meccan'},
{n:112,en:'Al-Ikhlas',ar:'الإخلاص',a:4,t:'Meccan'},{n:113,en:'Al-Falaq',ar:'الفلق',a:5,t:'Meccan'},{n:114,en:'An-Nas',ar:'الناس',a:6,t:'Meccan'}
];

var JUZS={1:1,2:2,3:2,4:3,5:4,6:4,7:5,8:6,9:7,10:8,11:9,12:11,13:12,14:13,15:15,16:17,17:18,18:20,19:21,20:23,21:25,22:27,23:29,24:31,25:34,26:36,27:39,28:46,29:51,30:67};

var RECITERS=[
  {id:'Alafasy_128kbps',name:'میشاری العفاسی',ar:'مشاري العفاسي'},
  {id:'Abdul_Basit_Murattal_192kbps',name:'عبدالباسط عبدالسمد',ar:'عبد الباسط عبد الصمد'},
  {id:'Hudhaify_128kbps',name:'علی الحذیفی',ar:'علي الحذيفي'},
  {id:'Minshawy_Murattal_128kbps',name:'محمد المنشاوی',ar:'محمد المنشاوي'},
  {id:'Abu_Bakr_Ash-Shaatree_128kbps',name:'ئەبووبەکر شاتری',ar:'أبو بكر الشاطري'},
  {id:'Muhammad_Jibreel_128kbps',name:'محمد جبریل',ar:'محمد جبريل'},
  {id:'MaherAlMuaiqly128kbps',name:'ماهر المعیقلی',ar:'ماهر المعيقلي'},
  {id:'Yasser_Ad-Dussary_128kbps',name:'یاسر دوسری',ar:'ياسر الدوسري'},
  {id:'Abdurrahmaan_As-Sudais_192kbps',name:'عبدالرحمن السدیس',ar:'عبد الرحمن السديس'},
  {id:'Saood_ash-Shuraym_128kbps',name:'سعود الشریم',ar:'سعود الشريم'},
  {id:'Abdullah_Basfar_192kbps',name:'عبدالله بصفر',ar:'عبد الله بصفر'},
  {id:'Ahmed_ibn_Ali_al-Ajamy_128kbps-almanar',name:'أحمد العجمی',ar:'أحمد العجمي'},
  {id:'Hani_Rifai_192kbps',name:'هانی رفاعی',ar:'هاني الرفاعي'},
  {id:'Muhammad_Ayyoub_128kbps',name:'محمد أیوب',ar:'محمد أيوب'},
  {id:'Ghamadi_40kbps',name:'سعد الغامدی',ar:'سعد الغامدي'},
  {id:'Husary_128kbps',name:'محمود الحصری',ar:'محمود الحصري'},
  {id:'Abdullaah_3awwaad_Al-Juhaynee_128kbps',name:'عبدالله الجهینی',ar:'عبد الله الجهني'},
  {id:'Sahl_Yassin_128kbps',name:'سهل یاسین',ar:'سهل ياسين'},
  {id:'Mohammad_al_Tablaway_128kbps',name:'محمد الطبلاوی',ar:'محمد الطبلاوي'},
  {id:'Mustafa_Ismail_48kbps',name:'مصطفی اسماعیل',ar:'مصطفى إسماعيل'}
];
var RECITER=localStorage.getItem('app_reciter')||'Alafasy_128kbps';

/* ===== AUDIO HELPERS ===== */
function audioUrl(surah,ayah){
  return 'https://everyayah.com/data/'+RECITER+'/'+String(surah).padStart(3,'0')+String(ayah).padStart(3,'0')+'.mp3';
}

// Prefetch next ayah as a blob so playback is instant with zero gap
var _pf={url:'',blob:null,xhr:null};
var _blobToRevoke=null; // deferred blob revocation — revoke only after audio confirms playing
function prefetchAyahBlob(surah,ayah){
  var s=SURAHS[surah-1];if(!s)return;
  var ns=surah,na=ayah+1;
  if(na>s.a){ns=surah+1;na=1;}
  if(ns>114)return;
  var url=audioUrl(ns,na);
  if(_pf.url===url)return; // already fetching/fetched this one
  clearPrefetch();
  _pf.url=url;
  var xhr=new XMLHttpRequest();
  xhr.open('GET',url,true);
  xhr.responseType='blob';
  xhr.onload=function(){
    if(xhr.status===200&&_pf.url===url){
      _pf.blob=URL.createObjectURL(xhr.response);
    }
  };
  xhr.onerror=function(){};
  _pf.xhr=xhr;
  xhr.send();
}
function clearPrefetch(){
  if(_pf.xhr){_pf.xhr.abort();_pf.xhr=null;}
  if(_pf.blob){URL.revokeObjectURL(_pf.blob);_pf.blob=null;}
  _pf.url='';
}

// Update play/pause/loading icon
function setAudioIcon(state){
  var ic=$('audioPlayIcon');if(!ic)return;
  ic.className=state==='loading'?'fas fa-spinner fa-spin':state==='pause'?'fas fa-pause':'fas fa-play';
}

/* ===== STATE ===== */
var S={
  tab:'quran',tabHistory:[],
  surah:null,mushafMode:localStorage.getItem('mushafMode')==='true',quranData:null,tafsirData:null,
  showTafsir:localStorage.getItem('showTafsir')!=='false',
  audio:{el:null,playing:false,surah:0,ayah:0,speed:parseFloat(localStorage.getItem('app_speed'))||1,repeatMode:localStorage.getItem('app_repeat')||'none',repeatCount:parseInt(localStorage.getItem('app_repeatCount'))||1,currentRepeat:0},
  sidebar:false,sidebarMode:'surah',
  search:'',
  bmSort:'newest',bmSearch:'',
  goalYear:new Date().getFullYear(),goalMonth:new Date().getMonth(),
  wizardStep:0,wizardData:{},
  bgAudio:localStorage.getItem('bgAudio')==='true',
  keepAwake:localStorage.getItem('keepAwake')==='true',
  autoAdvance:localStorage.getItem('autoAdvance')==='true',
  scrollFollowsAudio:localStorage.getItem('scrollFollowsAudio')!=='false',
  hapticFeedback:localStorage.getItem('hapticFeedback')!=='false',
  dailyReminder:localStorage.getItem('dailyReminder')==='true',
  reminderTime:localStorage.getItem('reminderTime')||'08:00',
  prayerCity:localStorage.getItem('prayerCity')||'Duhok',
  prayerMethod:parseInt(localStorage.getItem('prayerMethod')||'13'),
  prayerAthanEnabled:localStorage.getItem('prayerAthanEnabled')==='true',
  prayerToggles:(function(){try{return JSON.parse(localStorage.getItem('prayerToggles')||'{}')}catch(e){return {}}}()),
  theme:localStorage.getItem('theme')||(JSON.parse(localStorage.getItem('userPreferences')||'{}').darkMode?'dark':'light'),
  arSize:parseFloat(localStorage.getItem('app_arSize'))||2.0,
  tfSize:parseFloat(localStorage.getItem('app_tfSize'))||1.0,
  lineH:parseFloat(localStorage.getItem('app_lineH'))||2.2,
  ivSupabase:null,ivSeries:null,ivEpisodes:null,ivCurrentSeries:null,ivLoading:false,ivInited:false,ivSearchQuery:'',
  rm:{mode:'single',playCount:2,verseRepeat:1,delay:0,isPlaying:false,currentPlay:0},
  readSession:null,
  todayVerses:null,
  supabase:null,user:null,syncInterval:null,isSyncing:false,lastSyncTime:0,realtimeChannel:null,
  mushafFont:localStorage.getItem('mushafFont')||'qcf1',
  mushafFontSize:(function(){var f=localStorage.getItem('mushafFont')||'qcf1';return parseInt(localStorage.getItem('mushafFontSize_'+f))||(f==='qcf1'?22:20);}()),
  mushafLineH:parseFloat(localStorage.getItem('mushafLineH'))||1.8,
  renderedAyahs:[],renderedTafsirs:{},
  copy:{surah:0,ayah:0,rangeFmt:'both'}
};

/* ===== INIT ===== */
function init(){
  try{
    // v3: Force reset font sizes and clear stale caches
    if(localStorage.getItem('app_v')!=='3'){
      localStorage.setItem('app_arSize','2.0');
      localStorage.setItem('app_tfSize','1.0');
      localStorage.removeItem('quran_data_cache');
      localStorage.removeItem('tafsir_data_cache');
      localStorage.removeItem('tafsir_cache_v');
      localStorage.setItem('app_v','3');
      S.arSize=2.0;
      S.tfSize=1.0;
    }

    S.audio.el=$('audioEl');
    on(S.audio.el,'ended',function(){App.audioNext()});
    on(S.audio.el,'error',function(){
      if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
      if(S.audio.surah)toast(t('error.audio_load'));
    });
    on(S.audio.el,'waiting',function(){if(S.audio.playing)setAudioIcon('loading')});
    on(S.audio.el,'playing',function(){
      setAudioIcon('pause');
      if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
    });
    on(S.audio.el,'pause',function(){if(!S.audio.playing)setAudioIcon('play')});

    applyTheme();
    applySizes();
    applyKeepAwake();
    initTodayVerses();
    renderSurahGrid();
    renderContinue();

    // Pull-to-refresh on all tabs
    setupPullToRefresh('panelQuran',function(){renderSurahGrid();renderContinue()},function(){return !S.surah});
    setupPullToRefresh('panelBookmarks',function(){_renderHash.bm=null;renderBookmarks();});
    setupPullToRefresh('panelGoals',function(){_renderHash.goals=null;renderGoals();});
    setupPullToRefresh('panelIslamvoice',function(){_renderHash.iv=null;if(typeof App.ivRefresh==='function')App.ivRefresh();});
    setupPullToRefresh('panelSettings',function(){_renderHash.settings=null;renderSettings();});
    setupPullToRefresh('panelPrayer',function(){if(window.PrayerUI)PrayerUI.refresh()});

    // Load data
    loadQuranData();
    loadTafsirData();

    // Init shared Supabase client and check auth
    initSupabase();

    // Pause audio when app goes to background (unless bgAudio is enabled)
    document.addEventListener('visibilitychange',function(){
      if(document.hidden&&!S.bgAudio&&S.audio.playing){
        S.audio.el.pause();S.audio.playing=false;
        var ic=$('audioPlayIcon');
        if(ic)ic.className='fas fa-play';
      }
    });
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('appStateChange',function(state){
          if(!state.isActive){
            if(!S.bgAudio&&S.audio.playing){
              S.audio.el.pause();S.audio.playing=false;
              var ic=$('audioPlayIcon');
              if(ic)ic.className='fas fa-play';
            }
            // Sync data when app goes to background
            if(S.user)syncToCloud();
          } else {
            // App came to foreground — reschedule athan if it's a new day
            if(window.PrayerUI)PrayerUI.initScheduleOnStart();
          }
        });
      }
    }catch(e){console.warn('App state listener not available',e)}

    // Android back button
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('backButton',function(){
          if($('profilePanel')&&$('profilePanel').classList.contains('on')){App.closeProfile();return}
          if($('authPanel')&&$('authPanel').classList.contains('on')){App.closeLogin();return}
          if($('goalConfirmOverlay')&&$('goalConfirmOverlay').classList.contains('on')){App.closeDeleteConfirm();return}
          if($('repeatModal').classList.contains('on')){App.closeRepeat();return}
          if($('audioSettingsPanel').classList.contains('on')){App.closeAudioSettings();return}
          if($('qsSheet')&&$('qsSheet').classList.contains('on')){App.closeReaderSettings();return}
          if(S.sidebar){App.closeSidebar();return}
          if($('wizard').classList.contains('on')){App.closeWizard();return}
          if(S.ivCurrentSeries){App.ivBack();return}
          if(S.surah){App.backToList();return}
          if(S.tab!=='quran'){App.tab('quran');return}
          window.Capacitor.Plugins.App.exitApp();
        });
      }
    }catch(e){console.warn('Back button handler not available',e)}

    // Handle OAuth deep link callback
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('appUrlOpen',function(event){
          if(event.url&&event.url.indexOf('com.tafsirkurd.app://auth')===0){
            // Close browser if open
            try{if(window.Capacitor.Plugins.Browser)window.Capacitor.Plugins.Browser.close()}catch(e2){}
            // Extract tokens from URL hash/query
            var url=event.url;
            var hashPart=url.split('#')[1]||'';
            if(hashPart&&S.supabase){
              var params=new URLSearchParams(hashPart);
              var accessToken=params.get('access_token');
              var refreshToken=params.get('refresh_token');
              if(accessToken&&refreshToken){
                S.supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken}).then(function(resp){
                  if(resp.error){console.error('OAuth session error:',resp.error);return}
                  if(resp.data&&resp.data.session){
                    setUserFromSession(resp.data.session);
                    // Create profile if needed
                    var u=resp.data.session.user;
                    var meta=u.user_metadata||{};
                    S.supabase.from('profiles').upsert({
                      id:u.id,email:u.email,
                      full_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
                      display_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
                      avatar_url:meta.avatar_url||null,
                      registration_source:'google',
                      has_completed_signup:true,
                      first_login_at:new Date().toISOString()
                    },{onConflict:'id'}).then(function(){});
                    startCloudSync();
                    App.closeLogin();
                    toast(t('toast.logged_in'));
                    if(S.tab==='settings')renderSettings();
                  }
                }).catch(function(e3){console.error('OAuth set session error:',e3)});
              }
            }
          }
        });
      }
    }catch(e){console.warn('Deep link handler not available',e)}

    // Fix tab bar after exiting fullscreen video
    document.addEventListener('fullscreenchange',function(){
      if(!document.fullscreenElement){
        setTimeout(function(){window.dispatchEvent(new Event('resize'))},100);
      }
    });
    document.addEventListener('webkitfullscreenchange',function(){
      if(!document.webkitFullscreenElement){
        setTimeout(function(){window.dispatchEvent(new Event('resize'))},100);
      }
    });
  }catch(e){
    console.error('App init error:',e);
  }

  // Request battery optimization exemption so Samsung doesn't kill our alarms
  if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications){
    try{
      var _cap=window.Capacitor;
      // Trigger Android's "Allow background activity" prompt via Capacitor
      _cap.Plugins.LocalNotifications.requestPermissions().catch(function(){});
    }catch(e){}
  }

  // Schedule athan on startup (in case it's a new day)
  if(window.PrayerUI)PrayerUI.initScheduleOnStart();
  // Pre-fetch all 20 cities for this month in background (once per month)
  if(window.PrayerUI)PrayerUI.prefetchAllCities();
  // Pre-warm athan voice buffers after 4s so first preview tap is instant
  setTimeout(function(){if(window.PrayerUI)PrayerUI.preloadAthanVoices();},4000);

  // Fetch prayer data immediately (no delay) so cache is ready for pre-render below
  if(window.PrayerAPI&&window.PrayerCache&&window.PrayerLogic){
    var _pwCity=localStorage.getItem('prayerCity')||'Duhok';
    var _pwToday=window.PrayerLogic.todayBaghdad();
    var _pwParts=_pwToday.split('-').map(Number);
    var _pwMkey=window.PrayerCache.monthKey(_pwCity,_pwParts[0],_pwParts[1]);
    if(!window.PrayerCache.read(_pwMkey)){
      window.PrayerAPI.fetchPrayerTimes(_pwCity,_pwToday).catch(function(){});
    }
  }

  // Pre-fetch mushaf page data for current surah in background so mushaf mode loads instantly
  setTimeout(function(){
    var pf=_getPageFields();
    getMushafPageRange(S.surah||1).then(function(pages){
      // Inject fonts and fetch data for all pages of this surah
      for(var pn=pages.start;pn<=pages.end;pn++){
        (function(n){
          if(S.mushafFont==='qcf1')injectQCFFont(n);
          else if(S.mushafFont==='qcf2')injectQCFV2Font(n);
          getMushafPageData(n,pf.fields,pf.cache).catch(function(){});
        })(pn);
      }
    }).catch(function(){});
  },1500);

  // Pre-render all tabs in background so every tab is already built before user taps.
  // Splash hides at ~800ms; start at 900ms then stagger 80ms each to avoid jank.
  setTimeout(function(){
    var jobs=[
      function(){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');},
      function(){renderGoals();_renderHash.goals=_tabHash('goals');},
      function(){renderSettings();_renderHash.settings=_tabHash('settings');},
      function(){if(window.PrayerUI)PrayerUI.render();},
      function(){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');}
    ];
    var i=0;
    function next(){if(i>=jobs.length)return;jobs[i++]();setTimeout(next,80);}
    next();
  },900);

  // Hide splash (always runs even if init errors above)
  setTimeout(function(){
    var sp=$('splash');
    if(sp){sp.classList.add('hide')}
    var app=$('app');
    if(app){app.style.display='flex'}
    setTimeout(function(){if(sp&&sp.parentNode)sp.parentNode.removeChild(sp)},300);
  },800);
}

/* ===== LIVE TRANSLATION UPDATE ===== */
// When the admin saves a translation, i18n.js detects the change (polling every 8s),
// fires i18n:updated, and we immediately re-render whichever tab is currently visible.
document.addEventListener('i18n:updated', function(){
  // Invalidate all pre-rendered caches — next tab visit rebuilds with fresh strings
  _renderHash={};
  if(window.PrayerUI) PrayerUI.invalidate();

  // Re-render the currently visible tab right now so the user sees the change immediately
  var tab=S.tab;
  if(tab==='bookmarks'){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');}
  else if(tab==='goals'){renderGoals();_renderHash.goals=_tabHash('goals');}
  else if(tab==='settings'){renderSettings();_renderHash.settings=_tabHash('settings');}
  else if(tab==='islamvoice'){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');}
  else if(tab==='prayer'&&window.PrayerUI){PrayerUI.redraw();}
  // quran tab uses data-i18n attributes — applyTranslations() already handled it above
});

/* ===== DATA LOADING ===== */
function loadQuranData(){
  var cached=null;
  try{cached=JSON.parse(localStorage.getItem('quran_data_cache'))}catch(e){}
  if(cached){S.quranData=cached;return}
  fetch('/data/quran.json').then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(d){
    S.quranData=d;
    try{localStorage.setItem('quran_data_cache',JSON.stringify(d))}catch(e){
      console.warn('Quran cache failed (storage full?)');
    }
    // Re-render current surah if one is open
    if(S.surah)renderAyahs(S.surah);
  }).catch(function(e){
    console.error('Quran load error:',e);
    toast(t('error.data_load'));
  });
}

function groupTafsirBySurah(data){
  if(!Array.isArray(data)||!data.length)return data;
  // Already grouped format (array of {verses:[...]})
  if(data[0]&&data[0].verses)return data;
  // Flat array with surah/ayah/kurdish_tafsir keys
  if(data[0]&&data[0].surah!=null){
    var grouped={};
    data.forEach(function(item){
      var sn=item.surah;
      if(!grouped[sn])grouped[sn]={verses:[]};
      var txt=item.kurdish_tafsir||item.text||item.tafsir||'';
      grouped[sn].verses.push({verse:parseInt(item.ayah),text:txt});
    });
    var result=[];
    for(var i=1;i<=114;i++){
      result.push(grouped[i]||{verses:[]});
    }
    return result;
  }
  return data;
}

function loadTafsirData(){
  // v3: clear old cache format
  if(localStorage.getItem('tafsir_cache_v')!=='3'){
    localStorage.removeItem('tafsir_data_cache');
    localStorage.setItem('tafsir_cache_v','3');
  }
  var cached=null;
  try{cached=JSON.parse(localStorage.getItem('tafsir_data_cache'))}catch(e){}
  if(cached){
    S.tafsirData=groupTafsirBySurah(cached);
    return;
  }
  fetch('/data/kurdish_tafsir.json').then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(d){
    S.tafsirData=groupTafsirBySurah(d);
    try{localStorage.setItem('tafsir_data_cache',JSON.stringify(d))}catch(e){
      console.warn('Tafsir cache failed (storage full?)');
    }
    // Re-render current surah if one is open
    if(S.surah)renderAyahs(S.surah);
  }).catch(function(e){
    console.error('Tafsir load error:',e);
    toast(t('error.tafsir_load'));
    // Retry once after 3 seconds
    setTimeout(function(){
      if(S.tafsirData)return;
      fetch('/data/kurdish_tafsir.json').then(function(r){return r.json()}).then(function(d){
        S.tafsirData=groupTafsirBySurah(d);
        try{localStorage.setItem('tafsir_data_cache',JSON.stringify(d))}catch(e2){}
        if(S.surah)renderAyahs(S.surah);
        toast(t('toast.tafsir_loaded'));
      }).catch(function(){});
    },3000);
  });
}

/* ===== THEME & SIZES ===== */
function applyTheme(){
  document.documentElement.setAttribute('data-theme',S.theme);
  localStorage.setItem('theme',S.theme);
  if(window.Capacitor&&window.Capacitor.Plugins.StatusBar){
    var isDark=S.theme==='dark'||S.theme==='sakina';
    try{window.Capacitor.Plugins.StatusBar.setStyle({style:isDark?'DARK':'LIGHT'})}catch(e){}
    try{var bgMap={light:'#fafafa',dark:'#0a0a0a',sakina:'#0c1c12',noor:'#f4e8cc'};
        window.Capacitor.Plugins.StatusBar.setBackgroundColor({color:bgMap[S.theme]||'#fafafa'})}catch(e){}
  }
}
function applySizes(){
  document.documentElement.style.setProperty('--ar-size',S.arSize+'rem');
  document.documentElement.style.setProperty('--tf-size',S.tfSize+'rem');
  document.documentElement.style.setProperty('--line-h',String(S.lineH));
}
var _qsDimTimer=null;
function dimQsSheet(){
  var sheet=$('qsSheet'),ov=$('qsOverlay');
  if(sheet)sheet.style.opacity='0.12';
  if(ov)ov.style.opacity='0';
  clearTimeout(_qsDimTimer);
  _qsDimTimer=setTimeout(restoreQsSheet,1200);
}
function restoreQsSheet(){
  clearTimeout(_qsDimTimer);
  var sheet=$('qsSheet'),ov=$('qsOverlay');
  if(sheet)sheet.style.opacity='';
  if(ov)ov.style.opacity='';
}
function applyKeepAwake(){
  try{
    var KA=window.Capacitor&&window.Capacitor.Plugins.KeepAwake;
    if(!KA)return;
    if(S.keepAwake)KA.keepAwake();else KA.allowSleep();
  }catch(e){}
}

/* ===== TAB SWITCHING ===== */
var _renderHash={};
function _tabHash(name){
  if(name==='bookmarks'){
    var bms=getBookmarks();
    return bms.length+':'+S.bmSort;
  }
  if(name==='goals'){
    var log=getReadLog();var g=getGoal();var today=dateKey(new Date());
    return JSON.stringify(g)+':'+(log[today]||0)+':'+calcStreak(log);
  }
  if(name==='settings'){
    return (S.user?S.user.email:'')+S.darkMode+S.hapticFeedback+S.fontSize+S.keepAwake+S.reminderEnabled+S.reminderTime;
  }
  if(name==='islamvoice'){
    return (S.ivSeries?S.ivSeries.length:0)+':'+(S.ivSearchQuery||'');
  }
  return null;
}
window.App={};
App.tab=function(name){
  if(name===S.tab&&!S.surah)return;
  haptic([8]);
  if(S.surah&&name==='quran'){App.backToList();return}
  S.tabHistory.push(S.tab);
  S.tab=name;
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('on')});
  document.querySelectorAll('.tab-item').forEach(function(t){t.classList.remove('on')});
  var panel=$('panel'+name.charAt(0).toUpperCase()+name.slice(1));
  if(panel)panel.classList.add('on');
  var tabBtnName=(name==='goals'||name==='bookmarks')?'quran':name;
  var tabBtn=document.querySelector('.tab-item[data-tab="'+tabBtnName+'"]');
  if(tabBtn)tabBtn.classList.add('on');

  if(name==='bookmarks'){var h=_tabHash('bookmarks');if(h!==_renderHash.bm){renderBookmarks();_renderHash.bm=h;}}
  if(name==='goals'){var h=_tabHash('goals');if(h!==_renderHash.goals){renderGoals();_renderHash.goals=h;}}
  if(name==='islamvoice'){var h=_tabHash('islamvoice');if(h!==_renderHash.iv){renderIslamVoice();_renderHash.iv=h;}}
  if(name==='settings'){var h=_tabHash('settings');if(h!==_renderHash.settings){renderSettings();_renderHash.settings=h;}}
  if(name==='prayer'){if(window.PrayerUI)PrayerUI.render();}
};

/* ===== TOAST ===== */
function toast(msg){
  var t=$('toast');
  t.textContent=msg;
  t.classList.add('on');
  setTimeout(function(){t.classList.remove('on')},2000);
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
      else{H.vibrate({duration:dur});}
    }else{navigator.vibrate(pattern||[30]);}
  }catch(e){}
}

/* ===== DAILY REMINDER ===== */
function scheduleReminder(enabled,time){
  if(!window.Capacitor||!window.Capacitor.Plugins||!window.Capacitor.Plugins.LocalNotifications)return;
  var LN=window.Capacitor.Plugins.LocalNotifications;
  LN.cancel({notifications:[{id:1}]}).catch(function(){});
  if(!enabled)return;
  var parts=(time||'08:00').split(':');
  var h=parseInt(parts[0])||8;
  var m=parseInt(parts[1])||0;
  var now=new Date();
  var next=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0,0);
  if(next<=now)next.setDate(next.getDate()+1);
  LN.requestPermissions().then(function(){
    LN.schedule({notifications:[{
      id:1,
      title:'Tafsir Kurd',
      body:t('notif.reminder_body'),
      schedule:{at:next,repeats:true,every:'day'},
      smallIcon:'ic_notification',
      channelId:'reminder'
    }]});
  }).catch(function(){});
}

/* ===== SEARCH ===== */
App.toggleSearch=function(){
  var bar=$('searchBar');
  bar.classList.toggle('on');
  if(bar.classList.contains('on'))$('searchInput').focus();
  else App.clearSearch();
};
App.clearSearch=function(){
  $('searchInput').value='';S.search='';
  $('searchResults').classList.remove('on');
  clear($('searchResults'));
};
App.onSearch=function(v){
  S.search=v.trim().toLowerCase();
  var res=$('searchResults');
  clear(res);
  if(!S.search){res.classList.remove('on');return}
  var matches=SURAHS.filter(function(s){
    return s.en.toLowerCase().indexOf(S.search)!==-1||s.ar.indexOf(S.search)!==-1||String(s.n)===S.search;
  }).slice(0,10);
  if(!matches.length){res.classList.remove('on');return}
  res.classList.add('on');
  matches.forEach(function(s){
    var item=el('div','search-result');
    item.appendChild(el('div','search-result-title',s.n+'. '+s.en));
    item.appendChild(el('div','search-result-sub',s.ar+' - '+s.a+' '+t('reader.ayah')));
    on(item,'click',function(){App.openSurah(s.n);App.clearSearch();$('searchBar').classList.remove('on')});
    res.appendChild(item);
  });
};

/* ===== SURAH GRID ===== */
function renderSurahGrid(){
  var grid=$('surahGrid');
  clear(grid);
  SURAHS.forEach(function(s){
    var card=el('div','surah-card');
    var numBox=el('div','surah-num');
    numBox.appendChild(el('span','surah-num-n',String(s.n)));
    var orig=el('span','surah-num-origin');orig.appendChild(icon(s.t==='Meccan'?'fas fa-kaaba':'fas fa-mosque'));numBox.appendChild(orig);
    card.appendChild(numBox);
    var info=el('div','surah-info');
    var deco=el('div','surah-name-ar no-kurdish-convert','surah'+String(s.n).padStart(3,'0'));info.appendChild(deco);
    info.appendChild(el('div','surah-name-en',s.en));
    info.appendChild(el('div','surah-ayahs',s.a+' '+t('surah.card.ayah_count')));
    card.appendChild(info);
    on(card,'click',function(){App.openSurah(s.n)});
    grid.appendChild(card);
  });
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
  card.appendChild(el('div','continue-label',t('reader.continue')));
  card.appendChild(el('div','continue-title',s.en+' - '+s.ar));
  card.appendChild(el('div','continue-sub',t('reader.ayah')+' '+last.ayah));
  on(card,'click',function(){App.openSurah(last.surah,last.ayah)});
  c.appendChild(card);
}

/* ===== OPEN SURAH ===== */
App.openSurah=function(num,scrollTo){
  haptic([8]);
  S.surah=num;
  var s=SURAHS[num-1];
  $('readerName').textContent=s.en+' - '+s.ar;
  $('quranHome').style.display='none';
  $('quranReader').classList.add('on');
  renderAyahs(num,scrollTo);
  try{localStorage.setItem('lastRead',JSON.stringify({surah:num,ayah:scrollTo||1}))}catch(e){}
  prefetchAyahBlob(num,(scrollTo||1)-1);
  var pb=$('mushafPlayBtn');if(pb){pb.style.display='';updateMushafPlayBtn();}
  if(S.mushafMode){
    var btn=$('mushafToggleBtn');if(btn)btn.classList.add('on');
    var al=$('ayahList');if(al)al.style.display='none';
    var mv=$('mushafView');if(mv){mv.style.display='';renderMushafView();}
  }
};

App.backToList=function(){
  haptic([8]);
  if(S.surah){
    try{localStorage.setItem('surah_scroll_'+S.surah,String($('panelQuran').scrollTop))}catch(e){}
  }
  // Clean up mushaf DOM — keep mode preference so next surah reopens in mushaf
  var mv=$('mushafView');if(mv){mv.style.display='none';clear(mv);}
  var al=$('ayahList');if(al)al.style.display='';
  var pb=$('mushafPlayBtn');if(pb)pb.style.display='none';
  S.surah=null;
  $('quranReader').classList.remove('on');
  $('quranHome').style.display='';
  $('panelQuran').scrollTop=0;
  renderContinue();
};

/* ===== MUSHAF MODE ===== */
var _qcfFontInjected={};
var _qcfV2FontInjected={};
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

function getMushafPageRange(surahNum){
  var key='qcfRange_'+surahNum;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.start)return Promise.resolve(c);}catch(e){}
  return fetch('https://api.quran.com/api/v4/chapters/'+surahNum)
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){
      var ch=json.chapter;
      var pages={start:ch.pages[0],end:ch.pages[1]};
      try{localStorage.setItem(key,JSON.stringify(pages));}catch(e){}
      return pages;
    });
}

function getMushafPageData(pageNum,fields,cachePrefix){
  fields=fields||'code_v1';cachePrefix=cachePrefix||'qcfV1p_';
  var key=cachePrefix+pageNum;
  try{var c=JSON.parse(localStorage.getItem(key)||'null');if(c&&c.verses)return Promise.resolve(c);}catch(e){}
  return fetch('https://api.quran.com/api/v4/verses/by_page/'+pageNum+'?words=true&word_fields='+fields+'&per_page=50')
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(json){
      try{localStorage.setItem(key,JSON.stringify(json));}catch(e){}
      return json;
    });
}
function _getPageFields(){
  if(S.mushafFont==='qcf2')return{fields:'code_v2',cache:'qcfV2p_'};
  return{fields:'code_v1',cache:'qcfV1p_'};
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
    if(ayahList)ayahList.style.display='none';
    if(mushafView){mushafView.style.display='';renderMushafView();}
  }else{
    if(ayahList)ayahList.style.display='';
    var s2=SURAHS[(S.surah||1)-1];
    updateProgress(ayahList,s2?s2.a:0);
    if(mushafView){mushafView.style.display='none';clear(mushafView);}
  }
};

// Standard Medina Mushaf (604-page Hafs/Uthmani) — juz start pages
var JUZ_PAGES=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
function juzForPage(p){for(var j=JUZ_PAGES.length-1;j>=0;j--){if(p>=JUZ_PAGES[j])return j+1;}return 1;}

function renderMushafView(){
  var view=$('mushafView');
  if(!view||!S.surah)return;
  window._mushafVerseElements={};
  clear(view);
  view.scrollTop=0;
  var spinner=el('div','mushaf-loading');
  spinner.appendChild(icon('fas fa-spinner fa-spin'));
  view.appendChild(spinner);

  getMushafPageRange(S.surah).then(function(pages){
    if(!S.mushafMode)return;
    clear(view);
    view.scrollTop=0;

    // Pre-inject QCF fonts for first 3 pages so they're downloading in parallel
    for(var pi=pages.start;pi<=Math.min(pages.end,pages.start+2);pi++){
      if(S.mushafFont==='qcf1')injectQCFFont(pi);
      else if(S.mushafFont==='qcf2')injectQCFV2Font(pi);
    }

    for(var p=pages.start;p<=pages.end;p++){
      (function(pn){
        var pageEl=el('div','mushaf-text-page');
        pageEl.dataset.page=String(pn);
        var ph=el('div','mushaf-page-ph');
        ph.appendChild(icon('fas fa-spinner fa-spin'));
        pageEl.appendChild(ph);
        view.appendChild(pageEl);
      })(p);
    }

    // Load first page immediately — no waiting for intersection
    var firstPage=view.querySelector('.mushaf-text-page');
    if(firstPage){
      firstPage.dataset.loaded='1';
      loadMushafPageQCF(firstPage,pages.start).then(function(){
        // Find banner for this surah and scroll to it via offset (avoids scrollIntoView overshooting)
        var targetBanner=view.querySelector('.mushaf-surah-banner[data-surah="'+S.surah+'"]');
        if(targetBanner){
          var viewRect=view.getBoundingClientRect();
          var bannerRect=targetBanner.getBoundingClientRect();
          var offset=bannerRect.top-viewRect.top+view.scrollTop;
          view.scrollTop=Math.max(0,offset-8);
        } else {
          view.scrollTop=0;
        }
      }).catch(function(){});
    }

    // Lazy-load the rest with a large preload margin
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var pageEl=entry.target;
        if(pageEl.dataset.loaded)return;
        pageEl.dataset.loaded='1';
        obs.unobserve(pageEl);
        loadMushafPageQCF(pageEl,parseInt(pageEl.dataset.page));
      });
    },{root:view,rootMargin:'1200px 0px'});
    view.querySelectorAll('.mushaf-text-page:not([data-loaded])').forEach(function(p){obs.observe(p);});
    updateMushafProgress(view);

    // Prev / Next surah nav at end of mushaf pages
    if(S.surah>1||S.surah<114){
      var mushafNav=el('div','mushaf-surah-nav');
      function mushafGoSurah(num){
        S.surah=num;
        var ns=SURAHS[num-1];
        if(ns)$('readerName').textContent=ns.en+' - '+ns.ar;
        try{localStorage.setItem('lastRead',JSON.stringify({surah:num,ayah:1}));}catch(e){}
        var mv=$('mushafView');if(mv){clear(mv);renderMushafView();}
      }
      if(S.surah>1){
        var prevBtn=el('button','mushaf-surah-nav-btn');
        prevBtn.appendChild(icon('fas fa-arrow-right'));
        prevBtn.appendChild(document.createTextNode('  '+(SURAHS[S.surah-2]||{}).n||''));
        on(prevBtn,'click',function(){mushafGoSurah(S.surah-1);});
        mushafNav.appendChild(prevBtn);
      }
      if(S.surah<114){
        var nextBtn2=el('button','mushaf-surah-nav-btn');
        nextBtn2.appendChild(document.createTextNode((SURAHS[S.surah]||{}).n+'  '));
        nextBtn2.appendChild(icon('fas fa-arrow-left'));
        on(nextBtn2,'click',function(){mushafGoSurah(S.surah+1);});
        mushafNav.appendChild(nextBtn2);
      }
      view.appendChild(mushafNav);
    }
  }).catch(function(){
    clear(view);
    view.appendChild(el('div','mushaf-error','Connection error. Try again.'));
  });
}

function loadMushafPageQCF(pageEl,pageNum){
  var font=S.mushafFont||'qcf1';
  if(font==='qcf1')injectQCFFont(pageNum);
  else if(font==='qcf2')injectQCFV2Font(pageNum);
  var pf=_getPageFields();

  return getMushafPageData(pageNum,pf.fields,pf.cache).then(function(json){
    var verses=json.verses||[];
    if(!verses.length){clear(pageEl);pageEl.appendChild(el('div','mushaf-page-ph','—'));return;}

    // Render into a fragment — spinner stays visible until font is ready
    var frag=document.createDocumentFragment();
    // Juz banner — show only at the START of a new juz
    var juzIdx=JUZ_PAGES.indexOf(pageNum);
    if(juzIdx>=0){
      var juzBanner=el('div','mushaf-juz-banner','جزء '+toArabicNum(juzIdx+1));
      frag.appendChild(juzBanner);
    }

    // Helper: surah banner + bismillah
    function addSurahHeader(sn){
      var s=SURAHS[sn-1];
      var banner=el('div','mushaf-surah-banner');
      banner.dataset.surah=String(sn);
      banner.textContent=s?s.n:('سورة '+sn);
      frag.appendChild(banner);
      if(sn!==1&&sn!==9){
        var bism=el('div','mushaf-bismillah');
        bism.textContent='بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
        frag.appendChild(bism);
      }
    }

    if(font==='qcf1'||font==='qcf2'){
      // ── QCF line-by-line rendering (V1 or V2) ──
      var fontFam=(font==='qcf2')?"'QCFv2p"+pageNum+"'":"'QCFv1p"+pageNum+"'";
      var codeField=(font==='qcf2')?'code_v2':'code_v1';
      var lineWords={};var lineVerse={};var lineOrder=[];var lineStartsSurah={};var lineAllVerses={};

      verses.forEach(function(verse){
        var sn=verse.surah_number||parseInt((verse.verse_key||'1:1').split(':')[0]);
        var vn=verse.verse_number;
        var isFirst=(vn===1);var markedLine=false;
        (verse.words||[]).forEach(function(w){
          if(!w[codeField])return;
          var ln=w.line_number||0;
          if(!lineWords[ln]){lineWords[ln]=[];lineOrder.push(ln);}
          if(!lineVerse[ln])lineVerse[ln]={vn:vn,sn:sn};
          // Track every verse that has words on this line (for precise highlight)
          if(!lineAllVerses[ln])lineAllVerses[ln]=[];
          var lav=lineAllVerses[ln];
          if(!lav.length||lav[lav.length-1].vn!==vn)lav.push({vn:vn,sn:sn});
          if(isFirst&&!markedLine&&!lineStartsSurah[ln]){markedLine=true;lineStartsSurah[ln]={surahNum:sn};}
          lineWords[ln].push(w[codeField]);
        });
      });

      lineOrder.sort(function(a,b){return a-b;});
      lineOrder.forEach(function(ln){
        var sc=lineStartsSurah[ln];
        if(sc)addSurahHeader(sc.surahNum);
        var lineEl=el('div','mushaf-qcf-line');
        lineEl.style.fontFamily=fontFam;
        lineEl.textContent=lineWords[ln].join('');
        (function(lv,le,avns){
          if(!lv)return;
          le.dataset.verse=String(lv.vn);
          le.dataset.surah=String(lv.sn);
          le.dataset.verses=avns.join(',');
          // Register every verse on this line in the JS highlight map
          avns.forEach(function(vn){
            var k=String(lv.sn)+':'+String(vn);
            if(!window._mushafVerseElements[k])window._mushafVerseElements[k]=[];
            window._mushafVerseElements[k].push(le);
          });
          // Tap → show tafsir
          on(le,'click',function(e){e.stopPropagation();App.showMushafVerseTafsir(lv.vn,lv.sn);});
        })(lineVerse[ln],lineEl,(lineAllVerses[ln]||[{vn:(lineVerse[ln]||{}).vn}]).map(function(v){return v.vn;}));
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
    var svn=verses.filter(function(v){
      var sn=Number(v.surah_number)||parseInt((v.verse_key||'0:0').split(':')[0]);
      return sn===S.surah;
    }).map(function(v){return Number(v.verse_number);});
    pageEl.dataset.verses=JSON.stringify(svn);

    // Prefetch adjacent pages for zero-delay scroll
    var pf2=_getPageFields();
    var maxP=parseInt(pageEl.parentNode&&pageEl.parentNode.lastElementChild&&pageEl.parentNode.lastElementChild.dataset.page)||pageNum+5;
    if(pageNum+1<=maxP){
      if(font==='qcf1')injectQCFFont(pageNum+1);
      else if(font==='qcf2')injectQCFV2Font(pageNum+1);
      getMushafPageData(pageNum+1,pf2.fields,pf2.cache).catch(function(){});
    }
    if(pageNum+2<=maxP){
      if(font==='qcf1')injectQCFFont(pageNum+2);
      else if(font==='qcf2')injectQCFV2Font(pageNum+2);
      getMushafPageData(pageNum+2,pf2.fields,pf2.cache).catch(function(){});
    }

    // Wait for QCF font to finish downloading before revealing content.
    // Spinner stays visible until font is ready — prevents garbled-glyph flash.
    var showContent=function(){
      clear(pageEl);
      pageEl.appendChild(frag);
      // If audio is playing for this surah, restore highlight on newly-loaded page
      if(S.mushafMode&&S.audio.playing&&S.audio.surah===S.surah){
        var _hk=String(S.audio.surah)+':'+String(S.audio.ayah);
        (window._mushafVerseElements[_hk]||[]).forEach(function(l){
          if(pageEl.contains(l))l.classList.add('mushaf-line--playing');
        });
      }
    };
    var fontFamName=(font==='qcf1')?('QCFv1p'+pageNum):(font==='qcf2'?'QCFv2p'+pageNum:'');
    if(fontFamName&&document.fonts&&document.fonts.load){
      return document.fonts.load('1em "'+fontFamName+'"').catch(function(){return[];}).then(showContent);
    }
    showContent();
  }).catch(function(){
    clear(pageEl);
    pageEl.appendChild(el('div','mushaf-page-ph','✕'));
  });
}

/* ===== RENDER AYAHS ===== */
function renderAyahs(surahNum,scrollTo){
  var list=$('ayahList');
  clear(list);
  // Always reset scroll to top when opening a new surah (unless scrollTo is specified)
  if(!scrollTo){var panel=$('panelQuran');if(panel)panel.scrollTop=0;}
  var s=SURAHS[surahNum-1];
  if(!s)return;

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

  // Store for copy modal
  S.renderedAyahs=ayahs;
  S.renderedTafsirs=tafsirs;

  var bms=getBookmarks();
  var bmSet={};
  bms.forEach(function(b){if(b.surah===surahNum)bmSet[b.ayah]=true});

  var total=ayahs.length||s.a;

  for(var i=1;i<=total;i++){
    (function(ayahNum){
      var card=el('div','ayah-card');
      if(bmSet[ayahNum])card.classList.add('bookmarked');

      // header
      var head=el('div','ayah-head');
      head.appendChild(el('div','ayah-badge',String(ayahNum)));
      var actions=el('div','ayah-actions');

      // bookmark btn
      var bmBtn=el('button','ayah-act'+(bmSet[ayahNum]?' active':''));
      bmBtn.appendChild(icon('fas fa-bookmark'));
      on(bmBtn,'click',function(){toggleBookmark(surahNum,ayahNum);renderAyahs(surahNum)});
      actions.appendChild(bmBtn);

      // copy btn
      var copyBtn=el('button','ayah-act');
      copyBtn.appendChild(icon('fas fa-copy'));
      on(copyBtn,'click',function(){App.openCopyModal(surahNum,ayahNum)});
      actions.appendChild(copyBtn);

      head.appendChild(actions);
      card.appendChild(head);

      // Arabic text
      var arabic=el('div','ayah-arabic');
      arabic.textContent=ayahs[ayahNum-1]?(ayahs[ayahNum-1].text||ayahs[ayahNum-1]):t('reader.ayah')+' '+ayahNum;
      card.appendChild(arabic);

      // Tafsir
      if(tafsirs[ayahNum]){
        var taf=el('div','ayah-tafsir'+(S.showTafsir?'':' hide'));
        taf.textContent=typeof tafsirs[ayahNum]==='string'?tafsirs[ayahNum]:'';
        card.appendChild(taf);
      }

      list.appendChild(card);
    })(i);
  }

  // Surah navigation
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

  // Progress
  updateProgress(list,total);

  // Scroll to ayah
  if(scrollTo){
    setTimeout(function(){
      var cards=list.querySelectorAll('.ayah-card');
      if(cards[scrollTo-1])cards[scrollTo-1].scrollIntoView({behavior:'smooth',block:'center'});
    },100);
  }
}

// Track active progress listener so we can clean up on surah switch
var _progressCleanup=null;

function updateProgress(list,total){
  if(_progressCleanup){_progressCleanup();_progressCleanup=null}

  var progressEl=document.querySelector('.sticky-progress');
  var surahId=S.surah;
  var scrollEl=$('panelQuran');
  var saveTimer=null;
  var destroyed=false;

  // No goal — hide bar, just track lastRead position
  if(!getGoal()){
    if(progressEl)progressEl.style.display='none';
    function onScrollNoGoal(){
      if(destroyed)return;
      clearTimeout(saveTimer);
      saveTimer=setTimeout(function(){
        if(destroyed||S.surah!==surahId)return;
        var cards=list.querySelectorAll('.ayah-card');
        var viewTop=scrollEl.getBoundingClientRect().top;
        var viewBot=scrollEl.getBoundingClientRect().bottom;
        for(var i=0;i<cards.length;i++){
          var r=cards[i].getBoundingClientRect();
          if(r.bottom>=viewTop&&r.top<=viewBot){
            try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:i+1}))}catch(e){}
            try{localStorage.setItem('surah_scroll_'+surahId,String(scrollEl.scrollTop))}catch(e){}
            break;
          }
        }
      },300);
    }
    scrollEl.addEventListener('scroll',onScrollNoGoal);
    _progressCleanup=function(){destroyed=true;clearTimeout(saveTimer);scrollEl.removeEventListener('scroll',onScrollNoGoal);};
    return;
  }

  // Goal active — show progress bar
  if(progressEl)progressEl.style.display='';

  var seenAyahs=new Set();
  try{
    var saved=JSON.parse(localStorage.getItem('surah_progress_'+surahId)||'[]');
    saved.forEach(function(n){if(n>=1&&n<=total)seenAyahs.add(n)});
  }catch(e){}

  function updateHeader(){
    if(destroyed||S.surah!==surahId)return;
    var count=Math.min(seenAyahs.size,total);
    var max=0;seenAyahs.forEach(function(n){if(n>max)max=n});
    if(max>0){try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:max}))}catch(e){}}
    var pct=Math.min(100,Math.round(count/total*100));
    $('readerProgressFill').style.width=pct+'%';
    $('readerAyahLabel').textContent=count+'/'+total+' '+t('reader.ayah');
    $('readerPct').textContent=pct+'%';
  }

  function markSeen(idx){
    if(seenAyahs.has(idx))return false;
    seenAyahs.add(idx);
    trackVerse(surahId,idx);
    return true;
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      if(destroyed||S.surah!==surahId)return;
      var valid=[];seenAyahs.forEach(function(n){if(n>=1&&n<=total)valid.push(n)});
      try{localStorage.setItem('surah_progress_'+surahId,JSON.stringify(valid))}catch(e){}
      try{localStorage.setItem('surah_scroll_'+surahId,String(scrollEl.scrollTop))}catch(e){}
      debouncedSync();
    },300);
  }

  // Show saved progress immediately — no delay
  if(seenAyahs.size>0)updateHeader();

  // IntersectionObserver: fires instantly, no scroll loop, no debounce lag
  var observer=new IntersectionObserver(function(entries){
    if(destroyed||S.surah!==surahId)return;
    var changed=false;
    entries.forEach(function(entry){
      var idx=parseInt(entry.target.dataset.ayah)||0;
      if(!idx||idx>total)return;
      if(entry.isIntersecting&&entry.intersectionRatio>=0.4){
        // 40%+ visible → user is reading this ayah
        if(markSeen(idx))changed=true;
      } else if(!entry.isIntersecting&&entry.boundingClientRect.bottom<0){
        // Scrolled fully past top → definitely read
        if(markSeen(idx))changed=true;
      }
    });
    updateHeader();
    if(changed)scheduleSave();
  },{root:scrollEl,threshold:[0,0.4,1.0]});

  var cards=list.querySelectorAll('.ayah-card');
  cards.forEach(function(card,i){
    card.dataset.ayah=String(i+1);
    observer.observe(card);
  });

  _progressCleanup=function(){
    destroyed=true;
    clearTimeout(saveTimer);
    observer.disconnect();
  };
}

function updateMushafProgress(view){
  if(_progressCleanup){_progressCleanup();_progressCleanup=null;}
  var surahId=S.surah;
  var s=SURAHS[(surahId||1)-1];
  var total=s?s.a:0;
  var progressEl=document.querySelector('.sticky-progress');
  var saveTimer=null;var destroyed=false;
  // No goal — hide bar but still track scroll position for resume
  if(!getGoal()){
    if(progressEl)progressEl.style.display='none';
    var _lrTimer=null;
    var onMushafScrollNoGoal=function(){
      if(destroyed)return;
      clearTimeout(_lrTimer);
      _lrTimer=setTimeout(function(){
        if(destroyed||S.surah!==surahId)return;
        var pages=view.querySelectorAll('.mushaf-text-page');
        var vh=window.innerHeight;
        for(var i=0;i<pages.length;i++){
          var r=pages[i].getBoundingClientRect();
          if(r.bottom>0&&r.top<vh){
            var vns=[];try{vns=JSON.parse(pages[i].dataset.verses||'[]');}catch(e){}
            if(vns.length){try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:vns[0]}));}catch(e){}}
            break;
          }
        }
      },500);
    };
    window.addEventListener('scroll',onMushafScrollNoGoal,{passive:true,capture:true});
    view.addEventListener('scroll',onMushafScrollNoGoal,{passive:true});
    _progressCleanup=function(){
      destroyed=true;clearTimeout(_lrTimer);
      window.removeEventListener('scroll',onMushafScrollNoGoal,{capture:true});
      view.removeEventListener('scroll',onMushafScrollNoGoal);
    };
    return;
  }

  if(!total){_progressCleanup=function(){destroyed=true;};return;}
  if(progressEl)progressEl.style.display='';

  var seenAyahs=new Set();
  var markedPages=new Set(); // pages already dwelt — separate from ayah set to avoid inflating count
  try{JSON.parse(localStorage.getItem('surah_progress_'+surahId)||'[]')
    .forEach(function(n){if(typeof n==='number'&&n>=1&&n<=total)seenAyahs.add(n);});}catch(e){}

  function updateHeader(){
    if(destroyed||S.surah!==surahId)return;
    var count=Math.min(seenAyahs.size,total);
    var max=0;seenAyahs.forEach(function(n){if(n>max)max=n;});
    if(max>0){try{localStorage.setItem('lastRead',JSON.stringify({surah:surahId,ayah:max}));}catch(e){}}
    var pct=Math.min(100,Math.round(count/total*100));
    $('readerProgressFill').style.width=pct+'%';
    $('readerAyahLabel').textContent=count+'/'+total+' '+t('reader.ayah');
    $('readerPct').textContent=pct+'%';
  }
  function markSeen(idx){
    idx=Number(idx);
    if(!idx||isNaN(idx)||seenAyahs.has(idx))return false;
    seenAyahs.add(idx);
    trackVerse(surahId,idx);
    return true;
  }
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      if(destroyed||S.surah!==surahId)return;
      var valid=[];seenAyahs.forEach(function(n){if(n>=1&&n<=total)valid.push(n);});
      try{localStorage.setItem('surah_progress_'+surahId,JSON.stringify(valid));}catch(e){}
      debouncedSync();
    },400);
  }
  function markPage(pageEl){
    try{
      var vns=JSON.parse(pageEl.dataset.verses||'[]');
      var changed=false;
      vns.forEach(function(vn){if(markSeen(vn))changed=true;});
      if(changed){updateHeader();scheduleSave();}
    }catch(e){}
  }

  if(seenAyahs.size>0)updateHeader();

  // Dwell tracking: watch the most-visible page; mark it after user has been on it 2.5s
  var dwellTimer=null;var dwellPage=null;var retryTimer=null;

  function visibleRatio(pageEl){
    var pr=pageEl.getBoundingClientRect();
    var top=Math.max(pr.top,0);
    var bot=Math.min(pr.bottom,window.innerHeight);
    return Math.max(0,bot-top)/Math.max(1,window.innerHeight);
  }

  function checkVisible(){
    if(destroyed||S.surah!==surahId)return;
    var pages=view.querySelectorAll('.mushaf-text-page');
    var bestRatio=0;var bestPage=null;
    pages.forEach(function(pageEl){
      var r=visibleRatio(pageEl);
      if(r>bestRatio){bestRatio=r;bestPage=pageEl;}
    });
    var bestPn=bestPage?bestPage.dataset.page||'0':null;
    // Cancel current dwell if the dominant page changed or dropped below threshold
    if(dwellPage&&(dwellPage!==bestPage||bestRatio<0.3)){
      clearTimeout(dwellTimer);dwellTimer=null;dwellPage=null;
    }
    // Start a new dwell only when: a clear page dominates (≥35%), no dwell running, not already marked
    if(bestPage&&bestRatio>=0.35&&!dwellTimer&&!markedPages.has(bestPn)){
      dwellPage=bestPage;
      dwellTimer=setTimeout(function(){
        dwellTimer=null;dwellPage=null;
        if(destroyed||S.surah!==surahId)return;
        markedPages.add(bestPn); // lock out re-dwell for this page
        if(bestPage.dataset.verses){
          markPage(bestPage);
        } else {
          // Verses still loading — retry once in 2s (retryTimer tracked for cleanup)
          retryTimer=setTimeout(function(){
            retryTimer=null;
            if(!destroyed&&S.surah===surahId&&bestPage.dataset.verses)markPage(bestPage);
          },2000);
        }
      },2500);
    }
  }

  var scrollTick=null;
  var onScroll=function(){
    if(scrollTick)return;
    scrollTick=setTimeout(function(){scrollTick=null;checkVisible();},150);
  };
  window.addEventListener('scroll',onScroll,{passive:true,capture:true});
  view.addEventListener('scroll',onScroll,{passive:true});

  var initTimer=setTimeout(checkVisible,500);
  var periodic=setInterval(checkVisible,3000);

  _progressCleanup=function(){
    destroyed=true;
    clearTimeout(saveTimer);clearTimeout(initTimer);clearTimeout(scrollTick);
    clearTimeout(dwellTimer);clearTimeout(retryTimer);clearInterval(periodic);
    window.removeEventListener('scroll',onScroll,{capture:true});
    view.removeEventListener('scroll',onScroll);
  };
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
  qs.classList.add('on');
  // Push sheet above audio bar if it's visible
  var _ab=$('audioBar');
  var _abH=(_ab&&_ab.classList.contains('on'))?_ab.offsetHeight:0;
  qs.style.paddingBottom=_abH>0?'calc(var(--safe-b) + '+(_abH+8)+'px)':'';
  renderReaderSettings();
};
App.closeReaderSettings=function(){
  $('qsOverlay').classList.remove('on');
  $('qsSheet').classList.remove('on');
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

  /* ---- TEXT SIZE ---- */
  body.appendChild(el('div','qs-section-title',t('qs.text_size')));

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
    var chip=el('div','qs-reciter-chip'+(RECITER===r.id?' on':''),r.name);
    on(chip,'click',function(){
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      renderReaderSettings();
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

/* ===== MUSHAF AUDIO HIGHLIGHT ===== */
function updateMushafHighlight(surah,ayah){
  var view=$('mushafView');
  if(!view)return;
  view.querySelectorAll('.mushaf-line--playing').forEach(function(e){e.classList.remove('mushaf-line--playing');});
  if(!surah||!ayah)return;
  var key=String(surah)+':'+String(ayah);
  var els=window._mushafVerseElements[key]||[];
  var first=null;
  els.forEach(function(l){
    if(view.contains(l)){l.classList.add('mushaf-line--playing');if(!first)first=l;}
  });
  if(first)first.scrollIntoView({behavior:'smooth',block:'center'});
}

/* ===== AUDIO ===== */
function scrollToAyah(ayahNum){
  var list=$('ayahList');
  if(!list)return;
  var cards=list.querySelectorAll('.ayah-card');
  if(cards[ayahNum-1]){
    cards[ayahNum-1].scrollIntoView({behavior:'smooth',block:'center'});
    // Highlight
    cards.forEach(function(c){c.classList.remove('playing')});
    cards[ayahNum-1].classList.add('playing');
  }
}

function playAyah(surah,ayah){
  var url=audioUrl(surah,ayah);
  // Use prefetched blob if ready — zero-gap playback
  var src;
  if(_pf.blob&&_pf.url===url){
    // Use prefetched blob — clear slot WITHOUT revoking (revoke deferred to playing/error event)
    src=_pf.blob;
    if(_blobToRevoke)URL.revokeObjectURL(_blobToRevoke); // safe to revoke previous now
    _blobToRevoke=src;
    _pf.blob=null;_pf.url='';
    if(_pf.xhr){_pf.xhr.abort();_pf.xhr=null;}
  } else {
    src=url;
    clearPrefetch();
  }
  S.audio.surah=surah;S.audio.ayah=ayah;
  S.audio.el.src=src;
  S.audio.el.playbackRate=S.audio.speed;
  S.audio.el.play().catch(function(){});
  S.audio.playing=true;
  showAudioBar();
  // Auto-scroll if same surah is open and scroll-follows-audio is on
  if(S.surah===surah&&S.scrollFollowsAudio)scrollToAyah(ayah);
  // Highlight current line in mushaf mode
  if(S.mushafMode&&S.surah===surah)updateMushafHighlight(surah,ayah);
  // Update mushaf play button icon
  updateMushafPlayBtn();
  // Start prefetching next ayah in background
  prefetchAyahBlob(surah,ayah);
}

function getReciterName(){
  for(var i=0;i<RECITERS.length;i++){if(RECITERS[i].id===RECITER)return RECITERS[i].name}
  return t('audio.reciter');
}

function showAudioBar(){
  var bar=$('audioBar');
  bar.classList.add('on');
  var s=SURAHS[S.audio.surah-1];
  $('audioTitle').textContent=s?s.ar+' - '+t('reader.ayah')+' '+S.audio.ayah:'';
  $('audioSub').textContent=getReciterName();
  setAudioIcon(S.audio.playing?'pause':'play');
}

App.audioToggle=function(){
  haptic([8]);
  if(S.audio.playing){S.audio.el.pause();S.audio.playing=false;setAudioIcon('play');}
  else{S.audio.el.play().catch(function(){});S.audio.playing=true;setAudioIcon('pause');}
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
  else if(S.autoAdvance&&S.audio.surah<114){playAyah(S.audio.surah+1,1)}
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
  S.audio.playing=false;S.audio.surah=0;S.audio.ayah=0;
  S.audio.currentRepeat=0;
  clearPrefetch();
  $('audioBar').classList.remove('on');
  // Remove playing highlights (normal mode + mushaf mode)
  var cards=document.querySelectorAll('.ayah-card.playing');
  cards.forEach(function(c){c.classList.remove('playing')});
  updateMushafHighlight(0,0);
  updateMushafPlayBtn();
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
  hdr.appendChild(el('span','mushaf-settings-title','ڕێکخستنی مووشەف'));
  var xBtn=el('button','mushaf-settings-close');xBtn.appendChild(icon('fas fa-times'));
  on(xBtn,'click',dismiss);hdr.appendChild(xBtn);
  pane.appendChild(hdr);

  var body=el('div','mushaf-settings-body');
  // If audio bar is visible, push sheet content above it
  var _abEl=$('audioBar');
  var _abH=(_abEl&&_abEl.classList.contains('on'))?_abEl.offsetHeight:0;
  if(_abH>0)body.style.paddingBottom='calc(var(--tab-h) + var(--safe-b) + '+(_abH+20)+'px)';

  // Font Size stepper
  body.appendChild(el('div','ms-section-label','قەبارەی نووسین'));
  var fsVal=el('span','stepper-val',S.mushafFontSize+'px');
  var fsMBtn,fsPBtn;
  function setFsSize(v){v=Math.max(14,Math.min(50,Math.round(v)));S.mushafFontSize=v;fsVal.textContent=v+'px';document.documentElement.style.setProperty('--mushaf-size',v+'px');localStorage.setItem('mushafFontSize_'+S.mushafFont,String(v));if(fsMBtn)fsMBtn.disabled=(v<=14);if(fsPBtn)fsPBtn.disabled=(v>=50);}
  var fsCtrl=el('div','setting-stepper');
  fsMBtn=el('button','stepper-btn','-');fsPBtn=el('button','stepper-btn','+');
  on(fsMBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize-1);});
  on(fsPBtn,'click',function(){haptic([6]);setFsSize(S.mushafFontSize+1);});
  fsMBtn.disabled=(S.mushafFontSize<=14);fsPBtn.disabled=(S.mushafFontSize>=50);
  fsCtrl.appendChild(fsMBtn);fsCtrl.appendChild(fsVal);fsCtrl.appendChild(fsPBtn);
  body.appendChild(fsCtrl);

  // Line Height stepper
  body.appendChild(el('div','ms-section-label','قەراغا ریزان'));
  var lhVal=el('span','stepper-val',S.mushafLineH.toFixed(1)+'×');
  var lhCtrl=el('div','setting-stepper');
  var lhMBtn=el('button','stepper-btn','-');var lhPBtn=el('button','stepper-btn','+');
  (function(){
    var min=1.8,max=3.5,step=0.1;
    function updLh(v){v=Math.round(v*10)/10;if(v<min)v=min;if(v>max)v=max;S.mushafLineH=v;lhVal.textContent=v.toFixed(1)+'×';document.documentElement.style.setProperty('--mushaf-lh',String(v));localStorage.setItem('mushafLineH',String(v));lhMBtn.disabled=(v<=min);lhPBtn.disabled=(v>=max);}
    on(lhMBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH-step).toFixed(1)));});
    on(lhPBtn,'click',function(){haptic([6]);updLh(parseFloat((S.mushafLineH+step).toFixed(1)));});
    lhMBtn.disabled=(S.mushafLineH<=min);lhPBtn.disabled=(S.mushafLineH>=max);
  })();
  lhCtrl.appendChild(lhMBtn);lhCtrl.appendChild(lhVal);lhCtrl.appendChild(lhPBtn);
  body.appendChild(lhCtrl);

  // Font Style segmented
  body.appendChild(el('div','ms-section-label','ستایلی فونت'));
  var fonts=[{id:'qcf1',label:'مەدینی کلاسیک'},{id:'qcf2',label:'مەدینی نوێ'}];
  var seg=el('div','ms-seg');
  fonts.forEach(function(f){
    var btn=el('button','ms-seg-btn'+(S.mushafFont===f.id?' on':''),f.label);
    on(btn,'click',function(){
      if(S.mushafFont===f.id)return;
      localStorage.setItem('mushafFontSize_'+S.mushafFont,String(S.mushafFontSize));
      S.mushafFont=f.id;
      localStorage.setItem('mushafFont',f.id);
      var newSize=parseInt(localStorage.getItem('mushafFontSize_'+f.id))||(f.id==='qcf1'?22:20);
      S.mushafFontSize=newSize;
      document.documentElement.style.setProperty('--mushaf-size',newSize+'px');
      setFsSize(newSize);
      seg.querySelectorAll('.ms-seg-btn').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');
      dismiss();
      setTimeout(function(){
        var mv=$('mushafView');if(mv)clear(mv);
        renderMushafView();
      },280);
    });
    seg.appendChild(btn);
  });
  body.appendChild(seg);

  pane.appendChild(body);ov.appendChild(pane);
  on(ov,'click',function(e){if(e.target===ov)dismiss();});
  document.body.appendChild(ov);
  requestAnimationFrame(function(){pane.classList.add('on');});
};

/* ===== MUSHAF TAFSIR SHEET ===== */
App.showMushafVerseTafsir=function(vn,sn){
  var existing=$('mushafTafsirSheet');
  if(existing)existing.parentNode.removeChild(existing);

  // Get tafsir text — use renderedTafsirs if same surah, else skip
  var tafsirs=(sn===S.surah)?(S.renderedTafsirs||{}):{};
  var txt=tafsirs[vn]||tafsirs[String(vn)]||'';

  var ov=el('div','mushaf-tafsir-ov');
  ov.id='mushafTafsirSheet';
  var pane=el('div','mushaf-tafsir-pane');

  function dismiss(){
    pane.classList.remove('on');
    setTimeout(function(){if(ov.parentNode)ov.parentNode.removeChild(ov);},260);
  }

  // Header: surah name + verse number + play + close
  var hdr=el('div','mushaf-tafsir-hdr');
  var s=SURAHS[(sn||S.surah||1)-1];
  var titleParts=(s?s.n:'')+' — '+toArabicNum(vn);
  hdr.appendChild(el('span','mushaf-tafsir-title',titleParts));
  var closeBtn=el('button','mushaf-tafsir-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',dismiss);
  hdr.appendChild(closeBtn);
  pane.appendChild(hdr);

  // Body: tafsir text
  var body=el('div','mushaf-tafsir-body');
  var txtDiv=el('div',txt?'mushaf-tafsir-txt':'mushaf-tafsir-empty');
  txtDiv.textContent=txt||(t('reader.tafsir_empty')||'تفسیر بردەست نیە');
  body.appendChild(txtDiv);
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
function buildCopyText(surah,ayahNum,mode){
  var raw=S.renderedAyahs[ayahNum-1];
  var arabic=raw?(raw.text||raw):'';
  var tafsir=S.renderedTafsirs[ayahNum]||'';
  var lines=[];
  if((mode==='both'||mode==='quran')&&arabic)lines.push(String(ayahNum)+' ﴿ '+arabic+' ﴾');
  if((mode==='both'||mode==='tafsir')&&tafsir)lines.push(tafsir);
  return lines.join('\n');
}
var COPY_FOOTER='\n\nTafsirKurd\nhttps://tafsirkurd.com';
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

  // Reciter section
  body.appendChild(el('div','audio-settings-title',t('audio.reciter')));
  var recList=el('div','reciter-list');
  RECITERS.forEach(function(r){
    var item=el('div','reciter-item'+(r.id===RECITER?' on':''));
    item.appendChild(el('div','reciter-name',r.name));
    on(item,'click',function(){
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      renderAudioSettings();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      else if(S.surah)prefetchAyahBlob(S.surah,(S.audio.ayah||1)-1);
      else showAudioBar();
      toast(r.name);
    });
    recList.appendChild(item);
  });
  body.appendChild(recList);

  // Speed section
  body.appendChild(el('div','audio-settings-title',t('audio.speed')));
  var speeds=el('div','speed-options');
  [0.5,0.75,1,1.25,1.5,2].forEach(function(sp){
    var btn=el('button','speed-btn'+(S.audio.speed===sp?' on':''),sp+'x');
    on(btn,'click',function(){
      S.audio.speed=sp;
      S.audio.el.playbackRate=sp;
      localStorage.setItem('app_speed',String(sp));
      renderAudioSettings();
    });
    speeds.appendChild(btn);
  });
  body.appendChild(speeds);

}

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

function rmPlaySequence(verses){
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
        var onEnd=function(){
          aud.removeEventListener('ended',onEnd);
          if(vr<S.rm.verseRepeat){
            setTimeout(repeatV,S.rm.delay*1000);
          }else{
            vi++;
            setTimeout(playVerse,S.rm.delay*1000);
          }
        };
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
  $('repeatStatus').classList.remove('on');
  toast(t('toast.repeat_stopped'));
};

/* ===== BOOKMARKS ===== */
function getBookmarks(){
  try{return JSON.parse(localStorage.getItem('app_bookmarks')||'[]')}catch(e){return[]}
}
function saveBookmarks(bms){
  localStorage.setItem('app_bookmarks',JSON.stringify(bms));
  debouncedSync();
}
function toggleBookmark(surah,ayah){
  var bms=getBookmarks();
  var idx=bms.findIndex(function(b){return b.surah===surah&&b.ayah===ayah});
  if(idx!==-1){bms.splice(idx,1);haptic([8]);toast(t('toast.bookmark_removed'))}
  else{
    bms.push({surah:surah,ayah:ayah,date:Date.now(),note:''});
    haptic([20]);toast(t('toast.bookmark_added'));
  }
  saveBookmarks(bms);
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
  if(!getGoal()||!surah)return;
  if(!S.todayVerses)S.todayVerses=new Set();
  var key=surah+':'+ayah;
  if(S.todayVerses.has(key))return;
  S.todayVerses.add(key);
  // Save today's verse set
  var today=dateKey(new Date());
  try{
    localStorage.setItem('readAyahsToday',JSON.stringify({date:today,ayahs:Array.from(S.todayVerses)}));
  }catch(e){}
  // Increment readLog
  var l=getReadLog();
  l[today]=(l[today]||0)+1;
  saveReadLog(l);
  // Haptic on goal completion
  var g=getGoal();
  if(g&&l[today]===g.pages){haptic([50]);}
}

function calcBestStreak(log){
  var keys=Object.keys(log).sort();
  if(!keys.length)return 0;
  var best=1,cur=1;
  for(var i=1;i<keys.length;i++){
    var prev=new Date(keys[i-1]);var curr=new Date(keys[i]);
    var diff=(curr-prev)/(86400000);
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
  ring.appendChild(el('div','streak-lbl',streakLabel));
  // Milestone sub-message
  if(streak>=100){
    ring.appendChild(el('div','streak-milestone',t('goals.streak.100_days')));
  }else if(streak>=30){
    ring.appendChild(el('div','streak-milestone',t('goals.streak.month')));
  }else if(streak>=7){
    ring.appendChild(el('div','streak-milestone',t('goals.streak.week')));
  }
  hero.appendChild(ring);
  // Animate streak number count-up and ring fill
  var ringOffset=circumference-Math.round(circumference*(Math.min(pct,100)/100));
  setTimeout(function(){
    circleFill.setAttribute('stroke-dashoffset',String(ringOffset));
    var duration=400;var startT=performance.now();var targetNum=streak;
    if(targetNum===0){numEl.textContent='0';return}
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
    var dot=el('div','week-dot');
    dot.style.animationDelay=(d*30)+'ms';
    if(d===6){
      dot.classList.add('today');
      if(pct>=100){
        dot.classList.add('done');
      }else if(pct>0){
        dot.style.background='conic-gradient(var(--accent) 0% '+pct+'%, transparent '+pct+'% 100%)';
        dot.style.color='var(--text)';
        dot.style.borderColor='var(--accent)';
      }
    }else{
      if(log[dkey])dot.classList.add('done');
    }
    dot.textContent=dayNames[(dt.getDay()+1)%7];
    week.appendChild(dot);
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
  var d=new Date();
  for(var i=0;i<365;i++){
    var k=dateKey(d);
    if(log[k])streak++;
    else if(i>0)break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

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
App.confirmDeleteGoal=function(){
  localStorage.removeItem('readingGoal');
  localStorage.removeItem('readLog');
  localStorage.removeItem('readAyahsToday');
  localStorage.removeItem('bestStreak');
  // Clear all surah progress so it starts fresh
  for(var i=1;i<=114;i++){localStorage.removeItem('surah_progress_'+i)}
  S.todayVerses=new Set();
  $('goalConfirmOverlay').classList.remove('on');
  toast(t('toast.goal_deleted'));
  haptic([50]);
  renderGoals();
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
    // Save goal and show confirmation
    var preset=PRESETS[S.wizardData.preset];
    var goal;
    if(preset){
      goal={name:preset.name(),pages:preset.pages,created:Date.now()};
    } else {
      var v=parseInt(S.wizardData.customPages)||5;
      goal={name:t('wizard.custom_name'),pages:v,created:Date.now()};
    }
    saveGoal(goal);
    S.wizardStep=2;
    renderWizardStep();
    haptic([50]);
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

/* ===== SETTINGS ===== */
function mkToggleRow(labelText,isOn,onToggle,subText){
  var row=el('div','setting-row');
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
function mkBtnRow(labelText,btnLabel,btnIcon,onClick,danger){
  var row=el('div','setting-row');
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
  var row=el('div','setting-row setting-row--stepper');
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

function renderSettings(){
  var content=$('settingsContent');
  clear(content);

  // ── Profile ──────────────────────────────────
  var profile=el('div','profile-card');
  if(S.user){
    var avatarEl;
    if(S.user.avatar){
      avatarEl=document.createElement('img');
      avatarEl.className='profile-avatar profile-avatar-img';
      avatarEl.src=S.user.avatar;avatarEl.alt='';
      avatarEl.referrerPolicy='no-referrer';avatarEl.crossOrigin='anonymous';
    }else{
      avatarEl=el('div','profile-avatar');
      avatarEl.appendChild(icon('fas fa-user'));
      avatarEl.style.cssText='display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:var(--text3)';
    }
    profile.appendChild(avatarEl);
    var pInfo=el('div','profile-info');
    pInfo.appendChild(el('div','profile-name',S.user.name));
    pInfo.appendChild(el('div','profile-email',S.user.email));
    var syncBadge=el('div','profile-sync');
    syncBadge.appendChild(icon('fas fa-cloud'));
    syncBadge.appendChild(document.createTextNode(' '+t('profile.synced')));
    pInfo.appendChild(syncBadge);
    profile.appendChild(pInfo);
    var chevron=icon('fas fa-chevron-left');
    chevron.style.cssText='color:var(--text3);font-size:.8rem;flex-shrink:0';
    profile.appendChild(chevron);
    profile.style.cursor='pointer';
    on(profile,'click',function(){App.openProfile()});
  }else{
    var avatarEl2=el('div','profile-avatar');
    avatarEl2.appendChild(icon('fas fa-user'));
    avatarEl2.style.cssText='display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:var(--text3)';
    profile.appendChild(avatarEl2);
    var pInfo2=el('div','profile-info');
    pInfo2.appendChild(el('div','profile-name',t('profile.guest')));
    pInfo2.appendChild(el('div','profile-email',t('profile.login_prompt')));
    profile.appendChild(pInfo2);
    var loginBtn=el('button','profile-login-btn',t('profile.login'));
    on(loginBtn,'click',function(){App.openLogin()});
    profile.appendChild(loginBtn);
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
    {id:'light', name:'ڕووناک',    sub:'Light',   bg:'#fafafa', surface:'#ffffff', accent:'#000000'},
    {id:'dark',  name:'تاریکی',    sub:'Dark',    bg:'#0a0a0a', surface:'#161616', accent:'#ffffff'},
    {id:'sakina',name:'سکینە',     sub:'Emerald', bg:'#0c1c12', surface:'#112318', accent:'#c9a84c'},
    {id:'noor',  name:'نوور',      sub:'Parchment',bg:'#f4e8cc',surface:'#fdf4e3', accent:'#1a5c3a'}
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
    on(card,'click',function(){S.theme=th.id;applyTheme();haptic([10]);renderSettings()});
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
  var recRow=el('div','setting-row setting-row--reciter');
  var recList=el('div','qs-reciter-list');
  recList.style.cssText='padding:4px 0 0;margin:0;';
  RECITERS.forEach(function(r){
    var chip=el('div','qs-reciter-chip'+(RECITER===r.id?' on':''),r.name);
    on(chip,'click',function(){
      RECITER=r.id;
      localStorage.setItem('app_reciter',r.id);
      clearPrefetch();
      if(S.audio.playing)playAyah(S.audio.surah,S.audio.ayah);
      renderSettings();
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
  // (9) Daily reminder
  var remRow=el('div','setting-row');
  var remLeft=el('div','setting-label-wrap');
  remLeft.appendChild(el('div','setting-label',t('settings.reminder')));
  remLeft.appendChild(el('div','setting-sub',t('settings.reminder_sub')));
  remRow.appendChild(remLeft);
  var remRight=el('div','reminder-right');
  if(S.dailyReminder){
    var timeInp=document.createElement('input');
    timeInp.type='time';timeInp.className='reminder-time-input';
    timeInp.value=S.reminderTime;
    on(timeInp,'change',function(){
      S.reminderTime=timeInp.value;
      localStorage.setItem('reminderTime',S.reminderTime);
      scheduleReminder(true,S.reminderTime);
    });
    remRight.appendChild(timeInp);
  }
  var remToggle=el('div','toggle'+(S.dailyReminder?' on':''));
  remToggle.appendChild(el('div','toggle-knob'));
  on(remToggle,'click',function(){
    S.dailyReminder=!S.dailyReminder;
    localStorage.setItem('dailyReminder',String(S.dailyReminder));
    scheduleReminder(S.dailyReminder,S.reminderTime);
    renderSettings();
  });
  remRight.appendChild(remToggle);
  remRow.appendChild(remRight);
  g3.appendChild(remRow);
  content.appendChild(g3);

  // ── Data & Sync ──────────────────────────────
  var g4=el('div','settings-group');
  g4.appendChild(el('div','settings-group-title',t('settings.data')));
  // (6) Sync status
  if(S.user){
    var syncRow=el('div','setting-row');
    var syncLeft=el('div','setting-label-wrap');
    syncLeft.appendChild(el('div','setting-label',t('settings.sync_label')));
    var syncTs=S.lastSyncTime?new Date(S.lastSyncTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):t('settings.sync_never');
    syncLeft.appendChild(el('div','setting-sub',t('settings.sync_last')+' '+syncTs));
    syncRow.appendChild(syncLeft);
    var syncBtn=el('button','hdr-text-btn');
    syncBtn.appendChild(icon('fas fa-cloud-arrow-up'));
    syncBtn.appendChild(document.createTextNode(' '+t('settings.sync_btn')));
    on(syncBtn,'click',function(){
      syncToCloud();
      toast(t('toast.sync_started'));
    });
    syncRow.appendChild(syncBtn);
    g4.appendChild(syncRow);
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
    localStorage.removeItem('readLog');
    localStorage.removeItem('readAyahsToday');
    localStorage.removeItem('bestStreak');
    for(var i=1;i<=114;i++){
      localStorage.removeItem('surah_progress_'+i);
      localStorage.removeItem('surah_scroll_'+i);
    }
    S.todayVerses=new Set();
    toast(t('toast.progress_reset'));
    renderSettings();
  },true));
  // Clear cache
  g4.appendChild(mkBtnRow(t('settings.clear_cache'),t('settings.clear_btn'),'fas fa-trash',function(){
    if(confirm(t('settings.clear_confirm'))){
      localStorage.removeItem('quran_data_cache');
      localStorage.removeItem('tafsir_data_cache');
      S.quranData=null;S.tafsirData=null;
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
  // (5) Rate app
  g5.appendChild(mkBtnRow(t('settings.rate_app'),t('settings.rate_btn'),'fas fa-star',function(){
    var playUrl='market://details?id=com.tafsirkurd.app';
    var webUrl='https://play.google.com/store/apps/details?id=com.tafsirkurd.app';
    try{window.location.href=playUrl}catch(e){window.open(webUrl,'_blank')}
    setTimeout(function(){window.open(webUrl,'_blank')},500);
  }));
  content.appendChild(g5);

  // ── About ────────────────────────────────────
  var about=el('div','about-section');
  var aboutLogo=document.createElement('img');
  aboutLogo.src='/assets/images/logo.png';aboutLogo.alt='';
  about.appendChild(aboutLogo);
  about.appendChild(el('div','about-name','Tafsir Kurd'));
  about.appendChild(el('div','about-ver','v2.0.0'));
  about.appendChild(el('div','about-desc',t('settings.about_desc')));
  content.appendChild(about);
}

/* ===== SUPABASE AUTH & CLOUD SYNC ===== */
var SUPA_CONFIG_URL='https://tafsirkurd.com/config';

function initSupabase(cb){
  if(S.supabase){if(cb)cb();return}
  if(!window.supabase){console.warn('Supabase JS library not loaded');if(cb)cb();return}

  // Use cached config immediately (enables offline auth session recovery)
  var cachedCfg=null;
  try{cachedCfg=JSON.parse(localStorage.getItem('supa_cfg'))}catch(e){}
  if(cachedCfg&&cachedCfg.supabaseUrl&&cachedCfg.supabaseKey){
    S.supabase=window.supabase.createClient(cachedCfg.supabaseUrl,cachedCfg.supabaseKey);
    checkAuthSession();
    if(cb)cb();
  }

  // Update config from network in background
  fetch(SUPA_CONFIG_URL).then(function(r){
    if(!r.ok)throw new Error('Config HTTP '+r.status);
    return r.json();
  }).then(function(cfg){
    if(cfg.supabaseUrl&&cfg.supabaseKey){
      try{localStorage.setItem('supa_cfg',JSON.stringify(cfg))}catch(e){}
      if(!S.supabase){
        S.supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
        checkAuthSession();
        if(cb)cb();
      }
    }
  }).catch(function(e){
    console.warn('Supabase config fetch failed (offline?)');
    if(!S.supabase&&cb)cb();
  });
}

function checkAuthSession(){
  if(!S.supabase)return;
  S.supabase.auth.getSession().then(function(resp){
    var session=resp.data.session;
    if(session){
      setUserFromSession(session);
      _renderHash.settings=null; // auth changed — force settings re-render
      startCloudSync();
      if(S.tab==='settings')renderSettings();
    }
  }).catch(function(e){console.error('Auth session check error:',e)});

  S.supabase.auth.onAuthStateChange(function(event,session){
    // Auth state changed (session details not logged for security)
    if(event==='SIGNED_IN'&&session){
      setUserFromSession(session);
      _renderHash.settings=null;
      startCloudSync();
      if(S.tab==='settings')renderSettings();
    }else if(event==='SIGNED_OUT'){
      S.user=null;
      _renderHash.settings=null;
      stopCloudSync();
      if(S.tab==='settings')renderSettings();
    }
  });
}

function setUserFromSession(session){
  var u=session.user;
  var meta=u.user_metadata||{};
  S.user={
    id:u.id,
    email:u.email,
    name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:'User'),
    avatar:meta.avatar_url||null
  };
}

/* --- Cloud Sync --- */
/* ===== PRODUCTION SYNC SYSTEM ===== */
// Field categories:
//   ADDITIVE  — always union across devices (never lose data)
//   LWW       — last-write-wins (settings, scroll positions)
//   FURTHEST  — take whichever position is further in the Quran (lastRead)

var SYNC_SIMPLE_KEYS=[
  'lastRead','readingGoal','readLog','readAyahsToday',
  'app_bookmarks','iv_watch_progress',
  'showTafsir','bgAudio','theme','keepAwake',
  'app_arSize','app_tfSize','app_lineH',
  'app_reciter','app_speed','app_repeat','app_repeatCount',
  'autoAdvance','scrollFollowsAudio','hapticFeedback',
  'dailyReminder','reminderTime'
];

// ── Merge helpers ─────────────────────────────────────────────────────────────

// Bookmarks: union by (surah:ayah), newest note wins on conflict
function _mergeBookmarks(aStr,bStr){
  try{
    var a=JSON.parse(aStr||'[]');var b=JSON.parse(bStr||'[]');
    if(!Array.isArray(a))a=[];if(!Array.isArray(b))b=[];
    var map={};
    a.concat(b).forEach(function(bm){
      var id=bm.surah+':'+bm.ayah;
      if(!map[id]||(bm.ts||0)>(map[id].ts||0))map[id]=bm;
    });
    return JSON.stringify(Object.values(map));
  }catch(e){return aStr||bStr||'[]'}
}

// readLog: per-date max (keep highest ayah count for each day)
function _mergeReadLog(aStr,bStr){
  try{
    var a=JSON.parse(aStr||'{}');var b=JSON.parse(bStr||'{}');
    var r=Object.assign({},a);
    Object.keys(b).forEach(function(d){r[d]=Math.max(r[d]||0,b[d]||0)});
    return JSON.stringify(r);
  }catch(e){return aStr||bStr||'{}'}
}

// surah_progress: union of ayah numbers read
function _mergeProgress(aStr,bStr){
  try{
    var a=JSON.parse(aStr||'[]');var b=JSON.parse(bStr||'[]');
    if(!Array.isArray(a))a=[];if(!Array.isArray(b))b=[];
    var set={};
    a.concat(b).forEach(function(n){set[n]=true});
    return JSON.stringify(Object.keys(set).map(Number).sort(function(x,y){return x-y}));
  }catch(e){return aStr||bStr||'[]'}
}

// Master merge — called on both login-load and realtime push
function mergeSyncData(local,cloud){
  if(!local)return cloud;
  if(!cloud)return local;
  var lTime=new Date(local._syncTime||0).getTime();
  var cTime=new Date(cloud._syncTime||0).getTime();
  // Start with the newer set as LWW base for settings
  var base=cTime>=lTime?cloud:local;
  var result=Object.assign({},base);

  // ADDITIVE: bookmarks — always union
  result.app_bookmarks=_mergeBookmarks(local.app_bookmarks,cloud.app_bookmarks);

  // ADDITIVE: reading log — per-day max
  result.readLog=_mergeReadLog(local.readLog,cloud.readLog);

  // ADDITIVE: surah progress — union of read ayahs
  for(var i=1;i<=114;i++){
    var pk='surah_progress_'+i;
    if(local[pk]||cloud[pk])result[pk]=_mergeProgress(local[pk],cloud[pk]);
  }

  // FURTHEST: last read position — take whichever is deeper in the Quran
  try{
    var lLR=JSON.parse(local.lastRead||'{}');
    var cLR=JSON.parse(cloud.lastRead||'{}');
    var lPos=(lLR.surah||0)*300+(lLR.ayah||0);
    var cPos=(cLR.surah||0)*300+(cLR.ayah||0);
    result.lastRead=lPos>=cPos?local.lastRead:cloud.lastRead;
  }catch(e){}

  result._syncTime=new Date().toISOString();
  return result;
}

// ── Gather / Apply ────────────────────────────────────────────────────────────

function gatherSyncData(){
  var data={};
  SYNC_SIMPLE_KEYS.forEach(function(k){
    var v=localStorage.getItem(k);
    if(v!==null)data[k]=v;
  });
  for(var i=1;i<=114;i++){
    var pk='surah_progress_'+i;var sk='surah_scroll_'+i;
    var pv=localStorage.getItem(pk);var sv=localStorage.getItem(sk);
    if(pv!==null)data[pk]=pv;
    if(sv!==null)data[sk]=sv;
  }
  // _syncTime set by caller so reads never pollute the timestamp
  return data;
}

function applySyncData(data){
  if(!data)return;
  Object.keys(data).forEach(function(k){
    if(k==='_syncTime')return;
    localStorage.setItem(k,data[k]);
  });
  S.theme=localStorage.getItem('theme')||'light';
  S.arSize=parseFloat(localStorage.getItem('app_arSize'))||2.0;
  S.tfSize=parseFloat(localStorage.getItem('app_tfSize'))||1.0;
  S.lineH=parseFloat(localStorage.getItem('app_lineH'))||2.2;
  S.showTafsir=localStorage.getItem('showTafsir')!=='false';
  S.bgAudio=localStorage.getItem('bgAudio')==='true';
  S.keepAwake=localStorage.getItem('keepAwake')==='true';
  S.autoAdvance=localStorage.getItem('autoAdvance')==='true';
  S.scrollFollowsAudio=localStorage.getItem('scrollFollowsAudio')!=='false';
  S.hapticFeedback=localStorage.getItem('hapticFeedback')!=='false';
  S.dailyReminder=localStorage.getItem('dailyReminder')==='true';
  S.reminderTime=localStorage.getItem('reminderTime')||'08:00';
  applyTheme();applySizes();
}

function renderCurrentTab(){
  renderContinue();
  if(S.tab==='settings')renderSettings();
  if(S.tab==='bookmarks')renderBookmarks();
  if(S.tab==='goals')renderGoals();
  if(S.tab==='prayer'&&window.PrayerUI)PrayerUI.render();
}

// ── Sync to cloud ─────────────────────────────────────────────────────────────

var _syncRetryDelay=2000;
var _syncRetryTimer=null;

function syncToCloud(){
  if(!S.supabase||!S.user||S.isSyncing)return;
  var now=Date.now();
  if(now-S.lastSyncTime<5000)return;
  S.isSyncing=true;
  var payload=gatherSyncData();
  payload._syncTime=new Date().toISOString();
  S.supabase.from('user_data').upsert({
    user_id:S.user.id,
    app_data:payload,
    updated_at:new Date().toISOString()
  },{onConflict:'user_id',ignoreDuplicates:false}).then(function(resp){
    if(resp.error){
      console.error('Sync error:',resp.error);
      _schedSyncRetry(); // retry with backoff
    }else{
      S.lastSyncTime=Date.now();
      localStorage.setItem('_lastSyncTime',payload._syncTime);
      _syncRetryDelay=2000; // reset backoff on success
    }
  }).catch(function(e){
    console.error('Sync failed:',e);
    _schedSyncRetry();
  }).finally(function(){S.isSyncing=false});
}

function _schedSyncRetry(){
  if(!S.user)return;
  clearTimeout(_syncRetryTimer);
  _syncRetryTimer=setTimeout(function(){
    _syncRetryDelay=Math.min(_syncRetryDelay*2,60000); // cap at 60s
    syncToCloud();
  },_syncRetryDelay);
}

// ── Load from cloud ───────────────────────────────────────────────────────────

function loadFromCloud(cb){
  if(!S.supabase||!S.user){if(cb)cb();return}
  S.supabase.from('user_data').select('app_data,updated_at').eq('user_id',S.user.id).single()
  .then(function(resp){
    if(resp.error){
      if(resp.error.code==='PGRST116'){
        syncToCloud(); // first login — upload local data
      }else{console.error('Load cloud error:',resp.error)}
      if(cb)cb();return;
    }
    if(resp.data&&resp.data.app_data){
      var localData=gatherSyncData();
      localData._syncTime=localStorage.getItem('_lastSyncTime')||'0';
      var merged=mergeSyncData(localData,resp.data.app_data);
      applySyncData(merged);
      localStorage.setItem('_lastSyncTime',merged._syncTime);
      // Push merged result back if it added anything from local
      setTimeout(syncToCloud,500);
      renderCurrentTab();
    }
    if(cb)cb();
  }).catch(function(e){console.error('Load cloud failed:',e);if(cb)cb()});
}

// ── Realtime (instant cross-device push) ─────────────────────────────────────

function subscribeRealtime(){
  if(!S.supabase||!S.user||S.realtimeChannel)return;
  S.realtimeChannel=S.supabase
    .channel('user-data-'+S.user.id)
    .on('postgres_changes',{
      event:'UPDATE',schema:'public',table:'user_data',
      filter:'user_id=eq.'+S.user.id
    },function(payload){
      if(S.isSyncing)return; // ignore echo of our own push
      if(!payload.new||!payload.new.app_data)return;
      var localData=gatherSyncData();
      localData._syncTime=localStorage.getItem('_lastSyncTime')||'0';
      var merged=mergeSyncData(localData,payload.new.app_data);
      applySyncData(merged);
      localStorage.setItem('_lastSyncTime',merged._syncTime);
      renderCurrentTab();
      toast(t('toast.synced_live'));
    })
    .subscribe();
}

function unsubscribeRealtime(){
  if(S.realtimeChannel){
    try{S.supabase.removeChannel(S.realtimeChannel)}catch(e){}
    S.realtimeChannel=null;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

function startCloudSync(){
  stopCloudSync();
  loadFromCloud(function(){
    S.syncInterval=setInterval(syncToCloud,30000);
    subscribeRealtime();
  });
  document.addEventListener('visibilitychange',syncOnHide);
}

function stopCloudSync(){
  if(S.syncInterval){clearInterval(S.syncInterval);S.syncInterval=null}
  document.removeEventListener('visibilitychange',syncOnHide);
  unsubscribeRealtime();
}

function syncOnHide(){if(document.hidden&&S.user)syncToCloud()}

function debouncedSync(){
  if(!S.user)return;
  clearTimeout(S._syncDebounce);
  S._syncDebounce=setTimeout(syncToCloud,2000);
}

// Re-sync immediately when network comes back after being offline
window.addEventListener('online',function(){
  if(S.user){_syncRetryDelay=2000;syncToCloud();}
});

/* --- Auth Panel --- */
App.openLogin=function(){
  var panel=$('authPanel');
  clear(panel);

  // Header
  var hdr=el('div','auth-hdr');
  var closeBtn=el('button','close-btn');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',function(){App.closeLogin()});
  hdr.appendChild(closeBtn);
  hdr.appendChild(el('div','auth-title',t('auth.login')));
  panel.appendChild(hdr);

  // Body scroll container
  var body=el('div','auth-body');

  // Message area
  var msg=el('div','auth-message');
  msg.id='authMsg';
  body.appendChild(msg);

  // Tabs
  var tabs=el('div','auth-tabs');
  var tabSignin=el('div','auth-tab on',t('auth.login'));
  var tabSignup=el('div','auth-tab',t('auth.signup'));
  tabs.appendChild(tabSignin);
  tabs.appendChild(tabSignup);
  body.appendChild(tabs);

  // Forms container
  var forms=el('div','auth-forms');
  forms.id='authForms';
  body.appendChild(forms);

  panel.appendChild(body);
  panel.classList.add('on');

  var mode='signin';

  function showMsg(text,type){
    msg.textContent=text;
    msg.className='auth-message '+type;
  }
  function clearMsg(){msg.className='auth-message';msg.textContent=''}

  function buildSigninForm(){
    clear(forms);
    var f=el('div','auth-form');

    var emailGrp=el('div','auth-form-group');
    var emailInput=document.createElement('input');
    emailInput.className='auth-form-input';emailInput.type='email';emailInput.placeholder=t('auth.email');emailInput.dir='ltr';
    emailGrp.appendChild(emailInput);
    f.appendChild(emailGrp);

    var passGrp=el('div','auth-form-group');
    var passInput=document.createElement('input');
    passInput.className='auth-form-input';passInput.type='password';passInput.placeholder=t('auth.password');passInput.dir='ltr';
    passGrp.appendChild(passInput);
    f.appendChild(passGrp);

    var submitBtn=el('button','auth-submit-btn',t('auth.login'));
    on(submitBtn,'click',function(){
      var email=emailInput.value.trim();
      var pass=passInput.value;
      if(!email||!pass){showMsg(t('auth.fill_all'),'error');return}
      clearMsg();
      submitBtn.disabled=true;submitBtn.textContent='...';
      S.supabase.auth.signInWithPassword({email:email,password:pass}).then(function(resp){
        if(resp.error){showMsg(resp.error.message,'error');submitBtn.disabled=false;submitBtn.textContent=t('auth.login');return}
        var session=resp.data.session;
        if(!session){
          // Session might be null if email not confirmed; try getSession
          S.supabase.auth.getSession().then(function(r2){
            if(r2.data&&r2.data.session){
              checkProfileComplete(r2.data.session);
            }else{
              showMsg(t('auth.verify_email'),'info');
              submitBtn.disabled=false;submitBtn.textContent=t('auth.login');
            }
          });
          return;
        }
        checkProfileComplete(session);
      }).catch(function(e){showMsg(e.message||t('error.generic'),'error');submitBtn.disabled=false;submitBtn.textContent=t('auth.login')});
    });
    f.appendChild(submitBtn);

    // Google button
    var divider=el('div','auth-divider');
    divider.appendChild(el('span','',t('auth.or')));
    f.appendChild(divider);

    var googleBtn=el('button','auth-google-btn');
    googleBtn.appendChild(el('span','',t('auth.google_login')));
    on(googleBtn,'click',function(){signInWithGoogle()});
    f.appendChild(googleBtn);

    forms.appendChild(f);
  }

  function buildSignupForm(){
    clear(forms);
    var f=el('div','auth-form');

    var nameGrp=el('div','auth-form-group');
    var nameInput=document.createElement('input');
    nameInput.className='auth-form-input';nameInput.type='text';nameInput.placeholder=t('auth.name');
    nameGrp.appendChild(nameInput);
    f.appendChild(nameGrp);

    var emailGrp=el('div','auth-form-group');
    var emailInput=document.createElement('input');
    emailInput.className='auth-form-input';emailInput.type='email';emailInput.placeholder=t('auth.email');emailInput.dir='ltr';
    emailGrp.appendChild(emailInput);
    f.appendChild(emailGrp);

    var passGrp=el('div','auth-form-group');
    var passInput=document.createElement('input');
    passInput.className='auth-form-input';passInput.type='password';passInput.placeholder=t('auth.password');passInput.dir='ltr';
    passGrp.appendChild(passInput);
    f.appendChild(passGrp);

    var submitBtn=el('button','auth-submit-btn',t('auth.signup'));
    on(submitBtn,'click',function(){
      var name=nameInput.value.trim();
      var email=emailInput.value.trim();
      var pass=passInput.value;
      if(!name||!email||!pass){showMsg(t('auth.fill_all'),'error');return}
      if(pass.length<6){showMsg(t('auth.pass_min'),'error');return}
      clearMsg();
      submitBtn.disabled=true;submitBtn.textContent='...';
      S.supabase.auth.signUp({
        email:email,password:pass,
        options:{data:{full_name:name,registration_source:'email'}}
      }).then(function(resp){
        if(resp.error){showMsg(resp.error.message,'error');submitBtn.disabled=false;submitBtn.textContent=t('auth.signup');return}
        // Show OTP verification
        buildOtpForm(email);
      }).catch(function(e){showMsg(e.message||t('error.generic'),'error');submitBtn.disabled=false;submitBtn.textContent=t('auth.signup')});
    });
    f.appendChild(submitBtn);

    // Google button
    var divider=el('div','auth-divider');
    divider.appendChild(el('span','',t('auth.or')));
    f.appendChild(divider);

    var googleBtn=el('button','auth-google-btn');
    googleBtn.appendChild(el('span','',t('auth.google_signup')));
    on(googleBtn,'click',function(){signInWithGoogle()});
    f.appendChild(googleBtn);

    forms.appendChild(f);
  }

  function buildOtpForm(email){
    clear(forms);
    var f=el('div','auth-form');

    f.appendChild(el('div','auth-otp-info',t('auth.otp_sent',{email:email})));

    var otpGrp=el('div','auth-form-group');
    var otpInput=document.createElement('input');
    otpInput.className='auth-form-input';otpInput.type='text';otpInput.placeholder=t('auth.otp_placeholder');otpInput.dir='ltr';otpInput.maxLength=6;
    otpGrp.appendChild(otpInput);
    f.appendChild(otpGrp);

    var submitBtn=el('button','auth-submit-btn',t('auth.verify'));
    on(submitBtn,'click',function(){
      var token=otpInput.value.trim();
      if(!token){showMsg(t('auth.enter_code'),'error');return}
      clearMsg();
      submitBtn.disabled=true;submitBtn.textContent='...';
      S.supabase.auth.verifyOtp({email:email,token:token,type:'signup'}).then(function(resp){
        if(resp.error){showMsg(resp.error.message,'error');submitBtn.disabled=false;submitBtn.textContent=t('auth.verify');return}
        // Create profile
        createAppProfile(resp.data.session);
      }).catch(function(e){showMsg(e.message||t('error.generic'),'error');submitBtn.disabled=false;submitBtn.textContent=t('auth.verify')});
    });
    f.appendChild(submitBtn);

    forms.appendChild(f);
  }

  function loginSuccess(session){
    setUserFromSession(session);
    startCloudSync();
    App.closeLogin();
    App.tab('settings');
    renderSettings();
  }

  function createAppProfile(session){
    if(!session)return;
    var u=session.user;
    var meta=u.user_metadata||{};
    S.supabase.from('profiles').upsert({
      id:u.id,
      email:u.email,
      full_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
      display_name:meta.full_name||meta.name||(u.email?u.email.split('@')[0]:''),
      avatar_url:meta.avatar_url||null,
      registration_source:meta.registration_source||(meta.provider==='google'?'google':'email'),
      has_completed_signup:true,
      first_login_at:new Date().toISOString()
    },{onConflict:'id'}).then(function(){
      toast(t('toast.account_created'));
      loginSuccess(session);
    }).catch(function(e){console.error('Profile creation error:',e);loginSuccess(session)});
  }

  function checkProfileComplete(session){
    if(!session){App.closeLogin();return}
    S.supabase.from('profiles').select('has_completed_signup').eq('id',session.user.id).single()
    .then(function(resp){
      if(resp.error&&resp.error.code==='PGRST116'){
        createAppProfile(session);
        return;
      }
      if(resp.data&&!resp.data.has_completed_signup){
        S.supabase.from('profiles').update({has_completed_signup:true}).eq('id',session.user.id).then(function(){});
      }
      toast(t('toast.logged_in'));
      loginSuccess(session);
    }).catch(function(){loginSuccess(session)});
  }

  function signInWithGoogle(){
    if(!S.supabase){showMsg(t('error.system_not_ready'),'error');return}

    var redirectUrl='com.tafsirkurd.app://auth/callback';
    if(!window.Capacitor||!window.Capacitor.isNativePlatform()){
      redirectUrl=window.location.origin+'/app/index.html';
    }

    S.supabase.auth.signInWithOAuth({
      provider:'google',
      options:{
        redirectTo:redirectUrl,
        queryParams:{access_type:'offline',prompt:'consent'},
        skipBrowserRedirect:true
      }
    }).then(function(resp){
      if(resp.error){showMsg(resp.error.message,'error');return}
      if(resp.data&&resp.data.url){
        if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser){
          window.Capacitor.Plugins.Browser.open({url:resp.data.url});
        }else{
          window.location.href=resp.data.url;
        }
      }
    }).catch(function(e){showMsg(e.message||t('error.generic'),'error')});
  }

  on(tabSignin,'click',function(){
    if(mode==='signin')return;
    mode='signin';
    tabSignin.classList.add('on');tabSignup.classList.remove('on');
    clearMsg();buildSigninForm();
  });
  on(tabSignup,'click',function(){
    if(mode==='signup')return;
    mode='signup';
    tabSignup.classList.add('on');tabSignin.classList.remove('on');
    clearMsg();buildSignupForm();
  });

  buildSigninForm();
};

App.closeLogin=function(){
  var panel=$('authPanel');
  if(panel)panel.classList.remove('on');
};

App.logout=function(){
  if(!S.supabase)return;
  if(!confirm(t('profile.confirm_logout')))return;
  S.supabase.auth.signOut().then(function(){
    S.user=null;
    stopCloudSync();
    toast(t('toast.logged_out'));
    renderSettings();
  }).catch(function(e){console.error('Logout error:',e)});
};

App.forceSync=function(){
  if(!S.user){toast(t('profile.login_first'));return}
  syncToCloud();
  toast(t('toast.synced'));
};

/* ===== PROFILE PAGE ===== */
App.openProfile=function(){
  if(!S.user)return;
  var panel=$('profilePanel');
  clear(panel);
  renderProfile(panel);
  panel.classList.add('on');
};

App.closeProfile=function(){
  var panel=$('profilePanel');
  if(panel)panel.classList.remove('on');
};

function renderProfile(panel){
  // Header
  var hdr=el('div','pp-hdr');
  var backBtn=el('button','hdr-btn');
  backBtn.appendChild(icon('fas fa-arrow-right'));
  on(backBtn,'click',function(){App.closeProfile()});
  hdr.appendChild(backBtn);
  hdr.appendChild(el('div','pp-title',t('profile.title')));
  panel.appendChild(hdr);

  var body=el('div','pp-body');

  // Avatar
  var avatarWrap=el('div','pp-avatar-wrap');
  var avatar=el('div','pp-avatar');
  if(S.user.avatar){
    var img=document.createElement('img');
    img.src=S.user.avatar;img.alt='';
    img.referrerPolicy='no-referrer';
    img.crossOrigin='anonymous';
    avatar.appendChild(img);
  }else{
    avatar.appendChild(icon('fas fa-user'));
  }
  avatarWrap.appendChild(avatar);
  body.appendChild(avatarWrap);

  // Name & email display
  body.appendChild(el('div','pp-name-display',S.user.name));
  body.appendChild(el('div','pp-email-display',S.user.email));

  // Message area
  var msg=el('div','pp-msg');
  msg.id='ppMsg';
  body.appendChild(msg);

  function showPPMsg(text,type){msg.textContent=text;msg.className='pp-msg '+type}
  function clearPPMsg(){msg.className='pp-msg';msg.textContent=''}

  // Info section
  body.appendChild(el('div','pp-section-title',t('profile.info')));
  var infoGroup=el('div','');

  // Provider
  var providerRow=el('div','pp-row');
  providerRow.appendChild(el('div','pp-row-label',t('profile.login_method')));
  var provider='Email';
  if(S.user.avatar&&S.user.avatar.indexOf('google')!==-1)provider='Google';
  providerRow.appendChild(el('div','pp-row-value',provider));
  infoGroup.appendChild(providerRow);

  // Member since
  if(S.supabase){
    S.supabase.auth.getUser().then(function(resp){
      if(resp.data&&resp.data.user&&resp.data.user.created_at){
        var d=new Date(resp.data.user.created_at);
        var dateStr=d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
        var sinceRow=el('div','pp-row');
        sinceRow.appendChild(el('div','pp-row-label',t('profile.member_since')));
        sinceRow.appendChild(el('div','pp-row-value',dateStr));
        infoGroup.appendChild(sinceRow);
      }
    });
  }
  body.appendChild(infoGroup);

  // Edit Name section
  body.appendChild(el('div','pp-section-title',t('profile.change_name')));
  var nameGroup=el('div','pp-edit-group');
  var nameInput=document.createElement('input');
  nameInput.type='text';nameInput.className='pp-edit-input';nameInput.value=S.user.name;nameInput.placeholder=t('profile.name_placeholder');
  nameGroup.appendChild(nameInput);
  var nameBtn=el('button','pp-save-btn',t('profile.save'));
  on(nameBtn,'click',function(){
    var newName=nameInput.value.trim();
    if(!newName){showPPMsg(t('profile.name_placeholder'),'error');return}
    nameBtn.disabled=true;
    clearPPMsg();
    S.supabase.auth.updateUser({data:{full_name:newName}}).then(function(resp){
      nameBtn.disabled=false;
      if(resp.error){showPPMsg(resp.error.message,'error');return}
      S.user.name=newName;
      S.supabase.from('profiles').update({full_name:newName,display_name:newName}).eq('id',S.user.id).then(function(){});
      showPPMsg(t('profile.name_changed'),'success');
      // Update display
      var nd=panel.querySelector('.pp-name-display');
      if(nd)nd.textContent=newName;
    }).catch(function(e){nameBtn.disabled=false;showPPMsg(e.message||t('error.generic'),'error')});
  });
  nameGroup.appendChild(nameBtn);
  body.appendChild(nameGroup);

  // Edit Email section
  body.appendChild(el('div','pp-section-title',t('profile.change_email')));
  var emailGroup=el('div','pp-edit-group');
  var emailInput=document.createElement('input');
  emailInput.type='email';emailInput.className='pp-edit-input';emailInput.value=S.user.email;emailInput.placeholder=t('profile.email_placeholder');
  emailGroup.appendChild(emailInput);
  var emailBtn=el('button','pp-save-btn',t('profile.change_email'));
  on(emailBtn,'click',function(){
    var newEmail=emailInput.value.trim();
    if(!newEmail){showPPMsg(t('profile.email_placeholder'),'error');return}
    if(newEmail===S.user.email){showPPMsg(t('profile.new_email'),'error');return}
    emailBtn.disabled=true;
    clearPPMsg();
    S.supabase.auth.updateUser({email:newEmail}).then(function(resp){
      emailBtn.disabled=false;
      if(resp.error){showPPMsg(resp.error.message,'error');return}
      showPPMsg(t('profile.email_sent'),'success');
    }).catch(function(e){emailBtn.disabled=false;showPPMsg(e.message||t('error.generic'),'error')});
  });
  emailGroup.appendChild(emailBtn);
  body.appendChild(emailGroup);

  // Change Password (hide for Google-only users)
  if(provider==='Email'){
    body.appendChild(el('div','pp-section-title',t('profile.change_pass')));
    var passGroup=el('div','pp-edit-group');
    var passInput=document.createElement('input');
    passInput.type='password';passInput.className='pp-edit-input';passInput.placeholder=t('profile.new_pass');
    passGroup.appendChild(passInput);
    var passConfirm=document.createElement('input');
    passConfirm.type='password';passConfirm.className='pp-edit-input';passConfirm.placeholder=t('profile.confirm_pass');
    passConfirm.style.marginTop='8px';
    passGroup.appendChild(passConfirm);
    var passBtn=el('button','pp-save-btn',t('profile.change_pass_btn'));
    on(passBtn,'click',function(){
      var p1=passInput.value,p2=passConfirm.value;
      if(!p1||p1.length<6){showPPMsg(t('profile.pass_min'),'error');return}
      if(p1!==p2){showPPMsg(t('profile.pass_mismatch'),'error');return}
      passBtn.disabled=true;
      clearPPMsg();
      S.supabase.auth.updateUser({password:p1}).then(function(resp){
        passBtn.disabled=false;
        if(resp.error){showPPMsg(resp.error.message,'error');return}
        passInput.value='';passConfirm.value='';
        showPPMsg(t('profile.pass_changed'),'success');
      }).catch(function(e){passBtn.disabled=false;showPPMsg(e.message||t('error.generic'),'error')});
    });
    passGroup.appendChild(passBtn);
    body.appendChild(passGroup);
  }

  // Actions section
  body.appendChild(el('div','pp-section-title',t('profile.actions')));

  // Force sync
  var syncBtn=el('button','pp-action-btn');
  syncBtn.appendChild(icon('fas fa-sync'));
  syncBtn.appendChild(document.createTextNode(' '+t('profile.sync')));
  on(syncBtn,'click',function(){App.forceSync()});
  body.appendChild(syncBtn);

  // Logout
  var logoutBtn=el('button','pp-action-btn');
  logoutBtn.appendChild(icon('fas fa-sign-out-alt'));
  logoutBtn.appendChild(document.createTextNode(' '+t('profile.logout')));
  on(logoutBtn,'click',function(){
    App.logout();
    App.closeProfile();
  });
  body.appendChild(logoutBtn);

  // Delete account
  var deleteBtn=el('button','pp-action-btn danger');
  deleteBtn.appendChild(icon('fas fa-trash'));
  deleteBtn.appendChild(document.createTextNode(' '+t('profile.delete_account')));
  on(deleteBtn,'click',function(){
    if(!confirm(t('profile.confirm_delete1')))return;
    if(!confirm(t('profile.confirm_delete2')))return;
    clearPPMsg();
    // Get current session token, then call server to fully delete the account
    S.supabase.auth.getSession().then(function(resp){
      var accessToken=resp&&resp.data&&resp.data.session&&resp.data.session.access_token;
      if(!accessToken){showPPMsg(t('error.generic'),'error');return}
      return fetch('/delete-account',{
        method:'POST',
        headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'}
      }).then(function(r){return r.json()}).then(function(result){
        if(!result.success)throw new Error(result.error||t('error.delete'));
        return S.supabase.auth.signOut();
      }).then(function(){
        S.user=null;
        stopCloudSync();
        App.closeProfile();
        toast(t('toast.account_deleted'));
        renderSettings();
      });
    }).catch(function(e){showPPMsg(e.message||t('error.delete'),'error')});
  });
  body.appendChild(deleteBtn);

  panel.appendChild(body);
}

/* ===== PULL TO REFRESH ===== */
var ptrSpinner;
function ensurePtrSpinner(){
  if(ptrSpinner)return;
  ptrSpinner=el('div','ptr-spinner');
  ptrSpinner.appendChild(el('div','ptr-arc'));
  document.body.appendChild(ptrSpinner);
}

function ptrMove(y){
  ptrSpinner.style.transform='translate(-50%,'+y+'px)';
}

function setupPullToRefresh(panelId,refreshFn,checkFn){
  var panel=$(panelId);
  if(!panel)return;
  ensurePtrSpinner();

  var startY=0,pulling=false,refreshing=false,threshold=90,maxPull=160,panelOrigTop=0;

  on(panel,'touchstart',function(e){
    if(refreshing)return;
    if(checkFn&&!checkFn())return;
    if(panel.scrollTop<=2){
      startY=e.touches[0].clientY;
      panelOrigTop=panel.getBoundingClientRect().top;
      pulling=true;
      panel.classList.add('ptr-pulling');
      panel.classList.remove('ptr-releasing');
      ptrSpinner.classList.remove('ptr-snapping');
      ptrSpinner.style.transition='none';
    }
  });

  on(panel,'touchmove',function(e){
    if(!pulling||refreshing)return;
    var dy=e.touches[0].clientY-startY;
    if(dy<0){
      pulling=false;
      panel.style.transform='';
      ptrSpinner.style.opacity='0';
      ptrSpinner.style.transform='translate(-50%,-60px) scale(0)';
      panel.classList.remove('ptr-pulling');
      return;
    }
    if(dy>5&&panel.scrollTop<=2){
      e.preventDefault();
      var pull=dy<threshold?dy:threshold+((dy-threshold)*0.3);
      pull=Math.min(pull,maxPull);
      panel.style.transform='translateY('+pull+'px)';
      // Spinner sits centered in the revealed gap
      var gapCenter=panelOrigTop+(pull/2)-19;
      ptrMove(gapCenter);
      ptrSpinner.style.opacity=Math.min(pull/60,1);
      var sc=Math.min(pull/80,1);
      ptrSpinner.style.transform='translate(-50%,'+gapCenter+'px) scale('+sc+')';
      var arc=ptrSpinner.querySelector('.ptr-arc');
      if(arc)arc.style.transform='rotate('+Math.min(dy*3,720)+'deg)';
    }
  });

  on(panel,'touchend',function(e){
    if(!pulling||refreshing)return;
    pulling=false;
    panel.classList.remove('ptr-pulling');
    panel.classList.add('ptr-releasing');
    ptrSpinner.style.transition='';
    ptrSpinner.classList.add('ptr-snapping');
    var currentY=parseFloat(panel.style.transform.replace('translateY(','').replace('px)',''))||0;

    if(currentY>=threshold*0.6){
      // Refresh — hold spinner in place, page slides back to 55px
      refreshing=true;
      panel.style.transform='translateY(55px)';
      var holdCenter=panelOrigTop+(55/2)-19;
      ptrSpinner.style.transform='translate(-50%,'+holdCenter+'px) scale(1)';
      ptrSpinner.style.opacity='1';
      ptrSpinner.classList.add('refreshing');
      haptic([50]);
      refreshFn();
      setTimeout(function(){
        panel.style.transform='';
        ptrSpinner.style.transform='translate(-50%,-60px) scale(0)';
        ptrSpinner.style.opacity='0';
        ptrSpinner.classList.remove('refreshing');
        setTimeout(function(){
          panel.classList.remove('ptr-releasing');
          ptrSpinner.classList.remove('ptr-snapping');
          refreshing=false;
        },300);
      },800);
    }else{
      panel.style.transform='';
      ptrSpinner.style.transform='translate(-50%,-60px) scale(0)';
      ptrSpinner.style.opacity='0';
      setTimeout(function(){
        panel.classList.remove('ptr-releasing');
        ptrSpinner.classList.remove('ptr-snapping');
      },300);
    }
  });
}

/* ===== ISLAMVOICE ===== */
var IV_CONFIG_URL='https://tafsirkurd.com/config';

function initIslamVoice(cb){
  if(S.ivSupabase){if(cb)cb();return}
  if(S.ivInited){
    var checkInterval=setInterval(function(){
      if(S.ivSupabase){clearInterval(checkInterval);if(cb)cb()}
    },200);
    setTimeout(function(){clearInterval(checkInterval)},10000);
    return;
  }
  S.ivInited=true;

  // Reuse shared Supabase client if available
  if(S.supabase){
    S.ivSupabase=S.supabase;
    console.log('IslamVoice using shared Supabase client');
    if(cb)cb();
    return;
  }

  if(!window.supabase){
    console.error('Supabase JS library not loaded');
    S.ivInited=false;
    renderIvError(t('iv.error.supabase'));
    return;
  }

  fetch(IV_CONFIG_URL).then(function(r){
    if(!r.ok)throw new Error('Config HTTP '+r.status);
    return r.json();
  }).then(function(cfg){
    if(cfg.supabaseUrl&&cfg.supabaseKey){
      S.ivSupabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
      if(!S.supabase)S.supabase=S.ivSupabase;
      console.log('IslamVoice Supabase connected');
      if(cb)cb();
    }else{
      throw new Error('Missing supabaseUrl or supabaseKey in config');
    }
  }).catch(function(e){
    console.error('IslamVoice init error:',e);
    S.ivInited=false;
    renderIvError(t('iv.error.server'));
  });
}

function renderIvError(msg){
  $('ivLoading').classList.remove('on');
  var grid=$('ivGrid');
  clear(grid);
  grid.style.display='';
  var err=el('div','iv-empty');
  err.appendChild(icon('fas fa-exclamation-triangle'));
  err.appendChild(el('p','',msg||t('error.occurred')));
  var retryBtn=el('button','iv-refresh');
  retryBtn.appendChild(icon('fas fa-sync-alt'));
  retryBtn.appendChild(document.createTextNode(' '+t('iv.retry')));
  on(retryBtn,'click',function(){
    S.ivInited=false;S.ivSupabase=null;
    loadIslamVoiceData(true);
  });
  err.appendChild(retryBtn);
  grid.appendChild(err);
}

function loadIslamVoiceData(force){
  // Show loading spinner immediately
  if(!S.ivSeries||force){
    renderIvLoading();
  }

  // Load from cache first for instant display
  if(!force){
    try{
      var cs=localStorage.getItem('iv_series_cache');
      var ce=localStorage.getItem('iv_episodes_cache');
      if(cs&&ce){
        S.ivSeries=JSON.parse(cs);
        S.ivEpisodes=JSON.parse(ce);
        renderIvGrid();
      }
    }catch(e){}
  }

  // Fetch fresh from Supabase
  if(!S.ivSupabase){
    initIslamVoice(function(){ivFetchFresh(force)});
    return;
  }
  ivFetchFresh(force);
}

function ivFetchFresh(force){
  if(!S.ivSupabase)return;
  S.ivLoading=true;

  Promise.all([
    S.ivSupabase.from('islamvoice_series').select('*').order('display_order',{ascending:true}),
    S.ivSupabase.from('islamvoice_episodes').select('*').or('is_published.eq.true,is_published.is.null').order('episode_number',{ascending:true})
  ]).then(function(results){
    var seriesRes=results[0];
    var epRes=results[1];
    S.ivLoading=false;

    if(seriesRes.error||epRes.error){
      console.error('IV load error:',seriesRes.error||epRes.error);
      if(!S.ivSeries||!S.ivSeries.length){
        renderIvError(t('iv.error.load'));
      }
      return;
    }

    S.ivSeries=seriesRes.data||[];
    S.ivEpisodes=epRes.data||[];

    // Cache
    try{
      localStorage.setItem('iv_series_cache',JSON.stringify(S.ivSeries));
      localStorage.setItem('iv_episodes_cache',JSON.stringify(S.ivEpisodes));
    }catch(e){console.warn('IV cache save failed')}

    renderIvGrid();
    if(S.ivCurrentSeries)renderIvEpisodes(S.ivCurrentSeries);
  }).catch(function(e){
    S.ivLoading=false;
    console.error('IV fetch error:',e);
    if(!S.ivSeries||!S.ivSeries.length){
      renderIvError(t('iv.error.load_retry'));
    }
  });
}

function renderIslamVoice(){
  if(S.ivSeries&&S.ivSeries.length){
    renderIvGrid();
    // Also refresh in background
    if(!S.ivLoading)loadIslamVoiceData(false);
  }else if(!S.ivLoading){
    loadIslamVoiceData(false);
  }
}

function renderIvLoading(){
  var grid=$('ivGrid');
  clear(grid);
  grid.style.display='none';
  var ld=$('ivLoading');
  clear(ld);
  ld.classList.add('on');
  ld.appendChild(icon('fas fa-spinner'));
  ld.appendChild(el('p','',t('iv.loading')));
}

function renderIvGrid(){
  $('ivLoading').classList.remove('on');
  var grid=$('ivGrid');
  clear(grid);
  grid.style.display='';

  if(!S.ivSeries||!S.ivSeries.length){
    var empty=el('div','iv-empty');
    empty.appendChild(icon('fas fa-video'));
    empty.appendChild(el('p','',t('iv.no_series')));
    var refreshBtn=el('button','iv-refresh');
    refreshBtn.appendChild(icon('fas fa-sync-alt'));
    refreshBtn.appendChild(document.createTextNode(' '+t('iv.refresh')));
    on(refreshBtn,'click',function(){loadIslamVoiceData(true)});
    empty.appendChild(refreshBtn);
    grid.appendChild(empty);
    return;
  }

  // Sort by display_order
  var sorted=S.ivSeries.slice().sort(function(a,b){
    return(a.display_order||999)-(b.display_order||999);
  });

  var q=S.ivSearchQuery||'';

  sorted.forEach(function(series){
    var eps=S.ivEpisodes?S.ivEpisodes.filter(function(ep){return ep.series_id===series.id}):[];
    var epCount=eps.length;
    if(epCount===0)return;

    // Filter by search query
    if(q){
      var seriesMatch=(series.name_ku||series.name||'').toLowerCase().indexOf(q)!==-1
        ||(series.speaker||'').toLowerCase().indexOf(q)!==-1
        ||(series.description_ku||'').toLowerCase().indexOf(q)!==-1;
      var epMatch=eps.some(function(ep){
        return(ep.title_ku||ep.title||'').toLowerCase().indexOf(q)!==-1;
      });
      if(!seriesMatch&&!epMatch)return;
    }

    var card=el('div','iv-card');

    // Thumbnail
    var imgWrap=el('div','iv-card-img');
    if(series.thumbnail_url){
      var img=document.createElement('img');
      img.src=series.thumbnail_url;
      img.alt='';
      img.loading='lazy';
      img.onerror=function(){this.style.display='none'};
      imgWrap.appendChild(img);
    }
    var fallback=el('div','iv-fallback');
    fallback.appendChild(icon('fas fa-play-circle'));
    imgWrap.appendChild(fallback);
    imgWrap.appendChild(el('div','iv-card-badge',epCount+' '+t('iv.episodes')));
    card.appendChild(imgWrap);

    // Body
    var body=el('div','iv-card-body');
    body.appendChild(el('div','iv-card-title',series.name_ku||series.name||''));
    if(series.speaker){
      body.appendChild(el('div','iv-card-speaker',series.speaker));
    }
    card.appendChild(body);

    on(card,'click',function(){App.ivShowSeries(series.id)});
    grid.appendChild(card);
  });

  // No results for search
  if(q&&!grid.children.length){
    var noRes=el('div','iv-empty');
    noRes.appendChild(icon('fas fa-search'));
    noRes.appendChild(el('p','',t('iv.no_results')+' "'+q+'"'));
    grid.appendChild(noRes);
  }
}

App.ivShowSeries=function(seriesId){
  S.ivCurrentSeries=seriesId;
  $('ivHome').style.display='none';
  $('ivSeriesView').classList.add('on');

  var series=null;
  if(S.ivSeries){
    for(var i=0;i<S.ivSeries.length;i++){
      if(S.ivSeries[i].id===seriesId){series=S.ivSeries[i];break}
    }
  }
  $('ivSeriesTitle').textContent=series?(series.name_ku||series.name||''):'';
  var descEl=$('ivSeriesDesc');
  if(series&&series.description_ku){
    descEl.textContent=series.description_ku;
    descEl.style.display='';
  }else{
    descEl.style.display='none';
  }

  clear($('ivPlayer'));
  renderIvEpisodes(seriesId);
};

function renderIvEpisodes(seriesId){
  var list=$('ivEpList');
  clear(list);

  if(!S.ivEpisodes)return;

  var eps=S.ivEpisodes.filter(function(ep){return ep.series_id===seriesId});
  eps.sort(function(a,b){return(a.episode_number||0)-(b.episode_number||0)});

  if(!eps.length){
    var empty=el('div','iv-empty');
    empty.appendChild(icon('fas fa-film'));
    empty.appendChild(el('p','',t('iv.no_episodes')));
    list.appendChild(empty);
    return;
  }

  var progress={};
  try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e){}

  eps.forEach(function(ep,idx){
    var item=el('div','iv-ep-item');
    item.setAttribute('data-ep-id',ep.id);

    // Episode number
    item.appendChild(el('div','iv-ep-num',String(ep.episode_number||idx+1)));

    // Thumbnail
    var thumb=el('div','iv-ep-thumb');
    var thumbUrl=ep.thumbnail_url;
    if(!thumbUrl&&ep.video_url&&ep.video_type!=='s3'){
      thumbUrl='https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg';
    }
    if(thumbUrl){
      var tImg=document.createElement('img');
      tImg.src=thumbUrl;tImg.alt='';tImg.loading='lazy';
      tImg.onerror=function(){this.style.display='none'};
      thumb.appendChild(tImg);
    }
    var playIcon=el('div','iv-play-icon');
    playIcon.appendChild(icon('fas fa-play'));
    thumb.appendChild(playIcon);
    item.appendChild(thumb);

    // Info
    var info=el('div','iv-ep-info');
    info.appendChild(el('div','iv-ep-title',ep.title||t('iv.episode_prefix')+' '+(ep.episode_number||idx+1)));
    var meta=el('div','iv-ep-meta');
    if(ep.duration){
      var mins=Math.floor(ep.duration/60);
      var secs=ep.duration%60;
      meta.appendChild(el('span','',mins+':'+String(secs).padStart(2,'0')));
    }
    if(ep.view_count){
      meta.appendChild(el('span','',ep.view_count+' '+t('iv.views')));
    }
    info.appendChild(meta);

    // Watch progress bar & watched badge
    var wp=progress[ep.id];
    if(wp&&wp.percent>=95){
      item.classList.add('watched');
      var badge=el('div','iv-watched-badge');
      badge.appendChild(icon('fas fa-check-circle'));
      badge.appendChild(document.createTextNode(' '+t('iv.watched')));
      info.appendChild(badge);
    } else if(wp&&wp.percent>0){
      var pBar=el('div','iv-ep-progress');
      var pFill=el('div','iv-ep-progress-fill');
      pFill.style.width=wp.percent+'%';
      pBar.appendChild(pFill);
      info.appendChild(pBar);
    }
    item.appendChild(info);

    // Save button
    var saved=ivIsSaved(ep.id);
    var saveBtn=el('button','iv-ep-save'+(saved?' saved':''));
    saveBtn.appendChild(icon('fas fa-bookmark'));
    on(saveBtn,'click',function(e){
      e.stopPropagation();
      ivToggleSave(ep.id,ep);
      saveBtn.classList.toggle('saved',ivIsSaved(ep.id));
      haptic([8]);
    });
    item.appendChild(saveBtn);

    on(item,'click',function(){App.ivPlay(ep.id)});
    list.appendChild(item);
  });
}

function ivGetSaved(){try{return JSON.parse(localStorage.getItem('iv_saved_eps')||'[]')}catch(e){return[]}}
function ivIsSaved(id){return ivGetSaved().some(function(e){return String(e.id)===String(id)})}
function ivToggleSave(id,ep){
  var saved=ivGetSaved();
  var idx=saved.findIndex(function(e){return String(e.id)===String(id)});
  if(idx>=0){saved.splice(idx,1)}else{
    var series=S.ivSeries?S.ivSeries.find(function(s){return s.id===ep.series_id}):null;
    saved.unshift({id:ep.id,series_id:ep.series_id,title:ep.title,episode_number:ep.episode_number,thumbnail_url:ep.thumbnail_url,video_url:ep.video_url,video_type:ep.video_type,series_title:series?series.title:''});
    if(saved.length>200)saved=saved.slice(0,200);
  }
  localStorage.setItem('iv_saved_eps',JSON.stringify(saved));
}

App.ivBack=function(){
  App.ivCloseVideo();
  S.ivCurrentSeries=null;
  $('ivSeriesView').classList.remove('on');
  $('ivHome').style.display='';
};

App.ivPlay=function(episodeId){
  var ep=null;
  if(S.ivEpisodes){
    for(var i=0;i<S.ivEpisodes.length;i++){
      if(S.ivEpisodes[i].id===episodeId){ep=S.ivEpisodes[i];break}
    }
  }
  if(!ep)return;

  var container=$('ivPlayer');
  clear(container);

  var isYouTube=ep.video_type==='youtube'||(ep.video_url&&!ep.video_url.startsWith('http')&&/^[a-zA-Z0-9_-]{11}$/.test(ep.video_url));

  var wrapper=el('div','iv-player');

  // Close button
  var closeBtn=el('button','iv-player-close');
  closeBtn.appendChild(icon('fas fa-times'));
  on(closeBtn,'click',function(){App.ivCloseVideo()});
  wrapper.appendChild(closeBtn);

  if(isYouTube){
    var iframe=document.createElement('iframe');
    iframe.src='https://www.youtube.com/embed/'+ep.video_url+'?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=0';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen=true;
    wrapper.appendChild(iframe);
  }else{
    var video=document.createElement('video');
    video.src=ep.video_url;
    video.controls=true;
    video.playsInline=true;
    video.autoplay=true;
    video.preload='auto';

    // Restore progress
    var progress={};
    try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e2){}
    if(progress[episodeId]&&progress[episodeId].currentTime){
      video.currentTime=progress[episodeId].currentTime;
    }

    // Save progress on timeupdate
    on(video,'timeupdate',function(){
      if(!video.duration)return;
      var pct=(video.currentTime/video.duration)*100;
      try{
        var p=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}');
        p[episodeId]={currentTime:video.currentTime,duration:video.duration,percent:pct};
        localStorage.setItem('iv_watch_progress',JSON.stringify(p));
      }catch(e3){}
    });

    wrapper.appendChild(video);
  }

  container.appendChild(wrapper);

  // Track view
  ivTrackView(episodeId);

  // Highlight playing episode
  var items=document.querySelectorAll('.iv-ep-item');
  items.forEach(function(it){
    it.classList.toggle('playing',it.getAttribute('data-ep-id')===episodeId);
  });

  // Scroll player into view
  wrapper.scrollIntoView({behavior:'smooth',block:'start'});
};

App.ivCloseVideo=function(){
  var container=$('ivPlayer');
  // Exit fullscreen if active
  if(document.fullscreenElement)try{document.exitFullscreen()}catch(e){}
  if(document.webkitFullscreenElement)try{document.webkitExitFullscreen()}catch(e){}
  // Pause any playing video
  var video=container.querySelector('video');
  if(video){video.pause();video.src=''}
  // Remove iframe to stop YouTube
  var iframe=container.querySelector('iframe');
  if(iframe){iframe.src='';iframe.remove()}
  clear(container);
  // Remove playing highlight
  var items=document.querySelectorAll('.iv-ep-item.playing');
  items.forEach(function(it){it.classList.remove('playing')});
  // Force layout recalc after fullscreen exit
  setTimeout(function(){window.dispatchEvent(new Event('resize'))},150);
};

App.ivRefresh=function(){
  S.ivSeries=null;S.ivEpisodes=null;
  loadIslamVoiceData(true);
};

function ivRenderSavedList(){
  var overlay=$('ivSavedOverlay');
  var list=$('ivSavedList');
  clear(list);
  var saved=ivGetSaved();
  if(!saved.length){
    var emp=el('div','iv-overlay-empty');
    var eico=el('div','iv-overlay-empty-icon');eico.appendChild(icon('fas fa-bookmark'));emp.appendChild(eico);
    emp.appendChild(el('div','iv-overlay-empty-title','هیچ ئەپیسۆدێک نەپارستیوی'));
    emp.appendChild(el('div','iv-overlay-empty-sub','بوتونا bookmark بپەخشە بۆ پاراستن'));
    list.appendChild(emp);
  }else{
    saved.forEach(function(ep){
      var item=el('div','iv-overlay-ep');
      var thumb=el('div','iv-overlay-ep-thumb');
      var thumbUrl=ep.thumbnail_url||(ep.video_url&&ep.video_type!=='s3'?'https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg':null);
      if(thumbUrl){var img=document.createElement('img');img.src=thumbUrl;img.alt='';thumb.appendChild(img)}
      item.appendChild(thumb);
      var info=el('div','iv-overlay-ep-info');
      if(ep.series_title)info.appendChild(el('div','iv-overlay-ep-series',ep.series_title));
      info.appendChild(el('div','iv-overlay-ep-title',ep.title||('ئەپیسۆد '+(ep.episode_number||''))));
      item.appendChild(info);
      var del=el('button','iv-overlay-ep-del');del.appendChild(icon('fas fa-bookmark-slash'));
      on(del,'click',function(e){e.stopPropagation();ivToggleSave(ep.id,ep);haptic([8]);ivRenderSavedList();
        // also update bookmark button in episode list if visible
        document.querySelectorAll('.iv-ep-save').forEach(function(b){var row=b.closest('[data-ep-id]');if(row&&row.dataset.epId==ep.id)b.classList.toggle('saved',ivIsSaved(ep.id))});
      });
      item.appendChild(del);
      on(item,'click',function(){overlay.classList.remove('open');App.ivShowSeries(ep.series_id);App.ivPlay(ep.id)});
      list.appendChild(item);
    });
  }
}
App.ivShowSaved=function(){$('ivSavedOverlay').classList.add('open');ivRenderSavedList();haptic([8])};
App.ivCloseSaved=function(){$('ivSavedOverlay').classList.remove('open')};

function ivRenderHistoryList(){
  var overlay=$('ivHistoryOverlay');
  var list=$('ivHistoryList');
  clear(list);
  var progress={};try{progress=JSON.parse(localStorage.getItem('iv_watch_progress')||'{}')}catch(e){}
  var keys=Object.keys(progress).filter(function(k){return progress[k]&&progress[k].percent>0});
  keys.sort(function(a,b){return(progress[b].ts||0)-(progress[a].ts||0)});
  if(!keys.length){
    var emp2=el('div','iv-overlay-empty');
    var eico2=el('div','iv-overlay-empty-icon');eico2.appendChild(icon('fas fa-clock-rotate-left'));emp2.appendChild(eico2);
    emp2.appendChild(el('div','iv-overlay-empty-title','هیچ مێژووێک نیە'));
    emp2.appendChild(el('div','iv-overlay-empty-sub','ئەپیسۆدێک تەماشابکە، ئینجا ئێرە دەکەوێتەوە'));
    list.appendChild(emp2);
  }else{
    keys.forEach(function(epId){
      var wp=progress[epId];
      var ep=S.ivEpisodes?S.ivEpisodes.find(function(e){return String(e.id)===String(epId)}):null;
      if(!ep)return;
      var series=S.ivSeries?S.ivSeries.find(function(s){return s.id===ep.series_id}):null;
      var item=el('div','iv-overlay-ep');
      var thumb=el('div','iv-overlay-ep-thumb');
      var thumbUrl=ep.thumbnail_url||(ep.video_url&&ep.video_type!=='s3'?'https://img.youtube.com/vi/'+ep.video_url+'/mqdefault.jpg':null);
      if(thumbUrl){var img=document.createElement('img');img.src=thumbUrl;img.alt='';thumb.appendChild(img)}
      item.appendChild(thumb);
      var info=el('div','iv-overlay-ep-info');
      if(series)info.appendChild(el('div','iv-overlay-ep-series',series.title));
      info.appendChild(el('div','iv-overlay-ep-title',ep.title||('ئەپیسۆد '+(ep.episode_number||''))));
      info.appendChild(el('div','iv-overlay-ep-pct',Math.round(wp.percent)+'% تەماشاکراوە'));
      item.appendChild(info);
      var del=el('button','iv-overlay-ep-del');del.appendChild(icon('fas fa-trash'));
      on(del,'click',function(e){e.stopPropagation();delete progress[epId];try{localStorage.setItem('iv_watch_progress',JSON.stringify(progress))}catch(ex){}haptic([8]);ivRenderHistoryList()});
      item.appendChild(del);
      on(item,'click',function(){overlay.classList.remove('open');App.ivShowSeries(ep.series_id);App.ivPlay(ep.id)});
      list.appendChild(item);
    });
  }
}
App.ivShowHistory=function(){$('ivHistoryOverlay').classList.add('open');ivRenderHistoryList();haptic([8])};
App.ivCloseHistory=function(){$('ivHistoryOverlay').classList.remove('open')};

App.ivToggleSearch=function(){
  var bar=$('ivSearchBar');
  if(bar.classList.contains('on')){
    bar.classList.remove('on');
    $('ivSearchInput').value='';
    App.ivSearch('');
  }else{
    bar.classList.add('on');
    $('ivSearchInput').focus();
  }
};

App.ivSearch=function(val){
  var q=val.trim().toLowerCase();
  var clearBtn=document.querySelector('.iv-search-clear');
  if(clearBtn){
    if(q)clearBtn.classList.add('on');
    else clearBtn.classList.remove('on');
  }
  S.ivSearchQuery=q;
  renderIvGrid();
};

App.ivClearSearch=function(){
  $('ivSearchInput').value='';
  App.ivSearch('');
  $('ivSearchInput').focus();
};

function ivTrackView(episodeId){
  if(!S.ivSupabase||!episodeId)return;
  var vk='iv_viewed_'+episodeId;
  if(sessionStorage.getItem(vk))return;
  sessionStorage.setItem(vk,'1');
  S.ivSupabase.rpc('increment_episode_view',{episode_id:episodeId}).catch(function(){});
}

/* ===== START ===== */
function startApp(){
  // Apply persisted mushaf CSS vars immediately
  document.documentElement.style.setProperty('--mushaf-size',(S.mushafFontSize||22)+'px');
  document.documentElement.style.setProperty('--mushaf-lh',String(S.mushafLineH||1.8));
  if(window.i18n){
    i18n.initLang().then(function(){ init(); i18n.applyTranslations(); });
  } else {
    init();
  }
  // Re-render current tab whenever background translation merge completes
  document.addEventListener('i18n:updated',function(){ renderCurrentTab(); });
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',startApp)}else{startApp()}

})();
