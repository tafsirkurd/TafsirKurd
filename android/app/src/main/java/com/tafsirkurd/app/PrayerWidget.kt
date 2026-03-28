package com.tafsirkurd.app

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.*
import org.json.JSONObject
import java.util.Calendar

private val WBg1    = Color(0xFF0E100E)
private val WBg2    = Color(0xFF161A16)
private val WAccent = Color(0xFF23BD69)
private val WT1     = Color(0xFFFFFFFF)
private val WT2     = Color(0x80FFFFFF.toInt())
private val WT3     = Color(0x47FFFFFF.toInt())

private val PRAYER_ORDER  = listOf("Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha")
private val NOTIF_PRAYERS = listOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")

private data class PrayerData(
    val city: String,
    val hijri: String,
    val timings: Map<String, String>,
    val translations: Map<String, String>
)

private fun loadPrayerData(context: Context): PrayerData? {
    val raw = WidgetDataStore.getString(context, "widget_prayer") ?: return null
    return try {
        val obj = JSONObject(raw)
        val t = obj.getJSONObject("timings")
        val timings = PRAYER_ORDER.associate { it to (t.optString(it, "")) }
        PrayerData(
            city   = obj.optString("city", ""),
            hijri  = obj.optString("hijri", ""),
            timings = timings,
            translations = loadPrayerTranslations(context)
        )
    } catch (_: Exception) { null }
}

private fun loadPrayerTranslations(context: Context): Map<String, String> {
    val raw = WidgetDataStore.getString(context, "widgetTranslations") ?: return emptyMap()
    return try {
        val obj = JSONObject(raw).getJSONObject("keys")
        obj.keys().asSequence().associateWith { obj.getString(it) }
    } catch (_: Exception) { emptyMap() }
}

private fun Map<String, String>.pt(key: String, fallback: String) = this[key] ?: fallback

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

private fun kn(name: String, tr: Map<String, String>) = when (name) {
    "Fajr"    -> tr.pt("widget.prayer.fajr",    "سپێدە")
    "Sunrise" -> tr.pt("widget.prayer.sunrise",  "ڕوژهەلات")
    "Dhuhr"   -> tr.pt("widget.prayer.dhuhr",   "نیڤرۆ")
    "Asr"     -> tr.pt("widget.prayer.asr",     "ئێڤار")
    "Maghrib" -> tr.pt("widget.prayer.maghrib",  "مەغرەب")
    "Isha"    -> tr.pt("widget.prayer.isha",    "عەیشا")
    else      -> name
}

class PrayerWidget : GlanceAppWidget() {

    companion object {
        private val SMALL  = DpSize(110.dp, 110.dp)
        private val MEDIUM = DpSize(220.dp, 110.dp)
        private val LARGE  = DpSize(220.dp, 220.dp)
    }

