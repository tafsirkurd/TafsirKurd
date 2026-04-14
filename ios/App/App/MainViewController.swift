import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        // Override Capacitor's static backgroundColor with the user's saved theme.
        // Reads same sources as AppDelegate so they are always in sync.
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
        view.backgroundColor = themeColor
        webView?.backgroundColor = themeColor
        webView?.scrollView.backgroundColor = themeColor
        webView?.isOpaque = false
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(TafsirAppleSignIn())
        bridge?.registerPluginInstance(SharedPrefsPlugin())
    }
}
