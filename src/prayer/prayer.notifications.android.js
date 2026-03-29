/**
 * Prayer Athan Notifications — Capacitor LocalNotifications
 *
 * ID formula:  100 + (dayOffset * 5) + PRAYER_IDX[name]
 *   dayOffset: 0–6 (7 days ahead)
 *   PRAYER_IDX: Fajr=0, Dhuhr=1, Asr=2, Maghrib=3, Isha=4
 *   ID range: 100–134  |  Preview test: 200  |  Daily reminder: 1 (separate)
 *
 * ROOT CAUSES FIXED:
 * ──────────────────
 * 1. Scheduling mutex (_schedulingLock) — prevents concurrent cancel+schedule
 *    races when initScheduleOnStart, onCityChange, or refresh fire at the
 *    same time. The race was: A schedules 35, B cancels them, B fails → 0.
 *
 * 2. `count` now reflects SUBMITTED notifications only. If LN.schedule()
 *    throws, count is forced to 0 so the caller knows scheduling failed.
 *
 * 3. Detailed per-notification logging — every scheduled notification emits:
 *    [Athan] QUEUED: Fajr 2026-03-23 05:21 Baghdad → ID 100 → UTC iso
 *    This lets you verify dates/times are correct without an emulator.
 *
 * 4. debugPendingNotifications() — calls LN.getPending() and prints every
 *    pending athan notification with its scheduled time. Use from devtools.
 *
 * 5. 'prompt-with-rationale' treated as grantable (not denied) — some
 *    Android versions return this instead of 'granted' on repeat calls
 *    even when the user previously allowed it via the system dialog.
 *
 * 6. Scheduling metadata saved to localStorage for post-mortem diagnostics:
 *    prayerLastScheduleDate / prayerLastScheduleCount / prayerLastScheduleCity
 */
