// ── App Rating ────────────────────────────────────────────────────────────────
// Handles the smart in-app review prompt and the Settings "Rate" button.
// Uses @capacitor-community/in-app-review for native dialogs.
//
// Android: Google Play In-App Review API (stays in-app, native bottom sheet)
// iOS:     SKStoreReviewController.requestReview() (native dialog, OS-controlled)
// Web:     falls back to opening the Play Store URL
//
// Smart prompt fires after all of these are true:
//   - not already accepted  (ratingPromptDone = 'true')
//   - ≥5 app launches       (appLaunchCount)
//   - ≥3 days since install (appFirstLaunchAt)
//   - ≥3 days of readLog    (meaningful engagement)
//   - ≥30 days since last   (ratingLastPromptAt)   [0 = never shown]
// ─────────────────────────────────────────────────────────────────────────────
(function(){
'use strict';

var ANDROID_PKG = 'com.tafsirkurd.app';
// iOS App Store ID — fill in once the app is live on the App Store
var IOS_APP_ID  = '6760433688';

var _popup = null;

/* ── Capacitor helpers ─────────────────────────────────────────────────── */
function _platform(){
  return (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web';
}

/* ── Launch tracking ───────────────────────────────────────────────────── */
function _trackLaunch(){
  if(!localStorage.getItem('appFirstLaunchAt')){
    localStorage.setItem('appFirstLaunchAt', new Date().toISOString());
  }
  var n = parseInt(localStorage.getItem('appLaunchCount')||'0') + 1;
  localStorage.setItem('appLaunchCount', String(n));
}

/* ── Gate check ────────────────────────────────────────────────────────── */
function _canShow(){
  if(localStorage.getItem('ratingPromptDone')==='true') return false;

  var launches = parseInt(localStorage.getItem('appLaunchCount')||'0');
  if(launches < 5) return false;

  var firstMs = new Date(localStorage.getItem('appFirstLaunchAt')||0).getTime();
  if((Date.now()-firstMs) < 3*24*60*60*1000) return false; // < 3 days

  var lastMs = new Date(localStorage.getItem('ratingLastPromptAt')||0).getTime();
  if(lastMs > 0 && (Date.now()-lastMs) < 30*24*60*60*1000) return false; // < 30 days since last

  // At least 3 different reading days
  var log = {};
  try{ log = JSON.parse(localStorage.getItem('readLog')||'{}'); }catch(e){}
  if(Object.keys(log).length < 3) return false;

  return true;
}

/* ── Open store page (always visible result, no native API dependency) ──── */
// Used by both the Settings button and the smart-popup "Rate Now" tap.
// The Play In-App Review API is unreliable for explicit user-intent taps:
//   - debug builds: no-ops silently (always)
//   - production: OS may suppress if quota exceeded
// Direct store URL is 100% guaranteed to produce a visible result.
function _openStorePage(){
  var plat = _platform();
  if(plat==='ios'){
    window.open('itms-apps://itunes.apple.com/app/id'+IOS_APP_ID+'?action=write-review','_system');
    return;
  }
  // Android: use the remotely-configured store URL so this works on both Play Store and
  // AppGallery/Huawei (where market:// fails — no Play Store installed).
  // window._tkAndroidStoreUrl is set by the update-config loader from android_store_url.
  // On AppGallery builds, set android_store_url to the AppGallery listing URL in remote config.
  var url = window._tkAndroidStoreUrl || 'https://play.google.com/store/apps/details?id='+ANDROID_PKG;
  try{
    window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Browser
      ?Capacitor.Plugins.Browser.open({url:url})
      :window.open(url,'_system');
  }catch(e){window.open(url,'_system');}
}

/* ── Popup DOM ──────────────────────────────────────────────────────────── */
function _showPopup(){
  if(_popup) return;

  var overlay = document.createElement('div');
  overlay.className = 'rating-overlay';

  var box = document.createElement('div');
  box.className = 'rating-box';

  var starEl = document.createElement('div');
  starEl.className = 'rating-star';
  var starI = document.createElement('i');
  starI.className = 'fas fa-star';
  starEl.appendChild(starI);

  var title = document.createElement('div');
  title.className = 'rating-title';
  title.textContent = window.t ? window.t('rating.title') : 'ئایا تەفسیر کورد خۆشت دەوێت؟';

  var sub = document.createElement('div');
  sub.className = 'rating-sub';
  sub.textContent = window.t ? window.t('rating.sub') : 'هەڵسەنگاندنەکەت یارمەتیمان دەدات.';

  var rateBtn = document.createElement('button');
  rateBtn.className = 'rating-btn-primary';
  var rateIcon = document.createElement('i');
  rateIcon.className = 'fas fa-star';
  rateBtn.appendChild(rateIcon);
  rateBtn.appendChild(document.createTextNode(' '+(window.t ? window.t('rating.rate_now') : 'هەڵسەنگاندن')));

  var laterBtn = document.createElement('button');
  laterBtn.className = 'rating-btn-later';
  laterBtn.textContent = window.t ? window.t('rating.later') : 'دواتر';

  rateBtn.addEventListener('click',  function(){ AppRating._onRate();  });
  laterBtn.addEventListener('click', function(){ AppRating._onLater(); });
  overlay.addEventListener('click',  function(e){ if(e.target===overlay) AppRating._onLater(); });

  box.appendChild(starEl);
  box.appendChild(title);
  box.appendChild(sub);
  box.appendChild(rateBtn);
  box.appendChild(laterBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  _popup = overlay;

  // Trigger CSS transition
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){ overlay.classList.add('on'); });
  });

  // Record that we showed it (starts 30-day cooldown)
  localStorage.setItem('ratingLastPromptAt', new Date().toISOString());
}

