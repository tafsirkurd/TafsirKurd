import WidgetKit
import SwiftUI
import os.log

private let wLog = Logger(subsystem: "com.tafsirkurd.app.TafsirKurdWidget", category: "data")

// MARK: — Constants

private let kAppGroup    = "group.com.tafsirkurd.app"
private let kDataKey     = "widgetPrayerData"
private let kDeepLink    = URL(string: "tafsirkurd://prayer")!
private let kPrayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
private let kKurdish: [String: String] = [
    "Fajr":    "سپێدە",
    "Dhuhr":   "نیوەڕۆ",
    "Asr":     "ئەسر",
    "Maghrib": "مەغریب",
    "Isha":    "عیشا"
]

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

private var widgetGradient: some View {
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
        return String(raw.split(separator: " ").first ?? Substring(raw))
    }

    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        for n in kPrayerOrder {
            if let t = prayerDate(n), t > now {
                wLog.info("nextPrayer: found \(n) at \(t)")
                return (n, t, kKurdish[n] ?? n)
            }
        }
        wLog.warning("nextPrayer: all prayers passed, using tomorrow Fajr fallback")
        if let fajrTomorrow = prayerDate("Fajr", dayOffset: 1) {
            return ("Fajr", fajrTomorrow, kKurdish["Fajr"] ?? "سپێدە")
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
        wLog.info("getSnapshot called")
        let d = PrayerWidgetData.load()
        completion(.init(date: .now, data: d, next: d?.nextPrayer()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
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

private func remaining(_ to: Date) -> String {
    let sec = Int(to.timeIntervalSinceNow)
    guard sec > 60 else { return "ئێستا" }
    let h = sec / 3600
    let m = (sec % 3600) / 60
    return String(format: "ماوە %02d:%02d", h, m)
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

private struct RemBadge: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(DS.accent)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(DS.accentDim)
            .clipShape(Capsule())
    }
}

/// Prayer row.
///
/// `compact: true` → 11 pt font, 2 pt vertical padding.
/// Used in the medium widget where 5 rows must fit the available height.
///
/// Height math (compact, iOS 17+ with ~11 pt system content margins):
///   row = 11 pt font (line height ~13 pt) + 2 × 2 pt vpad = 17 pt
///   5 rows × 17 pt = 85 pt — fits in any medium widget
private struct PRow: View {
    let name:    String
    let time:    String
    let isNext:  Bool
    var compact: Bool     = false
    var fontSize: CGFloat = 13

    var body: some View {
        let fs:   CGFloat = compact ? 11 : fontSize
        let vPad: CGFloat = compact ? 2  : (isNext ? 6 : 4)
        let hPad: CGFloat = compact ? 8  : 10

        HStack(spacing: 0) {
            Text(time)
                .font(.system(size: fs, weight: isNext ? .medium : .ultraLight).monospacedDigit())
                .foregroundStyle(isNext ? DS.accent : DS.t3)
                .frame(width: compact ? 38 : 44, alignment: .leading)
            Spacer()
            Text(kKurdish[name] ?? name)
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
            Text("کاتا نوێژ")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(DS.t3)
            Text("بکوژێنەوە بۆ بارکردن")
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
            let showName = n?.ku   ?? (kKurdish["Fajr"] ?? "سپێدە")
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
                Spacer()
                if let n = n {
                    RemBadge(text: remaining(n.time))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
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
                    if let n = n { RemBadge(text: remaining(n.time)) }
                    Spacer(minLength: 6)
                    CityLabel(city: d.city)
                }
                .padding(.bottom, 3)
                VStack(spacing: 0) {
                    ForEach(kPrayerOrder, id: \.self) { name in
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
            let bottomKu   = n?.ku   ?? (kKurdish["Fajr"] ?? "سپێدە")
            VStack(spacing: 0) {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 3) {
                        if let n = n { RemBadge(text: remaining(n.time)) }
                        Text(d.hijri)
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
                    ForEach(kPrayerOrder, id: \.self) { name in
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
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(DS.t2)
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

// MARK: — Lock screen widget  (accessoryRectangular — all 5 prayers)
//
// Layout (RTL): city header + 5 prayer rows (name right, time left)
// No countdown — lock screen shows prayer names and times only.
//
// Hierarchy:
//   next prayer  → 10 pt semibold/medium, .primary  (bright, readable at a glance)
//   other prayers → 8.5 pt light/ultraLight, .secondary  (present but subdued)
//   city header  → 7.5 pt semibold, .tertiary  (orientation cue, very quiet)
//
// Height estimate (VStack spacing:0):
//   city 7.5 pt → ~9 pt line + 2 pt gap  = 11 pt
//   next row 10 pt                        = 12 pt
//   4 other rows 8.5 pt × 4              = 42 pt
//   total                                 ≈ 65 pt  (fits iPhone 14–16 Pro; SE may clip city)
//
// .widgetAccentable(isNext) → next-prayer row adopts user's chosen lock-screen accent color.

private struct LockView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data {
            let upcoming = entry.next
            VStack(alignment: .trailing, spacing: 0) {
                // City header — orientation cue, quiet
                HStack(spacing: 0) {
                    Spacer()
                    Text(d.city)
                        .font(.system(size: 7.5, weight: .semibold))
                        .foregroundStyle(AnyShapeStyle(.tertiary))
                }
                .padding(.bottom, 2)

                // 5 prayer rows — name right, time left (RTL)
                ForEach(kPrayerOrder, id: \.self) { pName in
                    let isNext = pName == upcoming?.name
                    HStack(spacing: 0) {
                        Text(kKurdish[pName] ?? pName)
                            .font(.system(size: isNext ? 10 : 8.5,
                                          weight: isNext ? .semibold : .light))
                            .foregroundStyle(
                                isNext ? AnyShapeStyle(.primary) : AnyShapeStyle(.secondary))
                            .lineLimit(1)
                        Spacer(minLength: 4)
                        Text(d.displayTime(pName))
                            .font(.system(size: isNext ? 10 : 8.5,
                                          weight: isNext ? .medium : .ultraLight).monospacedDigit())
                            .foregroundStyle(
                                isNext ? AnyShapeStyle(.primary) : AnyShapeStyle(.secondary))
                            .lineLimit(1)
                    }
                    .widgetAccentable(isNext)
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

// MARK: — Widget declarations

struct TafsirKurdWidget: Widget {
    let kind = "TafsirKurdWidgetV2"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
            TafsirKurdWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("کاتا نوێژ")
        .description("کاتەکانی نوێژ نیشان بدە")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct TafsirKurdLockWidget: Widget {
    let kind = "TafsirKurdLockWidgetV2"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PrayerProvider()) { entry in
            TafsirKurdLockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("نوێژا داهاتو")
        .description("نوێژا داهاتو لە لۆک سکرین")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: — Bundle entry point

@main
struct TafsirKurdWidgetBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        TafsirKurdWidget()
        TafsirKurdLockWidget()
    }
}
