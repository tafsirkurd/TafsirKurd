import WidgetKit
import SwiftUI
import os.log

private let wLog = Logger(subsystem: "com.tafsirkurd.app.TafsirKurdWidget", category: "data")

// MARK: — Constants

private let kAppGroup       = "group.com.tafsirkurd.app"
private let kDataKey        = "widgetPrayerData"
private let kDeepLink       = URL(string: "tafsirkurd://prayer")!
private let kExtCacheKey    = "widgetExtendedCache"
private let kExtCacheSchema = 1
private let kDiagnosticsKey = "widgetDiagnostics"
private let kNonceKey       = "widgetRefreshNonce"       // written by admin force-refresh
private let kNonceSeenKey   = "widgetRefreshNonceSeen"   // last nonce we acted on (App Group UserDefaults)
// Increment this whenever timeline logic changes. Stored in App Group on each build;
// if it differs from stored value, extended cache is discarded so new logic applies immediately.
// v6: add 6-hour policy cap to prevent stale-widget syndrome when iOS throttles boundary entries.
private let kTimelineVersion = 6
private let kTimelineVersionKey = "widgetTimelineVersion"
// All widget loops use kDisplayOrder (includes Sunrise). Adhan notifications use a separate
// JS-side list; kPrayerOrder no longer exists here to avoid accidental misuse.
private let kDisplayOrder  = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]

// After a prayer's scheduled second + kGracePastSeconds it is considered "past".
// 5 s prevents the widget from remaining on a just-passed prayer when WidgetKit
// activates the boundary entry a few seconds late.
private let kGracePastSeconds: TimeInterval = 5
// MARK: — Widget translations (read from App Group UserDefaults, set by main app)

/// Reads the `widgetTranslations` key written by `syncWidgetTranslations()` in app.js.
/// Falls back to built-in Kurdish strings if the key is absent.
///
/// BUG FIX: `_cache` was only loaded once per process (`if _cache == nil`).
/// WidgetKit often reuses the same extension process across timeline refreshes,
/// so stale translations persisted even after the app wrote new values and
/// triggered a reload.  Fix: `reload()` is now called at the top of every
/// `getTimeline()` / `getSnapshot()` invocation so each timeline generation
/// reads fresh UserDefaults data.
private enum WT {
    private static var _cache: [String: String]? = nil

    /// Force-read UserDefaults into _cache. Called at the start of every
    /// getTimeline() / getSnapshot() so reused widget processes pick up new values.
    static func reload() {
        _cache = nil
        load()
    }

    static func load() {
        guard let ud = UserDefaults(suiteName: kAppGroup) else {
            wLog.error("[WT] UserDefaults(suiteName:) returned nil — App Group missing?")
            _cache = [:]
            return
        }
        guard let json = ud.string(forKey: "widgetTranslations") else {
            wLog.warning("[WT] widgetTranslations key absent from App Group — using fallbacks")
            _cache = [:]
            return
        }
        guard let data = json.data(using: .utf8),
              let obj  = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let keys = obj["keys"] as? [String: String]
        else {
            wLog.error("[WT] failed to decode widgetTranslations JSON (len=\(json.count))")
            _cache = [:]
            return
        }
        _cache = keys
        wLog.info("[WT] loaded \(keys.count) translation keys from App Group")
        // Log one sample key so we can verify correct data is reaching the widget
        if let sample = keys.first {
            wLog.info("[WT] sample: \(sample.key) = \(sample.value)")
        }
    }

    /// Returns the translated string for `key`, using `fallback` if missing.
    static func t(_ key: String, _ fallback: String) -> String {
        if _cache == nil { load() }
        return _cache?[key] ?? fallback
    }
}

/// Convenience: Kurdish prayer name from WT, falls back to hardcoded value.
private func kn(_ name: String) -> String {
    switch name {
    case "Fajr":    return WT.t("widget.prayer.fajr",    "سپێدە")
    case "Sunrise": return WT.t("widget.prayer.sunrise", "ڕوژهەلات")
    case "Dhuhr":   return WT.t("widget.prayer.dhuhr",   "نیڤرۆ")
    case "Asr":     return WT.t("widget.prayer.asr",     "ئێڤار")
    case "Maghrib": return WT.t("widget.prayer.maghrib", "مەغرەب")
    case "Isha":    return WT.t("widget.prayer.isha",    "عەیشا")
    default:        return name
    }
}

// MARK: — Design system

private enum DS {
    static let bg1 = Color(red: 0.055, green: 0.065, blue: 0.055)
    static let bg2 = Color(red: 0.035, green: 0.042, blue: 0.035)
    static let t1  = Color.white
    static let t2  = Color(white: 1, opacity: 0.50)
    static let t3  = Color(white: 1, opacity: 0.28)
    static let sep = Color(white: 1, opacity: 0.07)

    // Accent follows the app theme — reads `widgetAccentColor` from App Group UserDefaults.
    // Written by _nativeSyncTheme() in app.js every time the user switches theme.
    // Falls back to the original bright green if the key is absent.
    private static func accentComponents() -> (Double, Double, Double) {
        guard let ud  = UserDefaults(suiteName: kAppGroup),
              let hex = ud.string(forKey: "widgetAccentColor"), hex.count >= 7
        else { return (0.14, 0.74, 0.41) }
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard h.count == 6, let val = UInt64(h, radix: 16) else { return (0.14, 0.74, 0.41) }
        return (
            Double((val >> 16) & 0xFF) / 255.0,
            Double((val >>  8) & 0xFF) / 255.0,
            Double( val        & 0xFF) / 255.0
        )
    }

    static var accent: Color {
        let (r, g, b) = accentComponents()
        return Color(red: r, green: g, blue: b)
    }
    static var accentDim: Color {
        let (r, g, b) = accentComponents()
        return Color(red: r, green: g, blue: b).opacity(0.07)
    }
    static var accentMid: Color {
        let (r, g, b) = accentComponents()
        return Color(red: r, green: g, blue: b).opacity(0.14)
    }
}

private var widgetGradient: LinearGradient {
    LinearGradient(colors: [DS.bg1, DS.bg2], startPoint: .top, endPoint: .bottom)
}

// MARK: — Data model (untouched)

struct PrayerWidgetData: Codable {
    let city:          String
    let date:          String            // today  YYYY-MM-DD (Baghdad)
    let hijri:         String
    let timings:       [String: String]  // today's prayer times
    let tomorrow:      [String: String]? // tomorrow's actual API times
    let tomorrowDate:  String?           // tomorrow YYYY-MM-DD
    let lastUpdated:   Double?           // Unix ms when JS last pushed
    // Enriched snapshot fields (written by JS prayer.ui.js ≥ 20260523)
    let generatedAt:   Double?           // Unix ms when snapshot was built
    let validUntil:    Double?           // Unix ms — Baghdad midnight tomorrow; snapshot is stale after this
    let currentPrayer: String?           // currently-active prayer name at push time
    let nextPrayer:    SnapshotNextPrayer? // upcoming prayer at push time

    struct SnapshotNextPrayer: Codable {
        let name:   String
        let timeMs: Double
    }

    // Staleness: expired validUntil takes priority (exact Baghdad day boundary),
    // falling back to the 48 h coarse check for snapshots without validUntil.
    var isStale: Bool {
        let nowMs = Date().timeIntervalSince1970 * 1000
        if let vu = validUntil { return nowMs > vu }          // precise: wrong Baghdad date
        guard let lu = lastUpdated else { return false }
        return (nowMs - lu) > 48 * 3600 * 1000                // coarse: 48 h fallback
    }

    var staleReason: String {
        let nowMs = Date().timeIntervalSince1970 * 1000
        if let vu = validUntil, nowMs > vu {
            let overH = (nowMs - vu) / 3_600_000
            return String(format: "validUntil exceeded by %.1fh", overH)
        }
        if let lu = lastUpdated, (nowMs - lu) > 48 * 3600 * 1000 {
            let ageH = (nowMs - lu) / 3_600_000
            return String(format: "lastUpdated %.1fh ago", ageH)
        }
        return "not stale"
    }

    // Baghdad calendar shared across all date math.
    static var baghdadCal: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Asia/Baghdad") ?? .current
        return c
    }()

    // YYYY-MM-DD string for Baghdad time + offset days from now.
    static func baghdadDateString(offset: Int = 0) -> String {
        let d = baghdadCal.date(byAdding: .day, value: offset, to: Date()) ?? Date()
        let c = baghdadCal.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    // Baghdad midnight for daysAhead days from now (for timeline policy).
    static func baghdadMidnight(daysAhead: Int) -> Date {
        let d = baghdadCal.date(byAdding: .day, value: daysAhead, to: Date()) ?? Date()
        let c = baghdadCal.dateComponents([.year, .month, .day], from: d)
        var m = DateComponents()
        m.year = c.year; m.month = c.month; m.day = c.day
        m.hour = 0; m.minute = 0; m.second = 0
        m.timeZone = TimeZone(identifier: "Asia/Baghdad")
        return baghdadCal.date(from: m) ?? Date().addingTimeInterval(Double(daysAhead) * 86400)
    }

    static func load() -> PrayerWidgetData? {
        guard let ud = UserDefaults(suiteName: kAppGroup) else {
            wLog.error("UserDefaults(suiteName:\(kAppGroup)) is NIL — App Group entitlement missing")
            return nil
        }
        guard let json = ud.string(forKey: kDataKey) else {
            wLog.warning("key '\(kDataKey)' not found in suite '\(kAppGroup)' — app not opened yet?")
            return nil
        }
        guard let raw = json.data(using: .utf8) else {
            wLog.error("failed to convert JSON string to Data")
            return nil
        }
        do {
            let decoded = try JSONDecoder().decode(PrayerWidgetData.self, from: raw)
            let ageH = decoded.lastUpdated.map { (Date().timeIntervalSince1970 * 1000 - $0) / 3_600_000 } ?? -1
            wLog.info("decode OK — city=\(decoded.city) date=\(decoded.date) hasTomorrow=\(decoded.tomorrow != nil) ageHours=\(String(format:"%.1f", ageH))")
            return decoded
        } catch {
            wLog.error("JSON decode failed: \(error.localizedDescription)")
            return nil
        }
    }

    // Convert a "HH:mm" timing string + a YYYY-MM-DD date string into a Date.
    private func dateFrom(timingRaw: String, dateStr: String) -> Date? {
        let hm    = String(timingRaw.split(separator: " ").first ?? Substring(timingRaw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return nil }
        let dp = dateStr.split(separator: "-").compactMap { Int($0) }
        guard dp.count == 3 else { return nil }
        var c = DateComponents()
        c.year = dp[0]; c.month = dp[1]; c.day = dp[2]
        c.hour = parts[0]; c.minute = parts[1]; c.second = 0
        c.timeZone = TimeZone(identifier: "Asia/Baghdad")
        return PrayerWidgetData.baghdadCal.date(from: c)
    }

    // Resolve which timings + date string to use for a given dayOffset.
    // dayOffset 0 → today's stored data.
    // dayOffset 1 → actual tomorrow data (if stored) or today's timings on tomorrow's date.
    // dayOffset 2+ → today's timings on date + N (approximation for day-after-tomorrow chain).
    func prayerDate(_ name: String, dayOffset: Int = 0) -> Date? {
        switch dayOffset {
        case 0:
            guard let raw = timings[name] else { return nil }
            return dateFrom(timingRaw: raw, dateStr: date)

        case 1:
            let tomTimings = tomorrow ?? timings
            guard let raw = tomTimings[name] else { return nil }
            // Use stored tomorrowDate if available; otherwise derive it from date.
            let tomDateStr: String
            if let td = tomorrowDate {
                tomDateStr = td
            } else {
                let dp = date.split(separator: "-").compactMap { Int($0) }
                guard dp.count == 3 else { return nil }
                var c = DateComponents()
                c.year = dp[0]; c.month = dp[1]; c.day = dp[2] + 1
                c.timeZone = TimeZone(identifier: "Asia/Baghdad")
                guard let d = PrayerWidgetData.baghdadCal.date(from: c) else { return nil }
                let comps = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: d)
                tomDateStr = String(format: "%04d-%02d-%02d", comps.year!, comps.month!, comps.day!)
            }
            return dateFrom(timingRaw: raw, dateStr: tomDateStr)

        default:
            // dayOffset >= 2: approximate with today's timings on date + offset
            guard let raw = timings[name] else { return nil }
            let dp = date.split(separator: "-").compactMap { Int($0) }
            guard dp.count == 3 else { return nil }
            var c = DateComponents()
            c.year = dp[0]; c.month = dp[1]; c.day = dp[2] + dayOffset
            c.timeZone = TimeZone(identifier: "Asia/Baghdad")
            guard let d = PrayerWidgetData.baghdadCal.date(from: c) else { return nil }
            let comps = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: d)
            let dateStr = String(format: "%04d-%02d-%02d", comps.year!, comps.month!, comps.day!)
            return dateFrom(timingRaw: raw, dateStr: dateStr)
        }
    }

    // Apply a stored timing to an arbitrary Baghdad date string (stale-recovery path).
    func prayerTimeOnDate(_ name: String, dateStr: String) -> Date? {
        guard let raw = timings[name] else { return nil }
        return dateFrom(timingRaw: raw, dateStr: dateStr)
    }

    func displayTime(_ name: String) -> String {
        guard let raw = timings[name] else { return "--:--" }
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return hm }
        let h12 = parts[0] % 12 == 0 ? 12 : parts[0] % 12
        return String(format: "%d:%02d", h12, parts[1])
    }

    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        // 1. Today's stored prayers — kDisplayOrder includes Sunrise so Fajr→Sunrise
        //    transition is explicit and never skips straight to Dhuhr.
        for n in kDisplayOrder {
            if let t = prayerDate(n), t > now {
                wLog.info("nextPrayer: today \(n) at \(t)")
                return (n, t, kn(n))
            }
        }
        // 2. Tomorrow's prayers (uses actual tomorrow data when available)
        for n in kDisplayOrder {
            if let t = prayerDate(n, dayOffset: 1), t > now {
                wLog.info("nextPrayer: tomorrow \(n) at \(t)")
                return (n, t, kn(n))
            }
        }
        // 3. Stale-recovery: stored times are for a past date but prayer times
        //    shift only ~1 min/day — apply them to today/tomorrow Baghdad date.
        wLog.warning("nextPrayer: stored data exhausted, stale-recovery with Baghdad wall clock")
        for offset in 0...1 {
            let targetDate = PrayerWidgetData.baghdadDateString(offset: offset)
            for n in kDisplayOrder {
                if let approx = prayerTimeOnDate(n, dateStr: targetDate), approx > now {
                    wLog.info("nextPrayer stale-recovery: \(n) on \(targetDate) at \(approx)")
                    return (n, approx, kn(n))
                }
            }
        }
        wLog.error("nextPrayer: complete failure — no future prayer found")
        return nil
    }
}

