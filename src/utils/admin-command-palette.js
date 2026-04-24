(function () {
    'use strict';

    // ── Page registry ─────────────────────────────────────────────
    var PAGES = [
        // Overview
        { href: '/admin-dashboard.html',             icon: 'bar-chart-2',    label: 'Dashboard',       section: 'Overview', keywords: 'home main live' },
        { href: '/admin-analytics.html',             icon: 'trending-up',    label: 'Analytics',       section: 'Overview', keywords: 'traffic stats google' },
        { href: '/admin-search-console.html',        icon: 'search',         label: 'Search Console',  section: 'Overview', keywords: 'seo clicks impressions rankings google' },
        // Content
        { href: '/admin-messages.html',              icon: 'message-square', label: 'Messages',        section: 'Content',  keywords: 'inbox contact replies' },
        { href: '/admin-videos.html',                icon: 'video',          label: 'Videos',          section: 'Content',  keywords: 'media upload' },
        { href: '/admin-islamvoice-management.html', icon: 'radio',          label: 'IslamVoice',      section: 'Content',  keywords: 'audio series episodes' },
        { href: '/admin-gencine.html',               icon: 'gem',            label: 'Gencine',         section: 'Content',  keywords: 'tv cinema' },
        { href: '/admin-links.html',                 icon: 'link',           label: 'Links',           section: 'Content',  keywords: 'urls external' },
        { href: '/admin-translations.html',          icon: 'languages',      label: 'Translations',    section: 'Content',  keywords: 'kurdish language sorani' },
        // Site
        { href: '/admin-website.html',               icon: 'globe',          label: 'Website',         section: 'Site',     keywords: 'settings hero banner' },
        { href: '/admin-images.html',                icon: 'camera',         label: 'Site Images',     section: 'Site',     keywords: 'photos backgrounds upload' },
        { href: '/admin-schedule.html',              icon: 'calendar',       label: 'Schedule',        section: 'Site',     keywords: 'prayer times juma' },
        { href: '/admin-header-animation.html',      icon: 'wand-2',         label: 'Header',          section: 'Site',     keywords: 'animation banner top' },
        // Users
        { href: '/admin-users.html',                 icon: 'users',          label: 'Users',           section: 'Users',    keywords: 'accounts people members' },
        { href: '/admin-notifications.html',         icon: 'bell',           label: 'Notifications',   section: 'Users',    keywords: 'push alerts send' },
        { href: '/admin-reading-stats.html',         icon: 'book-open',      label: 'Reading Stats',   section: 'Users',    keywords: 'quran progress streak' },
        { href: '/admin-social-stats.html',          icon: 'share-2',        label: 'Social Stats',    section: 'Users',    keywords: 'instagram twitter followers' },
        // System
        { href: '/admin-account-management.html',    icon: 'user-cog',       label: 'Admin Accounts',  section: 'System',   keywords: 'admins roles permissions create' },
        { href: '/admin-features.html',              icon: 'layers',         label: 'Features',        section: 'System',   keywords: 'flags toggles enable disable' },
        { href: '/admin-bot-protection.html',        icon: 'shield',         label: 'Bot Protection',  section: 'System',   keywords: 'security bots captcha' },
        { href: '/admin-auth-monitor.html',          icon: 'monitor',        label: 'Auth Monitor',    section: 'System',   keywords: 'sessions login activity' },
        { href: '/admin-email-templates.html',       icon: 'mail',           label: 'Email Templates', section: 'System',   keywords: 'brevo email design' },
        { href: '/admin-database.html',              icon: 'database',       label: 'Database',        section: 'System',   keywords: 'supabase tables records' },
        { href: '/admin-updates.html',               icon: 'arrow-up-circle',label: 'Updates',         section: 'System',   keywords: 'app release version ios android' },
        { href: '/admin-audit.html',                 icon: 'shield-check',   label: 'Audit Log',       section: 'System',   keywords: 'logs history changes' },
    ];

    var SECTION_COLORS = {
        Overview: '#3b82f6',
        Content:  '#10b981',
        Site:     '#8b5cf6',
        Users:    '#f59e0b',
        System:   '#ef4444',
    };

    var RECENT_KEY = 'admin_cp_recent';
    var MAX_RECENT = 5;

    // ── State ─────────────────────────────────────────────────────
    var isOpen = false;
    var activeIdx = 0;
    var results = [];

    // ── DOM refs ──────────────────────────────────────────────────
    var overlay, dialog, input, list, hintEl;

    // ── Recent pages ──────────────────────────────────────────────
    function getRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
    }
    function addRecent(href) {
        var rec = getRecent().filter(function (h) { return h !== href; });
        rec.unshift(href);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(rec.slice(0, MAX_RECENT))); } catch (e) {}
    }

    // ── Search ────────────────────────────────────────────────────
    function search(q) {
        if (!q || !q.trim()) {
            var rec = getRecent();
            if (rec.length) {
                return rec.map(function (h) { return PAGES.find(function (p) { return p.href === h; }); })
                          .filter(Boolean)
                          .slice(0, MAX_RECENT);
            }
            return PAGES.slice(0, 8);
        }
        var lower = q.toLowerCase();
        return PAGES.filter(function (p) {
            return p.label.toLowerCase().includes(lower) ||
                   p.section.toLowerCase().includes(lower) ||
                   p.keywords.toLowerCase().includes(lower);
        }).slice(0, 10);
    }

    // ── Render ────────────────────────────────────────────────────
    function renderList() {
        list.textContent = '';

        if (!results.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:32px;text-align:center;color:var(--cp-muted);font-size:13px;';
            empty.textContent = 'No pages found';
            list.appendChild(empty);
            return;
        }

        var q = input.value.toLowerCase();

        results.forEach(function (page, i) {
            var item = document.createElement('div');
            item.className = 'cp-item' + (i === activeIdx ? ' cp-item-active' : '');
            item.dataset.idx = i;

            // Icon
            var iconWrap = document.createElement('div');
            iconWrap.className = 'cp-item-icon';
            iconWrap.style.background = (SECTION_COLORS[page.section] || '#6b7280') + '18';
            var ic = document.createElement('i');
            ic.setAttribute('data-lucide', page.icon);
            ic.style.color = SECTION_COLORS[page.section] || '#6b7280';
            iconWrap.appendChild(ic);

            // Label with highlighted match
            var labelEl = document.createElement('span');
            labelEl.className = 'cp-item-label';
            if (q) {
                var lower = page.label.toLowerCase();
                var idx = lower.indexOf(q);
                if (idx !== -1) {
                    labelEl.appendChild(document.createTextNode(page.label.slice(0, idx)));
                    var mark = document.createElement('mark');
                    mark.style.cssText = 'background:rgba(59,130,246,.28);color:inherit;border-radius:2px;padding:0 1px;';
                    mark.textContent = page.label.slice(idx, idx + q.length);
                    labelEl.appendChild(mark);
                    labelEl.appendChild(document.createTextNode(page.label.slice(idx + q.length)));
                } else {
                    labelEl.textContent = page.label;
                }
            } else {
                labelEl.textContent = page.label;
            }

            // Section badge
            var sectionEl = document.createElement('span');
            sectionEl.className = 'cp-item-section';
            sectionEl.textContent = page.section;
            sectionEl.style.color = SECTION_COLORS[page.section] || '#6b7280';
            sectionEl.style.background = (SECTION_COLORS[page.section] || '#6b7280') + '14';

            item.appendChild(iconWrap);
            item.appendChild(labelEl);
            item.appendChild(sectionEl);

            item.addEventListener('mouseenter', function () {
                activeIdx = i;
                renderList();
            });
            item.addEventListener('click', function () { navigate(page); });

            list.appendChild(item);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: Array.from(list.querySelectorAll('i[data-lucide]')) });
        }
    }

    function render() {
        results = search(input.value);
        activeIdx = 0;
        renderList();
    }

    // ── Open / close ──────────────────────────────────────────────
    function open() {
        if (isOpen) return;
        isOpen = true;
        overlay.style.display = 'flex';
        // trigger animation
        requestAnimationFrame(function () {
            dialog.style.opacity = '1';
            dialog.style.transform = 'translateY(0) scale(1)';
        });
        input.value = '';
        render();
        setTimeout(function () { input.focus(); }, 30);
    }

    function close() {
        if (!isOpen) return;
        dialog.style.opacity = '0';
        dialog.style.transform = 'translateY(-8px) scale(0.97)';
        setTimeout(function () {
            isOpen = false;
            overlay.style.display = 'none';
        }, 160);
    }

    function navigate(page) {
        addRecent(page.href);
        close();
        setTimeout(function () { window.location.href = page.href; }, 80);
    }

    // ── Keyboard ──────────────────────────────────────────────────
    function onGlobalKey(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            isOpen ? close() : open();
            return;
        }
        if (!isOpen) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIdx = Math.min(activeIdx + 1, results.length - 1);
            renderList();
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIdx = Math.max(activeIdx - 1, 0);
            renderList();
            return;
        }
        if (e.key === 'Enter') {
            if (results[activeIdx]) navigate(results[activeIdx]);
            return;
        }
    }

    // ── Build DOM ─────────────────────────────────────────────────
    function buildStyles() {
        var s = document.createElement('style');
        s.textContent = [
            ':root{--cp-bg:#ffffff;--cp-border:#e5e7eb;--cp-input-bg:#f9fafb;--cp-text:#111827;--cp-muted:#9ca3af;--cp-hover:#f3f4f6;--cp-active:#eff6ff;--cp-active-border:#3b82f6;}',
            '.dark-mode,:root[data-theme="dark"]{--cp-bg:#1a1a1a;--cp-border:#2a2a2a;--cp-input-bg:#111111;--cp-text:#f1f5f9;--cp-muted:#6b7280;--cp-hover:#222222;--cp-active:#1e3a5f;--cp-active-border:#3b82f6;}',
            '[data-theme="sakina"]{--cp-bg:#162d1f;--cp-border:#1e3828;--cp-input-bg:#1c3827;--cp-text:#f0e6c8;--cp-muted:#6b5c3e;--cp-hover:#1c3827;--cp-active:#243d2e;--cp-active-border:#c9a84c;}',
            '[data-theme="noor"]{--cp-bg:#fdf4e3;--cp-border:#d9c9a8;--cp-input-bg:#f0e2c4;--cp-text:#1a0e04;--cp-muted:#9b7650;--cp-hover:#f0e2c4;--cp-active:#e8d4a8;--cp-active-border:#1a5c3a;}',

            '#cp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:99999;display:none;align-items:flex-start;justify-content:center;padding-top:14vh;}',

            '#cp-dialog{background:var(--cp-bg);border:1px solid var(--cp-border);border-radius:16px;width:100%;max-width:560px;box-shadow:0 24px 60px rgba(0,0,0,.22);overflow:hidden;opacity:0;transform:translateY(-8px) scale(0.97);transition:opacity .15s ease,transform .15s ease;}',

            '#cp-input-wrap{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--cp-border);}',
            '#cp-input-wrap i{width:17px;height:17px;color:var(--cp-muted);flex-shrink:0;}',
            '#cp-input{flex:1;background:none;border:none;outline:none;font-size:15px;color:var(--cp-text);font-family:inherit;}',
            '#cp-input::placeholder{color:var(--cp-muted);}',
            '#cp-input-wrap .cp-hint{font-size:11px;font-weight:600;color:var(--cp-muted);background:var(--cp-hover);border:1px solid var(--cp-border);padding:2px 7px;border-radius:6px;white-space:nowrap;flex-shrink:0;}',

            '#cp-list{max-height:360px;overflow-y:auto;padding:6px;}',
            '#cp-list::-webkit-scrollbar{width:4px;}',
            '#cp-list::-webkit-scrollbar-thumb{background:var(--cp-border);border-radius:4px;}',

            '.cp-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;transition:background .1s;}',
            '.cp-item:hover,.cp-item-active{background:var(--cp-active);}',
            '.cp-item-active{outline:1px solid var(--cp-active-border);}',
            '.cp-item-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
            '.cp-item-icon i{width:15px;height:15px;}',
            '.cp-item-label{flex:1;font-size:13px;font-weight:500;color:var(--cp-text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.cp-item-section{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0;}',

            '#cp-footer{display:flex;align-items:center;gap:14px;padding:9px 16px;border-top:1px solid var(--cp-border);background:var(--cp-input-bg);}',
            '.cp-key{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--cp-muted);}',
            '.cp-kbd{background:var(--cp-hover);border:1px solid var(--cp-border);border-radius:5px;padding:1px 6px;font-size:10px;font-family:inherit;color:var(--cp-muted);}'
        ].join('');
        document.head.appendChild(s);
    }

    function buildDOM() {
        overlay = document.createElement('div');
        overlay.id = 'cp-overlay';
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

        dialog = document.createElement('div');
        dialog.id = 'cp-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', 'Command palette');

        // Input row
        var inputWrap = document.createElement('div');
        inputWrap.id = 'cp-input-wrap';
        var searchIcon = document.createElement('i');
        searchIcon.setAttribute('data-lucide', 'search');
        input = document.createElement('input');
        input.id = 'cp-input';
        input.type = 'text';
        input.placeholder = 'Search pages...';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('spellcheck', 'false');
        input.addEventListener('input', render);
        var hint = document.createElement('span');
        hint.className = 'cp-hint';
        hint.textContent = 'ESC';
        inputWrap.appendChild(searchIcon);
        inputWrap.appendChild(input);
        inputWrap.appendChild(hint);

        // List
        list = document.createElement('div');
        list.id = 'cp-list';

        // Footer
        var footer = document.createElement('div');
        footer.id = 'cp-footer';
        [
            [['↑', '↓'], 'Navigate'],
            [['↵'], 'Open'],
            [['Esc'], 'Close'],
        ].forEach(function (pair) {
            var key = document.createElement('span');
            key.className = 'cp-key';
            pair[0].forEach(function (k) {
                var kbd = document.createElement('kbd');
                kbd.className = 'cp-kbd';
                kbd.textContent = k;
                key.appendChild(kbd);
            });
            key.appendChild(document.createTextNode(' ' + pair[1]));
            footer.appendChild(key);
        });

        dialog.appendChild(inputWrap);
        dialog.appendChild(list);
        dialog.appendChild(footer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [searchIcon] });
        }
    }

    function injectTopbarTrigger() {
        var actions = document.querySelector('.topbar-actions');
        if (!actions) return;
        var btn = document.createElement('button');
        btn.className = 'topbar-btn';
        btn.title = 'Command palette (Ctrl+K / ⌘K)';
        btn.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--text-tertiary);padding:6px 10px;border-radius:8px;white-space:nowrap;';
        var ic = document.createElement('i');
        ic.setAttribute('data-lucide', 'command');
        btn.appendChild(ic);
        var label = document.createElement('span');
        var isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        label.textContent = isMac ? '⌘K' : 'Ctrl K';
        btn.appendChild(label);
        btn.addEventListener('click', open);
        // Insert before session timer
        var timer = actions.querySelector('#sessionTimer');
        actions.insertBefore(btn, timer || actions.firstChild);
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [ic] });
        }
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        buildStyles();
        buildDOM();
        injectTopbarTrigger();
        document.addEventListener('keydown', onGlobalKey);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.cmdPalette = { open: open, close: close };
})();
