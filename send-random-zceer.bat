@echo off
cd /d C:\TafsirKurd

REM Debug: Log start time
echo ========================================= >> zceer-debug.log
echo Zceer task started at %date% %time% >> zceer-debug.log
echo Current directory: %cd% >> zceer-debug.log

REM Load environment variables from config.bat
if exist C:\TafsirKurd\config.bat (
    echo Loading config.bat... >> zceer-debug.log
    call C:\TafsirKurd\config.bat
    echo Config loaded successfully >> zceer-debug.log
    echo Webhook value: %DISCORD_WEBHOOK_ZCEER% >> zceer-debug.log
) else (
    echo ERROR: config.bat not found! >> zceer-error.log
    echo ERROR: config.bat not found at %date% %time% >> zceer-debug.log
    echo Please copy config.bat.example to config.bat and fill in your credentials >> zceer-error.log
    exit /b 1
)

REM Verify webhook is set
echo Checking webhook... >> zceer-debug.log
if "%DISCORD_WEBHOOK_ZCEER%"=="" (
    echo ERROR: DISCORD_WEBHOOK_ZCEER not set after loading config.bat >> zceer-error.log
    echo ERROR: DISCORD_WEBHOOK_ZCEER not set at %date% %time% >> zceer-debug.log
    exit /b 1
)
echo Webhook is set >> zceer-debug.log

REM Run the script and log output (use full path to node.exe)
"C:\Program Files\nodejs\node.exe" scripts\random-zceer.js >> zceer-log.txt 2>&1
if errorlevel 1 (
    echo ERROR: Node script failed with code %errorlevel% >> zceer-error.log
    echo Error occurred at %date% %time% >> zceer-error.log
    exit /b 1
)

REM Log success
echo SUCCESS: Zceer sent at %date% %time% >> zceer-log.txt
