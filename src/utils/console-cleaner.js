(function () {
    'use strict';

    var h = window.location.hostname;
    // Silence in production web AND in Capacitor native app (hostname = localhost,
    // but Capacitor.isNativePlatform() is not yet available this early).
    // We check both the domain AND the capacitor:// protocol.
    var isProd = h === 'tafsirkurd.com' || h === 'www.tafsirkurd.com'
      || window.location.protocol === 'capacitor:';

    if (!isProd) return;

    var noop = function () {};
    var methods = ['log','debug','info','warn','error','table','dir','dirxml',
                   'group','groupCollapsed','groupEnd','trace','assert','count',
                   'countReset','time','timeEnd','timeLog','profile','profileEnd'];

    for (var i = 0; i < methods.length; i++) {
        try { console[methods[i]] = noop; } catch (e) {}
    }

    try { console.clear(); } catch (e) {}
})();
