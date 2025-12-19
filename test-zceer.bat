@echo off
echo ========================================
echo Testing Zceer Script
echo ========================================
echo.

cd /d C:\TafsirKurd

echo Step 1: Checking config.bat exists...
if exist config.bat (
    echo  ✓ config.bat found
) else (
    echo  ✗ config.bat NOT FOUND!
    pause
    exit /b 1
)

echo.
echo Step 2: Loading config.bat...
call config.bat
echo  ✓ config.bat loaded

echo.
echo Step 3: Checking environment variable...
if "%DISCORD_WEBHOOK_ZCEER%"=="" (
    echo  ✗ DISCORD_WEBHOOK_ZCEER is NOT set!
    pause
    exit /b 1
) else (
    echo  ✓ DISCORD_WEBHOOK_ZCEER is set
    echo    Value: %DISCORD_WEBHOOK_ZCEER%
)

echo.
echo Step 4: Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo  ✗ Node.js NOT found in PATH!
    pause
    exit /b 1
) else (
    echo  ✓ Node.js found
    node --version
)

echo.
echo Step 5: Checking script file...
if exist scripts\random-zceer.js (
    echo  ✓ random-zceer.js found
) else (
    echo  ✗ random-zceer.js NOT FOUND!
    pause
    exit /b 1
)

echo.
echo Step 6: Running zceer script...
echo ----------------------------------------
node scripts\random-zceer.js
set RESULT=%errorlevel%
echo ----------------------------------------

echo.
if %RESULT% EQU 0 (
    echo ✓ Script completed successfully!
    echo   Check your Discord #🤲-zceer channel
) else (
    echo ✗ Script failed with error code: %RESULT%
)

echo.
echo ========================================
pause
