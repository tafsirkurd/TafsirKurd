/* safe-load-script.js — guarded dynamic script loading + feature error display
   Exposes:
     window.safeLoadScript(src, onLoad, onError)  — load a script with error handling
     window._showFeatureError(featureName)         — show a dismissible error banner
*/
(function(){
  var _errorBanners = {};

  window._showFeatureError = function(featureName) {
    if (_errorBanners[featureName]) return;
    _errorBanners[featureName] = true;
    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;bottom:80px;left:16px;right:16px;z-index:9999;background:#333;color:#fff;padding:12px 14px;border-radius:10px;font-size:13px;direction:rtl;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.4);';
    var txt = document.createElement('span');
    txt.textContent = (featureName || 'تایبەتمەندییەک') + ' بار نەبوو. ئینتەرنێت بپشکنێ.';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;flex-shrink:0;';
    closeBtn.onclick = function(){
      if(banner.parentNode) banner.parentNode.removeChild(banner);
      setTimeout(function(){ _errorBanners[featureName] = false; }, 5000);
    };
    banner.appendChild(txt);
    banner.appendChild(closeBtn);
    document.body.appendChild(banner);
    setTimeout(function(){
      if(banner.parentNode) banner.parentNode.removeChild(banner);
      setTimeout(function(){ _errorBanners[featureName] = false; }, 1000);
    }, 8000);
  };

  window.safeLoadScript = function(src, onLoad, onError) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function() { if(onLoad) { try { onLoad(); } catch(e) {} } };
    s.onerror = function() {
      console.warn('[safeLoadScript] Failed to load:', src);
      if(onError) { try { onError(src); } catch(e) {} }
    };
    document.body.appendChild(s);
  };
})();
