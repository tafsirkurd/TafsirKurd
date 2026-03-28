package com.tafsirkurd.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

class AyahWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val views = buildViews(context, appWidgetManager, appWidgetIds)
        appWidgetIds.forEach { id ->
            val size = appWidgetManager.getAppWidgetOptions(id)
            val heightDp = size.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
            appWidgetManager.updateAppWidget(id, buildViewsForHeight(context, heightDp))
        }
    }

    companion object {
        fun buildViews(context: Context, appWidgetManager: AppWidgetManager? = null, ids: IntArray? = null): RemoteViews {
            return buildViewsForHeight(context, 220) // default large
        }

        fun buildViewsForHeight(context: Context, heightDp: Int): RemoteViews {
            val views  = RemoteViews(context.packageName, R.layout.widget_ayah)
            val raw    = WidgetDataStore.getString(context, "widgetAyahData")
            val isLarge = heightDp > 160

            if (raw == null) {
                views.setTextViewText(R.id.arabicText, "ئایەتێک هەڵبژێرە")
                views.setViewVisibility(R.id.referenceText, View.GONE)
                views.setViewVisibility(R.id.separator,    View.GONE)
                views.setViewVisibility(R.id.tafsirText,   View.GONE)
                return views
            }

            val obj = try { JSONObject(raw) } catch (_: Exception) { return views }
            val arabic       = obj.optString("arabic", "")
            val tafsir       = obj.optString("tafsir", "")
            val surahName    = obj.optString("surahName", "")
            val chapter      = obj.optInt("chapter", 0)
            val verse        = obj.optInt("verse", 0)
            val showTafsir   = obj.optBoolean("showTafsir", true) && isLarge
            val showRef      = obj.optBoolean("showReference", true)

            views.setTextViewText(R.id.arabicText, arabic)

            if (showRef && chapter > 0) {
                views.setTextViewText(R.id.referenceText, "$surahName $chapter:$verse")
                views.setViewVisibility(R.id.referenceText, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.referenceText, View.GONE)
            }

            if (showTafsir && tafsir.isNotBlank()) {
                views.setTextViewText(R.id.tafsirText, tafsir)
                views.setViewVisibility(R.id.separator,  View.VISIBLE)
                views.setViewVisibility(R.id.tafsirText, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.separator,  View.GONE)
                views.setViewVisibility(R.id.tafsirText, View.GONE)
            }

            return views
        }
    }
}
