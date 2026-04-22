// Admin Theme Loader — light / dark / sakina / noor
// Runs immediately in <head> — synchronous flash prevention + DOMContentLoaded wiring

(function () {
    var NEXT  = { light: 'dark', dark: 'sakina', sakina: 'noor', noor: 'light' };
    // Icon shown while ON that theme (represents the current state)
    var ICONS = { light: 'sun', dark: 'moon', sakina: 'star', noor: 'sunrise' };

    function _saved() {
        try { return localStorage.getItem('admin-theme') || 'light'; } catch (e) { return 'light'; }
    }

    function _applyTheme(theme) {
        var isDark = theme === 'dark' || theme === 'sakina';

        // Body classes + attribute
        document.body.classList.toggle('dark-mode', isDark);
        document.body.setAttribute('data-admin-theme', theme);

        // Html stays in sync (flash prevention for next load)
        document.documentElement.classList.toggle('dark-mode', isDark);
        document.documentElement.setAttribute('data-admin-theme', theme);

        // Icon
        var ti = document.getElementById('theme-icon');
        if (ti) {
            ti.setAttribute('data-lucide', ICONS[theme] || 'sun');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        try { localStorage.setItem('admin-theme', theme); } catch (e) {}
    }

    // ── 1. Flash prevention: run synchronously before first paint ──
    try {
        var t0 = _saved();
        if (t0 === 'dark' || t0 === 'sakina') {
            document.documentElement.classList.add('dark-mode');
        }
        document.documentElement.setAttribute('data-admin-theme', t0);
    } catch (e) {}

    // ── 2. DOM ready ──
    document.addEventListener('DOMContentLoaded', function () {
        _applyTheme(_saved());

        // Replace toggle button to strip old per-page listeners, add new one
        var btn = document.getElementById('theme-toggle');
        if (btn) {
            var nb = btn.cloneNode(true);
            btn.parentNode.replaceChild(nb, btn);
            nb.addEventListener('click', function () {
                _applyTheme(NEXT[_saved()] || 'dark');
            });
        }

        // Keep html.dark-mode in sync whenever body class changes
        if (window.MutationObserver) {
            new MutationObserver(function () {
                document.documentElement.classList.toggle(
                    'dark-mode', document.body.classList.contains('dark-mode')
                );
            }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
    });
})();
