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
        // Theme is written to App Group UserDefaults by _nativeSyncTheme() in app.js
        // (via _sharedPrefsSet). Fallback: Capacitor Preferences (UserDefaults.standard).
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
        default:       themeColor = UIColor(red:  10/255, green:  10/255, blue:  10/255, alpha: 1) // dark
        }
        // UIWindow.appearance() sets the background on ALL windows before they are
        // created — including Capacitor's UIWindow — so the very first native frame
        // after the launch screen already has the correct theme color.
        UIWindow.appearance().backgroundColor = themeColor
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Schedule a background refresh so the widget stays current even when the app is closed.
        schedulePrayerCacheRefresh()
    }

    private func schedulePrayerCacheRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: kBGTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 6 * 3600) // no sooner than 6 h
        do {
            try BGTaskScheduler.shared.submit(request)
            NSLog("[BGTask] scheduled prayer cache refresh (earliest: 6h)")
        } catch {
            NSLog("[BGTask] schedule failed: %@", error.localizedDescription)
        }
    }

    private func handlePrayerCacheRefresh(task: BGAppRefreshTask) {
        // Reschedule for the next cycle immediately so we never miss a window
        schedulePrayerCacheRefresh()
        NSLog("[BGTask] prayer cache refresh fired — triggering WidgetCenter reload")
        // Asking WidgetKit to reload causes the widget extension to call getTimeline,
        // which fetches fresh prayer data from the prayer-kurd API autonomously.
        WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
        WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")
        task.setTaskCompleted(success: true)
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
#if targetEnvironment(macCatalyst)
        // On macOS, athan notifications automatically bring the app window to the
        // foreground. If this activation was triggered by a notification (not the user
        // explicitly clicking the Dock icon), minimize all windows immediately so the
        // user's workflow is not interrupted.
        // We detect notification-triggered activation: if the window became key within
        // a very short time after a notification was scheduled to fire, it's athan.
        // Simple heuristic: if the last user interaction was > 5 s ago, minimize.
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
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    // Required for @capacitor/push-notifications — forwards APNs token to the plugin.
    // CAPApplicationDelegateProxy does NOT handle these callbacks, so they must be
    // posted manually via NotificationCenter.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }


}
