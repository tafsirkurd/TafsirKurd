@echo off
cd /d C:\TafsirKurd

REM Load environment variables from config.bat
if exist config.bat (
    call config.bat
) else (
    echo ERROR: config.bat not found!
    echo Please copy config.bat.example to config.bat and fill in your credentials
    pause
    exit /b 1
)

node scripts/random-zceer.js
