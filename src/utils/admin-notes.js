// admin-notes.js v2 — TafsirKurd Admin Productivity Hub
// Features: Quick Notes, Categories, Checklists, Reminders, Today's Focus,
//           Glass Pinned Notes, Status Bar, Productivity Stats, Supabase Sync
// Loaded globally via admin-guard.js on every admin page.
//
// Supabase table (already created — do not re-run):
//   admin_notes(id,admin_id,content,color,category,note_type,is_pinned,
//     is_favorite,is_archived,reminder_at,reminder_snoozed_until,
//     sort_order,position_x,position_y,is_collapsed,created_at,updated_at)
(function () {
  'use strict';
  if (window.__adminNotesLoaded) return;
  window.__adminNotesLoaded = true;

  // ─── Constants ───────────────────────────────────────────────────────────
  var STORAGE_KEY  = 'admin_notes_v2';
  var PIN_POS_KEY  = 'admin_notes_pin_pos';
  var DEFAULT_COLOR = 'yellow';

  var COLORS = {
    yellow: { light:'#fef9c3', dark:'#2a2000', border:'#fde047', tl:'#713f12', td:'#fef08a' },
    green:  { light:'#dcfce7', dark:'#0d2015', border:'#86efac', tl:'#14532d', td:'#86efac' },
    blue:   { light:'#dbeafe', dark:'#0c1830', border:'#93c5fd', tl:'#1e3a8a', td:'#93c5fd' },
    pink:   { light:'#fce7f3', dark:'#2d0a1a', border:'#f9a8d4', tl:'#831843', td:'#f9a8d4' },
    white:  { light:'#ffffff', dark:'#1e1e2e', border:'#e2e8f0', tl:'#334155', td:'#cbd5e1' },
  };

  var CATS = {
    'feature':       { label:'Feature Idea', color:'#818cf8' },
    'bug':           { label:'Bug',          color:'#f87171' },
    'content':       { label:'Content',      color:'#34d399' },
    'app-store':     { label:'App Store',    color:'#fb923c' },
    'appgallery':    { label:'AppGallery',   color:'#60a5fa' },
    'notifications': { label:'Notifications',color:'#a78bfa' },
    'personal':      { label:'Personal',     color:'#f472b6' },
    'other':         { label:'Other',        color:'#94a3b8' },
  };

  var REMINDER_OPTS = [
    { label:'30 minutes', ms: 30*60*1000 },
    { label:'1 hour',     ms: 60*60*1000 },
    { label:'3 hours',    ms: 3*60*60*1000 },
    { label:'Tomorrow',   ms: null }, // special
    { label:'Custom…',   ms: 'custom' },
  ];

  // ─── State ────────────────────────────────────────────────────────────────
  var notes        = [];
  var panelOpen    = false;
  var activeFilter = 'all';
  var activeCat    = '';
  var searchQuery  = '';
  var dragSrcId    = null;
  var saveTimers   = {};
  var remTimers    = {};
  var _sb          = null;
  var _realtimeSub = null;
  var _selColor    = { panel: DEFAULT_COLOR, capture: DEFAULT_COLOR };
  var _selCat      = { panel: 'other',       capture: 'other'       };

  // ─── Utils ────────────────────────────────────────────────────────────────
  function uid() { return 'n_' + Math.random().toString(36).slice(2,11) + Date.now().toString(36).slice(-4); }
  function nowIso() { return new Date().toISOString(); }
  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
        || document.body.classList.contains('dark');
  }
  function noteStyle(note) {
    var dk = isDark(), c = COLORS[note.color] || COLORS.yellow;
    return { bg: dk ? c.dark : c.light, text: dk ? c.td : c.tl, border: c.border };
  }
  function relTime(iso) {
    if (!iso) return '';
    var d = new Date(iso), diff = Date.now() - d;
    if (diff < 60000)     return 'just now';
    if (diff < 3600000)   return Math.floor(diff/60000)  + 'm ago';
    if (diff < 86400000)  return Math.floor(diff/3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff/86400000) + 'd ago';
    return d.toLocaleDateString();
  }
  function fmtReminder(iso) {
    if (!iso) return '';
    var d = new Date(iso), diff = d - Date.now();
    if (diff <= 0) return 'overdue';
    if (diff < 3600000)   return 'in ' + Math.ceil(diff/60000)   + 'm';
    if (diff < 86400000)  return 'in ' + Math.ceil(diff/3600000)  + 'h';
    return 'in ' + Math.ceil(diff/86400000) + 'd';
  }

  // ─── Checklist helpers ────────────────────────────────────────────────────
  // Lines matching "[ ] text" or "[x] text" are checklist items
  var CL_RE = /^\[( |x)\] (.*)$/i;

  function parseChecklist(content) {
    var lines = (content || '').split('\n');
    var items = [], texts = [];
    lines.forEach(function(l) {
      var m = l.match(CL_RE);
      if (m) items.push({ checked: m[1].toLowerCase()==='x', text: m[2] });
      else   texts.push(l);
    });
    return { items: items, prose: texts.join('\n').trim() };
  }

  function serializeChecklist(prose, items) {
    var lines = [];
    if (prose) lines.push(prose);
    items.forEach(function(it) { lines.push('[' + (it.checked ? 'x' : ' ') + '] ' + it.text); });
    return lines.join('\n');
  }

  function toggleChecklistItem(note, idx) {
    var cl = parseChecklist(note.content);
    if (!cl.items[idx]) return;
    cl.items[idx].checked = !cl.items[idx].checked;
    // Sort: unchecked first
    cl.items.sort(function(a,b) { return a.checked - b.checked; });
    note.content = serializeChecklist(cl.prose, cl.items);
    patchNote(note.id, { content: note.content });
  }

  // ─── LocalStorage ─────────────────────────────────────────────────────────
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }
  }
  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch(e) {}
  }

  // ─── Supabase ─────────────────────────────────────────────────────────────
  function adminId() { return sessionStorage.getItem('adminEmail') || 'admin'; }

  async function getSB() {
    if (_sb) return _sb;
    try {
      if (window.adminAuth && window.adminAuth.getSupabase) { _sb = window.adminAuth.getSupabase(); return _sb; }
      if (window.supabaseClient) { _sb = window.supabaseClient; return _sb; }
    } catch(e) {}
    return null;
  }

  async function syncFromSB() {
    var sb = await getSB(); if (!sb) return;
    try {
      var { data, error } = await sb.from('admin_notes').select('*')
        .eq('admin_id', adminId()).order('sort_order', { ascending: true });
      if (error || !data || !data.length) return;
      notes = data.map(dbToNote);
      saveLocal(); render(); updateBadge(); updatePinnedWidget(); scheduleAllReminders();
    } catch(e) {}
  }

  function dbToNote(r) {
    return {
      id: r.id, content: r.content || '', color: r.color || DEFAULT_COLOR,
      category: r.category || 'other', note_type: r.note_type || 'note',
      is_pinned: !!r.is_pinned, is_favorite: !!r.is_favorite, is_archived: !!r.is_archived,
      reminder_at: r.reminder_at || null, reminder_snoozed_until: r.reminder_snoozed_until || null,
      sort_order: r.sort_order || 0,
      position_x: r.position_x || null, position_y: r.position_y || null,
      is_collapsed: !!r.is_collapsed,
      created_at: r.created_at, updated_at: r.updated_at,
    };
  }

  async function sbUpsert(note) {
    var sb = await getSB(); if (!sb) return;
    try {
      await sb.from('admin_notes').upsert({
        id: note.id, admin_id: adminId(),
        content: note.content, color: note.color,
        category: note.category, note_type: note.note_type,
        is_pinned: note.is_pinned, is_favorite: note.is_favorite, is_archived: note.is_archived,
        reminder_at: note.reminder_at, reminder_snoozed_until: note.reminder_snoozed_until,
        sort_order: note.sort_order,
        position_x: note.position_x, position_y: note.position_y,
        is_collapsed: note.is_collapsed,
        updated_at: note.updated_at,
      }, { onConflict: 'id' });
    } catch(e) {}
  }

  async function sbDelete(id) {
    var sb = await getSB(); if (!sb) return;
    try { await sb.from('admin_notes').delete().eq('id', id); } catch(e) {}
  }

  async function setupRealtime() {
    var sb = await getSB(); if (!sb) return;
    if (_realtimeSub) return;
    try {
      _realtimeSub = sb.channel('admin_notes_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notes', filter: 'admin_id=eq.' + adminId() },
          function(payload) {
            var ev = payload.eventType;
            if (ev === 'DELETE') {
              notes = notes.filter(function(n) { return n.id !== payload.old.id; });
            } else if (ev === 'INSERT') {
              if (!notes.find(function(n){ return n.id === payload.new.id; })) {
                notes.unshift(dbToNote(payload.new));
              }
            } else if (ev === 'UPDATE') {
              var idx = notes.findIndex(function(n){ return n.id === payload.new.id; });
              if (idx !== -1) notes[idx] = dbToNote(payload.new);
            }
            saveLocal(); render(); updateBadge(); updatePinnedWidget(); scheduleAllReminders();
          })
        .subscribe();
    } catch(e) {}
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────
  function createNote(content, color, category, noteType) {
    // Enforce single Focus note
    if (noteType === 'focus') {
      var existing = notes.find(function(n){ return n.note_type === 'focus'; });
      if (existing) { patchNote(existing.id, { content: content }); return existing; }
    }
    var n = {
      id: uid(), content: content || '', color: color || DEFAULT_COLOR,
      category: category || 'other', note_type: noteType || 'note',
      is_pinned: noteType === 'focus', is_favorite: false, is_archived: false,
      reminder_at: null, reminder_snoozed_until: null,
      sort_order: 0, position_x: null, position_y: null, is_collapsed: false,
      created_at: nowIso(), updated_at: nowIso(),
    };
    notes.forEach(function(x){ x.sort_order++; });
    notes.unshift(n);
    saveLocal(); sbUpsert(n);
    render(); updateBadge(); updatePinnedWidget(); updateFocusWidget();
    return n;
  }

  function patchNote(id, changes) {
    var n = notes.find(function(x){ return x.id === id; });
    if (!n) return;
    Object.assign(n, changes, { updated_at: nowIso() });
    saveLocal();
    clearTimeout(saveTimers[id]);
    saveTimers[id] = setTimeout(function(){ sbUpsert(n); }, 900);
    if (changes.reminder_at !== undefined) scheduleReminder(n);
  }

  function removeNote(id) {
    notes = notes.filter(function(n){ return n.id !== id; });
    saveLocal(); sbDelete(id);
    render(); updateBadge(); updatePinnedWidget(); updateFocusWidget();
  }

  // ─── Reminders ────────────────────────────────────────────────────────────
  function scheduleAllReminders() {
    notes.forEach(scheduleReminder);
  }

  function scheduleReminder(note) {
    clearTimeout(remTimers[note.id]);
    if (!note.reminder_at) return;
    var fireAt = new Date(note.reminder_at).getTime();
    var snoozeUntil = note.reminder_snoozed_until ? new Date(note.reminder_snoozed_until).getTime() : 0;
    var effective = Math.max(fireAt, snoozeUntil);
    var delay = effective - Date.now();
    if (delay < 0) return;
    remTimers[note.id] = setTimeout(function(){ fireReminder(note); }, delay);
  }

  function fireReminder(note) {
    var msg = (note.content || '').split('\n')[0].slice(0, 80);
    // Try browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🗒️ Reminder — TafsirKurd Admin', { body: msg, icon: '/assets/images/TafsirKurd-favicon.png' });
    }
    // Always show in-panel toast
    showReminderToast(note, msg);
  }

  function showReminderToast(note, msg) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;background:#1e293b;border:1px solid #f59e0b;border-radius:14px;padding:14px 16px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,.3);animation:anc-in .2s ease;display:flex;gap:12px;align-items:flex-start;';
    toast.innerHTML = '<div style="font-size:20px;flex-shrink:0">⏰</div><div><div style="font-size:13px;font-weight:700;color:#fef9c3;margin-bottom:4px">Reminder</div><div style="font-size:12px;color:#cbd5e1;line-height:1.5"></div><div style="display:flex;gap:8px;margin-top:10px"><button style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;background:#f59e0b;border:none;cursor:pointer;color:#000" class="rem-open">Open</button><button style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;background:#334155;border:none;cursor:pointer;color:#fff" class="rem-snooze">Snooze 1h</button><button style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;background:transparent;border:1px solid #475569;cursor:pointer;color:#94a3b8" class="rem-dismiss">Dismiss</button></div></div>';
    toast.querySelector('div > div:nth-child(2)').textContent = msg;
    toast.querySelector('.rem-open').onclick    = function(){ openPanel(); toast.remove(); };
    toast.querySelector('.rem-dismiss').onclick = function(){ patchNote(note.id, { reminder_at: null }); toast.remove(); };
    toast.querySelector('.rem-snooze').onclick  = function(){
      var t = new Date(Date.now() + 3600000).toISOString();
      patchNote(note.id, { reminder_snoozed_until: t });
      scheduleReminder(notes.find(function(n){ return n.id===note.id; }) || note);
      toast.remove();
    };
    document.body.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, 12000);
  }

  function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ─── Filter & Sort ────────────────────────────────────────────────────────
  function getVisible() {
    var q = searchQuery.toLowerCase();
    return notes.filter(function(n) {
      if (n.note_type === 'focus' && activeFilter === 'all' && !q && !activeCat) return false; // shown in focus widget
      if (activeFilter === 'pinned'    && (!n.is_pinned   || n.is_archived)) return false;
      if (activeFilter === 'favorites' && (!n.is_favorite || n.is_archived)) return false;
      if (activeFilter === 'archived'  && !n.is_archived)                    return false;
      if (activeFilter === 'all'       && n.is_archived)                     return false;
      if (activeCat && n.category !== activeCat) return false;
      if (q && n.content.toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function(a,b) {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return (a.sort_order||0) - (b.sort_order||0);
    });
  }

  function countFilter(f) {
    return notes.filter(function(n) {
      if (f === 'all')       return !n.is_archived && n.note_type !== 'focus';
      if (f === 'pinned')    return n.is_pinned && !n.is_archived;
      if (f === 'favorites') return n.is_favorite && !n.is_archived;
      if (f === 'archived')  return n.is_archived;
    }).length;
  }

  // ─── CSS ─────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('admin-notes-css')) return;
    var s = document.createElement('style');
    s.id = 'admin-notes-css';
    s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap');

/* ── Trigger ── */
#anTrigger{position:relative;width:36px;height:36px;border-radius:8px;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);transition:background .15s,color .15s;flex-shrink:0}
#anTrigger:hover{background:var(--bg-active);color:var(--text-primary)}
#anTrigger svg{width:18px;height:18px}
#anTrigger .an-badge{position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#f59e0b;border:2px solid var(--bg-surface);display:none}
#anTrigger .an-badge.on{display:block}

/* ── Status bar dots ── */
#anStatusBar{display:flex;align-items:center;gap:5px;padding:0 8px;flex-shrink:0}
.an-svc-dot{width:7px;height:7px;border-radius:50%;cursor:pointer;position:relative;transition:transform .15s}
.an-svc-dot:hover{transform:scale(1.5)}
.an-svc-dot.healthy{background:#10b981}
.an-svc-dot.warning{background:#f59e0b}
.an-svc-dot.error{background:#ef4444}
.an-svc-dot.unknown{background:#6b7280}
.an-svc-tooltip{display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 12px;white-space:nowrap;font-size:11px;color:#f1f5f9;z-index:9999;font-family:Inter,sans-serif;pointer-events:none}
.an-svc-dot:hover .an-svc-tooltip{display:block}

/* ── Overlay / Panel ── */
#anOverlay{position:fixed;inset:0;background:rgba(0,0,0,0);z-index:1200;display:none;transition:background .22s}
#anOverlay.open{display:block;background:rgba(0,0,0,.38)}
#anPanel{position:fixed;right:0;top:0;bottom:0;width:440px;max-width:100vw;background:var(--bg-base);border-left:1px solid var(--border-light);z-index:1201;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);box-shadow:-12px 0 48px rgba(0,0,0,.2)}
#anPanel.open{transform:translateX(0)}
@media(max-width:480px){#anPanel{width:100vw}}

/* Header */
.an-hdr{padding:16px 16px 10px;border-bottom:1px solid var(--border-light);flex-shrink:0}
.an-hdr-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.an-hdr-title{font-size:16px;font-weight:800;color:var(--text-primary);display:flex;align-items:center;gap:8px}
.an-close{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--bg-active);border:none;color:var(--text-secondary);transition:background .15s;flex-shrink:0}
.an-close:hover{background:var(--border-light)}
.an-close svg{width:16px;height:16px}

/* Quick add */
.an-quick{display:flex;gap:8px;align-items:flex-end;margin-bottom:8px}
.an-quick-ta{flex:1;background:var(--bg-surface);border:1.5px solid var(--border-light);border-radius:12px;padding:10px 14px;font-size:13px;color:var(--text-primary);font-family:inherit;resize:none;line-height:1.5;min-height:42px;max-height:120px;transition:border-color .15s;box-sizing:border-box}
.an-quick-ta:focus{outline:none;border-color:#f59e0b}
.an-quick-ta::placeholder{color:var(--text-tertiary)}
.an-add-btn{flex-shrink:0;width:42px;height:42px;border-radius:12px;background:#f59e0b;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:background .15s,transform .1s;box-shadow:0 2px 8px rgba(245,158,11,.3)}
.an-add-btn:hover{background:#d97706}
.an-add-btn:active{transform:scale(.93)}
.an-add-btn svg{width:18px;height:18px}

/* Quick-add meta row */
.an-quick-meta{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.an-colors{display:flex;gap:6px;align-items:center}
.an-cdot{width:20px;height:20px;border-radius:50%;cursor:pointer;border:2.5px solid transparent;transition:transform .12s,border-color .12s;flex-shrink:0}
.an-cdot:hover{transform:scale(1.18)}
.an-cdot.sel{border-color:var(--text-primary);transform:scale(1.14)}
.an-cat-sel{background:var(--bg-surface);border:1px solid var(--border-light);border-radius:8px;padding:5px 8px;font-size:12px;color:var(--text-secondary);cursor:pointer;font-family:inherit;flex:1;min-width:0}
.an-cat-sel:focus{outline:none;border-color:#f59e0b}

/* Search */
.an-search-wrap{display:flex;align-items:center;gap:8px;background:var(--bg-surface);border:1px solid var(--border-light);border-radius:10px;padding:0 12px;height:36px}
.an-search-wrap svg{width:14px;height:14px;color:var(--text-tertiary);flex-shrink:0}
.an-search-in{background:none;border:none;outline:none;font-size:13px;color:var(--text-primary);width:100%;font-family:inherit}
.an-search-in::placeholder{color:var(--text-tertiary)}

/* Category filter chips */
.an-cat-filters{display:flex;gap:5px;padding:10px 14px 0;overflow-x:auto;scrollbar-width:none;flex-shrink:0}
.an-cat-filters::-webkit-scrollbar{display:none}
.an-cat-chip{flex-shrink:0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all .15s;font-family:inherit;background:var(--bg-active);color:var(--text-secondary)}
.an-cat-chip:hover{border-color:currentColor}
.an-cat-chip.sel{color:#fff}

/* Tabs */
.an-tabs{display:flex;gap:4px;padding:8px 14px 0;border-bottom:1px solid var(--border-light);flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.an-tabs::-webkit-scrollbar{display:none}
.an-tab{flex-shrink:0;display:flex;align-items:center;gap:5px;padding:6px 10px 10px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--text-tertiary);transition:color .15s;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:inherit}
.an-tab:hover{color:var(--text-primary)}
.an-tab.sel{color:#f59e0b;border-bottom-color:#f59e0b}
.an-tab-cnt{font-size:10px;font-weight:700;padding:1px 5px;border-radius:10px;background:var(--bg-active);color:var(--text-tertiary)}
.an-tab.sel .an-tab-cnt{background:rgba(245,158,11,.15);color:#f59e0b}

/* Notes list */
.an-list{flex:1;overflow-y:auto;padding:12px 12px 24px;display:flex;flex-direction:column;gap:10px}
.an-list::-webkit-scrollbar{width:4px}
.an-list::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:4px}

/* Empty */
.an-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;text-align:center}
.an-empty-ico{font-size:52px;opacity:.35}
.an-empty-title{font-size:15px;font-weight:700;color:var(--text-secondary)}
.an-empty-sub{font-size:13px;color:var(--text-tertiary);line-height:1.55;max-width:240px}

/* Stats footer */
.an-stats{padding:12px 14px;border-top:1px solid var(--border-light);display:flex;gap:10px;flex-wrap:wrap;flex-shrink:0}
.an-stat{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;min-width:60px}
.an-stat-val{font-size:18px;font-weight:800;color:var(--text-primary)}
.an-stat-lbl{font-size:10px;color:var(--text-tertiary);font-weight:500;text-align:center}

/* ── Sticky Note Card ── */
.sn{border-radius:14px;padding:13px 13px 10px;position:relative;cursor:pointer;transition:transform .15s,box-shadow .15s;border:1.5px solid transparent;box-shadow:0 2px 8px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)}
.sn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.15)}
.sn.sn-dragging{opacity:.35;transform:rotate(2deg) scale(.96)}
.sn.drop-before{border-top-color:#f59e0b!important;border-top-width:3px}
.sn.drop-after{border-bottom-color:#f59e0b!important;border-bottom-width:3px}
.sn.sn-focus{box-shadow:0 0 0 2px #f59e0b,0 4px 20px rgba(245,158,11,.2)}

/* Pin strip */
.sn-pin-strip{position:absolute;top:0;left:50%;transform:translateX(-50%);width:30px;height:5px;border-radius:0 0 5px 5px;background:rgba(0,0,0,.22);pointer-events:none}

/* Card top */
.sn-top{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:7px}
.sn-badges{display:flex;gap:3px;font-size:12px;align-items:center;flex-wrap:wrap;flex:1;min-width:0}
.sn-cat-chip{font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;color:#fff;white-space:nowrap}
.sn-acts{display:flex;gap:2px;opacity:0;transition:opacity .15s;flex-shrink:0}
.sn:hover .sn-acts{opacity:1}
.sn-act{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;background:rgba(0,0,0,.1);color:inherit;transition:background .12s;opacity:.6}
.sn-act:hover{background:rgba(0,0,0,.18);opacity:1}
.sn-act.on{opacity:1}
.sn-act svg{width:13px;height:13px}
.sn-act.del{color:#ef4444}

/* Body */
.sn-body{font-size:15px;line-height:1.65;color:inherit;font-family:'Caveat','Comic Sans MS',cursive,sans-serif;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow:hidden;cursor:text}
.sn-body-edit{width:100%;background:transparent;border:none;outline:none;font-size:15px;line-height:1.65;color:inherit;font-family:inherit;resize:none;min-height:80px;max-height:320px;box-sizing:border-box}

/* Checklist */
.sn-checklist{margin:4px 0;display:flex;flex-direction:column;gap:4px}
.sn-cl-item{display:flex;align-items:flex-start;gap:7px;font-size:14px;line-height:1.4;font-family:'Caveat','Comic Sans MS',cursive,sans-serif;cursor:pointer}
.sn-cl-check{width:16px;height:16px;border-radius:4px;border:1.5px solid rgba(0,0,0,.3);flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.sn-cl-check.done{background:rgba(0,0,0,.25);border-color:transparent}
.sn-cl-check.done::after{content:'✓';font-size:10px;color:inherit;line-height:1}
.sn-cl-text{flex:1}
.sn-cl-text.done{opacity:.5;text-decoration:line-through}
.sn-cl-progress{margin-top:6px;height:3px;border-radius:3px;background:rgba(0,0,0,.12);overflow:hidden}
.sn-cl-progress-fill{height:100%;border-radius:3px;background:rgba(0,0,0,.3);transition:width .3s}

/* Reminder badge */
.sn-reminder{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;font-family:Inter,sans-serif;padding:1px 6px;border-radius:10px;background:rgba(245,158,11,.2);color:#b45309}

/* Footer */
.sn-foot{display:flex;align-items:center;justify-content:space-between;margin-top:9px;gap:6px}
.sn-time{font-size:10px;opacity:.48;font-family:Inter,sans-serif;white-space:nowrap;flex-shrink:0}
.sn-foot-right{display:flex;align-items:center;gap:5px}
.sn-mini-colors{display:flex;gap:3px;opacity:0;transition:opacity .15s}
.sn:hover .sn-mini-colors{opacity:1}
.sn-mc{width:12px;height:12px;border-radius:50%;cursor:pointer;border:1.5px solid rgba(0,0,0,.15);transition:transform .1s}
.sn-mc:hover{transform:scale(1.35)}
.sn-to-task{font-size:10px;font-weight:600;font-family:Inter,sans-serif;padding:2px 7px;border-radius:6px;background:rgba(0,0,0,.1);border:none;cursor:pointer;color:inherit;opacity:0;transition:opacity .15s}
.sn:hover .sn-to-task{opacity:.6}
.sn-to-task:hover{opacity:1!important;background:rgba(0,0,0,.18)}
.sn-reminder-btn{font-size:11px;cursor:pointer;opacity:0;transition:opacity .15s;background:none;border:none;color:inherit;padding:0}
.sn:hover .sn-reminder-btn{opacity:.6}

/* Reminder picker */
.an-rem-pick{position:absolute;right:0;top:32px;background:var(--bg-base);border:1px solid var(--border-light);border-radius:12px;padding:6px;z-index:50;box-shadow:0 8px 32px rgba(0,0,0,.2);min-width:160px}
.an-rem-opt{padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text-secondary);transition:background .12s}
.an-rem-opt:hover{background:var(--bg-active);color:var(--text-primary)}

/* ── Capture Modal ── */
#anCapture{position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:1400;display:none;align-items:flex-start;justify-content:center;padding-top:110px;backdrop-filter:blur(5px)}
#anCapture.open{display:flex}
.anc-modal{background:var(--bg-base);border:1px solid var(--border-light);border-radius:18px;width:500px;max-width:calc(100vw - 32px);box-shadow:0 32px 80px rgba(0,0,0,.38);animation:anc-in .18s cubic-bezier(.4,0,.2,1);overflow:hidden}
@keyframes anc-in{from{opacity:0;transform:translateY(-12px) scale(.97)}}
.anc-hdr{padding:16px 20px 12px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;gap:8px}
.anc-hdr-title{font-size:14px;font-weight:700;color:var(--text-primary)}
.anc-kbd{font-size:11px;color:var(--text-tertiary);background:var(--bg-active);border:1px solid var(--border-light);padding:2px 6px;border-radius:5px;font-family:inherit}
.anc-body{padding:14px 20px}
.anc-ta{width:100%;background:transparent;border:none;outline:none;font-size:17px;line-height:1.65;color:var(--text-primary);font-family:'Caveat','Comic Sans MS',cursive,sans-serif;resize:none;min-height:80px;max-height:220px;box-sizing:border-box}
.anc-ta::placeholder{color:var(--text-tertiary);font-family:inherit}
.anc-foot{padding:10px 20px 14px;border-top:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.anc-meta{display:flex;gap:8px;align-items:center}
.anc-colors{display:flex;gap:5px}
.anc-cdot{width:20px;height:20px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform .12s,border-color .12s}
.anc-cdot:hover{transform:scale(1.2)}
.anc-cdot.sel{border-color:var(--text-primary)}
.anc-cat-sel{background:var(--bg-surface);border:1px solid var(--border-light);border-radius:7px;padding:4px 8px;font-size:11px;color:var(--text-secondary);cursor:pointer;font-family:inherit}
.anc-actions{display:flex;gap:8px;align-items:center}
.anc-hint{font-size:11px;color:var(--text-tertiary)}
.anc-cancel{padding:7px 14px;border-radius:8px;background:var(--bg-active);border:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);font-family:inherit;transition:background .15s}
.anc-cancel:hover{background:var(--border-light)}
.anc-save{padding:7px 16px;border-radius:8px;background:#f59e0b;border:none;cursor:pointer;font-size:13px;font-weight:700;color:#fff;font-family:inherit;display:flex;align-items:center;gap:6px;transition:background .15s}
.anc-save:hover{background:#d97706}

/* ── Floating Pinned Notes (Glass) ── */
#anPinned{position:fixed;bottom:28px;left:16px;z-index:900;display:flex;flex-direction:column;gap:8px;max-width:230px;user-select:none}
.anp-card{border-radius:12px;padding:10px 12px 9px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 24px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.2);cursor:pointer;transition:transform .15s,box-shadow .15s;border:1px solid rgba(255,255,255,.25);position:relative}
.anp-card:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.25)}
.anp-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:rgba(0,0,0,.15);border-radius:12px 12px 0 0}
.anp-drag-handle{position:absolute;top:6px;left:6px;cursor:grab;opacity:0;transition:opacity .15s;font-size:10px;color:rgba(0,0,0,.4)}
.anp-card:hover .anp-drag-handle{opacity:1}
.anp-actions{position:absolute;top:4px;right:4px;display:flex;gap:2px;opacity:0;transition:opacity .15s}
.anp-card:hover .anp-actions{opacity:1}
.anp-btn{width:18px;height:18px;border-radius:4px;background:rgba(0,0,0,.15);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:inherit;font-size:10px;line-height:1}
.anp-btn:hover{background:rgba(0,0,0,.28)}
.anp-text{font-size:13px;line-height:1.5;color:inherit;font-family:'Caveat','Comic Sans MS',cursive,sans-serif;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-top:4px;word-break:break-word}
.anp-card.collapsed .anp-text{-webkit-line-clamp:1}

/* ── Today's Focus ── */
.an-focus-card{background:var(--bg-surface);border:1.5px solid #f59e0b;border-radius:16px;padding:18px 20px;position:relative;overflow:hidden;cursor:pointer;transition:box-shadow .2s}
.an-focus-card:hover{box-shadow:0 0 0 2px rgba(245,158,11,.3),0 4px 20px rgba(245,158,11,.1)}
.an-focus-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#f97316)}
.an-focus-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.an-focus-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#f59e0b}
.an-focus-edit{font-size:11px;color:var(--text-tertiary);cursor:pointer;background:none;border:none;padding:0;font-family:inherit}
.an-focus-edit:hover{color:var(--text-primary)}
.an-focus-body{font-size:17px;line-height:1.7;color:var(--text-primary);font-family:'Caveat','Comic Sans MS',cursive,sans-serif;white-space:pre-wrap;min-height:28px}
.an-focus-ta{width:100%;background:transparent;border:none;outline:none;font-size:17px;line-height:1.7;color:var(--text-primary);font-family:'Caveat','Comic Sans MS',cursive,sans-serif;resize:none;min-height:60px;max-height:200px;box-sizing:border-box}
.an-focus-empty{color:var(--text-tertiary);font-style:italic}
    `;
    document.head.appendChild(s);
  }

  // ─── Build Panel ──────────────────────────────────────────────────────────
  function buildPanel() {
    var prev = document.getElementById('anOverlay');
    if (prev) prev.remove();

    var overlay = document.createElement('div');
    overlay.id = 'anOverlay';
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closePanel(); });

    var panel = document.createElement('div');
    panel.id = 'anPanel';
    panel.innerHTML = `
      <div class="an-hdr">
        <div class="an-hdr-row">
          <div class="an-hdr-title">🗒️ Quick Notes</div>
          <button class="an-close" id="anClose">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="an-quick">
          <textarea class="an-quick-ta" id="anQuickInput" placeholder="Jot an idea… Enter to add" rows="1"></textarea>
          <button class="an-add-btn" id="anAddBtn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div class="an-quick-meta">
          <div class="an-colors" id="anPanelColors"></div>
          <select class="an-cat-sel" id="anPanelCat"></select>
        </div>
        <div class="an-search-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" class="an-search-in" id="anSearch" placeholder="Search notes…">
        </div>
      </div>
      <div class="an-cat-filters" id="anCatFilters"></div>
      <div class="an-tabs" id="anTabs"></div>
      <div class="an-list" id="anList"></div>
      <div class="an-stats" id="anStats"></div>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    document.getElementById('anClose').addEventListener('click', closePanel);
    document.getElementById('anAddBtn').addEventListener('click', quickAdd);

    var qi = document.getElementById('anQuickInput');
    qi.addEventListener('keydown', function(e){ if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();quickAdd();} });
    qi.addEventListener('input', function(){ this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,120)+'px'; });
    document.getElementById('anSearch').addEventListener('input', function(){ searchQuery=this.value; render(); });

    buildColorRow('anPanelColors', 'panel');
    buildCatSelect('anPanelCat', 'panel');
    renderCatFilters();
    renderTabs();
    renderStats();
  }

  // ─── Build Capture Modal ──────────────────────────────────────────────────
  function buildCapture() {
    var prev = document.getElementById('anCapture'); if (prev) prev.remove();
    var el = document.createElement('div');
    el.id = 'anCapture';
    el.innerHTML = `
      <div class="anc-modal">
        <div class="anc-hdr">
          <div class="anc-hdr-title">🗒️ Quick Capture</div>
          <span class="anc-kbd">Ctrl+Shift+N</span>
        </div>
        <div class="anc-body">
          <textarea class="anc-ta" id="ancTa" placeholder="Feature idea · Bug · Content · Reminder · Islamic post…" rows="3"></textarea>
        </div>
        <div class="anc-foot">
          <div class="anc-meta">
            <div class="anc-colors" id="ancColors"></div>
            <select class="anc-cat-sel" id="ancCat"></select>
          </div>
          <div class="anc-actions">
            <span class="anc-hint">Enter ↵ to save</span>
            <button class="anc-cancel" id="ancCancel">Cancel</button>
            <button class="anc-save" id="ancSave">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><path d="M12 5v14M5 12h14"/></svg>Add Note
            </button>
          </div>
        </div>
      </div>`;
    el.addEventListener('click', function(e){ if (e.target===el) closeCapture(); });
    document.body.appendChild(el);
    document.getElementById('ancCancel').addEventListener('click', closeCapture);
    document.getElementById('ancSave').addEventListener('click', captureAdd);
    document.getElementById('ancTa').addEventListener('keydown', function(e){
      if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();captureAdd();}
      if (e.key==='Escape') closeCapture();
    });
    buildColorRow('ancColors', 'capture');
    buildCatSelect('ancCat', 'capture');
  }

  // ─── Color Row ────────────────────────────────────────────────────────────
  function buildColorRow(containerId, key) {
    var c = document.getElementById(containerId); if (!c) return;
    var isCap = containerId.startsWith('anc');
    var cls = isCap ? 'anc-cdot' : 'an-cdot';
    c.innerHTML = '';
    Object.keys(COLORS).forEach(function(col) {
      var d = document.createElement('div');
      d.className = cls + (col === _selColor[key] ? ' sel' : '');
      d.style.background = COLORS[col].light;
      d.title = col;
      d.addEventListener('click', function(){
        _selColor[key] = col;
        c.querySelectorAll('.' + cls).forEach(function(x){ x.classList.remove('sel'); });
        d.classList.add('sel');
      });
      c.appendChild(d);
    });
  }

  function buildCatSelect(id, key) {
    var sel = document.getElementById(id); if (!sel) return;
    sel.innerHTML = '';
    Object.keys(CATS).forEach(function(k) {
      var opt = document.createElement('option');
      opt.value = k; opt.textContent = CATS[k].label;
      if (k === _selCat[key]) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function(){ _selCat[key] = this.value; });
  }

  // ─── Category filter chips ────────────────────────────────────────────────
  function renderCatFilters() {
    var c = document.getElementById('anCatFilters'); if (!c) return;
    c.innerHTML = '';
    var all = document.createElement('button');
    all.className = 'an-cat-chip' + (!activeCat ? ' sel' : '');
    all.textContent = 'All';
    if (!activeCat) all.style.background = '#6b7280';
    all.addEventListener('click', function(){ activeCat=''; renderCatFilters(); render(); });
    c.appendChild(all);
    Object.keys(CATS).forEach(function(k) {
      var cnt = notes.filter(function(n){ return n.category===k && !n.is_archived; }).length;
      if (!cnt) return;
      var btn = document.createElement('button');
      btn.className = 'an-cat-chip' + (activeCat===k ? ' sel' : '');
      btn.textContent = CATS[k].label;
      btn.style.color = CATS[k].color;
      if (activeCat === k) btn.style.background = CATS[k].color;
      btn.addEventListener('click', function(){ activeCat=k; renderCatFilters(); render(); });
      c.appendChild(btn);
    });
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  function renderTabs() {
    var c = document.getElementById('anTabs'); if (!c) return;
    var tabs = [
      { id:'all', label:'All', icon:'📝' },
      { id:'pinned', label:'Pinned', icon:'📌' },
      { id:'favorites', label:'Favorites', icon:'⭐' },
      { id:'archived', label:'Archive', icon:'📦' },
    ];
    c.innerHTML = '';
    tabs.forEach(function(t) {
      var cnt = countFilter(t.id);
      var btn = document.createElement('button');
      btn.className = 'an-tab' + (t.id===activeFilter ? ' sel' : '');
      btn.innerHTML = t.icon + ' ' + t.label + (cnt>0 ? ' <span class="an-tab-cnt">'+cnt+'</span>' : '');
      btn.addEventListener('click', function(){ activeFilter=t.id; renderTabs(); render(); });
      c.appendChild(btn);
    });
  }

  // ─── Stats Footer ─────────────────────────────────────────────────────────
  function renderStats() {
    var c = document.getElementById('anStats'); if (!c) return;
    var now = Date.now();
    var weekAgo = now - 7*86400000;
    var stats = [
      { label:'Notes\nthis week', val: notes.filter(function(n){ return new Date(n.created_at).getTime()>weekAgo && !n.is_archived; }).length },
      { label:'Pinned',           val: notes.filter(function(n){ return n.is_pinned && !n.is_archived; }).length },
      { label:'Reminders',        val: notes.filter(function(n){ return n.reminder_at && !n.is_archived; }).length },
      { label:'Archived',         val: notes.filter(function(n){ return n.is_archived; }).length },
    ];
    c.innerHTML = '';
    stats.forEach(function(st) {
      var d = document.createElement('div');
      d.className = 'an-stat';
      d.innerHTML = '<div class="an-stat-val">' + st.val + '</div><div class="an-stat-lbl">' + st.label + '</div>';
      c.appendChild(d);
    });
  }

  // ─── Notes List ───────────────────────────────────────────────────────────
  function render() {
    var list = document.getElementById('anList'); if (!list) return;
    renderTabs(); renderCatFilters(); renderStats();
    var vis = getVisible();
    if (!vis.length) {
      var msgs = { all:'No notes yet. Start with an idea above!', pinned:'Pin important notes to find them fast.', favorites:'Star notes you love.', archived:'Archive is empty.' };
      list.innerHTML = '<div class="an-empty"><div class="an-empty-ico">' + ({all:'🗒️',pinned:'📌',favorites:'⭐',archived:'📦'}[activeFilter]||'🗒️') + '</div><div class="an-empty-title">Nothing here</div><div class="an-empty-sub">' + (msgs[activeFilter]||'') + '</div></div>';
      return;
    }
    list.innerHTML = '';
    vis.forEach(function(n){ list.appendChild(buildCard(n)); });
  }

  // ─── Note Card ────────────────────────────────────────────────────────────
  function buildCard(note) {
    var st = noteStyle(note);
    var cl = parseChecklist(note.content);
    var isTasksPage = window.location.pathname.indexOf('admin-tasks') !== -1;
    var cat = CATS[note.category] || CATS.other;

    var card = document.createElement('div');
    card.className = 'sn' + (note.note_type==='focus' ? ' sn-focus' : '');
    card.dataset.id = note.id;
    card.style.cssText = 'background:'+st.bg+';color:'+st.text+';border-color:'+st.border+';';
    card.draggable = true;

    // Pin strip
    if (note.is_pinned) {
      var strip = document.createElement('div');
      strip.className = 'sn-pin-strip';
      card.appendChild(strip);
    }

    // Top row
    var top = document.createElement('div');
    top.className = 'sn-top';
    var badges = document.createElement('div');
    badges.className = 'sn-badges';
    var catChip = document.createElement('span');
    catChip.className = 'sn-cat-chip';
    catChip.style.background = cat.color;
    catChip.textContent = cat.label;
    badges.appendChild(catChip);
    if (note.is_pinned)   { var pi = document.createElement('span'); pi.textContent = '📌'; badges.appendChild(pi); }
    if (note.is_favorite) { var fi = document.createElement('span'); fi.textContent = '⭐'; badges.appendChild(fi); }
    if (note.reminder_at) {
      var rb = document.createElement('span');
      rb.className = 'sn-reminder';
      rb.textContent = '⏰ ' + fmtReminder(note.reminder_at);
      badges.appendChild(rb);
    }
    top.appendChild(badges);

    // Action buttons
    var acts = document.createElement('div');
    acts.className = 'sn-acts';
    var pinBtn = makeActBtn(note.is_pinned ? '📌' : '', 'pin', note.is_pinned, 'Pin');
    pinBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="'+(note.is_pinned?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>';
    var favBtn = makeActBtn('', 'fav', note.is_favorite, 'Favorite');
    favBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="'+(note.is_favorite?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    var archBtn = makeActBtn('', 'arch', false, note.is_archived?'Unarchive':'Archive');
    archBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>';
    var delBtn = makeActBtn('', 'del', false, 'Delete');
    delBtn.classList.add('del');
    delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
    acts.appendChild(pinBtn); acts.appendChild(favBtn); acts.appendChild(archBtn); acts.appendChild(delBtn);
    top.appendChild(acts);
    card.appendChild(top);

    // Body — checklist or plain text
    if (cl.items.length) {
      // Prose part
      if (cl.prose) {
        var prose = document.createElement('div');
        prose.className = 'sn-body';
        prose.style.maxHeight = '60px';
        prose.textContent = cl.prose;
        card.appendChild(prose);
      }
      // Checklist
      var clDiv = document.createElement('div');
      clDiv.className = 'sn-checklist';
      var shown = cl.items.slice(0, 5);
      shown.forEach(function(item, idx) {
        var row = document.createElement('div');
        row.className = 'sn-cl-item';
        var chk = document.createElement('div');
        chk.className = 'sn-cl-check' + (item.checked ? ' done' : '');
        var txt = document.createElement('span');
        txt.className = 'sn-cl-text' + (item.checked ? ' done' : '');
        txt.textContent = item.text;
        row.appendChild(chk); row.appendChild(txt);
        row.addEventListener('click', function(e){
          e.stopPropagation();
          toggleChecklistItem(note, idx);
          var newCl = parseChecklist(note.content);
          chk.className = 'sn-cl-check' + (newCl.items[idx] && newCl.items[idx].checked ? ' done' : '');
          txt.className  = 'sn-cl-text'  + (newCl.items[idx] && newCl.items[idx].checked ? ' done' : '');
          var filled = newCl.items.filter(function(x){return x.checked;}).length;
          var bar = clDiv.querySelector('.sn-cl-progress-fill');
          if (bar) bar.style.width = Math.round(filled/newCl.items.length*100) + '%';
        });
        clDiv.appendChild(row);
      });
      if (cl.items.length > 5) {
        var more = document.createElement('div');
        more.style.cssText = 'font-size:11px;opacity:.5;margin-top:3px;font-family:Inter,sans-serif';
        more.textContent = '+' + (cl.items.length - 5) + ' more';
        clDiv.appendChild(more);
      }
      // Progress bar
      var done = cl.items.filter(function(x){return x.checked;}).length;
      var prog = document.createElement('div');
      prog.className = 'sn-cl-progress';
      var fill = document.createElement('div');
      fill.className = 'sn-cl-progress-fill';
      fill.style.width = (cl.items.length ? Math.round(done/cl.items.length*100) : 0) + '%';
      prog.appendChild(fill);
      clDiv.appendChild(prog);
      card.appendChild(clDiv);
    } else {
      var body = document.createElement('div');
      body.className = 'sn-body';
      body.textContent = note.content;
      body.addEventListener('click', function(e){ e.stopPropagation(); openInlineEdit(note, body); });
      card.appendChild(body);
    }

    // Footer
    var foot = document.createElement('div');
    foot.className = 'sn-foot';
    var timeEl = document.createElement('span');
    timeEl.className = 'sn-time';
    timeEl.textContent = relTime(note.updated_at);
    foot.appendChild(timeEl);

    var footRight = document.createElement('div');
    footRight.className = 'sn-foot-right';

    // Reminder button
    var remBtn = document.createElement('button');
    remBtn.className = 'sn-reminder-btn';
    remBtn.title = 'Set reminder';
    remBtn.textContent = note.reminder_at ? '⏰' : '🔔';
    remBtn.style.position = 'relative';
    remBtn.addEventListener('click', function(e){ e.stopPropagation(); showReminderPicker(note, remBtn); });
    footRight.appendChild(remBtn);

    if (isTasksPage) {
      var ttBtn = document.createElement('button');
      ttBtn.className = 'sn-to-task';
      ttBtn.setAttribute('data-a','totask');
      ttBtn.textContent = '→ Task';
      footRight.appendChild(ttBtn);
    }

    // Mini color dots
    var mcDiv = document.createElement('div');
    mcDiv.className = 'sn-mini-colors';
    Object.keys(COLORS).forEach(function(col) {
      var d = document.createElement('div');
      d.className = 'sn-mc';
      d.style.background = COLORS[col].light;
      d.title = col;
      d.addEventListener('click', function(e){ e.stopPropagation(); patchNote(note.id,{color:col}); note.color=col; var s2=noteStyle(note); card.style.cssText='background:'+s2.bg+';color:'+s2.text+';border-color:'+s2.border+';'; });
      mcDiv.appendChild(d);
    });
    footRight.appendChild(mcDiv);
    foot.appendChild(footRight);
    card.appendChild(foot);

    // Action button event delegation
    acts.addEventListener('click', function(e){
      e.stopPropagation();
      var btn = e.target.closest('[data-a]'); if (!btn) return;
      var a = btn.getAttribute('data-a');
      if (a==='pin')    { patchNote(note.id,{is_pinned:!note.is_pinned});     note.is_pinned=!note.is_pinned;     render(); updatePinnedWidget(); }
      if (a==='fav')    { patchNote(note.id,{is_favorite:!note.is_favorite}); note.is_favorite=!note.is_favorite; render(); }
      if (a==='arch')   { patchNote(note.id,{is_archived:!note.is_archived}); render(); updatePinnedWidget(); }
      if (a==='del')    { if (confirm('Delete permanently?')) removeNote(note.id); }
      if (a==='totask') { convertToTask(note); }
    });

    // Drag & drop
    card.addEventListener('dragstart',function(e){ dragSrcId=note.id; setTimeout(function(){ card.classList.add('sn-dragging'); },0); e.dataTransfer.effectAllowed='move'; });
    card.addEventListener('dragend',function(){ dragSrcId=null; card.classList.remove('sn-dragging'); document.querySelectorAll('.sn').forEach(function(c){ c.classList.remove('drop-before','drop-after'); }); });
    card.addEventListener('dragover',function(e){ e.preventDefault(); if (!dragSrcId||dragSrcId===note.id) return; var mid=card.getBoundingClientRect().top+card.offsetHeight/2; card.classList.toggle('drop-before',e.clientY<mid); card.classList.toggle('drop-after',e.clientY>=mid); });
    card.addEventListener('dragleave',function(){ card.classList.remove('drop-before','drop-after'); });
    card.addEventListener('drop',function(e){ e.preventDefault(); if (!dragSrcId||dragSrcId===note.id) return; reorder(dragSrcId,note.id,e.clientY<card.getBoundingClientRect().top+card.offsetHeight/2); });

    return card;
  }

  function makeActBtn(content, action, on, title) {
    var b = document.createElement('button');
    b.className = 'sn-act' + (on ? ' on' : '');
    b.setAttribute('data-a', action);
    b.title = title;
    if (content) b.textContent = content;
    return b;
  }

  // ─── Reminder Picker ──────────────────────────────────────────────────────
  function showReminderPicker(note, anchor) {
    document.querySelectorAll('.an-rem-pick').forEach(function(x){ x.remove(); });
    var pick = document.createElement('div');
    pick.className = 'an-rem-pick';

    // Clear option if reminder set
    if (note.reminder_at) {
      var clear = document.createElement('div');
      clear.className = 'an-rem-opt';
      clear.textContent = '✕ Clear reminder';
      clear.style.color = '#ef4444';
      clear.addEventListener('click', function(){ patchNote(note.id,{reminder_at:null}); note.reminder_at=null; pick.remove(); render(); });
      pick.appendChild(clear);
    }

    REMINDER_OPTS.forEach(function(opt) {
      var row = document.createElement('div');
      row.className = 'an-rem-opt';
      row.textContent = opt.label;
      row.addEventListener('click', function(){
        var at;
        if (opt.ms === null) {
          // Tomorrow 9am
          var tom = new Date(); tom.setDate(tom.getDate()+1); tom.setHours(9,0,0,0);
          at = tom.toISOString();
        } else if (opt.ms === 'custom') {
          var input = prompt('Set reminder date/time (YYYY-MM-DD HH:MM):');
          if (!input) { pick.remove(); return; }
          at = new Date(input).toISOString();
          if (isNaN(new Date(at).getTime())) { alert('Invalid date'); pick.remove(); return; }
        } else {
          at = new Date(Date.now() + opt.ms).toISOString();
        }
        patchNote(note.id, { reminder_at: at }); note.reminder_at = at;
        scheduleReminder(note);
        pick.remove(); render();
        requestNotifPermission();
      });
      pick.appendChild(row);
    });

    anchor.style.position = 'relative';
    anchor.appendChild(pick);
    setTimeout(function(){ document.addEventListener('click', function h(){ pick.remove(); document.removeEventListener('click', h); }, { once: true }); }, 0);
  }

  // ─── Inline Edit ──────────────────────────────────────────────────────────
  function openInlineEdit(note, bodyEl) {
    if (bodyEl.querySelector('textarea')) return;
    var orig = note.content;
    bodyEl.textContent = '';
    var ta = document.createElement('textarea');
    ta.className = 'sn-body-edit';
    ta.value = orig;
    ta.style.color = 'inherit'; ta.style.height = Math.max(80,ta.scrollHeight)+'px';
    bodyEl.appendChild(ta); ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length;
    ta.addEventListener('input', function(){ ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,320)+'px'; patchNote(note.id,{content:ta.value}); note.content=ta.value; });
    ta.addEventListener('blur', function(){ bodyEl.textContent=note.content; if(note.content!==orig){updatePinnedWidget();updateFocusWidget();} });
    ta.addEventListener('keydown', function(e){ if(e.key==='Escape'){ta.value=orig;note.content=orig;patchNote(note.id,{content:orig});ta.blur();} });
  }

  // ─── Quick Add ────────────────────────────────────────────────────────────
  function quickAdd() {
    var inp = document.getElementById('anQuickInput'); if (!inp) return;
    var text = (inp.value||'').trim(); if (!text) return;
    var cat = (document.getElementById('anPanelCat')||{}).value || _selCat['panel'];
    createNote(text, _selColor['panel'], cat, 'note');
    inp.value=''; inp.style.height=''; inp.focus();
  }

  // ─── Capture ──────────────────────────────────────────────────────────────
  function openCapture() {
    var el = document.getElementById('anCapture'); if (!el) return;
    el.classList.add('open');
    buildColorRow('ancColors','capture'); buildCatSelect('ancCat','capture');
    var ta = document.getElementById('ancTa');
    if (ta) { ta.value=''; setTimeout(function(){ ta.focus(); },60); }
  }
  function closeCapture() { var el=document.getElementById('anCapture'); if(el) el.classList.remove('open'); }
  function captureAdd() {
    var ta=document.getElementById('ancTa'); if (!ta) return;
    var text=(ta.value||'').trim(); closeCapture(); if (!text) return;
    var cat=(document.getElementById('ancCat')||{}).value||_selCat['capture'];
    createNote(text,_selColor['capture'],cat,'note');
    var t=document.getElementById('anTrigger');
    if(t){t.style.color='#f59e0b';setTimeout(function(){t.style.color='';},700);}
  }

  // ─── Panel ────────────────────────────────────────────────────────────────
  function openPanel() {
    panelOpen=true;
    var ov=document.getElementById('anOverlay'), pn=document.getElementById('anPanel');
    if(!ov||!pn) return;
    ov.classList.add('open'); setTimeout(function(){ pn.classList.add('open'); },10);
    render();
    var qi=document.getElementById('anQuickInput');
    if(qi) setTimeout(function(){ qi.focus(); },300);
  }
  function closePanel() {
    panelOpen=false;
    var ov=document.getElementById('anOverlay'), pn=document.getElementById('anPanel');
    if(!ov||!pn) return;
    pn.classList.remove('open');
    setTimeout(function(){ ov.classList.remove('open'); },280);
  }

  // ─── Badge ────────────────────────────────────────────────────────────────
  function updateBadge() {
    var cnt = notes.filter(function(n){ return !n.is_archived && n.note_type !== 'focus'; }).length;
    // Topbar badge dot
    var badge = document.querySelector('#anTrigger .an-badge');
    if (badge) badge.style.display = cnt > 0 ? 'inline-block' : 'none';
    // Sidebar badge count
    var sb = document.getElementById('anSidebarBadge');
    if (sb) { sb.textContent = cnt || ''; sb.style.display = cnt > 0 ? 'inline-block' : 'none'; }
  }

  // ─── Glass Pinned Widget ──────────────────────────────────────────────────
  var _pinDragging = false;

  function updatePinnedWidget() {
    var widget=document.getElementById('anPinned'); if (!widget) return;
    var pinned = notes.filter(function(n){ return n.is_pinned && !n.is_archived && n.note_type!=='focus'; }).slice(0,4);
    widget.innerHTML = '';

    pinned.forEach(function(note) {
      var st = noteStyle(note);
      var lightBg = COLORS[note.color] ? COLORS[note.color].light : '#fef9c3';
      var card = document.createElement('div');
      card.className = 'anp-card' + (note.is_collapsed ? ' collapsed' : '');
      // Glassmorphism: semi-transparent version of color
      card.style.cssText = 'background:' + lightBg + 'b0;color:' + st.text + ';border-color:rgba(255,255,255,.3);';

      var handle = document.createElement('div');
      handle.className = 'anp-drag-handle';
      handle.textContent = '⋮⋮';
      card.appendChild(handle);

      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'anp-actions';
      var collapseBtn = document.createElement('button');
      collapseBtn.className = 'anp-btn';
      collapseBtn.textContent = note.is_collapsed ? '+' : '−';
      collapseBtn.title = note.is_collapsed ? 'Expand' : 'Collapse';
      collapseBtn.addEventListener('click', function(e){
        e.stopPropagation();
        patchNote(note.id,{is_collapsed:!note.is_collapsed}); note.is_collapsed=!note.is_collapsed;
        card.classList.toggle('collapsed',note.is_collapsed);
        collapseBtn.textContent = note.is_collapsed ? '+' : '−';
      });
      var unpinBtn = document.createElement('button');
      unpinBtn.className = 'anp-btn'; unpinBtn.textContent = '✕'; unpinBtn.title = 'Unpin';
      unpinBtn.addEventListener('click', function(e){ e.stopPropagation(); patchNote(note.id,{is_pinned:false}); note.is_pinned=false; updatePinnedWidget(); });
      actionsDiv.appendChild(collapseBtn); actionsDiv.appendChild(unpinBtn);
      card.appendChild(actionsDiv);

      var text = document.createElement('div');
      text.className = 'anp-text';
      text.textContent = note.content;
      card.appendChild(text);

      card.addEventListener('click', openPanel);
      widget.appendChild(card);
    });

    // Restore saved position
    var pos = null;
    try { pos = JSON.parse(localStorage.getItem(PIN_POS_KEY)); } catch(e){}
    if (pos) { widget.style.left = pos.x + 'px'; widget.style.bottom = pos.y + 'px'; }
  }

  // ─── Today's Focus Widget ────────────────────────────────────────────────
  function updateFocusWidget() {
    var widget = document.getElementById('anFocusWidget'); if (!widget) return;
    var focus = notes.find(function(n){ return n.note_type === 'focus'; });
    renderFocusCard(widget, focus);
  }

  function renderFocusCard(container, focus) {
    container.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'an-focus-card';

    var hdr = document.createElement('div');
    hdr.className = 'an-focus-hdr';
    var title = document.createElement('div');
    title.className = 'an-focus-title';
    title.textContent = "🎯 Today's Focus";
    var editBtn = document.createElement('button');
    editBtn.className = 'an-focus-edit';
    editBtn.textContent = focus ? 'Edit' : 'Set focus';
    hdr.appendChild(title); hdr.appendChild(editBtn);

    var body = document.createElement('div');
    body.className = 'an-focus-body';
    if (focus && focus.content) {
      body.textContent = focus.content;
    } else {
      body.innerHTML = '<span class="an-focus-empty">What\'s your main goal for today?</span>';
    }

    card.appendChild(hdr); card.appendChild(body);

    function startEdit() {
      body.innerHTML = '';
      var ta = document.createElement('textarea');
      ta.className = 'an-focus-ta';
      ta.value = focus ? focus.content : '';
      ta.placeholder = "What's your main goal for today?";
      body.appendChild(ta); ta.focus();
      ta.selectionStart = ta.selectionEnd = ta.value.length;
      ta.addEventListener('input', function(){ ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; });
      ta.addEventListener('blur', function(){
        var txt = (ta.value||'').trim();
        if (txt) {
          focus = createNote(txt, 'yellow', 'personal', 'focus');
        } else if (focus) {
          patchNote(focus.id, { content: '' }); focus.content = '';
        }
        renderFocusCard(container, focus);
      });
      ta.addEventListener('keydown', function(e){ if(e.key==='Escape') ta.blur(); });
    }

    editBtn.addEventListener('click', startEdit);
    body.addEventListener('click', function(e){ if (!body.querySelector('textarea')) startEdit(); });
    container.appendChild(card);
  }

  // ─── Status Bar (topbar) ──────────────────────────────────────────────────
  function injectStatusBar() {
    if (document.getElementById('anStatusBar')) return;
    var actions = document.querySelector('.topbar-actions'); if (!actions) return;

    var bar = document.createElement('div');
    bar.id = 'anStatusBar';

    var SERVICES = [
      { key:'admin_api', label:'Admin API' },
      { key:'notif_api', label:'Notifications' },
      { key:'islamvoice', label:'IslamVoice' },
      { key:'gencine', label:'Gencine' },
    ];

    var cache = {};
    try { cache = JSON.parse(localStorage.getItem('admin_health_cache_v1') || '{}'); } catch(e) {}
    var checks = cache.checks || {};

    SERVICES.forEach(function(svc) {
      var status = 'unknown';
      // Find matching checks
      Object.keys(checks).forEach(function(k) {
        if (k.indexOf(svc.key.replace('_api','')) !== -1 || k === svc.key) {
          var v = checks[k];
          if (v === false || v === 'error')   status = 'error';
          else if (v === 'warn' && status !== 'error') status = 'warning';
          else if (v === true  && status === 'unknown') status = 'healthy';
        }
      });

      var dot = document.createElement('div');
      dot.className = 'an-svc-dot ' + status;
      var tip = document.createElement('div');
      tip.className = 'an-svc-tooltip';
      tip.textContent = svc.label + ' — ' + status;
      dot.appendChild(tip);
      dot.addEventListener('click', function(){ window.location.href = '/admin-system-health.html'; });
      bar.appendChild(dot);
    });

    var trigger = actions.querySelector('#sessionTimer');
    actions.insertBefore(bar, trigger || actions.firstChild);
  }

  // ─── Trigger Button ───────────────────────────────────────────────────────
  function injectTrigger() {
    // ── Topbar button ──
    if (!document.getElementById('anTrigger')) {
      var actions = document.querySelector('.topbar-actions');
      if (actions) {
        var btn = document.createElement('button');
        btn.id = 'anTrigger';
        btn.title = 'Quick Notes (Ctrl+Shift+N)';
        btn.style.cssText = 'display:flex;align-items:center;gap:5px;padding:0 10px;height:36px;background:var(--bg-active,#f1f5f9);border:1px solid var(--border-medium,#e2e8f0);border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);white-space:nowrap;flex-shrink:0;font-family:inherit;transition:all .2s;';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Notes <span class="an-badge" style="width:7px;height:7px;border-radius:50%;background:#f59e0b;display:none;flex-shrink:0;"></span>';
        btn.addEventListener('mouseenter', function(){ btn.style.background='var(--bg-hover,#e2e8f0)'; btn.style.color='var(--text-primary,#0f172a)'; });
        btn.addEventListener('mouseleave', function(){ btn.style.background='var(--bg-active,#f1f5f9)'; btn.style.color='var(--text-secondary,#64748b)'; });
        btn.addEventListener('click', function(){ panelOpen ? closePanel() : openPanel(); });
        var themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) actions.insertBefore(btn, themeBtn);
        else          actions.prepend(btn);
      }
    }

    // ── Sidebar entry (under Overview section) ──
    if (!document.getElementById('anSidebarItem')) {
      function tryInjectSidebar() {
        var tasksLink = document.querySelector('.sidebar-nav a[href*="admin-tasks"]');
        if (!tasksLink) return; // not ready yet
        var sideItem = document.createElement('button');
        sideItem.id = 'anSidebarItem';
        sideItem.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;background:transparent;border:none;border-radius:8px;cursor:pointer;color:var(--text-secondary);font-size:13px;font-weight:500;font-family:inherit;text-align:left;transition:background .15s,color .15s;';
        sideItem.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span style="flex:1">Quick Notes</span><span id="anSidebarBadge" style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;background:#f59e0b22;color:#f59e0b;display:none"></span>';
        sideItem.addEventListener('mouseenter', function(){ sideItem.style.background='var(--bg-active)'; sideItem.style.color='var(--text-primary)'; });
        sideItem.addEventListener('mouseleave', function(){ sideItem.style.background='transparent'; sideItem.style.color='var(--text-secondary)'; });
        sideItem.addEventListener('click', function(){ panelOpen ? closePanel() : openPanel(); });
        tasksLink.parentNode.insertBefore(sideItem, tasksLink.nextSibling);
        updateBadge();
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInjectSidebar);
      else tryInjectSidebar();
    }

    updateBadge();
  }

  // ─── Command Palette Integration ──────────────────────────────────────────
  function hookCommandPalette() {
    // Wait until cmdPalette is available then inject note actions
    if (!window.cmdPalette) { setTimeout(hookCommandPalette, 500); return; }
    if (window.cmdPalette._notesHooked) return;
    window.cmdPalette._notesHooked = true;
    // Inject note-related entries into the search via ACTIONS extension
    var noteActions = [
      { id:'note-new',    icon:'file-plus',  label:'New Note',          section:'Notes', keywords:'create note idea capture' },
      { id:'note-open',   icon:'sticky-note',label:'Open Notes Panel',  section:'Notes', keywords:'notes panel open show' },
      { id:'note-focus',  icon:'target',     label:"Set Today's Focus", section:'Notes', keywords:'focus priority goal today' },
      { id:'note-search', icon:'search',     label:'Search Notes',      section:'Notes', keywords:'find note search' },
    ];
    // Patch the execute function
    var origExecute = window.cmdPalette._execute;
    window.cmdPalette.registerNoteActions = function(searchFn, executeFn) {
      window.cmdPalette._noteSearchFn  = searchFn;
      window.cmdPalette._noteExecuteFn = executeFn;
    };
    window.cmdPalette.registerNoteActions(
      function(q) {
        if (!q) return noteActions.slice();
        var lower = q.toLowerCase();
        return noteActions.filter(function(a){ return a.label.toLowerCase().includes(lower) || a.keywords.includes(lower); });
      },
      function(id) {
        if (id==='note-new')    openCapture();
        if (id==='note-open')   openPanel();
        if (id==='note-focus')  { openPanel(); setTimeout(function(){ var el=document.querySelector('.an-focus-card'); if(el) el.click(); },400); }
        if (id==='note-search') { openPanel(); setTimeout(function(){ var el=document.getElementById('anSearch'); if(el){ el.focus(); } },300); }
      }
    );
  }

  // ─── Drag Reorder ─────────────────────────────────────────────────────────
  function reorder(srcId, tgtId, before) {
    var si=notes.findIndex(function(n){return n.id===srcId;}), ti=notes.findIndex(function(n){return n.id===tgtId;});
    if (si===-1||ti===-1) return;
    var moved=notes.splice(si,1)[0];
    var ni=notes.findIndex(function(n){return n.id===tgtId;});
    notes.splice(before?ni:ni+1,0,moved);
    notes.forEach(function(n,i){ n.sort_order=i; });
    saveLocal(); notes.forEach(function(n){ sbUpsert(n); }); render();
  }

  // ─── Convert ──────────────────────────────────────────────────────────────
  function convertToTask(note) {
    if (typeof window.openModal === 'function') {
      window.openModal();
      setTimeout(function(){
        var lines=note.content.split('\n');
        var ti=document.getElementById('tmTitle'), di=document.getElementById('tmDesc');
        if(ti) ti.value=lines[0].slice(0,200);
        if(di&&lines.length>1) di.value=lines.slice(1).join('\n').trim();
      },120);
    } else {
      sessionStorage.setItem('_pendingNoteToTask', note.content);
      window.location.href = '/admin-tasks.html';
    }
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  function setupKeys() {
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key==='N') {
        e.preventDefault();
        var cap=document.getElementById('anCapture');
        if(cap&&cap.classList.contains('open')){closeCapture();return;}
        if(panelOpen) closePanel();
        openCapture(); return;
      }
      if (e.key==='Escape') {
        var cap=document.getElementById('anCapture');
        if(cap&&cap.classList.contains('open')){closeCapture();return;}
        if(panelOpen){closePanel();return;}
      }
    });
  }

  // ─── Pending Note→Task ────────────────────────────────────────────────────
  function checkPending() {
    var p=sessionStorage.getItem('_pendingNoteToTask');
    if (!p||window.location.pathname.indexOf('admin-tasks')===-1) return;
    sessionStorage.removeItem('_pendingNoteToTask');
    setTimeout(function(){
      if (typeof window.openModal!=='function') return;
      window.openModal();
      setTimeout(function(){
        var lines=p.split('\n');
        var ti=document.getElementById('tmTitle'), di=document.getElementById('tmDesc');
        if(ti) ti.value=lines[0].slice(0,200);
        if(di&&lines.length>1) di.value=lines.slice(1).join('\n').trim();
      },150);
    },2000);
  }

  // ─── Today's Focus on Dashboard ───────────────────────────────────────────
  function injectFocusOnDashboard() {
    if (window.location.pathname.indexOf('admin-dashboard')===-1) return;
    if (document.getElementById('anFocusWidget')) return;
    // Inject after the welcome header or as the first card in content-area
    function tryInject() {
      var target = document.querySelector('.welcome-header') || document.querySelector('.content-area');
      if (!target) { setTimeout(tryInject, 500); return; }
      var widget = document.createElement('div');
      widget.id = 'anFocusWidget';
      widget.style.cssText = 'margin-bottom:20px;';
      if (target.classList.contains('content-area')) {
        target.insertBefore(widget, target.firstChild);
      } else {
        target.parentNode.insertBefore(widget, target.nextSibling);
      }
      var focus = notes.find(function(n){ return n.note_type==='focus'; });
      renderFocusCard(widget, focus || null);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryInject);
    } else {
      setTimeout(tryInject, 300);
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  window.AdminNotes = {
    open:    openPanel,
    close:   closePanel,
    capture: openCapture,
    create:  createNote,
    getNotes: function() { return notes.slice(); },
    createFromTask: function(task) {
      var content = (task.title||'') + (task.description ? '\n'+task.description : '');
      createNote(content.trim(), DEFAULT_COLOR, 'other', 'note');
      openPanel();
    },
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    injectCSS();
    notes = loadLocal();

    buildPanel();
    buildCapture();

    if (!document.getElementById('anPinned')) {
      var pw = document.createElement('div'); pw.id='anPinned'; document.body.appendChild(pw);
    }

    injectTrigger();
    injectStatusBar();
    setupKeys();
    updateBadge();
    updatePinnedWidget();
    scheduleAllReminders();
    checkPending();
    injectFocusOnDashboard();
    setTimeout(hookCommandPalette, 800);
    setTimeout(function(){ syncFromSB(); setupRealtime(); }, 2000);
  }

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
