(function () {
    'use strict';

    var h = window.location.hostname;
    var isProd = h !== 'localhost' && !h.includes('127.0.0.1') && !h.includes('.pages.dev');

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
