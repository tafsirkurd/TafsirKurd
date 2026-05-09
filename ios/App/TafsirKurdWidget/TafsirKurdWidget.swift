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
private let kNonceSeenKey   = "widgetRefreshNonceSeen"   // last nonce we acted on (UserDefaults.standard)
private let kPrayerOrder   = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]          // notifications + next-prayer logic
private let kDisplayOrder  = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] // home widget rows (includes sunrise)

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
        var h = parts[0]
        let m = parts[1]
        if h == 0       { h = 12 }
        else if h > 12  { h -= 12 }
        return String(format: "%d:%02d", h, m)
    }

    // Returns the next 3 upcoming prayers from `now`, including Sunrise.
    // Uses kDisplayOrder so Sunrise appears between Fajr and Dhuhr.
    // Checks today then tomorrow so the list keeps shifting after midnight.
    func next3(from now: Date) -> [(name: String, ku: String, display: String)] {
        var result: [(name: String, ku: String, display: String)] = []
        outer: for offset in 0...1 {
            for name in kDisplayOrder {
                guard result.count < 3 else { break outer }
                guard let t = prayerDate(name, dayOffset: offset), t > now else { continue }
                let src = offset == 0 ? timings : (tomorrow ?? timings)
                guard let raw = src[name] else { continue }
                let hm = String(raw.split(separator: " ").first ?? Substring(raw))
                let parts = hm.split(separator: ":").compactMap { Int($0) }
                let display: String
                if parts.count >= 2 {
                    var h = parts[0]; let m = parts[1]
                    if h == 0 { h = 12 } else if h > 12 { h -= 12 }
                    display = String(format: "%d:%02d", h, m)
                } else { display = hm }
                result.append((name: name, ku: kn(name), display: display))
            }
        }
        return result
    }

    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        // 1. Today's stored prayers (exact timings for stored date)
        for n in kPrayerOrder {
            if let t = prayerDate(n), t > now {
                wLog.info("nextPrayer: today \(n) at \(t)")
                return (n, t, kn(n))
            }
        }
        // 2. Tomorrow's prayers (uses actual tomorrow data when available)
        for n in kPrayerOrder {
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
            for n in kPrayerOrder {
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

    // Find next prayer from `now` scanning forward across all future days (up to 30)
    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        for dateStr in futureDays().prefix(30) {
            for name in kPrayerOrder {
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
    let date: Date
    let data: PrayerWidgetData?
    let next: (name: String, time: Date, ku: String)?
}

// MARK: — Provider (untouched)

struct PrayerProvider: TimelineProvider {
    func placeholder(in _: Context) -> PrayerEntry {
        .init(date: .now, data: nil, next: nil)
    }
    func getSnapshot(in _: Context, completion: @escaping (PrayerEntry) -> Void) {
        WT.reload()
        wLog.info("getSnapshot called")
        let d = PrayerWidgetData.load()
        completion(.init(date: .now, data: d, next: d?.nextPrayer()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        WT.reload()
        let now        = Date()
        let buildStart = now
        let isLPM      = ProcessInfo.processInfo.isLowPowerModeEnabled
        wLog.info("[WidgetTimeline] getTimeline called at \(now) lpm=\(isLPM)")

        // Check admin force-refresh nonce — if it changed, discard extended cache so we
        // re-fetch fresh prayer data from the API on this getTimeline call.
        if let ud = UserDefaults(suiteName: kAppGroup),
           let newNonce = ud.string(forKey: kNonceKey) {
            let seenNonce = UserDefaults.standard.string(forKey: kNonceSeenKey) ?? ""
            if newNonce != seenNonce {
                wLog.info("[WidgetTimeline] admin nonce changed \(seenNonce) → \(newNonce) — discarding extended cache")
                ud.removeObject(forKey: kExtCacheKey)
                ud.synchronize()
                UserDefaults.standard.set(newNonce, forKey: kNonceSeenKey)
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
                let nextName = entries.first?.next?.name ?? "unknown"
                let buildMs  = (Date().timeIntervalSince1970 - buildStart.timeIntervalSince1970) * 1000
                // heartbeats = entries at 15-min intervals in the first 36h
                let heartbeatCount = entries.filter { e in
                    let secs = e.date.timeIntervalSince(now)
                    return secs > 0 && secs <= 36 * 3600 &&
                           Int(secs) % (15 * 60) < 5   // within 5 s of a 15-min mark
                }.count
                writeDiagnostics([
                    "ts":            Date().timeIntervalSince1970 * 1000,
                    "source":        "extended",
                    "city":          ext.city,
                    "extDays":       ext.days.count,
                    "extAgeH":       ext.ageHours,
                    "entries":       entries.count,
                    "heartbeats":    heartbeatCount,
                    "policyAt":      policyAt.timeIntervalSince1970,
                    "policyAtISO":   ISO8601DateFormatter().string(from: policyAt),
                    "nextPrayer":    nextName,
                    "lpm":           isLPM,
                    "buildMs":       buildMs
                ], legacyData: legacyData)
                wLog.info("[WidgetTimeline] \(entries.count) entries (~\(heartbeatCount) heartbeats) nextPrayer=\(nextName) policy=\(fmtHMS(policyAt))")
                completion(Timeline(entries: entries, policy: .after(policyAt)))
                return
            }
        }

        // 2. Extended cache missing, stale, or city-mismatched — fetch from prayer-kurd API
        guard !currentCity.isEmpty else {
            wLog.warning("[WidgetTimeline] no city known — retry 3 min")
            writeDiagnostics(["ts": Date().timeIntervalSince1970 * 1000, "source": "no_city", "status": "missingTimeline"])
            completion(Timeline(entries: [PrayerEntry(date: now, data: nil, next: nil)],
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
                    "ts":          Date().timeIntervalSince1970 * 1000,
                    "source":      "extended_fetch",
                    "city":        ext.city,
                    "extDays":     ext.days.count,
                    "entries":     entries.count,
                    "policyAt":    policyAt.timeIntervalSince1970,
                    "policyAtISO": ISO8601DateFormatter().string(from: policyAt),
                    "nextPrayer":  nextName,
                    "lpm":         isLPM,
                    "buildMs":     buildMs
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
    return PrayerWidgetData(city: ext.city, date: dateStr, hijri: "",
                            timings: timing, tomorrow: nil, tomorrowDate: nil,
                            lastUpdated: ext.gen,
                            generatedAt: nil, validUntil: nil,
                            currentPrayer: nil, nextPrayer: nil)
}

// Build a dense timeline from the extended cache:
//   • Today + tomorrow: prayer boundaries + safety entries + 15-min heartbeats
//   • Days 3–14: prayer boundaries + midnight anchors only
//
// The 15-min heartbeat entries are the key reliability fix: WidgetKit pre-renders a
// static snapshot at each entry's `date`. If iOS throttles boundary entries (locked
// screen, Low Power Mode, battery management), the widget can freeze for hours on a
// stale prayer. With heartbeats every 15 min, staleness is bounded to 15 minutes
// regardless of how many prayer-boundary entries iOS skips.
private func buildExtendedTimeline(ext: WidgetExtendedCache, now: Date,
                                   legacyData: PrayerWidgetData?) -> ([PrayerEntry], Date) {
    var entries: [PrayerEntry] = []
    let futureDates = ext.futureDays()
    let todayStr  = PrayerWidgetData.baghdadDateString()
    let todayData = syntheticData(from: ext, dateStr: todayStr) ?? legacyData

    // Entry covering "right now" — establishes the initial display state
    let nowNext = ext.nextPrayer(from: now)
    entries.append(.init(date: now, data: todayData, next: nowNext))

    // Prayer-boundary entries across the next 14 days + midnight anchors.
    // Safety offsets at each boundary: +5 s, +60 s, +5 min.
    for (_, dateStr) in futureDates.prefix(14).enumerated() {
        let dayData = syntheticData(from: ext, dateStr: dateStr) ?? todayData

        for name in kPrayerOrder {
            guard let t = ext.prayerDate(name, for: dateStr), t > now else { continue }
            let next = ext.nextPrayer(from: t.addingTimeInterval(30))
            wLog.info("[PrayerBoundary] entry \(dateStr) \(name) @ \(fmtHMS(t)) -> next=\(next?.name ?? "nil")")
            entries.append(.init(date: t, data: dayData, next: next))

            let safetyOffsets: [TimeInterval] = [5, 60, 5 * 60]
            for offset in safetyOffsets {
                let st = t.addingTimeInterval(offset)
                guard st > now else { continue }
                let sNext = ext.nextPrayer(from: st.addingTimeInterval(30))
                entries.append(.init(date: st, data: dayData, next: sNext))
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
                wLog.info("[PrayerBoundary] midnight entry \(dateStr) -> next=\(nextAtMid?.name ?? "nil")")
                entries.append(.init(date: midnight, data: dayData, next: nextAtMid))
            }
        }
    }

    // ── Heartbeat entries every 15 min for the next 36 hours ──────────────────
    // These are the hard reliability guarantee: even when iOS completely skips prayer
    // boundary entries (locked device, LPM, aggressive throttling), a heartbeat fires
    // within 15 minutes. effectiveNextPrayer() / effectiveNext3() then re-derive the
    // correct prayer from the real clock time, so the snapshot is never more than
    // 15 minutes stale — and usually corrects at the very next heartbeat.
    var hTick        = now.addingTimeInterval(15 * 60)
    let hEnd         = now.addingTimeInterval(36 * 3600)
    var heartbeatCount = 0
    while hTick <= hEnd {
        let hComps   = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: hTick)
        if let hy = hComps.year, let hm = hComps.month, let hd = hComps.day {
            let hDateStr = String(format: "%04d-%02d-%02d", hy, hm, hd)
            let hData    = syntheticData(from: ext, dateStr: hDateStr) ?? todayData
            let hNext    = ext.nextPrayer(from: hTick)
            entries.append(.init(date: hTick, data: hData, next: hNext))
            heartbeatCount += 1
        }
        hTick = hTick.addingTimeInterval(15 * 60)
    }
    wLog.info("[WidgetTimeline] heartbeats=\(heartbeatCount) boundaryEntries=\(entries.count - heartbeatCount - 1)")

    // ── Refresh policy: Baghdad midnight TONIGHT + 5 min ──────────────────────
    // Nightly rebuild keeps heartbeat and boundary entries dense and current.
    // The 90-day extended cache preserves prayer-time accuracy across long offline
    // periods — only the timeline density needs nightly regeneration.
    let policyAt = PrayerWidgetData.baghdadMidnight(daysAhead: 1).addingTimeInterval(5 * 60)
    return (entries, policyAt)
}

// Legacy two-day path: used when extended cache is unavailable and network is offline.
// Mirrors the Phase 1 getTimeline logic: today + tomorrow, policy = Baghdad midnight+5min.
private func buildLegacyTimeline(data: PrayerWidgetData?, now: Date,
                                 completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    guard let data = data else {
        wLog.warning("buildLegacyTimeline: no data — retry 3 min")
        completion(Timeline(entries: [PrayerEntry(date: now, data: nil, next: nil)],
                            policy: .after(now.addingTimeInterval(3 * 60))))
        return
    }
    let ageH = data.lastUpdated.map { (now.timeIntervalSince1970 * 1000 - $0) / 3_600_000 } ?? 0
    if data.isStale {
        wLog.warning("buildLegacyTimeline: STALE ageH=\(String(format:"%.1f",ageH)) — retry 30 min")
        completion(Timeline(entries: [PrayerEntry(date: now, data: nil, next: nil)],
                            policy: .after(now.addingTimeInterval(30 * 60))))
        return
    }
    var rawEntries: [(date: Date, next: (name: String, time: Date, ku: String)?)] = []
    let nowNext = data.nextPrayer(from: now)
    wLog.info("[WidgetTimeline] buildLegacy city=\(data.city) nowNext=\(nowNext?.name ?? "nil") ageH=\(String(format:"%.1f",ageH))")
    rawEntries.append((now, nowNext))

    // Today's prayer boundaries — exact + T+5s + T+60s for fast lock-screen switching
    let legacyBoundaryOffsets: [TimeInterval] = [0, 5, 60]
    for name in kPrayerOrder {
        guard let t = data.prayerDate(name), t > now else { continue }
        let next = data.nextPrayer(from: t.addingTimeInterval(30))
        wLog.info("[PrayerBoundary] legacy today \(name) -> next=\(next?.name ?? "nil")")
        for offset in legacyBoundaryOffsets {
            let et = t.addingTimeInterval(offset)
            guard et > now else { continue }
            rawEntries.append((et, next))
        }
    }
    // Tomorrow's prayer boundaries — exact + T+5s + T+60s
    for i in 0 ..< kPrayerOrder.count {
        let name = kPrayerOrder[i]
        guard let t = data.prayerDate(name, dayOffset: 1) else { continue }
        var nextEntry: (name: String, time: Date, ku: String)? = nil
        for j in (i + 1) ..< kPrayerOrder.count {
            let nxt = kPrayerOrder[j]
            if let nt = data.prayerDate(nxt, dayOffset: 1) { nextEntry = (nxt, nt, kn(nxt)); break }
        }
        if nextEntry == nil, let fajr2 = data.prayerDate("Fajr", dayOffset: 2) {
            nextEntry = ("Fajr", fajr2, kn("Fajr"))
        }
        for offset in legacyBoundaryOffsets {
            rawEntries.append((t.addingTimeInterval(offset), nextEntry))
        }
    }

    // Baghdad midnight entry — anchors the day-boundary transition
    let midnightTomorrow = PrayerWidgetData.baghdadMidnight(daysAhead: 1).addingTimeInterval(1)
    if midnightTomorrow > now {
        let nextAtMid = data.nextPrayer(from: midnightTomorrow)
        wLog.info("[PrayerBoundary] legacy midnight -> next=\(nextAtMid?.name ?? "nil")")
        rawEntries.append((midnightTomorrow, nextAtMid))
    }

    // 5-minute safety entries between prayer boundaries so a missed boundary entry
    // self-corrects within 5 minutes (max gap between entries in this fallback path).
    var safetyEntries: [(date: Date, next: (name: String, time: Date, ku: String)?)] = []
    let sortedRaw = rawEntries.sorted { $0.date < $1.date }
    for i in 0 ..< (sortedRaw.count - 1) {
        let gapStart = sortedRaw[i].date
        let gapEnd   = sortedRaw[i + 1].date
        var tick = gapStart.addingTimeInterval(5 * 60)
        while tick < gapEnd {
            let n = data.nextPrayer(from: tick)
            safetyEntries.append((tick, n))
            tick = tick.addingTimeInterval(5 * 60)
        }
    }

    let allRaw = (rawEntries + safetyEntries).sorted { $0.date < $1.date }
    let entries = allRaw.map { PrayerEntry(date: $0.date, data: data, next: $0.next) }

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
    for name in kPrayerOrder {
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
    merged["iosVer"]    = UIDevice.current.systemVersion
    merged["buildTime"] = realNowMs
    merged["realNowMs"] = realNowMs   // device clock truth for admin drift detection

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
                .foregroundStyle(DS.t3)
            Text(WT.t("widget.prayer.empty_title", "کاتا نوێژ"))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(DS.t3)
            Text(WT.t("widget.prayer.empty_hint", "بکوژێنەوە بۆ بارکردن"))
                .font(.system(size: 9))
                .foregroundStyle(DS.t3.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, .rightToLeft)
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
    var cal = Calendar.current
    cal.timeZone = TimeZone(identifier: "Asia/Baghdad") ?? .current
    let c = cal.dateComponents([.hour, .minute, .second], from: d)
    return String(format: "%02d:%02d:%02d", c.hour ?? 0, c.minute ?? 0, c.second ?? 0)
}

private func effectiveNextPrayer(
    data: PrayerWidgetData,
    now: Date,
    tag: String = ""
) -> (name: String, time: Date, ku: String)? {
    // A prayer is still "next" while now < t + grace (5-second window after it starts).
    func stillRelevant(_ t: Date) -> Bool { now < t.addingTimeInterval(kGracePastSeconds) }

    // ── Tier 1: stored data for the snapshot's own date ───────────────────────
    for n in kPrayerOrder {
        if let t = data.prayerDate(n), stillRelevant(t) {
            let passed = now >= t
            wLog.info("[WidgetBoundary] \(tag.isEmpty ? "" : tag + " ")now=\(fmtHMS(now)) prayer=\(n) time=\(fmtHMS(t)) passed=\(passed)")
            return (n, t, kn(n))
        }
    }
    for n in kPrayerOrder {
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
        for n in kPrayerOrder {
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
        var h = parts[0]; let m = parts[1]
        if h == 0 { h = 12 } else if h > 12 { h -= 12 }
        return String(format: "%d:%02d", h, m)
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
        if let d = entry.data {
            let n        = correctedNext(data: d, stored: entry.next, tag: "small")
            let showName = n?.ku   ?? kn("Fajr")
            let showKey  = n?.name ?? "Fajr"
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
        if let d = entry.data {
            let n = correctedNext(data: d, stored: entry.next, tag: "medium")
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
        } else {
            NoDataView()
        }
    }
}

// MARK: — Large widget

private struct LargeView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data {
            let n          = correctedNext(data: d, stored: entry.next, tag: "large")
            let bottomName = n?.name ?? "Fajr"
            let bottomKu   = n?.ku   ?? kn("Fajr")
            VStack(spacing: 0) {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 3) {
                        if let n = n {
                            LiveCountdown(to: n.time)
                        }
                        Text(gregorianDisplay(d.date))
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
        } else {
            NoDataView()
        }
    }
}

// MARK: — Lock screen widget  (accessoryRectangular — next 3 upcoming prayers)
//
// Shows only the 3 next upcoming prayers relative to entry.date.
// The list shifts automatically at every prayer boundary because the timeline
// has one PrayerEntry per prayer transition — no app launch needed.
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

private struct LockView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data {
            let now     = Date()
            let prayers = effectiveNext3(data: d, now: now)
            // Drift detection: if stored next differs from what we computed, log it
            if let stored = entry.next, let first = prayers.first, stored.name != first.name {
                let _ = wLog.warning("[WidgetDrift] lock: stale=\(stored.name) corrected=\(first.name) now=\(fmtHMS(now))")
            }
            if let first = prayers.first {
                let _ = wLog.info("[WidgetBoundary] lock: now=\(fmtHMS(now)) next=\(first.name)")
            }
            if prayers.isEmpty {
                Text("کاتا نوێژ")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            } else {
                VStack(spacing: 6) {
                    ForEach(0..<prayers.count, id: \.self) { i in
                        LockRow(name: prayers[i].ku, time: prayers[i].display, isNext: i == 0)
                    }
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
        } else {
            Text("کاتا نوێژ")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
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
