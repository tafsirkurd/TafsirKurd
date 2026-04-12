package com.tafsirkurd.app;

import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Receives ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED (API 31+).
 *
 * When the user grants exact-alarm permission (either from our warning dialog
 * or manually via Settings → Alarms & Reminders), Android fires this broadcast.
 * We respond by launching MainActivity with a reschedule flag — the app's
 * JS then clears the rate-limit and calls initScheduleOnStart() immediately.
 */
public class ExactAlarmPermissionReceiver extends BroadcastReceiver {
    private static final String TAG = "AthanAlarm";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;

        String action = intent == null ? null : intent.getAction();
        if (!AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED.equals(action)) return;

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        if (am.canScheduleExactAlarms()) {
            Log.i(TAG, "Exact alarm permission GRANTED — launching app to reschedule athan");
            try {
                Intent launch = new Intent(context, MainActivity.class);
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launch.putExtra("reschedule_athan", true);
                context.startActivity(launch);
            } catch (Exception e) {
                Log.w(TAG, "Could not launch MainActivity for reschedule: " + e.getMessage());
            }
        } else {
            Log.w(TAG, "Exact alarm permission REVOKED — athan will not fire at exact time");
        }
    }
}
