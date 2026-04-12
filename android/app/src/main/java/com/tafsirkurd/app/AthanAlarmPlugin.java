package com.tafsirkurd.app;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native bridge for athan alarm reliability checks.
 *
 * Exposed to JS as window.Capacitor.Plugins.AthanAlarm:
 *   canScheduleExact()            → { canSchedule: boolean, apiLevel: int }
 *   openExactAlarmSettings()      → opens Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM (API 31+)
 *   isIgnoringBatteryOpts()       → { ignoring: boolean }
 *   openBatteryOptSettings()      → opens ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 */
@CapacitorPlugin(name = "AthanAlarm")
public class AthanAlarmPlugin extends Plugin {

    /**
     * Returns whether the app can schedule exact alarms right now.
     * On API < 31 always returns true (no restriction exists).
     * On API 31+ calls AlarmManager.canScheduleExactAlarms().
     */
    @PluginMethod
    public void canScheduleExact(PluginCall call) {
        JSObject result = new JSObject();
        result.put("apiLevel", Build.VERSION.SDK_INT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // API 31
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            boolean can = (am != null) && am.canScheduleExactAlarms();
            result.put("canSchedule", can);
        } else {
            result.put("canSchedule", true); // no restriction below API 31
        }
        call.resolve(result);
    }

    /**
     * Opens the system exact-alarm permission screen for this app.
     * API 31+ only; on older devices this is a no-op (exact alarms always allowed).
     */
    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception e) {
                // Fallback to app details if deep-link not supported
                try {
                    Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(fallback);
                } catch (Exception ignored) {}
            }
        }
        call.resolve();
    }

    /**
     * Returns whether battery optimization is currently disabled for this app.
     */
    @PluginMethod
    public void isIgnoringBatteryOpts(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean ignoring = (pm != null) && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        JSObject result = new JSObject();
        result.put("ignoring", ignoring);
        call.resolve(result);
    }

    /**
     * Mirrors the JS prayerLastScheduleTs timestamp to SharedPreferences so that
     * AthanRescheduleWorker (WorkManager) can check it without a running WebView.
     * Call this from JS after every successful scheduleAthanMultiDay().
     */
    @PluginMethod
    public void mirrorScheduleTs(PluginCall call) {
        long ts = call.getLong("ts", 0L);
        boolean athanEnabled = call.getBoolean("athanEnabled", false);
        getContext().getSharedPreferences("AthanPrefs", Context.MODE_PRIVATE)
            .edit()
            .putLong("lastScheduleTs", ts)
            .putBoolean("athanEnabled", athanEnabled)
            .apply();
        call.resolve();
    }

    /**
     * Opens the system battery optimization exemption dialog for this app.
     */
    @PluginMethod
    public void openBatteryOptSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
            } catch (Exception ignored) {}
        }
        call.resolve();
    }
}
