'use strict';

/* ===== INIT ===== */
function init(){
  _loadBookmarks(); // load bookmark map into memory before any render
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
    on(S.audio.el,'ended',function(){
      console.log('[QuranAudioPerf] ended='+S.audio.surah+':'+S.audio.ayah);
      if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}
      if(!_audioNextCalled){App.audioNext();}
      _audioNextCalled=false;
    });
    on(S.audio.el,'timeupdate',_scheduleAyahEnd);
    on(S.audio.el,'durationchange',function(){
      if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}
      _scheduleAyahEnd();
    });
    on(S.audio.el,'pause',function(){if(_audioEndTimer){clearTimeout(_audioEndTimer);_audioEndTimer=null;}});
    on(S.audio.el,'play',_scheduleAyahEnd);
    on(S.audio.el,'error',function(){
      if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
      if(!S.audio.surah)return;
      var errCode=S.audio.el.error&&S.audio.el.error.code;
      var currentSrc=S.audio.el.src||'';
      console.warn('[Audio] error — reciter:'+RECITER+' surah:'+S.audio.surah+' ayah:'+S.audio.ayah
        +' errCode:'+errCode+' src:'+currentSrc.slice(0,100));
      // If src was a local cached file — clear it and transparently retry with remote URL.
      // Local files can fail if the OS evicted them from cache storage.
      // errCode 4 (SRC_NOT_SUPPORTED) is the typical code when a capacitor:// file is missing.
      if(currentSrc.indexOf('capacitor://')===0||currentSrc.indexOf('file://')===0){
        console.warn('[Audio] local file failed — evicting from cache, retrying remote');
        if(window.AudioCache)AudioCache.clearLocalUri(RECITER,S.audio.surah,S.audio.ayah);
        var remoteUrl=audioUrl(S.audio.surah,S.audio.ayah);
        S.audio.el.src=remoteUrl;
        S.audio.el.play().catch(function(){});
        return; // transparent retry — no toast shown
      }
      // errCode 4 = MEDIA_ERR_SRC_NOT_SUPPORTED — reciter has no audio for this surah (404/unsupported)
      // errCode 2 = MEDIA_ERR_NETWORK — transient network failure (NOT a missing-reciter issue)
      // errCode 3 = MEDIA_ERR_DECODE — bad file data
      // errCode 1 = MEDIA_ERR_ABORTED — user/system cancelled (usually silent)
      var msg;
      if(errCode===4){
        msg=t('error.audio_unavailable')||'هذا القارئ لا تتوفر له تلاوة لهذه السورة';
        console.warn('[Audio] 404/unsupported — url:'+audioUrl(S.audio.surah,S.audio.ayah));
      } else if(errCode===1){
        return; // aborted — no toast
      } else {
        // code 2 (network) or code 3 (decode) — show a generic load error, not "not available"
        msg=t('error.audio_load')||'کێشەی بارکردنی دەنگ';
        console.error('[Audio] load error code:'+errCode+' reciter:'+RECITER
          +' url:'+audioUrl(S.audio.surah,S.audio.ayah));
      }
      toast(msg);
    });
    on(S.audio.el,'waiting',function(){if(S.audio.playing)setAudioIcon('loading')});
    on(S.audio.el,'playing',function(){
      setAudioIcon('pause');
      if(_blobToRevoke){URL.revokeObjectURL(_blobToRevoke);_blobToRevoke=null;}
      if(_playStartT){
        console.log('[QuranAudioPerf] playLatencyMs='+(Date.now()-_playStartT)+' src='+_lastSrcType);
        _playStartT=0;
      }
    });
    on(S.audio.el,'pause',function(){if(!S.audio.playing)setAudioIcon('play')});

    applyTheme();
    applySizes();
    applyKeepAwake();
    initTodayVerses();
    if(window.AppRating)AppRating.init(); // track launch count + first-launch date
    renderSurahGrid();
    renderContinue();

    // Pull-to-refresh on all tabs
    // On tablet the quran panel is a flex row — quranHome is the actual scroll container.
    var _isTabletLayout=window.innerWidth>=768||document.documentElement.classList.contains('is-ipad');
    setupPullToRefresh(_isTabletLayout?'quranHome':'panelQuran',function(){renderSurahGrid();renderContinue();},_isTabletLayout?null:function(){return !S.surah});
    setupPullToRefresh('panelBookmarks',function(){_renderHash.bm=null;renderBookmarks();});
    setupPullToRefresh('panelGoals',function(){_renderHash.goals=null;renderGoals();});
    setupPullToRefresh('panelIslamvoice',function(){_renderHash.iv=null;if(typeof App.ivRefresh==='function')App.ivRefresh();});
    setupPullToRefresh('panelSettings',function(){_renderHash.settings=null;renderSettings();});
    setupPullToRefresh('panelPrayer',function(){if(window.PrayerUI)PrayerUI.refresh()});
    setupPullToRefresh('panelGencine',function(){if(window.GencineUI)GencineUI.refresh();});

    // Fast-scroll pill for long lists
    if(window._initFastScroll) _initFastScroll();

    // Load data
    loadQuranData();
    loadTafsirData();

    // Init shared Supabase client and check auth
    initSupabase(function(){ loadReciterPhotos(); });

    // Pause audio and sky animations when app goes to background
    document.addEventListener('visibilitychange',function(){
      if(document.hidden){
        if(!S.bgAudio&&S.audio.playing){
          S.audio.el.pause();S.audio.playing=false;
          document.body.classList.remove('mushaf-audio-playing');
          var ic=$('audioPlayIcon');if(ic)ic.className='fas fa-play';
        }
        // Pause GPU-expensive sky animations when screen off/background
        var _skyEl=document.getElementById('prayerSkyScene');
        if(_skyEl)_skyEl.classList.add('sky-paused');
      } else {
        // Resume sky only if prayer tab is active
        if(S.tab==='prayer'){
          var _skyEl=document.getElementById('prayerSkyScene');
          if(_skyEl)_skyEl.classList.remove('sky-paused');
        }
        // Restore playback highlight state if Quran tab is visible (handles browser bg/fg)
        if(S.tab==='quran')requestAnimationFrame(_hlRestoreAll);
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
            // App came to foreground — check for forced update first
            ForceUpdate.check();
            // Refresh today's verse set so the date is correct after overnight open.
            // Without this, S.todayVerses stays as yesterday's Set and re-read ayahs
            // are skipped for today's goal count.
            initTodayVerses();
            // On every foreground resume: check exact alarm permission via native bridge.
            // If it was revoked → show warning; if it was just granted → clear rate-limit
            // and reschedule immediately (covers the case where user came back from Settings).
            (function(){
              var _AA=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.AthanAlarm;
              if(_AA&&window.PrayerUI&&window.S&&window.S.prayerAthanEnabled){
                _AA.canScheduleExact().then(function(r){
                  if(r&&r.canSchedule===false){
                    if(window._showAthanAlarmPermWarning)window._showAthanAlarmPermWarning();
                  } else if(r&&r.canSchedule===true&&localStorage.getItem('athanExactAlarmWarned')){
                    // Just got permission back — reschedule right now
                    localStorage.removeItem('athanExactAlarmWarned');
                    localStorage.removeItem('prayerLastScheduleTs');
                    PrayerUI.initScheduleOnStart();
                  }
                }).catch(function(){});
                // Check battery optimization on resume — re-check every 7 days in case user
                // reverted the exemption (Samsung OEM can reset it after OS updates).
                // Re-check battery opt every 7 days — Samsung OEM can silently revoke exemption
                var _bwAge=parseInt(localStorage.getItem('batteryOptWarnedAt')||'0');
                if(Date.now()-_bwAge>7*24*60*60*1000){
                  _AA.isIgnoringBatteryOpts&&_AA.isIgnoringBatteryOpts().then(function(r){
                    if(r&&r.ignoring===false&&window._showBatteryOptWarning)window._showBatteryOptWarning();
                  }).catch(function(){});
                }
              }
            })();
            // Reschedule athan + daily verse if new day
            if(window.PrayerUI)PrayerUI.initScheduleOnStart();
            // Rebuild prayer panel if active — handles overnight stale date.
            // Skipped on macOS: athan notifications bring app to foreground automatically;
            // re-rendering would cause a visible "refresh" the user didn't ask for.
            var _fgPlatform=window.Capacitor&&Capacitor.getPlatform?Capacitor.getPlatform():'';
            if(window.PrayerUI&&S.tab==='prayer'&&_fgPlatform!=='mac'){
              requestAnimationFrame(function(){PrayerUI.render();});
            }
            // Push fresh widget data if date or city changed since last push
            if(window.PrayerUI)PrayerUI.pushWidgetIfStale();
            pushGoalDataToWidget();
            syncWidgetTranslations();
            initDailyVerse();
            scheduleStreakReminder();
            checkNewVideoNotif();
            checkNewBookNotif();
            // Re-run prefetch in case any city cache is missing (e.g. first open was offline)
            if(window.PrayerUI&&PrayerUI.prefetchAllCities)PrayerUI.prefetchAllCities();
            // Restore playback highlight state if Quran tab is active
            if(S.tab==='quran')requestAnimationFrame(_hlRestoreAll);
          }
        });
      }
    }catch(e){console.warn('App state listener not available',e)}

    // Handle iOS widget tap → deep link to prayer tab (tafsirkurd://prayer)
    try{
      if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App){
        Capacitor.Plugins.App.addListener('appUrlOpen',function(ev){
          if(ev&&ev.url&&ev.url.indexOf('://prayer')!==-1){App.tab('prayer');}
        });
      }
    }catch(e){}

    // Handle notification tap → deep link to ayah/video
    if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications){
      Capacitor.Plugins.LocalNotifications.addListener('localNotificationActionPerformed',function(ev){
        var extra=ev&&ev.notification&&ev.notification.extra;
        if(!extra)return;
        // On macOS, Alert-style athan notifications automatically bring the app to the
        // foreground without any user interaction. Guard prayer-tab navigation so it only
        // fires when the user explicitly tapped — not on every athan fire.
        var _isMac=(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==='mac');
        var _isUserTap=(!ev.actionId||ev.actionId==='tap');
        if(_isMac&&!_isUserTap)return;
        if(extra.type==='verse'&&extra.s&&extra.a){
          App.tab('quran');
          setTimeout(function(){App.openSurah(extra.s,extra.a);},300);
        }
        if(extra.type==='video'&&extra.id){
          App.tab('islamvoice');
          // Wait for islamvoice data to load then open episode
          var _ivTries=0;
          var _ivOpen=function(){
            if(S.ivEpisodes&&S.ivEpisodes.length){
              // Find the series for this episode then open series + play
              var ep=S.ivEpisodes.find(function(e){return String(e.id)===String(extra.id);});
              if(ep){App.ivShowSeries(ep.series_id);setTimeout(function(){App.ivPlay(ep.id);},200);}
            } else if(_ivTries++<20){setTimeout(_ivOpen,300);}
          };
          setTimeout(_ivOpen,400);
        }
        if(extra.type==='book'&&extra.id){
          App.tab('gencine');
          // Wait for gencine data to load then open book
          var _bkTries=0;
          var _bkOpen=function(){
            if(window.GencineUI&&GencineUI.openBook(extra.id))return;
            if(_bkTries++<20)setTimeout(_bkOpen,300);
          };
          setTimeout(_bkOpen,400);
        }
        if(extra.type==='hadith'){
          App.tab('gencine');
          var _hdTries=0;
          var _hdOpen=function(){
            if(window.GencineUI){GencineUI.section('hadith');return;}
            if(_hdTries++<20)setTimeout(_hdOpen,300);
          };
          setTimeout(_hdOpen,400);
        }
        if(extra.type==='streak'){
          App.tab('quran');
        }
        if(extra.type==='prayer'){
          App.tab('prayer');
        }
        if(extra.type==='update'){
          // Tapping the update notification opens the store directly
          if(window.ForceUpdate)window.ForceUpdate.openStore();
        }
      });
    }

    // macOS: track last user interaction so AppDelegate can distinguish
    // user-initiated foreground from notification-triggered foreground.
    if(window.Capacitor&&Capacitor.getPlatform&&Capacitor.getPlatform()==='mac'){
      var _updateMacInteraction=function(){
        var _pr=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Preferences;
        if(_pr)_pr.set({key:'macLastInteraction',value:String(Date.now()/1000)}).catch(function(){});
      };
      document.addEventListener('pointerdown',_updateMacInteraction,{passive:true});
      document.addEventListener('keydown',_updateMacInteraction,{passive:true});
      _updateMacInteraction(); // stamp once on launch so first open never auto-minimizes
    }

    // Android back button
    try{
      if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.addListener('backButton',function(){
          if($('fuOverlay')&&$('fuOverlay').classList.contains('on')){return} // hard block — back does nothing
          if($('profilePanel')&&$('profilePanel').classList.contains('on')){App.closeProfile();return}
          if($('authPanel')&&$('authPanel').classList.contains('on')){App.closeLogin();return}
          if($('goalConfirmOverlay')&&$('goalConfirmOverlay').classList.contains('on')){App.closeDeleteConfirm();return}
          if($('goalStartChoiceOverlay')&&$('goalStartChoiceOverlay').classList.contains('on')){App.closeStartChoice();return}
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
                    // startCloudSync() fires via onAuthStateChange(SIGNED_IN) from setSession
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

  // Ensure notification channels exist on Android (capacitor.config channels[] is iOS-only)
  // Note: requestPermissions() is NOT called here — _doSchedule() handles it at the right
  // time (after athan data is ready), preventing a premature dialog on top of the splash.
  if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications){
    try{
      var _LN=window.Capacitor.Plugins.LocalNotifications;
      // Create reminder channel immediately at startup
      _ensureReminderChannel(_LN);
      // Reschedule daily reminder on every launch so 7-day window never expires
    }catch(e){}
  }

  // Critical: schedule athan + daily verse immediately (notification timing matters)
  if(window.PrayerUI)PrayerUI.initScheduleOnStart();
  // Push widget data from cache if date/city changed (runs without network)
  if(window.PrayerUI)PrayerUI.pushWidgetIfStale();
  pushGoalDataToWidget();
  // Sync widget translations from Supabase (once per day, requires network)
  setTimeout(function(){syncWidgetTranslations();},3000);
  initDailyVerse();
  // Stagger non-critical background work to avoid network + CPU spike right after entry
  setTimeout(function(){scheduleStreakReminder();},800);
  setTimeout(function(){checkNewVideoNotif();},1500);
  setTimeout(function(){_warmAboutCache();},2000);
  setTimeout(function(){checkNewBookNotif();},2500);
  _initPushTapListener(); // register tap listener immediately — never miss cold-start events
  setTimeout(function(){initPushToken();},3000);
  setTimeout(function(){_reportAppVersion();},5000);
  // Preload Gencine scripts in background so first tab open is instant (scripts are 190KB)
  setTimeout(function(){_loadGencineScripts(function(){
    // Pre-render only if user hasn't already opened the tab
    if(window.GencineUI&&S.tab!=='gencine'){
      var _gh=_tabHash('gencine');
      if(_gh!==_renderHash.gencine){GencineUI.render();_renderHash.gencine=_gh;}
    }
  });},3000);
  // Heavy: fetches prayer data for all 20 cities — delay until app is fully settled
  setTimeout(function(){if(window.PrayerUI)PrayerUI.prefetchAllCities();},4000);
  // Athan voice decode is CPU-intensive — delay until after first 3s of interaction
  setTimeout(function(){if(window.PrayerUI)PrayerUI.preloadAthanVoices();},3500);
  // Audio cache warmup — verify manifest entries still exist on disk, populate _uriMap
  setTimeout(function(){if(window.AudioCache)AudioCache.warmup();},3000);

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

  // Mushaf font warm-up — prefetch current page ±4 fonts/data so Mushaf tab opens fast
  setTimeout(function(){
    getMushafPageRange(S.surah||1).then(function(pages){
      var cur=pages.start;
      for(var _wp=-2;_wp<=4;_wp++){
        if(cur+_wp>=1&&cur+_wp<=604)_prefetchMushafPage(cur+_wp);
      }
    }).catch(function(){});
  },500);

  // Early data prefetch — warm all API/DB caches before user taps any tab.
  // No DOM work here — just fires network requests so cache is hot when tab opens.
  setTimeout(function(){
    if(window.GencineUI&&GencineUI.prefetch)GencineUI.prefetch();
  },200);

  // Pre-render fallback — fires at 1500ms if _checkDataReady() hasn't triggered it yet.
  // Normal case: _checkDataReady() triggers _startTabPrerender() ~100ms after start.
  setTimeout(function(){_startTabPrerender();},1500);

  // Smart splash — 2 gates: quran data loaded + all tabs pre-rendered.
  // Hybrid timing: first launch / new version → 3s minimum (full animation).
  //                repeat same-version launches → immediate exit when data ready.
  var _splashStart = Date.now();
  var _splashReady = {quran:false,tabs:false};
  var _splashDismissed = false;
  var _splashSeenKey = 'tk_splash_seen';
  var _splashMinPassed = false;

  // Version check — resolves in <10ms on device (Capacitor bridge call)
  (function(){
    try {
      if (!window.Capacitor||!Capacitor.Plugins||!Capacitor.Plugins.App) {
        _splashMinPassed=true; return; // web/dev — no minimum
      }
      Capacitor.Plugins.App.getInfo().then(function(info){
        if (localStorage.getItem(_splashSeenKey)===(info.version||'')) {
          // Repeat launch, same version — exit as soon as data is ready
          _splashMinPassed=true;
          _checkSplashReady();
        }
        // else: first launch or new version — 3s timer handles it below
      }).catch(function(){ _splashMinPassed=true; _checkSplashReady(); });
    } catch(e){ _splashMinPassed=true; }
  })();

  // 3s minimum — only active for first launch / new version.
  // Writes the "seen" flag so next launch is instant.
  setTimeout(function(){
    if(_splashMinPassed)return; // already cleared (repeat launch)
    try {
      if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App)
        Capacitor.Plugins.App.getInfo().then(function(i){localStorage.setItem(_splashSeenKey,i.version||'');}).catch(function(){});
    }catch(e){}
    _splashMinPassed=true;
    _checkSplashReady();
  },3000);

  function _doSplashTransition(){
    if(_splashDismissed)return;
    _splashDismissed=true;
    var sp=$('splash');
    var app=$('app');
    if(app)app.style.display='flex';
    // Double rAF: first triggers layout, second ensures browser has painted app content
    // before splash starts fading — prevents white blank frame.
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        console.log('[Startup] Transitioning into app at',Date.now()-_splashStart,'ms');
        if(sp)sp.classList.add('hide');
        if(app)app.classList.add('visible');
        // Execute any pending push deep link now that app is fully visible
        if(_pendingPushDeepLink){
          var _pl=_pendingPushDeepLink;_pendingPushDeepLink=null;
          setTimeout(function(){_handlePushDeepLink(_pl.type,_pl.id);},300);
        }
        setTimeout(function(){if(sp&&sp.parentNode)sp.parentNode.removeChild(sp);},400);
        console.log('[Startup] App visible at',Date.now()-_splashStart,'ms');
      });
    });
  }

  function _checkSplashReady(){
    if(_splashDismissed)return;
    if(!_splashReady.quran||!_splashReady.tabs)return;
    if(!_splashReady.video)return; // wait for video to finish playing
    if(!_splashMinPassed)return; // first launch / new version: wait for 3s minimum
    console.log('[Startup] All gates passed — exiting splash. Elapsed:',Date.now()-_splashStart,'ms');
    // Pre-warm app layout one frame before transition starts — gives browser a head start
    // painting the app before the splash fade begins (3 rAFs total on normal path).
    var app=$('app');
    if(app)app.style.display='flex';
    requestAnimationFrame(function(){_doSplashTransition();});
  }

  // Video plays once — when it ends, enter app immediately if timing gate is cleared.
  // Data loading / tab pre-render finish in background; each tab renders on first visit.
  var _splashVid=document.getElementById('splashVideo');
  if(_splashVid){
    _splashVid.addEventListener('ended',function(){
      if(_splashReady.video)return;
      _splashReady.video=true;
      // Animation finished — go in right now if timing gate is already cleared.
      // Don't wait for quran/tabs: data arrives in background, tabs render on demand.
      if(_splashMinPassed){_doSplashTransition();return;}
      _checkSplashReady();
    });
    _splashVid.play().catch(function(){
      // Autoplay blocked — mark video gate as passed so app can still load
      _splashReady.video=true;
      _checkSplashReady();
    });
  } else {
    // No video element — don't block on it
    _splashReady.video=true;
  }

  window._splashReadyQuran      =function(){if(_splashReady.quran)return;_splashReady.quran=true;_checkSplashReady();};
  window._splashReadyI18n       =function(){}; // not a gate — always fires before tabs anyway
  window._splashReadyGencine    =function(){}; // not a gate — Supabase-dependent, loads async
  window._splashReadyIslamvoice =function(){}; // not a gate — Supabase-dependent, loads async
  window._splashReadyTabs       =function(){if(_splashReady.tabs)return;_splashReady.tabs=true;_checkSplashReady();};
  // Overall failsafe — force app visible after 6s no matter what
  setTimeout(function(){_doSplashTransition();},6000);
  // Data always loads async now (no localStorage cache) — splash waits for both files
}

