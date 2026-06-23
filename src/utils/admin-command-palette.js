(function () {
    'use strict';

    // ── Page registry ─────────────────────────────────────────────
    var PAGES = [
        // Overview
        { href: '/admin-dashboard.html',             icon: 'bar-chart-2',    label: 'Dashboard',         section: 'Overview',   keywords: 'home main live' },
        { href: '/admin-analytics.html',             icon: 'trending-up',    label: 'Analytics',         section: 'Overview',   keywords: 'traffic stats google' },
        { href: '/admin-search-console.html',        icon: 'search',         label: 'Search Console',    section: 'Overview',   keywords: 'seo clicks impressions rankings google' },
        { href: '/admin-tasks.html',                 icon: 'check-square',   label: 'Tasks & Goals',     section: 'Overview',   keywords: 'todo goals tasks personal planning checklist' },
        // Content
        { href: '/admin-messages.html',              icon: 'message-square', label: 'Messages',          section: 'Content',    keywords: 'inbox contact replies' },
        { href: '/admin-videos.html',                icon: 'video',          label: 'Videos',            section: 'Content',    keywords: 'media upload' },
        { href: '/admin-islamvoice-management.html', icon: 'radio',          label: 'IslamVoice',        section: 'Content',    keywords: 'audio series episodes' },
        { href: '/admin-gencine.html',               icon: 'gem',            label: 'Gencine',           section: 'Content',    keywords: 'tv cinema duas hadiths' },
        { href: '/admin-links.html',                 icon: 'link',           label: 'Links',             section: 'Content',    keywords: 'urls external' },
        { href: '/admin-translations.html',          icon: 'languages',      label: 'Translations',      section: 'Content',    keywords: 'kurdish language sorani' },
        // Site
        { href: '/admin-website.html',               icon: 'globe',          label: 'Website',           section: 'Site',       keywords: 'settings hero banner popup' },
        { href: '/admin-images.html',                icon: 'camera',         label: 'Site Images',       section: 'Site',       keywords: 'photos backgrounds upload' },
        { href: '/admin-header-animation.html',      icon: 'wand-2',         label: 'Header',            section: 'Site',       keywords: 'animation banner top' },
        // Users
        { href: '/admin-users.html',                 icon: 'users',          label: 'Users',             section: 'Users',      keywords: 'accounts people members' },
        { href: '/admin-notifications.html',         icon: 'bell',           label: 'Notifications',     section: 'Users',      keywords: 'push alerts send' },
        { href: '/admin-notification-analytics.html',icon: 'bar-chart-2',    label: 'Notif Analytics',   section: 'Users',      keywords: 'push stats delivery' },
        { href: '/admin-social-stats.html',          icon: 'share-2',        label: 'Social Stats',      section: 'Users',      keywords: 'instagram twitter followers' },
        // Monitoring
        { href: '/admin-errors.html',                icon: 'triangle-alert', label: 'App Errors',        section: 'Monitoring', keywords: 'crashes bugs javascript logs' },
        { href: '/admin-app-versions.html',          icon: 'smartphone',     label: 'App Versions',      section: 'Monitoring', keywords: 'ios android build release devices' },
        { href: '/admin-db-health.html',             icon: 'activity',       label: 'DB Health',         section: 'Monitoring', keywords: 'database performance supabase' },
        { href: '/admin-jobs.html',                  icon: 'clock',          label: 'Jobs',              section: 'Monitoring', keywords: 'cron tasks scheduled workers' },
        // Security
        { href: '/admin-bot-protection.html',        icon: 'shield',         label: 'Bot Protection',    section: 'Security',   keywords: 'security bots captcha' },
        { href: '/admin-auth-monitor.html',          icon: 'monitor',        label: 'Auth Monitor',      section: 'Security',   keywords: 'sessions login activity' },
        { href: '/admin-audit.html',                 icon: 'shield-check',   label: 'Audit Log',         section: 'Security',   keywords: 'logs history changes' },
        // Settings
        { href: '/admin-account-management.html',    icon: 'user-cog',       label: 'Admin Accounts',    section: 'Settings',   keywords: 'admins roles permissions create' },
        { href: '/admin-email-templates.html',       icon: 'mail',           label: 'Email Templates',   section: 'Settings',   keywords: 'brevo email design' },
        { href: '/admin-database.html',              icon: 'database',       label: 'Database',          section: 'Settings',   keywords: 'supabase tables records' },
        { href: '/admin-updates.html',               icon: 'arrow-up-circle',label: 'Updates',           section: 'Settings',   keywords: 'app release version ios android' },
    ];

    // ── Quick actions ─────────────────────────────────────────────
    var ACTIONS = [
        { id: 'theme',        icon: 'moon',        label: 'Toggle Theme',     section: 'Action', keywords: 'dark light mode sakina noor' },
        { id: 'refresh',      icon: 'refresh-cw',  label: 'Refresh Page',     section: 'Action', keywords: 'reload' },
        { id: 'logout',       icon: 'log-out',     label: 'Log Out',          section: 'Action', keywords: 'sign out exit' },
        { id: 'note-open',    icon: 'sticky-note', label: 'Open Notes',       section: 'Notes',  keywords: 'notes panel open quick' },
        { id: 'note-capture', icon: 'file-plus',   label: 'New Note',         section: 'Notes',  keywords: 'create note idea add capture write' },
        { id: 'note-focus',   icon: 'target',      label: "Today's Focus",    section: 'Notes',  keywords: 'focus goal priority today aim' },
        { id: 'note-search',  icon: 'search',      label: 'Search Notes',     section: 'Notes',  keywords: 'find note search lookup' },
    ];

    var SECTION_COLORS = {
        Overview:   '#3b82f6',
        Content:    '#10b981',
        Site:       '#8b5cf6',
        Users:      '#f59e0b',
        Monitoring: '#06b6d4',
        Security:   '#ef4444',
        Settings:   '#6b7280',
        Action:     '#a855f7',
        Notes:      '#f59e0b',
    };

    var RECENT_KEY = 'admin_cp_recent';
    var MAX_RECENT = 5;

    // ── Permission-filtered page list ─────────────────────────────
    // Returns only the pages this user is allowed to see.
    // Super-admins see everything. All other roles see ONLY their assigned pages.
    // Never falls back to showing all pages — if perms aren't loaded yet, returns [].
    function visiblePages() {
        var role = sessionStorage.getItem('adminRole');
        if (!role) return [];                    // auth not done yet — show nothing
        if (role === 'super_admin') return PAGES; // super admin sees everything

        var perms = [];
        try { perms = JSON.parse(sessionStorage.getItem('adminPermissions') || '[]'); } catch(e) {}

        // If no permissions in cache yet, also return [] — the palette will show a loading hint
        if (!perms.length) return [];

        return PAGES.filter(function (page) {
            var m = page.href.match(/\/admin-([^.]+)\.html/);
            var slug = m ? m[1] : null;
            if (!slug) return true;
            var p = perms.find(function (p) { return p.page_slug === slug; });
            return p && p.can_view;
        });
    }

    // Strip recently-visited hrefs that the current user can no longer see
    function visibleRecent() {
        var allowed = visiblePages().map(function (p) { return p.href; });
        return getRecent().filter(function (h) { return allowed.indexOf(h) !== -1; });
    }

    // ── State ─────────────────────────────────────────────────────
    var isOpen = false;
    var activeIdx = 0;
    var results = [];   // array of {type:'page'|'action', data, _section?}
    var currentHref = window.location.pathname;

    // ── DOM refs ──────────────────────────────────────────────────
    var overlay, dialog, input, list;

    // ── Recent pages ──────────────────────────────────────────────
    function getRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
    }
    function addRecent(href) {
        var rec = getRecent().filter(function (h) { return h !== href; });
        rec.unshift(href);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(rec.slice(0, MAX_RECENT))); } catch (e) {}
    }

    // ── Search — returns flat list with injected section-header sentinels ──
    function search(q) {
        var flat = [];
        var allowed = visiblePages();

        // Permissions not loaded yet — show loading hint + actions only
        if (!allowed.length) {
            var role = sessionStorage.getItem('adminRole');
            if (role && role !== 'super_admin') {
                flat.push({ type: 'header', label: 'Pages' });
                // Will be empty — just show actions
            }
            flat.push({ type: 'header', label: 'Actions' });
            ACTIONS.forEach(function (a) { flat.push({ type: 'action', data: a }); });
            return flat;
        }

        if (!q || !q.trim()) {
            // Show recent pages (filtered to allowed only), then pages grouped by section
            var rec = visibleRecent();
            if (rec.length) {
                flat.push({ type: 'header', label: 'Recently Visited' });
                rec.forEach(function (h) {
                    var p = allowed.find(function (pg) { return pg.href === h; });
                    if (p) flat.push({ type: 'page', data: p });
                });
            }
            // Group by section — only sections that have at least one allowed page
            var sections = ['Overview', 'Content', 'Site', 'Users', 'Monitoring', 'Security', 'Settings'];
            var hasAnySectionPages = false;
            sections.forEach(function (sec) {
                var items = allowed.filter(function (p) { return p.section === sec; });
                if (items.length) {
                    if (!hasAnySectionPages) { flat.push({ type: 'header', label: 'Pages' }); hasAnySectionPages = true; }
                    flat.push({ type: 'header', label: sec });
                    items.forEach(function (p) { flat.push({ type: 'page', data: p }); });
                }
            });
            // Quick actions at bottom
            flat.push({ type: 'header', label: 'Actions' });
            ACTIONS.forEach(function (a) { flat.push({ type: 'action', data: a }); });
            return flat;
        }

        var lower = q.toLowerCase();
        var matched = allowed.filter(function (p) {
            return p.label.toLowerCase().includes(lower) ||
                   p.section.toLowerCase().includes(lower) ||
                   p.keywords.toLowerCase().includes(lower);
        });
        var matchedActions = ACTIONS.filter(function (a) {
            return a.label.toLowerCase().includes(lower) ||
                   a.keywords.toLowerCase().includes(lower);
        });

        if (matched.length) {
            flat.push({ type: 'header', label: 'Pages' });
            matched.slice(0, 10).forEach(function (p) { flat.push({ type: 'page', data: p }); });
        }
        if (matchedActions.length) {
            flat.push({ type: 'header', label: 'Actions' });
            matchedActions.forEach(function (a) { flat.push({ type: 'action', data: a }); });
        }
        return flat;
    }

    // Returns only the selectable (non-header) items from results
    function selectables() {
        return results.filter(function (r) { return r.type !== 'header'; });
    }

    // ── Render ────────────────────────────────────────────────────
    var _lastRenderQuery = null;
    var _lastRenderResultLen = 0;

    function renderList() {
        var q = input.value.toLowerCase();
        var sel = selectables();

        // Fast path: only activeIdx changed — update classes in-place, skip DOM rebuild
        if (q === _lastRenderQuery && sel.length === _lastRenderResultLen) {
            list.querySelectorAll('.cp-item').forEach(function(el) {
                var idx = parseInt(el.dataset.selidx, 10);
                var active = idx === activeIdx;
                el.classList.toggle('cp-item-active', active);
                if (active) el.setAttribute('data-active', '1');
                else el.removeAttribute('data-active');
            });
            var activeEl2 = list.querySelector('[data-active]');
            if (activeEl2) {
                var iTop = activeEl2.offsetTop;
                var iBot = iTop + activeEl2.offsetHeight;
                var lTop = list.scrollTop;
                var lBot = lTop + list.clientHeight;
                if (iBot > lBot) list.scrollTop = iBot - list.clientHeight + 6;
                else if (iTop < lTop) list.scrollTop = iTop - 6;
            }
            return;
        }
        _lastRenderQuery = q;
        _lastRenderResultLen = sel.length;

        list.textContent = '';
        var selIdx = 0;

        if (!results.length || (results.length === 1 && results[0].type === 'header')) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:32px;text-align:center;color:var(--cp-muted);font-size:13px;';
            empty.textContent = 'No results found';
            list.appendChild(empty);
            return;
        }

        results.forEach(function (row) {
            if (row.type === 'header') {
                var hdr = document.createElement('div');
                hdr.style.cssText = 'padding:10px 12px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--cp-muted);';
                hdr.textContent = row.label;
                list.appendChild(hdr);
                return;
            }

            var thisSelIdx = selIdx++;
            var isActive = thisSelIdx === activeIdx;
            var item = document.createElement('div');
            item.className = 'cp-item' + (isActive ? ' cp-item-active' : '');
            item.dataset.selidx = thisSelIdx;
            if (isActive) item.setAttribute('data-active', '1');

            var color = SECTION_COLORS[row.type === 'page' ? row.data.section : row.data.section] || '#6b7280';

            // Icon
            var iconWrap = document.createElement('div');
            iconWrap.className = 'cp-item-icon';
            iconWrap.style.background = color + '18';
            var ic = document.createElement('i');
            ic.setAttribute('data-lucide', row.data.icon);
            ic.style.color = color;
            iconWrap.appendChild(ic);

            // Label with highlight
            var labelEl = document.createElement('span');
            labelEl.className = 'cp-item-label';
            if (q && row.type === 'page') {
                var lowerLabel = row.data.label.toLowerCase();
                var matchIdx = lowerLabel.indexOf(q);
                if (matchIdx !== -1) {
                    labelEl.appendChild(document.createTextNode(row.data.label.slice(0, matchIdx)));
                    var mark = document.createElement('mark');
                    mark.style.cssText = 'background:rgba(59,130,246,.25);color:inherit;border-radius:2px;padding:0 1px;';
                    mark.textContent = row.data.label.slice(matchIdx, matchIdx + q.length);
                    labelEl.appendChild(mark);
                    labelEl.appendChild(document.createTextNode(row.data.label.slice(matchIdx + q.length)));
                } else {
                    labelEl.textContent = row.data.label;
                }
            } else {
                labelEl.textContent = row.data.label;
            }

            // Right side: current-page dot OR section badge
            var right = document.createElement('div');
            right.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

            if (row.type === 'page' && (currentHref === row.data.href || currentHref.endsWith(row.data.href))) {
                var dot = document.createElement('span');
                dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:' + color + ';flex-shrink:0;';
                dot.title = 'Current page';
                right.appendChild(dot);
            }

            var sectionEl = document.createElement('span');
            sectionEl.className = 'cp-item-section';
            sectionEl.textContent = row.type === 'action' ? 'Action' : row.data.section;
            sectionEl.style.color = color;
            sectionEl.style.background = color + '14';
            right.appendChild(sectionEl);

            item.appendChild(iconWrap);
            item.appendChild(labelEl);
            item.appendChild(right);

            item.addEventListener('mouseenter', (function (idx) {
                return function () { activeIdx = idx; renderList(); };
            })(thisSelIdx));
            item.addEventListener('click', (function (r) {
                return function () { execute(r); };
            })(row));

            list.appendChild(item);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: Array.from(list.querySelectorAll('i[data-lucide]')) });
        }

        // Scroll active item into view within the list (manual — avoids page scroll)
        var activeEl = list.querySelector('[data-active]');
        if (activeEl) {
            var itemTop = activeEl.offsetTop;
            var itemBot = itemTop + activeEl.offsetHeight;
            var listTop = list.scrollTop;
            var listBot = listTop + list.clientHeight;
            if (itemBot > listBot) {
                list.scrollTop = itemBot - list.clientHeight + 6;
            } else if (itemTop < listTop) {
                list.scrollTop = itemTop - 6;
            }
        }
    }

    function render() {
        results = search(input.value);
        activeIdx = 0;
        renderList();
    }

    // ── Execute ───────────────────────────────────────────────────
    function execute(row) {
        if (row.type === 'page') {
            addRecent(row.data.href);
            close();
            setTimeout(function () { window.location.href = row.data.href; }, 80);
        } else if (row.type === 'action') {
            close();
            setTimeout(function () { runAction(row.data.id); }, 80);
        }
    }

    function runAction(id) {
        if (id === 'theme') {
            var btn = document.getElementById('theme-toggle');
            if (btn) btn.click();
        } else if (id === 'refresh') {
            window.location.reload();
        } else if (id === 'logout') {
            if (window.adminAuth && window.adminAuth.logout) window.adminAuth.logout();
        } else if (id === 'note-open' && window.AdminNotes) {
            window.AdminNotes.open();
        } else if (id === 'note-capture' && window.AdminNotes) {
            window.AdminNotes.capture();
        } else if (id === 'note-focus' && window.AdminNotes) {
            window.AdminNotes.open();
            setTimeout(function(){ var el=document.getElementById('anFocusWidget'); if(el) el.click(); }, 350);
        } else if (id === 'note-search' && window.AdminNotes) {
            window.AdminNotes.open();
            setTimeout(function(){ var el=document.getElementById('anSearch'); if(el) el.focus(); }, 300);
        }
    }

    // ── Open / close ──────────────────────────────────────────────
    function open() {
        if (isOpen) return;
        isOpen = true;
        currentHref = window.location.pathname;
        overlay.style.display = 'flex';
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

    // ── Keyboard ──────────────────────────────────────────────────
    function onGlobalKey(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            isOpen ? close() : open();
            return;
        }
        if (!isOpen) return;
        if (e.key === 'Escape') { close(); return; }
        var sel = selectables();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIdx = Math.min(activeIdx + 1, sel.length - 1);
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
            if (sel[activeIdx]) execute(sel[activeIdx]);
            return;
        }
    }

    // ── Build DOM ─────────────────────────────────────────────────
    function buildStyles() {
        var s = document.createElement('style');
        s.textContent = [
            ':root{--cp-bg:#ffffff;--cp-border:#e5e7eb;--cp-input-bg:#f9fafb;--cp-text:#111827;--cp-muted:#9ca3af;--cp-hover:#f3f4f6;--cp-active:#eff6ff;--cp-active-border:#3b82f6;}',
            '.dark-mode,:root[data-theme="dark"]{--cp-bg:#161616;--cp-border:#272727;--cp-input-bg:#0f0f0f;--cp-text:#f1f5f9;--cp-muted:#6b7280;--cp-hover:#1e1e1e;--cp-active:#1a3356;--cp-active-border:#3b82f6;}',
            '[data-admin-theme="sakina"]{--cp-bg:#162d1f;--cp-border:#1e3828;--cp-input-bg:#1c3827;--cp-text:#f0e6c8;--cp-muted:#6b5c3e;--cp-hover:#1c3827;--cp-active:#243d2e;--cp-active-border:#c9a84c;}',
            '[data-admin-theme="noor"]{--cp-bg:#fdf4e3;--cp-border:#d9c9a8;--cp-input-bg:#f0e2c4;--cp-text:#1a0e04;--cp-muted:#9b7650;--cp-hover:#f0e2c4;--cp-active:#e8d4a8;--cp-active-border:#1a5c3a;}',
            '[data-admin-theme="evar"]{--cp-bg:#252830;--cp-border:#2a2e3c;--cp-input-bg:#1e2028;--cp-text:#dde1ec;--cp-muted:#545c72;--cp-hover:#2e3240;--cp-active:#2e3566;--cp-active-border:#818cf8;}',

            '#cp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:99999;display:none;align-items:flex-start;justify-content:center;padding:10vh 12px 12px;}',

            '#cp-dialog{background:var(--cp-bg);border:1px solid var(--cp-border);border-radius:16px;width:100%;max-width:600px;box-shadow:0 32px 80px rgba(0,0,0,.28);overflow:hidden;opacity:0;transform:translateY(-10px) scale(0.97);transition:opacity .16s ease,transform .16s ease;}',
            '@media(max-width:640px){#cp-overlay{padding:8px 8px 0;align-items:flex-end;}#cp-dialog{border-radius:16px 16px 0 0;max-height:80vh;display:flex;flex-direction:column;}#cp-list{flex:1;max-height:none;}}',

            '#cp-input-wrap{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--cp-border);}',
            '#cp-input-wrap i{width:17px;height:17px;color:var(--cp-muted);flex-shrink:0;}',
            '#cp-input{flex:1;background:none;border:none;outline:none;font-size:15px;color:var(--cp-text);font-family:inherit;}',
            '#cp-input::placeholder{color:var(--cp-muted);}',
            '#cp-input-wrap .cp-hint{font-size:11px;font-weight:600;color:var(--cp-muted);background:var(--cp-hover);border:1px solid var(--cp-border);padding:2px 7px;border-radius:6px;white-space:nowrap;flex-shrink:0;}',

            '#cp-list{max-height:400px;overflow-y:auto;padding:6px 6px 8px;}',
            '#cp-list::-webkit-scrollbar{width:4px;}',
            '#cp-list::-webkit-scrollbar-thumb{background:var(--cp-border);border-radius:4px;}',

            '.cp-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;transition:background .1s;}',
            '.cp-item:hover,.cp-item-active{background:var(--cp-active);}',
            '.cp-item-active{outline:1px solid var(--cp-active-border);}',
            '.cp-item-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
            '.cp-item-icon i{width:15px;height:15px;}',
            '.cp-item-label{flex:1;font-size:13px;font-weight:500;color:var(--cp-text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.cp-item-section{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:20px;white-space:nowrap;}',

            '#cp-footer{display:flex;align-items:center;gap:14px;padding:8px 14px;border-top:1px solid var(--cp-border);background:var(--cp-input-bg);}',
            '.cp-key{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--cp-muted);}',
            '.cp-kbd{background:var(--cp-hover);border:1px solid var(--cp-border);border-radius:5px;padding:1px 6px;font-size:10px;font-family:inherit;color:var(--cp-muted);}',

            /* Recent sidebar section */
            '#rpSection{border-bottom:1px solid var(--border-light);margin-bottom:4px;padding-bottom:2px;}',
            '.nav-item-recent{transition:background .15s,box-shadow .15s;}',
            '.nav-item-recent:hover{box-shadow:inset 2px 0 0 var(--rp-color,var(--primary));}',
            '.nav-item-rp-dot{width:6px;height:6px;border-radius:50%;margin-left:auto;flex-shrink:0;animation:rpPulse 2.4s ease-in-out infinite;}',
            '.sidebar.collapsed .nav-item-rp-dot,.sidebar.collapsed #rpSection .nav-section-header{display:none;}',
            '@keyframes rpPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.55)}}',
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
        input.placeholder = 'Search pages or actions…';
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
        btn.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--text-tertiary);border-radius:8px;white-space:nowrap;flex-shrink:0;';
        var ic = document.createElement('i');
        ic.setAttribute('data-lucide', 'command');
        btn.appendChild(ic);
        var label = document.createElement('span');
        label.style.fontFamily = 'system-ui,-apple-system,sans-serif';
        var isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        label.textContent = isMac ? '⌘K' : 'Ctrl K';
        btn.appendChild(label);
        btn.addEventListener('click', open);
        var timer = actions.querySelector('#sessionTimer');
        actions.insertBefore(btn, timer || actions.firstChild);
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [ic] });
        }
    }

    function hookTopbarSearch() {
        var searchInput = document.querySelector('.topbar-search input');
        if (!searchInput) return;
        searchInput.addEventListener('focus', function () {
            this.blur();
            open();
        });
        searchInput.style.cursor = 'pointer';
    }

    // ── Recent pages sidebar section ──────────────────────────────
    function injectRecentSidebar() {
        // Record this page visit unconditionally
        addRecent(window.location.pathname);

        var allowed = visiblePages();
        if (!allowed.length) {
            // Auth not settled yet — retry up to 5 times
            injectRecentSidebar._t = (injectRecentSidebar._t || 0) + 1;
            if (injectRecentSidebar._t < 6) { setTimeout(injectRecentSidebar, 500); }
            return;
        }

        var curPath = window.location.pathname;
        var rec = getRecent()
            .filter(function(h) { return h !== curPath; })
            .filter(function(h) { return allowed.some(function(p) { return p.href === h; }); })
            .slice(0, 3);

        // Remove stale section from a previous run
        var old = document.getElementById('rpSection');
        if (old) old.parentNode.removeChild(old);
        if (!rec.length) return;

        var nav = document.querySelector('.sidebar-nav');
        if (!nav) return;

        var section = document.createElement('div');
        section.id = 'rpSection';
        section.className = 'nav-section';

        var hdr = document.createElement('div');
        hdr.className = 'nav-section-header';
        hdr.textContent = 'Recent';
        section.appendChild(hdr);

        rec.forEach(function(href) {
            var page = allowed.find(function(p) { return p.href === href; });
            if (!page) return;
            var color = SECTION_COLORS[page.section] || '#6b7280';

            var item = document.createElement('a');
            item.href = href;
            item.className = 'nav-item nav-item-recent';
            item.style.setProperty('--rp-color', color);

            var ic = document.createElement('i');
            ic.setAttribute('data-lucide', page.icon);
            ic.style.color = color;
            item.appendChild(ic);

            var lbl = document.createElement('span');
            lbl.className = 'nav-item-label';
            lbl.textContent = page.label;
            item.appendChild(lbl);

            var dot = document.createElement('span');
            dot.className = 'nav-item-rp-dot';
            dot.style.background = color;
            item.appendChild(dot);

            section.appendChild(item);
        });

        nav.insertBefore(section, nav.firstChild);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: Array.from(section.querySelectorAll('i[data-lucide]')) });
        }
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        buildStyles();
        buildDOM();
        injectTopbarTrigger();
        hookTopbarSearch();
        injectRecentSidebar();
        document.addEventListener('keydown', onGlobalKey);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.cmdPalette = { open: open, close: close };
})();

// ── Sidebar nav search (shared across all admin pages) ────────────
(function initSidebarSearch() {
    function setup() {
        var input = document.getElementById('sidebarSearchInput');
        if (!input) return;
        input.addEventListener('input', function() {
            var q = this.value.trim().toLowerCase();
            var sections = document.querySelectorAll('.sidebar-nav .nav-section');
            sections.forEach(function(sec) {
                var items = sec.querySelectorAll('.nav-item');
                var anyVisible = false;
                items.forEach(function(item) {
                    var label = (item.querySelector('.nav-item-label') || item).textContent.toLowerCase();
                    var match = !q || label.includes(q);
                    item.classList.toggle('hidden-by-search', !match);
                    if (match) anyVisible = true;
                });
                sec.classList.toggle('all-hidden', !anyVisible);
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
