package com.tafsirkurd.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.webkit.JavascriptInterface

class TafsirAndroidBridge(private val context: Context) {

    @JavascriptInterface
    fun saveString(key: String, value: String) {
        WidgetDataStore.putString(context, key, value)
        val mgr = AppWidgetManager.getInstance(context)

        when (key) {
            "widget_prayer" -> updateWidget(mgr, PrayerWidget::class.java) { ids ->
                val views = PrayerWidget.buildViews(context)
                ids.forEach { mgr.updateAppWidget(it, views) }
            }
            "widgetAyahData" -> updateWidget(mgr, AyahWidget::class.java) { ids ->
                ids.forEach { id ->
                    val h = mgr.getAppWidgetOptions(id)
                              .getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 220)
                    mgr.updateAppWidget(id, AyahWidget.buildViewsForHeight(context, h))
                }
            }
            "widgetGoalData" -> updateWidget(mgr, GoalWidget::class.java) { ids ->
                ids.forEach { id ->
                    val h = mgr.getAppWidgetOptions(id)
                              .getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 220)
                    mgr.updateAppWidget(id, GoalWidget.buildViewsForHeight(context, h))
                }
            }
            "widgetTranslations" -> {
                updateWidget(mgr, PrayerWidget::class.java) { ids ->
                    val views = PrayerWidget.buildViews(context)
                    ids.forEach { mgr.updateAppWidget(it, views) }
                }
                updateWidget(mgr, AyahWidget::class.java) { ids ->
                    ids.forEach { id ->
                        val h = mgr.getAppWidgetOptions(id)
                                  .getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 220)
                        mgr.updateAppWidget(id, AyahWidget.buildViewsForHeight(context, h))
                    }
                }
                updateWidget(mgr, GoalWidget::class.java) { ids ->
                    ids.forEach { id ->
                        val h = mgr.getAppWidgetOptions(id)
                                  .getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 220)
                        mgr.updateAppWidget(id, GoalWidget.buildViewsForHeight(context, h))
                    }
                }
            }
        }
    }

    private fun updateWidget(
        mgr: AppWidgetManager,
        cls: Class<*>,
        block: (IntArray) -> Unit
    ) {
        val ids = mgr.getAppWidgetIds(ComponentName(context, cls))
        if (ids.isNotEmpty()) block(ids)
    }
}
