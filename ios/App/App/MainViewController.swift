import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(TafsirAppleSignIn())
        bridge?.registerPluginInstance(SharedPrefsPlugin())
    }
}
