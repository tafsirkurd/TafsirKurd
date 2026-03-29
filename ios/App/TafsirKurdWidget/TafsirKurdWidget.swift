import WidgetKit
import SwiftUI
import os.log

private let wLog = Logger(subsystem: "com.tafsirkurd.app.TafsirKurdWidget", category: "data")

// MARK: — Constants

private let kAppGroup    = "group.com.tafsirkurd.app"
private let kDataKey     = "widgetPrayerData"
private let kDeepLink    = URL(string: "tafsirkurd://prayer")!
private let kPrayerOrder   = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]          // notifications + next-prayer logic
private let kDisplayOrder  = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] // home widget rows (includes sunrise)
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
    static let bg1       = Color(red: 0.055, green: 0.065, blue: 0.055)
    static let bg2       = Color(red: 0.035, green: 0.042, blue: 0.035)
    static let accent    = Color(red: 0.14,  green: 0.74,  blue: 0.41)
    static let accentDim = Color(red: 0.16,  green: 0.80,  blue: 0.44, opacity: 0.07)
    static let accentMid = Color(red: 0.16,  green: 0.80,  blue: 0.44, opacity: 0.14)
    static let t1        = Color.white
    static let t2        = Color(white: 1, opacity: 0.50)
    static let t3        = Color(white: 1, opacity: 0.28)
    static let sep       = Color(white: 1, opacity: 0.07)
}

private var widgetGradient: LinearGradient {
    LinearGradient(colors: [DS.bg1, DS.bg2], startPoint: .top, endPoint: .bottom)
}

// MARK: — Data model (untouched)

struct PrayerWidgetData: Codable {
    let city:    String
    let date:    String
    let hijri:   String
    let timings: [String: String]

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
            wLog.info("decode OK — city=\(decoded.city) date=\(decoded.date)")
            return decoded
        } catch {
            wLog.error("JSON decode failed: \(error.localizedDescription)")
            return nil
        }
    }

    private static var baghdadCal: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Asia/Baghdad") ?? .current
        return c
    }()

    func prayerDate(_ name: String, dayOffset: Int = 0) -> Date? {
        guard let raw = timings[name] else { return nil }
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return nil }
        var c  = DateComponents()
        let dp = date.split(separator: "-").compactMap { Int($0) }
        guard dp.count == 3 else { return nil }
        c.year = dp[0]; c.month = dp[1]; c.day = dp[2] + dayOffset
        c.hour = parts[0]; c.minute = parts[1]; c.second = 0
        c.timeZone = TimeZone(identifier: "Asia/Baghdad")
        return PrayerWidgetData.baghdadCal.date(from: c)
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

    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        for n in kPrayerOrder {
            if let t = prayerDate(n), t > now {
                wLog.info("nextPrayer: found \(n) at \(t)")
                return (n, t, kn(n))
            }
        }
        wLog.warning("nextPrayer: all prayers passed, using tomorrow Fajr fallback")
        if let fajrTomorrow = prayerDate("Fajr", dayOffset: 1) {
            return ("Fajr", fajrTomorrow, kn("Fajr"))
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
        let now  = Date()
        wLog.info("getTimeline called")
        let data = PrayerWidgetData.load()

        guard let data = data else {
            wLog.warning("getTimeline: no data — scheduling retry in 3min")
            let retry = now.addingTimeInterval(3 * 60)
            completion(Timeline(entries: [PrayerEntry(date: now, data: nil, next: nil)],
                                policy: .after(retry)))
            return
        }

        var entries: [PrayerEntry] = [.init(date: now, data: data, next: data.nextPrayer(from: now))]
        for name in kPrayerOrder {
            if let t = data.prayerDate(name), t > now {
                let after = t.addingTimeInterval(30)
                entries.append(.init(date: t, data: data, next: data.nextPrayer(from: after)))
            }
        }
        wLog.info("getTimeline: \(entries.count) entries built for city=\(data.city)")
        let refresh = (entries.last?.date ?? now).addingTimeInterval(6 * 3600)
        completion(Timeline(entries: entries, policy: .after(refresh)))
    }
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

