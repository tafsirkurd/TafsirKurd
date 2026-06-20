import UIKit
import Capacitor
import CapacitorHaptics
import WebKit

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler {

    private var themeOverlay: UIView?

    override func viewDidLoad() {
        super.viewDidLoad()

        let (bgColor, logoName) = themeAssets()

        view.backgroundColor = bgColor
        webView?.backgroundColor = bgColor
        webView?.scrollView.backgroundColor = bgColor
        webView?.isOpaque = false
        // Belt-and-suspenders: also paint the window itself so any gap between the
        // static LaunchScreen and our overlay shows the theme color, not black.
        view.window?.backgroundColor = bgColor

        // Full-screen overlay — constraint-based so it fills the view regardless of
        // when viewDidLoad fires relative to the first layout pass.
        let overlay = UIView()
        overlay.backgroundColor = bgColor
        overlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        let logoView = UIImageView(image: UIImage(named: logoName))
        logoView.contentMode = .scaleAspectFit
        logoView.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(logoView)

        // Width = 75% of screen, capped at 340pt — height follows the image aspect ratio
        let pctWidth = logoView.widthAnchor.constraint(equalTo: overlay.widthAnchor, multiplier: 0.75)
        pctWidth.priority = .defaultHigh
        NSLayoutConstraint.activate([
            logoView.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            logoView.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            pctWidth,
            logoView.widthAnchor.constraint(lessThanOrEqualToConstant: 340)
        ])

        themeOverlay = overlay

        // Failsafe: dismiss after 6s in case JS bridge never fires (e.g. old cached HTML)
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in
            self?.dismissOverlay(duration: 0.15)
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // view.window is guaranteed non-nil here — last chance to paint the window
        // before the first composited frame after LaunchScreen dismissal.
        let (bgColor, _) = themeAssets()
        view.window?.backgroundColor = bgColor
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(TafsirAppleSignIn())
        bridge?.registerPluginInstance(SharedPrefsPlugin())
        bridge?.registerPluginInstance(CompassPlugin())
        bridge?.registerPluginInstance(HapticsPlugin())

        // JS calls: window.webkit.messageHandlers.splashDismiss.postMessage(null)
        bridge?.webView?.configuration.userContentController.add(self, name: "splashDismiss")
    }

    // Invoked from app.js _doSplashTransition when the app is ready to show
    func userContentController(_ userContentController: WKUserContentController,
                                didReceive message: WKScriptMessage) {
        guard message.name == "splashDismiss" else { return }
        dismissOverlay()
    }

    private func dismissOverlay(duration: TimeInterval = 0.25) {
        guard let overlay = themeOverlay else { return }
        themeOverlay = nil
        UIView.animate(withDuration: duration, delay: 0, options: [.curveEaseIn], animations: {
            overlay.alpha = 0
        }) { _ in overlay.removeFromSuperview() }
    }

    // Returns (background color, asset catalog image name) for the saved theme
    private func themeAssets() -> (UIColor, String) {
        let key = "appTheme"
        let theme = UserDefaults(suiteName: "group.com.tafsirkurd.app")?.string(forKey: key)
            ?? UserDefaults.standard.string(forKey: "CapacitorStorage." + key)
            ?? "dark"
        switch theme {
        case "light":
            return (UIColor(red: 248/255, green: 248/255, blue: 248/255, alpha: 1), "SplashLight")
        case "parchment", "noor":
            return (UIColor(red: 243/255, green: 232/255, blue: 204/255, alpha: 1), "SplashParchment")
        case "sakina", "emerald":
            return (UIColor(red:  12/255, green:  28/255, blue:  18/255, alpha: 1), "SplashEmerald")
        default: // dark
            return (UIColor(red: 0, green: 0, blue: 0, alpha: 1), "SplashDark")
        }
    }
}