function _hidePopup(){
  if(!_popup) return;
  _popup.classList.remove('on');
  var p = _popup; _popup = null;
  setTimeout(function(){ if(p.parentNode) p.parentNode.removeChild(p); }, 350);
}

/* ── Public API ────────────────────────────────────────────────────────── */
window.AppRating = {

  // Call once during app init — tracks launch count + first-launch date
  init: function(){ _trackLaunch(); },

  // Call from Settings "Rate" button — ALWAYS opens store page (100% visible result)
  // Does NOT use the native in-app review API, which can silently no-op on debug builds
  // or when the OS quota is exhausted.
  requestReview: function(){
    if(typeof window.toast==='function') window.toast(window.t ? window.t('toast.rating_opening') : '…بازارگەی ئەپ کرایەوە');
    if(window.H) window.H.light();
    _openStorePage();
    localStorage.setItem('ratingPromptDone','true');
  },

  // Call after meaningful engagement (e.g. finishing a reading session)
  // Shows popup only if all gate conditions pass
  checkSmartPrompt: function(){
    if(!_canShow()) return;
    setTimeout(function(){
      if(!_canShow()) return; // re-check after delay in case state changed
      _showPopup();
    }, 1800);
  },

  // Popup "Rate Now" tap — always opens store page (same reliable path as Settings button)
  // Native In-App Review API is NOT used here: it silently no-ops on debug builds and
  // when OS quota is exhausted, making it impossible to distinguish "shown" from "suppressed".
  // For any user-initiated rating tap, the store page is the correct guaranteed path.
  _onRate: function(){
    _hidePopup();
    localStorage.setItem('ratingPromptDone','true');
    if(window.H) window.H.medium();
    if(typeof window.toast==='function') window.toast(window.t ? window.t('toast.rating_opening') : '…بازارگەی ئەپ کرایەوە');
    _openStorePage();
  },
  _onLater: function(){
    _hidePopup();
    if(window.H) window.H.light();
    // ratingLastPromptAt already set; 30-day cooldown will apply automatically
  }
};

})();
