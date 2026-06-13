// WidgetLogic.swift — pure prayer-time logic.
// No WidgetKit or SwiftUI dependency — compiled into both the
// TafsirKurdWidget extension and TafsirKurdWidgetTests target.
import Foundation
import os.log

// MARK: — Shared logger
let wLog = Logger(subsystem: "com.tafsirkurd.app.TafsirKurdWidget", category: "data")

// MARK: — Constants
let kAppGroup           = "group.com.tafsirkurd.app"
let kDataKey            = "widgetPrayerData"
let kExtCacheKey        = "widgetExtendedCache"
let kExtCacheSchema     = 1
let kDiagnosticsKey     = "widgetDiagnostics"
let kNonceKey           = "widgetRefreshNonce"
let kNonceSeenKey       = "widgetRefreshNonceSeen"
let kTimelineVersion    = 7
let kTimelineVersionKey = "widgetTimelineVersion"
let kDisplayOrder       = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
let kSharedUD: UserDefaults? = UserDefaults(suiteName: kAppGroup)

// MARK: — Widget translations
enum WT {
    private static var _cache: [String: String]? = nil

    static func reload() { _cache = nil; load() }

    static func load() {
        guard let ud = UserDefaults(suiteName: kAppGroup) else {
            wLog.error("[WT] UserDefaults(suiteName:) returned nil — App Group missing?")
            _cache = [:]; return
        }
        guard let json = ud.string(forKey: "widgetTranslations") else {
            wLog.warning("[WT] widgetTranslations key absent from App Group — using fallbacks")
            _cache = [:]; return
        }
        guard let data = json.data(using: .utf8),
              let obj  = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let keys = obj["keys"] as? [String: String]
        else {
            wLog.error("[WT] failed to decode widgetTranslations JSON (len=\(json.count))")
            _cache = [:]; return
        }
        _cache = keys
        wLog.info("[WT] loaded \(keys.count) translation keys from App Group")
        if let sample = keys.first { wLog.info("[WT] sample: \(sample.key) = \(sample.value)") }
    }

    static func t(_ key: String, _ fallback: String) -> String {
        if _cache == nil { load() }
        return _cache?[key] ?? fallback
    }
}

