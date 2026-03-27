import Foundation
import Capacitor

/**
 SharedPrefsPlugin
 Writes key/value strings to an App Group UserDefaults suite so the
 TafsirKurdWidget extension can read prayer data without hitting the network.

 App Group ID: group.com.tafsirkurd.app
 (Must be enabled in Capabilities for BOTH the App target and Widget target.)
 */
@objc(SharedPrefsPlugin)
public class SharedPrefsPlugin: CAPPlugin {

    private let suite = "group.com.tafsirkurd.app"

    @objc func set(_ call: CAPPluginCall) {
        guard let key   = call.getString("key"),
              let value = call.getString("value") else {
            call.reject("key and value are required")
            return
        }
        guard let ud = UserDefaults(suiteName: suite) else {
            call.reject("App Group '\(suite)' not configured — add the capability in Xcode")
            return
        }
        ud.set(value, forKey: key)
        ud.synchronize()
        call.resolve()
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        let value = UserDefaults(suiteName: suite)?.string(forKey: key)
        call.resolve(["value": value as Any])
    }
}
