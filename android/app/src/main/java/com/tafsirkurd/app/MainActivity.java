package com.tafsirkurd.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioPermissionPlugin.class);
        registerPlugin(AthanAlarmPlugin.class);
        super.onCreate(savedInstanceState);

        // Set WebView and window background to match the user's saved theme immediately
        // after the bridge initialises — eliminates the color flash between splash and app.
        // Theme is written to CapacitorStorage SharedPreferences by _nativeSyncTheme() in app.js.
        try {
            SharedPreferences themePrefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            String savedTheme = themePrefs.getString("appTheme", "dark");
            int themeColor;
            switch (savedTheme) {
                case "light":  themeColor = Color.parseColor("#fafafa"); break;
                case "sakina": themeColor = Color.parseColor("#0c1c12"); break;
                case "noor":   themeColor = Color.parseColor("#f4e8cc"); break;
                default:       themeColor = Color.parseColor("#0a0a0a"); break; // dark
            }
            getBridge().getWebView().setBackgroundColor(themeColor);
            getWindow().getDecorView().setBackgroundColor(themeColor);
        } catch (Exception e) {
            Log.w("ThemeInit", "Could not apply saved theme color: " + e.getMessage());
        }

        // Request battery optimization exemption so athan alarms are never killed by OS.
        // Shows a one-time system dialog: "Allow TafsirKurd to always run in background?"
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
            try {
                Intent batteryIntent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                batteryIntent.setData(Uri.parse("package:" + getPackageName()));
                startActivity(batteryIntent);
            } catch (Exception ignored) {}
        }

        // Configure WebView for YouTube embed compatibility
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Boost renderer thread priority so V8 JIT compilation doesn't
        // compete with other threads. Makes first-load feel as fast as
        // warm loads.
        try {
            webView.setRendererPriorityPolicy(
                WebView.RENDERER_PRIORITY_IMPORTANT, false);
        } catch (Exception ignored) {}

        // Enable DOM storage and database for caching
        settings.setDomStorageEnabled(true);
        // Use cache when available — speeds up warm launches significantly
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Chrome UA so YouTube doesn't block embeds
        settings.setUserAgentString(
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        );

        // Remove X-Requested-With header (tells YouTube it's a WebView)
        try {
            Class<?> settingsCompat = Class.forName("androidx.webkit.WebSettingsCompat");
            java.lang.reflect.Method setMode = settingsCompat.getMethod(
                "setRequestedWithHeaderMode", WebSettings.class, int.class
            );
            setMode.invoke(null, settings, 0);
        } catch (Exception ignored) {}

        // Third-party cookies for YouTube embeds
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // Media playback without user gesture (for athan preview)
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Grant WebView media permissions (mic, camera) automatically.
        // Android OS still enforces runtime permissions — this just unblocks the WebView layer.
        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }
        });

        // Register periodic WorkManager task — runs every 7 days even when app is closed.
        // If athan hasn't been rescheduled in 14+ days, posts a reminder notification.
        try {
            PeriodicWorkRequest rescheduleWork = new PeriodicWorkRequest.Builder(
                AthanRescheduleWorker.class, 7, TimeUnit.DAYS
            ).build();
            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "athan_reschedule_check",
                ExistingPeriodicWorkPolicy.KEEP, // don't restart timer if already scheduled
                rescheduleWork
            );
        } catch (Exception e) {
            Log.w("AthanAlarm", "WorkManager enqueue failed: " + e.getMessage());
        }

        // Handle reschedule_athan flag from ExactAlarmPermissionReceiver (cold start)
        handleRescheduleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle reschedule_athan flag when app is already running (warm resume)
        handleRescheduleIntent(intent);
    }

    /**
     * If the intent carries reschedule_athan=true (sent by ExactAlarmPermissionReceiver
     * when the user grants exact-alarm permission), clear the JS rate-limit and
     * trigger an immediate reschedule via the WebView bridge.
     */
    private void handleRescheduleIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("reschedule_athan", false)) return;
        Log.i("AthanAlarm", "reschedule_athan flag — clearing rate-limit and rescheduling");
        getBridge().getWebView().post(new Runnable() {
            @Override
            public void run() {
                getBridge().getWebView().evaluateJavascript(
                    "localStorage.removeItem('prayerLastScheduleTs');" +
                    "localStorage.removeItem('athanExactAlarmWarned');" +
                    "if(window.PrayerUI && typeof PrayerUI.initScheduleOnStart === 'function')" +
                    "  PrayerUI.initScheduleOnStart();",
                    null
                );
            }
        });
    }
}
