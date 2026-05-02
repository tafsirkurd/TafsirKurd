/* =============================================================
   admin-notifications.js  v4  — OS-style Notification Tray
   Works on every admin page (self-injects bell if absent).

   Data sources:
     • contact_messages  status='unread'     (Supabase, on open)
     • profiles          new signups last 24h (Supabase, on open)
     • _AdminLiveAlerts  bridge               (real-time events)

   Storage: localStorage key 'ant_v4'
   Public API:
     adminNotifications.add(title, desc, type, link)
     adminNotifications.test()
   ============================================================= */
(function () {
  'use strict';

  var STORE_KEY  = 'ant_v4';
  var MAX_ITEMS  = 80;
  var PANEL_ID   = 'ant-panel';
  var BADGE_ID   = 'notification-badge';
  var STYLE_ID   = 'ant-styles';

  // ── type config ────────────────────────────────────────────
  var TYPES = {
    message: { icon: '✉',  color: '#ef4444', bg: 'rgba(239,68,68,.12)',  label: 'Message'  },
    user:    { icon: '👤', color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', label: 'User'     },
    video:   { icon: '▶',  color: '#f59e0b', bg: 'rgba(245,158,11,.12)', label: 'Video'    },
    error:   { icon: '⚠',  color: '#ef4444', bg: 'rgba(239,68,68,.12)',  label: 'Error'    },
    info:    { icon: 'ℹ',  color: '#3b82f6', bg: 'rgba(59,130,246,.12)', label: 'Info'     },
  };

  // ── storage ────────────────────────────────────────────────
  function _load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch(e) { return []; }
  }
  function _save(items) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS))); }
    catch(e) {}
  }

  // ── dedupe guard: skip if we already stored this source_id ─
  function _hasSeen(sourceId) {
    if (!sourceId) return false;
    return _load().some(function(n) { return n.sourceId === sourceId; });
  }

  // ── add item ───────────────────────────────────────────────
  function _add(title, desc, type, link, sourceId) {
    if (sourceId && _hasSeen(sourceId)) return;
    var items = _load();
    items.unshift({
      id:       Date.now() + Math.random(),
      sourceId: sourceId || null,
      title:    title,
      desc:     desc || '',
      type:     type || 'info',
      link:     link || null,
      ts:       Date.now(),
      read:     false,
    });
    _save(items);
    _updateBadge();
    _refreshPanel();
  }

  // ── time formatter ─────────────────────────────────────────
  function _ago(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60)     return 'Just now';
    if (d < 3600)   return Math.floor(d / 60) + 'm ago';
    if (d < 86400)  return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }

  // ── badge ──────────────────────────────────────────────────
  function _updateBadge() {
    var badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    var n = _load().filter(function(i) { return !i.read; }).length;
    badge.textContent  = n > 99 ? '99+' : n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }

  // ── inject bell button if this page doesn't have one ───────
  function _ensureBell() {
    if (document.getElementById(BADGE_ID)) return; // already present
    var actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.className = 'topbar-btn';
    btn.id        = 'ant-bell-btn';
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
    // Insert before theme toggle
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) actions.insertBefore(btn, themeBtn);
    else          actions.prepend(btn);
    // Re-render the lucide icon we just added
    if (window.lucide) window.lucide.createIcons({ nodes: [btn] });
  }

  // ── CSS ────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      // panel
      '#ant-panel{',
        'position:fixed;top:60px;right:12px;width:360px;',
        'max-height:calc(100dvh - 80px);',
        'background:var(--bg-surface,#1a1a2e);',
        'border:1px solid var(--border-light,rgba(255,255,255,.09));',
        'border-radius:16px;',
        'box-shadow:0 24px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.05);',
        'display:flex;flex-direction:column;',
        'z-index:99999;',
        'opacity:0;transform:translateY(-8px) scale(.97);pointer-events:none;',
        'transition:opacity .18s ease,transform .18s ease;}',
      '#ant-panel.ant-open{opacity:1;transform:none;pointer-events:all;}',

      // header
      '#ant-panel .ant-hdr{',
        'display:flex;align-items:center;gap:8px;',
        'padding:14px 16px 10px;',
        'border-bottom:1px solid var(--border-light,rgba(255,255,255,.07));',
        'flex-shrink:0;}',
      '#ant-panel .ant-hdr-title{',
        'font-size:14px;font-weight:700;',
        'color:var(--text-primary,#f1f5f9);flex:1;}',
      '#ant-panel .ant-hdr-count{',
        'font-size:11px;font-weight:700;',
        'background:#ef4444;color:#fff;',
        'padding:1px 7px;border-radius:20px;',
        'display:none;}',
      '#ant-panel .ant-hdr-count.ant-vis{display:inline-block;}',
      '#ant-panel .ant-hdr-actions{display:flex;gap:4px;}',
      '#ant-panel .ant-hbtn{',
        'font-size:11px;font-weight:600;',
        'color:var(--text-tertiary,rgba(255,255,255,.4));',
        'background:none;border:none;cursor:pointer;',
        'padding:4px 8px;border-radius:6px;',
        'transition:color .15s,background .15s;}',
      '#ant-panel .ant-hbtn:hover{',
        'color:var(--text-primary,#f1f5f9);',
        'background:rgba(255,255,255,.07);}',
      '#ant-panel .ant-close{',
        'width:26px;height:26px;border-radius:50%;',
        'background:rgba(255,255,255,.07);border:none;cursor:pointer;',
        'color:var(--text-tertiary,rgba(255,255,255,.4));',
        'display:flex;align-items:center;justify-content:center;',
        'flex-shrink:0;font-size:13px;',
        'transition:background .15s,color .15s;}',
      '#ant-panel .ant-close:hover{background:rgba(255,255,255,.14);color:var(--text-primary,#f1f5f9);}',

      // scroll body
      '#ant-panel .ant-body{',
        'flex:1;overflow-y:auto;overflow-x:hidden;',
        'scrollbar-width:thin;',
        'scrollbar-color:rgba(255,255,255,.1) transparent;}',
      '#ant-panel .ant-body::-webkit-scrollbar{width:4px;}',
      '#ant-panel .ant-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px;}',

      // section label
      '#ant-panel .ant-sec{',
        'font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;',
        'color:var(--text-tertiary,rgba(255,255,255,.28));',
        'padding:10px 16px 4px;}',

      // item
      '#ant-panel .ant-item{',
        'display:flex;align-items:flex-start;gap:11px;',
        'padding:10px 14px;cursor:pointer;',
        'border-bottom:1px solid var(--border-light,rgba(255,255,255,.05));',
        'transition:background .14s;position:relative;}',
      '#ant-panel .ant-item:hover{background:rgba(255,255,255,.04);}',
      '#ant-panel .ant-item.ant-unread{background:rgba(59,130,246,.045);}',
      '#ant-panel .ant-item.ant-unread:hover{background:rgba(59,130,246,.08);}',

      // unread dot
      '#ant-panel .ant-item.ant-unread::before{',
        'content:"";position:absolute;left:5px;top:50%;',
        'transform:translateY(-50%);',
        'width:4px;height:4px;border-radius:50%;background:#3b82f6;}',

      // icon blob
      '#ant-panel .ant-ico{',
        'width:34px;height:34px;border-radius:9px;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:15px;flex-shrink:0;}',

      // text
      '#ant-panel .ant-txt{flex:1;min-width:0;}',
      '#ant-panel .ant-ttl{',
        'font-size:13px;font-weight:600;',
        'color:var(--text-primary,#f1f5f9);',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
        'margin-bottom:2px;}',
      '#ant-panel .ant-dsc{',
        'font-size:12px;color:var(--text-tertiary,rgba(255,255,255,.45));',
        'line-height:1.4;',
        'display:-webkit-box;-webkit-box-orient:vertical;',
        '-webkit-line-clamp:2;overflow:hidden;',
        'margin-bottom:3px;}',
      '#ant-panel .ant-time{',
        'font-size:11px;color:var(--text-tertiary,rgba(255,255,255,.28));}',

      // dismiss x
      '#ant-panel .ant-del{',
        'width:20px;height:20px;border-radius:50%;',
        'background:none;border:none;cursor:pointer;',
        'color:var(--text-tertiary,rgba(255,255,255,.25));',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:12px;flex-shrink:0;margin-top:1px;',
        'transition:color .14s,background .14s;opacity:0;}',
      '#ant-panel .ant-item:hover .ant-del{opacity:1;}',
      '#ant-panel .ant-del:hover{color:#ef4444;background:rgba(239,68,68,.12);}',

      // empty state
      '#ant-panel .ant-empty{',
        'padding:48px 20px;text-align:center;',
        'color:var(--text-tertiary,rgba(255,255,255,.25));}',
      '#ant-panel .ant-empty-ico{font-size:36px;margin-bottom:10px;opacity:.35;}',
      '#ant-panel .ant-empty-txt{font-size:13px;}',

      // footer
      '#ant-panel .ant-foot{',
        'padding:8px 16px;flex-shrink:0;text-align:center;',
        'border-top:1px solid var(--border-light,rgba(255,255,255,.06));}',
      '#ant-panel .ant-foot-lbl{',
        'font-size:11px;color:var(--text-tertiary,rgba(255,255,255,.25));}',

      '@media(max-width:420px){',
        '#ant-panel{width:calc(100vw - 24px);right:12px;}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── build panel DOM ────────────────────────────────────────
  function _buildPanel() {
    var existing = document.getElementById(PANEL_ID);
    if (existing) existing.parentNode.removeChild(existing);

    var items   = _load();
    var unread  = items.filter(function(i) { return !i.read; });

    var panel = document.createElement('div');
    panel.id = PANEL_ID;

    // header
    var hdr   = _el('div', 'ant-hdr');
    var htxt  = _el('div', 'ant-hdr-title');
    htxt.textContent = 'Notifications';
    var hcnt  = _el('span', 'ant-hdr-count');
    if (unread.length > 0) {
      hcnt.textContent = unread.length;
      hcnt.classList.add('ant-vis');
    }
    htxt.appendChild(hcnt);

    var hact = _el('div', 'ant-hdr-actions');
    var markBtn = _el('button', 'ant-hbtn');
    markBtn.textContent = 'Mark read';
    markBtn.title = 'Mark all as read';
    markBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var all = _load();
      all.forEach(function(i) { i.read = true; });
      _save(all);
      _updateBadge();
      _refreshPanel();
    });

    var clrBtn = _el('button', 'ant-hbtn');
    clrBtn.textContent = 'Clear';
    clrBtn.title = 'Clear all notifications';
    clrBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      _save([]);
      _updateBadge();
      _refreshPanel();
    });

    var closeBtn = _el('button', 'ant-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      _close();
    });

    hact.appendChild(markBtn);
    hact.appendChild(clrBtn);
    hdr.appendChild(htxt);
    hdr.appendChild(hact);
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    // body
    var body = _el('div', 'ant-body');

    if (items.length === 0) {
      var empty = _el('div', 'ant-empty');
      var eico  = _el('div', 'ant-empty-ico');
      eico.textContent = '🔔';
      var etxt  = _el('div', 'ant-empty-txt');
      etxt.textContent = 'All caught up';
      empty.appendChild(eico);
      empty.appendChild(etxt);
      body.appendChild(empty);
    } else {
      // section: unread first, then read
      var groups = [
        { label: 'Unread', items: unread },
        { label: 'Earlier', items: items.filter(function(i) { return i.read; }) },
      ];
      groups.forEach(function(g) {
        if (!g.items.length) return;
        var sec = _el('div', 'ant-sec');
        sec.textContent = g.label;
        body.appendChild(sec);
        g.items.slice(0, 30).forEach(function(item) {
          body.appendChild(_buildItem(item));
        });
      });
    }
    panel.appendChild(body);

    // footer
    if (items.length > 0) {
      var foot = _el('div', 'ant-foot');
      var fl   = _el('span', 'ant-foot-lbl');
      fl.textContent = items.length + ' notification' + (items.length !== 1 ? 's' : '') +
                       ' · ' + unread.length + ' unread';
      foot.appendChild(fl);
      panel.appendChild(foot);
    }

    document.body.appendChild(panel);
  }

  function _buildItem(item) {
    var cfg  = TYPES[item.type] || TYPES.info;
    var row  = _el('div', 'ant-item' + (item.read ? '' : ' ant-unread'));
    row.setAttribute('data-id', item.id);

    var ico  = _el('div', 'ant-ico');
    ico.textContent   = cfg.icon;
    ico.style.background = cfg.bg;
    ico.style.color      = cfg.color;

    var txt  = _el('div', 'ant-txt');
    var ttl  = _el('div', 'ant-ttl');
    ttl.textContent = item.title;
    var dsc  = _el('div', 'ant-dsc');
    dsc.textContent = item.desc;
    var time = _el('div', 'ant-time');
    time.textContent = _ago(item.ts);

    txt.appendChild(ttl);
    if (item.desc) txt.appendChild(dsc);
    txt.appendChild(time);

    var del  = _el('button', 'ant-del');
    del.innerHTML = '&times;';
    del.setAttribute('aria-label', 'Dismiss');
    del.addEventListener('click', function(e) {
      e.stopPropagation();
      var all = _load().filter(function(i) { return i.id !== item.id; });
      _save(all);
      _updateBadge();
      _refreshPanel();
    });

    row.appendChild(ico);
    row.appendChild(txt);
    row.appendChild(del);

    row.addEventListener('click', function() {
      var all = _load();
      var n   = all.find(function(i) { return i.id === item.id; });
      if (n) { n.read = true; _save(all); }
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
    _buildPanel();
    // Mark in-flight Supabase data pull
    _pullSupabase();
    requestAnimationFrame(function() {
      var p = document.getElementById(PANEL_ID);
      if (p) p.classList.add('ant-open');
    });
    // Mark all as read after 2 s if still open
    setTimeout(function() {
      if (!_isOpen) return;
      var all = _load();
      all.forEach(function(i) { i.read = true; });
      _save(all);
      _updateBadge();
    }, 2000);
  }

  function _close() {
    _isOpen = false;
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    p.classList.remove('ant-open');
    setTimeout(function() {
      if (p.parentNode) p.parentNode.removeChild(p);
    }, 200);
  }

  function _toggle(e) {
    if (e) e.stopPropagation();
    if (_isOpen) _close();
    else         _open();
  }

  function _refreshPanel() {
    if (!_isOpen) return;
    _buildPanel();
    requestAnimationFrame(function() {
      var p = document.getElementById(PANEL_ID);
      if (p) p.classList.add('ant-open');
    });
  }

  // ── pull real data from Supabase when panel opens ──────────
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
    if (now - _lastPull < 30000) return; // max once per 30 s
    _lastPull = now;

    // Unread contact messages
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
            'message',
            '/admin-messages.html',
            'msg_' + m.id
          );
        });
      });

    // New signups in the last 24 h
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
          _add(
            name + ' joined',
            u.email || 'New account',
            'user',
            '/admin-users.html',
            'usr_' + u.id
          );
        });
      });
  }

  // ── bridge: admin-live-alerts feeds the tray in real time ──
  // Called by _AdminLiveAlerts when it fires a live popup.
  window._antFeed = function(type, data) {
    if (type === 'new_message') {
      _add(
        (data.name || data.email || 'Unknown') + ' sent a message',
        data.subject || (data.message || '').slice(0, 80),
        'message',
        '/admin-messages.html',
        data.id ? 'msg_' + data.id : null
      );
    } else if (type === 'user_joined') {
      _add(
        (data.name || (data.email || '').split('@')[0] || 'Unknown') + ' joined',
        data.email || 'New account',
        'user',
        '/admin-users.html',
        data.id ? 'usr_' + data.id : null
      );
    } else if (type === 'new_video') {
      _add(
        'New episode: ' + (data.title || 'Untitled'),
        data.description ? data.description.slice(0, 80) : 'IslamVoice',
        'video',
        '/admin-videos.html',
        data.id ? 'vid_' + data.id : null
      );
    }
  };

  // ── wire bell button click ─────────────────────────────────
  function _wireBell() {
    var btn = document.getElementById(BADGE_ID);
    if (!btn) return;
    var bellBtn = btn.closest('.topbar-btn') || document.getElementById('ant-bell-btn');
    if (!bellBtn) return;
    bellBtn.addEventListener('click', _toggle);
  }

  // Close when clicking outside
  document.addEventListener('click', function(e) {
    if (!_isOpen) return;
    var panel   = document.getElementById(PANEL_ID);
    var bellBtn = document.getElementById('ant-bell-btn') ||
                  (document.getElementById(BADGE_ID) &&
                   document.getElementById(BADGE_ID).closest('.topbar-btn'));
    if (!panel) return;
    if (!panel.contains(e.target) && (!bellBtn || !bellBtn.contains(e.target))) {
      _close();
    }
  });

  // ── init ───────────────────────────────────────────────────
  function _init() {
    _injectCSS();
    _ensureBell();
    _updateBadge();
    _wireBell();

    // Silently pull Supabase unread messages + recent signups in background
    if (_getSB()) {
      setTimeout(_pullSupabase, 4000);
    } else {
      var t = 0;
      var wait = setInterval(function() {
        if (_getSB()) { clearInterval(wait); setTimeout(_pullSupabase, 2000); }
        else if (++t > 60) { clearInterval(wait); }
      }, 500);
    }

    // Patch _AdminLiveAlerts._enqueue to feed the tray (if loaded after us)
    var _patchAttempts = 0;
    function _patchLiveAlerts() {
      if (window._AdminLiveAlerts && !window._AdminLiveAlerts.__antPatched) {
        var origEnqueue = window._AdminLiveAlerts._enqueueRaw;
        if (!origEnqueue) {
          // expose hook: live-alerts calls window._antFeed directly
          window._AdminLiveAlerts.__antPatched = true;
        }
      } else if (!window._AdminLiveAlerts && ++_patchAttempts < 20) {
        setTimeout(_patchLiveAlerts, 500);
      }
    }
    setTimeout(_patchLiveAlerts, 1000);
  }

  // ── public API ─────────────────────────────────────────────
  window.adminNotifications = {
    add: function(title, desc, type, link) {
      _add(title, desc, type, link, null);
    },
    test: function() {
      _add('Ahmed Hassan sent a message', 'Question about Quran recitation feature', 'message', '/admin-messages.html', null);
      _add('Sara Ahmed joined', 'sara.ahmed@example.com', 'user', '/admin-users.html', null);
      _add('New episode published', 'Tafsir Al-Baqarah — Episode 12', 'video', '/admin-videos.html', null);
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
