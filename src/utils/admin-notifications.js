/* =============================================================
   admin-notifications.js  v9  — Unified Notification System

   Primary source  → admin_activity_feed (realtime INSERT)
     Captures: new_message, new_user_signup, admin_login,
               new_video, task_update, and any future event
               types the backend writes there.

   Additional realtime:
     • app_error_logs       INSERT → instant error alert
     • admin_login_attempts INSERT (success=false) → security alert
     • islamvoice_episodes  INSERT (is_published) → video alert
     • admin_tasks          INSERT/UPDATE → task alert

   Background poll (every 60 s + on panel open):
     • admin_activity_feed  last 7 days (skip translation_updated)
     • app_error_logs       last 6 h
     • admin_tasks          overdue
     • islamvoice_episodes  published last 48 h
     • admin_login_attempts failed last 2 h
     • admin_mention_notifs last 30 days

   Presence events → _antPresenceJoin / _antPresenceLeave (dashboard ATO)
   App user activity → _antFeed('user_online'/'user_offline') from live-alerts

   Storage key : 'ant_v5'  (max 200 items)
   Public API  : adminNotifications.add / updateBySourceId / test
   ============================================================= */
(function () {
  'use strict';

  // Items whose DB timestamp predates this moment by more than 1 h are loaded
  // as already-read. This prevents a freshly-logged-in second PC from seeing
  // a flood of unread badge counts from historical poll data.
  var _sessionStart = Date.now();

  var STORE_KEY = 'ant_v5';
  var MAX_ITEMS = 200;
  var PANEL_ID  = 'ant-panel';
  var BADGE_ID  = 'notification-badge';
  var STYLE_ID  = 'ant-styles';
  var POLL_MS   = 60000;   // background auto-refresh interval

  // ── ATO palette (avatar initials) ─────────────────────────
  var ATO_PAL = [
    {bg:'rgba(99,102,241,.22)',  color:'#818cf8'},
    {bg:'rgba(16,185,129,.22)', color:'#34d399'},
    {bg:'rgba(59,130,246,.22)', color:'#60a5fa'},
    {bg:'rgba(245,158,11,.22)', color:'#fbbf24'},
    {bg:'rgba(239,68,68,.22)',  color:'#f87171'},
    {bg:'rgba(6,182,212,.22)',  color:'#22d3ee'},
    {bg:'rgba(236,72,153,.22)', color:'#f472b6'},
    {bg:'rgba(168,85,247,.22)', color:'#c084fc'},
  ];
  function _atoCol(ch) {
    return ATO_PAL[(ch.toUpperCase().charCodeAt(0)||65) % ATO_PAL.length];
  }

  // ── Type config ────────────────────────────────────────────
  var TYPES = {
    presence_online:  { svg: _svg_user_check, color: '#22c55e', bg: 'rgba(34,197,94,.15)',   label: 'Online',    tab: 'presence'  },
    presence_offline: { svg: _svg_user_x,     color: '#64748b', bg: 'rgba(100,116,139,.12)', label: 'Offline',   tab: 'presence'  },
    message:          { svg: _svg_msg,        color: '#ef4444', bg: 'rgba(239,68,68,.15)',   label: 'Message',   tab: 'message'   },
    user:             { svg: _svg_user,       color: '#8b5cf6', bg: 'rgba(139,92,246,.15)',  label: 'User',      tab: 'user'      },
    video:            { svg: _svg_video,      color: '#f59e0b', bg: 'rgba(245,158,11,.15)',  label: 'Video',     tab: 'content'   },
    error:            { svg: _svg_warn,       color: '#ef4444', bg: 'rgba(239,68,68,.15)',   label: 'Error',     tab: 'error'     },
    security:         { svg: _svg_shield,     color: '#f59e0b', bg: 'rgba(245,158,11,.15)',  label: 'Security',  tab: 'security'  },
    task:             { svg: _svg_task,       color: '#06b6d4', bg: 'rgba(6,182,212,.15)',   label: 'Task',      tab: 'task'      },
    activity:         { svg: _svg_activity,   color: '#06b6d4', bg: 'rgba(6,182,212,.12)',   label: 'Activity',  tab: 'activity'  },
    info:             { svg: _svg_info,       color: '#3b82f6', bg: 'rgba(59,130,246,.15)',  label: 'Info',      tab: 'info'      },
    success:          { svg: _svg_check,      color: '#10b981', bg: 'rgba(16,185,129,.15)',  label: 'Success',   tab: 'success'   },
    mention:          { svg: _svg_at,         color: '#818cf8', bg: 'rgba(99,102,241,.15)',  label: 'Mention',   tab: 'mention'   },
  };

  var TABS = [
    { id: 'all',      label: 'All'      },
    { id: 'unread',   label: 'Unread'   },
    { id: 'presence', label: 'Presence' },
    { id: 'message',  label: 'Messages' },
    { id: 'user',     label: 'Users'    },
    { id: 'error',    label: 'Errors'   },
    { id: 'security', label: 'Security' },
    { id: 'task',     label: 'Tasks'    },
    { id: 'content',  label: 'Content'  },
    { id: 'activity', label: 'Activity' },
  ];

  var _currentFilter = 'all';
  var _isOpen        = false;
  var _presenceTimers = {};
  var _rtChannel     = null;
  var _autoTimer     = null;

  // ── SVG icons ──────────────────────────────────────────────
  function _svgWrap(path) {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  function _svg_user_check() { return _svgWrap('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>'); }
  function _svg_user_x()     { return _svgWrap('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/>'); }
  function _svg_msg()        { return _svgWrap('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'); }
  function _svg_user()       { return _svgWrap('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'); }
  function _svg_video()      { return _svgWrap('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>'); }
  function _svg_warn()       { return _svgWrap('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'); }
  function _svg_shield()     { return _svgWrap('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'); }
  function _svg_task()       { return _svgWrap('<rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'); }
  function _svg_activity()   { return _svgWrap('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'); }
  function _svg_info()       { return _svgWrap('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'); }
  function _svg_check()      { return _svgWrap('<polyline points="20 6 9 17 4 12"/>'); }
  function _svg_at()         { return _svgWrap('<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>'); }
  function _svg_bell()       { return _svgWrap('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'); }

  // ── Storage ────────────────────────────────────────────────
  var DISMISSED_KEY  = 'ant_dismissed_v5';  // persists across clear
  var CLEARED_AT_KEY = 'ant_cleared_at_v5'; // timestamp of last "Clear all"
  var MAX_DISMISSED  = 1000;

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

  // Permanently dismissed sourceIds — survive clear, survive page reload, survive polls
  function _getDismissed() {
    try { var a = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); return new Set(Array.isArray(a) ? a : []); }
    catch(e) { return new Set(); }
  }
  function _saveDismissed(set) {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set).slice(-MAX_DISMISSED))); } catch(e) {}
  }
  function _dismissSourceId(sourceId) {
    if (!sourceId) return;
    var s = _getDismissed(); s.add(sourceId); _saveDismissed(s);
  }
  function _isDismissed(sourceId) {
    return sourceId ? _getDismissed().has(sourceId) : false;
  }

  // BroadcastChannel: sync clear / dismiss / mark-read across tabs on the same browser
  var _bc = null;
  try {
    _bc = new BroadcastChannel('ant_state_v5');
    _bc.addEventListener('message', function(e) {
      var msg = e.data || {};
      if (msg.t === 'clear') {
        _save([]); _updateBadge(); _refreshPanel();
      } else if (msg.t === 'dismiss' && msg.sid) {
        _save(_load().filter(function(i) { return i.sourceId !== msg.sid; }));
        _updateBadge(); _refreshPanel();
      } else if (msg.t === 'read') {
        var all = _load(); all.forEach(function(i) { i.read = true; }); _save(all);
        _updateBadge(); _refreshPanel();
      }
    });
  } catch(_e) { /* BroadcastChannel not supported — graceful degradation */ }

  function _broadcast(msg) { if (_bc) try { _bc.postMessage(msg); } catch(_e) {} }

  // ── Add ───────────────────────────────────────────────────
  // eventTs (optional 8th arg): actual DB timestamp (ms).
  // Items older than 1 h before this session start are pre-marked read
  // so a second PC login doesn't flood the badge with historical data.
  function _add(title, desc, type, link, sourceId, dbId, meta, eventTs) {
    if (sourceId && _hasSeen(sourceId)) return null;
    if (sourceId && _isDismissed(sourceId)) return null;  // permanently dismissed
    var items = _load();
    var ts = (eventTs && eventTs > 0) ? eventTs : Date.now();
    var preRead = ts < (_sessionStart - 3600000);  // older than 1h before login → already read
    var n = {
      id:       Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      sourceId: sourceId || null,
      dbId:     dbId     || null,
      title:    title,
      desc:     desc     || '',
      type:     type     || 'info',
      link:     link     || null,
      ts:       ts,
      read:     preRead,
      meta:     meta     || null,
    };
    items.unshift(n);
    _save(items);
    _updateBadge();
    _refreshPanel();
    if (!preRead) _ringBell();  // only ring for genuinely new items
    return n.id;
  }

  // ── Update by sourceId (presence online → offline) ────────
  function _updateBySourceId(sourceId, changes) {
    if (!sourceId) return;
    var items = _load(), found = false;
    items = items.map(function(item) {
      if (item.sourceId === sourceId) { found = true; return Object.assign({}, item, changes, { ts: item.ts }); }
      return item;
    });
    if (found) { _save(items); _updateBadge(); _refreshPanel(); }
  }

  // ── Mark DB mention read ───────────────────────────────────
  function _markReadInDB(dbId) {
    if (!dbId) return;
    var sb = _getSB();
    if (!sb) return;
    sb.from('admin_mention_notifs').update({ read: true }).eq('id', dbId).then(function() {});
  }

  // ── Map admin_activity_feed row to notification ────────────
  // sourceId is normalised to match the realtime subscription format so that
  // activity-feed poll + realtime events for the same entity dedup correctly.
  function _mapFeedEvent(ev) {
    if (ev.event_type === 'translation_updated') return;

    var type = 'info', link = null, sourceId;
    var m = ev.metadata || {};

    switch (ev.event_type) {
      case 'new_message':
        type = 'message'; link = '/admin-messages.html';
        // Normalise to 'msg_X' — matches realtime subscription sourceId
        sourceId = (m.message_id || m.id) ? 'msg_' + (m.message_id || m.id) : 'feed_' + ev.id;
        break;
      case 'new_user_signup':
        type = 'user'; link = '/admin-users.html';
        sourceId = (m.user_id || m.id) ? 'usr_' + (m.user_id || m.id) : 'feed_' + ev.id;
        break;
      case 'admin_login':
        type = 'security'; link = '/admin-audit.html';
        sourceId = 'feed_' + ev.id;
        break;
      case 'new_video':
      case 'episode_published':
        type = 'video'; link = '/admin-islamvoice-management.html';
        // Normalise to 'vid_X' — matches realtime subscription + direct poll sourceId
        sourceId = (m.episode_id || m.id) ? 'vid_' + (m.episode_id || m.id) : 'feed_' + ev.id;
        break;
      case 'task_created':
      case 'task_assigned':
      case 'task_updated':
        type = 'task'; link = '/admin-tasks.html';
        sourceId = (m.task_id || m.id) ? 'task_' + (m.task_id || m.id) : 'feed_' + ev.id;
        break;
      case 'app_error':
      case 'error':
        type = 'error'; link = '/admin-errors.html';
        sourceId = 'feed_' + ev.id;
        break;
      case 'failed_login':
      case 'security_alert':
        type = 'security'; link = '/admin-auth-monitor.html';
        sourceId = 'feed_' + ev.id;
        break;
      default:
        sourceId = 'feed_' + ev.id;
        switch (ev.category) {
          case 'security': type = 'security'; link = '/admin-audit.html'; break;
          case 'users':    type = 'user';     link = '/admin-users.html'; break;
          case 'content':  type = 'info';     break;
          case 'error':    type = 'error';    link = '/admin-errors.html'; break;
        }
    }

    var evTs = ev.created_at ? new Date(ev.created_at).getTime() : null;
    _add(ev.title, ev.message, type, link, sourceId, null, null, evTs);
  }

  // ── Time helpers ───────────────────────────────────────────
  function _ago(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 5)     return 'just now';
    if (d < 60)    return Math.floor(d) + 's ago';
    if (d < 3600)  return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }
  function _timeGroup(ts) {
    var now = new Date(), todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var ydayStart = todayStart - 86400000, weekStart = todayStart - 6 * 86400000;
    if (ts >= todayStart) return 'Today';
    if (ts >= ydayStart)  return 'Yesterday';
    if (ts >= weekStart)  return 'This Week';
    return 'Earlier';
  }
  function _fmtClock(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function _fmtDur(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + sec + 's';
    return sec + 's';
  }

  // ── Filter ─────────────────────────────────────────────────
  function _filterItems(items, f) {
    if (f === 'all')    return items;
    if (f === 'unread') return items.filter(function(i) { return !i.read; });
    if (f === 'presence') return items.filter(function(i) { return i.type === 'presence_online' || i.type === 'presence_offline'; });
    return items.filter(function(i) { return (TYPES[i.type] || {}).tab === f || i.type === f; });
  }

  // ── Badge ──────────────────────────────────────────────────
  function _updateBadge() {
    var badge = document.getElementById(BADGE_ID);
    var n = _load().filter(function(i) { return !i.read; }).length;
    if (badge) {
      badge.textContent = n > 99 ? '99+' : n;
      badge.style.display = n > 0 ? 'flex' : 'none';
    }
    var bellBtn = document.getElementById('notifBellBtn') || document.getElementById('ant-bell-btn') || (badge && badge.closest('button'));
    if (bellBtn) {
      if (n > 0) bellBtn.classList.add('ant-bell-pulse');
      else       bellBtn.classList.remove('ant-bell-pulse');
    }
  }

  function _ringBell() {
    var bellBtn = document.getElementById('notifBellBtn') || document.getElementById('ant-bell-btn');
    if (!bellBtn) return;
    bellBtn.classList.add('ant-bell-ring');
    setTimeout(function() { bellBtn.classList.remove('ant-bell-ring'); }, 700);
  }

  // ── Inject bell if absent ──────────────────────────────────
  function _ensureBell() {
    var existing = document.getElementById('notifBellBtn');
    if (existing) {
      existing.classList.add('ant-bell-managed');
      existing.addEventListener('click', _toggle);
      if (!document.getElementById(BADGE_ID)) {
        var badge = document.createElement('span');
        badge.id = BADGE_ID; badge.className = 'ant-badge';
        existing.style.position = 'relative';
        existing.appendChild(badge);
      }
      return;
    }
    if (document.getElementById(BADGE_ID)) return;
    var actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.className = 'topbar-btn ant-bell-managed';
    btn.id = 'ant-bell-btn';
    btn.setAttribute('aria-label', 'Notifications');
    btn.setAttribute('title', 'Notifications');
    btn.style.position = 'relative';
    btn.innerHTML = _svg_bell() + '<span id="' + BADGE_ID + '" class="ant-badge" style="display:none"></span>';
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) actions.insertBefore(btn, themeBtn);
    else          actions.prepend(btn);
    btn.addEventListener('click', _toggle);
  }

  // ── CSS ────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '@keyframes ant-ring{0%,100%{transform:rotate(0)}12%{transform:rotate(14deg)}25%{transform:rotate(-11deg)}37%{transform:rotate(8deg)}50%{transform:rotate(-5deg)}62%{transform:rotate(3deg)}}',
      '@keyframes ant-pulse-ring{0%{box-shadow:0 0 0 0 rgba(99,102,241,.55)}70%{box-shadow:0 0 0 8px rgba(99,102,241,0)}100%{box-shadow:0 0 0 0 rgba(99,102,241,0)}}',
      '@keyframes ant-item-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}',
      '@keyframes ant-hdr-shift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}',

      '.ant-bell-managed{position:relative !important;}',
      '.ant-bell-pulse{animation:ant-pulse-ring 2s ease-out infinite !important;}',
      '.ant-bell-ring svg,.ant-bell-ring i{animation:ant-ring .65s ease !important;}',

      '.ant-badge{',
        'position:absolute;top:-5px;right:-5px;',
        'background:#ef4444;color:#fff;',
        'font-size:9px;font-weight:800;',
        'padding:1px 5px;border-radius:10px;',
        'min-width:16px;text-align:center;line-height:1.7;',
        'pointer-events:none;letter-spacing:0;',
        'border:1.5px solid var(--bg-app,#f8f9fa);',
        'display:flex !important;align-items:center;justify-content:center;}',
      'body.dark-mode .ant-badge{border-color:var(--bg-surface,#111);}',

      '#ant-panel{',
        'position:fixed;top:58px;right:12px;',
        'width:400px;max-width:calc(100vw - 24px);',
        'max-height:calc(100dvh - 76px);',
        'background:var(--bg-surface);',
        'border:1px solid var(--border-light);',
        'border-radius:18px;',
        'box-shadow:0 24px 72px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.05);',
        'display:flex;flex-direction:column;overflow:hidden;',
        'z-index:99999;',
        'opacity:0;transform:translateY(-10px) scale(.96);pointer-events:none;',
        'transition:opacity .18s cubic-bezier(.4,0,.2,1),transform .2s cubic-bezier(.22,.68,0,1.2);}',
      '#ant-panel.ant-open{opacity:1;transform:none;pointer-events:all;}',
      'body.dark-mode #ant-panel{box-shadow:0 24px 72px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.05);}',

      '#ant-panel::before{',
        'content:"";position:absolute;top:0;left:0;right:0;height:3px;',
        'background:linear-gradient(90deg,#6366f1,#3b82f6,#8b5cf6,#06b6d4,#6366f1);',
        'background-size:300% 100%;',
        'animation:ant-hdr-shift 6s ease infinite;',
        'border-radius:18px 18px 0 0;}',

      '#ant-panel .ant-hdr{display:flex;align-items:center;gap:10px;padding:18px 16px 12px;flex-shrink:0;}',
      '#ant-panel .ant-hdr-icon{width:34px;height:34px;border-radius:10px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#6366f1;}',
      '#ant-panel .ant-hdr-icon svg{width:16px;height:16px;}',
      '#ant-panel .ant-hdr-main{flex:1;min-width:0;}',
      '#ant-panel .ant-hdr-title{font-size:15px;font-weight:800;color:var(--text-primary);letter-spacing:-.3px;}',
      '#ant-panel .ant-hdr-sub{font-size:11px;color:var(--text-tertiary);margin-top:1px;}',
      '#ant-panel .ant-hdr-actions{display:flex;gap:4px;align-items:center;}',
      '#ant-panel .ant-hbtn{font-size:11px;font-weight:600;padding:5px 9px;border-radius:7px;border:1px solid var(--border-light);background:var(--bg-hover);color:var(--text-secondary);cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;}',
      '#ant-panel .ant-hbtn:hover{background:var(--bg-active);color:var(--text-primary);}',
      '#ant-panel .ant-hbtn.ant-hbtn-danger:hover{background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.25);}',
      '#ant-panel .ant-close{width:28px;height:28px;border-radius:8px;background:var(--bg-hover);border:none;cursor:pointer;color:var(--text-tertiary);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:all .15s;}',
      '#ant-panel .ant-close:hover{background:rgba(239,68,68,.12);color:#ef4444;}',

      '#ant-panel .ant-tabs{display:flex;gap:4px;padding:0 12px 10px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;}',
      '#ant-panel .ant-tabs::-webkit-scrollbar{display:none;}',
      '#ant-panel .ant-tab{font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:20px;border:1px solid transparent;cursor:pointer;white-space:nowrap;background:var(--bg-hover);color:var(--text-tertiary);transition:all .14s;flex-shrink:0;font-family:inherit;}',
      '#ant-panel .ant-tab:hover{color:var(--text-primary);background:var(--bg-active);}',
      '#ant-panel .ant-tab.ant-tab-active{background:rgba(99,102,241,.12);color:#6366f1;border-color:rgba(99,102,241,.25);}',
      '#ant-panel .ant-tab-cnt{display:inline-block;font-size:9px;font-weight:800;background:rgba(99,102,241,.2);color:#6366f1;padding:0 5px;border-radius:6px;min-width:14px;text-align:center;margin-left:3px;line-height:1.6;}',
      '#ant-panel .ant-tab.ant-tab-active .ant-tab-cnt{background:rgba(99,102,241,.3);}',

      '#ant-panel .ant-divider{height:1px;background:var(--border-light);flex-shrink:0;}',
      '#ant-panel .ant-body{flex:1;overflow-y:auto;overflow-x:hidden;}',
      '#ant-panel .ant-body::-webkit-scrollbar{width:3px;}',
      '#ant-panel .ant-body::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:2px;}',

      '#ant-panel .ant-sec{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-tertiary);padding:10px 16px 4px;display:flex;align-items:center;gap:8px;}',
      '#ant-panel .ant-sec::after{content:"";flex:1;height:1px;background:var(--border-light);}',

      '#ant-panel .ant-item{display:flex;align-items:flex-start;gap:11px;padding:11px 14px 11px 16px;cursor:pointer;position:relative;border-left:3px solid transparent;transition:background .12s,border-color .12s;animation:ant-item-in .18s ease both;}',
      '#ant-panel .ant-item:hover{background:var(--bg-hover);}',
      '#ant-panel .ant-item.ant-unread{border-left-color:currentColor;}',
      '#ant-panel .ant-item.ant-unread:hover{background:var(--bg-active);}',

      '#ant-panel .ant-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}',
      '#ant-panel .ant-ico svg{width:15px;height:15px;}',
      '#ant-panel .ant-av{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;margin-top:1px;}',

      '#ant-panel .ant-txt{flex:1;min-width:0;}',
      '#ant-panel .ant-ttl{font-size:13px;font-weight:600;color:var(--text-primary);line-height:1.3;margin-bottom:3px;}',
      '#ant-panel .ant-item.ant-unread .ant-ttl{font-weight:700;}',
      '#ant-panel .ant-dsc{font-size:11.5px;color:var(--text-secondary);line-height:1.45;margin-bottom:4px;}',

      '#ant-panel .ant-pr{display:flex;flex-direction:column;gap:2px;margin-top:2px;}',
      '#ant-panel .ant-pr-row{display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--text-tertiary);}',
      '#ant-panel .ant-pr-lbl{font-weight:600;min-width:38px;}',
      '#ant-panel .ant-pr-val{font-weight:700;color:var(--text-primary);font-family:monospace;font-size:11px;}',
      '#ant-panel .ant-pr-sep{border-top:1px solid var(--border-light);margin:4px 0;}',
      '#ant-panel .ant-pr-total .ant-pr-val{color:#6366f1;}',
      '#ant-panel .ant-live{color:#16a34a;font-family:monospace;font-size:10.5px;font-weight:700;}',

      '#ant-panel .ant-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}',
      '#ant-panel .ant-time{font-size:10.5px;color:var(--text-tertiary);font-weight:500;}',
      '#ant-panel .ant-type-badge{font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:5px;letter-spacing:.03em;flex-shrink:0;}',

      '#ant-panel .ant-action{font-size:11px;font-weight:700;padding:3px 10px;border-radius:7px;border:none;cursor:pointer;background:rgba(99,102,241,.12);color:#6366f1;transition:background .14s;display:inline-flex;align-items:center;gap:4px;opacity:0;font-family:inherit;margin-top:5px;}',
      '#ant-panel .ant-item:hover .ant-action{opacity:1;}',
      '#ant-panel .ant-action:hover{background:rgba(99,102,241,.25);}',

      '#ant-panel .ant-del{width:22px;height:22px;border-radius:6px;background:none;border:none;cursor:pointer;color:var(--text-tertiary);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:1px;transition:all .14s;opacity:0;}',
      '#ant-panel .ant-item:hover .ant-del{opacity:1;}',
      '#ant-panel .ant-del:hover{color:#ef4444;background:rgba(239,68,68,.12);}',

      '#ant-panel .ant-empty{padding:52px 24px;text-align:center;color:var(--text-tertiary);}',
      '#ant-panel .ant-empty svg{opacity:.3;margin-bottom:12px;}',
      '#ant-panel .ant-empty-ttl{font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:4px;}',
      '#ant-panel .ant-empty-sub{font-size:12px;}',

      '#ant-panel .ant-foot{padding:10px 16px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-light);}',
      '#ant-panel .ant-foot-lbl{font-size:11px;color:var(--text-tertiary);}',
      '#ant-panel .ant-live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-right:4px;animation:ant-pulse-ring 2s ease-out infinite;}',

      '@media(max-width:480px){#ant-panel{top:52px;left:8px;right:8px;width:auto;}}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Build notification item ────────────────────────────────
  function _buildItem(item, idx) {
    var cfg = TYPES[item.type] || TYPES.info;
    var row = _el('div', 'ant-item' + (item.read ? '' : ' ant-unread'));
    row.dataset.id = item.id;
    row.style.animationDelay = (idx * 20) + 'ms';
    if (!item.read) row.style.color = cfg.color;

    var isPresence = item.type === 'presence_online' || item.type === 'presence_offline';
    if (isPresence && item.meta && item.meta.initChar) {
      var av = _el('div', 'ant-av');
      var col = _atoCol(item.meta.initChar);
      av.style.background = col.bg; av.style.color = col.color;
      av.textContent = item.meta.initChar;
      if (item.type === 'presence_online') av.style.boxShadow = '0 0 0 2px #22c55e, 0 0 0 4px rgba(34,197,94,.2)';
      else av.style.opacity = '.7';
      row.appendChild(av);
    } else {
      var ico = _el('div', 'ant-ico');
      ico.style.background = cfg.bg; ico.style.color = cfg.color;
      ico.innerHTML = cfg.svg();
      row.appendChild(ico);
    }

    var txt = _el('div', 'ant-txt');
    var ttl = _el('div', 'ant-ttl');
    ttl.textContent = item.title;
    txt.appendChild(ttl);

    if (item.desc) {
      var dsc = _el('div', 'ant-dsc');
      dsc.textContent = item.desc;
      txt.appendChild(dsc);
    }

    // Presence detail rows
    if (isPresence && item.meta) {
      var pr = _el('div', 'ant-pr'), m = item.meta;
      if (m.joinTime) {
        var r1 = _el('div', 'ant-pr-row');
        r1.innerHTML = '<span class="ant-pr-lbl" style="color:' + (item.type==='presence_online'?'#16a34a':'var(--text-tertiary)') + '">▶ Joined</span><span class="ant-pr-val">' + _fmtClock(new Date(m.joinTime).getTime()) + '</span>';
        pr.appendChild(r1);
      }
      if (item.type === 'presence_online' && m.joinTime) {
        var r2 = _el('div', 'ant-pr-row'), liveSpan = _el('span', 'ant-live');
        liveSpan.textContent = _fmtDur(Date.now() - new Date(m.joinTime).getTime());
        r2.innerHTML = '<span class="ant-pr-lbl">⏱ Online</span>';
        r2.appendChild(liveSpan);
        pr.appendChild(r2);
        _presenceTimers[item.id] = setInterval(function() {
          liveSpan.textContent = _fmtDur(Date.now() - new Date(m.joinTime).getTime());
        }, 1000);
      }
      if (item.type === 'presence_offline') {
        if (m.leaveTime) {
          var r3 = _el('div', 'ant-pr-row');
          r3.innerHTML = '<span class="ant-pr-lbl">■ Left</span><span class="ant-pr-val">' + _fmtClock(new Date(m.leaveTime).getTime()) + '</span>';
          pr.appendChild(r3);
        }
        if (m.duration !== undefined) {
          var sep = _el('div', 'ant-pr-sep'); pr.appendChild(sep);
          var rt = _el('div', 'ant-pr-row ant-pr-total');
          rt.innerHTML = '<span class="ant-pr-lbl" style="color:#6366f1">⏱ Total</span><span class="ant-pr-val" style="color:#6366f1">' + _fmtDur(m.duration) + '</span>';
          pr.appendChild(rt);
        }
      }
      txt.appendChild(pr);
    }

    var meta = _el('div', 'ant-meta');
    meta.style.marginTop = '4px';
    var time = _el('span', 'ant-time'); time.textContent = _ago(item.ts);
    var badge = _el('span', 'ant-type-badge');
    badge.textContent = cfg.label;
    badge.style.cssText = 'background:' + cfg.bg + ';color:' + cfg.color + ';';
    meta.appendChild(time); meta.appendChild(badge);
    txt.appendChild(meta);

    // Action buttons
    var actLabel = null;
    if (item.type === 'message')  actLabel = 'Reply →';
    else if (item.type === 'mention') actLabel = 'View →';
    else if (item.link) actLabel = 'Go to →';
    if (actLabel) {
      var act = _el('button', 'ant-action');
      act.innerHTML = actLabel;
      act.addEventListener('click', function(e) {
        e.stopPropagation();
        _markSingleRead(item.id);
        if (item.dbId) _markReadInDB(item.dbId);
        if (item.link) window.location.href = item.link;
      });
      txt.appendChild(act);
    }

    row.appendChild(txt);

    var del = _el('button', 'ant-del');
    del.innerHTML = '&times;'; del.title = 'Dismiss';
    del.addEventListener('click', function(e) {
      e.stopPropagation();
      if (item.sourceId) _dismissSourceId(item.sourceId);  // never re-add from polls
      _save(_load().filter(function(i) { return i.id !== item.id; }));
      _updateBadge(); _refreshPanel();
      _broadcast({ t: 'dismiss', sid: item.sourceId });
    });
    row.appendChild(del);

    row.addEventListener('click', function() {
      _markSingleRead(item.id);
      if (item.dbId) _markReadInDB(item.dbId);
      if (item.link) window.location.href = item.link;
      else _refreshPanel();
    });

    return row;
  }

  function _markSingleRead(id) {
    var all = _load();
    all.forEach(function(n) { if (n.id === id) n.read = true; });
    _save(all); _updateBadge();
  }

  // ── Build panel ────────────────────────────────────────────
  function _buildPanel() {
    Object.keys(_presenceTimers).forEach(function(k) { clearInterval(_presenceTimers[k]); });
    _presenceTimers = {};

    var existing = document.getElementById(PANEL_ID);
    if (existing) existing.parentNode.removeChild(existing);

    var allItems = _load();
    var unreadN  = allItems.filter(function(i) { return !i.read; }).length;
    var filtered = _filterItems(allItems, _currentFilter);

    var panel = _el('div'); panel.id = PANEL_ID;

    // Header
    var hdr = _el('div', 'ant-hdr');
    var hicon = _el('div', 'ant-hdr-icon'); hicon.innerHTML = _svg_bell();
    var hmain = _el('div', 'ant-hdr-main');
    hmain.innerHTML = '<div class="ant-hdr-title">Notifications</div>' +
      '<div class="ant-hdr-sub">' +
        (_rtChannel ? '<span class="ant-live-dot"></span>Live · ' : '') +
        (unreadN > 0 ? unreadN + ' unread' : 'All caught up') +
      '</div>';
    var hact = _el('div', 'ant-hdr-actions');

    var refreshBtn = _el('button', 'ant-hbtn');
    refreshBtn.title = 'Refresh'; refreshBtn.innerHTML = '↻';
    refreshBtn.addEventListener('click', function(e) { e.stopPropagation(); _lastPull=0; _pullSupabase(); });

    var markBtn = _el('button', 'ant-hbtn');
    markBtn.textContent = 'All read';
    markBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var all = _load(); all.forEach(function(i) { i.read = true; }); _save(all);
      _updateBadge(); _refreshPanel();
      _broadcast({ t: 'read' });
    });

    var clrBtn = _el('button', 'ant-hbtn ant-hbtn-danger');
    clrBtn.textContent = 'Clear';
    clrBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      // Permanently dismiss all current sourceIds so polls never re-add them
      var all = _load(), set = _getDismissed();
      all.forEach(function(n) { if (n.sourceId) set.add(n.sourceId); });
      _saveDismissed(set);
      localStorage.setItem(CLEARED_AT_KEY, String(Date.now()));
      _save([]); _updateBadge(); _refreshPanel();
      _broadcast({ t: 'clear' });
    });

    var closeBtn = _el('button', 'ant-close');
    closeBtn.innerHTML = '&times;'; closeBtn.title = 'Close';
    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); _close(); });

    hact.appendChild(refreshBtn); hact.appendChild(markBtn); hact.appendChild(clrBtn); hact.appendChild(closeBtn);
    hdr.appendChild(hicon); hdr.appendChild(hmain); hdr.appendChild(hact);
    panel.appendChild(hdr);

    // Tabs (only show tabs with content, always show All/Unread/Presence)
    var tabs = _el('div', 'ant-tabs');
    TABS.forEach(function(tab) {
      var cnt = tab.id === 'unread' ? unreadN
              : tab.id === 'all'   ? allItems.length
              : _filterItems(allItems, tab.id).length;
      // Skip empty tabs except All, Unread, Presence
      if (cnt === 0 && tab.id !== 'all' && tab.id !== 'unread' && tab.id !== 'presence') return;
      var btn = _el('button', 'ant-tab' + (tab.id === _currentFilter ? ' ant-tab-active' : ''));
      btn.innerHTML = tab.label + (cnt > 0 ? '<span class="ant-tab-cnt">' + cnt + '</span>' : '');
      btn.addEventListener('click', function(e) { e.stopPropagation(); _currentFilter = tab.id; _refreshPanel(); });
      tabs.appendChild(btn);
    });
    panel.appendChild(tabs);
    panel.appendChild(_el('div', 'ant-divider'));

    // Body
    var body = _el('div', 'ant-body');
    if (!filtered.length) {
      var empty = _el('div', 'ant-empty');
      var isAllEmpty = allItems.length === 0;
      empty.innerHTML = [
        _svgWrap(_currentFilter === 'unread' ? '<polyline points="20 6 9 17 4 12"/>' : '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
        '<div class="ant-empty-ttl">' + (_currentFilter === 'unread' ? 'All caught up' : isAllEmpty ? 'No notifications' : 'Nothing here') + '</div>',
        '<div class="ant-empty-sub">' + (_currentFilter === 'unread' ? 'No unread notifications' : isAllEmpty ? 'Events will appear here in real time' : 'No ' + _currentFilter + ' notifications') + '</div>',
      ].join('');
      body.appendChild(empty);
    } else {
      var groups = {}, groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];
      filtered.forEach(function(item) {
        var g = _timeGroup(item.ts);
        if (!groups[g]) groups[g] = [];
        groups[g].push(item);
      });
      var globalIdx = 0;
      groupOrder.forEach(function(gLabel) {
        if (!groups[gLabel] || !groups[gLabel].length) return;
        var sec = _el('div', 'ant-sec'); sec.textContent = gLabel; body.appendChild(sec);
        groups[gLabel].slice(0, 50).forEach(function(item) { body.appendChild(_buildItem(item, globalIdx++)); });
      });
    }
    panel.appendChild(body);

    if (allItems.length > 0) {
      var foot = _el('div', 'ant-foot');
      foot.innerHTML = '<span class="ant-foot-lbl">' + allItems.length + ' total · ' + unreadN + ' unread</span>';
      panel.appendChild(foot);
    }

    document.body.appendChild(panel);
  }

  function _el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // ── Open / Close ───────────────────────────────────────────
  function _open() {
    _isOpen = true; _currentFilter = 'all';
    _buildPanel();
    _lastPull = 0; _pullSupabase();
    requestAnimationFrame(function() {
      var p = document.getElementById(PANEL_ID);
      if (p) p.classList.add('ant-open');
    });
    setTimeout(function() {
      if (!_isOpen) return;
      var all = _load(); all.forEach(function(i) { i.read = true; }); _save(all); _updateBadge();
    }, 3000);
  }

  function _close() {
    _isOpen = false;
    Object.keys(_presenceTimers).forEach(function(k) { clearInterval(_presenceTimers[k]); });
    _presenceTimers = {};
    var p = document.getElementById(PANEL_ID);
    if (!p) return;
    p.classList.remove('ant-open');
    setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p); }, 220);
  }

  function _toggle(e) { if (e) e.stopPropagation(); _isOpen ? _close() : _open(); }

  function _refreshPanel() {
    if (!_isOpen) return;
    _buildPanel();
    requestAnimationFrame(function() {
      var p = document.getElementById(PANEL_ID);
      if (p) p.classList.add('ant-open');
    });
  }

  // ── Supabase ───────────────────────────────────────────────
  function _getSB() {
    if (window.adminAuth && window.adminAuth.getSupabase) return window.adminAuth.getSupabase();
    if (window.supabaseClient) return window.supabaseClient;
    return null;
  }

  // ── Realtime subscriptions ─────────────────────────────────
  function _subscribeRealtime() {
    var sb = _getSB();
    if (!sb || _rtChannel) return;

    _rtChannel = sb.channel('ant-rt-v8')
      // Central activity feed — everything the backend writes here
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_activity_feed' }, function(p) {
        _mapFeedEvent(p.new || {});
      })
      // App errors — not yet in activity_feed
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_error_logs' }, function(p) {
        var e = p.new || {};
        var label = (e.platform ? '[' + e.platform + '] ' : '') + (e.error_type || 'error');
        _add('App error: ' + label, (e.error_message || '').slice(0, 100), 'error', '/admin-errors.html', 'err_' + e.id);
      })
      // Failed admin login attempts — security alerts
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_login_attempts' }, function(p) {
        var a = p.new || {};
        if (a.success === false || a.success === 'false') {
          _add('Failed login attempt', (a.email || 'Unknown') + ' · ' + (a.ip_address || 'unknown IP'), 'security', '/admin-auth-monitor.html', 'sec_' + a.id);
        }
      })
      // New published IslamVoice episodes
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'islamvoice_episodes' }, function(p) {
        var ep = p.new || {};
        if (ep.is_published) {
          _add('New episode: ' + (ep.title || 'Untitled'), (ep.description || '').slice(0, 80), 'video', '/admin-islamvoice-management.html', 'vid_' + ep.id);
        }
      })
      // New admin tasks (assignments)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_tasks' }, function(p) {
        var t = p.new || {};
        var me = sessionStorage.getItem('adminEmail') || '';
        // Only notify if assigned to me or unassigned
        if (!t.assigned_to || t.assigned_to === me || t.assigned_to === sessionStorage.getItem('adminId')) {
          _add('New task: ' + (t.title || 'Untitled'), (t.description || '').slice(0, 80) || ('Priority: ' + (t.priority || 'normal')), 'task', '/admin-tasks.html', 'task_new_' + t.id);
        }
      })
      // New mentions
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_mention_notifs' }, function(p) {
        var n = p.new || {};
        var me = sessionStorage.getItem('adminEmail') || '';
        if (!me || n.recipient_email === me) {
          var d = n.data || {};
          var link = d.rowId ? '/admin-translations.html?mention=' + d.rowId : null;
          _add(n.title || 'New mention', n.body || '', 'mention', link, 'db_' + n.id, n.id);
        }
      })
      // User comments on IslamVoice
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'islamvoice_comments' }, function(p) {
        var c = p.new || {};
        _add('New comment on episode', (c.content || '').slice(0, 100), 'message', '/admin-islamvoice-management.html', 'cmt_' + c.id);
      })
      // Widget health failures
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'widget_health_reports' }, function(p) {
        var w = p.new || {};
        if (w.status === 'error' || w.status === 'stale' || w.snapshot_stale) {
          _add('Widget health issue', (w.city || 'Unknown') + ' · ' + (w.platform || '') + ' · ' + (w.status || 'error'), 'error', '/admin-widget-health.html', 'wgt_' + w.id + '_' + Math.floor(Date.now() / 3600000));
        }
      })
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') _refreshPanel(); // refresh header "Live" dot
      });
  }

  // ── Background auto-poll ───────────────────────────────────
  function _startAutoRefresh() {
    if (_autoTimer) return;
    _autoTimer = setInterval(function() {
      _lastPull = 0;
      _pullSupabase();
    }, POLL_MS);
  }

  // ── Pull from Supabase (panel open + background) ───────────
  var _lastPull = 0;
  function _pullSupabase() {
    var sb = _getSB(); if (!sb) return;
    var now = Date.now();
    if (now - _lastPull < 20000) return;
    _lastPull = now;

    // Central activity feed (last 7 days, skip low-priority translation noise)
    sb.from('admin_activity_feed')
      .select('id,event_type,category,priority,title,message,metadata,source_table,section,created_at')
      .not('event_type', 'eq', 'translation_updated')
      .gte('created_at', new Date(now - 7 * 86400000).toISOString())
      .order('created_at', { ascending: false }).limit(60)
      .then(function(res) {
        if (res.error || !res.data) return;
        res.data.forEach(function(ev) { _mapFeedEvent(ev); });
      });

    // App errors (last 6h) — direct table since may not be in feed
    sb.from('app_error_logs')
      .select('id,error_type,error_message,platform,app_version,created_at')
      .gte('created_at', new Date(now - 6 * 3600000).toISOString())
      .order('created_at', { ascending: false }).limit(10)
      .then(function(res) {
        if (res.error || !res.data || !res.data.length) return;
        res.data.forEach(function(e) {
          var label = (e.platform ? '[' + e.platform + '] ' : '') + (e.error_type || 'error');
          var eTs = e.created_at ? new Date(e.created_at).getTime() : null;
          _add('App error: ' + label, (e.error_message || '').slice(0, 100), 'error', '/admin-errors.html', 'err_' + e.id, null, null, eTs);
        });
      });

    // Overdue tasks — always unread (actionable), no eventTs override
    sb.from('admin_tasks')
      .select('id,title,due_at,priority,status,assigned_to')
      .neq('status', 'done').not('due_at', 'is', null).lt('due_at', new Date().toISOString())
      .eq('archived', false)
      .order('due_at', { ascending: true }).limit(5)
      .then(function(res) {
        if (res.error || !res.data) return;
        res.data.forEach(function(t) {
          _add('Overdue: ' + t.title,
            'Due ' + new Date(t.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + (t.priority || 'normal'),
            'error', '/admin-tasks.html?id=' + t.id, 'task_' + t.id);
        });
      });

    // NOTE: islamvoice_episodes are intentionally not polled here directly.
    // They arrive via realtime subscription (vid_X) and activity_feed poll (vid_X after
    // normalisation). Polling the table directly was creating duplicates.

    // Failed login attempts (last 2h)
    sb.from('admin_login_attempts')
      .select('id,email,ip_address,created_at')
      .eq('success', false)
      .gte('created_at', new Date(now - 2 * 3600000).toISOString())
      .order('created_at', { ascending: false }).limit(10)
      .then(function(res) {
        if (res.error || !res.data) return;
        res.data.forEach(function(a) {
          var aTs = a.created_at ? new Date(a.created_at).getTime() : null;
          _add('Failed login attempt', (a.email || 'Unknown') + ' · ' + (a.ip_address || 'unknown IP'), 'security', '/admin-auth-monitor.html', 'sec_' + a.id, null, null, aTs);
        });
      });

    // Mentions addressed to me
    var me = (window.sessionStorage && sessionStorage.getItem('adminEmail')) || '';
    if (me) {
      sb.from('admin_mention_notifs')
        .select('id,type,title,body,data,source_id,created_at')
        .eq('recipient_email', me)
        .gte('created_at', new Date(now - 30 * 86400000).toISOString())
        .order('created_at', { ascending: false }).limit(30)
        .then(function(res) {
          if (res.error || !res.data) return;
          res.data.forEach(function(n) {
            var d = n.data || {};
            var link = d.rowId ? '/admin-translations.html?mention=' + d.rowId : null;
            var nTs = n.created_at ? new Date(n.created_at).getTime() : null;
            _add(n.title, n.body || '', n.type || 'mention', link, 'db_' + n.id, n.id, null, nTs);
          });
        });
    }
  }

  // ── Live events bridge (from admin-live-alerts.js) ─────────
  window._antFeed = function(type, data) {
    data = data || {};
    if (type === 'new_message') {
      _add((data.name || data.email || 'Unknown') + ' sent a message',
        data.subject || (data.message || '').slice(0, 80), 'message', '/admin-messages.html',
        data.id ? 'msg_' + data.id : null);

    } else if (type === 'user_joined') {
      var uname = data.name || (data.email || '').split('@')[0] || 'Unknown';
      _add(uname + ' joined', data.email || 'New account', 'user', '/admin-users.html',
        data.id ? 'usr_' + data.id : null);

    } else if (type === 'new_video') {
      _add('New episode: ' + (data.title || 'Untitled'),
        data.description ? data.description.slice(0, 80) : 'IslamVoice',
        'video', '/admin-islamvoice-management.html', data.id ? 'vid_' + data.id : null);

    } else if (type === 'user_online') {
      // App user came online — deduplicate per hour per user
      var aoName = data.name || (data.email || '').split('@')[0] || 'User';
      var aoSid = data.id ? 'act_on_' + data.id + '_' + Math.floor(Date.now() / 3600000) : null;
      _add(aoName + ' is active', (data.email || '') + (data.platform ? ' · ' + data.platform : ''), 'activity', null, aoSid);

    } else if (type === 'user_offline') {
      var aoName2 = data.name || (data.email || '').split('@')[0] || 'User';
      var aoSid2 = data.id ? 'act_off_' + data.id + '_' + Math.floor(Date.now() / 3600000) : null;
      _add(aoName2 + ' went offline', (data.email || '') + (data.platform ? ' · ' + data.platform : ''), 'activity', null, aoSid2);
    }
  };

  // ── Presence helpers (called from dashboard ATO) ───────────
  window._antPresenceJoin = function(admin) {
    var name = admin.full_name || admin.email.split('@')[0];
    var initChar = name.charAt(0).toUpperCase();
    var roleLabels = { super_admin: 'Super Admin', editor: 'Editor', analyst: 'Analyst', custom: 'Custom' };
    var roleLabel = roleLabels[admin.role] || admin.role || 'Admin';
    var joinTime = new Date();
    var sid = 'pres_on_' + admin.id + '_' + joinTime.getTime();
    admin.__antSid = sid;
    admin.__antJoinTime = joinTime;
    _add(name + ' is online', roleLabel + ' · ' + admin.email, 'presence_online', null, sid, null, {
      initChar: initChar, joinTime: joinTime.toISOString(),
      adminId: admin.id, roleLabel: roleLabel, email: admin.email,
    });
  };

  window._antPresenceLeave = function(admin) {
    if (!admin.__antSid) return;
    var leaveTime = new Date();
    var duration = admin.__antJoinTime ? leaveTime.getTime() - admin.__antJoinTime.getTime() : null;
    var name = admin.full_name || admin.email.split('@')[0];
    var roleLabels = { super_admin: 'Super Admin', editor: 'Editor', analyst: 'Analyst', custom: 'Custom' };
    var roleLabel = roleLabels[admin.role] || admin.role || 'Admin';
    _updateBySourceId(admin.__antSid, {
      type: 'presence_offline', title: name + ' went offline',
      desc: roleLabel + ' · ' + admin.email, read: false,
      meta: {
        initChar: name.charAt(0).toUpperCase(),
        joinTime: admin.__antJoinTime ? admin.__antJoinTime.toISOString() : null,
        leaveTime: leaveTime.toISOString(), duration: duration,
        adminId: admin.id, roleLabel: roleLabel, email: admin.email,
      },
    });
  };

  // Click outside to close
  document.addEventListener('click', function(e) {
    if (!_isOpen) return;
    var p = document.getElementById(PANEL_ID);
    var bellBtn = document.getElementById('notifBellBtn') || document.getElementById('ant-bell-btn');
    if (!p) return;
    if (!p.contains(e.target) && (!bellBtn || !bellBtn.contains(e.target))) _close();
  });

  // ── Init ───────────────────────────────────────────────────
  function _init() {
    _injectCSS();
    _ensureBell();
    _updateBadge();

    function _ready() {
      setTimeout(_pullSupabase, 3000);
      setTimeout(_subscribeRealtime, 1500);
      _startAutoRefresh();
    }

    if (_getSB()) {
      _ready();
    } else {
      var t = 0;
      var wait = setInterval(function() {
        if (_getSB()) { clearInterval(wait); _ready(); }
        else if (++t > 60) clearInterval(wait);
      }, 500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();

  // ── Public API ─────────────────────────────────────────────
  window.adminNotifications = {
    add: function(title, desc, type, link, sourceId) { _add(title, desc, type, link, sourceId || null); },
    updateBySourceId: function(sid, changes) { _updateBySourceId(sid, changes); },
    test: function() {
      _add('Ahmed sent a message', 'Question about Quran recitation', 'message', '/admin-messages.html', null);
      _add('Sara Ahmed joined', 'sara.ahmed@gmail.com', 'user', '/admin-users.html', null);
      _add('App error: [iOS]', 'Fatal exception in AudioPlayer at line 42', 'error', '/admin-errors.html', null);
      _add('Failed login attempt', 'hacker@example.com · 192.168.1.1', 'security', '/admin-auth-monitor.html', null);
      _add('Overdue: Publish new episode', 'Due May 1 · high', 'error', '/admin-tasks.html', null);
      _add('New episode: Tafseer Al-Baqarah', 'IslamVoice new content', 'video', '/admin-islamvoice-management.html', null);
      _add('User came online', 'user@example.com · iOS', 'activity', null, null);
      window._antPresenceJoin({ id: 'test1', full_name: 'Test Admin', email: 'test@tafsirkurd.com', role: 'editor' });
    },
  };

})();
