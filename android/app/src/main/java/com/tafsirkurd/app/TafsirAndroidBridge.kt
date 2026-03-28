package com.tafsirkurd.app

import android.content.Context
import android.webkit.JavascriptInterface
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TafsirAndroidBridge(private val context: Context) {

    @JavascriptInterface
    fun saveString(key: String, value: String) {
        WidgetDataStore.putString(context, key, value)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val mgr = GlanceAppWidgetManager(context)
                when (key) {
                    "widget_prayer" -> {
                        val widget = PrayerWidget()
                        mgr.getGlanceIds(PrayerWidget::class.java)
                            .forEach { widget.update(context, it) }
                    }
                    "widgetAyahData" -> {
                        val widget = AyahWidget()
                        mgr.getGlanceIds(AyahWidget::class.java)
                            .forEach { widget.update(context, it) }
                    }
                    "widgetGoalData" -> {
                        val widget = GoalWidget()
                        mgr.getGlanceIds(GoalWidget::class.java)
                            .forEach { widget.update(context, it) }
                    }
                    "widgetTranslations" -> {
                        val pMgr = mgr.getGlanceIds(PrayerWidget::class.java)
                        val aMgr = mgr.getGlanceIds(AyahWidget::class.java)
                        val gMgr = mgr.getGlanceIds(GoalWidget::class.java)
                        pMgr.forEach { PrayerWidget().update(context, it) }
                        aMgr.forEach { AyahWidget().update(context, it) }
                        gMgr.forEach { GoalWidget().update(context, it) }
                    }
                }
            } catch (_: Exception) {}
        }
    }
}
