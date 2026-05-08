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
            NSLog("[WidgetAppGroup] FAIL: missing key or value")
            call.reject("key and value are required")
            return
        }
        NSLog("[WidgetAppGroup] set key=%@ valueLen=%d", key, value.count)
        guard let ud = UserDefaults(suiteName: suite) else {
            NSLog("[WidgetAppGroup] CRITICAL: UserDefaults(suiteName:%@) returned nil — App Group missing from entitlements", suite)
            call.reject("App Group '\(suite)' not configured")
            return
        }

        ud.set(value, forKey: key)
        let synced = ud.synchronize()
        NSLog("[WidgetAppGroup] wrote key=%@ synced=%d", key, synced ? 1 : 0)

        // Write sync metadata so JS can observe the last successful App Group write.
        writeSyncMeta(ud: ud, key: key, valueLen: value.count)

        // Reload widget timelines based on which key was written.
        switch key {

        case "widgetPrayerData":
            // Log enriched snapshot fields if present (added in prayer.ui.js ≥ 20260523)
            if let d = value.data(using: .utf8),
               let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
                let city       = obj["city"]         as? String ?? "?"
                let date       = obj["date"]         as? String ?? "?"
                let nextName   = (obj["nextPrayer"]  as? [String: Any])?["name"] as? String ?? "?"
                let curPrayer  = obj["currentPrayer"] as? String ?? "?"
                let validUntil = obj["validUntil"]   as? Double ?? 0
                let vuStr      = validUntil > 0 ? Date(timeIntervalSince1970: validUntil/1000).description : "none"
                NSLog("[PrayerSync] snapshot city=%@ date=%@ currentPrayer=%@ nextPrayer=%@ validUntil=%@",
                      city, date, curPrayer, nextName, vuStr)
            }
            NSLog("[WidgetReload] reason=prayerData — reloading prayer widgets")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")

        case "widgetAyahData":
            NSLog("[WidgetRefresh] reason=ayahData — reloading ayah widget")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdAyahWidget")

        case "widgetGoalData":
            NSLog("[WidgetRefresh] reason=goalData — reloading goal widget")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdGoalWidget")

        case "widgetTranslations":
            NSLog("[WidgetRefresh] reason=translations — reloading all widgets")
            WidgetCenter.shared.reloadAllTimelines()

        case "widgetExtendedCache":
            NSLog("[WidgetRefresh] reason=extendedCache (%d bytes) — reloading prayer widgets", value.count)
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")

        case "widgetAccentColor":
            NSLog("[WidgetRefresh] reason=accentColor — reloading all widgets")
            WidgetCenter.shared.reloadAllTimelines()

        case "widgetRefreshNonce":
            // Admin-triggered force refresh: invalidate extended cache so widget
            // re-fetches fresh prayer data from the API on next getTimeline call.
            NSLog("[WidgetRefresh] reason=adminNonce — clearing extended cache + reloading all widgets")
            ud.removeObject(forKey: "widgetExtendedCache")
            ud.synchronize()
            WidgetCenter.shared.reloadAllTimelines()
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdWidgetV2")
            WidgetCenter.shared.reloadTimelines(ofKind: "TafsirKurdLockWidgetV2")

        default:
            NSLog("[WidgetAppGroup] key=%@ has no widget reload handler", key)
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

    // MARK: — Internal helpers

    /// Write a small metadata blob so the JS side can read the last sync timestamp
    /// and status without having to decode the full prayer payload.
    private func writeSyncMeta(ud: UserDefaults, key: String, valueLen: Int) {
        let meta: [String: Any] = [
            "ts":       Date().timeIntervalSince1970 * 1000,
            "key":      key,
            "valueLen": valueLen
        ]
        guard let raw = try? JSONSerialization.data(withJSONObject: meta),
              let str = String(data: raw, encoding: .utf8)
        else { return }
        ud.set(str, forKey: "widgetSyncMeta")
        ud.synchronize()
    }
}
