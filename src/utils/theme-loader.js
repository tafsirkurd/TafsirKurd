// Admin Theme Loader + Sidebar Scroll Persistence
// Runs immediately in <head> — must stay small and synchronous

(function() {
    // ── 1. Flash prevention: apply dark mode to <html> before first paint ──
    try {
        var savedTheme = localStorage.getItem('admin-theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-mode');
        }
    } catch (e) {}

    // ── 2. After DOM ready ──
    document.addEventListener('DOMContentLoaded', function () {

        // 2a. Move dark-mode class from <html> to <body> so body.dark-mode rules apply
        if (document.documentElement.classList.contains('dark-mode')) {
            document.body.classList.add('dark-mode');
        }

        // 2b. Keep html.dark-mode in sync whenever body.dark-mode is toggled
        //     (so the flash prevention works on the NEXT page load too)
        if (window.MutationObserver) {
            new MutationObserver(function () {
                var isDark = document.body.classList.contains('dark-mode');
                document.documentElement.classList.toggle('dark-mode', isDark);
            }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }

        // ── 3. Sidebar scroll position persistence ──
        var SCROLL_KEY = 'adminSidebarScroll';
        var nav = document.querySelector('.sidebar-nav');
        if (nav) {
            var savedScroll = parseInt(sessionStorage.getItem(SCROLL_KEY), 10) || 0;

            function applyScroll() {
                if (savedScroll > 0) nav.scrollTop = savedScroll;
            }

            // Try immediately (works if sidebar already visible)
            applyScroll();

            // admin-auth.js calls sidebarNav.style.visibility = 'visible' after auth check.
            // That style mutation resets scrollTop, so we re-apply right after it fires.
            if (window.MutationObserver && savedScroll > 0) {
                var revealObs = new MutationObserver(function () {
                    applyScroll();
                    revealObs.disconnect();
                });
                revealObs.observe(nav, { attributes: true, attributeFilter: ['style'] });
            }

            // Save position whenever a nav link is clicked
            nav.addEventListener('click', function (e) {
                if (e.target.closest('a.nav-item')) {
                    sessionStorage.setItem(SCROLL_KEY, nav.scrollTop);
                }
            });
        }
    });
})();
