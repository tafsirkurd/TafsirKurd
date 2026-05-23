// Shared theme utility for all public website pages (not admin)
// Include as <script src="/utils/site-theme.js"></script> in <head> (no defer/async)
// Handles flash-prevention on parse + exposes window.SiteTheme API

(function () {
    var THEMES = [
        { id: 'noor',   name: 'نوور',   sub: 'Parchment', bg: '#f4e8cc', card: '#fdf4e3', accent: '#1a5c3a' },
        { id: 'sakina', name: 'سکینە',  sub: 'Emerald',   bg: '#0c1c12', card: '#112318', accent: '#c9a84c' },
        { id: 'light',  name: 'ڕووناک', sub: 'Light',     bg: '#fafafa', card: '#ffffff', accent: '#000000' },
        { id: 'dark',   name: 'تاریکی', sub: 'Dark',      bg: '#0a0a0a', card: '#1a1a1a', accent: '#ffffff' },
    ];
    var BG = { noor: '#f4e8cc', sakina: '#0c1c12', light: '#fafafa', dark: '#0a0a0a' };
    var DARK = ['dark', 'sakina'];

    function current() {
        try {
            var t = localStorage.getItem('theme');
            if (!t) {
                var p = JSON.parse(localStorage.getItem('userPreferences') || '{}');
                t = p.darkMode ? 'dark' : 'noor';
            }
            return THEMES.find(function(th){ return th.id === t; }) ? t : 'noor';
        } catch (e) { return 'noor'; }
    }

    function set(id) {
        if (!BG[id]) return;
        try { localStorage.setItem('theme', id); } catch (e) {}
        var bg = BG[id];
        var isDark = DARK.indexOf(id) !== -1;
        var el = document.documentElement;
        el.setAttribute('data-theme', id);
        el.style.background = bg;
        el.style.backgroundColor = bg;
        el.style.setProperty('--bg', bg);
        el.style.colorScheme = isDark ? 'dark' : 'light';
        // Sync all picker dots in FAB
        document.querySelectorAll('[data-theme-pick]').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-theme-pick') === id);
        });
        // Sync theme grid cards in settings
        document.querySelectorAll('.site-theme-card').forEach(function (card) {
            card.classList.toggle('on', card.getAttribute('data-theme-id') === id);
        });
    }

    // ── Flash prevention: runs synchronously on script parse ──
    try {
        var t0 = current();
        var el = document.documentElement;
        el.setAttribute('data-theme', t0);
        el.style.background = BG[t0];
        el.style.backgroundColor = BG[t0];
        el.style.setProperty('--bg', BG[t0]);
        el.style.colorScheme = DARK.indexOf(t0) !== -1 ? 'dark' : 'light';
        el.classList.add('preload');
    } catch (e) {}

    window.SiteTheme = { themes: THEMES, current: current, set: set };

    // Universal logo filter rules — one place, all public pages
    var S = '[data-theme="light"]  %{filter:brightness(0) invert(1)!important}' +
            '[data-theme="dark"]   %{filter:brightness(0) invert(1)!important}' +
            '[data-theme="noor"]   %{filter:none!important}'                    +
            '[data-theme="sakina"] %{filter:brightness(0) saturate(100%) invert(68%) sepia(31%) saturate(860%) hue-rotate(8deg) brightness(94%)!important}';
    var LOGO_SEL = '.logo-image,.hero-logo-static,.nav-dropdown-img,.footer-logo img';
    var st = document.createElement('style');
    st.id = 'tk-logo-filters';
    st.textContent = S.replace(/%/g, LOGO_SEL);
    document.head.appendChild(st);
})();
