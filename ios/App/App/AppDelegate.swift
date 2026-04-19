import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
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
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
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
