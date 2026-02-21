window.isNativePlatform = (function() {
  try {
    return window.Capacitor && window.Capacitor.isNativePlatform();
  } catch(e) {
    return false;
  }
})();
