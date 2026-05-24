'use strict';



/* ===== START ===== */
function startApp(){
  console.log('[Startup] startApp()',Date.now()-_startupT0,'ms');
  // Hide native splash after TWO rAFs — double rAF guarantees the browser has
  // committed at least one paint of the HTML splash before the native overlay
  // disappears. Single rAF fires before paint on fast devices, leaving a 1-frame
  // gap where the raw WebView background is briefly visible.
  // fadeOutDuration:0 = instant hand-off (WebView and HTML splash both use the
  // same dark theme background, so the transition is seamless with no visible gap).
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      try{var _ns=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.SplashScreen;if(_ns)_ns.hide({fadeOutDuration:0});}catch(e){}
    });
  });
  // Apply persisted mushaf CSS vars immediately
  document.documentElement.style.setProperty('--mushaf-size',(S.mushafFontSize||30)+'px');
  document.documentElement.style.setProperty('--mushaf-lh',String(S.mushafLineH||1.8));
  // Force-update check runs early — parallel with i18n, non-blocking
  ForceUpdate.check();
  // Re-check every 12s so admin changes appear within ~12s of saving
  setInterval(function(){ ForceUpdate.check(); }, 12000);

  if(window.i18n){
    /* 3-second timeout — if i18n fetch hangs (slow connection), start app anyway */
    var _i18nDone = false;
    function _afterI18n(){
      if(_i18nDone)return; _i18nDone=true;

      // Safe render guard: if bundled didn't load, UI must not show raw keys.
      // Layer 1 (kmr-bundled.js) is synchronous — if it's missing, log the critical error
      // and let initLang's health report surface it in the admin dashboard.
      if(window.i18n && !window.i18n.isHealthy()){
        console.error('[i18n] UNHEALTHY: bundled translations not loaded or key count too low.',
          window.i18n.getStatus());
        // Still proceed — app is usable with whatever keys loaded; health report will fire.
      }

      init();
      i18n.applyTranslations();
      if(window._splashReadyI18n){window._splashReadyI18n();window._splashReadyI18n=null;}
    }
    setTimeout(_afterI18n, 1500); /* fallback — never wait more than 1.5s */
    i18n.initLang().then(function(){
      console.log('[Startup] i18n ready',Date.now()-_startupT0,'ms',
        window.i18n.getStatus ? window.i18n.getStatus() : '');
      _afterI18n();
    }).catch(_afterI18n);
  } else {
    init();
    if(window._splashReadyI18n){window._splashReadyI18n();window._splashReadyI18n=null;}
  }
  // i18n:updated already handled at top of file (line ~558) — no duplicate here
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',startApp)}else{startApp()}

