import WidgetKit
import SwiftUI

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
    // Backgrounds
    static let bg1 = Color(red: 0.055, green: 0.065, blue: 0.055)
    static let bg2 = Color(red: 0.035, green: 0.042, blue: 0.035)

    // Accent
    static let accent     = Color(red: 0.16, green: 0.80, blue: 0.44)
    static let accentDim  = Color(red: 0.16, green: 0.80, blue: 0.44, opacity: 0.10)
    static let accentMid  = Color(red: 0.16, green: 0.80, blue: 0.44, opacity: 0.22)

    // Text
    static let t1  = Color.white
    static let t2  = Color(white: 1, opacity: 0.50)
    static let t3  = Color(white: 1, opacity: 0.28)

    // Separator
    static let sep = Color(white: 1, opacity: 0.07)
}

private var widgetGradient: some View {
    LinearGradient(colors: [DS.bg1, DS.bg2], startPoint: .top, endPoint: .bottom)
}

// MARK: — Data model

struct PrayerWidgetData: Codable {
    let city:    String
    let date:    String
    let hijri:   String
    let timings: [String: String]

    static func load() -> PrayerWidgetData? {
        guard
            let ud   = UserDefaults(suiteName: kAppGroup),
            let json = ud.string(forKey: kDataKey),
            let raw  = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(PrayerWidgetData.self, from: raw)
    }

    func prayerDate(_ name: String) -> Date? {
        guard let raw = timings[name] else { return nil }
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return nil }
        var c  = DateComponents()
        let dp = date.split(separator: "-").compactMap { Int($0) }
        if dp.count == 3 { c.year = dp[0]; c.month = dp[1]; c.day = dp[2] }
        c.hour = parts[0]; c.minute = parts[1]; c.second = 0
        c.timeZone = TimeZone(identifier: "Asia/Baghdad")
        return Calendar.current.date(from: c)
    }

    func displayTime(_ name: String) -> String {
        guard let raw = timings[name] else { return "--:--" }
        return String(raw.split(separator: " ").first ?? Substring(raw))
    }

    func nextPrayer(from now: Date = Date()) -> (name: String, time: Date, ku: String)? {
        for n in kPrayerOrder {
            if let t = prayerDate(n), t > now { return (n, t, kKurdish[n] ?? n) }
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

// MARK: — Provider

struct PrayerProvider: TimelineProvider {
    func placeholder(in _: Context) -> PrayerEntry {
        .init(date: .now, data: nil, next: nil)
    }
    func getSnapshot(in _: Context, completion: @escaping (PrayerEntry) -> Void) {
        let d = PrayerWidgetData.load()
        completion(.init(date: .now, data: d, next: d?.nextPrayer()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let now  = Date()
        let data = PrayerWidgetData.load()

        // No data yet — retry in 3 minutes (app may not have been opened yet)
        guard let data = data else {
            let retry = now.addingTimeInterval(3 * 60)
            let entry = PrayerEntry(date: now, data: nil, next: nil)
            completion(Timeline(entries: [entry], policy: .after(retry)))
            return
        }

        var entries: [PrayerEntry] = [.init(date: now, data: data, next: data.nextPrayer(from: now))]
        for name in kPrayerOrder {
            if let t = data.prayerDate(name), t > now {
                let after = t.addingTimeInterval(30)
                entries.append(.init(date: t, data: data, next: data.nextPrayer(from: after)))
            }
        }
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
    if h > 0 && m > 0 { return "لە \(h)س \(m)خ" }
    if h > 0           { return "لە \(h) کاتژمێر" }
    return "لە \(m) خولەک"
}

// MARK: — Reusable components

/// City pill — top of every widget
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

/// Remaining time badge
private struct RemBadge: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(DS.accent)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(DS.accentDim)
            .clipShape(Capsule())
    }
}

/// Single prayer row used in medium & large
private struct PRow: View {
    let name:   String
    let time:   String
    let isNext: Bool
    var fontSize: CGFloat = 13

    var body: some View {
        HStack(spacing: 0) {
            Text(time)
                .font(.system(size: fontSize, weight: isNext ? .medium : .light).monospacedDigit())
                .foregroundStyle(isNext ? DS.accent : DS.t3)
                .frame(width: 44, alignment: .leading)
            Spacer()
            Text(kKurdish[name] ?? name)
                .font(.system(size: fontSize, weight: isNext ? .bold : .regular))
                .foregroundStyle(isNext ? DS.t1 : DS.t2)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, isNext ? 7 : 5)
        .background(isNext ? DS.accentDim : Color.clear)
        .overlay(
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .stroke(isNext ? DS.accentMid : Color.clear, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
    }
}

/// Empty / no data state
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
        if let d = entry.data, let n = entry.next {
            VStack(alignment: .trailing, spacing: 0) {
                CityLabel(city: d.city)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Spacer()
                // Next prayer — dominant
                Text(n.ku)
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(DS.t1)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                // Time
                Text(d.displayTime(n.name))
                    .font(.system(size: 22, weight: .thin).monospacedDigit())
                    .foregroundStyle(DS.accent)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Spacer()
                // Remaining
                RemBadge(text: remaining(n.time))
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(14)
        } else {
            NoDataView()
        }
    }
}

// MARK: — Medium widget

private struct MediumView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data, let n = entry.next {
            VStack(spacing: 0) {
                // Header
                HStack(alignment: .center) {
                    RemBadge(text: remaining(n.time))
                    Spacer()
                    CityLabel(city: d.city)
                }
                .padding(.bottom, 9)

                // Prayer rows
                VStack(spacing: 2) {
                    ForEach(kPrayerOrder, id: \.self) { name in
                        PRow(name: name, time: d.displayTime(name), isNext: name == n.name)
                    }
                }
            }
            .padding(13)
        } else {
            NoDataView()
        }
    }
}

// MARK: — Large widget

private struct LargeView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data, let n = entry.next {
            VStack(spacing: 0) {
                // Top bar
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 2) {
                        RemBadge(text: remaining(n.time))
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

                // Prayer list
                VStack(spacing: 3) {
                    ForEach(kPrayerOrder, id: \.self) { name in
                        PRow(name: name, time: d.displayTime(name), isNext: name == n.name, fontSize: 15)
                    }
                }

                Spacer(minLength: 0)

                DS.sep.frame(height: 1)
                    .padding(.vertical, 14)

                // Bottom next prayer card
                HStack(alignment: .center) {
                    // Big time
                    Text(d.displayTime(n.name))
                        .font(.system(size: 40, weight: .thin).monospacedDigit())
                        .foregroundStyle(DS.accent)
                    Spacer()
                    // Prayer name + remaining
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(n.ku)
                            .font(.system(size: 26, weight: .bold))
                            .foregroundStyle(DS.t1)
                        Text(remaining(n.time))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(DS.t2)
                    }
                }
                .padding(.horizontal, 4)
            }
            .padding(16)
        } else {
            NoDataView()
        }
    }
}

