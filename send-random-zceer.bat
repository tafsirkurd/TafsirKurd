@echo off
cd /d C:\TafsirKurd

REM Load environment variables from config.bat
if exist config.bat (
    call config.bat
) else (
    echo ERROR: config.bat not found! >> zceer-error.log
    echo Please copy config.bat.example to config.bat and fill in your credentials >> zceer-error.log
    exit /b 1
)

REM Verify webhook is set
if "%DISCORD_WEBHOOK_ZCEER%"=="" (
    echo ERROR: DISCORD_WEBHOOK_ZCEER not set after loading config.bat >> zceer-error.log
    exit /b 1
)

REM Run the script and log output
node scripts/random-zceer.js >> zceer-log.txt 2>&1
if errorlevel 1 (
    echo ERROR: Node script failed with code %errorlevel% >> zceer-error.log
    exit /b 1
)
