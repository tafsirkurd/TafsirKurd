// Runs synchronously from <head> — hides page before first paint
// Prevents any flash of protected content while async auth completes
;(function () {
    try {
        var token = sessionStorage.getItem('adminToken');
        if (!token) {
            var raw = localStorage.getItem('adminGraceToken');
            if (raw) {
                var g = JSON.parse(raw);
                if (g && g.token && (Date.now() - g.at) < 180000) token = g.token;
            }
        }
        if (!token) {
            if (!window.location.pathname.includes('admin-login')) {
                window.location.replace('/admin-login.html');
            }
            return;
        }
        // Cloak page until auth resolves
        document.documentElement.style.visibility = 'hidden';

        // Instant cached permission check — redirect before paint if denied
        var role = sessionStorage.getItem('adminRole');
        if (role && role !== 'super_admin') {
            var cachedPerms = null;
            try { cachedPerms = JSON.parse(sessionStorage.getItem('adminPermissions') || 'null'); } catch (e) {}
            if (cachedPerms && cachedPerms.length > 0) {
                var m = window.location.pathname.match(/\/admin-([^.]+)/);
                var slug = m ? m[1] : null;
                if (slug) {
                    var perm = cachedPerms.find(function (p) { return p.page_slug === slug; });
                    if (!perm || !perm.can_view) {
                        // Redirect to the first page this user IS allowed to see,
                        // not always dashboard (which they may also lack permission for).
                        var firstAllowed = cachedPerms.find(function (p) { return p.can_view && /^[a-z0-9-]+$/.test(p.page_slug); });
                        var dest = firstAllowed ? '/admin-' + firstAllowed.page_slug + '.html' : '/admin-login.html';
                        window.location.replace(dest + '?denied=' + encodeURIComponent(slug));
                    }
                }
            }
        }
    } catch (e) {}
})();

// Load max-security features on every authenticated admin page
(function () {
    if (window.location.pathname.includes('admin-login')) return;
    function loadScript(src) {
        var s = document.createElement('script');
        s.src = src;
        s.defer = true;
        (document.head || document.documentElement).appendChild(s);
    }
    loadScript('/utils/admin-security-max.js?v=1');
})();