// MARK: — Extended cache (multi-day autonomous data)
// Written by pushExtendedPrayerCache() in prayer.ui.js.
// Schema: { v:1, city, gen (Unix ms), days: { "YYYY-MM-DD": [fajr,sunrise,dhuhr,asr,maghrib,isha] } }

struct WidgetExtendedCache: Codable {
    let v:    Int
    let city: String
    let gen:  Double            // Unix ms when JS wrote this cache
    let days: [String: [String]]

    private static let kIdx = ["Fajr": 0, "Sunrise": 1, "Dhuhr": 2, "Asr": 3, "Maghrib": 4, "Isha": 5]

    static func load() -> WidgetExtendedCache? {
        guard let ud   = UserDefaults(suiteName: kAppGroup),
              let json = ud.string(forKey: kExtCacheKey),
              let raw  = json.data(using: .utf8)
        else { return nil }
        do {
            let ext = try JSONDecoder().decode(WidgetExtendedCache.self, from: raw)
            guard ext.v == kExtCacheSchema else {
                wLog.warning("[Ext] schema mismatch v=\(ext.v) expected \(kExtCacheSchema)")
                return nil
            }
            wLog.info("[Ext] loaded city=\(ext.city) days=\(ext.days.count) ageH=\(String(format:"%.1f",ext.ageHours))")
            return ext
        } catch {
            wLog.error("[Ext] decode error: \(error.localizedDescription)")
            return nil
        }
    }

    func save() {
        guard let ud  = UserDefaults(suiteName: kAppGroup),
              let raw = try? JSONEncoder().encode(self),
              let str = String(data: raw, encoding: .utf8)
        else { return }
        ud.set(str, forKey: kExtCacheKey)
        ud.synchronize()
    }

    var ageHours: Double { (Date().timeIntervalSince1970 * 1000 - gen) / 3_600_000 }

    // Usable if today's Baghdad date exists in the cache.
    // No time-based expiry: prayer times for a given date are fixed and never change,
    // so a 90-day cache written weeks ago is still accurate for any day it covers.
    // City mismatch is checked separately in getTimeline.
    var isUsable: Bool {
        return days[PrayerWidgetData.baghdadDateString()] != nil
    }

    func timing(_ name: String, for dateStr: String) -> String? {
        guard let arr = days[dateStr],
              let idx = Self.kIdx[name],
              idx < arr.count
        else { return nil }
        let s = arr[idx]
        return s.isEmpty ? nil : s
    }

    func prayerDate(_ name: String, for dateStr: String) -> Date? {
        guard let raw = timing(name, for: dateStr) else { return nil }
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return nil }
        let dp    = dateStr.split(separator: "-").compactMap { Int($0) }
        guard dp.count == 3 else { return nil }
        var c = DateComponents()
        c.year = dp[0]; c.month = dp[1]; c.day = dp[2]
        c.hour = parts[0]; c.minute = parts[1]; c.second = 0
        c.timeZone = TimeZone(identifier: "Asia/Baghdad")
        return PrayerWidgetData.baghdadCal.date(from: c)
    }

    // Sorted date strings >= today with data in this cache
    func futureDays() -> [String] {
        let today = PrayerWidgetData.baghdadDateString()
        return days.keys.filter { $0 >= today }.sorted()
    }

    // Find next prayer from `now` scanning forward across all future days (up to 30).
    // Uses kDisplayOrder so Sunrise is included — Fajr never skips to Dhuhr.
    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        for dateStr in futureDays().prefix(30) {
            for name in kDisplayOrder {
                if let t = prayerDate(name, for: dateStr), t > now {
                    return (name, t, kn(name))
                }
            }
        }
        return nil
    }
}

// MARK: — Timeline entry

struct PrayerEntry: TimelineEntry {
    let date:   Date
    let data:   PrayerWidgetData?
    let next:   (name: String, time: Date, ku: String)?
    let reason: String

    init(date: Date, data: PrayerWidgetData?,
         next: (name: String, time: Date, ku: String)?,
         reason: String = "unknown") {
        self.date   = date
        self.data   = data
        self.next   = next
        self.reason = reason
    }
}

// MARK: — Unified display state
//
// Every widget family (Small/Medium/Large/Lock) resolves display state through this
// single path. No view independently decides current/next prayer — resolve() owns it.

struct WidgetPrayerState {
    let current:     (name: String, ku: String)?   // prayer in progress right now
    let next:        (name: String, time: Date, ku: String)?
    let next3:       [(name: String, ku: String, display: String)]
    let city:        String
    let date:        String
    let isStale:     Bool
    let entryReason: String

    static func resolve(
        _ data: PrayerWidgetData?,
        _ entry: PrayerEntry,
        now: Date = Date()
    ) -> WidgetPrayerState {
        guard let data = data else {
            return WidgetPrayerState(current: nil, next: nil, next3: [],
                                     city: "", date: "", isStale: false,
                                     entryReason: entry.reason)
        }
        let np = effectiveNextPrayer(data: data, now: now, tag: "resolve[\(entry.reason)]")
        let n3 = effectiveNext3(data: data, now: now)

        // Current = last prayer whose time has fully passed (> grace window)
        var cur: (name: String, ku: String)? = nil
        for name in kDisplayOrder {
            if let t = data.prayerDate(name), t <= now.addingTimeInterval(-kGracePastSeconds) {
                cur = (name, kn(name))
            }
        }

        return WidgetPrayerState(
            current:     cur,
            next:        np,
            next3:       n3,
            city:        data.city,
            date:        PrayerWidgetData.baghdadDateString(),
            isStale:     data.isStale,
            entryReason: entry.reason
        )
    }
}

// MARK: — Best-available data loader
//
// Never returns nil if ANY cached prayer data exists anywhere on device.
// Priority: fresh legacy App Group data → stale legacy → extended cache synthetic.
// Used by placeholder() and getSnapshot() so WidgetKit never caches a nil-data
// snapshot, which would cause the skeleton/redacted view to persist for minutes.
// Note: syntheticData() is defined later in this file — Swift forward-references OK.
private func loadBestAvailableData() -> PrayerWidgetData? {
    // 1. Legacy App Group data (fastest — single UserDefaults read)
    if let d = PrayerWidgetData.load() {
        wLog.info("[loadBestAvailable] using legacy data city=\(d.city) stale=\(d.isStale)")
        return d
    }
    // 2. Extended cache: synthesise a PrayerWidgetData for today from the multi-day cache.
    //    This handles the case where the legacy key was cleared but the 90-day cache is intact.
    if let ext = WidgetExtendedCache.load(), ext.isUsable {
        let todayStr = PrayerWidgetData.baghdadDateString()
        if let synth = syntheticData(from: ext, dateStr: todayStr) {
            wLog.info("[loadBestAvailable] legacy nil — using extended cache synthetic for \(todayStr) city=\(ext.city)")
            return synth
        }
    }
    wLog.warning("[loadBestAvailable] no prayer data found in any cache — app never opened?")
    return nil
}

// MARK: — Provider (PrayerProvider)

