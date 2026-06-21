package com.tafsirkurd.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * WorkManager periodic task — runs every 7 days even when the app is closed.
 *
 * Purpose: if the user hasn't opened the app in more than 14 days (beyond our
 * 28-day scheduling window / 2 weeks before it expires), post a subtle system
 * notification that opens the app so JS can reschedule 28 more days of athan.
 *
 * This is the final safety net for users who never open the app.
 */
public class AthanRescheduleWorker extends Worker {

    private static final String TAG          = "AthanAlarm";
    private static final String CHANNEL_ID   = "athan_reschedule";
    private static final int    NOTIF_ID     = 9900;
    // Warn at 14 days — gives 14-day buffer before 28-day schedule expires
    private static final long   WARN_AFTER_MS = 14L * 24 * 60 * 60 * 1000;

    public AthanRescheduleWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences prefs = ctx.getSharedPreferences("AthanPrefs", Context.MODE_PRIVATE);

        boolean athanEnabled = prefs.getBoolean("athanEnabled", false);
        if (!athanEnabled) {
            Log.d(TAG, "AthanRescheduleWorker: athan disabled — skipping");
            return Result.success();
        }

        long lastTs = prefs.getLong("lastScheduleTs", 0L);
        long age    = System.currentTimeMillis() - lastTs;

        Log.d(TAG, "AthanRescheduleWorker: lastSchedule age = " + (age / 3600000) + "h, warn after " + (WARN_AFTER_MS / 3600000) + "h");

        if (age < WARN_AFTER_MS) {
            Log.d(TAG, "AthanRescheduleWorker: schedule is fresh — nothing to do");
            return Result.success();
        }

        // Schedule is stale — post a notification that opens the app to reschedule
        Log.i(TAG, "AthanRescheduleWorker: schedule is stale (" + (age / 86400000) + " days) — posting reminder");
        postRescheduleNotification(ctx);
        return Result.success();
    }

    private void postRescheduleNotification(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // Create channel (safe to call multiple times — idempotent).
        // IMPORTANCE_HIGH so the notification shows as a HUD heads-up on OEMs (MIUI,
        // ColorOS, OneUI) that collapse IMPORTANCE_DEFAULT notifications silently.
        // Without heads-up, users on aggressive OEMs never see the rescue notification
        // and athan silently stops after 28 days without an app open.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                "Athan Reminder",
                NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("Reminds you to open the app to refresh athan schedule");
            nm.createNotificationChannel(ch);
        }

        // Tap opens the app with reschedule_athan flag
        Intent launch = new Intent(ctx, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launch.putExtra("reschedule_athan", true);

        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            : PendingIntent.FLAG_UPDATE_CURRENT;

        PendingIntent pi = PendingIntent.getActivity(ctx, NOTIF_ID, launch, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("بانگ")
            .setContentText("بۆ نوویكرنا دەمێن بانگی، ئەپێ (بەرنامەی) ڤەکە")
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH);

        nm.notify(NOTIF_ID, builder.build());
    }
}
