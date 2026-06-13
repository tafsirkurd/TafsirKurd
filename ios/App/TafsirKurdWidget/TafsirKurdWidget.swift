import WidgetKit
import SwiftUI

private let kDeepLink = URL(string: "tafsirkurd://prayer")!

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
    // Cached for the process lifetime; call reloadAccent() at the top of every
    // getTimeline/getSnapshot so theme changes are picked up on the next rebuild.
    private static let _accentLock = NSLock()
    private static var _accentCache: (Double, Double, Double)? = nil

    static func reloadAccent() {
        _accentLock.lock(); defer { _accentLock.unlock() }
        _accentCache = nil
    }

    private static func accentComponents() -> (Double, Double, Double) {
        _accentLock.lock(); defer { _accentLock.unlock() }
        if let c = _accentCache { return c }
        guard let ud  = kSharedUD,
              let hex = ud.string(forKey: "widgetAccentColor"), hex.count >= 7
        else { _accentCache = (0.14, 0.74, 0.41); return _accentCache! }
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard h.count == 6, let val = UInt64(h, radix: 16) else { _accentCache = (0.14, 0.74, 0.41); return _accentCache! }
        _accentCache = (
            Double((val >> 16) & 0xFF) / 255.0,
            Double((val >>  8) & 0xFF) / 255.0,
            Double( val        & 0xFF) / 255.0
        )
        return _accentCache!
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

// MARK: — Timeline entry

struct EntryDisplay {
    let hasData:       Bool
    let city:          String
    let hijri:         String
    let highlightName: String        // prayer name to bold/accent ("" = none)
    let nextKu:        String        // Kurdish name of next prayer
    let nextTime:      Date          // for LiveCountdown (.distantFuture if none)
    let nextDisplay:   String        // "6:23" formatted time
    let displayTimes:  [String: String]  // "Fajr" → "4:12" for all 6 prayers
    let gregorianDate: String        // "19 May 2026"
    let isTomorrow:    Bool

    static let empty = EntryDisplay(
        hasData: false, city: "", hijri: "", highlightName: "",
        nextKu: "", nextTime: .distantFuture, nextDisplay: "--:--",
        displayTimes: [:], gregorianDate: "", isTomorrow: false)

    static func make(
        data:    PrayerWidgetData,
        next:    (name: String, time: Date, ku: String)?,
        refDate: Date
    ) -> EntryDisplay {
        // isTomorrow: next prayer on different Baghdad day than refDate
        let refC = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: refDate)
        let isTom: Bool = {
            guard let nt = next?.time else { return false }
            let nc = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: nt)
            return nc.year != refC.year || nc.month != refC.month || nc.day != refC.day
        }()
        let displayTimings = isTom ? (data.tomorrow ?? data.timings) : data.timings

        var dtimes: [String: String] = [:]
        for name in kDisplayOrder {
            dtimes[name] = displayTimings[name].map { formatPrayerTime($0) } ?? "--:--"
        }
        let hl       = next?.name ?? ""
        let nDisplay = hl.isEmpty ? "--:--" : (dtimes[hl] ?? "--:--")

        var c = DateComponents()
        c.year = refC.year; c.month = refC.month; c.day = refC.day
        let gDate = Calendar(identifier: .gregorian).date(from: c)
            .map { _gregorianFmt.string(from: $0) } ?? ""

        return EntryDisplay(
            hasData: true, city: data.city, hijri: data.hijri,
            highlightName: hl, nextKu: next?.ku ?? "",
            nextTime: next?.time ?? .distantFuture, nextDisplay: nDisplay,
            displayTimes: dtimes, gregorianDate: gDate, isTomorrow: isTom)
    }
}

struct PrayerEntry: TimelineEntry {
    let date:    Date
    let data:    PrayerWidgetData?
    let next:    (name: String, time: Date, ku: String)?
    let reason:  String
    let display: EntryDisplay

