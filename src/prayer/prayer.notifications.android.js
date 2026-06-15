/**
 * Prayer Athan Notifications — Capacitor LocalNotifications
 *
 * ID formula:  100 + (dayOffset * 5) + PRAYER_IDX[name]
 *   dayOffset: 0–27 (28 days ahead)
 *   PRAYER_IDX: Fajr=0, Dhuhr=1, Asr=2, Maghrib=3, Isha=4
 *   ID range: 100–239  |  Daily reminder: 1 (separate)
 *
 * Audio:
 *   Android — MP3 files in res/raw/athan_<voice>.mp3, one channel per voice
 *   iOS     — M4A files bundled in app root, referenced by sound name
 *
 * Scheduling mutex prevents concurrent cancel+schedule races.
 */
(function() {
  'use strict';

  var PRAYER_IDX = { Fajr: 0, Dhuhr: 1, Asr: 2, Maghrib: 3, Isha: 4 };
  var ID_BASE    = 100;
  var MAX_DAYS   = 28; // Android: 28 days (no system limit)
  // iOS hard-limits all apps to 64 pending local notifications.
  // When only athan OR only reminders are active: 12 days × 5 = 60 (4 slots spare).
  // When BOTH athan + reminders are active:       6 days × 5 × 2 = 60 (4 slots spare).
  // iOS 64-slot budget (daily-reminder and daily-verse removed; only streak ID 30 remains):
  //   athan-only:      12×5=60 + streak 1 = 61  ✓
  //   athan+reminder:   6×5 + 6×5 + streak 1 = 61  ✓
  var MAX_DAYS_IOS       = 12;
  var MAX_DAYS_IOS_BOTH  = 6;  // shared budget when athan + prayer-reminders both active

  // Kurdish prayer name fallbacks (used in notification body)
  var PRAYER_KMR_NAMES = {
    Fajr: 'سپێدە', Dhuhr: 'نیڤرۆ', Asr: 'ئێڤار', Maghrib: 'مەغرەب', Isha: 'عەیشا'
  };
  function prayerName(name) {
    return PRAYER_KMR_NAMES[name] || name;
  }

  /** Available athan voices — id must match res/raw/athan_{id}.mp3 (Android) and athan_{id}.m4a (iOS).
   *  Special id 'simple' = no athan audio, OS default notification sound only. */
  var ATHAN_VOICES = [
    { id: 'simple',   nameAr: '',                      nameKey: 'prayer.voice_simple',  previewUrl: null                      },
    { id: 'nasser',   nameAr: 'ناصر القطامي',         nameKey: 'prayer.voice_nasser',  previewUrl: '/audio/athan_nasser.mp3'  },
    { id: 'mishary',  nameAr: 'مشاری راشد العفاسی', nameKey: 'prayer.voice_mishary', previewUrl: '/audio/athan_mishary.mp3' },
    { id: 'omar',     nameAr: 'عمر هشام العربي',      nameKey: 'prayer.voice_omar',    previewUrl: '/audio/athan_omar.mp3'    },
    { id: 'peshawa',  nameAr: 'پێشەوا قادر الکوردی',  nameKey: 'prayer.voice_peshawa', previewUrl: '/audio/athan_peshawa.mp3' },
    { id: 'raad',     nameAr: 'راعد محمد الکوردی',    nameKey: 'prayer.voice_raad',    previewUrl: '/audio/athan_raad.mp3'    }
  ];

  function getLN() {
    return (window.Capacitor &&
            window.Capacitor.Plugins &&
            window.Capacitor.Plugins.LocalNotifications) || null;
  }

  function getAthanAlarmPlugin() {
    return (window.Capacitor &&
            window.Capacitor.Plugins &&
            window.Capacitor.Plugins.AthanAlarm) || null;
  }

  function onIOS() {
    return !!(window.Capacitor && window.Capacitor.getPlatform &&
              window.Capacitor.getPlatform() === 'ios');
  }

  /**
   * Check native exact-alarm permission via AthanAlarmPlugin.
   * Returns true on iOS (no restriction), true on Android < API 31,
   * and the real canScheduleExactAlarms() result on Android 31+.
   */
  async function checkExactAlarmAllowed() {
    if (onIOS()) return true;
    var plugin = getAthanAlarmPlugin();
    if (!plugin) return true; // plugin not available — assume OK
    try {
      var res = await plugin.canScheduleExact();
      var allowed = res && res.canSchedule !== false;
      if (!allowed) {
        console.warn('[Athan] canScheduleExact() → false (API ' + (res && res.apiLevel) + ') — exact alarms revoked');
      }
      return allowed;
    } catch(e) {
      return true; // fail open
    }
  }

  /**
   * Open the exact-alarm settings screen directly (Android 12+).
   * Falls back to app details settings on older devices.
   */
  async function openExactAlarmSettings() {
    var plugin = getAthanAlarmPlugin();
    if (plugin) {
      try { await plugin.openExactAlarmSettings(); } catch(e) {}
    }
  }

  // Expose for use from app.js warning dialogs
  window._openExactAlarmSettings = openExactAlarmSettings;

  function getSelectedVoice() {
    var v = localStorage.getItem('prayerAthanVoice') || 'nasser';
    return ATHAN_VOICES.find(function(x) { return x.id === v; }) ? v : 'nasser';
  }

  // ── Channel management ─────────────────────────────────────────────────────
  //
  // One channel per voice, pointing to athan_<voice>.mp3 in res/raw/.
  // iOS ignores channels entirely — sound is set directly on the notification.

  async function ensureAllChannels() {
    var LN = getLN();
    if (!LN || !LN.createChannel) return; // iOS doesn't have channels
    // Always re-create channels on each schedule call — Android silently drops channels
    // if the user clears app data, revokes notification permissions, or on some Samsung
    // firmware updates. The cost is negligible (~5ms) compared to a missing athan sound.

    // Delete all stale channels from previous versions
    var oldIds = ['athan', 'athan2'];
    var oldVoices = ['mishary', 'ahmed', 'nasser', 'majed', 'mokhtar', 'omar', 'peshawa', 'raad'];
    var oldDurs   = [10, 20, 30, 60];
    oldVoices.forEach(function(ov) {
      oldIds.push('athan_' + ov);
      oldIds.push('athan_' + ov + '_full');
      oldDurs.forEach(function(d) { oldIds.push('athan_' + ov + '_' + d + 's'); });
    });
    for (var d = 0; d < oldIds.length; d++) {
      await LN.deleteChannel({ id: oldIds[d] }).catch(function() {});
    }

    var desc = window.t ? window.t('prayer.channel_desc') : 'Prayer time athan alerts';

    // Simple / silent channel — OS default notification sound, no athan audio
    await LN.createChannel({
      id: 'athan_simple',
      name: 'Athan — Simple',
      description: desc,
      importance: 5,
      vibration: true,
      lights: true,
      lightColor: '#1f5f4a'
      // no sound → system default notification tone
    }).catch(function(e) { console.warn('[Athan] createChannel error:', e && e.message); });

    for (var i = 0; i < ATHAN_VOICES.length; i++) {
      var v = ATHAN_VOICES[i];
      if (v.id === 'simple') continue; // handled above
      await LN.createChannel({
        id: 'athan_' + v.id,
        name: 'Athan — ' + v.nameAr,
        description: desc,
        importance: 5,
        vibration: true,
        lights: true,
        lightColor: '#1f5f4a',
        sound: 'athan_' + v.id  // res/raw/athan_<id>.mp3
      }).catch(function(e) { console.warn('[Athan] createChannel error:', e && e.message); });
    }

    console.log('[Athan] notification channels verified/created for', ATHAN_VOICES.length, 'voices');
  }

  // ── Cancel all pending athan notifications ─────────────────────────────────

  async function cancelAllAthanNotifications() {
    var LN = getLN();
    if (!LN) return;
    var ids = [];
    for (var i = 0; i < MAX_DAYS * 5; i++) {
      ids.push({ id: ID_BASE + i }); // IDs 100–239
    }
    await LN.cancel({ notifications: ids }).catch(function(e) {
      console.warn('[Athan] cancel error (non-fatal):', e && e.message);
    });
    console.log('[Athan] cancelled all athan notification slots (IDs 100–239)');
  }

  // ── Prayer Reminder notifications (IDs 300–439, separate from athan 100–239) ──

  var REMINDER_ID_BASE = 300;
  var REMINDER_CHANNEL = 'prayer_reminder';

  // Default Kurdish texts — overridden by admin config cached in prayerReminderConfig
  var REMINDER_DEFAULTS = {
    fajr:    { title: 'بیرخستنەوەی نوێژ', body: 'نوێژا {prayer} دێ پێ بکەت لە {minutes} خولەک' },
    dhuhr:   { title: 'بیرخستنەوەی نوێژ', body: 'نوێژا {prayer} دێ پێ بکەت لە {minutes} خولەک' },
    asr:     { title: 'بیرخستنەوەی نوێژ', body: 'نوێژا {prayer} دێ پێ بکەت لە {minutes} خولەک' },
    maghrib: { title: 'بیرخستنەوەی نوێژ', body: 'نوێژا {prayer} دێ پێ بکەت لە {minutes} خولەک' },
    isha:    { title: 'بیرخستنەوەی نوێژ', body: 'نوێژا {prayer} دێ پێ بکەت لە {minutes} خولەک' },
  };

  async function ensureReminderChannel() {
    var LN = getLN();
    if (!LN || !LN.createChannel) return;
    await LN.createChannel({
      id: REMINDER_CHANNEL,
      name: 'Prayer Reminders',
      description: 'Reminds you before each prayer',
      importance: 4,
      vibration: true,
      lights: true,
      lightColor: '#f5a623',
    }).catch(function() {});
  }

  async function cancelAllReminderNotifications() {
    var LN = getLN();
    if (!LN) return;
    var ids = [];
    for (var i = 0; i < MAX_DAYS * 5; i++) {
      ids.push({ id: REMINDER_ID_BASE + i }); // IDs 300–439
    }
    await LN.cancel({ notifications: ids }).catch(function(e) {
      console.warn('[Reminder] cancel error (non-fatal):', e && e.message);
    });
  }

  async function scheduleReminderMultiDay(daysData, toggles, offsetMin) {
    await cancelAllReminderNotifications();
    var enabled = localStorage.getItem('prayerReminderEnabled') === 'true';
    if (!enabled) { console.log('[Reminder] disabled — skipping schedule'); return { count: 0 }; }

    var offset = parseInt(offsetMin) || 20;
    var LN = getLN();
    if (!LN) return { count: 0, error: 'no-plugin' };

    var perm = await LN.requestPermissions().catch(function() { return {}; });
    var permOk = perm.display === 'granted' || perm.receive === 'granted' ||
                 perm.display === 'prompt-with-rationale';
    if (!permOk) return { count: 0, error: 'permission-denied' };

    await ensureReminderChannel();

    // Load admin-configured texts (cached by prayer.ui.js fetchReminderConfig)
    var configCache = {};
    try { var raw = localStorage.getItem('prayerReminderConfig'); if (raw) configCache = JSON.parse(raw); } catch(e) {}

    var ios      = onIOS();
    // iOS 64-notification cap: share budget with athan when both are active.
    var _athanOn = localStorage.getItem('prayerAthanEnabled') !== 'false';
    var dayLimit = ios ? (_athanOn ? MAX_DAYS_IOS_BOTH : MAX_DAYS_IOS) : MAX_DAYS;
    var now      = new Date();
    var pl       = window.PrayerLogic;
    var notifications = [];

    for (var dayOffset = 0; dayOffset < daysData.length && dayOffset < dayLimit; dayOffset++) {
      var dayData = daysData[dayOffset];
      var timings = dayData.timings;
      var dateISO = dayData.dateISO;
      if (!timings) continue;

      for (var i = 0; i < pl.NOTIF_PRAYERS.length; i++) {
        var name = pl.NOTIF_PRAYERS[i];
        if (toggles[name] === false) continue;
        if (!timings[name]) continue;

        var prayerAt   = pl.parseAsDate(timings[name], dateISO);
        var reminderAt = new Date(prayerAt.getTime() - offset * 60 * 1000);
        if (reminderAt <= now) continue; // skip past times

        var id        = REMINDER_ID_BASE + dayOffset * 5 + PRAYER_IDX[name];
        var pName     = prayerName(name);
        var key       = name.toLowerCase();
        var tpl       = configCache[key] || REMINDER_DEFAULTS[key] || REMINDER_DEFAULTS.fajr;
        var title     = String(tpl.title || REMINDER_DEFAULTS.fajr.title);
        var body      = String(tpl.body  || REMINDER_DEFAULTS.fajr.body)
                          .replace(/{prayer}/g, pName)
                          .replace(/{minutes}/g, String(offset));

        var remNotif = {
          id: id,
          title: title,
          body: body,
          schedule: { at: reminderAt, allowWhileIdle: true, exact: true },
          channelId: ios ? 'reminder' : REMINDER_CHANNEL,
          smallIcon: 'ic_notification',
          sound: ios ? 'default' : undefined, // iOS: play default alert sound (not silent)
          extra: { type: 'prayer_reminder', name: name, dateISO: dateISO, offset: offset }
        };
        if (!ios) delete remNotif.sound; // Android: sound comes from channel
        notifications.push(remNotif);
      }
    }

    if (notifications.length > 0) {
      await LN.schedule({ notifications: notifications }).catch(function(e) {
        console.warn('[Reminder] schedule error:', e && e.message);
      });
    }
    console.log('[Reminder] scheduled', notifications.length, 'reminders (offset=' + offset + 'min)');
    return { count: notifications.length };
  }

  // ── Scheduling mutex ───────────────────────────────────────────────────────

  var _schedulingLock = null;

  async function withSchedulingLock(fn) {
    while (_schedulingLock) {
      try { await _schedulingLock; } catch(e) {}
    }
    var resolve;
    _schedulingLock = new Promise(function(res) { resolve = res; });
    try {
      return await fn();
    } finally {
      _schedulingLock = null;
      if (resolve) resolve();
    }
  }

  // ── Multi-day scheduling ───────────────────────────────────────────────────

  /**
   * Schedule athan notifications for multiple days ahead.
   *
   * @param {Array}   daysData  — [{dateISO:'YYYY-MM-DD', timings:{Fajr,...}}, ...]
   * @param {string}  city      — city name (used in logs and localStorage metadata)
   * @param {Object}  toggles   — {Fajr:true, Dhuhr:true, ...}
   * @param {*}       _compat   — ignored (kept for backwards-compat call signatures)
   * @param {string}  [voiceId] — voice id; falls back to localStorage value
   * @returns {Promise<{count:number, error:string|null, denied?:boolean, details:Array}>}
   */
  async function scheduleAthanMultiDay(daysData, city, toggles, _compat, voiceId) {
    return withSchedulingLock(function() {
      return _doSchedule(daysData, city, toggles, voiceId);
    });
  }

  async function _doSchedule(daysData, city, toggles, voiceId) {
    // Guard: if athan was disabled while this call was queued behind the mutex, abort.
    // Mirrors getAthan() in prayer.ui.js — checks S.prayerAthanEnabled first, then localStorage.
    var _athanOn = (window.S && window.S.prayerAthanEnabled !== undefined)
                  ? window.S.prayerAthanEnabled
                  : (localStorage.getItem('prayerAthanEnabled') !== 'false');
    if (!_athanOn) {
      console.log('[Athan] _doSchedule: athan disabled — aborting (toggle was flipped during queue)');
      return { count: 0, error: 'cancelled', details: [] };
    }

    var LN = getLN();
    if (!LN) {
      console.log('[Athan] LocalNotifications plugin not available — skip scheduling');
      return { count: 0, error: 'no-plugin', details: [] };
    }

    // Exact-alarm permission check (Android 12+ / API 31+).
    // Must pass before we call LN.schedule() — otherwise Android silently
    // downgrades to inexact alarms which Doze can delay by up to 15 minutes.
    var exactOk = await checkExactAlarmAllowed();
    if (!exactOk) {
      console.warn('[Athan] exact alarm permission denied — showing warning to user');
      if (window._showAthanAlarmPermWarning) window._showAthanAlarmPermWarning();
      return { count: 0, error: 'exact-alarm-denied', exactDenied: true, details: [] };
    }

    // Notification permission check — idempotent, no dialog if already granted
    var perm = await LN.requestPermissions().catch(function() { return {}; });
    var permDisplay = perm.display || '';
    var permReceive = perm.receive || '';
    var permOk = permDisplay === 'granted' || permReceive === 'granted' ||
                 permDisplay === 'prompt-with-rationale';
    console.log('[Athan] permission check:', JSON.stringify(perm),
                '→', permOk ? 'OK' : 'DENIED', '| city:', city, '| days:', daysData.length);
    if (!permOk) {
      console.warn('[Athan] permission denied — athan notifications will not fire');
      return { count: 0, error: 'permission-denied', denied: true, details: [] };
    }

    await cancelAllAthanNotifications();
    await ensureAllChannels();

    var ios        = onIOS();
    var voice      = voiceId || getSelectedVoice();
    var isSimple   = (voice === 'simple');

    // 'simple' → OS default notification sound, no athan audio
    // Android: one channel per voice, sound = MP3 filename in res/raw/
    // iOS: sound = CAF filename bundled in app root (athan_<voice>.caf, PCM 16-bit 44100 Hz)
    var channelId = isSimple ? 'athan_simple' : (ios ? 'reminder' : ('athan_' + voice));
    var soundFile = isSimple ? null : (ios ? ('athan_' + voice + '.caf') : ('athan_' + voice));

    // iOS hard cap: 64 notifications per app. Share budget with reminders if both active.
    // Android has no such restriction.
    var reminderOn = localStorage.getItem('prayerReminderEnabled') === 'true';
    var dayLimit  = ios ? (reminderOn ? MAX_DAYS_IOS_BOTH : MAX_DAYS_IOS) : MAX_DAYS;
    console.log('[Athan] scheduling: platform=' + (ios ? 'iOS' : 'Android') +
                ' voice=' + voice + ' sound=' + (soundFile || 'default') +
                ' days=' + Math.min(daysData.length, dayLimit) + ' (cap=' + dayLimit + ')');

    var now = new Date();
    var pl  = window.PrayerLogic;
    var notifications = [];
    var details = [];

    for (var dayOffset = 0; dayOffset < daysData.length && dayOffset < dayLimit; dayOffset++) {
      var dayData = daysData[dayOffset];
      var timings = dayData.timings;
      var dateISO = dayData.dateISO;
      if (!timings) continue;

      for (var i = 0; i < pl.NOTIF_PRAYERS.length; i++) {
        var name = pl.NOTIF_PRAYERS[i];
        if (toggles[name] === false) continue;
        if (!timings[name]) continue;

        var prayerAt = pl.parseAsDate(timings[name], dateISO);
        prayerAt = new Date(prayerAt.getTime() - 5000); // fire 5s early
        if (prayerAt <= now) {
          console.log('[Athan] SKIP (past):', name, dateISO, timings[name]);
          continue;
        }

        var id      = ID_BASE + dayOffset * 5 + PRAYER_IDX[name];
        var pName   = prayerName(name);
        var title   = window.t ? window.t('prayer.notif_title') : 'بانگ';
        var bodyKey = 'prayer.notif_body_' + name.toLowerCase();
        var body    = window.t ? window.t(bodyKey) : ('نوکە دەمێ بانگێ ' + pName + ' یە');
        if (!body || body === bodyKey) body = 'نوکە دەمێ بانگێ ' + pName + ' یە';

        var notif = {
          id: id,
          title: title,
          body: body,
          schedule: { at: prayerAt, allowWhileIdle: true, exact: true },
          channelId: channelId,
          smallIcon: 'ic_notification',
          extra: { type: 'prayer', name: name, dateISO: dateISO }
        };
        if (soundFile) { notif.sound = soundFile; }

        notifications.push(notif);
        details.push({ id: id, name: name, dateISO: dateISO, timeStr: timings[name], atISO: prayerAt.toISOString() });
        console.log('[Athan] QUEUED:', name, dateISO, timings[name],
                    '| voice=' + voice + ' channel=' + channelId,
                    '→ ID', id, '→', prayerAt.toISOString());
      }
    }

    var intendedCount = notifications.length;
    var schedErr = null;

    if (intendedCount > 0) {
      await LN.schedule({ notifications: notifications }).catch(function(e) {
        schedErr = e && (e.message || String(e));
        console.error('[Athan] LN.schedule() FAILED:', schedErr);
      });
    }

    var actualCount = schedErr ? 0 : intendedCount;

    // Verify: spot-check OS pending queue to confirm notifications landed.
    // On Android: 0 pending → exact alarm permission was silently revoked → warn user.
    // On iOS: not applicable (exact alarms don't exist; ios limit is handled above).
    if (!schedErr && intendedCount > 0 && LN.getPending) {
      try {
        var pending = await LN.getPending();
        var pendingAthan = ((pending && pending.notifications) || []).filter(function(n) {
          return n.id >= ID_BASE && n.id < ID_BASE + MAX_DAYS * 5;
        });
        console.log('[Athan] OS verification: ' + pendingAthan.length + ' athan notifications confirmed pending (intended=' + intendedCount + ')');
        if (pendingAthan.length === 0 && !ios) {
          console.warn('[Athan] ⚠️ 0 pending on Android — exact alarm permission may be revoked');
          localStorage.setItem('athanExactAlarmWarned', '1');
          if (window._showAthanAlarmPermWarning) window._showAthanAlarmPermWarning();
        } else if (pendingAthan.length > 0) {
          localStorage.removeItem('athanExactAlarmWarned');
        }
      } catch(e) {
        console.warn('[Athan] getPending() verification error (non-fatal):', e && e.message);
      }
    }

    console.log('[Athan] schedule complete: city=' + city + ' voice=' + voice +
                ' channel=' + channelId + ' count=' + actualCount +
                (schedErr ? ' ERROR=' + schedErr : ''));

    if (actualCount > 0) {
      var nowTs = Date.now();
      localStorage.setItem('prayerLastScheduleDate', daysData[0].dateISO);
      localStorage.setItem('prayerLastScheduleCount', String(actualCount));
      localStorage.setItem('prayerLastScheduleCity', city);
      try { localStorage.setItem('prayerAthanFireLog', JSON.stringify(details)); } catch(e) {}

      // Mirror timestamp + athan state to native SharedPreferences so
      // AthanRescheduleWorker (WorkManager) can check without a running WebView.
      var _plugin = getAthanAlarmPlugin();
      if (_plugin && _plugin.mirrorScheduleTs) {
        _plugin.mirrorScheduleTs({ ts: nowTs, athanEnabled: true }).catch(function() {});
      }
    }

    return { count: actualCount, error: schedErr, details: details };
  }

  // ── Backwards-compat single-day wrapper ────────────────────────────────────

  async function scheduleAthanNotifications(timings, city, toggles, dateISO) {
    return scheduleAthanMultiDay(
      [{ dateISO: dateISO, timings: timings }],
      city, toggles
    );
  }

  // ── Debug: inspect all pending athan notifications ─────────────────────────

  async function debugPendingNotifications() {
    var LN = getLN();
    if (!LN || !LN.getPending) {
      console.log('[Athan DEBUG] LN.getPending() not available');
      return [];
    }
    var result = await LN.getPending().catch(function(e) {
      console.error('[Athan DEBUG] getPending() error:', e && e.message);
      return { notifications: [] };
    });
    var all   = (result && result.notifications) || [];
    var athan = all.filter(function(n) { return n.id >= ID_BASE && n.id < ID_BASE + MAX_DAYS * 5; });
    var NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    console.log('═══════════════════════════════════════════════════');
    console.log('[Athan DEBUG] Total OS-pending notifications:', all.length);
    console.log('[Athan DEBUG] Athan slots pending (IDs 100–239):', athan.length);
    if (athan.length === 0) {
      console.warn('[Athan DEBUG] ⚠️  NO athan notifications are pending in the OS!');
    }
    athan.sort(function(a, b) { return a.id - b.id; });
    athan.forEach(function(n) {
      var dayOffset   = Math.floor((n.id - 100) / 5);
      var prayerIdx   = (n.id - 100) % 5;
      var pName       = NAMES[prayerIdx] || '?';
      var scheduledAt = (n.schedule && n.schedule.at) ? new Date(n.schedule.at).toLocaleString() : '?';
      console.log('[Athan DEBUG] ID ' + n.id + '  day+' + dayOffset + '  ' + pName +
                  '  → scheduled at: ' + scheduledAt);
    });
    console.log('─── Metadata ───────────────────────────────────────');
    console.log('[Athan DEBUG] Last schedule date  :', localStorage.getItem('prayerLastScheduleDate') || '(none)');
    console.log('[Athan DEBUG] Last schedule count :', localStorage.getItem('prayerLastScheduleCount') || '(none)');
    console.log('[Athan DEBUG] Last schedule city  :', localStorage.getItem('prayerLastScheduleCity') || '(none)');
    console.log('═══════════════════════════════════════════════════');
    return athan;
  }

  // ── Quick test: schedule one notification 60 seconds from now ─────────────
  // Usage: await PrayerNotifications.scheduleTestNotification()

  async function scheduleTestNotification() {
    var LN = getLN();
    if (!LN) { console.warn('[Athan TEST] LocalNotifications plugin not available'); return null; }
    var perm = await LN.requestPermissions().catch(function() { return {}; });
    console.log('[Athan TEST] permission:', JSON.stringify(perm));
    var permOk = (perm.display === 'granted' || perm.receive === 'granted');
    if (!permOk) { console.warn('[Athan TEST] permission not granted — test will not fire'); }
    var ios   = onIOS();
    var voice = getSelectedVoice();
    var soundFile = (voice === 'simple') ? null : (ios ? ('athan_' + voice + '.caf') : ('athan_' + voice));
    var at = new Date(Date.now() + 60 * 1000);
    var notif = {
      id: 9999,
      title: window.t ? window.t('prayer.notif_title') : 'بانگ',
      body: 'Test — if you see this, notifications work! (' + at.toLocaleTimeString() + ')',
      schedule: { at: at, allowWhileIdle: true, exact: true },
      channelId: (voice === 'simple') ? 'athan_simple' : (ios ? 'reminder' : ('athan_' + voice)),
      extra: { type: 'test' }
    };
    if (soundFile) notif.sound = soundFile;
    var err = null;
    await LN.schedule({ notifications: [notif] }).catch(function(e) {
      err = e && (e.message || String(e));
      console.error('[Athan TEST] schedule() error:', err);
    });
    if (!err) {
      console.log('[Athan TEST] ✓ test notification scheduled — fires at:', at.toLocaleString(),
                  '| sound=' + (soundFile || 'default') + ' | platform=' + (ios ? 'iOS' : 'Android'));
    }
    return err ? null : at;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  window.PrayerNotifications = {
    ATHAN_VOICES: ATHAN_VOICES,
    cancelAllAthanNotifications: cancelAllAthanNotifications,
    scheduleAthanNotifications: scheduleAthanNotifications,
    scheduleAthanMultiDay: scheduleAthanMultiDay,
    ensureAllChannels: ensureAllChannels,
    getSelectedVoice: getSelectedVoice,
    debugPendingNotifications: debugPendingNotifications,
    scheduleTestNotification: scheduleTestNotification,
    // Reminder
    cancelAllReminderNotifications: cancelAllReminderNotifications,
    scheduleReminderMultiDay: scheduleReminderMultiDay,
  };

})();
