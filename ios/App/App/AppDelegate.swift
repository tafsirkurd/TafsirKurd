import UIKit
import Capacitor
import BackgroundTasks
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let kBGTaskID  = "com.tafsirkurd.app.prayerCacheRefresh"
    private let kAppGroup  = "group.com.tafsirkurd.app"
    private let kPrayerKey = "widgetPrayerData"

    // Fires once per prayer boundary while app is in foreground.
    // Invalidated on background, rescheduled on foreground.
    private var prayerBoundaryTimer: Timer?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: kBGTaskID, using: nil) { [weak self] task in
            self?.handlePrayerCacheRefresh(task: task as! BGAppRefreshTask)
        }
        let themeKey = "appTheme"
        let savedTheme: String =
            UserDefaults(suiteName: kAppGroup)?.string(forKey: themeKey)
            ?? UserDefaults.standard.string(forKey: "CapacitorStorage." + themeKey)
            ?? "dark"
        let themeColor: UIColor
        switch savedTheme {
        case "light":             themeColor = UIColor(red: 248/255, green: 248/255, blue: 248/255, alpha: 1)
        case "parchment", "noor": themeColor = UIColor(red: 243/255, green: 232/255, blue: 204/255, alpha: 1)
        case "sakina", "emerald": themeColor = UIColor(red:  12/255, green:  28/255, blue:  18/255, alpha: 1)
        default:                  themeColor = UIColor(red:   0,      green:   0,      blue:   0,     alpha: 1)
        }
        UIWindow.appearance().backgroundColor = themeColor
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Cancel prayer-boundary timer — JS timers are paused in background anyway.
        prayerBoundaryTimer?.invalidate()
        prayerBoundaryTimer = nil
        NSLog("[PrayerSync] app backgrounded — prayer boundary timer cancelled")
        schedulePrayerCacheRefresh()
    }

    private func schedulePrayerCacheRefresh() {
        // 3 h instead of 6 h: ensures at most one prayer window can be missed
        // between BGTask firings even during extended background periods.
        let request = BGAppRefreshTaskRequest(identifier: kBGTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 3 * 3600)
        do {
            try BGTaskScheduler.shared.submit(request)
            NSLog("[WidgetReload] BGTask scheduled (earliest: 3h)")
        } catch {
            NSLog("[WidgetReload] BGTask schedule failed: %@", error.localizedDescription)
        }
    }

    private func handlePrayerCacheRefresh(task: BGAppRefreshTask) {
        schedulePrayerCacheRefresh()
        NSLog("[WidgetReload] BGTask fired — reloading widget timelines")
        reloadAllPrayerWidgets(reason: "bgTask")
        task.setTaskCompleted(success: true)
    }

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        NSLog("[WidgetReload] app became active — reloading prayer widget timelines")
        reloadAllPrayerWidgets(reason: "appForeground")
        // Schedule a one-shot timer to fire at the next prayer boundary so the
        // widget timeline is reloaded immediately when the prayer changes.
        schedulePrayerBoundaryTimer()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        prayerBoundaryTimer?.invalidate()
        prayerBoundaryTimer = nil
        schedulePrayerCacheRefresh()
        NSLog("[WidgetReload] app terminating — final widget reload + BGTask reschedule")
        reloadAllPrayerWidgets(reason: "appTerminate")
    }

    // MARK: — Prayer boundary timer

    /// Reads the next prayer time from App Group and schedules a Timer to fire
    /// 1 second after it starts. When it fires, reloads all prayer widgets and
    /// reschedules for the prayer after that. Only runs while app is active.
    private func schedulePrayerBoundaryTimer() {
        prayerBoundaryTimer?.invalidate()
        prayerBoundaryTimer = nil

        guard let nextFireDate = nextPrayerDate() else {
            NSLog("[PrayerBoundary] no future prayer found in snapshot — skipping boundary timer")
            return
        }
        NSLog("[PrayerBoundary] timer scheduled for %@", nextFireDate.description)

        // Fire 1 second after the prayer starts so the timeline is current.
        let fireDate = nextFireDate.addingTimeInterval(1)
        prayerBoundaryTimer = Timer(fire: fireDate, interval: 0, repeats: false) { [weak self] _ in
            NSLog("[PrayerBoundary] timer fired — reloading widgets and rescheduling")
            self?.reloadAllPrayerWidgets(reason: "prayerBoundary")
            self?.schedulePrayerBoundaryTimer()
        }
        if let t = prayerBoundaryTimer {
            RunLoop.main.add(t, forMode: .common)
        }
    }

    /// Parses widgetPrayerData from App Group and returns the next upcoming prayer Date.
    private func nextPrayerDate() -> Date? {
        guard let ud   = UserDefaults(suiteName: kAppGroup),
              let json = ud.string(forKey: kPrayerKey),
              let data = json.data(using: .utf8),
              let obj  = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }

        let todayTimings    = obj["timings"]      as? [String: String] ?? [:]
        let tomorrowTimings = obj["tomorrow"]     as? [String: String] ?? [:]
        let todayStr        = obj["date"]         as? String ?? ""
        let tomorrowStr     = obj["tomorrowDate"] as? String ?? ""

        var baghdadCal = Calendar(identifier: .gregorian)
        baghdadCal.timeZone = TimeZone(identifier: "Asia/Baghdad") ?? .current

        let prayerOrder = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
        let now = Date()

        func prayerDate(_ hm: String, _ dateStr: String) -> Date? {
            let hmParts  = hm.split(separator: ":").compactMap { Int($0) }
            let dateParts = dateStr.split(separator: "-").compactMap { Int($0) }
            guard hmParts.count >= 2, dateParts.count == 3 else { return nil }
            var c = DateComponents()
            c.year = dateParts[0]; c.month = dateParts[1]; c.day = dateParts[2]
            c.hour = hmParts[0]; c.minute = hmParts[1]; c.second = 0
            c.timeZone = TimeZone(identifier: "Asia/Baghdad")
            return baghdadCal.date(from: c)
        }

        // Check today's prayers
        for name in prayerOrder {
            if let hm = todayTimings[name], let d = prayerDate(hm, todayStr), d > now {
                NSLog("[PrayerBoundary] next prayer: %@ at %@", name, d.description)
                return d
            }
        }
        // Fall back to tomorrow
        if !tomorrowStr.isEmpty {
            for name in prayerOrder {
                if let hm = tomorrowTimings[name], let d = prayerDate(hm, tomorrowStr), d > now {
                    NSLog("[PrayerBoundary] next prayer (tomorrow): %@ at %@", name, d.description)
                    return d
                }
            }
        }
        return nil
    }

    // MARK: — Centralised widget reload

    private func reloadAllPrayerWidgets(reason: String) {
        NSLog("[WidgetReload] reason=%@", reason)
        if let ud = UserDefaults(suiteName: kAppGroup) {
            let meta: [String: Any] = ["reason": reason, "ts": Date().timeIntervalSince1970 * 1000]
            if let raw = try? JSONSerialization.data(withJSONObject: meta),
               let str = String(data: raw, encoding: .utf8) {
                ud.set(str, forKey: "widgetLastReloadMeta")
                ud.synchronize()
            }
        }
        // Belt-and-suspenders: reload every known prayer widget kind explicitly,
        // then reloadAllTimelines() as a fallback for any stale cache WidgetKit holds.
        WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
        WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")
        WidgetCenter.shared.reloadAllTimelines()
    }

    // MARK: — Push notification forwarding

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