/* ===== LIVE TRANSLATION UPDATE ===== */
// Fires after every atomic translation swap in i18n.js (remote merge or version purge).
// Also called via window._i18nRerenderHook which i18n.js calls directly after a swap.
function _rerenderCurrentTab(){
  // Invalidate all pre-rendered caches so next tab visit rebuilds with fresh strings
  _renderHash={};
  if(window.PrayerUI) PrayerUI.invalidate();

  // Re-render the currently visible tab right now
  var tab=S.tab;
  if(tab==='bookmarks'){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');}
  else if(tab==='goals'){renderGoals();_renderHash.goals=_tabHash('goals');}
  else if(tab==='settings'){renderSettings();_renderHash.settings=_tabHash('settings');}
  else if(tab==='islamvoice'){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');}
  else if(tab==='prayer'&&window.PrayerUI){PrayerUI.redraw();}
  else if(tab==='gencine'&&window.GencineUI){GencineUI._homeEl=null;GencineUI._draw();}
  // quran tab uses data-i18n attributes — applyTranslations() handled by i18n.js before dispatch
}

// Register hook so i18n.js can trigger re-render directly after atomic swap
window._i18nRerenderHook = _rerenderCurrentTab;

document.addEventListener('i18n:updated', _rerenderCurrentTab);

/* ===== DATA LOADING ===== */
var _dataReady={quran:false,tafsir:false};
var _tabsPrerendering=false; // guard: pre-render runs only once
var _startupT0=Date.now();   // module load time for debug logs

function _checkDataReady(){
  if(!_dataReady.quran)return;
  // Signal splash gate as soon as quran.json is ready — tafsir (3MB) is only needed
  // when the user opens a surah to read, so it must not block the splash or tab pre-render.
  if(window._splashReadyQuran){window._splashReadyQuran();window._splashReadyQuran=null;}
  // Tab pre-render doesn't need tafsir — start immediately when quran is ready.
  // _tabsPrerendering guard ensures this runs only once even when called twice.
  setTimeout(_startTabPrerender,50);
  if(!_dataReady.tafsir)return;
  console.log('[Startup] quran+tafsir ready',Date.now()-_startupT0,'ms');
  if(S.surah)renderAyahs(S.surah);
  if(window.QuranSearch){
    QuranSearch.init(S.quranData,S.tafsirData);
    QuranSearch.setWorkerUrl('https://quran-search.tefsirkurd.workers.dev');
  }
}

// Pre-render all 6 tabs so they're built before user ever taps them.
// Called from _checkDataReady (early, data-driven) with 1500ms fallback in init().
function _startTabPrerender(){
  if(_tabsPrerendering)return;
  _tabsPrerendering=true;
  console.log('[Startup] Tab pre-render start',Date.now()-_startupT0,'ms');
  var jobs=[
    function(){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');},
    function(){renderGoals();_renderHash.goals=_tabHash('goals');},
    function(){renderSettings();_renderHash.settings=_tabHash('settings');},
    function(){if(window.PrayerUI){PrayerUI.render();// Pause sky animations — pre-rendered but not the active tab
      requestAnimationFrame(function(){var _s=document.getElementById('prayerSkyScene');if(_s&&S.tab!=='prayer')_s.classList.add('sky-paused');});}},
    function(){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');},
    function(){if(window.GencineUI)GencineUI.render();}
  ];
  var _ji=0;
  function _nextJob(){
    if(_ji>=jobs.length){
      console.log('[Startup] Tab pre-render done',Date.now()-_startupT0,'ms');
      if(window._splashReadyTabs)window._splashReadyTabs();
      return;
    }
    jobs[_ji++]();
    setTimeout(_nextJob,16);
  }
  _nextJob();
}
function loadQuranData(){
  var ctrl=new AbortController();
  var _t0=Date.now();
  var tid=setTimeout(function(){ctrl.abort();},10000);
  fetch('/data/quran.json',{signal:ctrl.signal}).then(function(r){
    clearTimeout(tid);
    AndroidLog.fetch('/data/quran.json',r.status,'quran',false,Date.now()-_t0);
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(d){
    S.quranData=d;
    _dataReady.quran=true;
    _checkDataReady();
  }).catch(function(e){
    clearTimeout(tid);
    AndroidLog.fetch('/data/quran.json',0,'quran',false,Date.now()-_t0,e);
    console.error('Quran load error:',e);
    if(window.AppErrors)AppErrors.report('network_error','quran.json load failed: '+e.message,e.stack,'app-init');
    toast(t('error.data_load'));
    // Unblock splash/pre-render even on failure so app doesn't freeze
    _dataReady.quran=true;
    _checkDataReady();
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
  var ctrl=new AbortController();
  var tid=setTimeout(function(){ctrl.abort();},15000);
  fetch('/data/kurdish_tafsir.json',{signal:ctrl.signal}).then(function(r){
    clearTimeout(tid);
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(d){
    S.tafsirData=groupTafsirBySurah(d);
    _dataReady.tafsir=true;
    _checkDataReady();
  }).catch(function(e){
    clearTimeout(tid);
    console.error('Tafsir load error:',e);
    if(window.AppErrors)AppErrors.report('network_error','kurdish_tafsir.json load failed: '+e.message,e.stack,'app-init');
    toast(t('error.tafsir_load'));
    // Retry once after 3 seconds — flag prevents concurrent retry fetches
    var _tafsirRetrying=false;
    setTimeout(function(){
      if(S.tafsirData||_tafsirRetrying)return;
      _tafsirRetrying=true;
      var ctrl2=new AbortController();
      var tid2=setTimeout(function(){ctrl2.abort();},15000);
      fetch('/data/kurdish_tafsir.json',{signal:ctrl2.signal}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(d){
        clearTimeout(tid2);
        S.tafsirData=groupTafsirBySurah(d);
        _dataReady.tafsir=true;
        _checkDataReady();
        toast(t('toast.tafsir_loaded'));
      }).catch(function(){clearTimeout(tid2);}).then(function(){_tafsirRetrying=false;});
    },3000);
  });
}

/* ===== THEME & SIZES ===== */
function applyTheme(){
  var bgMap={light:'#fafafa',dark:'#0a0a0a',sakina:'#0c1c12',noor:'#f4e8cc'};
  var bg=bgMap[S.theme]||'#fafafa';
  document.documentElement.setAttribute('data-theme',S.theme);
  // Keep inline --bg in sync with the startup anti-flash script (index.html head).
  // Without this, the startup inline style overrides CSS [data-theme] rules on every theme switch.
  document.documentElement.style.background=bg;
  document.documentElement.style.setProperty('--bg',bg);
  localStorage.setItem('theme',S.theme);
  _nativeSyncTheme(S.theme);
  if(window.Capacitor&&window.Capacitor.Plugins.StatusBar){
    var isDark=S.theme==='dark'||S.theme==='sakina';
    try{window.Capacitor.Plugins.StatusBar.setStyle({style:isDark?'DARK':'LIGHT'})}catch(e){}
    try{window.Capacitor.Plugins.StatusBar.setBackgroundColor({color:bg})}catch(e){}
  }
}
function applySizes(){
  document.documentElement.style.setProperty('--ar-size',S.arSize+'rem');
  document.documentElement.style.setProperty('--tf-size',S.tfSize+'rem');
  document.documentElement.style.setProperty('--line-h',String(S.lineH));
  var fontVal=S.readerFont==='amiri'?"'Amiri Quran','KFGQPC Hafs',sans-serif":"'KFGQPC Hafs','Scheherazade New','IBM Plex Sans Arabic',sans-serif";
  document.documentElement.style.setProperty('--font-ar',fontVal);
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
    var sl=0;try{sl=JSON.parse(localStorage.getItem('readSessions')||'[]').length;}catch(e){}
    return JSON.stringify(g)+':'+(log[today]||0)+':'+calcStreak(log)+':'+sl;
  }
  if(name==='settings'){
    return (S.user?S.user.email:'')+':'+S.theme+':'+S.hapticFeedback+':'+S.arSize+':'+S.tfSize+':'+S.keepAwake;
  }
  if(name==='islamvoice'){
    return (S.ivSeries?S.ivSeries.length:0)+':'+(S.ivSearchQuery||'')+(S.ivSpeakerFilter||'');
  }
  if(name==='gencine'){
    // Version key + date — forces re-render on DB reload OR new day
    return 'g:'+(window._gencineDbVersion||0)+':'+new Date().toDateString();
  }
  return null;
}
window.App={};
// Cached panel/tab-item NodeLists — populated once on first tab switch (DOM is ready by then)
var _cachedPanels=null,_cachedTabItems=null,_cachedTabBtns={};
function _getCachedPanels(){if(!_cachedPanels)_cachedPanels=document.querySelectorAll('.panel');return _cachedPanels;}
function _getCachedTabItems(){if(!_cachedTabItems)_cachedTabItems=document.querySelectorAll('.tab-item');return _cachedTabItems;}
function _getCachedTabBtn(name){if(!_cachedTabBtns[name])_cachedTabBtns[name]=document.querySelector('.tab-item[data-tab="'+name+'"]');return _cachedTabBtns[name];}
// Track pending tab rAF renders so we can cancel them if user switches again
var _pendingTabRaf=null;
App.tab=function(name){
  if(tapGuard('tab',80))return; // 80ms guard — fast enough for rapid switching
  if(name===S.tab){
    haptic([8]);
    if(name==='quran'){
      if(S.surah){
        // Inside surah: first re-tap scrolls to top, second goes back to grid
        var _mv=$('mushafView');
        var _se=(_mv&&_mv.style.display!=='none')?_mv:$('ayahList');
        if(_se&&_se.scrollTop>20){_se.scrollTo({top:0,behavior:'smooth'});}
        else{App.backToList();}
      }else{
        // On Quran grid: scroll to top
        var _qp=$('panelQuran');
        if(_qp&&_qp.scrollTop>20){_qp.scrollTo({top:0,behavior:'smooth'});}
      }
      return;
    }
    if(name==='islamvoice'){
      var _ip=$('panelIslamvoice');
      if(S.ivCurrentSeries){
        // Inside series view: scroll to top first, then back to home
        if(_ip&&_ip.scrollTop>20){_ip.scrollTo({top:0,behavior:'smooth'});}
        else{App.ivBack();}
      }else{
        // On video home: scroll to top
        if(_ip&&_ip.scrollTop>20){_ip.scrollTo({top:0,behavior:'smooth'});}
      }
      return;
    }
    if(name==='gencine'){
      var _gp=$('panelGencine');
      if(window.GencineUI&&GencineUI._view!=='home'){
        // Inside sub-view: scroll to top first, then go home
        if(_gp&&_gp.scrollTop>20){_gp.scrollTo({top:0,behavior:'smooth'});}
        else{GencineUI.goHome();}
      }else{
        // On Gencine home: scroll to top
        if(_gp&&_gp.scrollTop>20){_gp.scrollTo({top:0,behavior:'smooth'});}
      }
      return;
    }
    if(name==='settings'){
      var _sp=$('panelSettings');
      if(_sp&&_sp.scrollTop>20){_sp.scrollTo({top:0,behavior:'smooth'});}
      return;
    }
    return;
  }
  haptic([8]);

  // Cancel any pending rAF render from a previous fast tab switch
  if(_pendingTabRaf){cancelAnimationFrame(_pendingTabRaf);_pendingTabRaf=null;}

  var _prevTab=S.tab;
  S.tabHistory.push(_prevTab);
  S.tab=name;

  // ── Show new panel instantly — only touch the previous + new panel, not ALL panels ──
  var prevPanel=$('panel'+_prevTab.charAt(0).toUpperCase()+_prevTab.slice(1));
  if(prevPanel)prevPanel.classList.remove('on');
  var panel=$('panel'+name.charAt(0).toUpperCase()+name.slice(1));
  if(panel)panel.classList.add('on');

  // ── Tab bar icon ──
  var prevBtnName=(_prevTab==='goals'||_prevTab==='bookmarks')?'quran':_prevTab;
  var prevBtn=_getCachedTabBtn(prevBtnName);
  if(prevBtn)prevBtn.classList.remove('on');
  var tabBtnName=(name==='goals'||name==='bookmarks')?'quran':name;
  var tabBtn=_getCachedTabBtn(tabBtnName);
  if(tabBtn)tabBtn.classList.add('on');

  // ── Prayer: unpause sky in next frame ──
  if(name==='prayer'){
    requestAnimationFrame(function(){
      var _skyEl=document.getElementById('prayerSkyScene');
      if(_skyEl)_skyEl.classList.remove('sky-paused');
    });
  }

  // ── Defer all cleanup + renders to next frame so tab switch paints first ──
  _pendingTabRaf=requestAnimationFrame(function(){
    _pendingTabRaf=null;

    // Cleanup from previous tab
    if(_prevTab==='prayer'&&name!=='prayer'&&window.PrayerUI){
      PrayerUI.stopCountdown();
      var _skyEl2=document.getElementById('prayerSkyScene');
      if(_skyEl2)_skyEl2.classList.add('sky-paused');
    }
    if(_prevTab==='quran'&&name!=='quran'){
      var _sb=document.getElementById('searchBar');if(_sb)_sb.classList.remove('on');App.clearSearch();
      if(_surahBadgeObs){_surahBadgeObs.disconnect();}
      clearMushafHighlights();
    }
    if(_prevTab==='gencine'&&name!=='gencine'&&window.GencineUI){GencineUI.closeSheet();}
    if(_prevTab==='islamvoice'&&name!=='islamvoice'){if(_ivHeroTimer){clearInterval(_ivHeroTimer);_ivHeroTimer=null;}}
    if(name==='islamvoice'&&_ivHeroSlides.length){_ivHeroResetTimer();}
    if(S.surah&&name!=='quran'){_endSession();}
    App.closeRecPicker();
    if(typeof closeCfgSheet==='function')closeCfgSheet();
    App.closeReaderSettings();

    // Renders for new tab
    if(name==='quran'){requestAnimationFrame(_hlRestoreAll);}
    if(name==='bookmarks'){var _hbm=_tabHash('bookmarks');if(_hbm!==_renderHash.bm){renderBookmarks();_renderHash.bm=_tabHash('bookmarks');}}
    if(name==='goals'){var _hg=_tabHash('goals');if(_hg!==_renderHash.goals){renderGoals();_renderHash.goals=_tabHash('goals');}}
    if(name==='islamvoice'){var _hiv=_tabHash('islamvoice');if(_hiv!==_renderHash.iv){renderIslamVoice();if(S.ivSeries&&S.ivSeries.length)_renderHash.iv=_tabHash('islamvoice');}}
    if(name==='settings'){var _hs=_tabHash('settings');if(_hs!==_renderHash.settings){renderSettings();_renderHash.settings=_tabHash('settings');}_warmAboutCache();}
    if(name==='prayer'&&window.PrayerUI){PrayerUI.render();if(PrayerUI.ensureCountdown)PrayerUI.ensureCountdown();}
    if(name==='gencine'){
      // Show loading skeleton immediately while scripts fetch (panel is blank until GencineUI loads)
      if(!window.GencineUI){var _gcEl=document.getElementById('gencineContent');if(_gcEl&&!_gcEl.firstChild){var _gcSk=document.createElement('div');_gcSk.className='genc-scripts-loading';for(var _gi=0;_gi<3;_gi++){var _gc=document.createElement('div');_gc.className='genc-scripts-loading-card';_gcSk.appendChild(_gc);}_gcEl.appendChild(_gcSk);}}
      _loadGencineScripts(function(){var _gh=_tabHash('gencine');if(_gh!==_renderHash.gencine&&S.tab==='gencine'){GencineUI.render();_renderHash.gencine=_gh;}});
    }
  });
};

/* ===== GENCINE LAZY LOADER ===== */
// dua-data.js + dhikr.js are not loaded at startup — they're pulled in on first Gencine tab visit.
// All callers in App.tab guard with window.GencineUI so they're safe until this resolves.
var _gencineScriptsLoaded = false;
var _gencineScriptsCbs = [];
var _gencineScriptsLoading = false;
function _loadGencineScripts(cb) {
  if (_gencineScriptsLoaded) { if (cb) cb(); return; }
  if (cb) _gencineScriptsCbs.push(cb);
  if (_gencineScriptsLoading) return;
  _gencineScriptsLoading = true;

  function _ls(src, next) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = next;
    s.onerror = next;
    document.body.appendChild(s);
  }

  function _done() {
    _gencineScriptsLoaded = true;
    _gencineScriptsLoading = false;
    var cbs = _gencineScriptsCbs.splice(0);
    cbs.forEach(function(fn) { try { fn(); } catch(e) {} });
  }

  // Load dua-data.js and smart-dhikr.js in PARALLEL (independent of each other),
  // then load dhikr.js only after both finish (it depends on both)
  var _p1 = false, _p2 = false;
  function _check() { if (_p1 && _p2) _ls('/dhikr/dhikr.js?v=20260569', _done); }
  _ls('/dhikr/dua-data.js?v=20260326b',  function() { _p1 = true; _check(); });
  _ls('/dhikr/smart-dhikr.js?v=32',      function() { _p2 = true; _check(); });
}

