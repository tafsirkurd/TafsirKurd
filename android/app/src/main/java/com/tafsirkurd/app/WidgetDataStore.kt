package com.tafsirkurd.app

import android.content.Context
import android.content.SharedPreferences

object WidgetDataStore {
    private const val PREFS_NAME = "widget_data"

    fun getPrefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getString(context: Context, key: String): String? =
        getPrefs(context).getString(key, null)

    fun putString(context: Context, key: String, value: String) =
        getPrefs(context).edit().putString(key, value).apply()
}
