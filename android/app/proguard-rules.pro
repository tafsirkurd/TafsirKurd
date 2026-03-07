# Capacitor core — must not be obfuscated
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PluginMethod *;
}

# WebView JavaScript interface bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Androidx & app compat
-keep class androidx.** { *; }
-dontwarn androidx.**

# Cordova plugins (used by Capacitor)
-keep class org.apache.cordova.** { *; }

# Keep app entry point
-keep class com.tafsirkurd.app.** { *; }

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
