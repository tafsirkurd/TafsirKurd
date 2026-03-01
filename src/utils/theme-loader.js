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

        // ── 3. Scroll active nav item into view in the sidebar ──
        // Instead of saving/restoring pixel offsets (fragile with auth timing),
        // we simply ensure the current page's active nav item is visible.
        var nav = document.querySelector('.sidebar-nav');
        if (nav) {
            var activeItem = nav.querySelector('.nav-item.active');

            function scrollActiveIntoView() {
                if (activeItem) {
                    activeItem.scrollIntoView({ block: 'nearest' });
                }
            }

            // Try immediately (sidebar may already be visible from early inline script)
            scrollActiveIntoView();

            // admin-auth.js sets sidebarNav.style.visibility after async auth check.
            // Re-run scrollIntoView right after that style change fires.
            if (window.MutationObserver) {
                var revealObs = new MutationObserver(function () {
                    scrollActiveIntoView();
                    revealObs.disconnect();
                });
                revealObs.observe(nav, { attributes: true, attributeFilter: ['style'] });
            }
        }
    });
})();
