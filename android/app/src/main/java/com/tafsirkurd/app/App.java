package com.tafsirkurd.app;

import android.app.Application;
import android.webkit.WebView;

/**
 * Pre-warms the WebView renderer synchronously in Application.onCreate()
 * so the Chromium process and V8 are already alive before MainActivity
 * even starts. A Handler.post() version runs TOO LATE — after
 * BridgeActivity has already created the real WebView.
 */
public class App extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            // Synchronous: runs on main thread before any Activity starts.
            // Creates + destroys a dummy WebView so the renderer process
            // and V8 snapshot are initialised before app.js loads.
            WebView dummy = new WebView(getApplicationContext());
            dummy.destroy();
        } catch (Exception ignored) {}
    }
}