struct PrayerProvider: TimelineProvider {
    func placeholder(in _: Context) -> PrayerEntry {
        // Always use best-available data so WidgetKit redacts real prayer rows,
        // not a nil-data skeleton that looks blank forever.
        WT.reload()
        let d = loadBestAvailableData()
        return .init(date: .now, data: d, next: d?.nextPrayer(), reason: "placeholder")
    }
    func getSnapshot(in _: Context, completion: @escaping (PrayerEntry) -> Void) {
        WT.reload()
        wLog.info("getSnapshot called")
        // getSnapshot() result is cached by WidgetKit and shown while getTimeline() runs.
        // Returning nil data here means WidgetKit caches a skeleton screenshot that can
        // persist for the entire duration of the extended-cache network fetch (≤ 15 s).
        let d = loadBestAvailableData()
        completion(.init(date: .now, data: d, next: d?.nextPrayer(), reason: "snapshot"))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        WT.reload()
        let now        = Date()
        let buildStart = now
        let isLPM      = ProcessInfo.processInfo.isLowPowerModeEnabled
        let extBuild   = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        // Diagnostic requested: real device time at timeline build.
        print("REAL NOW (getTimeline):", now, "| lpm:", isLPM, "| build:", extBuild)
        wLog.info("[WidgetTimeline] getTimeline called at \(now) lpm=\(isLPM) extBuild=\(extBuild) timelineVersion=\(kTimelineVersion)")

        // Timeline version guard: if kTimelineVersion changed since last build, discard
        // extended cache so new boundary logic applies immediately without stale entries.
        if let ud = UserDefaults(suiteName: kAppGroup) {
            let stored = ud.integer(forKey: kTimelineVersionKey)
            if stored != kTimelineVersion {
                wLog.info("[WidgetTimeline] version \(stored) → \(kTimelineVersion) — discarding extended cache")
                ud.removeObject(forKey: kExtCacheKey)
                ud.set(kTimelineVersion, forKey: kTimelineVersionKey)
                ud.set(now.timeIntervalSince1970 * 1000, forKey: "widgetLastVersionBumpMs")
                ud.set(extBuild, forKey: "widgetLastVersionBumpBuild")
                ud.synchronize()
            }
        }

        // Check admin force-refresh nonce — if it changed, discard extended cache so we
        // re-fetch fresh prayer data from the API on this getTimeline call.
        if let ud = UserDefaults(suiteName: kAppGroup),
           let newNonce = ud.string(forKey: kNonceKey) {
            let seenNonce = ud.string(forKey: kNonceSeenKey) ?? ""
            if newNonce != seenNonce {
                wLog.info("[WidgetTimeline] admin nonce changed \(seenNonce) → \(newNonce) — discarding extended cache")
                // Only clear cache if nonce was written recently (< 24 h) to avoid
                // false-clears when the widget process restarts cold after days offline.
                let nonceTs   = ud.double(forKey: "widgetRefreshNonceTs")
                let nonceAgeS = Date().timeIntervalSince1970 - nonceTs
                if nonceTs == 0 || nonceAgeS < 86400 {
                    ud.removeObject(forKey: kExtCacheKey)
                }
                ud.set(newNonce, forKey: kNonceSeenKey)
                ud.synchronize()
            }
        }

        // Always read legacy data first — it is the source of truth for the current city.
        let legacyData = PrayerWidgetData.load()
        let currentCity = legacyData?.city ?? ""

        // [WidgetStale] detection: flag in App Group so JS health reporter surfaces it.
        if let legacy = legacyData, legacy.isStale {
            let reason = legacy.staleReason
            wLog.warning("[WidgetStale] detected — \(reason) city=\(legacy.city)")
            if let ud = UserDefaults(suiteName: kAppGroup) {
                ud.set("1", forKey: "widgetNeedsRefresh")
                ud.set(reason, forKey: "widgetStaleReason")
                ud.synchronize()
            }
        }

        // 1. Extended cache: multi-day autonomous path (90+ days, no app required)
        //    Reject if city doesn't match the current city (user changed city since last push).
        if let ext = WidgetExtendedCache.load(), ext.isUsable {
            if !currentCity.isEmpty && ext.city != currentCity {
                wLog.warning("[WidgetTimeline] extended cache city '\(ext.city)' ≠ current '\(currentCity)' — discard, fetch fresh")
            } else {
                wLog.info("[WidgetTimeline] extended cache hit city=\(ext.city) days=\(ext.days.count) ageH=\(String(format:"%.1f",ext.ageHours))")
                let (entries, policyAt) = buildExtendedTimeline(ext: ext, now: now, legacyData: legacyData)
                let nextName    = entries.first?.next?.name ?? "unknown"
                let buildMs     = (Date().timeIntervalSince1970 - buildStart.timeIntervalSince1970) * 1000
                let firstEntryTs = entries.first?.date.timeIntervalSince1970 ?? 0
                let lastEntryTs  = entries.last?.date.timeIntervalSince1970  ?? 0
                // zone1Entries = entries within first 48 h (Zone 1 density window)
                let zone1Entries = entries.filter { $0.date.timeIntervalSince(now) <= 48 * 3600 }.count
                // heartbeats = entries at 15-min intervals in zone 1
                let heartbeatCount = entries.filter { e in
                    let secs = e.date.timeIntervalSince(now)
                    return secs > 0 && secs <= 48 * 3600 &&
                           Int(secs) % (15 * 60) < 5   // within 5 s of a 15-min mark
                }.count
                // Verify sort order — log warning if any entry is out of order (regression guard)
                let isSorted = zip(entries, entries.dropFirst()).allSatisfy { $0.date <= $1.date }
                if !isSorted { wLog.error("[WidgetTimeline] SORT ORDER VIOLATION — entries not chronological!") }
                writeDiagnostics([
                    "ts":               Date().timeIntervalSince1970 * 1000,
                    "source":           "extended",
                    "city":             ext.city,
                    "extDays":          ext.days.count,
                    "extAgeH":          ext.ageHours,
                    "entries":          entries.count,
                    "zone1Entries":     zone1Entries,
                    "heartbeats":       heartbeatCount,
                    "firstEntryTs":     firstEntryTs,
                    "lastEntryTs":      lastEntryTs,
                    "sortedOK":         isSorted,
                    "policyAt":         policyAt.timeIntervalSince1970,
                    "policyAtISO":      ISO8601DateFormatter().string(from: policyAt),
                    "nextPrayer":       nextName,
                    "lpm":              isLPM,
                    "buildMs":          buildMs,
                    "firstEntryReason": entries.first?.reason ?? "?",
                    "isOldCache":       true
                ], legacyData: legacyData)
                wLog.info("[WidgetTimeline] \(entries.count) entries zone1=\(zone1Entries) heartbeats=\(heartbeatCount) nextPrayer=\(nextName) sorted=\(isSorted) policy=\(fmtHMS(policyAt))")
                completion(Timeline(entries: entries, policy: .after(policyAt)))
                return
            }
        }

        // 2. Extended cache missing, stale, or city-mismatched — fetch from prayer-kurd API
        guard !currentCity.isEmpty else {
            wLog.warning("[WidgetTimeline] no city known — retry 3 min")
            // Use any available data so the widget shows prayer times, not a blank/skeleton view.
            let fallback     = loadBestAvailableData()
            let fallbackNext = fallback.flatMap { effectiveNextPrayer(data: $0, now: now, tag: "no_city") }
            writeDiagnostics(["ts": Date().timeIntervalSince1970 * 1000, "source": "no_city", "status": "missingTimeline"])
            completion(Timeline(entries: [PrayerEntry(date: now, data: fallback, next: fallbackNext, reason: "no_city_retry")],
                                policy: .after(now.addingTimeInterval(3 * 60))))
            return
        }
        // In Low Power Mode: skip the network fetch to save battery.
        // Dense timeline entries + self-correcting views handle accuracy while offline.
        if isLPM {
            wLog.info("[WidgetTimeline] LPM active — skipping extended cache fetch, using legacy data")
            writeDiagnostics(["ts": Date().timeIntervalSince1970 * 1000, "source": "legacy_lpm",
                              "city": currentCity, "lpm": true], legacyData: legacyData)
            buildLegacyTimeline(data: legacyData, now: now, completion: completion)
            return
        }

        wLog.info("[WidgetTimeline] fetching extended cache for city=\(currentCity)")
        fetchExtendedPrayerCache(city: currentCity) { ext in
            if let ext = ext, ext.isUsable {
                let (entries, policyAt) = buildExtendedTimeline(ext: ext, now: now, legacyData: legacyData)
                let nextName = entries.first?.next?.name ?? "unknown"
                let buildMs  = (Date().timeIntervalSince1970 - buildStart.timeIntervalSince1970) * 1000
                writeDiagnostics([
                    "ts":               Date().timeIntervalSince1970 * 1000,
                    "source":           "extended_fetch",
                    "city":             ext.city,
                    "extDays":          ext.days.count,
                    "entries":          entries.count,
                    "policyAt":         policyAt.timeIntervalSince1970,
                    "policyAtISO":      ISO8601DateFormatter().string(from: policyAt),
                    "nextPrayer":       nextName,
                    "lpm":              isLPM,
                    "buildMs":          buildMs,
                    "firstEntryReason": entries.first?.reason ?? "?",
                    "isOldCache":       false
                ], legacyData: legacyData)
                wLog.info("[WidgetTimeline] fetched \(entries.count) entries nextPrayer=\(nextName) policy=\(fmtHMS(policyAt))")
                completion(Timeline(entries: entries, policy: .after(policyAt)))
            } else {
                // Network unavailable — fall back to two-day legacy data
                wLog.warning("[WidgetTimeline] fetch failed — falling back to legacy data")
                writeDiagnostics(["ts": Date().timeIntervalSince1970 * 1000, "source": "legacy_fallback",
                                  "city": currentCity, "status": "failed"], legacyData: legacyData)
                buildLegacyTimeline(data: legacyData, now: now, completion: completion)
            }
        }
    }
}

// MARK: — Extended timeline helpers

// Build a synthetic PrayerWidgetData from the extended cache for a specific date.
// This gives the widget views correct prayer times for each day as entries advance.
private func syntheticData(from ext: WidgetExtendedCache, dateStr: String) -> PrayerWidgetData? {
    guard let arr = ext.days[dateStr] else { return nil }
    let names = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
    var timing: [String: String] = [:]
    for (i, n) in names.enumerated() where i < arr.count { timing[n] = arr[i] }
    // Derive tomorrow's date string and fetch its timings from the extended cache
    // so prayerDate(dayOffset:1) uses real tomorrow data, not today's approximation.
    var tomTiming: [String: String]? = nil
    var tomDateStr: String? = nil
    let dp = dateStr.split(separator: "-").compactMap { Int($0) }
    if dp.count == 3 {
        var mc = DateComponents()
        mc.year = dp[0]; mc.month = dp[1]; mc.day = dp[2] + 1
        mc.timeZone = TimeZone(identifier: "Asia/Baghdad")
        if let d = PrayerWidgetData.baghdadCal.date(from: mc) {
            let comps = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: d)
            if let ty = comps.year, let tm = comps.month, let td = comps.day {
                let ts = String(format: "%04d-%02d-%02d", ty, tm, td)
                tomDateStr = ts
                if let tArr = ext.days[ts] {
                    var t: [String: String] = [:]
                    for (i, n) in names.enumerated() where i < tArr.count { t[n] = tArr[i] }
                    tomTiming = t
                }
            }
        }
    }
    return PrayerWidgetData(city: ext.city, date: dateStr, hijri: "",
                            timings: timing, tomorrow: tomTiming, tomorrowDate: tomDateStr,
                            lastUpdated: ext.gen,
                            generatedAt: nil, validUntil: nil,
                            currentPrayer: nil, nextPrayer: nil)
}

