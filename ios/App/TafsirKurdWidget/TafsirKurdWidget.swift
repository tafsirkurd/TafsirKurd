import WidgetKit
import SwiftUI

// MARK: — Shared constants

private let kAppGroup      = "group.com.tafsirkurd.app"
private let kDataKey       = "widgetPrayerData"
private let kPrayerOrder   = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
private let kKurdish: [String: String] = [
    "Fajr":    "فەجر",
    "Dhuhr":   "نیوەڕۆ",
    "Asr":     "ئەسر",
    "Maghrib": "ئاوابوون",
    "Isha":    "عیشا"
]
private let kDeepLink = URL(string: "tafsirkurd://prayer")!

// MARK: — Design tokens

private let accentGreen  = Color(red: 0.18, green: 0.49, blue: 0.31)
private let accentBg     = Color(red: 0.18, green: 0.49, blue: 0.31).opacity(0.16)
private let textPri      = Color.white
private let textSec      = Color.white.opacity(0.52)

@ViewBuilder private var widgetBg: some View {
    LinearGradient(
        colors: [
            Color(red: 0.05, green: 0.08, blue: 0.07),
            Color(red: 0.09, green: 0.12, blue: 0.10)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
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

    /// Parse stored "HH:mm" (or "HH:mm (TZ)") into a Date using Baghdad timezone.
    func prayerDate(_ name: String) -> Date? {
        guard let raw = timings[name] else { return nil }
        let hm    = String(raw.split(separator: " ").first ?? Substring(raw))
        let parts = hm.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return nil }

        var c = DateComponents()
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
            if let t = prayerDate(n), t > now {
                return (n, t, kKurdish[n] ?? n)
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
        var entries: [PrayerEntry] = [
            .init(date: now, data: data, next: data?.nextPrayer(from: now))
        ]
        // Add an entry at each upcoming prayer boundary so label flips to the next prayer
        for name in kPrayerOrder {
            if let t = data?.prayerDate(name), t > now {
                let after = t.addingTimeInterval(30)
                entries.append(.init(date: t, data: data, next: data?.nextPrayer(from: after)))
            }
        }
        // After all prayers pass, request a refresh in 6 h (app will have written next day's data)
        let policy: TimelineReloadPolicy = .after(
            entries.last?.date.addingTimeInterval(6 * 3600) ?? now.addingTimeInterval(6 * 3600)
        )
        completion(Timeline(entries: entries, policy: policy))
    }
}

// MARK: — Countdown helper

private func countdown(_ to: Date) -> String {
    let mins = max(0, Int(to.timeIntervalSinceNow / 60))
    guard mins > 0 else { return "ئێستا" }
    if mins < 60 { return "\(mins) خولەک" }
    let h = mins / 60; let m = mins % 60
    return m == 0 ? "\(h) کاتژمێر" : "\(h)ک \(m)خ"
}

// MARK: — Empty state

private struct EmptyState: View {
    var body: some View {
        VStack(spacing: 7) {
            Image(systemName: "moon.stars.fill")
                .font(.system(size: 26, weight: .ultraLight))
                .foregroundStyle(textSec)
            Text("کاتا نوێژ")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(textSec)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

// MARK: — Small widget view

private struct SmallView: View {
    let entry: PrayerEntry

    var body: some View {
        ZStack {
            widgetBg
            if let d = entry.data, let n = entry.next {
                VStack(alignment: .trailing, spacing: 0) {
                    // City chip
                    HStack(spacing: 3) {
                        Spacer()
                        Text(d.city)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(textSec)
                        Image(systemName: "location.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(accentGreen.opacity(0.85))
                    }
                    Spacer()
                    // Next prayer name — prominent
                    Text(n.ku)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(textPri)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    // Time
                    Text(d.displayTime(n.name))
                        .font(.system(size: 21, weight: .thin).monospacedDigit())
                        .foregroundStyle(textPri.opacity(0.78))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    Spacer()
                    // Countdown pill
                    HStack {
                        Spacer()
                        Text("لە " + countdown(n.time))
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(accentGreen)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(accentBg)
                            .clipShape(Capsule())
                    }
                }
                .padding(14)
            } else {
                EmptyState()
            }
        }
        .widgetURL(kDeepLink)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

// MARK: — Prayer row (medium widget)

private struct PrayerRowView: View {
    let name:    String
    let time:    String
    let isNext:  Bool

    var body: some View {
        HStack(spacing: 0) {
            Circle()
                .fill(isNext ? accentGreen : Color.clear)
                .frame(width: 5, height: 5)
                .padding(.trailing, 7)
            Text(kKurdish[name] ?? name)
                .font(.system(size: 13, weight: isNext ? .bold : .regular))
                .foregroundStyle(isNext ? textPri : textSec)
            Spacer()
            Text(time)
                .font(.system(size: 12, weight: isNext ? .semibold : .light).monospacedDigit())
                .foregroundStyle(isNext ? accentGreen : textSec)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(isNext ? accentBg : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
    }
}

// MARK: — Medium widget view

private struct MediumView: View {
    let entry: PrayerEntry

    var body: some View {
        ZStack {
            widgetBg
            if let d = entry.data, let n = entry.next {
                VStack(alignment: .trailing, spacing: 0) {
                    // Header row
                    HStack(alignment: .center) {
                        Text("لە " + countdown(n.time))
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(accentGreen)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 3)
                            .background(accentBg)
                            .clipShape(Capsule())
                        Spacer()
                        HStack(spacing: 4) {
                            Text(d.city)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(textSec)
                            Image(systemName: "location.fill")
                                .font(.system(size: 8))
                                .foregroundStyle(accentGreen.opacity(0.7))
                        }
                    }
                    .padding(.bottom, 8)

                    // Prayer list
                    VStack(spacing: 2) {
                        ForEach(kPrayerOrder, id: \.self) { name in
                            PrayerRowView(
                                name:   name,
                                time:   d.displayTime(name),
                                isNext: name == n.name
                            )
                        }
                    }
                }
                .padding(13)
            } else {
                EmptyState()
            }
        }
        .widgetURL(kDeepLink)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

// MARK: — Lock screen view (iOS 16+)

@available(iOSApplicationExtension 16.0, *)
private struct LockScreenView: View {
    let entry: PrayerEntry

    var body: some View {
        if let d = entry.data, let n = entry.next {
            HStack {
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 5) {
                        Text(d.displayTime(n.name))
                            .font(.system(size: 14, weight: .semibold).monospacedDigit())
                        Text(n.ku)
                            .font(.system(size: 14, weight: .bold))
                    }
                    Text("لە " + countdown(n.time))
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
            .widgetURL(kDeepLink)
            .environment(\.layoutDirection, .rightToLeft)
        } else {
            Text("کاتا نوێژ")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: — Entry view router

struct TafsirKurdWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerEntry

    var body: some View {
        switch family {
        case .systemSmall:  applyBg { SmallView(entry: entry) }
        case .systemMedium: applyBg { MediumView(entry: entry) }
        default:            applyBg { SmallView(entry: entry) }
        }
    }

    @ViewBuilder
    private func applyBg<V: View>(@ViewBuilder _ content: () -> V) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content().containerBackground(for: .widget) { widgetBg }
        } else {
            content()
        }
    }
}

struct TafsirKurdLockWidgetEntryView: View {
    let entry: PrayerEntry

    var body: some View {
        if #available(iOSApplicationExtension 17.0, *) {
            lockContent
                .containerBackground(for: .widget) { Color.clear }
        } else {
            lockContent
        }
    }

    @ViewBuilder private var lockContent: some View {
        if #available(iOSApplicationExtension 16.0, *) {
            LockScreenView(entry: entry)
        } else {
            EmptyState()
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
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@available(iOSApplicationExtension 16.0, *)
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

// MARK: — Widget bundle entry point

@main
struct TafsirKurdWidgetBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        TafsirKurdWidget()
        if #available(iOSApplicationExtension 16.0, *) {
            TafsirKurdLockWidget()
        }
    }
}
