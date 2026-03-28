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

private val GBg1       = Color(0xFF0E100E)
private val GBg2       = Color(0xFF161A16)
private val GAccent    = Color(0xFF23BD69)
private val GDarkGreen = Color(0xFF1A8F50)
private val GT1        = Color(0xFFFFFFFF)
private val GT2        = Color(0x80FFFFFF.toInt())
private val GT3        = Color(0x47FFFFFF.toInt())

private data class GoalData(
    val todayCount: Int,
    val dailyGoal: Int,
    val currentStreak: Int,
    val weeklyData: List<Int>,
    val translations: Map<String, String>
)

private fun loadGoalData(context: Context): GoalData? {
    val raw = WidgetDataStore.getString(context, "widgetGoalData") ?: return null
    return try {
        val obj = JSONObject(raw)
        val arr = obj.optJSONArray("weeklyData")
        val weekly = if (arr != null) (0 until arr.length()).map { arr.getInt(it) } else emptyList()
        GoalData(
            todayCount    = obj.optInt("todayCount", 0),
            dailyGoal     = obj.optInt("dailyGoal", 10).coerceAtLeast(1),
            currentStreak = obj.optInt("currentStreak", 0),
            weeklyData    = weekly,
            translations  = loadGoalTranslations(context)
        )
    } catch (_: Exception) { null }
}

private fun loadGoalTranslations(context: Context): Map<String, String> {
    val raw = WidgetDataStore.getString(context, "widgetTranslations") ?: return emptyMap()
    return try {
        val obj = JSONObject(raw).getJSONObject("keys")
        obj.keys().asSequence().associateWith { obj.getString(it) }
    } catch (_: Exception) { emptyMap() }
}

private fun Map<String, String>.gt(key: String, fallback: String) = this[key] ?: fallback

private fun motivationalMsg(ratio: Float, tr: Map<String, String>): String = when {
    ratio >= 1f   -> tr.gt("widget.goal.done",       "ئەمڕۆ تەواو بوو ✓")
    ratio >= 0.7f -> tr.gt("widget.goal.almost",     "نزیکە!")
    ratio >= 0.3f -> tr.gt("widget.goal.keep_going", "بەردەوام بە")
    else          -> tr.gt("widget.goal.start",      "بیکە!")
}

class GoalWidget : GlanceAppWidget() {

    companion object {
        private val MEDIUM = DpSize(220.dp, 110.dp)
        private val LARGE  = DpSize(220.dp, 220.dp)
    }

    override val sizeMode = SizeMode.Responsive(setOf(MEDIUM, LARGE))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { GoalContent() }
    }

    @Composable
    private fun GoalContent() {
        val context = LocalContext.current
        val size    = LocalSize.current
        val data    = loadGoalData(context)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(GBg1)
                .padding(0.dp)
        ) {
            if (data == null) {
                EmptyState()
            } else if (size.height < 200.dp) {
                MediumContent(data)
            } else {
                LargeContent(data)
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
                text = "ئامانجا خواندنێ",
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(GT3),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )
            )
        }
    }

    @Composable
    private fun MediumContent(data: GoalData) {
        val ratio = (data.todayCount.toFloat() / data.dailyGoal).coerceIn(0f, 1f)
        val widgetWidth = LocalSize.current.width

        Column(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
            Row(
                horizontalAlignment = Alignment.End,
                modifier = GlanceModifier.fillMaxWidth()
            ) {
                Text(
                    text = "${data.todayCount}/${data.dailyGoal}",
                    style = TextStyle(color = androidx.glance.unit.ColorProvider(GT1), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                )
                Spacer(GlanceModifier.defaultWeight())
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = data.translations.gt("widget.goal.streak", "streak"),
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(GT3), fontSize = 10.sp)
                    )
                    Text(
                        text = "\uD83D\uDD25 ${data.currentStreak}",
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(GT1), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    )
                }
            }
            Spacer(GlanceModifier.height(8.dp))
            ProgressBar(ratio, widgetWidth)
            Spacer(GlanceModifier.height(6.dp))
            Text(
                text = motivationalMsg(ratio, data.translations),
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(if (ratio >= 1f) GAccent else GT2),
                    fontSize = 11.sp
                )
            )
        }
    }

    @Composable
    private fun LargeContent(data: GoalData) {
        val ratio = (data.todayCount.toFloat() / data.dailyGoal).coerceIn(0f, 1f)
        val widgetWidth = LocalSize.current.width

        Column(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
            Row(
                horizontalAlignment = Alignment.End,
                modifier = GlanceModifier.fillMaxWidth()
            ) {
                Row(horizontalAlignment = Alignment.End, verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = "${data.todayCount}",
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(GT1), fontSize = 32.sp, fontWeight = FontWeight.Bold)
                    )
                    Text(
                        text = "/${data.dailyGoal}",
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(GT3), fontSize = 18.sp)
                    )
                }
                Spacer(GlanceModifier.defaultWeight())
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = data.translations.gt("widget.goal.streak", "streak"),
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(GT3), fontSize = 10.sp)
                    )
                    Text(
                        text = "\uD83D\uDD25 ${data.currentStreak}",
                        style = TextStyle(color = androidx.glance.unit.ColorProvider(GT1), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    )
                }
            }
            Spacer(GlanceModifier.height(8.dp))
            ProgressBar(ratio, widgetWidth)
            Spacer(GlanceModifier.height(12.dp))
            if (data.weeklyData.size >= 7) {
                WeeklyBars(data.weeklyData, data.dailyGoal)
                Spacer(GlanceModifier.height(10.dp))
            }
            Text(
                text = motivationalMsg(ratio, data.translations),
                style = TextStyle(
                    color = androidx.glance.unit.ColorProvider(if (ratio >= 1f) GAccent else GT2),
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center
                )
            )
        }
    }

    @Composable
    private fun ProgressBar(ratio: Float, widgetWidth: androidx.compose.ui.unit.Dp) {
        val trackPx = (widgetWidth.value - 28f).coerceAtLeast(4f)
        val fillW   = (trackPx * ratio.coerceIn(0.02f, 1f)).dp

        Box(modifier = GlanceModifier.fillMaxWidth().height(8.dp)) {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(GBg2)
                    .cornerRadius(4.dp)
            ) {}
            Box(
                modifier = GlanceModifier
                    .fillMaxHeight()
                    .width(fillW)
                    .background(GAccent)
                    .cornerRadius(4.dp)
            ) {}
        }
    }

    @Composable
    private fun WeeklyBars(weekly: List<Int>, goal: Int) {
        val maxVal = (weekly.maxOrNull() ?: 0).coerceAtLeast(goal)

        Row(modifier = GlanceModifier.fillMaxWidth().height(40.dp)) {
            weekly.forEachIndexed { index, count ->
                val frac    = if (maxVal > 0) (count.toFloat() / maxVal).coerceIn(0.05f, 1f) else 0.05f
                val barH    = (40f * frac).dp
                val isToday = index == weekly.size - 1
                val color   = when {
                    isToday       -> GAccent
                    count >= goal -> GDarkGreen
                    else          -> GBg2
                }
                Column(
                    verticalAlignment = Alignment.Bottom,
                    modifier = GlanceModifier.defaultWeight().fillMaxHeight()
                ) {
                    Spacer(GlanceModifier.defaultWeight())
                    Box(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .height(barH)
                            .background(color)
                            .cornerRadius(3.dp)
                    ) {}
                }
                if (index < weekly.size - 1) {
                    Spacer(GlanceModifier.width(3.dp))
                }
            }
        }
    }
}

class GoalWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = GoalWidget()
}