// Build a dense timeline from the extended cache.
//
// Entry budget design (target ≤ 360 entries to stay within WidgetKit's undocumented cap):
//
//   Zone 1 — 0–48 h  (≈ 290 entries)
//     • Prayer boundaries × 7 offsets [exact,+5s,+30s,+60s,+5m,+10m,+15m,+20m] → ~84 entries
//     • 15-min heartbeats                                                         → 192 entries
//     • Midnight anchors                                                          →   2 entries
//     Rationale: dense post-prayer entries (+5m/+10m/+15m/+20m) mean iOS throttling
//     must skip a 20-min window to stall the prayer-name transition. Heartbeats bound
//     any remaining drift to ≤ 15 min. Covers one full missed nightly rebuild.
//
//   Zone 2 — days 3–14  (≈ 114 entries)
//     • Prayer boundaries × 1 offset [exact, +5 s] for days 3–7   → 60 entries
//     • Prayer boundaries exact-only for days 8–14                 → 42 entries
//     • Midnight anchors                                            → 12 entries
//     Rationale: WidgetKit honors these at prayer times; nightly policyAt rebuild
//     normally resets to Zone 1 density before these are needed. No heartbeats here
//     keeps total entries low so Zone 2 boundaries aren't pushed past the cap.
//
//   Total (worst case): 1 + 290 + 114 = ~405 entries (sorted chronologically).
//   WidgetKit silently drops entries past its internal cap (≈360–400 on most iOS versions);
//   since entries are sorted chronologically, near-term Zone 1 entries are preserved and
//   far-future Zone 2 entries may be trimmed — this is acceptable: nightly rebuild resets.
//
// After sorting, near-term entries always occupy the first positions regardless of
// WidgetKit's exact cap. If cap = 200 → covers ~48 h. If cap ≥ 357 → full 14 d.
// The nightly policyAt rebuild resets Zone 1 density every night for continuous coverage.
private func buildExtendedTimeline(ext: WidgetExtendedCache, now: Date,
                                   legacyData: PrayerWidgetData?) -> ([PrayerEntry], Date) {
    var entries: [PrayerEntry] = []
    let futureDates = ext.futureDays()
    let todayStr  = PrayerWidgetData.baghdadDateString()
    let todayData = syntheticData(from: ext, dateStr: todayStr) ?? legacyData
    // If todayData is nil the extended cache has no entry for today.
    // Return a retry entry using the legacy data (even if stale) rather than data: nil —
    // a stale prayer list is always better than a blank/skeleton widget for 5 minutes.
    guard todayData != nil else {
        wLog.error("[WidgetTimeline] buildExtended: todayData nil for \(todayStr) — retry 5 min, using legacy fallback")
        let retry        = now.addingTimeInterval(5 * 60)
        let fallback     = legacyData
        let fallbackNext = fallback.flatMap { effectiveNextPrayer(data: $0, now: now, tag: "no_today") }
        return ([.init(date: now, data: fallback, next: fallbackNext, reason: "no_data_retry")], retry)
    }

    // Entry covering "right now" — establishes the initial display state
    let nowNext = ext.nextPrayer(from: now)
    entries.append(.init(date: now, data: todayData, next: nowNext, reason: "now"))

    // Zone cutoffs for tiered safety offsets
    let zone1End = now.addingTimeInterval(48 * 3600)     // 0–48 h: full offsets [+5 s, +60 s, +5 min]
    let zone2End = now.addingTimeInterval(7 * 24 * 3600) // 48 h–7 d: lean offset [+5 s only]
    // Beyond 7 d (zone 3): exact boundary time only

    // Prayer-boundary entries across the next 14 days + midnight anchors.
    var boundaryCount = 0
    for dateStr in futureDates.prefix(14) {
        let dayData = syntheticData(from: ext, dateStr: dateStr) ?? todayData

        for name in kDisplayOrder {
            guard let t = ext.prayerDate(name, for: dateStr), t > now else { continue }
            let next = ext.nextPrayer(from: t.addingTimeInterval(30))
            let isZone2 = t >= zone1End && t < zone2End
            entries.append(.init(date: t, data: dayData, next: next,
                                 reason: isZone2 ? "zone2_boundary_\(name.lowercased())" : "boundary_\(name.lowercased())"))
            boundaryCount += 1

            // Zone 1: dense post-prayer offsets so iOS throttling skips at most 20 min.
            // +10m/+15m/+20m overlap with heartbeats but give WidgetKit more activation
            // chances at the prayer transition (boundary entries vs heartbeats have
            // different internal priority queues on some iOS versions).
            let offsets: [TimeInterval] = t < zone1End ? [5.0, 30.0, 60.0, 300.0, 600.0, 900.0, 1200.0] :
                                          t < zone2End ? [5.0]                                             : []
            let offsetLabels: [TimeInterval: String] = [5.0: "plus5s", 30.0: "plus30s", 60.0: "plus60s", 300.0: "plus5m", 600.0: "plus10m", 900.0: "plus15m", 1200.0: "plus20m"]
            for off in offsets {
                let st = t.addingTimeInterval(off)
                guard st > now else { continue }
                let sNext = ext.nextPrayer(from: st.addingTimeInterval(30))
                let label = offsetLabels[off] ?? "plus\(Int(off))s"
                entries.append(.init(date: st, data: dayData, next: sNext,
                                     reason: "boundary_\(name.lowercased())_\(label)"))
            }
        }

        let dp = dateStr.split(separator: "-").compactMap { Int($0) }
        if dp.count == 3 {
            var mc = DateComponents()
            mc.year = dp[0]; mc.month = dp[1]; mc.day = dp[2]
            mc.hour = 0; mc.minute = 0; mc.second = 1
            mc.timeZone = TimeZone(identifier: "Asia/Baghdad")
            if let midnight = PrayerWidgetData.baghdadCal.date(from: mc), midnight > now {
                let nextAtMid = ext.nextPrayer(from: midnight)
                entries.append(.init(date: midnight, data: dayData, next: nextAtMid, reason: "midnight"))
            }
        }
    }

    // ── Zone 1 heartbeats: every 15 min for the next 48 hours ────────────────
    // Hard reliability guarantee for the near-term window: even if iOS completely
    // skips prayer-boundary entries (locked device, LPM, aggressive throttling),
    // a heartbeat fires within 15 min. effectiveNextPrayer() re-derives from the
    // real clock at render time, bounding staleness to ≤ 15 min.
    // Only Zone 1 gets heartbeats — no Zone 2/3 heartbeats. This keeps total entries
    // ≤ 357 so Zone 2 prayer boundaries stay within any reasonable WidgetKit cap.
    // For days 3–14, the nightly policyAt rebuild resets Zone 1 density; prayer
    // boundaries alone handle the rare "multiple missed rebuilds" failure path.
    var hTick = now.addingTimeInterval(15 * 60)
    let hEnd  = now.addingTimeInterval(48 * 3600)
    var heartbeatCount = 0
    while hTick <= hEnd {
        let hComps = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: hTick)
        if let hy = hComps.year, let hm = hComps.month, let hd = hComps.day {
            let hDateStr = String(format: "%04d-%02d-%02d", hy, hm, hd)
            let hData    = syntheticData(from: ext, dateStr: hDateStr) ?? todayData
            let hNext    = ext.nextPrayer(from: hTick)
            entries.append(.init(date: hTick, data: hData, next: hNext, reason: "heartbeat"))
            heartbeatCount += 1
        }
        hTick = hTick.addingTimeInterval(15 * 60)
    }
    wLog.info("[WidgetTimeline] boundaries=\(boundaryCount) heartbeats=\(heartbeatCount) total=\(entries.count)")

    // ── Refresh policy ─────────────────────────────────────────────────────────
    // Primary: Baghdad midnight tonight + 5 min (nightly rebuild for density).
    // Safety cap: now + 6 h — ensures getTimeline is called mid-day even when
    // iOS throttles ALL boundary and heartbeat entries (locked device, LPM, low
    // widget budget). Without the cap the policy can be 23+ hours away, so a
    // frozen 06:40 snapshot could persist all day. With the cap, worst-case
    // staleness is 6 hours regardless of iOS entry-activation behaviour.
    let midnightPolicy  = PrayerWidgetData.baghdadMidnight(daysAhead: 1).addingTimeInterval(5 * 60)
    let sixHourFallback = now.addingTimeInterval(6 * 3600)
    let policyAt        = min(midnightPolicy, sixHourFallback)
    wLog.info("[WidgetTimeline] policy=\(fmtHMS(policyAt)) midnightPolicy=\(fmtHMS(midnightPolicy)) sixHourFallback=\(fmtHMS(sixHourFallback))")
    return (entries.sorted { $0.date < $1.date }, policyAt)
}

// Legacy two-day path: used when extended cache is unavailable and network is offline.
// Mirrors the Phase 1 getTimeline logic: today + tomorrow, policy = Baghdad midnight+5min.
private func buildLegacyTimeline(data: PrayerWidgetData?, now: Date,
                                 completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    guard let data = data else {
        // Before returning a nil-data entry, try the extended cache.
        // nil-data entries blank the widget; stale-but-real data is always preferable.
        if let ext = WidgetExtendedCache.load(), ext.isUsable {
            let todayStr = PrayerWidgetData.baghdadDateString()
            if let synth = syntheticData(from: ext, dateStr: todayStr) {
                wLog.warning("buildLegacyTimeline: nil legacy — falling back to extended cache synthetic for \(todayStr)")
                buildLegacyTimeline(data: synth, now: now, completion: completion)
                return
            }
        }
        wLog.warning("buildLegacyTimeline: no data anywhere — retry 3 min")
        completion(Timeline(entries: [PrayerEntry(date: now, data: nil, next: nil, reason: "no_data_retry")],
                            policy: .after(now.addingTimeInterval(3 * 60))))
        return
    }
    let ageH = data.lastUpdated.map { (now.timeIntervalSince1970 * 1000 - $0) / 3_600_000 } ?? 0
    if data.isStale {
        // Show stale data rather than nil — blank widget is worse than slightly stale times.
        // effectiveNextPrayer() re-derives the highlighted prayer from wall-clock Date(),
        // so the correct prayer is highlighted even if the time strings are off by ~1 min.
        wLog.warning("buildLegacyTimeline: STALE ageH=\(String(format:"%.1f",ageH)) — showing stale data, retry 30 min")
        let staleNext = data.nextPrayer(from: now)
        completion(Timeline(entries: [PrayerEntry(date: now, data: data, next: staleNext, reason: "stale_legacy")],
                            policy: .after(now.addingTimeInterval(30 * 60))))
        return
    }
    var rawEntries: [(date: Date, next: (name: String, time: Date, ku: String)?, reason: String)] = []
    let nowNext = data.nextPrayer(from: now)
    wLog.info("[WidgetTimeline] buildLegacy city=\(data.city) nowNext=\(nowNext?.name ?? "nil") ageH=\(String(format:"%.1f",ageH))")
    rawEntries.append((now, nowNext, "now"))

    // Today's prayer boundaries — exact + T+5s + T+30s + T+60s for fast lock-screen switching
    let legacyBoundaryOffsets: [(TimeInterval, String)] = [(0, ""), (5, "plus5s"), (30, "plus30s"), (60, "plus60s")]
    for name in kDisplayOrder {
        guard let t = data.prayerDate(name), t > now else { continue }
        let next = data.nextPrayer(from: t.addingTimeInterval(30))
        wLog.info("[PrayerBoundary] legacy today \(name) -> next=\(next?.name ?? "nil")")
        for (offset, label) in legacyBoundaryOffsets {
            let et = t.addingTimeInterval(offset)
            guard et > now else { continue }
            let r = label.isEmpty ? "boundary_\(name.lowercased())" : "boundary_\(name.lowercased())_\(label)"
            rawEntries.append((et, next, r))
        }
    }
    // Tomorrow's prayer boundaries — exact + T+5s + T+30s + T+60s
    for i in 0 ..< kDisplayOrder.count {
        let name = kDisplayOrder[i]
        guard let t = data.prayerDate(name, dayOffset: 1) else { continue }
        var nextEntry: (name: String, time: Date, ku: String)? = nil
        for j in (i + 1) ..< kDisplayOrder.count {
            let nxt = kDisplayOrder[j]
            if let nt = data.prayerDate(nxt, dayOffset: 1) { nextEntry = (nxt, nt, kn(nxt)); break }
        }
        if nextEntry == nil, let fajr2 = data.prayerDate("Fajr", dayOffset: 2) {
            nextEntry = ("Fajr", fajr2, kn("Fajr"))
        }
        for (offset, label) in legacyBoundaryOffsets {
            let r = label.isEmpty ? "boundary_\(name.lowercased())" : "boundary_\(name.lowercased())_\(label)"
            rawEntries.append((t.addingTimeInterval(offset), nextEntry, r))
        }
    }

    // Baghdad midnight entry — anchors the day-boundary transition
    let midnightTomorrow = PrayerWidgetData.baghdadMidnight(daysAhead: 1).addingTimeInterval(1)
    if midnightTomorrow > now {
        let nextAtMid = data.nextPrayer(from: midnightTomorrow)
        wLog.info("[PrayerBoundary] legacy midnight -> next=\(nextAtMid?.name ?? "nil")")
        rawEntries.append((midnightTomorrow, nextAtMid, "midnight"))
    }

    // 15-minute safety entries between prayer boundaries (matches heartbeat interval).
    var safetyEntries: [(date: Date, next: (name: String, time: Date, ku: String)?, reason: String)] = []
    let sortedRaw = rawEntries.sorted { $0.date < $1.date }
    for i in 0 ..< (sortedRaw.count - 1) {
        let gapStart = sortedRaw[i].date
        let gapEnd   = sortedRaw[i + 1].date
        var tick = gapStart.addingTimeInterval(15 * 60)
        while tick < gapEnd {
            let n = data.nextPrayer(from: tick)
            safetyEntries.append((tick, n, "heartbeat"))
            tick = tick.addingTimeInterval(15 * 60)
        }
    }

    let allRaw = (rawEntries + safetyEntries).sorted { $0.date < $1.date }
    let entries = allRaw.map { PrayerEntry(date: $0.date, data: data, next: $0.next, reason: $0.reason) }

    let policyAt = min(PrayerWidgetData.baghdadMidnight(daysAhead: 1).addingTimeInterval(5 * 60),
                       now.addingTimeInterval(25 * 3600))
    wLog.info("[WidgetTimeline] buildLegacy \(entries.count) entries (incl safety) policyAt=\(policyAt)")
    completion(Timeline(entries: entries, policy: .after(policyAt)))
}