    init(date: Date, data: PrayerWidgetData?,
         next: (name: String, time: Date, ku: String)?,
         reason: String = "unknown",
         display: EntryDisplay = .empty) {
        self.date    = date
        self.data    = data
        self.next    = next
        self.reason  = reason
        self.display = display
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
        // Fast path only — one UserDefaults read, no WT.reload(), no extended cache decode.
        // placeholder() is synchronous on the main render path; any heavy I/O here delays
        // the first visible frame. loadBestAvailableData() can fall through to a 90-day
        // JSON decode which is too slow here. getSnapshot/getTimeline handle the full load.
        let d = PrayerWidgetData.load()
        let next = d?.nextPrayer()
        let disp = d.map { EntryDisplay.make(data: $0, next: next, refDate: .now) } ?? .empty
        return .init(date: .now, data: d, next: next, reason: "placeholder", display: disp)
    }
    func getSnapshot(in _: Context, completion: @escaping (PrayerEntry) -> Void) {
        let snapStart = Date()
        WT.reload(); DS.reloadAccent()
        wLog.info("getSnapshot called")
        let d = loadBestAvailableData()
        let snapMs = Date().timeIntervalSince(snapStart) * 1000
        print("WIDGET SNAPSHOT DONE:", Date(), "ms:", String(format: "%.1f", snapMs))
        wLog.info("[WidgetSnapshot] done ms=\(String(format: "%.1f", snapMs))")
        let next = d?.nextPrayer()
        let disp = d.map { EntryDisplay.make(data: $0, next: next, refDate: .now) } ?? .empty
        completion(.init(date: .now, data: d, next: next, reason: "snapshot", display: disp))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        WT.reload(); DS.reloadAccent()
        let now        = Date()
        let buildStart = now
        let isLPM      = ProcessInfo.processInfo.isLowPowerModeEnabled
        let extBuild   = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        print("WIDGET GETTIMELINE REAL NOW:", Date(), "entry:", now)
        wLog.info("[WidgetTimeline] getTimeline called at \(now) lpm=\(isLPM) extBuild=\(extBuild) timelineVersion=\(kTimelineVersion)")

        // Timeline version guard: track bumps for diagnostics only.
        // We no longer discard the extended cache on version bump — the cache contains
        // prayer time DATA, not layout. Timeline entries are rebuilt fresh from that data
        // on every getTimeline() call, so new boundary logic is always applied immediately.
        // Discarding the cache on version bump was the primary cause of "widget breaks
        // 1-2 days after an app update while the phone is offline."
        if let ud = UserDefaults(suiteName: kAppGroup) {
            let stored = ud.integer(forKey: kTimelineVersionKey)
            if stored != kTimelineVersion {
                wLog.info("[WidgetTimeline] version \(stored) → \(kTimelineVersion) — tracking bump, keeping cache")
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

        // intendedCity: what city the USER has selected right now.
        // Written to App Group by pushWidgetIfStale/forceWidgetRefresh on every app open
        // and every city-settings change — even if prayer data for that city hasn't
        // been fetched yet (e.g., user changed city while offline).
        let intendedCity: String = {
            guard let ud = UserDefaults(suiteName: kAppGroup),
                  let c = ud.string(forKey: "widgetIntendedCity"), !c.isEmpty
            else { return legacyData?.city ?? "" }
            return c
        }()
        let currentCity = intendedCity

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

        // 1. Extended cache: multi-day autonomous path (45+ days, no network required)
        //    Reject if city doesn't match the user's selected city.
        if let ext = WidgetExtendedCache.load(), ext.isUsable {
            if !currentCity.isEmpty && ext.city != currentCity {
                // City changed. If legacy data has the new city, use it for 2-day bridge.
                // If legacy also has old city (user changed while offline → no new data yet),
                // show clean NoDataView — never render wrong-city prayer times.
                let legacyHasNewCity = legacyData?.city == currentCity
                if !legacyHasNewCity {
                    wLog.warning("[WidgetTimeline] city changed '\(ext.city)' → '\(currentCity)' offline, no new data — NoDataView 15 min")
                    completion(Timeline(
                        entries: [PrayerEntry(date: now, data: nil, next: nil, reason: "city_changed_no_data", display: .empty)],
                        policy: .after(now.addingTimeInterval(15 * 60))))
                    return
                }
                wLog.warning("[WidgetTimeline] extended cache city '\(ext.city)' ≠ current '\(currentCity)' — discard, legacy bridge")
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
                    "policyAtISO":      _iso8601Fmt.string(from: policyAt),
                    "nextPrayer":       nextName,
                    "lpm":              isLPM,
                    "buildMs":          buildMs,
                    "firstEntryReason": entries.first?.reason ?? "?",
                    "isOldCache":       true
                ], legacyData: legacyData)
                wLog.info("[WidgetTimeline] \(entries.count) entries zone1=\(zone1Entries) heartbeats=\(heartbeatCount) nextPrayer=\(nextName) sorted=\(isSorted) policy=\(fmtHMS(policyAt))")
                print("WIDGET GETTIMELINE DONE:", Date(), "ms:", String(format: "%.1f", buildMs), "entries:", entries.count, "source: cache")
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
            let fallbackDisp = fallback.map { EntryDisplay.make(data: $0, next: fallbackNext, refDate: now) } ?? .empty
            writeDiagnostics(["ts": Date().timeIntervalSince1970 * 1000, "source": "no_city", "status": "missingTimeline"])
            completion(Timeline(entries: [PrayerEntry(date: now, data: fallback, next: fallbackNext, reason: "no_city_retry", display: fallbackDisp)],
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
                    "policyAtISO":      _iso8601Fmt.string(from: policyAt),
                    "nextPrayer":       nextName,
                    "lpm":              isLPM,
                    "buildMs":          buildMs,
                    "firstEntryReason": entries.first?.reason ?? "?",
                    "isOldCache":       false
                ], legacyData: legacyData)
                wLog.info("[WidgetTimeline] fetched \(entries.count) entries nextPrayer=\(nextName) policy=\(fmtHMS(policyAt))")
                print("WIDGET GETTIMELINE DONE:", Date(), "ms:", String(format: "%.1f", buildMs), "entries:", entries.count, "source: fetch")
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
        let fallbackDisp = fallback.map { EntryDisplay.make(data: $0, next: fallbackNext, refDate: now) } ?? .empty
        return ([.init(date: now, data: fallback, next: fallbackNext, reason: "no_data_retry", display: fallbackDisp)], retry)
    }

    // Pre-build a flat sorted array of all (time, name) pairs for the next 30 days.
    // Replaces repeated ext.nextPrayer() calls — each of which internally called
    // futureDays() (filter+sort of 90 keys) for every boundary offset and heartbeat.
    // With ~276 nextPrayer calls per timeline build, that was 276 sorts; now just one.
    var allPrayerTimes: [(time: Date, name: String)] = []
    for dateStr in futureDates.prefix(30) {
        for name in kDisplayOrder {
            if let t = ext.prayerDate(name, for: dateStr) {
                allPrayerTimes.append((t, name))
            }
        }
    }
    allPrayerTimes.sort { $0.time < $1.time }
    func fastNext(after t: Date) -> (name: String, time: Date, ku: String)? {
        for p in allPrayerTimes where p.time > t { return (p.name, p.time, kn(p.name)) }
        return nil
    }

    // Entry covering "right now" — establishes the initial display state
    let nowNext = fastNext(after: now)
    entries.append(.init(date: now, data: todayData, next: nowNext, reason: "now",
                         display: todayData.map { EntryDisplay.make(data: $0, next: nowNext, refDate: now) } ?? .empty))

    // Zone cutoffs for tiered safety offsets
    let zone1End = now.addingTimeInterval(48 * 3600)     // 0–48 h: full offsets [+5 s, +60 s, +5 min]
    let zone2End = now.addingTimeInterval(7 * 24 * 3600) // 48 h–7 d: lean offset [+5 s only]
    // Beyond 7 d (zone 3): exact boundary time only

    // Prayer-boundary entries across the next 30 days + midnight anchors.
    // Zone 1 (0-48 h): 7 dense offset entries per prayer (+5s/30s/60s/5m/10m/15m/20m).
    // Zone 2 (48 h – 7 d): 1 lean offset per prayer (+5 s).
    // Zone 3 (7 d – 30 d, days 8-30): exact boundary time only, no offsets.
    // ~517 total entries; iOS trims the far-future Zone 3 tail if it exceeds its cap
    // (~400). Nightly Widget rebuild restores the trimmed tail each day.
    var boundaryCount = 0
    for dateStr in futureDates.prefix(30) {
        let dayData = syntheticData(from: ext, dateStr: dateStr) ?? todayData

        for name in kDisplayOrder {
            guard let t = ext.prayerDate(name, for: dateStr), t > now else { continue }
            let next = fastNext(after: t.addingTimeInterval(30))
            let isZone2 = t >= zone1End && t < zone2End
            entries.append(.init(date: t, data: dayData, next: next,
                                 reason: isZone2 ? "zone2_boundary_\(name.lowercased())" : "boundary_\(name.lowercased())",
                                 display: dayData.map { EntryDisplay.make(data: $0, next: next, refDate: t) } ?? .empty))
            boundaryCount += 1

            // Zone 1: dense post-prayer offsets so iOS throttling skips at most 20 min.
            let offsets: [TimeInterval] = t < zone1End ? [5.0, 30.0, 60.0, 300.0, 600.0, 900.0, 1200.0] :
                                          t < zone2End ? [5.0]                                             : []
            let offsetLabels: [TimeInterval: String] = [5.0: "plus5s", 30.0: "plus30s", 60.0: "plus60s", 300.0: "plus5m", 600.0: "plus10m", 900.0: "plus15m", 1200.0: "plus20m"]
            for off in offsets {
                let st = t.addingTimeInterval(off)
                guard st > now else { continue }
                let sNext = fastNext(after: st.addingTimeInterval(30))
                let label = offsetLabels[off] ?? "plus\(Int(off))s"
                entries.append(.init(date: st, data: dayData, next: sNext,
                                     reason: "boundary_\(name.lowercased())_\(label)",
                                     display: dayData.map { EntryDisplay.make(data: $0, next: sNext, refDate: st) } ?? .empty))
            }
        }

        let dp = dateStr.split(separator: "-").compactMap { Int($0) }
        if dp.count == 3 {
            var mc = DateComponents()
            mc.year = dp[0]; mc.month = dp[1]; mc.day = dp[2]
            mc.hour = 0; mc.minute = 0; mc.second = 1
            mc.timeZone = TimeZone(identifier: "Asia/Baghdad")
            if let midnight = PrayerWidgetData.baghdadCal.date(from: mc), midnight > now {
                let nextAtMid = fastNext(after: midnight)
                entries.append(.init(date: midnight, data: dayData, next: nextAtMid, reason: "midnight",
                                     display: dayData.map { EntryDisplay.make(data: $0, next: nextAtMid, refDate: midnight) } ?? .empty))
            }
        }
    }

    // ── Zone 1 heartbeats: every 15 min for the next 48 hours ────────────────
    // Hard reliability guarantee: even if iOS skips all prayer-boundary entries,
    // a heartbeat fires within 15 min. effectiveNextPrayer() re-derives from the
    // real clock at render time so staleness is bounded to ≤ 15 min.
    var hTick = now.addingTimeInterval(15 * 60)
    let hEnd  = now.addingTimeInterval(48 * 3600)
    var heartbeatCount = 0
    while hTick <= hEnd {
        let hComps = PrayerWidgetData.baghdadCal.dateComponents([.year, .month, .day], from: hTick)
        if let hy = hComps.year, let hm = hComps.month, let hd = hComps.day {
            let hDateStr = String(format: "%04d-%02d-%02d", hy, hm, hd)
            let hData    = syntheticData(from: ext, dateStr: hDateStr) ?? todayData
            let hNext    = fastNext(after: hTick)
            entries.append(.init(date: hTick, data: hData, next: hNext, reason: "heartbeat",
                                 display: hData.map { EntryDisplay.make(data: $0, next: hNext, refDate: hTick) } ?? .empty))
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
        completion(Timeline(entries: [PrayerEntry(date: now, data: nil, next: nil, reason: "no_data_retry", display: .empty)],
                            policy: .after(now.addingTimeInterval(3 * 60))))
        return
    }
    let ageH = data.lastUpdated.map { (now.timeIntervalSince1970 * 1000 - $0) / 3_600_000 } ?? 0
    if data.isStale {
        // If the stored date is a different Baghdad calendar day, prayer times are for the wrong
        // day — showing them causes "only blank/countdown" because nextPrayer() returns nil
        // (all stored times are in the past). Show the clean NoDataView instead.
        let todayBaghdad = PrayerWidgetData.baghdadDateString()
        let isWrongDay   = data.date != todayBaghdad
        wLog.warning("buildLegacyTimeline: STALE ageH=\(String(format:"%.1f",ageH)) wrongDay=\(isWrongDay) storedDate=\(data.date) today=\(todayBaghdad)")
        if isWrongDay {
            // Wrong-day stale: showing yesterdays times is misleading. Use clean empty state.
            completion(Timeline(entries: [PrayerEntry(date: now, data: nil, next: nil, reason: "stale_wrongday", display: .empty)],
                                policy: .after(now.addingTimeInterval(30 * 60))))
            return
        }
        // Same-day stale (e.g., data from this morning, validUntil just passed):
        // show the times — they're still today's and likely correct. nextPrayer() re-derives
        // the highlighted prayer from wall-clock Date() so the highlight stays accurate.
        let staleNext = data.nextPrayer(from: now)
        let staleDisp = EntryDisplay.make(data: data, next: staleNext, refDate: now)
        completion(Timeline(entries: [PrayerEntry(date: now, data: data, next: staleNext, reason: "stale_legacy", display: staleDisp)],
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
    let entries = allRaw.map { raw in
        PrayerEntry(date: raw.date, data: data, next: raw.next, reason: raw.reason,
                    display: EntryDisplay.make(data: data, next: raw.next, refDate: raw.date))
    }

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
                                      gen: Date().timeIntervalSince1970 * 1000,
                                      validUntil: nil, days: allDays)
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

private let _iso8601Fmt = ISO8601DateFormatter()

private let _gregorianFmt: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "d MMM yyyy"
    f.locale = Locale(identifier: "en_US")
    return f
}()

private func gregorianDisplay(_ dateISO: String) -> String {
    let parts = dateISO.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return dateISO }
    var c = DateComponents()
    c.year = parts[0]; c.month = parts[1]; c.day = parts[2]
    guard let d = Calendar(identifier: .gregorian).date(from: c) else { return dateISO }
    return _gregorianFmt.string(from: d)
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

// MARK: — Small widget

private struct SmallView: View {
    let entry: PrayerEntry
    var body: some View {
        let ds = entry.display
        if ds.hasData {
            VStack(alignment: .trailing, spacing: 0) {
                CityLabel(city: ds.city)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Spacer()
                Text(ds.nextKu)
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(DS.t1)
                    .lineLimit(1).minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Text(ds.nextDisplay)
                    .font(.system(size: 22, weight: .ultraLight).monospacedDigit())
                    .foregroundStyle(DS.accent)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                if ds.nextTime < .distantFuture {
                    LiveCountdown(to: ds.nextTime)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .padding(.top, 2)
                }
                Spacer()
            }
            .padding(12)
            .overlay(alignment: .bottomLeading) {
                if kWidgetDebug {
                    Text("b:\(Bundle.main.object(forInfoDictionaryKey:"CFBundleVersion") as? String ?? "?") sm [\(String(entry.reason.prefix(8)))] next:\(ds.highlightName)")
                        .font(.system(size: 5).monospacedDigit())
                        .foregroundStyle(Color.white.opacity(0.18))
                        .lineLimit(1).minimumScaleFactor(0.4)
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
        let ds = entry.display
        if ds.hasData {
            VStack(spacing: 0) {
                HStack(alignment: .center, spacing: 0) {
                    if ds.nextTime < .distantFuture {
                        LiveCountdown(to: ds.nextTime)
                    }
                    Spacer(minLength: 6)
                    CityLabel(city: ds.city)
                }
                .padding(.bottom, 3)
                VStack(spacing: 0) {
                    ForEach(kDisplayOrder, id: \.self) { name in
                        PRow(name: name,
                             time: ds.displayTimes[name] ?? "--:--",
                             isNext: name == ds.highlightName,
                             compact: true)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .overlay(alignment: .bottomLeading) {
                if kWidgetDebug {
                    Text("b:\(Bundle.main.object(forInfoDictionaryKey:"CFBundleVersion") as? String ?? "?") md [\(String(entry.reason.prefix(8)))] next:\(ds.highlightName)")
                        .font(.system(size: 5).monospacedDigit())
                        .foregroundStyle(Color.white.opacity(0.18))
                        .lineLimit(1).minimumScaleFactor(0.4)
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
        let ds = entry.display
        if ds.hasData {
            VStack(spacing: 0) {
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 3) {
                        if ds.nextTime < .distantFuture {
                            LiveCountdown(to: ds.nextTime)
                        }
                        Text(ds.gregorianDate)
                            .font(.system(size: 10))
                            .foregroundStyle(DS.t3)
                    }
                    Spacer()
                    Text(ds.city)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(DS.t1)
                }
                .padding(.bottom, 14)
                DS.sep.frame(height: 1).padding(.bottom, 10)
                VStack(spacing: 3) {
                    ForEach(kDisplayOrder, id: \.self) { name in
                        PRow(name: name,
                             time: ds.displayTimes[name] ?? "--:--",
                             isNext: name == ds.highlightName,
                             fontSize: 15)
                    }
                }
                Spacer(minLength: 0)
                DS.sep.frame(height: 1).padding(.vertical, 14)
                HStack(alignment: .center) {
                    Text(ds.highlightName.isEmpty ? "--:--" : (ds.displayTimes[ds.highlightName] ?? "--:--"))
                        .font(.system(size: 40, weight: .thin).monospacedDigit())
                        .foregroundStyle(DS.accent.opacity(0.82))
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(ds.nextKu)
                            .font(.system(size: 26, weight: .bold))
                            .foregroundStyle(DS.t1)
                        if ds.nextTime < .distantFuture {
                            LiveCountdown(to: ds.nextTime, fontSize: 10)
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
            .padding(14)
            .overlay(alignment: .bottomLeading) {
                if kWidgetDebug {
                    Text("b:\(Bundle.main.object(forInfoDictionaryKey:"CFBundleVersion") as? String ?? "?") lg [\(String(entry.reason.prefix(8)))] next:\(ds.highlightName)")
                        .font(.system(size: 5).monospacedDigit())
                        .foregroundStyle(Color.white.opacity(0.18))
                        .lineLimit(1).minimumScaleFactor(0.4)
                        .padding(4)
                }
            }
        } else {
            NoDataView()
        }
    }
}

// Debug overlay: visible in DEBUG builds only (Xcode simulator/device).
// TestFlight and App Store builds are silent.
private let kWidgetDebug: Bool = {
    #if DEBUG
    return true
    #else
    return false
    #endif
}()

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
        WT.reload(); DS.reloadAccent()
        completion(.init(date: .now, data: AyahWidgetData.load()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<AyahEntry>) -> Void) {
        WT.reload(); DS.reloadAccent()
        let now = Date()
        let e   = AyahEntry(date: now, data: AyahWidgetData.load())
        // 6h policy — app calls reloadTimelines when ayah changes, so hourly polling is wasteful
        completion(Timeline(entries: [e], policy: .after(now.addingTimeInterval(6 * 3600))))
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
        WT.reload(); DS.reloadAccent()
        completion(.init(date: .now, data: GoalWidgetData.load()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<GoalEntry>) -> Void) {
        WT.reload(); DS.reloadAccent()
        let now = Date()
        let e   = GoalEntry(date: now, data: GoalWidgetData.load())
        // 2h policy — app calls reloadTimelines when goal data changes, so 30-min polling is wasteful
        completion(Timeline(entries: [e], policy: .after(now.addingTimeInterval(2 * 3600))))
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

// MARK: — Lock widget: dedicated minimal provider + entry + view
//
// TafsirKurdLockWidget must NOT share PrayerProvider.
// WidgetKit accessory (lock-screen) widgets have a much smaller CPU/memory
// budget than home-screen widgets. Heavy work in a shared provider
// (network fetch, JSON decode of 90-day cache, multiple wLog calls)
// can cause the lock widget to stay in placeholder/skeleton state for an hour.
//
// This provider does:
//   • One UserDefaults read (PrayerWidgetData.load) — no network, no extended cache
//   • Builds entries at each prayer boundary for today + tomorrow
//   • All display values precomputed in buildEntry() — body is purely declarative

struct LockPrayerEntry: TimelineEntry {
    let date:          Date
    let city:          String
    let nextNameKu:    String   // prayer 1 — highlighted
    let nextTimeStr:   String
    let nextTime:      Date     // prayer 1 Date — for live Text(.timer) countdown
    let next2NameKu:   String   // prayer 2
    let next2TimeStr:  String
    let next3NameKu:   String   // prayer 3
    let next3TimeStr:  String
    let version:       Int

    static var placeholder: LockPrayerEntry {
        LockPrayerEntry(date: .now, city: "", nextNameKu: "نمازی",
                        nextTimeStr: "--:--", nextTime: .distantFuture,
                        next2NameKu: "", next2TimeStr: "",
                        next3NameKu: "", next3TimeStr: "", version: kTimelineVersion)
    }
}


struct LockPrayerProvider: TimelineProvider {

    func placeholder(in _: Context) -> LockPrayerEntry {
        return LockPrayerEntry.placeholder
    }

    func getSnapshot(in _: Context, completion: @escaping (LockPrayerEntry) -> Void) {
        WT.reload(); DS.reloadAccent()
        wLog.info("[LOCK] snapshot start")
        let entry = buildEntry(at: Date(), reason: "snapshot")
        wLog.info("[LOCK] snapshot done nextName=\(entry.nextNameKu) time=\(entry.nextTimeStr)")
        completion(entry)
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<LockPrayerEntry>) -> Void) {
        WT.reload(); DS.reloadAccent()
        wLog.info("[LOCK] timeline start")
        let now = Date()
        guard let data = PrayerWidgetData.load() else {
            wLog.warning("[LOCK] timeline no data — retry 30 min")
            completion(Timeline(entries: [LockPrayerEntry.placeholder],
                                policy: .after(now.addingTimeInterval(30 * 60))))
            return
        }

        // ── Single-pass: build flat sorted prayer list for today + tomorrow ──────
        // This is done ONCE here instead of calling effectiveNext3() per entry
        // (which would re-parse dates 12× per entry × ~12 entries = ~144 date ops).
        struct PInfo { let name: String; let ku: String; let display: String; let date: Date }
        var upcoming: [PInfo] = []
        for offset in 0...1 {
            let src = offset == 0 ? data.timings : (data.tomorrow ?? data.timings)
            for name in kDisplayOrder {
                guard let t = data.prayerDate(name, dayOffset: offset), let raw = src[name] else { continue }
                upcoming.append(PInfo(name: name, ku: kn(name), display: formatPrayerTime(raw), date: t))
            }
        }
        upcoming.sort { $0.date < $1.date }

        // Helper: build one entry given the index of the highlighted prayer
        func make(at date: Date, fromIdx i: Int) -> LockPrayerEntry {
            let p1 = i     < upcoming.count ? upcoming[i]     : nil
            let p2 = i + 1 < upcoming.count ? upcoming[i + 1] : nil
            let p3 = i + 2 < upcoming.count ? upcoming[i + 2] : nil
            return LockPrayerEntry(
                date:         date,
                city:         data.city,
                nextNameKu:   p1?.ku      ?? kn("Fajr"),
                nextTimeStr:  p1?.display ?? "--:--",
                nextTime:     p1?.date    ?? .distantFuture,
                next2NameKu:  p2?.ku      ?? "",
                next2TimeStr: p2?.display ?? "",
                next3NameKu:  p3?.ku      ?? "",
                next3TimeStr: p3?.display ?? "",
                version:      kTimelineVersion
            )
        }

        // ── Current state entry ───────────────────────────────────────────────────
        // nowIdx: index of the first prayer whose time is strictly in the future
        let nowIdx = upcoming.firstIndex(where: { $0.date > now }) ?? upcoming.count
        var entries: [LockPrayerEntry] = [make(at: now, fromIdx: nowIdx)]

        // ── One entry per prayer boundary (no heartbeats needed — view is pure) ──
        // At prayer[i]'s time it becomes "current" → highlighted advances to prayer[i+1].
        for i in nowIdx..<upcoming.count {
            entries.append(make(at: upcoming[i].date, fromIdx: i + 1))
        }

        // Rebuild at Baghdad midnight of day+2 (always after tomorrow's last prayer).
        // Avoids the previous 60s spin-retry after Isha when no data for day+2 exists yet.
        let policyAt = PrayerWidgetData.baghdadMidnight(daysAhead: 2).addingTimeInterval(5 * 60)
        wLog.info("[LOCK] timeline done entries=\(entries.count) firstNext=\(upcoming.count > nowIdx ? upcoming[nowIdx].name : "?") policy=\(fmtHMS(policyAt))")
        completion(Timeline(entries: entries, policy: .after(policyAt)))
    }

    /// Build one minimal entry. `data` may be passed in from getTimeline to avoid
    /// repeated UserDefaults reads; when nil it is loaded fresh (snapshot / error paths).
    private func buildEntry(at date: Date, data: PrayerWidgetData? = nil, reason: String) -> LockPrayerEntry {
        guard let d = data ?? PrayerWidgetData.load() else { return LockPrayerEntry.placeholder }

        // effectiveNext3 returns up to 3 upcoming prayers in display order (strict t > date).
        // All display values (Kurdish name + 12h time string) are precomputed here so
        // the view body stays 100% pure — no date math, no UserDefaults.
        let n3 = effectiveNext3(data: d, now: date)

        guard let first = n3.first else {
            wLog.warning("[LOCK] buildEntry(\(reason)) no next prayer found")
            return LockPrayerEntry(date: date, city: d.city,
                                   nextNameKu: kn("Fajr"), nextTimeStr: "--:--",
                                   nextTime: .distantFuture,
                                   next2NameKu: "", next2TimeStr: "",
                                   next3NameKu: "", next3TimeStr: "",
                                   version: kTimelineVersion)
        }

        // Resolve the actual Date of prayer 1 for the live countdown.
        let firstDate: Date = {
            for offset in 0...1 {
                if let t = d.prayerDate(first.name, dayOffset: offset), t > date { return t }
            }
            return .distantFuture
        }()

        wLog.info("[LOCK] snapshot entry next=\(first.name)")
        return LockPrayerEntry(
            date:         date,
            city:         d.city,
            nextNameKu:   first.ku,
            nextTimeStr:  first.display,
            nextTime:     firstDate,
            next2NameKu:  n3.count > 1 ? n3[1].ku : "",
            next2TimeStr: n3.count > 1 ? n3[1].display : "",
            next3NameKu:  n3.count > 2 ? n3[2].ku : "",
            next3TimeStr: n3.count > 2 ? n3[2].display : "",
            version:      kTimelineVersion
        )
    }
}

/// Lock-screen view: 3 upcoming prayers, first row highlighted.
/// Body is 100% pure: reads precomputed entry values only — no logging,
/// no UserDefaults, no date math, no heavy computation.
private struct LockMinimalView: View {
    let entry: LockPrayerEntry

    var body: some View {
        VStack(alignment: .trailing, spacing: 5) {
            // Row 1 — highlighted (next upcoming prayer)
            HStack(spacing: 4) {
                Text(entry.nextNameKu)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AnyShapeStyle(.primary))
                    .lineLimit(1)
                Spacer(minLength: 4)
                if entry.nextTime < .distantFuture {
                    Text(entry.nextTime, style: .timer)
                        .font(.system(size: 11).monospacedDigit())
                        .foregroundStyle(AnyShapeStyle(.secondary))
                        .lineLimit(1)
                }
                Text(entry.nextTimeStr)
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                    .foregroundStyle(AnyShapeStyle(.primary))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            // Row 2 — second upcoming prayer
            if !entry.next2NameKu.isEmpty {
                HStack(spacing: 4) {
                    Text(entry.next2NameKu)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(AnyShapeStyle(.secondary))
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Text(entry.next2TimeStr)
                        .font(.system(size: 12, weight: .regular).monospacedDigit())
                        .foregroundStyle(AnyShapeStyle(.secondary))
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)
            }
            // Row 3 — third upcoming prayer
            if !entry.next3NameKu.isEmpty {
                HStack(spacing: 4) {
                    Text(entry.next3NameKu)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(AnyShapeStyle(.secondary))
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Text(entry.next3TimeStr)
                        .font(.system(size: 12, weight: .regular).monospacedDigit())
                        .foregroundStyle(AnyShapeStyle(.secondary))
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
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
        // Uses LockPrayerProvider — NOT PrayerProvider.
        // Lock widgets run under a much tighter budget; the shared provider's
        // network fetch and 90-day cache work exceeds that budget and causes
        // the widget to stay in placeholder/skeleton state for ~1 hour.
        StaticConfiguration(kind: kind, provider: LockPrayerProvider()) { entry in
            LockMinimalView(entry: entry)
                .widgetBackground { Color.clear }
                .widgetURL(kDeepLink)
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
