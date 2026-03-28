package com.tafsirkurd.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

private val PRAYER_ORDER  = listOf("Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha")
private val NOTIF_PRAYERS = listOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")

// Maps prayer name → (nameViewId, timeViewId, rowViewId)
private val PRAYER_VIEW_IDS = mapOf(
    "Fajr"    to Triple(R.id.nameFajr,    R.id.timeFajr,    R.id.rowFajr),
    "Sunrise" to Triple(R.id.nameSunrise, R.id.timeSunrise, R.id.rowSunrise),
    "Dhuhr"   to Triple(R.id.nameDhuhr,   R.id.timeDhuhr,   R.id.rowDhuhr),
    "Asr"     to Triple(R.id.nameAsr,     R.id.timeAsr,     R.id.rowAsr),
    "Maghrib" to Triple(R.id.nameMaghrib, R.id.timeMaghrib, R.id.rowMaghrib),
    "Isha"    to Triple(R.id.nameIsha,    R.id.timeIsha,    R.id.rowIsha)
)

private fun nextPrayer(timings: Map<String, String>): Pair<String, String>? {
    val cal = Calendar.getInstance()
    val nowMin = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
    for (name in NOTIF_PRAYERS) {
        val raw = timings[name] ?: continue
        val parts = raw.split(":")
        if (parts.size < 2) continue
        val h = parts[0].toIntOrNull() ?: continue
        val m = parts[1].toIntOrNull() ?: continue
        if (h * 60 + m > nowMin) return Pair(name, raw)
    }
    return null
}

private fun kn(name: String, tr: Map<String, String>): String = when (name) {
    "Fajr"    -> tr["widget.prayer.fajr"]    ?: "سپێدە"
    "Sunrise" -> tr["widget.prayer.sunrise"] ?: "ڕوژهەلات"
    "Dhuhr"   -> tr["widget.prayer.dhuhr"]   ?: "نیڤرۆ"
    "Asr"     -> tr["widget.prayer.asr"]     ?: "ئێڤار"
    "Maghrib" -> tr["widget.prayer.maghrib"] ?: "مەغرەب"
    "Isha"    -> tr["widget.prayer.isha"]    ?: "عەیشا"
    else      -> name
}

class PrayerWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val views = buildViews(context)
        appWidgetIds.forEach { appWidgetManager.updateAppWidget(it, views) }
    }

    companion object {
        fun buildViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_prayer)
            val raw = WidgetDataStore.getString(context, "widget_prayer")
            val tr  = loadTranslations(context)

            if (raw == null) {
                views.setTextViewText(R.id.cityText, "")
                views.setTextViewText(R.id.hijriText, "")
                views.setTextViewText(R.id.nextPrayerName, tr["widget.prayer.no_data"] ?: "داتا نیە")
                views.setTextViewText(R.id.nextPrayerTime, "")
                return views
            }

            val obj = try { JSONObject(raw) } catch (_: Exception) { return views }
            val city  = obj.optString("city", "")
            val hijri = obj.optString("hijri", "")
            val tObj  = obj.optJSONObject("timings")
            val timings = PRAYER_ORDER.associate { it to (tObj?.optString(it, "") ?: "") }

            views.setTextViewText(R.id.cityText, city)
            views.setTextViewText(R.id.hijriText, hijri)

            val next = nextPrayer(timings)
            if (next != null) {
                views.setTextViewText(R.id.nextPrayerName, kn(next.first, tr))
                views.setTextViewText(R.id.nextPrayerTime, next.second)
                views.setViewVisibility(R.id.nextPrayerCard, View.VISIBLE)
            } else {
                views.setTextViewText(R.id.nextPrayerName, tr["widget.prayer.all_done"] ?: "نوێژ تەواو")
                views.setTextViewText(R.id.nextPrayerTime, "")
            }

            // Fill prayer rows
            PRAYER_ORDER.forEach { name ->
                val ids = PRAYER_VIEW_IDS[name] ?: return@forEach
                val time = timings[name] ?: ""
                val isNext = next?.first == name
                val textColor = if (isNext) Color.WHITE else Color.parseColor("#80FFFFFF")
                views.setTextViewText(ids.first, kn(name, tr))
                views.setTextViewText(ids.second, time)
                views.setTextColor(ids.first, textColor)
                views.setTextColor(ids.second, textColor)
            }

            return views
        }

        private fun loadTranslations(context: Context): Map<String, String> {
            val raw = WidgetDataStore.getString(context, "widgetTranslations") ?: return emptyMap()
            return try {
                val obj = JSONObject(raw).getJSONObject("keys")
                obj.keys().asSequence().associateWith { obj.getString(it) }
            } catch (_: Exception) { emptyMap() }
        }
    }
}