// Fetch 3 months of prayer data from the prayer-kurd CF function and persist as WidgetExtendedCache.
// Called by the widget itself when the App Group cache is missing or stale.
private func fetchExtendedPrayerCache(city: String, completion: @escaping (WidgetExtendedCache?) -> Void) {
    let cal  = PrayerWidgetData.baghdadCal
    let now  = Date()
    var allDays: [String: [String]] = [:]
    let group = DispatchGroup()
    let lock  = NSLock()

    // 15 s timeout per request — widget runtime budget is short and URLSession default (60 s) would
    // block completion longer than WidgetKit expects for a timeline generation call.
    let session: URLSession = {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest  = 15
        cfg.timeoutIntervalForResource = 15
        return URLSession(configuration: cfg)
    }()

    for monthOffset in 0...2 {
        guard let target = cal.date(byAdding: .month, value: monthOffset, to: now) else { continue }
        let comps = cal.dateComponents([.year, .month], from: target)
        guard let year = comps.year, let month = comps.month else { continue }

        group.enter()
        let enc    = city.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? city
        let urlStr = "https://tafsirkurd.com/prayer-kurd?city=\(enc)&year=\(year)&month=\(month)"
        guard let url = URL(string: urlStr) else { group.leave(); continue }

        session.dataTask(with: url) { data, _, error in
            defer { group.leave() }
            guard let data  = data, error == nil,
                  let json  = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let dayMap = json["days"] as? [String: Any]
            else {
                wLog.error("[Ext] fetch \(year)-\(month) failed: \(error?.localizedDescription ?? "nil")")
                return
            }
            lock.lock()
            for (dayKey, val) in dayMap {
                guard let dayNum = Int(dayKey), let d = val as? [String: String] else { continue }
                let dateStr = String(format: "%04d-%02d-%02d", year, month, dayNum)
                allDays[dateStr] = [
                    (d["Fajr"]    ?? "").components(separatedBy: " ").first ?? "",
                    (d["Sunrise"] ?? "").components(separatedBy: " ").first ?? "",
                    (d["Dhuhr"]   ?? "").components(separatedBy: " ").first ?? "",
                    (d["Asr"]     ?? "").components(separatedBy: " ").first ?? "",
                    (d["Maghrib"] ?? "").components(separatedBy: " ").first ?? "",
                    (d["Isha"]    ?? "").components(separatedBy: " ").first ?? ""
                ]
            }
            lock.unlock()
            wLog.info("[Ext] fetched \(dayMap.count) days for \(year)-\(month)")
        }.resume()
    }

    group.notify(queue: .global(qos: .utility)) {
        guard !allDays.isEmpty else {
            wLog.error("[Ext] all fetches returned empty for city=\(city)")
            completion(nil)
            return
        }
        let ext = WidgetExtendedCache(v: kExtCacheSchema, city: city,
                                      gen: Date().timeIntervalSince1970 * 1000, days: allDays)
        ext.save()
        wLog.info("[Ext] fetch+save complete: city=\(city) totalDays=\(allDays.count)")
        completion(ext)
    }
}

// Derives the currently-active prayer from a timings dict + Baghdad date string.
// "Active" = the latest prayer whose scheduled time has already passed.
// Used by writeDiagnostics to populate derivedCurrentPrayer independently of
// the snapshot's stored currentPrayer, so drift is detectable in the admin dashboard.
private func derivedActivePrayer(timings: [String: String], dateStr: String, at now: Date) -> String? {
    var best: (name: String, time: Date)? = nil
    let dp = dateStr.split(separator: "-").compactMap { Int($0) }
    guard dp.count == 3 else { return nil }
    for name in kDisplayOrder {
        guard let raw = timings[name] else { continue }
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { continue }
        var c = DateComponents()
        c.year = dp[0]; c.month = dp[1]; c.day = dp[2]
        c.hour = parts[0]; c.minute = parts[1]; c.second = 0
        c.timeZone = TimeZone(identifier: "Asia/Baghdad")
        guard let t = PrayerWidgetData.baghdadCal.date(from: c), t <= now else { continue }
        if best == nil || t > best!.time { best = (name, t) }
    }
    return best?.name
}

// Write widget diagnostics to App Group so the admin observability dashboard can read them.
// Also clears widgetNeedsRefresh when source is a successful extended timeline build.
private func writeDiagnostics(_ info: [String: Any], legacyData: PrayerWidgetData? = nil) {
    var merged = info
    let realNow   = Date()
    let realNowMs = realNow.timeIntervalSince1970 * 1000

    // ── Core fields ───────────────────────────────────────────────────────────
    merged["iosVer"]            = UIDevice.current.systemVersion
    merged["buildTime"]         = realNowMs
    merged["realNowMs"]         = realNowMs   // device clock truth for admin drift detection
    merged["timelineVersion"]   = kTimelineVersion
    merged["extBuildNumber"]    = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
    merged["lastReloadTimeMs"]  = realNowMs   // when getTimeline fired for this rebuild
    merged["lastReloadReason"]  = info["firstEntryReason"] as? String ?? (info["source"] as? String ?? "?")

    // ── Snapshot fields + prayer-drift detection ───────────────────────────────
    if let ld = legacyData {
        merged["stale"]          = ld.isStale
        merged["staleReason"]    = ld.staleReason
        merged["validUntil"]     = ld.validUntil  as Any
        merged["generatedAt"]    = ld.generatedAt as Any
        merged["snapshotCity"]   = ld.city
        merged["snapshotDate"]   = ld.date
        merged["snapshotCurrentPrayer"] = ld.currentPrayer as Any

        // Derive the prayer that SHOULD be active right now from the stored timings
        // and the real Baghdad wall-clock time — independent of the snapshot state.
        let todayBaghdad = PrayerWidgetData.baghdadDateString()
        if let derived = derivedActivePrayer(timings: ld.timings, dateStr: todayBaghdad, at: realNow) {
            merged["derivedCurrentPrayer"] = derived
            // Drift: snapshot says one prayer, clock says another
            if let snap = ld.currentPrayer, snap != derived {
                merged["prayerDrift"]        = "\(snap)→\(derived)"
                merged["staleSnapshotWarn"]  = true
                wLog.warning("[WidgetDiag] prayer drift detected: snapshot=\(snap) derived=\(derived)")
            }
        }
        // Snapshot age for staleness warnings
        if let gen = ld.generatedAt {
            let ageSeconds = Int((realNowMs - gen) / 1000)
            merged["snapshotAgeSeconds"] = ageSeconds
            if ageSeconds > 6 * 3600 { merged["snapshotOldWarn"] = ">\(ageSeconds / 3600)h" }
        }
    }

    // ── Last reload metadata ───────────────────────────────────────────────────
    if let ud2 = UserDefaults(suiteName: kAppGroup),
       let reloadMeta = ud2.string(forKey: "widgetLastReloadMeta") {
        merged["lastReloadMeta"] = reloadMeta
    }

    guard let ud  = UserDefaults(suiteName: kAppGroup),
          let raw = try? JSONSerialization.data(withJSONObject: merged),
          let str = String(data: raw, encoding: .utf8)
    else { return }
    ud.set(str, forKey: kDiagnosticsKey)
    if let src = info["source"] as? String,
       (src == "extended" || src == "extended_fetch") {
        ud.removeObject(forKey: "widgetNeedsRefresh")
        ud.removeObject(forKey: "widgetStaleReason")
    }
    ud.synchronize()
    wLog.info("[WidgetHealth] diagnostics written source=\(info["source"] as? String ?? "?") derivedPrayer=\(merged["derivedCurrentPrayer"] as? String ?? "?")")
}

// MARK: — Helpers

private func gregorianDisplay(_ dateISO: String) -> String {
    let parts = dateISO.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return dateISO }
    var c = DateComponents()
    c.year = parts[0]; c.month = parts[1]; c.day = parts[2]
    guard let d = Calendar(identifier: .gregorian).date(from: c) else { return dateISO }
    let f = DateFormatter()
    f.dateFormat = "d MMM yyyy"
    f.locale = Locale(identifier: "en_US")
    return f.string(from: d)
}

// MARK: — Live countdown (replaces static remaining() string)
//
// Uses Text(date, style: .timer) — a WidgetKit-native live text that the system
// updates every second without a new timeline entry.  The old `remaining()` helper
// computed timeIntervalSinceNow once at entry-activation time and froze that string
// until the next entry fired, producing the "shows 9 hours and never moves" bug.

private struct LiveCountdown: View {
    let to:       Date
    var fontSize: CGFloat = 9.5
    var body: some View {
        Group {
            if to.timeIntervalSinceNow <= 60 {
                Text(WT.t("widget.prayer.now", "ئێستا"))
            } else {
                Text(to, style: .timer)
                + Text(" " + WT.t("widget.prayer.time_left", "یێن ماین"))
            }
        }
        .font(.system(size: fontSize, weight: .light).monospacedDigit())
        .foregroundStyle(DS.t3)
    }
}

// MARK: — Reusable components

private struct CityLabel: View {
    let city: String
    var body: some View {
        HStack(spacing: 3) {
            Text(city)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(DS.t2)
            Circle()
                .fill(DS.accent)
                .frame(width: 4, height: 4)
        }
    }
}

/// Prayer row.
///
/// `compact: true` → 11 pt font, 2 pt vertical padding.
/// Used in the medium widget where 5 rows must fit the available height.
///
/// Height math (compact, iOS 17+ with ~11 pt system content margins):
///   row = 11 pt font (line height ~13 pt) + 2 × 1 pt vpad = 15 pt
///   6 rows × 15 pt = 90 pt — fits in any medium widget (SE budget: 119 pt)
private struct PRow: View {
    let name:    String
    let time:    String
    let isNext:  Bool
    var compact: Bool     = false
    var fontSize: CGFloat = 13

    var body: some View {
        let fs:   CGFloat = compact ? 11 : fontSize
        let vPad: CGFloat = compact ? 1  : (isNext ? 6 : 4)
        let hPad: CGFloat = compact ? 8  : 10

        HStack(spacing: 0) {
            Text(time)
                .font(.system(size: fs, weight: isNext ? .medium : .ultraLight).monospacedDigit())
                .foregroundStyle(isNext ? DS.accent : DS.t3)
                .frame(width: compact ? 38 : 44, alignment: .leading)
            Spacer()
            Text(kn(name))
                .font(.system(size: fs, weight: isNext ? .semibold : .light))
                .foregroundStyle(isNext ? DS.t1 : DS.t2)
        }
        .padding(.horizontal, hPad)
        .padding(.vertical, vPad)
        .lineSpacing(compact ? 1 : 0)
        .background(isNext ? DS.accentDim : Color.clear)
        .overlay(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .stroke(isNext ? DS.accentMid : Color.clear, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}

private struct NoDataView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "moon.stars")
                .font(.system(size: 24, weight: .ultraLight))
                .foregroundStyle(DS.t2)
            Text(WT.t("widget.prayer.empty_title", "کاتا نوێژ"))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(DS.t2)
            Text(WT.t("widget.prayer.empty_hint", "بکوژێنەوە بۆ بارکردن"))
                .font(.system(size: 9))
                .foregroundStyle(DS.t3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, .rightToLeft)
        // Prevent WidgetKit from replacing this with grey skeleton bars during the
        // placeholder phase. Without this, the moon icon and text become indistinguishable
        // grey bars that look like broken content rather than a deliberate empty state.
        .unredacted()
    }
}