func kn(_ name: String) -> String {
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

// MARK: — Data model
struct PrayerWidgetData: Codable {
    let city:          String
    let date:          String
    let hijri:         String
    let timings:       [String: String]
    let tomorrow:      [String: String]?
    let tomorrowDate:  String?
    let lastUpdated:   Double?
    let generatedAt:   Double?
    let validUntil:    Double?
    let currentPrayer: String?
    let nextPrayer:    SnapshotNextPrayer?

    struct SnapshotNextPrayer: Codable {
        let name:   String
        let timeMs: Double
    }

    var isStale: Bool {
        let nowMs = Date().timeIntervalSince1970 * 1000
        if let vu = validUntil { return nowMs > vu }
        guard let lu = lastUpdated else { return false }
        return (nowMs - lu) > 48 * 3600 * 1000
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

    static var baghdadCal: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Asia/Baghdad") ?? .current
        return c
    }()

    static func baghdadDateString(offset: Int = 0) -> String {
        let d = baghdadCal.date(byAdding: .day, value: offset, to: Date()) ?? Date()
        let c = baghdadCal.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

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

    func prayerDate(_ name: String, dayOffset: Int = 0) -> Date? {
        switch dayOffset {
        case 0:
            guard let raw = timings[name] else { return nil }
            return dateFrom(timingRaw: raw, dateStr: date)
        case 1:
            let tomTimings = tomorrow ?? timings
            guard let raw = tomTimings[name] else { return nil }
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
        for n in kDisplayOrder {
            if let t = prayerDate(n), t > now { wLog.info("nextPrayer: today \(n) at \(t)"); return (n, t, kn(n)) }
        }
        for n in kDisplayOrder {
            if let t = prayerDate(n, dayOffset: 1), t > now { wLog.info("nextPrayer: tomorrow \(n) at \(t)"); return (n, t, kn(n)) }
        }
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

// MARK: — Extended cache
struct WidgetExtendedCache: Codable {
    let v:          Int
    let city:       String
    let gen:        Double
    let validUntil: Double?  // ms since epoch; written by app (45 days from gen)
    let days:       [String: [String]]

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
            // Require at least 7 days of data; fewer means an incomplete write.
            guard ext.days.count >= 7 else {
                wLog.warning("[Ext] insufficient days \(ext.days.count) < 7 — rejecting as incomplete")
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

    // hasExpired: validUntil has passed (only meaningful when the app wrote validUntil).
    // Widget-fetched caches have no validUntil and never expire this way.
    var hasExpired: Bool {
        guard let vu = validUntil else { return false }
        return Date().timeIntervalSince1970 * 1000 > vu
    }

    var isUsable: Bool {
        guard days[PrayerWidgetData.baghdadDateString()] != nil else { return false }
        return !hasExpired
    }

    func timing(_ name: String, for dateStr: String) -> String? {
        guard let arr = days[dateStr], let idx = Self.kIdx[name], idx < arr.count else { return nil }
        let s = arr[idx]; return s.isEmpty ? nil : s
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

    func futureDays() -> [String] {
        let today = PrayerWidgetData.baghdadDateString()
        return days.keys.filter { $0 >= today }.sorted()
    }

    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        for dateStr in futureDays().prefix(30) {
            for name in kDisplayOrder {
                if let t = prayerDate(name, for: dateStr), t > now { return (name, t, kn(name)) }
            }
        }
        return nil
    }
}

// MARK: — Synthetic data
func syntheticData(from ext: WidgetExtendedCache, dateStr: String) -> PrayerWidgetData? {
    guard let arr = ext.days[dateStr] else { return nil }
    let names = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
    var timing: [String: String] = [:]
    for (i, n) in names.enumerated() where i < arr.count { timing[n] = arr[i] }
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
                            lastUpdated: ext.gen, generatedAt: nil, validUntil: nil,
                            currentPrayer: nil, nextPrayer: nil)
}

// MARK: — Time formatting
func fmtHMS(_ d: Date) -> String {
    let c = PrayerWidgetData.baghdadCal.dateComponents([.hour, .minute, .second], from: d)
    return String(format: "%02d:%02d:%02d", c.hour ?? 0, c.minute ?? 0, c.second ?? 0)
}

func formatPrayerTime(_ raw: String) -> String {
    let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
    let parts = hm.split(separator: ":").compactMap { Int($0) }
    guard parts.count >= 2 else { return raw }
    let h12 = parts[0] % 12 == 0 ? 12 : parts[0] % 12
    return String(format: "%d:%02d", h12, parts[1])
}

func displayTime(_ name: String, timings: [String: String]) -> String {
    guard let raw = timings[name] else { return "--:--" }
    return formatPrayerTime(raw)
}

// MARK: — Next prayer resolution
func effectiveNextPrayer(
    data: PrayerWidgetData,
    now: Date,
    tag: String = ""
) -> (name: String, time: Date, ku: String)? {
    #if DEBUG
    let todayDbg = kDisplayOrder.map { n -> String in
        guard let t = data.prayerDate(n) else { return "\(n):nil" }
        return "\(n):\(fmtHMS(t))[\(t > now ? "↑" : "✓")]"
    }.joined(separator: " ")
    wLog.info("[NextPrayer] \(tag) REAL_NOW=\(fmtHMS(now)) date=\(data.date) today=[\(todayDbg)]")
    #endif

    for n in kDisplayOrder {
        if let t = data.prayerDate(n), t > now {
            wLog.info("[NextPrayer] \(tag) → \(n) at \(fmtHMS(t)) isTomorrow=false")
            return (n, t, kn(n))
        }
    }

    #if DEBUG
    let tomDbg = kDisplayOrder.map { n -> String in
        guard let t = data.prayerDate(n, dayOffset: 1) else { return "\(n):nil" }
        return "\(n):\(fmtHMS(t))[\(t > now ? "↑" : "✓")]"
    }.joined(separator: " ")
    wLog.info("[NextPrayer] \(tag) all-today-past — tomorrow=[\(tomDbg)]")
    #endif

    for n in kDisplayOrder {
        if let t = data.prayerDate(n, dayOffset: 1), t > now {
            wLog.info("[NextPrayer] \(tag) → \(n) at \(fmtHMS(t)) isTomorrow=true")
            return (n, t, kn(n))
        }
    }

    wLog.warning("[WidgetBoundary] \(tag) stored dates exhausted — wall-clock recovery now=\(fmtHMS(now))")
    for offset in 0...1 {
        let targetDate = PrayerWidgetData.baghdadDateString(offset: offset)
        for n in kDisplayOrder {
            if let approx = data.prayerTimeOnDate(n, dateStr: targetDate), approx > now {
                wLog.warning("[WidgetBoundary] recovery: \(n) on \(targetDate) now=\(fmtHMS(now))")
                return (n, approx, kn(n))
            }
        }
    }

    wLog.error("[WidgetBoundary] effectiveNextPrayer: no prayer found tag=\(tag) now=\(fmtHMS(now))")
    return nil
}

func effectiveNext3(
    data: PrayerWidgetData,
    now: Date
) -> [(name: String, ku: String, display: String)] {
    func formatHM(_ raw: String) -> String {
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return hm }
        let h12 = parts[0] % 12 == 0 ? 12 : parts[0] % 12
        return String(format: "%d:%02d", h12, parts[1])
    }

    var result: [(name: String, ku: String, display: String)] = []

    outer: for offset in 0...1 {
        for name in kDisplayOrder {
            guard result.count < 3 else { break outer }
            guard let t = data.prayerDate(name, dayOffset: offset), t > now else { continue }
            let src = offset == 0 ? data.timings : (data.tomorrow ?? data.timings)
            guard let raw = src[name] else { continue }
            result.append((name: name, ku: kn(name), display: formatHM(raw)))
        }
    }

    if result.isEmpty {
        wLog.warning("[effectiveNext3] tier-1 empty — wall-clock recovery now=\(fmtHMS(now))")
        outer2: for offset in 0...1 {
            let targetDate = PrayerWidgetData.baghdadDateString(offset: offset)
            for name in kDisplayOrder {
                guard result.count < 3 else { break outer2 }
                guard let approx = data.prayerTimeOnDate(name, dateStr: targetDate),
                      approx > now else { continue }
                guard let raw = data.timings[name] else { continue }
                result.append((name: name, ku: kn(name), display: formatHM(raw)))
            }
        }
    }

    return result
}
