package com.tafsirkurd.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

private val BAR_IDS = listOf(R.id.bar0, R.id.bar1, R.id.bar2, R.id.bar3, R.id.bar4, R.id.bar5, R.id.bar6)
private const val COLOR_ACCENT     = 0xFF23BD69.toInt()
private const val COLOR_DARK_GREEN = 0xFF1A8F50.toInt()
private const val COLOR_BG2        = 0xFF161A16.toInt()

private fun motivationalMsg(ratio: Float, tr: Map<String, String>): String = when {
    ratio >= 1f   -> tr["widget.goal.done"]       ?: "ئەمڕۆ تەواو بوو ✓"
    ratio >= 0.7f -> tr["widget.goal.almost"]     ?: "نزیکە!"
    ratio >= 0.3f -> tr["widget.goal.keep_going"] ?: "بەردەوام بە"
    else          -> tr["widget.goal.start"]      ?: "بیکە!"
}

class GoalWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { id ->
            val size    = appWidgetManager.getAppWidgetOptions(id)
            val heightDp = size.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
            appWidgetManager.updateAppWidget(id, buildViewsForHeight(context, heightDp))
        }
    }

    companion object {
        fun buildViews(context: Context): RemoteViews = buildViewsForHeight(context, 220)

        fun buildViewsForHeight(context: Context, heightDp: Int): RemoteViews {
            val views   = RemoteViews(context.packageName, R.layout.widget_goal)
            val raw     = WidgetDataStore.getString(context, "widgetGoalData")
            val isLarge = heightDp > 160
            val tr      = loadTranslations(context)

            if (raw == null) {
                views.setTextViewText(R.id.countText, "0")
                views.setTextViewText(R.id.goalText, "")
                views.setProgressBar(R.id.progressBar, 100, 0, false)
                views.setViewVisibility(R.id.weeklyBars, View.GONE)
                return views
            }

            val obj           = try { JSONObject(raw) } catch (_: Exception) { return views }
            val todayCount    = obj.optInt("todayCount", 0)
            val dailyGoal     = obj.optInt("dailyGoal", 10).coerceAtLeast(1)
            val currentStreak = obj.optInt("currentStreak", 0)
            val arr           = obj.optJSONArray("weeklyData")
            val weekly        = if (arr != null) (0 until arr.length()).map { arr.getInt(it) } else emptyList()
            val ratio         = (todayCount.toFloat() / dailyGoal).coerceIn(0f, 1f)

            // Count + goal
            views.setTextViewText(R.id.countText, "$todayCount")
            views.setTextViewText(R.id.goalText, "/$dailyGoal")

            // Streak
            views.setTextViewText(R.id.streakLabel, tr["widget.goal.streak"] ?: "streak")
            views.setTextViewText(R.id.streakValue, "\uD83D\uDD25 $currentStreak")

            // Progress bar
            views.setProgressBar(R.id.progressBar, 100, (ratio * 100).toInt(), false)

            // Motivational message
            val msgColor = if (ratio >= 1f) COLOR_ACCENT else 0x80FFFFFF.toInt()
            views.setTextViewText(R.id.motivationText, motivationalMsg(ratio, tr))
            views.setTextColor(R.id.motivationText, msgColor)

            // Weekly bars (only on large)
            if (isLarge && weekly.size >= 7) {
                views.setViewVisibility(R.id.weeklyBars, View.VISIBLE)
                BAR_IDS.forEachIndexed { i, barId ->
                    val count   = weekly[i]
                    val isToday = i == weekly.size - 1
                    val color   = when {
                        isToday       -> COLOR_ACCENT
                        count >= dailyGoal -> COLOR_DARK_GREEN
                        else          -> COLOR_BG2
                    }
                    views.setInt(barId, "setBackgroundColor", color)
                }
            } else {
                views.setViewVisibility(R.id.weeklyBars, View.GONE)
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