// MARK: — Boundary-aware next prayer helpers
//
// effectiveNextPrayer: re-derives from Date() with a 5-second grace window.
// A prayer is "still next" while now < prayerTime + kGracePastSeconds, preventing
// the widget from flipping mid-second if WidgetKit activates a boundary entry early.
//
// correctedNext: wraps effectiveNextPrayer for home-screen widgets, logs drift.
//
// effectiveNext3: grace-aware version of next3() used by LockView.

private func fmtHMS(_ d: Date) -> String {
    let c = PrayerWidgetData.baghdadCal.dateComponents([.hour, .minute, .second], from: d)
    return String(format: "%02d:%02d:%02d", c.hour ?? 0, c.minute ?? 0, c.second ?? 0)
}

private func effectiveNextPrayer(
    data: PrayerWidgetData,
    now: Date,
    tag: String = ""
) -> (name: String, time: Date, ku: String)? {
    // A prayer is still "next" while now < t + grace (5-second window after it starts).
    func stillRelevant(_ t: Date) -> Bool { now < t.addingTimeInterval(kGracePastSeconds) }

    // ── Tier 1: real clock vs full display order (includes Sunrise) ──────────────
    // kDisplayOrder ensures Fajr→Sunrise transition is detected at render time:
    // after Fajr + 5s grace, Sunrise is returned (not Dhuhr). After Sunrise + 5s,
    // Dhuhr is returned. The snapshot's stored value is ALWAYS overridden here.
    for n in kDisplayOrder {
        if let t = data.prayerDate(n), stillRelevant(t) {
            let passed = now >= t
            wLog.info("[WidgetBoundary] \(tag) now=\(fmtHMS(now)) prayer=\(n) time=\(fmtHMS(t)) passed=\(passed)")
            return (n, t, kn(n))
        }
    }
    for n in kDisplayOrder {
        if let t = data.prayerDate(n, dayOffset: 1), stillRelevant(t) {
            return (n, t, kn(n))
        }
    }

    // ── Tier 2: Baghdad wall-clock recovery ───────────────────────────────────
    // The snapshot's `date` may be yesterday or older (stale data, timezone shift,
    // or midnight rollover without a fresh push). Apply the stored prayer times to
    // the REAL Baghdad date so the widget never shows yesterday's Asr at 10 PM.
    wLog.warning("[WidgetBoundary] \(tag) stored dates exhausted — applying timings to Baghdad wall-clock date")
    for offset in 0...1 {
        let targetDate = PrayerWidgetData.baghdadDateString(offset: offset)
        for n in kDisplayOrder {
            if let approx = data.prayerTimeOnDate(n, dateStr: targetDate), stillRelevant(approx) {
                wLog.warning("[WidgetBoundary] wall-clock recovery: \(n) on \(targetDate) now=\(fmtHMS(now))")
                return (n, approx, kn(n))
            }
        }
    }

    wLog.error("[WidgetBoundary] effectiveNextPrayer: no prayer found tag=\(tag) now=\(fmtHMS(now))")
    return nil
}

private func effectiveNext3(
    data: PrayerWidgetData,
    now: Date
) -> [(name: String, ku: String, display: String)] {
    func stillRelevant(_ t: Date) -> Bool { now < t.addingTimeInterval(kGracePastSeconds) }

    func formatHM(_ raw: String) -> String {
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return hm }
        let h12 = parts[0] % 12 == 0 ? 12 : parts[0] % 12
        return String(format: "%d:%02d", h12, parts[1])
    }

    var result: [(name: String, ku: String, display: String)] = []

    // ── Tier 1: stored data for snapshot's date and tomorrow ──────────────────
    outer: for offset in 0...1 {
        for name in kDisplayOrder {
            guard result.count < 3 else { break outer }
            guard let t = data.prayerDate(name, dayOffset: offset), stillRelevant(t) else { continue }
            let src = offset == 0 ? data.timings : (data.tomorrow ?? data.timings)
            guard let raw = src[name] else { continue }
            result.append((name: name, ku: kn(name), display: formatHM(raw)))
        }
    }

    // ── Tier 2: Baghdad wall-clock recovery (handles stale snapshots) ─────────
    // If the stored date is yesterday (stale push), tier 1 finds nothing — all
    // stored times are past. Apply timings to the real Baghdad date so the lock
    // screen never shows yesterday's Asr at 10 PM.
    if result.isEmpty {
        wLog.warning("[effectiveNext3] tier-1 empty — wall-clock recovery now=\(fmtHMS(now))")
        outer2: for offset in 0...1 {
            let targetDate = PrayerWidgetData.baghdadDateString(offset: offset)
            for name in kDisplayOrder {
                guard result.count < 3 else { break outer2 }
                guard let approx = data.prayerTimeOnDate(name, dateStr: targetDate),
                      stillRelevant(approx) else { continue }
                guard let raw = data.timings[name] else { continue }
                result.append((name: name, ku: kn(name), display: formatHM(raw)))
            }
        }
    }

    return result
}

private func correctedNext(
    data: PrayerWidgetData,
    stored: (name: String, time: Date, ku: String)?,
    tag: String
) -> (name: String, time: Date, ku: String)? {
    let rederived = effectiveNextPrayer(data: data, now: Date(), tag: tag)
    if let rd = rederived, let st = stored, rd.name != st.name {
        wLog.warning("[WidgetDrift] \(tag): stale=\(st.name) corrected=\(rd.name)")
    }
    return rederived ?? stored
}

// MARK: — Small widget

private struct SmallView: View {
    let entry: PrayerEntry
    var body: some View {
        let now      = Date()
        let state    = WidgetPrayerState.resolve(entry.data, entry, now: now)
        let n        = state.next
        let showName = n?.ku   ?? kn("Fajr")
        let showKey  = n?.name ?? "Fajr"
        let driftS   = Int(now.timeIntervalSince(entry.date))
        // Diagnostic: REAL NOW vs ENTRY DATE — if drift is large (> 30 min) WidgetKit
        // is holding a stale cached snapshot and not activating boundary/heartbeat entries.
        print("REAL NOW:", now, "| ENTRY DATE:", entry.date, "| drift:", driftS, "s | rn:", n?.name ?? "nil")
        let _ = wLog.info("[WidgetRender] small REAL_NOW=\(fmtHMS(now)) ENTRY_DATE=\(fmtHMS(entry.date)) drift=\(driftS)s reason=\(entry.reason) next=\(n?.name ?? "nil") cur=\(state.current?.name ?? "nil") date=\(entry.data?.date ?? "nil") STALE=\(abs(driftS) > 1800)")
        if let d = entry.data {
            VStack(alignment: .trailing, spacing: 0) {
                CityLabel(city: d.city)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Spacer()
                Text(showName)
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(DS.t1)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Text(d.displayTime(showKey))
                    .font(.system(size: 22, weight: .ultraLight).monospacedDigit())
                    .foregroundStyle(DS.accent)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                if let n = n {
                    LiveCountdown(to: n.time)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .padding(.top, 2)
                }
                Spacer()
            }
            .padding(12)
            .overlay(alignment: .bottomLeading) {
                if kWidgetDebug {
                    WidgetDebugOverlay(entry: entry, famStr: "sm", rnName: n?.name ?? "nil", now: now)
                        .padding(4)
                }
            }
        } else {
            NoDataView()
        }
    }
}

// MARK: — Medium widget
//
// Layout budget (iOS 17+, with system content margins ~11 pt each side):
//   own padding:   top 4 + bottom 4   = 8 pt
//   header:        ~16 pt + 3 pt gap  = 19 pt
//   5 rows:        5 × 17 pt          = 85 pt   (compact: 11 pt font, 2 pt vpad)
//   row spacing:   0
//   total content: 8 + 19 + 85        = 112 pt
//
//   available (iPhone SE, 141 pt medium − 22 pt sys margins): 119 pt
//   headroom: 119 − 112 = 7 pt ✓
//
//   available (iPhone 16 Pro, 169 pt − 22 pt):                147 pt
//   headroom: 147 − 112 = 35 pt ✓