(function() {
  'use strict';

  var PRAYER_IDX = { Fajr: 0, Dhuhr: 1, Asr: 2, Maghrib: 3, Isha: 4 };
  var ID_BASE    = 100;
  var MAX_DAYS   = 7;

  // Kurdish prayer name fallbacks (used in notification body)
  var PRAYER_KMR_FB = {
    Fajr: 'بەیانی', Dhuhr: 'نیڤرو', Asr: 'ئێوارە', Maghrib: 'ئاوابوون', Isha: 'عیشا'
  };
  var PRAYER_KMR_KEY = {
    Fajr: 'prayer.fajr', Dhuhr: 'prayer.dhuhr', Asr: 'prayer.asr',
    Maghrib: 'prayer.maghrib', Isha: 'prayer.isha'
  };
  function prayerName(name) {
    var key = PRAYER_KMR_KEY[name];
    return (window.t && key && window.t(key)) || PRAYER_KMR_FB[name] || name;
  }

  /** All available athan voices — id must match res/raw/athan_{id}.ogg */
  var ATHAN_VOICES = [
    { id: 'mishary', nameAr: 'مشاری راشد العفاسی',  nameKey: 'prayer.voice_mishary', previewUrl: '/audio/athan_mishary.ogg' },
    { id: 'ahmed',   nameAr: 'أحمد العمادي',          nameKey: 'prayer.voice_ahmed',   previewUrl: '/audio/athan_ahmed.ogg'   },
    { id: 'nasser',  nameAr: 'ناصر القطامي',          nameKey: 'prayer.voice_nasser',  previewUrl: '/audio/athan_nasser.ogg'  },
    { id: 'majed',   nameAr: 'ماجد الحمضاني',         nameKey: 'prayer.voice_majed',   previewUrl: '/audio/athan_majed.ogg'   },
    { id: 'mokhtar', nameAr: 'مختار حاج سليمان',      nameKey: 'prayer.voice_mokhtar', previewUrl: '/audio/athan_mokhtar.ogg' }
  ];

  function getLN() {
    return (window.Capacitor &&
            window.Capacitor.Plugins &&
            window.Capacitor.Plugins.LocalNotifications) || null;
  }

  function onIOS() {
    return !!(window.Capacitor && window.Capacitor.getPlatform &&
              window.Capacitor.getPlatform() === 'ios');
  }

  function getSelectedVoice() {
    var v = localStorage.getItem('prayerAthanVoice') || 'mishary';
    return ATHAN_VOICES.find(function(x) { return x.id === v; }) ? v : 'mishary';
  }

  // ── Channel management ─────────────────────────────────────────────────────

  var CHANNEL_VER = 'v4';

  async function ensureAllChannels() {
    var LN = getLN();
    if (!LN || !LN.createChannel) return; // iOS doesn't have channels
    if (localStorage.getItem('athanChannelVer') === CHANNEL_VER) return;
    // Delete stale channels from previous versions
    var oldIds = ['athan', 'athan2',
      'athan_mishary', 'athan_ahmed', 'athan_nasser', 'athan_majed', 'athan_mokhtar'];
    for (var d = 0; d < oldIds.length; d++) {
      await LN.deleteChannel({ id: oldIds[d] }).catch(function() {});
    }
    // Recreate with correct per-voice sounds
    for (var i = 0; i < ATHAN_VOICES.length; i++) {
      var v = ATHAN_VOICES[i];
      await LN.createChannel({
        id: 'athan_' + v.id,
        name: 'Athan — ' + v.nameAr,
        description: window.t ? window.t('prayer.channel_desc') : 'Prayer time athan alerts',
        importance: 5,  // IMPORTANCE_HIGH — shows heads-up notification
        vibration: true,
        lights: true,
        lightColor: '#1f5f4a',
        sound: 'athan_' + v.id   // must match res/raw/athan_<id>.ogg exactly
      }).catch(function(e) {
        console.warn('[Athan] createChannel error:', e && e.message);
      });
    }
    localStorage.setItem('athanChannelVer', CHANNEL_VER);
    console.log('[Athan] notification channels created for', ATHAN_VOICES.length, 'voices');
  }

  // ── Cancel all pending athan notifications ─────────────────────────────────

  async function cancelAllAthanNotifications() {
    var LN = getLN();
    if (!LN) return;
    var ids = [{ id: 200 }]; // preview test notification
    for (var i = 0; i < MAX_DAYS * 5; i++) {
      ids.push({ id: ID_BASE + i }); // IDs 100–134
    }
    await LN.cancel({ notifications: ids }).catch(function(e) {
      console.warn('[Athan] cancel error (non-fatal):', e && e.message);
    });
    console.log('[Athan] cancelled all athan notification slots (IDs 100–134, 200)');
  }

  // ── Scheduling mutex ───────────────────────────────────────────────────────
  //
  // FIX: Without this lock, two concurrent callers both call
  // cancelAllAthanNotifications(), then both try to schedule. The second
  // cancel wipes the first caller's scheduled notifications, leaving zero.
  //
  // With the lock, callers queue up and run serially.

  var _schedulingLock = null; // active Promise | null

  async function withSchedulingLock(fn) {
    // Wait for any in-flight scheduling to complete before starting
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
   * Wrapped in a mutex — concurrent calls queue and run serially.
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
    var LN = getLN();
    if (!LN) {
      console.log('[Athan] LocalNotifications plugin not available — skip scheduling');
      return { count: 0, error: 'no-plugin', details: [] };
    }

    // Request/verify notification permission.
    // This is idempotent — if already granted, returns immediately without dialog.
    // 'prompt-with-rationale' means the OS will show the dialog again — treat as OK.
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

    // Cancel then recreate channels BEFORE scheduling
    await cancelAllAthanNotifications();
    await ensureAllChannels();

    var ios       = onIOS();
    var voice     = voiceId || getSelectedVoice();
    // iOS: use existing 'reminder' channel (no custom sounds on iOS via LocalNotifications)
    // Android: use per-voice channel which sets the correct athan sound
    var channelId = ios ? 'reminder' : 'athan_' + voice;
    var soundFile = ios ? null       : 'athan_' + voice;

    var now = new Date();
    var pl  = window.PrayerLogic;
    var notifications = [];
    var details = [];

    for (var dayOffset = 0; dayOffset < daysData.length && dayOffset < MAX_DAYS; dayOffset++) {
      var dayData = daysData[dayOffset];
      var timings = dayData.timings;
      var dateISO = dayData.dateISO;
      if (!timings) continue;

      for (var i = 0; i < pl.NOTIF_PRAYERS.length; i++) {
        var name = pl.NOTIF_PRAYERS[i];
        if (toggles[name] === false) continue; // prayer disabled by user
        if (!timings[name]) continue;          // missing from API response

        // parseAsDate constructs with '+03:00' (Baghdad/Kurdistan timezone, UTC+3, no DST).
        // The resulting Date is a correct absolute UTC moment regardless of device timezone.
        var prayerAt = pl.parseAsDate(timings[name], dateISO);

        // Apply "notify N seconds before prayer" offset (0 = at prayer time).
        var offsetSec = parseInt(localStorage.getItem('prayerAthanDuration') || '0', 10) || 0;
        var at = offsetSec > 0 ? new Date(prayerAt.getTime() - offsetSec * 1000) : prayerAt;

        if (at <= now) {
          console.log('[Athan] SKIP (past):', name, dateISO, timings[name],
                      offsetSec > 0 ? '(offset -' + offsetSec + 's)' : '');
          continue;
        }

        var id    = ID_BASE + dayOffset * 5 + PRAYER_IDX[name];
        var pName = prayerName(name);
        var titleKey = 'prayer.notif_title_' + name.toLowerCase();
        var title = window.t ? window.t(titleKey) : pName;
        if (!title || title === titleKey) title = pName; // fallback to prayer name if key missing
        var body  = window.t
          ? window.t('prayer.notif_body', { prayer: pName })
          : ('نوکە دەمێ بانگێ ' + pName + ' یە');

        var notif = {
          id: id,
          title: title,
          body: body,
          // at: absolute UTC Date — Capacitor serialises to ISO string for native layer.
          // Android: AlarmManager.setExactAndAllowWhileIdle() — fires during Doze.
          // iOS: UNCalendarNotificationTrigger from date components — persists app restart.
          schedule: { at: at, allowWhileIdle: true },
          channelId: channelId,
          smallIcon: 'ic_notification',
          extra: { type: 'prayer', name: name, dateISO: dateISO }
        };
        if (soundFile) notif.sound = soundFile;

        notifications.push(notif);
        details.push({ id: id, name: name, dateISO: dateISO, timeStr: timings[name], atISO: at.toISOString(), offsetSec: offsetSec });
        console.log('[Athan] QUEUED:', name, dateISO, timings[name],
                    offsetSec > 0 ? '(-' + offsetSec + 's)' : '(exact)',
                    '→ ID', id, '→', at.toISOString());
      }
    }

    var intendedCount = notifications.length;
    var schedErr = null;

    if (intendedCount > 0) {
      await LN.schedule({ notifications: notifications }).catch(function(e) {
        schedErr = e && (e.message || String(e));
        console.error('[Athan] LN.schedule() FAILED:', schedErr);
        console.error('[Athan] This means NO notifications were actually scheduled even though', intendedCount, 'were queued');
      });
    }

    // IMPORTANT: Report 0 if LN.schedule() threw an error.
    // Previous bug: count was the intended count even on failure, causing
    // initScheduleOnStart to mark the schedule as successful when nothing fired.
    var actualCount = schedErr ? 0 : intendedCount;

    console.log('[Athan] schedule complete: city=' + city + ' voice=' + voice +
                ' count=' + actualCount + (schedErr ? ' ERROR=' + schedErr : ''));

    // Persist metadata for diagnostics (used by debugPendingNotifications)
    if (actualCount > 0) {
      localStorage.setItem('prayerLastScheduleDate', daysData[0].dateISO);
      localStorage.setItem('prayerLastScheduleCount', String(actualCount));
      localStorage.setItem('prayerLastScheduleCity', city);
      // Save fire-time log for auto-cancel on app foreground
      try { localStorage.setItem('prayerAthanFireLog', JSON.stringify(details)); } catch(e) {}
    }

    return { count: actualCount, error: schedErr, details: details };
  }

  // ── Auto-dismiss athan notifications on app foreground ─────────────────────
  //
  // Android local notifications don't auto-dismiss after they fire.
  // When the app comes to foreground we cancel any athan notification whose
  // athan has completed playing — i.e., fire_time + offset_sec has passed.
  // "Full" duration (offset=0) notifications are never auto-cancelled.

  async function cancelFiredAthanNotifications() {
    var LN = getLN();
    if (!LN) return;

    var offsetSec = parseInt(localStorage.getItem('prayerAthanDuration') || '0', 10) || 0;
    if (offsetSec === 0) return; // "تەواو" (full athan) — user wants notification until they dismiss

    try {
      var raw = localStorage.getItem('prayerAthanFireLog');
      if (!raw) return;
      var log = JSON.parse(raw);
      var now = Date.now();
      var toCancel = [];

      log.forEach(function(entry) {
        if (!entry.id || !entry.atISO) return;
        // atISO = fire time (= prayer time - offsetSec)
        // athan completes at: atISO + offsetSec * 1000 = prayer time
        var cancelAfter = new Date(entry.atISO).getTime() + (offsetSec * 1000);
        if (cancelAfter <= now) {
          toCancel.push({ id: entry.id });
        }
      });

      if (toCancel.length > 0) {
        await LN.cancel({ notifications: toCancel }).catch(function() {});
        console.log('[Athan] Auto-dismissed', toCancel.length, 'completed athan notifications');
      }
    } catch(e) {
      console.warn('[Athan] cancelFiredAthanNotifications:', e);
    }
  }

  // ── Backwards-compat single-day wrapper ────────────────────────────────────

  async function scheduleAthanNotifications(timings, city, toggles, dateISO) {
    return scheduleAthanMultiDay(
      [{ dateISO: dateISO, timings: timings }],
      city, toggles
    );
  }

  // ── Test notification ──────────────────────────────────────────────────────

  /**
   * Schedule a single test notification N seconds from now.
   * Uses the currently selected voice channel.
   * Returns {ok:true} on success, {ok:false, denied?:true, error?:string} on failure.
   *
   * NOTE: This uses the SAME scheduling path as real athan notifications.
   * If this works but real athan does not, the issue is NOT code — it is
   * Samsung/OEM battery optimization suppressing alarms fired hours later.
   * → User must set Battery Usage to "Unrestricted" for this app.
   */
  async function scheduleTestNotification(delaySec) {
    var LN = getLN();
    if (!LN) return { ok: false, error: 'no plugin' };

    var perm = await LN.requestPermissions().catch(function() { return {}; });
    var permOk = perm.display === 'granted' || perm.receive === 'granted' ||
                 perm.display === 'prompt-with-rationale';
    if (!permOk) return { ok: false, denied: true };

    await ensureAllChannels();

    var ios       = onIOS();
    var voice     = getSelectedVoice();
    var channelId = ios ? 'reminder' : 'athan_' + voice;
    var at = new Date(Date.now() + (delaySec || 10) * 1000);

    console.log('[Athan] test notification: +' + (delaySec || 10) + 's → at', at.toISOString(),
                '| channel:', channelId, '| voice:', voice);

    var testNotif = {
      id: 200,
      title: window.t ? window.t('prayer.notif_title') : 'بانگ',
      body:  window.t ? window.t('prayer.test_notif_body') : 'تاقیکردنا بانگ — ئاگادارکرن چاکە دیکا!',
      schedule: { at: at, allowWhileIdle: true },
      channelId: channelId,
      smallIcon: 'ic_notification',
      extra: { type: 'prayer' }
    };
    if (!ios) testNotif.sound = 'athan_' + voice;

    await LN.cancel({ notifications: [{ id: 200 }] }).catch(function() {});
    var err = null;
    await LN.schedule({ notifications: [testNotif] }).catch(function(e) {
      err = e && (e.message || String(e));
      console.error('[Athan] test schedule error:', err);
    });
    return err ? { ok: false, error: err } : { ok: true };
  }

  // ── Debug: inspect all pending athan notifications ─────────────────────────

  /**
   * Fetch and log all pending athan notifications from the OS queue.
   *
   * Usage: await PrayerNotifications.debugPendingNotifications()
   *
   * This tells you:
   * - Which prayers are actually scheduled
   * - Their exact scheduled times
   * - Whether the schedule is empty (why notifications might be missing)
   *
   * If the list is empty but athan is enabled → the scheduling call failed
   * or was cancelled by a race condition or OS battery optimisation.
   *
   * @returns {Promise<Array>} list of pending athan notification objects
   */
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
    var all = (result && result.notifications) || [];
    var athan = all.filter(function(n) { return n.id >= 100 && n.id <= 134; });
    var NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    console.log('═══════════════════════════════════════════════════');
    console.log('[Athan DEBUG] Total OS-pending notifications:', all.length);
    console.log('[Athan DEBUG] Athan slots pending (IDs 100–134):', athan.length);
    if (athan.length === 0) {
      console.warn('[Athan DEBUG] ⚠️  NO athan notifications are pending in the OS!');
      console.warn('[Athan DEBUG] Possible causes:');
      console.warn('[Athan DEBUG]   1. Athan was never scheduled (check if getAthan() is true)');
      console.warn('[Athan DEBUG]   2. A concurrent cancel+schedule race wiped them');
      console.warn('[Athan DEBUG]   3. Samsung/OEM battery management cleared AlarmManager entries');
      console.warn('[Athan DEBUG]   4. LN.schedule() threw an error — check earlier logs');
    }
    athan.sort(function(a, b) { return a.id - b.id; });
    athan.forEach(function(n) {
      var dayOffset  = Math.floor((n.id - 100) / 5);
      var prayerIdx  = (n.id - 100) % 5;
      var pName      = NAMES[prayerIdx] || '?';
      var scheduledAt = (n.schedule && n.schedule.at) ? new Date(n.schedule.at).toLocaleString() : '?';
      console.log('[Athan DEBUG] ID ' + n.id + '  day+' + dayOffset + '  ' + pName +
                  '  → scheduled at: ' + scheduledAt);
    });
    console.log('─── Metadata ───────────────────────────────────────');
    console.log('[Athan DEBUG] Last schedule date  :', localStorage.getItem('prayerLastScheduleDate') || '(none)');
    console.log('[Athan DEBUG] Last schedule count :', localStorage.getItem('prayerLastScheduleCount') || '(none)');
    console.log('[Athan DEBUG] Last schedule city  :', localStorage.getItem('prayerLastScheduleCity') || '(none)');
    var lastTs = parseInt(localStorage.getItem('prayerLastScheduleTs') || '0');
    console.log('[Athan DEBUG] Last schedule time  :', lastTs ? new Date(lastTs).toLocaleString() : '(never)');
    console.log('═══════════════════════════════════════════════════');
    return athan;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  window.PrayerNotifications = {
    ATHAN_VOICES: ATHAN_VOICES,
    cancelAllAthanNotifications: cancelAllAthanNotifications,
    scheduleAthanNotifications: scheduleAthanNotifications,
    scheduleAthanMultiDay: scheduleAthanMultiDay,
    scheduleTestNotification: scheduleTestNotification,
    ensureAllChannels: ensureAllChannels,
    getSelectedVoice: getSelectedVoice,
    debugPendingNotifications: debugPendingNotifications,
    cancelFiredAthanNotifications: cancelFiredAthanNotifications
  };

})();
