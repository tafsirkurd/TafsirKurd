// Runs synchronously from <head> — hides page before first paint
// Prevents any flash of protected content while async auth completes
(function () {
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
                        window.location.replace('/admin-dashboard.html?denied=' + encodeURIComponent(slug));
                    }
                }
            }
        }
    } catch (e) {}
})();
