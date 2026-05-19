// TafsirKurdWidgetTests.swift
// Compiled directly alongside WidgetLogic.swift — no module import needed.
// Run via the TafsirKurdWidgetTests target in Xcode or `xcodebuild test`.

import XCTest

final class WidgetLogicTests: XCTestCase {

    // MARK: — Helpers

    private func baghdadDate(_ dateStr: String, hour: Int, minute: Int) -> Date {
        let dp = dateStr.split(separator: "-").compactMap { Int($0) }
        var c = DateComponents()
        c.year = dp[0]; c.month = dp[1]; c.day = dp[2]
        c.hour = hour; c.minute = minute; c.second = 0
        c.timeZone = TimeZone(identifier: "Asia/Baghdad")
        return PrayerWidgetData.baghdadCal.date(from: c)!
    }

    private func makeData(
        date: String = "2026-05-19",
        timings: [String: String],
        tomorrow: [String: String]? = nil,
        tomorrowDate: String? = nil
    ) -> PrayerWidgetData {
        PrayerWidgetData(city: "Baghdad", date: date, hijri: "",
                         timings: timings, tomorrow: tomorrow, tomorrowDate: tomorrowDate,
                         lastUpdated: Date().timeIntervalSince1970 * 1000,
                         generatedAt: nil, validUntil: nil,
                         currentPrayer: nil, nextPrayer: nil)
    }

    private let sampleTimings: [String: String] = [
        "Fajr": "03:21", "Sunrise": "05:05", "Dhuhr": "12:05",
        "Asr": "15:30", "Maghrib": "19:10", "Isha": "20:40"
    ]

    private let tomorrowTimings: [String: String] = [
        "Fajr": "03:20", "Sunrise": "05:06", "Dhuhr": "12:05",
        "Asr": "15:29", "Maghrib": "19:11", "Isha": "20:41"
    ]

    // MARK: — formatPrayerTime

    func test_formatPrayerTime_midnight() {
        XCTAssertEqual(formatPrayerTime("00:00"), "12:00")
    }

    func test_formatPrayerTime_noon() {
        XCTAssertEqual(formatPrayerTime("12:00"), "12:00")
    }

    func test_formatPrayerTime_morning() {
        XCTAssertEqual(formatPrayerTime("03:21"), "3:21")
    }

    func test_formatPrayerTime_afternoon() {
        XCTAssertEqual(formatPrayerTime("13:30"), "1:30")
    }

    func test_formatPrayerTime_night() {
        XCTAssertEqual(formatPrayerTime("23:59"), "11:59")
    }

    func test_formatPrayerTime_stripsAmPmSuffix() {
        XCTAssertEqual(formatPrayerTime("05:15 AM"), "5:15")
        XCTAssertEqual(formatPrayerTime("06:30 PM"), "6:30")
    }

    // MARK: — PrayerWidgetData.prayerDate

    func test_prayerDate_parsesTimingToCorrectDate() {
        let d = makeData(timings: sampleTimings)
        let fajr = d.prayerDate("Fajr")
        XCTAssertNotNil(fajr)
        let expected = baghdadDate("2026-05-19", hour: 3, minute: 21)
        XCTAssertEqual(fajr, expected)
    }

    func test_prayerDate_tomorrow_usesTomorrowTimings() {
        let d = makeData(timings: sampleTimings, tomorrow: tomorrowTimings, tomorrowDate: "2026-05-20")
        let fajr = d.prayerDate("Fajr", dayOffset: 1)
        XCTAssertNotNil(fajr)
        let expected = baghdadDate("2026-05-20", hour: 3, minute: 20)
        XCTAssertEqual(fajr, expected)
    }

    // MARK: — effectiveNextPrayer

    func test_nextPrayer_beforeFajrReturnsFajr() {
        let now = baghdadDate("2026-05-19", hour: 3, minute: 0)
        let d   = makeData(timings: sampleTimings)
        XCTAssertEqual(effectiveNextPrayer(data: d, now: now)?.name, "Fajr")
    }

    func test_nextPrayer_afterFajrReturnsSunrise() {
        let now = baghdadDate("2026-05-19", hour: 3, minute: 30) // after Fajr 3:21
        let d   = makeData(timings: sampleTimings)
        XCTAssertEqual(effectiveNextPrayer(data: d, now: now)?.name, "Sunrise")
    }

    func test_nextPrayer_afterSunriseReturnsDhuhr() {
        let now = baghdadDate("2026-05-19", hour: 5, minute: 10) // after Sunrise 5:05
        let d   = makeData(timings: sampleTimings)
        XCTAssertEqual(effectiveNextPrayer(data: d, now: now)?.name, "Dhuhr")
    }

