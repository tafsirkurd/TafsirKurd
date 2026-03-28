package com.tafsirkurd.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request battery optimization exemption so athan alarms are never killed by OS.
        // Shows a one-time system dialog: "Allow TafsirKurd to always run in background?"
        // This is the same approach used by WhatsApp, Telegram, and all prayer apps.
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
            try {
                Intent batteryIntent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                batteryIntent.setData(Uri.parse("package:" + getPackageName()));
                startActivity(batteryIntent);
            } catch (Exception ignored) {
                // Some devices don't support this intent — safe to ignore
            }
        }

        // Configure WebView for YouTube embed compatibility
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Set user agent to Chrome mobile so YouTube doesn't block embeds
        String chromeUA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
        settings.setUserAgentString(chromeUA);

        // Remove X-Requested-With header via reflection
        // This header tells YouTube the request comes from a WebView app
        // Mode 0 = NO_HEADER (don't send X-Requested-With)
        try {
            Class<?> settingsCompat = Class.forName("androidx.webkit.WebSettingsCompat");
            java.lang.reflect.Method setMode = settingsCompat.getMethod(
                "setRequestedWithHeaderMode", WebSettings.class, int.class
            );
            setMode.invoke(null, settings, 0);
        } catch (Exception ignored) {
            // Feature not supported on this device/WebView version
        }

        // Enable third-party cookies (required for YouTube embeds)
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Media playback settings
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Register JS bridge for widget data writes (Android SharedPreferences)
        webView.addJavascriptInterface(new TafsirAndroidBridge(this), "TafsirAndroid");
    }
}