// MARK: — Lock screen widget

private struct LockView: View {
    let entry: PrayerEntry
    var body: some View {
        if let d = entry.data, let n = entry.next {
            HStack(spacing: 0) {
                Text(remaining(n.time))
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                    .padding(.trailing, 6)
                Spacer()
                Text(d.displayTime(n.name))
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                    .padding(.trailing, 5)
                Text(n.ku)
                    .font(.system(size: 14, weight: .bold))
            }
            .environment(\.layoutDirection, .rightToLeft)
        } else {
            Text("کاتا نوێژ").font(.system(size: 12)).foregroundStyle(.secondary)
        }
    }
}

// MARK: — Entry view routers

struct TafsirKurdWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:  ZStack { widgetGradient; SmallView(entry: entry) }
            case .systemMedium: ZStack { widgetGradient; MediumView(entry: entry) }
            case .systemLarge:  ZStack { widgetGradient; LargeView(entry: entry) }
            default:            ZStack { widgetGradient; SmallView(entry: entry) }
            }
        }
        .containerBGIfAvailable {
            widgetGradient
        }
        .environment(\.layoutDirection, .rightToLeft)
        .widgetURL(kDeepLink)
    }
}

struct TafsirKurdLockWidgetEntryView: View {
    let entry: PrayerEntry
    var body: some View {
        LockView(entry: entry)
            .containerBGIfAvailable { Color.clear }
            .widgetURL(kDeepLink)
    }
}

// MARK: — containerBackground compatibility

private extension View {
    @ViewBuilder
    func containerBGIfAvailable<B: View>(@ViewBuilder _ bg: () -> B) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget, content: bg)
        } else {
            self
        }
    }
}

// MARK: — Widget declarations

struct TafsirKurdWidget: Widget {
    let kind = "TafsirKurdWidget"
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
    let kind = "TafsirKurdLockWidget"
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
