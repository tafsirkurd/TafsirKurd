@echo off
set ADB=C:\Users\Ferminus\AppData\Local\Android\Sdk\platform-tools\adb.exe
set DEVICE=192.168.16.102:36249
set APK=android\app\build\outputs\apk\debug\app-debug.apk

echo [1/4] Connecting to device...
%ADB% connect %DEVICE%
timeout /t 2 /nobreak >nul

%ADB% devices | findstr "device" >nul
if errorlevel 1 (
    echo ERROR: Device not found. Check Wi-Fi and USB Debugging.
    pause
    exit /b 1
)

echo [2/4] Installing APK...
%ADB% install -r %APK%
if errorlevel 1 (
    echo Install failed. Trying full reinstall...
    %ADB% uninstall com.tafsirkurd.app
    %ADB% install %APK%
)

echo [3/4] Launching app...
%ADB% shell am start -n com.tafsirkurd.app/.MainActivity

echo [4/4] Done!
timeout /t 2 /nobreak >nul
