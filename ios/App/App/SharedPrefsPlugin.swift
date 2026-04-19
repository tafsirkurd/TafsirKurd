import Foundation
import Capacitor
import WidgetKit

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
            NSLog("[SharedPrefs] FAIL: missing key or value")
            call.reject("key and value are required")
            return
        }
        NSLog("[SharedPrefs] set called — key=%@ valueLen=%d suite=%@", key, value.count, suite)
        guard let ud = UserDefaults(suiteName: suite) else {
            NSLog("[SharedPrefs] CRITICAL: UserDefaults(suiteName:%@) returned nil — App Group missing from entitlements", suite)
            call.reject("App Group '\(suite)' not configured")
            return
        }
        ud.set(value, forKey: key)
        let synced = ud.synchronize()
        NSLog("[SharedPrefs] wrote key=%@ valueLen=%d synced=%d", key, value.count, synced ? 1 : 0)
        if key == "widgetPrayerData" {
            NSLog("[SharedPrefs] reloading prayer widget timelines")
            WidgetCenter.shared.reloadAllTimelines()
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")
            NSLog("[SharedPrefs] prayer reload done")
        } else if key == "widgetAyahData" {
            NSLog("[SharedPrefs] reloading ayah widget timelines")
            WidgetCenter.shared.reloadAllTimelines()
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdAyahWidget")
            NSLog("[SharedPrefs] ayah reload done")
        } else if key == "widgetGoalData" {
            NSLog("[SharedPrefs] reloading goal widget timelines")
            WidgetCenter.shared.reloadAllTimelines()
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdGoalWidget")
            NSLog("[SharedPrefs] goal reload done")
        } else if key == "widgetTranslations" {
            // BUG FIX: widgetTranslations previously fell into the else branch —
            // no reload was triggered so widgets never picked up admin text changes.
            NSLog("[SharedPrefs] widgetTranslations written — reloading all widget timelines")
            WidgetCenter.shared.reloadAllTimelines()
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdAyahWidget")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdGoalWidget")
            NSLog("[SharedPrefs] widgetTranslations reload done")
        } else if key == "widgetAccentColor" {
            NSLog("[SharedPrefs] accent color updated — reloading all widget timelines")
            WidgetCenter.shared.reloadAllTimelines()
            NSLog("[SharedPrefs] accent reload done")
        } else {
            NSLog("[SharedPrefs] key=%@ has no widget reload handler", key)
        }
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