    func test_nextPrayer_afterIshaReturnsTomorrowFajr() {
        let now = baghdadDate("2026-05-19", hour: 21, minute: 0) // after Isha 20:40
        let d   = makeData(timings: sampleTimings, tomorrow: tomorrowTimings, tomorrowDate: "2026-05-20")
        let next = effectiveNextPrayer(data: d, now: now)
        XCTAssertEqual(next?.name, "Fajr")
        XCTAssertEqual(next?.time, baghdadDate("2026-05-20", hour: 3, minute: 20))
    }

    func test_nextPrayer_exactlyAtFajrTimeIsNotNext() {
        // Strict t > now: at exactly Fajr time, Fajr is NOT future (t == now)
        let now = baghdadDate("2026-05-19", hour: 3, minute: 21)
        let d   = makeData(timings: sampleTimings)
        XCTAssertEqual(effectiveNextPrayer(data: d, now: now)?.name, "Sunrise")
    }

    // MARK: — effectiveNext3

    func test_next3_beforeFajrReturnsFirstThree() {
        let now = baghdadDate("2026-05-19", hour: 3, minute: 0)
        let d   = makeData(timings: sampleTimings)
        let r   = effectiveNext3(data: d, now: now)
        XCTAssertEqual(r.count, 3)
        XCTAssertEqual(r[0].name, "Fajr")
        XCTAssertEqual(r[1].name, "Sunrise")
        XCTAssertEqual(r[2].name, "Dhuhr")
    }

    func test_next3_afterMaghribSpansIntoDayTwo() {
        let now = baghdadDate("2026-05-19", hour: 19, minute: 30) // after Maghrib 19:10
        let d   = makeData(timings: sampleTimings, tomorrow: tomorrowTimings, tomorrowDate: "2026-05-20")
        let r   = effectiveNext3(data: d, now: now)
        XCTAssertEqual(r.count, 3)
        XCTAssertEqual(r[0].name, "Isha")    // today's Isha still future
        XCTAssertEqual(r[1].name, "Fajr")   // tomorrow
        XCTAssertEqual(r[2].name, "Sunrise") // tomorrow
    }

    func test_next3_afterIshaAllFromTomorrow() {
        let now = baghdadDate("2026-05-19", hour: 21, minute: 0) // after Isha 20:40
        let d   = makeData(timings: sampleTimings, tomorrow: tomorrowTimings, tomorrowDate: "2026-05-20")
        let r   = effectiveNext3(data: d, now: now)
        XCTAssertEqual(r.count, 3)
        XCTAssertEqual(r[0].name, "Fajr")
        XCTAssertEqual(r[1].name, "Sunrise")
        XCTAssertEqual(r[2].name, "Dhuhr")
    }

    // MARK: — isStale

    func test_isStale_freshDataNotStale() {
        let d = makeData(timings: sampleTimings) // lastUpdated = now
        XCTAssertFalse(d.isStale)
    }

    func test_isStale_validUntilInFutureNotStale() {
        let futureMs = (Date().timeIntervalSince1970 + 3600) * 1000
        let d = PrayerWidgetData(city: "Baghdad", date: "2026-05-19", hijri: "",
                                 timings: sampleTimings, tomorrow: nil, tomorrowDate: nil,
                                 lastUpdated: nil, generatedAt: nil, validUntil: futureMs,
                                 currentPrayer: nil, nextPrayer: nil)
        XCTAssertFalse(d.isStale)
    }

    func test_isStale_validUntilInPastIsStale() {
        let pastMs = (Date().timeIntervalSince1970 - 3600) * 1000
        let d = PrayerWidgetData(city: "Baghdad", date: "2026-05-19", hijri: "",
                                 timings: sampleTimings, tomorrow: nil, tomorrowDate: nil,
                                 lastUpdated: nil, generatedAt: nil, validUntil: pastMs,
                                 currentPrayer: nil, nextPrayer: nil)
        XCTAssertTrue(d.isStale)
    }

    // MARK: — kDisplayOrder

    func test_kDisplayOrder_sunriseAtIndex1() {
        XCTAssertEqual(kDisplayOrder[1], "Sunrise",
                       "Sunrise must be at index 1 — Fajr→Sunrise transition depends on this")
    }

    func test_kDisplayOrder_hasSixPrayers() {
        XCTAssertEqual(kDisplayOrder.count, 6)
    }
}
