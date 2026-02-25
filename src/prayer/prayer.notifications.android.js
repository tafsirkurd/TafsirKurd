/**
 * Prayer Athan Notifications (Android only via Capacitor LocalNotifications)
 *
 * Notification IDs 100–104 — avoids collision with daily reminder (ID: 1).
 * Channel: 'athan' — separate from existing 'reminder' channel.
 *
 * requestPermissions() is idempotent (returns immediately if already granted),
 * so no race condition with the existing daily reminder scheduler.
 */
(function() {
  'use strict';

  var IDS = { Fajr: 100, Dhuhr: 101, Asr: 102, Maghrib: 103, Isha: 104 };

  function getLN() {
    return (window.Capacitor &&
            window.Capacitor.Plugins &&
            window.Capacitor.Plugins.LocalNotifications) || null;
  }

  /**
   * Ensure the 'athan' notification channel exists on Android 8+.
   * Safe to call multiple times — createChannel is idempotent.
   */
  async function ensureChannel() {
    var LN = getLN();
    if (!LN || !LN.createChannel) return;
    await LN.createChannel({
      id: 'athan',
      name: 'Athan',
      description: 'Prayer time athan alerts',
      importance: 5,
      vibration: true,
      lights: true,
      lightColor: '#000000'
    }).catch(function() {});
  }

  /**
   * Cancel all pending athan notifications (IDs 100–104).
   * Does NOT touch the daily reminder (ID: 1).
   */
  async function cancelAllAthanNotifications() {
    var LN = getLN();
    if (!LN) return;
    var ids = Object.values(IDS).map(function(id) { return { id: id }; });
    await LN.cancel({ notifications: ids }).catch(function() {});
  }

  /**
   * Schedule athan notifications for today's remaining prayers.
   *
   * @param {Object}  timings           — {Fajr:"05:23", Dhuhr:"12:30", ...}
   * @param {string}  city              — city name for notification body
   * @param {Object}  toggles           — {Fajr:true, Dhuhr:true, ...}
   * @param {string}  dateISO           — "YYYY-MM-DD" for today
   * @param {boolean} permissionGranted — pass true if caller already requested permission
   *                                      (avoids a redundant prompt racing the daily reminder)
   */
  async function scheduleAthanNotifications(timings, city, toggles, dateISO, permissionGranted) {
    var LN = getLN();
    if (!LN) return;

    await cancelAllAthanNotifications();
    await ensureChannel();

    // Request permission once from the UI when master toggle is enabled.
    // If called from initScheduleOnStart (auto-reschedule), permission is already granted.
    if (!permissionGranted) {
      var result = await LN.requestPermissions().catch(function() { return { display: 'denied' }; });
      if (result.display !== 'granted') return;
    }

    var now = new Date();
    var pl = window.PrayerLogic;
    var notifications = [];

    for (var i = 0; i < pl.NOTIF_PRAYERS.length; i++) {
      var name = pl.NOTIF_PRAYERS[i];
      if (!toggles[name]) continue;

      var at = pl.parseAsDate(timings[name], dateISO);
      if (at <= now) continue; // prayer already passed today

      // Use the app's existing t(key, replacements) interpolation system.
      // kmr.json: "prayer.notif_body": "کاتا ${prayer} گهیشتە ${city}"
      var title = window.t ? window.t('prayer.notif_title') : 'Prayer Time';
      var body  = window.t
        ? window.t('prayer.notif_body', { prayer: name, city: city })
        : ('It\'s time for ' + name + ' in ' + city);

      notifications.push({
        id: IDS[name],
        title: title,
        body: body,
        schedule: { at: at },
        channelId: 'athan',
        smallIcon: 'ic_notification'
      });
    }

    if (notifications.length > 0) {
      await LN.schedule({ notifications: notifications }).catch(console.error);
      localStorage.setItem('prayerLastScheduleDate', dateISO);
    }
  }

  window.PrayerNotifications = {
    cancelAllAthanNotifications: cancelAllAthanNotifications,
    scheduleAthanNotifications: scheduleAthanNotifications,
    IDS: IDS
  };

})();
