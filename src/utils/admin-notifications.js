/* =============================================================
   admin-notifications.js  v6  — Premium Notification Tray
   Works on every admin page (self-injects bell if absent).

   Data sources:
     • contact_messages  status='unread'     (Supabase, on open)
     • profiles          new signups last 24h (Supabase, on open)
     • app_error_logs    last 6h             (Supabase, on open)
     • _AdminLiveAlerts  bridge               (real-time events)

   Storage: localStorage key 'ant_v5'
   Public API:
     adminNotifications.add(title, desc, type, link)
     adminNotifications.test()
   ============================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'ant_v5';
  var MAX_ITEMS = 80;
  var PANEL_ID  = 'ant-panel';
  var BADGE_ID  = 'notification-badge';
  var STYLE_ID  = 'ant-styles';

  var TYPES = {
    mention: { icon: '@',  color: '#818cf8', bg: 'rgba(99,102,241,.15)',  label: 'Mention',  tab: 'mention' },
    message: { icon: '✉',  color: '#ef4444', bg: 'rgba(239,68,68,.15)',   label: 'Message',  tab: 'message' },
    user:    { icon: '👤', color: '#8b5cf6', bg: 'rgba(139,92,246,.15)',  label: 'User',     tab: 'user'    },
    video:   { icon: '▶',  color: '#f59e0b', bg: 'rgba(245,158,11,.15)',  label: 'Video',    tab: 'video'   },
    error:   { icon: '⚠',  color: '#ef4444', bg: 'rgba(239,68,68,.15)',   label: 'Error',    tab: 'error'   },
    info:    { icon: 'ℹ',  color: '#3b82f6', bg: 'rgba(59,130,246,.15)',  label: 'Info',     tab: 'info'    },
    success: { icon: '✓',  color: '#10b981', bg: 'rgba(16,185,129,.15)',  label: 'Success',  tab: 'success' },
  };

  var TABS = [
    { id: 'all',     label: 'All',      icon: '🔔' },
    { id: 'unread',  label: 'Unread',   icon: '·'  },
    { id: 'mention', label: 'Mentions', icon: '@'  },
    { id: 'message', label: 'Messages', icon: '✉'  },
    { id: 'user',    label: 'Users',    icon: '👤' },
    { id: 'error',   label: 'Errors',   icon: '⚠'  },
  ];

  var _currentFilter = 'all';

  // ── storage ────────────────────────────────────────────────
  function _load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch(e) { return []; }
  }
  function _save(items) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS))); }
    catch(e) {}
  }
  function _hasSeen(sourceId) {
    if (!sourceId) return false;
    return _load().some(function(n) { return n.sourceId === sourceId; });
  }

  // ── add ────────────────────────────────────────────────────
  function _add(title, desc, type, link, sourceId, dbId) {
    if (sourceId && _hasSeen(sourceId)) return;
    var items = _load();
    items.unshift({
      id: Date.now() + Math.random(),
      sourceId: sourceId || null,
      dbId: dbId || null,
      title: title,
      desc: desc || '',
      type: type || 'info',
      link: link || null,
      ts: Date.now(),
      read: false,
    });
    _save(items);
    _updateBadge();
    _refreshPanel();
  }

  // ── mark a DB mention notification as read ─────────────────
  function _markReadInDB(dbId) {
    if (!dbId) return;
    var sb = _getSB();
    if (!sb) return;
    sb.from('admin_mention_notifs')
      .update({ read: true })
      .eq('id', dbId)
      .then(function() {});
  }

  // ── time helpers ───────────────────────────────────────────
  function _ago(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60)    return 'Just now';
    if (d < 3600)  return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }

  function _timeGroup(ts) {
    var now  = new Date();
    var date = new Date(ts);
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var ydayStart  = todayStart - 86400000;
    var weekStart  = todayStart - 6 * 86400000;
    if (ts >= todayStart)  return 'Today';
    if (ts >= ydayStart)   return 'Yesterday';
    if (ts >= weekStart)   return 'This Week';
    return 'Earlier';
  }

  // ── filter ─────────────────────────────────────────────────
  function _filterItems(items, filter) {
    if (filter === 'all')    return items;
    if (filter === 'unread') return items.filter(function(i) { return !i.read; });
    return items.filter(function(i) { return i.type === filter; });
  }

  function _tabCount(items, filter) {
    return _filterItems(items, filter).length;
  }

  // ── badge ──────────────────────────────────────────────────
  function _updateBadge() {
    var badge = document.getElementById(BADGE_ID);
    var n = _load().filter(function(i) { return !i.read; }).length;
    if (badge) {
      badge.textContent = n > 99 ? '99+' : n;
      badge.style.display = n > 0 ? 'flex' : 'none';
    }
    // pulse the bell button when there are unread
    var bellBtn = document.getElementById('ant-bell-btn') ||
      (badge && badge.closest('.topbar-btn'));
    if (bellBtn) {
      if (n > 0) bellBtn.classList.add('ant-bell-pulse');
      else       bellBtn.classList.remove('ant-bell-pulse');
    }
  }

  // ── inject bell button if absent ──────────────────────────
  function _ensureBell() {
    if (document.getElementById(BADGE_ID)) return;
    var actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.className = 'topbar-btn';
    btn.id = 'ant-bell-btn';
    btn.setAttribute('aria-label', 'Notifications');
    btn.style.cssText = 'position:relative;';
    btn.innerHTML =
      '<i data-lucide="bell"></i>' +
      '<span id="' + BADGE_ID + '" style="' +
        'position:absolute;top:-4px;right:-4px;' +
        'background:#ef4444;color:#fff;font-size:10px;font-weight:600;' +
        'padding:2px 5px;border-radius:10px;min-width:18px;text-align:center;' +
        'display:none;align-items:center;justify-content:center;' +
        'pointer-events:none;"></span>';
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) actions.insertBefore(btn, themeBtn);
    else          actions.prepend(btn);
    if (window.lucide) window.lucide.createIcons({ nodes: [btn] });
  }

  // ── CSS ────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      // bell pulse ring
      '@keyframes ant-ring{0%,100%{transform:rotate(0)}15%{transform:rotate(12deg)}30%{transform:rotate(-10deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-6deg)}}',
      '@keyframes ant-pulse-ring{0%{box-shadow:0 0 0 0 rgba(99,102,241,.5)}70%{box-shadow:0 0 0 7px rgba(99,102,241,0)}100%{box-shadow:0 0 0 0 rgba(99,102,241,0)}}',
      '@keyframes ant-item-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',

      '.ant-bell-pulse{animation:ant-pulse-ring 1.8s ease-out infinite;}',
      '.ant-bell-pulse i{animation:ant-ring 1.8s ease-out infinite;}',

      // panel
      '#ant-panel{',
        'position:fixed;top:60px;right:12px;width:380px;',
        'max-height:calc(100dvh - 80px);',
        'background:var(--bg-surface,#111827);',
        'border:1px solid var(--border-light,rgba(255,255,255,.1));',
        'border-radius:18px;',
        'box-shadow:0 32px 96px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04);',
        'display:flex;flex-direction:column;',
        'z-index:99999;',
        'opacity:0;transform:translateY(-10px) scale(.96);pointer-events:none;',
        'transition:opacity .2s cubic-bezier(.4,0,.2,1),transform .2s cubic-bezier(.4,0,.2,1);}',
      '#ant-panel.ant-open{opacity:1;transform:none;pointer-events:all;}',

      // header
      '#ant-panel .ant-hdr{',
        'display:flex;align-items:center;gap:8px;',
        'padding:16px 16px 12px;',
        'flex-shrink:0;}',
      '#ant-panel .ant-hdr-ico{',
        'width:32px;height:32px;border-radius:10px;',
        'background:rgba(99,102,241,.15);',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:15px;flex-shrink:0;}',
      '#ant-panel .ant-hdr-title{',
        'font-size:15px;font-weight:800;',
        'color:var(--text-primary,#f1f5f9);flex:1;letter-spacing:-.2px;}',
      '#ant-panel .ant-hdr-actions{display:flex;gap:4px;align-items:center;}',
      '#ant-panel .ant-hbtn{',
        'font-size:11px;font-weight:600;',
        'color:var(--text-tertiary,rgba(255,255,255,.4));',
        'background:none;border:none;cursor:pointer;',
        'padding:5px 9px;border-radius:8px;',
        'transition:color .15s,background .15s;white-space:nowrap;}',
      '#ant-panel .ant-hbtn:hover{',
        'color:var(--text-primary,#f1f5f9);',
        'background:var(--bg-hover,rgba(255,255,255,.07));}',
      '#ant-panel .ant-close{',
        'width:28px;height:28px;border-radius:50%;',
        'background:var(--bg-hover,rgba(255,255,255,.07));border:none;cursor:pointer;',
        'color:var(--text-tertiary,rgba(255,255,255,.4));',
        'display:flex;align-items:center;justify-content:center;',
        'flex-shrink:0;font-size:14px;',
        'transition:background .15s,color .15s;}',
      '#ant-panel .ant-close:hover{background:rgba(239,68,68,.2);color:#ef4444;}',

      // filter tabs
      '#ant-panel .ant-tabs{',
        'display:flex;gap:4px;',
        'padding:0 14px 12px;',
        'overflow-x:auto;',
        'scrollbar-width:none;',
        'flex-shrink:0;}',
      '#ant-panel .ant-tabs::-webkit-scrollbar{display:none;}',
      '#ant-panel .ant-tab{',
        'display:flex;align-items:center;gap:5px;',
        'font-size:11.5px;font-weight:600;',
        'padding:5px 11px;border-radius:20px;',
        'border:none;cursor:pointer;white-space:nowrap;',
        'background:var(--bg-hover,rgba(255,255,255,.06));',
        'color:var(--text-secondary,rgba(255,255,255,.55));',
        'transition:all .15s;flex-shrink:0;}',
      '#ant-panel .ant-tab:hover{background:rgba(255,255,255,.1);color:var(--text-primary,#f1f5f9);}',
      '#ant-panel .ant-tab.ant-tab-active{background:#6366f1;color:#fff;}',
      '#ant-panel .ant-tab-cnt{',
        'font-size:10px;font-weight:800;',
        'background:rgba(255,255,255,.2);',
        'padding:0px 5px;border-radius:8px;min-width:16px;text-align:center;}',
      '#ant-panel .ant-tab.ant-tab-active .ant-tab-cnt{background:rgba(255,255,255,.3);}',

      // divider
      '#ant-panel .ant-divider{',
        'height:1px;background:var(--border-light,rgba(255,255,255,.07));',
        'flex-shrink:0;}',

      // scroll body
      '#ant-panel .ant-body{',
        'flex:1;overflow-y:auto;overflow-x:hidden;',
        'scrollbar-width:thin;',
        'scrollbar-color:rgba(255,255,255,.1) transparent;}',
      '#ant-panel .ant-body::-webkit-scrollbar{width:4px;}',
      '#ant-panel .ant-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px;}',

      // section label
      '#ant-panel .ant-sec{',
        'font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;',
        'color:var(--text-tertiary,rgba(255,255,255,.28));',
        'padding:10px 16px 4px;display:flex;align-items:center;gap:8px;}',
      '#ant-panel .ant-sec::after{',
        'content:"";flex:1;height:1px;background:var(--border-light,rgba(255,255,255,.06));}',

      // item
      '#ant-panel .ant-item{',
        'display:flex;align-items:flex-start;gap:11px;',
        'padding:11px 14px 11px 16px;cursor:pointer;',
        'border-left:3px solid transparent;',
        'transition:background .14s,border-color .14s;position:relative;',
        'animation:ant-item-in .2s ease both;}',
      '#ant-panel .ant-item:hover{background:var(--bg-hover,rgba(255,255,255,.04));}',
      '#ant-panel .ant-item.ant-unread{border-left-color:currentColor;}',

      // icon blob
      '#ant-panel .ant-ico{',
        'width:36px;height:36px;border-radius:10px;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:16px;flex-shrink:0;margin-top:1px;}',

      // text
      '#ant-panel .ant-txt{flex:1;min-width:0;}',
      '#ant-panel .ant-ttl{',
        'font-size:13px;font-weight:600;',
        'color:var(--text-primary,#f1f5f9);',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
        'margin-bottom:2px;}',
      '#ant-panel .ant-item.ant-unread .ant-ttl{font-weight:700;}',
      '#ant-panel .ant-dsc{',
        'font-size:12px;color:var(--text-secondary,rgba(255,255,255,.55));',
        'line-height:1.45;',
        'display:-webkit-box;-webkit-box-orient:vertical;',
        '-webkit-line-clamp:2;overflow:hidden;',
        'margin-bottom:4px;}',
      '#ant-panel .ant-meta{display:flex;align-items:center;gap:6px;}',
      '#ant-panel .ant-time{',
        'font-size:11px;color:var(--text-tertiary,rgba(255,255,255,.3));font-weight:500;}',
      '#ant-panel .ant-type-badge{',
        'font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;',
        'letter-spacing:.02em;flex-shrink:0;}',

      // action button (Reply etc)
      '#ant-panel .ant-action{',
        'font-size:11px;font-weight:700;',
        'padding:3px 10px;border-radius:8px;border:none;cursor:pointer;',
        'background:rgba(99,102,241,.15);color:#818cf8;',
        'transition:background .14s;opacity:0;margin-top:5px;display:inline-flex;}',
      '#ant-panel .ant-item:hover .ant-action{opacity:1;}',
      '#ant-panel .ant-action:hover{background:rgba(99,102,241,.28);}',

      // dismiss x
      '#ant-panel .ant-del{',
        'width:22px;height:22px;border-radius:50%;',
        'background:none;border:none;cursor:pointer;',
        'color:var(--text-tertiary,rgba(255,255,255,.25));',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:13px;flex-shrink:0;margin-top:1px;',
        'transition:color .14s,background .14s;opacity:0;}',
      '#ant-panel .ant-item:hover .ant-del{opacity:1;}',
      '#ant-panel .ant-del:hover{color:#ef4444;background:rgba(239,68,68,.15);}',

      // empty state
      '#ant-panel .ant-empty{',
        'padding:48px 20px;text-align:center;',
        'color:var(--text-tertiary,rgba(255,255,255,.25));}',
      '#ant-panel .ant-empty-ico{font-size:40px;margin-bottom:12px;opacity:.4;}',
      '#ant-panel .ant-empty-txt{font-size:13px;font-weight:500;}',
      '#ant-panel .ant-empty-sub{font-size:12px;margin-top:4px;opacity:.7;}',

      // footer
      '#ant-panel .ant-foot{',
        'padding:10px 16px;flex-shrink:0;',
        'display:flex;align-items:center;justify-content:space-between;',
        'border-top:1px solid var(--border-light,rgba(255,255,255,.06));}',
      '#ant-panel .ant-foot-lbl{',
        'font-size:11px;color:var(--text-tertiary,rgba(255,255,255,.25));}',

      '@media(max-width:420px){#ant-panel{width:calc(100vw - 24px);right:12px;}}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── build panel DOM ────────────────────────────────────────
  function _buildPanel() {
    var existing = document.getElementById(PANEL_ID);
    if (existing) existing.parentNode.removeChild(existing);

    var allItems = _load();
    var unreadN  = allItems.filter(function(i) { return !i.read; }).length;
    var filtered = _filterItems(allItems, _currentFilter);

    var panel = document.createElement('div');
    panel.id = PANEL_ID;

    // ── header
    var hdr = _el('div', 'ant-hdr');
    var ico = _el('div', 'ant-hdr-ico');
    ico.textContent = '🔔';
    var htitle = _el('div', 'ant-hdr-title');
    htitle.textContent = 'Notifications';

    var hact = _el('div', 'ant-hdr-actions');

    var refreshBtn = _el('button', 'ant-hbtn');
    refreshBtn.title = 'Refresh';
    refreshBtn.innerHTML = '↻';
    refreshBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      _lastPull = 0;
      _pullSupabase();
    });

    var markBtn = _el('button', 'ant-hbtn');
    markBtn.textContent = 'Mark read';
    markBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var all = _load(); all.forEach(function(i) { i.read = true; }); _save(all);
      _updateBadge(); _refreshPanel();
    });

    var clrBtn = _el('button', 'ant-hbtn');
    clrBtn.textContent = 'Clear';
    clrBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      _save([]); _updateBadge(); _refreshPanel();
    });

    var closeBtn = _el('button', 'ant-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); _close(); });

    hact.appendChild(refreshBtn);
    hact.appendChild(markBtn);
    hact.appendChild(clrBtn);
    hact.appendChild(closeBtn);
    hdr.appendChild(ico);
    hdr.appendChild(htitle);
    hdr.appendChild(hact);
    panel.appendChild(hdr);

    // ── filter tabs
    var tabs = _el('div', 'ant-tabs');
    TABS.forEach(function(tab) {
      var cnt = tab.id === 'unread'
        ? unreadN
        : (tab.id === 'all' ? allItems.length : _tabCount(allItems, tab.id));
      var btn = _el('button', 'ant-tab' + (tab.id === _currentFilter ? ' ant-tab-active' : ''));
      btn.innerHTML = (tab.icon ? '<span>' + tab.icon + '</span>' : '') +
                      '<span>' + tab.label + '</span>' +
                      (cnt > 0 ? '<span class="ant-tab-cnt">' + cnt + '</span>' : '');
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        _currentFilter = tab.id;
        _refreshPanel();
      });
      tabs.appendChild(btn);
    });
    panel.appendChild(tabs);
    panel.appendChild(_el('div', 'ant-divider'));

    // ── body
    var body = _el('div', 'ant-body');

    if (filtered.length === 0) {
      var empty = _el('div', 'ant-empty');
      var eico  = _el('div', 'ant-empty-ico');
      var etxt  = _el('div', 'ant-empty-txt');
      var esub  = _el('div', 'ant-empty-sub');
      if (_currentFilter === 'unread') {
        eico.textContent = '✓'; etxt.textContent = 'All caught up'; esub.textContent = 'No unread notifications';
      } else if (_currentFilter === 'all' && allItems.length === 0) {
        eico.textContent = '🔔'; etxt.textContent = 'No notifications yet'; esub.textContent = 'Events will appear here in real time';
      } else {
        eico.textContent = '🔍'; etxt.textContent = 'Nothing here'; esub.textContent = 'No ' + _currentFilter + ' notifications';
      }
      empty.appendChild(eico); empty.appendChild(etxt); empty.appendChild(esub);
      body.appendChild(empty);
    } else {
      // group by time
      var groups = {};
      var groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];
      filtered.forEach(function(item) {
        var g = _timeGroup(item.ts);
        if (!groups[g]) groups[g] = [];
        groups[g].push(item);
      });
      groupOrder.forEach(function(gLabel) {
        if (!groups[gLabel] || !groups[gLabel].length) return;
        var sec = _el('div', 'ant-sec');
        sec.textContent = gLabel;
        body.appendChild(sec);
        groups[gLabel].slice(0, 30).forEach(function(item, idx) {
          var el = _buildItem(item);
          el.style.animationDelay = (idx * 25) + 'ms';
          body.appendChild(el);
        });
      });
    }
    panel.appendChild(body);

    // ── footer
    if (allItems.length > 0) {
      var foot = _el('div', 'ant-foot');
      var fl   = _el('span', 'ant-foot-lbl');
      fl.textContent = allItems.length + ' notification' + (allItems.length !== 1 ? 's' : '') +
                       ' · ' + unreadN + ' unread';
      foot.appendChild(fl);
      panel.appendChild(foot);
    }

    document.body.appendChild(panel);
  }

  function _buildItem(item) {
    var cfg = TYPES[item.type] || TYPES.info;
    var row = _el('div', 'ant-item' + (item.read ? '' : ' ant-unread'));
    row.setAttribute('data-id', item.id);
    if (!item.read) row.style.color = cfg.color; // drives border-left-color via currentColor

    var ico = _el('div', 'ant-ico');
    ico.textContent = cfg.icon;
    ico.style.background = cfg.bg;

    var txt  = _el('div', 'ant-txt');
    var ttl  = _el('div', 'ant-ttl');
    ttl.textContent = item.title;
    var dsc  = _el('div', 'ant-dsc');
    dsc.textContent = item.desc;

    var meta = _el('div', 'ant-meta');
    var time = _el('span', 'ant-time');
    time.textContent = _ago(item.ts);
    var badge = _el('span', 'ant-type-badge');
    badge.textContent = cfg.label;
    badge.style.background = cfg.bg;
    badge.style.color = cfg.color;
    meta.appendChild(time);
    meta.appendChild(badge);

    txt.appendChild(ttl);
    if (item.desc) txt.appendChild(dsc);
    txt.appendChild(meta);

    // action buttons per type
    if (item.type === 'mention') {
      var actBtn = _el('button', 'ant-action');
      actBtn.textContent = 'View →';
      actBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var all = _load();
        var n = all.find(function(i) { return i.id === item.id; });
        if (n && !n.read) { n.read = true; _save(all); _updateBadge(); }
        _markReadInDB(item.dbId);
        if (item.link) window.location.href = item.link;
      });
      txt.appendChild(actBtn);
    } else if (item.type === 'message') {
      var actBtn = _el('button', 'ant-action');
      actBtn.textContent = 'Reply →';
      actBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (item.link) window.location.href = item.link;
      });
      txt.appendChild(actBtn);
    }

    var del = _el('button', 'ant-del');
    del.innerHTML = '&times;';
    del.setAttribute('aria-label', 'Dismiss');
    del.addEventListener('click', function(e) {
      e.stopPropagation();
      var all = _load().filter(function(i) { return i.id !== item.id; });
      _save(all); _updateBadge(); _refreshPanel();
    });

    row.appendChild(ico);
    row.appendChild(txt);
    row.appendChild(del);

    row.addEventListener('click', function() {
      var all = _load();
      var n = all.find(function(i) { return i.id === item.id; });
      if (n && !n.read) { n.read = true; _save(all); _markReadInDB(item.dbId); }
      _updateBadge();
      if (item.link) window.location.href = item.link;
      else _refreshPanel();
    });

    return row;
  }

  function _el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  // ── panel open / close ─────────────────────────────────────
  var _isOpen = false;

  function _open() {
    _isOpen = true;
    _currentFilter = 'all';
    _buildPanel();
    _pullSupabase();
    requestAnimationFrame(function() {
      var p = document.getElementById(PANEL_ID);
      if (p) p.classList.add('ant-open');
    });
    setTimeout(function() {
      if (!_isOpen) return;
      var all = _load(); all.forEach(function(i) { i.read = true; }); _save(all);
      _updateBadge();
    }, 2000);
  }

  function _close() {
    _isOpen = false;
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    p.classList.remove('ant-open');
    setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p); }, 220);
  }

  function _toggle(e) {
    if (e) e.stopPropagation();
    if (_isOpen) _close(); else _open();
  }

  function _refreshPanel() {
    if (!_isOpen) return;
    _buildPanel();
    requestAnimationFrame(function() {
      var p = document.getElementById(PANEL_ID);
      if (p) p.classList.add('ant-open');
    });
  }

  // ── Supabase data pull ─────────────────────────────────────
  function _getSB() {
    if (window.adminAuth && window.adminAuth.getSupabase) return window.adminAuth.getSupabase();
    if (window.supabaseClient) return window.supabaseClient;
    return null;
  }

  var _lastPull = 0;
  function _pullSupabase() {
    var sb = _getSB();
    if (!sb) return;
    var now = Date.now();
    if (now - _lastPull < 30000) return;
    _lastPull = now;

    sb.from('contact_messages')
      .select('id,name,email,subject,message,created_at')
      .eq('status', 'unread')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(function(res) {
        if (res.error || !res.data) return;
        res.data.forEach(function(m) {
          _add(
            (m.name || m.email || 'Unknown') + ' sent a message',
            m.subject || (m.message || '').slice(0, 80),
            'message', '/admin-messages.html', 'msg_' + m.id
          );
        });
      });

    var ago24 = new Date(now - 86400000).toISOString();
    sb.from('profiles')
      .select('id,email,full_name,display_name,created_at')
      .gte('created_at', ago24)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(function(res) {
        if (res.error || !res.data) return;
        res.data.forEach(function(u) {
          var name = u.full_name || u.display_name || (u.email || '').split('@')[0] || 'Unknown';
          _add(name + ' joined', u.email || 'New account', 'user', '/admin-users.html', 'usr_' + u.id);
        });
      });

    var ago6h = new Date(now - 6 * 3600000).toISOString();
    sb.from('app_error_logs')
      .select('id,error_type,error_message,platform,app_version,created_at')
      .gte('created_at', ago6h)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(function(res) {
        if (res.error || !res.data || !res.data.length) return;
        res.data.forEach(function(e) {
          var label = (e.platform ? '[' + e.platform + '] ' : '') + (e.error_type || 'error');
          _add('App error: ' + label, (e.error_message || 'No message').slice(0, 100),
            'error', '/admin-errors.html', 'err_' + e.id);
        });
      });

    // Overdue admin tasks
    sb.from('admin_tasks')
      .select('id,title,due_at,status')
      .neq('status', 'done')
      .not('due_at', 'is', null)
      .lt('due_at', new Date().toISOString())
      .order('due_at', { ascending: true })
      .limit(5)
      .then(function(res) {
        if (res.error || !res.data) return;
        res.data.forEach(function(t) {
          _add('Overdue: ' + t.title,
            'Due ' + new Date(t.due_at).toLocaleDateString([],{month:'short',day:'numeric'}),
            'error', '/admin-tasks.html?id=' + t.id, 'task_' + t.id);
        });
      });

    // Fetch mention notifications addressed to the current admin
    var me = (window.sessionStorage && sessionStorage.getItem('adminEmail')) || '';
    if (me) {
      var ago30d = new Date(now - 30 * 86400000).toISOString();
      sb.from('admin_mention_notifs')
        .select('id,type,title,body,data,source_id,created_at')
        .eq('recipient_email', me)
        .gte('created_at', ago30d)
        .order('created_at', { ascending: false })
        .limit(30)
        .then(function(res) {
          if (res.error || !res.data) return;
          res.data.forEach(function(n) {
            var d = n.data || {};
            var link = d.rowId ? '/admin-translations.html?mention=' + d.rowId : null;
            _add(n.title, n.body || '', n.type || 'mention', link, 'db_' + n.id, n.id);
          });
        });
    }
  }

  // ── live alerts bridge ─────────────────────────────────────
  window._antFeed = function(type, data) {
    if (type === 'new_message') {
      _add(
        (data.name || data.email || 'Unknown') + ' sent a message',
        data.subject || (data.message || '').slice(0, 80),
        'message', '/admin-messages.html', data.id ? 'msg_' + data.id : null
      );
    } else if (type === 'user_joined') {
      _add(
        (data.name || (data.email || '').split('@')[0] || 'Unknown') + ' joined',
        data.email || 'New account',
        'user', '/admin-users.html', data.id ? 'usr_' + data.id : null
      );
    } else if (type === 'new_video') {
      _add(
        'New episode: ' + (data.title || 'Untitled'),
        data.description ? data.description.slice(0, 80) : 'IslamVoice',
        'video', '/admin-islamvoice-management.html', data.id ? 'vid_' + data.id : null
      );
    }
  };

  // ── wire bell click ────────────────────────────────────────
  function _wireBell() {
    var badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    var bellBtn = badge.closest('.topbar-btn') || document.getElementById('ant-bell-btn');
    if (!bellBtn) return;
    bellBtn.addEventListener('click', _toggle);
  }

  document.addEventListener('click', function(e) {
    if (!_isOpen) return;
    var panel   = document.getElementById(PANEL_ID);
    var badge   = document.getElementById(BADGE_ID);
    var bellBtn = document.getElementById('ant-bell-btn') || (badge && badge.closest('.topbar-btn'));
    if (!panel) return;
    if (!panel.contains(e.target) && (!bellBtn || !bellBtn.contains(e.target))) _close();
  });

  // ── init ───────────────────────────────────────────────────
  function _init() {
    _injectCSS();
    _ensureBell();
    _updateBadge();
    _wireBell();

    if (_getSB()) {
      setTimeout(_pullSupabase, 4000);
    } else {
      var t = 0;
      var wait = setInterval(function() {
        if (_getSB()) { clearInterval(wait); setTimeout(_pullSupabase, 2000); }
        else if (++t > 60) { clearInterval(wait); }
      }, 500);
    }

    var _patchAttempts = 0;
    function _patchLiveAlerts() {
      if (window._AdminLiveAlerts && !window._AdminLiveAlerts.__antPatched) {
        window._AdminLiveAlerts.__antPatched = true;
      } else if (!window._AdminLiveAlerts && ++_patchAttempts < 20) {
        setTimeout(_patchLiveAlerts, 500);
      }
    }
    setTimeout(_patchLiveAlerts, 1000);
  }

  // ── public API ─────────────────────────────────────────────
  window.adminNotifications = {
    add: function(title, desc, type, link, sourceId) { _add(title, desc, type, link, sourceId||null); },
    test: function() {
      _add('Ahmed Hassan sent a message', 'Question about Quran recitation feature', 'message', '/admin-messages.html', null);
      _add('Sara Ahmed joined', 'sara.ahmed@example.com', 'user', '/admin-users.html', null);
      _add('New episode published', 'Tafsir Al-Baqarah — Episode 12', 'video', '/admin-islamvoice-management.html', null);
      _add('App error: [iOS] crash', 'Fatal exception in AudioPlayer at line 42', 'error', '/admin-errors.html', null);
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();
})();
