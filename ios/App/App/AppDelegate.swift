import UIKit
import Capacitor
import BackgroundTasks
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let kBGTaskID = "com.tafsirkurd.app.prayerCacheRefresh"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Register background task for periodic widget cache refresh
        BGTaskScheduler.shared.register(forTaskWithIdentifier: kBGTaskID, using: nil) { [weak self] task in
            self?.handlePrayerCacheRefresh(task: task as! BGAppRefreshTask)
        }
        // Set window background to match the saved theme so the very first
        // native frame after the launch screen already has the right color.
        let themeKey = "appTheme"
        let savedTheme: String =
            UserDefaults(suiteName: "group.com.tafsirkurd.app")?.string(forKey: themeKey)
            ?? UserDefaults.standard.string(forKey: "CapacitorStorage." + themeKey)
            ?? "dark"
        let themeColor: UIColor
        switch savedTheme {
        case "light":  themeColor = UIColor(red: 250/255, green: 250/255, blue: 250/255, alpha: 1)
        case "sakina": themeColor = UIColor(red:  12/255, green:  28/255, blue:  18/255, alpha: 1)
        case "noor":   themeColor = UIColor(red: 244/255, green: 232/255, blue: 204/255, alpha: 1)
        default:       themeColor = UIColor(red:  10/255, green:  10/255, blue:  10/255, alpha: 1)
        }
        UIWindow.appearance().backgroundColor = themeColor
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {
        schedulePrayerCacheRefresh()
    }

    private func schedulePrayerCacheRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: kBGTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 6 * 3600)
        do {
            try BGTaskScheduler.shared.submit(request)
            NSLog("[WidgetRefresh] BGTask scheduled (earliest: 6h)")
        } catch {
            NSLog("[WidgetRefresh] BGTask schedule failed: %@", error.localizedDescription)
        }
    }

    private func handlePrayerCacheRefresh(task: BGAppRefreshTask) {
        schedulePrayerCacheRefresh()
        NSLog("[WidgetRefresh] BGTask fired — reloading widget timelines")
        reloadAllPrayerWidgets(reason: "bgTask")
        task.setTaskCompleted(success: true)
    }

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Reload prayer widget timelines on every foreground so the countdown
        // is immediately accurate after the app was backgrounded.
        NSLog("[WidgetRefresh] app became active — reloading prayer widget timelines")
        reloadAllPrayerWidgets(reason: "appForeground")

#if targetEnvironment(macCatalyst)
        let lastInteraction = UserDefaults.standard.double(forKey: "CapacitorStorage.macLastInteraction")
        let sinceInteraction = Date().timeIntervalSince1970 - lastInteraction
        if sinceInteraction > 5.0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                guard
                    let appClass = NSClassFromString("NSApplication") as? NSObject.Type,
                    let nsApp    = appClass.value(forKey: "sharedApplication") as? NSObject
                else { return }
                nsApp.perform(NSSelectorFromString("miniaturizeAll:"), with: nil)
            }
        }
#endif
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Final widget reload before the process exits so the widget picks up
        // any last-second data writes, and schedule the next BGTask window.
        schedulePrayerCacheRefresh()
        NSLog("[WidgetRefresh] app terminating — final widget reload + BGTask reschedule")
        reloadAllPrayerWidgets(reason: "appTerminate")
    }

    // MARK: — Centralised widget reload

    private func reloadAllPrayerWidgets(reason: String) {
        NSLog("[WidgetRefresh] reloadAllPrayerWidgets reason=%@", reason)
        // Write last-reload metadata to App Group so the JS side can observe it.
        if let ud = UserDefaults(suiteName: "group.com.tafsirkurd.app") {
            let meta: [String: Any] = [
                "reason": reason,
                "ts": Date().timeIntervalSince1970 * 1000
            ]
            if let raw  = try? JSONSerialization.data(withJSONObject: meta),
               let str  = String(data: raw, encoding: .utf8) {
                ud.set(str, forKey: "widgetLastReloadMeta")
                ud.synchronize()
            }
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
        WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")
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