private func remaining(_ to: Date) -> String {
    let sec = Int(to.timeIntervalSinceNow)
    guard sec > 60 else { return "ئێستا" }
    let h = sec / 3600
    let m = (sec % 3600) / 60
    return String(format: "%02d:%02d \(WT.t("widget.prayer.time_left", "یێت ماین"))", h, m)
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

// MARK: — Small widget

private struct SmallView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data {
            let n        = entry.next
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
                    Text(remaining(n.time))
                        .font(.system(size: 9.5, weight: .light))
                        .foregroundStyle(DS.t3)
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
            let n = entry.next
            VStack(spacing: 0) {
                HStack(alignment: .center, spacing: 0) {
                    if let n = n {
                        Text(remaining(n.time))
                            .font(.system(size: 9.5, weight: .light))
                            .foregroundStyle(DS.t3)
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
            let n          = entry.next
            let bottomName = n?.name ?? "Fajr"
            let bottomKu   = n?.ku   ?? kn("Fajr")
            VStack(spacing: 0) {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 3) {
                        if let n = n {
                            Text(remaining(n.time))
                                .font(.system(size: 9.5, weight: .light))
                                .foregroundStyle(DS.t3)
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
                            Text(remaining(n.time))
                                .font(.system(size: 10, weight: .light))
                                .foregroundStyle(DS.t3)
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

// MARK: — Lock screen widget  (accessoryRectangular — 3 × 2 grid)
//
// 6 items paired into 3 rows:
//   Row 1: Fajr      | Sunrise
//   Row 2: Dhuhr     | Asr
//   Row 3: Maghrib   | Isha
//
// RTL: within each cell → name RIGHT, time LEFT.
//      within each row  → pair[0] RIGHT, pair[1] LEFT.
//
// Height (VStack spacing:7, 10pt font → ~12pt line height):
//   3 rows × 12pt = 36pt
//   2 gaps × 7pt  = 14pt
//   total          = 50pt  ✓ fits all devices (standard ≥ 73pt available)
//
// All 6 items identical styling — no hero, no highlight, no countdown.

private let kLockPairs: [(String, String, String, String)] = [
    ("Fajr",    "سپێدە",   "Sunrise", "ڕوژهەلات"),
    ("Dhuhr",   "نیڤرۆ",   "Asr",     "ئێڤار"),
    ("Maghrib", "مەغرەب",  "Isha",    "عەیشا"),
]

private struct LockPairCell: View {
    let time: String
    let name: String
    var body: some View {
        HStack(spacing: 0) {
            Text(name)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(AnyShapeStyle(.primary))
                .lineLimit(1)
            Spacer(minLength: 2)
            Text(time)
                .font(.system(size: 10, weight: .regular).monospacedDigit())
                .foregroundStyle(AnyShapeStyle(.primary))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct LockView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data {
            VStack(spacing: 7) {
                ForEach(0..<3, id: \.self) { i in
                    let row = kLockPairs[i]
                    HStack(spacing: 12) {
                        LockPairCell(time: d.displayTime(row.0), name: row.1)
                        LockPairCell(time: d.displayTime(row.2), name: row.3)
                    }
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
        } else {
            Text("کاتا نوێژ")
                .font(.system(size: 10))
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
        .configurationDisplayName(WT.t("widget.prayer.widget_name", "کاتا نوێژ"))
        .description(WT.t("widget.prayer.widget_desc", "کاتەکانی نوێژ نیشان بدە"))
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct TafsirKurdLockWidget: Widget {
    let kind = "TafsirKurdLockWidgetV2"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
            TafsirKurdLockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(WT.t("widget.prayer.lock_name", "نوێژا داهاتو"))
        .description(WT.t("widget.prayer.lock_desc", "نوێژا داهاتو لە لۆک سکرین"))
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
        .description(WT.t("widget.ayah.widget_desc", "ئایەتا بژاردەی خۆت نیشان بدە"))
        .supportedFamilies([.systemMedium, .systemLarge, .accessoryRectangular])
    }
}

struct TafsirKurdGoalWidget: Widget {
    let kind = "TafsirKurdGoalWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GoalProvider()) { entry in
            TafsirKurdGoalEntryView(entry: entry)
        }
        .configurationDisplayName(WT.t("widget.goal.widget_name", "ئامانجا ئیرۆ"))
        .description(WT.t("widget.goal.widget_desc", "پێشکەوتنی مانگرتن و ستریک"))
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