    override val sizeMode = SizeMode.Responsive(setOf(SMALL, MEDIUM, LARGE))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { PrayerContent() }
    }

    @Composable
    private fun PrayerContent() {
        val context = LocalContext.current
        val size    = LocalSize.current
        val data    = loadPrayerData(context)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(WBg1)
                .padding(0.dp)
        ) {
            if (data == null) {
                EmptyState()
            } else when {
                size.width < 200.dp  -> SmallContent(data)
                size.height < 200.dp -> MediumContent(data)
                else                 -> LargeContent(data)
            }
        }
    }

    @Composable
    private fun EmptyState() {
        Box(
            contentAlignment = Alignment.Center,
            modifier = GlanceModifier.fillMaxSize()
        ) {
            Text(
                text = "کاتا نوێژ",
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(WT3),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
            )
        }
    }

    @Composable
    private fun SmallContent(data: PrayerData) {
        val next = nextPrayer(data.timings)
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalAlignment = Alignment.CenterVertically,
            modifier = GlanceModifier.fillMaxSize().padding(10.dp)
        ) {
            if (next != null) {
                Text(
                    text = kn(next.first, data.translations),
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(WAccent),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center
                    )
                )
                Spacer(GlanceModifier.height(4.dp))
                Text(
                    text = next.second,
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(WT1),
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                )
                Spacer(GlanceModifier.height(6.dp))
                Text(
                    text = data.city,
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(WT3),
                        fontSize = 11.sp,
                        textAlign = TextAlign.Center
                    )
                )
            } else {
                Text(
                    text = data.translations.pt("widget.prayer.all_done", "نوێژ تەواو"),
                    style = TextStyle(
                        color = androidx.glance.unit.ColorProvider(WAccent),
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                )
            }
        }
    }

    @Composable
    private fun MediumContent(data: PrayerData) {
        val next = nextPrayer(data.timings)
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 10.dp, vertical = 8.dp)
        ) {
            Row(
                horizontalAlignment = Alignment.End,
                modifier = GlanceModifier.fillMaxWidth()
            ) {
                Text(
                    text = data.city,
                    style = TextStyle(color = androidx.glance.unit.ColorProvider(WAccent), fontSize = 11.sp, fontWeight = FontWeight.Medium)
                )
                Spacer(GlanceModifier.defaultWeight())
                Text(
                    text = data.hijri,
                    style = TextStyle(color = androidx.glance.unit.ColorProvider(WT3), fontSize = 10.sp)
                )
            }
            Spacer(GlanceModifier.height(6.dp))
            if (next != null) {
                Row(
                    horizontalAlignment = Alignment.End,
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .background(WAccent)
                        .cornerRadius(10.dp)
                        .padding(horizontal = 12.dp, vertical = 7.dp)
                ) {
                    Text(
                        text = kn(next.first, data.translations),
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(WT1), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    )
                    Spacer(GlanceModifier.defaultWeight())
                    Text(
                        text = next.second,
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(WT1), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    )
                }
                Spacer(GlanceModifier.height(4.dp))
            }
            val nextIdx = if (next != null) NOTIF_PRAYERS.indexOf(next.first) + 1 else 0
            NOTIF_PRAYERS.drop(nextIdx).take(3).forEach { name ->
                val time = data.timings[name] ?: return@forEach
                PrayerRow(kn(name, data.translations), time, false)
            }
        }
    }

    @Composable
    private fun LargeContent(data: PrayerData) {
        val next = nextPrayer(data.timings)
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 10.dp, vertical = 8.dp)
        ) {
            Row(
                horizontalAlignment = Alignment.End,
                modifier = GlanceModifier.fillMaxWidth()
            ) {
                Text(
                    text = data.city,
                    style = TextStyle(color = androidx.glance.unit.ColorProvider(WAccent), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                )
                Spacer(GlanceModifier.defaultWeight())
                Text(
                    text = data.hijri,
                    style = TextStyle(color = androidx.glance.unit.ColorProvider(WT3), fontSize = 10.sp)
                )
            }
            Spacer(GlanceModifier.height(6.dp))
            if (next != null) {
                Row(
                    horizontalAlignment = Alignment.End,
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .background(WAccent)
                        .cornerRadius(10.dp)
                        .padding(horizontal = 12.dp, vertical = 9.dp)
                ) {
                    Text(
                        text = kn(next.first, data.translations),
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(WT1), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    )
                    Spacer(GlanceModifier.defaultWeight())
                    Text(
                        text = next.second,
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(WT1), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    )
                }
                Spacer(GlanceModifier.height(4.dp))
            }
            PRAYER_ORDER.forEach { name ->
                val time = data.timings[name] ?: return@forEach
                PrayerRow(kn(name, data.translations), time, next?.first == name)
            }
        }
    }

    @Composable
    private fun PrayerRow(name: String, time: String, highlight: Boolean) {
        Row(
            horizontalAlignment = Alignment.End,
            modifier = GlanceModifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 3.dp)
        ) {
            Text(
                text = name,
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(if (highlight) WT1 else WT2),
                    fontSize = 12.sp,
                    fontWeight = if (highlight) FontWeight.Bold else FontWeight.Normal
                )
            )
            Spacer(GlanceModifier.defaultWeight())
            Text(
                text = time,
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(if (highlight) WT1 else WT2),
                    fontSize = 12.sp,
                    fontWeight = if (highlight) FontWeight.Bold else FontWeight.Normal
                )
            )
        }
    }
}

class PrayerWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = PrayerWidget()
}
