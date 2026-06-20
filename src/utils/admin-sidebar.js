// admin-sidebar.js — single source of truth for the admin sidebar nav.
// Replaces <nav class="sidebar-nav"> content on every admin page.
// Active item is auto-detected from window.location.pathname.
(function () {
    var NAV = [
        {
            section: 'Overview', items: [
                { href: '/admin-dashboard.html',       icon: 'bar-chart-2',    label: 'Dashboard',        badge: 'Live' },
                { href: '/admin-analytics.html',        icon: 'trending-up',    label: 'Analytics' },
                { href: '/admin-search-console.html',   icon: 'search',         label: 'Search Console' },
                { href: '/admin-tasks.html',            icon: 'check-square',   label: 'Tasks' },
            ]
        },
        {
            section: 'Content', items: [
                { href: '/admin-messages.html',              icon: 'message-square', label: 'Messages',    badgeId: 'messages-badge' },
                { href: '/admin-videos.html',                icon: 'video',          label: 'Videos' },
                { href: '/admin-islamvoice-management.html', icon: 'radio',          label: 'IslamVoice' },
                { href: '/admin-gencine.html',               icon: 'gem',            label: 'Gencine' },
                { href: '/admin-links.html',                 icon: 'link',           label: 'Links' },
                { href: '/admin-translations.html',          icon: 'languages',      label: 'Translations' },
            ]
        },
        {
            section: 'Site', items: [
                { href: '/admin-website.html',          icon: 'globe',      label: 'Website' },
                { href: '/admin-images.html',           icon: 'camera',     label: 'Site Images' },
                { href: '/admin-header-animation.html', icon: 'wand-2',     label: 'Header' },
            ]
        },
        {
            section: 'Users', items: [
                { href: '/admin-users.html',                    icon: 'users',       label: 'Users' },
                { href: '/admin-notifications.html',            icon: 'bell',        label: 'Notifications' },
                { href: '/admin-notification-analytics.html',   icon: 'bar-chart-2', label: 'Notif Analytics' },
                { href: '/admin-social-stats.html',             icon: 'share-2',     label: 'Social Stats' },
            ]
        },
        {
            section: 'Monitoring', items: [
                { href: '/admin-errors.html',           icon: 'triangle-alert', label: 'App Errors' },
                { href: '/admin-app-versions.html',     icon: 'smartphone',     label: 'App Versions' },
                { href: '/admin-db-health.html',        icon: 'activity',       label: 'DB Health' },
                { href: '/admin-system-health.html',    icon: 'shield-check',   label: 'System Health' },
                { href: '/admin-widget-health.html',    icon: 'layout-grid',    label: 'Widget Health' },
                { href: '/admin-codemagic.html',        icon: 'rocket',         label: 'iOS Builds' },
                { href: '/admin-release-history.html',  icon: 'git-branch',     label: 'Release History' },
                { href: '/admin-jobs.html',             icon: 'clock',          label: 'Jobs' },
            ]
        },
        {
            section: 'Security', items: [
                { href: '/admin-bot-protection.html',   icon: 'shield',         label: 'Bot Protection' },
                { href: '/admin-auth-monitor.html',     icon: 'monitor',        label: 'Auth Monitor' },
                { href: '/admin-audit.html',            icon: 'shield-check',   label: 'Audit Log' },
            ]
        },
        {
            section: 'Settings', items: [
                { href: '/admin-account-management.html',   icon: 'user-cog',       label: 'Admin Accounts' },
                { href: '/admin-email-templates.html',      icon: 'mail',           label: 'Email Templates' },
                { href: '/admin-database.html',             icon: 'database',       label: 'Database' },
                { href: '/admin-updates.html',              icon: 'arrow-up-circle',label: 'Updates' },
                { href: '/admin-features.html',             icon: 'toggle-left',    label: 'Features' },
                { href: '/admin-schedule.html',             icon: 'calendar',       label: 'Schedule' },
            ]
        },
    ];

    function render() {
        var nav = document.querySelector('.sidebar-nav');
        if (!nav) return;
        var current = window.location.pathname.replace(/\/$/, '') || '/';
        var html = '';
        for (var s = 0; s < NAV.length; s++) {
            var sec = NAV[s];
            html += '<div class="nav-section"><div class="nav-section-header">' + sec.section + '</div>';
            for (var i = 0; i < sec.items.length; i++) {
                var item   = sec.items[i];
                var active = (current === item.href || current === item.href.replace(/\.html$/, ''));
                html += '<a href="' + item.href + '" class="nav-item' + (active ? ' active' : '') + '">';
                html += '<i data-lucide="' + item.icon + '"></i>';
                html += '<span class="nav-item-label">' + item.label + '</span>';
                if (item.badge)   html += '<span class="nav-item-badge">' + item.badge + '</span>';
                if (item.badgeId) html += '<span class="nav-item-badge" id="' + item.badgeId + '"></span>';
                html += '</a>';
            }
            html += '</div>';
        }
        nav.innerHTML = html;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
