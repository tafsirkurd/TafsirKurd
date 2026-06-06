package com.tafsirkurd.app;

import android.app.Application;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

/**
 * Pre-warms the WebView renderer before MainActivity starts so the
 * Chromium renderer process and V8 are already alive by the time
 * BridgeActivity creates the real WebView. Eliminates cold-start lag.
 */
public class App extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                WebView dummy = new WebView(getApplicationContext());
                dummy.destroy();
            } catch (Exception ignored) {}
        });
    }
}
