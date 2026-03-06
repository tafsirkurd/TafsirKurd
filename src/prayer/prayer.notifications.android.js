/**
 * Prayer Athan Notifications (Android only via Capacitor LocalNotifications)
 *
 * Multi-day scheduling: up to 7 days × 5 prayers = 35 notification slots.
 * Notification IDs 100–134 — avoids collision with daily reminder (ID: 1).
 * Preview notification ID: 200 (one-shot, auto-cancelled on next preview).
 *
 * ID formula: 100 + (dayOffset * 5) + prayerIndex
 *   prayerIndex: Fajr=0, Dhuhr=1, Asr=2, Maghrib=3, Isha=4
 */
(function() {
  'use strict';

  var PRAYER_IDX = { Fajr: 0, Dhuhr: 1, Asr: 2, Maghrib: 3, Isha: 4 };
  var ID_BASE    = 100;
  var MAX_DAYS   = 7;

  /** Kurdish (Badini) prayer names for notification text */
  var PRAYER_KMR = {
    Fajr:    'بەیانی',
    Dhuhr:   'نیڤرو',
    Asr:     'ئێوارە',
    Maghrib: 'ئاوابوون',
    Isha:    'عیشا'
  };

  /** All available athan voices — id must match res/raw/athan_{id}.ogg */
  var ATHAN_VOICES = [
    { id: 'mishary', nameAr: 'مشاری راشد العفاسی',     previewUrl: '/audio/athan_mishary.ogg' },
    { id: 'ahmed',   nameAr: 'أحمد العمادي',            previewUrl: '/audio/athan_ahmed.ogg'   },
    { id: 'nasser',  nameAr: 'ناصر القطامي',            previewUrl: '/audio/athan_nasser.ogg'  },
    { id: 'majed',   nameAr: 'ماجد الحمضاني',           previewUrl: '/audio/athan_majed.ogg'   },
    { id: 'mokhtar', nameAr: 'مختار حاج سليمان',        previewUrl: '/audio/athan_mokhtar.ogg' }
  ];

  function getLN() {
    return (window.Capacitor &&
            window.Capacitor.Plugins &&
            window.Capacitor.Plugins.LocalNotifications) || null;
  }

  function getSelectedVoice() {
    var v = localStorage.getItem('prayerAthanVoice') || 'mishary';
    return ATHAN_VOICES.find(function(x) { return x.id === v; }) ? v : 'mishary';
  }

  /**
   * Create all 5 athan channels with correct sounds.
   * Uses a version key to force delete+recreate whenever sound config changes —
   * because Android never updates an existing channel's sound after creation.
   */
  var CHANNEL_VER = 'v4';
  async function ensureAllChannels() {
    var LN = getLN();
    if (!LN || !LN.createChannel) return;
    // If channels were already set up with this version, skip
    if (localStorage.getItem('athanChannelVer') === CHANNEL_VER) return;
    // Delete all old channel IDs (any previous version)
    var oldIds = ['athan', 'athan2',
      'athan_mishary','athan_ahmed','athan_nasser','athan_majed','athan_mokhtar'];
    for (var d = 0; d < oldIds.length; d++) {
      await LN.deleteChannel({ id: oldIds[d] }).catch(function() {});
    }
    // Recreate with correct sound
    for (var i = 0; i < ATHAN_VOICES.length; i++) {
      var v = ATHAN_VOICES[i];
      await LN.createChannel({
        id: 'athan_' + v.id,
        name: 'Athan — ' + v.nameAr,
        description: window.t ? window.t('prayer.channel_desc') : 'Prayer time athan alerts',
        importance: 5,
        vibration: true,
        lights: true,
        lightColor: '#000000',
        sound: 'athan_' + v.id
      }).catch(function() {});
    }
    localStorage.setItem('athanChannelVer', CHANNEL_VER);
  }

  /**
   * Cancel ALL pending athan notifications (IDs 100–134) and preview (200).
   */
  async function cancelAllAthanNotifications() {
    var LN = getLN();
    if (!LN) return;
    var ids = [{ id: 200 }];
    for (var i = 0; i < MAX_DAYS * 5; i++) {
      ids.push({ id: ID_BASE + i });
    }
    await LN.cancel({ notifications: ids }).catch(function() {});
  }

  /**
   * Schedule athan notifications for multiple days ahead.
   *
   * @param {Array}   daysData         — [{dateISO:'YYYY-MM-DD', timings:{Fajr,Dhuhr,...}}, ...]
   * @param {string}  city             — city name for notification body
   * @param {Object}  toggles          — {Fajr:true, Dhuhr:true, ...}
   * @param {boolean} permissionGranted — pass true if caller already requested permission
   * @param {string}  [voiceId]        — voice id; defaults to localStorage value
   */
  async function scheduleAthanMultiDay(daysData, city, toggles, permissionGranted, voiceId) {
    var LN = getLN();
    if (!LN) { console.log('[Athan] No LocalNotifications plugin'); return; }

    // Always verify permission — never trust caller's permissionGranted flag
    var perm = await LN.requestPermissions().catch(function() { return { display: 'denied' }; });
    console.log('[Athan] permission:', perm.display, '| days:', daysData.length, '| city:', city);
    if (perm.display !== 'granted') { console.log('[Athan] permission denied — aborting'); return { count: 0, denied: true }; }

    await cancelAllAthanNotifications();
    await ensureAllChannels();

    var voice     = voiceId || getSelectedVoice();
    var channelId = 'athan_' + voice;
    var soundFile = 'athan_' + voice;

    var now = new Date();
    var pl  = window.PrayerLogic;
    var notifications = [];

    for (var dayOffset = 0; dayOffset < daysData.length && dayOffset < MAX_DAYS; dayOffset++) {
      var dayData = daysData[dayOffset];
      var timings = dayData.timings;
      var dateISO = dayData.dateISO;
      if (!timings) continue;

      for (var i = 0; i < pl.NOTIF_PRAYERS.length; i++) {
        var name = pl.NOTIF_PRAYERS[i];
        if (!toggles[name]) continue;
        if (!timings[name]) continue;

        var at = pl.parseAsDate(timings[name], dateISO);
        if (at <= now) continue;

        var prayerName = PRAYER_KMR[name] || name;
        var title = window.t ? window.t('prayer.notif_title') : 'بانگ';
        var body  = window.t
          ? window.t('prayer.notif_body', { prayer: prayerName })
          : ('نوکە دەمێ بانگێ ' + prayerName + ' یە');

        notifications.push({
          id: ID_BASE + dayOffset * 5 + PRAYER_IDX[name],
          title: title,
          body: body,
          schedule: { at: at, allowWhileIdle: true },
          channelId: channelId,
          sound: soundFile,
          smallIcon: 'ic_notification'
        });
      }
    }

    var count = notifications.length;
    console.log('[Athan] scheduling', count, 'notifications, voice:', voiceId || getSelectedVoice());
    var schedErr = null;
    if (count > 0) {
      await LN.schedule({ notifications: notifications }).catch(function(e) {
        schedErr = e && e.message;
        console.error('[Athan] schedule error:', schedErr);
      });
    }
    if (daysData.length > 0) {
      localStorage.setItem('prayerLastScheduleDate', daysData[0].dateISO);
    }
    return { count: count, error: schedErr };
  }

  /** Backwards-compat wrapper: schedule a single day. */
  async function scheduleAthanNotifications(timings, city, toggles, dateISO, permissionGranted) {
    return scheduleAthanMultiDay(
      [{ dateISO: dateISO, timings: timings }],
      city, toggles, permissionGranted
    );
  }

  /**
   * Schedule a single test notification N seconds from now.
   * Uses the currently selected voice channel.
   * Returns {ok:true} on success or {ok:false, denied:true/error:msg} on failure.
   */
  async function scheduleTestNotification(delaySec) {
    var LN = getLN();
    if (!LN) return { ok: false, error: 'no plugin' };
    var perm = await LN.requestPermissions().catch(function() { return { display: 'denied' }; });
    if (perm.display !== 'granted') return { ok: false, denied: true };
    await ensureAllChannels();
    var voice     = getSelectedVoice();
    var channelId = 'athan_' + voice;
    var at = new Date(Date.now() + (delaySec || 10) * 1000);
    var err = null;
    await LN.cancel({ notifications: [{ id: 200 }] }).catch(function() {});
    await LN.schedule({ notifications: [{
      id: 200,
      title: window.t ? window.t('prayer.notif_title') : 'بانگ',
      body:  window.t ? window.t('prayer.test_notif_body') : 'تاقیکردنا بانگ — ئاگادارکرن چاکە دیکا!',
      schedule: { at: at, allowWhileIdle: true },
      channelId: channelId,
      sound: 'athan_' + voice,
      smallIcon: 'ic_notification'
    }] }).catch(function(e) { err = e && e.message; });
    return err ? { ok: false, error: err } : { ok: true };
  }

  window.PrayerNotifications = {
    ATHAN_VOICES: ATHAN_VOICES,
    cancelAllAthanNotifications: cancelAllAthanNotifications,
    scheduleAthanNotifications: scheduleAthanNotifications,
    scheduleAthanMultiDay: scheduleAthanMultiDay,
    scheduleTestNotification: scheduleTestNotification,
    ensureAllChannels: ensureAllChannels,
    getSelectedVoice: getSelectedVoice
  };

})();