private struct MediumView: View {
    let entry: PrayerEntry
    var body: some View {
        let now   = Date()
        let state = WidgetPrayerState.resolve(entry.data, entry, now: now)
        let driftS = Int(now.timeIntervalSince(entry.date))
        // Diagnostic: REAL NOW vs ENTRY DATE — large drift means WidgetKit snapshot is frozen.
        print("REAL NOW:", now, "| ENTRY DATE:", entry.date, "| drift:", driftS, "s | rn:", state.next?.name ?? "nil")
        let _ = wLog.info("[WidgetRender] medium REAL_NOW=\(fmtHMS(now)) ENTRY_DATE=\(fmtHMS(entry.date)) drift=\(driftS)s reason=\(entry.reason) next=\(state.next?.name ?? "nil") STALE=\(abs(driftS) > 1800)")
        if let d = entry.data {
            let n = state.next
            VStack(spacing: 0) {
                HStack(alignment: .center, spacing: 0) {
                    if let n = n {
                        LiveCountdown(to: n.time)
                    }
                    Spacer(minLength: 6)
                    CityLabel(city: d.city)
                }
                .padding(.bottom, 3)
                VStack(spacing: 0) {
                    ForEach(kDisplayOrder, id: \.self) { name in
                        PRow(name: name,
                             time: d.displayTime(name),
                             isNext: name == n?.name,
                             compact: true)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .overlay(alignment: .bottomLeading) {
                if kWidgetDebug {
                    WidgetDebugOverlay(entry: entry, famStr: "md", rnName: n?.name ?? "nil", now: now)
                        .padding(4)
                }
            }
        } else {
            NoDataView()
        }
    }
}

// MARK: — Large widget

private struct LargeView: View {
    let entry: PrayerEntry
    var body: some View {
        let now   = Date()
        let state = WidgetPrayerState.resolve(entry.data, entry, now: now)
        if let d = entry.data {
            let n          = state.next
            let bottomName = n?.name ?? "Fajr"
            let bottomKu   = n?.ku   ?? kn("Fajr")
            VStack(spacing: 0) {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 3) {
                        if let n = n {
                            LiveCountdown(to: n.time)
                        }
                        Text(gregorianDisplay(PrayerWidgetData.baghdadDateString()))
                            .font(.system(size: 10))
                            .foregroundStyle(DS.t3)
                    }
                    Spacer()
                    Text(d.city)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(DS.t1)
                }
                .padding(.bottom, 14)

                DS.sep.frame(height: 1)
                    .padding(.bottom, 10)

                VStack(spacing: 3) {
                    ForEach(kDisplayOrder, id: \.self) { name in
                        PRow(name: name,
                             time: d.displayTime(name),
                             isNext: name == n?.name,
                             fontSize: 15)
                    }
                }

                Spacer(minLength: 0)

                DS.sep.frame(height: 1)
                    .padding(.vertical, 14)

                HStack(alignment: .center) {
                    Text(d.displayTime(bottomName))
                        .font(.system(size: 40, weight: .thin).monospacedDigit())
                        .foregroundStyle(DS.accent.opacity(0.82))
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(bottomKu)
                            .font(.system(size: 26, weight: .bold))
                            .foregroundStyle(DS.t1)
                        if let n = n {
                            LiveCountdown(to: n.time, fontSize: 10)
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
            .padding(14)
            .overlay(alignment: .bottomLeading) {
                if kWidgetDebug {
                    WidgetDebugOverlay(entry: entry, famStr: "lg", rnName: n?.name ?? "nil", now: now)
                        .padding(4)
                }
            }
        } else {
            NoDataView()
        }
    }
}

// MARK: — Lock screen widget  (accessoryRectangular — next 3 upcoming prayers)
//
// ┌─ DISPLAY GUARANTEE ──────────────────────────────────────────────────────┐
// │  ALL rows come exclusively from WidgetPrayerState.resolve(now: Date()).   │
// │  entry.next (snapshot pre-computed at timeline-build time) is NEVER       │
// │  used for any display element. This means: even if WidgetKit activates   │
// │  the [boundary_asr] entry late (e.g. at 17:38), the rendered snapshot    │
// │  will show Maghrib highlighted — not Asr — because effectiveNext3()      │
// │  re-derives from real Date() at the moment WidgetKit calls body.         │
// │  12-hour format: prayer times are formatted via formatHM() inside        │
// │  effectiveNext3() using h12 = parts[0] % 12 == 0 ? 12 : parts[0] % 12. │
// └──────────────────────────────────────────────────────────────────────────┘
//
// Layout (3 rows, 1 prayer each, RTL: Kurdish name RIGHT, time LEFT):
//   Row 0 — next prayer: 14pt semibold, .primary foreground
//   Row 1 — 2nd upcoming: 12pt medium,  .secondary foreground
//   Row 2 — 3rd upcoming: 12pt medium,  .secondary foreground
//
// Height estimate (spacing 6, line heights ≈ 17 / 15 / 15):
//   3 rows × avg 16pt = 47pt
//   2 gaps × 6pt      = 12pt
//   total              ≈ 59pt  ✓ fits all devices (standard ≥ 73pt available)

private struct LockRow: View {
    let name: String
    let time: String
    let isNext: Bool
    var body: some View {
        HStack(spacing: 4) {
            Text(name)
                .font(.system(size: isNext ? 14 : 12, weight: isNext ? .semibold : .medium))
                .foregroundStyle(isNext ? AnyShapeStyle(.primary) : AnyShapeStyle(.secondary))
                .lineLimit(1)
            Spacer(minLength: 4)
            Text(time)
                .font(.system(size: isNext ? 14 : 12, weight: isNext ? .semibold : .regular).monospacedDigit())
                .foregroundStyle(isNext ? AnyShapeStyle(.primary) : AnyShapeStyle(.secondary))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

// Debug overlay: visible in DEBUG builds and TestFlight (sandboxReceipt), never in App Store.
// No manual flag to flip before release — production builds are silent automatically.
// After the stale-next-prayer diagnosis is complete, remove the sandboxReceipt branch so
// the overlay disappears from TestFlight too (leave only the #if DEBUG guard).
private let kWidgetDebug: Bool = {
    #if DEBUG
    return true
    #else
    // TestFlight and simulator use "sandboxReceipt"; App Store uses "receipt".
    return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
    #endif
}()

private struct WidgetDebugOverlay: View {
    let entry:  PrayerEntry
    let famStr: String
    let rnName: String  // resolved next prayer name (computed by caller)
    let now:    Date    // same Date() captured by the parent body — not a second call

    var body: some View {
        let build  = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        let sn     = entry.next?.name ?? "nil"
        let eHMS   = fmtHMS(entry.date)
        let nHMS   = fmtHMS(now)
        let reason = String(entry.reason.prefix(10))
        VStack(alignment: .leading, spacing: 0) {
            Text("tv:\(kTimelineVersion) b:\(build) f:\(famStr) [\(reason)]")
                .font(.system(size: 5).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text("e:\(eHMS) n:\(nHMS) sn:\(sn) rn:\(rnName)")
                .font(.system(size: 5).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        }
        .foregroundStyle(Color.white.opacity(0.18))
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct LockView: View {
    let entry: PrayerEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        // ── Step 1: resolve display state from real wall-clock time ───────────
        // now = Date() is evaluated at the moment WidgetKit renders this entry.
        // All prayer rows come from state.next3 — effectiveNext3(data:now:).
        // entry.next is NEVER read for display; it is only used in drift logging.
        let now   = Date()
        let state = WidgetPrayerState.resolve(entry.data, entry, now: now)

        // ── Step 2: resolved prayer list (source of ALL display elements) ─────
        // next3[0] = highlighted row  (next upcoming prayer per real clock)
        // next3[1] = secondary row
        // next3[2] = tertiary row
        // name/ku/display all come from effectiveNext3; display is 12h format.
        let resolvedPrayers = state.next3

        // ── Logging (uses entry.next for drift detection — NOT for display) ───
        let driftS = Int(now.timeIntervalSince(entry.date))
        let rnName = resolvedPrayers.first?.name ?? "nil"
        let curName = state.current?.name ?? "nil"
        let _ = wLog.info("[WidgetRender] lock now=\(fmtHMS(now)) entry=\(fmtHMS(entry.date)) drift=\(driftS)s reason=\(entry.reason) next=\(rnName) cur=\(curName) date=\(entry.data?.date ?? "nil")")
        if let snapshotNext = entry.next, let resolvedFirst = resolvedPrayers.first {
            if snapshotNext.name != resolvedFirst.name {
                let _ = wLog.warning("[WidgetDrift] lock: sn=\(snapshotNext.name) rn=\(resolvedFirst.name) now=\(fmtHMS(now)) e=\(fmtHMS(entry.date)) drift=\(driftS)s")
            }
        }

        // ── Step 3: render rows from ONLY resolved state ──────────────────────
        if entry.data == nil || resolvedPrayers.isEmpty {
            Text("کاتا نوێژ")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .unredacted()
        } else {
            VStack(spacing: 4) {
                ForEach(0..<resolvedPrayers.count, id: \.self) { i in
                    LockRow(
                        name:   resolvedPrayers[i].ku,
                        time:   resolvedPrayers[i].display,
                        isNext: i == 0
                    )
                }

                if kWidgetDebug {
                    WidgetDebugOverlay(entry: entry, famStr: "rect", rnName: resolvedPrayers.first?.name ?? "nil", now: now)
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
        }
    }
}

// MARK: — Entry view routers
//
// Background architecture — ONE layer only:
//   iOS 17+: containerBackground(for: .widget) → fills the full rounded widget surface
//   iOS 16:  .background()                    → fills behind the content view
//
// No ZStack wrappers, no additional background layers, no debug overlays.
// The dark gradient IS the widget surface. Content sits directly on it.

struct TafsirKurdWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:  SmallView(entry: entry)
            case .systemMedium: MediumView(entry: entry)
            case .systemLarge:  LargeView(entry: entry)
            default:            SmallView(entry: entry)
            }
        }
        .widgetBackground { widgetGradient }
        .environment(\.layoutDirection, .rightToLeft)
        .widgetURL(kDeepLink)
    }
}

struct TafsirKurdLockWidgetEntryView: View {
    let entry: PrayerEntry
    var body: some View {
        LockView(entry: entry)
            .widgetBackground { Color.clear }
            .widgetURL(kDeepLink)
    }
}

// MARK: — Background compatibility

private extension View {
    @ViewBuilder
    func widgetBackground<B: View>(@ViewBuilder _ bg: () -> B) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget, content: bg)
        } else {
            self.background(bg())
        }
    }
}

// MARK: — Ayah widget data model

struct AyahWidgetData: Codable {
    let chapter:       Int
    let verse:         Int
    let arabic:        String
    let tafsir:        String
    let surahName:     String    // Arabic surah name from JS SURAHS[n].ar
    let showTafsir:    Bool
    let showReference: Bool

    var reference: String {
        let sn = surahName.isEmpty ? "سورة \(chapter)" : surahName
        return "\(sn) · \(verse)"
    }

    static func load() -> AyahWidgetData? {
        guard let ud = UserDefaults(suiteName: kAppGroup) else {
            wLog.error("[AyahWidget] UserDefaults(suiteName:\(kAppGroup)) is NIL — App Group missing")
            return nil
        }
        guard let json = ud.string(forKey: "widgetAyahData") else {
            wLog.warning("[AyahWidget] key 'widgetAyahData' not found in App Group — widget never written")
            return nil
        }
        wLog.info("[AyahWidget] found key widgetAyahData len=\(json.count)")
        guard let raw = json.data(using: .utf8) else {
            wLog.error("[AyahWidget] UTF8 conversion failed")
            return nil
        }
        do {
            let d = try JSONDecoder().decode(AyahWidgetData.self, from: raw)
            wLog.info("[AyahWidget] decode OK — chapter=\(d.chapter) verse=\(d.verse)")
            return d
        } catch {
            wLog.error("[AyahWidget] JSON decode failed: \(error.localizedDescription)")
            return nil
        }
    }
}

// MARK: — Goal widget data model

struct GoalWidgetData: Codable {
    let todayCount:    Int
    let dailyGoal:     Int
    let currentStreak: Int
    let bestStreak:    Int
    let weeklyData:    [Int]   // 7 values oldest→today
    let todayDate:     String  // YYYY-MM-DD

    var progress: CGFloat {
        guard dailyGoal > 0 else { return 0 }
        return min(CGFloat(todayCount) / CGFloat(dailyGoal), 1.0)
    }
    var isGoalMet: Bool { todayCount >= dailyGoal }

    static func load() -> GoalWidgetData? {
        guard let ud = UserDefaults(suiteName: kAppGroup) else {
            wLog.error("[GoalWidget] UserDefaults(suiteName:\(kAppGroup)) is NIL — App Group missing")
            return nil
        }
        guard let json = ud.string(forKey: "widgetGoalData") else {
            wLog.warning("[GoalWidget] key 'widgetGoalData' not found in App Group — widget never written")
            return nil
        }
        wLog.info("[GoalWidget] found key widgetGoalData len=\(json.count)")
        guard let raw = json.data(using: .utf8) else {
            wLog.error("[GoalWidget] UTF8 conversion failed")
            return nil
        }
        do {
            let d = try JSONDecoder().decode(GoalWidgetData.self, from: raw)
            wLog.info("[GoalWidget] decode OK — todayCount=\(d.todayCount)/\(d.dailyGoal) streak=\(d.currentStreak)")
            return d
        } catch {
            wLog.error("[GoalWidget] JSON decode failed: \(error.localizedDescription)")
            return nil
        }
    }
}

// MARK: — Ayah widget timeline

struct AyahEntry: TimelineEntry {
    let date: Date
    let data: AyahWidgetData?
}

struct AyahProvider: TimelineProvider {
    func placeholder(in _: Context) -> AyahEntry { .init(date: .now, data: nil) }
    func getSnapshot(in _: Context, completion: @escaping (AyahEntry) -> Void) {
        WT.reload()
        completion(.init(date: .now, data: AyahWidgetData.load()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<AyahEntry>) -> Void) {
        WT.reload()
        let now = Date()
        let e   = AyahEntry(date: now, data: AyahWidgetData.load())
        completion(Timeline(entries: [e], policy: .after(now.addingTimeInterval(3600))))
    }
}

// MARK: — Goal widget timeline

struct GoalEntry: TimelineEntry {
    let date: Date
    let data: GoalWidgetData?
}

struct GoalProvider: TimelineProvider {
    func placeholder(in _: Context) -> GoalEntry { .init(date: .now, data: nil) }
    func getSnapshot(in _: Context, completion: @escaping (GoalEntry) -> Void) {
        WT.reload()
        completion(.init(date: .now, data: GoalWidgetData.load()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<GoalEntry>) -> Void) {
        WT.reload()
        let now = Date()
        let e   = GoalEntry(date: now, data: GoalWidgetData.load())
        completion(Timeline(entries: [e], policy: .after(now.addingTimeInterval(1800))))
    }
}

// MARK: — Ayah widget views

private struct NoAyahView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "text.book.closed")
                .font(.system(size: 22, weight: .ultraLight))
                .foregroundStyle(DS.t3)
            Text(WT.t("widget.ayah.empty_title", "هیچ ئایەتێک نەبژاردراوە"))
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(DS.t3)
            Text(WT.t("widget.ayah.empty_hint", "لە دانەی ئایەتێک بژێرە"))
                .font(.system(size: 9))
                .foregroundStyle(DS.t3.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// KFGQPC Hafs font helpers
private func hafsFont(size: CGFloat) -> Font {
    Font.custom("KFGQPCHAFSUthmanicScript-Regula", size: size)
}

// Lock screen — Arabic (13 pt, 2 lines) + reference (9 pt)
private struct AyahLockView: View {
    let entry: AyahEntry
    var body: some View {
        if let d = entry.data {
            VStack(alignment: .trailing, spacing: 5) {
                Text(d.arabic)
                    .font(hafsFont(size: 13))
                    .foregroundStyle(AnyShapeStyle(.primary))
                    .multilineTextAlignment(.trailing)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Text(d.reference)
                    .font(.system(size: 9, weight: .light))
                    .foregroundStyle(AnyShapeStyle(.secondary))
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
            .environment(\.layoutDirection, .rightToLeft)
        } else {
            Text(WT.t("widget.ayah.lock_fallback", "کتێبی پیرۆز"))
                .font(.system(size: 10))
                .foregroundStyle(.secondary)
        }
    }
}

// Medium/Small home — centered Arabic (Hafs) + small reference below
private struct AyahMediumView: View {
    let entry: AyahEntry
    var body: some View {
        if let d = entry.data {
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                Text(d.arabic)
                    .font(hafsFont(size: 18))
                    .foregroundStyle(DS.t1)
                    .multilineTextAlignment(.center)
                    .lineSpacing(6)
                    .lineLimit(4)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.horizontal, 14)
                if d.showReference {
                    Text(d.reference)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(DS.accent)
                        .lineLimit(1)
                        .padding(.top, 10)
                }
                Spacer(minLength: 0)
            }
            .environment(\.layoutDirection, .rightToLeft)
        } else { NoAyahView() }
    }
}

// Large home — centered reference (top) + large Hafs Arabic (center) + tafsir (bottom)
private struct AyahLargeView: View {
    let entry: AyahEntry
    var body: some View {
        if let d = entry.data {
            VStack(spacing: 0) {
                // Reference badge at top
                if d.showReference {
                    Text(d.reference)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(DS.accent)
                        .lineLimit(1)
                        .padding(.top, 18)
                }
                Spacer(minLength: 8)
                // Arabic centered with Hafs font
                Text(d.arabic)
                    .font(hafsFont(size: 22))
                    .foregroundStyle(DS.t1)
                    .multilineTextAlignment(.center)
                    .lineSpacing(8)
                    .lineLimit(7)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.horizontal, 18)
                Spacer(minLength: 8)
                // Tafsir at bottom
                if d.showTafsir && !d.tafsir.isEmpty {
                    DS.sep.frame(height: 1).padding(.horizontal, 20)
                    Text(d.tafsir)
                        .font(.system(size: 11, weight: .light))
                        .foregroundStyle(DS.t2)
                        .multilineTextAlignment(.center)
                        .lineLimit(4)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.horizontal, 18)
                        .padding(.top, 10)
                        .padding(.bottom, 16)
                } else {
                    Spacer(minLength: 16)
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
        } else { NoAyahView() }
    }
}

private var ayahGradient: LinearGradient {
    LinearGradient(
        colors: [DS.bg1, Color(red: 0.04, green: 0.07, blue: 0.05)],
        startPoint: .topLeading, endPoint: .bottomTrailing)
}

struct TafsirKurdAyahEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: AyahEntry
    var body: some View {
        Group {
            if family == .systemLarge {
                AyahLargeView(entry: entry)
            } else if family == .systemSmall {
                AyahMediumView(entry: entry)
            } else if family == .systemMedium {
                AyahMediumView(entry: entry)
            } else {
                AyahLockView(entry: entry)
            }
        }
        .widgetBackground { ayahGradient }
    }
}

// MARK: — Goal widget views

private struct NoGoalView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.bar")
                .font(.system(size: 22, weight: .ultraLight))
                .foregroundStyle(DS.t3)
            Text(WT.t("widget.goal.empty_title", "ئامانجا ئیرۆ"))
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(DS.t3)
            Text(WT.t("widget.goal.empty_hint", "بکوژێنەوە بۆ بینین"))
                .font(.system(size: 9))
                .foregroundStyle(DS.t3.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// Lock screen — two numbers only: progress left, streak right (15 pt bold)
private struct GoalLockView: View {
    let entry: GoalEntry
    var body: some View {
        if let d = entry.data {
            HStack(alignment: .center, spacing: 0) {
                Text("\(d.todayCount)/\(d.dailyGoal)")
                    .font(.system(size: 15, weight: .bold).monospacedDigit())
                    .foregroundStyle(AnyShapeStyle(.primary))
                    .lineLimit(1)
                Spacer()
                Text("🔥 \(d.currentStreak)")
                    .font(.system(size: 15, weight: .bold).monospacedDigit())
                    .foregroundStyle(AnyShapeStyle(.primary))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            Text(WT.t("widget.goal.lock_fallback", "ئامانجا ئیرۆ")).font(.system(size: 10)).foregroundStyle(.secondary)
        }
    }
}

// Medium home — progress bar + count/streak stats
private struct GoalMediumView: View {
    let entry: GoalEntry
    var body: some View {
        if let d = entry.data {
            VStack(alignment: .trailing, spacing: 0) {
                HStack {
                    Text(gregorianDisplay(d.todayDate))
                        .font(.system(size: 9)).foregroundStyle(DS.t3)
                    Spacer()
                    Text(WT.t("widget.goal.title", "ئامانجا ئیرۆ"))
                        .font(.system(size: 11, weight: .semibold)).foregroundStyle(DS.t1)
                }
                .padding(.bottom, 10)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4).fill(DS.bg2).frame(height: 7)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(d.isGoalMet ? DS.accent : DS.accent.opacity(0.7))
                            .frame(width: geo.size.width * d.progress, height: 7)
                    }
                }
                .frame(height: 7).padding(.bottom, 12)
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(d.todayCount)/\(d.dailyGoal)")
                            .font(.system(size: 22, weight: .bold).monospacedDigit())
                            .foregroundStyle(DS.t1)
                        Text(WT.t("widget.goal.ayah_label", "ئایەت")).font(.system(size: 9)).foregroundStyle(DS.t3)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("🔥 \(d.currentStreak)")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(DS.t1)
                        Text(WT.t("widget.goal.streak_label", "ڕۆژ")).font(.system(size: 9)).foregroundStyle(DS.t3)
                    }
                }
            }
            .padding(14)
        } else { NoGoalView() }
    }
}

// Large home — circular ring + stats + weekly bars + motivational line
private struct GoalLargeView: View {
    let entry: GoalEntry
    var body: some View {
        if let d = entry.data {
            VStack(alignment: .trailing, spacing: 0) {
                HStack(alignment: .center) {
                    // Circular progress (appears on left in LTR visual order)
                    ZStack {
                        Circle().stroke(DS.bg2, lineWidth: 10)
                        Circle()
                            .trim(from: 0, to: d.progress)
                            .stroke(DS.accent, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Text("\(Int(d.progress * 100))%")
                            .font(.system(size: 13, weight: .bold).monospacedDigit())
                            .foregroundStyle(DS.t1)
                    }
                    .frame(width: 56, height: 56)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(WT.t("widget.goal.title", "ئامانجا ئیرۆ"))
                            .font(.system(size: 15, weight: .bold)).foregroundStyle(DS.t1)
                        Text(gregorianDisplay(d.todayDate))
                            .font(.system(size: 9)).foregroundStyle(DS.t3)
                    }
                }
                .padding(.bottom, 12)
                DS.sep.frame(height: 1).padding(.bottom, 10)
                HStack {
                    GoalStatBox(value: "\(d.todayCount)/\(d.dailyGoal)", label: WT.t("widget.goal.ayah_label", "ئایەت"))
                    Spacer()
                    GoalStatBox(value: "🔥 \(d.currentStreak)", label: WT.t("widget.goal.streak_label", "ڕۆژ"))
                    Spacer()
                    GoalStatBox(value: "\(d.bestStreak)", label: "باشترین")
                }
                .padding(.bottom, 12)
                DS.sep.frame(height: 1).padding(.bottom, 10)
                GoalWeeklyBars(data: d.weeklyData, goal: d.dailyGoal)
                    .padding(.bottom, 10)
                Spacer(minLength: 0)
                Text(d.isGoalMet ? WT.t("widget.goal.completed", "🎉 ئامانجت تەواو کر!") : WT.t("widget.goal.motivate", "بەردەوام بە، دەتوانی!"))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(d.isGoalMet ? DS.accent : DS.t2)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(14)
        } else { NoGoalView() }
    }
}

private struct GoalStatBox: View {
    let value: String
    let label: String
    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(DS.t1)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(DS.t3)
        }
    }
}

private struct GoalWeeklyBars: View {
    let data: [Int]
    let goal: Int
    var body: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(0..<min(data.count, 7), id: \.self) { i in
                let v    = data[i]
                let frac: CGFloat = goal > 0 ? min(CGFloat(v) / CGFloat(goal), 1.0) : 0
                let met  = v >= goal
                VStack(spacing: 3) {
                    GeometryReader { geo in
                        VStack(spacing: 0) {
                            Spacer()
                            RoundedRectangle(cornerRadius: 3)
                                .fill(met ? DS.accent : DS.accent.opacity(0.35))
                                .frame(height: max(3, geo.size.height * frac))
                        }
                    }
                    .frame(height: 28)
                    Circle()
                        .fill(met ? DS.accent : DS.t3)
                        .frame(width: 4, height: 4)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

struct TafsirKurdGoalEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: GoalEntry
    var body: some View {
        Group {
            if family == .systemLarge {
                GoalLargeView(entry: entry)
            } else if family == .systemSmall {
                GoalMediumView(entry: entry)
            } else if family == .systemMedium {
                GoalMediumView(entry: entry)
            } else {
                GoalLockView(entry: entry)
            }
        }
        .widgetBackground { widgetGradient }
    }
}

// MARK: — Widget declarations

struct TafsirKurdWidget: Widget {
    let kind = "TafsirKurdWidgetV2"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
            TafsirKurdWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(WT.t("widget.prayer.widget_name", "دەمێ نڤێژێ"))
        .description(WT.t("widget.prayer.widget_desc", "دەمێن نڤێژێ نیشان بدە"))
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct TafsirKurdLockWidget: Widget {
    let kind = "TafsirKurdLockWidgetV2"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
            TafsirKurdLockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(WT.t("widget.prayer.lock_name", "دەمێن نڤێژان"))
        .description(WT.t("widget.prayer.lock_desc", "دیارکرنا دەمێن نڤێژان"))
        .supportedFamilies([.accessoryRectangular])
    }
}

struct TafsirKurdAyahWidget: Widget {
    let kind = "TafsirKurdAyahWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AyahProvider()) { entry in
            TafsirKurdAyahEntryView(entry: entry)
        }
        .configurationDisplayName(WT.t("widget.ayah.widget_name", "ئایەتا قورئانێ"))
        .description(WT.t("widget.ayah.widget_desc", "ئایەتا تە هەلبژارتی نیشان بدە"))
        .supportedFamilies([.systemMedium, .systemLarge, .accessoryRectangular])
    }
}

struct TafsirKurdGoalWidget: Widget {
    let kind = "TafsirKurdGoalWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GoalProvider()) { entry in
            TafsirKurdGoalEntryView(entry: entry)
        }
        .configurationDisplayName(WT.t("widget.goal.widget_name", "ئارمانجا ئەڤرۆ"))
        .description(WT.t("widget.goal.widget_desc", "دیارکرنا هویرکارییان"))
        .supportedFamilies([.systemMedium, .systemLarge, .accessoryRectangular])
    }
}

// MARK: — Bundle entry point

@main
struct TafsirKurdWidgetBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        TafsirKurdWidget()
        TafsirKurdLockWidget()
        TafsirKurdAyahWidget()
        TafsirKurdGoalWidget()
    }
}
